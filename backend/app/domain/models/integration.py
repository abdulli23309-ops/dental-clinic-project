import hashlib
import hmac
import secrets
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

INTEGRATION_SCOPES = [
    "leads:read",
    "leads:write",
    "messages:read",
    "messages:write",
    "bookings:read",
    "bookings:write",
    "lookup:read",
]


def generate_integration_key() -> tuple[str, str, str]:
    """
    Generates a cryptographically secure 32-byte random API key for external automations.
    Returns:
        (raw_key, key_prefix, key_hash)
        - raw_key: mk_<64 hex chars> (shown exactly once to user)
        - key_prefix: mk_<first 8 hex chars> (used for fast indexed DB candidate lookup)
        - key_hash: SHA-256 hex digest of the raw key (stored in DB)
    """
    # 32 bytes of secure randomness = 64 hex characters
    random_hex = secrets.token_hex(32)
    raw_key = f"mk_{random_hex}"
    key_prefix = raw_key[:11]  # 'mk_' + first 8 hex chars
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    return raw_key, key_prefix, key_hash


def verify_integration_key(raw_key: str, stored_hash: str) -> bool:
    """
    Verifies a provided API key against the stored hash in constant time.
    """
    if not raw_key or not stored_hash:
        return False
    computed_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    return hmac.compare_digest(computed_hash, stored_hash)


@dataclass
class IntegrationClient:
    id: UUID = field(default_factory=uuid4)
    name: str = ""
    key_prefix: str = ""
    key_hash: str = ""
    scopes: List[str] = field(default_factory=list)
    is_active: bool = True
    last_used_at: Optional[datetime] = None
    created_by_user_id: Optional[UUID] = None
    ip_allowlist: Optional[List[str]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def has_scope(self, required_scope: str) -> bool:
        if "*" in self.scopes or "admin" in self.scopes:
            return True
        return required_scope in self.scopes
