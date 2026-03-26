
from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Commission(Base):
    __tablename__ = "commissions"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    amount = Column(Float, nullable=False)
    commission_rate = Column(Float, nullable=False)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    seller = relationship("Seller", back_populates="commissions")
    order = relationship("Order") # One-way relationship as Order already has payment
    booking = relationship("Booking") # One-way relationship as Booking already has payment
