from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class SellerPaymentDetails(Base):
    __tablename__ = "seller_payment_details"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id", ondelete="CASCADE"), nullable=False, unique=True)
    upi_id = Column(String(100), nullable=False)
    account_name = Column(String(150), nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    seller = relationship("Seller", backref="payment_details")