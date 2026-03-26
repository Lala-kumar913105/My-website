from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class WishlistBase(BaseModel):
    user_id: int
    product_id: int

class WishlistCreate(BaseModel):
    product_id: int

class WishlistUpdate(BaseModel):
    pass

class Wishlist(WishlistBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True