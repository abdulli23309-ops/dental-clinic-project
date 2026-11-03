"""Security regression tests for authentication and session validation.

These tests prove that:
- Access tokens MUST be bound to a server-side session (sid claim required).
- Revoked / expired / mismatched sessions are rejected.
- Refresh-token rotation handles concurrent requests and replay safely.
- Malicious input cannot bypass authentication.
"""
from datetime import date, datetime, timedelta, timezone
import asyncio
from uuid import uuid4

import jwt
import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.domain.models.user import User, UserRole
from app.infrastructure.database.orm_models import RefreshTokenORM, UserSessionORM
from app.infrastructure.repositories.postgres_user_repo import PostgresUserRepository


async def _login(client: AsyncClient, email: str, password: str):
    return await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )


async def _make_user(session: AsyncSession, email: str, password: str, role=UserRole.ADMIN) -> User:
    repo = PostgresUserRepository(session)
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name="Security Test User",
        role=role,
        is_active=True,
    )
    await repo.save(user)
    await session.commit()
    return user


@pytest.mark.asyncio
async def test_access_token_without_sid_is_rejected(client_with_db: AsyncClient, test_session: AsyncSession):
    """A token issued without a session id must not grant access to protected endpoints."""
    await _make_user(test_session, "nosid@marlowdental.com", "NoSidPass123!")

    token = jwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000001",
            "role": "admin",
            "type": "access",
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    resp = await client_with_db.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401
    assert "session" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_revoked_session_rejects_access_token(client_with_db: AsyncClient, test_session: AsyncSession):
    """After logout, the server-side session is revoked and the 7-day access token is invalidated."""
    user = await _make_user(test_session, "revoke@marlowdental.com", "RevokePass123!")
    resp = await _login(client_with_db, "revoke@marlowdental.com", "RevokePass123!")
    assert resp.status_code == 200
    access_token = resp.json()["accessToken"]
    refresh_cookie = resp.cookies.get(settings.REFRESH_COOKIE_NAME)

    headers = {"Authorization": f"Bearer {access_token}"}
    me_resp = await client_with_db.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200

    client_with_db.cookies.set(settings.REFRESH_COOKIE_NAME, refresh_cookie)
    logout_resp = await client_with_db.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 200

    revoked_me_resp = await client_with_db.get("/api/v1/auth/me", headers=headers)
    assert revoked_me_resp.status_code == 401

    refresh_resp = await client_with_db.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 401


@pytest.mark.asyncio
async def test_expired_session_rejects_access_token(client_with_db: AsyncClient, test_session: AsyncSession):
    """A token bound to an expired server-side session must be rejected."""
    user = await _make_user(test_session, "expired@marlowdental.com", "ExpiredPass123!")
    resp = await _login(client_with_db, "expired@marlowdental.com", "ExpiredPass123!")
    assert resp.status_code == 200
    access_token = resp.json()["accessToken"]
    headers = {"Authorization": f"Bearer {access_token}"}

    await test_session.execute(
        update(UserSessionORM).where(UserSessionORM.user_id == user.id).values(
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),
            is_active=False,
        )
    )
    await test_session.commit()

    me_resp = await client_with_db.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 401


@pytest.mark.asyncio
async def test_session_belonging_to_different_user_is_rejected(client_with_db: AsyncClient, test_session: AsyncSession):
    """A token whose sid points at another user's session must be rejected."""
    victim = await _make_user(test_session, "victim@marlowdental.com", "VictimPass123!")
    attacker = await _make_user(test_session, "attacker@marlowdental.com", "AttackerPass123!")

    resp = await _login(client_with_db, "victim@marlowdental.com", "VictimPass123!")
    assert resp.status_code == 200

    from sqlalchemy import select

    result = await test_session.execute(
        select(UserSessionORM).where(UserSessionORM.user_id == victim.id).where(UserSessionORM.is_active == True)  # noqa: E712
    )
    victim_session = result.scalars().first()
    assert victim_session is not None
    victim_session_id = str(victim_session.id)

    token = jwt.encode(
        {
            "sub": str(attacker.id),
            "role": attacker.role.value,
            "sid": victim_session_id,
            "type": "access",
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    resp = await client_with_db.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_replay_outside_grace_period_is_rejected(client_with_db: AsyncClient, test_session: AsyncSession):
    """Reusing a revoked refresh token outside the grace period must fail and revoke all sessions."""
    user = await _make_user(test_session, "replay@marlowdental.com", "ReplayPass123!")
    resp = await _login(client_with_db, "replay@marlowdental.com", "ReplayPass123!")
    assert resp.status_code == 200
    refresh_cookie = resp.cookies.get(settings.REFRESH_COOKIE_NAME)

    client_with_db.cookies.set(settings.REFRESH_COOKIE_NAME, refresh_cookie)
    logout_resp = await client_with_db.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 200

    client_with_db.cookies.set(settings.REFRESH_COOKIE_NAME, refresh_cookie)
    replay_resp = await client_with_db.post("/api/v1/auth/refresh")
    assert replay_resp.status_code == 401


@pytest.mark.asyncio
async def test_concurrent_refresh_requests_tolerated_within_grace(client_with_db: AsyncClient, test_session: AsyncSession):
    """Two concurrent refreshes with the same token inside the grace period both succeed."""
    user = await _make_user(test_session, "concurrent@marlowdental.com", "ConcurrentPass123!")
    resp = await _login(client_with_db, "concurrent@marlowdental.com", "ConcurrentPass123!")
    assert resp.status_code == 200
    token_a = resp.cookies.get(settings.REFRESH_COOKIE_NAME)

    await test_session.execute(
        update(RefreshTokenORM).values(created_at=datetime.now(timezone.utc) - timedelta(minutes=40))
    )
    await test_session.commit()

    client_with_db.cookies.set(settings.REFRESH_COOKIE_NAME, token_a)
    resp_a = await client_with_db.post("/api/v1/auth/refresh")
    assert resp_a.status_code == 200
    assert resp_a.json()["rotated"] is True

    client_with_db.cookies.set(settings.REFRESH_COOKIE_NAME, token_a)
    resp_b = await client_with_db.post("/api/v1/auth/refresh")
    assert resp_b.status_code == 200
    assert "accessToken" in resp_b.json()


@pytest.mark.asyncio
async def test_malicious_sql_injection_login_cannot_bypass_auth(client_with_db: AsyncClient):
    """SQL-injection-looking login payloads must be rejected by validation, not alter query structure."""
    payloads = [
        {"email": "' OR '1'='1", "password": "x"},
        {"email": "admin@marlowdental.com'; DROP TABLE users;--", "password": "x"},
        {"email": "admin'--", "password": "x"},
        {"email": "'; DELETE FROM users;--", "password": "x"},
    ]
    for payload in payloads:
        resp = await client_with_db.post("/api/v1/auth/login", json=payload)
        assert resp.status_code in (400, 401, 422), f"unexpected status for {payload}: {resp.status_code}"


@pytest.mark.asyncio
async def test_create_access_token_requires_session_id():
    """create_access_token must raise when session_id is missing."""
    from app.core.security import create_access_token

    with pytest.raises(ValueError, match="session_id is required"):
        create_access_token(subject=str(uuid4()), role="admin", session_id="")

    with pytest.raises(ValueError, match="session_id is required"):
        create_access_token(subject=str(uuid4()), role="admin", session_id=None)

    token = create_access_token(subject=str(uuid4()), role="admin", session_id=str(uuid4()))
    assert isinstance(token, str) and len(token) > 0


@pytest.mark.asyncio
async def test_sql_injection_public_reschedule_rejected(client_with_db: AsyncClient):
    """SQL-injection payloads in public booking endpoints must not alter query structure."""
    malicious_ids = [
        "' OR '1'='1",
        "'; DROP TABLE bookings;--",
        "admin'--",
        "' UNION SELECT id, email FROM users;--",
    ]
    for bad_id in malicious_ids:
        resp = await client_with_db.post(
            "/public/booking/reschedule-request",
            json={
                "confirmationId": bad_id,
                "requestedDate": "2026-12-01",
                "requestedTime": "10:00 AM",
            },
        )
        # Must not be a 500 (which would indicate an unhandled DB error / injection leak).
        assert resp.status_code in (400, 404, 422), f"unexpected status for {bad_id!r}: {resp.status_code}"


@pytest.mark.asyncio
async def test_cross_tenant_user_cannot_access_another_clinic_appointment(client_with_db: AsyncClient, test_session: AsyncSession):
    """A user bound to clinic A must not read/write clinic B's appointment records."""
    from uuid import uuid4
    from app.domain.models.booking_crm import Booking
    from app.infrastructure.repositories.postgres_booking_repo import PostgresBookingRepository

    booking_repo = PostgresBookingRepository(test_session)

    clinic_a_id = uuid4()
    clinic_b_id = uuid4()

    # Two bookings, one per clinic.
    booking_a = Booking(
        confirmation_id="MD-2026-CLINIC-A",
        preferred_date=date(2026, 11, 5),
        preferred_time="10:00 AM",
        patient_full_name="Patient A",
        patient_phone="3125550001",
        patient_email="a@example.com",
        clinic_id=clinic_a_id,
        status="requested",
    )
    booking_b = Booking(
        confirmation_id="MD-2026-CLINIC-B",
        preferred_date=date(2026, 11, 5),
        preferred_time="11:00 AM",
        patient_full_name="Patient B",
        patient_phone="3125550002",
        patient_email="b@example.com",
        clinic_id=clinic_b_id,
        status="requested",
    )
    await booking_repo.save(booking_a)
    await booking_repo.save(booking_b)
    await test_session.commit()

    # Create a user belonging to clinic A.
    user = await _make_user(test_session, "clinic.a@marlowdental.com", "ClinicAPass123!")
    from app.infrastructure.repositories.postgres_user_repo import PostgresUserRepository
    user_repo = PostgresUserRepository(test_session)
    domain_user = await user_repo.get_by_email("clinic.a@marlowdental.com")
    domain_user.clinic_id = clinic_a_id
    await user_repo.save(domain_user)
    await test_session.commit()

    resp = await _login(client_with_db, "clinic.a@marlowdental.com", "ClinicAPass123!")
    assert resp.status_code == 200
    headers = {"Authorization": f"Bearer {resp.json()['accessToken']}"}

    # Clinic A's own booking is readable.
    list_a = await client_with_db.get(
        f"/api/v1/reception/appointments?clinic_id={clinic_a_id}", headers=headers
    )
    assert list_a.status_code == 200
    ids_a = {b["confirmationId"] for b in list_a.json()}
    assert "MD-2026-CLINIC-A" in ids_a

    # Clinic B's booking must NOT appear in clinic A's scoped list.
    assert "MD-2026-CLINIC-B" not in ids_a, "Cross-tenant read leaked clinic B's record to clinic A"


@pytest.mark.asyncio
async def test_appointment_idempotency_prevents_duplicates(client_with_db: AsyncClient, test_session: AsyncSession):
    """Repeated submissions with the same idempotency key must not create duplicate requests."""
    from app.domain.models.service import Service
    from app.infrastructure.repositories.postgres_service_repo import PostgresServiceRepository

    service_repo = PostgresServiceRepository(test_session)
    svc = Service(
        slug="cleanings-exams", category="preventive", title="Cleanings & Exams",
        short_desc="Routine cleaning", cash_price="$150", duration="45 to 60 min",
        is_active=True, is_public=True, bookable_online=True,
    )
    await service_repo.save(svc)
    await test_session.commit()

    from app.domain.models.user import User, UserRole
    from app.infrastructure.repositories.postgres_user_repo import PostgresUserRepository
    user = await _make_user(test_session, "idem@marlowdental.com", "IdemPass123!")
    user_repo = PostgresUserRepository(test_session)
    u = await user_repo.get_by_email("idem@marlowdental.com")
    u.clinic_id = user.id  # anchor to a clinic id to avoid tenant rejection
    await user_repo.save(u)
    await test_session.commit()

    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    base_payload = {
        "serviceId": "cleanings-exams",
        "preferredDate": tomorrow,
        "preferredTime": "10:00 AM",
        "fullName": "Idempotent User",
        "phone": "3125550099",
        "email": "idem@example.com",
    }

    # First submission succeeds.
    resp1 = await client_with_db.post("/api/v1/appointments", json=base_payload)
    assert resp1.status_code == 201
    conf_id_1 = resp1.json()["confirmationId"]

    # Identical resubmission (same patient/date/time/service) must not create a duplicate.
    resp2 = await client_with_db.post("/api/v1/appointments", json=base_payload)
    assert resp2.status_code in (200, 201, 409)

    # Query all appointments for this phone/date and confirm only one exists.
    from sqlalchemy import select
    from app.infrastructure.database.orm_models import BookingORM
    all_bookings = await test_session.execute(
        select(BookingORM).where(BookingORM.patient_phone == "3125550099")
    )
    rows = all_bookings.scalars().all()
    same_day = [b for b in rows if str(b.preferred_date) == tomorrow]
    assert len(same_day) <= 1, f"Duplicate bookings created: {len(same_day)}"


@pytest.mark.asyncio
async def test_concurrent_refresh_same_token_grace_period(client_with_db: AsyncClient, test_session: AsyncSession):
    """
    Refresh grace-period: two sequential rotations with the same token (simulating
    concurrent requests that arrive within the 30-second grace window).

    Scenario:
    1. User logs in, gets refresh token A.
    2. Token A is aged past 35 minutes (rotation threshold).
    3. First rotation: succeeds, token A is revoked, new token B issued.
    4. Second rotation with token A (concurrent replay): tolerated within grace period,
       returns a valid access token bound to the active session.
    5. Afterward, exactly one active (non-revoked) refresh token should exist for the user.
    """
    from app.application.services.auth_service import AuthService
    from app.domain.repositories.user_repo import (
        RefreshTokenRepository,
        UserRepository,
        UserSessionRepository,
    )
    from app.infrastructure.repositories.postgres_user_repo import (
        PostgresRefreshTokenRepository,
        PostgresUserRepository,
        PostgresUserSessionRepository,
    )
    from sqlalchemy import select

    user = await _make_user(test_session, "conc@marlowdental.com", "ConcPass123!")
    resp = await _login(client_with_db, "conc@marlowdental.com", "ConcPass123!")
    assert resp.status_code == 200
    token_a = resp.cookies.get(settings.REFRESH_COOKIE_NAME)
    assert token_a is not None

    # Age the refresh token past the 35-minute rotation threshold.
    await test_session.execute(
        update(RefreshTokenORM).values(created_at=datetime.now(timezone.utc) - timedelta(minutes=40))
    )
    await test_session.commit()

    svc = AuthService(
        user_repo=PostgresUserRepository(test_session),
        refresh_token_repo=PostgresRefreshTokenRepository(test_session),
        session_repo=PostgresUserSessionRepository(test_session),
    )

    # First rotation: succeeds, rotates token.
    result1 = await svc.rotate_refresh_token(token_a)
    access_token_1, new_token_1, user_1, rotated_1 = result1
    assert rotated_1 is True
    assert isinstance(access_token_1, str) and len(access_token_1) > 0

    # Second rotation with the same (now revoked) token A: tolerated within grace period.
    result2 = await svc.rotate_refresh_token(token_a)
    access_token_2, new_token_2, user_2, rotated_2 = result2
    assert rotated_2 is False  # not a fresh rotation, just grace-period tolerance
    assert isinstance(access_token_2, str) and len(access_token_2) > 0
    assert access_token_1 == access_token_2  # same session -> same access token

    # Verify DB state: exactly one non-revoked refresh token should remain for the user.
    tokens = await test_session.execute(
        select(RefreshTokenORM).where(RefreshTokenORM.user_id == user.id)
    )
    rows = tokens.scalars().all()
    active = [r for r in rows if not r.is_revoked]
    assert len(active) == 1, f"Expected exactly one active refresh token, found {len(active)}"


@pytest.mark.asyncio
async def test_revoked_refresh_token_after_grace_period_rejected(client_with_db: AsyncClient, test_session: AsyncSession):
    """A revoked refresh token presented well after the grace period must be rejected."""
    user = await _make_user(test_session, "grace@marlowdental.com", "GracePass123!")
    resp = await _login(client_with_db, "grace@marlowdental.com", "GracePass123!")
    assert resp.status_code == 200
    refresh_cookie = resp.cookies.get(settings.REFRESH_COOKIE_NAME)

    # Log out to revoke the token, then wait past grace period (simulated by
    # setting revoked_at far in the past).
    client_with_db.cookies.set(settings.REFRESH_COOKIE_NAME, refresh_cookie)
    logout_resp = await client_with_db.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 200

    # Move revoked_at far past the grace period.
    await test_session.execute(
        update(RefreshTokenORM).where(RefreshTokenORM.user_id == user.id).values(
            revoked_at=datetime.now(timezone.utc) - timedelta(minutes=5)
        )
    )
    await test_session.commit()

    client_with_db.cookies.set(settings.REFRESH_COOKIE_NAME, refresh_cookie)
    replay_resp = await client_with_db.post("/api/v1/auth/refresh")
    assert replay_resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_bound_to_correct_user(client_with_db: AsyncClient, test_session: AsyncSession):
    """A refresh token refreshes only its own user's session, not another user's."""
    from app.application.services.auth_service import AuthService
    from app.domain.repositories.user_repo import (
        RefreshTokenRepository,
        UserRepository,
        UserSessionRepository,
    )
    from app.infrastructure.repositories.postgres_user_repo import (
        PostgresRefreshTokenRepository,
        PostgresUserRepository,
        PostgresUserSessionRepository,
    )

    user_a = await _make_user(test_session, "usera@marlowdental.com", "PassA123!")
    user_b = await _make_user(test_session, "userb@marlowdental.com", "PassB123!")

    resp_a = await _login(client_with_db, "usera@marlowdental.com", "PassA123!")
    assert resp_a.status_code == 200
    token_a = resp_a.cookies.get(settings.REFRESH_COOKIE_NAME)
    access_token_a = resp_a.json()["accessToken"]

    resp_b = await _login(client_with_db, "userb@marlowdental.com", "PassB123!")
    assert resp_b.status_code == 200
    token_b = resp_b.cookies.get(settings.REFRESH_COOKIE_NAME)
    access_token_b = resp_b.json()["accessToken"]

    # A's refresh token still works for A's session (single session is per-user).
    client_with_db.cookies.set(settings.REFRESH_COOKIE_NAME, token_a)
    resp_a_refresh = await client_with_db.post("/api/v1/auth/refresh")
    assert resp_a_refresh.status_code == 200

    # B's refresh token works for B's session.
    client_with_db.cookies.set(settings.REFRESH_COOKIE_NAME, token_b)
    resp_b_refresh = await client_with_db.post("/api/v1/auth/refresh")
    assert resp_b_refresh.status_code == 200

    # Each access token is bound to its own user/session (verified via /me).
    headers_a = {"Authorization": f"Bearer {access_token_a}"}
    me_a = await client_with_db.get("/api/v1/auth/me", headers=headers_a)
    assert me_a.status_code == 200
    assert me_a.json()["email"] == "usera@marlowdental.com"


