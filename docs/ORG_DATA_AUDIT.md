# Marlow Dental — Organization Data Audit

**Owner:** Cline (frontend) & Antigravity (backend) — shared audit file  
**Purpose:** Record every hardcoded organization detail across frontend + backend, its replacement data source (DB table/field), and whether it already comes from the API.  
**Rule:** No organization-specific information may be hardcoded in frontend or backend code. Everything must come from the database, managed by admin/owner via CRUD in the admin portal. A fresh (empty) database must render a clean neutral empty state — never placeholder organization content.

---

## 1. Scope & Methodology

Searched the entire repo: `frontend/`, `backend/`, `docs/`, `seed.js`, layout metadata, seed files, constants, JSON, env defaults, email/SMS templates, PDF/invoice templates.

Search terms included: `marlow`, `Marlow Dental`, `Dr. Sarah Marlow`, `Dr. Marcus Vance`, `Dr. Elena Rostova`, `capital district`, `downtown district`, `123 Healthcare`, `care@marlowdental`, `+92 300 1234567`, `icon.svg`, `favicon`, `siteTitle`, `metaDescription`, `practiceName`, `copyright`, `Welcome back`, `testimonial`, `patientsTreated`, `philosophy`.

**Status legend:**
- `MUST FIX` — hardcoded org fact that must be replaced with API/DB data or a neutral empty state.
- `API-CORRECT` — already sourced from the backend API/database correctly.
- `ALLOWED (placeholder)` — generic form placeholder / example value, not presented as real org data (prefer generic neutral text).
- `TEST-ONLY` — dummy data confined to test files (acceptable but should avoid org-specific names where practical).
- `DOCS-ONLY` — documentation/README text describing the project (not runtime content; keep for clarity but note).

---

## 2. Full Audit Table — Backend

| # | File | Line | Hardcoded value | Replacement data source (DB table/field) | Status |
|---|------|------|-----------------|------------------------------------------|--------|
| B1 | `backend/app/application/dtos/cms_dto.py` | 45 | `practiceName: str = "Marlow Dental"` | `cms_sections` table, `general` section → `practiceName` | MUST FIX |
| B2 | `backend/app/application/dtos/cms_dto.py` | 46 | `tagline: str = "Comprehensive, unhurried dental care."` | `cms_sections`, `general` → `tagline` | MUST FIX |
| B3 | `backend/app/application/dtos/cms_dto.py` | 49 | `phone: str = "+92 300 1234567"` | `cms_sections`, `general` → `phone` / `locations.phone` | MUST FIX |
| B4 | `backend/app/application/dtos/cms_dto.py` | 50 | `email: str = "care@marlowdental.com"` | `cms_sections`, `general` → `email` / `locations.email` | MUST FIX |
| B5 | `backend/app/application/dtos/cms_dto.py` | 51 | `address: str = "123 Healthcare Boulevard, Medical District"` | `cms_sections`, `general` → `address` / `locations.address_line1` | MUST FIX |
| B6 | `backend/app/application/dtos/cms_dto.py` | 52 | `emergencyPhone: str = "+92 300 7654321"` | `cms_sections`, `general` → `emergencyPhone` | MUST FIX |
| B7 | `backend/app/application/dtos/cms_dto.py` | 59-66 | `heroEyebrow`, `heroHeading`, `heroDescription`, `heroCtaText`, ... defaults | `cms_sections`, `homepage` section | MUST FIX |
| B8 | `backend/app/application/dtos/cms_dto.py` | 75-80 | `storyParagraphs` mentioning "Marlow Dental" | `cms_sections`, `about` section | MUST FIX |
| B9 | `backend/app/application/dtos/cms_dto.py` | 80 | `licensureText: str = "Registered & Verified Clinical Licensure..."` | `cms_sections`, `about` → `licensureText` | MUST FIX |
| B10 | `backend/app/application/dtos/cms_dto.py` | 87-93 | Contact section defaults (phone, email, address, hoursSummary, emergencyNote) | `cms_sections`, `contact` section | MUST FIX |
| B11 | `backend/app/application/dtos/cms_dto.py` | 101 | `copyrightNotice: str = "Marlow Dental Practice. All rights reserved."` | `cms_sections`, `footer` → `copyrightNotice` | MUST FIX |
| B12 | `backend/app/application/dtos/cms_dto.py` | 109-110 | `siteTitle: str = "Marlow Dental — Unhurried Dentistry"`, `metaDescription` default | `cms_sections`, `seo` section | MUST FIX |
| B13 | `backend/app/application/services/organization_service.py` | 30-39 | Auto-creates default "Marlow Dental" organization when none exists | Return `null`/empty when no org; admin creates via `POST/PUT /api/v1/admin/organization` | MUST FIX |
| B14 | `backend/app/cli.py` | 37-... | `INITIAL_SERVICES`, org, clinics, team members, users all hardcoded with Marlow names | Remove from auto-seed; keep only in opt-in dev demo seed, never run automatically | MUST FIX |
| B15 | `backend/app/api/v1/endpoints/integration.py` | 1273-1275 | Fallback `clinicName="Marlow Dental Clinic"`, address, phone | Use clinic record fields or `null`/empty when no clinic | MUST FIX |
| B16 | `backend/app/api/v1/endpoints/integration.py` | 1340-1342 | Same fallback clinic data | Use clinic record fields or `null`/empty | MUST FIX |
| B17 | `backend/app/api/deps.py` | 614 | Header name `X-Marlow-Key` | Rename to generic internal header (e.g. `X-API-Key`) | MUST FIX (low) |
| B18 | `backend/app/api/v1/endpoints/admin_audit.py` | 162 | Filename `marlow_audit_logs_...` | Generic name (e.g. `audit_logs_...`) | MUST FIX (low) |
| B19 | `backend/` | — | No `setup status` endpoint reporting whether org is configured | Add `GET /api/v1/admin/organization/setup-status` → `{ isConfigured: bool, org: ... \| null }` | MUST FIX (gap) |
| B20 | `backend/app/api/v1/endpoints/admin_organization.py` | — | No `DELETE` endpoint for organization or locations | Add `DELETE /api/v1/admin/organization` and `DELETE /api/v1/admin/locations/{id}` | MUST FIX (gap) |
| B21 | `backend/tests/*.py` | — | Tests construct orgs/team members with "Marlow Dental", "Dr. Sarah Marlow", etc. | Test-only fixture data; keep neutral where practical | TEST-ONLY |


## 3. Full Audit Table — Frontend (part 1)

| # | File | Line | Hardcoded value | Replacement data source (DB table/field) | Status |
|---|------|------|-----------------|------------------------------------------|--------|
| F1 | `frontend/src/app/layout.tsx` | 22-58 | `title`, `description`, `metadataBase`, `authors`, `openGraph`, `twitter`, `jsonLd` all hardcoded "Marlow Dental" | Dynamic from `GET /api/v1/public/content` (seo) + `GET /api/v1/public/organization`; server component `generateMetadata` | MUST FIX |
| F2 | `frontend/src/app/manifest.ts` | 8-10 | `name`, `short_name`, `description` hardcoded "Marlow Dental" | Dynamic from org record | MUST FIX |
| F3 | `frontend/src/app/robots.ts` | 13 | `sitemap: "https://marlowdental.com/sitemap.xml"` | Relative path or org website URL | MUST FIX |
| F4 | `frontend/src/app/sitemap.ts` | 7 | `baseUrl = "https://marlowdental.com"` | Relative URLs or org website URL | MUST FIX |
| F5 | `frontend/src/app/opengraph-image.tsx` | 3, 44, 53, 104 | `alt`, initial letter "M", "Marlow Dental", "Marlow Dental Practice Facility" | Dynamic from org name/logo; neutral graphic when no org | MUST FIX |
| F6 | `frontend/src/components/layout/site-header.tsx` | 35 | `practiceName = content.general?.practiceName || "Marlow Dental Complex"` | Remove fallback; neutral empty state | MUST FIX |
| F7 | `frontend/src/components/layout/site-header.tsx` | 39 | `phone = ... || "(312) 555-0147"` | Remove fallback; neutral empty state | MUST FIX |

## 3b. Full Audit Table — Frontend (part 2)

| # | File | Line | Hardcoded value | Replacement data source (DB table/field) | Status |
|---|------|------|-----------------|------------------------------------------|--------|
| F9 | `frontend/src/components/layout/footer.tsx` | 17 | `practiceName = content.general?.practiceName || "Marlow Dental"` | Remove fallback | MUST FIX |
| F10 | `frontend/src/components/layout/footer.tsx` | 19-20 | `firstNamePart` / `restNameParts` fallbacks `"Marlow"` / `"Dental"` | Remove fallbacks | MUST FIX |
| F11 | `frontend/src/components/layout/footer.tsx` | 22 | `phone = ... || "Clinic Phone"` (neutral) | Keep neutral, source from API | API-CORRECT (neutral fallback) |
| F12 | `frontend/src/components/layout/footer.tsx` | 26-29 | Address fallbacks `"Clinic Address"` / `"Practice Location"` | Neutral fallbacks OK; source from locations | API-CORRECT (neutral fallback) |
| F13 | `frontend/src/components/layout/footer.tsx` | 31-34 | Tagline fallback `"Comprehensive, ethical dental care..."` | Replace with empty/neutral | MUST FIX |
| F14 | `frontend/src/components/layout/footer.tsx` | 187 | `&copy; {currentYear} {practiceName}. All rights reserved.` | `practiceName` from API only; empty state when none | MUST FIX |
| F15 | `frontend/src/components/sections/hero.tsx` | 16 | `practiceName = content.general?.practiceName || "Marlow Dental"` | Remove fallback | MUST FIX |
| F16 | `frontend/src/components/sections/hero.tsx` | 17 | `phone = ... || "(312) 555-0147"` | Remove fallback | MUST FIX |
| F17 | `frontend/src/components/sections/hero.tsx` | 38, 123, 130 | `practiceName` used in badge, image alt, location label | Source from API only | MUST FIX |
| F18 | `frontend/src/components/sections/commitments.tsx` | 16 | `practiceName = ... || "Marlow Dental"` | Remove fallback | MUST FIX |
| F19 | `frontend/src/components/sections/commitments.tsx` | 17-18 | `locationName` / `phone` fallbacks | Remove fallbacks | MUST FIX |
| F20 | `frontend/src/components/sections/commitments.tsx` | 68 | Description uses `practiceName` | Source from API only | MUST FIX |

| F8 | `frontend/src/components/layout/site-header.tsx` | 43-44 | `nameParts` fallbacks `"Marlow"` / `"Dental"` | Remove fallbacks | MUST FIX |


## 3c. Full Audit Table — Frontend (part 3)

| # | File | Line | Hardcoded value | Replacement data source (DB table/field) | Status |
|---|------|------|-----------------|------------------------------------------|--------|
| F21 | `frontend/src/components/providers/public-content-provider.tsx` | 22 | `EMPTY_SITE_CONTENT.general.practiceName = "Marlow Dental"` | `null` / `""` empty state | MUST FIX |
| F22 | `frontend/src/components/providers/public-content-provider.tsx` | 32-39 | `EMPTY_SITE_CONTENT.homepage` defaults (hero copy) | `null` / `""` empty state | MUST FIX |
| F23 | `frontend/src/components/providers/public-content-provider.tsx` | 63 | `EMPTY_SITE_CONTENT.seo.siteTitle = "Marlow Dental"` | `null` / `""` empty state | MUST FIX |
| F24 | `frontend/src/app/admin/website/page.tsx` | 279 | `placeholder="Marlow Dental"` | Remove placeholder | MUST FIX |
| F25 | `frontend/src/app/admin/settings/page.tsx` | 516 | `{org?.displayName || "Marlow Dental Complex"}` | Remove fallback | MUST FIX |
| F26 | `frontend/src/app/admin/settings/page.tsx` | 519 | Hardcoded tagline text in live preview | Remove hardcoded copy | MUST FIX |
| F27 | `frontend/src/app/admin/locations/page.tsx` | 484 | `placeholder="e.g. care@marlowdental.com"` | Generic placeholder | ALLOWED (make generic) |
| F28 | `frontend/src/app/admin/locations/page.tsx` | 487 | `placeholder="... care@marlowdental.com ... 8:00 AM – 6:00 PM ..."` | Generic placeholder | ALLOWED (make generic) |
| F29 | `frontend/src/app/admin/users/page.tsx` | 488 | `placeholder="e.g. robert.vance@marlowdental.com"` | Generic placeholder | ALLOWED (make generic) |
| F30 | `frontend/src/app/booking/booking-wizard.tsx` | 530 | `selectedClinicObj?.name || "Marlow Dental Practice"` | Remove fallback; empty/disabled state | MUST FIX |
| F31 | `frontend/src/content/booking-copy.ts` | 174, 177, 181, 332, 336 | Placeholders `Dr. Ayesha Malik`, `+92 300 1234567`, `ayesha@example.com` | Generic neutral placeholders | ALLOWED (make generic) |
| F32 | `frontend/src/content/progressive-booking-copy.ts` | 150, 154 | Placeholders `+92 300 1234567`, `patient@example.com` | Generic neutral placeholders | ALLOWED (make generic) |


## 3d. Full Audit Table — Frontend (part 4)

| # | File | Line | Hardcoded value | Replacement data source (DB table/field) | Status |
|---|------|------|-----------------|------------------------------------------|--------|
| F33 | `frontend/src/app/login/page.tsx` | 154 | `placeholder="staff@example.com"` | Generic placeholder | ALLOWED |
| F34 | `frontend/src/app/page.tsx` | 16 | JSDoc comment mentions "Marlow Dental practice" | Neutral comment | MUST FIX (comment) |
| F35 | `frontend/src/test/booking-flow-logic.test.ts` | 151-162, 293-304 | Dummy clinics `"123 Healthcare Blvd"`, `"Capital District"`, `+92 300 1234567` | Test-only dummy data | TEST-ONLY |
| F36 | `frontend/src/app/admin/team/page.tsx` | 487, 490 | Labels/placeholders `Dr. Full Name`, `Dr. Attending Clinician` | Generic | ALLOWED |
| F37 | `frontend/src/components/layout/mobile-menu.tsx` | 20-22 | Nav labels "Clinical Philosophy", "Clinical Team", etc. | Static nav labels OK (UI, not org data) | API-CORRECT |

## 4. Already Comes from the API Correctly (no change needed)

| File | Elements | Source endpoint |
|------|----------|-----------------|
| `frontend/src/components/layout/footer.tsx` | phone, email, address, hours, tagline, copyright name, license text | `content.general`, `primaryLocation`, `workingHours`, `director` |
| `frontend/src/components/sections/hero.tsx` | practice name, phone, CTA, image, location label | `content.general`, `content.homepage`, `primaryLocation` |
| `frontend/src/components/sections/commitments.tsx` | practice name, location, phone, director name | `content.general`, `director`, `primaryLocation` |
| `frontend/src/components/sections/doctor.tsx` | doctor cards (photo, name, credentials, specialty, location) | `team`, `locations` |
| `frontend/src/components/sections/services.tsx` | service cards (title, price, duration, category) | `GET /api/v1/public/services` |
| `frontend/src/components/sections/visit.tsx` | clinic cards (name, address, phone, hours) | `locations` |
| `frontend/src/components/sections/faq.tsx` | FAQ list, phone, location name | `GET /api/v1/public/faqs`, `content.general`, `primaryLocation` |
| `frontend/src/components/layout/site-header.tsx` | brand name, phone, nav | `content`, `primaryLocation`, `organization` |
| `frontend/src/components/providers/public-content-provider.tsx` | all public content, org, locations, team, hours, announcements | `GET /api/v1/public/content`, `/organization`, `/locations`, `/team`, `/working-hours`, `/announcements` |
| `frontend/src/app/admin/settings/page.tsx` | org profile fields (name, colors, fonts) loaded from API | `GET /api/v1/admin/organization` |
| `frontend/src/app/admin/website/page.tsx` | CMS sections (general, homepage, about, contact, faq, seo) | `GET/PUT /api/v1/admin/cms/{section}` |
| `frontend/src/app/admin/locations/page.tsx` | clinic CRUD | `GET/POST/PUT/PATCH /api/v1/admin/locations` |
| `frontend/src/app/admin/services/page.tsx` | services CRUD | `GET/POST/PUT/PATCH /api/v1/admin/services` |
| `frontend/src/app/admin/team/page.tsx` | team CRUD | `GET/POST/PUT/PATCH /api/v1/admin/team` |
| `frontend/src/app/admin/announcements/page.tsx` | announcements CRUD | `GET/POST/PUT/DELETE /api/v1/admin/announcements` |


## 5. Backend Gaps (Phase 2 — Antigravity)

The backend already has CRUD endpoints for organization, locations, services, team members, CMS sections, FAQs, and announcements. Remaining work:

1. **Remove auto-seeded default organization** — `organization_service.get_organization()` must not create a "Marlow Dental" org; return `null`/empty when none exists. Public endpoints must return empty arrays/`null` (never fake defaults).
2. **Remove hardcoded CMS defaults** — `cms_dto.py` `DEFAULT_SECTIONS` and `cms_service.get_public_cms()` must return empty/null values when no CMS rows exist, not Marlow defaults.
3. **Remove org data from `cli.py` auto-seed** — fresh DB starts empty. Create an opt-in dev-only demo seed (e.g. `python -m app.cli seed:demo` or a dedicated script), never run automatically.
4. **Add setup-status endpoint** — `GET /api/v1/admin/organization/setup-status` returns `{ isConfigured: boolean, organization: ... \| null }`.
5. **Add DELETE endpoints** — `DELETE /api/v1/admin/organization` and `DELETE /api/v1/admin/locations/{id}` (admin-only).
6. **Team member photo upload** — ensure `POST/PUT /api/v1/admin/team` accepts photo upload (via `/api/v1/admin/media` or multipart) and returns `photoUrl`.
7. **Validation & roles** — admin/owner writes; doctor/reception limited; public read where needed.
8. **Revalidation** — admin edits must be immediately visible on public site (endpoints are DB-backed; frontend uses `cache: "no-store"`).

## 6. API CONTRACT (shared — Antigravity implements backend, Cline consumes)

| Endpoint | Method | Auth | Request | Response | Notes |
|----------|--------|------|---------|----------|-------|
| `/api/v1/public/organization` | GET | public | — | Organization \| `null` | `null` when no org |
| `/api/v1/public/content` | GET | public | — | `PublicCmsResponse` (empty strings/null when no data) | Already exists |
| `/api/v1/public/services` | GET | public | — | `[]` when none | Already exists |
| `/api/v1/public/team` | GET | public | — | `[]` when none | Already exists |
| `/api/v1/public/locations` | GET | public | — | `[]` when none | Already exists |
| `/api/v1/public/working-hours` | GET | public | — | `[]` when none | Already exists |
| `/api/v1/public/announcements` | GET | public | — | `[]` when none | Already exists |
| `/api/v1/admin/organization` | GET | admin | — | Organization | Already exists |
| `/api/v1/admin/organization` | PUT | admin | `OrganizationUpdateRequest` | Organization | Already exists |
| `/api/v1/admin/organization` | DELETE | admin | — | 204 | GAP — add |
| `/api/v1/admin/organization/setup-status` | GET | admin | — | `{ isConfigured: boolean }` | GAP — add |
| `/api/v1/admin/locations` | GET/POST | admin | — | list / created | Already exists |
| `/api/v1/admin/locations/{id}` | PUT/PATCH/DELETE | admin | — | updated / 204 | DELETE GAP — add |
| `/api/v1/admin/team` | GET/POST | admin | — | list / created (with photoUrl) | Already exists; photo upload via media endpoint |
| `/api/v1/admin/team/{id}` | PUT/PATCH | admin | — | updated | Already exists |
| `/api/v1/admin/services` | GET/POST | admin | — | list / created | Already exists |
| `/api/v1/admin/services/{id}` | PUT/PATCH | admin | — | updated | Already exists |
| `/api/v1/admin/cms/{section}` | GET/PUT | admin | section content | section data | Already exists |
| `/api/v1/admin/announcements` | GET/POST/PUT/DELETE | admin | — | CRUD | Already exists |

## 7. Frontend Gaps (Phase 3 — Cline)

- Dynamic `generateMetadata` in `layout.tsx` (title/description/og/twitter/jsonLd/icons) from org + CMS seo.
- `manifest.ts`, `robots.ts`, `sitemap.ts` derive from org website URL or use relative/neutral values.
- `opengraph-image.tsx` derive from org name/logo; neutral graphic when no org.
- Remove all `|| "Marlow..."` / `|| "(312) 555-0147"` fallbacks in header, footer, hero, commitments, settings; use neutral empty states.
- `public-content-provider.tsx` `EMPTY_SITE_CONTENT` → null/empty defaults.
- Public site empty state: minimal "This practice has not been set up yet" when no org.
- Booking disabled with clear message when no org/services/clinics/doctors.
- Admin setup checklist screen (Organization, Location, Services, Team, Working hours, Publish).
- Admin CRUD screens (all present): Organization profile (`/admin/settings`), Clinics (`/admin/locations`), Services (`/admin/services`), Team Members with photo upload (`/admin/team`), Working hours & closures, Announcements (`/admin/announcements`), Website CMS (`/admin/website`). All need validation, toasts, optimistic refresh, delete confirmation.
- Doctor cards on `/book` use team member records.
- Changes in admin appear on public site without rebuild (already DB-backed; ensure `cache: "no-store"` / revalidation).

## 8. Phase 4 Verification (to be completed)

- [ ] Wipe dev DB, start app, confirm no org name/logo/address/phone/doctor/service appears anywhere (title, footer, dashboards).
- [ ] In admin: create org → clinic → service → doctor; confirm they appear on public site and booking flow. Edit and delete; confirm changes propagate.
- [ ] `grep -ri "marlow" frontend/ backend/ docs/ seed.js` — only matches allowed: demo seed + docs.
- [ ] Run `tsc` and `next build` — report results here.
