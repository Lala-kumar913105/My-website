from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_user, get_current_active_seller, get_current_active_admin
from sqlalchemy import func

router = APIRouter()

@router.get("/me", response_model=schemas.Seller)
def get_current_seller(current_user: models.User = Depends(get_current_active_seller), db: Session = Depends(get_db)):
    """Get the current seller (requires seller role)"""
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found for this user")
    return seller

@router.put("/me", response_model=schemas.Seller)
def update_current_seller(seller: schemas.SellerUpdate, current_user: models.User = Depends(get_current_active_seller), db: Session = Depends(get_db)):
    """Update current seller's information (requires seller role)"""
    db_seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not db_seller:
        raise HTTPException(status_code=404, detail="Seller not found for this user")
    
    return crud.update_seller(db=db, seller_id=db_seller.id, seller=seller)

@router.put("/me/location", response_model=schemas.Seller)
def update_seller_location(latitude: float, longitude: float, current_user: models.User = Depends(get_current_active_seller), db: Session = Depends(get_db)):
    """Update current seller's location using geolocation (requires seller role)"""
    db_seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not db_seller:
        raise HTTPException(status_code=404, detail="Seller not found for this user")
    
    update_data = schemas.SellerUpdate(latitude=latitude, longitude=longitude)
    return crud.update_seller(db=db, seller_id=db_seller.id, seller=update_data)

@router.put("/me/delivery-per-km", response_model=schemas.Seller)
def update_delivery_per_km(
    delivery_per_km: float,
    current_user: models.User = Depends(get_current_active_seller),
    db: Session = Depends(get_db)
):
    """Update current seller's delivery rate per km (requires seller role)"""
    db_seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not db_seller:
        raise HTTPException(status_code=404, detail="Seller not found for this user")

    update_data = schemas.SellerUpdate(delivery_per_km=delivery_per_km)
    return crud.update_seller(db=db, seller_id=db_seller.id, seller=update_data)

@router.get("/", response_model=list[schemas.Seller])
def read_sellers(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all sellers (requires admin role)"""
    sellers = crud.get_sellers(db, skip=skip, limit=limit)
    return sellers

@router.get("/{seller_id}", response_model=schemas.Seller)
def read_seller(seller_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get a seller by ID (requires admin role)"""
    db_seller = crud.get_seller(db, seller_id=seller_id)
    if db_seller is None:
        raise HTTPException(status_code=404, detail="Seller not found")
    return db_seller

@router.post("/", response_model=schemas.Seller)
def create_seller(seller: schemas.SellerCreate, current_user: models.User = Depends(get_current_active_seller), db: Session = Depends(get_db)):
    """Create a new seller (requires seller role)"""
    if seller.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to create a seller for this user")
    
    db_seller = crud.get_seller_by_user_id(db, user_id=seller.user_id)
    if db_seller:
        raise HTTPException(status_code=400, detail="Seller already exists for this user")
    
    return crud.create_seller(db=db, seller=seller)

@router.put("/{seller_id}", response_model=schemas.Seller)
def update_seller(seller_id: int, seller: schemas.SellerUpdate, current_user: models.User = Depends(get_current_active_seller), db: Session = Depends(get_db)):
    """Update an existing seller (requires seller role)"""
    db_seller = crud.get_seller(db, seller_id=seller_id)
    if db_seller is None:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    if db_seller.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this seller")
    
    return crud.update_seller(db=db, seller_id=seller_id, seller=seller)

@router.delete("/{seller_id}", response_model=schemas.Seller)
def delete_seller(seller_id: int, current_user: models.User = Depends(get_current_active_seller), db: Session = Depends(get_db)):
    """Delete a seller (requires seller role)"""
    db_seller = crud.get_seller(db, seller_id=seller_id)
    if db_seller is None:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    if db_seller.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this seller")
    
    return crud.delete_seller(db=db, seller_id=seller_id)


@router.get("/earnings", response_model=dict)
def get_seller_earnings(
    current_user: models.User = Depends(get_current_active_seller),
    db: Session = Depends(get_db),
):
    """Get seller earnings summary for delivered orders."""
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found for this user")

    delivered_orders = (
        db.query(models.Order)
        .filter(
            models.Order.seller_id == seller.id,
            models.Order.status == models.OrderStatus.delivered,
        )
        .all()
    )

    total_orders = len(delivered_orders)
    total_revenue = sum(order.total_amount for order in delivered_orders)
    total_commission_paid = sum(order.commission_amount for order in delivered_orders)
    total_earnings = sum(order.seller_earning for order in delivered_orders)

    return {
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "total_commission_paid": round(total_commission_paid, 2),
        "total_earnings": round(total_earnings, 2),
    }


@router.get("/analytics", response_model=dict)
def get_seller_analytics(
    current_user: models.User = Depends(get_current_active_seller),
    db: Session = Depends(get_db),
):
    """Get seller dashboard analytics (requires seller role)."""
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found for this user")

    total_orders = db.query(models.Order).filter(models.Order.seller_id == seller.id).count()
    total_revenue = (
        db.query(func.coalesce(func.sum(models.Order.total_amount), 0.0))
        .filter(models.Order.seller_id == seller.id)
        .scalar()
    )

    avg_rating = (
        db.query(func.coalesce(func.avg(models.Review.rating), 0.0))
        .filter(models.Review.seller_id == seller.id)
        .scalar()
    )

    trust_score = round((avg_rating / 5) * 100, 2) if avg_rating else 0.0

    low_stock_products = (
        db.query(models.Product)
        .filter(models.Product.seller_id == seller.id, models.Product.stock <= 5)
        .all()
    )

    return {
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "average_rating": round(avg_rating, 2),
        "trust_score": trust_score,
        "low_stock_products": [
            {
                "id": product.id,
                "name": product.name,
                "stock": product.stock,
            }
            for product in low_stock_products
        ],
    }
