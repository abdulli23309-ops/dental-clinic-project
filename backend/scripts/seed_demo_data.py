"""
Seed demo data for Dr. Hira's Dental Care (DHDC).
Populates 18 doctors, 4 branches, working hours, 4 gallery images, and 3 review samples.
Idempotent and supports --dry-run and --database=NAME flags.
"""

import argparse
import asyncio
import os
import shutil
import sys
from datetime import date, datetime
from pathlib import Path
from uuid import UUID, uuid4

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.infrastructure.database.orm_models import (
    ClinicORM,
    ClinicWorkingHoursORM,
    GalleryImageORM,
    LocationORM,
    OrganizationORM,
    ReviewORM,
    TeamMemberORM,
)

# ---------------------------------------------------------------------------
# Data Definitions
# ---------------------------------------------------------------------------

BRANCHES = [
    {
        "id": UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"),
        "name": "DHDC Islamabad \u2013 Main",
        "city": "Islamabad",
        "address_line1": "Shop No. 8 & 9, ASCON Heights, Lower Ground, Soan Garden, Block C",
        "address_line2": None,
        "state": "Islamabad Capital Territory",
        "postal_code": "44000",
        "country": "Pakistan",
        "phone": "+92 051-6102977",
        "email": "info@drhirasdentalcare.com",
        "hours_info": "Mon - Sat: 9:00 AM - 9:00 PM\nSunday: 11:00 AM - 6:00 PM",
        "image_url": "/media/74d9a7f91cbc43ebbce337709f1ef0e6.jpg",
        "is_primary": True,
        "is_active": True,
        "display_order": 0,
    },
    {
        "id": UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"),
        "name": "DHDC Lahore \u2013 Gulberg",
        "city": "Lahore",
        "address_line1": "42-A Main Boulevard, Gulberg III",
        "address_line2": None,
        "state": "Punjab",
        "postal_code": "54000",
        "country": "Pakistan",
        "phone": "+92 42 35789123",
        "email": "lahore@drhirasdentalcare.com",
        "hours_info": "Mon - Sat: 9:00 AM - 7:00 PM\nSunday: Closed",
        "image_url": "/media/942a036d4bb747219ae2030d87b8ba25.jpg",
        "is_primary": False,
        "is_active": True,
        "display_order": 1,
    },
    {
        "id": UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"),
        "name": "DHDC Islamabad \u2013 F-7 Markaz",
        "city": "Islamabad",
        "address_line1": "Plot 18, Block B, Jinnah Super, F-7 Markaz",
        "address_line2": None,
        "state": "Islamabad Capital Territory",
        "postal_code": "44000",
        "country": "Pakistan",
        "phone": "+92 51 2654321",
        "email": "f7@drhirasdentalcare.com",
        "hours_info": "Mon - Sat: 10:00 AM - 8:00 PM\nSunday: Closed",
        "image_url": "/media/085ef721fea544dd83266497915a7517.jpg",
        "is_primary": False,
        "is_active": True,
        "display_order": 2,
    },
    {
        "id": UUID("7968ba25-db4a-4e11-8e57-af8507823e20"),
        "name": "DHDC Karachi \u2013 Clifton",
        "city": "Karachi",
        "address_line1": "Suite 502, Ocean Mall Tower, Clifton Block 9",
        "address_line2": None,
        "state": "Sindh",
        "postal_code": "75600",
        "country": "Pakistan",
        "phone": "+92 21 35876543",
        "email": "karachi@drhirasdentalcare.com",
        "hours_info": "Mon - Sat: 10:00 AM - 9:00 PM\nSunday: Closed",
        "image_url": "/media/e494908e44ca4adfb6b8aab4220666a5.jpg",
        "is_primary": False,
        "is_active": True,
        "display_order": 3,
    },
]

DOCTORS = [
    {
        "id": UUID("549cf72e-ecd4-432d-a710-843a9f24aabe"),
        "location_id": UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"),
        "first_name": "Dr. Hira",
        "last_name": "Saleem",
        "display_name": "Dr. Hira Saleem, BDS",
        "professional_title": "Founder & Lead Dentist",
        "role": "Dentist",
        "specialties_json": '["General Dentistry", "Restorative Care", "Cosmetic Dentistry", "Patient-Centric Treatment Planning"]',
        "biography": "Dr. Hira Saleem is the founder and lead clinician at Dr. Hira's Dental Care. With extensive clinical experience in restorative and aesthetic dentistry, she established DHDC to bring modern, gentle, and transparent oral healthcare to patients across Pakistan. She specializes in minimally invasive treatments, smile rejuvenation, and anxious patient care.",
        "photo_url": "/media/1c167b3d36eb47c8b0918aeb633af8a9.jpg",
        "education": "BDS, University of Health Sciences, Lahore",
        "credentials": "BDS, RDS",
        "license_number": "PMDC-41209-D",
        "display_order": 1,
        "is_active": True,
    },
    {
        "id": UUID("d0897bb6-3ced-44e8-a7fd-efa51af661a7"),
        "location_id": UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"),
        "first_name": "Dr. Carlos",
        "last_name": "Novakowski",
        "display_name": "Dr. Carlos Novakowski",
        "professional_title": "Consultant Orthodontist",
        "role": "Orthodontist",
        "specialties_json": '["Orthodontics", "Clear Aligners", "Self-Ligating Braces", "Surgical Orthodontics"]',
        "biography": "Dr. Carlos Novakowski has over 14 years of orthodontic experience spanning adult and interceptive adolescent care. He is certified in modern clear aligner therapy and lingual appliances, focusing on harmonic facial aesthetics alongside functional occlusion.",
        "photo_url": "/media/d91f21d15da34833b4d3cb89153c07cc.jpg",
        "education": "DDS, MSc in Orthodontics",
        "credentials": "DDS, MSc (Orthodontics)",
        "license_number": "PMDC-52014-O",
        "display_order": 2,
        "is_active": True,
    },
    {
        "id": UUID("24769c71-6545-4266-b1de-db400e06e71d"),
        "location_id": UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"),
        "first_name": "Dr. Yaser",
        "last_name": "Rasheed",
        "display_name": "Dr. Yaser Rasheed",
        "professional_title": "General Dentist",
        "role": "Dentist",
        "specialties_json": '["General Dentistry", "Root Canal Therapy", "Preventive Care"]',
        "biography": "Dr. Yaser Rasheed leads restorative procedures at the Lahore clinic. He has dedicated over a decade to pain-free endodontics and single-visit restorations.",
        "photo_url": "/media/b296e9876020459db93fb64aa133fbd0.jpg",
        "education": "BDS, King Edward Medical University",
        "credentials": "BDS, C-Endo",
        "license_number": "PMDC-48931-R",
        "display_order": 3,
        "is_active": True,
    },
    {
        "id": UUID("c0d1ee69-a91e-4c0e-b6c6-27f8ba314424"),
        "location_id": UUID("7968ba25-db4a-4e11-8e57-af8507823e20"),
        "first_name": "Dr. Meral",
        "last_name": "Ozki",
        "display_name": "Dr. Meral Ozki",
        "professional_title": "Clinical Dentist",
        "role": "Dentist",
        "specialties_json": '["Clinical Dentistry", "Crowns & Bridges", "Dental Prosthetics"]',
        "biography": "Dr. Meral Ozki manages fixed prosthetics and conservative rehabilitation at our Karachi Clifton facility.",
        "photo_url": "/media/80bb165959a344d781e8e612c1e0710f.jpg",
        "education": "DDS, Istanbul University Faculty of Dentistry",
        "credentials": "DDS",
        "license_number": "PMDC-60142-K",
        "display_order": 4,
        "is_active": True,
    },
    {
        "id": UUID("bb90bb95-6d02-4282-85d8-5d78fb5ba65c"),
        "location_id": UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"),
        "first_name": "Dr. Sarah",
        "last_name": "John",
        "display_name": "Dr. Sarah John",
        "professional_title": "Orthodontist",
        "role": "Dentist",
        "specialties_json": '["Orthodontics", "Interceptive Care", "Smile Design"]',
        "biography": "Dr. Sarah John coordinates orthodontic diagnostic simulations and digital clear aligner treatment plans.",
        "photo_url": "/media/fa158e07a80d4ef3b7a2bd05b87aec5e.jpg",
        "education": "BDS, Fatima Jinnah Dental College",
        "credentials": "BDS, MOrth",
        "license_number": "PMDC-55214-S",
        "display_order": 5,
        "is_active": True,
    },
    {
        "id": UUID("3cc8c0e3-2206-4e4f-9b4b-f731d2300758"),
        "location_id": UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"),
        "first_name": "Dr. Alejandro",
        "last_name": "Morah",
        "display_name": "Dr. Alejandro Morah",
        "professional_title": "Oral Surgeon",
        "role": "Oral Surgeon",
        "specialties_json": '["Oral & Maxillofacial Surgery", "Wisdom Tooth Extractions", "Bone Grafting"]',
        "biography": "Dr. Alejandro Morah provides complex surgical extractions, bone preservation, and pre-implant surgical therapy.",
        "photo_url": "/media/65979e67075d4ed9bd3b6712f17a08e9.jpg",
        "education": "DMD, Oral Surgery Residency",
        "credentials": "DMD, FICOI",
        "license_number": "PMDC-61879-M",
        "display_order": 6,
        "is_active": True,
    },
    {
        "id": UUID("bc3395da-0209-4695-ab7f-cf513f00068c"),
        "location_id": UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"),
        "first_name": "Dr. Ahmed",
        "last_name": "Raza",
        "display_name": "Dr. Ahmed Raza",
        "professional_title": "General Dentist",
        "role": "Dentist",
        "specialties_json": '["Preventive Care", "Composite Fillings", "Teeth Whitening"]',
        "biography": "Dr. Ahmed Raza has 8 years of experience in restorative and preventive oral health. He is known for gentle local anesthesia and thorough patient education.",
        "photo_url": "/media/febb95fe14a945a1be248d2892208ac7.png",
        "education": "BDS, Nishtar Medical University",
        "credentials": "BDS",
        "license_number": "PMDC-51203-A",
        "display_order": 7,
        "is_active": True,
    },
    {
        "id": UUID("e0827328-6cac-4f80-a1a7-37d0ef7f035c"),
        "location_id": UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"),
        "first_name": "Dr. Amna",
        "last_name": "Siddiqui",
        "display_name": "Dr. Amna Siddiqui",
        "professional_title": "Orthodontist",
        "role": "Orthodontist",
        "specialties_json": '["Orthodontics", "Clear Aligners", "Traditional Braces"]',
        "biography": "Dr. Amna Siddiqui specializes in modern digital orthodontics, helping teens and adults achieve straight, healthy smiles with aligners.",
        "photo_url": "/media/661efc9e2ef44f808f052b771e5aab55.png",
        "education": "BDS, Dow University of Health Sciences + FCPS",
        "credentials": "BDS, FCPS (Orthodontics)",
        "license_number": "PMDC-62187-S",
        "display_order": 8,
        "is_active": True,
    },
    {
        "id": UUID("a1f107ea-538c-47fc-b234-232732354e6d"),
        "location_id": UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"),
        "first_name": "Dr. Fatima",
        "last_name": "Khan",
        "display_name": "Dr. Fatima Khan",
        "professional_title": "Pediatric Dentist",
        "role": "Pediatric Dentist",
        "specialties_json": '["Pediatric Dentistry", "Child Preventive Care", "Fluoride Therapy"]',
        "biography": "Dr. Fatima Khan creates fun, welcoming, and fear-free dental visits for infants, toddlers, and young children.",
        "photo_url": "/media/733ab56ed7a04f5ca5cdc1d2a8e85beb.png",
        "education": "BDS, Khyber Medical University",
        "credentials": "BDS, C-Pedo",
        "license_number": "PMDC-71402-K",
        "display_order": 9,
        "is_active": True,
    },
    {
        "id": UUID("a3483e28-2df2-4b5a-ad86-ac83b1988941"),
        "location_id": UUID("7968ba25-db4a-4e11-8e57-af8507823e20"),
        "first_name": "Dr. Sana",
        "last_name": "Tariq",
        "display_name": "Dr. Sana Tariq",
        "professional_title": "Cosmetic Dentist",
        "role": "Dentist",
        "specialties_json": '["Cosmetic Dentistry", "Veneers", "Smile Makeovers"]',
        "biography": "Dr. Sana Tariq crafts natural porcelain veneers, composite bonding, and in-office smile makeovers.",
        "photo_url": "/media/4bed73834ea54ddf8263682ec58f09a3.png",
        "education": "BDS, Baqai Medical University",
        "credentials": "BDS, AACD Member",
        "license_number": "PMDC-68219-T",
        "display_order": 10,
        "is_active": True,
    },
    {
        "id": UUID("3575b9d1-9b3d-4a50-8d85-d48718387979"),
        "location_id": UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"),
        "first_name": "Dr. Bilal",
        "last_name": "Hussain",
        "display_name": "Dr. Bilal Hussain",
        "professional_title": "Oral Surgeon",
        "role": "Oral Surgeon",
        "specialties_json": '["Oral Surgery", "Wisdom Tooth Removal", "Implant Placement"]',
        "biography": "Dr. Bilal Hussain brings 12 years of surgical proficiency to DHDC, focusing on safe third-molar extractions and bone preservation.",
        "photo_url": "/media/cab50475196a4e19a5e6aeb2be4f0685.png",
        "education": "BDS, Rawalpindi Medical College + FCPS (Oral Surgery)",
        "credentials": "BDS, FCPS (Oral & Maxillofacial)",
        "license_number": "PMDC-49182-H",
        "display_order": 11,
        "is_active": True,
    },
    {
        "id": UUID("bb9754f9-23f3-4a44-b8a0-7b43a0be379b"),
        "location_id": UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"),
        "first_name": "Dr. Usman",
        "last_name": "Ali",
        "display_name": "Dr. Usman Ali",
        "professional_title": "Periodontist",
        "role": "Dentist",
        "specialties_json": '["Periodontics", "Gum Surgery", "Deep Cleaning", "Laser Therapy"]',
        "biography": "Dr. Usman is our periodontist with 10 years of specialized experience in gum health, laser therapy, and dental implant maintenance.",
        "photo_url": "/media/d2cde336f6bd4bbcaa7fa9610b9aee3c.jpg",
        "education": "Quaid-e-Azam Dental College + FCPS (Periodontology)",
        "credentials": "BDS, FCPS (Periodontology)",
        "license_number": "PMDC-58932-A",
        "display_order": 12,
        "is_active": True,
    },
    {
        "id": UUID("2d8f01b4-e2ad-4d3f-bc3b-f6020ffe98ed"),
        "location_id": UUID("7968ba25-db4a-4e11-8e57-af8507823e20"),
        "first_name": "Dr. Daniyal",
        "last_name": "Abbas",
        "display_name": "Dr. Daniyal Abbas",
        "professional_title": "Implantologist",
        "role": "Dentist",
        "specialties_json": '["Dental Implants", "Bone Grafting", "Full-Arch Restoration"]',
        "biography": "Dr. Daniyal is our implantology specialist with 11 years of experience in guided surgery, 3D CBCT planning, and long-term full-arch rehabilitation.",
        "photo_url": "/media/55641bc41c5849c7990af3eec8db4280.jpg",
        "education": "Baqai Medical University + FCPS in Oral Implantology",
        "credentials": "BDS, FCPS (Oral Implantology)",
        "license_number": "PMDC-64891-A",
        "display_order": 13,
        "is_active": True,
    },
    {
        "id": UUID("121a689b-885a-48b3-95b4-52a569bacee9"),
        "location_id": UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"),
        "first_name": "Dr. Hamza",
        "last_name": "Sheikh",
        "display_name": "Dr. Hamza Sheikh",
        "professional_title": "Prosthodontist",
        "role": "Dentist",
        "specialties_json": '["Crowns", "Bridges", "Dentures", "Full Mouth Rehabilitation"]',
        "biography": "Dr. Hamza is a prosthodontist specializing in digitally designed ceramic crowns, fixed bridges, and comprehensive full-mouth restorations.",
        "photo_url": "/media/2d1a9244830844e8b6826729e1b6db2d.png",
        "education": "Punjab Medical College + MDS in Prosthodontics",
        "credentials": "BDS, MDS (Prosthodontics)",
        "license_number": "PMDC-63409-S",
        "display_order": 14,
        "is_active": True,
    },
    {
        "id": UUID("fc1628c1-d7d6-4ae8-adf6-8c550c21673e"),
        "location_id": UUID("7968ba25-db4a-4e11-8e57-af8507823e20"),
        "first_name": "Dr. Zain",
        "last_name": "Malik",
        "display_name": "Dr. Zain Malik",
        "professional_title": "Endodontist",
        "role": "Dentist",
        "specialties_json": '["Endodontics", "Root Canal Therapy", "Microsurgery"]',
        "biography": "Dr. Zain is our endodontic specialist using rotary files and dental operating microscopes to provide pain-free single-visit root canals.",
        "photo_url": "/media/248de043ded14857812660efdd5f354b.jpg",
        "education": "Liaquat University of Medical & Health Sciences, Jamshoro",
        "credentials": "BDS",
        "license_number": "PMDC-74106-M",
        "display_order": 15,
        "is_active": True,
    },
    {
        "id": UUID("a743ad5b-75b2-43ff-b6e2-228edc4a619b"),
        "location_id": UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"),
        "first_name": "Dr. Faraz",
        "last_name": "Ahmed",
        "display_name": "Dr. Faraz Ahmed",
        "professional_title": "General Dentist",
        "role": "Dentist",
        "specialties_json": '["General Dentistry", "Preventive Care", "Emergency Dentistry"]',
        "biography": "Dr. Faraz handles walk-in emergencies, urgent pain triage, and preventive checkups with a calm, comforting clinical approach.",
        "photo_url": "/media/e6d46183c5c2431e8c1c8041f7b0e0ff.jpg",
        "education": "Army Medical College, Rawalpindi",
        "credentials": "BDS",
        "license_number": "PMDC-77582-A",
        "display_order": 16,
        "is_active": True,
    },
    {
        "id": UUID("9d842c21-5c1a-480e-ba25-4b92f6d0b447"),
        "location_id": UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"),
        "first_name": "Dr. Saad",
        "last_name": "Iqbal",
        "display_name": "Dr. Saad Iqbal",
        "professional_title": "Cosmetic Dentist",
        "role": "Dentist",
        "specialties_json": '["Cosmetic Dentistry", "Composite Bonding", "Smile Design"]',
        "biography": "Dr. Saad is focused on micro-dentistry, tooth color matching, and conservative cosmetic bonding for chipped or discolored teeth.",
        "photo_url": "/media/286ac9e85dd04672902e6265b29b7b98.jpg",
        "education": "Sharif Medical & Dental College, Lahore",
        "credentials": "BDS",
        "license_number": "PMDC-80367-I",
        "display_order": 17,
        "is_active": True,
    },
    {
        "id": UUID("b12d9242-b56c-4331-adfe-3e16a8e6674d"),
        "location_id": UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"),
        "first_name": "Dr. Hamid",
        "last_name": "Khan",
        "display_name": "Dr. Hamid Khan",
        "professional_title": "Orthodontist",
        "role": "Orthodontist",
        "specialties_json": '["Orthodontics", "Self-Ligating Braces", "Lingual Braces"]',
        "biography": "Dr. Hamid specializes in self-ligating braces and complex bite correction with over 8 years of dedicated orthodontic practice.",
        "photo_url": "/media/b3b4d4c0a05c42d4bd594625996c0f4f.jpg",
        "education": "Khyber Medical University, Peshawar + MDS in Orthodontics",
        "credentials": "BDS, MDS (Orthodontics)",
        "license_number": "PMDC-59218-K",
        "display_order": 18,
        "is_active": True,
    },
]

GALLERY = [
    {
        "id": UUID("c2637e68-23dd-485d-9b08-86eff7658309"),
        "image_url": "/images/gallery-1.jpg",
        "caption": "Sterile Surgical Suite",
        "display_order": 0,
        "is_active": True,
    },
    {
        "id": UUID("322638e1-1da5-4ca3-9940-f0f44ca52135"),
        "image_url": "/images/gallery-2.jpg",
        "caption": "Diagnostic & Preventive Station",
        "display_order": 1,
        "is_active": True,
    },
    {
        "id": UUID("99fea054-723e-44be-8b16-dd1bf54bedaa"),
        "image_url": "/images/gallery-3.jpg",
        "caption": "Endodontic Microsurgery Suite",
        "display_order": 2,
        "is_active": True,
    },
    {
        "id": UUID("050644c6-2333-4365-a4dc-a8a0cc307f52"),
        "image_url": "/images/gallery-4.jpg",
        "caption": "Patient Comfort & Smile Lounge",
        "display_order": 3,
        "is_active": True,
    },
]

REVIEWS = [
    {
        "id": UUID("8a1e2f3d-4c5b-6a78-9012-3456789abcde"),
        "author_name": "Ayesha R.",
        "rating": 5,
        "review_text": "Dr. Hira and her clinical team provided exceptional care during my root canal treatment. Completely pain-free, modern sterile operatory, and wonderful bedside manner.",
        "review_date": date(2026, 3, 15),
        "source_label": "Google Review",
        "display_order": 0,
        "is_published": True,
    },
    {
        "id": UUID("9b2f3a4e-5d6c-7b89-0123-456789abcdef"),
        "author_name": "Usman K.",
        "rating": 5,
        "review_text": "Outstanding dental implant experience. The diagnostic imaging and clear explanation before the procedure gave me full confidence. Highly recommended facility in Soan Garden.",
        "review_date": date(2026, 4, 2),
        "source_label": "Google Review",
        "display_order": 1,
        "is_published": True,
    },
    {
        "id": UUID("ac3a4b5f-6e7d-8c90-1234-56789abcdef0"),
        "author_name": "Fatima S.",
        "rating": 5,
        "review_text": "The entire team is polite, punctual, and remarkably gentle. My children actually look forward to their dental checkups now. Truly a five-star dental practice!",
        "review_date": date(2026, 5, 18),
        "source_label": "Google Review",
        "display_order": 2,
        "is_published": True,
    },
]

# ---------------------------------------------------------------------------
# File Synchronization Helper
# ---------------------------------------------------------------------------

def sync_assets(dry_run: bool = False):
    """
    Copies photos from source folders to backend/uploads/ and frontend/public/images/.
    """
    repo_root = BACKEND_DIR.parent
    photos_src_dirs = [
        repo_root / "_scratch" / "photos_src" / "uploads_backup",
        repo_root / "_scratch" / "photos_src",
        BACKEND_DIR / "uploads",
    ]
    uploads_target = BACKEND_DIR / "uploads"
    frontend_images_target = repo_root / "frontend" / "public" / "images"

    if not dry_run:
        uploads_target.mkdir(parents=True, exist_ok=True)
        frontend_images_target.mkdir(parents=True, exist_ok=True)

    copied_uploads = 0
    copied_frontend = 0

    # Ensure upload images exist
    for doc in DOCTORS:
        fname = doc["photo_url"].replace("/media/", "")
        target_path = uploads_target / fname
        if not target_path.exists():
            for src_dir in photos_src_dirs:
                src_file = src_dir / fname
                if src_file.exists():
                    if not dry_run:
                        shutil.copy2(src_file, target_path)
                    copied_uploads += 1
                    break

    for loc in BRANCHES:
        if loc.get("image_url"):
            fname = loc["image_url"].replace("/media/", "")
            target_path = uploads_target / fname
            if not target_path.exists():
                for src_dir in photos_src_dirs:
                    src_file = src_dir / fname
                    if src_file.exists():
                        if not dry_run:
                            shutil.copy2(src_file, target_path)
                        copied_uploads += 1
                        break

    # Ensure frontend public images exist
    for gal in GALLERY:
        fname = gal["image_url"].replace("/images/", "")
        target_path = frontend_images_target / fname
        if not target_path.exists():
            for src_dir in photos_src_dirs:
                src_file = src_dir / fname
                if src_file.exists():
                    if not dry_run:
                        shutil.copy2(src_file, target_path)
                    copied_frontend += 1
                    break

    print(f"Asset check: {copied_uploads} uploads and {copied_frontend} public images verified/synced.")


# ---------------------------------------------------------------------------
# Main Seed Logic
# ---------------------------------------------------------------------------

async def seed_database(database_name: str | None = None, dry_run: bool = False):
    load_dotenv(BACKEND_DIR / ".env")
    base_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5433/dental_dev")

    if database_name:
        db_url = base_url.rsplit("/", 1)[0] + "/" + database_name
        current_db = database_name
    else:
        current_db = base_url.rsplit("/", 1)[-1].split("?")[0]
        db_url = base_url

    print(f"Connecting to database: {current_db} ({'DRY RUN' if dry_run else 'LIVE'})...")
    sync_assets(dry_run=dry_run)

    engine = create_async_engine(db_url, echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # 1. Organization
        org_result = await session.execute(select(OrganizationORM).limit(1))
        org = org_result.scalars().first()
        if not org:
            org = OrganizationORM(
                id=UUID("979fed75-864a-44d8-b868-592ddf9cb862"),
                name="Dr. Hira's Dental Care",
                display_name="Dr. Hira's Dental Care",
                tagline="Precision & Compassion in Modern Dentistry",
                description="Comprehensive multi-specialty dental practice providing gentle, world-class dental care across Islamabad, Lahore, and Karachi.",
                contact_email="info@drhirasdentalcare.com",
                contact_phone="+92 051-6102977",
                currency_code="PKR",
                currency_symbol="Rs",
                timezone="Asia/Karachi",
                is_active=True,
            )
            session.add(org)
            await session.flush()
        org_id = org.id

        # 2. Branches: Locations and Clinics
        loc_count = 0
        primary_loc_id = None

        for b_data in BRANCHES:
            # Check for existing primary location or by id/city
            if b_data["is_primary"]:
                loc = (await session.execute(select(LocationORM).where(LocationORM.is_primary == True))).scalars().first()
            else:
                loc = (await session.execute(select(LocationORM).where(LocationORM.id == b_data["id"]))).scalars().first()

            if not loc:
                loc = (await session.execute(select(LocationORM).where(LocationORM.city.ilike(b_data["city"])))).scalars().first()

            if not loc:
                loc = LocationORM(
                    id=b_data["id"],
                    organization_id=org_id,
                    name=b_data["name"],
                    address_line1=b_data["address_line1"],
                    address_line2=b_data["address_line2"],
                    city=b_data["city"],
                    state=b_data["state"],
                    postal_code=b_data["postal_code"],
                    country=b_data["country"],
                    phone=b_data["phone"],
                    email=b_data["email"],
                    hours_info=b_data["hours_info"],
                    image_url=b_data["image_url"],
                    is_primary=b_data["is_primary"],
                    is_active=b_data["is_active"],
                    display_order=b_data["display_order"],
                )
                session.add(loc)
            else:
                loc.name = b_data["name"]
                loc.address_line1 = b_data["address_line1"]
                loc.city = b_data["city"]
                loc.state = b_data["state"]
                loc.postal_code = b_data["postal_code"]
                loc.phone = b_data["phone"]
                loc.email = b_data["email"]
                loc.hours_info = b_data["hours_info"]
                loc.image_url = b_data["image_url"]
                loc.is_primary = b_data["is_primary"]
                loc.is_active = b_data["is_active"]
                loc.display_order = b_data["display_order"]

            if b_data["is_primary"]:
                primary_loc_id = loc.id

            # Upsert ClinicORM (used by availability engine & multi-clinic schedule)
            clinic = (await session.execute(select(ClinicORM).where(ClinicORM.id == loc.id))).scalars().first()
            if not clinic:
                clinic = ClinicORM(
                    id=loc.id,
                    organization_id=org_id,
                    name=b_data["name"],
                    address_line1=b_data["address_line1"],
                    address_line2=b_data["address_line2"],
                    city=b_data["city"],
                    state=b_data["state"],
                    postal_code=b_data["postal_code"],
                    country=b_data["country"],
                    phone=b_data["phone"],
                    email=b_data["email"],
                    hours_info=b_data["hours_info"],
                    image_url=b_data["image_url"],
                    is_primary=b_data["is_primary"],
                    is_active=b_data["is_active"],
                    display_order=b_data["display_order"],
                )
                session.add(clinic)
            else:
                clinic.name = b_data["name"]
                clinic.address_line1 = b_data["address_line1"]
                clinic.city = b_data["city"]
                clinic.state = b_data["state"]
                clinic.postal_code = b_data["postal_code"]
                clinic.phone = b_data["phone"]
                clinic.email = b_data["email"]
                clinic.hours_info = b_data["hours_info"]
                clinic.image_url = b_data["image_url"]
                clinic.is_primary = b_data["is_primary"]
                clinic.is_active = b_data["is_active"]
                clinic.display_order = b_data["display_order"]

            # Sync working hours for this clinic
            existing_hours = (
                await session.execute(select(ClinicWorkingHoursORM).where(ClinicWorkingHoursORM.clinic_id == loc.id))
            ).scalars().all()
            if len(existing_hours) < 7:
                for day in range(7):
                    is_sunday = day == 6
                    wh = ClinicWorkingHoursORM(
                        id=uuid4(),
                        clinic_id=loc.id,
                        day_of_week=day,
                        open_time="09:00:00" if not is_sunday else "11:00:00",
                        close_time="21:00:00" if not is_sunday else "18:00:00",
                        is_closed=False if b_data["city"] == "Islamabad" and b_data["is_primary"] else (is_sunday and b_data["city"] != "Islamabad"),
                    )
                    session.add(wh)

            loc_count += 1

        # Flush locations and clinics before inserting team members referencing them
        await session.flush()

        # 3. Doctors: TeamMemberORM
        doc_count = 0
        PRIMARY_DEFAULT_UUID = UUID("96fffc52-d9c2-4115-af5d-13705c74e02a")

        for d_data in DOCTORS:
            target_loc_id = primary_loc_id if (d_data["location_id"] == PRIMARY_DEFAULT_UUID and primary_loc_id) else d_data["location_id"]

            tm = (await session.execute(select(TeamMemberORM).where(TeamMemberORM.id == d_data["id"]))).scalars().first()
            if not tm:
                tm = (await session.execute(select(TeamMemberORM).where(TeamMemberORM.display_name == d_data["display_name"]))).scalars().first()

            if not tm:
                tm = TeamMemberORM(
                    id=d_data["id"],
                    organization_id=org_id,
                    location_id=target_loc_id,
                    clinic_id=target_loc_id,
                    first_name=d_data["first_name"],
                    last_name=d_data["last_name"],
                    display_name=d_data["display_name"],
                    professional_title=d_data["professional_title"],
                    role=d_data["role"],
                    specialties_json=d_data["specialties_json"],
                    biography=d_data["biography"],
                    photo_url=d_data["photo_url"],
                    education=d_data["education"],
                    credentials=d_data["credentials"],
                    license_number=d_data["license_number"],
                    license_state="Active",
                    display_order=d_data["display_order"],
                    is_active=d_data["is_active"],
                )
                session.add(tm)
            else:
                tm.location_id = target_loc_id
                tm.clinic_id = target_loc_id
                tm.first_name = d_data["first_name"]
                tm.last_name = d_data["last_name"]
                tm.display_name = d_data["display_name"]
                tm.professional_title = d_data["professional_title"]
                tm.role = d_data["role"]
                tm.specialties_json = d_data["specialties_json"]
                tm.biography = d_data["biography"]
                tm.photo_url = d_data["photo_url"]
                tm.education = d_data["education"]
                tm.credentials = d_data["credentials"]
                tm.license_number = d_data["license_number"]
                tm.display_order = d_data["display_order"]
                tm.is_active = d_data["is_active"]

            doc_count += 1

        # Deactivate any legacy dummy doctors so only the 18 real DHDC doctors are active
        await session.execute(
            text("UPDATE team_members SET is_active=false WHERE display_name IN ('Dr. Sarah Marlow', 'Dr. Elena Rostova', 'Dr. Marcus Vance')")
        )

        await session.flush()

        # 4. Gallery Images: GalleryImageORM
        gal_count = 0
        for g_data in GALLERY:
            gal = (await session.execute(select(GalleryImageORM).where(GalleryImageORM.caption == g_data["caption"]))).scalars().first()
            if not gal:
                gal = GalleryImageORM(**g_data)
                session.add(gal)
            else:
                gal.image_url = g_data["image_url"]
                gal.display_order = g_data["display_order"]
                gal.is_active = g_data["is_active"]
            gal_count += 1

        # 5. Reviews: ReviewORM
        rev_count = 0
        for r_data in REVIEWS:
            rev = (await session.execute(select(ReviewORM).where(ReviewORM.author_name == r_data["author_name"]))).scalars().first()
            if not rev:
                rev = ReviewORM(**r_data)
                session.add(rev)
            else:
                rev.rating = r_data["rating"]
                rev.review_text = r_data["review_text"]
                rev.review_date = r_data["review_date"]
                rev.source_label = r_data["source_label"]
                rev.display_order = r_data["display_order"]
                rev.is_published = r_data["is_published"]
            rev_count += 1

        if dry_run:
            await session.rollback()
            print(f"[DRY RUN] Would seed: {doc_count} doctors, {loc_count} branches, {gal_count} gallery images, {rev_count} reviews in {current_db}.")
        else:
            await session.commit()
            print(f"{doc_count} doctors, {loc_count} branches, {gal_count} gallery images, {rev_count} reviews created/updated in {current_db}.")

    await engine.dispose()


def main():
    parser = argparse.ArgumentParser(description="Seed demo data for DHDC")
    parser.add_argument("--database", type=str, default=None, help="Database name to seed (e.g. dental_dev, marlow_test)")
    parser.add_argument("--dry-run", action="store_true", help="Preview seed without modifying the database")
    args = parser.parse_args()

    asyncio.run(seed_database(database_name=args.database, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
