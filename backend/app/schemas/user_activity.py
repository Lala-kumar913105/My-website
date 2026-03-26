from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserActivityCreate(BaseModel):
    activity_type: str
    target_id: Optional[int] = None
    activity_metadata: Optional[str] = None


class UserActivity(BaseModel):
    id: int
    user_id: int
    activity_type: str
    target_id: Optional[int] = None
    activity_metadata: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True