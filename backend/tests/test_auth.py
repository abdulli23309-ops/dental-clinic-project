import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.domain.models.user import User, UserRole
from app.infrastructure.repositories.postgres_user_repo import PostgresUserRepository


@pytest.mark.asyncio
async def test_auth_login_success(client_with_db: AsyncClient, test_session: AsyncSession):
    user_repo = PostgresUserRepository(test_session)
    user = User(
        email="doctor@marlowdental.com",
        hashed_password=hash_password("DoctorSecret2026!"),
        full_name="Dr. Sarah Marlow",
        role=UserRole.ADMIN,
        is_active=True,
    )
    await user_repo.save(user)
    await test_session.commit()

    resp = await client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "doctor@marlowdental.com", "password": "DoctorSecret2026!"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "accessToken" in data
    assert data["tokenType"] == "Bearer"
    assert data["user"]["email"] == "doctor@marlowdental.com"
    assert data["user"]["role"] == "admin"
    assert "refresh_token" in resp.cookies


@pytest.mark.asyncio
async def test_auth_login_invalid_password(client_with_db: AsyncClient, test_session: AsyncSession):
    user_repo = PostgresUserRepository(test_session)
    user = User(
        email="doctor2@marlowdental.com",
        hashed_password=hash_password("CorrectPassword!"),
        full_name="Dr. Sarah Marlow",
        role=UserRole.ADMIN,
    )
    await user_repo.save(user)
    await test_session.commit()

    resp = await client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "doctor2@marlowdental.com", "password": "WrongPassword!"},
    )
    assert resp.status_code == 401
    assert "Invalid email or password" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_auth_login_unknown_user(client_with_db: AsyncClient):
    resp = await client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@marlowdental.com", "password": "SomePassword123!"},
    )
    assert resp.status_code == 401
    assert "Invalid email or password" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_auth_me_protected(client_with_db: AsyncClient, admin_auth):
    # Without token
    unauth_resp = await client_with_db.get("/api/v1/auth/me")
    assert unauth_resp.status_code == 401

    # With token
    auth_resp = await client_with_db.get(
        "/api/v1/auth/me",
        headers=admin_auth["headers"],
    )
    assert auth_resp.status_code == 200
    data = auth_resp.json()
    assert data["email"] == "testadmin@marlowdental.com"
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_auth_refresh_token_rotation(client_with_db: AsyncClient, test_session: AsyncSession):
    user_repo = PostgresUserRepository(test_session)
    user = User(
        email="refresh.user@marlowdental.com",
        hashed_password=hash_password("RefreshPassword1!"),
        full_name="Rotation Test",
        role=UserRole.ADMIN,
    )
    await user_repo.save(user)
    await test_session.commit()

    # Initial login
    login_resp = await client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "refresh.user@marlowdental.com", "password": "RefreshPassword1!"},
    )
    assert login_resp.status_code == 200
    first_cookie = login_resp.cookies.get("refresh_token")
    assert first_cookie is not None

    # Rotate refresh token
    client_with_db.cookies.set("refresh_token", first_cookie)
    refresh_resp = await client_with_db.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 200
    data = refresh_resp.json()
    assert "accessToken" in data

    second_cookie = refresh_resp.cookies.get("refresh_token")
    assert second_cookie is not None
    assert second_cookie != first_cookie

    # Trying to use old revoked cookie must fail
    client_with_db.cookies.set("refresh_token", first_cookie)
    reuse_resp = await client_with_db.post("/api/v1/auth/refresh")
    assert reuse_resp.status_code == 401


@pytest.mark.asyncio
async def test_auth_logout(client_with_db: AsyncClient, test_session: AsyncSession):
    user_repo = PostgresUserRepository(test_session)
    user = User(
        email="logout.user@marlowdental.com",
        hashed_password=hash_password("LogoutPassword1!"),
        full_name="Logout Test",
        role=UserRole.ADMIN,
    )
    await user_repo.save(user)
    await test_session.commit()

    login_resp = await client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "logout.user@marlowdental.com", "password": "LogoutPassword1!"},
    )
    assert login_resp.status_code == 200
    refresh_cookie = login_resp.cookies.get("refresh_token")

    # Logout
    client_with_db.cookies.set("refresh_token", refresh_cookie)
    logout_resp = await client_with_db.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 200

    # Subsequent refresh attempt with logged-out token must fail
    refresh_resp = await client_with_db.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 401
