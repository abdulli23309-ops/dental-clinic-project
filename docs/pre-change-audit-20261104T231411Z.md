# Pre-Change Read-Only Audit — Marlow Dental Clinic App

**Generated:** 2026-11-04T23:14:11Z  
**Branch:** `feature/hira-clinic-audit-and-seeding` (commit e666d93)  
**Mode:** READ ONLY — no files modified, no DB writes, no migrations, no commits.  
**Deliverable:** `docs/pre-change-audit-20261104T231411Z.md` only.

## How to read this report
- All schema details are drawn from the SQLAlchemy ORM models in `backend/app/infrastructure/database/orm_models.py` **and** verified against the live PostgreSQL database at `localhost:5433` (`marlow_test`) via read-only `SELECT` queries. Where ORM and live schema disagree, the live database is noted as the source of truth.
- Route/handler details are drawn from source code only (no server running).
- All DB queries were `SELECT`-only (row counts, samples, integrity checks). No `INSERT`/`UPDATE`/`DELETE`/`DDL` was executed.

---

## Section 1 — Data model

Source of truth: `backend/app/infrastructure/database/orm_models.py`, plus live DB introspection (read-only).

### 1.1 `clinics` (table `clinics`) — 32 rows live

| Column | Type | Nullable | PK | Notes |
|---|---|---|---|---|
| id | uuid | NO | YES | PK, default uuid4 |
| organization_id | uuid | NO | | FK `organizations.id` ON DELETE CASCADE |
| name | varchar(255) | NO | | **NOT unique** — 26 rows named "Main Lahore Clinic" |
| address_line1 | varchar(255) | NO | | |
| address_line2 | varchar(255) | YES | | |
| city | varchar(100) | NO | | |
| state | varchar(50) | NO | | |
| postal_code | varchar(20) | NO | | |
| country | varchar(50) | NO | | default 'US' |
| phone | varchar(50) | YES | | |
| email | varchar(255) | YES | | |
| hours_info | text | YES | | |
| image_url | varchar(500) | YES | | |
| is_primary | boolean | NO | | default true |
| is_active | boolean | NO | | default true |
| display_order | integer | NO | | default 0 |
| created_at | timestamptz | NO | | default now() |
| updated_at | timestamptz | NO | | default now(), onupdate now() |

- Unique constraints: **none** (no `__table_args__` on `ClinicORM`).
- FKs: only `organization_id → organizations.id (CASCADE)`.
- Sample rows (live): `DHDC Islamabad – Main`, `DHDC Lahore – Gulberg`, `DHDC Islamabad – F-7 Markaz`, `DHDC Karachi – Clifton`; plus 26 duplicate rows named `Main Lahore Clinic` (city Lahore).

### 1.2 `locations` (table `locations`) — 6 rows live

| Column | Type | Nullable | PK | Notes |
|---|---|---|---|---|
| id | uuid | NO | YES | PK, default uuid4 |
| organization_id | uuid | NO | | FK `organizations.id` ON DELETE CASCADE |
| name | varchar(255) | NO | | |
| address_line1 | varchar(255) | NO | | |
| address_line2 | varchar(255) | YES | | |
| city | varchar(100) | NO | | |
| state | varchar(50) | NO | | |
| postal_code | varchar(20) | NO | | |
| country | varchar(50) | NO | | default 'US' |
| phone | varchar(50) | YES | | |
| email | varchar(255) | YES | | |
| hours_info | text | YES | | |
| image_url | varchar(500) | YES | | |
| is_primary | boolean | NO | | default true |
| is_active | boolean | NO | | default true |
| display_order | integer | NO | | default 0 |
| created_at | timestamptz | NO | | default now() |
| updated_at | timestamptz | NO | | default now(), onupdate now() |

- Unique constraints: **none**.
- FKs: only `organization_id → organizations.id (CASCADE)`.
- `locations` is structurally identical to `clinics` (same columns), retained "for backward compatibility" per the ORM docstring.
- Sample rows (live): `DHDC Islamabad – Main`, `DHDC Lahore – Gulberg`, `DHDC Islamabad – F-7 Markaz`, `DHDC Karachi – Clifton`, `DHDC Downtown Studio`, `DHDC Main Clinic`.

### 1.3 `team_members` (table `team_members`) — 34 rows live

| Column | Type | Nullable | PK | Notes |
|---|---|---|---|---|
| id | uuid | NO | YES | PK, default uuid4 |
| organization_id | uuid | NO | | FK `organizations.id` ON DELETE CASCADE |
| location_id | uuid | YES | | FK `locations.id` ON DELETE SET NULL |
| clinic_id | uuid | YES | | FK `clinics.id` ON DELETE SET NULL |
| first_name | varchar(100) | NO | | |
| last_name | varchar(100) | NO | | |
| display_name | varchar(255) | NO | | |
| professional_title | varchar(150) | NO | | |
| role | varchar(100) | NO | | e.g. Dentist, Hygienist, Oral Surgeon |
| specialties_json | text | YES | | |
| biography | text | YES | | |
| photo_url | text | YES | | |
| education | text | YES | | |
| credentials | varchar(100) | YES | | |
| license_number | varchar(100) | YES | | |
| license_state | varchar(100) | YES | | |
| services_offered | text | YES | | denormalized text, not FK'd |
| display_order | integer | NO | | default 0 |
| is_active | boolean | NO | | default true |
| show_patients_treated | boolean | NO | | default true |
| created_at | timestamptz | NO | | default now() |
| updated_at | timestamptz | NO | | default now(), onupdate now() |

- Unique constraints: **none**.
- FKs: `location_id → locations.id (SET NULL)`, `clinic_id → clinics.id (SET NULL)`, `organization_id → organizations.id (CASCADE)`.

### 1.4 `services` (table `services`) — 6 rows live

| Column | Type | Nullable | PK | Notes |
|---|---|---|---|---|
| id | uuid | NO | YES | PK, default uuid4 |
| slug | varchar(100) | NO | | **UNIQUE**, indexed |
| category | varchar(50) | NO | | |
| title | varchar(255) | NO | | |
| short_desc | text | NO | | |
| full_desc | text | YES | | |
| cash_price | varchar(100) | NO | | |
| duration | varchar(100) | NO | | |
| code | varchar(100) | YES | | |
| insurance_note | text | YES | | |
| recommended_interval | varchar(150) | YES | | |
| recall_interval_days | integer | YES | | |
| display_order | integer | NO | | default 0 |
| is_highlighted | boolean | NO | | default false |
| is_active | boolean | NO | | default true |
| category_id | uuid | YES | | FK `appointment_categories.id` ON DELETE SET NULL |
| is_public | boolean | NO | | default true |
| bookable_online | boolean | NO | | default true |
| buffer_minutes | integer | NO | | default 0 |
| image_url | varchar(500) | YES | | |
| created_at | timestamptz | NO | | default now() |
| updated_at | timestamptz | NO | | default now(), onupdate now() |

- Unique constraints: `slug`.
- FKs: `category_id → appointment_categories.id (SET NULL)`.
- Live slugs include: `fillings-crowns`, `invisalign`, and 4 others.

### 1.5 `clinic_services` (table `clinic_services`) — 33 rows live

| Column | Type | Nullable | PK | Notes |
|---|---|---|---|---|
| id | uuid | NO | YES | PK, default uuid4 |
| clinic_id | uuid | NO | | FK `clinics.id` ON DELETE CASCADE |
| service_id | uuid | NO | | FK `services.id` ON DELETE CASCADE |
| is_active | boolean | NO | | default true |
| created_at | timestamptz | NO | | default now() |
| updated_at | timestamptz | NO | | default now(), onupdate now() |

- Unique constraints: **`uq_clinic_services_clinic_service` (`clinic_id`, `service_id`)** — composite unique enforced both in ORM `__table_args__` and live DB.
- FKs: both CASCADE.

### 1.6 `service_providers` (table `service_providers`) — 138 rows live

| Column | Type | Nullable | PK | Notes |
|---|---|---|---|---|
| id | uuid | NO | YES | PK, default uuid4 |
| service_id | uuid | NO | | FK `services.id` ON DELETE CASCADE |
| team_member_id | uuid | NO | | FK `team_members.id` ON DELETE CASCADE |
| clinic_id | uuid | YES | | FK `clinics.id` ON DELETE CASCADE — **nullable** |
| custom_duration_minutes | integer | YES | | |
| buffer_minutes | integer | YES | | |
| is_active | boolean | NO | | default true |
| updated_at | timestamptz | YES | | default now(), onupdate now() |
| created_at | timestamptz | NO | | default now() |

- Unique constraints: **NONE** (no `__table_args__` on `ServiceProviderORM`; live DB has no unique index).
- FKs: `service_id → services.id (CASCADE)`, `team_member_id → team_members.id (CASCADE)`, `clinic_id → clinics.id (CASCADE)`.
- `clinic_id` is the branch/scope column. It is nullable. Live data: 126 rows have `clinic_id IS NULL`, 12 rows have `clinic_id NOT NULL`.

### 1.7 `bookings` (table `bookings`) — 45 rows live (columns + FKs only, no rows dumped per instructions)

| Column | Type | Nullable | PK | Notes |
|---|---|---|---|---|
| id | uuid | NO | YES | PK |
| confirmation_id | varchar(50) | NO | | UNIQUE, indexed |
| clinic_id | uuid | YES | | FK `clinics.id` ON DELETE SET NULL |
| patient_id | uuid | YES | | FK `patients.id` ON DELETE SET NULL |
| service_id | varchar(100) | YES | | **NOT a FK** — denormalized string (slug or UUID text), references nothing |
| team_member_id | uuid | YES | | FK `team_members.id` ON DELETE SET NULL |
| slot_id | uuid | YES | | no FK |
| preferred_date | date | NO | | indexed |
| preferred_time | varchar(50) | NO | | |
| status | varchar(50) | NO | | default "requested" |
| patient_full_name | varchar(255) | NO | | |
| patient_phone | varchar(50) | NO | | |
| patient_email | varchar(255) | YES | | |
| phone_normalized | varchar(50) | NO | | default '' |
| lead_id | uuid | YES | | FK `leads.id` ON DELETE SET NULL |
| source | varchar(50) | NO | | default 'reception' |
| notes | text | YES | | |
| category_id | uuid | YES | | FK `appointment_categories.id` ON DELETE SET NULL |
| approval_required | boolean | NO | | default false |
| approved_by_user_id | uuid | YES | | FK `users.id` ON DELETE SET NULL |
| approved_at | timestamptz | YES | | |
| rejection_reason | text | YES | | |
| utm_source | varchar(100) | YES | | |
| utm_campaign | varchar(100) | YES | | |
| staff_notes | text | YES | | |
| arrived_at / started_at / completed_at | timestamptz | YES | | |
| cancellation_reason | text | YES | | |
| cancelled_by_user_id | uuid | YES | | FK `users.id` ON DELETE SET NULL |
| reminded_at | timestamptz | YES | | |
| reminded_by_user_id | uuid | YES | | FK `users.id` ON DELETE SET NULL |
| created_at / updated_at | timestamptz | NO | | |

- Indexes: `ix_bookings_team_member_status (team_member_id, status)`.
- **No `location_id` column** — bookings link to a clinic only.
- **`service_id` is a plain string, not a UUID FK to `services`** — referential integrity for the service on a booking is not enforced at the DB level.

### 1.8 `activity_logs` (table `activity_logs`) — 86 rows live (columns + FKs only)

| Column | Type | Nullable | PK | Notes |
|---|---|---|---|---|
| id | uuid | NO | YES | PK |
| user_id | uuid | YES | | FK `users.id` ON DELETE SET NULL |
| action | varchar(100) | NO | | e.g. `update_service_clinics`, `update_service_providers` |
| entity_type | varchar(100) | NO | | e.g. `service` |
| entity_id | varchar(100) | YES | | |
| details_json | text | YES | | e.g. `{"clinic_ids": [...]}` |
| ip_address | varchar(50) | YES | | |
| created_at | timestamptz | NO | | default now() |

- FKs: `user_id → users.id (SET NULL)`.
- Unique constraints: none.

### 1.9 Other tables with FKs to `services`, `team_members`, `clinics`, or `locations`

From the ORM model (full set found in `orm_models.py`):

- **FK to `services.id`**: `service_providers.service_id`, `clinic_services.service_id`.
- **FK to `team_members.id`**: `service_providers.team_member_id`, `bookings.team_member_id`.
- **FK to `clinics.id`**: `team_members.clinic_id`, `service_providers.clinic_id`, `clinic_services.clinic_id`, `bookings.clinic_id`, `tasks.clinic_id (SET NULL)`, `visit_payments.clinic_id (CASCADE)`.
- **FK to `locations.id`**: `team_members.location_id` only.

Additional related tables discovered: `team_member_clinics` (join table, 24 rows: `team_member_id`, `clinic_id`, `is_active`, `is_primary`), `users` (3 rows: `clinic_id`, `team_member_id`, `role`), `provider_availability`, `provider_time_off`, `doctor_schedule_overrides`, `clinic_working_hours`, `clinic_closures`.

### 1.10 Explicit answers to Section 1 questions

**1. Does `service_providers` have a branch/clinic column today?**  
**YES.** Column `clinic_id` (uuid, nullable), FK `clinics.id ON DELETE CASCADE`. It is not named `branch_id` — the branch concept is carried by `clinics` (and, separately, `locations`).

**2. Current unique constraint on `service_providers`?**  
**NONE.** No composite unique on `(team_member_id, service_id)` and none including `clinic_id`. Duplicate `(doctor, service)` links exist in live data (see Section 7).

**3. Current unique constraint on `clinic_services`?**  
**YES.** `uq_clinic_services_clinic_service (clinic_id, service_id)`.

**4. How is `team_members` linked to a branch — `location_id`, `clinic_id`, both, or join table? Which is used by application code paths?**  
**Both `location_id` and `clinic_id`** are present on `team_members` (both nullable FKs), **PLUS** a separate join table `team_member_clinics (team_member_id, clinic_id, is_active, is_primary)` with 24 rows. Live data: all 34 team_members have BOTH `location_id NOT NULL` and `clinic_id NOT NULL` (both populated). Application code uses all three: `create_booking` checks `tm.clinic_id == clinic_id OR tm.location_id == clinic_id OR team_member_clinics` membership (`reception_service.py:802-817`). `BookingEligibilityService` filters doctors by `clinic_id == clinic_id OR location_id == clinic_id OR clinic_id IS NULL OR shift subquery` (`booking_eligibility_service.py:501-509`).

**5. Are `clinics` and `locations` 1:1 today? Prove it.**  
**NO.** Live counts: `locations = 6`, `clinics = 32`. A FULL OUTER JOIN on `name + city` shows only 6 matched pairs (`DHDC Islamabad – Main`, `DHDC Islamabad – F-7 Markaz`, `DHDC Lahore – Gulberg`, `DHDC Karachi – Clifton`, `DHDC Downtown Studio`, `DHDC Main Clinic`). The remaining 26 clinics are all named `Main Lahore Clinic` (city Lahore) with **no matching `locations` row** (duplicate clinic names, count 26). Zero location names lack a clinic match. So they are NOT 1:1: `clinics` has 26 duplicate "Main Lahore Clinic" rows orphaned from `locations`.

## Section 2 — Backend API inventory

Routes are registered in `backend/app/api/v1/router.py`; each endpoint file defines its own `APIRouter` with a prefix and, for admin/doctor/reception, a role dependency. Auth dependencies live in `backend/app/api/deps.py`:
- `require_admin = require_role("admin", "Platform Owner", "Super Admin")` (deps.py:615)
- `require_receptionist = require_role("receptionist", "Receptionist", "admin", ...)` (deps.py:616)
- `require_doctor = require_role("doctor", "Doctor", "admin", ...)` (deps.py:617)
- `require_doctor_strictly = require_role("doctor", "Doctor")` (deps.py:618)

### 2.1 Public endpoints (no auth) — what the booking widget hits

All under `backend/app/api/v1/endpoints/public_content.py`, router prefix `/public` (line 63), **no role dependency**.

| Method | Path | File:line | Input schema | Reads / writes |
|---|---|---|---|---|
| GET | /public/content | public_content.py:72 | — | Reads CMS/site content |
| GET | /public/services | public_content.py:91 | — | Reads `services` (global, `public_only=True` — **NOT filtered by branch**) |
| GET | /public/team | public_content.py:124 | — | Reads `team_members` (global — **NOT filtered by branch/service**) |
| GET | /public/locations | public_content.py:157 | — | Reads `locations` |
| GET | /public/faq | public_content.py:188 | — | Reads `faq_items` |
| GET | /public/organization | public_content.py:209 | — | Reads org |
| GET | /public/booking-status | public_content.py:269 | — | Reads booking status |
| GET | /public/working-hours | public_content.py:277 | — | Reads working hours |
| GET | /public/booking-schedule | public_content.py:286 | — | Reads schedule config |
| GET | /public/availability | public_content.py:294 | `serviceId`, `teamMemberId`, `clinicId`, `date` | Calls `AvailabilityService.get_available_slots` |
| GET | /public/announcements | public_content.py:329 | — | Reads announcements |
| GET | /public/clinics | public_content.py:348 | — | Alias for /public/locations |
| GET | /public/booking/services | public_content.py:568 | — | `BookingEligibilityService.get_bookable_services()` (branch-scoped eligibility) |
| GET | /public/booking/clinics | public_content.py:585 | `serviceId` | `get_bookable_clinics_for_service` |
| GET | /public/booking/doctors | public_content.py:603 | `serviceId`, `clinicId`, `days` | `get_bookable_doctors_for_service_and_clinic` |
| POST | /public/leads | public_content.py:374 | `PublicLeadCaptureRequest` | Writes `leads` |
| POST | /public/booking/reschedule-request | public_content.py:804 | `PublicRescheduleRequest` | Reads `bookings`, writes reschedule request |
| POST | /public/booking/cancel-request | public_content.py:834 | `PublicCancelRequest` | Reads `bookings`, writes cancellation request |
| GET | /public/reviews, /blogs, /social-links, /gallery, /roles | various | — | Reads CMS tables |

### 2.2 Admin endpoints (require_admin)

| Method | Path | File:line | Input schema | Reads / writes |
|---|---|---|---|---|
| GET | /admin/services/clinic-matrix | admin_services.py:59 | — | Reads `clinics`, `services`, `clinic_services`, `service_providers` |
| GET | /admin/services | admin_services.py:109 | — | Reads `services` |
| POST | /admin/services | admin_services.py:118 | `ServiceCreateRequest` | Writes `services` (+ optional `clinic_services`/`service_providers`) |
| GET/PUT/PATCH | /admin/services/{service_id} | admin_services.py:128/138/149 | `ServiceUpdateRequest` | Writes `services` |
| PUT | /admin/services/{service_id}/clinics | admin_services.py:170 | `ServiceClinicsUpdateRequest` | **Writes `clinic_services`** (branch↔service). Audited (`update_service_clinics`). No subset enforcement. |
| PUT | /admin/services/{service_id}/providers | admin_services.py:183 | `ServiceProvidersUpdateRequest` | **Writes `service_providers`** (doctor↔service, `clinic_id` left NULL). Audited (`update_service_providers`). No subset enforcement, NOT branch-scoped. |
| GET/PUT | /admin/locations/{id}/services | admin_organization.py:307/334 | `LocationServicesUpdateRequest` | **Writes `clinic_services`** keyed by `location_id` (branch↔service). No subset enforcement. |
| GET/POST/PUT/PATCH/DELETE | /admin/locations/* | admin_organization.py:130+ | — | CRUD `clinics`/`locations` |
| GET/POST/DELETE | /admin/booking/doctor-branches | admin_booking.py:515/525 | `DoctorBranchAssignmentRequest` | Writes `team_member_clinics` (doctor↔branch) |
| GET/POST/DELETE | /admin/booking/doctor-services | admin_booking.py:535/545/555 | `DoctorServiceAssignmentRequest` | Writes `service_providers` (doctor↔service, branch-scoped via `clinic_id`) |
| GET/POST/DELETE | /admin/booking/doctor-overrides | admin_booking.py:571/581/591 | — | Writes `doctor_schedule_overrides` |
| GET/PUT | /admin/booking/provider-availability | admin_booking.py:244/254 | — | Writes `provider_availability` |
| GET/PUT | /admin/booking/flow-settings | admin_booking.py:316/337 | — | Writes booking settings |
| GET | /admin/booking/bookability-check | admin_booking.py:450 | — | Eligibility diagnostics |
| (CRUD) | /admin/team, /admin/users, /admin/roles, /admin/audit, /admin/cms, /admin/announcements, /admin/media, /admin/messaging, /admin/reports, /admin/integrations | various | — | Manage staff, users, roles, audit log, CMS |

### 2.3 Doctor endpoints (require_doctor / require_doctor_strictly)

All under `backend/app/api/v1/endpoints/doctor.py`, router prefix `/doctor` (line 67). Clinical only — **no service-authorization endpoints**.

| Method | Path | File:line | Reads / writes |
|---|---|---|---|
| GET | /doctor/schedule | doctor.py:99 | Reads doctor schedule/bookings |
| GET/PATCH/POST | /doctor/appointments/{id}, /start, /finish, /notes | doctor.py:171/232/326/422 | Reads/writes bookings, clinical notes |
| POST/GET/PATCH | /doctor/encounters/* | doctor.py:471+ | Clinical encounters |
| GET | /doctor/patients/* | doctor.py:1072+ | Patient chart/history |
| GET/POST/PATCH | /doctor/chart/findings/*, /chart/procedures/* | doctor.py:1214+ | Dental chart |

### 2.4 Receptionist endpoints (require_receptionist)

`backend/app/api/v1/endpoints/reception.py`, prefix `/reception` (line 69). Key booking-creation route:

| Method | Path | File:line | Input schema | Reads / writes |
|---|---|---|---|---|
| POST | /reception/appointments | reception.py:304 | `BookingCreateRequest` | Writes `bookings` (validated — see Section 3) |

### 2.5 Endpoint-flag analysis

**Flag: accepts `service_id` + `team_member_id` without validating the doctor offers that service**
- `POST /reception/appointments` (reception.py:304) → `create_booking` accepts `service_id` + `team_member_id`. Validates team member belongs to clinic, but **does NOT validate** `service_providers` (doctor authorized for service). **FLAGGED.**
- `POST /public/booking` path via `POST /api/v1/appointments` (appointments.py:22) → `create_appointment_request` accepts service + team member. Validates service is active/public/bookable and slot available, but **does NOT validate** service offered at clinic nor doctor authorized. **FLAGGED.**

**Flag: accepts `service_id` + `clinic_id`/`location_id` without validating the branch offers that service**
- `POST /public/availability` (public_content.py:294) takes `serviceId` + `clinicId` and calls `get_available_slots` — computes slots but **does not validate** `clinic_services` (branch offers service). (The separate eligibility endpoints do validate, but the availability endpoint itself does not gate on it.)
- `POST /reception/appointments` → `create_booking` validates service offered at clinic via `clinic_services` (reception_service.py:778-799), BUT the check is guarded by `if clinic_services:` — if the clinic has **no active `clinic_services` rows the check is skipped entirely** (any service accepted). **PARTIAL / FLAGGED.**
- `PUT /admin/services/{service_id}/clinics` and `PUT /admin/locations/{id}/services` let an admin set branch↔service with **no subset/scope validation**.

## Section 3 — Booking flow (backend)

### 3.1 Booking creation paths

There are **two** creation paths:

**(a) Public widget → `POST /api/v1/appointments`**
- Route: `backend/app/api/v1/endpoints/appointments.py:22` (`create_appointment`)
- Service: `AppointmentService.create_appointment_request` (`backend/app/application/services/appointment_service.py:73`)
- Writes a booking request (for staff follow-up), not a confirmed slot in all cases.

**(b) Reception desk → `POST /reception/appointments`**
- Route: `backend/app/api/v1/endpoints/reception.py:304` (`create_appointment`)
- Service: `ReceptionService.create_booking` (`backend/app/application/services/reception_service.py:697`)

### 3.2 What each path validates today

| Check | Public `create_appointment_request` (appt_service.py:73) | Reception `create_booking` (recep_service.py:697) |
|---|---|---|
| Branch/clinic active? | ✅ (booking_mode != "open" → 423) | ⚠️ (closed-mode override, but no explicit "clinic is_active" check seen) |
| Service offered at branch (`clinic_services`)? | ❌ **NOT checked** | ⚠️ Checked BUT skipped when clinic has no active `clinic_services` rows (`if clinic_services:` guard, recep_service.py:793) |
| Doctor authorized for service (`service_providers`)? | ❌ **NOT checked** | ❌ **NOT checked** |
| Doctor assigned to branch? | ❌ **NOT checked** | ✅ (team member belongs to clinic via `clinic_id`/`location_id`/`team_member_clinics`, recep_service.py:802-817) |
| Slots available? | ✅ (`is_slot_available`, 409 conflict) | ✅ (double-booking overlap, 409 conflict) |

### 3.3 What is missing or frontend-only
- **Doctor authorized for service (`service_providers`) is never validated at booking creation in either path.** This is the core gap the migration must close.
- Service-offered-at-branch is not validated in the public path at all; in the reception path it is silently skipped when a clinic has no `clinic_services` rows.
- Doctor assigned to branch is not validated in the public path.

### 3.4 Failure behavior
- Errors are raised as `HTTPException` with status codes: `409_CONFLICT` ("The requested service is not available at this clinic.", "The selected team member does not belong to this clinic.", "Double-booking conflict: ..."), `422_UNPROCESSABLE_ENTITY`, `423_LOCKED`, `404_NOT_FOUND`. No single standardized booking-rejection envelope; detail strings vary.

### 3.5 Availability / slot lookup
- `AvailabilityService.get_available_slots` (`availability_service.py`) computes slots from clinic working hours, closures, doctor shifts, breaks, existing bookings, service duration/buffer. It takes `service_id` (duration only), `team_member_id`, `clinic_id`. It filters by **doctor + clinic**, not by doctor+service+branch authorization. It does not consult `service_providers` to confirm the doctor offers that service at that clinic.

### 3.6 "List doctors for service X at branch Y"
- **Exists:** `GET /public/booking/doctors?serviceId=&clinicId=` → `BookingEligibilityService.get_bookable_doctors_for_service_and_clinic` (`public_content.py:603`).
- What it queries: clinics offering the service (`clinic_services`), then doctors eligible via `service_providers` — with a fallback: if no branch-scoped provider links exist for the service, it treats **all** active doctors with `clinic_id IS NULL` links as eligible (`booking_eligibility_service.py:490-495`). So the "empty provider set = all doctors" rule already dilutes branch scoping.

## Section 4 — Frontend (public site)

### 4.1 Public pages / components

| Concern | File:line | Notes |
|---|---|---|
| Display branches | `frontend/src/components/sections/locations-timing.tsx`; page `frontend/src/app/book/page.tsx` | Branch/city picker in wizard |
| Display services | `frontend/src/components/sections/services.tsx`; API `GET /public/services` (public_content.py:91) and `GET /public/booking/services` (public_content.py:568) | `/public/services` is **global** (not filtered by branch); `/public/booking/services` uses eligibility (branch-aware) |
| Display doctors | `frontend/src/components/sections/our-team.tsx`, `frontend/src/components/sections/doctor.tsx`; API `GET /public/team` (public_content.py:124) | Global team list, not filtered by branch/service |
| Booking wizard steps | `frontend/src/components/booking/booking-wizard.tsx` | Step order: DETAILS(0) → SERVICE(1) → LOCATION(2) → DOCTOR(3) → DATETIME(4) → REVIEW(5) (`booking-flow-logic.ts:7-14`) |

### 4.2 Step-to-step filtering (wizard)

Defined in `frontend/src/lib/booking-flow-logic.ts`:
- `resetSelectionsOnServiceChange()` (line 166): picking a service resets city, clinic, doctor, date, time — **does not filter doctors/services by anything**.
- `resetSelectionsOnClinicChange()` (line 176): picking a clinic resets doctor, date, time.
- `resetSelectionsOnDoctorChange()` (line 184): picking a doctor resets date, time.

**API-level filtering actually used:**
- `getPublicBookingServices()` (api.ts:618) → `GET /public/booking/services` — **no args**, returns bookable services (eligibility-based, but not scoped to a chosen branch because branch is picked *after* service).
- `getPublicBookingClinics(serviceId)` (api.ts:624) → `GET /public/booking/clinics?serviceId=` — clinics filtered by service.
- `getPublicBookingDoctors(serviceId, clinicId, days)` (api.ts:630) → `GET /public/booking/doctors?serviceId=&clinicId=` — doctors filtered by **service + clinic**.

**So:** service is chosen first (global list), then clinic (filtered by service), then doctor (filtered by service+clinic). The user never sees "all doctors regardless" at the doctor step because doctors are filtered by the chosen service+clinic via the API — **but this filtering is only in the booking wizard's "Public Booking Flow 2.0" path**, and the backend eligibility has the unscoped-provider fallback noted in Section 3.6.

### 4.3 Per-branch services list vs. global catalog
- The service catalog rendered publicly is **global** (`GET /public/services` returns all active public services, no branch filter). The branch-scoped list only appears after a service is picked, via `GET /public/booking/clinics?serviceId=`. So there is **no per-branch services list rendered before branch selection**; the catalog is global.

### 4.4 Where frontend assumes "doctor offers service"
- Derived **from the API** (`GET /public/booking/doctors` returns only eligible doctors), not hardcoded. The wizard trusts the API list. No hardcoded service/doctor/branch IDs found in frontend (grep for UUIDs and service slugs `invisalign`, `fillings-crowns` returned zero hits).

### 4.5 Hardcoded IDs
- **None found.** No UUIDs or service slugs hardcoded in `frontend/src`.

## Section 5 — Admin UI (what exists today)

Admin pages (all under `frontend/src/app/admin/`, each a `page.tsx`):

| Route | Component file:line | Manages | Can toggle branch↔service? | Can toggle doctor↔service? | Enforces subset/scope? |
|---|---|---|---|---|---|
| /admin/services | `frontend/src/app/admin/services/page.tsx` | Services catalog | ❌ page does NOT call `adminUpdateServiceClinics`/`adminUpdateServiceProviders` (those API fns exist in `api.ts:1016/1036` but are unused by any frontend page) | ❌ (not on this page) | ❌ |
| /admin/team | `frontend/src/app/admin/team/page.tsx` | Doctors/team | ⚠️ via `adminGetLocationServices` / `adminUpdateLocationServices` (branch offerings) in Tab 3 | ✅ Tab 3 "Doctor-Service Configuration" uses `saveDoctorServiceAssignment` → `POST /admin/booking/doctor-services` (branch-scoped via `clinicId`) | ⚠️ branch-scoped in UI, but backend `set_service_providers` writes `clinic_id=NULL` (see Section 2) |
| /admin/locations | `frontend/src/app/admin/locations/page.tsx` | Branches/locations | ✅ `PUT /admin/locations/{id}/services` (admin_organization.py:334) | — | ❌ no subset validation |
| /admin/booking | `frontend/src/app/admin/booking/page.tsx` | Booking settings | — | — | — |
| /admin/roles | `frontend/src/app/admin/roles/page.tsx` | Roles | — | — | — |
| /admin/users | `frontend/src/app/admin/users/page.tsx` | Staff accounts | — | — | — |
| /admin/appointments | `frontend/src/app/admin/appointments/page.tsx` | Bookings | — | — | — |
| /admin/audit | `frontend/src/app/admin/audit/page.tsx` | Audit log viewer | — | — | — |
| /admin/cms, /announcements, /media, /messaging, /reports, /integrations, /settings, /note-templates, /website | various | CMS/settings | — | — | — |

**Existing admin UI for `clinic_services` / `service_providers`:**
- **Branch↔service (`clinic_services`):** YES — `PUT /admin/locations/{location_id}/services` (admin_organization.py:334) backed by frontend `adminUpdateLocationServices` (api.ts:6646). It sets which services a branch offers. **Does NOT enforce** that doctor authorizations stay a subset of branch offerings.
- **Doctor↔service (`service_providers`):** YES — team page Tab 3 + `POST /admin/booking/doctor-services` (admin_booking.py:545). **BUT** the backend `set_service_providers` (`postgres_booking_settings_repo.py:495`) inserts rows with `clinic_id = NULL` (unscoped), so the doctor↔service link created through this UI is **not actually branch-scoped at the DB level**, despite the UI passing a `clinicId`.

**Subset/scope enforcement in admin UI:** None. Neither `set_service_clinics` nor `set_service_providers` validates that `doctor services ⊆ branch services`.

## Section 6 — Auth / roles / permissions

**Roles in code** (`users.role` column; `UserRole` domain model; `deps.py`):
- `admin`, `doctor`, `receptionist` (primary), plus `Platform Owner`, `Super Admin`, `Clinic Branch Manager` recognized by `require_role` closures.

**Where role is checked:**
- `require_role(*allowed_roles)` in `backend/app/api/deps.py:578`, applied as FastAPI `Depends` either at router level (`dependencies=[Depends(require_admin)]`) or per-route (`Depends(require_receptionist)`, `Depends(require_doctor)`).
- Public endpoints have **no** role dependency.

**Permission for "doctor can edit their own services":** **None.** Doctor endpoints (`/doctor/*`) are clinical (schedule, encounters, notes, chart). Service/branch configuration is `require_admin` only. There is no doctor-scoped service-authorization permission.

**Audit log on config changes:** **YES.**
- `ServiceService.set_clinic_ids` (`service_service.py:59`) logs `action="update_service_clinics"` to `activity_logs`.
- `ServiceService.set_provider_ids` (`service_service.py:76`) logs `action="update_service_providers"` to `activity_logs`.
- Live `activity_logs` contains `update_service_clinics` rows (86 total rows).
- `create_booking` triggers `LeadStatusService.on_booking_created` which also writes activity.
- Note: `set_service_providers`/`set_service_clinics` in the repositories perform plain `DELETE` + `INSERT` (no per-row audit of individual links); audit is one record per admin call.

## Section 7 — Current data state (SELECT only, live DB `marlow_test`)

| Table | Count |
|---|---|
| locations | 6 |
| clinics | 32 |
| team_members | 34 |
| services | 6 |
| clinic_services | 33 |
| service_providers | 138 |
| bookings | 45 |
| users | 3 |

**Duplicate `(team_member_id, service_id)` in `service_providers`:** multiple — e.g. `(549cf72e…, 1aec6f4f…)` ×3, `(549cf72e…, 1e547c51…)` ×3, `(d0897bb6…, a222dc57…)` ×3, plus several ×2. **No unique constraint exists.**

**Duplicate `(clinic_id, service_id)` in `clinic_services`:** **NONE** (unique constraint enforced).

**Doctors with zero service links (14):** Dr. Olivia Anderson, Dr. David Black, Dr. Michael Brown, Dr. Jessica Green, Dr. Chloe Harris, Dr. Sophia Jackson, Dr. Alexander Martin, Dr. James Taylor, Dr. Daniel Thomas, Dr. Mia Thompson, Dr. Emily White, Dr. Matthew White, Dr. Laura Wilson (+1 more). All have `clinic_id` and `location_id` set but no `service_providers` row.

**Services with zero doctor links:** NONE (all 6 services have ≥1 doctor link).

**Services with zero branch links:** NONE (all 6 services have ≥1 `clinic_services` link).

**Cross-branch orphan `service_providers` (doctor's clinic not offering that service at same clinic):** **NONE** — the `service_providers.clinic_id IS NOT NULL AND NOT EXISTS clinic_services` check returned zero rows. (Mostly because 126 of 138 rows have `clinic_id = NULL`.)

**`service_providers` branch scoping:** 126 rows `clinic_id NULL`, 12 rows `clinic_id NOT NULL` — the large majority of doctor-service links are **unscoped**.

**`team_members` branch linkage:** all 34 rows have both `location_id NOT NULL` and `clinic_id NOT NULL` (both populated; `team_member_clinics` join table has 24 rows).

**Clinics vs Locations:** NOT 1:1 — 32 clinics vs 6 locations; 26 clinics named `Main Lahore Clinic` (duplicate, no location match); 6 matched pairs; zero location names without a clinic.

## Section 8 — Tests

**Backend tests** (`backend/tests/`): ~46 test files. Relevant to this migration:
- `test_service.py`, `test_services.py` — service catalog
- `test_booking_eligibility_negative.py` — eligibility rules
- `test_public_booking_flow.py` — public booking
- `test_booking_flow_verification.py`, `test_booking_admin_b7_b8_b9.py` — booking/admin
- `test_team.py` — team/doctor
- `test_reception_and_roles.py` — reception booking + roles
- `test_availability_engine.py` — slots
- `test_audit_coverage.py` — audit
- `test_double_booking_prevention.py` — conflicts

**Frontend tests:** unit tests in `frontend/src/test/` (10 files, incl. `booking-flow-logic.test.ts`); Playwright e2e in `frontend/e2e/` (~30 spec files, incl. `booking-flow-admin-integration.spec.ts`, `booking-flow-roles-and-states.spec.ts`).

**Coverage of Sections 2–5 areas:** There are tests covering booking creation, eligibility, availability, and roles, but **no test appears to cover the subset rule** (`doctor services ⊆ branch services`) or branch-scoped `service_providers` enforcement. Rough estimate: booking flow and eligibility are moderately covered; branch-scoped doctor-service authorization and admin service-assignment UI are lightly or not covered.

## Section 9 — Gap analysis vs. the plan

| # | Requirement | Current state | Gap | Effort | Migration risk |
|---|---|---|---|---|---|
| 1 | Branch↔service managed per branch | `clinic_services` exists + admin API (`PUT /admin/locations/{id}/services`) | Admin UI wiring exists on team page; backend `set_service_clinics` has no validation | S | Low |
| 2 | Doctor↔service scoped to branch | `service_providers.clinic_id` exists but nullable; `set_service_providers` writes NULL | Make `clinic_id` required/meaningful; backfill 126 NULL rows | M | Medium |
| 3 | Doctor services ⊆ branch services enforced in backend | **Not enforced** anywhere at booking creation or assignment | Add validation in `create_booking`, `create_appointment_request`, `save_doctor_service`, `set_service_providers` | L | High |
| 4 | Admin API for branch services | `PUT /admin/locations/{id}/services` exists | None (API exists) | S | Low |
| 5 | Admin API for doctor services (branch-scoped) | `POST /admin/booking/doctor-services` exists but writes `clinic_id=NULL` | Change to require + store `clinic_id` | M | Medium |
| 6 | Admin UI for both | Branch↔service UI on team page; doctor↔service UI on team page Tab 3 | Neither enforces subset rule | M | Low |
| 7 | Public booking enforces subset rule | **Not enforced** (public path skips clinic_services; neither path checks service_providers) | Add backend validation to both creation paths | L | High |
| 8 | Duplicate links deduped + unique constraint | Duplicates exist in `service_providers`; no unique constraint | Dedup rows, add unique constraint on `(team_member_id, service_id, clinic_id)` | M | Medium |
| 9 | `clinics`/`locations` unified (single branch identity) | 32 clinics vs 6 locations; 26 duplicate "Main Lahore Clinic" | Decide single branch identity; migrate references | L | High |
| 10 | Audit log on config changes | `update_service_clinics` / `update_service_providers` logged | Extend to cover booking-creation rejections & doctor-service changes | S | Low |
| 11 | Seed data reflecting real (curated) matrix | Data is "all everywhere" (138 provider links, many duplicates) | Curate real matrix per branch | M | Medium |

## Section 10 — Recommended change order (planning only — NOT executed)

1. **Backfill & constrain `service_providers`** — files: `backend/app/infrastructure/repositories/postgres_booking_settings_repo.py`, migration. Migration: populate `clinic_id` for NULL rows, add unique constraint. Rollback: drop constraint. Risk: duplicate rows must be deduped first.
2. **Unify branch identity (`clinics` vs `locations`)** — decision needed (human) on which is canonical; likely `clinics` (branch). Files: all endpoints + ORM. Migration risk: high (FK references).
3. **Backend subset enforcement at booking creation** — files: `reception_service.py`, `appointment_service.py`. Migration: none (logic only), depends on #1/#2. Rollback: revert logic.
4. **Admin API branch-scoped doctor services** — files: `admin_booking.py`, `booking_settings_repo.py`. Migration: none.
5. **Admin UI subset enforcement** — files: `frontend/src/app/admin/team/page.tsx`, `api.ts`. Migration: none.
6. **Public booking subset enforcement** — files: `appointment_service.py`, `public_content.py`. Migration: none.
7. **Seed/curate matrix** — files: seed scripts. Migration: seed data only.

**Single highest-value first PR:** Add backend enforcement that a booking's `team_member_id` is authorized for the `service_id` at the booked `clinic_id` (i.e., `service_providers` branch-scoped check) in both `create_booking` and `create_appointment_request`, plus a migration to dedup and backfill `service_providers.clinic_id`. This closes the core authorization gap with the smallest surface area.

---

## Executive summary (10 lines)

**3 biggest risks in the current codebase for this migration:**
1. `service_providers` has no unique constraint and 126/138 rows have `clinic_id = NULL`, so doctor↔service is effectively unscoped today — any branch-scoping rule would invalidate most existing links.
2. Neither booking creation path (`create_booking` and `create_appointment_request`) validates that the doctor is authorized for the service at the branch — the core subset rule is entirely absent from the write path.
3. `clinics` (32 rows, incl. 26 duplicate "Main Lahore Clinic") and `locations` (6 rows) are not 1:1 and are used interchangeably in code (`location_id` passed as `clinic_id` in `clinic_services`), so there is no single branch identity to scope against.

**3 biggest unknowns needing a human decision before coding:**
1. Which table is the canonical branch identity — `clinics` or `locations` — and how to reconcile 26 duplicate `clinics` rows with no `locations` match.
2. Whether existing unscoped `service_providers` rows (`clinic_id NULL`) should be backfilled to a specific branch, deactivated, or treated as "all branches" during migration.
3. Whether the public booking widget should hard-reject a doctor+service+branch combination (409) or silently auto-substitute an eligible doctor.

**Single highest-value first PR:** Add branch-scoped doctor-service authorization validation to both booking creation paths (`create_booking` and `create_appointment_request`) together with a migration to deduplicate and backfill `service_providers.clinic_id` — this closes the core authorization gap with the smallest surface area.

**End of report.** File: `docs/pre-change-audit-20261104T231411Z.md`. No code was modified, no database writes were performed, and nothing was committed.
