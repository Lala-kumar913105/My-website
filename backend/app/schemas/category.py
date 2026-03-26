from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from typing import List


class CategoryBase(BaseModel):
    name: str = Field(..., max_length=255)
    type: str = Field("product", max_length=50)
    icon: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(CategoryBase):
    name: Optional[str] = Field(None, max_length=255)
    type: Optional[str] = Field(None, max_length=50)


class Category(CategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    children: Optional[List["Category"]] = []
    products: Optional[List["Product"]] = []

    class Config:
        orm_mode = True


# Import after definition to avoid circular dependency
from app.schemas.product import Product
Category.update_forward_refs()