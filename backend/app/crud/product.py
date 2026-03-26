from sqlalchemy.orm import Session
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate

def get_product(db: Session, product_id: int):
    """Get a single product by ID"""
    return db.query(Product).filter(Product.id == product_id).first()

def get_products(db: Session, skip: int = 0, limit: int = 100):
    """Get all products with pagination"""
    return db.query(Product).offset(skip).limit(limit).all()

def get_products_by_seller(db: Session, seller_id: int, skip: int = 0, limit: int = 100):
    """Get products by seller ID with pagination"""
    return db.query(Product).filter(Product.seller_id == seller_id).offset(skip).limit(limit).all()

def get_products_by_category(db: Session, category_id: int, skip: int = 0, limit: int = 100):
    """Get products by category with pagination"""
    return db.query(Product).filter(Product.category_id == category_id).offset(skip).limit(limit).all()

def create_product(db: Session, product: ProductCreate, seller_id: int):
    """Create a new product"""
    product_data = product.dict()
    product_data.pop("seller_id", None)
    db_product = Product(**product_data, seller_id=seller_id)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def update_product(db: Session, product_id: int, product: ProductUpdate):
    """Update an existing product"""
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if db_product:
        for key, value in product.dict(exclude_unset=True).items():
            setattr(db_product, key, value)
        db.commit()
        db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int):
    """Delete a product"""
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if db_product:
        db.delete(db_product)
        db.commit()
    return db_product