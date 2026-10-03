from typing import Callable, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.services.appointment_service import AppointmentService
from app.application.services.auth_service import AuthService
from app.application.services.cms_service import CmsService
from app.application.services.organization_service import OrganizationService
from app.application.services.service_service import ServiceService
from app.application.services.team_service import TeamService
from app.core.database import get_db_session
from app.core.security import decode_access_token
from app.domain.models.user import User, UserRole
from app.domain.repositories.appointment_repo import AppointmentRepository
from app.domain.repositories.cms_repo import CmsRepository
from app.domain.repositories.organization_repo import LocationRepository, OrganizationRepository
from app.domain.repositories.service_repo import ServiceRepository
from app.domain.repositories.team_repo import TeamMemberRepository
from app.domain.repositories.user_repo import RefreshTokenRepository, UserRepository
from app.domain.services.storage_service import StorageService
from app.infrastructure.repositories.postgres_appointment_repo import PostgresAppointmentRepository
from app.infrastructure.repositories.postgres_cms_repo import PostgresCmsRepository
from app.infrastructure.repositories.postgres_organization_repo import (
    PostgresLocationRepository,
    PostgresOrganizationRepository,
)
from app.infrastructure.repositories.postgres_service_repo import PostgresServiceRepository
from app.infrastructure.repositories.postgres_team_repo import PostgresTeamMemberRepository
from app.infrastructure.repositories.postgres_user_repo import (
    PostgresRefreshTokenRepository,
    PostgresUserRepository,
)
from app.infrastructure.storage.local_storage import LocalStorageService

bearer_scheme = HTTPBearer(auto_error=False)


# --- Repositories ---

def get_appointment_repository(
    session: AsyncSession = Depends(get_db_session),
) -> AppointmentRepository:
    return PostgresAppointmentRepository(session)


def get_user_repository(
    session: AsyncSession = Depends(get_db_session),
) -> UserRepository:
    return PostgresUserRepository(session)


def get_refresh_token_repository(
    session: AsyncSession = Depends(get_db_session),
) -> RefreshTokenRepository:
    return PostgresRefreshTokenRepository(session)


def get_organization_repository(
    session: AsyncSession = Depends(get_db_session),
) -> OrganizationRepository:
    return PostgresOrganizationRepository(session)


def get_location_repository(
    session: AsyncSession = Depends(get_db_session),
) -> LocationRepository:
    return PostgresLocationRepository(session)


def get_team_repository(
    session: AsyncSession = Depends(get_db_session),
) -> TeamMemberRepository:
    return PostgresTeamMemberRepository(session)


def get_service_repository(
    session: AsyncSession = Depends(get_db_session),
) -> ServiceRepository:
    return PostgresServiceRepository(session)


def get_cms_repository(
    session: AsyncSession = Depends(get_db_session),
) -> CmsRepository:
    return PostgresCmsRepository(session)


def get_storage_service() -> StorageService:
    return LocalStorageService()


# --- Application Services ---

def get_appointment_service(
    repository: AppointmentRepository = Depends(get_appointment_repository),
) -> AppointmentService:
    return AppointmentService(repository)


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
    refresh_token_repo: RefreshTokenRepository = Depends(get_refresh_token_repository),
) -> AuthService:
    return AuthService(user_repo, refresh_token_repo)


def get_team_service(
    team_repo: TeamMemberRepository = Depends(get_team_repository),
    org_repo: OrganizationRepository = Depends(get_organization_repository),
) -> TeamService:
    return TeamService(team_repo, org_repo)


def get_service_service(
    service_repo: ServiceRepository = Depends(get_service_repository),
) -> ServiceService:
    return ServiceService(service_repo)


def get_cms_service(
    cms_repo: CmsRepository = Depends(get_cms_repository),
) -> CmsService:
    return CmsService(cms_repo)


def get_organization_service(
    org_repo: OrganizationRepository = Depends(get_organization_repository),
    location_repo: LocationRepository = Depends(get_location_repository),
) -> OrganizationService:
    return OrganizationService(org_repo, location_repo)


# --- Authentication & Authorization Dependencies ---

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    user_repo: UserRepository = Depends(get_user_repository),
) -> User:
    """
    Validates Bearer JWT access token and resolves the active user entity.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed access token payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = UUID(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed user ID in token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await user_repo.get_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_role(required_role: str) -> Callable:
    """
    Factory dependency enforcing role-based authorization.
    Can be easily extended for future granular permissions.
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires '{required_role}' role.",
            )
        return current_user

    return role_checker


# Convenient pre-configured dependency for admin endpoints
require_admin = require_role("admin")
