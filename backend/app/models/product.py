from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    image_url = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    seller = relationship("Seller", backref="products")
    reviews = relationship("Review", back_populates="product")
    wishlists = relationship("Wishlist", back_populates="product")
