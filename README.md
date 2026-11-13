# 🦷 Hira Dental Clinic — DHDC
**Enterprise Full-Stack Healthcare Platform for Multi-Branch Dental Clinics**

---

## 📋 Project Overview

**Hira Dental Clinic (DHDC)** is a production-ready, full-stack enterprise healthcare management platform engineered for modern multi-branch dental practices across Pakistan. It combines a **Next.js (App Router + TypeScript + Tailwind + Framer Motion)** frontend with a **FastAPI (Python + SQLAlchemy + PostgreSQL)** backend to deliver intelligent patient engagement, streamlined clinical operations, and a fully localized bilingual (English ↔ Urdu) patient experience.

### Why This Platform Was Built
* **Language & Accessibility Barrier:** Pakistan's bilingual society requires medical information that patients actually understand. Hira Dental Clinic solves this with a **4-Tier Neural Translation Engine** that instantly translates all public-facing content into natural Urdu with 0ms/1ms SHA-256 PostgreSQL caching.
* **Opaque Pricing & Patient Anxiety:** Clinical costs have traditionally been a source of confusion and fear. The platform provides **transparent upfront fee estimates**, duration expectations, and verified patient transformation stories to build trust.
* **Fragmented Multi-Branch Operations:** Managing multiple flagship branches (Islamabad, Lahore, Karachi) simultaneously is complex. The centralized dashboard gives administrators live branch status (Open Now / Closed), operating hours, and direct branch routing.
* **Manual Reception Bottlenecks:** Phone-only scheduling creates missed appointments and frustrated patients. The **end-to-end online booking pipeline** replaces chaotic phone-based scheduling with a smart, self-service confirmation flow.
* **Static, Outdated Content:** Clinics struggle to keep promotional content fresh. The **Admin Portal** empowers non-technical administrators to manage services, doctors, gallery items, FAQs, announcements, and patient reviews — with automatic English → Urdu translation on the fly.

---

## ⚙️ System Architecture & Tech Stack

### Frontend (Next.js)
| Technology | Purpose |
|---|---|
| **Next.js 16 (App Router)** | Server-rendered, SEO-friendly, server component architecture |
| **TypeScript 5** | Type-safe, 0-error-intent development |
| **Tailwind CSS v4** | Responsive, utility-first styling with dark mode |
| **Framer Motion** | Smooth, mobile-first micro-interactions |
| **Lucide React** | Accessible, consistent icon set |
| **Sonner** | Toast notifications |
| **Google Fonts (Noto Nastaliq Urdu + Noto Sans Arabic)** | Pixel-perfect Urdu typography |

### Backend (FastAPI)
| Technology | Purpose |
|---|---|
| **FastAPI** | Modern, async API framework |
| **PostgreSQL** | Source of truth for all clinical and operational data |
| **SQLAlchemy + Alembic** | ORM + versioned schema migrations |

### Four-Tier Translation Cascade
1. **In-Memory Clinical Dictionary:** Direct word/phrase translation for common clinical terms.
2. **PostgreSQL SHA-256 Cache (`translation_cache`):** 0ms lookups using precomputed hashes.
3. **Entity-Masked Neural Engine:** Credentials (`#PMDC`, `BDS`, `FCPS`), phone numbers, prices, and time strings are masked with safe tokens, translated, and restored wrapped in LTR-safe `<bdi>` elements.
4. **Word-Boundary Glossary Fallback:** When no API key is configured, a comprehensive clinical Urdu glossary guarantees 100% automatic translation of new admin entries.

### Public / Admin API Layers
- **Public (`/api/v1/public/*`):** Content for the public homepage (`?lang=en` or `?lang=ur`), search, and seamless live language switching.
- **Admin (`/api/v1/admin/*`):** Full CRUD for services, doctors, locations, FAQs, announcements, gallery items, homepage CMS content, and patient reviews.

---

## 🚀 Local Setup

### Prerequisites
- **Node.js 18+** (or use the project's `.nvmrc`)
- **Python 3.11+**
- **PostgreSQL 15+**
- **Git**

### 1. Clone & Install

---

## 🏗️ Deployment

### Docker / Coolify
- The 
ixpacks.toml configuration supports **Coolify**-ready, multi-stage Docker deployments.
- The backend mounts /media for dynamic clinical images and uses async PostgreSQL connection pooling.

### Environment Variables (Production)
| Variable | Description |
|---|---|
| DATABASE_URL | PostgreSQL connection string |
| SECRET_KEY | HMAC signing key for auth tokens |
| GOOGLE_CLOUD_TRANSLATE_API_KEY | Optional; enables Google Translate API tier |
| PUBLIC_BOOKING_RATE_LIMIT | Rate limit for public booking endpoints (default 5 per minute) |
| SCHEDULER_ENABLED | Enable background reminder scheduler |

---

## 📂 Project Structure

`
dental-clinic/
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── api/v1/endpoints/   # Public & Admin API endpoints
│   │   ├── core/               # Configuration, database, logging
│   │   ├── domain/             # SQLAlchemy models & repositories
│   │   ├── services/           # Business logic & translation engine
│   │   └── infrastructure/     # Database & repository implementations
│   ├── requirements.txt
│   └── main.py
├── frontend/                   # Next.js application
│   ├── public/
│   │   └── i18n/               # Served translation JSON files
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/
│   │   │   ├── mobile/         # Mobile-first components
│   │   │   ├── sections/       # Desktop homepage sections
│   │   │   └── providers/      # React context providers
│   │   ├── i18n/               # useT() hook + language dictionaries
│   │   └── lib/                # API client, utilities, content
│   └── package.json
└── README.md
`

---

## 🔑 Key Features

| Feature | Description |
|---|---|
| **4-Tier Live Neural Translation** | Instant EN ↔ UR switching with PostgreSQL caching |
| **Multi-Branch Management** | Real-time branch status, hours, and direct routing |
| **Online Appointment Booking** | Self-service scheduling with confirmation |
| **Admin Portal** | Dynamic content management with auto-translation |
| **Verified Patient Stories** | Trust-building transformation narratives |
| **Mobile-First Responsive Design** | Optimized for phones and tablets |
| **Full RTL/Urdu Support** | LTR/RTL bidirectional UI without layout shift |
| **Transparent Pricing** | Upfront fee estimates with duration expectations |

---

## 📄 License

Proprietary — All rights reserved. © 2026 Hira Dental Clinic.

---
*Built with care by the Hira Dental Clinic team.*
