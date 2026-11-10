import json
import shutil
from pathlib import Path
from uuid import UUID, uuid4
from datetime import datetime, timezone
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_session_factory
from app.core.logging import logger
from app.infrastructure.database.models import (
    DoctorORM,
    ServiceORM,
    GalleryImageORM,
    LocationORM,
    OrganizationORM,
    SiteSectionORM,
)

DOCTOR_PHOTO_MAP = {
    "dr. hira saleem": "https://images.unsplash.com/photo-1594824813598-1e433f48a0ff?auto=format&fit=crop&w=800&q=80",
    "dr. carlos novakowski": "https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&w=800&q=80",
    "dr. yaser rasheed": "https://images.unsplash.com/photo-1612349317150-f437f4d47221?auto=format&fit=crop&w=800&q=80",
    "dr. meral ozki": "https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?auto=format&fit=crop&w=800&q=80",
    "dr. sarah john": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80",
    "dr. emily white": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=800&q=80",
    "dr. michael brown": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=800&q=80",
    "dr. jessica green": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80",
    "dr. david black": "https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=800&q=80",
    "dr. laura wilson": "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=800&q=80",
    "dr. james taylor": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
    "dr. olivia anderson": "https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=800&q=80",
    "dr. daniel thomas": "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80",
    "dr. sophia jackson": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
    "dr. matthew white": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
    "dr. chloe harris": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80",
    "dr. alexander martin": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80",
    "dr. mia thompson": "https://images.unsplash.com/photo-1594824813598-1e433f48a0ff?auto=format&fit=crop&w=800&q=80",
}

DOCTOR_PHOTOS_LIST = list(DOCTOR_PHOTO_MAP.values())

SERVICE_IMAGE_MAP = {
    "cleanings": "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&q=80",
    "fillings": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80",
    "endodontics": "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=800&q=80",
    "root canal": "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=800&q=80",
    "invisalign": "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=800&q=80",
    "whitening": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
    "emergency": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80",
}

GALLERY_DEFAULTS = [
    {
        "caption": "Sterile Surgical Suite",
        "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
        "display_order": 1,
    },
    {
        "caption": "Advanced Radiography & Consultation",
        "image_url": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80",
        "display_order": 2,
    },
    {
        "caption": "Diagnostic & Preventive Station",
        "image_url": "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=1200&q=80",
        "display_order": 3,
    },
    {
        "caption": "General & Cosmetic Treatment Room",
        "image_url": "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=1200&q=80",
        "display_order": 4,
    },
    {
        "caption": "Patient Comfort & Smile Lounge",
        "image_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1400&q=80",
        "display_order": 5,
    },
]

BRANCH_IMAGE_MAP = {
    "islamabad – main": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1000&q=80",
    "lahore – gulberg": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80",
    "islamabad – f-7 markaz": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1000&q=80",
    "karachi – clifton": "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1000&q=80",
}


def sync_seed_uploads_to_active():
    """
    Ensures tracked seed assets (e.g. clinic logo PNG) in backend/seed_data/uploads
    are present in the active runtime upload directory (settings.UPLOAD_DIR).
    """
    try:
        upload_dir = Path(settings.UPLOAD_DIR).resolve()
        upload_dir.mkdir(parents=True, exist_ok=True)

        app_dir = Path(__file__).resolve().parent.parent.parent
        seed_uploads = app_dir / "seed_data" / "uploads"
        if not seed_uploads.exists():
            seed_uploads = Path("seed_data/uploads").resolve()
        if not seed_uploads.exists():
            seed_uploads = Path("backend/seed_data/uploads").resolve()

        if seed_uploads.exists():
            for src_file in seed_uploads.glob("*"):
                if src_file.is_file():
                    dest_file = upload_dir / src_file.name
                    if not dest_file.exists():
                        shutil.copy2(src_file, dest_file)
    except Exception as e:
        logger.warning("Could not sync seed uploads to upload dir: %s", e)


def is_broken_media_url(url: str | None, upload_dir: Path) -> bool:
    """Returns True if the URL is empty or points to a local /media/ path that does not exist on disk."""
    if not url or not url.strip():
        return True
    trimmed = url.strip()
    if trimmed.startswith("/media/"):
        fname = trimmed.replace("/media/", "")
        file_path = upload_dir / fname
        return not file_path.exists()
    if trimmed.startswith("/images/benyamin.jpg"):
        return True
    return False


async def repair_production_database():
    """
    Idempotent production database repair routine.
    Runs on every FastAPI startup to inspect existing rows in PostgreSQL:
    if any doctors, services, gallery images, locations, or CMS sections have
    broken /media/ URLs or empty URLs, repairs them immediately with verified
    high-resolution cloud assets.
    """
    logger.info("[STARTUP REPAIR] Beginning automated production database media asset check...")
    sync_seed_uploads_to_active()
    upload_dir = Path(settings.UPLOAD_DIR).resolve()

    session_factory = get_session_factory()
    async with session_factory() as session:
        # 1. Doctors Repair
        doc_res = await session.execute(select(DoctorORM))
        doctors = doc_res.scalars().all()
        doc_repaired = 0
        for idx, doc in enumerate(doctors):
            if is_broken_media_url(doc.photo_url, upload_dir):
                name_clean = (doc.display_name or "").lower()
                matched_photo = None
                for key_name, photo_url in DOCTOR_PHOTO_MAP.items():
                    if key_name in name_clean:
                        matched_photo = photo_url
                        break
                if not matched_photo:
                    matched_photo = DOCTOR_PHOTOS_LIST[idx % len(DOCTOR_PHOTOS_LIST)]
                doc.photo_url = matched_photo
                doc_repaired += 1

        # 2. Services Repair
        svc_res = await session.execute(select(ServiceORM))
        services = svc_res.scalars().all()
        svc_repaired = 0
        for idx, svc in enumerate(services):
            if is_broken_media_url(svc.image_url, upload_dir):
                title_clean = (svc.title or "").lower()
                matched_img = None
                for key_name, img_url in SERVICE_IMAGE_MAP.items():
                    if key_name in title_clean:
                        matched_img = img_url
                        break
                if not matched_img:
                    matched_img = list(SERVICE_IMAGE_MAP.values())[idx % len(SERVICE_IMAGE_MAP)]
                svc.image_url = matched_img
                svc_repaired += 1

        # 3. Gallery Images Repair
        gal_res = await session.execute(select(GalleryImageORM))
        gallery = gal_res.scalars().all()
        gal_repaired = 0
        if len(gallery) == 0:
            for g_def in GALLERY_DEFAULTS:
                session.add(GalleryImageORM(
                    id=uuid4(),
                    caption=g_def["caption"],
                    image_url=g_def["image_url"],
                    display_order=g_def["display_order"],
                    is_active=True,
                ))
            gal_repaired += len(GALLERY_DEFAULTS)
        else:
            for idx, g in enumerate(gallery):
                if is_broken_media_url(g.image_url, upload_dir):
                    matched_url = None
                    caption_clean = (g.caption or "").lower()
                    for g_def in GALLERY_DEFAULTS:
                        if g_def["caption"].lower() in caption_clean or caption_clean in g_def["caption"].lower():
                            matched_url = g_def["image_url"]
                            break
                    if not matched_url:
                        matched_url = GALLERY_DEFAULTS[idx % len(GALLERY_DEFAULTS)]["image_url"]
                    g.image_url = matched_url
                    gal_repaired += 1

        # 4. Locations Repair
        loc_res = await session.execute(select(LocationORM))
        locations = loc_res.scalars().all()
        loc_repaired = 0
        for idx, loc in enumerate(locations):
            if is_broken_media_url(loc.image_url, upload_dir):
                loc_clean = (loc.name or "").lower()
                matched_img = None
                for key_name, img_url in BRANCH_IMAGE_MAP.items():
                    if key_name in loc_clean:
                        matched_img = img_url
                        break
                if not matched_img:
                    matched_img = list(BRANCH_IMAGE_MAP.values())[idx % len(BRANCH_IMAGE_MAP)]
                loc.image_url = matched_img
                loc_repaired += 1

        # 5. Organization Logo Repair
        org_res = await session.execute(select(OrganizationORM))
        orgs = org_res.scalars().all()
        for org in orgs:
            if is_broken_media_url(org.logo_url, upload_dir):
                target_logo = upload_dir / "8d90adff4feb4e8db41f532aa3d630f1.png"
                if target_logo.exists():
                    org.logo_url = "/media/8d90adff4feb4e8db41f532aa3d630f1.png"

        # 6. Site Sections Repair
        sec_res = await session.execute(select(SiteSectionORM))
        sections = sec_res.scalars().all()
        sec_repaired = 0
        for sec in sections:
            try:
                data = json.loads(sec.content_json) if isinstance(sec.content_json, str) else dict(sec.content_json)
                changed = False

                if sec.section_key in ("homepage", "hero"):
                    if is_broken_media_url(data.get("heroImageUrl"), upload_dir) or data.get("heroImageUrl") == "/images/benyamin.jpg":
                        data["heroImageUrl"] = "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80"
                        changed = True
                    if is_broken_media_url(data.get("image"), upload_dir) or data.get("image") == "/images/benyamin.jpg":
                        data["image"] = "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80"
                        changed = True
                    if is_broken_media_url(data.get("whyChooseUsImage"), upload_dir):
                        data["whyChooseUsImage"] = "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80"
                        changed = True

                elif sec.section_key == "about":
                    if is_broken_media_url(data.get("imageUrl"), upload_dir) or data.get("imageUrl") == "/images/benyamin.jpg":
                        data["imageUrl"] = "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80"
                        changed = True

                elif sec.section_key == "general":
                    if is_broken_media_url(data.get("logoUrl"), upload_dir):
                        target_logo = upload_dir / "8d90adff4feb4e8db41f532aa3d630f1.png"
                        if target_logo.exists():
                            data["logoUrl"] = "/media/8d90adff4feb4e8db41f532aa3d630f1.png"
                            changed = True

                elif sec.section_key == "seo":
                    if is_broken_media_url(data.get("ogImageUrl"), upload_dir) or data.get("ogImageUrl") == "/images/benyamin.jpg":
                        data["ogImageUrl"] = "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80"
                        changed = True

                if changed:
                    sec.content_json = json.dumps(data)
                    sec_repaired += 1
            except Exception as e:
                logger.warning("Error inspecting section %s for repair: %s", sec.section_key, e)

        await session.commit()
        logger.info(
            "[STARTUP REPAIR SUCCESS] Repaired: %d doctors, %d services, %d gallery items, %d locations, %d site sections.",
            doc_repaired, svc_repaired, gal_repaired, loc_repaired, sec_repaired,
        )

