
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum


class PayoutStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"


class Payout(Base):
    __tablename__ = "payouts"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # For delivery partners or direct users
    amount = Column(Float, nullable=False)
    status = Column(Enum(PayoutStatus), default=PayoutStatus.pending, nullable=False)
    transaction_id = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    seller = relationship("Seller", back_populates="payouts")
    user = relationship("User", back_populates="payouts")
