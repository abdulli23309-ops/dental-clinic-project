from datetime import date
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PublicLeadCaptureRequest(BaseModel):
    fullName: str = Field(..., min_length=2, max_length=100, description="Lead contact full name")
    phone: str = Field(..., min_length=10, max_length=30, description="Lead contact phone number")
    email: Optional[str] = Field(default=None, max_length=150, description="Optional lead email address")
    noticeVersion: Optional[str] = Field(default=None, max_length=50, description="Consent notice version shown to lead")
    hp: Optional[str] = Field(default=None, max_length=100, description="Honeypot anti-spam trap")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        clean = v.strip().lower()
        if "@" not in clean or "." not in clean.split("@")[-1]:
            raise ValueError("Invalid email format")
        return clean

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean = v.strip()
        digits = "".join(c for c in clean if c.isdigit())
        if len(digits) < 10:
            raise ValueError("Phone number must contain at least 10 digits")
        return clean


class PublicLeadCaptureResponse(BaseModel):
    captureToken: str = Field(..., description="Opaque session token to resume or update the booking lead")

    model_config = ConfigDict(populate_by_name=True)


class PublicLeadUpdateRequest(BaseModel):
    captureToken: Optional[str] = Field(default=None, description="Optional capture token if passed in body")
    serviceId: Optional[str] = Field(default=None, description="Selected service ID or slug")
    service: Optional[str] = Field(default=None, description="Selected service ID or slug alias")
    clinicId: Optional[UUID] = Field(default=None, description="Selected clinic branch ID")
    clinic: Optional[UUID] = Field(default=None, description="Selected clinic branch ID alias")
    teamMemberId: Optional[UUID] = Field(default=None, description="Selected doctor / clinician ID")
    doctor: Optional[UUID] = Field(default=None, description="Selected doctor / clinician ID alias")
    doctorId: Optional[UUID] = Field(default=None, description="Selected doctor / clinician ID alias")
    notes: Optional[str] = Field(default=None, max_length=1000, description="Patient notes or symptoms")
    email: Optional[str] = Field(default=None, max_length=150, description="Optional email address")
    name: Optional[str] = Field(default=None, max_length=255, description="Full name (filled only if currently empty)")
    fullName: Optional[str] = Field(default=None, max_length=255, description="Full name (filled only if currently empty)")
    phone: Optional[str] = Field(default=None, max_length=50, description="Phone number (filled only if currently empty)")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        clean = v.strip().lower()
        if "@" not in clean or "." not in clean.split("@")[-1]:
            raise ValueError("Invalid email format")
        return clean


class PublicLeadUpdateResponse(BaseModel):
    success: bool = True
    captureToken: str

    model_config = ConfigDict(populate_by_name=True)


class PublicBookingServiceItemDto(BaseModel):
    id: UUID
    slug: str
    title: str
    shortDesc: Optional[str] = None
    fullDesc: Optional[str] = None
    category: Optional[str] = None
    duration: Optional[str] = None
    cashPrice: Optional[str] = None
    displayOrder: int = 0
    isHighlighted: bool = False

    model_config = ConfigDict(populate_by_name=True)


class PublicBookingClinicItemDto(BaseModel):
    id: UUID
    name: str
    addressLine1: str
    addressLine2: Optional[str] = None
    city: str
    state: str
    postalCode: Optional[str] = None
    firstAvailableDate: Optional[date] = None

    model_config = ConfigDict(populate_by_name=True)


class WeeklyScheduleItemDto(BaseModel):
    dayOfWeek: int
    dayName: str
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    isWorking: bool = True

    model_config = ConfigDict(populate_by_name=True)


class PublicBookingDoctorItemDto(BaseModel):
    id: UUID
    displayName: str
    professionalTitle: str
    role: str
    biography: Optional[str] = None
    photoUrl: Optional[str] = None
    specialties: List[str] = Field(default_factory=list)
    education: Optional[str] = None
    patientsTreated: Optional[int] = None
    weeklySchedule: List[WeeklyScheduleItemDto] = Field(default_factory=list)
    weeklyScheduleSummary: Optional[str] = None
    slotsByDate: Dict[str, List[str]] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)
