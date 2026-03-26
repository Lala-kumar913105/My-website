from datetime import timedelta

import pytest


@pytest.mark.asyncio
async def test_create_booking_slot_for_listing(
    async_client,
    auth_headers,
    booking_time,
    test_users,
):
    listing_payload = {
        "title": "Slot Listing",
        "description": "Service listing",
        "price": 120.0,
        "type": "service",
        "duration_minutes": 60,
        "source_id": 1,
        "source_type": "service",
    }
    listing_response = await async_client.post(
        "/api/v1/listings/",
        json={**listing_payload, "seller_id": test_users["seller"].id},
        headers=auth_headers["seller"],
    )
    assert listing_response.status_code == 200
    listing_id = listing_response.json()["id"]

    payload = {
        "listing_id": listing_id,
        "start_time": booking_time.isoformat(),
        "end_time": (booking_time + timedelta(hours=1)).isoformat(),
        "is_available": True,
    }
    response = await async_client.post(
        "/api/v1/bookings/slots",
        json=payload,
        headers=auth_headers["seller"],
    )
    assert response.status_code == 200
    slot = response.json()
    assert slot["listing_id"] == listing_id


@pytest.mark.asyncio
async def test_booking_slot_requires_seller(async_client, auth_headers, booking_time):
    payload = {
        "listing_id": 999,
        "start_time": booking_time.isoformat(),
        "end_time": (booking_time + timedelta(hours=1)).isoformat(),
        "is_available": True,
    }
    response = await async_client.post(
        "/api/v1/bookings/slots",
        json=payload,
        headers=auth_headers["buyer"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_slots_for_listing(async_client, auth_headers, booking_time, test_users):
    listing_payload = {
        "title": "Slot Listing",
        "description": "Service listing",
        "price": 120.0,
        "type": "service",
        "duration_minutes": 60,
        "source_id": 1,
        "source_type": "service",
    }
    listing_response = await async_client.post(
        "/api/v1/listings/",
        json={**listing_payload, "seller_id": test_users["seller"].id},
        headers=auth_headers["seller"],
    )
    assert listing_response.status_code == 200
    listing_id = listing_response.json()["id"]

    payload = {
        "listing_id": listing_id,
        "start_time": booking_time.isoformat(),
        "end_time": (booking_time + timedelta(hours=1)).isoformat(),
        "is_available": True,
    }
    slot_response = await async_client.post(
        "/api/v1/bookings/slots",
        json=payload,
        headers=auth_headers["seller"],
    )
    assert slot_response.status_code == 200

    response = await async_client.get(
        f"/api/v1/bookings/slots/listing/{listing_id}?start_time={booking_time.isoformat()}&end_time={(booking_time + timedelta(hours=1)).isoformat()}"
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_slots_for_product_listing_returns_error(async_client, auth_headers, booking_time, test_users):
    listing_payload = {
        "title": "Product Listing",
        "description": "Product listing",
        "price": 80.0,
        "type": "product",
        "stock": 4,
        "source_id": 1,
        "source_type": "product",
    }
    listing_response = await async_client.post(
        "/api/v1/listings/",
        json={**listing_payload, "seller_id": test_users["seller"].id},
        headers=auth_headers["seller"],
    )
    assert listing_response.status_code == 200
    listing_id = listing_response.json()["id"]

    response = await async_client.get(
        f"/api/v1/bookings/slots/listing/{listing_id}?start_time={booking_time.isoformat()}&end_time={(booking_time + timedelta(hours=1)).isoformat()}"
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_booking_flow(async_client, auth_headers, booking_time, test_service):
    booking_payload = {
        "service_id": test_service.id,
        "booking_time": booking_time.isoformat(),
        "notes": "Please arrive early",
    }
    response = await async_client.post(
        "/api/v1/bookings/",
        json=booking_payload,
        headers=auth_headers["buyer"],
    )
    assert response.status_code == 200
    booking = response.json()
    assert booking["service_id"] == test_service.id

    reschedule_payload = {"booking_time": (booking_time + timedelta(days=1)).isoformat()}
    reschedule_response = await async_client.post(
        f"/api/v1/bookings/{booking['id']}/reschedule",
        json=reschedule_payload,
        headers=auth_headers["buyer"],
    )
    assert reschedule_response.status_code == 200
    assert reschedule_response.json()["status"] == "rescheduled"


@pytest.mark.asyncio
async def test_booking_overlap_prevention(async_client, auth_headers, booking_time, test_service):
    payload = {
        "service_id": test_service.id,
        "booking_time": booking_time.isoformat(),
    }
    first_response = await async_client.post(
        "/api/v1/bookings/",
        json=payload,
        headers=auth_headers["buyer"],
    )
    assert first_response.status_code == 200

    second_response = await async_client.post(
        "/api/v1/bookings/",
        json=payload,
        headers=auth_headers["buyer"],
    )
    assert second_response.status_code == 400