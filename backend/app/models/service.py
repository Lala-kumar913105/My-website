
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, func, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    duration_minutes = Column(Integer, nullable=False) # Duration of the service in minutes
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    seller = relationship("Seller", back_populates="services")
    category = relationship("Category")
    bookings = relationship("Booking", back_populates="service")
    slots = relationship("BookingSlot", back_populates="service")
    reviews = relationship("Review", back_populates="service")
