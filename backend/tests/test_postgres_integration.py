"""
Integration tests verifying PostgreSQL database connectivity and repository operations.

These tests run against the local PostgreSQL development database (marlow_dental_dev)
using the application's actual async engine and SQLAlchemy configuration.
"""
from datetime import date
import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.database import check_database_health
from app.domain.models.appointment import Appointment, AppointmentStatus
from app.infrastructure.database.orm_models import AppointmentORM
from app.infrastructure.repositories.postgres_appointment_repo import (
    PostgresAppointmentRepository,
)


@pytest_asyncio.fixture
async def pg_session():
    """
    Provides a real PostgreSQL database session for integration testing.

    Rolls back or cleans up inserted test records so the development database
    remains completely clean after each test run.
    """
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        yield session
        # Clean up any test records inserted with the test prefix
        await session.execute(
            text("DELETE FROM appointments WHERE confirmation_id LIKE 'TEST-%'")
        )
        await session.commit()

    await engine.dispose()


@pytest.mark.asyncio
async def test_postgres_connectivity():
    """
    Verifies that the application can connect to the running PostgreSQL server.
    """
    is_connected = await check_database_health()
    assert is_connected is True, "PostgreSQL database health check must succeed."


@pytest.mark.asyncio
async def test_postgres_appointment_persistence(pg_session: AsyncSession):
    """
    Tests saving and retrieving a full appointment record in PostgreSQL.

    Verifies that UUID primary keys, timezone-aware timestamps, and flat relational columns
    are accurately stored and retrieved.
    """
    repo = PostgresAppointmentRepository(pg_session)
    test_confirmation_id = "TEST-2026-9001"

    appointment = Appointment(
        confirmation_id=test_confirmation_id,
        service_id="cleanings-exams",
        preferred_date=date(2026, 11, 20),
        preferred_time="10:00 AM",
        patient_full_name="Integration Test Patient",
        patient_phone="(312) 555-0999",
        patient_email="integration.test@example.com",
        has_insurance=True,
        insurance_provider="Delta Dental PPO",
        notes="Integration test notes",
        utm_source="test_runner",
        utm_campaign="dev_test",
    )

    saved = await repo.save(appointment)
    await pg_session.commit()

    assert saved.confirmation_id == test_confirmation_id
    assert saved.status == AppointmentStatus.REQUESTED

    # Query back from PostgreSQL by confirmation ID
    retrieved = await repo.get_by_confirmation_id(test_confirmation_id)
    assert retrieved is not None
    assert retrieved.id == appointment.id
    assert retrieved.patient_full_name == "Integration Test Patient"
    assert retrieved.service_id == "cleanings-exams"
    assert retrieved.has_insurance is True
    assert retrieved.insurance_provider == "Delta Dental PPO"


@pytest.mark.asyncio
async def test_postgres_unique_constraint(pg_session: AsyncSession):
    """
    Verifies that PostgreSQL enforces the unique constraint on confirmation_id.

    Attempting to persist two records with the identical confirmation_id must fail
    with an IntegrityError raised directly by the PostgreSQL engine.
    """
    repo = PostgresAppointmentRepository(pg_session)
    dup_id = "TEST-2026-DUP"

    apt1 = Appointment(
        confirmation_id=dup_id,
        service_id="invisalign",
        preferred_date=date(2026, 11, 21),
        preferred_time="1:30 PM",
        patient_full_name="Test Patient One",
        patient_phone="(312) 555-0101",
        patient_email="p1@example.com",
    )
    await repo.save(apt1)
    await pg_session.commit()

    apt2 = Appointment(
        confirmation_id=dup_id,
        service_id="emergency",
        preferred_date=date(2026, 11, 22),
        preferred_time="8:30 AM",
        patient_full_name="Test Patient Two",
        patient_phone="(312) 555-0102",
        patient_email="p2@example.com",
    )
    pg_session.add(PostgresAppointmentRepository._to_orm(apt2))
    with pytest.raises(IntegrityError):
        await pg_session.commit()
    await pg_session.rollback()
