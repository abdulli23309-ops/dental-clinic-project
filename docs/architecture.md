# Technical Architecture — Marlow Dental

## 1. Core Framework & Build
- **Framework**: Next.js 16.3 (App Router, Turbopack, React 19.2)
- **Styling**: Tailwind CSS v4 with custom CSS custom properties in `src/app/globals.css`
- **Motion Library**: `motion` (`motion/react` v12) for 2D scroll-triggered reveals, staggered entries, and layout transitions
- **Icons**: `lucide-react`
- **Typography**: Google Fonts via `next/font/google` loading Fraunces (display serif) and Manrope (interface sans)

## 2. Directory Structure

```text
src/
├── app/
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
└── lib/
    ├── api.ts                    # Single API boundary for future FastAPI backend
    ├── search-index.ts           # Client search index over actual static content
    ├── utm.ts                    # UTM parameter preservation utility
    └── utils.ts                  # Shared styling (cn) and Chicago timezone calculator
```

## 3. Motion Architecture: 2D & CSS Depth (No 3D / WebGL)
- **Library Selection**: Single motion library (`motion`). Three.js, React Three Fiber, GSAP, and WebGL were intentionally excluded because Marlow Dental represents a service and doctor continuity, not an industrial physical product.
- **Scroll Reveals**: Each section on the home page fades and rises 8–16px when approximately 20% into view. List items stagger in at 60–80ms intervals, capped to settle in under 350ms.
- **Elevation System**: Warm-black shadows (`rgba(20, 20, 15, ...)`) provide optical depth. Cards lift slightly (`-translate-y-1`) on hover.
- **Hero Tilt**: The floating credential card features a subtle CSS perspective tilt on pointer hover (pointer devices only, disabled on touch and reduced motion).
- **Reduced Motion**: All animations respect `prefers-reduced-motion: reduce`, defaulting to instant appearance or opacity fades without translation.

## 4. Backend Integration Boundary (`src/lib/api.ts`)
To prepare for the separate **FastAPI** + **MongoDB Atlas** backend without mixing network logic into UI components:
- `src/lib/api.ts` is the single module containing all data contracts and async functions.
- The booking wizard calls `submitBookingRequest(payload)`, which prepares the exact payload needed for `POST /api/appointments`.
- Mock datasets (`MOCK_SERVICES`, `MOCK_DOCTOR`) are explicitly labeled as mock arrays pending live API connection.
