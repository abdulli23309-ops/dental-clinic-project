# Urdu Coverage Audit — Marlow Dental Public Website

## Executive Summary

- **Homepage (`/`) Coverage:** **20.7%** (1,963 Urdu characters visible in `ur` mode vs. 9,477 English characters in `en` mode).
- **Booking Flow (`/book`) Coverage:** **27.6%** (277 Urdu characters visible in `ur` mode vs. 1,004 English characters in `en` mode).
- **Core Finding:** While UI navigation labels, buttons, headers, and section static titles are translated in `ui-copy.ts` and `booking-copy.ts`, **100% of live CMS-managed content** (service names, descriptions, pricing notes, doctor profiles, testimonials, clinic addresses, and blog articles) is served in English only from the backend database.

---

## 1. UI Copy Coverage Audit (`ui-copy.ts` & `booking-copy.ts`)

### Status
- **Dictionary Completeness:** 100% of defined keys in `UiCopyDictionary` (75 keys) and `BookingCopy` (38 keys) contain Urdu strings.
- **RTL & Typography:** `html[dir="rtl"]` and `html[lang="ur"]` are correctly toggled on locale switch.

### UI Copy Gaps (Strings still in English or Untranslated)
1. **Cookie Consent Banner (`cookie-banner.tsx`):**
   - "Privacy & Site Cookies"
   - "We use essential cookies to maintain your appointment scheduling progress and remember your theme preferences..."
   - "Accept Essential Cookies", "Decline Optional Analytics"
2. **Dynamic Search Dialog (`search-dialog.tsx`):**
   - Placeholder: `"Search treatments, doctors, clinics, questions..."`
   - Keyboard hint: `"ESC to close"`
   - Empty state: `"No matching clinical services or doctors found"`
3. **Floating Mobile Action Bar (`floating-action.tsx`):**
   - Quick phone label formatting and dial button tooltips.
4. **Toast Notifications (`sonner`):**
   - "Link copied to clipboard", "Failed to book appointment", "Please select a time slot".

---

## 2. CMS Content Coverage Audit (Backend Data)

All content returned by `/api/v1/public/*` is currently stored in single-column English tables. In `ur` mode, the frontend renders English CMS text directly inside Urdu page containers:

| Section | CMS Field | Current Output in `ur` Mode | Missing Urdu Field |
| :--- | :--- | :--- | :--- |
| **Hero** | `heroHeading` | English fallback or English CMS text | `heroHeading_ur` |
| **Hero** | `heroDescription` | English CMS text | `heroDescription_ur` |
| **Hero** | `heroBadges` | English CMS array | `heroBadges_ur` |
| **Services / Treatments** | `service.title` | `"Cleanings & Comprehensive Exam"`, `"Invisalign Clear Aligners"` | `title_ur` |
| **Services / Treatments** | `service.shortDesc` | English clinical descriptions | `shortDesc_ur` |
| **Services / Treatments** | `service.duration` | `"45 min"`, `"60 min"` | Localized duration formatter |
| **Our Team** | `doc.displayName` | `"Dr. Hira"`, `"Dr. Bilal"` | `displayName_ur` |
| **Our Team** | `doc.role` / `title` | `"Director"`, `"Associate Dentist"` | `role_ur` |
| **Our Team** | `doc.bio` / `biography` | Multi-paragraph English biography | `bio_ur` |
| **Gallery** | `photo.caption` | English photo captions | `caption_ur` |
| **Blogs** | `post.title`, `excerpt` | English dental health articles | `title_ur`, `excerpt_ur` |
| **Locations & Timing** | `clinic.addressLine1` | English street addresses | `addressLine1_ur` |
| **Locations & Timing** | `clinic.city` | `"Islamabad"` | `city_ur` |
| **Reviews** | `review.comment` | English patient feedback | `comment_ur` |

---

## 3. Booking Flow Audit (`/book`)

### Progress & Step Labels
- Step 1 (Contact): Form labels (Name, Phone, Email) are in Urdu.
- Step 2 (Service): **Service names are 100% English** because they originate from `/api/v1/public/services`.
- Step 3 (Clinic / Location): Clinic names and addresses are English.
- Step 4 (Doctor & Time): Doctor names, specialties, and schedule slots are English.
- Step 5 (Confirmation): Confirmation modal headers are in Urdu, but the summary recap (Service: Cleanings, Clinic: Islamabad) displays English CMS data.

---

## 4. Proposed CMS Architecture for Multi-Language Support

### Option A: Suffix Fields on Existing Tables (Recommended)
Add nullable `_ur` columns to existing CMS tables (`services`, `doctors`, `site_sections`, `gallery_photos`, `blog_posts`):
```sql
ALTER TABLE services ADD COLUMN title_ur VARCHAR(255);
ALTER TABLE services ADD COLUMN short_desc_ur TEXT;
ALTER TABLE services ADD COLUMN is_reviewed_ur BOOLEAN DEFAULT FALSE;
```
- **Pros:**
  - Zero architectural disruption: no joins or separate table migrations.
  - Minimal backend changes; Pydantic models simply declare `title_ur: Optional[str] = None`.
  - Frontend fallback is trivial: `service.title_ur || service.title`.
  - Admin UI displays English and Urdu side-by-side in the existing editor forms.
- **Cons:**
  - Adds columns to existing tables; not indefinitely scalable beyond 2 languages (sufficient for English + Urdu).

### Option B: Normalized Translations Table
Create a generic `content_translations` table:
`id, entity_type, entity_id, locale, field_name, translation_text, is_reviewed, reviewed_at`
- **Pros:** Unlimited languages.
- **Cons:** Requires complex SQL joins or separate API lookups, complicates Admin form state, and creates higher latency on public endpoints.

### Recommendation
**Adopt Option A.** It is the smallest viable, robust implementation that matches the KISS and YAGNI engineering principles of Marlow Dental.

---

## 5. Native-Speaker Review Workflow (Safety Requirement)

To prevent unvetted or awkward machine translations from being shown to patients:
1. **Database Flag:** Every translatable model includes `is_reviewed_ur` (`BOOLEAN DEFAULT FALSE`).
2. **Admin UI Gate:**
   - In Admin CMS (Services, Team, Announcements, Site Content), provide an explicit checkbox:
     `[ ] Reviewed and approved by native Urdu speaker`
   - When unchecked, public Urdu requests fallback to English or to the verified default dictionary rather than unreviewed text.
3. **Policy:** No automated machine-translation API (Google Translate, DeepL) may write directly to live public columns without admin review verification.
