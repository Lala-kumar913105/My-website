from pydantic import BaseModel
from datetime import datetime


class PlatformSettingsBase(BaseModel):
    commission_percent: float
    distance_weight: float = 0.4
    rating_weight: float = 0.2
    trust_weight: float = 0.15
    trending_weight: float = 0.15
    new_seller_weight: float = 0.1
    coin_reward_percent: float = 5.0
    daily_login_bonus: int = 2
    coin_value_in_rupees: float = 1.0
    default_currency: str = "INR"
    exchange_rate_usd: float = 83.0
    exchange_rate_inr: float = 1.0


class PlatformSettingsCreate(PlatformSettingsBase):
    pass


class PlatformSettings(PlatformSettingsBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True