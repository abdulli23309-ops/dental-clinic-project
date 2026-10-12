from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class PublicBookingStatusResponse(BaseModel):
    mode: str = Field(description="'open', 'paused', or 'closed'")
    message: Optional[str] = Field(default=None, description="Optional public notice message")
    phone: Optional[str] = Field(default=None, description="Clinic telephone number")
    resumeOn: Optional[date] = Field(default=None, description="Optional expected resume date")


class WorkingHoursDto(BaseModel):
    id: UUID
    dayOfWeek: int
    dayName: str
    openTime: Optional[str] = None
    closeTime: Optional[str] = None
    isClosed: bool


class WorkingHoursUpdateRequest(BaseModel):
    id: UUID
    openTime: Optional[str] = None
    closeTime: Optional[str] = None
    isClosed: bool


class ClinicClosureDto(BaseModel):
    id: UUID
    startDate: date
    endDate: date
    reason: str
    message: Optional[str] = None
    createdAt: Optional[datetime] = None


class ClinicClosureCreateRequest(BaseModel):
    startDate: date
    endDate: date
    reason: str
    message: Optional[str] = None


class ClinicClosureUpdateRequest(BaseModel):
    startDate: date
    endDate: date
    reason: str
    message: Optional[str] = None


class AffectedBookingDto(BaseModel):
    id: UUID
    confirmationId: str
    patientFullName: str
    patientPhone: str
    patientEmail: Optional[str] = None
    preferredDate: date
    preferredTime: str
    serviceId: Optional[str] = None
    status: str


class BookingSettingsResponse(BaseModel):
    id: UUID
    bookingMode: str
    pauseMessage: Optional[str] = None
    pauseStartedAt: Optional[datetime] = None
    pauseStartedByUserId: Optional[UUID] = None
    resumeOn: Optional[date] = None
    advanceBookingDays: int
    slotIntervalMinutes: int
    isResumePassed: bool = False


class BookingModeUpdateRequest(BaseModel):
    mode: str = Field(pattern="^(open|paused|closed)$")
    message: Optional[str] = None
    resumeOn: Optional[date] = None


class BookingModeUpdateResponse(BaseModel):
    settings: BookingSettingsResponse
    affectedBookings: List[AffectedBookingDto]


class CreateClosureResponse(BaseModel):
    closure: ClinicClosureDto
    affectedBookings: List[AffectedBookingDto]


class RescheduleTasksRequest(BaseModel):
    bookingIds: List[UUID]


class RescheduleTasksResponse(BaseModel):
    tasksCreated: int
    taskIds: List[UUID]
