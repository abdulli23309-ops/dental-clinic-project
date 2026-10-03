# Technical Architecture — Marlow Dental

## 1. Core Framework & Build
- **Framework**: Next.js 16.3 (App Router, Webpack/Turbopack, React 19.2)
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
│   │   │   ├── layout.tsx        # Root layout with fonts, AuthProvider, ThemeProvider, JSON-LD
│   │   │   ├── page.tsx          # Home page assembling dynamic marketing sections
│   │   │   ├── globals.css       # Design tokens, fluid type scale, warm shadow scale
│   │   │   ├── icon.svg          # SVG brand mark
│   │   │   ├── opengraph-image.tsx # Dynamic OG image generation
│   │   │   ├── robots.ts         # Robots.txt metadata route
│   │   │   ├── sitemap.ts        # Sitemap.xml metadata route
│   │   │   ├── manifest.ts       # Web application manifest
│   │   │   ├── error.tsx         # Route-level error boundary
│   │   │   ├── not-found.tsx     # Custom art-directed 404 page
│   │   │   ├── login/
│   │   │   │   └── page.tsx      # Secure staff / admin login screen
│   │   │   ├── admin/
│   │   │   │   ├── layout.tsx    # Admin shell with navigation & auth route guard
│   │   │   │   ├── page.tsx      # Overview dashboard
│   │   │   │   ├── website/page.tsx # Website CMS editor (General, Homepage, About, Contact, FAQ, SEO)
│   │   │   │   ├── team/page.tsx # Team members CRUD, credentials & soft deletion
│   │   │   │   ├── services/page.tsx # Service catalog CRUD & soft deletion
│   │   │   │   ├── locations/page.tsx # Multi-location overview shell
│   │   │   │   └── account/page.tsx # Admin profile and sign-out
│   │   │   ├── book/
│   │   │   │   ├── layout.tsx    # Dedicated metadata for booking route
│   │   │   │   └── page.tsx      # URL-synced multi-step booking wizard (dynamic services)
│   │   │   ├── privacy/page.tsx  # Privacy policy
│   │   │   ├── hipaa/page.tsx    # HIPAA notice of privacy practices
│   │   │   ├── accessibility/page.tsx # Physical & digital accessibility statement
│   │   │   └── terms/page.tsx    # Terms of service & cancellation rules
│   │   ├── components/
│   │   │   ├── ui/               # Shared UI Primitives (Button, Card, TextField, etc.)
│   │   │   ├── layout/           # Global Shell Components (SiteHeader, Footer, MobileMenu)
│   │   │   ├── sections/         # Home Page Content Sections (Hero, Doctor, Services, Visit, FAQ)
│   │   │   └── providers/
│   │   │       ├── auth-provider.tsx # Session state, JWT storage, refresh rotation, login/logout
│   │   │       └── theme-provider.tsx # Theme context and localStorage persistence
│   │   └── lib/
│   │       ├── api.ts            # Single API boundary for FastAPI backend (auth, appointments, CMS)
│   │       ├── search-index.ts   # Client search index over actual static content
│   │       ├── utm.ts            # UTM parameter preservation utility
│   │       └── utils.ts          # Shared styling (cn) and Chicago timezone calculator
│   └── docs/                     # Frontend architectural documentation
└── backend/                      # Backend application (FastAPI + PostgreSQL)
    ├── alembic/                  # Database migration scripts & env.py
    │   └── versions/
    │       ├── 0001_initial_appointments.py
    │       └── 0002_admin_auth_and_clinic_cms.py
    ├── app/                      # Application layered architecture
    │   ├── api/v1/               # FastAPI endpoints & route definitions
    │   ├── application/          # Service layer, DTOs & business workflows
    │   ├── core/                 # Config, DB engine, logging, security
    │   ├── domain/               # Pure business models & repository protocols
    │   └── infrastructure/       # SQLAlchemy models, storage, & repository implementations
    ├── tests/                    # Pytest test suite (29 passing unit/integration tests)
    └── README.md                 # Setup, local run, and CLI instructions
```

## 3. Authentication & Authorization Architecture

- **Token Strategy**:
  - **Short-Lived Access Token**: Standard JSON Web Token (JWT) with HS256 signature containing user ID, subject (email), role (`admin`), and 15-minute expiration (`exp`). Kept in-memory within React `AuthProvider` state.
  - **Long-Lived Refresh Token**: 256-bit cryptographically secure token string (`secrets.token_urlsafe(32)`), stored in the browser as a strict `HttpOnly`, `SameSite=Lax` cookie (`marlow_refresh_token`).
  - **Server-Side Token Persistence**: SHA-256 hashed refresh tokens are stored in the `refresh_tokens` table with client IP, user agent, expiration timestamp, and revocation flag (`is_revoked`).
  - **Refresh Rotation**: Every call to `POST /api/v1/auth/refresh` revokes the used refresh token and issues a brand-new token pair, mitigating token theft replay attacks.
  - **Revocation**: Logging out instantly marks the refresh token record as revoked on the server and expires the client cookie.
- **Authorization Dependency**:
  - `require_admin` dependency inspects JWT claims and ensures `role == "admin"`. Extensible to future granular permissions (`require_permission(...)`) and role types.

## 4. Clinic Content Management (CMS) Foundation

- **Organization & Locations**:
  - Hierarchy: `Organization` (Marlow Dental) -> `Location` (Lincoln Park clinic, expandable to multi-location) -> `TeamMember`.
- **Soft Deletion Policy**:
  - Deleting any team member, service, or FAQ record triggers a soft-delete (`is_active = false`). No destructive SQL `DELETE` queries are ever issued by API routes.
  - Public endpoints (`/api/v1/public/*`) strictly query `WHERE is_active = true`.
  - Admin endpoints allow administrators to view, filter, and toggle active status.
- **Dynamic Public Integration with Fallbacks**:
  - Public pages (`Hero`, `Services`, `Doctor`, `FAQ`, `BookPage`) dynamically consume backend endpoints via `src/lib/api.ts`.
  - In the event of network disruption or initial cold boot, robust built-in fallbacks ensure that the marketing site and appointment scheduler remain fully operational and aesthetically cohesive.

## 5. Media Storage Abstraction

- **Interface**: Abstract `StorageService` domain protocol (`upload_file`, `delete_file`, `get_url`).
- **Development Implementation**: `LocalStorageService` saving files to `uploads/` directory, validating file sizes (capped at 5MB) and permitted MIME types (`image/jpeg`, `image/png`, `image/webp`).
- **Static File Serving**: Mounted at `/media` in FastAPI for local development, with paths stored as relative URLs ready for zero-downtime swap to AWS S3 or Cloudinary.

## 6. PostgreSQL Relational Schema

### Database Migrations
1. `0001_initial_appointments.py`: Created `appointments` table with UUID primary key, unique confirmation ID, and composite status/date indexes.
2. `0002_admin_auth_and_clinic_cms.py`: Created:
   - `users`: User accounts with bcrypt hashed passwords and role strings.
   - `refresh_tokens`: Tracked refresh tokens with rotation and revocation support.
   - `organizations`: Multi-location root entity.
   - `locations`: Physical clinic offices with address and operating hours.
   - `team_members`: Single reusable model for doctors, hygienists, specialists, and practice directors.
   - `services`: Database-backed procedure catalog with durations, CDT codes, and pricing.
   - `faq_items`: Categorized accordion questions and answers.
   - `site_sections`: Structured JSON payloads for homepage, general, about, contact, footer, and SEO metadata.

### PHI-Safe Logging Rule
No patient-identifiable data (name, telephone, email, clinical notes, insurance) or authentication secrets (passwords, tokens) are ever written to logs or echoed in error responses. SQL query echoing is explicitly disabled.
