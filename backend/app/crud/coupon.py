from sqlalchemy.orm import Session
from backend.app import models, schemas
from datetime import datetime


def get_coupon(db: Session, coupon_id: int):
    return db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()


def get_coupon_by_code(db: Session, code: str):
    return db.query(models.Coupon).filter(models.Coupon.code == code).first()


def get_coupons(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Coupon).offset(skip).limit(limit).all()


def create_coupon(db: Session, coupon: schemas.CouponCreate):
    db_coupon = models.Coupon(
        code=coupon.code,
        discount_percentage=coupon.discount_percentage,
        discount_amount=coupon.discount_amount,
        min_purchase_amount=coupon.min_purchase_amount,
        valid_until=coupon.valid_until,
    )
    db.add(db_coupon)
    db.commit()
    db.refresh(db_coupon)
    return db_coupon


def update_coupon(db: Session, coupon_id: int, coupon: schemas.CouponUpdate):
    db_coupon = get_coupon(db, coupon_id=coupon_id)
    if db_coupon:
        for key, value in coupon.dict(exclude_unset=True).items():
            setattr(db_coupon, key, value)
        db_coupon.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_coupon)
    return db_coupon


def delete_coupon(db: Session, coupon_id: int):
    db_coupon = get_coupon(db, coupon_id=coupon_id)
    if db_coupon:
        db.delete(db_coupon)
        db.commit()
    return db_coupon


def is_coupon_valid(db: Session, coupon_code: str, purchase_amount: float):
    coupon = get_coupon_by_code(db, coupon_code)
    if not coupon or not coupon.is_active:
        return False

    now = datetime.utcnow()
    if now > coupon.valid_until:
        return False

    if coupon.usage_limit and coupon.usage_count >= coupon.usage_limit:
        return False

    if purchase_amount < coupon.min_purchase_amount:
        return False

    return True


def calculate_discount(db: Session, coupon_code: str, purchase_amount: float):
    coupon = get_coupon_by_code(db, coupon_code)
    if not is_coupon_valid(db, coupon_code, purchase_amount):
        return 0.0

    if coupon.discount_percentage:
        return purchase_amount * (coupon.discount_percentage / 100)
    elif coupon.discount_amount:
        return min(coupon.discount_amount, purchase_amount)
    return 0.0


def increment_usage(db: Session, coupon_code: str):
    coupon = get_coupon_by_code(db, coupon_code)
    if coupon:
        coupon.usage_count = (coupon.usage_count or 0) + 1
        db.commit()
        db.refresh(coupon)
    return coupon