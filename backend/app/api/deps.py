from typing import Callable, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.services.announcement_service import AnnouncementService
from app.application.services.appointment_service import AppointmentService
from app.application.services.auth_service import AuthService
from app.application.services.availability_service import AvailabilityService
from app.application.services.booking_eligibility_service import BookingEligibilityService
from app.application.services.booking_settings_service import BookingSettingsService
from app.application.services.cms_service import CmsService
from app.application.services.dental_chart_service import DentalChartService
from app.application.services.doctor_service import DoctorService
from app.application.services.clinical_note_service import ClinicalNoteService
from app.application.services.encounter_service import EncounterService
from app.application.services.medical_alert_service import MedicalAlertService
from app.application.services.organization_service import OrganizationService
from app.application.services.reception_service import ReceptionService
from app.application.services.service_service import ServiceService
from app.application.services.team_service import TeamService
from app.core.database import get_db_session
from app.core.security import decode_access_token
from app.domain.models.user import User, UserRole
from app.domain.repositories.announcement_repo import AnnouncementRepository
from app.domain.repositories.appointment_repo import AppointmentRepository
from app.domain.repositories.booking_flow_settings_repo import BookingFlowSettingsRepository
from app.domain.repositories.booking_repo import BookingRepository
from app.domain.repositories.booking_settings_repo import BookingSettingsRepository
from app.domain.repositories.clinic_service_repo import ClinicServiceRepository
from app.domain.repositories.clinical_note_repo import ClinicalNoteRepository
from app.domain.repositories.cms_repo import CmsRepository
from app.domain.repositories.dental_chart_repo import DentalChartRepository
from app.domain.repositories.dental_procedure_repo import DentalProcedureRepository
from app.domain.repositories.encounter_repo import EncounterRepository
from app.domain.repositories.lead_event_repo import LeadEventRepository
from app.domain.repositories.lead_repo import LeadRepository
from app.domain.repositories.medical_alert_repo import MedicalAlertRepository
from app.domain.repositories.message_repo import MessageRepository
from app.domain.repositories.organization_repo import LocationRepository, OrganizationRepository
from app.domain.repositories.patient_repo import PatientRepository
from app.domain.repositories.service_repo import ServiceRepository
from app.domain.repositories.task_repo import TaskRepository
from app.domain.repositories.team_repo import TeamMemberRepository
from app.domain.repositories.user_repo import (
    RefreshTokenRepository,
    UserRepository,
    UserSessionRepository,
)
from app.domain.repositories.visit_payment_repo import VisitPaymentRepository
from app.domain.services.storage_service import StorageService
from app.infrastructure.repositories.postgres_activity_repo import PostgresActivityLogRepository
from app.infrastructure.repositories.postgres_announcement_repo import PostgresAnnouncementRepository
from app.infrastructure.repositories.postgres_medical_alert_repo import PostgresMedicalAlertRepository
from app.infrastructure.repositories.postgres_appointment_repo import PostgresAppointmentRepository
from app.infrastructure.repositories.postgres_booking_flow_settings_repo import PostgresBookingFlowSettingsRepository
from app.infrastructure.repositories.postgres_booking_repo import PostgresBookingRepository
from app.infrastructure.repositories.postgres_booking_settings_repo import PostgresBookingSettingsRepository
from app.infrastructure.repositories.postgres_clinic_service_repo import PostgresClinicServiceRepository
from app.infrastructure.repositories.postgres_clinical_note_repo import PostgresClinicalNoteRepository
from app.infrastructure.repositories.postgres_cms_repo import PostgresCmsRepository
from app.infrastructure.repositories.postgres_dental_chart_repo import PostgresDentalChartRepository
from app.infrastructure.repositories.postgres_dental_procedure_repo import PostgresDentalProcedureRepository
from app.infrastructure.repositories.postgres_encounter_repo import PostgresEncounterRepository
from app.infrastructure.repositories.postgres_lead_event_repo import PostgresLeadEventRepository
from app.infrastructure.repositories.postgres_lead_repo import PostgresLeadRepository
from app.infrastructure.repositories.postgres_message_repo import PostgresMessageRepository
from app.infrastructure.repositories.postgres_organization_repo import (
    PostgresLocationRepository,
    PostgresOrganizationRepository,
)
from app.infrastructure.repositories.postgres_patient_repo import PostgresPatientRepository
from app.infrastructure.repositories.postgres_service_repo import PostgresServiceRepository
from app.infrastructure.repositories.postgres_task_repo import PostgresTaskRepository
from app.infrastructure.repositories.postgres_team_repo import PostgresTeamMemberRepository
from app.infrastructure.repositories.postgres_user_repo import (
    PostgresRefreshTokenRepository,
    PostgresUserRepository,
    PostgresUserSessionRepository,
)
from app.infrastructure.repositories.postgres_visit_payment_repo import PostgresVisitPaymentRepository
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


def get_session_repository(
    session: AsyncSession = Depends(get_db_session),
) -> UserSessionRepository:
    return PostgresUserSessionRepository(session)


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


def get_announcement_repository(
    session: AsyncSession = Depends(get_db_session),
) -> AnnouncementRepository:
    return PostgresAnnouncementRepository(session)


def get_booking_repository(
    session: AsyncSession = Depends(get_db_session),
) -> BookingRepository:
    return PostgresBookingRepository(session)


def get_activity_log_repository(
    session: AsyncSession = Depends(get_db_session),
) -> PostgresActivityLogRepository:
    return PostgresActivityLogRepository(session)


def get_patient_repository(
    session: AsyncSession = Depends(get_db_session),
) -> PatientRepository:
    return PostgresPatientRepository(session)


def get_medical_alert_repository(
    session: AsyncSession = Depends(get_db_session),
) -> MedicalAlertRepository:
    return PostgresMedicalAlertRepository(session)


def get_task_repository(
    session: AsyncSession = Depends(get_db_session),
) -> TaskRepository:
    return PostgresTaskRepository(session)


def get_lead_repository(
    session: AsyncSession = Depends(get_db_session),
) -> LeadRepository:
    return PostgresLeadRepository(session)


def get_message_repository(
    session: AsyncSession = Depends(get_db_session),
) -> MessageRepository:
    return PostgresMessageRepository(session)


def get_booking_settings_repository(
    session: AsyncSession = Depends(get_db_session),
) -> BookingSettingsRepository:
    return PostgresBookingSettingsRepository(session)


def get_storage_service() -> StorageService:
    return LocalStorageService()


def get_availability_service(
    repo: BookingSettingsRepository = Depends(get_booking_settings_repository),
    session: AsyncSession = Depends(get_db_session),
) -> AvailabilityService:
    return AvailabilityService(
        booking_settings_repo=repo,
        session=session,
    )


def get_visit_payment_repository(
    session: AsyncSession = Depends(get_db_session),
) -> VisitPaymentRepository:
    return PostgresVisitPaymentRepository(session)


def get_clinic_service_repository(
    session: AsyncSession = Depends(get_db_session),
) -> ClinicServiceRepository:
    return PostgresClinicServiceRepository(session)


def get_lead_event_repository(
    session: AsyncSession = Depends(get_db_session),
) -> LeadEventRepository:
    return PostgresLeadEventRepository(session)


def get_booking_flow_settings_repository(
    session: AsyncSession = Depends(get_db_session),
) -> BookingFlowSettingsRepository:
    return PostgresBookingFlowSettingsRepository(session)


# --- Application Services ---

def get_booking_eligibility_service(
    session: AsyncSession = Depends(get_db_session),
    clinic_service_repo: ClinicServiceRepository = Depends(get_clinic_service_repository),
    booking_flow_settings_repo: BookingFlowSettingsRepository = Depends(get_booking_flow_settings_repository),
    booking_settings_repo: BookingSettingsRepository = Depends(get_booking_settings_repository),
    availability_service: AvailabilityService = Depends(get_availability_service),
) -> BookingEligibilityService:
    return BookingEligibilityService(
        session=session,
        clinic_service_repo=clinic_service_repo,
        booking_flow_settings_repo=booking_flow_settings_repo,
        booking_settings_repo=booking_settings_repo,
        availability_service=availability_service,
    )


def get_appointment_service(
    repository: AppointmentRepository = Depends(get_appointment_repository),
    booking_repo: BookingRepository = Depends(get_booking_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
    booking_settings_repo: BookingSettingsRepository = Depends(get_booking_settings_repository),
    availability_service: AvailabilityService = Depends(get_availability_service),
    lead_repo: LeadRepository = Depends(get_lead_repository),
    lead_event_repo: LeadEventRepository = Depends(get_lead_event_repository),
    booking_flow_settings_repo: BookingFlowSettingsRepository = Depends(get_booking_flow_settings_repository),
    eligibility_service: BookingEligibilityService = Depends(get_booking_eligibility_service),
    session: AsyncSession = Depends(get_db_session),
) -> AppointmentService:
    return AppointmentService(
        repository,
        booking_repo,
        patient_repo,
        booking_settings_repo,
        availability_service,
        session=session,
        lead_repo=lead_repo,
        lead_event_repo=lead_event_repo,
        booking_flow_settings_repo=booking_flow_settings_repo,
        eligibility_service=eligibility_service,
    )


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
    refresh_token_repo: RefreshTokenRepository = Depends(get_refresh_token_repository),
    session_repo: UserSessionRepository = Depends(get_session_repository),
) -> AuthService:
    return AuthService(user_repo, refresh_token_repo, session_repo)


def get_team_service(
    team_repo: TeamMemberRepository = Depends(get_team_repository),
    org_repo: OrganizationRepository = Depends(get_organization_repository),
) -> TeamService:
    return TeamService(team_repo, org_repo)


def get_service_service(
    service_repo: ServiceRepository = Depends(get_service_repository),
    booking_settings_repo: BookingSettingsRepository = Depends(get_booking_settings_repository),
    clinic_service_repo: ClinicServiceRepository = Depends(get_clinic_service_repository),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
) -> ServiceService:
    return ServiceService(
        service_repo=service_repo,
        booking_settings_repo=booking_settings_repo,
        clinic_service_repo=clinic_service_repo,
        activity_repo=activity_repo,
    )


def get_cms_service(
    cms_repo: CmsRepository = Depends(get_cms_repository),
) -> CmsService:
    return CmsService(cms_repo)


def get_organization_service(
    org_repo: OrganizationRepository = Depends(get_organization_repository),
    location_repo: LocationRepository = Depends(get_location_repository),
) -> OrganizationService:
    return OrganizationService(org_repo, location_repo)


def get_announcement_service(
    repo: AnnouncementRepository = Depends(get_announcement_repository),
) -> AnnouncementService:
    return AnnouncementService(repo)


def get_reception_service(
    booking_repo: BookingRepository = Depends(get_booking_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
    task_repo: TaskRepository = Depends(get_task_repository),
    lead_repo: LeadRepository = Depends(get_lead_repository),
    message_repo: MessageRepository = Depends(get_message_repository),
    appointment_repo: AppointmentRepository = Depends(get_appointment_repository),
    service_repo: ServiceRepository = Depends(get_service_repository),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
    booking_settings_repo: BookingSettingsRepository = Depends(get_booking_settings_repository),
    team_repo: TeamMemberRepository = Depends(get_team_repository),
    user_repo: UserRepository = Depends(get_user_repository),
    payment_repo: VisitPaymentRepository = Depends(get_visit_payment_repository),
) -> ReceptionService:
    return ReceptionService(
        booking_repo,
        patient_repo,
        task_repo,
        lead_repo,
        message_repo,
        appointment_repo,
        service_repo,
        activity_repo,
        booking_settings_repo,
        team_repo,
        user_repo,
        payment_repo,
    )


def get_call_desk_service(
    session: AsyncSession = Depends(get_db_session),
):
    from app.application.services.call_desk_service import CallDeskService
    return CallDeskService(session)


def get_doctor_service(
    booking_repo: BookingRepository = Depends(get_booking_repository),
) -> DoctorService:
    return DoctorService(booking_repo)


def get_booking_settings_service(
    repo: BookingSettingsRepository = Depends(get_booking_settings_repository),
    booking_repo: BookingRepository = Depends(get_booking_repository),
    task_repo: TaskRepository = Depends(get_task_repository),
    session: AsyncSession = Depends(get_db_session),
    org_repo: OrganizationRepository = Depends(get_organization_repository),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
) -> BookingSettingsService:
    return BookingSettingsService(
        repository=repo,
        booking_repo=booking_repo,
        task_repo=task_repo,
        session=session,
        org_repo=org_repo,
        activity_repo=activity_repo,
    )


def get_encounter_repository(
    session: AsyncSession = Depends(get_db_session),
) -> EncounterRepository:
    return PostgresEncounterRepository(session)


def get_encounter_service(
    encounter_repo: EncounterRepository = Depends(get_encounter_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
    booking_repo: BookingRepository = Depends(get_booking_repository),
) -> EncounterService:
    return EncounterService(
        encounter_repo=encounter_repo,
        patient_repo=patient_repo,
        booking_repo=booking_repo,
    )


def get_clinical_note_repository(
    session: AsyncSession = Depends(get_db_session),
) -> ClinicalNoteRepository:
    return PostgresClinicalNoteRepository(session)


def get_clinical_note_service(
    note_repo: ClinicalNoteRepository = Depends(get_clinical_note_repository),
    encounter_repo: EncounterRepository = Depends(get_encounter_repository),
    booking_repo: BookingRepository = Depends(get_booking_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
) -> ClinicalNoteService:
    return ClinicalNoteService(
        note_repo=note_repo,
        encounter_repo=encounter_repo,
        booking_repo=booking_repo,
        patient_repo=patient_repo,
        activity_repo=activity_repo,
    )


def get_dental_chart_repository(
    session: AsyncSession = Depends(get_db_session),
) -> DentalChartRepository:
    return PostgresDentalChartRepository(session)


def get_dental_procedure_repository(
    session: AsyncSession = Depends(get_db_session),
) -> DentalProcedureRepository:
    return PostgresDentalProcedureRepository(session)


def get_dental_chart_service(
    chart_repo: DentalChartRepository = Depends(get_dental_chart_repository),
    procedure_repo: DentalProcedureRepository = Depends(get_dental_procedure_repository),
    encounter_repo: EncounterRepository = Depends(get_encounter_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
    service_repo: ServiceRepository = Depends(get_service_repository),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
) -> DentalChartService:
    return DentalChartService(
        chart_repo=chart_repo,
        procedure_repo=procedure_repo,
        encounter_repo=encounter_repo,
        patient_repo=patient_repo,
        service_repo=service_repo,
        activity_repo=activity_repo,
    )



# --- Authentication & Authorization Dependencies ---

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    user_repo: UserRepository = Depends(get_user_repository),
    session_repo: UserSessionRepository = Depends(get_session_repository),
) -> User:
    """
    Validates Bearer JWT access token, enforces active server-side session,
    and resolves the active user entity.
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

    # Server-side session verification for 7-day token security & instant revocation
    sid_str = payload.get("sid")
    if sid_str:
        try:
            sid = UUID(sid_str)
            active_session = await session_repo.get_by_id(sid)
            if not active_session or not active_session.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session has been revoked or expired.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed session ID in token.",
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


def require_role(*allowed_roles: str) -> Callable:
    """
    Factory dependency enforcing role-based authorization for one or more permitted roles.
    Matches case-insensitively to support both "admin" / "Admin", "receptionist" / "Receptionist", etc.
    """
    normalized_allowed = {r.strip().lower() for r in allowed_roles}

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role_str = str(current_user.role.value).strip().lower()
        if user_role_str not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: user role '{current_user.role.value}' does not have required permissions.",
            )
        return current_user

    return role_checker


def get_medical_alert_service(
    alert_repo: MedicalAlertRepository = Depends(get_medical_alert_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
) -> MedicalAlertService:
    return MedicalAlertService(alert_repo, patient_repo, activity_repo)


def get_lead_status_service(
    session: AsyncSession = Depends(get_db_session),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
):
    from app.application.services.lead_status_service import LeadStatusService
    return LeadStatusService(session, activity_repo)


# Pre-configured role dependencies
require_admin = require_role("admin", "Platform Owner", "Super Admin")
require_receptionist = require_role("receptionist", "Receptionist", "admin", "Admin", "Super Admin", "Clinic Branch Manager")
require_doctor = require_role("doctor", "Doctor", "admin", "Admin", "Super Admin")
require_doctor_strictly = require_role("doctor", "Doctor")


def require_roles(allowed_roles: list) -> Callable:
    """
    Dependency checking that current user role is one of the provided roles (supports UserRole enum or str).
    """
    role_strings = [r.value if hasattr(r, "value") else str(r) for r in allowed_roles]
    return require_role(*role_strings)


# ---------------------------------------------------------
# Integration Client Dependencies
# ---------------------------------------------------------

def get_integration_client_repository(
    session: AsyncSession = Depends(get_db_session),
):
    from app.infrastructure.repositories.postgres_integration_client_repo import (
        PostgresIntegrationClientRepository,
    )
    return PostgresIntegrationClientRepository(session)


def get_integration_client_service(
    client_repo=Depends(get_integration_client_repository),
):
    from app.application.services.integration_client_service import (
        IntegrationClientService,
    )
    return IntegrationClientService(client_repo)


async def get_current_integration_client(
    request: Request,
    service=Depends(get_integration_client_service),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
):
    from app.domain.models.integration import IntegrationClient

    raw_key = request.headers.get("X-Marlow-Key")
    if not raw_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key in X-Marlow-Key header",
        )

    # Resolve client IP
    client_ip = request.headers.get("X-Forwarded-For")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    elif request.client:
        client_ip = request.client.host
    else:
        client_ip = None

    client: Optional[IntegrationClient] = await service.authenticate_key(
        raw_key=raw_key.strip(),
        client_ip=client_ip,
    )
    if not client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key",
        )

    # Audit integration call with client ID
    try:
        await activity_repo.log_activity(
            action="integration_api_call",
            entity_type="integration_client",
            entity_id=str(client.id),
            user_id=client.created_by_user_id,
            details={
                "client_name": client.name,
                "endpoint": request.url.path,
                "method": request.method,
                "scopes": client.scopes,
            },
            ip_address=client_ip,
        )
    except Exception:
        pass

    return client


def require_integration_scope(required_scope: str):
    async def scope_checker(
        client=Depends(get_current_integration_client),
    ):
        if not client.has_scope(required_scope):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: integration client lacks required scope '{required_scope}'",
            )
        return client

    scope_checker.required_scope = required_scope
    return scope_checker


# ---------------------------------------------------------------------------
# Stage-2 dependency factories: Reviews, Blog Posts, Social Links
# ---------------------------------------------------------------------------

from app.application.services.content_service import (
    BlogPostService,
    GalleryService,
    ReviewService,
    SocialLinkService,
)
from app.infrastructure.repositories.postgres_content_repo import (
    PostgresBlogPostRepository,
    PostgresGalleryRepository,
    PostgresReviewRepository,
    PostgresSocialLinkRepository,
)


def get_review_service(session: AsyncSession = Depends(get_db_session)) -> ReviewService:
    """Provides a ReviewService bound to the current database session."""
    return ReviewService(PostgresReviewRepository(session))


def get_blog_post_service(session: AsyncSession = Depends(get_db_session)) -> BlogPostService:
    """Provides a BlogPostService bound to the current database session."""
    return BlogPostService(PostgresBlogPostRepository(session))


def get_social_link_service(session: AsyncSession = Depends(get_db_session)) -> SocialLinkService:
    """Provides a SocialLinkService bound to the current database session."""
    return SocialLinkService(PostgresSocialLinkRepository(session))


def get_gallery_service(session: AsyncSession = Depends(get_db_session)) -> GalleryService:
    """Provides a GalleryService bound to the current database session."""
    return GalleryService(PostgresGalleryRepository(session))

