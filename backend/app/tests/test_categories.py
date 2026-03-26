import uuid

import pytest


@pytest.mark.asyncio
async def test_create_category(async_client):
    category_name = f"Electronics-{uuid.uuid4().hex[:8]}"
    response = await async_client.post(
        "/api/v1/categories/",
        json={"name": category_name, "description": "Electronic devices", "is_active": True},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == category_name
    assert data["description"] == "Electronic devices"
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.asyncio
async def test_get_categories(async_client):
    category_name = f"List Category-{uuid.uuid4().hex[:8]}"
    create_response = await async_client.post(
        "/api/v1/categories/",
        json={"name": category_name, "description": "List description", "is_active": True},
    )
    assert create_response.status_code == 200

    response = await async_client.get("/api/v1/categories/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "name" in data[0]
    assert "description" in data[0]


@pytest.mark.asyncio
async def test_get_category(async_client):
    # First create a category
    category_name = f"Test Category-{uuid.uuid4().hex[:8]}"
    create_response = await async_client.post(
        "/api/v1/categories/",
        json={"name": category_name, "description": "Test description", "is_active": True},
    )
    assert create_response.status_code == 200
    category_id = create_response.json()["id"]

    # Then get the category
    response = await async_client.get(f"/api/v1/categories/{category_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == category_id
    assert data["name"] == category_name
    assert data["description"] == "Test description"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_update_category(async_client):
    # First create a category
    category_name = f"Update Test-{uuid.uuid4().hex[:8]}"
    create_response = await async_client.post(
        "/api/v1/categories/",
        json={"name": category_name, "description": "Original description", "is_active": True},
    )
    assert create_response.status_code == 200
    category_id = create_response.json()["id"]

    # Then update the category
    response = await async_client.put(
        f"/api/v1/categories/{category_id}",
        json={"name": "Updated Category", "description": "Updated description", "is_active": False},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == category_id
    assert data["name"] == "Updated Category"
    assert data["description"] == "Updated description"
    assert data["is_active"] is False


@pytest.mark.asyncio
async def test_delete_category(async_client):
    # First create a category
    category_name = f"Delete Test-{uuid.uuid4().hex[:8]}"
    create_response = await async_client.post(
        "/api/v1/categories/",
        json={"name": category_name, "description": "Delete test description", "is_active": True},
    )
    assert create_response.status_code == 200
    category_id = create_response.json()["id"]

    # Then delete the category
    response = await async_client.delete(f"/api/v1/categories/{category_id}")
    assert response.status_code == 200

    # Verify the category was deleted
    response = await async_client.get(f"/api/v1/categories/{category_id}")
    assert response.status_code == 404