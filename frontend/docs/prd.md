# Product Requirements Document (PRD) — Marlow Dental

## 1. Product Overview
Marlow Dental is a small, independent dental practice located in Lincoln Park, Chicago (214 Alder Street, Suite 3). The practice is owned and operated by Dr. Sarah Marlow, DDS.

The website serves as the primary digital front door for prospective and existing patients. Its purpose is to clearly communicate practice philosophy, provide transparent fee schedules, answer patient questions honestly, and guide visitors through requesting an appointment.

## 2. Target Audience & Visitor Journey
- **Audience**: Residents and workers in Lincoln Park, Old Town, Lakeview, and the greater Chicago area seeking an unhurried, independent dentist.
- **Key Visitor Mindset**: Many visitors have dental anxiety, have had rushed experiences at corporate dental chains, or have experienced surprise bills. They want reassurance, upfront pricing, and clarity before booking.
- **Functional Scope**:
  - Marketing & Practice Discovery: Homepage (`/`) covering doctor background, clinical standards, transparent cash pricing, office location/hours, and common FAQs.
  - Appointment Request Flow: Dedicated multi-step wizard (`/book`) allowing patients to select a service, date, time slot, and provide contact details.
  - Compliance & Practice Policies: Dedicated structured pages for `/privacy`, `/hipaa`, `/accessibility`, and `/terms`.
  - Non-Goals: No e-commerce, no patient portal login, no 3D product rendering or WebGL spectacle.

## 3. Core Requirements

### 3.1 Content & Truthfulness Standards
- **Zero Fabricated Content**: Absolutely no invented reviews, fake patient names, fake ratings, or unverified statistics.
- **Specific Clinical Guarantees**:
  - One dentist, start to finish: Dr. Marlow personally conducts every exam, cleaning, and restoration.
  - Upfront written estimates: Transparent cash fee schedules alongside PPO benefit explanations.
  - Same-week availability and daily reserved emergency triage slots.
- **Tone & Writing**: Calm, direct, human editorial voice. No em-dashes, no AI clichés, no generic marketing hype.

### 3.2 Navigation & Layout
- **Sticky Header**: Compact on scroll, displays real-time Chicago open/closed office status, search trigger, theme toggle, and booking action. Reusable with a `minimal` variant on subpages.
- **Navigation Primitives**: Full-site search dialog (`Cmd+K`), accessible mobile menu drawer, skip-to-content anchor, reading scroll progress indicator, and back-to-top button.
- **Direct Contact & Copying**: Accessible one-click copy buttons for clinic telephone, email, and address.

### 3.3 The Booking Wizard (`/book`)
- URL-synced multi-step state (`?step=0`, `?step=1`, `?step=2`, `?step=3`) so the browser back button steps backward naturally and page refreshes do not discard progress.
- Inline validation on field blur with `aria-live="polite"` feedback.
- Date picker with floor (`min`) set to today to prevent booking past dates.
- Submission handoff prepared for the future `POST /api/appointments` FastAPI backend endpoint.

### 3.4 Production Readiness & Compliance
- **SEO & Social Sharing**: Unique per-route metadata, dynamic OpenGraph image (`/opengraph-image`), XML sitemap (`/sitemap.xml`), and robots configuration (`/robots.txt`).
- **Web App Manifest**: Native SVG brand mark and `manifest.webmanifest`.
- **Accessibility**: Conformance with WCAG 2.1 AA, keyboard focus indicators, screen reader labels, and `prefers-reduced-motion` compliance.
