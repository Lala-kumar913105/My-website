from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class UserCoinsBase(BaseModel):
    balance: int
    total_earned: int
    total_spent: int
    streak_count: int
    last_login_date: Optional[date] = None
    badge_level: int
    badge_label: Optional[str] = None


class UserCoins(UserCoinsBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class CoinTransactionBase(BaseModel):
    amount: int
    transaction_type: str
    reason: str
    activity_metadata: Optional[str] = None


class CoinTransaction(CoinTransactionBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CoinRedeemRequest(BaseModel):
    coins_to_redeem: int
    reward_type: str


class CoinEarnRequest(BaseModel):
    reason: str
    amount: int