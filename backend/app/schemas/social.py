from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PostBase(BaseModel):
    caption: Optional[str] = Field(default=None, max_length=500)
    media_url: str = Field(..., max_length=500)
    media_type: Optional[str] = Field(default="image", pattern=r"^(image|video)$")
    hashtags: Optional[str] = Field(default=None, max_length=250)
    product_ids: Optional[List[int]] = None


class PostCreate(PostBase):
    pass


class Post(PostBase):
    id: int
    seller_id: int
    like_count: int
    comment_count: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CommentBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)


class CommentCreate(CommentBase):
    pass


class Comment(CommentBase):
    id: int
    post_id: int
    user_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Like(BaseModel):
    id: int
    post_id: int
    user_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StoryBase(BaseModel):
    media_url: str = Field(..., max_length=500)
    media_type: Optional[str] = Field(default="image", pattern=r"^(image|video)$")
    expires_at: datetime


class StoryCreate(StoryBase):
    pass


class Story(StoryBase):
    id: int
    seller_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatMessageBase(BaseModel):
    recipient_id: int
    message: str = Field(..., min_length=1, max_length=1000)


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessage(ChatMessageBase):
    id: int
    sender_id: int
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True