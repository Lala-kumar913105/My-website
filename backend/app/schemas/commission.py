from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class CommissionBase(BaseModel):
    seller_id: int
    order_id: Optional[int] = None
    booking_id: Optional[int] = None
    amount: float = Field(..., ge=0)
    commission_rate: float = Field(..., ge=0, le=100)

class CommissionCreate(CommissionBase):
    pass

class CommissionUpdate(BaseModel):
    seller_id: Optional[int] = None
    order_id: Optional[int] = None
    booking_id: Optional[int] = None
    amount: Optional[float] = Field(None, ge=0)
    commission_rate: Optional[float] = Field(None, ge=0, le=100)

class Commission(CommissionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True