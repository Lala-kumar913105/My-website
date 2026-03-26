from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from app.db.base import Base


class UserActivity(Base):
    __tablename__ = "user_activity"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    activity_type = Column(String, nullable=False)
    target_id = Column(Integer, nullable=True)
    activity_metadata = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())