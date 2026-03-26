from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_user

router = APIRouter()


@router.get("/me", response_model=schemas.Profile)
def get_my_profile(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = crud.get_profile_by_user_id(db, user_id=current_user.id)
    if not profile:
        profile = crud.create_profile(db, schemas.ProfileCreate(user_id=current_user.id))
    return profile


@router.put("/me", response_model=schemas.Profile)
def update_my_profile(
    profile: schemas.ProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_profile = crud.get_profile_by_user_id(db, user_id=current_user.id)
    if not db_profile:
        db_profile = crud.create_profile(db, schemas.ProfileCreate(user_id=current_user.id))
    return crud.update_profile(db, db_profile=db_profile, profile=profile)


@router.put("/update", response_model=schemas.UserPublic)
def update_profile(
    payload: schemas.UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.update_user_profile(db, user=current_user, profile_update=payload)


@router.get("/{user_id}", response_model=schemas.Profile)
def get_profile(user_id: int, db: Session = Depends(get_db)):
    profile = crud.get_profile_by_user_id(db, user_id=user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.post("/follow/{user_id}", response_model=schemas.Follow)
def follow_user(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    existing = crud.get_follow(db, follower_id=current_user.id, following_id=user_id)
    if existing:
        return existing

    follow = crud.create_follow(db, follower_id=current_user.id, following_id=user_id)

    profile = crud.get_profile_by_user_id(db, user_id=user_id)
    if profile:
        profile.followers_count = (profile.followers_count or 0) + 1
        db.commit()
        db.refresh(profile)

    return follow


@router.delete("/follow/{user_id}")
def unfollow_user(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = crud.get_follow(db, follower_id=current_user.id, following_id=user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Follow not found")
    crud.delete_follow(db, db_follow=existing)

    profile = crud.get_profile_by_user_id(db, user_id=user_id)
    if profile:
        profile.followers_count = max((profile.followers_count or 1) - 1, 0)
        db.commit()
        db.refresh(profile)

    return {"message": "Unfollowed"}