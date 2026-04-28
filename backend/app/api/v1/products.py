from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_user_optional, get_current_user, get_current_active_seller, get_current_active_admin
from app.services.translation_service import translate_text
from app.services.currency_service import convert_price
import os
import uuid
from typing import Optional
from math import radians, sin, cos, sqrt, atan2

router = APIRouter()

MEDIA_PRODUCTS_DIR = os.path.join("media", "products")


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on the Earth surface."""
    R = 6371  # Earth radius in kilometers
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

@router.get("/seller", response_model=list[schemas.Product])
def read_products_by_current_seller(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_seller), db: Session = Depends(get_db)):
    """Get products by current seller (requires seller role)"""
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found for this user")
    products = crud.get_products_by_seller(db, seller_id=seller.id, skip=skip, limit=limit)
    return products

@router.get("/", response_model=list[schemas.Product])
def read_products(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Get all products with pagination (public route)"""
    products = crud.get_products(db, skip=skip, limit=limit)
    settings = db.query(models.PlatformSettings).order_by(models.PlatformSettings.id.desc()).first()
    default_currency = (
        current_user.preferred_currency
        if current_user and current_user.preferred_currency
        else settings.default_currency if settings else "INR"
    )
    language = current_user.preferred_language if current_user and current_user.preferred_language else "en"
    for product in products:
        product.original_price = product.price
        product.converted_price = convert_price(product.price, settings, default_currency) if settings else product.price
        product.currency_code = default_currency
        product.name = translate_text(product.name, language)
        product.description = translate_text(product.description, language)
    return products

def calculate_delivery_charge(distance: float, delivery_rate: float = 1.5) -> float:
    """Calculate delivery charge based on distance (in km) and seller's delivery rate."""
    base_charge = 5  # Base charge for first 5 km
    per_km_charge = delivery_rate  # Charge per additional km (from seller)
    if distance <= 5:
        return base_charge
    else:
        additional_distance = distance - 5
        additional_charge = additional_distance * per_km_charge
        total_charge = base_charge + additional_charge
        return round(total_charge, 2)

@router.get("/nearest-products", response_model=list[schemas.Product])
def read_nearest_products(
    lat: float,
    lng: float,
    category: Optional[int] = None,
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Get nearest products to given latitude and longitude (public route)"""
    # Get all products where seller has latitude and longitude
    query = db.query(models.Product).join(models.Seller).filter(
        models.Seller.latitude.isnot(None),
        models.Seller.longitude.isnot(None),
        models.Product.is_active == True
    )

    if category is not None:
        query = query.filter(models.Product.category_id == category)

    products = query.all()

    # Calculate distance for each product using seller's location
    products_with_distance = []
    for product in products:
        # Get seller's location from the joined query
        seller = product.seller
        distance = haversine_distance(lat, lng, seller.latitude, seller.longitude)
        delivery_per_km = seller.delivery_per_km if seller.delivery_per_km is not None else seller.delivery_rate
        products_with_distance.append({
            "product": product,
            "distance": distance,
            "delivery_per_km": delivery_per_km
        })

    # Sort products by distance
    products_with_distance.sort(key=lambda x: x["distance"])

    # Add distance and delivery charge to each product object
    for item in products_with_distance:
        product = item["product"]
        seller = product.seller
        product.distance = round(item["distance"], 2)
        # Calculate delivery charge as distance * seller delivery per km
        product.delivery_charge = round(item["distance"] * item["delivery_per_km"], 2)
        product.delivery_rate = item["delivery_per_km"]
        product.delivery_per_km = item["delivery_per_km"]
        product.latitude = seller.latitude
        product.longitude = seller.longitude
        settings = db.query(models.PlatformSettings).order_by(models.PlatformSettings.id.desc()).first()
        default_currency = (
            current_user.preferred_currency
            if current_user and current_user.preferred_currency
            else settings.default_currency if settings else "INR"
        )
        language = current_user.preferred_language if current_user and current_user.preferred_language else "en"
        product.original_price = product.price
        product.converted_price = convert_price(product.price, settings, default_currency) if settings else product.price
        product.currency_code = default_currency
        product.name = translate_text(product.name, language)
        product.description = translate_text(product.description, language)

    return [item["product"] for item in products_with_distance]

@router.get("/{product_id}", response_model=schemas.Product)
def read_product(
    product_id: int,
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Get a single product by ID (public route)"""
    db_product = crud.get_product(db, product_id=product_id)
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    settings = db.query(models.PlatformSettings).order_by(models.PlatformSettings.id.desc()).first()
    default_currency = (
        current_user.preferred_currency
        if current_user and current_user.preferred_currency
        else settings.default_currency if settings else "INR"
    )
    language = current_user.preferred_language if current_user and current_user.preferred_language else "en"
    db_product.original_price = db_product.price
    db_product.converted_price = convert_price(db_product.price, settings, default_currency) if settings else db_product.price
    db_product.currency_code = default_currency
    db_product.name = translate_text(db_product.name, language)
    db_product.description = translate_text(db_product.description, language)
    return db_product

@router.post("/", response_model=schemas.Product)
def create_product(
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    category: str = Form(...),
    stock: int = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    image: UploadFile = File(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new product (auto-creates seller profile if needed)."""
    seller = crud.get_or_create_seller(db, user=current_user)
    
    # Create product instance
    product_data = schemas.ProductCreate(
        name=name,
        description=description,
        price=price,
        stock=stock,
        category_id=int(category) if category.isdigit() else None,
        latitude=latitude,
        longitude=longitude,
        seller_id=seller.id,
    )
    
    product = crud.create_product(db=db, product=product_data, seller_id=seller.id)
    
    # Handle image upload
    if image:
        if not os.path.exists(MEDIA_PRODUCTS_DIR):
            os.makedirs(MEDIA_PRODUCTS_DIR)
        
        file_extension = os.path.splitext(image.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_extension}"
        file_path = os.path.join(MEDIA_PRODUCTS_DIR, unique_filename)
        
        try:
            with open(file_path, "wb") as buffer:
                buffer.write(image.file.read())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
        
        image_url = f"/media/products/{unique_filename}"
        product.image_url = image_url
        db.commit()
        db.refresh(product)
    
    return product

@router.put("/{product_id}/image", response_model=schemas.Product)
def update_product_image(
    product_id: int,
    image: UploadFile = File(...),
    current_user: models.User = Depends(get_current_active_seller),
    db: Session = Depends(get_db)
):
    """Update product image (requires seller role)"""
    db_product = crud.get_product(db, product_id=product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if the current user is the seller of the product
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller or db_product.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this product")
    
    # Handle image upload
    if not os.path.exists(MEDIA_PRODUCTS_DIR):
        os.makedirs(MEDIA_PRODUCTS_DIR)
    
    file_extension = os.path.splitext(image.filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join(MEDIA_PRODUCTS_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(image.file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
    
    # Update product's image_url
    db_product.image_url = f"/media/products/{unique_filename}"
    db.commit()
    db.refresh(db_product)
    
    return db_product

@router.put("/{product_id}", response_model=schemas.Product)
def update_product(product_id: int, product: schemas.ProductUpdate, current_user: models.User = Depends(get_current_active_seller), db: Session = Depends(get_db)):
    """Update an existing product (requires seller role)"""
    db_product = crud.get_product(db, product_id=product_id)
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if the current user is the seller of the product
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller or db_product.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this product")
    
    return crud.update_product(db=db, product_id=product_id, product=product)

@router.delete("/{product_id}", response_model=schemas.Product)
def delete_product(product_id: int, current_user: models.User = Depends(get_current_active_seller), db: Session = Depends(get_db)):
    """Delete a product (requires seller role)"""
    db_product = crud.get_product(db, product_id=product_id)
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if the current user is the seller of the product
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller or db_product.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this product")
    
    return crud.delete_product(db=db, product_id=product_id)

@router.get("/seller/{seller_id}", response_model=list[schemas.Product])
def read_products_by_seller(
    seller_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Get products by seller ID with pagination (public route)"""
    products = crud.get_products_by_seller(db, seller_id=seller_id, skip=skip, limit=limit)
    settings = db.query(models.PlatformSettings).order_by(models.PlatformSettings.id.desc()).first()
    default_currency = (
        current_user.preferred_currency
        if current_user and current_user.preferred_currency
        else settings.default_currency if settings else "INR"
    )
    language = current_user.preferred_language if current_user and current_user.preferred_language else "en"
    for product in products:
        product.original_price = product.price
        product.converted_price = convert_price(product.price, settings, default_currency) if settings else product.price
        product.currency_code = default_currency
        product.name = translate_text(product.name, language)
        product.description = translate_text(product.description, language)
    return products

@router.get("/category/{category_id}", response_model=list[schemas.Product])
def read_products_by_category(
    category_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Get products by category with pagination (public route)"""
    category = crud.get_category(db, category_id=category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if category.type == "service":
        redirect_url = f"/api/v1/services?skip={skip}&limit={limit}"
        return RedirectResponse(url=redirect_url, status_code=307)
    products = crud.get_products_by_category(db, category_id=category_id, skip=skip, limit=limit)
    settings = db.query(models.PlatformSettings).order_by(models.PlatformSettings.id.desc()).first()
    default_currency = (
        current_user.preferred_currency
        if current_user and current_user.preferred_currency
        else settings.default_currency if settings else "INR"
    )
    language = current_user.preferred_language if current_user and current_user.preferred_language else "en"
    for product in products:
        product.original_price = product.price
        product.converted_price = convert_price(product.price, settings, default_currency) if settings else product.price
        product.currency_code = default_currency
        product.name = translate_text(product.name, language)
        product.description = translate_text(product.description, language)
    return products
