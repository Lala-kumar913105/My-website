from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_active_admin, get_current_active_seller

router = APIRouter()

@router.get("/", response_model=list[schemas.Commission])
def read_commissions(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all commissions with pagination (requires admin role)"""
    commissions = crud.get_commissions(db, skip=skip, limit=limit)
    return commissions

@router.get("/{commission_id}", response_model=schemas.Commission)
def read_commission(commission_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get a commission by ID (requires admin role)"""
    commission = crud.get_commission(db, commission_id=commission_id)
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    return commission

@router.get("/seller/{seller_id}", response_model=list[schemas.Commission])
def read_commissions_by_seller(seller_id: int, skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all commissions for a seller with pagination (requires admin role)"""
    commissions = crud.get_commissions_by_seller(db, seller_id=seller_id, skip=skip, limit=limit)
    return commissions

@router.get("/my-commissions", response_model=list[schemas.Commission])
def read_my_commissions(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_seller), db: Session = Depends(get_db)):
    """Get all commissions for the current seller (requires seller role)"""
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    commissions = crud.get_commissions_by_seller(db, seller_id=seller.id, skip=skip, limit=limit)
    return commissions

@router.get("/order/{order_id}", response_model=list[schemas.Commission])
def read_commissions_by_order(order_id: int, skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all commissions for an order with pagination (requires admin role)"""
    commissions = crud.get_commissions_by_order(db, order_id=order_id, skip=skip, limit=limit)
    return commissions

@router.get("/booking/{booking_id}", response_model=list[schemas.Commission])
def read_commissions_by_booking(booking_id: int, skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all commissions for a booking with pagination (requires admin role)"""
    commissions = crud.get_commissions_by_booking(db, booking_id=booking_id, skip=skip, limit=limit)
    return commissions

@router.post("/", response_model=schemas.Commission)
def create_commission(commission: schemas.CommissionCreate, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Create a new commission (requires admin role)"""
    try:
        db_commission = crud.create_commission(db, commission=commission)
        return db_commission
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{commission_id}", response_model=schemas.Commission)
def update_commission(commission_id: int, commission: schemas.CommissionUpdate, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Update commission details (requires admin role)"""
    db_commission = crud.update_commission(db, commission_id=commission_id, commission=commission)
    if not db_commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    return db_commission

@router.delete("/{commission_id}", response_model=schemas.Commission)
def delete_commission(commission_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Delete a commission (requires admin role)"""
    db_commission = crud.delete_commission(db, commission_id=commission_id)
    if not db_commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    return db_commission