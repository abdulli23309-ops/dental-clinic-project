from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4


class AppointmentStatus(str, Enum):
    """Lists the four possible stages of an appointment: requested, confirmed, cancelled, or completed."""
    REQUESTED = "requested"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


@dataclass
class Appointment:
    """
    Represents a patient's appointment booking in the core business layer.

    This pure model holds the patient's requested date, contact details, and current status
    independently of any specific database or web framework.
    """
    confirmation_id: str
    service_id: str
    preferred_date: date
    preferred_time: str
    patient_full_name: str
    patient_phone: str
    patient_email: str
    id: UUID = field(default_factory=uuid4)
    status: AppointmentStatus = AppointmentStatus.REQUESTED
    has_insurance: bool = False
    insurance_provider: Optional[str] = None
    notes: Optional[str] = None
    utm_source: Optional[str] = None
    utm_campaign: Optional[str] = None
    staff_notes: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def confirm(self, staff_note: Optional[str] = None) -> None:
        """Marks the appointment as officially confirmed by clinic staff and records any internal notes."""
        self.status = AppointmentStatus.CONFIRMED
        if staff_note:
            self.staff_notes = staff_note
        self.updated_at = datetime.now(timezone.utc)

    def cancel(self, reason: Optional[str] = None) -> None:
        """Marks the appointment as cancelled and records the reason for the cancellation."""
        self.status = AppointmentStatus.CANCELLED
        if reason:
            self.staff_notes = reason
        self.updated_at = datetime.now(timezone.utc)
