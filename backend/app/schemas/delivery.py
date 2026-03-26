from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class DeliveryStatus(str, Enum):
    pending = "pending"
    picked_up = "picked_up"
    in_transit = "in_transit"
    delivered = "delivered"
    failed = "failed"
    cancelled = "cancelled"

class DeliveryBase(BaseModel):
    order_id: int
    delivery_partner_id: Optional[int] = None
    status: Optional[DeliveryStatus] = DeliveryStatus.pending
    pickup_location: Optional[str] = None
    delivery_location: Optional[str] = None
    estimated_delivery_time: Optional[datetime] = None
    actual_delivery_time: Optional[datetime] = None

class DeliveryCreate(DeliveryBase):
    pass

class DeliveryUpdate(BaseModel):
    delivery_partner_id: Optional[int] = None
    status: Optional[DeliveryStatus] = None
    pickup_location: Optional[str] = None
    delivery_location: Optional[str] = None
    estimated_delivery_time: Optional[datetime] = None
    actual_delivery_time: Optional[datetime] = None

class Delivery(DeliveryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DeliveryPartnerBase(BaseModel):
    vehicle_type: Optional[str] = None
    license_number: Optional[str] = None
    is_available: Optional[bool] = True
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None

class DeliveryPartnerCreate(DeliveryPartnerBase):
    pass

class DeliveryPartnerUpdate(DeliveryPartnerBase):
    pass

class DeliveryPartner(DeliveryPartnerBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True