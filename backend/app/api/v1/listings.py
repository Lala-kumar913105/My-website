from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_active_seller

router = APIRouter()


@router.get("/", response_model=list[schemas.Listing])
def read_listings(
    listing_type: str | None = Query(None, description="product|service"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return crud.get_listings(db, skip=skip, limit=limit, listing_type=listing_type)


@router.get("/seller", response_model=list[schemas.Listing])
def read_listings_by_seller(
    listing_type: str | None = Query(None, description="product|service"),
    skip: int = 0,
    limit: int = Query(100, ge=1, le=200),
    current_user: models.User = Depends(get_current_active_seller),
    db: Session = Depends(get_db),
):
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return crud.get_listings_by_seller(
        db,
        seller_id=seller.id,
        listing_type=listing_type,
        skip=skip,
        limit=limit,
    )


@router.post("/", response_model=schemas.Listing)
def create_listing(
    payload: schemas.ListingCreate,
    current_user: models.User = Depends(get_current_active_seller),
    db: Session = Depends(get_db),
):
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    if payload.type not in {"product", "service"}:
        raise HTTPException(status_code=400, detail="Invalid listing type")

    return crud.create_listing(db, listing=payload, seller_id=seller.id)


@router.put("/{listing_id}", response_model=schemas.Listing)
def update_listing(
    listing_id: int,
    payload: schemas.ListingUpdate,
    current_user: models.User = Depends(get_current_active_seller),
    db: Session = Depends(get_db),
):
    listing = crud.get_listing(db, listing_id=listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller or listing.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.update_listing(db, listing_id=listing_id, listing=payload)


@router.delete("/{listing_id}", response_model=schemas.Listing)
def delete_listing(
    listing_id: int,
    current_user: models.User = Depends(get_current_active_seller),
    db: Session = Depends(get_db),
):
    listing = crud.get_listing(db, listing_id=listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller or listing.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.delete_listing(db, listing_id=listing_id)