from sqlalchemy.orm import Session
from app import models
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserProfileUpdate
from app.core.security import get_password_hash

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_phone_number(db: Session, phone_number: str):
    return db.query(User).filter(User.phone_number == phone_number).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user: UserCreate):
    payload = user.dict()
    raw_password = payload.pop("password", None)
    if raw_password:
        payload["hashed_password"] = get_password_hash(raw_password)
    db_user = User(**payload)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    db_profile = models.Profile(user_id=db_user.id)
    db.add(db_profile)
    db.commit()
    return db_user

def update_user(db: Session, user_id: int, user: UserUpdate):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user:
        for key, value in user.dict(exclude_unset=True).items():
            setattr(db_user, key, value)
        db.commit()
        db.refresh(db_user)
    return db_user


def update_user_profile(db: Session, user: User, profile_update: UserProfileUpdate):
    if profile_update.name is not None:
        name_parts = profile_update.name.strip().split(" ", 1)
        user.first_name = name_parts[0] if name_parts else None
        user.last_name = name_parts[1] if len(name_parts) > 1 else None
    if profile_update.email is not None:
        user.email = profile_update.email
    if profile_update.phone_number is not None:
        user.phone_number = profile_update.phone_number
    if profile_update.username is not None:
        user.username = profile_update.username
    if profile_update.bio is not None:
        user.bio = profile_update.bio
    if profile_update.location is not None:
        user.location = profile_update.location
    if profile_update.profile_image is not None:
        user.profile_image = profile_update.profile_image
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user_id: int):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user:
        db.delete(db_user)
        db.commit()
    return db_user