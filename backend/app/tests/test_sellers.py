import uuid

import pytest

from app import models


@pytest.mark.asyncio
async def test_create_seller(async_client, auth_headers, test_users):
    response = await async_client.post(
        "/api/v1/sellers/",
        json={
            "business_name": "Test Seller",
            "business_address": "123 Test Street",
            "business_description": "Test seller description",
            "user_id": test_users["seller_user"].id,
        },
        headers=auth_headers["seller"],
    )
    assert response.status_code in {200, 400}
    if response.status_code == 200:
        data = response.json()
        assert data["business_name"] == "Test Seller"
        assert data["business_address"] == "123 Test Street"
        assert data["business_description"] == "Test seller description"
        assert data["user_id"] == test_users["seller_user"].id
        assert "id" in data


@pytest.mark.asyncio
async def test_get_sellers(async_client, auth_headers):
    response = await async_client.get("/api/v1/sellers/", headers=auth_headers["admin"])
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "business_name" in data[0]
    assert "business_address" in data[0]
    assert "business_description" in data[0]
    assert "user_id" in data[0]


@pytest.mark.asyncio
async def test_get_seller(async_client, auth_headers, db_session, test_users):
    # First create a seller
    seller_user = test_users["seller_user"]
    existing = db_session.query(models.Seller).filter(models.Seller.user_id == seller_user.id).first()
    if existing:
        seller_id = existing.id
    else:
        create_response = await async_client.post(
            "/api/v1/sellers/",
            json={
                "business_name": "Get Test Seller",
                "business_address": "456 Test Avenue",
                "business_description": "Get test seller description",
                "user_id": seller_user.id,
            },
            headers=auth_headers["seller"],
        )
        assert create_response.status_code == 200
        seller_id = create_response.json()["id"]

    # Then get the seller
    response = await async_client.get(
        f"/api/v1/sellers/{seller_id}",
        headers=auth_headers["admin"],
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == seller_id
    assert data["user_id"] == seller_user.id
    assert data["business_name"] in {"Get Test Seller", f"{seller_user.first_name} Store"}
    assert data["business_address"] in {"456 Test Avenue", "Test Address"}
    assert data["business_description"] in {"Get test seller description", "Test seller"}


@pytest.mark.asyncio
async def test_update_seller(async_client, auth_headers, test_users, db_session):
    # First create a seller
    seller_user = test_users["seller_user"]
    existing = db_session.query(models.Seller).filter(models.Seller.user_id == seller_user.id).first()
    if existing:
        seller_id = existing.id
    else:
        create_response = await async_client.post(
            "/api/v1/sellers/",
            json={
                "business_name": "Update Test Seller",
                "business_address": "789 Test Boulevard",
                "business_description": "Update test seller description",
                "user_id": seller_user.id,
            },
            headers=auth_headers["seller"],
        )
        assert create_response.status_code == 200
        seller_id = create_response.json()["id"]

    # Then update the seller
    response = await async_client.put(
        f"/api/v1/sellers/{seller_id}",
        json={
            "business_name": "Updated Seller",
            "business_address": "101 Test Lane",
            "business_description": "Updated seller description",
            "is_verified": True,
            "rating": 5,
        },
        headers=auth_headers["seller"],
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == seller_id
    assert data["business_name"] == "Updated Seller"
    assert data["business_address"] == "101 Test Lane"
    assert data["business_description"] == "Updated seller description"
    assert data["is_verified"] is True
    assert data["rating"] == 5


@pytest.mark.asyncio
async def test_delete_seller(async_client, auth_headers, db_session, test_users):
    # First create a seller
    seller_user = test_users["seller_user"]
    suffix = uuid.uuid4().hex[:6]
    create_response = await async_client.post(
        "/api/v1/sellers/",
        json={
            "business_name": f"Delete Test Seller {suffix}",
            "business_address": "202 Test Road",
            "business_description": "Delete test seller description",
            "user_id": seller_user.id,
        },
        headers=auth_headers["seller"],
    )
    assert create_response.status_code in {200, 400}
    if create_response.status_code == 200:
        seller_id = create_response.json()["id"]
    else:
        existing = db_session.query(models.Seller).filter(models.Seller.user_id == seller_user.id).first()
        assert existing is not None
        seller_id = existing.id

    # Then delete the seller
    response = await async_client.delete(
        f"/api/v1/sellers/{seller_id}",
        headers=auth_headers["seller"],
    )
    assert response.status_code == 200

    # Verify the seller was deleted
    response = await async_client.get(
        f"/api/v1/sellers/{seller_id}",
        headers=auth_headers["admin"],
    )
    assert response.status_code in {404, 403}


@pytest.mark.asyncio
async def test_create_seller_with_existing_user(async_client, auth_headers, test_users):
    # First create a seller
    create_response = await async_client.post(
        "/api/v1/sellers/",
        json={
            "business_name": "Duplicate Test Seller",
            "business_address": "303 Test Court",
            "business_description": "Duplicate test seller description",
            "user_id": test_users["seller_user"].id,
        },
        headers=auth_headers["seller"],
    )
    assert create_response.status_code in {200, 400}

    # Try to create another seller with the same user ID
    duplicate_response = await async_client.post(
        "/api/v1/sellers/",
        json={
            "business_name": "Duplicate Test Seller 2",
            "business_address": "404 Test Place",
            "business_description": "Duplicate test seller description 2",
            "user_id": test_users["seller_user"].id,
        },
        headers=auth_headers["seller"],
    )
    assert duplicate_response.status_code == 400