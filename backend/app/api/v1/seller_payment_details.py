from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_active_seller

router = APIRouter()


@router.post("/seller/payment-details", response_model=schemas.SellerPaymentDetails)
def create_or_update_payment_details(
    payload: schemas.SellerPaymentDetailsCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_seller),
):
    """Save seller UPI details (requires seller role)."""
    seller = crud.get_seller_by_user_id(db, current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    existing = crud.get_payment_details_by_seller(db, seller_id=seller.id)
    if existing:
        updated = crud.update_payment_details(
            db,
            seller_id=seller.id,
            details=schemas.SellerPaymentDetailsUpdate(
                upi_id=payload.upi_id,
                account_name=payload.account_name,
            ),
        )
        return updated

    return crud.create_payment_details(db, seller_id=seller.id, details=payload)


@router.get("/seller/payment-details", response_model=schemas.SellerPaymentDetails)
def get_payment_details(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_seller),
):
    """Get seller UPI details (requires seller role)."""
    seller = crud.get_seller_by_user_id(db, current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    details = crud.get_payment_details_by_seller(db, seller_id=seller.id)
    if not details:
        raise HTTPException(status_code=404, detail="Payment details not found")
    return details