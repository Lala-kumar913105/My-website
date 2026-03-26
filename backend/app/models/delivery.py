
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum


class DeliveryStatus(str, enum.Enum):
    pending = "pending"
    picked_up = "picked_up"
    in_transit = "in_transit"
    delivered = "delivered"
    failed = "failed"
    cancelled = "cancelled"


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    delivery_partner_id = Column(Integer, ForeignKey("delivery_partners.id"), nullable=True)
    status = Column(Enum(DeliveryStatus), default=DeliveryStatus.pending, nullable=False)
    pickup_location = Column(String, nullable=True)
    delivery_location = Column(String, nullable=False)
    estimated_delivery_time = Column(DateTime, nullable=True)
    actual_delivery_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    order = relationship("Order", back_populates="delivery")
    delivery_partner = relationship("DeliveryPartner", back_populates="deliveries")
