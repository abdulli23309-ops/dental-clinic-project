# Project Memory & Decision Log — Marlow Dental

## Persistent Decisions & Rationale

1. **Rejection of 3D / WebGL Spectacle (September 2026)**
   - *Decision*: Removed Three.js and all 3D mesh rendering from the codebase.
   - *Why*: Marlow Dental is a patient-facing medical practice built on personal relationships, trust, and unhurried care. AI-rendered exploded product views scrubbed on scroll are built for consumer gadgets (headphones, shoes), not a dentist's office. Depth is achieved authentically using CSS warm shadows, subtle perspective tilt on pointer hover, and clean typography.

2. **Preservation of Pill-Shaped Buttons (September 2026)**
   - *Decision*: Kept `rounded-full` pill buttons across primary and outline actions.
   - *Why*: The pill shape is an intentional editorial design choice for Marlow Dental. It softens the clinical tone, providing a calm, tactile contrast to the sharp geometry of medical equipment. Added hover lift (`-translate-y-0.5` + shadow escalation) and active press states.

3. **Motion Library Selection: `motion` over GSAP (September 2026)**
   - *Decision*: Installed `motion` (`motion/react` v12) as the single animation dependency.
   - *Why*: The site requires restrained 2D entrance reveals (`whileInView`), staggered list settling, and step crossfades. It does not require complex timeline pinning or canvas animation. `motion` integrates natively with React 19 and Next.js Turbopack.

4. **Zero Em-Dashes & AI Pattern Eradication (September 2026)**
   - *Decision*: Eliminated all 17 em-dashes from headings, body text, title tags, openGraph metadata, and code comments.
   - *Why*: Frequent em-dashes are an obvious AI writing tell. Sentences were rewritten naturally using periods, commas, or restructured phrasing while preserving Dr. Marlow's direct, personal voice.

5. **Removal of Fabricated Reviews and Statistics (September 2026)**
   - *Decision*: Removed invented quotes (Danielle R., Marcus T., Priya S.) and the unverified "4.9 · 412 reviews" metric from `hero.tsx` and the homepage.
   - *Why*: A healthcare practice cannot ethically publish fake patient reviews or fabricated survey percentages. The content was replaced with genuine clinical commitments (direct doctor continuity, itemized written estimates, reserved emergency triage) and verified Illinois licensure (#019.029811).

6. **URL-Synced Booking Wizard State (September 2026)**
   - *Decision*: Bound `/book` wizard steps to the URL query string (`?step=0|1|2|3`).
   - *Why*: Previously, clicking the browser back button exited `/book` completely, and refreshing lost all entered data. URL syncing allows the browser history to navigate backward step-by-step and maintains progress on refresh.

7. **Compliance & Legal Pages (September 2026)**
   - *Decision*: Implemented real structured pages for `/privacy`, `/hipaa`, `/accessibility`, and `/terms`, with explicit code comments noting they require formal legal review before launch.
   - *Why*: The footer previously contained dead links to `/hipaa` and `/accessibility`. Shipping dead links on a healthcare site degrades trust.

8. **Future FastAPI Backend Boundary (September 2026)**
   - *Decision*: Centralized all asynchronous domain actions in `src/lib/api.ts`.
   - *Why*: The team is building a separate FastAPI + MongoDB Atlas backend. Keeping the API boundary isolated prevents components from embedding network assumptions.
