from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import schemas, crud
from app.db.session import get_db

router = APIRouter()


@router.get("/", response_model=list[schemas.Category])
def read_categories(
    skip: int = 0,
    limit: int = 100,
    parent_id: int = None,
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    categories = crud.get_categories(
        db, skip=skip, limit=limit, parent_id=parent_id, is_active=is_active
    )
    return categories


@router.get("/{category_id}", response_model=schemas.Category)
def read_category(category_id: int, db: Session = Depends(get_db)):
    category = crud.get_category(db, category_id=category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("/", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    db_category = crud.get_category_by_name(db, name=category.name)
    if db_category:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    return crud.create_category(db=db, category=category)


@router.put("/{category_id}", response_model=schemas.Category)
def update_category(
    category_id: int, category: schemas.CategoryUpdate, db: Session = Depends(get_db)
):
    db_category = crud.get_category(db, category_id=category_id)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    if category.name and category.name != db_category.name:
        existing_category = crud.get_category_by_name(db, name=category.name)
        if existing_category:
            raise HTTPException(status_code=400, detail="Category with this name already exists")

    return crud.update_category(db=db, category_id=category_id, category=category)


@router.delete("/{category_id}", response_model=schemas.Category)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = crud.get_category(db, category_id=category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return crud.delete_category(db=db, category_id=category_id)