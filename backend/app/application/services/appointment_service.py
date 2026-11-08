from sqlalchemy import or_
import json
import random
import sys
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from uuid import UUID, uuid4
from fastapi import HTTPException, status as http_status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dtos.appointment_dto import (
    AppointmentCreateRequest,
    AppointmentCreateResponse,
)
from app.core.logging import logger
from app.domain.models.appointment import Appointment
from sqlalchemy import select
from app.domain.models.booking_crm import Booking, Patient
from app.domain.models.booking_flow import LeadStatus
from app.domain.repositories.appointment_repo import AppointmentRepository
from app.domain.repositories.booking_flow_settings_repo import BookingFlowSettingsRepository
from app.domain.repositories.booking_repo import BookingRepository
from app.domain.repositories.booking_settings_repo import BookingSettingsRepository
from app.domain.repositories.lead_event_repo import LeadEventRepository
from app.domain.repositories.lead_repo import LeadRepository
from app.domain.repositories.patient_repo import PatientRepository
from app.domain.repositories.service_repo import ServiceRepository
from app.application.services.reception_service import _acquire_schedule_lock
from app.application.services.availability_service import AvailabilityService
from app.infrastructure.database.orm_models import (
    ActivityLogORM,
    ClinicORM,
    ClinicServiceORM,
    ServiceORM,
    ServiceProviderORM,
    TeamMemberClinicORM,
    TeamMemberORM,
)


class AppointmentService:
    """
    Coordinates the business steps needed to book an appointment.

    This service creates unique confirmation codes, handles collisions if two patients
    generate the same code, ensures patient deduplication, and stores canonical bookings
    for reception triage as well as legacy appointments for backward compatibility.
    """

    def __init__(
        self,
        repository: AppointmentRepository,
        booking_repo: Optional[BookingRepository] = None,
        patient_repo: Optional[PatientRepository] = None,
        booking_settings_repo: Optional[BookingSettingsRepository] = None,
        availability_service: Optional[AvailabilityService] = None,
        session: Optional[AsyncSession] = None,
        lead_repo: Optional[LeadRepository] = None,
        lead_event_repo: Optional[LeadEventRepository] = None,
        booking_flow_settings_repo: Optional[BookingFlowSettingsRepository] = None,
        eligibility_service: Optional[object] = None,
        service_repo: Optional[ServiceRepository] = None,
    ) -> None:
        """Stores repositories for appointments, canonical bookings, patient charts, and clinic availability rules."""
        self._repository = repository
        self._booking_repo = booking_repo
        self._patient_repo = patient_repo
        self._booking_settings_repo = booking_settings_repo
        self._availability_service = availability_service
        self._session = session
        self._lead_repo = lead_repo
        self._lead_event_repo = lead_event_repo
        self._booking_flow_settings_repo = booking_flow_settings_repo
        self._eligibility_service = eligibility_service
        self._service_repo = service_repo

    @staticmethod
    def generate_confirmation_id() -> str:
        """Creates a readable tracking ID in the format MD-YYYY-XXXX (such as MD-2026-4821)."""
        year = datetime.now(timezone.utc).year
        suffix = random.randint(1000, 9999)
        return f"MD-{year}-{suffix}"

    async def _log_scope_rejection(
        self,
        clinic_id: Optional[UUID],
        service_id: Optional[str],
        team_member_id: Optional[UUID],
        reason: str,
        source: str = "public",
    ) -> None:
        if self._session is None:
            return
        try:
            details = {
                "service_id": str(service_id) if service_id else None,
                "team_member_id": str(team_member_id) if team_member_id else None,
                "clinic_id": str(clinic_id) if clinic_id else None,
                "reason": reason,
                "source": source,
            }
            activity = ActivityLogORM(
                id=uuid4(),
                user_id=None,
                action="booking_rejected_service_scope",
                entity_type="booking",
                entity_id=None,
                details_json=json.dumps(details),
                created_at=datetime.now(timezone.utc),
            )
            self._session.add(activity)
            await self._session.flush()
        except Exception as exc:
            logger.warning(f"Failed to record booking_rejected_service_scope audit log: {exc}")

    async def _validate_service_scope(self, service_id: str, clinic_id: Optional[UUID], team_member_id: Optional[UUID]) -> None:
        if clinic_id is None or self._session is None:
            if self._service_repo is not None:
                service = await self._service_repo.get_by_slug(service_id)
                if service is None:
                    try:
                        service = await self._service_repo.get_by_id(UUID(service_id))
                    except ValueError:
                        service = None
                if service is None:
                    raise HTTPException(
                        status_code=http_status.HTTP_409_CONFLICT,
                        detail="The requested service is not available.",
                    )
                if not service.is_active or not service.is_public or not service.bookable_online:
                    raise HTTPException(
                        status_code=http_status.HTTP_409_CONFLICT,
                        detail="The requested service is not currently bookable.",
                    )
            return

        clinic = await self._session.get(ClinicORM, clinic_id)
        if clinic is None or not clinic.is_active:
            await self._log_scope_rejection(
                clinic_id=clinic_id,
                service_id=service_id,
                team_member_id=team_member_id,
                reason="Clinic branch does not exist or is inactive",
                source="public",
            )
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="The selected clinic is not active.",
            )

        service = None
        if self._service_repo is not None:
            service = await self._service_repo.get_by_slug(service_id)
            if service is None:
                try:
                    service_uuid = UUID(service_id)
                    service = await self._service_repo.get_by_id(service_uuid)
                except ValueError:
                    service = None
        if service is None:
            stmt = select(ServiceORM).where(ServiceORM.slug == service_id.lower())
            res = await self._session.execute(stmt)
            service = res.scalar_one_or_none()
        if service is None:
            try:
                service = await self._session.get(ServiceORM, UUID(service_id))
            except ValueError:
                service = None
        if service is None:
            await self._log_scope_rejection(
                clinic_id=clinic_id,
                service_id=service_id,
                team_member_id=team_member_id,
                reason="Service does not exist",
                source="public",
            )
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="The requested service is not available.",
            )
        if not service.is_active or not service.is_public or not service.bookable_online:
            await self._log_scope_rejection(
                clinic_id=clinic_id,
                service_id=str(service.id),
                team_member_id=team_member_id,
                reason="Service is inactive, private, or not bookable online",
                source="public",
            )
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="The requested service is not currently bookable.",
            )

        offered = await self._session.execute(
            select(ClinicServiceORM).where(
                ClinicServiceORM.clinic_id == clinic_id,
                ClinicServiceORM.service_id == service.id,
                ClinicServiceORM.is_active.is_(True),
            )
        )
        if offered.scalar_one_or_none() is None:
            await self._log_scope_rejection(
                clinic_id=clinic_id,
                service_id=str(service.id),
                team_member_id=team_member_id,
                reason="Service is not offered at clinic branch",
                source="public",
            )
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"{service.title} is not offered at {clinic.name}.",
            )

        if team_member_id is None:
            eligible = await self._session.execute(
                select(ServiceProviderORM.team_member_id)
                .where(
                    ServiceProviderORM.service_id == service.id,
                    ServiceProviderORM.clinic_id == clinic_id,
                    ServiceProviderORM.is_active.is_(True),
                )
            )
            eligible_ids = {row[0] for row in eligible.all() if row[0] is not None}
            if not eligible_ids:
                await self._log_scope_rejection(
                    clinic_id=clinic_id,
                    service_id=str(service.id),
                    team_member_id=None,
                    reason="No doctor is authorized for service at branch",
                    source="public",
                )
                raise HTTPException(
                    status_code=http_status.HTTP_409_CONFLICT,
                    detail=f"No doctor is currently authorized to provide {service.title} at {clinic.name}.",
                )
            assigned = await self._session.execute(
                select(TeamMemberORM.id)
                .outerjoin(
                    TeamMemberClinicORM,
                    (TeamMemberClinicORM.team_member_id == TeamMemberORM.id)
                    & (TeamMemberClinicORM.clinic_id == clinic_id)
                    & (TeamMemberClinicORM.is_active.is_(True)),
                )
                .where(
                    TeamMemberORM.is_active.is_(True),
                    TeamMemberORM.id.in_(list(eligible_ids)),
                    or_(
                        TeamMemberORM.clinic_id == clinic_id,
                        TeamMemberClinicORM.id.is_not(None),
                    ),
                )
            )
            if assigned.first() is None:
                await self._log_scope_rejection(
                    clinic_id=clinic_id,
                    service_id=str(service.id),
                    team_member_id=None,
                    reason="No authorized doctor is assigned to branch",
                    source="public",
                )
                raise HTTPException(
                    status_code=http_status.HTTP_409_CONFLICT,
                    detail=f"No doctor is currently authorized to provide {service.title} at {clinic.name}.",
                )
            return

        doctor = await self._session.get(TeamMemberORM, team_member_id)
        if doctor is None or not doctor.is_active:
            await self._log_scope_rejection(
                clinic_id=clinic_id,
                service_id=str(service.id),
                team_member_id=team_member_id,
                reason="Selected doctor does not exist or is inactive",
                source="public",
            )
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="The selected doctor is not active.",
            )

        assigned = await self._session.execute(
            select(TeamMemberClinicORM).where(
                TeamMemberClinicORM.team_member_id == team_member_id,
                TeamMemberClinicORM.clinic_id == clinic_id,
                TeamMemberClinicORM.is_active.is_(True),
            )
        )
        if assigned.scalar_one_or_none() is None and doctor.clinic_id != clinic_id:
            await self._log_scope_rejection(
                clinic_id=clinic_id,
                service_id=str(service.id),
                team_member_id=team_member_id,
                reason="Doctor is not assigned to branch",
                source="public",
            )
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Dr. {doctor.display_name} does not offer {service.title} at {clinic.name}. Please select another doctor.",
            )

        provider = await self._session.execute(
            select(ServiceProviderORM).where(
                ServiceProviderORM.service_id == service.id,
                ServiceProviderORM.team_member_id == team_member_id,
                ServiceProviderORM.clinic_id == clinic_id,
                ServiceProviderORM.is_active.is_(True),
            )
        )
        if provider.scalar_one_or_none() is None:
            await self._log_scope_rejection(
                clinic_id=clinic_id,
                service_id=str(service.id),
                team_member_id=team_member_id,
                reason="Doctor is not authorized for service at branch",
                source="public",
            )
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Dr. {doctor.display_name} does not offer {service.title} at {clinic.name}. Please select another doctor.",
            )

    async def create_appointment_request(
        self,
        request: AppointmentCreateRequest,
    ) -> AppointmentCreateResponse:
        """
        Takes patient booking details, assigns a tracking ID, deduplicates or creates the patient chart,
        and saves both the canonical reception booking and legacy appointment record.
        Enforces emergency pause, weekly closed days, planned closures, and advance booking window.
        """
        parsed_date = date.fromisoformat(request.preferredDate)

        # Enforce clinic booking settings, emergency pause, weekly closed days, and closures
        if self._booking_settings_repo is not None:
            settings = await self._booking_settings_repo.get_settings(clinic_id=request.clinicId)
            if settings.booking_mode != "open":
                msg = settings.pause_message or "Online booking is temporarily unavailable. Please call our clinic to schedule."
                raise HTTPException(
                    status_code=http_status.HTTP_423_LOCKED,
                    detail=msg,
                )

            today_utc = datetime.now(timezone.utc).date()
            if settings.advance_booking_days and parsed_date > today_utc + timedelta(days=settings.advance_booking_days):
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Preferred appointment date cannot be more than {settings.advance_booking_days} days in advance.",
                )

            # Weekly closed days validation
            working_hours = await self._booking_settings_repo.list_working_hours(clinic_id=request.clinicId)
            dow = parsed_date.weekday()  # 0=Mon .. 6=Sun
            wh = next((h for h in working_hours if h.day_of_week == dow), None)
            if wh and wh.is_closed:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Clinic is closed on {wh.day_name}s.",
                )

            # Planned calendar closures validation
            closures = await self._booking_settings_repo.list_closures(clinic_id=request.clinicId)
            for c in closures:
                if c.start_date <= parsed_date <= c.end_date:
                    closure_reason = f": {c.reason}" if c.reason else ""
                    raise HTTPException(
                        status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Clinic is closed on {parsed_date.isoformat()}{closure_reason}.",
                    )

        await self._validate_service_scope(
            service_id=request.serviceId,
            clinic_id=request.clinicId,
            team_member_id=request.teamMemberId,
        )

        # Enforce advisory lock and availability validation
        async with _acquire_schedule_lock(self._booking_repo, None, parsed_date):
            if self._availability_service is not None:
                is_available = await self._availability_service.is_slot_available(
                    target_date=parsed_date,
                    time_str=request.preferredTime,
                    service_id=request.serviceId,
                    team_member_id=request.teamMemberId,
                    clinic_id=request.clinicId,
                )
                if not is_available:
                    raise HTTPException(
                        status_code=http_status.HTTP_409_CONFLICT,
                        detail="Double-booking conflict: The selected time slot is no longer available. Please select another slot.",
                    )

            # Attempt creation with up to 2 retries on confirmation_id unique constraint collision
            max_attempts = 3
            for attempt in range(max_attempts):
                confirmation_id = self.generate_confirmation_id()
                patient_id = None

                db_session = self._session or getattr(self._repository, "_session", None) or getattr(self._booking_repo, "_session", None)
                savepoint_ctx = db_session.begin_nested() if (db_session is not None and hasattr(db_session, "begin_nested")) else None

                try:
                    if savepoint_ctx is not None:
                        await savepoint_ctx.__aenter__()

                    # Deduplicate or create patient record if patient repository is wired
                    is_existing_patient = False
                    if self._patient_repo is not None:
                        names = request.fullName.strip().split()
                        first = names[0] if names else "Patient"
                        last = " ".join(names[1:]) if len(names) > 1 else "Unknown"
                        dups = await self._patient_repo.find_duplicates(
                            first_name=first,
                            last_name=last,
                            phone=request.phone.strip(),
                            email=request.email.strip().lower() if request.email else None,
                        )
                        if dups:
                            patient_id = dups[0].id
                            is_existing_patient = True
                        else:
                            new_pat = Patient(
                                first_name=first,
                                last_name=last,
                                phone=request.phone.strip(),
                                email=request.email.strip().lower() if request.email else None,
                            )
                            saved_pat = await self._patient_repo.save(new_pat)
                            patient_id = saved_pat.id
                            is_existing_patient = False

                    # Determine team_member_id (explicitly chosen or auto-selected if single eligible doctor)
                    team_member_id = request.teamMemberId
                    if team_member_id is None and request.clinicId and self._eligibility_service is not None:
                        try:
                            eligible_docs = await self._eligibility_service.get_bookable_doctors_for_service_and_clinic(
                                service_id=request.serviceId,
                                clinic_id=request.clinicId,
                            )
                            if len(eligible_docs) == 1:
                                team_member_id = eligible_docs[0].id
                        except Exception:
                            pass

                    # Category approval check & confirmation rules
                    category_id = None
                    requires_category_approval = False
                    if db_session is not None and request.serviceId:
                        try:
                            from sqlalchemy import select, or_
                            from app.infrastructure.database.orm_models import ServiceORM, AppointmentCategoryORM
                            svc_uuid = None
                            try:
                                if isinstance(request.serviceId, UUID):
                                    svc_uuid = request.serviceId
                                else:
                                    svc_uuid = UUID(str(request.serviceId).strip())
                            except Exception:
                                pass

                            filters = [ServiceORM.slug == str(request.serviceId).strip().lower()]
                            if svc_uuid is not None:
                                filters.append(ServiceORM.id == svc_uuid)

                            s_res = await db_session.execute(select(ServiceORM).where(or_(*filters)))
                            svc_orm = s_res.scalars().first()
                            if svc_orm:
                                category_id = getattr(svc_orm, "category_id", None)
                                if category_id:
                                    cat_id_uuid = category_id if isinstance(category_id, UUID) else UUID(str(category_id))
                                    cat_res = await db_session.execute(
                                        select(AppointmentCategoryORM).where(AppointmentCategoryORM.id == cat_id_uuid)
                                    )
                                    cat_orm = cat_res.scalars().first()
                                    if cat_orm and cat_orm.requires_approval:
                                        requires_category_approval = True
                        except Exception as e:
                            logger.warning("Error checking service category approval: %s", type(e).__name__)

                    # Existing patients with normal service -> instant confirmation
                    # New patients or special categories requiring approval -> requested (requires receptionist review)
                    if is_existing_patient and not requires_category_approval:
                        booking_status = "confirmed"
                        approval_required = False
                    else:
                        booking_status = "requested"
                        approval_required = True

                    # Convert open lead if a leadToken was provided
                    lead_id = None
                    if request.leadToken and self._lead_repo is not None:
                        lead = await self._lead_repo.get_by_capture_token(request.leadToken)
                        if lead is not None:
                            lead_id = lead.id
                            lead.status = LeadStatus.CONVERTED.value
                            lead.last_activity_at = datetime.now(timezone.utc)
                            if patient_id is not None:
                                lead.patient_id = patient_id
                            await self._lead_repo.save(lead)

                            if self._lead_event_repo is not None:
                                await self._lead_event_repo.record_event(
                                    lead_id=lead.id,
                                    event_type="converted",
                                    actor_type="system",
                                    payload={
                                        "confirmation_id": confirmation_id,
                                        "booking_for": request.bookingFor or "myself",
                                    },
                                )

                    # Create canonical booking record for reception intake triage queue
                    if self._booking_repo is not None:
                        booking = Booking(
                            confirmation_id=confirmation_id,
                            preferred_date=parsed_date,
                            preferred_time=request.preferredTime,
                            patient_full_name=request.fullName.strip(),
                            patient_phone=request.phone.strip(),
                            patient_email=request.email.strip().lower() if request.email else None,
                            clinic_id=request.clinicId,
                            patient_id=patient_id,
                            service_id=request.serviceId,
                            team_member_id=team_member_id,
                            lead_id=lead_id,
                            source="website",
                            status=booking_status,
                            category_id=category_id,
                            approval_required=approval_required,
                            notes=request.notes,
                            utm_source=request.utmSource,
                            utm_campaign=request.utmCampaign,
                        )
                        saved_booking = await self._booking_repo.save(booking)

                        if db_session is not None:
                            try:
                                from app.application.services.notification_pipeline_service import NotificationPipelineService
                                pipeline = NotificationPipelineService(db_session)
                                event = "booking_confirmed" if booking_status == "confirmed" else "booking_created"
                                await pipeline.notify_booking_event(
                                    booking_id=saved_booking.id,
                                    event_type=event,
                                    patient_name=request.fullName.strip(),
                                    patient_phone=request.phone.strip(),
                                    details={
                                        "confirmation_id": confirmation_id,
                                        "date": parsed_date.isoformat(),
                                        "time": request.preferredTime,
                                        "service_title": str(request.serviceId),
                                    },
                                    clinic_id=request.clinicId,
                                    patient_id=patient_id,
                                )
                            except Exception as notif_err:
                                logger.warning("Automated notification dispatch skipped/error: %s", type(notif_err).__name__)

                    appointment = Appointment(
                        confirmation_id=confirmation_id,
                        service_id=request.serviceId,
                        preferred_date=parsed_date,
                        preferred_time=request.preferredTime,
                        patient_full_name=request.fullName,
                        patient_phone=request.phone,
                        patient_email=request.email or "",
                        notes=request.notes,
                        utm_source=request.utmSource,
                        utm_campaign=request.utmCampaign,
                    )

                    saved = await self._repository.save(appointment)

                    if savepoint_ctx is not None:
                        await savepoint_ctx.__aexit__(None, None, None)

                    # PHI-Safe Logging: Never log patient name, phone, email, notes, or insurance details
                    logger.info(
                        "Appointment request created: confirmation_id=%s, service=%s, date=%s",
                        saved.confirmation_id,
                        saved.service_id,
                        saved.preferred_date.isoformat(),
                    )

                    status_msg = "confirmed" if booking_status == "confirmed" else "received"
                    return AppointmentCreateResponse(
                        success=True,
                        confirmationId=saved.confirmation_id,
                        message=f"Appointment {status_msg} for {saved.preferred_date.isoformat()} at {saved.preferred_time}.",
                        estimatedCallbackWindow="Within 1 business hour (Monday to Thursday 8:00 AM to 6:00 PM Central)",
                    )
                except IntegrityError:
                    if savepoint_ctx is not None:
                        await savepoint_ctx.__aexit__(*sys.exc_info())
                    if attempt < max_attempts - 1:
                        logger.warning("Collision encountered on confirmation_id=%s, retrying...", confirmation_id)
                        continue
                    logger.error("Failed to generate unique confirmation_id after %d attempts.", max_attempts)
                    raise
                except Exception:
                    if savepoint_ctx is not None:
                        await savepoint_ctx.__aexit__(*sys.exc_info())
                    raise

