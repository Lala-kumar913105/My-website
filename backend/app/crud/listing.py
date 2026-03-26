from sqlalchemy.orm import Session
from app import models, schemas


def get_listing(db: Session, listing_id: int):
    return db.query(models.Listing).filter(models.Listing.id == listing_id).first()


def get_listings(db: Session, skip: int = 0, limit: int = 100, listing_type: str | None = None):
    query = db.query(models.Listing)
    if listing_type:
        query = query.filter(models.Listing.type == listing_type)
    return query.offset(skip).limit(limit).all()


def get_listings_by_seller(
    db: Session,
    seller_id: int,
    listing_type: str | None = None,
    skip: int = 0,
    limit: int = 100,
):
    query = db.query(models.Listing).filter(models.Listing.seller_id == seller_id)
    if listing_type:
        query = query.filter(models.Listing.type == listing_type)
    return query.offset(skip).limit(limit).all()


def create_listing(db: Session, listing: schemas.ListingCreate, seller_id: int):
    db_listing = models.Listing(
        seller_id=seller_id,
        title=listing.title,
        description=listing.description,
        price=listing.price,
        type=listing.type,
        stock=listing.stock,
        duration_minutes=listing.duration_minutes,
    )
    db.add(db_listing)
    db.commit()
    db.refresh(db_listing)
    return db_listing


def update_listing(db: Session, listing_id: int, listing: schemas.ListingUpdate):
    db_listing = get_listing(db, listing_id=listing_id)
    if db_listing:
        for key, value in listing.dict(exclude_unset=True).items():
            setattr(db_listing, key, value)
        db.commit()
        db.refresh(db_listing)
    return db_listing


def delete_listing(db: Session, listing_id: int):
    db_listing = get_listing(db, listing_id=listing_id)
    if db_listing:
        db.delete(db_listing)
        db.commit()
    return db_listing