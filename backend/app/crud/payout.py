from sqlalchemy.orm import Session
from app import models, schemas
from datetime import datetime


def get_payout(db: Session, payout_id: int):
    return db.query(models.Payout).filter(models.Payout.id == payout_id).first()


def get_payouts(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Payout).offset(skip).limit(limit).all()


def get_payouts_by_seller(db: Session, seller_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Payout).filter(models.Payout.seller_id == seller_id).offset(skip).limit(limit).all()


def get_payouts_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Payout).filter(models.Payout.user_id == user_id).offset(skip).limit(limit).all()


def create_payout(db: Session, payout: schemas.PayoutCreate):
    db_payout = models.Payout(
        seller_id=payout.seller_id,
        user_id=payout.user_id,
        amount=payout.amount,
        status=models.PayoutStatus.pending,
    )
    db.add(db_payout)
    db.commit()
    db.refresh(db_payout)
    return db_payout


def update_payout(db: Session, payout_id: int, payout: schemas.PayoutUpdate):
    db_payout = get_payout(db, payout_id=payout_id)
    if db_payout:
        for key, value in payout.dict(exclude_unset=True).items():
            setattr(db_payout, key, value)
        db_payout.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_payout)
    return db_payout


def delete_payout(db: Session, payout_id: int):
    db_payout = get_payout(db, payout_id=payout_id)
    if db_payout:
        db.delete(db_payout)
        db.commit()
    return db_payout


def mark_payout_complete(db: Session, payout_id: int, transaction_id: str):
    return update_payout(db, payout_id, schemas.PayoutUpdate(
        status=models.PayoutStatus.completed,
    ))


def mark_payout_failed(db: Session, payout_id: int):
    return update_payout(db, payout_id, schemas.PayoutUpdate(
        status=models.PayoutStatus.failed,
    ))

def calculate_seller_earnings(db: Session, seller_id: int):
    """Calculate total earnings for a seller after commissions"""
    # Get all commissions for the seller
    commissions = db.query(models.Commission).filter(models.Commission.seller_id == seller_id).all()
    
    # Calculate total commission amount
    total_commission = sum(commission.amount for commission in commissions)
    
    # Calculate total earnings from completed payments for the seller's products
    total_earnings = 0.0
    seller = db.query(models.Seller).filter(models.Seller.id == seller_id).first()
    
    if seller:
        # Get all products sold by the seller
        products = db.query(models.Product).filter(models.Product.seller_id == seller.id).all()
        
        for product in products:
            # Get all order items for this product
            order_items = db.query(models.OrderItem).filter(models.OrderItem.product_id == product.id).all()
            
            for item in order_items:
                # Check if the order has a completed payment
                order = db.query(models.Order).filter(models.Order.id == item.order_id).first()
                
                if order:
                    payment = db.query(models.Payment).filter(
                        models.Payment.order_id == order.id,
                        models.Payment.status == models.PaymentStatus.completed
                    ).first()
                    
                    if payment:
                        item_total = item.quantity * item.price_at_purchase
                        total_earnings += item_total
    
    # Total net earnings after commission
    net_earnings = total_earnings - total_commission
    return {
        "total_earnings": total_earnings,
        "total_commission": total_commission,
        "net_earnings": net_earnings
    }
