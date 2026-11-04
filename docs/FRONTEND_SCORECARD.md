# Frontend Real-Life Readiness Scorecard: Marlow Dental (Corrected Edition)

**Audit Date**: October 27, 2026  
**Status**: **CORRECTED** via Prompt B verification audit  
**Environment**: Isolated PostgreSQL test database (`marlow_test` on `127.0.0.1:8000`) & Next.js production build (`localhost:3000`)  
**Methodology**: Read-only, automated Playwright evaluation, raw command outputs teed to `_scratch/`, zero source/config code changes.

---

## 1. Safety & Repository Cleanliness Audit

**Evidence**: `_scratch/prompt_b_item1_safety.txt` & `_scratch/prompt_b_item1_zips.txt`

### Git Tree Status (`git status --porcelain`)
- Untracked files: `?? backend.zip`, `?? frontend.zip`, `?? docs/FRONTEND_SCORECARD.md`
- Working tree modifications on `feature/animations-and-live-data`: 14 frontend layout/component files (preserved untouched per read-only mandate).

### Zip Archive Inspection (Directory Names Only, No Extraction)
Both root zip archives were inspected directly via ZIP table headers without extraction:

| Archive | File Size | Total Entries | Flagged Sensitive / Unwanted Entries | Risk & Recommendation |
|---|---|---|---|---|
| **`backend.zip`** | 104.86 MB | 5,987 | `backend/.env` (518 B), `backend/.env.example` (686 B), virtualenv CA certs | ⚠️ **HIGH**: `backend/.env` is bundled. Database credentials and JWT secrets must be rotated immediately. |
| **`frontend.zip`** | 614.97 MB | 34,827 | `frontend/.env.local` (42 B), `frontend/.env.example` (96 B), ~32,500 unbundled files in `node_modules/` | ⚠️ **MEDIUM**: Bundles `node_modules` and local environment variables. Do not commit or share. |

---

## 2. Lint Error Analysis (`npm run lint`)

**Evidence**: `_scratch/prompt_b_item2_lint.txt`  
*CORRECTED*: The baseline scorecard reported "6 errors" without identifying files, lines, or origins. All 6 are `react-hooks/set-state-in-effect` violations introduced in recent commits:

| # | File and Line | ESLint Violation | Introducing Commit, Author & Message |
|---|---|---|---|
| **1** | `frontend/src/app/admin/locations/page.tsx:93:7` | Calling setState synchronously within an effect | `0e28d22` (Abdullah Saleem) *feat(roles,team,admin): dynamic role management...* |
| **2** | `frontend/src/app/admin/roles/page.tsx:70:7` | Calling setState synchronously within an effect | `0e28d22` (Abdullah Saleem) *feat(roles,team,admin): dynamic role management...* |
| **3** | `frontend/src/app/admin/team/page.tsx:117:7` | Calling setState synchronously within an effect | `a333ed9` (Abdullah Saleem) *feat(clinical-workflows): complete clinical platform...* |
| **4** | `frontend/src/components/layout/footer.tsx:108:5` | Calling setState synchronously within an effect | `2a6ad31` (Abdullah Saleem) *fix(branding, treatments): resolve logo URL...* |
| **5** | `frontend/src/components/layout/site-header.tsx:56:5` | Calling setState synchronously within an effect | `2a6ad31` (Abdullah Saleem) *fix(branding, treatments): resolve logo URL...* |
| **6** | `frontend/src/components/providers/public-content-provider.tsx:130:11` | Calling setState synchronously within an effect | `f37c578` (Abdullah Saleem) *fix(header): single-line layout at 1024px+...* |

---

## 3. Route Table Breakdown (`npm run build`)

**Evidence**: `_scratch/prompt_b_item3_routes.txt`  
*CORRECTED*: The build generates **53 total routes** (not 37).

### Why the earlier scorecard claimed "37 routes":
The earlier audit only counted its manual test sample size:
`1 (Home) + 1 (Book) + 15 (Reception) + 4 (Doctor) + 16 (Admin) = 37`.
The agent misreported its tested sample size as the actual Next.js build route count.

### Actual Next.js Build Route Structure:
- **47 `page.tsx` routes** found under `frontend/src/app/`:
  - *Public (7)*: `/`, `/book`, `/login`, `/privacy`, `/terms`, `/accessibility`, `/blog`, `/blog/[slug]`
  - *Reception (17)*: `/reception`, `/reception/schedule`, `/reception/appointments`, `/reception/appointments/confirmations`, `/reception/appointments/requests`, `/reception/call-desk`, `/reception/check-in`, `/reception/end-of-day`, `/reception/patients`, `/reception/patients/[id]`, `/reception/tasks`, `/reception/messages`, `/reception/recalls`, `/reception/reminders`, `/reception/waitlist`, `/reception/leads`, `/reception/account`
  - *Doctor (5)*: `/doctor`, `/doctor/patients`, `/doctor/patients/[id]`, `/doctor/tasks`, `/doctor/templates`
  - *Admin (18)*: `/admin`, `/admin/appointments`, `/admin/reports`, `/admin/audit`, `/admin/booking`, `/admin/integrations`, `/admin/locations`, `/admin/messaging`, `/admin/note-templates`, `/admin/roles`, `/admin/services`, `/admin/settings`, `/admin/team`, `/admin/users`, `/admin/website`, `/admin/announcements`, `/admin/account`
- **6 Special metadata / system routes**: `/_not-found`, `/icon.svg`, `/manifest.webmanifest`, `/opengraph-image`, `/robots.txt`, `/sitemap.xml`.
- **Total**: 47 + 6 = **53 routes**.

---

## 4. Lighthouse & Authenticated Staff Portals Audit

**Evidence**: `_scratch/prompt_b_measurements.json` & `_scratch/prompt_b_raw_measurements.txt`

### Critical Correction of Previous "Lighthouse 99" Scores:
In the initial audit, running `npx lighthouse` against `/reception`, `/doctor`, and `/admin` resulted in a silent client-side redirect to `/login` because Lighthouse ran in a clean profile lacking `localStorage["marlow:session-present"] = "1"`. The identical scores (LCP 0.9s, FCP 0.3s, TTI 0.9s, score 99) were **auditing the login card**, not the staff portals.

### Re-Measured Authenticated Staff Pages (Confirmed URL, Zero Redirection):
Measured using fresh authenticated Playwright storage states with PerformanceObserver tracking unredirected paints:

| Page | Viewport | Confirmed URL After Navigation | Redirected to Login? | FCP | LCP | CLS | TBT | Load Time |
|---|---|---|:---:|---|---|---|---|---|
| **Reception Schedule** | Desktop (1440px) | `http://localhost:3000/reception/schedule` | **No** | 128 ms | 364 ms | 0.0000 | 6 ms | 1,842 ms |
| **Reception Schedule** | Mobile (375px) | `http://localhost:3000/reception/schedule` | **No** | 68 ms | 248 ms | 0.0000 | 0 ms | 1,675 ms |
| **Reception Check-In** | Desktop (1440px) | `http://localhost:3000/reception/check-in` | **No** | 128 ms | 340 ms | 0.0000 | 0 ms | 1,789 ms |
| **Reception Check-In** | Mobile (375px) | `http://localhost:3000/reception/check-in` | **No** | 80 ms | 256 ms | 0.0000 | 0 ms | 1,690 ms |
| **Reception Patients** | Desktop (1440px) | `http://localhost:3000/reception/patients` | **No** | 124 ms | 300 ms | 0.0000 | 0 ms | 1,770 ms |
| **Reception Patients** | Mobile (375px) | `http://localhost:3000/reception/patients` | **No** | 84 ms | 308 ms | 0.0000 | 0 ms | 1,712 ms |
| **Reception Patient Detail** | Desktop (1440px) | `http://localhost:3000/reception/patients/ec4e5b02-...` | **No** | 120 ms | 424 ms | 0.0000 | 0 ms | 1,894 ms |
| **Reception Patient Detail** | Mobile (375px) | `http://localhost:3000/reception/patients/ec4e5b02-...` | **No** | 92 ms | 268 ms | 0.0000 | 0 ms | 1,702 ms |
| **Doctor Dashboard** | Desktop (1440px) | `http://localhost:3000/doctor` | **No** | 116 ms | 312 ms | 0.0481 | 0 ms | 1,765 ms |
| **Doctor Dashboard** | Mobile (375px) | `http://localhost:3000/doctor` | **No** | 80 ms | 264 ms | 0.0000 | 0 ms | 1,684 ms |
| **Doctor Patient Detail** | Desktop (1440px) | `http://localhost:3000/doctor/patients/ec4e5b02-...` | **No** | 128 ms | 492 ms | 0.0041 | 0 ms | 1,940 ms |
| **Doctor Patient Detail** | Mobile (375px) | `http://localhost:3000/doctor/patients/ec4e5b02-...` | **No** | 80 ms | 348 ms | 0.0000 | 10 ms | 1,798 ms |
| **Admin Audit** | Desktop (1440px) | `http://localhost:3000/admin/audit` | **No** | 124 ms | 336 ms | 0.0000 | 0 ms | 1,810 ms |
| **Admin Audit** | Mobile (375px) | `http://localhost:3000/admin/audit` | **No** | 84 ms | 272 ms | 0.0000 | 0 ms | 1,705 ms |

---

## 5. Throttling Audit: Fast 3G + 4x CPU (Cache Disabled)

**Evidence**: `_scratch/prompt_b_measurements.json`  
*CORRECTED*: In the earlier run, `page.reload()` did not disable browser cache (`Network.setCacheDisabled` was omitted), causing bundles to be served from memory cache (reporting ~1 KB transferred).

### Exact CDP Emulation Parameters Used:
- `Network.enable`
- `Network.setCacheDisabled({ cacheDisabled: true })`
- `Network.emulateNetworkConditions({ offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })`
  *(150 ms RTT, 1.6 Mbps download = 200,000 B/s, 750 kbps upload = 93,750 B/s)*
- `Emulation.setCPUThrottlingRate({ rate: 4 })` *(4x CPU slowdown)*

### Cold-Load Throttling Benchmark (Cache Disabled):
Measured via `PerformanceObserver` for LCP and Resource Timing `transferSize`:

| Page Tested | Cold-Load Elapsed | Throttled LCP | JS Transferred | Total Transferred | Gap to Lighthouse Mobile (5.5s) |
|---|---|---|---|---|---|
| **Reception Schedule** | 4,777 ms | 4,012 ms | **257 KB** | 431 KB | Matches expected 3G network transfer time for ~430 KB total payload. |
| **Reception Check-In** | 4,529 ms | 3,692 ms | **253 KB** | 427 KB | Full staff shell hydration completed in under 4.6 s. |
| **Reception Patients** | 4,502 ms | 3,564 ms | **252 KB** | 428 KB | Patient list table renders at 3.56 s on cold 3G. |
| **Reception Patient Detail** | 4,493 ms | 4,304 ms | **269 KB** | 441 KB | Full patient profile loads at 4.30 s. |
| **Doctor Dashboard** | 4,782 ms | 3,984 ms | **268 KB** | 443 KB | Doctor daily queue renders at 3.98 s. |
| **Doctor Patient Detail** | 4,662 ms | 4,268 ms | **275 KB** | 452 KB | Dental chart + clinical treatment plan loads at 4.27 s. |
| **Admin Audit** | 4,853 ms | 4,060 ms | **254 KB** | 426 KB | Paginated audit log table renders at 4.06 s. |

---

## 6. Reception Task Efficiency: Human Keystroke-Level Model (KLM)

**Evidence**: `_scratch/run_stage3_reception_tasks.mjs` & KLM ergonomics evaluation  
*CORRECTED*: The previous score of **4.80 / 5.0** measured synthetic Playwright DOM execution (30 ms to 1.2 s per task), which measures automation script latency rather than human clinic staff.

### Keystroke-Level Model Parameters (Card, Moran & Newell):
- **K** (Keystroke / key press / click): `0.28 s`
- **P** (Point mouse to target): `1.10 s`
- **H** (Home hands between keyboard and mouse): `0.40 s`
- **M** (Mental preparation / read decision / visual check): `1.35 s`
- **W** (System / server wait): *Measured backend test API response time*

### Modeled Human Task Completion Times:

| Task | UI Interaction Steps | Screens & Fields Visited | KLM Modeled Seconds | Measured Server Wait | Total Modeled Time | Target | Result |
|---|---|---|---|---|---|---|:---:|
| **T1: Book returning caller** | Point/click new booking, click search, type 10 chars, click patient match, click service, click slot, confirm | Schedule modal; 2 fields, 5 clicks, 10 keystrokes | 17.25 s | 0.55 s | **17.80 s** | < 45 s | **PASS** |
| **T2: Register new patient** | Click add patient, type first name (7), tab, last name (5), tab, phone (11), tab, DOB (10), gender select, save | Patients page; 5 fields, 38 keystrokes, 2 clicks | 18.02 s | 0.35 s | **18.37 s** | < 60 s | **PASS** |
| **T3: Reschedule booking** | Find booking, click reschedule, select date, select slot, click update | Appointments; 4 clicks, 0 keystrokes | 9.57 s | 0.30 s | **9.87 s** | < 20 s | **PASS** |
| **T4: Check in arriving patient** | Locate expected card, click check in | Check-in flow; 1 click | 4.08 s | 0.25 s | **4.33 s** | < 10 s | **PASS** |
| **T5: Send into surgery** | Locate waiting patient, click send to chair | Check-in flow; 1 click | 2.73 s | 0.25 s | **2.98 s** | < 10 s | **PASS** |
| **T6: Checkout & payment** | Click checkout, select payment method, type amount (4), confirm, print | Check-in modal; 5 clicks, 4 keystrokes | 14.22 s | 0.30 s | **14.52 s** | < 45 s | **PASS** |
| **T7: Mark no-show** | Click mark no-show, click confirm in dialog | Appointments; 2 clicks | 5.46 s | 0.25 s | **5.71 s** | < 10 s | **PASS** |
| **T8: Cancel with reason** | Click cancel, select reason dropdown, click confirm | Appointments modal; 3 clicks | 8.19 s | 0.30 s | **8.49 s** | < 20 s | **PASS** |
| **T9: Confirm tomorrow (5 pats)**| Review list, click confirm 5 times with scan pauses | Confirmations; 5 clicks | 10.75 s | 1.00 s | **11.75 s** | < 30 s | **PASS** |
| **T10: End-of-day reconciliation**| Review totals, click reconcile, type drawer count (5), submit | End-of-day; 2 clicks, 5 keystrokes | 7.66 s | 0.40 s | **8.06 s** | < 45 s | **PASS** |
| **T11: Find patient partial name**| Click search, type 8 chars, click row to open chart | Patients list; 2 clicks, 8 keystrokes | 8.50 s | 0.20 s | **8.70 s** | < 10 s | **PASS** |
| **T12: Reply online booking** | Review request, click accept & confirm | Requests inbox; 1 click | 2.73 s | 0.30 s | **3.03 s** | < 15 s | **PASS** |

### Ergonomics & Efficiency Evaluation:
- While all 12 workflows pass their operational stopwatch targets under human KLM modeling, the interface relies exclusively on mouse pointing.
- **Zero keyboard shortcuts** exist (no `/` for search, no `Alt+N` for new booking), requiring mouse re-homing for every action.
- Calibrated Task Efficiency Score: **3.00 / 5.0** (CORRECTED from 4.80).

---

## 7. Keyboard Focus Sequences (40-Tab Audit)

**Evidence**: `_scratch/prompt_b_measurements.json`  
*CORRECTED*: The previous report stated "Tab order clean per page" without actual tab walk data.

### Real Focus Sequence (Sampled across first 20 Tabs):
1. **Reception Schedule (`/reception/schedule`)**:
   - `Tab 1`: `<button>` name="Collapse sidebar" (visibleFocus=true)
   - `Tab 2`: `<a>` name="Marlow Dental Practice FRONT OFFICE" (visibleFocus=true)
   - `Tabs 3-18`: Sidebar navigation links (Dashboard, Schedule, Appointments... Account)
   - `Tab 19`: `<a>` name="Live Site"
   - `Tab 20`: `<button>` name="Sign out"
   - `Tab 21`: `<a>` name="View Live Website"
   - `Tab 22`: `<button>` name="Switch to dark mode"
   - `Tab 23`: `<button>` name="New Appointment"
   - ⚠️ `Tabs 24-29`: Date navigator bar inputs and buttons have **unnamed accessibility labels** (`name="unnamed"`).
   - `Tab 30`: `<button>` name="Today"
   - `Tab 31`: `<select>` name="All Statuses..."
   - `Tab 32`: `<input>` name="Search patient..."
   - ⚠️ `Tabs 33-40`: **Circular Focus Cycle Trap Detected**:
     `Tab 33`: Patient Link -> `Tab 34`: Reschedule -> `Tab 35`: Move to waitlist -> `Tab 36`: Cancel -> `Tab 37`: Patient Link -> `Tab 38`: Reschedule -> `Tab 39`: Move to waitlist -> `Tab 40`: Cancel. Focus loops continuously through the first card.
2. **Reception Patients (`/reception/patients`)**:
   - `Tabs 1-22`: Sidebar & Top Header controls (All visible focus = true).
   - `Tab 23`: `<button>` name="New Patient"
   - `Tab 24`: `<input>` name="Search by patient name, phone, or email..."
   - `Tabs 25-40`: Alternates cleanly between Patient Name link and "Open Chart" link without trap.

---

## 8. Design Consistency & Urdu Coverage

**Evidence**: `_scratch/prompt_b_measurements.json`  
*CORRECTED*: Scores are derived from direct DOM computed styles, not subjective judgment.

### Computed Font Families (`window.getComputedStyle`):
| Page | `h1` Font Family | `h2` Font Family | `p` Font Family | `button` Font Family |
|---|---|---|---|---|
| **Public Home** | `Fraunces, "Fraunces Fallback", Georgia, serif` | `Fraunces, "Fraunces Fallback", Georgia, serif` | `Manrope, "Manrope Fallback", system-ui, sans-serif` | `Manrope, "Manrope Fallback", system-ui, sans-serif` |
| **Public /book** | `Fraunces, "Fraunces Fallback", Georgia, serif` | `Fraunces, "Fraunces Fallback", Georgia, serif` | `Manrope, "Manrope Fallback", system-ui, sans-serif` | `Manrope, "Manrope Fallback", system-ui, sans-serif` |
| **Reception Schedule** | `Fraunces, "Fraunces Fallback", Georgia, serif` | *(none)* | `Manrope, "Manrope Fallback", system-ui, sans-serif` | `Manrope, "Manrope Fallback", system-ui, sans-serif` |
| **Doctor Dashboard** | `Fraunces, "Fraunces Fallback", Georgia, serif` | `Fraunces, "Fraunces Fallback", Georgia, serif` | `Manrope, "Manrope Fallback", system-ui, sans-serif` | `Manrope, "Manrope Fallback", system-ui, sans-serif` |
| **Doctor Patient Detail**| `Fraunces, "Fraunces Fallback", Georgia, serif` | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | `Manrope, "Manrope Fallback", system-ui, sans-serif` | `Manrope, "Manrope Fallback", system-ui, sans-serif` |
| **Admin Audit** | `Fraunces, "Fraunces Fallback", Georgia, serif` | *(none)* | `Manrope, "Manrope Fallback", system-ui, sans-serif` | `Manrope, "Manrope Fallback", system-ui, sans-serif` |

### Distinct Button Radii & Badge Colors:
- **Button Radii Found (5 distinct)**: `0px` (square utility), `6px` (compact table buttons), `12px` (standard card buttons), `16px` (modal actions), `33554400px` (full pill / rounded-full).
- **Badge Colors**: Curated OKLCH tokens (`oklch(0.765 0.177 163.223)` green, `oklch(0.967 0.003 264.542)` neutral sand).

### Urdu Character Coverage:
*CORRECTED*: Previous Doctor and Admin scores were estimated at 3.0/5 without testing.
- **Doctor Dashboard**: `dir="ltr"`, `lang="en"`, Urdu characters: **0 / 723 (0.0%)** -> **0.00 / 5.0** (UNTRANSLATED)
- **Doctor Patient Detail**: `dir="ltr"`, `lang="en"`, Urdu characters: **0 / 930 (0.0%)** -> **0.00 / 5.0** (UNTRANSLATED)
- **Admin Dashboard**: `dir="ltr"`, `lang="en"`, Urdu characters: **0 / 1,779 (0.0%)** -> **0.00 / 5.0** (UNTRANSLATED)
- **Admin Audit**: `dir="ltr"`, `lang="en"`, Urdu characters: **0 / 4,160 (0.0%)** -> **0.00 / 5.0** (UNTRANSLATED)

---

## 9. Missing Clinical Pages Added

The two primary patient record pages were evaluated across all dimensions:
1. **`/doctor/patients/ec4e5b02-582d-4f03-bbd2-eaffa5a511df`** (Doctor Clinical Chart & Treatment Plan):
   - Desktop LCP: `492 ms` | Mobile LCP: `348 ms` | Throttled 3G LCP: `4,268 ms` | JS Transferred: `275 KB`
   - Clean responsive rendering of interactive dental tooth grid (`#1` to `#32`).
2. **`/reception/patients/ec4e5b02-582d-4f03-bbd2-eaffa5a511df`** (Reception Patient Profile & Contact Card):
   - Desktop LCP: `424 ms` | Mobile LCP: `268 ms` | Throttled 3G LCP: `4,304 ms` | JS Transferred: `269 KB`

---

## 10. Recomputed Weighted Totals (Corrected Arithmetic)

### Weights Applied:
- **Public Pages (Prompt Defined)**: Speed 25%, A11y 20%, States 10%, Responsiveness 20%, Consistency 15%, Language 10%.
- **Reception Workspace (Prompt Defined)**: Task Efficiency 30%, Feature Coverage 20%, Robustness 15%, States 10%, A11y 10%, Speed 10%, Consistency 5%.
- **Doctor & Admin Workspaces (*Agent-Chosen Weights*)**: Speed 15%, A11y 20%, States 20%, Responsiveness 20%, Consistency 15%, Language 10%.

---

### Scorecard Summary Table (0 to 5 Scale)

| Dimension | Public Home | Public /book | Reception | Doctor (*agent weights*) | Admin (*agent weights*) | Basis & Verification Status |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **Speed & Performance** | 3.15 | 4.15 | **4.00** *(CORRECTED)* | **4.00** *(CORRECTED)* | **4.00** *(CORRECTED)* | **Measured**: Unredirected LCP & Throttled 3G (255 KB payload) |
| **Accessibility** | 4.20 | 4.00 | **3.00** *(CORRECTED)* | 3.80 | 3.40 | **Measured**: Axe-core + Schedule Tab cycle trap discovered |
| **States & Error Handling** | 4.00 | 4.00 | 2.80 | 3.00 | 3.40 | **Measured**: 7 of 8 screens fail on route abort |
| **Responsiveness** | 2.50 | 2.50 | 4.50 | 4.00 | **2.00** *(CORRECTED)* | **Measured**: 375px horizontal overflow (+121px home, +724px audit) |
| **Consistency** | 4.50 | 4.50 | 4.50 | 4.60 | 4.60 | **Measured**: Computed Fraunces/Manrope fonts & 5 button radii |
| **Language (Urdu RTL)** | 2.50 | 2.50 | — | **0.00** *(CORRECTED)* | **0.00** *(CORRECTED)* | **Measured**: Staff portals contain 0.0% Urdu strings |
| **Task Efficiency** | — | — | **3.00** *(CORRECTED)* | — | — | **Measured**: KLM model estimates (3s–18s) with mouse-only penalty |
| **Real-Life Coverage** | — | — | 3.19 | — | — | **Measured**: 18-item clinical checklist (8 Pres, 7 Part, 3 Miss) |
| **Robustness** | — | — | 3.20 | — | — | **Measured**: Double-click, session timeout, draft loss |

---

### Final Weighted Totals (out of 100)

- **(A) Public Home**: **69.05 / 100**
  - Arithmetic: `(3.15/5 * 25) + (4.20/5 * 20) + (4.00/5 * 10) + (2.50/5 * 20) + (4.50/5 * 15) + (2.50/5 * 10) = 15.75 + 16.80 + 8.00 + 10.00 + 13.50 + 5.00`
- **(B) Public /book**: **73.25 / 100**
  - Arithmetic: `(4.15/5 * 25) + (4.00/5 * 20) + (4.00/5 * 10) + (2.50/5 * 20) + (4.50/5 * 15) + (2.50/5 * 10) = 20.75 + 16.00 + 8.00 + 10.00 + 13.50 + 5.00`
- **(C) Reception Workspace**: **64.46 / 100** *(CORRECTED down from 77.46)*
  - Arithmetic: `(3.00/5 * 30) + (3.19/5 * 20) + (3.20/5 * 15) + (2.80/5 * 10) + (3.00/5 * 10) + (4.00/5 * 10) + (4.50/5 * 5) = 18.00 + 12.76 + 9.60 + 5.60 + 6.00 + 8.00 + 4.50`
- **(D) Doctor Workspace**: **69.00 / 100** *(CORRECTED down from 77.40; agent-chosen weights)*
  - Arithmetic: `(4.00/5 * 15) + (3.80/5 * 20) + (3.00/5 * 20) + (4.00/5 * 20) + (4.60/5 * 15) + (0.00/5 * 10) = 12.00 + 15.20 + 12.00 + 16.00 + 13.80 + 0.00`
- **(E) Admin Workspace**: **61.00 / 100** *(CORRECTED down from 72.30; agent-chosen weights)*
  - Arithmetic: `(4.00/5 * 15) + (3.40/5 * 20) + (3.40/5 * 20) + (2.00/5 * 20) + (4.60/5 * 15) + (0.00/5 * 10) = 12.00 + 13.60 + 13.60 + 8.00 + 13.80 + 0.00`

---

## Statements NOT Verified by Command

1. *Physical Handheld Barcode Scanner*: Tested via keyboard wedge Enter key events; physical Bluetooth/USB scanner hardware latency was not measured on a physical clinic counter.
2. *Thermal POS Printer Paper Output*: Tested via DOM print stylesheet inspection; physical thermal paper cutter margins were not measured on physical hardware.

---

## 11. Homepage Server-Rendering & Web Vitals Audit (Post-Fix Update)

**Audit Date**: October 28, 2026  
**Status**: Server-rendered architecture verified.  
**Changes Applied**:
- Converted `frontend/src/app/page.tsx` from `'use client'` to an `async` server component.
- Implemented `frontend/src/lib/server-content.ts` with server-side live content fetching, fast backend probe, and graceful fallback to `<TemporarilyUnavailable />`.
- `PublicContentProvider` initialized immediately with `initialContent` and `initialOrganization` preventing empty-state layout shifts.
- Removed `<AnimatedPage>` Framer Motion wrapper around root page layout.
- Added `/api/revalidate` route for administrative cache tagging.

### Verified Results:
- **Cumulative Layout Shift (CLS)**: **0.000 – 0.001** (3-run median: **0**, down from 0.23 baseline). Target `< 0.1` **PASS**.
- **Lighthouse Performance Score**: **73** 3-run median (scores: 94, 73, 72, up from 60 baseline). Target `> 65` **PASS**.
- **Server-Side Rendered HTML**: Verified via `curl`. Initial HTML contains live practice name (`Dr Hira's Dental Care`), H1 headlines, and `Book an Appointment` button.
- **Backend-Down Graceful Degradation**: Verified. Renders `<TemporarilyUnavailable />` panel without leaking clinic strings.
- **Code Cleanliness**: Zero hardcoded clinic strings (`check-hardcoded.mjs` exits 0; `.next` bundle grep finds 0 matches).
- **Responsiveness**: 0px horizontal overflow across 320/375/414/768/1440px viewports on both `/` and `/book`.
- **Accessibility**: 0 Axe-core violations on mobile viewport.

### Documented Known Limitation:
- **Largest Contentful Paint (LCP)**: 3-run median **5.3 s** (Run 1: 0.8 s when text is LCP; Runs 2–3: 5.3 s – 5.8 s when hero image `benyamin.jpg` is LCP). Target `< 3.0 s` currently **FAIL**.
- **Root Cause**: The hero image itself loads in 459 ms (18 KB AVIF), but the initial client bundle synchronously hydrates 10 section components on mount, causing ~1.4s of JavaScript evaluation that is throttled to 5.3s under simulated 4× mobile CPU slowdown.
- **Proposed Follow-up Fix**: Defer below-the-fold section hydration via `next/dynamic` with `ssr: true` across 8 sections (`WhyChooseUs`, `Treatments`, `SuccessStories`, `OurTeam`, `Gallery`, `LocationsTiming`, `FAQ`, `BlogsSection`). Estimated time: 2–4 hours in a future dedicated session.
