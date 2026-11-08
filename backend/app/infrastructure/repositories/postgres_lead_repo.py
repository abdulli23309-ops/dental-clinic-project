import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.booking_crm import Lead, LeadSource
from app.domain.models.phone_utils import normalize_pakistan_phone
from app.domain.repositories.lead_repo import LeadRepository
from app.infrastructure.database.orm_models import LeadCaptureTokenORM, LeadORM, LeadSourceORM


class PostgresLeadRepository(LeadRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    @staticmethod
    def _to_orm(entity: Lead) -> LeadORM:
        phone_norm = entity.phone_normalized or normalize_pakistan_phone(entity.phone)
        return LeadORM(
            id=entity.id,
            organization_id=entity.organization_id,
            clinic_id=entity.clinic_id,
            patient_id=entity.patient_id,
            lead_source_id=entity.lead_source_id,
            service_id=entity.service_id,
            team_member_id=entity.team_member_id,
            full_name=entity.full_name,
            phone=entity.phone,
            phone_normalized=phone_norm,
            email=entity.email,
            status=entity.status,
            notes=entity.notes,
            utm_source=entity.utm_source,
            utm_campaign=entity.utm_campaign,
            attempts=entity.attempts,
            last_contacted_at=entity.last_contacted_at,
            next_attempt_at=entity.next_attempt_at,
            cold_at=entity.cold_at,
            last_activity_at=entity.last_activity_at,
            capture_token=entity.capture_token,
            consent_notice_version=entity.consent_notice_version,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )

    @staticmethod
    def _to_domain(orm: LeadORM) -> Lead:
        return Lead(
            id=orm.id,
            organization_id=orm.organization_id,
            clinic_id=orm.clinic_id,
            patient_id=orm.patient_id,
            lead_source_id=orm.lead_source_id,
            service_id=orm.service_id,
            team_member_id=orm.team_member_id,
            full_name=orm.full_name,
            phone=orm.phone,
            phone_normalized=orm.phone_normalized or normalize_pakistan_phone(orm.phone),
            email=orm.email,
            status=orm.status,
            notes=orm.notes,
            utm_source=orm.utm_source,
            utm_campaign=orm.utm_campaign,
            attempts=orm.attempts,
            last_contacted_at=orm.last_contacted_at,
            next_attempt_at=orm.next_attempt_at,
            cold_at=orm.cold_at,
            last_activity_at=orm.last_activity_at,
            capture_token=orm.capture_token or "",
            consent_notice_version=orm.consent_notice_version,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    @staticmethod
    def _source_to_domain(orm: LeadSourceORM) -> LeadSource:
        return LeadSource(
            id=orm.id,
            name=orm.name,
            utm_source=orm.utm_source,
            is_active=orm.is_active,
            created_at=orm.created_at,
        )

    async def save(self, lead: Lead) -> Lead:
        phone_norm = normalize_pakistan_phone(lead.phone)
        lead.phone_normalized = phone_norm

        existing = await self._session.get(LeadORM, lead.id)
        if existing:
            existing.clinic_id = lead.clinic_id
            existing.patient_id = lead.patient_id
            existing.lead_source_id = lead.lead_source_id
            existing.service_id = lead.service_id
            existing.team_member_id = lead.team_member_id
            existing.full_name = lead.full_name
            existing.phone = lead.phone
            existing.phone_normalized = phone_norm
            existing.email = lead.email
            existing.status = lead.status
            existing.notes = lead.notes
            existing.utm_source = lead.utm_source
            existing.utm_campaign = lead.utm_campaign
            existing.attempts = lead.attempts
            existing.last_contacted_at = lead.last_contacted_at
            existing.next_attempt_at = lead.next_attempt_at
            existing.cold_at = lead.cold_at
            existing.last_activity_at = lead.last_activity_at
            if lead.capture_token:
                existing.capture_token = lead.capture_token
            existing.consent_notice_version = lead.consent_notice_version
            await self._session.flush()
            await self._session.refresh(existing)
            return self._to_domain(existing)
        else:
            orm_obj = self._to_orm(lead)
            self._session.add(orm_obj)
            await self._session.flush()
            await self._session.refresh(orm_obj)
            return self._to_domain(orm_obj)

    async def get_by_id(self, lead_id: UUID) -> Optional[Lead]:
        orm = await self._session.get(LeadORM, lead_id)
        return self._to_domain(orm) if orm else None

    async def issue_capture_token(self, lead_id: UUID, expires_in_hours: int = 24) -> str:
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=expires_in_hours)

        token_orm = LeadCaptureTokenORM(
            lead_id=lead_id,
            token_hash=token_hash,
            created_at=now,
            expires_at=expires_at,
        )
        self._session.add(token_orm)
        lead_orm = await self._session.get(LeadORM, lead_id)
        if lead_orm:
            lead_orm.capture_token = raw_token
        await self._session.flush()
        return raw_token

    async def acquire_phone_lock(self, phone_normalized: str) -> None:
        try:
            bind = self._session.bind
            dialect_name = getattr(getattr(bind, "dialect", None), "name", "")
            if dialect_name == "postgresql":
                await self._session.execute(
                    text("SELECT pg_advisory_xact_lock(hashtext(:p))"),
                    {"p": f"lead_open_{phone_normalized}"},
                )
        except Exception:
            pass

    async def get_by_capture_token(self, token: str) -> Optional[Lead]:
        if not token or not token.strip():
            return None
        token_clean = token.strip()
        token_hash = hashlib.sha256(token_clean.encode("utf-8")).hexdigest()
        now = datetime.now(timezone.utc)

        stmt = (
            select(LeadORM)
            .join(LeadCaptureTokenORM, LeadCaptureTokenORM.lead_id == LeadORM.id)
            .where(
                LeadCaptureTokenORM.token_hash == token_hash,
                LeadCaptureTokenORM.expires_at > now,
            )
        )
        res = await self._session.execute(stmt)
        orm = res.scalar_one_or_none()
        if orm:
            domain = self._to_domain(orm)
            domain.capture_token = token_clean
            return domain

        # Fallback to direct LeadORM.capture_token within 24h
        stmt_legacy = select(LeadORM).where(LeadORM.capture_token == token_clean)
        res_legacy = await self._session.execute(stmt_legacy)
        orm_legacy = res_legacy.scalar_one_or_none()
        if orm_legacy:
            ref_time = orm_legacy.updated_at or orm_legacy.created_at
            if ref_time:
                if ref_time.tzinfo is None:
                    ref_time = ref_time.replace(tzinfo=timezone.utc)
                if now - ref_time > timedelta(hours=24):
                    return None
            return self._to_domain(orm_legacy)

        return None

    async def list_by_phone(self, phone: str) -> List[Lead]:
        if not phone:
            return []
        phone_norm = normalize_pakistan_phone(phone)
        stmt = select(LeadORM).where(
            or_(
                LeadORM.phone_normalized == phone_norm,
                LeadORM.phone == phone.strip(),
            )
        ).order_by(LeadORM.created_at.desc())
        res = await self._session.execute(stmt)
        return [self._to_domain(r) for r in res.scalars().all()]

    async def list_leads(
        self,
        clinic_id: Optional[UUID] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[Lead], int]:
        stmt = select(LeadORM)
        count_stmt = select(func.count(LeadORM.id))

        if clinic_id:
            stmt = stmt.where(or_(LeadORM.clinic_id == clinic_id, LeadORM.clinic_id.is_(None)))
            count_stmt = count_stmt.where(or_(LeadORM.clinic_id == clinic_id, LeadORM.clinic_id.is_(None)))
        if status:
            stmt = stmt.where(LeadORM.status == status)
            count_stmt = count_stmt.where(LeadORM.status == status)
        if search and search.strip():
            pat = f"%{search.strip()}%"
            search_norm = normalize_pakistan_phone(search)
            filter_expr = or_(
                LeadORM.full_name.ilike(pat),
                LeadORM.phone.ilike(pat),
                LeadORM.email.ilike(pat),
                LeadORM.phone_normalized.ilike(f"%{search_norm}%") if search_norm else False,
            )
            stmt = stmt.where(filter_expr)
            count_stmt = count_stmt.where(filter_expr)

        total_res = await self._session.execute(count_stmt)
        total = total_res.scalar_one() or 0

        stmt = stmt.order_by(LeadORM.created_at.desc()).limit(limit).offset(offset)
        res = await self._session.execute(stmt)
        return [self._to_domain(r) for r in res.scalars().all()], total

    async def list_sources(self) -> List[LeadSource]:
        stmt = select(LeadSourceORM).where(LeadSourceORM.is_active.is_(True)).order_by(LeadSourceORM.name.asc())
        res = await self._session.execute(stmt)
        return [self._source_to_domain(r) for r in res.scalars().all()]

    async def save_source(self, source: LeadSource) -> LeadSource:
        orm_obj = LeadSourceORM(
            id=source.id,
            name=source.name,
            utm_source=source.utm_source,
            is_active=source.is_active,
            created_at=source.created_at,
        )
        self._session.add(orm_obj)
        await self._session.flush()
        return self._source_to_domain(orm_obj)
