from sqlalchemy.orm import Session
from app.models.cart import Cart, CartItem
from app.schemas.cart import CartCreate, CartUpdate, CartItemCreate, CartItemUpdate

def get_cart_by_user_id(db: Session, user_id: int):
    return db.query(Cart).filter(Cart.user_id == user_id, Cart.is_active == True).first()

def create_cart(db: Session, cart: CartCreate):
    db_cart = Cart(**cart.dict())
    db.add(db_cart)
    db.commit()
    db.refresh(db_cart)
    return db_cart

def update_cart(db: Session, cart_id: int, cart: CartUpdate):
    db_cart = db.query(Cart).filter(Cart.id == cart_id).first()
    if db_cart:
        for key, value in cart.dict(exclude_unset=True).items():
            setattr(db_cart, key, value)
        db.commit()
        db.refresh(db_cart)
    return db_cart

def delete_cart(db: Session, cart_id: int):
    db_cart = db.query(Cart).filter(Cart.id == cart_id).first()
    if db_cart:
        db.delete(db_cart)
        db.commit()
    return db_cart

def get_cart_item(db: Session, cart_item_id: int):
    return db.query(CartItem).filter(CartItem.id == cart_item_id).first()

def get_cart_item_by_cart_and_product(db: Session, cart_id: int, product_id: int):
    return db.query(CartItem).filter(CartItem.cart_id == cart_id, CartItem.product_id == product_id).first()

def create_cart_item(db: Session, cart_item: CartItemCreate, cart_id: int):
    db_cart_item = CartItem(**cart_item.dict(), cart_id=cart_id)
    db.add(db_cart_item)
    db.commit()
    db.refresh(db_cart_item)
    return db_cart_item

def update_cart_item(db: Session, cart_item_id: int, cart_item: CartItemUpdate):
    db_cart_item = db.query(CartItem).filter(CartItem.id == cart_item_id).first()
    if db_cart_item:
        for key, value in cart_item.dict(exclude_unset=True).items():
            setattr(db_cart_item, key, value)
        db.commit()
        db.refresh(db_cart_item)
    return db_cart_item

def delete_cart_item(db: Session, cart_item_id: int):
    db_cart_item = db.query(CartItem).filter(CartItem.id == cart_item_id).first()
    if db_cart_item:
        db.delete(db_cart_item)
        db.commit()
    return db_cart_item