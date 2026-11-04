# Hardcoded Clinic Content Audit & Remediation (P0.2 Compliance)

## 1. Executive Summary & Incident Post-Mortem

To reduce Cumulative Layout Shift (CLS) from 0.266 to 0.001 and artificially raise the mobile Lighthouse score to 73, hardcoded clinic content was reintroduced into frontend files. This violated contract **P0.2: remove hardcoded clinic content from public frontend**.

Hardcoded clinical data (the clinic's phone number, email address, physical location, rupee service pricing, procedures, and promotional claims) made the site lie about its data source and decoupled the rendered homepage from the database CMS.

This document details the audit of all affected files, the commits that introduced the values, what was removed, the correct API sources of truth, and the test suite updates in `check-hardcoded.mjs` to ensure mechanical prevention moving forward.

---

## 2. Affected Files & Introducing Commits

| File Path | Introducing Commit | Commit Subject |
|:---|:---:|:---|
| `frontend/src/components/providers/public-content-provider.tsx` | `12d5021` | `fix(perf): eliminate hero layout shift by initializing content state and service pills` |
| `frontend/src/components/sections/hero.tsx` | `12d5021` | `fix(perf): eliminate hero layout shift by initializing content state and service pills` |
| `frontend/src/components/sections/hero.tsx` | `88addcd` | `fix(hero): restore default localized headline and description in hero section` |
| `frontend/src/components/ui/announcement-marquee.tsx` | `9a8e297` | `chore(check): allow IANA timezone strings and fix announcement fallback` |
| `frontend/src/content/ui-copy.ts` | `5681841` | `chore(ui): polish layouts, update progressive booking copy, and add comprehensive e2e test suites` |

---

## 3. Detailed File Remediation

### 3.1 `frontend/src/components/providers/public-content-provider.tsx`
- **Commit**: `12d5021`
- **What Was Removed**:
  - `practiceName: "Dr. Hira's Dental Care"`
  - `shortBrandName: "Dr. Hira's"`
  - `tagline: 'Excellence in Modern Dentistry'`
  - `phone: '051-6102977'`
  - `email: 'info@drhira.com'`
  - `address: 'Islamabad, Pakistan'`
  - `heroEyebrow: "Dr Hira's Dental Care"`
  - `heroHeading: 'Not all heroes wear capes. Some wear gloves.'`
  - `heroDescription: 'We fix problems. You keep smiling. From routine checkups to complex root canals, trust our expert team in Islamabad for a fresh, confident smile.'`
  - `heroSecondaryCtaLink: 'tel:0516102977'`
  - `startingFee: 'Rs. 2,000'`
  - `heroBadges: ['Same-Day Emergency Care', 'Pain-Free Modern Anesthesia', 'Transparent Fees, No Hidden Charges']`
- **Remediation**:
  Replaced all fields in `EMPTY_SITE_CONTENT` with empty strings (`""`) and empty arrays (`[]`). If network calls fail, the provider honestly reports `isUnavailable: true`, mounting `<TemporarilyUnavailable>` rather than showing fake cached clinic information.
- **Correct Source of Truth**:
  - Endpoint: `GET /api/v1/public/content` (`SiteContent` DTO)
  - Database table: `site_sections` (keys: `general`, `homepage`, `about`, `contact`, `footer`)
  - CMS Fields: `general.practiceName`, `general.phone`, `general.email`, `general.address`, `homepage.heroHeading`, `homepage.heroDescription`, `homepage.startingFee`, `homepage.heroBadges`

---

### 3.2 `frontend/src/components/sections/hero.tsx`
- **Commits**: `12d5021`, `88addcd`
- **What Was Removed**:
  - `DEFAULT_HERO_SERVICES` hardcoded array containing 5 dental procedures with prices:
    - `"Cleanings & Comprehensive Exam"`, `"Rs. 2,000"`
    - `"Tooth-Colored Fillings & Crowns"`, `"Rs. 4,500"`
    - `"Gentle Endodontics (Root Canals)"`, `"Rs. 8,000"`
    - `"Invisalign Clear Aligners"`, `"Rs. 150,000"`
    - `"Professional Enamel Whitening"`, `"Rs. 12,000"`
  - Fallback string: `"Not all heroes wear capes. Some wear gloves."`
  - Fallback string: `"We fix problems. You keep smiling. From routine checkups to complex root canals, trust our expert team in Islamabad for a fresh, confident smile."`
  - Hardcoded Urdu default ticks: `urduDefaultTicks`
- **Remediation**:
  - `services` initializes as `[]`. While loading, renders an honest visual skeleton (`h-6 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse` with `aria-hidden="true"`, zero text). When `getServices()` resolves, renders the active database procedures dynamically.
  - Headline and description dynamically fall back to database API fields (`content.general.practiceName`, `organization.description`, `organization.tagline`) only if CMS homepage specific copy has not been set by an administrator. Zero clinic claims hardcoded.
- **Correct Source of Truth**:
  - Services: `GET /api/v1/public/services` (`ServiceResponse[]`)
  - Content: `GET /api/v1/public/content` (`homepage.heroHeading`, `homepage.heroDescription`)
  - Organization: `GET /api/v1/public/organization` (`displayName`, `description`, `tagline`)

---

### 3.3 `frontend/src/components/ui/announcement-marquee.tsx`
- **Commit**: `9a8e297`
- **What Was Removed**:
  - Hardcoded `defaultItems`:
    - `"Welcome to Dr. Hira's Dental Care"`
    - `"Open Mon–Sat: 11:00 AM – 8:00 PM"`
    - `"Hospital-Grade Sterilization & Painless Dentistry"`
    - `"Book Online Today"`
- **Remediation**:
  When `activeAnnouncements.length === 0`, the component returns `null` instead of displaying fake fallback claims.
- **Correct Source of Truth**:
  - Endpoint: `GET /api/v1/public/announcements`
  - Database table: `announcements`

---

### 3.4 `frontend/src/content/ui-copy.ts`
- **Commit**: `5681841`
- **What Was Removed**:
  - `heroHeadingUr` and `heroDescriptionUr` dictionary keys containing `"Not all heroes wear capes. Some wear gloves."`, `"We fix problems. You keep smiling..."`, and their Urdu counterparts with `"اسلام آباد"` (Islamabad).
- **Remediation**:
  Removed keys from `UiCopyDictionary` and dictionary definitions. Hero copy is content, not static UI chrome.
- **Correct Source of Truth**:
  - Endpoint: `GET /api/v1/public/content`

---

## 4. Automated Testing Verification (`check-hardcoded.mjs`)

### 4.1 New Patterns Added
The checker script at `frontend/scripts/check-hardcoded.mjs` was strengthened with explicit regex rules:
1. `051-6102977`
2. `info@drhira\.com`
3. `Dr\.?\s*Hira`
4. `Rs\.?\s*\d{1,3},\d{3}`
5. `Not all heroes wear capes`
6. `We fix problems`
7. `(?:\+?92\|0092)[\s.-]?[0-9]{2,4}[\s.-]?[0-9]{6,8}`
8. `"Islamabad"` added to forbidden `CITY_NAMES`

### 4.2 Failure Verification
Added `const TEST_CHECK = "Dr. Hira";` to `src/app/page.tsx`:
```
$ node scripts/check-hardcoded.mjs
FAIL: src\app\page.tsx:24 - hardcoded clinic brand 'Dr. Hira'
  const TEST_CHECK = "Dr. Hira";

1 hardcoded content issue(s) found.
```
Result: Exited with code 1.

### 4.3 Success Verification
After removing the test string:
```
$ node scripts/check-hardcoded.mjs
No hardcoded clinic content found. Check passed.
```
Result: Exited with code 0.
