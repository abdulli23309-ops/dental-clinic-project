from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status

from app.application.dtos.service_dto import ServiceCreateRequest, ServiceUpdateRequest
from app.domain.models.service import Service
from app.domain.repositories.service_repo import ServiceRepository
from app.domain.repositories.booking_settings_repo import BookingSettingsRepository


from app.domain.repositories.clinic_service_repo import ClinicServiceRepository
from app.infrastructure.repositories.postgres_activity_repo import (
    PostgresActivityLogRepository,
    record_activity,
)


class ServiceService:
    """Orchestrates dental service and procedure catalog operations."""

    def __init__(
        self,
        service_repo: ServiceRepository,
        booking_settings_repo: Optional[BookingSettingsRepository] = None,
        clinic_service_repo: Optional[ClinicServiceRepository] = None,
        activity_repo: Optional[PostgresActivityLogRepository] = None,
    ):
        self.service_repo = service_repo
        self.booking_settings_repo = booking_settings_repo
        self.clinic_service_repo = clinic_service_repo
        self.activity_repo = activity_repo

    async def list_services(self, include_inactive: bool = False, public_only: bool = False) -> List[Service]:
        return await self.service_repo.list_all(include_inactive=include_inactive, public_only=public_only)

    async def get_service(self, service_id: UUID) -> Service:
        svc = await self.service_repo.get_by_id(service_id)
        if not svc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service not found.",
            )
        return svc

    async def get_provider_ids(self, service_id: UUID) -> List[UUID]:
        if not self.booking_settings_repo:
            return []
        links = await self.booking_settings_repo.list_service_providers(service_id=service_id)
        return [l.team_member_id for l in links]

    async def get_clinic_ids(self, service_id: UUID) -> List[UUID]:
        if not self.clinic_service_repo:
            return []
        links = await self.clinic_service_repo.list_by_service(service_id=service_id)
        return [l.clinic_id for l in links]

    async def set_clinic_ids(
        self,
        service_id: UUID,
        clinic_ids: List[UUID],
        user_id: Optional[UUID] = None,
    ) -> None:
        if self.clinic_service_repo:
            await self.clinic_service_repo.set_service_clinics(service_id=service_id, clinic_ids=clinic_ids)
            await record_activity(
                self.activity_repo,
                action="update_service_clinics",
                entity_type="service",
                entity_id=str(service_id),
                user_id=user_id,
                details={"clinic_ids": [str(c) for c in clinic_ids]},
            )

    async def set_provider_ids(
        self,
        service_id: UUID,
        provider_ids: List[UUID],
        user_id: Optional[UUID] = None,
    ) -> None:
        if self.booking_settings_repo:
            await self.booking_settings_repo.set_service_providers(service_id, provider_ids)
            await record_activity(
                self.activity_repo,
                action="update_service_providers",
                entity_type="service",
                entity_id=str(service_id),
                user_id=user_id,
                details={"provider_ids": [str(p) for p in provider_ids]},
            )

    async def get_by_slug(self, slug: str) -> Optional[Service]:
        return await self.service_repo.get_by_slug(slug)

    async def create_service(self, req: ServiceCreateRequest) -> Service:
        clean_slug = req.slug.strip().lower()
        existing = await self.service_repo.get_by_slug(clean_slug)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Service with identifier '{clean_slug}' already exists.",
            )

        svc = Service(
            slug=clean_slug,
            category=req.category.strip().lower(),
            title=req.title.strip(),
            short_desc=req.shortDesc.strip(),
            full_desc=req.fullDesc.strip() if req.fullDesc else None,
            cash_price=req.cashPrice.strip(),
            duration=req.duration.strip(),
            code=req.code.strip() if req.code else None,
            insurance_note=req.insuranceNote.strip() if req.insuranceNote else None,
            recommended_interval=req.recommendedInterval.strip() if req.recommendedInterval else None,
            recall_interval_days=req.recallIntervalDays,
            display_order=req.displayOrder,
            is_highlighted=req.isHighlighted,
            is_public=req.isPublic,
            is_active=req.isActive,
            bookable_online=req.bookableOnline,
            buffer_minutes=req.bufferMinutes,
            image_url=req.imageUrl.strip() if req.imageUrl else None,
        )
        saved = await self.service_repo.save(svc)
        if req.providerIds is not None and self.booking_settings_repo:
            await self.booking_settings_repo.set_service_providers(saved.id, req.providerIds)
        if req.clinicIds is not None and self.clinic_service_repo:
            await self.clinic_service_repo.set_service_clinics(saved.id, req.clinicIds)
        return saved

    async def update_service(self, service_id: UUID, req: ServiceUpdateRequest) -> Service:
        svc = await self.get_service(service_id)

        if req.slug is not None:
            new_slug = req.slug.strip().lower()
            if new_slug != svc.slug:
                existing = await self.service_repo.get_by_slug(new_slug)
                if existing and existing.id != service_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Service with slug '{new_slug}' already exists.",
                    )
                svc.slug = new_slug

        if req.category is not None:
            svc.category = req.category.strip().lower()
        if req.title is not None:
            svc.title = req.title.strip()
        if req.shortDesc is not None:
            svc.short_desc = req.shortDesc.strip()
        if req.fullDesc is not None:
            svc.full_desc = req.fullDesc.strip() or None
        if req.cashPrice is not None:
            svc.cash_price = req.cashPrice.strip()
        if req.duration is not None:
            svc.duration = req.duration.strip()
        if req.code is not None:
            svc.code = req.code.strip() or None
        if req.insuranceNote is not None:
            svc.insurance_note = req.insuranceNote.strip() or None
        if req.recommendedInterval is not None:
            svc.recommended_interval = req.recommendedInterval.strip() or None
        if req.recallIntervalDays is not None:
            svc.recall_interval_days = req.recallIntervalDays
        if req.displayOrder is not None:
            svc.display_order = req.displayOrder
        if req.isHighlighted is not None:
            svc.is_highlighted = req.isHighlighted
        if req.isPublic is not None:
            svc.is_public = req.isPublic
        if req.isActive is not None:
            svc.is_active = req.isActive
        if req.bookableOnline is not None:
            svc.bookable_online = req.bookableOnline
        if req.bufferMinutes is not None:
            svc.buffer_minutes = req.bufferMinutes
        if req.imageUrl is not None:
            svc.image_url = req.imageUrl.strip() or None

        svc.updated_at = datetime.now(timezone.utc)
        saved = await self.service_repo.save(svc)
        if req.providerIds is not None and self.booking_settings_repo:
            await self.booking_settings_repo.set_service_providers(saved.id, req.providerIds)
        if req.clinicIds is not None and self.clinic_service_repo:
            await self.clinic_service_repo.set_service_clinics(saved.id, req.clinicIds)
        return saved

    async def set_service_status(self, service_id: UUID, is_active: bool) -> Service:
        svc = await self.get_service(service_id)
        svc.is_active = is_active
        svc.updated_at = datetime.now(timezone.utc)
        return await self.service_repo.save(svc)

    async def reorder_services(self, ordered_ids: List[UUID]) -> None:
        await self.service_repo.reorder(ordered_ids)
