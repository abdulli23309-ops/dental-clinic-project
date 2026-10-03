from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4


class UserRole(str, Enum):
    ADMIN = "admin"


@dataclass
class User:
    """
    Pure domain representation of an authenticated user in the system.
    Strictly independent of ORM or HTTP frameworks.
    """
    email: str
    hashed_password: str
    full_name: str
    role: UserRole = UserRole.ADMIN
    is_active: bool = True
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class RefreshToken:
    """
    Server-side record of a refresh token for rotation and revocation.
    """
    user_id: UUID
    token_hash: str
    expires_at: datetime
    is_revoked: bool = False
    replaced_by: Optional[UUID] = None
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
