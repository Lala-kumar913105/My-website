import pytest


@pytest.mark.asyncio
async def test_checkout_from_cart(async_client, auth_headers, test_product, test_users):
    add_payload = {
        "user_id": test_users["buyer"].id,
        "product_id": test_product.id,
        "quantity": 2,
    }
    add_response = await async_client.post(
        "/api/v1/carts/add",
        json=add_payload,
        headers=auth_headers["buyer"],
    )
    assert add_response.status_code == 200

    order_payload = {
        "shipping_address": "123 Test Street",
        "payment_method": "cod",
        "delivery_charge": 25.0,
        "subtotal_amount": 199.98,
    }
    response = await async_client.post(
        f"/api/v1/orders/checkout/{test_users['buyer'].id}",
        json=order_payload,
        headers=auth_headers["buyer"],
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == test_users["buyer"].id
    assert data["order_items"][0]["product"]["id"] == test_product.id


@pytest.mark.asyncio
async def test_checkout_requires_matching_user(async_client, auth_headers, test_users):
    order_payload = {
        "shipping_address": "123 Test Street",
        "payment_method": "cod",
    }
    response = await async_client.post(
        f"/api/v1/orders/checkout/{test_users['buyer'].id}",
        json=order_payload,
        headers=auth_headers["seller"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_read_order_requires_auth(async_client, test_product, test_users, auth_headers):
    add_payload = {
        "user_id": test_users["buyer"].id,
        "product_id": test_product.id,
        "quantity": 1,
    }
    add_response = await async_client.post(
        "/api/v1/carts/add",
        json=add_payload,
        headers=auth_headers["buyer"],
    )
    assert add_response.status_code == 200

    order_payload = {"shipping_address": "456 Test Lane"}
    order_response = await async_client.post(
        f"/api/v1/orders/checkout/{test_users['buyer'].id}",
        json=order_payload,
        headers=auth_headers["buyer"],
    )
    assert order_response.status_code == 200
    order_id = order_response.json()["id"]

    response = await async_client.get(f"/api/v1/orders/{order_id}")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_order_requires_buyer_role(async_client, test_product, test_users, auth_headers):
    add_payload = {
        "user_id": test_users["buyer"].id,
        "product_id": test_product.id,
        "quantity": 1,
    }
    add_response = await async_client.post(
        "/api/v1/carts/add",
        json=add_payload,
        headers=auth_headers["buyer"],
    )
    assert add_response.status_code == 200

    order_payload = {"shipping_address": "456 Test Lane"}
    response = await async_client.post(
        f"/api/v1/orders/checkout/{test_users['buyer'].id}",
        json=order_payload,
        headers=auth_headers["seller"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_order_status_admin_only(async_client, test_product, test_users, auth_headers):
    add_payload = {
        "user_id": test_users["buyer"].id,
        "product_id": test_product.id,
        "quantity": 1,
    }
    add_response = await async_client.post(
        "/api/v1/carts/add",
        json=add_payload,
        headers=auth_headers["buyer"],
    )
    assert add_response.status_code == 200

    order_payload = {"shipping_address": "789 Test Lane"}
    order_response = await async_client.post(
        f"/api/v1/orders/checkout/{test_users['buyer'].id}",
        json=order_payload,
        headers=auth_headers["buyer"],
    )
    assert order_response.status_code == 200
    order_id = order_response.json()["id"]

    response = await async_client.put(
        f"/api/v1/orders/{order_id}/status/confirmed",
        headers=auth_headers["buyer"],
    )
    assert response.status_code == 403

    admin_response = await async_client.put(
        f"/api/v1/orders/{order_id}/status/confirmed",
        headers=auth_headers["admin"],
    )
    assert admin_response.status_code == 200