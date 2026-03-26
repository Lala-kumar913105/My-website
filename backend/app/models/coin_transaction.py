from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from app.db.base import Base


class CoinTransaction(Base):
    __tablename__ = "coin_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Integer, nullable=False)
    transaction_type = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    activity_metadata = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())