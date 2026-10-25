from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, model_validator


class PublicBookingStatusResponse(BaseModel):
    mode: str = Field(description="'open', 'paused', or 'closed'")
    message: Optional[str] = Field(default=None, description="Optional public notice message")
    phone: Optional[str] = Field(default=None, description="Clinic telephone number")
    resumeOn: Optional[date] = Field(default=None, description="Optional expected resume date")


class WorkingHoursDto(BaseModel):
    id: UUID
    clinicId: Optional[UUID] = None
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
    minLeadTimeHours: int = 2
    slotIntervalMinutes: int = 15
    reminderTemplate: Optional[str] = None
    waitingThresholdMinutes: int = 15
    fileNumberPrefix: Optional[str] = "MD-"
    paymentsEnabled: bool = False
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


class OnlineBookingRulesUpdateRequest(BaseModel):
    slotIntervalMinutes: int = Field(default=15, ge=5, le=120)
    minLeadTimeHours: int = Field(default=2, ge=0, le=48)
    advanceBookingDays: int = Field(default=60, ge=1, le=365)
    reminderTemplate: Optional[str] = None
    waitingThresholdMinutes: int = Field(default=15, ge=1, le=180)
    fileNumberPrefix: Optional[str] = Field(default="MD-", max_length=20)
    paymentsEnabled: Optional[bool] = None


class ReminderTemplateUpdateRequest(BaseModel):
    template: str = Field(..., max_length=2000)


class ProviderAvailabilityDto(BaseModel):
    id: UUID
    teamMemberId: UUID
    clinicId: Optional[UUID] = None
    dayOfWeek: int
    dayName: str
    startTime: str
    endTime: str
    breakStartTime: Optional[str] = None
    breakEndTime: Optional[str] = None
    isActive: bool


class ProviderAvailabilityCreateRequest(BaseModel):
    teamMemberId: UUID
    clinicId: Optional[UUID] = None
    dayOfWeek: int
    startTime: str
    endTime: str
    breakStartTime: Optional[str] = None
    breakEndTime: Optional[str] = None
    isActive: bool = True


class ProviderTimeOffDto(BaseModel):
    id: UUID
    teamMemberId: UUID
    startDate: date
    endDate: date
    reason: str
    isApproved: bool


class ProviderTimeOffCreateRequest(BaseModel):
    teamMemberId: UUID
    startDate: date
    endDate: date
    reason: str
    isApproved: bool = True


class SetServiceProvidersRequest(BaseModel):
    teamMemberIds: List[UUID]


class PublicAvailabilityResponse(BaseModel):
    date: date
    serviceId: Optional[str] = None
    teamMemberId: Optional[UUID] = None
    clinicId: Optional[UUID] = None
    timezone: str = "Asia/Karachi"
    slots: List[str]


class CreateProviderTimeOffResponse(BaseModel):
    timeOff: ProviderTimeOffDto
    affectedBookings: List[AffectedBookingDto]


class CreateProviderAvailabilityResponse(BaseModel):
    availability: ProviderAvailabilityDto
    affectedBookings: List[AffectedBookingDto]


class BookingFlowSettingsDto(BaseModel):
    id: UUID
    organizationId: UUID
    followupGapsMinutes: List[int]
    maxAttempts: int
    coldWaitHours: int
    holdMinutes: int
    fallbackOwnerUserId: Optional[UUID] = None
    autoConfirmOnline: bool
    daysShown: int
    showPatientsTreated: bool
    leadCaptureNotice: str


class BookingFlowSettingsUpdateRequest(BaseModel):
    followupGapsMinutes: List[int] = Field(..., description="Minutes between automated recovery attempts")
    maxAttempts: int = Field(..., gt=0, description="Maximum number of contact attempts before cold")
    coldWaitHours: int = Field(..., gt=0, description="Hours of silence before transitioning to cold")
    holdMinutes: int = Field(..., gt=0, description="Duration of call desk lock on lead")
    fallbackOwnerUserId: Optional[UUID] = Field(default=None, description="Staff user ID to assign cold/failed tasks")
    autoConfirmOnline: bool = Field(default=True, description="Instantly confirm web bookings")
    daysShown: int = Field(..., gt=0, description="Number of days shown in doctor booking horizon")
    showPatientsTreated: bool = Field(default=True, description="Global visibility of patients treated badges")
    leadCaptureNotice: str = Field(..., min_length=5, description="Disclosure notice displayed at phone capture")

    @model_validator(mode="after")
    def validate_settings(self) -> "BookingFlowSettingsUpdateRequest":
        if len(self.followupGapsMinutes) != self.maxAttempts:
            raise ValueError(f"followupGapsMinutes length ({len(self.followupGapsMinutes)}) must equal maxAttempts ({self.maxAttempts}).")
        for g in self.followupGapsMinutes:
            if g <= 0:
                raise ValueError("All followup gap intervals must be positive integers.")
        if not self.leadCaptureNotice.strip():
            raise ValueError("leadCaptureNotice cannot be empty.")
        return self


class StaffUserPickerItem(BaseModel):
    id: UUID
    fullName: str
    email: str
    role: str


class BookabilityCheckItem(BaseModel):
    serviceId: UUID
    serviceSlug: str
    serviceTitle: str
    category: str
    isActive: bool
    isBookableOnline: bool
    isEligible: bool
    status: str
    reasons: List[str]
    reasonMessages: List[str]
    fixLink: str
    eligibleClinicsCount: int
    eligibleDoctorsCount: int
    firstAvailableDate: Optional[str] = None
    firstAvailableSlot: Optional[str] = None


class BookabilityCheckResponse(BaseModel):
    totalServices: int
    bookableServices: int
    unbookableServices: int
    items: List[BookabilityCheckItem]



