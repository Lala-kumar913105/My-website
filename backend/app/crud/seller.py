from sqlalchemy.orm import Session
from app.models.seller import Seller
from app.models.user import RoleEnum, User
from app.schemas.seller import SellerCreate, SellerUpdate

def get_seller(db: Session, seller_id: int):
    return db.query(Seller).filter(Seller.id == seller_id).first()

def get_seller_by_user_id(db: Session, user_id: int):
    return db.query(Seller).filter(Seller.user_id == user_id).first()

def get_sellers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Seller).offset(skip).limit(limit).all()

def create_seller(db: Session, seller: SellerCreate):
    db_seller = Seller(**seller.dict())
    db.add(db_seller)
    db.commit()
    db.refresh(db_seller)
    return db_seller


def get_or_create_seller(db: Session, user: User):
    existing = get_seller_by_user_id(db, user_id=user.id)
    if existing:
        return existing

    identity = (
        user.first_name
        or user.username
        or user.email
        or user.phone_number
        or f"User {user.id}"
    )
    business_name = f"{identity} Store"[:150]

    db_seller = Seller(
        user_id=user.id,
        business_name=business_name,
        business_address=user.location,
        business_description=None,
    )
    db.add(db_seller)

    if user.role == RoleEnum.BUYER or user.role == RoleEnum.USER:
        user.role = RoleEnum.BOTH

    db.commit()
    db.refresh(db_seller)
    return db_seller

def update_seller(db: Session, seller_id: int, seller: SellerUpdate):
    db_seller = db.query(Seller).filter(Seller.id == seller_id).first()
    if db_seller:
        for key, value in seller.dict(exclude_unset=True).items():
            setattr(db_seller, key, value)
        db.commit()
        db.refresh(db_seller)
    return db_seller

def delete_seller(db: Session, seller_id: int):
    db_seller = db.query(Seller).filter(Seller.id == seller_id).first()
    if db_seller:
        db.delete(db_seller)
        db.commit()
    return db_seller