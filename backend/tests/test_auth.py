from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.domain.models.user import User, UserRole
from app.infrastructure.database.orm_models import RefreshTokenORM
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
    assert data["expiresInSeconds"] == 7 * 24 * 3600  # 7-day token (10,080 minutes)
    assert data["user"]["email"] == "doctor@marlowdental.com"
    assert data["user"]["role"] == "admin"
    assert data["user"]["inactivityEnabled"] is True
    assert data["user"]["inactivityTimeoutMinutes"] == 15
    assert data["user"]["inactivityWarningSeconds"] == 60
    assert settings.REFRESH_COOKIE_NAME in resp.cookies


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
    assert "inactivityEnabled" in data


@pytest.mark.asyncio
async def test_auth_refresh_token_before_35m(client_with_db: AsyncClient, test_session: AsyncSession):
    """
    Refresh request arriving before 35 minutes:
    - Issues a new access token
    - Does NOT rotate the refresh token
    - rotated flag is False
    """
    user_repo = PostgresUserRepository(test_session)
    user = User(
        email="fresh.user@marlowdental.com",
        hashed_password=hash_password("FreshPassword1!"),
        full_name="Fresh Refresh User",
        role=UserRole.ADMIN,
    )
    await user_repo.save(user)
    await test_session.commit()

    # Initial login
    login_resp = await client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "fresh.user@marlowdental.com", "password": "FreshPassword1!"},
    )
    assert login_resp.status_code == 200
    first_cookie = login_resp.cookies.get(settings.REFRESH_COOKIE_NAME)
    assert first_cookie is not None

    # Immediate refresh (< 35 min)
    client_with_db.cookies.set(settings.REFRESH_COOKIE_NAME, first_cookie)
    refresh_resp = await client_with_db.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 200
    data = refresh_resp.json()
    assert "accessToken" in data
    assert data["rotated"] is False


@pytest.mark.asyncio
async def test_auth_refresh_token_after_35m(client_with_db: AsyncClient, test_session: AsyncSession):
    """
    Refresh request arriving after 35 minutes:
    - Issues a new access token
    - Rotates the refresh token (rotated=True)
    - Sets a new replacement cookie
    """
    user_repo = PostgresUserRepository(test_session)
    user = User(
        email="rotate.user@marlowdental.com",
        hashed_password=hash_password("RotatePassword1!"),
        full_name="Rotation Test User",
        role=UserRole.ADMIN,
    )
    await user_repo.save(user)
    await test_session.commit()

    # Initial login
    login_resp = await client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "rotate.user@marlowdental.com", "password": "RotatePassword1!"},
    )
    assert login_resp.status_code == 200
    first_cookie = login_resp.cookies.get(settings.REFRESH_COOKIE_NAME)
    assert first_cookie is not None

    # Age the token beyond 35 minutes
    aged_time = datetime.now(timezone.utc) - timedelta(minutes=36)
    await test_session.execute(
        update(RefreshTokenORM).values(created_at=aged_time)
    )
    await test_session.commit()

    # Refresh after 35 min
    client_with_db.cookies.set(settings.REFRESH_COOKIE_NAME, first_cookie)
    refresh_resp = await client_with_db.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 200
    data = refresh_resp.json()
    assert "accessToken" in data
    assert data["rotated"] is True
    second_cookie = refresh_resp.cookies.get(settings.REFRESH_COOKIE_NAME)
    assert second_cookie is not None
    assert second_cookie != first_cookie


@pytest.mark.asyncio
async def test_auth_refresh_token_concurrency_grace_period(client_with_db: AsyncClient, test_session: AsyncSession):
    """
    Legitimate concurrent request:
    Request A rotates the token.
    Request B arrives within the 30s grace window with the old token.
    Backend should gracefully return the active token instead of nuking the session.
    """
    user_repo = PostgresUserRepository(test_session)
    user = User(
        email="concurrent.user@marlowdental.com",
        hashed_password=hash_password("ConcurrentPass1!"),
        full_name="Concurrent Test User",
        role=UserRole.ADMIN,
    )
    await user_repo.save(user)
    await test_session.commit()

    login_resp = await client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "concurrent.user@marlowdental.com", "password": "ConcurrentPass1!"},
    )
    token_a = login_resp.cookies.get(settings.REFRESH_COOKIE_NAME)

    # Age token past 35 min so Request A triggers rotation
    await test_session.execute(
        update(RefreshTokenORM).values(created_at=datetime.now(timezone.utc) - timedelta(minutes=40))
    )
    await test_session.commit()

    # Request A rotates
    client_with_db.cookies.set(settings.REFRESH_COOKIE_NAME, token_a)
    resp_a = await client_with_db.post("/api/v1/auth/refresh")
    assert resp_a.status_code == 200
    assert resp_a.json()["rotated"] is True

    # Request B arrives right after with token_a (simulating concurrent browser race)
    client_with_db.cookies.set(settings.REFRESH_COOKIE_NAME, token_a)
    resp_b = await client_with_db.post("/api/v1/auth/refresh")
    assert resp_b.status_code == 200
    # Must succeed under grace period!
    assert "accessToken" in resp_b.json()


@pytest.mark.asyncio
async def test_auth_logout_revokes_session_and_token(client_with_db: AsyncClient, test_session: AsyncSession):
    """
    Logout must:
    1. Clear the refresh cookie
    2. Revoke the refresh token (subsequent refresh fails)
    3. Revoke the server-side session (7-day access token is immediately invalidated)
    """
    user_repo = PostgresUserRepository(test_session)
    user = User(
        email="logout.user@marlowdental.com",
        hashed_password=hash_password("LogoutPassword1!"),
        full_name="Logout Test User",
        role=UserRole.ADMIN,
    )
    await user_repo.save(user)
    await test_session.commit()

    login_resp = await client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "logout.user@marlowdental.com", "password": "LogoutPassword1!"},
    )
    assert login_resp.status_code == 200
    access_token = login_resp.json()["accessToken"]
    refresh_cookie = login_resp.cookies.get(settings.REFRESH_COOKIE_NAME)

    # Protected endpoint works with access token
    headers = {"Authorization": f"Bearer {access_token}"}
    me_resp = await client_with_db.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200

    # Logout
    client_with_db.cookies.set(settings.REFRESH_COOKIE_NAME, refresh_cookie)
    logout_resp = await client_with_db.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 200

    # Subsequent refresh attempt with logged-out token must fail
    refresh_resp = await client_with_db.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 401

    # And critically: The 7-day access token must now be rejected because server session is revoked!
    revoked_me_resp = await client_with_db.get("/api/v1/auth/me", headers=headers)
    assert revoked_me_resp.status_code == 401


@pytest.mark.asyncio
async def test_update_inactivity_settings(client_with_db: AsyncClient, admin_auth):
    """
    PATCH /api/v1/auth/inactivity-settings allows admin to configure inactivity parameters.
    """
    patch_resp = await client_with_db.patch(
        "/api/v1/auth/inactivity-settings",
        headers=admin_auth["headers"],
        json={
            "inactivityEnabled": True,
            "inactivityTimeoutMinutes": 30,
            "inactivityWarningSeconds": 120,
        },
    )
    assert patch_resp.status_code == 200
    data = patch_resp.json()
    assert data["inactivityEnabled"] is True
    assert data["inactivityTimeoutMinutes"] == 30
    assert data["inactivityWarningSeconds"] == 120
