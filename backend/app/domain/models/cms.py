from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID, uuid4


@dataclass
class FaqItem:
    """
    Pure domain representation of an individual FAQ item.
    """
    category: str
    question: str
    answer: str
    display_order: int = 0
    is_active: bool = True
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class SiteSection:
    """
    Pure domain representation of a typed CMS section (e.g. general, homepage, about, contact, footer, seo).
    """
    section_key: str
    content: Dict[str, Any]
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
