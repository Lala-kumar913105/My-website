from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.db.session import get_db
from app.services.currency_service import convert_price
from app.services.translation_service import translate_text
from app.core.security import get_current_user_optional

router = APIRouter()


@router.get("/search", response_model=list[schemas.Product])
def search_products(
    q: str = Query(...),
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    settings = db.query(models.PlatformSettings).order_by(models.PlatformSettings.id.desc()).first()
    default_currency = (
        current_user.preferred_currency
        if current_user and current_user.preferred_currency
        else settings.default_currency if settings else "INR"
    )
    language = current_user.preferred_language if current_user and current_user.preferred_language else "en"

    products = (
        db.query(models.Product)
        .filter(models.Product.is_active == True)
        .filter(models.Product.name.ilike(f"%{q}%") | models.Product.description.ilike(f"%{q}%"))
        .all()
    )

    for product in products:
        product.original_price = product.price
        product.converted_price = convert_price(product.price, settings, default_currency) if settings else product.price
        product.currency_code = default_currency
        product.name = translate_text(product.name, language)
        product.description = translate_text(product.description, language)

    return products