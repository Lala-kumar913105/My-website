from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum

class RoleEnum(str, Enum):
    ADMIN = "admin"
    SELLER = "seller"
    BUYER = "buyer"
    BOTH = "both"
    USER = "user"
    DELIVERY_PARTNER = "delivery_partner"

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(default=None, min_length=8, max_length=15, pattern=r"^\+?\d{8,15}$")
    username: Optional[str] = Field(default=None, min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_.-]+$")
    profile_image: Optional[str] = Field(default=None, max_length=500)
    bio: Optional[str] = Field(default=None, max_length=300)
    location: Optional[str] = Field(default=None, max_length=120)

class UserCreate(UserBase):
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)
    first_name: Optional[str] = Field(default=None, max_length=60)
    last_name: Optional[str] = Field(default=None, max_length=60)
    role: Optional[RoleEnum] = RoleEnum.BUYER

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, max_length=60)
    last_name: Optional[str] = Field(default=None, max_length=60)
    is_active: Optional[bool] = None
    role: Optional[RoleEnum] = None
    is_blocked: Optional[bool] = None
    preferred_language: Optional[str] = None
    preferred_currency: Optional[str] = None


class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(default=None, min_length=8, max_length=15, pattern=r"^\+?\d{8,15}$")
    username: Optional[str] = Field(default=None, min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_.-]+$")
    bio: Optional[str] = Field(default=None, max_length=300)
    location: Optional[str] = Field(default=None, max_length=120)
    profile_image: Optional[str] = Field(default=None, max_length=500)

class User(UserBase):
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool
    role: RoleEnum
    is_blocked: bool
    preferred_language: Optional[str] = None
    preferred_currency: Optional[str] = None

    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    profile_image: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    role: RoleEnum

    class Config:
        from_attributes = True
