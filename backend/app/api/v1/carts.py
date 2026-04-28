from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_active_user

router = APIRouter()


@router.get("/{user_id}", response_model=schemas.CartDetail)
def get_user_cart(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Get the active cart for a user with product and seller details (requires user role)."""
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this cart")

    cart = crud.get_cart_by_user_id(db, user_id=user_id)
    if not cart:
        cart = crud.create_cart(db, schemas.CartCreate(user_id=user_id))
    
    cart_items = []
    for item in cart.items:
        product = item.product
        if not product:
            continue
        seller = product.seller
        cart_items.append(
            schemas.CartItemDetail(
                id=item.id,
                cart_id=item.cart_id,
                product_id=item.product_id,
                quantity=item.quantity,
                product=product,
                seller=seller,
            )
        )

    return schemas.CartDetail(
        id=cart.id,
        user_id=cart.user_id,
        is_active=cart.is_active,
        items=cart_items,
    )


@router.post("/add", response_model=schemas.CartItem)
def add_to_cart(
    payload: schemas.CartAddRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Add a product to the user's cart or increase quantity (requires user role)."""
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this cart")
    if payload.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    
    cart = crud.get_cart_by_user_id(db, user_id=payload.user_id)
    if not cart:
        cart = crud.create_cart(db, schemas.CartCreate(user_id=payload.user_id))

    product = crud.get_product(db, product_id=payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing_item = crud.get_cart_item_by_cart_and_product(
        db, cart_id=cart.id, product_id=payload.product_id
    )
    if existing_item:
        existing_item.quantity += payload.quantity
        db.commit()
        db.refresh(existing_item)
        return existing_item

    item = schemas.CartItemCreate(product_id=payload.product_id, quantity=payload.quantity)
    return crud.create_cart_item(db, item, cart_id=cart.id)


@router.post("/remove", response_model=schemas.CartItem)
def remove_cart_item(
    payload: schemas.CartRemoveRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Remove a cart item from the cart (requires user role)."""
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to remove this cart item")

    db_item = crud.get_cart_item(db, cart_item_id=payload.item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    if db_item.cart.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to remove this cart item")

    return crud.delete_cart_item(db, cart_item_id=payload.item_id)


@router.put("/items/{item_id}", response_model=schemas.CartItem)
def update_cart_item_quantity(
    item_id: int,
    payload: schemas.CartItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Update quantity for a cart item (requires user role)."""
    if payload.quantity is None:
        raise HTTPException(status_code=400, detail="Quantity is required")

    if payload.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    db_item = crud.get_cart_item(db, cart_item_id=item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if not db_item.cart or db_item.cart.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this cart item")

    updated_item = crud.update_cart_item(
        db,
        cart_item_id=item_id,
        cart_item=schemas.CartItemUpdate(quantity=payload.quantity),
    )
    if not updated_item:
        raise HTTPException(status_code=500, detail="Unable to update cart item")

    return updated_item


@router.delete("/{user_id}")
def clear_cart(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Clear the user's cart (requires user role)."""
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to clear this cart")
    
    cart = crud.get_cart_by_user_id(db, user_id=user_id)
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    # Delete all cart items
    for item in cart.items:
        crud.delete_cart_item(db, cart_item_id=item.id)

    return {"message": "Cart cleared successfully"}
