from datetime import datetime, timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app import schemas, crud
from app.db.session import get_db
from app.core.security import (
    generate_otp,
    store_otp,
    verify_otp,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_password_hash,
    verify_password,
    set_auth_cookie,
    clear_auth_cookie,
    get_current_user,
    generate_password_reset_token,
    hash_reset_token,
)
from app.models.user import User, RoleEnum
from app.schemas.auth import (
    PhoneNumber,
    OTPVerification,
    LoginResponse,
    OTPResponse,
    Token,
    RefreshRequest,
    EmailRegisterRequest,
    EmailLoginRequest,
    AuthResponse,
    AuthUser,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    MessageResponse,
)
from app.core.config import settings

router = APIRouter()


def _serialize_auth_user(user: User) -> AuthUser:
    full_name = " ".join(part for part in [user.first_name, user.last_name] if part).strip() or None
    return AuthUser(
        id=user.id,
        email=user.email,
        full_name=full_name,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role.value if isinstance(user.role, RoleEnum) else str(user.role),
    )


@router.post("/register", response_model=AuthResponse)
def register_with_email(payload: EmailRegisterRequest, response: Response, db: Session = Depends(get_db)):
    normalized_email = payload.email.strip().lower()

    existing_user = crud.get_user_by_email(db, email=normalized_email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    first_name = None
    last_name = None
    if payload.full_name:
        name_parts = payload.full_name.strip().split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else None

    user = User(
        email=normalized_email,
        hashed_password=get_password_hash(payload.password),
        first_name=first_name,
        last_name=last_name,
        role=RoleEnum.BUYER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    crud.create_profile(db, schemas.ProfileCreate(user_id=user.id, full_name=payload.full_name))

    access_token = create_access_token(data={"sub": str(user.id), "user_id": user.id})
    set_auth_cookie(response, access_token)

    return AuthResponse(
        message="Registration successful",
        user=_serialize_auth_user(user),
        access_token=access_token if not settings.is_production else None,
    )


@router.post("/login", response_model=AuthResponse)
def login_with_email(payload: EmailLoginRequest, response: Response, db: Session = Depends(get_db)):
    normalized_email = payload.email.strip().lower()
    user = crud.get_user_by_email(db, email=normalized_email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    is_valid_password = False
    if user.hashed_password:
        is_valid_password = verify_password(payload.password, user.hashed_password)
    elif user.password:
        # Backward compatibility for legacy rows that stored plain password.
        # On successful login we transparently migrate to hashed_password.
        is_valid_password = secrets.compare_digest(payload.password, user.password)

    if not is_valid_password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.hashed_password is None and user.password:
        user.hashed_password = get_password_hash(payload.password)
        user.password = None
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={"sub": str(user.id), "user_id": user.id})
    set_auth_cookie(response, access_token)

    return AuthResponse(
        message="Login successful",
        user=_serialize_auth_user(user),
        access_token=access_token if not settings.is_production else None,
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

    if settings.is_production:
        return ForgotPasswordResponse(message=generic_message)

    return ForgotPasswordResponse(
        message=generic_message,
        reset_token=raw_token,
        reset_url=reset_url,
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
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

    user.hashed_password = get_password_hash(payload.new_password)
    user.password = None
    user.reset_password_token_hash = None
    user.reset_password_expires_at = None
    db.add(user)
    db.commit()

    return MessageResponse(message="Password has been reset successfully")

@router.post("/send-otp", response_model=LoginResponse)
def login_with_phone_number(phone: PhoneNumber, db: Session = Depends(get_db)):
    """Send OTP to the given phone number."""
    
    # Check if user exists (if not, create a new user)
    user = db.query(User).filter(User.phone_number == phone.phone_number).first()
    if not user:
        user = User(phone_number=phone.phone_number)
        db.add(user)
        db.commit()
        db.refresh(user)
        crud.create_profile(db, schemas.ProfileCreate(user_id=user.id))
    
    # Generate and store OTP
    otp = generate_otp()
    store_otp(phone.phone_number, otp, expires_in=300)  # 5 minutes
    
    # In production, send OTP via SMS
    print(f"OTP for {phone.phone_number}: {otp}")
    
    return LoginResponse(
        message="OTP sent successfully",
        otp_sent=True,
        phone_number=phone.phone_number
    )

@router.post("/login-phone", response_model=LoginResponse)
def login_with_phone_number_alias(phone: PhoneNumber, db: Session = Depends(get_db)):
    """Backward-compatible OTP login endpoint."""
    return login_with_phone_number(phone, db)

@router.post("/verify-otp", response_model=OTPResponse)
def verify_otp_and_login(verification: OTPVerification, db: Session = Depends(get_db)):
    """Verify OTP and return JWT token if successful."""
    
    # Verify OTP
    if not verify_otp(verification.phone_number, verification.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Check if user exists (should exist since they completed login)
    user = db.query(User).filter(User.phone_number == verification.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create access + refresh tokens
    access_token = create_access_token(data={"sub": str(user.id), "user_id": user.id})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "user_id": user.id})
    
    return OTPResponse(
        message="OTP verified successfully",
        verified=True,
        token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=Token)
def refresh_access_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    """Issue a new access token using a refresh token."""
    token_payload = decode_refresh_token(payload.refresh_token)
    user_id = token_payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    access_token = create_access_token(data={"sub": str(user.id), "user_id": user.id})
    return Token(access_token=access_token, token_type="bearer")