from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4


@dataclass
class TeamMember:
    """
    Pure domain representation of any clinical or operational staff member.
    Unified model supporting Director, Dentist, Specialists, Hygienists, etc.
    """
    organization_id: UUID
    first_name: str
    last_name: str
    display_name: str
    professional_title: str
    role: str
    location_id: Optional[UUID] = None
    specialties: List[str] = field(default_factory=list)
    biography: Optional[str] = None
    photo_url: Optional[str] = None
    education: Optional[str] = None
    credentials: Optional[str] = None
    license_number: Optional[str] = None
    license_state: Optional[str] = None
    services_offered: Optional[str] = None
    is_active: bool = True
    display_order: int = 0
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
