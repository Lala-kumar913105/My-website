from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models


def _get_platform_weights(db: Session):
    settings = db.query(models.PlatformSettings).order_by(models.PlatformSettings.id.desc()).first()
    if not settings:
        return {
            "distance_weight": 0.4,
            "rating_weight": 0.2,
            "trust_weight": 0.15,
            "trending_weight": 0.15,
            "new_seller_weight": 0.1,
        }
    return {
        "distance_weight": settings.distance_weight,
        "rating_weight": settings.rating_weight,
        "trust_weight": settings.trust_weight,
        "trending_weight": settings.trending_weight,
        "new_seller_weight": settings.new_seller_weight,
    }


def _build_distance_score(user_lat: float, user_lng: float, seller_lat, seller_lng):
    if seller_lat is None or seller_lng is None:
        return 0.0
    distance = func.sqrt(func.pow(user_lat - seller_lat, 2) + func.pow(user_lng - seller_lng, 2))
    return 1 / (1 + distance)


def get_recommendations(
    db: Session,
    user_latitude: float,
    user_longitude: float,
    category_id: int | None = None,
    limit: int = 20,
):
    weights = _get_platform_weights(db)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    order_counts = (
        db.query(
            models.OrderItem.product_id.label("product_id"),
            func.count(models.OrderItem.id).label("order_count"),
        )
        .join(models.Order, models.Order.id == models.OrderItem.order_id)
        .filter(models.Order.created_at >= seven_days_ago)
        .group_by(models.OrderItem.product_id)
        .subquery()
    )

    seller_rating = (
        db.query(
            models.Review.seller_id.label("seller_id"),
            func.coalesce(func.avg(models.Review.rating), 0.0).label("avg_rating"),
        )
        .group_by(models.Review.seller_id)
        .subquery()
    )

    base_query = (
        db.query(
            models.Product,
            models.Seller,
            func.coalesce(order_counts.c.order_count, 0).label("order_count"),
            func.coalesce(seller_rating.c.avg_rating, 0.0).label("avg_rating"),
        )
        .join(models.Seller, models.Seller.id == models.Product.seller_id)
        .outerjoin(order_counts, order_counts.c.product_id == models.Product.id)
        .outerjoin(seller_rating, seller_rating.c.seller_id == models.Seller.id)
        .filter(models.Product.is_active == True)
    )

    if category_id is not None:
        base_query = base_query.filter(models.Product.category_id == category_id)

    distance_score = _build_distance_score(
        user_latitude, user_longitude, models.Seller.latitude, models.Seller.longitude
    )

    new_seller_threshold = datetime.utcnow() - timedelta(days=30)
    new_seller_score = func.case(
        (models.Seller.created_at >= new_seller_threshold, 1.0),
        else_=0.0,
    )

    final_score = (
        weights["distance_weight"] * distance_score
        + weights["rating_weight"] * func.coalesce(seller_rating.c.avg_rating, 0.0)
        + weights["trust_weight"] * func.coalesce(models.Seller.rating, 0)
        + weights["trending_weight"] * func.coalesce(order_counts.c.order_count, 0)
        + weights["new_seller_weight"] * new_seller_score
    )

    results = (
        base_query.add_columns(final_score.label("final_score"))
        .order_by(func.desc("final_score"))
        .limit(limit)
        .all()
    )

    recommendations = []
    for product, seller, order_count, avg_rating, score in results:
        recommendations.append(
            {
                "product": product,
                "seller": seller,
                "score": float(score or 0.0),
                "trending_orders": int(order_count or 0),
                "seller_rating": float(avg_rating or 0.0),
            }
        )

    return recommendations


def get_trending_products(db: Session, limit: int = 10):
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    results = (
        db.query(
            models.Product,
            func.count(models.OrderItem.id).label("total_sales"),
        )
        .join(models.OrderItem, models.OrderItem.product_id == models.Product.id)
        .join(models.Order, models.Order.id == models.OrderItem.order_id)
        .filter(models.Order.created_at >= seven_days_ago)
        .group_by(models.Product.id)
        .order_by(func.count(models.OrderItem.id).desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "product": product,
            "total_sales": int(total_sales),
        }
        for product, total_sales in results
    ]