from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models, schemas
from datetime import datetime


def get_review(db: Session, review_id: int):
    return db.query(models.Review).filter(models.Review.id == review_id).first()


def get_reviews(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Review).offset(skip).limit(limit).all()


def get_reviews_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Review).filter(models.Review.user_id == user_id).offset(skip).limit(limit).all()


def get_reviews_by_product(db: Session, product_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Review).filter(models.Review.product_id == product_id).offset(skip).limit(limit).all()


def get_reviews_by_seller(db: Session, seller_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Review).filter(models.Review.seller_id == seller_id).offset(skip).limit(limit).all()


def create_review(db: Session, review: schemas.ReviewCreate, user_id: int):
    order = db.query(models.Order).filter(models.Order.id == review.order_id).first()
    if not order:
        raise ValueError("Order not found")

    if order.user_id != user_id:
        raise ValueError("Not authorized to review this order")

    status_value = order.status.value if hasattr(order.status, "value") else order.status
    if status_value != "delivered":
        raise ValueError("Order is not delivered")

    existing = db.query(models.Review).filter(models.Review.order_id == review.order_id).first()
    if existing:
        raise ValueError("Review already exists for this order")

    product_id = None
    if order.order_items:
        product_id = order.order_items[0].product_id

    db_review = models.Review(
        order_id=order.id,
        product_id=product_id,
        seller_id=order.seller_id,
        user_id=user_id,
        rating=review.rating,
        review_text=review.review_text,
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review


def get_product_review_summary(db: Session, product_id: int):
    avg_rating = db.query(func.avg(models.Review.rating)).filter(models.Review.product_id == product_id).scalar()
    total_reviews = db.query(func.count(models.Review.id)).filter(models.Review.product_id == product_id).scalar()
    reviews = db.query(models.Review).filter(models.Review.product_id == product_id).all()
    return avg_rating or 0.0, total_reviews or 0, reviews


def get_seller_rating_summary(db: Session, seller_id: int):
    avg_rating = db.query(func.avg(models.Review.rating)).filter(models.Review.seller_id == seller_id).scalar()
    total_reviews = db.query(func.count(models.Review.id)).filter(models.Review.seller_id == seller_id).scalar()
    return avg_rating or 0.0, total_reviews or 0


def update_review(db: Session, review_id: int, review: schemas.ReviewUpdate):
    db_review = get_review(db, review_id=review_id)
    if db_review:
        for key, value in review.dict(exclude_unset=True).items():
            setattr(db_review, key, value)
        db_review.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_review)
    return db_review


def delete_review(db: Session, review_id: int):
    db_review = get_review(db, review_id=review_id)
    if db_review:
        db.delete(db_review)
        db.commit()
    return db_review