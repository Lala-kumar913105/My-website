from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_user, get_current_active_user, get_current_active_admin

router = APIRouter()


@router.get("/", response_model=list[schemas.Review])
def read_reviews(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all reviews with pagination (requires admin role)"""
    reviews = crud.get_reviews(db, skip=skip, limit=limit)
    return reviews


@router.get("/{review_id}", response_model=schemas.Review)
def read_review(review_id: int, db: Session = Depends(get_db)):
    """Get a review by ID (public route)"""
    review = crud.get_review(db, review_id=review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@router.get("/user/{user_id}", response_model=list[schemas.Review])
def read_reviews_by_user(user_id: int, skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all reviews by user with pagination (requires authentication)"""
    if current_user.role != models.RoleEnum.ADMIN and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view reviews for this user")
    
    reviews = crud.get_reviews_by_user(db, user_id=user_id, skip=skip, limit=limit)
    return reviews


@router.get("/product/{product_id}/reviews", response_model=schemas.ProductReviewSummary)
def read_reviews_by_product(product_id: int, db: Session = Depends(get_db)):
    """Get review summary by product (public route)."""
    avg_rating, total_reviews, reviews = crud.get_product_review_summary(db, product_id=product_id)
    review_list = []
    for review in reviews:
        user = review.user
        review_list.append(
            {
                "rating": review.rating,
                "review_text": review.review_text,
                "user_name": f"{user.first_name or ''} {user.last_name or ''}".strip() if user else None,
            }
        )

    return {
        "average_rating": round(avg_rating, 2) if total_reviews else 0.0,
        "total_reviews": total_reviews,
        "reviews": review_list,
    }


@router.get("/seller/{seller_id}/rating", response_model=schemas.SellerRatingSummary)
def read_seller_rating(seller_id: int, db: Session = Depends(get_db)):
    """Get rating summary by seller (public route)."""
    avg_rating, total_reviews = crud.get_seller_rating_summary(db, seller_id=seller_id)
    return {
        "average_rating": round(avg_rating, 2) if total_reviews else 0.0,
        "total_reviews": total_reviews,
    }


@router.post("/review", response_model=schemas.Review)
def create_review(review: schemas.ReviewCreate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Create a new review for a delivered order (requires user role)."""
    try:
        db_review = crud.create_review(db, review=review, user_id=current_user.id)
        return db_review
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{review_id}", response_model=schemas.Review)
def update_review(review_id: int, review: schemas.ReviewUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update review details (requires authentication)"""
    db_review = crud.get_review(db, review_id=review_id)
    if not db_review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if current_user.role != models.RoleEnum.ADMIN and db_review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this review")
    
    return crud.update_review(db, review_id=review_id, review=review)


@router.delete("/{review_id}", response_model=schemas.Review)
def delete_review(review_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a review (requires authentication)"""
    db_review = crud.get_review(db, review_id=review_id)
    if not db_review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if current_user.role != models.RoleEnum.ADMIN and db_review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this review")
    
    return crud.delete_review(db, review_id=review_id)
