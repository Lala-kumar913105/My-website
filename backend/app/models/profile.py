from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    cover_image = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    phone = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    country = Column(String, nullable=True)
    rating = Column(Integer, nullable=True)
    followers_count = Column(Integer, default=0)
    total_reviews = Column(Integer, default=0)
    social_links = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    user = relationship("User", backref="profile")


class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    following_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
