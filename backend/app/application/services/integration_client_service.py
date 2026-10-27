from typing import List, Optional, Tuple
from uuid import UUID

from app.domain.models.integration import (
    INTEGRATION_SCOPES,
    IntegrationClient,
    generate_integration_key,
    verify_integration_key,
)
from app.domain.repositories.integration_client_repo import IntegrationClientRepository


class IntegrationClientService:
    def __init__(self, client_repo: IntegrationClientRepository):
        self._repo = client_repo

    async def list_clients(self) -> List[IntegrationClient]:
        return await self._repo.list_all()

    async def get_client(self, client_id: UUID) -> Optional[IntegrationClient]:
        return await self._repo.get_by_id(client_id)

    async def create_client(
        self,
        name: str,
        scopes: List[str],
        created_by_user_id: Optional[UUID] = None,
        ip_allowlist: Optional[List[str]] = None,
    ) -> Tuple[IntegrationClient, str]:
        clean_name = name.strip()
        if not clean_name:
            raise ValueError("Integration client name cannot be empty")

        # Validate scopes against known valid scopes or allow wildcard
        for s in scopes:
            if s not in INTEGRATION_SCOPES and s not in ["*", "admin"]:
                raise ValueError(f"Invalid integration scope: '{s}'")

        raw_key, key_prefix, key_hash = generate_integration_key()
        client = IntegrationClient(
            name=clean_name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            scopes=scopes,
            is_active=True,
            created_by_user_id=created_by_user_id,
            ip_allowlist=ip_allowlist if ip_allowlist else None,
        )
        saved = await self._repo.create(client)
        return saved, raw_key

    async def rotate_key(self, client_id: UUID) -> Tuple[IntegrationClient, str]:
        client = await self._repo.get_by_id(client_id)
        if not client:
            raise ValueError(f"Integration client {client_id} not found")

        raw_key, key_prefix, key_hash = generate_integration_key()
        client.key_prefix = key_prefix
        client.key_hash = key_hash
        updated = await self._repo.update(client)
        return updated, raw_key

    async def revoke_client(self, client_id: UUID) -> IntegrationClient:
        client = await self._repo.get_by_id(client_id)
        if not client:
            raise ValueError(f"Integration client {client_id} not found")
        client.is_active = False
        return await self._repo.update(client)

    async def toggle_active(self, client_id: UUID) -> IntegrationClient:
        client = await self._repo.get_by_id(client_id)
        if not client:
            raise ValueError(f"Integration client {client_id} not found")
        client.is_active = not client.is_active
        return await self._repo.update(client)

    async def authenticate_key(
        self,
        raw_key: str,
        client_ip: Optional[str] = None,
    ) -> Optional[IntegrationClient]:
        if not raw_key or len(raw_key) < 12:
            return None

        key_prefix = raw_key[:11]
        candidates = await self._repo.get_active_by_prefix(key_prefix)
        for client in candidates:
            if verify_integration_key(raw_key, client.key_hash):
                # Verify IP allowlist if configured
                if client.ip_allowlist:
                    if not client_ip or client_ip not in client.ip_allowlist:
                        # IP is restricted and caller IP does not match
                        return None

                await self._repo.record_usage(client.id)
                return client
        return None
