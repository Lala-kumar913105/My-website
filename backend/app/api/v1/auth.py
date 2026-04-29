from datetime import datetime, timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app import crud, schemas
from app.core.config import settings
from app.core.security import (
    clear_auth_cookie,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    generate_otp,
    generate_password_reset_token,
    get_current_user,
    get_password_hash,
    hash_reset_token,
    set_auth_cookie,
    store_otp,
    validate_password_length,
    verify_otp,
    verify_password,
)
from app.db.session import get_db
from app.models.user import RoleEnum, User
from app.schemas.auth import (
    AuthResponse,
    AuthUser,
    EmailLoginRequest,
    EmailRegisterRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginResponse,
    MessageResponse,
    OTPResponse,
    OTPVerification,
    PhoneNumber,
    RefreshRequest,
    ResetPasswordTokenValidationResponse,
    ResetPasswordRequest,
    Token,
)

router = APIRouter()


def _serialize_auth_user(user: User) -> AuthUser:
    full_name = " ".join(
        part for part in [user.first_name, user.last_name] if part
    ).strip() or None

    return AuthUser(
        id=user.id,
        email=user.email,
        full_name=full_name,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role.value if isinstance(user.role, RoleEnum) else str(user.role),
    )


def _ensure_profile(db: Session, user_id: int, full_name: str | None = None) -> None:
    if crud.get_profile_by_user_id(db, user_id=user_id):
        return
    crud.create_profile(db, schemas.ProfileCreate(user_id=user_id, full_name=full_name))


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_with_email(
    payload: EmailRegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    normalized_email = payload.email.strip().lower()
    existing_user = crud.get_user_by_email(db, email=normalized_email)
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already registered")

    try:
        validate_password_length(payload.password)
        hashed_password = get_password_hash(payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not process password securely. Please try again.",
        ) from exc

    first_name = None
    last_name = None
    if payload.full_name:
        name_parts = payload.full_name.strip().split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else None

    # NOTE:
    # Production DBs with older migrations may still enforce role enum values
    # like ADMIN/SELLER/USER/DELIVERY_PARTNER only (without BUYER/BOTH).
    # Use USER at write-time for backward compatibility, while app logic
    # normalizes USER to BUYER where needed.
    user = User(
        email=normalized_email,
        hashed_password=hashed_password,
        password=None,
        first_name=first_name,
        last_name=last_name,
        role=RoleEnum.USER,
        is_active=True,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        _ensure_profile(db, user.id, payload.full_name)
    except IntegrityError as exc:
        db.rollback()
        # Keep duplicate email errors readable for frontend UX
        raise HTTPException(status_code=409, detail="Email already registered") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create account at the moment. Please try again.",
        ) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unexpected server error while creating account.",
        ) from exc

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "user_id": user.id})
    set_auth_cookie(response, access_token)

    return AuthResponse(
        message="Registration successful",
        user=_serialize_auth_user(user),
        access_token=access_token if not settings.is_production else None,
        refresh_token=refresh_token if not settings.is_production else None,
    )


@router.post("/login", response_model=AuthResponse)
def login_with_email(
    payload: EmailLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    normalized_email = payload.email.strip().lower()
    user = crud.get_user_by_email(db, email=normalized_email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if getattr(user, "is_blocked", False):
        raise HTTPException(status_code=403, detail="User account is blocked")

    is_valid_password = False

    try:
        if user.hashed_password:
            is_valid_password = verify_password(payload.password, user.hashed_password)
        elif user.password:
            # Legacy plain-password compatibility path
            is_valid_password = secrets.compare_digest(payload.password, user.password)
    except ValueError:
        is_valid_password = False

    if not is_valid_password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.hashed_password and user.password:
        try:
            user.hashed_password = get_password_hash(payload.password)
            user.password = None
            db.add(user)
            db.commit()
            db.refresh(user)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    _ensure_profile(db, user.id)

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "user_id": user.id})
    set_auth_cookie(response, access_token)

    return AuthResponse(
        message="Login successful",
        user=_serialize_auth_user(user),
        access_token=access_token if not settings.is_production else None,
        refresh_token=refresh_token if not settings.is_production else None,
    )


@router.post("/logout", response_model=MessageResponse)
def logout(response: Response):
    clear_auth_cookie(response)
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=AuthUser)
def read_auth_me(current_user: User = Depends(get_current_user)):
    return _serialize_auth_user(current_user)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    normalized_email = payload.email.strip().lower()
    user = crud.get_user_by_email(db, email=normalized_email)

    generic_message = "If an account exists for this email, a reset link has been generated"
    if not user:
        return ForgotPasswordResponse(message=generic_message)

    raw_token = generate_password_reset_token()
    user.reset_password_token_hash = hash_reset_token(raw_token)
    user.reset_password_expires_at = datetime.utcnow() + timedelta(minutes=30)
    db.add(user)
    db.commit()

    reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={raw_token}"
    if not settings.is_production:
        print(f"[auth] Password reset link generated for {normalized_email}: {reset_url}")
    return ForgotPasswordResponse(message=generic_message)


@router.get("/reset-password/validate", response_model=ResetPasswordTokenValidationResponse)
def validate_reset_password_token(token: str, db: Session = Depends(get_db)):
    token_hash = hash_reset_token(token)
    user = db.query(User).filter(User.reset_password_token_hash == token_hash).first()
    if not user:
        return ResetPasswordTokenValidationResponse(
            valid=False,
            message="This reset link is invalid or has already been used.",
        )

    if not user.reset_password_expires_at or user.reset_password_expires_at < datetime.utcnow():
        return ResetPasswordTokenValidationResponse(
            valid=False,
            message="This reset link has expired. Please request a new one.",
        )

    return ResetPasswordTokenValidationResponse(
        valid=True,
        message="Reset link is valid.",
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        validate_password_length(payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    token_hash = hash_reset_token(payload.token)
    user = db.query(User).filter(User.reset_password_token_hash == token_hash).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if not user.reset_password_expires_at or user.reset_password_expires_at < datetime.utcnow():
        user.reset_password_token_hash = None
        user.reset_password_expires_at = None
        db.add(user)
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    try:
        user.hashed_password = get_password_hash(payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    user.password = None
    user.reset_password_token_hash = None
    user.reset_password_expires_at = None
    db.add(user)
    db.commit()

    return MessageResponse(message="Password has been reset successfully")


@router.post("/send-otp", response_model=LoginResponse)
def login_with_phone_number(phone: PhoneNumber, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone_number == phone.phone_number).first()

    if not user:
        user = User(phone_number=phone.phone_number, role=RoleEnum.BUYER)
        db.add(user)
        db.commit()
        db.refresh(user)

    _ensure_profile(db, user.id)

    otp = generate_otp()
    store_otp(phone.phone_number, otp, expires_in=300)
    print(f"OTP for {phone.phone_number}: {otp}")

    return LoginResponse(
        message="OTP sent successfully",
        otp_sent=True,
        phone_number=phone.phone_number,
    )


@router.post("/login-phone", response_model=LoginResponse)
def login_with_phone_number_alias(phone: PhoneNumber, db: Session = Depends(get_db)):
    return login_with_phone_number(phone, db)


@router.post("/verify-otp", response_model=OTPResponse)
def verify_otp_and_login(
    verification: OTPVerification,
    response: Response,
    db: Session = Depends(get_db),
):
    if not verify_otp(verification.phone_number, verification.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user = db.query(User).filter(User.phone_number == verification.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "user_id": user.id})
    set_auth_cookie(response, access_token)

    return OTPResponse(
        message="OTP verified successfully",
        verified=True,
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=Token)
def refresh_access_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    token_payload = decode_refresh_token(payload.refresh_token)
    user_id = token_payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return Token(access_token=access_token, refresh_token=None, token_type="bearer")