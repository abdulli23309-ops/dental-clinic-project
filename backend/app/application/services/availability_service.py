from datetime import date, datetime, timedelta, timezone
import json
import logging
import re
from typing import Dict, List, Optional, Tuple, Union
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.repositories.booking_settings_repo import BookingSettingsRepository
from app.infrastructure.database.orm_models import (
    BookingORM,
    ClinicWorkingHoursORM,
    DoctorScheduleOverrideORM,
    ProviderAvailabilityORM,
    ServiceProviderORM,
    ServiceORM,
    TeamMemberClinicORM,
    TeamMemberORM,
)

logger = logging.getLogger(__name__)


def parse_duration_to_minutes(duration_str: Optional[str]) -> int:
    if not duration_str:
        return 30
    m = re.search(r"(\d+(?:\.\d+)?)\s*(h|hr|hour|min|m)?", duration_str.lower())
    if not m:
        return 30
    val = float(m.group(1))
    unit = m.group(2) or "min"
    if "h" in unit:
        return int(val * 60)
    return int(val)


def parse_time_to_minutes(time_str: Optional[str], is_end_time: bool = False) -> Optional[int]:
    if not time_str or not time_str.strip():
        return None
    s = time_str.strip().upper()
    if s in ("24:00", "24:00:00"):
        return 1440
    # Support "HH:MM", "HH:MM:SS", and 12-hour "HH:MM AM/PM"
    m = re.match(r"^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(AM|PM)?$", s)
    if not m:
        return None
    hours = int(m.group(1))
    minutes = int(m.group(2)) if m.group(2) else 0
    ampm = m.group(4)

    if ampm == "AM":
        if hours == 12:
            hours = 0
        elif hours > 12:
            return None
    elif ampm == "PM":
        if hours < 12:
            hours += 12
        elif hours > 12:
            return None
    else:
        if hours == 24 and minutes == 0:
            return 1440
        if is_end_time and hours == 0 and minutes == 0:
            return 1440
        if hours > 23 or minutes > 59:
            return None

    if minutes > 59:
        return None
    return hours * 60 + minutes


def format_minutes_to_time(minutes: int) -> str:
    h = (minutes // 60) % 24
    m = minutes % 60
    ampm = "AM" if h < 12 else "PM"
    h12 = h % 12
    if h12 == 0:
        h12 = 12
    return f"{h12:02d}:{m:02d} {ampm}"


class AvailabilityService:
    """
    Core availability calculation engine.
    Calculates candidate booking slots considering:
    - Clinic working hours (multi-period opening hours, closed days, explicit 24/7)
    - Clinic closures
    - Doctor multi-branch assignments
    - Doctor published recurring weekly shifts
    - Published date-specific schedule overrides (unavailable, extra working days, modified hours)
    - Breaks and unavailable intervals (including multi-break intervals)
    - Service eligibility and custom doctor duration / buffer overrides
    - Inter-branch travel buffers for same-day shifts/bookings at different clinics
    - Existing bookings and concurrency boundaries in Asia/Karachi timezone.
    """

    def __init__(
        self,
        booking_settings_repo: BookingSettingsRepository,
        session: AsyncSession,
        timezone_str: str = "Asia/Karachi",
    ):
        self.booking_settings_repo = booking_settings_repo
        self.session = session
        try:
            self.tz = ZoneInfo(timezone_str)
        except Exception:
            self.tz = timezone(timedelta(hours=5))

    async def get_available_slots(
        self,
        target_date: date,
        service_id: Optional[Union[UUID, str]] = None,
        team_member_id: Optional[UUID] = None,
        clinic_id: Optional[UUID] = None,
        enforce_lead_time: bool = True,
    ) -> List[str]:
        now_local = datetime.now(self.tz)
        today_local = now_local.date()

        # 1. Date cannot be in the past
        if target_date < today_local:
            return []

        # 2. Settings check (advance booking days and booking mode)
        settings = await self.booking_settings_repo.get_settings(clinic_id=clinic_id)
        if settings.booking_mode != "open":
            return []

        # Advance booking days check (defaults to 60)
        max_advance_days = settings.advance_booking_days or 60
        if target_date > today_local + timedelta(days=max_advance_days):
            return []

        # 3. Clinic closures check
        closures = await self.booking_settings_repo.list_closures(clinic_id=clinic_id)
        for c in closures:
            if c.start_date <= target_date <= c.end_date:
                return []

        # 4. Clinic working hours for day of week (supporting multi-period & 24/7)
        dow = target_date.weekday()  # 0=Monday .. 6=Sunday
        working_hours = await self.booking_settings_repo.list_working_hours(clinic_id=clinic_id)
        wh = next((h for h in working_hours if h.day_of_week == dow), None)
        if not wh or wh.is_closed:
            return []

        clinic_open_intervals: List[Tuple[int, int]] = []
        is_clinic_24_hours = bool(getattr(wh, "is_24_hours", False)) or (wh.open_time == "00:00" and wh.close_time in ("24:00", "00:00"))
        if is_clinic_24_hours:
            clinic_open_intervals.append((0, 1440))
        elif getattr(wh, "periods_json", None):
            try:
                periods = json.loads(wh.periods_json)
                if isinstance(periods, list) and periods:
                    for p in periods:
                        p_st = parse_time_to_minutes(p.get("open_time"))
                        p_en = parse_time_to_minutes(p.get("close_time"), is_end_time=True)
                        if p_st is not None and p_en is not None and p_en > p_st:
                            clinic_open_intervals.append((p_st, p_en))
            except Exception:
                pass

        if not clinic_open_intervals:
            if not wh.open_time or not wh.close_time:
                return []
            clinic_open_mins = parse_time_to_minutes(wh.open_time)
            clinic_close_mins = parse_time_to_minutes(wh.close_time, is_end_time=True)
            if clinic_open_mins is None or clinic_close_mins is None or clinic_close_mins <= clinic_open_mins:
                return []
            clinic_open_intervals.append((clinic_open_mins, clinic_close_mins))

        min_clinic_time = min(st for st, _ in clinic_open_intervals)
        max_clinic_time = max(en for _, en in clinic_open_intervals)

        # 5. Service attributes & Doctor-Service overrides
        duration_minutes = 30
        buffer_minutes = 0
        service_orm = None
        service_provider_records: List[ServiceProviderORM] = []

        if service_id:
            if isinstance(service_id, UUID):
                service_orm = await self.session.get(ServiceORM, service_id)
            else:
                try:
                    service_orm = await self.session.get(ServiceORM, UUID(str(service_id)))
                except (ValueError, TypeError):
                    stmt = select(ServiceORM).where(ServiceORM.slug == str(service_id).strip().lower())
                    svc_res = await self.session.execute(stmt)
                    service_orm = svc_res.scalars().first()

            if service_orm:
                if not service_orm.is_active or not service_orm.is_public or not getattr(service_orm, "bookable_online", True):
                    return []
                duration_minutes = parse_duration_to_minutes(service_orm.duration)
                buffer_minutes = getattr(service_orm, "buffer_minutes", 0) or 0

                # Fetch all active service provider records for this service
                sp_stmt = select(ServiceProviderORM).where(
                    ServiceProviderORM.service_id == service_orm.id,
                    ServiceProviderORM.is_active.is_(True),
                )
                sp_res = await self.session.execute(sp_stmt)
                service_provider_records = list(sp_res.scalars().all())
            else:
                # Uncatalogued service fallback: default 30 mins, 0 buffer
                duration_minutes = 30
                buffer_minutes = 0
                service_provider_records = []

        slot_interval = settings.slot_interval_minutes or 15
        travel_buffer_mins = getattr(settings, "inter_branch_travel_buffer_minutes", 30) or 30

        # 6. Candidate Clinicians resolution
        if service_provider_records:
            eligible_for_clinic_records = [
                sp for sp in service_provider_records
                if sp.clinic_id is None or clinic_id is None or sp.clinic_id == clinic_id
            ]
            eligible_provider_ids = [sp.team_member_id for sp in eligible_for_clinic_records]
            if not eligible_provider_ids:
                logger.warning(f"get_available_slots: no eligible_provider_ids for clinic {clinic_id}")
                return []
        else:
            eligible_for_clinic_records = []
            eligible_provider_ids = []

        # Check multi-branch assignment for doctors
        if clinic_id:
            tmc_sub = select(TeamMemberClinicORM.team_member_id).where(
                TeamMemberClinicORM.clinic_id == clinic_id,
                TeamMemberClinicORM.is_active.is_(True),
            )
            shift_sub = select(ProviderAvailabilityORM.team_member_id).where(
                ProviderAvailabilityORM.clinic_id == clinic_id,
                ProviderAvailabilityORM.is_active.is_(True),
            )
            fb_stmt = select(TeamMemberORM.id).where(
                TeamMemberORM.is_active.is_(True),
                or_(
                    TeamMemberORM.clinic_id == clinic_id,
                    TeamMemberORM.location_id == clinic_id,
                    TeamMemberORM.clinic_id.is_(None),
                    TeamMemberORM.id.in_(tmc_sub),
                    TeamMemberORM.id.in_(shift_sub),
                ),
            )
            fb_res = await self.session.execute(fb_stmt)
            branch_assigned_ids = set(fb_res.scalars().all())
        else:
            branch_assigned_ids = None

        if team_member_id:
            if eligible_provider_ids and team_member_id not in eligible_provider_ids:
                return []
            if branch_assigned_ids is not None and team_member_id not in branch_assigned_ids:
                return []

            # Check approved time off
            time_offs = await self.booking_settings_repo.list_provider_time_off(team_member_id=team_member_id)
            for to in time_offs:
                if to.is_approved and to.start_date <= target_date <= to.end_date:
                    return []
            candidate_clinicians = [team_member_id]
        else:
            if eligible_provider_ids:
                pool = [pid for pid in eligible_provider_ids if (branch_assigned_ids is None or pid in branch_assigned_ids)]
            elif branch_assigned_ids is not None:
                pool = list(branch_assigned_ids)
            else:
                tm_stmt = select(TeamMemberORM.id).where(TeamMemberORM.is_active.is_(True))
                tm_res = await self.session.execute(tm_stmt)
                pool = list(tm_res.scalars().all())

            candidate_clinicians = []
            for cid in pool:
                c_tos = await self.booking_settings_repo.list_provider_time_off(team_member_id=cid)
                if not any(to.is_approved and to.start_date <= target_date <= to.end_date for to in c_tos):
                    candidate_clinicians.append(cid)

            if not candidate_clinicians:
                candidate_clinicians = [None]

        # 7. Map each candidate clinician's duration, buffer, shifts, and breaks on target_date
        clinician_shifts_map: Dict[UUID, List[Tuple[int, int]]] = {}
        clinician_breaks_map: Dict[UUID, List[Tuple[int, int]]] = {}
        clinician_duration_map: Dict[UUID, int] = {}
        clinician_buffer_map: Dict[UUID, int] = {}

        for cid in candidate_clinicians:
            # Custom duration and buffer overrides for this doctor
            doc_sp = next(
                (sp for sp in eligible_for_clinic_records if sp.team_member_id == cid),
                None,
            )
            c_dur = doc_sp.custom_duration_minutes if (doc_sp and doc_sp.custom_duration_minutes) else duration_minutes
            c_buf = doc_sp.buffer_minutes if (doc_sp and doc_sp.buffer_minutes is not None) else buffer_minutes
            clinician_duration_map[cid] = c_dur
            clinician_buffer_map[cid] = c_buf

            # A. Check Date-Specific Overrides for this doctor (published only)
            ovr_stmt = select(DoctorScheduleOverrideORM).where(
                DoctorScheduleOverrideORM.team_member_id == cid,
                DoctorScheduleOverrideORM.override_date == target_date,
                DoctorScheduleOverrideORM.is_draft.is_(False),
                or_(
                    DoctorScheduleOverrideORM.clinic_id.is_(None),
                    DoctorScheduleOverrideORM.clinic_id == clinic_id,
                ),
            ).order_by(DoctorScheduleOverrideORM.created_at.desc()).limit(1)
            ovr_res = await self.session.execute(ovr_stmt)
            override = ovr_res.scalar_one_or_none()

            if override:
                if override.override_type == "unavailable":
                    clinician_shifts_map[cid] = []
                    clinician_breaks_map[cid] = []
                    continue

                # override_type is "working" or "modified"
                s_list = []
                b_list = []
                if override.shifts_json:
                    try:
                        shifts = json.loads(override.shifts_json)
                        for sh in shifts:
                            s_st = parse_time_to_minutes(sh.get("start_time"))
                            s_en = parse_time_to_minutes(sh.get("end_time"))
                            if s_st is not None and s_en is not None and s_en > s_st:
                                s_list.append((s_st, s_en))
                    except Exception:
                        pass
                if override.breaks_json:
                    try:
                        breaks = json.loads(override.breaks_json)
                        for br in breaks:
                            b_st = parse_time_to_minutes(br.get("break_start"))
                            b_en = parse_time_to_minutes(br.get("break_end"))
                            if b_st is not None and b_en is not None and b_en > b_st:
                                b_list.append((b_st, b_en))
                    except Exception:
                        pass

                clinician_shifts_map[cid] = s_list
                clinician_breaks_map[cid] = b_list
                continue

            # B. If no date-specific override, load recurring weekly shifts from ProviderAvailabilityORM (published only)
            pa_stmt = select(ProviderAvailabilityORM).where(
                ProviderAvailabilityORM.team_member_id == cid,
                ProviderAvailabilityORM.day_of_week == dow,
                ProviderAvailabilityORM.is_active.is_(True),
                ProviderAvailabilityORM.is_draft.is_(False),
                or_(
                    ProviderAvailabilityORM.clinic_id.is_(None),
                    ProviderAvailabilityORM.clinic_id == clinic_id,
                ),
            )
            pa_res = await self.session.execute(pa_stmt)
            day_avails = list(pa_res.scalars().all())

            # Also check if doctor has ANY published recurring availability configured
            any_avail_stmt = select(ProviderAvailabilityORM.id).where(
                ProviderAvailabilityORM.team_member_id == cid,
                ProviderAvailabilityORM.is_active.is_(True),
                ProviderAvailabilityORM.is_draft.is_(False),
            ).limit(1)
            any_avail_res = await self.session.execute(any_avail_stmt)
            has_any_avail = any_avail_res.scalar_one_or_none() is not None

            if has_any_avail and not day_avails:
                # Doctor has schedule configured, but is off today
                clinician_shifts_map[cid] = []
                clinician_breaks_map[cid] = []
            elif day_avails:
                s_list = []
                b_list = []
                for a in day_avails:
                    s_st = parse_time_to_minutes(a.start_time)
                    s_en = parse_time_to_minutes(a.end_time, is_end_time=True)
                    if s_st is not None and s_en is not None:
                        if s_en > s_st:
                            s_list.append((s_st, s_en))
                        elif s_en < s_st:
                            # Cross-midnight shift starting on target_date
                            s_list.append((s_st, 1440))
                        elif s_st == 0 and s_en == 1440:
                            s_list.append((0, 1440))
                    if a.break_start_time and a.break_end_time:
                        b_st = parse_time_to_minutes(a.break_start_time)
                        b_en = parse_time_to_minutes(a.break_end_time)
                        if b_st is not None and b_en is not None and b_en > b_st:
                            b_list.append((b_st, b_en))
                    if a.breaks_json:
                        try:
                            breaks_extra = json.loads(a.breaks_json)
                            for br in breaks_extra:
                                b_st = parse_time_to_minutes(br.get("break_start"))
                                b_en = parse_time_to_minutes(br.get("break_end"))
                                if b_st is not None and b_en is not None and b_en > b_st:
                                    b_list.append((b_st, b_en))
                        except Exception:
                            pass

                # Check previous day's overnight shift continuation
                prev_dow = (dow - 1) % 7
                prev_pa_stmt = select(ProviderAvailabilityORM).where(
                    ProviderAvailabilityORM.team_member_id == cid,
                    ProviderAvailabilityORM.day_of_week == prev_dow,
                    ProviderAvailabilityORM.is_active.is_(True),
                    ProviderAvailabilityORM.is_draft.is_(False),
                    or_(
                        ProviderAvailabilityORM.clinic_id.is_(None),
                        ProviderAvailabilityORM.clinic_id == clinic_id,
                    ),
                )
                prev_pa_res = await self.session.execute(prev_pa_stmt)
                for pa in prev_pa_res.scalars().all():
                    p_st = parse_time_to_minutes(pa.start_time)
                    p_en = parse_time_to_minutes(pa.end_time)
                    if p_st is not None and p_en is not None and p_en < p_st:
                        # Morning continuation of yesterday's overnight shift
                        s_list.append((0, p_en))

                clinician_shifts_map[cid] = s_list
                clinician_breaks_map[cid] = b_list
            else:
                # Fallback to clinic open intervals
                clinician_shifts_map[cid] = clinic_open_intervals
                clinician_breaks_map[cid] = []

        working_clinicians = [cid for cid in candidate_clinicians if clinician_shifts_map.get(cid)]
        if not working_clinicians:
            return []

        # 8. Pre-load existing bookings on target date and previous date to check collisions & inter-branch travel
        bk_stmt = select(BookingORM).where(
            BookingORM.preferred_date.in_([target_date, target_date - timedelta(days=1)]),
            BookingORM.status.not_in(["cancelled", "no_show"]),
        )
        bk_res = await self.session.execute(bk_stmt)
        existing_bookings = list(bk_res.scalars().all())

        existing_intervals = []
        for b in existing_bookings:
            b_start = parse_time_to_minutes(b.preferred_time)
            if b_start is not None:
                b_dur = 30
                b_buf = 0
                if b.service_id:
                    try:
                        svc_orm = await self.session.get(ServiceORM, UUID(str(b.service_id)))
                        if svc_orm:
                            b_dur = parse_duration_to_minutes(svc_orm.duration)
                            b_buf = getattr(svc_orm, "buffer_minutes", 0) or 0
                    except Exception:
                        pass
                b_end = b_start + b_dur + b_buf
                if b.preferred_date == target_date:
                    existing_intervals.append((b.team_member_id, b.clinic_id, b_start, b_end))
                elif b.preferred_date == target_date - timedelta(days=1):
                    if b_end > 1440:
                        # Overnight booking spilling into target_date
                        existing_intervals.append((b.team_member_id, b.clinic_id, 0, b_end - 1440))

        # 9. Lead time threshold
        min_allowed_time = None
        if enforce_lead_time and target_date == today_local:
            min_allowed_time = now_local.hour * 60 + now_local.minute + (settings.min_lead_time_hours * 60)

        # 10. Generate slots across all clinic opening intervals
        available_slots_set: List[int] = []

        for clinic_open_mins, clinic_close_mins in clinic_open_intervals:
            cand_start = clinic_open_mins
            while cand_start < clinic_close_mins:
                if min_allowed_time is not None and cand_start < min_allowed_time:
                    cand_start += slot_interval
                    continue

                # Check each clinician
                slot_valid_for_any = False
                for cid in working_clinicians:
                    c_dur = clinician_duration_map.get(cid, duration_minutes)
                    c_buf = clinician_buffer_map.get(cid, buffer_minutes)
                    cand_end = cand_start + c_dur
                    cand_occupied_end = cand_start + c_dur + c_buf

                    # A. Must fit within clinic open interval
                    if cand_end > clinic_close_mins:
                        continue

                    # B. Must fit within at least one continuous doctor shift
                    shifts = clinician_shifts_map.get(cid, [])
                    in_shift = False
                    for s_st, s_en in shifts:
                        if cand_start >= s_st and cand_end <= s_en:
                            in_shift = True
                            break
                    if not in_shift:
                        continue

                    # C. Must not overlap any breaks
                    breaks = clinician_breaks_map.get(cid, [])
                    overlap_break = False
                    for b_st, b_en in breaks:
                        if not (cand_end <= b_st or cand_start >= b_en):
                            overlap_break = True
                            break
                    if overlap_break:
                        continue

                    # D. Must not overlap any existing booking of this doctor,
                    # and must honor inter-branch travel buffer if doctor is at another clinic
                    overlap_booking = False
                    for b_tm_id, b_clinic_id, b_st, b_en in existing_intervals:
                        if b_tm_id is None or b_tm_id == cid:
                            if clinic_id and b_clinic_id and b_clinic_id != clinic_id:
                                # Consecutive schedule at different branch: apply inter-branch travel buffer
                                effective_b_st = b_st - travel_buffer_mins
                                effective_b_en = b_en + travel_buffer_mins
                                if not (cand_occupied_end <= effective_b_st or cand_start >= effective_b_en):
                                    overlap_booking = True
                                    break
                            else:
                                if not (cand_occupied_end <= b_st or cand_start >= b_en):
                                    overlap_booking = True
                                    break
                    if overlap_booking:
                        continue

                    # Doctor can take this slot!
                    slot_valid_for_any = True
                    break

                if slot_valid_for_any:
                    if cand_start not in available_slots_set:
                        available_slots_set.append(cand_start)

                cand_start += slot_interval

        available_slots_set.sort()
        return [format_minutes_to_time(s) for s in available_slots_set]

    async def is_slot_available(
        self,
        target_date: date,
        time_str: str,
        service_id: Optional[Union[UUID, str]] = None,
        team_member_id: Optional[UUID] = None,
        clinic_id: Optional[UUID] = None,
        enforce_lead_time: bool = False,
    ) -> bool:
        slots = await self.get_available_slots(
            target_date=target_date,
            service_id=service_id,
            team_member_id=team_member_id,
            clinic_id=clinic_id,
            enforce_lead_time=enforce_lead_time,
        )
        norm_time = parse_time_to_minutes(time_str)
        if norm_time is None:
            return False
        return any(parse_time_to_minutes(s) == norm_time for s in slots)
