from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app import crud, schemas
from app.db.session import get_db
import os
import uuid

router = APIRouter()

# Create upload directory if it doesn't exist
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)


@router.post("/products/{product_id}/images", response_model=schemas.Product)
def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a product image and update the product's image URL."""
    # Verify product exists
    db_product = crud.get_product(db, product_id=product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file to disk
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file.file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

    # Update product's image URL
    image_url = f"/uploads/{unique_filename}"
    db_product.image_url = image_url
    db.commit()
    db.refresh(db_product)

    return db_product


@router.get("/images/{filename}")
def get_image(filename: str):
    """Get an uploaded image."""
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)