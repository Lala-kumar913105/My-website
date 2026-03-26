import uuid

import pytest


@pytest.mark.asyncio
async def test_create_product(async_client, auth_headers, test_users, product_category):
    payload = {
        "name": "Laptop",
        "description": "A high-performance laptop",
        "price": 999.99,
        "stock": 5,
        "category": str(product_category.id),
    }
    response = await async_client.post(
        "/api/v1/products/",
        data=payload,
        headers=auth_headers["seller"],
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Laptop"
    assert data["description"] == "A high-performance laptop"
    assert data["price"] == 999.99
    assert data["stock"] == 5
    assert data["seller_id"] == test_users["seller"].id
    assert data["category_id"] == product_category.id
    assert "id" in data


@pytest.mark.asyncio
async def test_get_products(async_client, auth_headers, product_category):
    create_response = await async_client.post(
        "/api/v1/products/",
        data={
            "name": "List Product",
            "description": "List product",
            "price": 49.99,
            "stock": 4,
            "category": str(product_category.id),
        },
        headers=auth_headers["seller"],
    )
    assert create_response.status_code == 200

    response = await async_client.get("/api/v1/products/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "name" in data[0]
    assert "description" in data[0]
    assert "price" in data[0]
    assert "stock" in data[0]
    assert "seller_id" in data[0]
    assert "category_id" in data[0]


@pytest.mark.asyncio
async def test_get_product(async_client, auth_headers, test_users, product_category):
    # First create a product
    create_response = await async_client.post(
        "/api/v1/products/",
        data={
            "name": "Smartphone",
            "description": "A new smartphone",
            "price": 699.99,
            "stock": 10,
            "category": str(product_category.id),
        },
        headers=auth_headers["seller"],
    )
    assert create_response.status_code == 200
    product_id = create_response.json()["id"]

    # Then get the product
    response = await async_client.get(f"/api/v1/products/{product_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == product_id
    assert data["name"] == "Smartphone"
    assert data["description"] == "A new smartphone"
    assert data["price"] == 699.99
    assert data["stock"] == 10
    assert data["seller_id"] == test_users["seller"].id
    assert data["category_id"] == product_category.id


@pytest.mark.asyncio
async def test_update_product(async_client, auth_headers, test_users, product_category):
    # First create a product
    create_response = await async_client.post(
        "/api/v1/products/",
        data={
            "name": "Tablet",
            "description": "A new tablet",
            "price": 299.99,
            "stock": 8,
            "category": str(product_category.id),
        },
        headers=auth_headers["seller"],
    )
    assert create_response.status_code == 200
    product_id = create_response.json()["id"]

    # Then update the product
    response = await async_client.put(
        f"/api/v1/products/{product_id}",
        json={"name": "Updated Tablet", "description": "An updated tablet", "price": 349.99, "stock": 5, "category_id": 2},
        headers=auth_headers["seller"],
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == product_id
    assert data["name"] == "Updated Tablet"
    assert data["description"] == "An updated tablet"
    assert data["price"] == 349.99
    assert data["stock"] == 5
    assert data["category_id"] == 2


@pytest.mark.asyncio
async def test_delete_product(async_client, auth_headers, test_users, product_category):
    # First create a product
    create_response = await async_client.post(
        "/api/v1/products/",
        data={
            "name": "Camera",
            "description": "A new camera",
            "price": 499.99,
            "stock": 3,
            "category": str(product_category.id),
        },
        headers=auth_headers["seller"],
    )
    assert create_response.status_code == 200
    product_id = create_response.json()["id"]

    # Then delete the product
    response = await async_client.delete(
        f"/api/v1/products/{product_id}",
        headers=auth_headers["seller"],
    )
    assert response.status_code == 200

    # Verify the product was deleted
    response = await async_client.get(f"/api/v1/products/{product_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_products_by_seller(async_client, test_users):
    response = await async_client.get(f"/api/v1/products/seller/{test_users['seller'].id}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for product in data:
        assert product["seller_id"] == test_users["seller"].id


@pytest.mark.asyncio
async def test_get_products_by_category(async_client, product_category):
    response = await async_client.get(f"/api/v1/products/category/{product_category.id}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for product in data:
        assert product["category_id"] == product_category.id