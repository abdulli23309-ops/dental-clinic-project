# Implementation Phases — Marlow Dental Production Pass

## Execution Log & Verification

- [x] **Phase 1: Codebase Audit & Dependency Alignment**
  - Inspected all 11 source files across `src/app/` and `src/components/`.
  - Removed all 3D/WebGL artifacts (`three`, `@types/three`, and `src/components/3d`).
  - Installed single permitted motion library: `motion` (`motion/react` v12).
  - Eliminated all em-dashes from headings, body text, title tags, metadata, and comments.
  - Removed unverified "4.9 · 412 reviews" and invented testimonials.

- [x] **Phase 2: Design Tokens & Shared UI Primitives**
  - Updated `globals.css` with fluid typography (`.fluid-h1`, `.fluid-h2`), warm shadow scale (`shadow-subtle`, `shadow-card`, `shadow-elevated`), and integrated `sand` token.
  - Built `src/components/ui/button.tsx` preserving intentional pill shape (`rounded-full`) with hover lift and active press.
  - Built `src/components/ui/card.tsx` referencing `--radius-card` and warm shadow scale.
  - Built `src/components/ui/section-heading.tsx` consolidating eyebrow, heading, and description.
  - Built `src/components/ui/text-field.tsx` with programmatic label association, inline validation errors, and `aria-live="polite"`.
  - Built `src/components/ui/skeleton.tsx` for loading states.

- [x] **Phase 3: Motion System & 2D Depth**
  - Implemented 2D scroll-triggered reveals (`whileInView`) on home page sections.
  - Implemented staggered entry for objection items, service rows, and FAQs.
  - Implemented smooth CSS grid-based height transition (`grid-template-rows: 0fr -> 1fr`) for FAQ accordion.
  - Added CSS perspective tilt to hero credential card on pointer hover.
  - Configured full `prefers-reduced-motion: reduce` fallback across all animated elements.

- [x] **Phase 4: Production Readiness & Compliance Pages**
  - Implemented real dark mode toggle with persistent preference and system sync.
  - Built real structured compliance pages:
    - `/privacy` (labeled for legal review)
    - `/hipaa` (labeled for legal review)
    - `/accessibility` (physical and digital accommodations)
    - `/terms` (labeled for legal review)
  - Added `error.tsx` (calm, non-alarming route error boundary) and `not-found.tsx` (custom 404).
  - Configured `robots.ts`, `sitemap.ts`, `manifest.ts`, and dynamic `opengraph-image.tsx`.
  - Added dedicated route metadata for `/book` via `src/app/book/layout.tsx`.
  - Added scroll progress, back-to-top, skip-to-content, floating contact dock, and cookie consent.

- [x] **Phase 5: Booking Wizard Rebuild (`/book`)**
  - Rebuilt `/book` with URL-synced step state (`?step=0|1|2|3`), preserving progress across refreshes and supporting browser back/forward buttons.
  - Replaced silent button disables with real-time inline validation triggered on field blur with `aria-live="polite"`.
  - Added floor `min` attribute on date input preventing selection of past dates.
  - Reused `<SiteHeader variant="minimal" />` instead of duplicating header markup.
  - Added step crossfade animation and restrained checkmark completion indicator.
  - Clearly commented submission handler as pending backend integration for `POST /api/appointments`.

- [x] **Phase 6: Backend Boundary Preparation (`src/lib/api.ts`)**
  - Centralized future `fetch` calls into `src/lib/api.ts`.
  - Clearly labeled mock datasets as mock arrays pending FastAPI + MongoDB Atlas endpoints.

- [x] **Phase 7: Documentation Synchronization**
  - Synchronized all six files in `docs/`: `prd.md`, `architecture.md`, `design.md`, `rules.md`, `phases.md`, `memory.md`.
  - Verified static generation build (`npm run build` succeeds with 14 static routes).
