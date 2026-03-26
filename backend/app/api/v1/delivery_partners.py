from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_user, get_current_active_admin, get_current_active_delivery_partner

router = APIRouter()


@router.get("/", response_model=list[schemas.DeliveryPartner])
def read_delivery_partners(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all delivery partners with pagination (requires admin role)"""
    delivery_partners = crud.get_delivery_partners(db, skip=skip, limit=limit)
    return delivery_partners


@router.get("/{delivery_partner_id}", response_model=schemas.DeliveryPartner)
def read_delivery_partner(delivery_partner_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get a delivery partner by ID (requires authentication)"""
    delivery_partner = crud.get_delivery_partner(db, delivery_partner_id=delivery_partner_id)
    if not delivery_partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    
    if current_user.role == models.RoleEnum.ADMIN or delivery_partner.user_id == current_user.id:
        return delivery_partner
    
    raise HTTPException(status_code=403, detail="Not authorized to view this delivery partner")


@router.get("/me", response_model=schemas.DeliveryPartner)
def read_current_delivery_partner(current_user: models.User = Depends(get_current_active_delivery_partner), db: Session = Depends(get_db)):
    """Get current delivery partner's profile (requires delivery partner role)"""
    delivery_partner = crud.get_delivery_partner_by_user_id(db, user_id=current_user.id)
    if not delivery_partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found for this user")
    return delivery_partner


@router.post("/", response_model=schemas.DeliveryPartner)
def create_delivery_partner(delivery_partner: schemas.DeliveryPartnerCreate, current_user: models.User = Depends(get_current_active_delivery_partner), db: Session = Depends(get_db)):
    """Create a new delivery partner (requires delivery partner role)"""
    existing_delivery_partner = crud.get_delivery_partner_by_user_id(db, user_id=current_user.id)
    if existing_delivery_partner:
        raise HTTPException(status_code=400, detail="Delivery partner already exists for this user")
    
    return crud.create_delivery_partner(db=db, delivery_partner=delivery_partner, user_id=current_user.id)


@router.put("/{delivery_partner_id}", response_model=schemas.DeliveryPartner)
def update_delivery_partner(delivery_partner_id: int, delivery_partner: schemas.DeliveryPartnerUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update a delivery partner (requires authentication)"""
    db_delivery_partner = crud.get_delivery_partner(db, delivery_partner_id=delivery_partner_id)
    if not db_delivery_partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    
    if current_user.role == models.RoleEnum.ADMIN or db_delivery_partner.user_id == current_user.id:
        return crud.update_delivery_partner(db=db, delivery_partner_id=delivery_partner_id, delivery_partner=delivery_partner)
    
    raise HTTPException(status_code=403, detail="Not authorized to update this delivery partner")


@router.delete("/{delivery_partner_id}", response_model=schemas.DeliveryPartner)
def delete_delivery_partner(delivery_partner_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Delete a delivery partner (requires admin role)"""
    delivery_partner = crud.get_delivery_partner(db, delivery_partner_id=delivery_partner_id)
    if not delivery_partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    
    return crud.delete_delivery_partner(db=db, delivery_partner_id=delivery_partner_id)


@router.get("/available", response_model=list[schemas.DeliveryPartner])
def read_available_delivery_partners(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all available delivery partners (requires admin role)"""
    delivery_partners = crud.get_available_delivery_partners(db, skip=skip, limit=limit)
    return delivery_partners