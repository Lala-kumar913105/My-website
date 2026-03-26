from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_user, get_current_active_admin

router = APIRouter()

@router.get("/", response_model=list[schemas.Coupon])
def read_coupons(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all coupons with pagination"""
    coupons = crud.get_coupons(db, skip=skip, limit=limit)
    return coupons

@router.get("/{coupon_id}", response_model=schemas.Coupon)
def read_coupon(coupon_id: int, db: Session = Depends(get_db)):
    """Get a coupon by ID"""
    coupon = crud.get_coupon(db, coupon_id=coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return coupon

@router.get("/code/{coupon_code}", response_model=schemas.Coupon)
def read_coupon_by_code(coupon_code: str, db: Session = Depends(get_db)):
    """Get a coupon by code"""
    coupon = crud.get_coupon_by_code(db, code=coupon_code)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return coupon

@router.post("/", response_model=schemas.Coupon)
def create_coupon(coupon: schemas.CouponCreate, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Create a new coupon (requires admin privileges)"""
    db_coupon = crud.get_coupon_by_code(db, code=coupon.code)
    if db_coupon:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    return crud.create_coupon(db=db, coupon=coupon)

@router.put("/{coupon_id}", response_model=schemas.Coupon)
def update_coupon(coupon_id: int, coupon: schemas.CouponUpdate, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Update an existing coupon (requires admin privileges)"""
    db_coupon = crud.get_coupon(db, coupon_id=coupon_id)
    if not db_coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return crud.update_coupon(db=db, coupon_id=coupon_id, coupon=coupon)

@router.delete("/{coupon_id}", response_model=schemas.Coupon)
def delete_coupon(coupon_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Delete a coupon (requires admin privileges)"""
    db_coupon = crud.get_coupon(db, coupon_id=coupon_id)
    if not db_coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return crud.delete_coupon(db=db, coupon_id=coupon_id)

@router.get("/validate/{coupon_code}")
def validate_coupon(coupon_code: str, purchase_amount: float, db: Session = Depends(get_db)):
    """Validate a coupon for a given purchase amount"""
    is_valid = crud.is_coupon_valid(db, coupon_code=coupon_code, purchase_amount=purchase_amount)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired coupon")
    discount = crud.calculate_discount(db, coupon_code=coupon_code, purchase_amount=purchase_amount)
    return {"valid": is_valid, "discount": discount}


@router.post("/apply")
def apply_coupon(payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Apply a coupon and return discount."""
    coupon_code = payload.get("coupon_code")
    purchase_amount = payload.get("purchase_amount")
    if not coupon_code or purchase_amount is None:
        raise HTTPException(status_code=400, detail="coupon_code and purchase_amount are required")

    is_valid = crud.is_coupon_valid(db, coupon_code=coupon_code, purchase_amount=purchase_amount)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired coupon")

    discount = crud.calculate_discount(db, coupon_code=coupon_code, purchase_amount=purchase_amount)
    return {"valid": True, "discount": discount}