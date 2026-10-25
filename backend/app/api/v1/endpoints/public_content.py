import asyncio
import hashlib
import json
import secrets
from datetime import date, datetime, timezone
from typing import Any, List, Optional
from uuid import UUID
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.exc import IntegrityError

from app.api.deps import (
    get_announcement_service,
    get_availability_service,
    get_booking_eligibility_service,
    get_booking_flow_settings_repository,
    get_booking_settings_service,
    get_cms_service,
    get_lead_event_repository,
    get_lead_repository,
    get_organization_service,
    get_service_service,
    get_team_service,
)
from app.application.dtos.announcement_dto import AnnouncementResponse
from app.application.dtos.booking_settings_dto import (
    PublicAvailabilityResponse,
    PublicBookingStatusResponse,
    WorkingHoursDto,
)
from app.application.dtos.cms_dto import FaqResponse, PublicCmsResponse
from app.application.dtos.organization_dto import LocationResponse, OrganizationResponse
from app.application.dtos.public_booking_dto import (
    PublicBookingClinicItemDto,
    PublicBookingDoctorItemDto,
    PublicBookingServiceItemDto,
    PublicLeadCaptureRequest,
    PublicLeadCaptureResponse,
    PublicLeadUpdateRequest,
    PublicLeadUpdateResponse,
)
from app.application.dtos.service_dto import ServiceResponse
from app.application.dtos.team_dto import TeamMemberResponse
from app.application.services.announcement_service import AnnouncementService
from app.application.services.availability_service import AvailabilityService
from app.application.services.booking_eligibility_service import BookingEligibilityService
from app.application.services.booking_settings_service import BookingSettingsService
from app.application.services.cms_service import CmsService
from app.application.services.organization_service import OrganizationService
from app.application.services.service_service import ServiceService
from app.application.services.team_service import TeamService
from app.core.config import settings
from app.core.limiter import limiter
from app.domain.models.booking_crm import Lead
from app.domain.models.booking_flow import LeadStatus
from app.domain.models.phone_utils import normalize_pakistan_phone
from app.domain.repositories.booking_flow_settings_repo import BookingFlowSettingsRepository
from app.domain.repositories.lead_event_repo import LeadEventRepository
from app.domain.repositories.lead_repo import LeadRepository

router = APIRouter(prefix="/public", tags=["Public Content"])


def _compute_etag(data: Any) -> str:
    """Computes a deterministic hex ETag from serialized data."""
    serialized = json.dumps(data, sort_keys=True, default=str)
    return f'"{hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:16]}"'


@router.get("/content", response_model=PublicCmsResponse)
async def get_site_content(
    request: Request,
    response: Response,
    cms_service: CmsService = Depends(get_cms_service),
) -> Any:
    """Returns database-backed CMS copy for public frontend rendering."""
    data = await cms_service.get_public_cms()
    etag = _compute_etag(data.model_dump())
    response.headers["Cache-Control"] = "public, max-age=0, must-revalidate"
    response.headers["ETag"] = etag
    if request.headers.get("if-none-match") == etag:
        return Response(
            status_code=status.HTTP_304_NOT_MODIFIED,
            headers={"ETag": etag, "Cache-Control": "public, max-age=0, must-revalidate"},
        )
    return data


@router.get("/services", response_model=List[ServiceResponse])
async def get_public_services(
    service_service: ServiceService = Depends(get_service_service),
) -> List[ServiceResponse]:
    """Returns all active dental procedures for public display and booking."""
    services = await service_service.list_services(include_inactive=False, public_only=True)
    return [
        ServiceResponse(
            id=s.id,
            slug=s.slug,
            category=s.category,
            title=s.title,
            shortDesc=s.short_desc,
            fullDesc=s.full_desc,
            cashPrice=s.cash_price,
            duration=s.duration,
            code=s.code,
            insuranceNote=s.insurance_note,
            recommendedInterval=s.recommended_interval,
            displayOrder=s.display_order,
            isHighlighted=s.is_highlighted,
            isActive=s.is_active,
            isPublic=s.is_public,
            bookableOnline=getattr(s, "bookable_online", True),
            bufferMinutes=getattr(s, "buffer_minutes", 0),
            createdAt=s.created_at,
            updatedAt=s.updated_at,
        )
        for s in services
    ]


@router.get("/team", response_model=List[TeamMemberResponse])
async def get_public_team(
    team_service: TeamService = Depends(get_team_service),
) -> List[TeamMemberResponse]:
    """Returns all active clinicians and staff for public display."""
    members = await team_service.list_members(include_inactive=False)
    return [
        TeamMemberResponse(
            id=m.id,
            organizationId=m.organization_id,
            locationId=m.location_id,
            firstName=m.first_name,
            lastName=m.last_name,
            displayName=m.display_name,
            professionalTitle=m.professional_title,
            role=m.role,
            specialties=m.specialties,
            biography=m.biography,
            photoUrl=m.photo_url,
            education=m.education,
            credentials=m.credentials,
            licenseNumber=m.license_number,
            licenseState=m.license_state,
            servicesOffered=m.services_offered,
            displayOrder=m.display_order,
            isActive=m.is_active,
            createdAt=m.created_at,
            updatedAt=m.updated_at,
        )
        for m in members
    ]


@router.get("/locations", response_model=List[LocationResponse])
async def get_public_locations(
    org_service: OrganizationService = Depends(get_organization_service),
) -> List[LocationResponse]:
    """Returns all active office locations."""
    locations = await org_service.list_locations(include_inactive=False)
    return [
        LocationResponse(
            id=loc.id,
            organizationId=loc.organization_id,
            name=loc.name,
            addressLine1=loc.address_line1,
            addressLine2=loc.address_line2,
            city=loc.city,
            state=loc.state,
            postalCode=loc.postal_code,
            country=loc.country,
            phone=loc.phone,
            email=loc.email,
            hoursInfo=loc.hours_info,
            isPrimary=loc.is_primary,
            isActive=loc.is_active,
            displayOrder=loc.display_order,
            createdAt=loc.created_at,
            updatedAt=loc.updated_at,
        )
        for loc in locations
    ]


@router.get("/faq", response_model=List[FaqResponse])
async def get_public_faqs(
    cms_service: CmsService = Depends(get_cms_service),
) -> List[FaqResponse]:
    """Returns all active FAQ items."""
    faqs = await cms_service.list_faqs(include_inactive=False)
    return [
        FaqResponse(
            id=f.id,
            category=f.category,
            question=f.question,
            answer=f.answer,
            displayOrder=f.display_order,
            isActive=f.is_active,
            createdAt=f.created_at,
            updatedAt=f.updated_at,
        )
        for f in faqs
    ]


@router.get("/organization", response_model=Optional[OrganizationResponse])
async def get_public_organization(
    request: Request,
    response: Response,
    org_service: OrganizationService = Depends(get_organization_service),
) -> Any:
    """Returns top-level practice organization details including branding, currency, and dynamic theming."""
    org = await org_service.get_organization()
    if org is None:
        response.headers["Cache-Control"] = "public, max-age=0, must-revalidate"
        return None
    res = OrganizationResponse(
        id=org.id,
        name=org.name,
        displayName=org.display_name,
        tagline=org.tagline,
        description=org.description,
        logoUrl=org.logo_url,
        contactEmail=org.contact_email,
        contactPhone=org.contact_phone,
        websiteUrl=org.website_url,
        primaryColor=org.primary_color,
        secondaryColor=org.secondary_color,
        backgroundColor=org.background_color,
        primaryFont=org.primary_font,
        secondaryFont=org.secondary_font,
        currencyCode=org.currency_code or "PKR",
        currencySymbol=org.currency_symbol or "Rs",
        timezone=org.timezone or "Asia/Karachi",
        isActive=org.is_active,
        createdAt=org.created_at,
        updatedAt=org.updated_at,
    )
    etag = _compute_etag(res.model_dump())
    response.headers["Cache-Control"] = "public, max-age=0, must-revalidate"
    response.headers["ETag"] = etag
    if request.headers.get("if-none-match") == etag:
        return Response(
            status_code=status.HTTP_304_NOT_MODIFIED,
            headers={"ETag": etag, "Cache-Control": "public, max-age=0, must-revalidate"},
        )
    return res


@router.get("/booking-status", response_model=PublicBookingStatusResponse)
async def get_public_booking_status(
    booking_settings_service: BookingSettingsService = Depends(get_booking_settings_service),
) -> PublicBookingStatusResponse:
    """Returns current booking availability mode, notice message, and clinic phone without personal data."""
    return await booking_settings_service.get_public_booking_status()


@router.get("/working-hours", response_model=List[WorkingHoursDto])
async def get_public_working_hours(
    clinic_id: Optional[UUID] = Query(None, description="Optional clinic ID to filter operating hours"),
    booking_settings_service: BookingSettingsService = Depends(get_booking_settings_service),
) -> List[WorkingHoursDto]:
    """Returns single source of truth clinic operating hours across all 7 days of the week."""
    return await booking_settings_service.get_public_working_hours(clinic_id=clinic_id)


@router.get("/booking-schedule")
async def get_public_booking_schedule(
    booking_settings_service: BookingSettingsService = Depends(get_booking_settings_service),
):
    """Consolidated schedule configuration for date-pickers: working hours, closures, and advance window."""
    return await booking_settings_service.get_public_schedule()


@router.get("/availability", response_model=PublicAvailabilityResponse)
@limiter.limit(settings.PUBLIC_BOOKING_RATE_LIMIT)
async def get_public_availability(
    request: Request,
    date: Optional[date] = Query(None, description="Requested booking date (YYYY-MM-DD)"),
    serviceId: Optional[str] = Query(None, description="Optional service ID or slug"),
    teamMemberId: Optional[UUID] = Query(None, description="Optional clinician ID"),
    clinicId: Optional[UUID] = Query(None, description="Optional clinic location ID"),
    avail_service: AvailabilityService = Depends(get_availability_service),
) -> PublicAvailabilityResponse:
    """
    Computes real-time available booking slots based on clinic working hours,
    breaks, planned closures, approved clinician leaves, service durations and buffers,
    lead times, advance booking windows, and existing bookings in Asia/Karachi timezone.
    Never exposes personal patient or doctor information.
    """
    target_date = date or datetime.now(ZoneInfo("Asia/Karachi")).date()
    slots = await avail_service.get_available_slots(
        target_date=target_date,
        service_id=serviceId,
        team_member_id=teamMemberId,
        clinic_id=clinicId,
    )
    return PublicAvailabilityResponse(
        date=target_date,
        serviceId=serviceId,
        teamMemberId=teamMemberId,
        clinicId=clinicId,
        timezone="Asia/Karachi",
        slots=slots,
    )




@router.get("/announcements", response_model=List[AnnouncementResponse])
async def get_public_announcements(
    service: AnnouncementService = Depends(get_announcement_service),
) -> List[AnnouncementResponse]:
    """Returns all active marquee ticker announcements."""
    items = await service.list_announcements(include_inactive=False)
    return [
        AnnouncementResponse(
            id=item.id,
            content=item.content,
            isActive=item.is_active,
            displayOrder=item.display_order,
            createdAt=item.created_at,
            updatedAt=item.updated_at,
        )
        for item in items
    ]


@router.get("/clinics", response_model=List[LocationResponse])
async def get_public_clinics(
    org_service: OrganizationService = Depends(get_organization_service),
) -> List[LocationResponse]:
    """Returns all active clinic branches."""
    return await get_public_locations(org_service)


_lead_phone_locks: dict[str, asyncio.Lock] = {}
_lead_phone_locks_guard = asyncio.Lock()


async def _get_lead_phone_lock(phone_norm: str) -> asyncio.Lock:
    async with _lead_phone_locks_guard:
        if phone_norm not in _lead_phone_locks:
            _lead_phone_locks[phone_norm] = asyncio.Lock()
        return _lead_phone_locks[phone_norm]


@router.post(
    "/leads",
    response_model=PublicLeadCaptureResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Capture or resume an inquiry lead during online booking",
)
@limiter.limit(settings.PUBLIC_LEADS_RATE_LIMIT)
async def capture_public_lead(
    request: Request,
    payload: PublicLeadCaptureRequest,
    lead_repo: LeadRepository = Depends(get_lead_repository),
    lead_event_repo: LeadEventRepository = Depends(get_lead_event_repository),
    flow_settings_repo: BookingFlowSettingsRepository = Depends(get_booking_flow_settings_repository),
) -> PublicLeadCaptureResponse:
    """
    Captures or updates an open unconverted lead identified by normalized mobile phone.
    Returns solely an opaque capture_token.
    Enforces honeypot spam protection, notice version logging, and system event auditing.
    Guarantees zero personal data in response and never reveals existing patient status.
    """
    # 1. Honeypot check (anti-bot trap)
    if payload.hp and payload.hp.strip():
        # Fake success without creating records or leaking error
        return PublicLeadCaptureResponse(captureToken=secrets.token_urlsafe(32))

    # 2. Phone normalization (Pakistan format 92...)
    phone_norm = normalize_pakistan_phone(payload.phone)
    if not phone_norm:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid phone number format. Please provide a valid mobile number.",
        )

    # 3. Resolve consent notice version
    notice_ver = payload.noticeVersion
    if not notice_ver:
        settings_obj = await flow_settings_repo.get_settings()
        notice_ver = "v1"

    now_utc = datetime.now(timezone.utc)

    # Acquire database transaction-level advisory lock
    await lead_repo.acquire_phone_lock(phone_norm)

    # Serialize near-simultaneous captures for the same normalized phone in-process
    phone_lock = await _get_lead_phone_lock(phone_norm)
    async with phone_lock:
        # 4. Find open unconverted lead matching normalized phone
        existing_leads = await lead_repo.list_by_phone(phone_norm)
        open_lead = next((l for l in existing_leads if l.status == LeadStatus.UNCONVERTED.value), None)

        if open_lead is not None:
            open_lead.full_name = payload.fullName.strip()
            if payload.email:
                open_lead.email = payload.email.strip().lower()
            if notice_ver:
                open_lead.consent_notice_version = notice_ver
            open_lead.last_activity_at = now_utc
            saved = await lead_repo.save(open_lead)
            token = await lead_repo.issue_capture_token(saved.id, expires_in_hours=24)

            await lead_event_repo.record_event(
                lead_id=saved.id,
                event_type="lead_captured",
                actor_type="system",
                payload={"source": "website_abandon", "is_update": True},
            )
        else:
            # Link to website_abandon acquisition channel
            sources = await lead_repo.list_sources()
            abandon_src = next((s for s in sources if s.name == "website_abandon" or s.utm_source == "website_abandon"), None)

            new_lead = Lead(
                full_name=payload.fullName.strip(),
                phone=payload.phone.strip(),
                phone_normalized=phone_norm,
                email=payload.email.strip().lower() if payload.email else None,
                lead_source_id=abandon_src.id if abandon_src else None,
                status=LeadStatus.UNCONVERTED.value,
                consent_notice_version=notice_ver,
                capture_token=secrets.token_urlsafe(32),
                last_activity_at=now_utc,
            )
            try:
                saved = await lead_repo.save(new_lead)
                token = await lead_repo.issue_capture_token(saved.id, expires_in_hours=24)

                await lead_event_repo.record_event(
                    lead_id=saved.id,
                    event_type="lead_captured",
                    actor_type="system",
                    payload={"source": "website_abandon", "is_update": False},
                )
            except IntegrityError:
                # DB-level partial index conflict: another transaction created the open lead
                existing_leads = await lead_repo.list_by_phone(phone_norm)
                open_lead = next((l for l in existing_leads if l.status == LeadStatus.UNCONVERTED.value), None)
                if open_lead is None:
                    raise
                token = await lead_repo.issue_capture_token(open_lead.id, expires_in_hours=24)

        return PublicLeadCaptureResponse(captureToken=token)


@router.patch(
    "/leads/{capture_token}",
    response_model=PublicLeadUpdateResponse,
    summary="Update step selections on an open booking lead",
)
@limiter.limit(settings.PUBLIC_LEADS_RATE_LIMIT)
async def update_public_lead(
    request: Request,
    capture_token: str,
    payload: PublicLeadUpdateRequest,
    lead_repo: LeadRepository = Depends(get_lead_repository),
    lead_event_repo: LeadEventRepository = Depends(get_lead_event_repository),
) -> PublicLeadUpdateResponse:
    """
    Updates booking wizard selections (service, clinic, doctor, notes, email) on an open lead.
    Restricted strictly to the lead matching the unique capture_token.
    Allows filling contact info (name, email, phone) only if currently empty (never overwrites).
    """
    if not capture_token or not capture_token.strip():
        if payload.captureToken and payload.captureToken.strip():
            capture_token = payload.captureToken.strip()
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired booking session token.",
            )

    lead = await lead_repo.get_by_capture_token(capture_token.strip())
    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking session not found or expired.",
        )

    if lead.status != LeadStatus.UNCONVERTED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking session is no longer active.",
        )

    audit_payload = {}
    target_service = payload.serviceId or payload.service
    if target_service is not None:
        lead.service_id = target_service
        audit_payload["serviceId"] = target_service

    target_clinic = payload.clinicId or payload.clinic
    if target_clinic is not None:
        lead.clinic_id = target_clinic
        audit_payload["clinicId"] = str(target_clinic)

    target_doctor = payload.teamMemberId or payload.doctor or payload.doctorId
    if target_doctor is not None:
        lead.team_member_id = target_doctor
        audit_payload["teamMemberId"] = str(target_doctor)

    if payload.notes is not None:
        lead.notes = payload.notes
        audit_payload["hasNotes"] = True

    # Contact details may be filled ONLY if currently empty (never overwrite)
    target_name = payload.fullName or payload.name
    if target_name and target_name.strip():
        if not lead.full_name or not lead.full_name.strip():
            lead.full_name = target_name.strip()
            audit_payload["fullNameFilled"] = True

    if payload.email and payload.email.strip():
        if not lead.email or not lead.email.strip():
            lead.email = payload.email.strip().lower()
            audit_payload["emailFilled"] = True

    if payload.phone and payload.phone.strip():
        if not lead.phone or not lead.phone.strip():
            lead.phone = payload.phone.strip()
            lead.phone_normalized = normalize_pakistan_phone(payload.phone)
            audit_payload["phoneFilled"] = True

    lead.last_activity_at = datetime.now(timezone.utc)
    await lead_repo.save(lead)

    await lead_event_repo.record_event(
        lead_id=lead.id,
        event_type="lead_step_updated",
        actor_type="system",
        payload=audit_payload,
    )

    return PublicLeadUpdateResponse(success=True, captureToken=capture_token)


@router.get(
    "/booking/services",
    response_model=List[PublicBookingServiceItemDto],
    summary="List services currently bookable at some clinic branch",
)
@limiter.limit(settings.PUBLIC_BOOKING_RATE_LIMIT)
async def get_public_booking_services(
    request: Request,
    eligibility_service: BookingEligibilityService = Depends(get_booking_eligibility_service),
) -> List[PublicBookingServiceItemDto]:
    """
    Returns only services bookable at some clinic branch.
    Filters out procedures with no active clinic, no qualified doctor, or no available slots.
    """
    return await eligibility_service.get_bookable_services()


@router.get(
    "/booking/clinics",
    response_model=List[PublicBookingClinicItemDto],
    summary="List clinics offering a service with eligible doctor and upcoming slots",
)
@limiter.limit(settings.PUBLIC_BOOKING_RATE_LIMIT)
async def get_public_booking_clinics(
    request: Request,
    serviceId: str = Query(..., description="Selected service ID or slug"),
    eligibility_service: BookingEligibilityService = Depends(get_booking_eligibility_service),
) -> List[PublicBookingClinicItemDto]:
    """
    Returns only clinics actively offering the selected service that have at least
    one eligible doctor with available slots within the booking horizon.
    """
    return await eligibility_service.get_bookable_clinics_for_service(service_id=serviceId)


@router.get(
    "/booking/doctors",
    response_model=List[PublicBookingDoctorItemDto],
    summary="List eligible doctor cards with patients treated, weekly schedule, and slot chips",
)
@limiter.limit(settings.PUBLIC_BOOKING_RATE_LIMIT)
async def get_public_booking_doctors(
    request: Request,
    serviceId: str = Query(..., description="Selected service ID or slug"),
    clinicId: UUID = Query(..., description="Target clinic location ID"),
    days: Optional[int] = Query(None, ge=1, le=14, description="Horizon window in days (max 14)"),
    eligibility_service: BookingEligibilityService = Depends(get_booking_eligibility_service),
) -> List[PublicBookingDoctorItemDto]:
    """
    Returns eligible doctor profiles, patients treated count, weekly schedule summary,
    and slotsByDate for the next N days (N from settings, max 14).
    """
    return await eligibility_service.get_bookable_doctors_for_service_and_clinic(
        service_id=serviceId,
        clinic_id=clinicId,
        days=days,
    )


@router.get(
    "/booking/settings",
    summary="Get public booking flow settings including lead capture notice",
)
@limiter.limit(settings.PUBLIC_BOOKING_RATE_LIMIT)
async def get_public_booking_flow_settings(
    request: Request,
    flow_settings_repo: BookingFlowSettingsRepository = Depends(get_booking_flow_settings_repository),
):
    settings_obj = await flow_settings_repo.get_settings()
    return {
        "leadCaptureNotice": settings_obj.lead_capture_notice if settings_obj else "We save your details so we can help you finish booking.",
        "daysShown": settings_obj.days_shown if settings_obj else 7,
        "showPatientsTreated": settings_obj.show_patients_treated if settings_obj else True,
    }


# ---------------------------------------------------------------------------
# Stage-2 public endpoints: Reviews, Blog Posts, Social Links
# ---------------------------------------------------------------------------

from app.api.deps import get_blog_post_service, get_review_service, get_social_link_service
from app.application.dtos.cms_dto import BlogPostResponse, ReviewResponse, SocialLinkResponse
from app.application.services.content_service import BlogPostService, ReviewService, SocialLinkService


@router.get("/reviews", response_model=List[ReviewResponse])
async def get_published_reviews(
    review_service: ReviewService = Depends(get_review_service),
) -> List[ReviewResponse]:
    """Returns all published reviews for the public Success Stories section."""
    items = await review_service.list_published()
    return [
        ReviewResponse(
            id=r.id,
            authorName=r.author_name,
            rating=r.rating,
            text=r.review_text,
            reviewDate=r.review_date.isoformat() if r.review_date else None,
            sourceLabel=r.source_label,
            displayOrder=r.display_order,
            isPublished=r.is_published,
            createdAt=r.created_at,
            updatedAt=r.updated_at,
        )
        for r in items
    ]


@router.get("/blogs", response_model=List[BlogPostResponse])
async def get_published_blogs(
    blog_service: BlogPostService = Depends(get_blog_post_service),
) -> List[BlogPostResponse]:
    """Returns all published blog posts for the public blog section."""
    items = await blog_service.list_published()
    return [
        BlogPostResponse(
            id=p.id,
            title=p.title,
            slug=p.slug,
            excerpt=p.excerpt,
            body=p.body,
            coverImageUrl=p.cover_image_url,
            publishedDate=p.published_date.isoformat() if p.published_date else None,
            displayOrder=p.display_order,
            isPublished=p.is_published,
            createdAt=p.created_at,
            updatedAt=p.updated_at,
        )
        for p in items
    ]


@router.get("/blogs/{slug}", response_model=BlogPostResponse)
async def get_published_blog_by_slug(
    slug: str,
    blog_service: BlogPostService = Depends(get_blog_post_service),
) -> BlogPostResponse:
    """Returns a published blog post by its unique slug."""
    p = await blog_service.get_by_slug_or_404(slug)
    return BlogPostResponse(
        id=p.id,
        title=p.title,
        slug=p.slug,
        excerpt=p.excerpt,
        body=p.body,
        coverImageUrl=p.cover_image_url,
        publishedDate=p.published_date.isoformat() if p.published_date else None,
        displayOrder=p.display_order,
        isPublished=p.is_published,
        createdAt=p.created_at,
        updatedAt=p.updated_at,
    )


@router.get("/social-links", response_model=List[SocialLinkResponse])
async def get_active_social_links(
    social_service: SocialLinkService = Depends(get_social_link_service),
) -> List[SocialLinkResponse]:
    """Returns all active social links for the public footer."""
    items = await social_service.list_active()
    return [
        SocialLinkResponse(
            id=s.id,
            platform=s.platform,
            url=s.url,
            displayOrder=s.display_order,
            isActive=s.is_active,
            createdAt=s.created_at,
            updatedAt=s.updated_at,
        )
        for s in items
    ]
