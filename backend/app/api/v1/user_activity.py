from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_user

router = APIRouter()


@router.post("/activity", response_model=schemas.UserActivity)
def create_activity(
    payload: schemas.UserActivityCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.create_activity(db, user_id=current_user.id, payload=payload)


@router.get("/activity", response_model=list[schemas.UserActivity])
def list_activity(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.get_recent_activity(db, user_id=current_user.id)