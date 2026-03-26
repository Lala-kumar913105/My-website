from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class CouponBase(BaseModel):
    code: str = Field(..., min_length=3, max_length=20)
    discount_percentage: Optional[float] = Field(None, ge=0, le=100)
    discount_amount: Optional[float] = Field(None, ge=0)
    min_purchase_amount: float = Field(0.0, ge=0)
    valid_until: datetime
    usage_limit: int = Field(0, ge=0)
    usage_count: int = Field(0, ge=0)
    is_active: bool = True

class CouponCreate(CouponBase):
    pass

class CouponUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=3, max_length=20)
    discount_percentage: Optional[float] = Field(None, ge=0, le=100)
    discount_amount: Optional[float] = Field(None, ge=0)
    min_purchase_amount: Optional[float] = Field(None, ge=0)
    valid_until: Optional[datetime] = None
    usage_limit: Optional[int] = Field(None, ge=0)
    usage_count: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

class Coupon(CouponBase):
    id: int
    valid_from: datetime
    created_at: datetime

    class Config:
        from_attributes = True