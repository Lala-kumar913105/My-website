from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class BookingStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    rescheduled = "rescheduled"
    completed = "completed"
    cancelled = "cancelled"


class BookingBase(BaseModel):
    booking_time: datetime
    total_amount: float = Field(..., ge=0)
    status: BookingStatus = BookingStatus.pending
    notes: Optional[str] = Field(default=None, max_length=500)
    buyer_notes: Optional[str] = Field(default=None, max_length=500)
    reschedule_requested: Optional[int] = Field(default=0, ge=0, le=1)
    original_booking_time: Optional[datetime] = None


class BookingCreate(BaseModel):
    service_id: Optional[int] = None
    listing_id: Optional[int] = None
    booking_time: datetime
    notes: Optional[str] = Field(default=None, max_length=500)
    buyer_notes: Optional[str] = Field(default=None, max_length=500)


class BookingUpdate(BaseModel):
    booking_time: Optional[datetime] = None
    status: Optional[BookingStatus] = None
    notes: Optional[str] = Field(default=None, max_length=500)
    buyer_notes: Optional[str] = Field(default=None, max_length=500)
    seller_notes: Optional[str] = Field(default=None, max_length=500)
    reschedule_requested: Optional[int] = Field(default=None, ge=0, le=1)
    original_booking_time: Optional[datetime] = None


class Booking(BookingBase):
    id: int
    user_id: int
    service_id: int
    original_booking_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BookingSlotBase(BaseModel):
    service_id: Optional[int] = None
    listing_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    is_available: bool = True


class BookingSlotCreate(BookingSlotBase):
    pass


class BookingSlotUpdate(BaseModel):
    service_id: Optional[int] = None
    listing_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_available: Optional[bool] = None


class BookingSlot(BookingSlotBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True