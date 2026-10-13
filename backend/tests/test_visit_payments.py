import json
import pytest
from datetime import date
from uuid import UUID, uuid4

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.orm_models import (
    ActivityLogORM,
    BookingORM,
    ClinicBookingSettingsORM,
    PatientORM,
    VisitPaymentORM,
)


@pytest.mark.asyncio
async def test_record_visit_payment_when_enabled(
    receptionist_auth: dict, test_session: AsyncSession
):
    client: AsyncClient = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    today = date.today()

    # 1. Enable payments in booking settings
    settings_stmt = select(ClinicBookingSettingsORM).limit(1)
    res = await test_session.execute(settings_stmt)
    settings = res.scalars().first()
    if not settings:
        settings = ClinicBookingSettingsORM(
            id=uuid4(),
            booking_mode="open",
            payments_enabled=True,
        )
        test_session.add(settings)
    else:
        settings.payments_enabled = True
    await test_session.commit()

    # 2. Create booking
    booking = BookingORM(
        id=uuid4(),
        confirmation_id="BK-PAY-01",
        preferred_date=today,
        preferred_time="10:00",
        patient_full_name="Hamza Tariq",
        patient_phone="+923001234567",
        patient_email="hamza@example.com",
        status="confirmed",
    )
    test_session.add(booking)
    await test_session.commit()

    # 3. Record visit payment
    resp = await client.post(
        f"/api/v1/reception/appointments/{booking.id}/payments",
        headers=headers,
        json={
            "amountCents": 500000,
            "currency": "PKR",
            "method": "cash",
            "notes": "Root canal consultation fee",
        },
    )
    assert resp.status_code == 201, resp.text
    payment_data = resp.json()
    assert payment_data["amountCents"] == 500000
    assert payment_data["method"] == "cash"
    assert payment_data["amountFormatted"] == "PKR 5,000.00"
    assert payment_data["bookingId"] == str(booking.id)

    # 4. Verify in DB
    db_payment = await test_session.get(VisitPaymentORM, UUID(payment_data["id"]))
    assert db_payment is not None
    assert db_payment.amount_cents == 500000
    assert db_payment.method == "cash"

    # 5. Verify audit log recorded
    audit_stmt = (
        select(ActivityLogORM)
        .where(
            ActivityLogORM.action == "visit_payment_recorded",
            ActivityLogORM.entity_id == str(payment_data["id"]),
        )
    )
    audit_res = await test_session.execute(audit_stmt)
    log_entry = audit_res.scalars().first()
    assert log_entry is not None
    details = json.loads(log_entry.details_json) if isinstance(log_entry.details_json, str) else log_entry.details_json
    assert details["patientName"] == "Hamza Tariq"
    assert details["amountCents"] == 500000

    # 6. List payments for this booking
    list_resp = await client.get(
        f"/api/v1/reception/appointments/{booking.id}/payments",
        headers=headers,
    )
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) == 1
    assert items[0]["id"] == payment_data["id"]


@pytest.mark.asyncio
async def test_record_payment_blocked_when_payments_disabled(
    receptionist_auth: dict, test_session: AsyncSession
):
    client: AsyncClient = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    today = date.today()

    # Disable payments
    settings_stmt = select(ClinicBookingSettingsORM).limit(1)
    res = await test_session.execute(settings_stmt)
    settings = res.scalars().first()
    if not settings:
        settings = ClinicBookingSettingsORM(
            id=uuid4(),
            booking_mode="open",
            payments_enabled=False,
        )
        test_session.add(settings)
    else:
        settings.payments_enabled = False
    await test_session.commit()

    # Create booking
    booking = BookingORM(
        id=uuid4(),
        confirmation_id="BK-PAY-02",
        preferred_date=today,
        preferred_time="11:30",
        patient_full_name="Zoya Khan",
        patient_phone="+923009876543",
        patient_email="zoya@example.com",
        status="confirmed",
    )
    test_session.add(booking)
    await test_session.commit()

    # Attempt to record payment
    resp = await client.post(
        f"/api/v1/reception/appointments/{booking.id}/payments",
        headers=headers,
        json={
            "amountCents": 300000,
            "method": "card",
        },
    )
    assert resp.status_code == 400
    assert "disabled" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_end_of_day_payments_summary(
    receptionist_auth: dict, test_session: AsyncSession
):
    client: AsyncClient = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    today = date.today()

    # Enable payments
    settings_stmt = select(ClinicBookingSettingsORM).limit(1)
    res = await test_session.execute(settings_stmt)
    settings = res.scalars().first()
    if not settings:
        settings = ClinicBookingSettingsORM(
            id=uuid4(),
            booking_mode="open",
            payments_enabled=True,
        )
        test_session.add(settings)
    else:
        settings.payments_enabled = True
    await test_session.commit()

    # Create booking
    booking = BookingORM(
        id=uuid4(),
        confirmation_id="BK-PAY-03",
        preferred_date=today,
        preferred_time="14:00",
        patient_full_name="Rashid Ali",
        patient_phone="+923005551122",
        patient_email="rashid@example.com",
        status="confirmed",
    )
    test_session.add(booking)
    await test_session.commit()

    # Record Cash payment: Rs 3,000 (300000 cents)
    p1 = await client.post(
        f"/api/v1/reception/appointments/{booking.id}/payments",
        headers=headers,
        json={"amountCents": 300000, "method": "cash", "notes": "Cash advance"},
    )
    assert p1.status_code == 201

    # Record Card payment: Rs 5,000 (500000 cents)
    p2 = await client.post(
        f"/api/v1/reception/appointments/{booking.id}/payments",
        headers=headers,
        json={"amountCents": 500000, "method": "card", "notes": "Card balance"},
    )
    assert p2.status_code == 201

    # Record Bank Transfer payment: Rs 2,000 (200000 cents)
    p3 = await client.post(
        f"/api/v1/reception/appointments/{booking.id}/payments",
        headers=headers,
        json={"amountCents": 200000, "method": "bank_transfer", "notes": "Raast transfer"},
    )
    assert p3.status_code == 201

    # Query End-of-Day payments summary
    resp = await client.get(
        f"/api/v1/reception/end-of-day/payments-summary?date={today.isoformat()}",
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    summary = resp.json()
    assert summary["paymentCount"] >= 3
    assert summary["cashCents"] >= 300000
    assert summary["cardCents"] >= 500000
    assert summary["transferCents"] >= 200000
    assert summary["totalCents"] >= 1000000


def test_visit_payments_migration_definitions():
    import importlib.util
    from pathlib import Path

    file_path = Path(__file__).parent.parent / "alembic" / "versions" / "a8b9c0d1e2f3_visit_payments.py"
    assert file_path.exists()
    spec = importlib.util.spec_from_file_location("a8b9c0d1e2f3_visit_payments", file_path)
    mig = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig)

    assert mig.revision == "a8b9c0d1e2f3"
    assert mig.down_revision == "a6b7c8d9e0f1"
    assert hasattr(mig, "upgrade")
    assert hasattr(mig, "downgrade")
    assert callable(mig.upgrade)
    assert callable(mig.downgrade)

