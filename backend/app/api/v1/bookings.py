from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_user, get_current_active_user, get_current_active_admin, get_current_active_seller

router = APIRouter()


@router.get("/", response_model=list[schemas.Booking])
def read_bookings(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all bookings with pagination (requires admin role)"""
    bookings = crud.get_bookings(db, skip=skip, limit=limit)
    return bookings


@router.get("/{booking_id}", response_model=schemas.Booking)
def read_booking(booking_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get a booking by ID (requires authentication)"""
    booking = crud.get_booking(db, booking_id=booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if current_user.role == models.RoleEnum.ADMIN:
        return booking
    
    if current_user.role in {models.RoleEnum.USER, models.RoleEnum.BUYER, models.RoleEnum.BOTH} and booking.user_id == current_user.id:
        return booking
    
    if current_user.role == models.RoleEnum.SELLER:
        seller = crud.get_seller_by_user_id(db, current_user.id)
        service = crud.get_service(db, service_id=booking.service_id)
        if seller and service and service.seller_id == seller.id:
            return booking
    
    raise HTTPException(status_code=403, detail="Not authorized to view this booking")


@router.get("/user/{user_id}", response_model=list[schemas.Booking])
def read_bookings_by_user(user_id: int, skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all bookings by user with pagination (requires authentication)"""
    if current_user.role == models.RoleEnum.ADMIN:
        bookings = crud.get_bookings_by_user(db, user_id=user_id, skip=skip, limit=limit)
        return bookings
    
    if current_user.role in {models.RoleEnum.USER, models.RoleEnum.BUYER, models.RoleEnum.BOTH} and user_id == current_user.id:
        bookings = crud.get_bookings_by_user(db, user_id=user_id, skip=skip, limit=limit)
        return bookings
    
    raise HTTPException(status_code=403, detail="Not authorized to view bookings for this user")


@router.get("/seller/me", response_model=list[schemas.Booking])
def read_bookings_for_seller(
    status: str | None = None,
    skip: int = 0,
    limit: int = Query(100, ge=1, le=200),
    current_user: models.User = Depends(get_current_active_seller),
    db: Session = Depends(get_db),
):
    """Get bookings for the logged-in seller with status filter."""
    seller = crud.get_seller_by_user_id(db, current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    bookings = crud.booking.get_seller_bookings(
        db,
        seller_id=seller.id,
        status=status,
        skip=skip,
        limit=limit,
    )
    return bookings


@router.get("/service/{service_id}", response_model=list[schemas.Booking])
def read_bookings_by_service(service_id: int, skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all bookings by service with pagination (requires authentication)"""
    service = crud.get_service(db, service_id=service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if current_user.role == models.RoleEnum.ADMIN:
        bookings = crud.get_bookings_by_service(db, service_id=service_id, skip=skip, limit=limit)
        return bookings
    
    if current_user.role == models.RoleEnum.SELLER:
        seller = crud.get_seller_by_user_id(db, current_user.id)
        if seller and service.seller_id == seller.id:
            bookings = crud.get_bookings_by_service(db, service_id=service_id, skip=skip, limit=limit)
            return bookings
    
    raise HTTPException(status_code=403, detail="Not authorized to view bookings for this service")


@router.post("/", response_model=schemas.Booking)
def create_booking(booking: schemas.BookingCreate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Create a new booking (requires user role)"""
    try:
        if booking.service_id is None and booking.listing_id is None:
            raise ValueError("service_id or listing_id is required")

        resolved_service_id = booking.service_id
        if resolved_service_id is None and booking.listing_id is not None:
            listing = crud.get_listing(db, listing_id=booking.listing_id)
            if not listing or listing.type != "service":
                raise ValueError("Selected listing is not a service")
            resolved_service_id = listing.source_id

        if resolved_service_id is None:
            raise ValueError("Service mapping not found for listing")

        # Prevent double booking
        existing = (
            db.query(models.Booking)
            .filter(
                models.Booking.service_id == resolved_service_id,
                models.Booking.booking_time == booking.booking_time,
                models.Booking.status.in_([models.BookingStatus.pending, models.BookingStatus.confirmed, models.BookingStatus.rescheduled]),
            )
            .first()
        )
        if existing:
            raise ValueError("Selected time is already booked")
        db_booking = crud.create_booking(db, booking=booking, user_id=current_user.id)
        return db_booking
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{booking_id}", response_model=schemas.Booking)
def update_booking(booking_id: int, booking: schemas.BookingUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update booking details (requires authentication)"""
    db_booking = crud.get_booking(db, booking_id=booking_id)
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if current_user.role == models.RoleEnum.ADMIN:
        return crud.update_booking(db, booking_id=booking_id, booking=booking)
    
    if current_user.role in {models.RoleEnum.USER, models.RoleEnum.BUYER, models.RoleEnum.BOTH} and db_booking.user_id == current_user.id:
        return crud.update_booking(db, booking_id=booking_id, booking=booking)
    
    raise HTTPException(status_code=403, detail="Not authorized to update this booking")


@router.post("/{booking_id}/reschedule", response_model=schemas.Booking)
def reschedule_booking(
    booking_id: int,
    payload: schemas.BookingUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reschedule booking (requires authentication)."""
    if payload.booking_time is None:
        raise HTTPException(status_code=400, detail="booking_time is required")
    db_booking = crud.get_booking(db, booking_id=booking_id)
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role == models.RoleEnum.ADMIN:
        return crud.update_booking(db, booking_id=booking_id, booking=payload)

    if current_user.role in {models.RoleEnum.USER, models.RoleEnum.BUYER, models.RoleEnum.BOTH} and db_booking.user_id == current_user.id:
        payload.status = models.BookingStatus.rescheduled
        payload.reschedule_requested = 1
        return crud.update_booking(db, booking_id=booking_id, booking=payload)

    if current_user.role == models.RoleEnum.SELLER:
        seller = crud.get_seller_by_user_id(db, current_user.id)
        service = crud.get_service(db, service_id=db_booking.service_id)
        if seller and service and service.seller_id == seller.id:
            payload.status = models.BookingStatus.rescheduled
            return crud.update_booking(db, booking_id=booking_id, booking=payload)

    raise HTTPException(status_code=403, detail="Not authorized to reschedule this booking")


@router.post("/{booking_id}/status", response_model=schemas.Booking)
def update_booking_status(
    booking_id: int,
    payload: schemas.BookingUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update booking status for seller or buyer."""
    if payload.status is None:
        raise HTTPException(status_code=400, detail="status is required")
    booking = crud.get_booking(db, booking_id=booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role in {models.RoleEnum.USER, models.RoleEnum.BUYER, models.RoleEnum.BOTH}:
        if booking.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if payload.status not in {models.BookingStatus.cancelled, models.BookingStatus.rescheduled}:
            raise HTTPException(status_code=400, detail="Invalid status change")
        return crud.update_booking(db, booking_id=booking_id, booking=payload)

    if current_user.role == models.RoleEnum.SELLER:
        seller = crud.get_seller_by_user_id(db, current_user.id)
        service = crud.get_service(db, service_id=booking.service_id)
        if not seller or not service or service.seller_id != seller.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        return crud.update_booking(db, booking_id=booking_id, booking=payload)

    if current_user.role == models.RoleEnum.ADMIN:
        return crud.update_booking(db, booking_id=booking_id, booking=payload)

    raise HTTPException(status_code=403, detail="Not authorized")


@router.get("/slots/{service_id}", response_model=list[schemas.BookingSlot])
def get_available_slots(
    service_id: int,
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    db: Session = Depends(get_db),
):
    """Get available slots for a service within a time range."""
    return crud.booking.get_available_slots(db, service_id=service_id, start_time=start_time, end_time=end_time)


@router.get("/slots/listing/{listing_id}", response_model=list[schemas.BookingSlot])
def get_available_slots_for_listing(
    listing_id: int,
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    db: Session = Depends(get_db),
):
    """Get available slots for a service listing within a time range."""
    listing = crud.get_listing(db, listing_id=listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.type != "service":
        raise HTTPException(status_code=400, detail="Only service listings can have slots")
    return crud.booking.get_available_slots(
        db,
        service_id=None,
        listing_id=listing_id,
        start_time=start_time,
        end_time=end_time,
    )


@router.post("/slots", response_model=schemas.BookingSlot)
def create_slot(
    slot: schemas.BookingSlotCreate,
    current_user: models.User = Depends(get_current_active_seller),
    db: Session = Depends(get_db),
):
    """Create a booking slot (seller only)."""
    seller = crud.get_seller_by_user_id(db, current_user.id)
    if not seller:
        raise HTTPException(status_code=403, detail="Not authorized")

    if slot.listing_id:
        listing = crud.get_listing(db, listing_id=slot.listing_id)
        if not listing or listing.seller_id != seller.id or listing.type != "service":
            raise HTTPException(status_code=403, detail="Not authorized")
    elif slot.service_id:
        service = crud.get_service(db, service_id=slot.service_id)
        if not service or service.seller_id != seller.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        raise HTTPException(status_code=400, detail="service_id or listing_id required")

    return crud.booking.create_booking_slot(db, slot=slot)


@router.put("/slots/{slot_id}", response_model=schemas.BookingSlot)
def update_slot(
    slot_id: int,
    slot: schemas.BookingSlotUpdate,
    current_user: models.User = Depends(get_current_active_seller),
    db: Session = Depends(get_db),
):
    """Update a booking slot (seller only)."""
    db_slot = db.query(models.BookingSlot).filter(models.BookingSlot.id == slot_id).first()
    if not db_slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    seller = crud.get_seller_by_user_id(db, current_user.id)
    if not seller:
        raise HTTPException(status_code=403, detail="Not authorized")

    if db_slot.listing_id:
        listing = crud.get_listing(db, listing_id=db_slot.listing_id)
        if not listing or listing.seller_id != seller.id or listing.type != "service":
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        service = crud.get_service(db, service_id=db_slot.service_id)
        if not service or service.seller_id != seller.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    return crud.booking.update_booking_slot(db, slot_id=slot_id, slot=slot)


@router.delete("/slots/{slot_id}")
def delete_slot(
    slot_id: int,
    current_user: models.User = Depends(get_current_active_seller),
    db: Session = Depends(get_db),
):
    """Delete a booking slot (seller only)."""
    db_slot = db.query(models.BookingSlot).filter(models.BookingSlot.id == slot_id).first()
    if not db_slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    seller = crud.get_seller_by_user_id(db, current_user.id)
    if not seller:
        raise HTTPException(status_code=403, detail="Not authorized")

    if db_slot.listing_id:
        listing = crud.get_listing(db, listing_id=db_slot.listing_id)
        if not listing or listing.seller_id != seller.id or listing.type != "service":
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        service = crud.get_service(db, service_id=db_slot.service_id)
        if not service or service.seller_id != seller.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    crud.booking.delete_booking_slot(db, slot_id=slot_id)
    return {"message": "Slot deleted"}


@router.delete("/{booking_id}", response_model=schemas.Booking)
def delete_booking(booking_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a booking (requires authentication)"""
    db_booking = crud.get_booking(db, booking_id=booking_id)
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if current_user.role == models.RoleEnum.ADMIN:
        return crud.delete_booking(db, booking_id=booking_id)
    
    if current_user.role in {models.RoleEnum.USER, models.RoleEnum.BUYER, models.RoleEnum.BOTH} and db_booking.user_id == current_user.id:
        return crud.delete_booking(db, booking_id=booking_id)
    
    raise HTTPException(status_code=403, detail="Not authorized to delete this booking")
