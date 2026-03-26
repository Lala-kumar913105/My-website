
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum


class OrderStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    preparing = "preparing"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    cancelled = "cancelled"


class PaymentMethod(str, enum.Enum):
    upi = "upi"
    cod = "cod"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=True)
    total_amount = Column(Float, nullable=False)
    discount_amount = Column(Float, default=0.0)
    final_amount = Column(Float, nullable=False, default=0.0)
    coupon_code = Column(String, nullable=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.pending, nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=True)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False)
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    commission_amount = Column(Float, default=0.0)
    seller_earning = Column(Float, default=0.0)
    platform_earning = Column(Float, default=0.0)
    shipping_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User")
    seller = relationship("Seller")
    order_items = relationship("OrderItem", back_populates="order")
    payment = relationship("Payment", back_populates="order", uselist=False)
    delivery = relationship("Delivery", back_populates="order", uselist=False)


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price_at_purchase = Column(Float, nullable=False)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    order = relationship("Order", back_populates="order_items")
    product = relationship("Product")
