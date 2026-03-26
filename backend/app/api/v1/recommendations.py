from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.recommendation_service import get_recommendations, get_trending_products
from app.utils.cache import cache

router = APIRouter()


@router.get("/recommendations", response_model=list[dict])
def recommend_products(
    user_latitude: float = Query(...),
    user_longitude: float = Query(...),
    category_id: int | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get recommended products based on distance, ratings, and trends."""
    cache_key = f"recommendations:{user_latitude}:{user_longitude}:{category_id}:{limit}"
    recommendations = cache.get_or_set(
        cache_key,
        ttl_seconds=120,
        factory=lambda: get_recommendations(
            db=db,
            user_latitude=user_latitude,
            user_longitude=user_longitude,
            category_id=category_id,
            limit=limit,
        ),
    )

    return [
        {
            "product": item["product"],
            "seller": item["seller"],
            "score": item["score"],
            "trending_orders": item["trending_orders"],
            "seller_rating": item["seller_rating"],
        }
        for item in recommendations
    ]


@router.get("/trending", response_model=list[dict])
def trending_products(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get trending products based on last 7 days sales."""
    return cache.get_or_set(
        f"trending_products:{limit}",
        ttl_seconds=300,
        factory=lambda: get_trending_products(db=db, limit=limit),
    )