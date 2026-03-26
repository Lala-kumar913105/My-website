from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_user, get_current_active_admin, get_current_active_delivery_partner

router = APIRouter()


@router.get("/", response_model=list[schemas.Delivery])
def read_deliveries(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all deliveries with pagination (requires admin role)"""
    deliveries = crud.get_deliveries(db, skip=skip, limit=limit)
    return deliveries


@router.get("/{delivery_id}", response_model=schemas.Delivery)
def read_delivery(delivery_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get a delivery by ID (requires authentication)"""
    delivery = crud.get_delivery(db, delivery_id=delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    if current_user.role == models.RoleEnum.ADMIN:
        return delivery
    
    if current_user.role == models.RoleEnum.DELIVERY_PARTNER and delivery.delivery_partner_id == crud.get_delivery_partner_by_user_id(db, current_user.id).id:
        return delivery
    
    raise HTTPException(status_code=403, detail="Not authorized to view this delivery")


@router.get("/delivery-partner/me", response_model=list[schemas.Delivery])
def read_my_deliveries(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_delivery_partner), db: Session = Depends(get_db)):
    """Get all deliveries assigned to current delivery partner (requires delivery partner role)"""
    delivery_partner = crud.get_delivery_partner_by_user_id(db, user_id=current_user.id)
    if not delivery_partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found for this user")
    
    deliveries = crud.get_deliveries_by_delivery_partner(db, delivery_partner_id=delivery_partner.id, skip=skip, limit=limit)
    return deliveries


@router.post("/", response_model=schemas.Delivery)
def create_delivery(delivery: schemas.DeliveryCreate, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Create a new delivery (requires admin role)"""
    return crud.create_delivery(db=db, delivery=delivery)


@router.put("/{delivery_id}", response_model=schemas.Delivery)
def update_delivery(delivery_id: int, delivery: schemas.DeliveryUpdate, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Update a delivery (requires admin role)"""
    db_delivery = crud.get_delivery(db, delivery_id=delivery_id)
    if not db_delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    return crud.update_delivery(db=db, delivery_id=delivery_id, delivery=delivery)


@router.delete("/{delivery_id}", response_model=schemas.Delivery)
def delete_delivery(delivery_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Delete a delivery (requires admin role)"""
    delivery = crud.get_delivery(db, delivery_id=delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    return crud.delete_delivery(db=db, delivery_id=delivery_id)


@router.put("/{delivery_id}/assign", response_model=schemas.Delivery)
def assign_delivery_partner(delivery_id: int, delivery_partner_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Assign a delivery partner to a delivery (requires admin role)"""
    delivery = crud.get_delivery(db, delivery_id=delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    delivery_partner = crud.get_delivery_partner(db, delivery_partner_id=delivery_partner_id)
    if not delivery_partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    
    return crud.assign_delivery_partner(db=db, delivery_id=delivery_id, delivery_partner_id=delivery_partner_id)


@router.put("/{delivery_id}/pickup", response_model=schemas.Delivery)
def mark_delivery_picked_up(delivery_id: int, current_user: models.User = Depends(get_current_active_delivery_partner), db: Session = Depends(get_db)):
    """Mark delivery as picked up (requires delivery partner role)"""
    delivery = crud.get_delivery(db, delivery_id=delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    delivery_partner = crud.get_delivery_partner_by_user_id(db, user_id=current_user.id)
    if delivery.delivery_partner_id != delivery_partner.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this delivery")
    
    return crud.mark_delivery_picked_up(db=db, delivery_id=delivery_id)


@router.put("/{delivery_id}/in-transit", response_model=schemas.Delivery)
def mark_delivery_in_transit(delivery_id: int, current_user: models.User = Depends(get_current_active_delivery_partner), db: Session = Depends(get_db)):
    """Mark delivery as in transit (requires delivery partner role)"""
    delivery = crud.get_delivery(db, delivery_id=delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    delivery_partner = crud.get_delivery_partner_by_user_id(db, user_id=current_user.id)
    if delivery.delivery_partner_id != delivery_partner.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this delivery")
    
    return crud.mark_delivery_in_transit(db=db, delivery_id=delivery_id)


@router.put("/{delivery_id}/deliver", response_model=schemas.Delivery)
def mark_delivery_delivered(delivery_id: int, current_user: models.User = Depends(get_current_active_delivery_partner), db: Session = Depends(get_db)):
    """Mark delivery as delivered (requires delivery partner role)"""
    delivery = crud.get_delivery(db, delivery_id=delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    delivery_partner = crud.get_delivery_partner_by_user_id(db, user_id=current_user.id)
    if delivery.delivery_partner_id != delivery_partner.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this delivery")
    
    return crud.mark_delivery_delivered(db=db, delivery_id=delivery_id)


@router.put("/{delivery_id}/fail", response_model=schemas.Delivery)
def mark_delivery_failed(delivery_id: int, current_user: models.User = Depends(get_current_active_delivery_partner), db: Session = Depends(get_db)):
    """Mark delivery as failed (requires delivery partner role)"""
    delivery = crud.get_delivery(db, delivery_id=delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    delivery_partner = crud.get_delivery_partner_by_user_id(db, user_id=current_user.id)
    if delivery.delivery_partner_id != delivery_partner.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this delivery")
    
    return crud.mark_delivery_failed(db=db, delivery_id=delivery_id)


@router.put("/{delivery_id}/cancel", response_model=schemas.Delivery)
def mark_delivery_cancelled(delivery_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Mark delivery as cancelled (requires admin role)"""
    delivery = crud.get_delivery(db, delivery_id=delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    return crud.mark_delivery_cancelled(db=db, delivery_id=delivery_id)