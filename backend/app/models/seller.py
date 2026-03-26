from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.db.base import Base

class Seller(Base):
    __tablename__ = "sellers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    business_name = Column(String, index=True, nullable=False)
    business_address = Column(String, nullable=True)
    business_description = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    rating = Column(Integer, default=0)
    approved = Column(Boolean, default=False)
    delivery_rate = Column(Float, default=1.5)  # Delivery rate per km in ₹ (legacy)
    delivery_per_km = Column(Float, default=1.5)  # Delivery rate per km in ₹
    latitude = Column(Float, nullable=True)  # Seller's location latitude
    longitude = Column(Float, nullable=True)  # Seller's location longitude
    
    user = relationship("User", backref="seller")
    services = relationship("Service", back_populates="seller")
    posts = relationship("Post", back_populates="seller")
    commissions = relationship("Commission", back_populates="seller")
    payouts = relationship("Payout", back_populates="seller")
