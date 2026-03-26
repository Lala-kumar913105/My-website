import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import qrcode

from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_active_user, get_current_active_seller

router = APIRouter()


def _get_seller_payment_details(db: Session, order: models.Order):
    if not order.order_items:
        raise HTTPException(status_code=400, detail="Order has no items")

    product = order.order_items[0].product
    if not product:
        raise HTTPException(status_code=404, detail="Product not found for order")

    seller_id = product.seller_id
    details = crud.get_payment_details_by_seller(db, seller_id=seller_id)
    if not details:
        raise HTTPException(status_code=404, detail="Seller payment details not found")

    return details


@router.get("/generate-upi/{order_id}")
def generate_upi_qr(order_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Generate UPI QR image for an order (requires user role)."""
    order = crud.get_order(db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this order")

    details = _get_seller_payment_details(db, order)
    account_name = details.account_name or "Seller"
    upi_url = f"upi://pay?pa={details.upi_id}&pn={account_name}&am={order.total_amount}&cu=INR"

    qr_dir = os.path.join("static", "qr")
    os.makedirs(qr_dir, exist_ok=True)
    qr_filename = f"order_{order.id}.png"
    qr_path = os.path.join(qr_dir, qr_filename)

    qr_image = qrcode.make(upi_url)
    qr_image.save(qr_path)

    return {"qr_path": f"/static/qr/{qr_filename}", "upi_url": upi_url}


@router.post("/confirm-payment/{order_id}", response_model=schemas.Order)
def confirm_payment(order_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Mark order as paid (requires user role)."""
    order = crud.get_order(db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to confirm payment")

    updated = crud.mark_order_paid(db, order_id=order_id)
    if not updated:
        raise HTTPException(status_code=400, detail="Unable to mark payment")
    return updated


@router.post("/mark-delivered/{order_id}", response_model=schemas.Order)
def mark_delivered(order_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_seller)):
    """Seller marks order as delivered (requires seller role)."""
    order = crud.get_order(db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    seller = crud.get_seller_by_user_id(db, current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    if not any(item.product and item.product.seller_id == seller.id for item in order.order_items):
        raise HTTPException(status_code=403, detail="Not authorized to update this order")

    updated = crud.mark_order_delivered(db, order_id=order_id)
    if not updated:
        raise HTTPException(status_code=400, detail="Unable to mark delivered")
    return updated