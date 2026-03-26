from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.db.session import get_db
from app.core.security import get_current_user

router = APIRouter()


@router.put("/user/language", response_model=dict)
def update_user_language(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    language = payload.get("preferred_language")
    if not language:
        raise HTTPException(status_code=400, detail="preferred_language is required")

    current_user.preferred_language = language
    db.commit()
    db.refresh(current_user)
    return {"preferred_language": current_user.preferred_language}


@router.put("/user/currency", response_model=dict)
def update_user_currency(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    currency = payload.get("preferred_currency")
    if not currency:
        raise HTTPException(status_code=400, detail="preferred_currency is required")

    current_user.preferred_currency = currency
    db.commit()
    db.refresh(current_user)
    return {"preferred_currency": current_user.preferred_currency}