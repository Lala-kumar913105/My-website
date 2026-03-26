
from sqlalchemy import Column, Integer, String, Float, DateTime, func, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    discount_percentage = Column(Float, nullable=True)
    discount_amount = Column(Float, nullable=True)
    min_purchase_amount = Column(Float, default=0.0)
    valid_from = Column(DateTime, default=func.now())
    valid_until = Column(DateTime, nullable=False)
    usage_limit = Column(Integer, default=0)
    usage_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    payments = relationship("Payment", back_populates="coupon")
