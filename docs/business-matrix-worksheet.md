# Marlow Dental — Business Matrix & Roles Worksheet

> **READ-ONLY report.** Generated from the live database. No records were
> inserted, updated, or deleted. Use this as a decision worksheet for Phase 3 prep.

_Generated: 2026-11-06 13:53 UTC_
_Database: marlow_test (postgres @ localhost:5433)_

## 1. Current Roles

Total roles: 25

| ID | Name | Display Name | Description | Active |
|----|------|--------------|-------------|--------|
| f0d614ed | admin | Admin | Clinic Practice Administrator | Yes |
| 6ad42411 | Admin | Admin | Clinic Practice Administrator | Yes |
| b2900869 | cleaner | Cleaner | Facility Sanitation Specialist | Yes |
| c44b10e2 | Cleaner | Cleaner | Facility Sanitation Specialist | Yes |
| 9caf0dc2 | doctor | Doctor | Licensed Dental Practitioner | Yes |
| cb832487 | Doctor | Doctor | Licensed Dental Practitioner | Yes |
| ec24d95f | nurse | Nurse | Clinical Dental Nurse / Assistant | Yes |
| 747a0cbd | Nurse | Nurse | Clinical Dental Nurse / Assistant | Yes |
| 5657b638 | pharmacist | Pharmacist | Clinical Pharmacist | Yes |
| 4e457166 | Pharmacist | Pharmacist | Clinical Pharmacist | Yes |
| 4c3c135a | Dentist | Dentist | General dental care and oral health | Yes |
| 9656c596 | Orthodontist | Orthodontist | Alignment of teeth and jaws | Yes |
| a059c928 | Endodontist | Endodontist | Root canals and dental pulp therapy | Yes |
| c34e2155 | Periodontist | Periodontist | Gum diseases and dental implants | Yes |
| 8f134f93 | Prosthodontist | Prosthodontist | Restoration and replacement of teeth | Yes |
| 2ac44023 | Pediatric Dentist | Pediatric Dentist | Dental care for children and adolescents | Yes |
| dc1e9e84 | Oral Surgeon | Oral Surgeon | Surgical treatment of oral cavity and jaw | Yes |
| 7fa5d477 | Implantologist | Implantologist | Dental implants and bone augmentation | Yes |
| 89615cb9 | Cosmetic Dentist | Cosmetic Dentist | Aesthetic and smile enhancement | Yes |
| 750bd1f2 | Hygienist | Hygienist | Preventative cleanings and periodontal hygiene | Yes |
| 5b067fe9 | Dental Assistant | Dental Assistant | Chairside clinical assisting and sterilization | Yes |
| cad33219 | Receptionist | Receptionist | Front desk reception and patient coordination | Yes |
| 4f20e46c | Practice Manager | Practice Manager | Clinic administration and operations management | Yes |
| 5bd62ee7 | Sleep Dentist | Sleep Dentist | Specialized in sleep apnea oral appliances | No |
| 75caf307 | General Dentist | General Dentist | Comprehensive primary dental examinations and restorative treatments | Yes |

**Inactive roles:** Sleep Dentist

## 2. Services Catalog (Active)

Total active services: 6

| ID | Title | Duration |
|----|-------|----------|
| 1e547c51 | Cleanings & Comprehensive Exam | 45 to 60 min |
| 1aec6f4f | Tooth-Colored Fillings & Crowns | 60 to 90 min |
| ef72bb86 | Gentle Endodontics (Root Canals) | 75 to 90 min |
| a222dc57 | Invisalign Clear Aligners | 6 to 15 months |
| 085ae284 | Professional Enamel Whitening | 1 visit or 2 weeks |
| d3d6de0e | Same-Day Emergency Triage | 30 to 45 min |

## 3. Branch Offering Worksheet (Current State)

Rows = active branches (unique branch names). Columns = active services.
✓ = branch offers the service in `clinic_services`; ✗ = it does not.

Total clinic records: 32 | Active: 32 | Unique branches: 7

> **Data note:** 25 active clinic records are duplicates named “Main Lahore Clinic”
> (same name and city, different IDs). They are collapsed into a single row below.
> All “Main Lahore Clinic” records currently offer NO services (✗ across all 6).

| Branch | 1e547c51 | 1aec6f4f | ef72bb86 | a222dc57 | 085ae284 | d3d6de0e |
|--------|--------|--------|--------|--------|--------|--------|
| DHDC Islamabad – Main | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DHDC Main Clinic | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Main Lahore Clinic | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| DHDC Downtown Studio | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| DHDC Lahore – Gulberg | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DHDC Islamabad – F-7 Markaz | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DHDC Karachi – Clifton | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## 4. Doctor Authorization Worksheet (Current State)

All doctors (team members). Primary Branch = `clinics.name` via `team_members.clinic_id`.
Specialty/Role = `team_members.role` (+ `specialties_json`).
Authorized services = rows in `service_providers` for that doctor.

Total doctors/team members listed: 34

| # | Doctor | Primary Branch | Specialty / Role | Authorized Services |
|---|--------|----------------|------------------|---------------------|
| 1 | Dr. Ahmed Raza | DHDC Islamabad – Main | General Dentist · ["Preventive Care", "Composite Fillings", "Teeth Whitening"] | Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |
| 2 | Dr. Alejandro Morah | DHDC Islamabad – Main | Oral Surgeon · ["Oral & Maxillofacial Surgery", "Wisdom Tooth Extractions", "Bone Grafting"] | Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |
| 3 | Dr. Alexander Martin | DHDC Islamabad – Main | Periodontist · ["Periodontal Surgery", "Peri-implantitis Management", "Guided Tissue Regeneration"] | — none — |
| 4 | Dr. Amna Siddiqui | DHDC Islamabad – F-7 Markaz | Orthodontist · ["Orthodontics", "Clear Aligners", "Traditional Braces"] | Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |
| 5 | Dr. Bilal Hussain | DHDC Islamabad – F-7 Markaz | Oral Surgeon · ["Oral Surgery", "Wisdom Tooth Removal", "Implant Placement"] | Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |
| 6 | Dr. Carlos Novakowski | DHDC Islamabad – F-7 Markaz | Orthodontist · ["Orthodontics", "Clear Aligners", "Self-Ligating Braces", "Surgical Orthodontics"] | Cleanings & Comprehensive Exam<br>Invisalign Clear Aligners<br>Invisalign Clear Aligners<br>Cleanings & Comprehensive Exam<br>Invisalign Clear Aligners<br>Same-Day Emergency Triage<br>Gentle Endodontics (Root Canals)<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |
| 7 | Dr. Chloe Harris | DHDC Karachi – Clifton | Cosmetic Dentist · ["Aesthetic Dentistry", "Composite Edge Bonding", "Internal Bleaching", "Laser Gingivoplasty"] | — none — |
| 8 | Dr. Daniel Thomas | DHDC Islamabad – Main | Hygienist · ["Preventive Dentistry", "Ultrasonic Scaling", "Airflow Polishing", "Periodontal Maintenance"] | — none — |
| 9 | Dr. Daniyal Abbas | DHDC Karachi – Clifton | Implantologist · ["Dental Implants", "Bone Grafting", "Full-Arch Restoration"] | Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |
| 10 | Dr. David Black | DHDC Islamabad – Main | Endodontist · ["Microscopic Endodontics", "Root Canal Retreatment", "Apicoectomy", "Dental Trauma"] | — none — |
| 11 | Dr. Elena Rostova | DHDC Downtown Studio | hygienist | Professional Enamel Whitening<br>Gentle Endodontics (Root Canals)<br>Same-Day Emergency Triage<br>Tooth-Colored Fillings & Crowns<br>Invisalign Clear Aligners<br>Cleanings & Comprehensive Exam |
| 12 | Dr. Emily White | DHDC Islamabad – Main | Pediatric Dentist · ["Pediatric Dentistry", "Child Dental Psychology", "Preventive Sealants", "Space Maintainers"] | — none — |
| 13 | Dr. Faraz Ahmed | DHDC Islamabad – F-7 Markaz | General Dentist · ["General Dentistry", "Preventive Care", "Emergency Dentistry"] | Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |
| 14 | Dr. Fatima Khan | DHDC Lahore – Gulberg | Pediatric Dentist · ["Pediatric Dentistry", "Child Preventive Care", "Fluoride Therapy"] | Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |
| 15 | Dr. Hamid Khan | DHDC Lahore – Gulberg | Orthodontist · ["Orthodontics", "Self-Ligating Braces", "Lingual Braces"] | Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |
| 16 | Dr. Hamza Sheikh | DHDC Lahore – Gulberg | Prosthodontist · ["Crowns", "Bridges", "Dentures", "Full Mouth Rehabilitation"] | Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |
| 17 | Dr. Hira Babar | DHDC Main Clinic | dentist | Same-Day Emergency Triage<br>Professional Enamel Whitening<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns |
| 18 | Dr. Hira Saleem, BDS | DHDC Islamabad – Main | Dentist · ["General Dentistry", "Restorative Care", "Cosmetic Dentistry", "Patient-Centric Treatment Planning"] | Tooth-Colored Fillings & Crowns<br>Cleanings & Comprehensive Exam<br>Gentle Endodontics (Root Canals)<br>Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Professional Enamel Whitening<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns |
| 19 | Dr. James Taylor | DHDC Karachi – Clifton | Implantologist · ["Implantology", "All-on-4 / All-on-6", "Sinus Elevation", "Immediate Loading"] | — none — |
| 20 | Dr. Jessica Green | DHDC Lahore – Gulberg | Periodontist · ["Periodontics", "Gum Grafting", "Laser Periodontal Therapy", "Regenerative Procedures"] | — none — |
| 21 | Dr. Laura Wilson | DHDC Islamabad – F-7 Markaz | Cosmetic Dentist · ["Cosmetic Dentistry", "Porcelain Veneers", "Smile Design", "Teeth Whitening"] | — none — |
| 22 | Dr. Marcus Vance | DHDC Main Clinic | dentist | Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Professional Enamel Whitening<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns |
| 23 | Dr. Matthew White | DHDC Lahore – Gulberg | Oral Surgeon · ["Oral Surgery", "Impacted Canine Exposure", "Pre-prosthetic Surgery", "Sedation Dentistry"] | — none — |
| 24 | Dr. Meral Ozki | DHDC Karachi – Clifton | Dentist · ["Clinical Dentistry", "Crowns & Bridges", "Dental Prosthetics"] | Tooth-Colored Fillings & Crowns<br>Cleanings & Comprehensive Exam<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Professional Enamel Whitening |
| 25 | Dr. Mia Thompson | DHDC Lahore – Gulberg | Endodontist · ["Endodontics", "Complex Anatomy Navigation", "Calcified Canals", "Endodontic Microsurgery"] | — none — |
| 26 | Dr. Michael Brown | DHDC Islamabad – Main | Oral Surgeon · ["Oral Surgery", "Wisdom Teeth Extraction", "Bone Grafting", "Dental Implants"] | — none — |
| 27 | Dr. Olivia Anderson | DHDC Lahore – Gulberg | Prosthodontist · ["Prosthodontics", "Full Mouth Rehabilitation", "CAD/CAM Zirconia", "TMD Therapy"] | — none — |
| 28 | Dr. Saad Iqbal | DHDC Islamabad – Main | Cosmetic Dentist · ["Cosmetic Dentistry", "Composite Bonding", "Smile Design"] | Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |
| 29 | Dr. Sana Tariq | DHDC Karachi – Clifton | Cosmetic Dentist · ["Cosmetic Dentistry", "Veneers", "Smile Makeovers"] | Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |
| 30 | Dr. Sarah John | DHDC Islamabad – F-7 Markaz | General Dentist · ["Restorative Dentistry", "Inlays & Onlays", "Biomimetic Fillings"] | Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |
| 31 | Dr. Sophia Jackson | DHDC Islamabad – F-7 Markaz | Pediatric Dentist · ["Pediatric Dentistry", "Interceptive Orthodontics", "Nitrous Oxide Sedation"] | — none — |
| 32 | Dr. Usman Ali | DHDC Islamabad – Main | Periodontist · ["Periodontics", "Gum Surgery", "Deep Cleaning", "Laser Therapy"] | Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |
| 33 | Dr. Yaser Rasheed | DHDC Lahore – Gulberg | General Dentist · ["General Dentistry", "Root Canal Therapy", "Preventive Care"] | Cleanings & Comprehensive Exam<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Gentle Endodontics (Root Canals)<br>Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |
| 34 | Dr. Zain Malik | DHDC Karachi – Clifton | Endodontist · ["Endodontics", "Root Canal Therapy", "Microsurgery"] | Same-Day Emergency Triage<br>Invisalign Clear Aligners<br>Gentle Endodontics (Root Canals)<br>Cleanings & Comprehensive Exam<br>Tooth-Colored Fillings & Crowns<br>Professional Enamel Whitening |

## 5. The "Gap" List (Action Items for Owner)

### 5a. Active doctors with 0 services assigned

13 active doctor(s) currently have no authorized services:

| Doctor | Primary Branch | Specialty / Role |
|--------|----------------|------------------|
| Dr. Alexander Martin | DHDC Islamabad – Main | Periodontist · ["Periodontal Surgery", "Peri-implantitis Management", "Guided Tissue Regeneration"] |
| Dr. Chloe Harris | DHDC Karachi – Clifton | Cosmetic Dentist · ["Aesthetic Dentistry", "Composite Edge Bonding", "Internal Bleaching", "Laser Gingivoplasty"] |
| Dr. Daniel Thomas | DHDC Islamabad – Main | Hygienist · ["Preventive Dentistry", "Ultrasonic Scaling", "Airflow Polishing", "Periodontal Maintenance"] |
| Dr. David Black | DHDC Islamabad – Main | Endodontist · ["Microscopic Endodontics", "Root Canal Retreatment", "Apicoectomy", "Dental Trauma"] |
| Dr. Emily White | DHDC Islamabad – Main | Pediatric Dentist · ["Pediatric Dentistry", "Child Dental Psychology", "Preventive Sealants", "Space Maintainers"] |
| Dr. James Taylor | DHDC Karachi – Clifton | Implantologist · ["Implantology", "All-on-4 / All-on-6", "Sinus Elevation", "Immediate Loading"] |
| Dr. Jessica Green | DHDC Lahore – Gulberg | Periodontist · ["Periodontics", "Gum Grafting", "Laser Periodontal Therapy", "Regenerative Procedures"] |
| Dr. Laura Wilson | DHDC Islamabad – F-7 Markaz | Cosmetic Dentist · ["Cosmetic Dentistry", "Porcelain Veneers", "Smile Design", "Teeth Whitening"] |
| Dr. Matthew White | DHDC Lahore – Gulberg | Oral Surgeon · ["Oral Surgery", "Impacted Canine Exposure", "Pre-prosthetic Surgery", "Sedation Dentistry"] |
| Dr. Mia Thompson | DHDC Lahore – Gulberg | Endodontist · ["Endodontics", "Complex Anatomy Navigation", "Calcified Canals", "Endodontic Microsurgery"] |
| Dr. Michael Brown | DHDC Islamabad – Main | Oral Surgeon · ["Oral Surgery", "Wisdom Teeth Extraction", "Bone Grafting", "Dental Implants"] |
| Dr. Olivia Anderson | DHDC Lahore – Gulberg | Prosthodontist · ["Prosthodontics", "Full Mouth Rehabilitation", "CAD/CAM Zirconia", "TMD Therapy"] |
| Dr. Sophia Jackson | DHDC Islamabad – F-7 Markaz | Pediatric Dentist · ["Pediatric Dentistry", "Interceptive Orthodontics", "Nitrous Oxide Sedation"] |

### 5b. Dr. Elena Rostova — unassigned service rows (Endo, Whitening, Emergency)

The following 3 service rows for Dr. Elena Rostova were identified earlier as
unassigned / needing review: **Endodontics (Endo)**, **Teeth Whitening**, and
**Emergency**. “Unassigned” here means the `service_providers.clinic_id` is NULL
(not tied to a branch). They are listed for the owner's confirmation; no changes
have been made to the database.

| # | Service | service_providers.id | service_providers.active | clinic_id |
|---|---------|----------------------|--------------------------|-----------|
| 1 | Gentle Endodontics (Root Canals) | 8ecd3c36 | True | (unassigned) |
| 2 | Professional Enamel Whitening | de46f75b | True | (unassigned) |
| 3 | Same-Day Emergency Triage | 756791a9 | True | (unassigned) |

## 6. Suggested Real-World Roles (For Owner's Review)

> **DO NOT insert these into the database.** This is a suggestion block only.
> Note: similar titles already exist in the `roles` table (e.g., Receptionist,
> Practice Manager, Dental Assistant, Hygienist). These are real-world role-title
> suggestions for the owner's consideration; none are inserted into the database.

| Suggested Role | Suggested Display Name | Notes |
|----------------|------------------------|-------|
| Clinical Assistant | Clinical Assistant | Chairside assistance during procedures; instrument handling. |
| Dental Hygienist | Dental Hygienist | Prophylaxis, scaling, periodontal maintenance, patient education. |
| Front Desk / Reception | Front Desk / Reception | Patient check-in/check-out, scheduling, phone and insurance coordination. |
| Practice Manager | Practice Manager | Clinic operations, staff oversight, billing and compliance oversight. |
| Sterilization Tech | Sterilization Tech | Instrument cleaning, sterilization cycle management, operatory turnover. |

---

_End of worksheet. Source: live `marlow_test` database (read-only query)._
