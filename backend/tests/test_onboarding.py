import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from app.core.security import create_access_token, hash_password
from app.domain.models.user import User, UserRole, UserSession
from app.infrastructure.repositories.postgres_user_repo import (
    PostgresUserRepository,
    PostgresUserSessionRepository,
)


@pytest.mark.asyncio
async def test_onboarding_completion_endpoint(test_session, client_with_db):
    user_repo = PostgresUserRepository(test_session)
    session_repo = PostgresUserSessionRepository(test_session)

    # 1. Create a doctor user who has NOT completed onboarding
    user = User(
        email=f"onboard_doc_{uuid4().hex[:8]}@hiradental.com",
        hashed_password=hash_password("DocPass2026!"),
        full_name="Dr. Initial Name",
        role=UserRole.DOCTOR,
        has_completed_onboarding=False,
        is_active=True,
    )
    saved_user = await user_repo.save(user)
    await test_session.commit()

    # 2. Create active session and mint JWT token
    user_session = UserSession(
        user_id=saved_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    saved_session = await session_repo.save(user_session)
    await test_session.commit()

    token = create_access_token(
        subject=str(saved_user.id),
        role=UserRole.DOCTOR.value,
        session_id=str(saved_session.id),
    )

    headers = {"Authorization": f"Bearer {token}"}

    # 3. Verify /auth/me returns hasCompletedOnboarding = False
    me_res = await client_with_db.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["hasCompletedOnboarding"] is False

    # 4. Call PATCH /api/v1/users/me/onboarding
    patch_res = await client_with_db.patch(
        "/api/v1/users/me/onboarding",
        json={"displayName": "Dr. Confirmed Name"},
        headers=headers,
    )
    assert patch_res.status_code == 200, patch_res.text
    patched_data = patch_res.json()
    assert patched_data["hasCompletedOnboarding"] is True
    assert patched_data["fullName"] == "Dr. Confirmed Name"

    # 5. Verify /auth/me now permanently returns hasCompletedOnboarding = True
    me_after = await client_with_db.get("/api/v1/auth/me", headers=headers)
    assert me_after.status_code == 200
    assert me_after.json()["hasCompletedOnboarding"] is True
    assert me_after.json()["fullName"] == "Dr. Confirmed Name"


@pytest.mark.asyncio
async def test_admin_user_always_exempt_from_onboarding(test_session, client_with_db):
    user_repo = PostgresUserRepository(test_session)
    session_repo = PostgresUserSessionRepository(test_session)

    # Admin user created even with has_completed_onboarding=False
    admin_user = User(
        email=f"admin_{uuid4().hex[:8]}@hiradental.com",
        hashed_password=hash_password("AdminPass2026!"),
        full_name="Admin Boss",
        role=UserRole.ADMIN,
        has_completed_onboarding=False,
        is_active=True,
    )
    saved_admin = await user_repo.save(admin_user)
    await test_session.commit()

    admin_session = UserSession(
        user_id=saved_admin.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    saved_session = await session_repo.save(admin_session)
    await test_session.commit()

    token = create_access_token(
        subject=str(saved_admin.id),
        role=UserRole.ADMIN.value,
        session_id=str(saved_session.id),
    )

    headers = {"Authorization": f"Bearer {token}"}

    # Admin must always receive hasCompletedOnboarding = True
    me_res = await client_with_db.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["hasCompletedOnboarding"] is True

