from pydantic import BaseModel, Field
from typing import Optional

class PhoneNumber(BaseModel):
    phone_number: str = Field(..., min_length=8, max_length=15, pattern=r"^\+?\d{8,15}$")

class OTPVerification(BaseModel):
    phone_number: str = Field(..., min_length=8, max_length=15, pattern=r"^\+?\d{8,15}$")
    otp: str = Field(..., min_length=4, max_length=8, pattern=r"^\d+$")

class Token(BaseModel):
    access_token: str
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
    token: Optional[str] = None
    refresh_token: Optional[str] = None