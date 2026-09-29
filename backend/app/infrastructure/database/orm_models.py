from datetime import date, datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, DateTime, Index, String, Text, Uuid, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy database table definitions in the application."""
    pass


class AppointmentORM(Base):
    """
    Defines the exact structure of the 'appointments' table in the PostgreSQL database.

    Each attribute corresponds to a database column with specific data types, indexes,
    and rules to keep records organized and fast to search.
    """

    __tablename__ = "appointments"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    confirmation_id: Mapped[str] = mapped_column(
        Text,
        unique=True,
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="requested",
    )
    service_id: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    preferred_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )
    preferred_time: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    patient_full_name: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    patient_phone: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    patient_email: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    has_insurance: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    insurance_provider: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    utm_source: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    utm_campaign: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    staff_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        Index(
            "ix_appointments_status_created_at",
            "status",
            created_at.desc(),
        ),
    )
