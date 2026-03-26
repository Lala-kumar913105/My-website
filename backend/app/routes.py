from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.app import models, schemas
from backend.app.crud import coupon as coupon_crud, payment as payment_crud, payout as payout_crud, delivery_partner as delivery_partner_crud, delivery as delivery_crud
from backend.app.db.session import get_db


router = APIRouter()


# Coupon routes
@router.get("/coupons/{coupon_id}", response_model=schemas.Coupon, tags=["Coupons"])
def read_coupon(coupon_id: int, db: Session = Depends(get_db)):
    db_coupon = coupon_crud.get_coupon(db, coupon_id=coupon_id)
    if db_coupon is None:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return db_coupon


@router.get("/coupons", response_model=List[schemas.Coupon], tags=["Coupons"])
def read_coupons(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    coupons = coupon_crud.get_coupons(db, skip=skip, limit=limit)
    return coupons


@router.put("/coupons/{coupon_id}", response_model=schemas.Coupon, tags=["Coupons"])
def update_coupon(coupon_id: int, coupon: schemas.CouponUpdate, db: Session = Depends(get_db)):
    db_coupon = coupon_crud.get_coupon(db, coupon_id=coupon_id)
    if db_coupon is None:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return coupon_crud.update_coupon(db=db, coupon_id=coupon_id, coupon=coupon)


@router.delete("/coupons/{coupon_id}", response_model=schemas.Coupon, tags=["Coupons"])
def delete_coupon(coupon_id: int, db: Session = Depends(get_db)):
    db_coupon = coupon_crud.get_coupon(db, coupon_id=coupon_id)
    if db_coupon is None:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return coupon_crud.delete_coupon(db=db, coupon_id=coupon_id)


# Payment routes
@router.post("/payments", response_model=schemas.Payment, tags=["Payments"])
def create_payment(payment: schemas.PaymentCreate, user_id: int, db: Session = Depends(get_db)):
    return payment_crud.create_payment(db=db, payment=payment, user_id=user_id)


@router.get("/payments/{payment_id}", response_model=schemas.Payment, tags=["Payments"])
def read_payment(payment_id: int, db: Session = Depends(get_db)):
    db_payment = payment_crud.get_payment(db, payment_id=payment_id)
    if db_payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return db_payment


@router.get("/payments", response_model=List[schemas.Payment], tags=["Payments"])
def read_payments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    payments = payment_crud.get_payments(db, skip=skip, limit=limit)
    return payments


@router.put("/payments/{payment_id}", response_model=schemas.Payment, tags=["Payments"])
def update_payment(payment_id: int, payment: schemas.PaymentUpdate, db: Session = Depends(get_db)):
    db_payment = payment_crud.get_payment(db, payment_id=payment_id)
    if db_payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment_crud.update_payment(db=db, payment_id=payment_id, payment=payment)


@router.delete("/payments/{payment_id}", response_model=schemas.Payment, tags=["Payments"])
def delete_payment(payment_id: int, db: Session = Depends(get_db)):
    db_payment = payment_crud.get_payment(db, payment_id=payment_id)
    if db_payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment_crud.delete_payment(db=db, payment_id=payment_id)


# Payout routes
@router.post("/payouts", response_model=schemas.Payout, tags=["Payouts"])
def create_payout(payout: schemas.PayoutCreate, db: Session = Depends(get_db)):
    return payout_crud.create_payout(db=db, payout=payout)


@router.get("/payouts/{payout_id}", response_model=schemas.Payout, tags=["Payouts"])
def read_payout(payout_id: int, db: Session = Depends(get_db)):
    db_payout = payout_crud.get_payout(db, payout_id=payout_id)
    if db_payout is None:
        raise HTTPException(status_code=404, detail="Payout not found")
    return db_payout


@router.get("/payouts", response_model=List[schemas.Payout], tags=["Payouts"])
def read_payouts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    payouts = payout_crud.get_payouts(db, skip=skip, limit=limit)
    return payouts


@router.put("/payouts/{payout_id}", response_model=schemas.Payout, tags=["Payouts"])
def update_payout(payout_id: int, payout: schemas.PayoutUpdate, db: Session = Depends(get_db)):
    db_payout = payout_crud.get_payout(db, payout_id=payout_id)
    if db_payout is None:
        raise HTTPException(status_code=404, detail="Payout not found")
    return payout_crud.update_payout(db=db, payout_id=payout_id, payout=payout)


@router.delete("/payouts/{payout_id}", response_model=schemas.Payout, tags=["Payouts"])
def delete_payout(payout_id: int, db: Session = Depends(get_db)):
    db_payout = payout_crud.get_payout(db, payout_id=payout_id)
    if db_payout is None:
        raise HTTPException(status_code=404, detail="Payout not found")
    return payout_crud.delete_payout(db=db, payout_id=payout_id)


# Delivery partner routes
@router.post("/delivery-partners", response_model=schemas.DeliveryPartner, tags=["Delivery Partners"])
def create_delivery_partner(delivery_partner: schemas.DeliveryPartnerCreate, user_id: int, db: Session = Depends(get_db)):
    return delivery_partner_crud.create_delivery_partner(db=db, delivery_partner=delivery_partner, user_id=user_id)


@router.get("/delivery-partners/{delivery_partner_id}", response_model=schemas.DeliveryPartner, tags=["Delivery Partners"])
def read_delivery_partner(delivery_partner_id: int, db: Session = Depends(get_db)):
    db_delivery_partner = delivery_partner_crud.get_delivery_partner(db, delivery_partner_id=delivery_partner_id)
    if db_delivery_partner is None:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    return db_delivery_partner


@router.get("/delivery-partners", response_model=List[schemas.DeliveryPartner], tags=["Delivery Partners"])
def read_delivery_partners(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    delivery_partners = delivery_partner_crud.get_delivery_partners(db, skip=skip, limit=limit)
    return delivery_partners


@router.put("/delivery-partners/{delivery_partner_id}", response_model=schemas.DeliveryPartner, tags=["Delivery Partners"])
def update_delivery_partner(delivery_partner_id: int, delivery_partner: schemas.DeliveryPartnerUpdate, db: Session = Depends(get_db)):
    db_delivery_partner = delivery_partner_crud.get_delivery_partner(db, delivery_partner_id=delivery_partner_id)
    if db_delivery_partner is None:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    return delivery_partner_crud.update_delivery_partner(db=db, delivery_partner_id=delivery_partner_id, delivery_partner=delivery_partner)


@router.delete("/delivery-partners/{delivery_partner_id}", response_model=schemas.DeliveryPartner, tags=["Delivery Partners"])
def delete_delivery_partner(delivery_partner_id: int, db: Session = Depends(get_db)):
    db_delivery_partner = delivery_partner_crud.get_delivery_partner(db, delivery_partner_id=delivery_partner_id)
    if db_delivery_partner is None:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    return delivery_partner_crud.delete_delivery_partner(db=db, delivery_partner_id=delivery_partner_id)


# Delivery routes
@router.post("/deliveries", response_model=schemas.Delivery, tags=["Deliveries"])
def create_delivery(delivery: schemas.DeliveryCreate, db: Session = Depends(get_db)):
    return delivery_crud.create_delivery(db=db, delivery=delivery)


@router.get("/deliveries/{delivery_id}", response_model=schemas.Delivery, tags=["Deliveries"])
def read_delivery(delivery_id: int, db: Session = Depends(get_db)):
    db_delivery = delivery_crud.get_delivery(db, delivery_id=delivery_id)
    if db_delivery is None:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return db_delivery


@router.get("/deliveries", response_model=List[schemas.Delivery], tags=["Deliveries"])
def read_deliveries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    deliveries = delivery_crud.get_deliveries(db, skip=skip, limit=limit)
    return deliveries


@router.put("/deliveries/{delivery_id}", response_model=schemas.Delivery, tags=["Deliveries"])
def update_delivery(delivery_id: int, delivery: schemas.DeliveryUpdate, db: Session = Depends(get_db)):
    db_delivery = delivery_crud.get_delivery(db, delivery_id=delivery_id)
    if db_delivery is None:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery_crud.update_delivery(db=db, delivery_id=delivery_id, delivery=delivery)


@router.delete("/deliveries/{delivery_id}", response_model=schemas.Delivery, tags=["Deliveries"])
def delete_delivery(delivery_id: int, db: Session = Depends(get_db)):
    db_delivery = delivery_crud.get_delivery(db, delivery_id=delivery_id)
    if db_delivery is None:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery_crud.delete_delivery(db=db, delivery_id=delivery_id)


# Assign delivery partner to delivery
@router.put("/deliveries/{delivery_id}/assign", response_model=schemas.Delivery, tags=["Deliveries"])
def assign_delivery_partner(delivery_id: int, delivery_partner_id: int, db: Session = Depends(get_db)):
    db_delivery = delivery_crud.get_delivery(db, delivery_id=delivery_id)
    if db_delivery is None:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    db_delivery_partner = delivery_partner_crud.get_delivery_partner(db, delivery_partner_id=delivery_partner_id)
    if db_delivery_partner is None:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    
    return delivery_crud.assign_delivery_partner(db=db, delivery_id=delivery_id, delivery_partner_id=delivery_partner_id)


# Mark delivery as picked up
@router.put("/deliveries/{delivery_id}/pickup", response_model=schemas.Delivery, tags=["Deliveries"])
def mark_delivery_picked_up(delivery_id: int, db: Session = Depends(get_db)):
    db_delivery = delivery_crud.get_delivery(db, delivery_id=delivery_id)
    if db_delivery is None:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery_crud.mark_delivery_picked_up(db=db, delivery_id=delivery_id)


# Mark delivery as in transit
@router.put("/deliveries/{delivery_id}/in-transit", response_model=schemas.Delivery, tags=["Deliveries"])
def mark_delivery_in_transit(delivery_id: int, db: Session = Depends(get_db)):
    db_delivery = delivery_crud.get_delivery(db, delivery_id=delivery_id)
    if db_delivery is None:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery_crud.mark_delivery_in_transit(db=db, delivery_id=delivery_id)


# Mark delivery as delivered
@router.put("/deliveries/{delivery_id}/deliver", response_model=schemas.Delivery, tags=["Deliveries"])
def mark_delivery_delivered(delivery_id: int, db: Session = Depends(get_db)):
    db_delivery = delivery_crud.get_delivery(db, delivery_id=delivery_id)
    if db_delivery is None:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery_crud.mark_delivery_delivered(db=db, delivery_id=delivery_id)


# Mark delivery as failed
@router.put("/deliveries/{delivery_id}/fail", response_model=schemas.Delivery, tags=["Deliveries"])
def mark_delivery_failed(delivery_id: int, db: Session = Depends(get_db)):
    db_delivery = delivery_crud.get_delivery(db, delivery_id=delivery_id)
    if db_delivery is None:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery_crud.mark_delivery_failed(db=db, delivery_id=delivery_id)


# Mark delivery as cancelled
@router.put("/deliveries/{delivery_id}/cancel", response_model=schemas.Delivery, tags=["Deliveries"])
def mark_delivery_cancelled(delivery_id: int, db: Session = Depends(get_db)):
    db_delivery = delivery_crud.get_delivery(db, delivery_id=delivery_id)
    if db_delivery is None:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery_crud.mark_delivery_cancelled(db=db, delivery_id=delivery_id)