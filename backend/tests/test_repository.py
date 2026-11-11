import pytest
import pytest_asyncio
from datetime import date
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.domain.models.appointment import Appointment, AppointmentStatus
from app.infrastructure.database.orm_models import Base, AppointmentORM
from app.infrastructure.repositories.postgres_appointment_repo import (
    PostgresAppointmentRepository,
)


@pytest_asyncio.fixture
async def db_session():
    """Provides an isolated in-memory relational SQLite database for persistence tests."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_repository_save_and_retrieve(db_session: AsyncSession):
    repo = PostgresAppointmentRepository(db_session)

    appointment = Appointment(
        confirmation_id="MD-2026-3001",
        service_id="cleanings-exams",
        preferred_date=date(2026, 10, 12),
        preferred_time="10:00 AM",
        patient_full_name="Jane Alvarez",
        patient_phone="(312) 555-0100",
        patient_email="jane@example.com",
        notes="Slight molar sensitivity",
        utm_source="google",
        utm_campaign="lincoln-park",
    )

    saved = await repo.save(appointment)
    await db_session.commit()

    assert saved.confirmation_id == "MD-2026-3001"
    assert saved.status == AppointmentStatus.REQUESTED

    # Retrieve by confirmation ID
    retrieved = await repo.get_by_confirmation_id("MD-2026-3001")
    assert retrieved is not None
    assert retrieved.id == appointment.id
    assert retrieved.patient_full_name == "Jane Alvarez"

    # Retrieve by UUID
    retrieved_by_id = await repo.get_by_id(appointment.id)
    assert retrieved_by_id is not None
    assert retrieved_by_id.confirmation_id == "MD-2026-3001"


@pytest.mark.asyncio
async def test_repository_unique_constraint_enforcement(db_session: AsyncSession):
    """
    Verifies that the database rejects duplicate confirmation_ids at the database level.
    """
    repo = PostgresAppointmentRepository(db_session)

    apt1 = Appointment(
        confirmation_id="MD-2026-DUP1",
        service_id="whitening",
        preferred_date=date(2026, 10, 15),
        preferred_time="1:30 PM",
        patient_full_name="Alice Smith",
        patient_phone="3125551111",
        patient_email="alice@example.com",
    )
    await repo.save(apt1)
    await db_session.commit()

    # Second appointment with the identical confirmation_id
    apt2 = Appointment(
        confirmation_id="MD-2026-DUP1",
        service_id="emergency",
        preferred_date=date(2026, 10, 16),
        preferred_time="8:30 AM",
        patient_full_name="Bob Jones",
        patient_phone="3125552222",
        patient_email="bob@example.com",
    )

    # Directly adding the second ORM object with identical confirmation_id must fail unique constraint
    db_session.add(PostgresAppointmentRepository._to_orm(apt2))
    with pytest.raises(IntegrityError):
        await db_session.commit()


def test_user_repository_role_mapping_and_fail_closed(caplog):
    """
    Verifies that PostgresUserRepository._to_domain correctly maps all canonical
    role strings and aliases (including front_desk), while safely failing closed
    to UserRole.PATIENT for any unrecognized, null, or empty string.
    """
    from uuid import uuid4
    import logging
    from app.domain.models.user import UserRole
    from app.infrastructure.database.orm_models import UserORM
    from app.infrastructure.repositories.postgres_user_repo import PostgresUserRepository

    def create_mock_orm(role_str):
        return UserORM(
            id=uuid4(),
            email="test@example.com",
            hashed_password="hash",
            full_name="Test User",
            role=role_str,
            is_active=True,
        )

    # 1. Canonical and alias mapping verification
    expected_mappings = [
        ("admin", UserRole.ADMIN),
        ("Admin", UserRole.ADMIN),
        ("practice manager", UserRole.PRACTICE_MANAGER),
        ("practice_manager", UserRole.PRACTICE_MANAGER),
        ("receptionist", UserRole.RECEPTIONIST),
        ("front_desk", UserRole.FRONT_DESK),
        ("front desk", UserRole.FRONT_DESK),
        ("FRONT_DESK", UserRole.FRONT_DESK),
        ("doctor", UserRole.DOCTOR),
        ("DOCTOR", UserRole.DOCTOR),
        ("nurse", UserRole.NURSE),
        ("dental assistant", UserRole.DENTAL_ASSISTANT),
        ("dental_assistant", UserRole.DENTAL_ASSISTANT),
        ("cleaner", UserRole.CLEANER),
        ("sterilization tech", UserRole.STERILIZATION_TECH),
        ("sterilization_tech", UserRole.STERILIZATION_TECH),
        ("patient", UserRole.PATIENT),
        ("platform owner", UserRole.PLATFORM_OWNER),
        ("platform_owner", UserRole.PLATFORM_OWNER),
        ("super admin", UserRole.SUPER_ADMIN),
        ("super_admin", UserRole.SUPER_ADMIN),
        ("clinic branch manager", UserRole.CLINIC_BRANCH_MANAGER),
        ("clinic_branch_manager", UserRole.CLINIC_BRANCH_MANAGER),
    ]

    for role_input, expected_role in expected_mappings:
        orm = create_mock_orm(role_input)
        domain = PostgresUserRepository._to_domain(orm)
        assert domain.role == expected_role, f"Failed mapping for role '{role_input}'"

    # 2. Fail closed verification for unrecognized roles -> MUST be PATIENT, never ADMIN
    unrecognized_roles = ["attacker", "guest", "unknown_role", "owner", "dentist", "hygienist", "staff", "root"]
    with caplog.at_level(logging.WARNING):
        for unk in unrecognized_roles:
            orm = create_mock_orm(unk)
            domain = PostgresUserRepository._to_domain(orm)
            assert domain.role == UserRole.PATIENT, f"Unrecognized role '{unk}' must fail closed to PATIENT"

    # 3. Fail closed verification for None, empty, and whitespace
    with caplog.at_level(logging.WARNING):
        for empty_val in [None, "", "   ", "\t"]:
            orm = create_mock_orm(empty_val)
            domain = PostgresUserRepository._to_domain(orm)
            assert domain.role == UserRole.PATIENT, f"Empty/null role '{empty_val}' must fail closed to PATIENT"
