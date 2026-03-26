from pydantic import BaseModel, Field
from typing import Optional

class SellerBase(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=150)
    business_address: Optional[str] = Field(default=None, max_length=200)
    business_description: Optional[str] = Field(default=None, max_length=1000)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    delivery_rate: Optional[float] = Field(default=1.5, ge=0)
    delivery_per_km: Optional[float] = Field(default=1.5, ge=0)

class SellerCreate(SellerBase):
    user_id: int

class SellerUpdate(BaseModel):
    business_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    business_address: Optional[str] = Field(default=None, max_length=200)
    business_description: Optional[str] = Field(default=None, max_length=1000)
    is_verified: Optional[bool] = None
    rating: Optional[int] = Field(default=None, ge=0, le=5)
    approved: Optional[bool] = None
    delivery_rate: Optional[float] = Field(default=None, ge=0)
    delivery_per_km: Optional[float] = Field(default=None, ge=0)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)

class Seller(SellerBase):
    id: int
    user_id: int
    is_verified: bool
    rating: int
    approved: Optional[bool] = None

    class Config:
        from_attributes = True
