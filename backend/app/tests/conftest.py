import random
import uuid
from datetime import datetime, timedelta

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app import models
from app.core.security import create_access_token
from app.models.user import RoleEnum


@pytest.fixture(scope="session")
def engine():
    """Create a shared in-memory database engine for tests."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session(engine):
    """Create a transactional scope around each test for isolation."""
    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker(autocommit=False, autoflush=False, bind=connection)()
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def override_get_db(db_session):
    """Override FastAPI dependency to use the test database session."""
    def _get_db_override():
        yield db_session

    app.dependency_overrides[get_db] = _get_db_override
    yield
    app.dependency_overrides.pop(get_db, None)


@pytest_asyncio.fixture()
async def async_client(override_get_db):
    async with AsyncClient(app=app, base_url="http://test", follow_redirects=True) as client:
        yield client


def _random_phone_number() -> str:
    return "+91" + "".join(str(random.randint(0, 9)) for _ in range(10))


def create_user(db_session, role: RoleEnum, prefix: str) -> models.User:
    suffix = uuid.uuid4().hex[:8]
    user = models.User(
        email=f"{prefix}-{suffix}@example.com",
        phone_number=_random_phone_number(),
        first_name=prefix.capitalize(),
        last_name="Tester",
        role=role,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def create_seller(db_session, user: models.User) -> models.Seller:
    seller = models.Seller(
        user_id=user.id,
        business_name=f"{user.first_name} Store",
        business_address="Test Address",
        business_description="Test seller",
        approved=True,
    )
    db_session.add(seller)
    db_session.commit()
    db_session.refresh(seller)
    return seller


def create_category(db_session, name: str, category_type: str) -> models.Category:
    category = models.Category(name=name, description="Test", type=category_type, is_active=True)
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category


def create_product(db_session, seller_id: int, category_id: int) -> models.Product:
    product = models.Product(
        seller_id=seller_id,
        category_id=category_id,
        name="Test Product",
        description="Test product",
        price=99.99,
        stock=10,
        is_active=True,
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def create_service(db_session, seller_id: int, category_id: int) -> models.Service:
    service = models.Service(
        seller_id=seller_id,
        category_id=category_id,
        name="Test Service",
        description="Service description",
        price=49.99,
        duration_minutes=60,
        is_active=True,
    )
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)
    return service


@pytest.fixture()
def test_users(db_session):
    admin = create_user(db_session, RoleEnum.ADMIN, "admin")
    seller_user = create_user(db_session, RoleEnum.SELLER, "seller")
    buyer_user = create_user(db_session, RoleEnum.BUYER, "buyer")
    seller = create_seller(db_session, seller_user)
    return {
        "admin": admin,
        "seller_user": seller_user,
        "seller": seller,
        "buyer": buyer_user,
    }


@pytest.fixture()
def auth_headers(test_users):
    def _headers(user: models.User):
        token = create_access_token({"sub": str(user.id), "user_id": user.id})
        return {"Authorization": f"Bearer {token}"}

    return {
        "admin": _headers(test_users["admin"]),
        "seller": _headers(test_users["seller_user"]),
        "buyer": _headers(test_users["buyer"]),
    }


@pytest.fixture()
def product_category(db_session):
    return create_category(db_session, "Product Category", "product")


@pytest.fixture()
def service_category(db_session):
    return create_category(db_session, "Service Category", "service")


@pytest.fixture()
def test_product(db_session, test_users, product_category):
    return create_product(db_session, test_users["seller"].id, product_category.id)


@pytest.fixture()
def test_service(db_session, test_users, service_category):
    return create_service(db_session, test_users["seller"].id, service_category.id)


@pytest.fixture()
def booking_time():
    return (datetime.utcnow() + timedelta(days=1)).replace(microsecond=0)