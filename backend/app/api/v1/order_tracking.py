from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models
from app.db.session import get_db
from app.core.security import get_current_active_seller, get_current_active_user

router = APIRouter()


@router.post("/order/update-location")
def update_order_location(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_seller),
):
    """Update current order location (seller-only)."""
    order_id = payload.get("order_id")
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")

    if order_id is None or latitude is None or longitude is None:
        raise HTTPException(status_code=400, detail="order_id, latitude, longitude are required")

    order = crud.get_order(db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    seller = crud.get_seller_by_user_id(db, current_user.id)
    if not seller or order.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this order")

    order.current_latitude = float(latitude)
    order.current_longitude = float(longitude)
    db.commit()
    db.refresh(order)

    return {
        "order_id": order.id,
        "current_latitude": order.current_latitude,
        "current_longitude": order.current_longitude,
    }


@router.get("/order/track/{order_id}")
def track_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Track order location for customer (customer-only)."""
    order = crud.get_order(db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this order")

    seller = order.seller
    seller_location = {
        "latitude": seller.latitude if seller else None,
        "longitude": seller.longitude if seller else None,
    }

    current_location = {
        "latitude": order.current_latitude,
        "longitude": order.current_longitude,
    }

    buyer_location = {
        "address": order.shipping_address,
    }

    estimated_minutes = 90

    return {
        "status": order.status.value if hasattr(order.status, "value") else order.status,
        "seller_location": seller_location,
        "current_location": current_location,
        "buyer_location": buyer_location,
        "estimated_delivery_minutes": estimated_minutes,
        "updated_at": order.updated_at,
    }