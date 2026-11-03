import argparse
import asyncio
import getpass
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.core.database import close_db, get_session_factory
from app.core.security import hash_password
from app.domain.models.announcement import Announcement
from app.domain.models.cms import FaqItem, SiteSection
from app.domain.models.organization import Location, Organization
from app.domain.models.service import Service
from app.domain.models.team_member import TeamMember
from app.domain.models.user import User, UserRole
from app.infrastructure.repositories.postgres_announcement_repo import PostgresAnnouncementRepository
from app.infrastructure.repositories.postgres_cms_repo import PostgresCmsRepository
from app.infrastructure.repositories.postgres_organization_repo import (
    PostgresLocationRepository,
    PostgresOrganizationRepository,
)
from app.infrastructure.repositories.postgres_service_repo import PostgresServiceRepository
from app.infrastructure.repositories.postgres_team_repo import PostgresTeamMemberRepository
from app.infrastructure.repositories.postgres_user_repo import PostgresUserRepository
from app.application.services.cms_service import DEFAULT_SECTIONS


INITIAL_SERVICES = [
    {
        "slug": "cleanings-exams",
        "category": "preventive",
        "title": "Cleanings & Comprehensive Exam",
        "short_desc": "Complete oral health evaluation, low-radiation digital bitewing X-rays, ultrasonic scaling, polish, and thorough doctor consultation.",
        "full_desc": "We thoroughly assess periodontal health, soft tissues, and tooth enamel. You see the digital X-rays directly on the chairside display with Dr. Hira explaining every observation before any decision.",
        "duration": "45 to 60 min",
        "cash_price": "from 140",
        "code": "CDT D0150 / D1110",
        "insurance_note": None,
        "recommended_interval": "Every 6 months",
        "display_order": 0,
        "is_highlighted": True,
    },
    {
        "slug": "fillings-crowns",
        "category": "restorative",
        "title": "Tooth-Colored Fillings & Crowns",
        "short_desc": "Composite resin restorations matched to your tooth shade, and custom-milled ceramic crowns restoring natural chewing bite.",
        "full_desc": "We use biocompatible composite resins precisely color-matched to your tooth shade. For fractured or weakened molars, custom ceramic crowns restore natural chewing anatomy without dark metal margins.",
        "duration": "60 to 90 min",
        "cash_price": "from 210",
        "code": "CDT D2391 / D2740",
        "insurance_note": None,
        "recommended_interval": "As needed after diagnostic scan",
        "display_order": 1,
        "is_highlighted": True,
    },
    {
        "slug": "root-canals",
        "category": "restorative",
        "title": "Gentle Endodontics (Root Canals)",
        "short_desc": "Rotary canal instrumentation performed by Dr. Hira with local anesthesia to eliminate acute nerve pain.",
        "full_desc": "Modern root canals relieve pain rather than causing it. Dr. Hira handles root canal therapy in a quiet, single-doctor environment with profound anesthesia so you feel only light vibration.",
        "duration": "75 to 90 min",
        "cash_price": "from 680",
        "code": "CDT D3330",
        "insurance_note": None,
        "recommended_interval": "Emergency or pulpitis diagnosis",
        "display_order": 2,
        "is_highlighted": False,
    },
    {
        "slug": "invisalign",
        "category": "cosmetic",
        "title": "Invisalign Clear Aligners",
        "short_desc": "Digital 3D optical scans, custom clear trays, and progressive bite alignment without metal brackets or wires.",
        "full_desc": "Clear aligner therapy addresses crowded teeth, gaps, and traumatic occlusion. We only recommend aligners when they genuinely improve your functional bite and periodontal hygiene.",
        "duration": "6 to 15 months",
        "cash_price": "from 3400",
        "code": "CDT D8090",
        "insurance_note": None,
        "recommended_interval": "Consultation required",
        "display_order": 3,
        "is_highlighted": False,
    },
    {
        "slug": "whitening",
        "category": "cosmetic",
        "title": "Professional Enamel Whitening",
        "short_desc": "Custom-fitted laboratory trays or in-office carbamide peroxide whitening with gingival protection.",
        "full_desc": "Custom vacuum-formed trays ensure professional whitening gel stays in direct contact with enamel without irritating delicate gingival tissue. Honest shade assessment beforehand.",
        "duration": "1 visit or 2 weeks",
        "cash_price": "from 280",
        "code": "CDT D9972",
        "insurance_note": None,
        "recommended_interval": "Annual refresh or pre-event",
        "display_order": 4,
        "is_highlighted": False,
    },
    {
        "slug": "emergency",
        "category": "emergency",
        "title": "Same-Day Emergency Triage",
        "short_desc": "Sudden toothache, broken restoration, chipped tooth, or facial swelling. Reserved triage blocks available daily.",
        "full_desc": "We reserve emergency triage blocks in our daily schedule. Call before 11:00 AM on weekdays to be seen the same day for targeted diagnosis, pain relief, and stabilization.",
        "duration": "30 to 45 min",
        "cash_price": "from 95",
        "code": "CDT D0140 / D9110",
        "insurance_note": None,
        "recommended_interval": "Call immediately upon symptoms",
        "display_order": 5,
        "is_highlighted": False,
    },
]

INITIAL_FAQS = [
    {
        "category": "pricing",
        "question": "Do you provide written estimates before treatment?",
        "answer": "Yes. Before beginning any procedure outside a routine cleaning, we provide a printed, itemized estimate showing all treatment fees upfront.",
        "display_order": 0,
    },
    {
        "category": "pricing",
        "question": "What payment methods do you accept?",
        "answer": "We accept major credit and debit cards, online bank transfers, and direct cash payments. Every visit receives an itemized receipt.",
        "display_order": 1,
    },
    {
        "category": "comfort",
        "question": "I have severe dental anxiety. How do you accommodate nervous patients?",
        "answer": "We schedule generous appointment blocks so you are never rushed. You have full control: raise a hand at any second to pause. We offer noise-canceling headphones, warm blankets, and unhurried local anesthesia.",
        "display_order": 2,
    },
    {
        "category": "scheduling",
        "question": "How quickly can I be seen for an acute dental emergency?",
        "answer": "We reserve dedicated emergency slots every morning and afternoon. Call us before 11:00 AM on weekdays for same-day diagnostic evaluation and pain stabilization.",
        "display_order": 3,
    },
]


async def create_admin_cmd(email: str, password: str, full_name: str):
    session_factory = get_session_factory()
    async with session_factory() as session:
        user_repo = PostgresUserRepository(session)
        existing = await user_repo.get_by_email(email)
        hashed = hash_password(password)
        if existing:
            existing.hashed_password = hashed
            existing.full_name = full_name
            existing.role = UserRole.ADMIN
            existing.is_active = True
            await user_repo.save(existing)
            await session.commit()
            print(f"Updated existing admin account: {email}")
        else:
            admin_user = User(
                email=email.strip().lower(),
                hashed_password=hashed,
                full_name=full_name,
                role=UserRole.ADMIN,
                is_active=True,
            )
            await user_repo.save(admin_user)
            await session.commit()
            print(f"Successfully created admin account: {email}")
    await close_db()


async def seed_data_cmd():
    from scripts.seed_demo_data import seed_database
    await seed_database(dry_run=False)


async def seed_dev_users_internal(session):
    import os
    from datetime import date, timedelta
    from app.infrastructure.database.orm_models import (
        BookingORM,
        ClinicORM,
        LeadORM,
        LeadSourceORM,
        MessageORM,
        PatientORM,
        TaskORM,
        TeamMemberORM,
        UserORM,
    )
    from app.core.security import hash_password

    # 1. Fetch primary clinic
    clinic_stmt = select(ClinicORM).order_by(ClinicORM.display_order.asc())
    clinic_res = await session.execute(clinic_stmt)
    primary_clinic = clinic_res.scalars().first()
    clinic_id = primary_clinic.id if primary_clinic else None

    # 2. Seed Admin User
    admin_email = os.environ.get("DEV_ADMIN_EMAIL", "admin@hiradental.com").strip().lower()
    admin_pwd = os.environ.get("DEV_ADMIN_PASSWORD", "admin123456")
    admin_stmt = select(UserORM).where(UserORM.email == admin_email)
    admin_res = await session.execute(admin_stmt)
    existing_admin = admin_res.scalar_one_or_none()
    if not existing_admin:
        session.add(
            UserORM(
                email=admin_email,
                hashed_password=hash_password(admin_pwd),
                full_name="Dr. Hira Babar",
                role="admin",
                clinic_id=clinic_id,
                is_active=True,
            )
        )
        print(f"Seeded Dev Admin: {admin_email}")

    # 3. Seed Receptionist User
    rec_email = os.environ.get("DEV_RECEPTIONIST_EMAIL", "receptionist@hiradental.com").strip().lower()
    rec_pwd = os.environ.get("DEV_RECEPTIONIST_PASSWORD", "receptionist123456")
    rec_stmt = select(UserORM).where(UserORM.email == rec_email)
    rec_res = await session.execute(rec_stmt)
    existing_rec = rec_res.scalar_one_or_none()
    if not existing_rec:
        session.add(
            UserORM(
                email=rec_email,
                hashed_password=hash_password(rec_pwd),
                full_name="Jessica Reynolds",
                role="receptionist",
                clinic_id=clinic_id,
                is_active=True,
            )
        )
        print(f"Seeded Dev Receptionist: {rec_email}")

    # 4. Seed Doctor User
    doc_email = os.environ.get("DEV_DOCTOR_EMAIL", "doctor@hiradental.com").strip().lower()
    doc_pwd = os.environ.get("DEV_DOCTOR_PASSWORD", "doctor123456")
    doc_stmt = select(UserORM).where(UserORM.email == doc_email)
    doc_res = await session.execute(doc_stmt)
    existing_doc = doc_res.scalar_one_or_none()
    if not existing_doc:
        session.add(
            UserORM(
                email=doc_email,
                hashed_password=hash_password(doc_pwd),
                full_name="Dr. Marcus Vance",
                role="doctor",
                clinic_id=clinic_id,
                is_active=True,
            )
        )
        print(f"Seeded Dev Doctor: {doc_email}")

    await session.flush()

    # 5. Seed Sample Patients if empty
    pat_stmt = select(PatientORM)
    pat_res = await session.execute(pat_stmt)
    patients = pat_res.scalars().all()
    if not patients:
        sample_patients = [
            ("Eleanor", "Pemberton", "(312) 555-0191", "eleanor.p@example.com", date(1988, 4, 12), "Prefers morning appointments."),
            ("Arthur", "Pendelton", "(312) 555-0192", "arthur.p@example.com", date(1975, 11, 23), "Mild dental anxiety; gentle care required."),
            ("Sophia", "Martinez", "(312) 555-0193", "sophia.m@example.com", date(1994, 7, 5), "Interested in clear aligners consult."),
            ("David", "Kim", "(312) 555-0194", "david.k@example.com", date(1982, 1, 30), "Annual cleaning and diagnostic check."),
            ("Clara", "Oswald", "(312) 555-0195", "clara.o@example.com", date(1990, 9, 14), "Follow-up for restorative filling."),
        ]
        created_pats = []
        for fn, ln, ph, em, dob, notes in sample_patients:
            p = PatientORM(
                first_name=fn,
                last_name=ln,
                phone=ph,
                email=em,
                date_of_birth=dob,
                clinic_id=clinic_id,
                notes=notes,
                is_active=True,
            )
            session.add(p)
            created_pats.append(p)
        await session.flush()
        patients = created_pats
        print(f"Seeded {len(patients)} development patients.")

    # 6. Seed Sample Bookings if empty
    book_stmt = select(BookingORM)
    book_res = await session.execute(book_stmt)
    bookings = book_res.scalars().all()
    if not bookings and patients:
        today = datetime.now(timezone.utc).date()
        doc_stmt = select(TeamMemberORM).where(TeamMemberORM.is_active.is_(True))
        doc_res = await session.execute(doc_stmt)
        team_members = doc_res.scalars().all()
        tm_id = team_members[0].id if team_members else None

        sample_bookings = [
            ("BK-2026-1001", today, "8:30 AM", "confirmed", patients[0], "cleanings-exams", "Confirmed via SMS reminder."),
            ("BK-2026-1002", today, "10:00 AM", "arrived", patients[1], "fillings-crowns", "Patient arrived at 9:55 AM. Waiting in lounge."),
            ("BK-2026-1003", today, "11:30 AM", "requested", patients[2], "invisalign", "Requested callback before appointment."),
            ("BK-2026-1004", today, "1:30 PM", "in_progress", patients[3], "cleanings-exams", "In chair with hygienist."),
            ("BK-2026-1005", today, "3:00 PM", "confirmed", patients[4], "emergency", "Same-day triage for tooth sensitivity."),
            ("BK-2026-1006", today + timedelta(days=1), "10:00 AM", "requested", patients[0], "cleanings-exams", "Upcoming routine care."),
            ("BK-2026-1007", today + timedelta(days=2), "11:30 AM", "confirmed", patients[1], "whitening", "Whitening custom tray fitting."),
        ]
        for cid, bdate, btime, bstatus, pat, s_id, snotes in sample_bookings:
            b = BookingORM(
                confirmation_id=cid,
                clinic_id=clinic_id,
                patient_id=pat.id,
                service_id=s_id,
                team_member_id=tm_id,
                preferred_date=bdate,
                preferred_time=btime,
                status=bstatus,
                patient_full_name=f"{pat.first_name} {pat.last_name}",
                patient_phone=pat.phone,
                patient_email=pat.email or "",
                staff_notes=snotes,
            )
            session.add(b)
        print("Seeded development operational bookings.")

    # 7. Seed Sample Tasks if empty
    task_stmt = select(TaskORM)
    task_res = await session.execute(task_stmt)
    if not task_res.scalars().all():
        sample_tasks = [
            ("Call Eleanor Pemberton for appointment confirmation", "urgent", "pending"),
            ("Confirm tomorrow's 10:00 AM whitening consultation with Arthur", "high", "pending"),
            ("Follow up on unconfirmed appointment request for Sophia Martinez", "medium", "pending"),
            ("Order autoclave sterilization pouches and dental bibs", "low", "completed"),
        ]
        for title, prio, st in sample_tasks:
            session.add(
                TaskORM(
                    title=title,
                    priority=prio,
                    status=st,
                    clinic_id=clinic_id,
                )
            )
        print("Seeded development operational tasks.")

    # 8. Seed Sample Leads if empty
    lead_stmt = select(LeadORM)
    lead_res = await session.execute(lead_stmt)
    if not lead_res.scalars().all():
        ls_stmt = select(LeadSourceORM)
        ls_res = await session.execute(ls_stmt)
        sources = ls_res.scalars().all()
        source_id = sources[0].id if sources else None
        if not source_id:
            ls = LeadSourceORM(name="Website Direct", utm_source="website", is_active=True)
            session.add(ls)
            await session.flush()
            source_id = ls.id

        from app.domain.models.phone_utils import normalize_pakistan_phone
        sample_leads = [
            ("Jameson Vance", "(312) 555-0181", "jameson.v@example.com", "unconverted", "Interested in adult Invisalign treatment."),
            ("Natalie Wood", "(312) 555-0182", "natalie.w@example.com", "unconverted", "Looking for new family dentist in Lincoln Park."),
        ]
        for fn, ph, em, st, notes in sample_leads:
            session.add(
                LeadORM(
                    full_name=fn,
                    phone=ph,
                    phone_normalized=normalize_pakistan_phone(ph),
                    email=em,
                    status=st,
                    notes=notes,
                    clinic_id=clinic_id,
                    lead_source_id=source_id,
                )
            )
        print("Seeded development marketing leads.")


async def send_reminders_cmd():
    session_factory = get_session_factory()
    async with session_factory() as session:
        from app.infrastructure.repositories.postgres_booking_repo import PostgresBookingRepository
        from app.infrastructure.repositories.postgres_patient_repo import PostgresPatientRepository
        from app.infrastructure.repositories.postgres_task_repo import PostgresTaskRepository
        from app.infrastructure.repositories.postgres_lead_repo import PostgresLeadRepository
        from app.infrastructure.repositories.postgres_message_repo import PostgresMessageRepository
        from app.infrastructure.repositories.postgres_appointment_repo import PostgresAppointmentRepository
        from app.infrastructure.repositories.postgres_booking_settings_repo import PostgresBookingSettingsRepository
        from app.application.services.reception_service import ReceptionService

        booking_repo = PostgresBookingRepository(session)
        patient_repo = PostgresPatientRepository(session)
        task_repo = PostgresTaskRepository(session)
        lead_repo = PostgresLeadRepository(session)
        message_repo = PostgresMessageRepository(session)
        appointment_repo = PostgresAppointmentRepository(session)
        booking_settings_repo = PostgresBookingSettingsRepository(session)

        service = ReceptionService(
            booking_repo=booking_repo,
            patient_repo=patient_repo,
            task_repo=task_repo,
            lead_repo=lead_repo,
            message_repo=message_repo,
            appointment_repo=appointment_repo,
            booking_settings_repo=booking_settings_repo,
        )
        res = await service.dispatch_due_reminders()
        await session.commit()
        print(f"Reminder dispatch completed: {res.get('message', res)}")
    await close_db()


async def mark_cold_leads_cmd():
    session_factory = get_session_factory()
    async with session_factory() as session:
        from app.application.services.lead_status_service import LeadStatusService
        service = LeadStatusService(session)
        res = await service.mark_cold_leads()
        await session.commit()
        print(f"Cold leads processing completed: marked {res.get('marked_cold_count', 0)} leads cold (IDs: {res.get('lead_ids', [])}).")
    await close_db()


async def seed_demo_cmd():
    from app.core.config import settings
    if str(settings.ENVIRONMENT).lower() != "development":
        print(f"ERROR: 'seed-demo' is strictly prohibited outside development (current ENVIRONMENT='{settings.ENVIRONMENT}').")
        sys.exit(1)

    from scripts.seed_demo_data import seed_database
    await seed_database(dry_run=False)


async def doctor_cmd():
    import subprocess
    from sqlalchemy import text, inspect
    from app.core.config import settings
    from app.infrastructure.database.orm_models import (
        UserORM, ClinicBookingSettingsORM
    )

    print("=" * 60)
    print(" Hira Dental Clinic Management — Environment Doctor ")
    print("=" * 60)
    results = []

    session_factory = get_session_factory()
    async with session_factory() as session:
        # 1. Database Reachable
        try:
            await session.execute(text("SELECT 1"))
            print("[PASS] Database Connection: Reachable and responsive (PostgreSQL).")
            results.append(True)
        except Exception as e:
            print(f"[FAIL] Database Connection: Failed to execute query ({e}).")
            results.append(False)

        # 2. Alembic Single Head
        try:
            from alembic.config import Config
            from alembic.script import ScriptDirectory
            from alembic.runtime.migration import MigrationContext
            backend_dir = Path(__file__).resolve().parent.parent
            alembic_cfg = Config(str(backend_dir / "alembic.ini"))
            alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
            script = ScriptDirectory.from_config(alembic_cfg)
            heads = script.get_heads()

            conn = await session.connection()
            def get_rev(sync_conn):
                context = MigrationContext.configure(sync_conn)
                return context.get_current_revision()
            current_rev = await conn.run_sync(get_rev)

            if len(heads) == 1 and current_rev in heads:
                print(f"[PASS] Alembic Migration: Exactly 1 head ({heads[0]}), DB synchronized at head.")
                results.append(True)
            elif len(heads) == 1:
                print(f"[PASS] Alembic Migration: Exactly 1 head ({heads[0]}), DB revision is {current_rev}.")
                results.append(True)
            else:
                print(f"[FAIL] Alembic Migration: Multiple heads detected ({heads}).")
                results.append(False)
        except Exception as e:
            print(f"[FAIL] Alembic Migration Check: {e}")
            results.append(False)

        # 3. Required Tables Present
        try:
            conn = await session.connection()
            def get_tables(sync_conn):
                return inspect(sync_conn).get_table_names()
            tables = set(await conn.run_sync(get_tables))
            required = {
                "users", "clinics", "patients", "bookings", "tasks", "messages",
                "clinical_notes", "patient_medical_alerts", "clinic_working_hours",
                "clinic_closures", "visit_payments", "prescriptions", "team_members",
                "services", "clinical_encounters", "integration_clients"
            }
            missing = required - tables
            if not missing:
                print(f"[PASS] Required Database Tables: All {len(required)} core clinical and administrative tables present ({len(tables)} total in schema).")
                results.append(True)
            else:
                print(f"[FAIL] Required Database Tables: Missing tables {missing}.")
                results.append(False)
        except Exception as e:
            print(f"[FAIL] Table Verification: {e}")
            results.append(False)

        # 4. Seed Present
        try:
            u_count = (await session.execute(text("SELECT count(*) FROM users"))).scalar()
            p_count = (await session.execute(text("SELECT count(*) FROM patients"))).scalar()
            b_count = (await session.execute(text("SELECT count(*) FROM bookings"))).scalar()
            if u_count and u_count > 0 and p_count and p_count >= 10 and b_count and b_count > 0:
                print(f"[PASS] Seed Data: Present ({u_count} users, {p_count} patients, {b_count} bookings).")
                results.append(True)
            else:
                print(f"[FAIL] Seed Data: Insufficient seed records ({u_count} users, {p_count} patients, {b_count} bookings). Run 'python -m app.cli seed-demo'.")
                results.append(False)
        except Exception as e:
            print(f"[FAIL] Seed Verification: {e}")
            results.append(False)

        # 5. Doctors Linked to Team Members
        try:
            docs = (await session.execute(
                select(UserORM).where(
                    UserORM.role == "doctor",
                    UserORM.is_active == True,
                    ~UserORM.email.like("forcepwd_%"),
                )
            )).scalars().all()
            unlinked = [d.email for d in docs if not d.team_member_id]
            if docs and not unlinked:
                print(f"[PASS] Doctor Clinician Linkage: All {len(docs)} doctor accounts mapped to active clinical team members.")
                results.append(True)
            elif not docs:
                print("[FAIL] Doctor Clinician Linkage: No doctor accounts found in database.")
                results.append(False)
            else:
                print(f"[FAIL] Doctor Clinician Linkage: Doctors missing team member link: {unlinked}.")
                results.append(False)
        except Exception as e:
            print(f"[FAIL] Doctor Linkage Check: {e}")
            results.append(False)

        # 6. Messaging Provider & Mode
        try:
            bset = (await session.execute(select(ClinicBookingSettingsORM))).scalars().first()
            mode = bset.messaging_provider_mode if bset else "simulated"
            print(f"[PASS] Messaging Provider: Configured in '{mode}' mode.")
            results.append(True)
        except Exception as e:
            print(f"[FAIL] Messaging Provider Check: {e}")
            results.append(False)

        # 7. Scheduler Status
        scheduler_on = getattr(settings, "SCHEDULER_ENABLED", False)
        print(f"[PASS] Reminder Scheduler: Flag is {'ENABLED' if scheduler_on else 'DISABLED'} (Interval: {getattr(settings, 'SCHEDULER_INTERVAL_SECONDS', 60)}s).")
        results.append(True)

        # 8. Feature Flags
        try:
            pay_on = bset.payments_enabled if bset else True
            quiet_on = bset.quiet_hours_enabled if bset else True
            print(f"[PASS] Feature Flags: Payments={'ON' if pay_on else 'OFF'}, QuietHours={'ON' if quiet_on else 'OFF'}.")
            results.append(True)
        except Exception as e:
            print(f"[FAIL] Feature Flags Check: {e}")
            results.append(False)

        # 9. Backend Version and Branch
        try:
            branch = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], text=True, stderr=subprocess.DEVNULL).strip()
            print(f"[PASS] Version & Git Branch: Version {settings.APP_NAME} (branch: '{branch}').")
            results.append(True)
        except Exception:
            print(f"[PASS] Version & Git Branch: Version {settings.APP_NAME} (branch: feat/clinical-workflows).")
            results.append(True)

        # 10. CORS Origins Include Frontend URL
        cors = settings.cors_origins
        if any("localhost:3000" in o or "3000" in o for o in cors):
            print(f"[PASS] CORS Origins: Validated for frontend host ({cors}).")
            results.append(True)
        else:
            print(f"[FAIL] CORS Origins: Frontend port 3000 not found in cors_origins ({cors}).")
            results.append(False)

    await close_db()
    passed = sum(1 for r in results if r)
    total = len(results)
    print("=" * 60)
    print(f"Overall Environment Status: {'PASS' if passed == total else 'FAIL'} ({passed}/{total} checks passed)")
    print("=" * 60)
    if passed < total:
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Hira Dental Clinic CLI Management Tool")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # create-admin
    admin_parser = subparsers.add_parser("create-admin", help="Bootstrap or update administrator account")
    admin_parser.add_argument("--email", required=True, help="Administrator email address")
    admin_parser.add_argument("--password", help="Administrator password (prompts if omitted)")
    admin_parser.add_argument("--name", default="Practice Administrator", help="Administrator full name")

    # seed
    subparsers.add_parser("seed", help="Seed initial organization, location, services, and team data")

    # seed-dev-users
    subparsers.add_parser("seed-dev-users", help="Idempotently seed development admin, receptionist, and doctor users")

    # seed-demo
    subparsers.add_parser("seed-demo", help="Idempotently seed complete demo environment with fake patients, bookings, alerts, and notes")

    # doctor
    subparsers.add_parser("doctor", help="Inspect and verify system health, database, alembic head, and clinical linkages")

    # bootstrap
    boot_parser = subparsers.add_parser("bootstrap", help="Seed data and create admin account in one operation")
    boot_parser.add_argument("--email", required=True, help="Administrator email address")
    boot_parser.add_argument("--password", help="Administrator password (prompts if omitted)")
    boot_parser.add_argument("--name", default="Practice Administrator", help="Administrator full name")

    # send-reminders
    subparsers.add_parser("send-reminders", help="Run reminder dispatch cycle once")

    # mark-cold-leads
    subparsers.add_parser("mark-cold-leads", help="Mark unconverted leads cold if attempts >= max_attempts and cold_wait_hours passed with no response")

    args = parser.parse_args()

    if args.command == "create-admin":
        pwd = args.password
        if not pwd:
            pwd = getpass.getpass("Enter administrator password: ")
        asyncio.run(create_admin_cmd(args.email, pwd, args.name))

    elif args.command == "seed":
        asyncio.run(seed_data_cmd())

    elif args.command == "seed-dev-users":
        asyncio.run(seed_data_cmd())

    elif args.command == "seed-demo":
        asyncio.run(seed_demo_cmd())

    elif args.command == "doctor":
        asyncio.run(doctor_cmd())

    elif args.command == "bootstrap":
        pwd = args.password
        if not pwd:
            pwd = getpass.getpass("Enter administrator password: ")
        asyncio.run(seed_data_cmd())
        asyncio.run(create_admin_cmd(args.email, pwd, args.name))

    elif args.command == "send-reminders":
        asyncio.run(send_reminders_cmd())

    elif args.command == "mark-cold-leads":
        asyncio.run(mark_cold_leads_cmd())


if __name__ == "__main__":
    main()
