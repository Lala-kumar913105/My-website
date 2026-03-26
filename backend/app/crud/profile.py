from sqlalchemy.orm import Session
from app import models, schemas


def get_profile_by_user_id(db: Session, user_id: int):
    return db.query(models.Profile).filter(models.Profile.user_id == user_id).first()


def create_profile(db: Session, profile: schemas.ProfileCreate):
    db_profile = models.Profile(**profile.dict())
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile


def update_profile(db: Session, db_profile: models.Profile, profile: schemas.ProfileUpdate):
    for key, value in profile.dict(exclude_unset=True).items():
        setattr(db_profile, key, value)
    db.commit()
    db.refresh(db_profile)
    return db_profile


def get_follow(db: Session, follower_id: int, following_id: int):
    return (
        db.query(models.Follow)
        .filter(
            models.Follow.follower_id == follower_id,
            models.Follow.following_id == following_id,
        )
        .first()
    )


def create_follow(db: Session, follower_id: int, following_id: int):
    db_follow = models.Follow(follower_id=follower_id, following_id=following_id)
    db.add(db_follow)
    db.commit()
    db.refresh(db_follow)
    return db_follow


def delete_follow(db: Session, db_follow: models.Follow):
    db.delete(db_follow)
    db.commit()