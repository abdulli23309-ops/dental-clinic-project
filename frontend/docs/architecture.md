# Technical Architecture — Marlow Dental

## 1. Core Framework & Build
- **Framework**: Next.js 16.3 (App Router, Turbopack, React 19.2)
- **Styling**: Tailwind CSS v4 with custom CSS custom properties in `src/app/globals.css`
- **Motion Library**: `motion` (`motion/react` v12) for 2D scroll-triggered reveals, staggered entries, and layout transitions
- **Icons**: `lucide-react`
- **Typography**: Google Fonts via `next/font/google` loading Fraunces (display serif) and Manrope (interface sans)

## 2. Directory Structure

```text
dental-clinic-project/
├── AGENTS.md                     # Global rules binding frontend & backend
├── README.md                     # Monorepo overview and quickstart
├── frontend/                     # Next.js 16 App Router application
│   ├── src/
│   │   ├── app/
│   ├── layout.tsx                # Root layout with fonts, ThemeProvider, JSON-LD
│   ├── page.tsx                  # Home page assembling marketing sections
│   ├── globals.css               # Design tokens, fluid type scale, warm shadow scale
│   ├── icon.svg                  # SVG brand mark
│   ├── opengraph-image.tsx       # Dynamic edge-free OG image generation
│   ├── robots.ts                 # Robots.txt metadata route
│   ├── sitemap.ts                # Sitemap.xml metadata route
│   ├── manifest.ts               # Web application manifest
│   ├── error.tsx                 # Route-level error boundary
│   ├── not-found.tsx             # Custom art-directed 404 page
│   ├── book/
│   │   ├── layout.tsx            # Dedicated metadata for booking route
│   │   └── page.tsx              # URL-synced multi-step booking wizard
│   ├── privacy/
│   │   └── page.tsx              # Privacy policy (labeled for legal review)
│   ├── hipaa/
│   │   └── page.tsx              # HIPAA notice of privacy practices (labeled)
│   ├── accessibility/
│   │   └── page.tsx              # Physical & digital accessibility statement
│   └── terms/
│       └── page.tsx              # Terms of service & cancellation rules (labeled)
├── components/
│   ├── ui/                       # Shared UI Primitives
│   │   ├── button.tsx            # Pill button with hover lift and active press
│   │   ├── card.tsx              # Card primitive using shadow scale and radius-card
│   │   ├── section-heading.tsx   # Consolidated eyebrow + heading + description
│   │   ├── text-field.tsx        # Accessible label-linked input with inline errors
│   │   ├── skeleton.tsx          # SkeletonCard & SkeletonText loading placeholders
│   │   ├── copy-button.tsx       # Clipboard copy with visual confirmation
│   │   ├── theme-toggle.tsx      # Dark/light mode switcher
│   │   ├── search-dialog.tsx     # Cmd+K search modal over existing static content
│   │   └── cookie-banner.tsx     # Non-deceptive cookie preference banner
│   ├── layout/                   # Global Shell Components
│   │   ├── site-header.tsx       # Sticky header with default and minimal variants
│   │   ├── mobile-menu.tsx       # Accessible mobile slide-over drawer
│   │   ├── footer.tsx            # Deliberate footer with contact and legal links
│   │   ├── scroll-progress.tsx   # Reading scroll progress bar
│   │   ├── back-to-top.tsx       # Floating back-to-top button
│   │   └── floating-action.tsx   # Mobile floating contact control
│   ├── sections/                 # Home Page Content Sections
│   │   ├── hero.tsx              # Cinematic hero with CSS perspective tilt
│   │   ├── commitments.tsx       # Three core clinical standards
│   │   ├── services.tsx          # Categorized procedures with tabs
│   │   ├── doctor.tsx            # Doctor background and verified licensure
│   │   ├── visit.tsx             # Location, directions, parking, live Chicago status
│   │   └── faq.tsx               # Accordion with CSS grid height transition
│   └── providers/
│       └── theme-provider.tsx    # Theme context and localStorage persistence
│   └── lib/
│       ├── api.ts                # Single API boundary for FastAPI backend
│       ├── search-index.ts       # Client search index over actual static content
│       ├── utm.ts                # UTM parameter preservation utility
│       └── utils.ts              # Shared styling (cn) and Chicago timezone calculator
├── backend/                      # Backend application (FastAPI + PostgreSQL)
    ├── alembic/                  # Database migration scripts & env.py
    ├── app/                      # Application layered architecture
    │   ├── api/v1/               # FastAPI endpoints & route definitions
    │   ├── application/          # Service layer & business workflows
    │   ├── core/                 # Config, DB engine, logging, security
    │   ├── domain/               # Pure business models & repository interfaces
    │   └── infrastructure/       # SQLAlchemy models & repository implementations
    ├── tests/                    # Pytest test suite (17 passing unit/integration tests)
    ├── alembic.ini               # Migration configuration
    ├── pyproject.toml            # Project metadata and dependencies
    └── README.md                 # Setup, local run, and CLI instructions
```

## 3. Motion Architecture: 2D & CSS Depth (No 3D / WebGL)
- **Library Selection**: Single motion library (`motion`). Three.js, React Three Fiber, GSAP, and WebGL were intentionally excluded because Marlow Dental represents a service and doctor continuity, not an industrial physical product.
- **Scroll Reveals**: Each section on the home page fades and rises 8–16px when approximately 20% into view. List items stagger in at 60–80ms intervals, capped to settle in under 350ms.
- **Elevation System**: Warm-black shadows (`rgba(20, 20, 15, ...)`) provide optical depth. Cards lift slightly (`-translate-y-1`) on hover.
- **Hero Tilt**: The floating credential card features a subtle CSS perspective tilt on pointer hover (pointer devices only, disabled on touch and reduced motion).
- **Reduced Motion**: All animations respect `prefers-reduced-motion: reduce`, defaulting to instant appearance or opacity fades without translation.

## 4. Backend Integration Boundary (`src/lib/api.ts`)
The Next.js frontend integrates with the FastAPI + PostgreSQL backend through `src/lib/api.ts`:
- `src/lib/api.ts` is the single module containing all data contracts and async functions.
- The booking wizard calls `submitBookingRequest(payload)`, which executes an HTTP POST to `${NEXT_PUBLIC_API_URL}/api/v1/appointments`.
- `NEXT_PUBLIC_API_URL` defaults to `http://localhost:8000` via `.env.local`.

## 5. Backend Architecture (FastAPI + PostgreSQL)

*Project Note*: The project transitioned from an earlier exploratory MongoDB Atlas design to **PostgreSQL**. The relational model provides flat column typing, strict database-level unique constraints, and transaction ACID guarantees for appointment requests without document store overhead.

### Dependency Direction (Strictly Enforced)

```text
Next.js Frontend (src/lib/api.ts)
           ↓ (JSON / REST over TLS)
      FastAPI (app/api/v1)
           ↓
Application Services (app/application/services)
           ↓
Domain Repositories (app/domain/repositories - ABC)
           ↓
PostgreSQL Repositories (app/infrastructure/repositories)
           ↓
      PostgreSQL ("marlow_dental" / "appointments" table)
```

### Confirmed Stack & Verified Versions
- **Python**: 3.14.5 (managed via `uv`)
- **Web Framework**: `fastapi==0.141.1`, `uvicorn[standard]==0.54.0`
- **Settings**: `pydantic-settings==2.15.0`, `pydantic==2.13.5`
- **ORM & Async Driver**: `sqlalchemy==2.1.1` (asyncio mode), `greenlet==3.5.6`, `asyncpg==0.31.0`
- **Schema Migrations**: `alembic==1.20.0`
- **Rate Limiting**: `slowapi==0.1.10`
- **Testing**: `pytest==9.1.1`, `pytest-asyncio==1.4.0`, `httpx==0.28.1`, `aiosqlite==0.22.1`

### Relational Schema (`appointments` Table)

| Column | Type | Constraints & Defaults |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key (`default=uuid4`) |
| `confirmation_id` | `TEXT` | `UNIQUE NOT NULL` (e.g. `MD-2026-4821`) |
| `status` | `TEXT` | `NOT NULL`, default `'requested'` |
| `service_id` | `TEXT` | `NOT NULL` (matches frontend catalog) |
| `preferred_date` | `DATE` | `NOT NULL` (indexed) |
| `preferred_time` | `TEXT` | `NOT NULL` (one of 6 allowed slots) |
| `patient_full_name` | `TEXT` | `NOT NULL` |
| `patient_phone` | `TEXT` | `NOT NULL` |
| `patient_email` | `TEXT` | `NOT NULL` |
| `has_insurance` | `BOOLEAN` | `NOT NULL`, default `false` |
| `insurance_provider` | `TEXT` | Nullable |
| `notes` | `TEXT` | Nullable, max 1000 characters |
| `utm_source` | `TEXT` | Nullable |
| `utm_campaign` | `TEXT` | Nullable |
| `staff_notes` | `TEXT` | Nullable (internal front-desk only) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()`, auto-updated on write |

### Database Constraints & Indexes
1. `uq_appointments_confirmation_id`: Unique constraint on `confirmation_id`.
2. `ix_appointments_confirmation_id`: B-Tree index for fast confirmation lookup.
3. `ix_appointments_preferred_date`: B-Tree index supporting daily clinic schedule views.
4. `ix_appointments_status_created_at`: Composite index on `(status, created_at DESC)` for front-desk triage queries.

### PHI-Safe Logging Rule
No patient-identifiable data (name, telephone, email, clinical notes, insurance) is ever written to logs or echoed in API responses. SQL query echoing is explicitly disabled.
