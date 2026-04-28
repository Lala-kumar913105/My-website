from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.v1 import api
from app.core.config import settings
from app.db.session import engine
from app.db.base import Base
from app.db.seed_categories import seed_categories
from app.middleware.rate_limit import RateLimitMiddleware
import os
from sqlalchemy import inspect, text

Base.metadata.create_all(bind=engine)


def ensure_local_schema_compatibility() -> None:
    """
    Keep local SQLite schema compatible with current models when DB was created
    before latest Alembic migrations.
    """
    inspector = inspect(engine)

    expected_columns = {
        "services": {
            "latitude": "FLOAT",
            "longitude": "FLOAT",
            "address": "VARCHAR",
        },
        "listings": {
            "latitude": "FLOAT",
            "longitude": "FLOAT",
            "address": "VARCHAR",
        },
    }

    with engine.begin() as connection:
        for table_name, columns in expected_columns.items():
            if not inspector.has_table(table_name):
                continue

            existing = {col["name"] for col in inspector.get_columns(table_name)}
            for column_name, column_type in columns.items():
                if column_name in existing:
                    continue
                connection.execute(
                    text(
                        f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
                    )
                )


ensure_local_schema_compatibility()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION
)

app.add_middleware(RateLimitMiddleware)

@app.on_event("startup")
def seed_default_categories() -> None:
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        seed_categories(db)
    finally:
        db.close()

cors_origins = settings.cors_origins_list or []

# local development ke liye safe fallback
local_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

for origin in local_origins:
    if origin not in cors_origins:
        cors_origins.append(origin)

print("CORS ORIGINS =>", cors_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

MEDIA_DIR = "media"
MEDIA_PRODUCTS_DIR = os.path.join(MEDIA_DIR, "products")
if not os.path.exists(MEDIA_PRODUCTS_DIR):
    os.makedirs(MEDIA_PRODUCTS_DIR)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

STATIC_DIR = "static"
QR_DIR = os.path.join(STATIC_DIR, "qr")
if not os.path.exists(QR_DIR):
    os.makedirs(QR_DIR)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(api.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the E-commerce API",
        "project_name": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Backend is running"
    }