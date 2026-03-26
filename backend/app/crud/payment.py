from sqlalchemy.orm import Session
from app import models, schemas
from datetime import datetime


def get_payment(db: Session, payment_id: int):
    return db.query(models.Payment).filter(models.Payment.id == payment_id).first()


def get_payments(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Payment).offset(skip).limit(limit).all()


def get_payments_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Payment).filter(models.Payment.user_id == user_id).offset(skip).limit(limit).all()


def get_payment_by_order(db: Session, order_id: int):
    return db.query(models.Payment).filter(models.Payment.order_id == order_id).first()


def get_payment_by_booking(db: Session, booking_id: int):
    return db.query(models.Payment).filter(models.Payment.booking_id == booking_id).first()


def create_payment(db: Session, payment: schemas.PaymentCreate, user_id: int):
    # Get order to calculate payment amount
    order = db.query(models.Order).filter(models.Order.id == payment.order_id).first()
    if not order:
        raise ValueError("Order not found")

    db_payment = models.Payment(
        user_id=user_id,
        order_id=payment.order_id,
        booking_id=payment.booking_id,
        amount=order.total_amount,
        method=payment.method,
        status=models.PaymentStatus.pending,
        coupon_id=payment.coupon_id,
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


def update_payment(db: Session, payment_id: int, payment: schemas.PaymentUpdate):
    db_payment = get_payment(db, payment_id=payment_id)
    if db_payment:
        for key, value in payment.dict(exclude_unset=True).items():
            setattr(db_payment, key, value)
        db_payment.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_payment)
    return db_payment


def delete_payment(db: Session, payment_id: int):
    db_payment = get_payment(db, payment_id=payment_id)
    if db_payment:
        db.delete(db_payment)
        db.commit()
    return db_payment


def mark_payment_complete(db: Session, payment_id: int, transaction_id: str):
    return update_payment(db, payment_id, schemas.PaymentUpdate(
        status=models.PaymentStatus.completed,
    ))


def mark_payment_failed(db: Session, payment_id: int):
    return update_payment(db, payment_id, schemas.PaymentUpdate(
        status=models.PaymentStatus.failed,
    ))