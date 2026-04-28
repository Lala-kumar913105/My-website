import pytest


@pytest.mark.asyncio
async def test_register_and_duplicate_email(async_client):
    payload = {
        "email": "auth-user@example.com",
        "password": "StrongPass1!",
        "full_name": "Auth User",
    }

    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "Registration successful"
    assert data["user"]["email"] == "auth-user@example.com"

    duplicate_response = await async_client.post("/api/v1/auth/register", json=payload)
    assert duplicate_response.status_code == 400
    assert duplicate_response.json()["detail"] == "Email already registered"


@pytest.mark.asyncio
async def test_login_and_me_flow(async_client):
    await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "login-me@example.com",
            "password": "StrongPass1!",
            "full_name": "Login User",
        },
    )

    login_response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "login-me@example.com", "password": "StrongPass1!"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["message"] == "Login successful"

    me_response = await async_client.get("/api/v1/auth/me")
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["email"] == "login-me@example.com"


@pytest.mark.asyncio
async def test_forgot_password_does_not_enumerate(async_client):
    await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "known@example.com",
            "password": "StrongPass1!",
            "full_name": "Known User",
        },
    )

    existing = await async_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "known@example.com"},
    )
    assert existing.status_code == 200

    unknown = await async_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "unknown@example.com"},
    )
    assert unknown.status_code == 200

    assert existing.json()["message"] == unknown.json()["message"]


@pytest.mark.asyncio
async def test_reset_password_validation_and_submit(async_client, db_session):
    await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "reset-user@example.com",
            "password": "StrongPass1!",
            "full_name": "Reset User",
        },
    )

    from app.core.security import generate_password_reset_token, hash_reset_token
    from app.models.user import User

    user = db_session.query(User).filter(User.email == "reset-user@example.com").first()
    raw_token = generate_password_reset_token()
    user.reset_password_token_hash = hash_reset_token(raw_token)
    from datetime import datetime, timedelta

    user.reset_password_expires_at = datetime.utcnow() + timedelta(minutes=30)
    db_session.add(user)
    db_session.commit()

    validate_response = await async_client.get(
        f"/api/v1/auth/reset-password/validate?token={raw_token}"
    )
    assert validate_response.status_code == 200
    assert validate_response.json()["valid"] is True

    reset_response = await async_client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "NewStrong1!"},
    )
    assert reset_response.status_code == 200
    assert "reset" in reset_response.json()["message"].lower()

    reused_response = await async_client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "Another1!"},
    )
    assert reused_response.status_code == 400


@pytest.mark.asyncio
async def test_logout_clears_cookie(async_client):
    await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "logout-user@example.com",
            "password": "StrongPass1!",
            "full_name": "Logout User",
        },
    )

    logout_response = await async_client.post("/api/v1/auth/logout")
    assert logout_response.status_code == 200
    assert logout_response.json()["message"] == "Logged out successfully"

    me_response = await async_client.get("/api/v1/auth/me")
    assert me_response.status_code == 401
