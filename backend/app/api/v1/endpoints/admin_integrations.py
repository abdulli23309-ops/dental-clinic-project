from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import (
    get_current_user,
    get_integration_client_service,
    require_admin,
)
from app.application.dtos.integration_dto import (
    IntegrationClientCreateRequestDto,
    IntegrationClientCreatedResponseDto,
    IntegrationClientResponseDto,
    IntegrationClientRotateResponseDto,
)
from app.application.services.integration_client_service import IntegrationClientService
from app.domain.models.user import User

router = APIRouter(
    prefix="/admin/integrations",
    tags=["Admin Integrations"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=List[IntegrationClientResponseDto])
async def list_integration_clients(
    service: IntegrationClientService = Depends(get_integration_client_service),
):
    """
    List all registered integration clients, scopes, status, and last used timestamps.
    """
    clients = await service.list_clients()
    return [
        IntegrationClientResponseDto(
            id=c.id,
            name=c.name,
            keyPrefix=c.key_prefix,
            scopes=c.scopes,
            isActive=c.is_active,
            lastUsedAt=c.last_used_at,
            ipAllowlist=c.ip_allowlist,
            createdAt=c.created_at,
            updatedAt=c.updated_at,
        )
        for c in clients
    ]


@router.post("", response_model=IntegrationClientCreatedResponseDto, status_code=status.HTTP_201_CREATED)
async def create_integration_client(
    payload: IntegrationClientCreateRequestDto,
    service: IntegrationClientService = Depends(get_integration_client_service),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new integration client.
    Returns the complete raw 32-byte key once. It will never be shown again.
    """
    try:
        client, raw_key = await service.create_client(
            name=payload.name,
            scopes=payload.scopes,
            created_by_user_id=current_user.id,
            ip_allowlist=payload.ipAllowlist,
        )
        return IntegrationClientCreatedResponseDto(
            client=IntegrationClientResponseDto(
                id=client.id,
                name=client.name,
                keyPrefix=client.key_prefix,
                scopes=client.scopes,
                isActive=client.is_active,
                lastUsedAt=client.last_used_at,
                ipAllowlist=client.ip_allowlist,
                createdAt=client.created_at,
                updatedAt=client.updated_at,
            ),
            rawKey=raw_key,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{client_id}/rotate", response_model=IntegrationClientRotateResponseDto)
async def rotate_integration_client_key(
    client_id: UUID,
    service: IntegrationClientService = Depends(get_integration_client_service),
):
    """
    Rotate API key for an integration client.
    Generates a new random 32-byte key and returns it once.
    """
    try:
        client, new_raw_key = await service.rotate_key(client_id)
        return IntegrationClientRotateResponseDto(
            client=IntegrationClientResponseDto(
                id=client.id,
                name=client.name,
                keyPrefix=client.key_prefix,
                scopes=client.scopes,
                isActive=client.is_active,
                lastUsedAt=client.last_used_at,
                ipAllowlist=client.ip_allowlist,
                createdAt=client.created_at,
                updatedAt=client.updated_at,
            ),
            rawKey=new_raw_key,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{client_id}/revoke", response_model=IntegrationClientResponseDto)
async def revoke_integration_client(
    client_id: UUID,
    service: IntegrationClientService = Depends(get_integration_client_service),
):
    """
    Revoke an integration client immediately, rejecting future API calls.
    """
    try:
        client = await service.revoke_client(client_id)
        return IntegrationClientResponseDto(
            id=client.id,
            name=client.name,
            keyPrefix=client.key_prefix,
            scopes=client.scopes,
            isActive=client.is_active,
            lastUsedAt=client.last_used_at,
            ipAllowlist=client.ip_allowlist,
            createdAt=client.created_at,
            updatedAt=client.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{client_id}/toggle-active", response_model=IntegrationClientResponseDto)
async def toggle_integration_client_active(
    client_id: UUID,
    service: IntegrationClientService = Depends(get_integration_client_service),
):
    """
    Toggle active status of an integration client.
    """
    try:
        client = await service.toggle_active(client_id)
        return IntegrationClientResponseDto(
            id=client.id,
            name=client.name,
            keyPrefix=client.key_prefix,
            scopes=client.scopes,
            isActive=client.is_active,
            lastUsedAt=client.last_used_at,
            ipAllowlist=client.ip_allowlist,
            createdAt=client.created_at,
            updatedAt=client.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
