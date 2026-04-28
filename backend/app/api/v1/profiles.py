from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_user
from app.core.config import settings
import hashlib
import time
import requests
import os
import uuid
import mimetypes

router = APIRouter()

MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}
LOCAL_AVATAR_UPLOAD_DIR = os.path.join("uploads", "avatars")


def _is_cloudinary_configured() -> bool:
    return bool(
        settings.CLOUDINARY_CLOUD_NAME.strip()
        and settings.CLOUDINARY_API_KEY.strip()
        and settings.CLOUDINARY_API_SECRET.strip()
    )


def _upload_to_cloudinary(file: UploadFile, file_bytes: bytes, user_id: int) -> str:
    cloud_name = settings.CLOUDINARY_CLOUD_NAME.strip()
    api_key = settings.CLOUDINARY_API_KEY.strip()
    api_secret = settings.CLOUDINARY_API_SECRET.strip()

    timestamp = str(int(time.time()))
    folder = "avatars"
    public_id = f"user_{user_id}_{timestamp}"
    signature_base = f"folder={folder}&public_id={public_id}&timestamp={timestamp}{api_secret}"
    signature = hashlib.sha1(signature_base.encode("utf-8")).hexdigest()

    upload_url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
    response = requests.post(
        upload_url,
        files={
            "file": (file.filename or "avatar.jpg", file_bytes, file.content_type),
        },
        data={
            "api_key": api_key,
            "timestamp": timestamp,
            "signature": signature,
            "folder": folder,
            "public_id": public_id,
        },
        timeout=20,
    )

    payload = response.json() if response.content else {}
    if not response.ok:
        detail = payload.get("error", {}).get("message") or "Cloudinary upload failed"
        raise HTTPException(status_code=502, detail=detail)

    secure_url = payload.get("secure_url")
    if not secure_url:
        raise HTTPException(status_code=502, detail="Image URL not returned from Cloudinary")

    return secure_url


def _upload_to_local_storage(file: UploadFile, file_bytes: bytes) -> str:
    os.makedirs(LOCAL_AVATAR_UPLOAD_DIR, exist_ok=True)

    ext_from_name = os.path.splitext(file.filename or "")[1].lower()
    if not ext_from_name:
        guessed_ext = mimetypes.guess_extension(file.content_type or "")
        ext_from_name = guessed_ext or ".jpg"

    unique_filename = f"{uuid.uuid4().hex}{ext_from_name}"
    file_path = os.path.join(LOCAL_AVATAR_UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        buffer.write(file_bytes)

    return f"/uploads/avatars/{unique_filename}"


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


@router.post("/avatar")
def upload_avatar(
    request: Request,
    file: UploadFile | None = File(default=None),
    avatar: UploadFile | None = File(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload_file = file or avatar

    if not upload_file:
        raise HTTPException(status_code=400, detail="No image file provided")

    if not upload_file.content_type or not upload_file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    if upload_file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    file_bytes = upload_file.file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="File is empty")

    if len(file_bytes) > MAX_AVATAR_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be under 2MB")

    try:
        if _is_cloudinary_configured():
            image_url = _upload_to_cloudinary(upload_file, file_bytes, current_user.id)
            storage = "cloudinary"
        else:
            local_path = _upload_to_local_storage(upload_file, file_bytes)
            image_url = f"{str(request.base_url).rstrip('/')}{local_path}"
            storage = "local"

        current_user.profile_image = image_url

        profile = crud.get_profile_by_user_id(db, user_id=current_user.id)
        if not profile:
            profile = crud.create_profile(db, schemas.ProfileCreate(user_id=current_user.id))
        profile.avatar_url = image_url

        db.commit()
        db.refresh(current_user)

        return {
            "secure_url": image_url,
            "url": image_url,
            "profile_image": image_url,
            "storage": storage,
            "message": "Avatar uploaded successfully",
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Avatar upload failed: {str(exc)}")


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