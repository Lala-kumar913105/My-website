from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_active_user

router = APIRouter()

@router.get("/", response_model=list[schemas.Wishlist])
def get_wishlist(current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Get user's wishlist (requires active user)"""
    wishlists = crud.get_wishlists_by_user(db, user_id=current_user.id)
    return wishlists

@router.post("/", response_model=schemas.Wishlist)
def add_to_wishlist(wishlist: schemas.WishlistCreate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Add product to wishlist (requires active user)"""
    # Check if product exists
    product = crud.get_product(db, product_id=wishlist.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if product is already in wishlist
    existing_wishlist = crud.get_wishlist(db, user_id=current_user.id, product_id=wishlist.product_id)
    if existing_wishlist:
        raise HTTPException(status_code=400, detail="Product already in wishlist")
    
    return crud.create_wishlist(db, wishlist=wishlist, user_id=current_user.id)

@router.delete("/{product_id}")
def remove_from_wishlist(product_id: int, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Remove product from wishlist (requires active user)"""
    # Check if product exists in wishlist
    existing_wishlist = crud.get_wishlist(db, user_id=current_user.id, product_id=product_id)
    if not existing_wishlist:
        raise HTTPException(status_code=404, detail="Product not in wishlist")
    
    crud.delete_wishlist(db, user_id=current_user.id, product_id=product_id)
    return {"message": "Product removed from wishlist"}