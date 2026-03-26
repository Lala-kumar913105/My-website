from pydantic import BaseModel
from typing import Optional, List

class CartItemBase(BaseModel):
    product_id: int
    quantity: int = 1

class CartItemCreate(CartItemBase):
    pass

class CartItemUpdate(BaseModel):
    quantity: Optional[int] = None

class CartItem(CartItemBase):
    id: int
    cart_id: int

    class Config:
        from_attributes = True

class CartBase(BaseModel):
    is_active: Optional[bool] = True

class CartCreate(CartBase):
    user_id: int

class CartUpdate(BaseModel):
    is_active: Optional[bool] = None

class Cart(CartBase):
    id: int
    user_id: int
    items: List[CartItem] = []

    class Config:
        from_attributes = True


class CartProduct(BaseModel):
    id: int
    seller_id: int
    name: str
    description: Optional[str] = None
    price: float
    stock: int = 0
    category_id: Optional[int] = None
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class CartSeller(BaseModel):
    id: int
    user_id: int
    business_name: str
    business_address: Optional[str] = None
    business_description: Optional[str] = None
    is_verified: bool
    rating: int
    approved: Optional[bool] = None

    class Config:
        from_attributes = True


class CartItemDetail(CartItemBase):
    id: int
    cart_id: int
    product: CartProduct
    seller: Optional[CartSeller] = None

    class Config:
        from_attributes = True


class CartDetail(CartBase):
    id: int
    user_id: int
    items: List[CartItemDetail] = []

    class Config:
        from_attributes = True


class CartAddRequest(BaseModel):
    user_id: int
    product_id: int
    quantity: int = 1


class CartRemoveRequest(BaseModel):
    user_id: int
    item_id: int