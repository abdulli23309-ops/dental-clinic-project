import json
import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo
from sqlalchemy import select

from app.domain.models.user import User, UserRole
from app.core.security import hash_password
from app.infrastructure.database.orm_models import (
    ActivityLogORM,
    AppointmentCategoryORM,
    ClinicORM,
    ClinicServiceORM,
    ClinicWorkingHoursORM,
    OrganizationORM,
    ProviderAvailabilityORM,
    ServiceORM,
    ServiceProviderORM,
    TeamMemberClinicORM,
    TeamMemberORM,
)
from app.infrastructure.repositories.postgres_user_repo import PostgresUserRepository


async def get_or_create_test_org(test_session) -> OrganizationORM:
    org = OrganizationORM(
        id=uuid4(),
        name="Test Dental Practice",
        display_name="Test Dental Practice",
        currency_code="PKR",
        is_active=True,
    )
    test_session.add(org)
    await test_session.flush()
    return org


def make_test_clinic(org_id, name="Test Branch", is_active=True) -> ClinicORM:
    return ClinicORM(
        id=uuid4(),
        organization_id=org_id,
        name=name,
        address_line1="123 Test Street",
        city="Islamabad",
        state="ICT",
        postal_code="44000",
        country="Pakistan",
        is_active=is_active,
        display_order=1,
    )


async def setup_test_environment(test_session):
    """Sets up synthetic clinics, service, doctor, and calendar for testing."""
    org = await get_or_create_test_org(test_session)
    clinic_a = make_test_clinic(org.id, name="Branch Alpha")
    clinic_b = make_test_clinic(org.id, name="Branch Beta")
    test_session.add_all([clinic_a, clinic_b])

    cat = AppointmentCategoryORM(
        id=uuid4(),
        name="General Care",
        code=f"gen_{uuid4().hex[:6]}",
        requires_approval=False,
    )
    test_session.add(cat)

    svc = ServiceORM(
        id=uuid4(),
        slug=f"cleaning-{uuid4().hex[:6]}",
        title="Comprehensive Dental Cleaning",
        short_desc="Standard cleaning procedure",
        category="General",
        category_id=cat.id,
        cash_price="Rs. 3,000",
        duration="30m",
        is_active=True,
        is_public=True,
        bookable_online=True,
    )
    test_session.add(svc)

    doctor = TeamMemberORM(
        id=uuid4(),
        organization_id=org.id,
        clinic_id=clinic_a.id,
        first_name="Hassan",
        last_name="Raza",
        display_name="Dr. Hassan Raza",
        professional_title="BDS, RDS",
        role="doctor",
        is_active=True,
    )
    test_session.add(doctor)
    await test_session.flush()

    # Assign doctor to Branch A
    test_session.add(
        TeamMemberClinicORM(
            team_member_id=doctor.id,
            clinic_id=clinic_a.id,
            is_active=True,
            is_primary=True,
        )
    )

    tz = ZoneInfo("Asia/Karachi")
    target_date = datetime.now(tz).date() + timedelta(days=2)
    if target_date.weekday() == 6:
        target_date += timedelta(days=1)
    dow = target_date.weekday()

    # Working hours for both clinics
    for c in [clinic_a, clinic_b]:
        test_session.add(
            ClinicWorkingHoursORM(
                id=uuid4(),
                clinic_id=c.id,
                day_of_week=dow,
                open_time="09:00",
                close_time="18:00",
                is_closed=False,
            )
        )
        test_session.add(
            ProviderAvailabilityORM(
                team_member_id=doctor.id,
                clinic_id=c.id,
                day_of_week=dow,
                start_time="09:00",
                end_time="18:00",
                is_active=True,
            )
        )

    await test_session.commit()
    return {
        "org": org,
        "clinic_a": clinic_a,
        "clinic_b": clinic_b,
        "service": svc,
        "doctor": doctor,
        "target_date": target_date,
    }


async def get_receptionist_headers(test_session, client):
    user_repo = PostgresUserRepository(test_session)
    email = f"rec_{uuid4().hex[:6]}@clinic.internal"
    rec_user = User(
        email=email,
        hashed_password=hash_password("ReceptionPass123!"),
        full_name="Staff Receptionist",
        role=UserRole.RECEPTIONIST,
        is_active=True,
    )
    await user_repo.save(rec_user)
    await test_session.commit()

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "ReceptionPass123!"},
    )
    assert resp.status_code == 200
    token = resp.json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_regression_appointment_service_multi_branch_doctor_lookup(
    client_with_db, test_session
):
    """Regression test: Unassigned booking recognizes doctor assigned via TeamMemberClinicORM."""
    data = await setup_test_environment(test_session)
    clinic_b = data["clinic_b"]
    svc = data["service"]
    doctor = data["doctor"]
    target_date = data["target_date"]

    # Assign Doctor to Branch Beta via TeamMemberClinicORM
    test_session.add(
        TeamMemberClinicORM(
            team_member_id=doctor.id,
            clinic_id=clinic_b.id,
            is_active=True,
            is_primary=False,
        )
    )
    # Branch Beta offers the Service
    test_session.add(
        ClinicServiceORM(
            clinic_id=clinic_b.id,
            service_id=svc.id,
            is_active=True,
        )
    )
    # Doctor is authorized for Service at Branch Beta
    test_session.add(
        ServiceProviderORM(
            team_member_id=doctor.id,
            service_id=svc.id,
            clinic_id=clinic_b.id,
            is_active=True,
        )
    )
    await test_session.commit()

    resp = await client_with_db.post(
        "/api/v1/appointments",
        json={
            "serviceId": str(svc.id),
            "clinicId": str(clinic_b.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "10:00 AM",
            "fullName": "Hamza Ali",
            "phone": "03001234567",
            "email": "hamza@example.com",
        },
    )
    assert resp.status_code == 201, f"Expected 201 but got {resp.status_code}: {resp.text}"


@pytest.mark.asyncio
async def test_positive_public_and_reception_path_authorized(
    client_with_db, test_session
):
    """Positive: Authorized (service, doctor, branch) succeeds on public and reception paths."""
    data = await setup_test_environment(test_session)
    clinic_a = data["clinic_a"]
    svc = data["service"]
    doctor = data["doctor"]
    target_date = data["target_date"]

    test_session.add(ClinicServiceORM(clinic_id=clinic_a.id, service_id=svc.id, is_active=True))
    test_session.add(ServiceProviderORM(team_member_id=doctor.id, service_id=svc.id, clinic_id=clinic_a.id, is_active=True))
    await test_session.commit()

    # Public path
    resp_pub = await client_with_db.post(
        "/api/v1/appointments",
        json={
            "serviceId": str(svc.id),
            "clinicId": str(clinic_a.id),
            "teamMemberId": str(doctor.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "10:00 AM",
            "fullName": "Sara Khan",
            "phone": "03005556677",
            "email": "sara@example.com",
        },
    )
    assert resp_pub.status_code == 201

    # Reception path
    headers = await get_receptionist_headers(test_session, client_with_db)
    resp_rec = await client_with_db.post(
        "/api/v1/reception/appointments",
        headers=headers,
        json={
            "patientFullName": "Bilal Ahmed",
            "patientPhone": "03009991122",
            "patientEmail": "bilal@example.com",
            "serviceId": str(svc.id),
            "clinicId": str(clinic_a.id),
            "teamMemberId": str(doctor.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "11:00 AM",
        },
    )
    assert resp_rec.status_code == 201, f"Expected 201 but got {resp_rec.status_code}: {resp_rec.text}"


@pytest.mark.asyncio
async def test_branch_isolation_doctor_at_branch_a_fails_at_branch_b(
    client_with_db, test_session
):
    """Branch isolation: Doctor authorized at Branch A booking at Branch B is rejected with 409."""
    data = await setup_test_environment(test_session)
    clinic_a = data["clinic_a"]
    clinic_b = data["clinic_b"]
    svc = data["service"]
    doctor = data["doctor"]
    target_date = data["target_date"]

    # Authorized at Branch A only
    test_session.add(ClinicServiceORM(clinic_id=clinic_a.id, service_id=svc.id, is_active=True))
    test_session.add(ClinicServiceORM(clinic_id=clinic_b.id, service_id=svc.id, is_active=True))
    test_session.add(ServiceProviderORM(team_member_id=doctor.id, service_id=svc.id, clinic_id=clinic_a.id, is_active=True))
    await test_session.commit()

    # Booking at Branch A -> 201 Success
    resp_a = await client_with_db.post(
        "/api/v1/appointments",
        json={
            "serviceId": str(svc.id),
            "clinicId": str(clinic_a.id),
            "teamMemberId": str(doctor.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "10:00 AM",
            "fullName": "Tariq Aziz",
            "phone": "03004443322",
            "email": "tariq@example.com",
        },
    )
    assert resp_a.status_code == 201

    # Booking at Branch B -> 409 Rejection
    resp_b = await client_with_db.post(
        "/api/v1/appointments",
        json={
            "serviceId": str(svc.id),
            "clinicId": str(clinic_b.id),
            "teamMemberId": str(doctor.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "11:00 AM",
            "fullName": "Tariq Aziz",
            "phone": "03004443322",
            "email": "tariq@example.com",
        },
    )
    assert resp_b.status_code == 409
    assert f"Dr. {doctor.display_name} does not offer" in resp_b.json()["detail"]


@pytest.mark.asyncio
async def test_negative_booking_scope_rejection_matrix(
    client_with_db, test_session
):
    """Negative matrix tests: Unlinked, inactive branch/service/links are rejected with 409."""
    data = await setup_test_environment(test_session)
    clinic_a = data["clinic_a"]
    svc = data["service"]
    doctor = data["doctor"]
    target_date = data["target_date"]

    # 1. No clinic_services row -> 409
    resp_no_cs = await client_with_db.post(
        "/api/v1/appointments",
        json={
            "serviceId": str(svc.id),
            "clinicId": str(clinic_a.id),
            "teamMemberId": str(doctor.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "10:00 AM",
            "fullName": "Test Patient",
            "phone": "03000000001",
        },
    )
    assert resp_no_cs.status_code == 409
    assert f"{svc.title} is not offered at" in resp_no_cs.json()["detail"]

    # 2. Offer service, but no service_providers row -> 409
    cs = ClinicServiceORM(clinic_id=clinic_a.id, service_id=svc.id, is_active=True)
    test_session.add(cs)
    await test_session.commit()

    resp_no_sp = await client_with_db.post(
        "/api/v1/appointments",
        json={
            "serviceId": str(svc.id),
            "clinicId": str(clinic_a.id),
            "teamMemberId": str(doctor.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "10:00 AM",
            "fullName": "Test Patient",
            "phone": "03000000002",
        },
    )
    assert resp_no_sp.status_code == 409
    assert f"Dr. {doctor.display_name} does not offer" in resp_no_sp.json()["detail"]

    # 3. Inactive service_providers link -> 409
    sp = ServiceProviderORM(team_member_id=doctor.id, service_id=svc.id, clinic_id=clinic_a.id, is_active=False)
    test_session.add(sp)
    await test_session.commit()

    resp_inactive_sp = await client_with_db.post(
        "/api/v1/appointments",
        json={
            "serviceId": str(svc.id),
            "clinicId": str(clinic_a.id),
            "teamMemberId": str(doctor.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "10:00 AM",
            "fullName": "Test Patient",
            "phone": "03000000003",
        },
    )
    assert resp_inactive_sp.status_code == 409


@pytest.mark.asyncio
async def test_audit_event_logged_on_rejection(
    client_with_db, test_session
):
    """Audit verification: Rejections log 'booking_rejected_service_scope' to activity_logs with zero PHI."""
    data = await setup_test_environment(test_session)
    clinic_a = data["clinic_a"]
    svc = data["service"]
    doctor = data["doctor"]
    target_date = data["target_date"]

    # Service offered at branch, but doctor NOT authorized
    test_session.add(ClinicServiceORM(clinic_id=clinic_a.id, service_id=svc.id, is_active=True))
    await test_session.commit()

    # Attempt booking with unauthorized doctor
    resp = await client_with_db.post(
        "/api/v1/appointments",
        json={
            "serviceId": str(svc.id),
            "clinicId": str(clinic_a.id),
            "teamMemberId": str(doctor.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "10:00 AM",
            "fullName": "Sensitive Patient Name",
            "phone": "03007654321",
            "email": "sensitive@patient.internal",
        },
    )
    assert resp.status_code == 409

    # Verify audit log row was written
    log_stmt = select(ActivityLogORM).where(
        ActivityLogORM.action == "booking_rejected_service_scope"
    ).order_by(ActivityLogORM.created_at.desc())
    res = await test_session.execute(log_stmt)
    audit_entry = res.scalars().first()

    assert audit_entry is not None, "Expected audit log entry for rejected booking"
    details = json.loads(audit_entry.details_json)

    # Check required fields
    assert details["service_id"] == str(svc.id)
    assert details["team_member_id"] == str(doctor.id)
    assert details["clinic_id"] == str(clinic_a.id)
    assert details["source"] == "public"
    assert "reason" in details

    # PHI verification: Ensure NO patient details leaked into the audit record
    details_str = json.dumps(details).lower()
    assert "sensitive patient name" not in details_str
    assert "03007654321" not in details_str
    assert "sensitive@patient.internal" not in details_str
from unittest.mock import patch

@pytest.mark.asyncio
async def test_negative_inactive_branch_and_inactive_service(
    client_with_db, test_session
):
    """Negative: Inactive branch and inactive service are rejected with 409."""
    data = await setup_test_environment(test_session)
    clinic_a = data["clinic_a"]
    svc = data["service"]
    doctor = data["doctor"]
    target_date = data["target_date"]

    # Inactive clinic
    inactive_clinic = make_test_clinic(data["org"].id, name="Inactive Branch", is_active=False)
    test_session.add(inactive_clinic)
    test_session.add(
        ClinicWorkingHoursORM(
            id=uuid4(),
            clinic_id=inactive_clinic.id,
            day_of_week=target_date.weekday(),
            open_time="09:00",
            close_time="18:00",
            is_closed=False,
        )
    )

    # Inactive service
    inactive_svc = ServiceORM(
        id=uuid4(),
        slug=f"inactive-{uuid4().hex[:6]}",
        title="Inactive Procedure",
        short_desc="Archived procedure",
        category="General",
        cash_price="Rs. 1,000",
        duration="30m",
        is_active=False,
        is_public=True,
        bookable_online=True,
    )
    test_session.add(inactive_svc)
    await test_session.flush()

    # 1. Inactive branch rejected
    resp_inact_clinic = await client_with_db.post(
        "/api/v1/appointments",
        json={
            "serviceId": str(svc.id),
            "clinicId": str(inactive_clinic.id),
            "teamMemberId": str(doctor.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "10:00 AM",
            "fullName": "Test Patient",
            "phone": "03001112233",
        },
    )
    assert resp_inact_clinic.status_code == 409
    assert "clinic is not active" in resp_inact_clinic.json()["detail"].lower()

    # 2. Inactive service rejected
    resp_inact_svc = await client_with_db.post(
        "/api/v1/appointments",
        json={
            "serviceId": str(inactive_svc.id),
            "clinicId": str(clinic_a.id),
            "teamMemberId": str(doctor.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "10:00 AM",
            "fullName": "Test Patient",
            "phone": "03001112233",
        },
    )
    assert resp_inact_svc.status_code == 409
    assert "not currently bookable" in resp_inact_svc.json()["detail"].lower()


@pytest.mark.asyncio
async def test_negative_reception_path_scope_rejection_and_audit(
    client_with_db, test_session
):
    """Negative: Reception path rejects unauthorized doctor and logs source='reception'."""
    data = await setup_test_environment(test_session)
    clinic_a = data["clinic_a"]
    svc = data["service"]
    doctor = data["doctor"]
    target_date = data["target_date"]

    # Branch offers service, but doctor NOT authorized
    test_session.add(ClinicServiceORM(clinic_id=clinic_a.id, service_id=svc.id, is_active=True))
    await test_session.commit()

    headers = await get_receptionist_headers(test_session, client_with_db)
    resp = await client_with_db.post(
        "/api/v1/reception/appointments",
        headers=headers,
        json={
            "patientFullName": "Kashif Mahmood",
            "patientPhone": "03331122334",
            "patientEmail": "kashif@example.com",
            "serviceId": str(svc.id),
            "clinicId": str(clinic_a.id),
            "teamMemberId": str(doctor.id),
            "preferredDate": target_date.isoformat(),
            "preferredTime": "12:00 PM",
        },
    )
    assert resp.status_code == 409
    assert f"Dr. {doctor.display_name} does not offer" in resp.json()["detail"]

    # Check reception audit log
    log_stmt = select(ActivityLogORM).where(
        ActivityLogORM.action == "booking_rejected_service_scope"
    ).order_by(ActivityLogORM.created_at.desc())
    res = await test_session.execute(log_stmt)
    entry = res.scalars().first()
    assert entry is not None
    details = json.loads(entry.details_json)
    assert details["source"] == "reception"
    assert details["clinic_id"] == str(clinic_a.id)
    assert details["service_id"] == str(svc.id)
    assert details["team_member_id"] == str(doctor.id)


@pytest.mark.asyncio
async def test_audit_failure_does_not_convert_rejection_into_success(
    client_with_db, test_session
):
    """Audit robustness: If activity_logs write throws, the 409 rejection still occurs."""
    data = await setup_test_environment(test_session)
    clinic_a = data["clinic_a"]
    svc = data["service"]
    doctor = data["doctor"]
    target_date = data["target_date"]

    # Branch offers service, doctor NOT authorized
    test_session.add(ClinicServiceORM(clinic_id=clinic_a.id, service_id=svc.id, is_active=True))
    await test_session.commit()

    # Mock logger to verify it handles failure without crashing or turning into 200
    with patch("app.application.services.appointment_service.ActivityLogORM", side_effect=Exception("DB audit error")):
        resp = await client_with_db.post(
            "/api/v1/appointments",
            json={
                "serviceId": str(svc.id),
                "clinicId": str(clinic_a.id),
                "teamMemberId": str(doctor.id),
                "preferredDate": target_date.isoformat(),
                "preferredTime": "10:00 AM",
                "fullName": "Test Patient",
                "phone": "03001239999",
            },
        )
        assert resp.status_code == 409
        assert f"Dr. {doctor.display_name} does not offer" in resp.json()["detail"]
