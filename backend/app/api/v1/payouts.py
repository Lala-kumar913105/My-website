from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_active_admin, get_current_active_seller

router = APIRouter()

@router.get("/", response_model=list[schemas.Payout])
def read_payouts(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all payouts with pagination (requires admin role)"""
    payouts = crud.get_payouts(db, skip=skip, limit=limit)
    return payouts

@router.get("/{payout_id}", response_model=schemas.Payout)
def read_payout(payout_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get a payout by ID (requires admin role)"""
    payout = crud.get_payout(db, payout_id=payout_id)
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    return payout

@router.get("/seller/{seller_id}", response_model=list[schemas.Payout])
def read_payouts_by_seller(seller_id: int, skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all payouts for a seller with pagination (requires admin role)"""
    payouts = crud.get_payouts_by_seller(db, seller_id=seller_id, skip=skip, limit=limit)
    return payouts

@router.get("/my-payouts", response_model=list[schemas.Payout])
def read_my_payouts(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_seller), db: Session = Depends(get_db)):
    """Get all payouts for the current seller (requires seller role)"""
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    payouts = crud.get_payouts_by_seller(db, seller_id=seller.id, skip=skip, limit=limit)
    return payouts

@router.get("/earnings", response_model=dict)
def read_seller_earnings(current_user: models.User = Depends(get_current_active_seller), db: Session = Depends(get_db)):
    """Get earnings for the current seller (requires seller role)"""
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    earnings = crud.calculate_seller_earnings(db, seller_id=seller.id)
    return earnings

@router.get("/earnings/{seller_id}", response_model=dict)
def read_seller_earnings_by_id(seller_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get earnings for a specific seller (requires admin role)"""
    seller = crud.get_seller(db, seller_id=seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    earnings = crud.calculate_seller_earnings(db, seller_id=seller.id)
    return earnings

@router.post("/", response_model=schemas.Payout)
def create_payout(payout: schemas.PayoutCreate, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Create a new payout (requires admin role)"""
    try:
        db_payout = crud.create_payout(db, payout=payout)
        return db_payout
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{payout_id}", response_model=schemas.Payout)
def update_payout(payout_id: int, payout: schemas.PayoutUpdate, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Update payout details (requires admin role)"""
    db_payout = crud.update_payout(db, payout_id=payout_id, payout=payout)
    if not db_payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    return db_payout

@router.delete("/{payout_id}", response_model=schemas.Payout)
def delete_payout(payout_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Delete a payout (requires admin role)"""
    db_payout = crud.delete_payout(db, payout_id=payout_id)
    if not db_payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    return db_payout

@router.post("/{payout_id}/complete")
def complete_payout(payout_id: int, transaction_id: str, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Mark a payout as complete (requires admin role)"""
    db_payout = crud.mark_payout_complete(db, payout_id=payment_id, transaction_id=transaction_id)
    if not db_payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    return {"message": "Payout completed successfully"}

@router.post("/{payout_id}/failed")
def fail_payout(payout_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Mark a payout as failed (requires admin role)"""
    db_payout = crud.mark_payout_failed(db, payout_id=payout_id)
    if not db_payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    return {"message": "Payout failed"}