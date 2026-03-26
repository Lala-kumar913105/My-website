import io

import pytest


@pytest.mark.asyncio
async def test_upload_product_image(async_client, auth_headers, product_category):
    # First create a product to upload an image to
    product_response = await async_client.post(
        "/api/v1/products/",
        data={
            "name": "Test Product with Image",
            "description": "A product to test image upload",
            "price": 19.99,
            "stock": 10,
            "category": str(product_category.id),
        },
        headers=auth_headers["seller"],
    )
    assert product_response.status_code == 200
    product_id = product_response.json()["id"]

    # Upload an image
    image_data = io.BytesIO(b"fake image data")
    image_data.name = "test_image.jpg"
    response = await async_client.post(
        f"/api/v1/upload/products/{product_id}/images",
        files={"file": ("test_image.jpg", image_data, "image/jpeg")},
        headers=auth_headers["seller"],
    )
    assert response.status_code == 200
    data = response.json()
    assert "image_url" in data
    assert data["image_url"].startswith("/uploads/")

    # Verify the image is accessible
    filename = data["image_url"].split("/")[-1]
    image_response = await async_client.get(f"/api/v1/upload/images/{filename}")
    assert image_response.status_code == 200


@pytest.mark.asyncio
async def test_upload_image_to_nonexistent_product(async_client, auth_headers):
    # Try to upload an image to a product that doesn't exist
    image_data = io.BytesIO(b"fake image data")
    image_data.name = "test_image.jpg"
    response = await async_client.post(
        f"/api/v1/upload/products/9999/images",
        files={"file": ("test_image.jpg", image_data, "image/jpeg")},
        headers=auth_headers["seller"],
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_nonexistent_image(async_client):
    # Try to get an image that doesn't exist
    response = await async_client.get("/api/v1/upload/images/nonexistent_image.jpg")
    assert response.status_code == 404