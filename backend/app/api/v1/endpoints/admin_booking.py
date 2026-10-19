from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_activity_log_repository,
    get_booking_eligibility_service,
    get_booking_flow_settings_repository,
    get_booking_settings_service,
    get_db_session,
    require_admin,
)
from app.application.dtos.booking_settings_dto import (
    AffectedBookingDto,
    BookabilityCheckItem,
    BookabilityCheckResponse,
    BookingFlowSettingsDto,
    BookingFlowSettingsUpdateRequest,
    BookingModeUpdateRequest,
    BookingModeUpdateResponse,
    BookingSettingsResponse,
    ClinicClosureCreateRequest,
    ClinicClosureDto,
    ClinicClosureUpdateRequest,
    CreateClosureResponse,
    CreateProviderAvailabilityResponse,
    CreateProviderTimeOffResponse,
    OnlineBookingRulesUpdateRequest,
    ProviderAvailabilityCreateRequest,
    ProviderAvailabilityDto,
    ProviderTimeOffCreateRequest,
    ProviderTimeOffDto,
    ReminderTemplateUpdateRequest,
    RescheduleTasksRequest,
    RescheduleTasksResponse,
    StaffUserPickerItem,
    WorkingHoursDto,
    WorkingHoursUpdateRequest,
)
from app.application.services.booking_eligibility_service import BookingEligibilityService
from app.application.services.booking_settings_service import BookingSettingsService
from app.domain.models.booking_flow import BookingFlowSettings
from app.domain.models.user import User
from app.domain.repositories.booking_flow_settings_repo import BookingFlowSettingsRepository
from app.infrastructure.database.orm_models import ServiceORM, UserORM
from app.infrastructure.repositories.postgres_activity_repo import (
    PostgresActivityLogRepository,
    record_activity,
)

router = APIRouter(prefix="/admin/booking", tags=["Admin Booking Settings"], dependencies=[Depends(require_admin)])


@router.get("/settings", response_model=BookingSettingsResponse)
async def get_booking_settings(
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> BookingSettingsResponse:
    """Returns current emergency booking mode, pause metadata, and advance booking window."""
    return await service.get_admin_settings()


@router.post("/mode", response_model=BookingModeUpdateResponse)
async def update_booking_mode(
    req: BookingModeUpdateRequest,
    current_user: User = Depends(require_admin),
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> BookingModeUpdateResponse:
    """
    Updates emergency booking mode (open | paused | closed).
    Synchronizes public marquee announcement banner and returns affected future bookings.
    Audited with before and after state.
    """
    settings_resp, affected = await service.update_booking_mode(
        mode=req.mode,
        message=req.message,
        resume_on=req.resumeOn,
        user_id=current_user.id,
    )
    return BookingModeUpdateResponse(
        settings=settings_resp,
        affectedBookings=affected,
    )


@router.get("/affected-bookings", response_model=List[AffectedBookingDto])
async def get_affected_bookings(
    start_date: date = Query(..., alias="startDate"),
    end_date: Optional[date] = Query(None, alias="endDate"),
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> List[AffectedBookingDto]:
    """Retrieves non-cancelled future bookings scheduled in the specified period."""
    return await service.get_affected_bookings(start_date=start_date, end_date=end_date)


@router.post("/reschedule-tasks", response_model=RescheduleTasksResponse, status_code=status.HTTP_201_CREATED)
async def create_reschedule_tasks(
    req: RescheduleTasksRequest,
    current_user: User = Depends(require_admin),
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> RescheduleTasksResponse:
    """
    Creates one high-priority reception reschedule task per affected booking:
    'Call to reschedule: <patient> (<date>)'.
    Idempotent: running multiple times does not duplicate tasks.
    NEVER cancels or moves bookings automatically.
    """
    task_ids = await service.create_reschedule_tasks(
        booking_ids=req.bookingIds,
        user_id=current_user.id,
    )
    return RescheduleTasksResponse(
        tasksCreated=len(task_ids),
        taskIds=task_ids,
    )


@router.get("/closures", response_model=List[ClinicClosureDto])
async def list_closures(
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> List[ClinicClosureDto]:
    """Lists all planned calendar closures."""
    return await service.list_closures()


@router.post("/closures", response_model=CreateClosureResponse, status_code=status.HTTP_201_CREATED)
async def create_closure(
    req: ClinicClosureCreateRequest,
    current_user: User = Depends(require_admin),
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> CreateClosureResponse:
    """
    Creates a new planned closure date range, discovers affected bookings, and writes audit log.
    """
    closure_dto, affected = await service.create_closure(
        start_date=req.startDate,
        end_date=req.endDate,
        reason=req.reason,
        message=req.message,
        user_id=current_user.id,
    )
    return CreateClosureResponse(
        closure=closure_dto,
        affectedBookings=affected,
    )


@router.put("/closures/{closure_id}", response_model=ClinicClosureDto)
async def update_closure(
    closure_id: UUID,
    req: ClinicClosureUpdateRequest,
    current_user: User = Depends(require_admin),
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> ClinicClosureDto:
    """Updates an existing calendar closure. Audited with before and after."""
    return await service.update_closure(
        closure_id=closure_id,
        start_date=req.startDate,
        end_date=req.endDate,
        reason=req.reason,
        message=req.message,
        user_id=current_user.id,
    )


@router.delete("/closures/{closure_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_closure(
    closure_id: UUID,
    current_user: User = Depends(require_admin),
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> None:
    """Deletes a calendar closure. Audited."""
    await service.delete_closure(closure_id=closure_id, user_id=current_user.id)


@router.get("/working-hours", response_model=List[WorkingHoursDto])
async def get_working_hours(
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> List[WorkingHoursDto]:
    """Retrieves single source of truth clinic working hours across all 7 days of the week."""
    return await service.get_public_working_hours()


@router.put("/working-hours", response_model=List[WorkingHoursDto])
async def update_working_hours(
    updates: List[WorkingHoursUpdateRequest],
    current_user: User = Depends(require_admin),
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> List[WorkingHoursDto]:
    """
    Updates clinic working hours and closed flags.
    The public footer, contact hours, and booking calendar automatically reflect these hours.
    Audited with before and after.
    """
    raw_updates = [u.model_dump() for u in updates]
    return await service.update_working_hours(updates=raw_updates, user_id=current_user.id)


@router.put("/rules", response_model=BookingSettingsResponse)
async def update_online_booking_rules(
    req: OnlineBookingRulesUpdateRequest,
    current_user: User = Depends(require_admin),
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> BookingSettingsResponse:
    """Updates online booking rules: slot interval minutes, min lead time hours, advance booking days, and optional reminder template."""
    return await service.update_online_booking_rules(
        slot_interval_minutes=req.slotIntervalMinutes,
        min_lead_time_hours=req.minLeadTimeHours,
        advance_booking_days=req.advanceBookingDays,
        reminder_template=req.reminderTemplate,
        waiting_threshold_minutes=req.waitingThresholdMinutes,
        file_number_prefix=req.fileNumberPrefix,
        payments_enabled=req.paymentsEnabled,
        user_id=current_user.id,
    )


@router.put("/reminder-template", response_model=BookingSettingsResponse)
async def update_reminder_template(
    req: ReminderTemplateUpdateRequest,
    current_user: User = Depends(require_admin),
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> BookingSettingsResponse:
    """Updates appointment WhatsApp/SMS reminder template (strictly non-clinical logistics). Audited."""
    return await service.update_reminder_template(
        template=req.template,
        user_id=current_user.id,
    )


@router.get("/provider-availability", response_model=List[ProviderAvailabilityDto])
async def list_provider_availabilities(
    teamMemberId: Optional[UUID] = Query(None),
    clinicId: Optional[UUID] = Query(None),
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> List[ProviderAvailabilityDto]:
    """Retrieves weekly recurring shift schedules and breaks for clinicians."""
    return await service.list_provider_availabilities(team_member_id=teamMemberId, clinic_id=clinicId)


@router.post("/provider-availability", response_model=CreateProviderAvailabilityResponse)
async def save_provider_availability(
    req: ProviderAvailabilityCreateRequest,
    current_user: User = Depends(require_admin),
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> CreateProviderAvailabilityResponse:
    """Creates or updates a recurring clinician shift schedule. Returns affected future bookings."""
    dto, affected = await service.save_provider_availability(req=req, user_id=current_user.id)
    return CreateProviderAvailabilityResponse(
        availability=dto,
        affectedBookings=affected,
    )


@router.delete("/provider-availability/{avail_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider_availability(
    avail_id: UUID,
    current_user: User = Depends(require_admin),
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> None:
    """Deletes a clinician shift schedule entry."""
    await service.delete_provider_availability(avail_id=avail_id, user_id=current_user.id)


@router.get("/provider-time-off", response_model=List[ProviderTimeOffDto])
async def list_provider_time_off(
    teamMemberId: Optional[UUID] = Query(None),
    futureOnly: bool = Query(False),
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> List[ProviderTimeOffDto]:
    """Retrieves scheduled time off and leaves for clinicians."""
    return await service.list_provider_time_off(team_member_id=teamMemberId, future_only=futureOnly)


@router.post("/provider-time-off", response_model=CreateProviderTimeOffResponse)
async def save_provider_time_off(
    req: ProviderTimeOffCreateRequest,
    current_user: User = Depends(require_admin),
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> CreateProviderTimeOffResponse:
    """Records clinician vacation/time off and warns with affected scheduled bookings without auto-canceling."""
    dto, affected = await service.save_provider_time_off(req=req, user_id=current_user.id)
    return CreateProviderTimeOffResponse(
        timeOff=dto,
        affectedBookings=affected,
    )


@router.delete("/provider-time-off/{time_off_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider_time_off(
    time_off_id: UUID,
    current_user: User = Depends(require_admin),
    service: BookingSettingsService = Depends(get_booking_settings_service),
) -> None:
    """Removes a clinician time off record."""
    await service.delete_provider_time_off(time_off_id=time_off_id, user_id=current_user.id)


# ---------------------------------------------------------------------------
# Booking Flow & Call Desk Settings
# ---------------------------------------------------------------------------

@router.get("/flow-settings", response_model=BookingFlowSettingsDto)
async def get_booking_flow_settings(
    flow_settings_repo: BookingFlowSettingsRepository = Depends(get_booking_flow_settings_repository),
) -> BookingFlowSettingsDto:
    """Retrieves organization booking flow, lead capture, and call desk settings."""
    settings = await flow_settings_repo.get_settings()
    return BookingFlowSettingsDto(
        id=settings.id,
        organizationId=settings.organization_id,
        followupGapsMinutes=settings.followup_gaps_minutes,
        maxAttempts=settings.max_attempts,
        coldWaitHours=settings.cold_wait_hours,
        holdMinutes=settings.hold_minutes,
        fallbackOwnerUserId=settings.fallback_owner_user_id,
        autoConfirmOnline=settings.auto_confirm_online,
        daysShown=settings.days_shown,
        showPatientsTreated=settings.show_patients_treated,
        leadCaptureNotice=settings.lead_capture_notice,
    )


@router.put("/flow-settings", response_model=BookingFlowSettingsDto)
async def update_booking_flow_settings(
    req: BookingFlowSettingsUpdateRequest,
    current_user: User = Depends(require_admin),
    flow_settings_repo: BookingFlowSettingsRepository = Depends(get_booking_flow_settings_repository),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
) -> BookingFlowSettingsDto:
    """Updates organization booking flow settings with validation. Audited."""
    current = await flow_settings_repo.get_settings()
    before_state = {
        "followup_gaps_minutes": current.followup_gaps_minutes,
        "max_attempts": current.max_attempts,
        "cold_wait_hours": current.cold_wait_hours,
        "hold_minutes": current.hold_minutes,
        "fallback_owner_user_id": str(current.fallback_owner_user_id) if current.fallback_owner_user_id else None,
        "auto_confirm_online": current.auto_confirm_online,
        "days_shown": current.days_shown,
        "show_patients_treated": current.show_patients_treated,
        "lead_capture_notice": current.lead_capture_notice,
    }
    updated = BookingFlowSettings(
        id=current.id,
        organization_id=current.organization_id,
        followup_gaps_minutes=req.followupGapsMinutes,
        max_attempts=req.maxAttempts,
        cold_wait_hours=req.coldWaitHours,
        hold_minutes=req.holdMinutes,
        fallback_owner_user_id=req.fallbackOwnerUserId,
        auto_confirm_online=req.autoConfirmOnline,
        days_shown=req.daysShown,
        show_patients_treated=req.showPatientsTreated,
        lead_capture_notice=req.leadCaptureNotice.strip(),
    )
    saved = await flow_settings_repo.update_settings(updated)
    after_state = {
        "followup_gaps_minutes": saved.followup_gaps_minutes,
        "max_attempts": saved.max_attempts,
        "cold_wait_hours": saved.cold_wait_hours,
        "hold_minutes": saved.hold_minutes,
        "fallback_owner_user_id": str(saved.fallback_owner_user_id) if saved.fallback_owner_user_id else None,
        "auto_confirm_online": saved.auto_confirm_online,
        "days_shown": saved.days_shown,
        "show_patients_treated": saved.show_patients_treated,
        "lead_capture_notice": saved.lead_capture_notice,
    }
    await record_activity(
        activity_repo,
        action="update_booking_flow_settings",
        entity_type="booking_flow_settings",
        entity_id=str(saved.id),
        user_id=current_user.id,
        details={"before": before_state, "after": after_state},
    )
    return BookingFlowSettingsDto(
        id=saved.id,
        organizationId=saved.organization_id,
        followupGapsMinutes=saved.followup_gaps_minutes,
        maxAttempts=saved.max_attempts,
        coldWaitHours=saved.cold_wait_hours,
        holdMinutes=saved.hold_minutes,
        fallbackOwnerUserId=saved.fallback_owner_user_id,
        autoConfirmOnline=saved.auto_confirm_online,
        daysShown=saved.days_shown,
        showPatientsTreated=saved.show_patients_treated,
        leadCaptureNotice=saved.lead_capture_notice,
    )


@router.get("/staff-users", response_model=List[StaffUserPickerItem])
async def list_staff_users_for_picker(
    db_session: AsyncSession = Depends(get_db_session),
) -> List[StaffUserPickerItem]:
    """Returns active staff users eligible for task fallback ownership."""
    stmt = (
        select(UserORM)
        .where(
            UserORM.is_active.is_(True),
            UserORM.role.in_(["admin", "doctor", "receptionist"]),
        )
        .order_by(UserORM.full_name.asc())
    )
    res = await db_session.execute(stmt)
    users = res.scalars().all()
    return [
        StaffUserPickerItem(
            id=u.id,
            fullName=u.full_name,
            email=u.email,
            role=u.role.value if hasattr(u.role, "value") else str(u.role),
        )
        for u in users
    ]


# ---------------------------------------------------------------------------
# Bookability Check
# ---------------------------------------------------------------------------

REASON_MESSAGES = {
    "NO_ACTIVE_CLINIC": "No active clinic branch offers this service.",
    "NO_ELIGIBLE_DOCTOR": "No active doctor is assigned or qualified to perform this procedure at offered clinics.",
    "NO_ACTIVE_SCHEDULE": "No assigned doctor has active working hours or shifts on the schedule.",
    "NO_SLOTS_IN_HORIZON": "All appointments are booked or doctors are on time off during the booking horizon window.",
}

REASON_FIX_LINKS = {
    "NO_ACTIVE_CLINIC": "/admin/services",
    "NO_ELIGIBLE_DOCTOR": "/admin/services",
    "NO_ACTIVE_SCHEDULE": "/admin/booking?tab=clinicians",
    "NO_SLOTS_IN_HORIZON": "/admin/booking?tab=clinicians",
}


@router.get("/bookability-check", response_model=BookabilityCheckResponse)
async def check_catalog_bookability(
    eligibility_service: BookingEligibilityService = Depends(get_booking_eligibility_service),
    db_session: AsyncSession = Depends(get_db_session),
) -> BookabilityCheckResponse:
    """
    Evaluates every procedure in the catalog against clinics, doctors, schedules, and slots.
    Identifies unbookable services and returns actionable direct links to fix each issue.
    """
    stmt = select(ServiceORM).order_by(ServiceORM.display_order.asc(), ServiceORM.title.asc())
    res = await db_session.execute(stmt)
    all_services = list(res.scalars().all())

    items: List[BookabilityCheckItem] = []
    bookable_count = 0

    for svc in all_services:
        eval_result = await eligibility_service.evaluate_service(svc, clinic_id=None)
        is_eligible = eval_result.is_eligible and svc.is_active and getattr(svc, "bookable_online", True)
        if is_eligible:
            bookable_count += 1

        reasons = list(eval_result.reasons)
        if not svc.is_active:
            reasons.append("SERVICE_INACTIVE")
        if not getattr(svc, "bookable_online", True):
            reasons.append("ONLINE_BOOKING_DISABLED")

        messages = [REASON_MESSAGES.get(r, f"Condition unmet: {r}") for r in reasons]
        primary_reason = reasons[0] if reasons else None
        fix_link = REASON_FIX_LINKS.get(primary_reason, "/admin/services") if primary_reason else "/admin/services"

        items.append(
            BookabilityCheckItem(
                serviceId=svc.id,
                serviceSlug=svc.slug,
                serviceTitle=svc.title,
                category=svc.category,
                isActive=svc.is_active,
                isBookableOnline=getattr(svc, "bookable_online", True),
                isEligible=is_eligible,
                status="eligible" if is_eligible else "ineligible",
                reasons=reasons,
                reasonMessages=messages,
                fixLink=fix_link,
                eligibleClinicsCount=len(eval_result.eligible_clinics),
                eligibleDoctorsCount=len(eval_result.eligible_doctors),
                firstAvailableDate=eval_result.first_available_date.isoformat() if eval_result.first_available_date else None,
                firstAvailableSlot=eval_result.first_available_slot,
            )
        )

    return BookabilityCheckResponse(
        totalServices=len(items),
        bookableServices=bookable_count,
        unbookableServices=len(items) - bookable_count,
        items=items,
    )


