from sqlalchemy import Column, Integer, Float, DateTime, func, String
from app.db.base import Base


class PlatformSettings(Base):
    __tablename__ = "platform_settings"

    id = Column(Integer, primary_key=True, index=True)
    commission_percent = Column(Float, default=5.0)
    distance_weight = Column(Float, default=0.4)
    rating_weight = Column(Float, default=0.2)
    trust_weight = Column(Float, default=0.15)
    trending_weight = Column(Float, default=0.15)
    new_seller_weight = Column(Float, default=0.1)
    coin_reward_percent = Column(Float, default=5.0)
    daily_login_bonus = Column(Integer, default=2)
    coin_value_in_rupees = Column(Float, default=1.0)
    default_currency = Column(String(10), default="INR")
    exchange_rate_usd = Column(Float, default=83.0)
    exchange_rate_inr = Column(Float, default=1.0)
    created_at = Column(DateTime, default=func.now())