from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session
from app import models, schemas


def get_listing(db: Session, listing_id: int):
    return db.query(models.Listing).filter(models.Listing.id == listing_id).first()


def get_listings(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    listing_type: str | None = None,
    category_id: int | None = None,
    q: str | None = None,
    sort_by: str | None = None,
):
    query = db.query(models.Listing)

    if listing_type:
        query = query.filter(models.Listing.type == listing_type)

    if q:
        query = query.filter(
            or_(
                models.Listing.title.ilike(f"%{q}%"),
                models.Listing.description.ilike(f"%{q}%"),
            )
        )

    if category_id is not None:
        product_ids_query = db.query(models.Product.id).filter(models.Product.category_id == category_id)
        service_ids_query = db.query(models.Service.id).filter(models.Service.category_id == category_id)

        query = query.filter(
            or_(
                and_(
                    models.Listing.type == "product",
                    or_(
                        models.Listing.source_id.in_(product_ids_query),
                        models.Listing.id.in_(product_ids_query),
                    ),
                ),
                and_(
                    models.Listing.type == "service",
                    or_(
                        models.Listing.source_id.in_(service_ids_query),
                        models.Listing.id.in_(service_ids_query),
                    ),
                ),
            )
        )

    if sort_by == "price_asc":
        query = query.order_by(models.Listing.price.asc(), models.Listing.id.desc())
    elif sort_by == "price_desc":
        query = query.order_by(models.Listing.price.desc(), models.Listing.id.desc())
    elif sort_by == "top_rated":
        query = query.outerjoin(models.Seller, models.Listing.seller_id == models.Seller.id).order_by(
            func.coalesce(models.Seller.rating, 0).desc(),
            models.Listing.id.desc(),
        )
    else:
        query = query.order_by(models.Listing.id.desc())

    listings = query.offset(skip).limit(limit).all()

    if not listings:
        return listings

    product_source_ids = {
        (listing.source_id or listing.id)
        for listing in listings
        if listing.type == "product"
    }
    service_source_ids = {
        (listing.source_id or listing.id)
        for listing in listings
        if listing.type == "service"
    }

    products = (
        db.query(models.Product).filter(models.Product.id.in_(product_source_ids)).all()
        if product_source_ids
        else []
    )
    services = (
        db.query(models.Service).filter(models.Service.id.in_(service_source_ids)).all()
        if service_source_ids
        else []
    )

    product_map = {product.id: product for product in products}
    service_map = {service.id: service for service in services}

    seller_ids = {listing.seller_id for listing in listings}
    sellers = db.query(models.Seller).filter(models.Seller.id.in_(seller_ids)).all() if seller_ids else []
    seller_map = {seller.id: seller for seller in sellers}

    for listing in listings:
        source_id = listing.source_id or listing.id
        if listing.type == "product":
            product = product_map.get(source_id)
            listing.category_id = product.category_id if product else None
            listing.image_url = product.image_url if product else None
        elif listing.type == "service":
            service = service_map.get(source_id)
            listing.category_id = service.category_id if service else None
            listing.image_url = None

        seller = seller_map.get(listing.seller_id)
        listing.seller_business_name = seller.business_name if seller else None
        listing.seller_rating = float(seller.rating) if seller and seller.rating is not None else None

    return listings


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
    source_id = listing.source_id
    source_type = listing.source_type

    if source_id is None:
        if listing.type == "product":
            product = models.Product(
                seller_id=seller_id,
                name=listing.title,
                description=listing.description,
                price=listing.price,
                stock=listing.stock or 0,
                latitude=listing.latitude,
                longitude=listing.longitude,
                is_active=True,
            )
            db.add(product)
            db.flush()
            source_id = product.id
            source_type = "product"
        elif listing.type == "service":
            service = models.Service(
                seller_id=seller_id,
                name=listing.title,
                description=listing.description,
                price=listing.price,
                duration_minutes=listing.duration_minutes or 60,
                latitude=listing.latitude,
                longitude=listing.longitude,
                address=listing.address,
                is_active=True,
            )
            db.add(service)
            db.flush()
            source_id = service.id
            source_type = "service"

    db_listing = models.Listing(
        seller_id=seller_id,
        title=listing.title,
        description=listing.description,
        price=listing.price,
        type=listing.type,
        stock=listing.stock,
        duration_minutes=listing.duration_minutes,
        latitude=listing.latitude,
        longitude=listing.longitude,
        address=listing.address,
        source_id=source_id,
        source_type=source_type,
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