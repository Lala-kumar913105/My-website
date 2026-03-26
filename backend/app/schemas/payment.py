from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class PaymentStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"

class PaymentMethod(str, Enum):
    upi = "upi"
    card = "card"
    netbanking = "netbanking"
    wallet = "wallet"

class PaymentBase(BaseModel):
    amount: float
    currency: Optional[str] = "INR"
    method: PaymentMethod
    status: Optional[PaymentStatus] = PaymentStatus.pending
    transaction_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    coupon_id: Optional[int] = None

class PaymentCreate(BaseModel):
    order_id: int
    method: PaymentMethod = PaymentMethod.card
    coupon_id: Optional[int] = None

class PaymentUpdate(BaseModel):
    status: Optional[PaymentStatus] = None
    transaction_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None

class Payment(PaymentBase):
    id: int
    user_id: int
    order_id: Optional[int]
    booking_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RazorpayOrder(BaseModel):
    order_id: str
    amount: int
    currency: str
    receipt: str
    status: str

class RazorpayPayment(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str