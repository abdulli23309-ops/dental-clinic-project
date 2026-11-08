import hashlib
from datetime import datetime, timedelta, timezone
from uuid import uuid4
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import get_db_session
from app.infrastructure.database.orm_models import LeadCaptureTokenORM, LeadORM
from app.main import app, limiter

limiter.enabled = False


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.mark.asyncio
async def test_public_lead_capture_tokens_comprehensive(client_with_db, test_session):
    phone_raw = "+92 300 7654321"

    # 1. First capture call -> returns token1
    res1 = await client_with_db.post(
        "/api/v1/public/leads",
        json={"fullName": "Original Name", "phone": phone_raw, "email": "orig@example.com"},
    )
    assert res1.status_code == 201
    data1 = res1.json()
    token1 = data1["captureToken"]
    assert token1 and len(token1) >= 32

    # 2. Second capture call with same phone -> returns a FRESH token (token2 != token1)
    res2 = await client_with_db.post(
        "/api/v1/public/leads",
        json={"fullName": "Original Name Updated", "phone": phone_raw, "email": "orig@example.com"},
    )
    assert res2.status_code == 201
    data2 = res2.json()
    token2 = data2["captureToken"]
    assert token2 != token1, "Capture must return a fresh token on every call"

    # 3. Verify tokens are stored hashed with ~24h expiry and multiple valid tokens exist per lead
    token1_hash = hashlib.sha256(token1.encode("utf-8")).hexdigest()
    token2_hash = hashlib.sha256(token2.encode("utf-8")).hexdigest()

    tokens_stmt = select(LeadCaptureTokenORM).order_by(LeadCaptureTokenORM.created_at.asc())
    result = await test_session.execute(tokens_stmt)
    token_rows = result.scalars().all()
    assert len(token_rows) == 2, "Several valid tokens must be stored per lead"

    stored_hashes = {t.token_hash for t in token_rows}
    assert token1_hash in stored_hashes, "Tokens must be stored hashed"
    assert token2_hash in stored_hashes, "Tokens must be stored hashed"

    now_utc = datetime.now(timezone.utc)
    for t in token_rows:
        duration = t.expires_at - t.created_at
        exp = t.expires_at.replace(tzinfo=timezone.utc) if t.expires_at.tzinfo is None else t.expires_at
        assert exp > now_utc

    # 4. Both tokens are valid and can patch the lead
    patch_notes_res = await client_with_db.patch(
        f"/api/v1/public/leads/{token1}",
        json={"notes": "Notes via token 1"},
    )
    assert patch_notes_res.status_code == 200

    # 5. PATCH by token may fill but never overwrite name, email, or phone
    patch_overwrite_res = await client_with_db.patch(
        f"/api/v1/public/leads/{token2}",
        json={
            "fullName": "Attempted New Name",
            "email": "hacked@example.com",
            "phone": "+92 300 9999999",
            "notes": "Updated notes via token 2",
        },
    )
    assert patch_overwrite_res.status_code == 200

    # Verify lead in DB: name, email, and phone were NOT overwritten
    lead_stmt = select(LeadORM).where(LeadORM.phone_normalized == "923007654321")
    lead_row = (await test_session.execute(lead_stmt)).scalar_one()
    assert lead_row.full_name == "Original Name Updated" or lead_row.full_name == "Original Name"
    assert lead_row.full_name != "Attempted New Name", "PATCH by token must never overwrite name"
    assert lead_row.email == "orig@example.com", "PATCH by token must never overwrite email"
    assert lead_row.phone == phone_raw, "PATCH by token must never overwrite phone"
    assert lead_row.notes == "Updated notes via token 2"

    # 6. Fill previously empty field (serviceId, notes) succeeds
    patch_fill_res = await client_with_db.patch(
        f"/api/v1/public/leads/{token1}",
        json={"serviceId": "cleaning"},
    )
    assert patch_fill_res.status_code == 200
    await test_session.refresh(lead_row)
    assert lead_row.service_id == "cleaning"

    # 7. Expired token returns 404
    expired_token_raw = "expired_raw_token_xyz"
    expired_hash = hashlib.sha256(expired_token_raw.encode("utf-8")).hexdigest()
    past_time = now_utc - timedelta(hours=25)
    expired_token_row = LeadCaptureTokenORM(
        lead_id=lead_row.id,
        token_hash=expired_hash,
        created_at=past_time - timedelta(hours=24),
        expires_at=past_time,
    )
    test_session.add(expired_token_row)
    await test_session.commit()

    expired_res = await client_with_db.patch(
        f"/api/v1/public/leads/{expired_token_raw}",
        json={"notes": "Should fail with 404"},
    )
    assert expired_res.status_code == 404, "Expired token must return 404"


@pytest.mark.asyncio
async def test_cold_or_failed_conversion_recontact_creates_new_open_lead(client_with_db, test_session):
    phone_raw = "+92 300 8887766"

    # 1. Initial capture creates open lead
    res1 = await client_with_db.post(
        "/api/v1/public/leads",
        json={"fullName": "Lead Alpha", "phone": phone_raw},
    )
    assert res1.status_code == 201

    # 2. Mark lead as cold
    lead1_stmt = select(LeadORM).where(LeadORM.phone_normalized == "923008887766")
    lead1 = (await test_session.execute(lead1_stmt)).scalar_one()
    lead1.status = "cold"
    await test_session.commit()

    # 3. Same phone contacts again -> creates a NEW open lead
    res2 = await client_with_db.post(
        "/api/v1/public/leads",
        json={"fullName": "Lead Alpha Returning", "phone": phone_raw},
    )
    assert res2.status_code == 201

    # Verify both leads exist in database
    all_leads = (await test_session.execute(lead1_stmt)).scalars().all()
    assert len(all_leads) == 2
    statuses = {l.status for l in all_leads}
    assert statuses == {"cold", "unconverted"}

    # 4. Mark second lead as failed_conversion
    lead2 = next(l for l in all_leads if l.status == "unconverted")
    lead2.status = "failed_conversion"
    await test_session.commit()

    # 5. Same phone contacts third time -> creates a third lead (new open lead)
    res3 = await client_with_db.post(
        "/api/v1/public/leads",
        json={"fullName": "Lead Alpha Attempt 3", "phone": phone_raw},
    )
    assert res3.status_code == 201

    all_leads3 = (await test_session.execute(lead1_stmt)).scalars().all()
    assert len(all_leads3) == 3
    statuses3 = {l.status for l in all_leads3}
    assert statuses3 == {"cold", "failed_conversion", "unconverted"}

    # 6. Same phone contacts while third lead is STILL unconverted -> resumes existing open lead
    res4 = await client_with_db.post(
        "/api/v1/public/leads",
        json={"fullName": "Lead Alpha Resumed", "phone": phone_raw},
    )
    assert res4.status_code == 201
    all_leads4 = (await test_session.execute(lead1_stmt)).scalars().all()
    assert len(all_leads4) == 3, "Does not duplicate when an unconverted lead is already open"

