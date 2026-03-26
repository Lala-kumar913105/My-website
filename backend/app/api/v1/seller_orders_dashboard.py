from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import crud, models
from app.services.notification_service import send_order_notification
from app.db.session import get_db
from app.core.security import get_current_active_seller
from app.utils.cache import cache

router = APIRouter()


@router.get("/seller/orders")
def get_seller_orders(
    status: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_seller),
):
    """Return orders for the logged-in seller with filters and pagination."""
    seller = crud.get_seller_by_user_id(db, current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    query = db.query(models.Order).filter(models.Order.seller_id == seller.id)

    if status:
        query = query.filter(models.Order.status == status)

    if search:
        query = (
            query.join(models.Order.user)
            .join(models.Order.order_items)
            .join(models.OrderItem.product)
            .filter(
                (models.Product.name.ilike(f"%{search}%"))
                | (models.User.name.ilike(f"%{search}%"))
            )
        )

    total_count = query.count()
    orders = (
        query.order_by(models.Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    response = []

    for order in orders:
        customer = order.user
        items = []
        for item in order.order_items:
            product = item.product
            if not product:
                continue
            items.append(
                {
                    "id": product.id,
                    "name": product.name,
                    "image_url": product.image_url,
                    "quantity": item.quantity,
                    "price": item.price_at_purchase,
                }
            )

        response.append(
            {
                "order_id": order.id,
                "items": items,
                "total_amount": order.total_amount,
                "final_amount": order.final_amount,
                "discount_amount": order.discount_amount,
                "coupon_code": order.coupon_code,
                "address": order.shipping_address,
                "status": order.status.value if hasattr(order.status, "value") else order.status,
                "payment_status": order.payment_status.value if hasattr(order.payment_status, "value") else order.payment_status,
                "buyer": {
                    "id": customer.id if customer else None,
                    "name": customer.name if customer else None,
                    "phone_number": customer.phone_number if customer else None,
                },
                "created_at": order.created_at,
            }
        )

    return {"orders": response, "total": total_count, "page": page, "page_size": page_size}


@router.get("/seller/analytics")
def get_seller_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_seller),
):
    """Return analytics metrics for seller dashboard."""
    seller = crud.get_seller_by_user_id(db, current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    cache_key = f"seller_analytics:{seller.id}"

    def _build_payload():
        order_totals = (
            db.query(
                func.count(models.Order.id),
                func.coalesce(func.sum(models.Order.total_amount), 0.0),
                func.coalesce(func.sum(models.Order.final_amount), 0.0),
            )
            .filter(models.Order.seller_id == seller.id)
            .first()
        )
        total_orders = int(order_totals[0] or 0)
        total_sales = float(order_totals[1] or 0.0)
        total_final_sales = float(order_totals[2] or 0.0)

        booking_totals = (
            db.query(func.count(models.Booking.id), func.coalesce(func.sum(models.Booking.total_amount), 0.0))
            .join(models.Service, models.Service.id == models.Booking.service_id)
            .filter(models.Service.seller_id == seller.id)
            .first()
        )
        total_bookings = int(booking_totals[0] or 0)
        total_booking_revenue = float(booking_totals[1] or 0.0)
        total_revenue = total_final_sales + total_booking_revenue

        chart_data = (
            db.query(func.strftime("%Y-%m", models.Order.created_at), func.sum(models.Order.final_amount))
            .filter(models.Order.seller_id == seller.id)
            .group_by(func.strftime("%Y-%m", models.Order.created_at))
            .order_by(func.strftime("%Y-%m", models.Order.created_at))
            .limit(6)
            .all()
        )
        revenue_chart = [{"month": row[0], "value": float(row[1] or 0)} for row in chart_data]

        top_products = (
            db.query(models.Product.id, models.Product.name, func.sum(models.OrderItem.quantity))
            .join(models.OrderItem, models.OrderItem.product_id == models.Product.id)
            .join(models.Order, models.Order.id == models.OrderItem.order_id)
            .filter(models.Product.seller_id == seller.id)
            .group_by(models.Product.id)
            .order_by(func.sum(models.OrderItem.quantity).desc())
            .limit(5)
            .all()
        )
        top_products_payload = [
            {"id": row[0], "name": row[1], "quantity": int(row[2] or 0)}
            for row in top_products
        ]

        top_services = (
            db.query(models.Service.id, models.Service.name, func.count(models.Booking.id))
            .join(models.Booking, models.Booking.service_id == models.Service.id)
            .filter(models.Service.seller_id == seller.id)
            .group_by(models.Service.id)
            .order_by(func.count(models.Booking.id).desc())
            .limit(5)
            .all()
        )
        top_services_payload = [
            {"id": row[0], "name": row[1], "bookings": int(row[2] or 0)}
            for row in top_services
        ]

        low_stock = (
            db.query(models.Product)
            .filter(models.Product.seller_id == seller.id, models.Product.stock <= 5)
            .order_by(models.Product.stock.asc())
            .limit(5)
            .all()
        )
        low_stock_items = [
            {"id": product.id, "name": product.name, "stock": product.stock}
            for product in low_stock
        ]

        return {
            "total_orders": total_orders,
            "total_bookings": total_bookings,
            "total_sales": round(total_sales, 2),
            "total_booking_revenue": round(total_booking_revenue, 2),
            "total_revenue": round(total_revenue, 2),
            "revenue_chart": revenue_chart,
            "top_products": top_products_payload,
            "top_services": top_services_payload,
            "low_stock": low_stock_items,
        }

    return cache.get_or_set(cache_key, ttl_seconds=180, factory=_build_payload)


@router.post("/seller/order-action")
def order_action(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_seller),
):
    """Handle seller order actions (accept/reject/ship/deliver/cancel)."""
    seller = crud.get_seller_by_user_id(db, current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    order_id = payload.get("order_id")
    action = payload.get("action")
    if not order_id or not action:
        raise HTTPException(status_code=400, detail="order_id and action are required")

    order = crud.get_order(db, order_id=order_id)
    if not order or order.seller_id != seller.id:
        raise HTTPException(status_code=404, detail="Order not found")

    action_map = {
        "confirm": "confirmed",
        "prepare": "preparing",
        "out_for_delivery": "out_for_delivery",
        "deliver": "delivered",
        "reject": "cancelled",
        "cancel": "cancelled",
    }

    if action not in action_map:
        raise HTTPException(status_code=400, detail="Invalid action")

    new_status = action_map[action]
    try:
        updated = crud.update_order_status(db, order_id=order_id, status=new_status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if action == "deliver" and order.payment_method == models.PaymentMethod.cod:
        order.payment_status = models.PaymentStatus.paid
        db.commit()
        db.refresh(order)

    customer_phone = order.user.phone_number if order.user else None
    seller_phone = current_user.phone_number if current_user else None
    status_label = updated.status.value if hasattr(updated.status, "value") else updated.status

    try:
        send_order_notification(
            customer_phone,
            f"Your order #{order.id} is now {status_label}.",
        )
    except Exception:
        pass

    try:
        send_order_notification(
            seller_phone,
            f"You have {status_label} order #{order.id}.",
        )
    except Exception:
        pass

    return {
        "order_id": updated.id,
        "status": updated.status.value if hasattr(updated.status, "value") else updated.status,
        "payment_status": order.payment_status.value if hasattr(order.payment_status, "value") else order.payment_status,
    }