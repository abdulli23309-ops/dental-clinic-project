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


class InvalidAppointmentTransition(Exception):
    """Raised when an appointment status transition is not permitted by the domain model."""
    pass


_TRANSITIONS = {
    AppointmentStatus.REQUESTED: {AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED},
    AppointmentStatus.CONFIRMED: {AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED},
    # COMPLETED and CANCELLED are terminal: no further transitions allowed.
}


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
    notes: Optional[str] = None
    utm_source: Optional[str] = None
    utm_campaign: Optional[str] = None
    staff_notes: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def _transition(self, new_status: AppointmentStatus) -> None:
        if new_status == self.status:
            raise InvalidAppointmentTransition(
                f"Appointment is already {new_status.value}."
            )
        allowed = _TRANSITIONS.get(self.status, set())
        if new_status not in allowed:
            raise InvalidAppointmentTransition(
                f"Cannot transition appointment from {self.status.value} to {new_status.value}."
            )
        self.status = new_status
        self.updated_at = datetime.now(timezone.utc)

    def confirm(self, staff_note: Optional[str] = None) -> None:
        """Marks the appointment as officially confirmed by clinic staff and records any internal notes.

        Only a REQUESTED appointment can be confirmed.
        """
        self._transition(AppointmentStatus.CONFIRMED)
        if staff_note:
            self.staff_notes = staff_note

    def cancel(self, reason: Optional[str] = None) -> None:
        """Marks the appointment as cancelled and records the reason for the cancellation.

        Only a REQUESTED or CONFIRMED appointment can be cancelled.
        """
        self._transition(AppointmentStatus.CANCELLED)
        if reason:
            self.staff_notes = reason

    def complete(self, staff_note: Optional[str] = None) -> None:
        """Marks the appointment as completed.

        Only a CONFIRMED appointment can be completed.
        """
        self._transition(AppointmentStatus.COMPLETED)
        if staff_note:
            self.staff_notes = staff_note
