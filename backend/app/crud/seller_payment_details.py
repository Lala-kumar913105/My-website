from sqlalchemy.orm import Session
from app import models, schemas


def get_payment_details_by_seller(db: Session, seller_id: int):
    return db.query(models.SellerPaymentDetails).filter(models.SellerPaymentDetails.seller_id == seller_id).first()


def create_payment_details(db: Session, seller_id: int, details: schemas.SellerPaymentDetailsCreate):
    db_details = models.SellerPaymentDetails(
        seller_id=seller_id,
        upi_id=details.upi_id,
        account_name=details.account_name,
        is_verified=details.is_verified or False,
    )
    db.add(db_details)
    db.commit()
    db.refresh(db_details)
    return db_details


def update_payment_details(db: Session, seller_id: int, details: schemas.SellerPaymentDetailsUpdate):
    db_details = get_payment_details_by_seller(db, seller_id=seller_id)
    if not db_details:
        return None
    for key, value in details.dict(exclude_unset=True).items():
        setattr(db_details, key, value)
    db.commit()
    db.refresh(db_details)
    return db_details