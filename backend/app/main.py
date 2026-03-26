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

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME, version=settings.PROJECT_VERSION)

app.add_middleware(RateLimitMiddleware)

@app.on_event("startup")
def seed_default_categories() -> None:
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        seed_categories(db)
    finally:
        db.close()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files from /uploads directory (legacy)
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Serve static files from /media directory
MEDIA_DIR = "media"
MEDIA_PRODUCTS_DIR = os.path.join(MEDIA_DIR, "products")
if not os.path.exists(MEDIA_PRODUCTS_DIR):
    os.makedirs(MEDIA_PRODUCTS_DIR)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# Serve static files from /static directory (QR codes, etc.)
STATIC_DIR = "static"
QR_DIR = os.path.join(STATIC_DIR, "qr")
if not os.path.exists(QR_DIR):
    os.makedirs(QR_DIR)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(api.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to the E-commerce API"}
