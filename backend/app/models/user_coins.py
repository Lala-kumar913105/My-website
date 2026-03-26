from sqlalchemy import Column, Integer, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.db.base import Base


class UserCoins(Base):
    __tablename__ = "user_coins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    balance = Column(Integer, default=0)
    total_earned = Column(Integer, default=0)
    total_spent = Column(Integer, default=0)
    streak_count = Column(Integer, default=0)
    last_login_date = Column(Date, nullable=True)
    badge_level = Column(Integer, default=0)

    user = relationship("User")