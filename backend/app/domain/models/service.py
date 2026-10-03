from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4


class ServiceCategory(str, Enum):
    PREVENTIVE = "preventive"
    RESTORATIVE = "restorative"
    COSMETIC = "cosmetic"
    EMERGENCY = "emergency"


@dataclass
class Service:
    """
    Pure domain representation of a clinical service or procedure.
    """
    slug: str
    category: str
    title: str
    short_desc: str
    cash_price: str
    duration: str
    full_desc: Optional[str] = None
    code: Optional[str] = None
    insurance_note: Optional[str] = None
    recommended_interval: Optional[str] = None
    display_order: int = 0
    is_highlighted: bool = False
    is_active: bool = True
    is_public: bool = True
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
