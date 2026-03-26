from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_user, get_current_active_admin

router = APIRouter()


@router.get("/sellers/pending", response_model=list[schemas.Seller])
def get_pending_sellers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_admin)):
    """Get all pending sellers (requires admin privileges)"""
    pending_sellers = db.query(models.Seller).filter(models.Seller.approved == False).offset(skip).limit(limit).all()
    return pending_sellers


@router.post("/sellers/{seller_id}/approve")
def approve_seller(seller_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_admin)):
    """Approve a seller (requires admin privileges)"""
    seller = crud.get_seller(db, seller_id=seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    if seller.approved:
        raise HTTPException(status_code=400, detail="Seller is already approved")
    
    crud.update_seller(db, seller_id=seller_id, seller=schemas.SellerUpdate(approved=True))
    return {"message": "Seller approved successfully"}


@router.post("/users/{user_id}/block")
def block_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_admin)):
    """Block a user (requires admin privileges)"""
    user = crud.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_blocked:
        raise HTTPException(status_code=400, detail="User is already blocked")
    
    crud.update_user(db, user_id=user_id, user=schemas.UserUpdate(is_blocked=True))
    return {"message": "User blocked successfully"}


@router.post("/users/{user_id}/unblock")
def unblock_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_admin)):
    """Unblock a user (requires admin privileges)"""
    user = crud.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_blocked:
        raise HTTPException(status_code=400, detail="User is not blocked")
    
    crud.update_user(db, user_id=user_id, user=schemas.UserUpdate(is_blocked=False))
    return {"message": "User unblocked successfully"}


@router.get("/orders", response_model=list[schemas.Order])
def get_all_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_admin)):
    """Get all orders (requires admin privileges)"""
    orders = crud.get_orders(db, skip=skip, limit=limit)
    return orders


@router.get("/orders/{order_id}", response_model=schemas.Order)
def get_order(order_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_admin)):
    """Get an order by ID (requires admin privileges)"""
    order = crud.get_order(db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.get("/users", response_model=list[schemas.User])
def get_all_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_admin)):
    """Get all users (requires admin privileges)"""
    users = crud.get_users(db, skip=skip, limit=limit)
    return users


@router.get("/statistics")
def get_statistics(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_admin)):
    """Get platform statistics (requires admin privileges)"""
    total_users = db.query(models.User).count()
    total_sellers = db.query(models.Seller).count()
    total_products = db.query(models.Product).count()
    total_orders = db.query(models.Order).count()
    total_revenue = db.query(models.Order.total_amount).filter(models.Order.status == models.OrderStatus.completed).all()
    total_revenue = sum(amount for (amount,) in total_orders)
    
    return {
        "total_users": total_users,
        "total_sellers": total_sellers,
        "total_products": total_products,
        "total_orders": total_orders,
        "total_revenue": total_revenue
    }