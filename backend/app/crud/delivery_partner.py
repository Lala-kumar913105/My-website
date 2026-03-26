from sqlalchemy.orm import Session
from app import models, schemas
from datetime import datetime


def get_delivery_partner(db: Session, delivery_partner_id: int):
    return db.query(models.DeliveryPartner).filter(models.DeliveryPartner.id == delivery_partner_id).first()


def get_delivery_partner_by_user_id(db: Session, user_id: int):
    return db.query(models.DeliveryPartner).filter(models.DeliveryPartner.user_id == user_id).first()


def get_delivery_partners(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.DeliveryPartner).offset(skip).limit(limit).all()


def get_available_delivery_partners(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.DeliveryPartner).filter(models.DeliveryPartner.is_available == True).offset(skip).limit(limit).all()


def create_delivery_partner(db: Session, delivery_partner: schemas.DeliveryPartnerCreate, user_id: int):
    db_delivery_partner = models.DeliveryPartner(
        user_id=user_id,
        vehicle_type=delivery_partner.vehicle_type,
        license_number=delivery_partner.license_number,
        is_available=delivery_partner.is_available,
        current_latitude=delivery_partner.current_latitude,
        current_longitude=delivery_partner.current_longitude,
    )
    db.add(db_delivery_partner)
    db.commit()
    db.refresh(db_delivery_partner)
    return db_delivery_partner


def update_delivery_partner(db: Session, delivery_partner_id: int, delivery_partner: schemas.DeliveryPartnerUpdate):
    db_delivery_partner = get_delivery_partner(db, delivery_partner_id=delivery_partner_id)
    if db_delivery_partner:
        for key, value in delivery_partner.dict(exclude_unset=True).items():
            setattr(db_delivery_partner, key, value)
        db_delivery_partner.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_delivery_partner)
    return db_delivery_partner


def delete_delivery_partner(db: Session, delivery_partner_id: int):
    db_delivery_partner = get_delivery_partner(db, delivery_partner_id=delivery_partner_id)
    if db_delivery_partner:
        db.delete(db_delivery_partner)
        db.commit()
    return db_delivery_partner


def update_delivery_partner_location(db: Session, delivery_partner_id: int, latitude: float, longitude: float):
    return update_delivery_partner(db, delivery_partner_id, schemas.DeliveryPartnerUpdate(
        current_latitude=latitude,
        current_longitude=longitude,
    ))