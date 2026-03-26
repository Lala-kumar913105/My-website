from datetime import datetime
from sqlalchemy.orm import Session
from app import models
from app.models.social import post_products


_cache: dict[str, tuple[datetime, list[dict]]] = {}


def _cache_key(user_id: int, key: str) -> str:
    return f"{user_id}:{key}"


def _get_cached(user_id: int, key: str, ttl_seconds: int = 300):
    cache_key = _cache_key(user_id, key)
    cached = _cache.get(cache_key)
    if not cached:
        return None
    timestamp, payload = cached
    if (datetime.utcnow() - timestamp).total_seconds() > ttl_seconds:
        _cache.pop(cache_key, None)
        return None
    return payload


def _set_cached(user_id: int, key: str, payload: list[dict]):
    _cache[_cache_key(user_id, key)] = (datetime.utcnow(), payload)


def get_recently_viewed(db: Session, user_id: int, limit: int = 8):
    activity = (
        db.query(models.UserActivity)
        .filter(
            models.UserActivity.user_id == user_id,
            models.UserActivity.activity_type == "view_product",
        )
        .order_by(models.UserActivity.created_at.desc())
        .limit(limit)
        .all()
    )
    product_ids = [item.target_id for item in activity if item.target_id]
    if not product_ids:
        return []
    products = db.query(models.Product).filter(models.Product.id.in_(product_ids)).all()
    return products


def get_recommended_products(db: Session, user_id: int, limit: int = 12):
    cached = _get_cached(user_id, "recommended_products")
    if cached is not None:
        return cached

    liked_post_ids = (
        db.query(models.Like.post_id)
        .filter(models.Like.user_id == user_id)
        .subquery()
    )
    liked_product_ids = (
        db.query(post_products.c.product_id)
        .filter(post_products.c.post_id.in_(liked_post_ids))
        .distinct()
        .subquery()
    )

    order_product_ids = (
        db.query(models.OrderItem.product_id)
        .join(models.Order, models.Order.id == models.OrderItem.order_id)
        .filter(models.Order.user_id == user_id)
        .distinct()
        .subquery()
    )

    recent_activity_products = (
        db.query(models.UserActivity.target_id)
        .filter(
            models.UserActivity.user_id == user_id,
            models.UserActivity.activity_type.in_(
                ["view_product", "wishlist_product", "cart_add", "purchase"]
            ),
        )
        .distinct()
        .subquery()
    )

    followed_sellers = (
        db.query(models.Follow.following_id)
        .filter(models.Follow.follower_id == user_id)
        .subquery()
    )

    base_query = (
        db.query(models.Product)
        .filter(models.Product.is_active == True)
    )

    products = (
        base_query
        .join(models.Seller, models.Seller.id == models.Product.seller_id)
        .filter(
            (models.Product.id.in_(order_product_ids))
            | (models.Product.id.in_(recent_activity_products))
            | (models.Product.id.in_(liked_product_ids))
            | (models.Seller.user_id.in_(followed_sellers))
        )
        .limit(limit)
        .all()
    )

    payload = [product for product in products]
    _set_cached(user_id, "recommended_products", payload)
    return payload


def get_recommended_feed(db: Session, user_id: int, limit: int = 20):
    cached = _get_cached(user_id, "recommended_feed")
    if cached is not None:
        return cached

    followed_ids = (
        db.query(models.Follow.following_id)
        .filter(models.Follow.follower_id == user_id)
        .subquery()
    )

    posts = (
        db.query(models.Post)
        .join(models.Seller, models.Seller.id == models.Post.seller_id)
        .filter(models.Seller.user_id.in_(followed_ids))
        .order_by((models.Post.like_count + models.Post.comment_count).desc(), models.Post.created_at.desc())
        .limit(limit)
        .all()
    )
    payload = [post for post in posts]
    _set_cached(user_id, "recommended_feed", payload)
    return payload