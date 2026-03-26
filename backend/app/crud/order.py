from sqlalchemy.orm import Session
from app import models, schemas
from app import crud
from datetime import datetime, date


def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()


def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Order).offset(skip).limit(limit).all()


def get_orders_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Order).filter(models.Order.user_id == user_id).offset(skip).limit(limit).all()


def create_order_from_cart(
    db: Session,
    user_id: int,
    shipping_address: str = None,
    coupon_code: str = None,
    payment_method: str | None = None,
    subtotal_amount: float | None = None,
    delivery_charge: float | None = None,
):
    # Get active cart
    cart = db.query(models.Cart).filter(models.Cart.user_id == user_id, models.Cart.is_active == True).first()
    if not cart or not cart.items:
        raise ValueError("Cart is empty or not found")

    # Calculate subtotal amount
    total_amount = 0.0
    for item in cart.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            total_amount += product.price * item.quantity

    total_amount = round(total_amount, 2)
    subtotal_amount = round(subtotal_amount if subtotal_amount is not None else total_amount, 2)
    delivery_charge = round(delivery_charge if delivery_charge is not None else 0.0, 2)

    # Apply coupon if provided
    discount = 0.0
    if coupon_code:
        if not crud.coupon.is_coupon_valid(db, coupon_code=coupon_code, purchase_amount=subtotal_amount):
            raise ValueError("Invalid or expired coupon")
        discount = crud.coupon.calculate_discount(db, coupon_code=coupon_code, purchase_amount=subtotal_amount)

    # Determine seller (first item) for seller dashboard linkage
    seller_id = None
    if cart.items:
        first_product = db.query(models.Product).filter(models.Product.id == cart.items[0].product_id).first()
        if first_product:
            seller_id = first_product.seller_id

    final_amount = round(subtotal_amount + delivery_charge - discount, 2)

    # Create order
    db_order = models.Order(
        user_id=user_id,
        seller_id=seller_id,
        total_amount=subtotal_amount,
        discount_amount=discount,
        final_amount=final_amount,
        coupon_code=coupon_code,
        status=models.OrderStatus.pending,
        payment_method=payment_method,
        shipping_address=shipping_address,
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    # Create order items
    for item in cart.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            db_order_item = models.OrderItem(
                order_id=db_order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price_at_purchase=product.price,
            )
            db.add(db_order_item)
            # Reduce product stock
            product.stock -= item.quantity
            db.commit()

    db.commit()

    # Clear cart items and deactivate cart
    for item in list(cart.items):
        db.delete(item)
    cart.is_active = False
    db.commit()

    if coupon_code:
        crud.coupon.increment_usage(db, coupon_code=coupon_code)

    return db_order


def update_order(db: Session, order_id: int, order: schemas.OrderUpdate):
    db_order = get_order(db, order_id=order_id)
    if db_order:
        for key, value in order.dict(exclude_unset=True).items():
            setattr(db_order, key, value)
        db_order.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_order)
    return db_order


def update_order_status(db: Session, order_id: int, status: str):
    """Update order status with validation for status transitions"""
    db_order = get_order(db, order_id=order_id)
    if not db_order:
        return None
    
    valid_transitions = {
        "pending": ["confirmed", "cancelled"],
        "confirmed": ["preparing", "cancelled"],
        "preparing": ["out_for_delivery", "cancelled"],
        "out_for_delivery": ["delivered", "cancelled"],
        "delivered": [],
        "cancelled": [],
    }
    
    current_status = db_order.status.value if hasattr(db_order.status, "value") else db_order.status
    
    if status not in valid_transitions.get(current_status, []):
        raise ValueError(f"Invalid status transition from {current_status} to {status}")
    
    db_order.status = status
    db_order.updated_at = datetime.utcnow()

    if status == "delivered":
        settings = db.query(models.PlatformSettings).order_by(models.PlatformSettings.id.desc()).first()
        reward_percent = settings.coin_reward_percent if settings else 0.0
        reward_coins = int(db_order.total_amount * (reward_percent / 100))

        if reward_coins > 0:
            crud.reward_for_order(db, user_id=db_order.user_id, reward_coins=reward_coins)

    db.commit()
    db.refresh(db_order)
    return db_order

def mark_order_paid(db: Session, order_id: int):
    return update_order_status(db, order_id, "confirmed")

def mark_order_packed(db: Session, order_id: int):
    """Legacy: treat packed as preparing"""
    updated_order = update_order_status(db, order_id, "preparing")
    if updated_order:
        # Check if delivery already exists
        existing_delivery = db.query(models.Delivery).filter(models.Delivery.order_id == order_id).first()
        if not existing_delivery:
            # Create delivery with order's shipping address as delivery location
            delivery = schemas.DeliveryCreate(
                order_id=order_id,
                delivery_location=updated_order.shipping_address,
                status=models.DeliveryStatus.pending
            )
            crud.create_delivery(db, delivery)
    return updated_order

def mark_order_shipped(db: Session, order_id: int):
    return update_order_status(db, order_id, "out_for_delivery")

def mark_order_delivered(db: Session, order_id: int):
    return update_order_status(db, order_id, "delivered")

def mark_order_cancelled(db: Session, order_id: int):
    return update_order_status(db, order_id, "cancelled")

def delete_order(db: Session, order_id: int):
    db_order = get_order(db, order_id=order_id)
    if db_order:
        db.delete(db_order)
        db.commit()
    return db_order
