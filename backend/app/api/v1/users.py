from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_active_admin, get_current_user

router = APIRouter()

@router.get("/me", response_model=schemas.UserPublic)
def get_current_user_profile(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's profile (requires authentication)"""
    return current_user

@router.get("/", response_model=list[schemas.UserPublic])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_admin)):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@router.get("/{user_id}", response_model=schemas.UserPublic)
def read_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_admin)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@router.post("/", response_model=schemas.UserPublic)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_admin)):
    if user.email:
        db_user = crud.get_user_by_email(db, email=user.email)
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
    if user.phone_number:
        db_user = crud.get_user_by_phone_number(db, phone_number=user.phone_number)
        if db_user:
            raise HTTPException(status_code=400, detail="Phone number already registered")
    return crud.create_user(db=db, user=user)

@router.put("/{user_id}", response_model=schemas.UserPublic)
def update_user(user_id: int, user: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_admin)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.update_user(db=db, user_id=user_id, user=user)

@router.delete("/{user_id}", response_model=schemas.UserPublic)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_admin)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.delete_user(db=db, user_id=user_id)

@router.get("/phone/{phone_number}", response_model=schemas.UserPublic)
def get_user_by_phone(phone_number: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_admin)):
    db_user = crud.get_user_by_phone_number(db, phone_number=phone_number)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
