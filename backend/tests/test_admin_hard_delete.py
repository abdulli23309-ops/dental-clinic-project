import uuid
from datetime import date, datetime, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.infrastructure.database.orm_models import (
    BookingORM,
    ClinicalEncounterORM,
    ClinicalNoteORM,
    ClinicalNoteTemplateORM,
    DentalProcedureORM,
    FaqItemORM,
    RoleORM,
    ServiceORM,
    TeamMemberORM,
    UserORM,
)


@pytest.mark.asyncio
async def test_hard_delete_service_clean_and_conflict(client_with_db: AsyncClient, test_session: AsyncSession, admin_auth):
    headers = admin_auth["headers"]

    # 1. Create a service
    clean_service = ServiceORM(
        id=uuid.uuid4(),
        title="Test Clean Service",
        slug="test-clean-service",
        category="General",
        short_desc="Clean service short description",
        duration=30,
        cash_price=50.0,
        is_active=True,
    )
    test_session.add(clean_service)
    await test_session.commit()

    # 2. Delete clean service -> 204
    del_resp = await client_with_db.delete(f"/api/v1/admin/services/{clean_service.id}", headers=headers)
    assert del_resp.status_code == 204

    # 3. Create service linked to a dental procedure
    conflict_service = ServiceORM(
        id=uuid.uuid4(),
        title="Test Conflict Service",
        slug="test-conflict-service",
        category="General",
        short_desc="Conflict service short description",
        duration=45,
        cash_price=100.0,
        is_active=True,
    )
    test_session.add(conflict_service)
    await test_session.flush()

    encounter = ClinicalEncounterORM(
        id=uuid.uuid4(),
        patient_id=uuid.uuid4(),
        clinic_id=uuid.uuid4(),
        clinician_id=uuid.uuid4(),
        status="completed",
    )
    test_session.add(encounter)
    await test_session.flush()

    procedure = DentalProcedureORM(
        id=uuid.uuid4(),
        patient_id=encounter.patient_id,
        clinic_id=encounter.clinic_id,
        encounter_id=encounter.id,
        service_id=conflict_service.id,
        recorded_by_id=uuid.uuid4(),
        tooth="11",
        surfaces="MOD",
        status="in_progress",
    )
    test_session.add(procedure)
    await test_session.commit()

    # 4. Attempt delete -> 409 Conflict
    conflict_resp = await client_with_db.delete(f"/api/v1/admin/services/{conflict_service.id}", headers=headers)
    assert conflict_resp.status_code == 409
    assert "referenced in patient clinical procedures" in conflict_resp.json()["detail"]


@pytest.mark.asyncio
async def test_hard_delete_team_member_clean_and_conflict(client_with_db: AsyncClient, test_session: AsyncSession, admin_auth):
    headers = admin_auth["headers"]

    # 1. Create a clean team member
    clean_tm = TeamMemberORM(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        first_name="Alice",
        last_name="Surgeon",
        display_name="Dr. Alice Surgeon",
        professional_title="Oral Surgeon",
        role="Doctor",
        is_active=True,
    )
    test_session.add(clean_tm)
    await test_session.commit()

    # 2. Delete clean team member -> 204
    del_resp = await client_with_db.delete(f"/api/v1/admin/team/{clean_tm.id}", headers=headers)
    assert del_resp.status_code == 204

    # 3. Create team member with clinical encounter
    conflict_tm = TeamMemberORM(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        first_name="Bob",
        last_name="Doctor",
        display_name="Dr. Bob Doctor",
        professional_title="Dentist",
        role="Doctor",
        is_active=True,
    )
    test_session.add(conflict_tm)
    await test_session.flush()

    encounter = ClinicalEncounterORM(
        id=uuid.uuid4(),
        patient_id=uuid.uuid4(),
        clinic_id=uuid.uuid4(),
        clinician_id=conflict_tm.id,
        status="completed",
    )
    test_session.add(encounter)
    await test_session.commit()

    # 4. Attempt delete -> 409 Conflict
    conflict_resp = await client_with_db.delete(f"/api/v1/admin/team/{conflict_tm.id}", headers=headers)
    assert conflict_resp.status_code == 409
    assert "clinical encounters" in conflict_resp.json()["detail"]


@pytest.mark.asyncio
async def test_hard_delete_role_guards(client_with_db: AsyncClient, test_session: AsyncSession, admin_auth):
    headers = admin_auth["headers"]

    # 1. Custom role with no users -> delete with hard=true -> 200 or 204
    custom_role = RoleORM(
        id=uuid.uuid4(),
        name="Temporary Volunteer",
        display_name="Volunteer",
        description="Volunteer helper",
        is_system=False,
        is_active=True,
    )
    test_session.add(custom_role)
    await test_session.commit()

    del_resp = await client_with_db.delete(f"/api/v1/admin/roles/{custom_role.id}?hard=true", headers=headers)
    assert del_resp.status_code in (200, 204)

    # 2. System role -> cannot delete even with hard=true -> 400
    system_role = RoleORM(
        id=uuid.uuid4(),
        name="Core Administrator",
        display_name="Core Admin",
        description="System core",
        is_system=True,
        is_active=True,
    )
    test_session.add(system_role)
    await test_session.commit()

    sys_resp = await client_with_db.delete(f"/api/v1/admin/roles/{system_role.id}?hard=true", headers=headers)
    assert sys_resp.status_code == 400
    assert "System roles cannot be deleted" in sys_resp.json()["detail"]

    # 3. Role assigned to active user -> 409 Conflict
    assigned_role = RoleORM(
        id=uuid.uuid4(),
        name="Specialized Tech",
        display_name="Specialized Tech",
        description="Tech role",
        is_system=False,
        is_active=True,
    )
    test_session.add(assigned_role)
    await test_session.flush()

    user_with_role = UserORM(
        id=uuid.uuid4(),
        email="tech@marlowdental.com",
        hashed_password=hash_password("Tech12345!"),
        full_name="Tech User",
        role="Specialized Tech",
        is_active=True,
    )
    test_session.add(user_with_role)
    await test_session.commit()

    assigned_resp = await client_with_db.delete(f"/api/v1/admin/roles/{assigned_role.id}?hard=true", headers=headers)
    assert assigned_resp.status_code == 409
    assert "assigned to it" in assigned_resp.json()["detail"]


@pytest.mark.asyncio
async def test_hard_delete_users_and_bulk_delete(client_with_db: AsyncClient, test_session: AsyncSession, admin_auth):
    headers = admin_auth["headers"]
    current_admin = admin_auth["user"]

    # 1. Attempt self-deletion -> 400
    self_resp = await client_with_db.delete(f"/api/v1/admin/users/{current_admin.id}", headers=headers)
    assert self_resp.status_code == 400
    assert "cannot delete your own" in self_resp.json()["detail"].lower()

    # 2. Create clean user and delete -> 204
    clean_user = UserORM(
        id=uuid.uuid4(),
        email="delete_target@marlowdental.com",
        hashed_password=hash_password("Pass12345!"),
        full_name="Target User",
        role="receptionist",
        is_active=True,
    )
    test_session.add(clean_user)
    await test_session.commit()

    del_resp = await client_with_db.delete(f"/api/v1/admin/users/{clean_user.id}", headers=headers)
    assert del_resp.status_code == 204

    # 3. User with signed clinical notes -> 409
    doctor_user = UserORM(
        id=uuid.uuid4(),
        email="dr_signed@marlowdental.com",
        hashed_password=hash_password("Pass12345!"),
        full_name="Dr. Signed",
        role="doctor",
        is_active=True,
    )
    test_session.add(doctor_user)
    await test_session.flush()

    encounter = ClinicalEncounterORM(
        id=uuid.uuid4(),
        patient_id=uuid.uuid4(),
        clinic_id=uuid.uuid4(),
        clinician_id=uuid.uuid4(),
        status="completed",
    )
    test_session.add(encounter)
    await test_session.flush()

    note = ClinicalNoteORM(
        id=uuid.uuid4(),
        encounter_id=encounter.id,
        patient_id=encounter.patient_id,
        clinic_id=encounter.clinic_id,
        author_id=doctor_user.id,
        is_signed=True,
        signed_by_id=doctor_user.id,
        status="signed",
    )
    test_session.add(note)
    await test_session.commit()

    doc_del_resp = await client_with_db.delete(f"/api/v1/admin/users/{doctor_user.id}", headers=headers)
    assert doc_del_resp.status_code == 409
    assert "clinical notes" in doc_del_resp.json()["detail"].lower()

    # 4. Bulk delete clean users
    u1 = UserORM(
        id=uuid.uuid4(),
        email="bulk1@marlowdental.com",
        hashed_password=hash_password("Pass12345!"),
        full_name="Bulk One",
        role="receptionist",
        is_active=True,
    )
    u2 = UserORM(
        id=uuid.uuid4(),
        email="bulk2@marlowdental.com",
        hashed_password=hash_password("Pass12345!"),
        full_name="Bulk Two",
        role="receptionist",
        is_active=True,
    )
    test_session.add_all([u1, u2])
    await test_session.commit()

    bulk_resp = await client_with_db.post(
        "/api/v1/admin/users/bulk-delete",
        json={"userIds": [str(u1.id), str(u2.id)]},
        headers=headers,
    )
    assert bulk_resp.status_code == 200
    assert bulk_resp.json()["deleted"] == 2


@pytest.mark.asyncio
async def test_hard_delete_clinical_note_template(client_with_db: AsyncClient, test_session: AsyncSession, admin_auth):
    headers = admin_auth["headers"]

    tpl = ClinicalNoteTemplateORM(
        id=uuid.uuid4(),
        name="Temporary Hygiene Note Template",
        subjective="Subjective notes",
        objective="Objective findings",
        assessment="Assessment",
        plan="Plan",
        active=True,
    )
    test_session.add(tpl)
    await test_session.commit()

    del_resp = await client_with_db.delete(f"/api/v1/clinical-note-templates/{tpl.id}", headers=headers)
    assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_hard_delete_faq(client_with_db: AsyncClient, test_session: AsyncSession, admin_auth):
    headers = admin_auth["headers"]

    faq = FaqItemORM(
        id=uuid.uuid4(),
        question="What are your opening hours?",
        answer="We are open Monday to Saturday from 9am to 6pm.",
        category="General",
        display_order=1,
        is_active=True,
    )
    test_session.add(faq)
    await test_session.commit()

    del_resp = await client_with_db.delete(f"/api/v1/admin/faq/{faq.id}", headers=headers)
    assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_hard_delete_appointment_clean_and_conflict(client_with_db: AsyncClient, test_session: AsyncSession, admin_auth):
    headers = admin_auth["headers"]

    # 1. Create clean booking
    clean_booking = BookingORM(
        id=uuid.uuid4(),
        confirmation_id="CONF-CLEAN-01",
        patient_full_name="Test Patient",
        patient_phone="+441234567890",
        service_id=str(uuid.uuid4()),
        preferred_date=date.today(),
        preferred_time="10:00",
        status="pending",
    )
    test_session.add(clean_booking)
    await test_session.commit()

    # 2. Delete clean appointment -> 204
    del_resp = await client_with_db.delete(f"/api/v1/appointments/{clean_booking.id}", headers=headers)
    assert del_resp.status_code == 204

    # 3. Create booking attached to clinical encounter
    conflict_booking = BookingORM(
        id=uuid.uuid4(),
        confirmation_id="CONF-CONFLICT-01",
        patient_full_name="Encounter Patient",
        patient_phone="+441234567891",
        service_id=str(uuid.uuid4()),
        preferred_date=date.today(),
        preferred_time="11:00",
        status="confirmed",
    )
    test_session.add(conflict_booking)
    await test_session.flush()

    encounter = ClinicalEncounterORM(
        id=uuid.uuid4(),
        patient_id=uuid.uuid4(),
        clinic_id=uuid.uuid4(),
        clinician_id=uuid.uuid4(),
        booking_id=conflict_booking.id,
        status="completed",
    )
    test_session.add(encounter)
    await test_session.commit()

    # 4. Attempt delete -> 409 Conflict
    conflict_resp = await client_with_db.delete(f"/api/v1/appointments/{conflict_booking.id}", headers=headers)
    assert conflict_resp.status_code == 409
    assert "clinical encounters" in conflict_resp.json()["detail"]
