from typing import Optional

from pydantic import BaseModel, EmailStr, Field

class PhoneNumber(BaseModel):
    phone_number: str = Field(..., min_length=8, max_length=15, pattern=r"^\+?\d{8,15}$")

class OTPVerification(BaseModel):
    phone_number: str = Field(..., min_length=8, max_length=15, pattern=r"^\+?\d{8,15}$")
    otp: str = Field(..., min_length=4, max_length=8, pattern=r"^\d+$")

class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str


class RefreshRequest(BaseModel):
    refresh_token: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

class LoginResponse(BaseModel):
    message: str
    otp_sent: bool = False
    phone_number: Optional[str] = None

class OTPResponse(BaseModel):
    message: str
    verified: bool = False
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None


class EmailRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: Optional[str] = Field(default=None, max_length=120)


class EmailLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class AuthUser(BaseModel):
    id: int
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    message: str
    user: AuthUser
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: Optional[str] = None
    reset_url: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=16)
    new_password: str = Field(..., min_length=8, max_length=128)


class MessageResponse(BaseModel):
    message: str