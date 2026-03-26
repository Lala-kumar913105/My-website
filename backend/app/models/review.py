
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5 star rating
    review_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    user = relationship("User", back_populates="reviews")
    product = relationship("Product", back_populates="reviews")
    seller = relationship("Seller")
    service = relationship("Service", back_populates="reviews")
