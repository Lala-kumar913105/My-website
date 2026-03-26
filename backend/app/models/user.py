from sqlalchemy import Column, Integer, String, Boolean, Enum, Date
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum

class RoleEnum(enum.Enum):
    ADMIN = "admin"
    SELLER = "seller"
    BUYER = "buyer"
    BOTH = "both"
    USER = "user"
    DELIVERY_PARTNER = "delivery_partner"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    phone_number = Column(String, unique=True, index=True, nullable=True)
    password = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    username = Column(String, unique=True, index=True, nullable=True)
    profile_image = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    location = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.BUYER, nullable=False)
    is_blocked = Column(Boolean, default=False)
    coins_balance = Column(Integer, default=0)
    last_login_bonus_date = Column(Date, nullable=True)
    preferred_language = Column(String(10), default="en")
    preferred_currency = Column(String(10), default="INR")
    
    # Relationships
    payments = relationship("Payment", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    bookings = relationship("Booking", back_populates="user")
    wishlists = relationship("Wishlist", back_populates="user")
    delivery_partner = relationship("DeliveryPartner", back_populates="user", uselist=False)
    payouts = relationship("Payout", back_populates="user")
