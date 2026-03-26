
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Boolean, Float
from sqlalchemy.orm import relationship
from app.db.base import Base


class DeliveryPartner(Base):
    __tablename__ = "delivery_partners"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    vehicle_type = Column(String, nullable=True)
    license_number = Column(String, unique=True, nullable=True)
    is_available = Column(Boolean, default=True)
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="delivery_partner")
    deliveries = relationship("Delivery", back_populates="delivery_partner")
