from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SellerPaymentDetailsBase(BaseModel):
    upi_id: str
    account_name: Optional[str] = None
    is_verified: Optional[bool] = False


class SellerPaymentDetailsCreate(SellerPaymentDetailsBase):
    pass


class SellerPaymentDetailsUpdate(BaseModel):
    upi_id: Optional[str] = None
    account_name: Optional[str] = None
    is_verified: Optional[bool] = None


class SellerPaymentDetails(SellerPaymentDetailsBase):
    id: int
    seller_id: int
    created_at: datetime

    class Config:
        from_attributes = True