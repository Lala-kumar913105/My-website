from pydantic import BaseModel, Field
from typing import Optional


class ListingBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    price: float = Field(..., ge=0)
    type: str = Field(..., pattern=r"^(product|service)$")
    stock: Optional[int] = Field(default=None, ge=0)
    duration_minutes: Optional[int] = Field(default=None, ge=1, le=1440)
    source_id: Optional[int] = None
    source_type: Optional[str] = Field(default=None, pattern=r"^(product|service)$")


class ListingCreate(ListingBase):
    seller_id: int


class ListingUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    price: Optional[float] = Field(default=None, ge=0)
    type: Optional[str] = Field(default=None, pattern=r"^(product|service)$")
    stock: Optional[int] = Field(default=None, ge=0)
    duration_minutes: Optional[int] = Field(default=None, ge=1, le=1440)
    source_id: Optional[int] = None
    source_type: Optional[str] = Field(default=None, pattern=r"^(product|service)$")


class Listing(ListingBase):
    id: int
    seller_id: int

    class Config:
        from_attributes = True