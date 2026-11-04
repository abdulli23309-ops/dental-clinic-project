from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional
from uuid import UUID


@dataclass
class WorkingHours:
    id: UUID
    day_of_week: int
    open_time: Optional[str]
    close_time: Optional[str]
    is_closed: bool
    is_24_hours: bool = False
    periods_json: Optional[str] = None
    clinic_id: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @property
    def day_name(self) -> str:
        names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        return names[self.day_of_week] if 0 <= self.day_of_week < 7 else f"Day {self.day_of_week}"


@dataclass
class BookingSettings:
    id: UUID
    booking_mode: str  # "open" | "paused" | "closed"
    pause_message: Optional[str] = None
    pause_started_at: Optional[datetime] = None
    pause_started_by_user_id: Optional[UUID] = None
    resume_on: Optional[date] = None
    advance_booking_days: int = 60
    min_lead_time_hours: int = 2
    slot_interval_minutes: int = 15
    reminder_template: Optional[str] = None
    reminder_template_urdu: Optional[str] = None
    reminder_24h_enabled: bool = True
    reminder_2h_enabled: bool = True
    waiting_threshold_minutes: int = 15
    file_number_prefix: str = "MD-"
    payments_enabled: bool = True
    quiet_hours_enabled: bool = True
    quiet_hours_start: str = "21:00"
    quiet_hours_end: str = "08:00"
    messaging_provider_mode: str = "simulated"  # "simulated" | "disabled" | "twilio" | "whatsapp"
    cancellation_auto_cutoff_hours: int = 24
    booking_horizon_days: int = 15
    inter_branch_travel_buffer_minutes: int = 30
    clinic_id: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class ClinicClosure:
    id: UUID
    start_date: date
    end_date: date
    reason: str
    message: Optional[str] = None
    clinic_id: Optional[UUID] = None
    created_by_user_id: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class ProviderAvailability:
    id: UUID
    team_member_id: UUID
    day_of_week: int
    start_time: str
    end_time: str
    clinic_id: Optional[UUID] = None
    break_start_time: Optional[str] = None
    break_end_time: Optional[str] = None
    is_active: bool = True
    is_draft: bool = False
    breaks_json: Optional[str] = None
    published_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class ProviderTimeOff:
    id: UUID
    team_member_id: UUID
    start_date: date
    end_date: date
    reason: str
    is_approved: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class ServiceProviderLink:
    id: UUID
    service_id: UUID
    team_member_id: UUID
    clinic_id: Optional[UUID] = None
    custom_duration_minutes: Optional[int] = None
    buffer_minutes: Optional[int] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class TeamMemberClinic:
    id: UUID
    team_member_id: UUID
    clinic_id: UUID
    is_active: bool = True
    is_primary: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class DoctorScheduleOverride:
    id: UUID
    team_member_id: UUID
    override_date: date
    override_type: str = "unavailable"  # "unavailable" | "working" | "modified"
    clinic_id: Optional[UUID] = None
    is_draft: bool = False
    shifts_json: Optional[str] = None
    breaks_json: Optional[str] = None
    reason: Optional[str] = None
    published_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class AppointmentCategory:
    id: UUID
    name: str
    code: str
    description: Optional[str] = None
    requires_approval: bool = False
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class RescheduleRequest:
    id: UUID
    booking_id: UUID
    requested_date: date
    requested_time: str
    status: str = "pending"  # "pending" | "approved" | "rejected"
    reason: Optional[str] = None
    staff_notes: Optional[str] = None
    reviewed_by_user_id: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class CancellationRequest:
    id: UUID
    booking_id: UUID
    reason: Optional[str] = None
    status: str = "pending"  # "pending" | "approved" | "rejected"
    hours_before_appointment: Optional[float] = None
    is_auto_accepted: bool = False
    staff_notes: Optional[str] = None
    reviewed_by_user_id: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
