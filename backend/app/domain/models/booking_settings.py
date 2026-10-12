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
    slot_interval_minutes: int = 30
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
