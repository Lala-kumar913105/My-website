from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_user, get_current_active_user, get_current_active_admin

router = APIRouter()

# Mock Razorpay keys for testing
RAZORPAY_KEY_ID = "rzp_test_1234567890123456"
RAZORPAY_KEY_SECRET = "abcdefghijklmnopqrstuvwxyz12345"


@router.get("/", response_model=list[schemas.Payment])
def read_payments(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all payments with pagination (requires admin role)"""
    payments = crud.get_payments(db, skip=skip, limit=limit)
    return payments


@router.get("/{payment_id}", response_model=schemas.Payment)
def read_payment(payment_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get a payment by ID (requires authentication)"""
    payment = crud.get_payment(db, payment_id=payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if current_user.role != models.RoleEnum.ADMIN and payment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this payment")
    
    return payment


@router.get("/user/{user_id}", response_model=list[schemas.Payment])
def read_payments_by_user(user_id: int, skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all payments by user with pagination (requires authentication)"""
    if current_user.role != models.RoleEnum.ADMIN and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view payments for this user")
    
    payments = crud.get_payments_by_user(db, user_id=user_id, skip=skip, limit=limit)
    return payments


@router.get("/order/{order_id}", response_model=schemas.Payment)
def read_payment_by_order(order_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get payment by order ID (requires authentication)"""
    payment = crud.get_payment_by_order(db, order_id=order_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found for this order")
    
    if current_user.role != models.RoleEnum.ADMIN and payment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this payment")
    
    return payment


@router.post("/create", response_model=schemas.Payment)
def create_payment(payment: schemas.PaymentCreate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Create a new payment (requires user role)"""
    try:
        db_payment = crud.create_payment(db, payment=payment, user_id=current_user.id)
        return db_payment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{payment_id}", response_model=schemas.Payment)
def update_payment(payment_id: int, payment: schemas.PaymentUpdate, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Update payment details (requires admin role)"""
    db_payment = crud.update_payment(db, payment_id=payment_id, payment=payment)
    if not db_payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return db_payment


@router.delete("/{payment_id}", response_model=schemas.Payment)
def delete_payment(payment_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Delete a payment (requires admin role)"""
    db_payment = crud.delete_payment(db, payment_id=payment_id)
    if not db_payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return db_payment


@router.post("/{payment_id}/complete")
def complete_payment(payment_id: int, transaction_id: str, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Mark a payment as complete (requires admin role) and calculate commissions"""
    db_payment = crud.mark_payment_complete(db, payment_id=payment_id, transaction_id=transaction_id)
    if not db_payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Calculate and store commissions if payment is for an order
    if db_payment.order_id:
        order = crud.get_order(db, order_id=db_payment.order_id)
        if order:
            crud.create_order_commissions(db, order)

    return {"message": "Payment completed successfully"}


@router.post("/{payment_id}/failed")
def fail_payment(payment_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Mark a payment as failed (requires admin role)"""
    db_payment = crud.mark_payment_failed(db, payment_id=payment_id)
    if not db_payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"message": "Payment failed"}


@router.post("/order/{order_id}/razorpay-order")
def create_razorpay_order(order_id: int, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Create a Razorpay order for an existing order (requires user role)"""
    # Get the order
    order = crud.get_order(db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to create payment for this order")

    # Create payment record
    payment_data = schemas.PaymentCreate(
        order_id=order_id,
        method=schemas.PaymentMethod.card
    )
    payment = crud.create_payment(db, payment=payment_data, user_id=current_user.id)

    # Mock Razorpay order creation
    razorpay_order = {
        "order_id": f"razorpay_{payment.id}",
        "amount": int(order.total_amount * 100),  # Convert to paise
        "currency": "INR",
        "receipt": f"receipt_{payment.id}",
        "status": "created"
    }

    # Update payment with Razorpay order ID
    crud.update_payment(db, payment_id=payment.id, payment=schemas.PaymentUpdate(
        razorpay_order_id=razorpay_order["order_id"]
    ))

    return {
        "razorpay_key": RAZORPAY_KEY_ID,
        "order": razorpay_order
    }


@router.post("/verify-razorpay-payment")
def verify_razorpay_payment(payment: schemas.RazorpayPayment, db: Session = Depends(get_db)):
    """Verify Razorpay payment (public route for Razorpay callback) and calculate commissions"""
    # Get payment by Razorpay order ID
    payment_record = crud.get_payment_by_razorpay_order_id(db, payment.razorpay_order_id)
    if not payment_record:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Mock verification logic (In production, use Razorpay SDK to verify signature)
    # For testing purposes, we'll just mark it as complete
    crud.update_payment(db, payment_id=payment_record.id, payment=schemas.PaymentUpdate(
        status=schemas.PaymentStatus.completed,
        transaction_id=payment.razorpay_payment_id
    ))

    # Calculate and store commissions if payment is for an order
    if payment_record.order_id:
        order = crud.get_order(db, order_id=payment_record.order_id)
        if order:
            crud.create_order_commissions(db, order)

    return {"message": "Payment verified and completed successfully"}
