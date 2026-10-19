# Marlow Dental — Hardcoded Data Audit (Part G)

Automated scan of `frontend/src` for hardcoded business facts (clinic details, hours, clinicians, prices, mock data).

## Summary

| Category | Count |
| :--- | :---: |
| **MUST FIX (Unresolved hardcoded business data)** | **0** |
| **ALLOWED (Form placeholders, examples, UI text)** | **22** |
| **ASK OWNER (Policy text, legal terms)** | **0** |
| **Total Findings** | **22** |

---

## 1. MUST FIX Findings

> [!NOTE]
> **Zero MUST FIX items found.** All business records, clinic profile facts, clinicians, services, hours, and pricing are delivered dynamically from backend API endpoints.

---

## 2. ALLOWED Findings (Form Placeholders & Generic Labels)

| File | Line | Type | Matched | Snippet | Reason |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `frontend/src/content/booking-copy.ts` | 121 | Clinician Name | `Dr. Ayesha Malik` | `namePlaceholder: "e.g. Dr. Ayesha Malik",` | Form input placeholder or generic UI element |
| `frontend/src/content/booking-copy.ts` | 124 | Phone Number | `+92 300 1234567` | `phonePlaceholder: "+92 300 1234567",` | Form input placeholder or generic UI element |
| `frontend/src/content/booking-copy.ts` | 128 | Email Address | `ayesha@example.com` | `emailPlaceholder: "ayesha@example.com",` | Form input placeholder or generic UI element |
| `frontend/src/content/booking-copy.ts` | 229 | Phone Number | `+92 300 1234567` | `phonePlaceholder: "+92 300 1234567",` | Form input placeholder or generic UI element |
| `frontend/src/content/booking-copy.ts` | 233 | Email Address | `ayesha@example.com` | `emailPlaceholder: "ayesha@example.com",` | Form input placeholder or generic UI element |
| `frontend/src/app/login/page.tsx` | 150 | Email Address | `admin@marlowdental.com` | `placeholder="admin@marlowdental.com"` | Form input placeholder or generic UI element |
| `frontend/src/app/reception/call-desk/page.tsx` | 306 | Phone Number | `0300 1234567` | `placeholder="e.g. 0300 1234567 or 923001234567"` | Form input placeholder or generic UI element |
| `frontend/src/app/reception/call-desk/page.tsx` | 306 | Phone Number | `923001234567` | `placeholder="e.g. 0300 1234567 or 923001234567"` | Form input placeholder or generic UI element |
| `frontend/src/app/reception/call-desk/page.tsx` | 730 | Email Address | `sara@example.com` | `placeholder="e.g. sara@example.com"` | Form input placeholder or generic UI element |
| `frontend/src/app/reception/leads/page.tsx` | 743 | Email Address | `prospect@example.com` | `placeholder="prospect@example.com"` | Form input placeholder or generic UI element |
| `frontend/src/app/reception/messages/page.tsx` | 530 | Phone Number | `+92 300 1234567` | `placeholder="+92 300 1234567"` | Form input placeholder or generic UI element |
| `frontend/src/app/reception/patients/page.tsx` | 424 | Phone Number | `+92 300 1234567` | `placeholder="e.g. +92 300 1234567"` | Form input placeholder or generic UI element |
| `frontend/src/app/reception/patients/page.tsx` | 436 | Email Address | `patient@example.com` | `placeholder="patient@example.com"` | Form input placeholder or generic UI element |
| `frontend/src/app/admin/locations/page.tsx` | 461 | Email Address | `care@marlowdental.com` | `placeholder="e.g. care@marlowdental.com"` | Form input placeholder or generic UI element |
| `frontend/src/app/admin/locations/page.tsx` | 481 | Hours / Schedule | `8:00 AM – 6:00 PM` | `placeholder="Mon – Thu: 8:00 AM – 6:00 PM&#10;Fri: 8:00 AM – 2:00 PM&#10;Sat–Sun: Closed"` | Form input placeholder or generic UI element |
| `frontend/src/app/admin/locations/page.tsx` | 481 | Hours / Schedule | `8:00 AM – 2:00 PM` | `placeholder="Mon – Thu: 8:00 AM – 6:00 PM&#10;Fri: 8:00 AM – 2:00 PM&#10;Sat–Sun: Closed"` | Form input placeholder or generic UI element |
| `frontend/src/app/admin/messaging/page.tsx` | 509 | Phone Number | `+92 300 1234567` | `placeholder="+92 300 1234567"` | Form input placeholder or generic UI element |
| `frontend/src/app/admin/services/page.tsx` | 675 | Price / Currency | `Rs 1` | `placeholder="from Rs 1,500"` | Form input placeholder or generic UI element |
| `frontend/src/app/admin/team/page.tsx` | 481 | Clinician Name | `Dr. Full Name` | `label="Display Name (e.g. Dr. Full Name, BDS)"` | Form input placeholder or generic UI element |
| `frontend/src/app/admin/team/page.tsx` | 484 | Clinician Name | `Dr. Attending Clinician` | `placeholder="e.g. Dr. Attending Clinician, BDS"` | Form input placeholder or generic UI element |
| `frontend/src/app/admin/users/page.tsx` | 445 | Email Address | `robert.vance@marlowdental.com` | `placeholder="e.g. robert.vance@marlowdental.com"` | Form input placeholder or generic UI element |
| `frontend/src/app/admin/website/page.tsx` | 297 | Email Address | `care@marlowdental.com` | `placeholder="care@marlowdental.com"` | Form input placeholder or generic UI element |

---

## 3. Data Source Traceability Matrix (Page by Page)

| Route | Elements Rendered | Source Endpoint | Status |
| :--- | :--- | :--- | :---: |
| `/` (Home) | Clinic profile, locations, doctors, services, FAQs | `GET /api/v1/public/content`, `team`, `services`, `locations` | `live` |
| `/book` | Dynamic services, slots, clinicians, locations | `GET /api/v1/public/booking-schedule`, `booking-status` | `live` |
| `/login` | Authentication, redirect role mapping | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` | `live` |
| `/admin/*` | Users, CMS, audit logs, appointments, booking settings | `GET/POST/PUT /api/v1/admin/*` | `live` |
| `/doctor/*` | Clinician daily schedule, odontogram, SOAP notes, tasks | `GET/POST /api/v1/doctor/*` | `live` |
| `/reception/*` | Needs-action queue, check-in, ledger, waitlist, recalls | `GET/POST /api/v1/reception/*` | `live` |
