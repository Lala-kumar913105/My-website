from sqlalchemy.orm import Session
from app import models, schemas
from datetime import datetime


def get_service(db: Session, service_id: int):
    return db.query(models.Service).filter(models.Service.id == service_id).first()


def get_services(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Service).offset(skip).limit(limit).all()


def get_services_by_seller(db: Session, seller_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Service).filter(models.Service.seller_id == seller_id).offset(skip).limit(limit).all()


def get_services_by_category(db: Session, category_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Service).filter(models.Service.category_id == category_id).offset(skip).limit(limit).all()


def create_service(db: Session, service: schemas.ServiceCreate, seller_id: int):
    db_service = models.Service(
        seller_id=seller_id,
        category_id=service.category_id,
        name=service.name,
        description=service.description,
        price=service.price,
        duration_minutes=service.duration_minutes,
        latitude=service.latitude,
        longitude=service.longitude,
        address=service.address,
    )
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service


def update_service(db: Session, service_id: int, service: schemas.ServiceUpdate):
    db_service = get_service(db, service_id=service_id)
    if db_service:
        for key, value in service.dict(exclude_unset=True).items():
            setattr(db_service, key, value)
        db_service.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_service)
    return db_service


def delete_service(db: Session, service_id: int):
    db_service = get_service(db, service_id=service_id)
    if db_service:
        db.delete(db_service)
        db.commit()
    return db_service