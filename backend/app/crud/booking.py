from sqlalchemy.orm import Session
from app import models, schemas
from datetime import datetime


def get_booking(db: Session, booking_id: int):
    return db.query(models.Booking).filter(models.Booking.id == booking_id).first()


def get_bookings(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Booking).offset(skip).limit(limit).all()


def get_bookings_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Booking).filter(models.Booking.user_id == user_id).offset(skip).limit(limit).all()


def get_bookings_by_service(db: Session, service_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Booking).filter(models.Booking.service_id == service_id).offset(skip).limit(limit).all()


def create_booking(db: Session, booking: schemas.BookingCreate, user_id: int):
    service_id = booking.service_id

    if service_id is None and booking.listing_id is not None:
        listing = db.query(models.Listing).filter(models.Listing.id == booking.listing_id).first()
        if not listing or listing.type != "service":
            raise ValueError("Service listing not found")
        service_id = listing.source_id

    if service_id is None:
        raise ValueError("service_id or listing_id is required")

    # Get service to calculate total amount
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise ValueError("Service not found")

    db_booking = models.Booking(
        user_id=user_id,
        service_id=service_id,
        booking_time=booking.booking_time,
        total_amount=service.price,
        status=models.BookingStatus.pending,
        notes=booking.notes,
        buyer_notes=booking.buyer_notes,
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking


def update_booking(db: Session, booking_id: int, booking: schemas.BookingUpdate):
    db_booking = get_booking(db, booking_id=booking_id)
    if db_booking:
        payload = booking.dict(exclude_unset=True)
        if "booking_time" in payload:
            if db_booking.original_booking_time is None:
                db_booking.original_booking_time = db_booking.booking_time
            db_booking.status = models.BookingStatus.rescheduled
        for key, value in payload.items():
            setattr(db_booking, key, value)
        db_booking.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_booking)
    return db_booking


def get_seller_bookings(
    db: Session,
    seller_id: int,
    status: str | None = None,
    skip: int = 0,
    limit: int = 100,
):
    query = (
        db.query(models.Booking)
        .join(models.Service, models.Service.id == models.Booking.service_id)
        .filter(models.Service.seller_id == seller_id)
    )
    if status:
        query = query.filter(models.Booking.status == status)
    return (
        query.order_by(models.Booking.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_available_slots(
    db: Session,
    service_id: int | None,
    start_time: datetime,
    end_time: datetime,
    listing_id: int | None = None,
):
    query = db.query(models.BookingSlot)

    if service_id is not None:
        query = query.filter(models.BookingSlot.service_id == service_id)
    elif listing_id is not None:
        query = query.filter(models.BookingSlot.listing_id == listing_id)
    else:
        return []

    return (
        query.filter(
            models.BookingSlot.start_time >= start_time,
            models.BookingSlot.end_time <= end_time,
            models.BookingSlot.is_available == True,
        )
        .order_by(models.BookingSlot.start_time.asc())
        .all()
    )


def create_booking_slot(db: Session, slot: schemas.BookingSlotCreate):
    if not slot.service_id and not slot.listing_id:
        raise ValueError("service_id or listing_id is required")
    db_slot = models.BookingSlot(
        service_id=slot.service_id,
        listing_id=slot.listing_id,
        start_time=slot.start_time,
        end_time=slot.end_time,
        is_available=slot.is_available,
    )
    db.add(db_slot)
    db.commit()
    db.refresh(db_slot)
    return db_slot


def update_booking_slot(db: Session, slot_id: int, slot: schemas.BookingSlotUpdate):
    db_slot = db.query(models.BookingSlot).filter(models.BookingSlot.id == slot_id).first()
    if db_slot:
        for key, value in slot.dict(exclude_unset=True).items():
            setattr(db_slot, key, value)
        db_slot.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_slot)
    return db_slot


def delete_booking_slot(db: Session, slot_id: int):
    db_slot = db.query(models.BookingSlot).filter(models.BookingSlot.id == slot_id).first()
    if db_slot:
        db.delete(db_slot)
        db.commit()
    return db_slot


def delete_booking(db: Session, booking_id: int):
    db_booking = get_booking(db, booking_id=booking_id)
    if db_booking:
        db.delete(db_booking)
        db.commit()
    return db_booking