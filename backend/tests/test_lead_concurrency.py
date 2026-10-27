import asyncio
import os
from datetime import datetime, timezone
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db_session
from app.domain.models.integration import generate_integration_key
from app.infrastructure.database.orm_models import (
    BookingFlowSettingsORM,
    ClinicORM,
    IntegrationClientORM,
    LeadORM,
    LeadSourceORM,
    OrganizationORM,
    UserORM,
)
from app.main import app

from app.core.config import settings

TEST_DB_URL = os.environ.get("MARLOW_TEST_DATABASE_URL")
if not TEST_DB_URL:
    base_url = str(settings.DATABASE_URL)
    if "dental_dev" in base_url:
        TEST_DB_URL = base_url.replace("dental_dev", "marlow_test")
    else:
        TEST_DB_URL = base_url


@pytest_asyncio.fixture
async def pg_test_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False, pool_size=10, max_overflow=10)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as exc:
        await engine.dispose()
        pytest.skip(f"PostgreSQL test database not available: {exc}")
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def pg_session_factory(pg_test_engine):
    return async_sessionmaker(bind=pg_test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture
async def pg_client(pg_session_factory):
    async def override_get_db():
        async with pg_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db_session] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.pop(get_db_session, None)


@pytest_asyncio.fixture
async def setup_pg_concurrency_data(pg_session_factory):
    async with pg_session_factory() as session:
        # 1. Organization
        org = OrganizationORM(
            id=uuid4(),
            name="Concurrency Test Clinic Org",
            display_name="Concurrency Test Clinic",
        )
        session.add(org)
        await session.flush()

        # 2. Clinic
        clinic = ClinicORM(
            id=uuid4(),
            organization_id=org.id,
            name="Main Lahore Clinic",
            address_line1="Plaza 45, Phase 5 DHA",
            city="Lahore",
            state="Punjab",
            postal_code="54000",
            phone="04235891234",
            is_active=True,
        )
        session.add(clinic)

        # 3. Booking flow settings
        flow_settings = BookingFlowSettingsORM(
            id=uuid4(),
            organization_id=org.id,
            followup_gaps_minutes=[15, 60, 240],
            max_attempts=3,
            cold_wait_hours=24,
            hold_minutes=30,
            auto_confirm_online=True,
            days_shown=7,
            show_patients_treated=True,
        )
        session.add(flow_settings)

        # 4. Lead Source
        src_res = await session.execute(
            select(LeadSourceORM).where(LeadSourceORM.name == "website_abandon")
        )
        src = src_res.scalar_one_or_none()
        if not src:
            src = LeadSourceORM(
                id=uuid4(),
                name="website_abandon",
                utm_source="website_abandon",
                is_active=True,
            )
            session.add(src)

        # 5. Admin user for integration client
        admin = UserORM(
            id=uuid4(),
            email=f"admin_concurrent_{uuid4().hex[:6]}@marlowdental.com",
            full_name="Admin Concurrent",
            role="admin",
            hashed_password="mock",
            is_active=True,
        )
        session.add(admin)
        await session.flush()

        # 6. Integration client with leads:write scope
        raw_key, prefix, key_hash = generate_integration_key()
        client_orm = IntegrationClientORM(
            id=uuid4(),
            name=f"Concurrent Test Bot {uuid4().hex[:6]}",
            key_prefix=prefix,
            key_hash=key_hash,
            scopes=["leads:read", "leads:write", "lookup:read"],
            is_active=True,
            created_by_user_id=admin.id,
        )
        session.add(client_orm)
        await session.commit()

        return {
            "org": org,
            "clinic": clinic,
            "integration_key": raw_key,
        }


@pytest.mark.asyncio
async def test_two_simultaneous_public_lead_posts_leave_one_open_lead(
    pg_client, setup_pg_concurrency_data, pg_session_factory
):
    phone = f"0300 {uuid4().int % 9000000 + 1000000}"
    payload1 = {
        "fullName": "User First Attempt",
        "phone": phone,
        "email": "user1@example.com",
        "noticeVersion": "v1",
    }
    payload2 = {
        "fullName": "User Second Attempt",
        "phone": phone,
        "email": "user2@example.com",
        "noticeVersion": "v1",
    }

    # Execute two simultaneous POSTs to public lead endpoint
    res1, res2 = await asyncio.gather(
        pg_client.post("/api/v1/public/leads", json=payload1),
        pg_client.post("/api/v1/public/leads", json=payload2),
    )

    assert res1.status_code in (200, 201), f"res1 failed: {res1.text}"
    assert res2.status_code in (200, 201), f"res2 failed: {res2.text}"

    token1 = res1.json()["captureToken"]
    token2 = res2.json()["captureToken"]
    assert token1 is not None
    assert token2 is not None

    # Query database: exactly ONE open lead exists for this phone
    from app.domain.models.phone_utils import normalize_pakistan_phone
    norm = normalize_pakistan_phone(phone)
    async with pg_session_factory() as session:
        stmt = select(LeadORM).where(
            LeadORM.phone_normalized == norm,
            LeadORM.status == "unconverted",
        )
        leads = (await session.execute(stmt)).scalars().all()
        assert len(leads) == 1, f"Expected exactly 1 open lead, got {len(leads)}"


@pytest.mark.asyncio
async def test_simultaneous_public_and_integration_capture_leave_one_open_lead(
    pg_client, setup_pg_concurrency_data, pg_session_factory
):
    phone = f"0321 {uuid4().int % 9000000 + 1000000}"
    key = setup_pg_concurrency_data["integration_key"]

    public_payload = {
        "fullName": "Public Portal Visitor",
        "phone": phone,
        "email": "visitor@example.com",
        "noticeVersion": "v1",
    }
    integration_payload = {
        "name": "WhatsApp Inquirer",
        "phone": phone,
        "source": "whatsapp_message",
        "notes": "Inquiry received via WhatsApp bot",
    }

    # Execute one public capture and one integration capture concurrently
    res_pub, res_int = await asyncio.gather(
        pg_client.post("/api/v1/public/leads", json=public_payload),
        pg_client.post(
            "/api/v1/integration/leads",
            json=integration_payload,
            headers={"X-Marlow-Key": key},
        ),
    )

    assert res_pub.status_code in (200, 201), f"res_pub failed: {res_pub.text}"
    assert res_int.status_code in (200, 201), f"res_int failed: {res_int.text}"

    # Query database: exactly ONE open lead exists for this phone
    from app.domain.models.phone_utils import normalize_pakistan_phone
    norm = normalize_pakistan_phone(phone)
    async with pg_session_factory() as session:
        stmt = select(LeadORM).where(
            LeadORM.phone_normalized == norm,
            LeadORM.status == "unconverted",
        )
        leads = (await session.execute(stmt)).scalars().all()
        assert len(leads) == 1, f"Expected exactly 1 open lead, got {len(leads)}"
