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

8. **FastAPI Backend Integration Boundary (September 2026)**
   - *Decision*: Centralized all asynchronous domain actions in `src/lib/api.ts`, connecting to `${NEXT_PUBLIC_API_URL}/api/v1/appointments`.
   - *Why*: Isolating network operations prevents UI components from embedding transport assumptions.

9. **Transition from MongoDB Atlas to PostgreSQL (September 2026)**
   - *Decision*: Replaced the earlier proposed MongoDB document store with **PostgreSQL**, using SQLAlchemy 2.0 (asyncio mode), `asyncpg`, and `alembic`.
   - *Why*: Marlow Dental's data requirements are inherently relational and tabular. A flat, strongly-typed `appointments` table with database-level `UNIQUE` constraints (`confirmation_id`) and composite indexes (`status, created_at DESC`) provides strict relational integrity, queryability, and ACID guarantees without document database operational complexity.

10. **Appointment Request Contract & Scope Boundaries (September 2026)**
    - *Decision*: Verified the exact contract from `src/app/book/page.tsx` (6 allowed services, 6 time slots, non-past date, phone/email validation). Implemented `AppointmentService` with `MD-YYYY-XXXX` confirmation ID generation and automatic retry on unique constraint collision. Preserved strict PHI-safe logging (never logging patient names, phone, email, notes, or insurance).
    - *Why*: Strictly honors the reality that the product is an appointment request (callback confirmation) and avoids over-engineering an unneeded calendar locking or scheduling engine.
11. **Truthful Error Handling on Booking Request Submission (September 2026)**
    - *Decision*: Removed the mock fallback that returned a simulated `"MD-REQUESTED"` confirmation when `submitBookingRequest` failed or the server was unreachable. Replaced it with an accessible error alert displaying the actual issue and offering direct phone contact (`(312) 555-0147`).
    - *Why*: In a healthcare setting, simulating success when a booking request failed to persist silently loses the patient's request and erodes trust.

12. **Automatic Transaction Commit in Dependency Session Generator (September 2026)**
    - *Decision*: Configured `get_db_session()` in `app/core/database.py` to invoke `await session.commit()` upon successful yield return, retaining `await session.rollback()` on exceptions.
    - *Why*: Guarantees that appointment flushes in repository methods are persistently committed to PostgreSQL `dentai_dev` across the request lifecycle without requiring route-level commit boilerplate.

13. **Dual-Token Authentication Strategy with HttpOnly Refresh Rotation (October 2026)**
    - *Decision*: Configured short-lived JWT access tokens (15m) in memory alongside long-lived refresh tokens (7d) delivered via secure `HttpOnly`, `SameSite=Lax` cookies, persisted as SHA-256 hashes in PostgreSQL and rotated on every exchange.
    - *Why*: Storing refresh tokens in `localStorage` leaves tokens vulnerable to XSS exfiltration. HttpOnly cookies isolate the refresh token from JavaScript execution while refresh rotation prevents replay of intercepted credentials.

14. **Unified `TeamMember` Domain Model (October 2026)**
    - *Decision*: Created a single unified `TeamMember` relational entity with `professional_title`, `role`, and `specialties` rather than fragmented tables for doctors, specialists, and dental assistants.
    - *Why*: Eliminates arbitrary schema divergence and allows the clinic to scale from a single director into a multi-doctor, multidisciplinary medical complex without subsequent database migrations.

15. **Strict Soft-Deletion Mandate for CMS Entities (October 2026)**
    - *Decision*: Implemented `is_active = false` toggling across `TeamMember`, `Service`, and `FaqItem` models instead of SQL `DELETE` operations.
    - *Why*: Protects referential integrity with existing appointment records, prevents accidental loss of clinical history, and allows administrators to safely archive procedures or staff temporarily without data loss.

16. **Safe CLI Bootstrap Mechanism for Admin Accounts (October 2026)**
    - *Decision*: Built `app/cli.py` accepting `--email`, `--password`, and `--name` arguments or interactive prompts, strictly disallowing hardcoded passwords in source repositories or migration scripts.
    - *Why*: Ensures development and staging environments can be provisioned safely and securely while upholding zero-secret-in-git compliance.
