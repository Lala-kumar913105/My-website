
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum


class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    rescheduled = "rescheduled"
    completed = "completed"
    cancelled = "cancelled"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    booking_time = Column(DateTime, nullable=False)
    original_booking_time = Column(DateTime, nullable=True)
    total_amount = Column(Float, nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.pending, nullable=False)
    notes = Column(String, nullable=True)
    buyer_notes = Column(String, nullable=True)
    seller_notes = Column(String, nullable=True)
    reschedule_requested = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="bookings")
    service = relationship("Service", back_populates="bookings")
    payment = relationship("Payment", back_populates="booking", uselist=False)
