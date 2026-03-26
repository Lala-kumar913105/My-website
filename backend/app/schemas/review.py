from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ReviewBase(BaseModel):
    rating: int
    review_text: Optional[str] = None


class ReviewCreate(BaseModel):
    order_id: int
    rating: int
    review_text: Optional[str] = None


class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    review_text: Optional[str] = None


class Review(ReviewBase):
    id: int
    order_id: int
    product_id: Optional[int]
    seller_id: Optional[int]
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ProductReviewSummary(BaseModel):
    average_rating: float
    total_reviews: int
    reviews: list[dict]


class SellerRatingSummary(BaseModel):
    average_rating: float
    total_reviews: int