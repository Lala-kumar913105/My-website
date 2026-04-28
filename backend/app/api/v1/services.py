from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_user, get_current_active_seller, get_current_active_admin

router = APIRouter()


@router.get("/", response_model=list[schemas.Service])
def read_services(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all services with pagination (public route)"""
    services = crud.get_services(db, skip=skip, limit=limit)
    return services


@router.get("/{service_id}", response_model=schemas.Service)
def read_service(service_id: int, db: Session = Depends(get_db)):
    """Get a service by ID (public route)"""
    service = crud.get_service(db, service_id=service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.get("/seller/{seller_id}", response_model=list[schemas.Service])
def read_services_by_seller(seller_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all services by seller with pagination (public route)"""
    services = crud.get_services_by_seller(db, seller_id=seller_id, skip=skip, limit=limit)
    return services


@router.get("/category/{category_id}", response_model=list[schemas.Service])
def read_services_by_category(
    category_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Get services by category with pagination (public route)"""
    category = crud.get_category(db, category_id=category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    services = crud.get_services_by_category(db, category_id=category_id, skip=skip, limit=limit)
    return services


@router.post("/", response_model=schemas.Service)
def create_service(service: schemas.ServiceCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new service (auto-creates seller profile if needed)."""
    seller = crud.get_or_create_seller(db, user=current_user)
    
    db_service = crud.create_service(db, service=service, seller_id=seller.id)
    return db_service


@router.put("/{service_id}", response_model=schemas.Service)
def update_service(service_id: int, service: schemas.ServiceUpdate, current_user: models.User = Depends(get_current_active_seller), db: Session = Depends(get_db)):
    """Update service details (requires seller role)"""
    db_service = crud.get_service(db, service_id=service_id)
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller or db_service.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this service")
    
    return crud.update_service(db, service_id=service_id, service=service)


@router.delete("/{service_id}", response_model=schemas.Service)
def delete_service(service_id: int, current_user: models.User = Depends(get_current_active_seller), db: Session = Depends(get_db)):
    """Delete a service (requires seller role)"""
    db_service = crud.get_service(db, service_id=service_id)
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    seller = crud.get_seller_by_user_id(db, user_id=current_user.id)
    if not seller or db_service.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this service")
    
    return crud.delete_service(db, service_id=service_id)
