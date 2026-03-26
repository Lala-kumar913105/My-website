from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class PayoutStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"

class PayoutBase(BaseModel):
    seller_id: Optional[int] = None
    user_id: Optional[int] = None
    amount: float = Field(..., ge=0)
    status: PayoutStatus = PayoutStatus.pending
    transaction_id: Optional[str] = None

class PayoutCreate(BaseModel):
    seller_id: Optional[int] = None
    user_id: Optional[int] = None
    amount: float = Field(..., ge=0)

class PayoutUpdate(BaseModel):
    status: Optional[PayoutStatus] = None
    transaction_id: Optional[str] = None

class Payout(PayoutBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True