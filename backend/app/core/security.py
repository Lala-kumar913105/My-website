import secrets
import string
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List

import jwt
from fastapi import HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from pydantic import EmailStr
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app import crud, models
from app.models.user import RoleEnum

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)
AUTH_COOKIE_NAME = "access_token"
JWT_ALGORITHM = "HS256"
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 72


def validate_password_length(password: str) -> None:
    """Validate password length constraints before bcrypt operations."""
    if not password:
        raise ValueError("Password is required")

    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(f"Password must be at least {PASSWORD_MIN_LENGTH} characters long")

    # bcrypt safely supports up to 72 bytes of password input.
    if len(password) > PASSWORD_MAX_LENGTH or len(password.encode("utf-8")) > PASSWORD_MAX_LENGTH:
        raise ValueError(
            f"Password must be {PASSWORD_MAX_LENGTH} characters or fewer for bcrypt compatibility"
        )

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify if a plain password matches a hashed password."""
    if not plain_password or not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Handles malformed/legacy stored values safely without 500.
        return False

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    validate_password_length(password)
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with the given data and expiration time."""
    to_encode = data.copy()
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"iat": now, "exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def set_auth_cookie(response: Response, token: str) -> None:
    max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="none" if settings.is_production else "lax",
        max_age=max_age,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        path="/",
        samesite="none" if settings.is_production else "lax",
    )


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a refresh token with longer expiration time."""
    to_encode = data.copy()
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"iat": now, "exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    """Decode a JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def decode_refresh_token(token: str) -> dict:
    """Decode and validate a refresh token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


def generate_password_reset_token() -> str:
    return secrets.token_urlsafe(48)


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP of the specified length."""
    digits = string.digits
    return ''.join(secrets.choice(digits) for _ in range(length))

# Mock OTP storage (in production, use Redis or a database)
otp_storage = {}

def store_otp(identifier: str, otp: str, expires_in: int = 300) -> None:
    """Store an OTP for verification with expiration time (in seconds)."""
    expiration = datetime.utcnow() + timedelta(seconds=expires_in)
    otp_storage[identifier] = {"otp": otp, "expiration": expiration}

def verify_otp(identifier: str, otp: str) -> bool:
    """Verify if the given OTP is valid and not expired."""
    if identifier not in otp_storage:
        return False
    
    stored = otp_storage[identifier]
    
    if datetime.utcnow() > stored["expiration"]:
        del otp_storage[identifier]
        return False
    
    if stored["otp"] == otp:
        del otp_storage[identifier]
        return True
    
    return False

def _extract_token_from_request(request: Request) -> Optional[str]:
    cookie_token = request.cookies.get(AUTH_COOKIE_NAME)
    if not cookie_token:
        return None
    if cookie_token.lower().startswith("bearer "):
        return cookie_token.split(" ", 1)[1].strip()
    return cookie_token


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_security),
    db: Session = Depends(get_db),
):
    """Get the current user from the JWT token."""
    token = credentials.credentials if credentials else _extract_token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_access_token(token)
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = crud.get_user(db, user_id=user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user_optional(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials if credentials else _extract_token_from_request(request)
    if not token:
        return None

    try:
        payload = decode_access_token(token)
        user_id: int = payload.get("user_id")
        if user_id is None:
            return None
        user = crud.get_user(db, user_id=user_id)
        return user
    except Exception:
        return None

def _normalize_role(role: RoleEnum) -> RoleEnum:
    """Normalize legacy roles to current equivalents."""
    if role == RoleEnum.USER:
        return RoleEnum.BUYER
    return role


def get_current_active_admin(current_user: models.User = Depends(get_current_user)):
    """Get the current active admin user."""
    if _normalize_role(current_user.role) != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions - Admin access required")
    return current_user


def get_current_active_seller(current_user: models.User = Depends(get_current_user)):
    """Get the current active seller user."""
    if _normalize_role(current_user.role) not in {RoleEnum.SELLER, RoleEnum.BOTH}:
        raise HTTPException(status_code=403, detail="Not enough permissions - Seller access required")
    return current_user


def get_current_active_buyer(current_user: models.User = Depends(get_current_user)):
    """Get the current active buyer user."""
    if _normalize_role(current_user.role) not in {RoleEnum.BUYER, RoleEnum.BOTH}:
        raise HTTPException(status_code=403, detail="Not enough permissions - Buyer access required")
    return current_user


def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    """Backward compatible buyer alias (BUYER/BOTH/USER)."""
    if _normalize_role(current_user.role) not in {RoleEnum.BUYER, RoleEnum.BOTH}:
        raise HTTPException(status_code=403, detail="Not enough permissions - Buyer access required")
    return current_user


def get_current_active_delivery_partner(current_user: models.User = Depends(get_current_user)):
    """Get the current active delivery partner user."""
    if _normalize_role(current_user.role) != RoleEnum.DELIVERY_PARTNER:
        raise HTTPException(status_code=403, detail="Not enough permissions - Delivery partner access required")
    return current_user

def get_current_user_with_roles(allowed_roles: List[RoleEnum]):
    """Dependency to get current user with specific role(s) allowed."""
    def dependency(current_user: models.User = Depends(get_current_user)):
        normalized_role = _normalize_role(current_user.role)
        normalized_allowed = {_normalize_role(role) for role in allowed_roles}
        if normalized_role not in normalized_allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Not enough permissions - Allowed roles: {[role.value for role in allowed_roles]}"
            )
        return current_user
    return dependency
