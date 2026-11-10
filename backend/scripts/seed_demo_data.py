"""
Seed demo data for Dr. Hira's Dental Care / Hira Dental Clinic (DHDC).
Populates 18 doctors, 4 branches, working hours, 6 services, branch offerings,
doctor authorizations, provider availability, synthetic patients, demo bookings,
CMS general branding, gallery images, and patient reviews.

Deterministic, fully idempotent, and safe to execute repeatedly across teammate environments.
Supports --dry-run and --database=NAME flags.
"""

import argparse
import asyncio
import json
import os
import shutil
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import hash_password
from app.infrastructure.database.orm_models import (
    BookingFlowSettingsORM,
    BookingORM,
    ClinicBookingSettingsORM,
    ClinicORM,
    ClinicServiceORM,
    ClinicWorkingHoursORM,
    GalleryImageORM,
    LeadORM,
    LocationORM,
    MessageORM,
    OrganizationORM,
    PatientMedicalAlertORM,
    PatientORM,
    ProviderAvailabilityORM,
    ReviewORM,
    RoleORM,
    ServiceORM,
    ServiceProviderORM,
    SiteSectionORM,
    TaskORM,
    TeamMemberClinicORM,
    TeamMemberORM,
    UserORM,
)

# ---------------------------------------------------------------------------
# Data Definitions
# ---------------------------------------------------------------------------

ROLE_SEEDS = [
    ("Doctor", "Doctor", "Licensed Dental Clinician"),
    ("doctor", "Doctor", "Licensed Dental Clinician"),
    ("Dentist", "Dentist", "General dental care and clinical dentistry"),
    ("General Dentist", "General Dentist", "Comprehensive primary dental examinations and restorative treatments"),
    ("Orthodontist", "Orthodontist", "Alignment of teeth and malocclusion correction"),
    ("Endodontist", "Endodontist", "Root canals and dental pulp therapy"),
    ("Periodontist", "Periodontist", "Gum health, periodontal care, and bone preservation"),
    ("Prosthodontist", "Prosthodontist", "Prosthetics, crowns, bridges, and full smile rehabilitation"),
    ("Pediatric Dentist", "Pediatric Dentist", "Specialized gentle oral healthcare for children"),
    ("Oral Surgeon", "Oral Surgeon", "Oral surgery, wisdom teeth extraction, and corrective jaw therapy"),
    ("Implantologist", "Implantologist", "Dental implant placement and surgical restorations"),
    ("Cosmetic Dentist", "Cosmetic Dentist", "Aesthetic veneers, teeth whitening, and smile design"),
    ("Hygienist", "Hygienist", "Preventative dental hygiene, scale and polish treatments"),
    ("Dental Assistant", "Dental Assistant", "Chairside assisting and clinical patient support"),
    ("Receptionist", "Receptionist", "Patient concierge, scheduling, and front-desk coordination"),
    ("Practice Manager", "Practice Manager", "Clinical operations, administration, and team management"),
]

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
        "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1000&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1000&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1000&q=80",
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
        "biography": "Dr. Hira Saleem is the founder and lead clinician at Dr. Hira\'s Dental Care. With extensive clinical experience in restorative and aesthetic dentistry, she established DHDC to bring modern, gentle, and transparent oral healthcare to patients across Pakistan. She specializes in minimally invasive treatments, smile rejuvenation, and anxious patient care.",
        "photo_url": "https://images.unsplash.com/photo-1594824813598-1e433f48a0ff?auto=format&fit=crop&w=800&q=80",
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
        "photo_url": "https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&w=800&q=80",
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
        "role": "General Dentist",
        "specialties_json": '["General Dentistry", "Root Canal Therapy", "Preventive Care"]',
        "biography": "Dr. Yaser Rasheed leads restorative procedures at the Lahore clinic. He has dedicated over a decade to pain-free endodontics and single-visit restorations.",
        "photo_url": "https://images.unsplash.com/photo-1612349317150-f437f4d47221?auto=format&fit=crop&w=800&q=80",
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
        "photo_url": "https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?auto=format&fit=crop&w=800&q=80",
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
        "professional_title": "Restorative Specialist",
        "role": "General Dentist",
        "specialties_json": '["Restorative Dentistry", "Inlays & Onlays", "Biomimetic Fillings"]',
        "biography": "Dr. Sarah John brings biomimetic dentistry principles to DHDC F-7, preserving healthy tooth structure through advanced adhesive restorations.",
        "photo_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80",
        "education": "BDS, Dow University of Health Sciences",
        "credentials": "BDS, Dip Restorative Dent",
        "license_number": "PMDC-53401-J",
        "display_order": 5,
        "is_active": True,
    },
    {
        "id": UUID("8e2023bf-32c0-4355-827c-3b2d1dca0435"),
        "location_id": UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"),
        "first_name": "Dr. Emily",
        "last_name": "White",
        "display_name": "Dr. Emily White",
        "professional_title": "Pediatric Dentist",
        "role": "Pediatric Dentist",
        "specialties_json": '["Pediatric Dentistry", "Child Dental Psychology", "Preventive Sealants", "Space Maintainers"]',
        "biography": "Dr. Emily White creates a cheerful, fear-free environment for children. Certified in behavior guidance, she treats infants through teenagers.",
        "photo_url": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=800&q=80",
        "education": "BDS, University of Birmingham; MS Pediatric Dentistry",
        "credentials": "BDS, MS (Pediatric Dent)",
        "license_number": "PMDC-49820-W",
        "display_order": 6,
        "is_active": True,
    },
    {
        "id": UUID("09d5c414-b143-469b-86ea-d961cf3a6ddc"),
        "location_id": UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"),
        "first_name": "Dr. Michael",
        "last_name": "Brown",
        "display_name": "Dr. Michael Brown",
        "professional_title": "Oral & Maxillofacial Surgeon",
        "role": "Oral Surgeon",
        "specialties_json": '["Oral Surgery", "Wisdom Teeth Extraction", "Bone Grafting", "Dental Implants"]',
        "biography": "Dr. Michael Brown has completed over 3,000 surgical extractions and implant procedures with modern sedation and microsurgical protocols.",
        "photo_url": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=800&q=80",
        "education": "BDS, FCPS (Oral & Maxillofacial Surgery)",
        "credentials": "BDS, FCPS",
        "license_number": "PMDC-38419-B",
        "display_order": 7,
        "is_active": True,
    },
    {
        "id": UUID("66657905-23c3-42e8-9aa9-e93540ebf59c"),
        "location_id": UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"),
        "first_name": "Dr. Jessica",
        "last_name": "Green",
        "display_name": "Dr. Jessica Green",
        "professional_title": "Consultant Periodontist",
        "role": "Periodontist",
        "specialties_json": '["Periodontics", "Gum Grafting", "Laser Periodontal Therapy", "Regenerative Procedures"]',
        "biography": "Dr. Jessica Green specializes in treating periodontal diseases and soft tissue aesthetic contouring using laser protocols.",
        "photo_url": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80",
        "education": "BDS, King\'s College London; MClinDent in Periodontology",
        "credentials": "BDS, MClinDent (Periodontology)",
        "license_number": "PMDC-55201-G",
        "display_order": 8,
        "is_active": True,
    },
    {
        "id": UUID("9ebf04f0-bc37-4d10-8b4e-4f0562e873a7"),
        "location_id": UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"),
        "first_name": "Dr. David",
        "last_name": "Black",
        "display_name": "Dr. David Black",
        "professional_title": "Endodontic Specialist",
        "role": "Endodontist",
        "specialties_json": '["Microscopic Endodontics", "Root Canal Retreatment", "Apicoectomy", "Dental Trauma"]',
        "biography": "Dr. David Black utilizes high-magnification surgical operating microscopes for endodontic therapies, ensuring precision and tooth preservation.",
        "photo_url": "https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=800&q=80",
        "education": "BDS, Army Medical College; MSc Endodontics",
        "credentials": "BDS, MSc (Endodontics)",
        "license_number": "PMDC-43110-D",
        "display_order": 9,
        "is_active": True,
    },
    {
        "id": UUID("40f2fef4-7db3-4414-8742-0f5ba6ea003d"),
        "location_id": UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"),
        "first_name": "Dr. Laura",
        "last_name": "Wilson",
        "display_name": "Dr. Laura Wilson",
        "professional_title": "Cosmetic Dentist",
        "role": "Cosmetic Dentist",
        "specialties_json": '["Cosmetic Dentistry", "Porcelain Veneers", "Smile Design", "Teeth Whitening"]',
        "biography": "Dr. Laura Wilson is an aesthetic smile designer specializing in porcelain veneers, composite bonding, and comprehensive cosmetic smile transformations.",
        "photo_url": "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=800&q=80",
        "education": "BDS, University of Manchester; AACD Accredited Fellow",
        "credentials": "BDS, Fellow AACD",
        "license_number": "PMDC-57302-W",
        "display_order": 10,
        "is_active": True,
    },
    {
        "id": UUID("2ffad580-b2ba-4299-8dbd-a0680eb5c3ca"),
        "location_id": UUID("7968ba25-db4a-4e11-8e57-af8507823e20"),
        "first_name": "Dr. James",
        "last_name": "Taylor",
        "display_name": "Dr. James Taylor",
        "professional_title": "Senior Implantologist",
        "role": "Implantologist",
        "specialties_json": '["Implantology", "All-on-4 / All-on-6", "Sinus Elevation", "Immediate Loading"]',
        "biography": "Dr. James Taylor leads the implant rehabilitation service at DHDC Karachi. He has placed over 2,500 dental implants using computer-guided 3D navigation.",
        "photo_url": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
        "education": "DDS, University of Melbourne; ICOI Diplomate",
        "credentials": "DDS, Diplomate ICOI",
        "license_number": "PMDC-61294-T",
        "display_order": 11,
        "is_active": True,
    },
    {
        "id": UUID("407945d8-df3b-48aa-b6ce-eec3297a7e8f"),
        "location_id": UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"),
        "first_name": "Dr. Olivia",
        "last_name": "Anderson",
        "display_name": "Dr. Olivia Anderson",
        "professional_title": "Consultant Prosthodontist",
        "role": "Prosthodontist",
        "specialties_json": '["Prosthodontics", "Full Mouth Rehabilitation", "CAD/CAM Zirconia", "TMD Therapy"]',
        "biography": "Dr. Olivia Anderson focuses on full mouth occlusal reconstruction and complex fixed/removable prosthetics using digital CAD/CAM workflows.",
        "photo_url": "https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=800&q=80",
        "education": "BDS, Fatima Jinnah Medical University; FCPS Prosthodontics",
        "credentials": "BDS, FCPS (Prosthodontics)",
        "license_number": "PMDC-46781-A",
        "display_order": 12,
        "is_active": True,
    },
    {
        "id": UUID("a0ecab49-c1c5-433b-8531-294315fcb63b"),
        "location_id": UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"),
        "first_name": "Dr. Daniel",
        "last_name": "Thomas",
        "display_name": "Dr. Daniel Thomas",
        "professional_title": "Dental Hygienist & Prevention Lead",
        "role": "Hygienist",
        "specialties_json": '["Preventive Dentistry", "Ultrasonic Scaling", "Airflow Polishing", "Periodontal Maintenance"]',
        "biography": "Dr. Daniel Thomas leads DHDC\'s preventive prophylaxis protocol, emphasizing patient education and biofilm management.",
        "photo_url": "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80",
        "education": "BSc Dental Hygiene, Cardiff University",
        "credentials": "BSc (Hons) Dental Hygiene",
        "license_number": "PMDC-HYG-3102",
        "display_order": 13,
        "is_active": True,
    },
    {
        "id": UUID("4ce90d2e-4b68-4509-8669-eecfc04d7e8b"),
        "location_id": UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"),
        "first_name": "Dr. Sophia",
        "last_name": "Jackson",
        "display_name": "Dr. Sophia Jackson",
        "professional_title": "Pediatric Dental Associate",
        "role": "Pediatric Dentist",
        "specialties_json": '["Pediatric Dentistry", "Interceptive Orthodontics", "Nitrous Oxide Sedation"]',
        "biography": "Dr. Sophia Jackson provides gentle dental care to pediatric patients, specializing in conscious sedation and interceptive orthodontics.",
        "photo_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
        "education": "BDS, Rawalpindi Medical University; Dip Paed Dent",
        "credentials": "BDS, Dip Paed Dent",
        "license_number": "PMDC-58491-J",
        "display_order": 14,
        "is_active": True,
    },
    {
        "id": UUID("ea00445a-c603-4c91-9e8a-028a3f82eb7c"),
        "location_id": UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"),
        "first_name": "Dr. Matthew",
        "last_name": "White",
        "display_name": "Dr. Matthew White",
        "professional_title": "Oral Surgeon",
        "role": "Oral Surgeon",
        "specialties_json": '["Oral Surgery", "Impacted Canine Exposure", "Pre-prosthetic Surgery", "Sedation Dentistry"]',
        "biography": "Dr. Matthew White performs outpatient maxillofacial and dentoalveolar surgery with minimal discomfort and rapid recovery techniques.",
        "photo_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
        "education": "BDS, University of Glasgow; MFDS RCPS",
        "credentials": "BDS, MFDS RCPS (Glasgow)",
        "license_number": "PMDC-51203-W",
        "display_order": 15,
        "is_active": True,
    },
    {
        "id": UUID("c413b5d3-82ef-4e3d-82d6-ee1129b1eb8b"),
        "location_id": UUID("7968ba25-db4a-4e11-8e57-af8507823e20"),
        "first_name": "Dr. Chloe",
        "last_name": "Harris",
        "display_name": "Dr. Chloe Harris",
        "professional_title": "Cosmetic Dentist",
        "role": "Cosmetic Dentist",
        "specialties_json": '["Aesthetic Dentistry", "Composite Edge Bonding", "Internal Bleaching", "Laser Gingivoplasty"]',
        "biography": "Dr. Chloe Harris is an advocate of non-destructive cosmetic smile enhancements including composite edge bonding and laser gum contouring.",
        "photo_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80",
        "education": "BDS, Trinity College Dublin",
        "credentials": "BDS (NUI)",
        "license_number": "PMDC-59012-H",
        "display_order": 16,
        "is_active": True,
    },
    {
        "id": UUID("a8fc647f-f7d4-42b7-a37a-42981ce818c3"),
        "location_id": UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"),
        "first_name": "Dr. Alexander",
        "last_name": "Martin",
        "display_name": "Dr. Alexander Martin",
        "professional_title": "Periodontal Surgeon",
        "role": "Periodontist",
        "specialties_json": '["Periodontal Surgery", "Peri-implantitis Management", "Guided Tissue Regeneration"]',
        "biography": "Dr. Alexander Martin focuses on complex periodontal reconstructive surgeries and treating advanced peri-implant diseases.",
        "photo_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
        "education": "BDS, University of Sheffield; MClinDent Periodontology",
        "credentials": "BDS, MClinDent",
        "license_number": "PMDC-47890-M",
        "display_order": 17,
        "is_active": True,
    },
    {
        "id": UUID("c53c4424-6f8d-4a11-b062-8179fb3d395a"),
        "location_id": UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"),
        "first_name": "Dr. Mia",
        "last_name": "Thompson",
        "display_name": "Dr. Mia Thompson",
        "professional_title": "Endodontic Specialist",
        "role": "Endodontist",
        "specialties_json": '["Endodontics", "Complex Anatomy Navigation", "Calcified Canals", "Endodontic Microsurgery"]',
        "biography": "Dr. Mia Thompson brings meticulous microsurgical expertise to the Lahore branch, successfully treating calcified canals and failed endodontic cases.",
        "photo_url": "https://images.unsplash.com/photo-1594824813598-1e433f48a0ff?auto=format&fit=crop&w=800&q=80",
        "education": "BDS, de\'Montmorency College of Dentistry; FCPS Endodontics",
        "credentials": "BDS, FCPS",
        "license_number": "PMDC-54129-T",
        "display_order": 18,
        "is_active": True,
    },
]

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
        "image_url": "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80",
    },
    {
        "slug": "root-canals",
        "category": "restorative",
        "title": "Gentle Endodontics (Root Canals)",
        "short_desc": "Rotary canal instrumentation performed with local anesthesia to eliminate acute nerve pain.",
        "full_desc": "Modern root canals relieve pain rather than causing it. Our doctors handle root canal therapy in a quiet environment with profound anesthesia so you feel only light vibration.",
        "duration": "75 to 90 min",
        "cash_price": "from 680",
        "code": "CDT D3330",
        "insurance_note": None,
        "recommended_interval": "Emergency or pulpitis diagnosis",
        "display_order": 2,
        "is_highlighted": False,
        "image_url": "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=800&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=800&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80",
    },
]

GALLERY = [
    {
        "id": UUID("f1a0e38a-3677-449e-b873-195c65a0b5a1"),
        "caption": "Sterile Surgical Suite",
        "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
        "display_order": 1,
        "is_active": True,
    },
    {
        "id": UUID("f2b1f49b-4788-55af-c984-2a6d76b1c6b2"),
        "caption": "Advanced Radiography & Consultation",
        "image_url": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80",
        "display_order": 2,
        "is_active": True,
    },
    {
        "id": UUID("f3c2a5ac-5899-66ba-da95-3b7e87c2d7c3"),
        "caption": "Diagnostic & Preventive Station",
        "image_url": "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=1200&q=80",
        "display_order": 3,
        "is_active": True,
    },
    {
        "id": UUID("f4d3b6bd-69aa-77cb-eb06-4c8f98d3e8d4"),
        "caption": "General & Cosmetic Treatment Room",
        "image_url": "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=1200&q=80",
        "display_order": 4,
        "is_active": True,
    },
    {
        "id": UUID("f5e4c7ce-7abb-88dc-fc17-5d90a9e4f9e5"),
        "caption": "Patient Comfort & Smile Lounge",
        "image_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1400&q=80",
        "display_order": 5,
        "is_active": True,
    },
]

REVIEWS = [
    {
        "id": UUID("e1a0b1c2-1111-4444-8888-000000000001"),
        "author_name": "Amina Tariq",
        "rating": 5,
        "review_text": "Dr. Hira and her entire team made my dental visit so calm and painless. From the initial 3D scan to the gentle filling procedure, I felt completely respected and informed. Truly the best dental experience in Islamabad!",
        "review_date": date(2025, 11, 14),
        "source_label": "Google Review",
        "display_order": 1,
        "is_published": True,
    },
    {
        "id": UUID("e2a0b1c2-2222-4444-8888-000000000002"),
        "author_name": "Bilal Ahmed Khan",
        "rating": 5,
        "review_text": "Had an acute toothache over the weekend and DHDC accommodated me via emergency triage within hours. The transparency around cost and treatment steps gave me immense peace of mind.",
        "review_date": date(2025, 12, 2),
        "source_label": "Verified Patient",
        "display_order": 2,
        "is_published": True,
    },
    {
        "id": UUID("e3a0b1c2-3333-4444-8888-000000000003"),
        "author_name": "Zainab Malik",
        "rating": 5,
        "review_text": "Completed my Invisalign treatment across 10 months with Dr. Carlos Novakowski. My smile has never looked better, and every branch visit in F-7 was on schedule and seamless.",
        "review_date": date(2026, 1, 18),
        "source_label": "Google Review",
        "display_order": 3,
        "is_published": True,
    },
]

# ---------------------------------------------------------------------------
# Media Asset Sync Logic
# ---------------------------------------------------------------------------

def sync_all_assets(dry_run: bool = False):
    """
    Ensure all tracked seed media files in backend/seed_data/uploads are synchronized
    into backend/uploads and frontend/public/images so all avatars, logos, and gallery
    images resolve immediately without any broken image links.
    """
    repo_root = BACKEND_DIR.parent
    seed_uploads_dir = BACKEND_DIR / "seed_data" / "uploads"
    uploads_target = BACKEND_DIR / "uploads"
    frontend_images_target = repo_root / "frontend" / "public" / "images"

    fallback_src_dirs = [
        seed_uploads_dir,
        repo_root / "_scratch" / "photos_src" / "uploads_backup",
        repo_root / "_scratch" / "photos_src",
        uploads_target,
    ]

    if not dry_run:
        uploads_target.mkdir(parents=True, exist_ok=True)
        frontend_images_target.mkdir(parents=True, exist_ok=True)

    copied_uploads = 0
    copied_frontend = 0

    # 1. Sync seed_data/uploads into backend/uploads
    if seed_uploads_dir.exists():
        for src in seed_uploads_dir.glob("*"):
            if src.is_file():
                dest = uploads_target / src.name
                if not dest.exists():
                    if not dry_run:
                        shutil.copy2(src, dest)
                    copied_uploads += 1

    # 2. Sync doctor photos into backend/uploads if missing (only local /media/ files)
    for doc in DOCTORS:
        purl = doc.get("photo_url", "")
        if purl.startswith("/media/"):
            fname = purl.replace("/media/", "")
            dest = uploads_target / fname
            if not dest.exists():
                for src_dir in fallback_src_dirs:
                    src_file = src_dir / fname
                    if src_file.exists():
                        if not dry_run:
                            shutil.copy2(src_file, dest)
                        copied_uploads += 1
                        break

    # 3. Sync branch images into backend/uploads if missing (only local /media/ files)
    for b in BRANCHES:
        iurl = b.get("image_url", "")
        if iurl.startswith("/media/"):
            fname = iurl.replace("/media/", "")
            dest = uploads_target / fname
            if not dest.exists():
                for src_dir in fallback_src_dirs:
                    src_file = src_dir / fname
                    if src_file.exists():
                        if not dry_run:
                            shutil.copy2(src_file, dest)
                        copied_uploads += 1
                        break

    # 4. Sync gallery images into frontend/public/images (only local /images/ files)
    for gal in GALLERY:
        gurl = gal.get("image_url", "")
        if gurl.startswith("/images/"):
            fname = gurl.replace("/images/", "")
            dest = frontend_images_target / fname
            if not dest.exists():
                for src_dir in fallback_src_dirs:
                    src_file = src_dir / fname
                    if src_file.exists():
                        if not dry_run:
                            shutil.copy2(src_file, dest)
                        copied_frontend += 1
                        break

    total_uploads = len(list(uploads_target.glob("*"))) if uploads_target.exists() else 0
    print(f"[ASSETS] Verified seed media: +{copied_uploads} uploads copied (+{copied_frontend} public images). Total in uploads/: {total_uploads}")


# ---------------------------------------------------------------------------
# Main Seed Logic
# ---------------------------------------------------------------------------

async def seed_database(database_name: Optional[str] = None, dry_run: bool = False):
    load_dotenv(BACKEND_DIR / ".env")
    base_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5433/dental_dev")

    if database_name:
        db_url = base_url.rsplit("/", 1)[0] + "/" + database_name
        current_db = database_name
    else:
        current_db = base_url.rsplit("/", 1)[-1].split("?")[0]
        db_url = base_url

    print(f"Connecting to database: {current_db} ({'DRY RUN' if dry_run else 'LIVE'})...")
    sync_all_assets(dry_run=dry_run)

    engine = create_async_engine(db_url, echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # 1. Organization
        org_result = await session.execute(select(OrganizationORM).limit(1))
        org = org_result.scalars().first()
        if not org:
            org = OrganizationORM(
                id=UUID("979fed75-864a-44d8-b868-592ddf9cb862"),
                name="Hira Dental Clinic",
                display_name="Hira Dental Clinic",
                tagline="Precision & Compassion in Modern Dentistry",
                description="Comprehensive multi-specialty dental practice providing gentle, world-class dental care across Islamabad, Lahore, and Karachi.",
                logo_url="/media/8d90adff4feb4e8db41f532aa3d630f1.png",
                contact_email="care@hiradental.com",
                contact_phone="051-6102977",
                primary_color="#1F3D34",
                secondary_color="#B8935A",
                currency_code="PKR",
                currency_symbol="Rs",
                timezone="Asia/Karachi",
                is_active=True,
            )
            session.add(org)
            await session.flush()
        else:
            org.name = "Hira Dental Clinic"
            org.display_name = "Hira Dental Clinic"
            org.logo_url = org.logo_url or "/media/8d90adff4feb4e8db41f532aa3d630f1.png"
            if not org.primary_color:
                org.primary_color = "#1F3D34"
            if not org.secondary_color:
                org.secondary_color = "#B8935A"
        org_id = org.id

        # 1b. SiteSection initialization from CMS DEFAULT_SECTIONS
        from app.application.services.cms_service import DEFAULT_SECTIONS

        for s_key, s_defaults in DEFAULT_SECTIONS.items():
            sec_res = await session.execute(select(SiteSectionORM).where(SiteSectionORM.section_key == s_key))
            sec = sec_res.scalars().first()
            if not sec:
                session.add(SiteSectionORM(
                    section_key=s_key,
                    content_json=json.dumps(s_defaults),
                    updated_at=datetime.now(timezone.utc),
                ))
            else:
                try:
                    curr = json.loads(sec.content_json) if isinstance(sec.content_json, str) else dict(sec.content_json)
                except Exception:
                    curr = {}
                # Fill any missing keys from defaults without overwriting existing non-empty values
                for k, v in s_defaults.items():
                    if k not in curr or curr[k] is None or curr[k] == "" or (isinstance(curr[k], list) and len(curr[k]) == 0 and len(v) > 0):
                        curr[k] = v
                sec.content_json = json.dumps(curr)

        # 2. Roles: RoleORM
        role_seed_count = 0
        for r_name, r_disp, r_desc in ROLE_SEEDS:
            r_obj = (await session.execute(select(RoleORM).where(RoleORM.name == r_name))).scalars().first()
            if not r_obj:
                session.add(RoleORM(
                    id=uuid4(),
                    name=r_name,
                    display_name=r_disp,
                    description=r_desc,
                    is_active=True,
                    display_order=role_seed_count,
                ))
                role_seed_count += 1
            else:
                r_obj.is_active = True
        await session.flush()

        # 3. Branches: Locations, Clinics, Working Hours, and Booking Settings
        primary_loc_id = None
        loc_count = 0
        for b_data in BRANCHES:
            loc = (await session.execute(select(LocationORM).where(LocationORM.id == b_data["id"]))).scalars().first()
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

            cln = (await session.execute(select(ClinicORM).where(ClinicORM.id == b_data["id"]))).scalars().first()
            if not cln:
                cln = ClinicORM(
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
                session.add(cln)
            else:
                cln.name = b_data["name"]
                cln.address_line1 = b_data["address_line1"]
                cln.city = b_data["city"]
                cln.state = b_data["state"]
                cln.postal_code = b_data["postal_code"]
                cln.phone = b_data["phone"]
                cln.email = b_data["email"]
                cln.image_url = b_data["image_url"]
                cln.is_primary = b_data["is_primary"]
                cln.is_active = b_data["is_active"]
                cln.display_order = b_data["display_order"]

            # Working Hours (7 days)
            ex_wh = (await session.execute(select(ClinicWorkingHoursORM).where(ClinicWorkingHoursORM.clinic_id == b_data["id"]))).scalars().all()
            if len(ex_wh) < 7:
                for day in range(7):
                    is_sun = (day == 6)
                    wh = ClinicWorkingHoursORM(
                        id=uuid4(),
                        clinic_id=b_data["id"],
                        day_of_week=day,
                        open_time="09:00:00" if not is_sun else "11:00:00",
                        close_time="21:00:00" if not is_sun else "18:00:00",
                        is_closed=False if b_data["city"] == "Islamabad" and b_data["is_primary"] else (is_sun and b_data["city"] != "Islamabad"),
                    )
                    session.add(wh)

            # Clinic Booking Settings
            cbs = (await session.execute(select(ClinicBookingSettingsORM).where(ClinicBookingSettingsORM.clinic_id == b_data["id"]))).scalars().first()
            if not cbs:
                session.add(ClinicBookingSettingsORM(
                    clinic_id=b_data["id"],
                    booking_mode="open",
                    advance_booking_days=60,
                    min_lead_time_hours=2,
                    slot_interval_minutes=15,
                ))
            loc_count += 1

        await session.flush()

        # 4. Doctors: TeamMemberORM (18 active DHDC doctors)
        doc_count = 0
        PRIMARY_DEFAULT_UUID = UUID("96fffc52-d9c2-4115-af5d-13705c74e02a")
        for d_data in DOCTORS:
            t_loc = primary_loc_id if (d_data["location_id"] == PRIMARY_DEFAULT_UUID and primary_loc_id) else d_data["location_id"]
            tm = (await session.execute(select(TeamMemberORM).where(TeamMemberORM.id == d_data["id"]))).scalars().first()
            if not tm:
                tm = (await session.execute(select(TeamMemberORM).where(TeamMemberORM.display_name == d_data["display_name"]))).scalars().first()

            if not tm:
                tm = TeamMemberORM(
                    id=d_data["id"],
                    organization_id=org_id,
                    location_id=t_loc,
                    clinic_id=t_loc,
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
                tm.location_id = t_loc
                tm.clinic_id = t_loc
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

        # Deactivate any legacy demo doctor names
        await session.execute(
            text("UPDATE team_members SET is_active=false WHERE display_name IN ('Dr. Sarah Marlow', 'Dr. Elena Rostova', 'Dr. Marcus Vance')")
        )
        await session.flush()

        # 5. Core Services: ServiceORM
        service_map = {}
        for s_data in INITIAL_SERVICES:
            s_res = await session.execute(select(ServiceORM).where(ServiceORM.slug == s_data["slug"]))
            s_obj = s_res.scalar_one_or_none()
            if not s_obj:
                s_obj = ServiceORM(
                    slug=s_data["slug"],
                    category=s_data["category"],
                    title=s_data["title"],
                    short_desc=s_data["short_desc"],
                    full_desc=s_data["full_desc"],
                    duration=s_data["duration"],
                    cash_price=s_data["cash_price"],
                    code=s_data["code"],
                    insurance_note=s_data.get("insurance_note"),
                    recommended_interval=s_data.get("recommended_interval"),
                    display_order=s_data["display_order"],
                    is_highlighted=s_data.get("is_highlighted", False),
                    image_url=s_data.get("image_url"),
                    is_active=True,
                    is_public=True,
                    bookable_online=True,
                )
                session.add(s_obj)
                await session.flush()
            else:
                s_obj.title = s_data["title"]
                s_obj.short_desc = s_data["short_desc"]
                s_obj.full_desc = s_data["full_desc"]
                s_obj.duration = s_data["duration"]
                s_obj.cash_price = s_data["cash_price"]
                s_obj.code = s_data["code"]
                s_obj.image_url = s_data.get("image_url")
                s_obj.is_active = True
                s_obj.is_public = True
                s_obj.bookable_online = True
            service_map[s_data["slug"]] = s_obj

        # 6. Branch Offerings: ClinicServiceORM
        branch_service_slugs = {
            UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"): ["cleanings-exams", "fillings-crowns", "root-canals", "invisalign", "whitening", "emergency"],
            UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"): ["cleanings-exams", "fillings-crowns", "root-canals", "whitening"],
            UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"): ["cleanings-exams", "fillings-crowns", "invisalign", "whitening"],
            UUID("7968ba25-db4a-4e11-8e57-af8507823e20"): ["cleanings-exams", "fillings-crowns", "root-canals", "emergency"],
        }
        for b_id, slugs in branch_service_slugs.items():
            for s_slug in slugs:
                s_obj = service_map.get(s_slug)
                if s_obj:
                    cs_res = await session.execute(
                        select(ClinicServiceORM).where(
                            ClinicServiceORM.clinic_id == b_id,
                            ClinicServiceORM.service_id == s_obj.id,
                        )
                    )
                    if not cs_res.scalar_one_or_none():
                        session.add(ClinicServiceORM(
                            clinic_id=b_id,
                            service_id=s_obj.id,
                        ))

        # 7. Multi-Branch Doctor Assignments: TeamMemberClinicORM
        hira_tm_id = UUID("549cf72e-ecd4-432d-a710-843a9f24aabe")
        carlos_tm_id = UUID("d0897bb6-3ced-44e8-a7fd-efa51af661a7")
        yaser_tm_id = UUID("24769c71-6545-4266-b1de-db400e06e71d")
        meral_tm_id = UUID("c0d1ee69-a91e-4c0e-b6c6-27f8ba314424")

        doctor_branch_map = {
            hira_tm_id: [
                UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"),
                UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"),
                UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"),
            ],
            carlos_tm_id: [
                UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"),
                UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"),
            ],
            yaser_tm_id: [
                UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"),
            ],
            meral_tm_id: [
                UUID("7968ba25-db4a-4e11-8e57-af8507823e20"),
            ],
        }
        for tm_id, b_ids in doctor_branch_map.items():
            for b_id in b_ids:
                tmc_res = await session.execute(
                    select(TeamMemberClinicORM).where(
                        TeamMemberClinicORM.team_member_id == tm_id,
                        TeamMemberClinicORM.clinic_id == b_id,
                    )
                )
                if not tmc_res.scalar_one_or_none():
                    session.add(TeamMemberClinicORM(
                        team_member_id=tm_id,
                        clinic_id=b_id,
                    ))

        # 8. Doctor Service Authorizations: ServiceProviderORM
        doctor_auth_specs = [
            (hira_tm_id, UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"), "cleanings-exams", 45, 10),
            (hira_tm_id, UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"), "fillings-crowns", 60, 15),
            (hira_tm_id, UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"), "root-canals", 75, 15),
            (hira_tm_id, UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"), "cleanings-exams", 45, 10),
            (hira_tm_id, UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"), "fillings-crowns", 60, 15),
            (carlos_tm_id, UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"), "invisalign", 45, 15),
            (carlos_tm_id, UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"), "cleanings-exams", 30, 10),
            (carlos_tm_id, UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"), "invisalign", 45, 15),
            (yaser_tm_id, UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"), "cleanings-exams", 45, 10),
            (yaser_tm_id, UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"), "root-canals", 75, 15),
            (meral_tm_id, UUID("7968ba25-db4a-4e11-8e57-af8507823e20"), "cleanings-exams", 45, 10),
            (meral_tm_id, UUID("7968ba25-db4a-4e11-8e57-af8507823e20"), "fillings-crowns", 60, 10),
        ]
        for tm_id, b_id, s_slug, c_dur, buf in doctor_auth_specs:
            s_obj = service_map.get(s_slug)
            if s_obj:
                sp_res = await session.execute(
                    select(ServiceProviderORM).where(
                        ServiceProviderORM.team_member_id == tm_id,
                        ServiceProviderORM.clinic_id == b_id,
                        ServiceProviderORM.service_id == s_obj.id,
                    )
                )
                sp = sp_res.scalar_one_or_none()
                if not sp:
                    session.add(ServiceProviderORM(
                        team_member_id=tm_id,
                        clinic_id=b_id,
                        service_id=s_obj.id,
                        custom_duration_minutes=c_dur,
                        buffer_minutes=buf,
                        is_active=True,
                    ))
                else:
                    sp.custom_duration_minutes = c_dur
                    sp.buffer_minutes = buf
                    sp.is_active = True

        # 9. Provider Availability: Shifts per clinic
        shift_specs = [
            (hira_tm_id, UUID("96fffc52-d9c2-4115-af5d-13705c74e02a"), [0, 1, 2], "09:00", "17:00", "13:00", "14:00"),
            (hira_tm_id, UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"), [3, 4], "10:00", "18:00", "13:00", "14:00"),
            (carlos_tm_id, UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"), [0, 1, 2, 3, 4], "10:00", "18:00", "13:00", "14:00"),
            (yaser_tm_id, UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"), [0, 1, 2, 3, 4], "09:00", "17:00", "13:00", "14:00"),
            (meral_tm_id, UUID("7968ba25-db4a-4e11-8e57-af8507823e20"), [0, 1, 2, 3, 4], "10:00", "19:00", "14:00", "15:00"),
        ]
        for tm_id, b_id, dows, st, et, bst, bet in shift_specs:
            for dow in dows:
                pa_res = await session.execute(
                    select(ProviderAvailabilityORM).where(
                        ProviderAvailabilityORM.team_member_id == tm_id,
                        ProviderAvailabilityORM.clinic_id == b_id,
                        ProviderAvailabilityORM.day_of_week == dow,
                    )
                )
                pa = pa_res.scalar_one_or_none()
                if not pa:
                    session.add(ProviderAvailabilityORM(
                        team_member_id=tm_id,
                        clinic_id=b_id,
                        day_of_week=dow,
                        start_time=st,
                        end_time=et,
                        break_start_time=bst,
                        break_end_time=bet,
                        is_active=True,
                    ))
                else:
                    pa.start_time = st
                    pa.end_time = et
                    pa.is_active = True

        # 10. Development Users
        admin_pwd = os.environ.get("DEMO_ADMIN_PASSWORD", "AdminDemoPass2026!")
        rec_pwd = os.environ.get("DEMO_RECEPTIONIST_PASSWORD", "RecepDemoPass2026!")
        doc_pwd = os.environ.get("DEMO_DOCTOR_PASSWORD", "DoctorDemoPass2026!")
        hira_pwd = os.environ.get("DEMO_HIRA_PASSWORD", "DoctorDemoPass2026!")

        users_spec = [
            ("admin@hiradental.com", admin_pwd, "Dr. Hira Babar", "admin", primary_loc_id, hira_tm_id),
            ("receptionist@hiradental.com", rec_pwd, "Reception Desk", "receptionist", primary_loc_id, None),
            ("doctor@hiradental.com", doc_pwd, "Dr. Carlos Novakowski", "doctor", UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"), carlos_tm_id),
            ("dr.hira@hiradental.com", hira_pwd, "Dr. Hira Babar", "doctor", primary_loc_id, hira_tm_id),
        ]
        created_users = {}
        for em, pwd, fn, role, cid, tm_id in users_spec:
            u_res = await session.execute(select(UserORM).where(UserORM.email == em))
            u = u_res.scalar_one_or_none()
            if not u:
                u = UserORM(
                    email=em,
                    hashed_password=hash_password(pwd),
                    full_name=fn,
                    role=role,
                    clinic_id=cid,
                    team_member_id=tm_id,
                    is_active=True,
                )
                session.add(u)
                await session.flush()
            else:
                u.full_name = fn
                u.role = role
                u.clinic_id = cid
                u.team_member_id = tm_id
                u.is_active = True
            created_users[em] = u

        # 11. Gallery Images
        gal_count = 0
        for g_data in GALLERY:
            gal = (await session.execute(select(GalleryImageORM).where(GalleryImageORM.caption == g_data["caption"]))).scalars().first()
            if not gal:
                session.add(GalleryImageORM(**g_data))
            else:
                gal.image_url = g_data["image_url"]
                gal.display_order = g_data["display_order"]
                gal.is_active = g_data["is_active"]
            gal_count += 1

        # 12. Reviews
        rev_count = 0
        for r_data in REVIEWS:
            rev = (await session.execute(select(ReviewORM).where(ReviewORM.author_name == r_data["author_name"]))).scalars().first()
            if not rev:
                session.add(ReviewORM(**r_data))
            else:
                rev.rating = r_data["rating"]
                rev.review_text = r_data["review_text"]
                rev.is_published = r_data["is_published"]
            rev_count += 1

        # 13. Synthetic Patients
        patients_spec = [
            ("Leo", "Miller", "+92 300 5550101", "leo.m@example.com", date(2018, 5, 14), "Rachel Miller", "+92 300 5550105", "Mother"),
            ("Eleanor", "Pemberton", "+92 300 5550102", "eleanor.p@example.com", date(1988, 4, 12), None, None, None),
            ("Arthur", "Pendelton", "+92 300 5550103", "arthur.p@example.com", date(1975, 11, 23), None, None, None),
            ("Sophia", "Martinez", "+92 300 5550104", "sophia.m@example.com", date(1994, 7, 5), None, None, None),
            ("David", "Kim", "+92 300 5550105", "david.k@example.com", date(1982, 1, 30), None, None, None),
            ("Clara", "Oswald", "+92 300 5550106", "clara.o@example.com", date(1990, 9, 14), None, None, None),
        ]
        created_pats = []
        for i, (fn, ln, ph, em, dob, gname, gphone, grel) in enumerate(patients_spec):
            p_res = await session.execute(select(PatientORM).where(PatientORM.email == em))
            p = p_res.scalar_one_or_none()
            if not p:
                p = PatientORM(
                    first_name=fn,
                    last_name=ln,
                    phone=ph,
                    email=em,
                    date_of_birth=dob,
                    guardian_name=gname,
                    guardian_phone=gphone,
                    guardian_relationship=grel,
                    file_number=f"HD-{1000 + i}",
                    clinic_id=primary_loc_id,
                    notes="Synthetic patient for local development verification.",
                )
                session.add(p)
                await session.flush()
            created_pats.append(p)

        # 14. Demo Bookings
        today = date.today()
        bookings_spec = [
            ("BK-DEMO-001", created_pats[0], primary_loc_id, hira_tm_id, "cleanings-exams", today, "09:30", "confirmed"),
            ("BK-DEMO-002", created_pats[1], primary_loc_id, hira_tm_id, "fillings-crowns", today, "10:30", "arrived"),
            ("BK-DEMO-003", created_pats[2], UUID("64fa23e9-45b5-4fca-9758-d3d8ea6c08db"), carlos_tm_id, "invisalign", today, "11:00", "in_progress"),
            ("BK-DEMO-004", created_pats[3], primary_loc_id, hira_tm_id, "root-canals", today, "14:00", "completed"),
            ("BK-DEMO-005", created_pats[4], UUID("ead5270f-608f-43ae-a721-1dbcd8c50f24"), yaser_tm_id, "cleanings-exams", today + timedelta(days=1), "10:00", "confirmed"),
        ]
        for ref, pat, cid, tmid, sslug, bdate, btime, status_val in bookings_spec:
            b_res = await session.execute(select(BookingORM).where(BookingORM.confirmation_id == ref))
            if not b_res.scalar_one_or_none():
                session.add(BookingORM(
                    confirmation_id=ref,
                    patient_id=pat.id,
                    clinic_id=cid,
                    team_member_id=tmid,
                    service_id=sslug,
                    preferred_date=bdate,
                    preferred_time=btime,
                    patient_full_name=f"{pat.first_name} {pat.last_name}",
                    patient_phone=pat.phone,
                    phone_normalized=pat.phone.replace(" ", ""),
                    patient_email=pat.email,
                    status=status_val,
                    source="online",
                    notes="Synthetic demonstration booking.",
                ))

        # 15. Booking Flow Settings
        bfs_res = await session.execute(select(BookingFlowSettingsORM).where(BookingFlowSettingsORM.organization_id == org_id))
        bfs = bfs_res.scalar_one_or_none()
        rec_user = created_users.get("receptionist@hiradental.com")
        if not bfs:
            session.add(BookingFlowSettingsORM(
                organization_id=org_id,
                followup_gaps_minutes=[10, 1440, 2880],
                max_attempts=3,
                cold_wait_hours=24,
                hold_minutes=30,
                fallback_owner_user_id=rec_user.id if rec_user else None,
                auto_confirm_online=True,
                days_shown=7,
                show_patients_treated=True,
                lead_capture_notice="We save your details so we can help you finish booking.",
            ))

        await session.flush()

        # Validation: Verify all active doctors have valid roles
        mismatched = await session.execute(text("""
            SELECT tm.display_name, tm.role
            FROM team_members tm
            LEFT JOIN roles r ON tm.role = r.name
            WHERE tm.is_active = true AND r.id IS NULL
        """))
        mismatched_rows = mismatched.fetchall()
        if mismatched_rows:
            raise RuntimeError(f"Seed produced {len(mismatched_rows)} mismatched doctors: {mismatched_rows}")

        if dry_run:
            await session.rollback()
            print(f"[DRY RUN] Would seed: {doc_count} doctors, {loc_count} branches, {len(INITIAL_SERVICES)} services, {gal_count} gallery, {rev_count} reviews into {current_db}.")
        else:
            await session.commit()
            print(f"[SUCCESS] Fully seeded: {doc_count} doctors, {loc_count} branches, {len(INITIAL_SERVICES)} services, {gal_count} gallery, {rev_count} reviews in {current_db}.")

    await engine.dispose()


def main():
    parser = argparse.ArgumentParser(description="Seed demo data for DHDC / Hira Dental Clinic")
    parser.add_argument("--database", type=str, default=None, help="Database name to seed (e.g. dental_dev, marlow_test)")
    parser.add_argument("--dry-run", action="store_true", help="Preview seed without modifying the database")
    args = parser.parse_args()

    asyncio.run(seed_database(database_name=args.database, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
