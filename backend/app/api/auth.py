from fastapi import APIRouter, Depends, HTTPException
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
)
from app.models.user import User
from app.schemas.auth import (
    PhoneNumber,
    OTPVerification,
    LoginResponse,
    OTPResponse,
    Token,
    RefreshRequest,
)

router = APIRouter()

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

@router.post("/login", response_model=LoginResponse)
def login_with_phone_number_alias(phone: PhoneNumber, db: Session = Depends(get_db)):
    """Alias for /send-otp endpoint."""
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