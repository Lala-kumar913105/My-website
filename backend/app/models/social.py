from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func, Boolean, Table
from sqlalchemy.orm import relationship
from app.db.base import Base


post_products = Table(
    "post_products",
    Base.metadata,
    Column("post_id", Integer, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    Column("product_id", Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
)


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id", ondelete="CASCADE"), nullable=False)
    caption = Column(Text, nullable=True)
    media_url = Column(String, nullable=False)
    media_type = Column(String, default="image")
    hashtags = Column(Text, nullable=True)
    like_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    seller = relationship("Seller", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")
    products = relationship("Product", secondary=post_products)


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    post = relationship("Post", back_populates="comments")
    user = relationship("User")


class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    post = relationship("Post", back_populates="likes")
    user = relationship("User")


class Story(Base):
    __tablename__ = "stories"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id", ondelete="CASCADE"), nullable=False)
    media_url = Column(String, nullable=False)
    media_type = Column(String, default="image")
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    seller = relationship("Seller")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])