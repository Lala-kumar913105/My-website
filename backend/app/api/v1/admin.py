from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_active_admin

router = APIRouter()

@router.get("/analytics", response_model=dict)
def get_analytics(current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get analytics summary (requires admin role)"""
    # Calculate total users
    total_users = db.query(models.User).count()
    
    # Calculate total sellers
    total_sellers = db.query(models.Seller).count()
    
    # Calculate total orders and revenue
    total_orders = db.query(models.Order).count()
    total_revenue = db.query(models.Order.total_amount).sum() or 0.0
    
    # Calculate pending orders
    pending_orders = db.query(models.Order).filter(models.Order.status == models.OrderStatus.pending).count()
    
    # Calculate active sellers
    active_sellers = db.query(models.Seller).filter(models.Seller.is_approved == True).count()
    
    return {
        "total_users": total_users,
        "total_sellers": total_sellers,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "pending_orders": pending_orders,
        "active_sellers": active_sellers
    }

@router.get("/users", response_model=list[schemas.User])
def get_users(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all users (requires admin role)"""
    return crud.get_users(db, skip=skip, limit=limit)

@router.get("/sellers", response_model=list[schemas.Seller])
def get_sellers(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all sellers (requires admin role)"""
    return crud.get_sellers(db, skip=skip, limit=limit)

@router.get("/orders", response_model=list[schemas.Order])
def get_orders(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all orders (requires admin role)"""
    return crud.get_orders(db, skip=skip, limit=limit)

@router.put("/users/{user_id}/block")
def block_user(user_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Block a user (requires admin role)"""
    user = crud.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_blocked = True
    db.commit()
    db.refresh(user)
    return {"message": "User blocked successfully"}

@router.put("/users/{user_id}/unblock")
def unblock_user(user_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Unblock a user (requires admin role)"""
    user = crud.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_blocked = False
    db.commit()
    db.refresh(user)
    return {"message": "User unblocked successfully"}

@router.put("/sellers/{seller_id}/approve")
def approve_seller(seller_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Approve a seller (requires admin role)"""
    seller = crud.get_seller(db, seller_id=seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    seller.is_approved = True
    db.commit()
    db.refresh(seller)
    return {"message": "Seller approved successfully"}

@router.put("/sellers/{seller_id}/reject")
def reject_seller(seller_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Reject a seller (requires admin role)"""
    seller = crud.get_seller(db, seller_id=seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    seller.is_approved = False
    db.commit()
    db.refresh(seller)
    return {"message": "Seller rejected successfully"}


@router.get("/revenue", response_model=dict)
def get_platform_revenue(current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get platform revenue summary for delivered orders (requires admin role)."""
    delivered_orders = db.query(models.Order).filter(models.Order.status == models.OrderStatus.delivered).all()
    total_orders = len(delivered_orders)
    total_platform_earning = sum(order.platform_earning for order in delivered_orders)
    total_commission_collected = sum(order.commission_amount for order in delivered_orders)

    return {
        "total_orders": total_orders,
        "total_platform_earning": round(total_platform_earning, 2),
        "total_commission_collected": round(total_commission_collected, 2),
    }


@router.get("/analytics/overview", response_model=dict)
def get_overview_analytics(current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get admin overview analytics (requires admin role)."""
    total_users = db.query(models.User).count()
    total_sellers = db.query(models.Seller).count()
    total_orders = db.query(models.Order).count()
    total_revenue = db.query(func.coalesce(func.sum(models.Order.total_amount), 0.0)).scalar()
    average_order_value = db.query(func.coalesce(func.avg(models.Order.total_amount), 0.0)).scalar()

    return {
        "total_users": total_users,
        "total_sellers": total_sellers,
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "average_order_value": round(average_order_value, 2),
    }


@router.get("/analytics/area-demand", response_model=list[dict])
def get_area_demand(current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Group orders by shipping address (area demand analytics)."""
    results = (
        db.query(
            models.Order.shipping_address.label("area_name"),
            func.count(models.Order.id).label("total_orders"),
            func.coalesce(func.sum(models.Order.total_amount), 0.0).label("total_revenue"),
        )
        .group_by(models.Order.shipping_address)
        .all()
    )

    return [
        {
            "area_name": row.area_name or "Unknown",
            "total_orders": row.total_orders,
            "total_revenue": round(row.total_revenue, 2),
        }
        for row in results
    ]


@router.get("/analytics/peak-hours", response_model=list[dict])
def get_peak_hours(current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Group orders by hour of creation (peak hours analytics)."""
    results = (
        db.query(
            extract("hour", models.Order.created_at).label("hour"),
            func.count(models.Order.id).label("total_orders"),
        )
        .group_by("hour")
        .order_by("hour")
        .all()
    )

    return [
        {"hour": int(row.hour), "total_orders": row.total_orders}
        for row in results
    ]


@router.get("/analytics/top-categories", response_model=list[dict])
def get_top_categories(current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get best selling categories based on order items."""
    results = (
        db.query(
            models.Category.name.label("category_name"),
            func.coalesce(func.sum(models.OrderItem.quantity), 0).label("total_sales"),
            func.coalesce(func.sum(models.OrderItem.quantity * models.OrderItem.price_at_purchase), 0.0).label(
                "total_revenue"
            ),
        )
        .join(models.Product, models.Product.category_id == models.Category.id)
        .join(models.OrderItem, models.OrderItem.product_id == models.Product.id)
        .group_by(models.Category.name)
        .order_by(func.sum(models.OrderItem.quantity).desc())
        .all()
    )

    return [
        {
            "category_name": row.category_name,
            "total_sales": int(row.total_sales),
            "total_revenue": round(row.total_revenue, 2),
        }
        for row in results
    ]


@router.get("/analytics/seller-growth/{seller_id}", response_model=dict)
def get_seller_growth(
    seller_id: int,
    current_user: models.User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
):
    """Get seller growth analytics (requires admin role)."""
    total_orders = db.query(models.Order).filter(models.Order.seller_id == seller_id).count()
    total_revenue = (
        db.query(func.coalesce(func.sum(models.Order.total_amount), 0.0))
        .filter(models.Order.seller_id == seller_id)
        .scalar()
    )

    current_month = db.query(func.count(models.Order.id)).filter(
        models.Order.seller_id == seller_id,
        extract("month", models.Order.created_at) == extract("month", func.now()),
        extract("year", models.Order.created_at) == extract("year", func.now()),
    ).scalar()

    previous_month_date = func.date_trunc("month", func.now() - func.cast("1 month", func.interval()))
    previous_month = db.query(func.count(models.Order.id)).filter(
        models.Order.seller_id == seller_id,
        extract("month", models.Order.created_at) == extract("month", previous_month_date),
        extract("year", models.Order.created_at) == extract("year", previous_month_date),
    ).scalar()

    monthly_growth_percentage = 0.0
    if previous_month:
        monthly_growth_percentage = ((current_month - previous_month) / previous_month) * 100

    return {
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "monthly_growth_percentage": round(monthly_growth_percentage, 2),
    }