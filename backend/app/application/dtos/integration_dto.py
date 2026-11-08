from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------
# Admin Integration Client Management DTOs
# ---------------------------------------------------------

class IntegrationClientResponseDto(BaseModel):
    id: UUID
    name: str
    keyPrefix: str
    scopes: List[str]
    isActive: bool
    lastUsedAt: Optional[datetime] = None
    ipAllowlist: Optional[List[str]] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


class IntegrationClientCreateRequestDto(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    scopes: List[str] = Field(default_factory=list)
    ipAllowlist: Optional[List[str]] = None


class IntegrationClientCreatedResponseDto(BaseModel):
    client: IntegrationClientResponseDto
    rawKey: str = Field(..., description="The complete random 32-byte API key. Shown once only.")
    warning: str = "This key will never be shown again. Store it securely."


class IntegrationClientRotateResponseDto(BaseModel):
    client: IntegrationClientResponseDto
    rawKey: str = Field(..., description="The new random 32-byte API key. Shown once only.")
    warning: str = "This new key will never be shown again. Store it securely."


# ---------------------------------------------------------
# Integration Endpoints DTOs (/api/v1/integration)
# ---------------------------------------------------------

class IntegrationLeadCaptureRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    phone: str = Field(..., min_length=7, max_length=25)
    email: Optional[str] = None
    notes: Optional[str] = None
    source: str = Field(default="whatsapp_message", description="Lead source e.g. whatsapp_message, whatsapp_missed_call, phone_missed_call, manual")


class IntegrationLeadResponse(BaseModel):
    id: UUID
    name: str
    phoneNormalized: str
    status: str
    source: str
    attempts: int
    lastContactedAt: Optional[datetime] = None
    nextAttemptAt: Optional[datetime] = None
    createdAt: datetime


class IntegrationLeadAttemptRequest(BaseModel):
    channel: str = Field(default="whatsapp", description="whatsapp, sms, call")
    result: str = Field(..., description="no_answer, busy, voicemail, callback_requested, not_interested, answered")
    notes: Optional[str] = None


class IntegrationLeadAttemptResponse(BaseModel):
    leadId: UUID
    status: str
    attempts: int
    lastContactedAt: Optional[datetime] = None
    nextAttemptAt: Optional[datetime] = None
    message: str


class IntegrationDueLeadItemDto(BaseModel):
    id: UUID
    name: str
    phoneNormalized: str
    source: str
    status: str
    attempts: int
    lastContactedAt: Optional[datetime] = None
    nextAttemptAt: Optional[datetime] = None
    notes: Optional[str] = None
    createdAt: datetime


class IntegrationDueLeadsResponse(BaseModel):
    count: int
    leads: List[IntegrationDueLeadItemDto]


class IntegrationRecordMessageRequest(BaseModel):
    direction: str = Field(..., description="'inbound' or 'outbound'")
    channel: str = Field(default="whatsapp", description="'whatsapp', 'sms'")
    purpose: str = Field(..., description="'lead_recovery', 'booking_confirmation', 'appointment_reminder', 'recall', 'ad_hoc'")
    recipientPhone: str = Field(..., min_length=7, max_length=25)
    body: str = Field(..., min_length=1)
    provider: str = Field(default="simulated", description="'twilio', 'meta', 'infobip', 'simulated'")
    providerMessageId: Optional[str] = Field(None, description="External message ID for deduplication")
    leadId: Optional[UUID] = None
    bookingId: Optional[UUID] = None
    patientId: Optional[UUID] = None


class IntegrationRecordMessageResponse(BaseModel):
    id: UUID
    direction: str
    channel: str
    purpose: str
    recipientPhone: str
    status: str
    deduplicated: bool = False
    providerMessageId: Optional[str] = None
    createdAt: datetime


class IntegrationLeadStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="'unconverted', 'converted', 'patient', 'cold', 'failed_conversion', 'archived'")
    notes: Optional[str] = None


class IntegrationFailedConversionRequest(BaseModel):
    reason: Optional[str] = "Automation exhausted all contact attempts without booking"


class IntegrationPriorChoicesDto(BaseModel):
    clinicId: Optional[UUID] = None
    clinicName: Optional[str] = None
    serviceId: Optional[str] = None
    serviceName: Optional[str] = None
    doctorId: Optional[UUID] = None
    doctorName: Optional[str] = None


class IntegrationPatientLookupDto(BaseModel):
    id: UUID
    fullName: str
    phone: str


class IntegrationUpcomingBookingDto(BaseModel):
    id: UUID
    confirmationId: str
    serviceName: str
    doctorName: str
    clinicName: str
    bookingDate: str
    bookingTime: str
    status: str


class IntegrationPhoneLookupResponse(BaseModel):
    phoneNormalized: str
    isHeld: bool
    patient: Optional[IntegrationPatientLookupDto] = None
    lead: Optional[IntegrationLeadResponse] = None
    priorChoices: Optional[IntegrationPriorChoicesDto] = None
    upcomingBookings: List[IntegrationUpcomingBookingDto] = Field(default_factory=list)


class IntegrationServiceOptionDto(BaseModel):
    id: str
    title: str
    price: Optional[int] = None
    durationMinutes: int


class IntegrationClinicOptionDto(BaseModel):
    id: UUID
    name: str
    address: str
    city: str
    phone: str
    offeredServiceIds: List[str]


class IntegrationDoctorOptionDto(BaseModel):
    id: UUID
    name: str
    professionalTitle: str
    workingDaysHours: str
    patientsTreated: Optional[int] = None
    clinicId: Optional[UUID] = None
    eligibleServiceIds: List[str]
    slotsByDate: Dict[str, List[str]]


class IntegrationBookingOptionsResponse(BaseModel):
    horizonDays: int
    autoConfirmOnline: bool
    services: List[IntegrationServiceOptionDto]
    clinics: List[IntegrationClinicOptionDto]
    doctors: List[IntegrationDoctorOptionDto]


class IntegrationCreateBookingRequest(BaseModel):
    patientName: str = Field(..., min_length=2, max_length=120)
    patientPhone: str = Field(..., min_length=7, max_length=25)
    patientEmail: Optional[str] = None
    serviceId: str = Field(..., min_length=1)
    clinicId: UUID
    doctorId: UUID
    bookingDate: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    bookingTime: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    notes: Optional[str] = None
    source: str = Field(default="whatsapp_message", description="whatsapp_message, phone_missed_call, etc.")
    leadId: Optional[UUID] = None


class IntegrationBookingResponse(BaseModel):
    id: UUID
    confirmationId: str
    patientName: str
    patientPhone: str
    serviceName: str
    clinicName: str
    doctorName: str
    bookingDate: str
    bookingTime: str
    status: str
    source: str
    leadConverted: bool = False
    createdAt: datetime


class IntegrationCancelBookingRequest(BaseModel):
    cancellationReason: str = Field(..., min_length=2, max_length=500)


class IntegrationRescheduleBookingRequest(BaseModel):
    newBookingDate: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    newBookingTime: str = Field(..., pattern=r"^\d{2}:\d{2}$")


class IntegrationBookingConfirmationDataResponse(BaseModel):
    bookingId: UUID
    confirmationId: str
    serviceName: str
    clinicName: str
    clinicAddress: str
    clinicPhone: str
    doctorName: str
    bookingDate: str
    bookingTime: str
    patientName: str
    patientPhone: str
    patientEmail: Optional[str] = None
    status: str


class IntegrationUnconfirmedBookingsResponse(BaseModel):
    count: int
    bookings: List[IntegrationBookingConfirmationDataResponse]
