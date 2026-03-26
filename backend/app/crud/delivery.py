from sqlalchemy.orm import Session
from app import models, schemas
from datetime import datetime


def get_delivery(db: Session, delivery_id: int):
    return db.query(models.Delivery).filter(models.Delivery.id == delivery_id).first()


def get_delivery_by_order(db: Session, order_id: int):
    return db.query(models.Delivery).filter(models.Delivery.order_id == order_id).first()


def get_deliveries(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Delivery).offset(skip).limit(limit).all()


def get_deliveries_by_delivery_partner(db: Session, delivery_partner_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Delivery).filter(models.Delivery.delivery_partner_id == delivery_partner_id).offset(skip).limit(limit).all()


def create_delivery(db: Session, delivery: schemas.DeliveryCreate):
    db_delivery = models.Delivery(
        order_id=delivery.order_id,
        delivery_partner_id=delivery.delivery_partner_id,
        status=delivery.status,
        pickup_location=delivery.pickup_location,
        delivery_location=delivery.delivery_location,
        estimated_delivery_time=delivery.estimated_delivery_time,
    )
    db.add(db_delivery)
    db.commit()
    db.refresh(db_delivery)
    return db_delivery


def update_delivery(db: Session, delivery_id: int, delivery: schemas.DeliveryUpdate):
    db_delivery = get_delivery(db, delivery_id=delivery_id)
    if db_delivery:
        for key, value in delivery.dict(exclude_unset=True).items():
            setattr(db_delivery, key, value)
        db_delivery.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_delivery)
    return db_delivery


def delete_delivery(db: Session, delivery_id: int):
    db_delivery = get_delivery(db, delivery_id=delivery_id)
    if db_delivery:
        db.delete(db_delivery)
        db.commit()
    return db_delivery


def assign_delivery_partner(db: Session, delivery_id: int, delivery_partner_id: int):
    return update_delivery(db, delivery_id, schemas.DeliveryUpdate(
        delivery_partner_id=delivery_partner_id,
        status=models.DeliveryStatus.picked_up if not get_delivery(db, delivery_id).status else get_delivery(db, delivery_id).status,
    ))


def mark_delivery_picked_up(db: Session, delivery_id: int):
    return update_delivery(db, delivery_id, schemas.DeliveryUpdate(
        status=models.DeliveryStatus.picked_up,
    ))


def mark_delivery_in_transit(db: Session, delivery_id: int):
    return update_delivery(db, delivery_id, schemas.DeliveryUpdate(
        status=models.DeliveryStatus.in_transit,
    ))


def mark_delivery_delivered(db: Session, delivery_id: int):
    return update_delivery(db, delivery_id, schemas.DeliveryUpdate(
        status=models.DeliveryStatus.delivered,
        actual_delivery_time=datetime.utcnow(),
    ))


def mark_delivery_failed(db: Session, delivery_id: int):
    return update_delivery(db, delivery_id, schemas.DeliveryUpdate(
        status=models.DeliveryStatus.failed,
    ))


def mark_delivery_cancelled(db: Session, delivery_id: int):
    return update_delivery(db, delivery_id, schemas.DeliveryUpdate(
        status=models.DeliveryStatus.cancelled,
    ))