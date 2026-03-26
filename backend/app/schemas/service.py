from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    category_id: Optional[int] = None
    is_active: Optional[bool] = True


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration_minutes: Optional[int] = None
    is_active: Optional[bool] = None


class Service(ServiceBase):
    id: int
    seller_id: int
    category_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True