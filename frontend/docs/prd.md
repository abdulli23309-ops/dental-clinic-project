# Product Requirements Document (PRD) — Marlow Dental

## 1. Product Overview
Marlow Dental is evolving from a single-practitioner boutique clinic into a scalable **dental medical complex / multi-doctor organization**.

The website and platform serve a dual purpose:
1. **Public Digital Front Door**: Communicating clinical philosophy, verified credentials, transparent fee schedules, and guiding patients through booking requests.
2. **Clinic CMS & Operations Shell**: Providing practice administrators with a secure portal to manage procedures, team rosters, locations, and website copy without touching code or redeploying the application.

## 2. Target Audience & Roles
- **Prospective & Existing Patients**: Seeking an unhurried, independent dentist, transparent pricing, and clear explanations.
- **Practice Administrator (`admin`)**: Manages the public-facing directory of doctors and hygienists, procedure fees, location operating hours, and marketing copy.
- **Future Roles (Deferred)**: Receptionist (appointment triage), Doctor (schedule view), Patient Portal (medical history).

## 3. Core Functional Requirements

### 3.1 Content & Truthfulness Standards
- **Zero Fabricated Content**: Strictly no invented reviews, fake patient names, fake ratings, or unverified statistics.
- **Direct Clinical Guarantees**: Direct doctor continuity, written estimates before treatment, same-week availability, and reserved emergency triage slots.
- **Tone & Writing**: Calm, direct, human editorial voice. No em-dashes, no AI clichés.

### 3.2 Authentication & Access Control
- Secure credentials authentication (`email` + `password`) with bcrypt hashing.
- Short-lived JWT access tokens + long-lived HttpOnly refresh cookies.
- Refresh token rotation on every exchange and server-side revocation on logout.
- Single initial role: `admin`. Protected route guards across all `/admin/*` views.
- Safe local bootstrap CLI for initial admin creation without hardcoded passwords.

### 3.3 Clinic Organization & Multi-Doctor Foundation
- Relational hierarchy: `Organization` -> `Location` -> `TeamMember`.
- Reusable `TeamMember` model supporting Directors, Dentists, Orthodontists, Hygienists, and future staff types without schema modifications.
- Soft-deletion policy: records are deactivated (`is_active = false`) rather than physically deleted.

### 3.4 Services & Procedure Catalog
- Database-backed procedure catalog with display orders, CDT codes, durations, and pricing notes.
- Managed by admins; dynamically consumed by both the public services section and the appointment booking wizard.

### 3.5 Website CMS & Dashboard Shell
- Structured content management for General, Homepage, About, Contact, FAQs, and SEO.
- Media upload interface with file type and size validation.
- Clean dashboard shell at `/admin` with quick metrics and focused editing sections.

### 3.6 The Booking Wizard (`/book`)
- URL-synced multi-step wizard (`?step=0|1|2|3`).
- Dynamic active procedure options populated from the backend.
- Inline validation on field blur with `aria-live="polite"` feedback.
- Date picker floor (`min`) preventing selection of past dates.
- Submission transmits directly to `POST /api/v1/appointments`.

### 3.7 Production Readiness & Compliance
- **SEO & Social Sharing**: Unique per-route metadata, dynamic OpenGraph image (`/opengraph-image`), XML sitemap (`/sitemap.xml`), and robots configuration (`/robots.txt`).
- **Accessibility**: Conformance with WCAG 2.1 AA, keyboard focus indicators, screen reader labels, and `prefers-reduced-motion` compliance.
- **PHI & Credential Safety**: Zero patient data or token secrets written to application logs.
