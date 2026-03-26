from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime


class ProfileBase(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=120)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    cover_image: Optional[str] = Field(default=None, max_length=500)
    bio: Optional[str] = Field(default=None, max_length=500)
    phone: Optional[str] = Field(default=None, min_length=8, max_length=15, pattern=r"^\+?\d{8,15}$")
    city: Optional[str] = Field(default=None, max_length=80)
    state: Optional[str] = Field(default=None, max_length=80)
    country: Optional[str] = Field(default=None, max_length=80)
    rating: Optional[int] = None
    followers_count: Optional[int] = None
    total_reviews: Optional[int] = None
    social_links: Optional[Dict[str, str]] = None


class ProfileCreate(ProfileBase):
    user_id: int


class ProfileUpdate(ProfileBase):
    pass


class Profile(ProfileBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Follow(BaseModel):
    id: int
    follower_id: int
    following_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True