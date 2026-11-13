"""Zero-touch production auto-heal module for application startup.

Executes idempotent migrations and data repairs on boot (guarded by schema_meta keys)
so Coolify auto-deployments heal the production database automatically without manual CLI intervention.
"""

import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from sqlalchemy import delete, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.infrastructure.database.orm_models import (
    FaqItemORM,
    GalleryImageORM,
    OrganizationORM,
    SchemaMetaORM,
    SiteSectionORM,
    TeamMemberORM,
    TranslationCacheORM,
    UserORM,
)

URDU_LETTERS = r"[\u0620-\u064A\u0671-\u06D3\u06FA-\u06FC]"
CORRUPTION_REGEX = re.compile(rf"[A-Za-z]+{URDU_LETTERS}|{URDU_LETTERS}+[A-Za-z]")

PLACEHOLDER_DOCTORS = [
    "Dr. Emily White",
    "Dr. Michael Brown",
    "Dr. David Black",
    "Dr. Laura Wilson",
    "Dr. James Taylor",
    "Dr. Olivia Anderson",
    "Dr. Daniel Thomas",
    "Dr. Sophia Jackson",
    "Dr. Matthew White",
    "Dr. Chloe Harris",
    "Dr. Alexander Martin",
    "Dr. Mia Thompson",
]

DEFAULT_FAQS = [
    {
        "category": "general",
        "question": "How often should I visit the dentist for a routine checkup and cleaning?",
        "answer": "We recommend scheduling a comprehensive dental examination and professional cleaning every six months to maintain optimal oral health.",
        "display_order": 1,
    },
    {
        "category": "treatments",
        "question": "Are dental implants painful during the procedure?",
        "answer": "Dental implant procedures are performed under gentle local anesthesia to ensure complete patient comfort and anxiety-free treatment.",
        "display_order": 2,
    },
    {
        "category": "emergency",
        "question": "What should I do in case of a dental emergency?",
        "answer": "Contact our emergency triage line immediately. We offer same-day emergency appointments for severe toothaches, knocked-out teeth, and acute dental trauma.",
        "display_order": 3,
    },
    {
        "category": "treatments",
        "question": "How do Invisalign clear aligners compare to traditional metal braces?",
        "answer": "Invisalign aligners are virtually invisible, removable for eating and brushing, and engineered with SmartTrack material for faster, more comfortable orthodontic alignment.",
        "display_order": 4,
    },
    {
        "category": "pricing",
        "question": "Do you offer consultations and flexible payment options?",
        "answer": "Yes, we provide transparent treatment plans with detailed cost breakdowns before any procedure begins, along with flexible installment options.",
        "display_order": 5,
    },
    {
        "category": "appointments",
        "question": "How can I book or reschedule an appointment?",
        "answer": "You can book instantly online through our 24/7 appointment portal, or call our clinic reception desk. Rescheduling is complimentary up to 24 hours prior to your visit.",
        "display_order": 6,
    },
]


async def run_auto_heal(session: AsyncSession) -> None:
    """Executes safe, idempotent production database repairs on startup."""
    logger.info("Running zero-touch production auto-heal sequence...")

    # 1. Purge corrupt translation cache entries
    try:
        cleanup_meta = await session.get(SchemaMetaORM, "corrupt_cache_cleanup_v1")
        if not cleanup_meta:
            result = await session.execute(select(TranslationCacheORM))
            entries = result.scalars().all()
            hashes_to_delete = []
            for e in entries:
                if e.status == "reviewed":
                    continue
                # Purge if script fusion corruption OR legacy 'auto' status
                if e.status == "auto" or CORRUPTION_REGEX.search(e.translated_text):
                    hashes_to_delete.append(e.hash_key)

            if hashes_to_delete:
                await session.execute(
                    delete(TranslationCacheORM).where(
                        TranslationCacheORM.hash_key.in_(hashes_to_delete)
                    )
                )
                logger.info("Auto-heal: purged %d corrupt/auto rows from translation_cache", len(hashes_to_delete))

            session.add(
                SchemaMetaORM(
                    key="corrupt_cache_cleanup_v1",
                    value=f"Purged {len(hashes_to_delete)} entries on {datetime.now(timezone.utc).isoformat()}",
                )
            )
            await session.flush()
    except Exception as e:
        logger.warning("Auto-heal translation cache purge warning: %s", e)

    # 2. Seed missing FAQs if faq_items table is empty
    try:
        faq_count_res = await session.execute(select(FaqItemORM))
        existing_faqs = faq_count_res.scalars().all()
        if len(existing_faqs) == 0:
            now = datetime.now(timezone.utc)
            for f in DEFAULT_FAQS:
                item = FaqItemORM(
                    id=uuid4(),
                    category=f["category"],
                    question=f["question"],
                    answer=f["answer"],
                    display_order=f["display_order"],
                    is_active=True,
                    is_draft=False,
                    published_at=now,
                    created_at=now,
                    updated_at=now,
                )
                session.add(item)
            logger.info("Auto-heal: seeded %d default FAQ items", len(DEFAULT_FAQS))
            await session.flush()
    except Exception as e:
        logger.warning("Auto-heal FAQ seed warning: %s", e)

    # 3. Auto-fix broken gallery image URLs
    try:
        await session.execute(
            update(GalleryImageORM)
            .where(GalleryImageORM.image_url.like("%custom-clinic.com%"))
            .values(image_url="/images/gallery-3.jpg")
        )
        await session.flush()
    except Exception as e:
        logger.warning("Auto-heal gallery repair warning: %s", e)

    # 4. Deactivate 12 placeholder Western doctors and preserve authentic clinicians
    try:
        doc_meta = await session.get(SchemaMetaORM, "deactivate_placeholder_doctors_v1")
        if not doc_meta:
            # Deactivate Western placeholders
            for name in PLACEHOLDER_DOCTORS:
                await session.execute(
                    update(TeamMemberORM)
                    .where(TeamMemberORM.display_name.ilike(name))
                    .values(is_active=False)
                )

            # Ensure authentic clinicians are active
            authentic_names = [
                "%Hira Saleem%",
                "%Malaika Saleem%",
                "%Carlos Novakowski%",
                "%Yaser Rasheed%",
                "%Meral Ozki%",
                "%Sarah John%",
                "%Jessica Green%",
            ]
            for auth in authentic_names:
                await session.execute(
                    update(TeamMemberORM)
                    .where(TeamMemberORM.display_name.ilike(auth))
                    .values(is_active=True)
                )

            # Ensure Dr. Malaika Saleem has a complete clinical biography
            await session.execute(
                update(TeamMemberORM)
                .where(TeamMemberORM.display_name.ilike("%Malaika%"))
                .where(TeamMemberORM.biography.is_(None))
                .values(
                    biography="Specialist dental surgeon committed to patient-focused oral health treatments, preventive dental wellness, and gentle restorative procedures."
                )
            )

            session.add(
                SchemaMetaORM(
                    key="deactivate_placeholder_doctors_v1",
                    value=f"Deactivated {len(PLACEHOLDER_DOCTORS)} demo doctors on {datetime.now(timezone.utc).isoformat()}",
                )
            )
            logger.info("Auto-heal: deactivated demo clinicians and safeguarded authentic team members")
            await session.flush()
    except Exception as e:
        logger.warning("Auto-heal clinician deactivation warning: %s", e)

    # 5. Media & Branding Verification (Runs on EVERY startup, zero-guard)
    try:
        upload_path = Path(settings.UPLOAD_DIR).resolve()
        upload_path.mkdir(parents=True, exist_ok=True)
        seed_dir = Path(__file__).resolve().parent.parent.parent / "seed_data" / "uploads"

        canonical_logo_filename = "8d90adff4feb4e8db41f532aa3d630f1.png"
        canonical_logo_path = upload_path / canonical_logo_filename
        if not canonical_logo_path.exists() and seed_dir.exists():
            seed_canonical = seed_dir / canonical_logo_filename
            if seed_canonical.exists():
                shutil.copy2(seed_canonical, canonical_logo_path)

        def _heal_file_or_fallback(url: str | None) -> str | None:
            if not url:
                return None
            clean = url.strip()
            match = re.search(r"/(?:media|uploads)/([a-zA-Z0-9_\-\.]+)", clean)
            if match:
                fname = match.group(1)
                target_file = upload_path / fname
                if not target_file.exists():
                    if canonical_logo_path.exists():
                        try:
                            shutil.copy2(canonical_logo_path, target_file)
                            logger.info("Auto-heal: satisfied missing media asset %s with canonical logo", fname)
                            return f"/media/{fname}"
                        except Exception:
                            pass
                    return f"/media/{canonical_logo_filename}"
            return clean

        # Heal SiteSections ('general' section logoUrl)
        section_res = await session.execute(
            select(SiteSectionORM).where(SiteSectionORM.section_key == "general")
        )
        general_sec = section_res.scalar_one_or_none()
        if general_sec and general_sec.content_json:
            try:
                content_dict = json.loads(general_sec.content_json)
                current_logo = content_dict.get("logoUrl")
                if current_logo:
                    healed_logo = _heal_file_or_fallback(current_logo)
                    if healed_logo and healed_logo != current_logo:
                        content_dict["logoUrl"] = healed_logo
                        general_sec.content_json = json.dumps(content_dict, ensure_ascii=False)
                        logger.info("Auto-heal: updated general CMS logoUrl to %s", healed_logo)
                elif canonical_logo_path.exists():
                    content_dict["logoUrl"] = f"/media/{canonical_logo_filename}"
                    general_sec.content_json = json.dumps(content_dict, ensure_ascii=False)
            except Exception as json_err:
                logger.warning("Auto-heal CMS general parsing warning: %s", json_err)

        # Heal Organization logo_url
        org_res = await session.execute(select(OrganizationORM))
        for org in org_res.scalars().all():
            if org.logo_url:
                healed_org_logo = _heal_file_or_fallback(org.logo_url)
                if healed_org_logo:
                    org.logo_url = healed_org_logo
            elif canonical_logo_path.exists():
                org.logo_url = f"/media/{canonical_logo_filename}"

        # Heal User avatars
        users_res = await session.execute(select(UserORM))
        for user in users_res.scalars().all():
            if user.avatar_url:
                match = re.search(r"/(?:media|uploads)/([a-zA-Z0-9_\-\.]+)", user.avatar_url)
                if match:
                    fname = match.group(1)
                    if not (upload_path / fname).exists():
                        user.avatar_url = None

        # Heal TeamMember photos
        team_res = await session.execute(select(TeamMemberORM))
        for member in team_res.scalars().all():
            if member.photo_url:
                match = re.search(r"/(?:media|uploads)/([a-zA-Z0-9_\-\.]+)", member.photo_url)
                if match:
                    fname = match.group(1)
                    if not (upload_path / fname).exists():
                        member.photo_url = None

        await session.flush()
        logger.info("Auto-heal: media and logo verification completed.")
    except Exception as e:
        logger.warning("Auto-heal media check warning: %s", e)

    await session.commit()
    logger.info("Zero-touch production auto-heal sequence completed successfully.")
