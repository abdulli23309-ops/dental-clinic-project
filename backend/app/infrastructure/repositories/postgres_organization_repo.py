from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.organization import Location, Organization
from app.domain.repositories.organization_repo import LocationRepository, OrganizationRepository
from app.infrastructure.database.orm_models import LocationORM, OrganizationORM


class PostgresOrganizationRepository(OrganizationRepository):
    """PostgreSQL implementation of the OrganizationRepository abstraction."""

    def __init__(self, session: AsyncSession):
        self._session = session

    @staticmethod
    def _to_domain(orm: OrganizationORM) -> Organization:
        return Organization(
            id=orm.id,
            name=orm.name,
            display_name=orm.display_name,
            tagline=orm.tagline,
            description=orm.description,
            logo_url=orm.logo_url,
            contact_email=orm.contact_email,
            contact_phone=orm.contact_phone,
            website_url=orm.website_url,
            primary_color=getattr(orm, "primary_color", None),
            secondary_color=getattr(orm, "secondary_color", None),
            background_color=getattr(orm, "background_color", None),
            primary_font=getattr(orm, "primary_font", None),
            secondary_font=getattr(orm, "secondary_font", None),
            currency_code=getattr(orm, "currency_code", "PKR") or "PKR",
            currency_symbol=getattr(orm, "currency_symbol", "Rs") or "Rs",
            timezone=getattr(orm, "timezone", "Asia/Karachi") or "Asia/Karachi",
            is_active=orm.is_active,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    async def get_current(self) -> Optional[Organization]:
        stmt = select(OrganizationORM).order_by(OrganizationORM.created_at.asc()).limit(1)
        result = await self._session.execute(stmt)
        orm = result.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def get_by_id(self, org_id: UUID) -> Optional[Organization]:
        orm = await self._session.get(OrganizationORM, org_id)
        return self._to_domain(orm) if orm else None

    async def save(self, org: Organization) -> Organization:
        existing = await self._session.get(OrganizationORM, org.id)
        if existing:
            existing.name = org.name
            existing.display_name = org.display_name
            existing.tagline = org.tagline
            existing.description = org.description
            existing.logo_url = org.logo_url
            existing.contact_email = org.contact_email
            existing.contact_phone = org.contact_phone
            existing.website_url = org.website_url
            existing.primary_color = org.primary_color
            existing.secondary_color = org.secondary_color
            existing.background_color = org.background_color
            existing.primary_font = org.primary_font
            existing.secondary_font = org.secondary_font
            existing.currency_code = org.currency_code
            existing.currency_symbol = org.currency_symbol
            existing.timezone = org.timezone
            existing.is_active = org.is_active
            existing.updated_at = org.updated_at
            await self._session.flush()
            return self._to_domain(existing)
        else:
            orm = OrganizationORM(
                id=org.id,
                name=org.name,
                display_name=org.display_name,
                tagline=org.tagline,
                description=org.description,
                logo_url=org.logo_url,
                contact_email=org.contact_email,
                contact_phone=org.contact_phone,
                website_url=org.website_url,
                primary_color=org.primary_color,
                secondary_color=org.secondary_color,
                background_color=org.background_color,
                primary_font=org.primary_font,
                secondary_font=org.secondary_font,
                currency_code=org.currency_code,
                currency_symbol=org.currency_symbol,
                timezone=org.timezone,
                is_active=org.is_active,
                created_at=org.created_at,
                updated_at=org.updated_at,
            )
            self._session.add(orm)
            await self._session.flush()
            return self._to_domain(orm)

    async def delete(self, org_id: UUID) -> None:
        orm = await self._session.get(OrganizationORM, org_id)
        if orm is not None:
            await self._session.delete(orm)
            await self._session.flush()


class PostgresLocationRepository(LocationRepository):
    """PostgreSQL implementation of the LocationRepository abstraction."""

    def __init__(self, session: AsyncSession):
        self._session = session

    @staticmethod
    def _to_domain(orm: LocationORM) -> Location:
        return Location(
            id=orm.id,
            organization_id=orm.organization_id,
            name=orm.name,
            address_line1=orm.address_line1,
            address_line2=orm.address_line2,
            city=orm.city,
            state=orm.state,
            postal_code=orm.postal_code,
            country=orm.country,
            phone=orm.phone,
            email=orm.email,
            hours_info=orm.hours_info,
            image_url=orm.image_url,
            is_primary=orm.is_primary,
            is_active=orm.is_active,
            display_order=orm.display_order,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    async def list_all(self, include_inactive: bool = False) -> List[Location]:
        # 1. Fetch LocationORM records
        stmt = select(LocationORM)
        if not include_inactive:
            stmt = stmt.where(LocationORM.is_active.is_(True))
        stmt = stmt.order_by(LocationORM.display_order.asc(), LocationORM.name.asc())
        result = await self._session.execute(stmt)
        locations = [self._to_domain(orm) for orm in result.scalars().all()]

        # 2. Get ALL LocationORM ids (active and inactive) so an inactive LocationORM never falls back to ClinicORM
        all_loc_ids_stmt = select(LocationORM.id)
        all_loc_ids = set((await self._session.execute(all_loc_ids_stmt)).scalars().all())

        # 3. Supplemental legacy clinics from ClinicORM (only those not tracked in LocationORM)
        from app.infrastructure.database.orm_models import ClinicORM
        c_stmt = select(ClinicORM)
        if not include_inactive:
            c_stmt = c_stmt.where(ClinicORM.is_active.is_(True))
        c_result = await self._session.execute(c_stmt)
        for c in c_result.scalars().all():
            if c.id not in all_loc_ids and not c.name.startswith("Main Lahore Clinic"):
                locations.append(Location(
                    id=c.id,
                    organization_id=c.organization_id,
                    name=c.name,
                    address_line1=c.address_line1,
                    address_line2=c.address_line2,
                    city=c.city,
                    state=c.state,
                    postal_code=c.postal_code,
                    country=c.country,
                    phone=c.phone,
                    email=c.email,
                    hours_info=None,
                    image_url=None,
                    is_primary=False,
                    is_active=c.is_active,
                    display_order=99,
                    created_at=c.created_at,
                    updated_at=c.updated_at,
                ))
        return locations

    async def get_by_id(self, location_id: UUID) -> Optional[Location]:
        orm = await self._session.get(LocationORM, location_id)
        if not orm:
            from app.infrastructure.database.orm_models import ClinicORM
            clinic = await self._session.get(ClinicORM, location_id)
            if clinic:
                return Location(
                    id=clinic.id,
                    organization_id=clinic.organization_id,
                    name=clinic.name,
                    address_line1=clinic.address_line1,
                    address_line2=clinic.address_line2,
                    city=clinic.city,
                    state=clinic.state,
                    postal_code=clinic.postal_code,
                    country=clinic.country,
                    phone=clinic.phone,
                    email=clinic.email,
                    hours_info=None,
                    image_url=None,
                    is_primary=False,
                    is_active=clinic.is_active,
                    display_order=99,
                    created_at=clinic.created_at,
                    updated_at=clinic.updated_at,
                )
        return self._to_domain(orm) if orm else None

    async def save(self, location: Location) -> Location:
        existing = await self._session.get(LocationORM, location.id)
        if existing:
            existing.organization_id = location.organization_id
            existing.name = location.name
            existing.address_line1 = location.address_line1
            existing.address_line2 = location.address_line2
            existing.city = location.city
            existing.state = location.state
            existing.postal_code = location.postal_code
            existing.country = location.country
            existing.phone = location.phone
            existing.email = location.email
            existing.hours_info = location.hours_info
            existing.image_url = location.image_url
            existing.is_primary = location.is_primary
            existing.is_active = location.is_active
            existing.display_order = location.display_order
            existing.updated_at = location.updated_at

            # Keep corresponding ClinicORM in sync if present
            from app.infrastructure.database.orm_models import ClinicORM
            c_existing = await self._session.get(ClinicORM, location.id)
            if c_existing:
                c_existing.name = location.name
                c_existing.address_line1 = location.address_line1
                c_existing.address_line2 = location.address_line2
                c_existing.city = location.city
                c_existing.state = location.state
                c_existing.postal_code = location.postal_code
                c_existing.country = location.country
                c_existing.phone = location.phone
                c_existing.email = location.email
                c_existing.is_primary = location.is_primary
                c_existing.is_active = location.is_active
                c_existing.display_order = location.display_order
                c_existing.updated_at = location.updated_at

            await self._session.flush()
            return self._to_domain(existing)
        else:
            orm = LocationORM(
                id=location.id,
                organization_id=location.organization_id,
                name=location.name,
                address_line1=location.address_line1,
                address_line2=location.address_line2,
                city=location.city,
                state=location.state,
                postal_code=location.postal_code,
                country=location.country,
                phone=location.phone,
                email=location.email,
                hours_info=location.hours_info,
                image_url=location.image_url,
                is_primary=location.is_primary,
                is_active=location.is_active,
                display_order=location.display_order,
                created_at=location.created_at,
                updated_at=location.updated_at,
            )
            self._session.add(orm)

            # Sync ClinicORM if present
            from app.infrastructure.database.orm_models import ClinicORM
            c_existing = await self._session.get(ClinicORM, location.id)
            if c_existing:
                c_existing.name = location.name
                c_existing.is_active = location.is_active
                c_existing.updated_at = location.updated_at

            await self._session.flush()
            return self._to_domain(orm)
    async def delete(self, location_id: UUID) -> None:
        orm = await self._session.get(LocationORM, location_id)
        if orm is not None:
            await self._session.delete(orm)
            await self._session.flush()
