from sqlalchemy.orm import Session
from app import models, schemas


def create_activity(db: Session, user_id: int, payload: schemas.UserActivityCreate):
    db_activity = models.UserActivity(
        user_id=user_id,
        activity_type=payload.activity_type,
        target_id=payload.target_id,
        activity_metadata=payload.activity_metadata,
    )
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity


def get_recent_activity(db: Session, user_id: int, limit: int = 20):
    return (
        db.query(models.UserActivity)
        .filter(models.UserActivity.user_id == user_id)
        .order_by(models.UserActivity.created_at.desc())
        .limit(limit)
        .all()
    )