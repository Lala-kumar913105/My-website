from sqlalchemy import Column, Integer, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class BookingSlot(Base):
    __tablename__ = "booking_slots"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=True, index=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    service = relationship("Service", back_populates="slots")
    listing = relationship("Listing")