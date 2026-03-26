from sqlalchemy.orm import Session
from app import models, schemas
from datetime import datetime

def get_commission(db: Session, commission_id: int):
    return db.query(models.Commission).filter(models.Commission.id == commission_id).first()

def get_commissions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Commission).offset(skip).limit(limit).all()

def get_commissions_by_seller(db: Session, seller_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Commission).filter(models.Commission.seller_id == seller_id).offset(skip).limit(limit).all()

def get_commissions_by_order(db: Session, order_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Commission).filter(models.Commission.order_id == order_id).offset(skip).limit(limit).all()

def get_commissions_by_booking(db: Session, booking_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Commission).filter(models.Commission.booking_id == booking_id).offset(skip).limit(limit).all()

def create_commission(db: Session, commission: schemas.CommissionCreate):
    db_commission = models.Commission(
        seller_id=commission.seller_id,
        order_id=commission.order_id,
        booking_id=commission.booking_id,
        amount=commission.amount,
        commission_rate=commission.commission_rate
    )
    db.add(db_commission)
    db.commit()
    db.refresh(db_commission)
    return db_commission

def update_commission(db: Session, commission_id: int, commission: schemas.CommissionUpdate):
    db_commission = get_commission(db, commission_id=commission_id)
    if db_commission:
        for key, value in commission.dict(exclude_unset=True).items():
            setattr(db_commission, key, value)
        db.commit()
        db.refresh(db_commission)
    return db_commission

def delete_commission(db: Session, commission_id: int):
    db_commission = get_commission(db, commission_id=commission_id)
    if db_commission:
        db.delete(db_commission)
        db.commit()
    return db_commission

def calculate_commission(amount: float, commission_rate: float = 5.0):
    """Calculate commission amount based on total amount and rate (default 5%)"""
    return amount * (commission_rate / 100)

def create_order_commissions(db: Session, order: models.Order, commission_rate: float = 5.0):
    """Create commissions for an order based on the products' sellers"""
    seller_earnings = {}

    for item in order.order_items:
        product = item.product
        seller_id = product.seller_id
        item_total = item.price_at_purchase * item.quantity
        
        if seller_id not in seller_earnings:
            seller_earnings[seller_id] = 0.0
        
        seller_earnings[seller_id] += item_total

    for seller_id, total_amount in seller_earnings.items():
        commission_amount = calculate_commission(total_amount, commission_rate)
        commission = schemas.CommissionCreate(
            seller_id=seller_id,
            order_id=order.id,
            amount=commission_amount,
            commission_rate=commission_rate
        )
        create_commission(db, commission)

    return list(seller_earnings.keys())