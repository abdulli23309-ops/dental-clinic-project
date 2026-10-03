from datetime import date, datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text, Uuid, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


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


class UserORM(Base):
    """
    Stores authenticated staff and administrative accounts.
    """
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    hashed_password: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="admin",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    inactivity_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    inactivity_timeout_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=15,
    )
    inactivity_warning_seconds: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=60,
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


class UserSessionORM(Base):
    """
    Tracks active authenticated user sessions for server-side revocation of 7-day access tokens.
    """
    __tablename__ = "user_sessions"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    user_agent: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class RefreshTokenORM(Base):
    """
    Stores issued refresh tokens for rotation, expiration, and server-side revocation.
    """
    __tablename__ = "refresh_tokens"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_id: Mapped[Optional[UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("user_sessions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        nullable=False,
        index=True,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    is_revoked: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    replaced_by: Mapped[Optional[UUID]] = mapped_column(
        Uuid(as_uuid=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class OrganizationORM(Base):
    """
    Stores top-level practice/organization details.
    """
    __tablename__ = "organizations"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    display_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    tagline: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    logo_url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    contact_email: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    contact_phone: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    website_url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
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


class LocationORM(Base):
    """
    Stores practice locations/offices.
    """
    __tablename__ = "locations"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    address_line1: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    address_line2: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    city: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    state: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    postal_code: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    country: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="US",
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    hours_info: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    display_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
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


class TeamMemberORM(Base):
    """
    Stores clinical and administrative team members.
    """
    __tablename__ = "team_members"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    location_id: Mapped[Optional[UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    display_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    professional_title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    specialties_json: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    biography: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    photo_url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    education: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    credentials: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    license_number: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    license_state: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    services_offered: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    display_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
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


class ServiceORM(Base):
    """
    Stores manageable procedures, treatments, pricing, and descriptions.
    """
    __tablename__ = "services"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    slug: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    short_desc: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    full_desc: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    cash_price: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    duration: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    code: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    insurance_note: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    recommended_interval: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
    )
    display_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    is_highlighted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    is_public: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
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


class FaqItemORM(Base):
    """
    Stores FAQ items for public display and admin management.
    """
    __tablename__ = "faq_items"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    question: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    answer: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    display_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
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


class SiteSectionORM(Base):
    """
    Stores structured CMS sections (e.g. 'general', 'homepage', 'about', 'contact', 'footer', 'seo').
    """
    __tablename__ = "site_sections"

    section_key: Mapped[str] = mapped_column(
        String(100),
        primary_key=True,
    )
    content_json: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
