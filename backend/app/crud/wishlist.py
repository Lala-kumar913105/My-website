from sqlalchemy.orm import Session
from app import models, schemas
from datetime import datetime


def get_wishlist(db: Session, user_id: int, product_id: int):
    return db.query(models.Wishlist).filter(
        models.Wishlist.user_id == user_id,
        models.Wishlist.product_id == product_id
    ).first()


def get_wishlists_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Wishlist).filter(models.Wishlist.user_id == user_id).offset(skip).limit(limit).all()


def create_wishlist(db: Session, wishlist: schemas.WishlistCreate, user_id: int):
    db_wishlist = models.Wishlist(
        user_id=user_id,
        product_id=wishlist.product_id
    )
    db.add(db_wishlist)
    db.commit()
    db.refresh(db_wishlist)
    return db_wishlist


def delete_wishlist(db: Session, user_id: int, product_id: int):
    db_wishlist = get_wishlist(db, user_id, product_id)
    if db_wishlist:
        db.delete(db_wishlist)
        db.commit()
    return db_wishlist