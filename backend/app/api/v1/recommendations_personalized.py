from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app import schemas, models
from app.db.session import get_db
from app.core.security import get_current_user
from app.services.recommendation_engine import (
    get_recommended_products,
    get_recommended_feed,
    get_recently_viewed,
)
from app.services.recommendation_service import get_recommendations, get_trending_products
from app.utils.cache import cache

router = APIRouter()


@router.get("/products", response_model=list[schemas.Product])
def recommended_products(
    current_user: models.User = Depends(get_current_user),
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    return cache.get_or_set(
        f"recommended_products:{current_user.id}:{limit}",
        ttl_seconds=180,
        factory=lambda: get_recommended_products(db, user_id=current_user.id, limit=limit),
    )


@router.get("/recently-viewed", response_model=list[schemas.Product])
def recently_viewed(
    current_user: models.User = Depends(get_current_user),
    limit: int = Query(8, ge=1, le=50),
    db: Session = Depends(get_db),
):
    return cache.get_or_set(
        f"recently_viewed:{current_user.id}:{limit}",
        ttl_seconds=120,
        factory=lambda: get_recently_viewed(db, user_id=current_user.id, limit=limit),
    )


@router.get("/feed", response_model=list[schemas.Post])
def recommended_feed(
    current_user: models.User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    return cache.get_or_set(
        f"recommended_feed:{current_user.id}:{limit}",
        ttl_seconds=120,
        factory=lambda: get_recommended_feed(db, user_id=current_user.id, limit=limit),
    )


@router.get("/trending-near-you", response_model=list[dict])
def trending_near_you(
    lat: float = Query(...),
    lng: float = Query(...),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    return cache.get_or_set(
        f"trending_near_you:{lat}:{lng}:{limit}",
        ttl_seconds=120,
        factory=lambda: get_recommendations(
            db,
            user_latitude=lat,
            user_longitude=lng,
            limit=limit,
        ),
    )