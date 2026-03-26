import pytest


@pytest.mark.asyncio
async def test_create_product_listing(async_client, auth_headers, test_users):
    payload = {
        "title": "Test Product Listing",
        "description": "Listing description",
        "price": 199.0,
        "type": "product",
        "stock": 5,
        "source_id": 1,
        "source_type": "product",
    }

    response = await async_client.post(
        "/api/v1/listings/",
        json={**payload, "seller_id": test_users["seller"].id},
        headers=auth_headers["seller"],
    )
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "product"
    assert data["stock"] == 5


@pytest.mark.asyncio
async def test_create_service_listing(async_client, auth_headers, test_users):
    payload = {
        "title": "Test Service Listing",
        "description": "Service listing",
        "price": 79.0,
        "type": "service",
        "duration_minutes": 45,
        "source_id": 1,
        "source_type": "service",
    }

    response = await async_client.post(
        "/api/v1/listings/",
        json={**payload, "seller_id": test_users["seller"].id},
        headers=auth_headers["seller"],
    )
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "service"
    assert data["duration_minutes"] == 45


@pytest.mark.asyncio
async def test_listings_filter(async_client, auth_headers, test_users):
    for listing_type in ("product", "service"):
        payload = {
            "title": f"{listing_type} listing",
            "description": "Filter listing",
            "price": 50.0,
            "type": listing_type,
            "stock": 5 if listing_type == "product" else None,
            "duration_minutes": 30 if listing_type == "service" else None,
            "source_id": 1,
            "source_type": listing_type,
        }
        response = await async_client.post(
            "/api/v1/listings/",
            json={**payload, "seller_id": test_users["seller"].id},
            headers=auth_headers["seller"],
        )
        assert response.status_code == 200

    response = await async_client.get("/api/v1/listings?listing_type=product")
    assert response.status_code == 200
    assert all(item["type"] == "product" for item in response.json())


@pytest.mark.asyncio
async def test_create_listing_requires_seller(async_client, auth_headers, test_users):
    payload = {
        "title": "Unauthorized",
        "description": "Unauthorized",
        "price": 40.0,
        "type": "product",
        "stock": 1,
    }

    response = await async_client.post(
        "/api/v1/listings/",
        json={**payload, "seller_id": test_users["seller"].id},
        headers=auth_headers["buyer"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_listing_invalid_type(async_client, auth_headers, test_users):
    payload = {
        "title": "Invalid",
        "description": "Invalid",
        "price": 40.0,
        "type": "invalid",
        "stock": 1,
    }

    response = await async_client.post(
        "/api/v1/listings/",
        json={**payload, "seller_id": test_users["seller"].id},
        headers=auth_headers["seller"],
    )
    assert response.status_code in {400, 422}