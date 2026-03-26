from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class OrderStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    preparing = "preparing"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    cancelled = "cancelled"


class PaymentMethod(str, Enum):
    upi = "upi"
    cod = "cod"


class PaymentStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"

class OrderItemBase(BaseModel):
    product_id: int
    quantity: int = Field(..., ge=1)
    price_at_purchase: float = Field(..., ge=0)

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemUpdate(BaseModel):
    quantity: Optional[int] = Field(default=None, ge=1)
    price_at_purchase: Optional[float] = Field(default=None, ge=0)

class OrderItem(OrderItemBase):
    id: int
    order_id: int

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    total_amount: float = Field(..., ge=0)
    discount_amount: float = Field(default=0.0, ge=0)
    final_amount: float = Field(default=0.0, ge=0)
    coupon_code: Optional[str] = Field(default=None, max_length=40)
    status: OrderStatus = OrderStatus.pending
    payment_method: Optional[PaymentMethod] = None
    payment_status: PaymentStatus = PaymentStatus.pending
    current_latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    current_longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    commission_amount: Optional[float] = Field(default=0.0, ge=0)
    seller_earning: Optional[float] = Field(default=0.0, ge=0)
    platform_earning: Optional[float] = Field(default=0.0, ge=0)
    shipping_address: Optional[str] = Field(default=None, max_length=300)

class OrderCreate(BaseModel):
    shipping_address: Optional[str] = Field(default=None, max_length=300)
    coupon_code: Optional[str] = Field(default=None, max_length=40)
    payment_method: Optional[PaymentMethod] = None
    delivery_charge: Optional[float] = Field(default=None, ge=0)
    subtotal_amount: Optional[float] = Field(default=None, ge=0)
    use_coins: Optional[bool] = False

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    payment_method: Optional[PaymentMethod] = None
    payment_status: Optional[PaymentStatus] = None
    discount_amount: Optional[float] = Field(default=None, ge=0)
    final_amount: Optional[float] = Field(default=None, ge=0)
    coupon_code: Optional[str] = Field(default=None, max_length=40)
    current_latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    current_longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    commission_amount: Optional[float] = Field(default=None, ge=0)
    seller_earning: Optional[float] = Field(default=None, ge=0)
    platform_earning: Optional[float] = Field(default=None, ge=0)
    shipping_address: Optional[str] = Field(default=None, max_length=300)

class Order(OrderBase):
    id: int
    user_id: int
    seller_id: Optional[int] = None
    order_items: List[OrderItem] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderProduct(BaseModel):
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


class OrderSeller(BaseModel):
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


class OrderItemDetail(OrderItemBase):
    id: int
    order_id: int
    product: OrderProduct
    seller: Optional[OrderSeller] = None

    class Config:
        from_attributes = True


class OrderDetail(OrderBase):
    id: int
    user_id: int
    seller_id: Optional[int] = None
    order_items: List[OrderItemDetail] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True