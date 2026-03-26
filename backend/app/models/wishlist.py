from sqlalchemy import Column, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint
from app.db.base import Base


class Wishlist(Base):
    __tablename__ = "wishlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    user = relationship("User", back_populates="wishlists")
    product = relationship("Product", back_populates="wishlists")

    __table_args__ = (
        UniqueConstraint('user_id', 'product_id'),
    )
