
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


class PaymentMethod(str, enum.Enum):
    upi = "upi"
    card = "card"
    netbanking = "netbanking"
    wallet = "wallet"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    method = Column(Enum(PaymentMethod), nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False)
    transaction_id = Column(String, unique=True, index=True, nullable=True)
    razorpay_order_id = Column(String, nullable=True)
    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="payments")
    order = relationship("Order", back_populates="payment")
    booking = relationship("Booking", back_populates="payment")
    coupon = relationship("Coupon", back_populates="payments")
