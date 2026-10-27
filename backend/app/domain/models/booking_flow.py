from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set
from uuid import UUID, uuid4


class LeadStatus(str, Enum):
    """
    Standard lifecycle statuses for prospective patient leads.
    Per spec: unconverted, converted, patient, cold, failed_conversion, archived (manual only).
    """
    UNCONVERTED = "unconverted"
    CONVERTED = "converted"
    PATIENT = "patient"
    COLD = "cold"
    FAILED_CONVERSION = "failed_conversion"
    ARCHIVED = "archived"


# Permitted automatic (system/automation) status transitions
AUTOMATIC_LEAD_TRANSITIONS: Dict[LeadStatus, Set[LeadStatus]] = {
    LeadStatus.UNCONVERTED: {
        LeadStatus.CONVERTED,
        LeadStatus.COLD,
        LeadStatus.FAILED_CONVERSION,
    },
    LeadStatus.COLD: {
        LeadStatus.CONVERTED,
    },
    LeadStatus.FAILED_CONVERSION: {
        LeadStatus.CONVERTED,
    },
    LeadStatus.CONVERTED: {
        LeadStatus.PATIENT,
    },
    LeadStatus.PATIENT: set(),
    LeadStatus.ARCHIVED: set(),
}


def is_valid_lead_transition(
    current: str | LeadStatus,
    target: str | LeadStatus,
    is_manual: bool = False,
) -> bool:
    """
    Validates whether a lead can transition from current to target status.
    - Reception manual overrides (is_manual=True) may transition between any statuses (audited).
    - Automatic/system transitions enforce strict forward-only rules:
      * No automatic reverts (e.g. converted -> unconverted is forbidden).
      * Capture starts at unconverted.
      * Booking created moves to converted.
      * First completed visit moves to patient.
      * 3 attempts + cold_wait_hours moves to cold.
      * All channels failed moves to failed_conversion.
    """
    try:
        curr_enum = LeadStatus(current)
        target_enum = LeadStatus(target)
    except ValueError:
        return False

    if curr_enum == target_enum:
        return True

    if is_manual:
        # Manual changes are allowed (reception staff discretion), but audited
        return True

    allowed = AUTOMATIC_LEAD_TRANSITIONS.get(curr_enum, set())
    return target_enum in allowed


class LeadSourceType(str, Enum):
    """Acquisition channel identifiers per spec."""
    WEBSITE_ABANDON = "website_abandon"
    WEBSITE_BOOKING = "website_booking"
    WHATSAPP_MESSAGE = "whatsapp_message"
    WHATSAPP_MISSED_CALL = "whatsapp_missed_call"
    PHONE_MISSED_CALL = "phone_missed_call"
    CALL_DESK = "call_desk"
    MANUAL = "manual"


class CallOutcome(str, Enum):
    """Outcomes for reception call desk logs per spec."""
    BOOKED = "booked"
    CALLBACK_REQUESTED = "callback_requested"
    DROPPED = "dropped"
    WRONG_NUMBER = "wrong_number"
    NOT_INTERESTED = "not_interested"
    INFO_ONLY = "info_only"


class MessageDirection(str, Enum):
    """Direction of patient/lead communications."""
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class MessagePurpose(str, Enum):
    """Categorisation of communication messages."""
    REMINDER = "reminder"
    CONFIRMATION = "confirmation"
    LEAD_RECOVERY = "lead_recovery"
    MANUAL = "manual"
    INBOUND = "inbound"


class LeadActorType(str, Enum):
    """Actor originating a state change or event."""
    USER = "user"
    INTEGRATION = "integration"
    SYSTEM = "system"


@dataclass
class ClinicService:
    """Relational link between a clinic and a bookable catalog service."""
    clinic_id: UUID
    service_id: UUID
    is_active: bool = True
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class ContactHold:
    """
    Hold placed on a contact number to suppress automated recovery messages
    while reception or staff are actively engaging with the caller.
    """
    phone_normalized: str
    held_until: datetime
    id: UUID = field(default_factory=uuid4)
    reason: Optional[str] = None
    created_by_user_id: Optional[UUID] = None
    released_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def is_active(self) -> bool:
        if self.released_at is not None:
            return False
        return datetime.now(timezone.utc) < self.held_until


@dataclass
class CallLog:
    """Log record of an inbound/outbound call handled at reception."""
    phone_normalized: str
    outcome: str
    id: UUID = field(default_factory=uuid4)
    lead_id: Optional[UUID] = None
    patient_id: Optional[UUID] = None
    booking_id: Optional[UUID] = None
    notes: Optional[str] = None
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None
    recorded_by_user_id: Optional[UUID] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class LeadEvent:
    """Immutable audit trail of state changes and actions on a lead."""
    lead_id: UUID
    event_type: str
    actor_type: str
    id: UUID = field(default_factory=uuid4)
    payload: Dict[str, Any] = field(default_factory=dict)
    actor_id: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class BookingFlowSettings:
    """Per-organization configuration parameters for the booking flow and lead sequencer."""
    organization_id: UUID
    id: UUID = field(default_factory=uuid4)
    followup_gaps_minutes: List[int] = field(default_factory=lambda: [10, 1440, 2880])
    max_attempts: int = 3
    cold_wait_hours: int = 24
    hold_minutes: int = 30
    fallback_owner_user_id: Optional[UUID] = None
    auto_confirm_online: bool = True
    days_shown: int = 7
    show_patients_treated: bool = True
    lead_capture_notice: str = "We save your details so we can help you finish booking."
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
