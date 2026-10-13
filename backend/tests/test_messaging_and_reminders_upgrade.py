from datetime import date, datetime, timedelta
from uuid import uuid4
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.services.messaging_provider import (
    DisabledMessagingProvider,
    SimulatedMessagingProvider,
    get_messaging_provider,
)
from app.application.services.reception_service import is_in_quiet_hours
from app.domain.models.booking_crm import Booking, Patient


def test_messaging_provider_layer():
    sim = get_messaging_provider("simulated")
    assert isinstance(sim, SimulatedMessagingProvider)

    dis = get_messaging_provider("disabled")
    assert isinstance(dis, DisabledMessagingProvider)

    import asyncio
    sim_res = asyncio.run(sim.send_message("+923001234567", "Hello test"))
    assert sim_res.success is True
    assert sim_res.status == "simulated"
    assert sim_res["success"] is True

    dis_res = asyncio.run(dis.send_message("+923001234567", "Hello test"))
    assert dis_res.success is False
    assert dis_res.status == "disabled"


def test_quiet_hours_calculation():
    from zoneinfo import ZoneInfo
    pkt = ZoneInfo("Asia/Karachi")

    # 22:30 PKT is in 21:00 - 08:00
    dt_night = datetime(2026, 10, 15, 22, 30, tzinfo=pkt)
    assert is_in_quiet_hours(dt_night, "21:00", "08:00") is True

    # 07:15 PKT is in 21:00 - 08:00
    dt_early = datetime(2026, 10, 15, 7, 15, tzinfo=pkt)
    assert is_in_quiet_hours(dt_early, "21:00", "08:00") is True

    # 14:00 PKT is NOT in 21:00 - 08:00
    dt_day = datetime(2026, 10, 15, 14, 0, tzinfo=pkt)
    assert is_in_quiet_hours(dt_day, "21:00", "08:00") is False


@pytest.mark.asyncio
async def test_patient_messaging_opt_out_endpoint(
    receptionist_auth: dict,
    test_session: AsyncSession,
):
    client: AsyncClient = receptionist_auth["client"]
    headers = receptionist_auth["headers"]

    patient = Patient(
        first_name="Hassan",
        last_name="Raza",
        phone="+923009988771",
        email="hassan.raza@example.com",
        messaging_opt_out=False,
    )
    from app.infrastructure.repositories.postgres_patient_repo import PostgresPatientRepository
    patient_repo = PostgresPatientRepository(test_session)
    saved_patient = await patient_repo.save(patient)

    # Opt-out
    res = await client.patch(
        f"/api/v1/reception/patients/{saved_patient.id}/messaging-opt-out",
        json={"optOut": True},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["messagingOptOut"] is True

    # Check persistence
    refreshed = await patient_repo.get_by_id(saved_patient.id)
    assert refreshed.messaging_opt_out is True

    # Opt back in
    res2 = await client.patch(
        f"/api/v1/reception/patients/{saved_patient.id}/messaging-opt-out",
        json={"optOut": False},
        headers=headers,
    )
    assert res2.status_code == 200
    assert res2.json()["messagingOptOut"] is False


@pytest.mark.asyncio
async def test_admin_messaging_settings_and_scheduler(
    admin_auth: dict,
    test_session: AsyncSession,
):
    client: AsyncClient = admin_auth["client"]
    headers = admin_auth["headers"]

    # GET settings
    get_res = await client.get(
        "/api/v1/admin/messaging/settings",
        headers=headers,
    )
    assert get_res.status_code == 200
    settings_data = get_res.json()
    assert "messagingProviderMode" in settings_data
    assert "quietHoursEnabled" in settings_data

    # PUT settings
    put_res = await client.put(
        "/api/v1/admin/messaging/settings",
        json={
            "quietHoursEnabled": True,
            "quietHoursStart": "22:00",
            "quietHoursEnd": "07:00",
            "messagingProviderMode": "simulated",
            "reminderTemplate": "Hello {patient_name}, reminder for {appointment_date} at {appointment_time}.",
        },
        headers=headers,
    )
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["quietHoursStart"] == "22:00"
    assert updated["quietHoursEnd"] == "07:00"

    # Run scheduler (forced override to bypass quiet hours during test run)
    sched_res = await client.post(
        "/api/v1/admin/messaging/run-scheduler?force_quiet_hours=true",
        headers=headers,
    )
    assert sched_res.status_code == 200
    sched_data = sched_res.json()
    assert sched_data["skippedQuietHours"] is False
    assert sched_data["simulated"] is True

    # GET message logs
    logs_res = await client.get(
        "/api/v1/admin/messaging/logs",
        headers=headers,
    )
    assert logs_res.status_code == 200
    assert "items" in logs_res.json()


@pytest.mark.asyncio
async def test_automated_reminders_skips_opted_out_patients(
    receptionist_auth: dict,
    admin_auth: dict,
    test_session: AsyncSession,
):
    r_client: AsyncClient = receptionist_auth["client"]
    r_headers = receptionist_auth["headers"]
    a_client: AsyncClient = admin_auth["client"]
    a_headers = admin_auth["headers"]

    from app.infrastructure.repositories.postgres_patient_repo import PostgresPatientRepository
    from app.infrastructure.repositories.postgres_booking_repo import PostgresBookingRepository

    patient_repo = PostgresPatientRepository(test_session)
    booking_repo = PostgresBookingRepository(test_session)

    target_date = date.today() + timedelta(days=2)

    # Patient A: opted out
    pat_a = await patient_repo.save(Patient(
        first_name="OptedOut",
        last_name="Patient",
        phone="+923001111111",
        messaging_opt_out=True,
    ))
    booking_a = await booking_repo.save(Booking(
        patient_id=pat_a.id,
        patient_full_name="OptedOut Patient",
        patient_phone="+923001111111",
        patient_email="optedout@example.com",
        preferred_date=target_date,
        preferred_time="10:00",
        confirmation_id=f"MD-{uuid4().hex[:6].upper()}",
        status="confirmed",
    ))

    # Patient B: opted in
    pat_b = await patient_repo.save(Patient(
        first_name="OptedIn",
        last_name="Patient",
        phone="+923002222222",
        messaging_opt_out=False,
    ))
    booking_b = await booking_repo.save(Booking(
        patient_id=pat_b.id,
        patient_full_name="OptedIn Patient",
        patient_phone="+923002222222",
        patient_email="optedin@example.com",
        preferred_date=target_date,
        preferred_time="11:00",
        confirmation_id=f"MD-{uuid4().hex[:6].upper()}",
        status="confirmed",
    ))

    # Check worklist returns optedOut flag
    wl_res = await r_client.get(
        f"/api/v1/reception/reminders?date={target_date.isoformat()}",
        headers=r_headers,
    )
    assert wl_res.status_code == 200
    items = wl_res.json()["items"]
    item_a = next(it for it in items if it["id"] == str(booking_a.id))
    item_b = next(it for it in items if it["id"] == str(booking_b.id))
    assert item_a["optedOut"] is True
    assert item_b["optedOut"] is False

    # Run scheduler forced
    sched_res = await a_client.post(
        f"/api/v1/admin/messaging/run-scheduler?target_date={target_date.isoformat()}&force_quiet_hours=true",
        headers=a_headers,
    )
    assert sched_res.status_code == 200
    data = sched_res.json()
    assert data["skippedOptOutCount"] >= 1
    assert data["dispatchedCount"] >= 1

    # Verify Booking B is marked reminded, but Booking A is not
    refreshed_a = await booking_repo.get_by_id(booking_a.id)
    refreshed_b = await booking_repo.get_by_id(booking_b.id)
    assert refreshed_a.reminded_at is None
    assert refreshed_b.reminded_at is not None
