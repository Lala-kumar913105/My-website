from pydantic import BaseModel, Field
from typing import Optional

class ProductBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    price: float = Field(..., ge=0)
    stock: int = Field(default=0, ge=0)
    category_id: Optional[int] = None
    image_url: Optional[str] = Field(default=None, max_length=500)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)

class ProductCreate(ProductBase):
    seller_id: int

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    price: Optional[float] = Field(default=None, ge=0)
    stock: Optional[int] = Field(default=None, ge=0)
    category_id: Optional[int] = None
    image_url: Optional[str] = Field(default=None, max_length=500)
    is_active: Optional[bool] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)

class Product(ProductBase):
    id: int
    seller_id: int
    is_active: bool
    distance: Optional[float] = None
    delivery_charge: Optional[float] = None
    delivery_rate: Optional[float] = None
    delivery_per_km: Optional[float] = None
    original_price: Optional[float] = None
    converted_price: Optional[float] = None
    currency_code: Optional[str] = None

    class Config:
        from_attributes = True
