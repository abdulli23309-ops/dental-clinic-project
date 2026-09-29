# Engineering & Content Rules — Marlow Dental

> See `../AGENTS.md` for the permanent, project-wide rules that apply here too — this file adds frontend-specific detail on top of those, it does not replace them.

## 1. Content & Truthfulness Rules
- **No Fabricated Content Ever**: Never invent patient reviews, star ratings, customer counts, or testimonial quotes.
- **No Em-Dashes**: Do not use em-dashes in headings, copy, title tags, or metadata. Use natural punctuation (periods, commas) or restructured phrasing.
- **Specific Clinical Voice**: Avoid AI clichés (no "it's not X, it's Y" constructions, no forced aphorisms, no "in today's fast-paced world").
- **Action-Oriented CTAs**: Use explicit verb + outcome pairings ("Book an appointment", "View treatment pricing", "Call (312) 555-0147").

## 2. Motion & Technology Constraints
- **Zero 3D / WebGL**: Never introduce Three.js, React Three Fiber, Canvas 3D, or AI-generated exploded product meshes. The practice provides personal medical care, not an industrial physical product.
- **Single Motion Library**: Only `motion` (`motion/react`) is permitted. Do not add GSAP, Lenis, or other animation dependencies.
- **Motion Fallbacks**: Every motion transition, translation, and scale must have a graceful `prefers-reduced-motion: reduce` fallback that disables spatial movement while retaining simple opacity fades.

## 3. Component & Design Integrity
- **Preserve Pill Buttons**: Keep `rounded-full` pill buttons across action controls; it is an intentional editorial design choice.
- **Shared Primitives**: Do not hand-roll raw buttons, cards, or inputs in page sections. Always use `Button`, `Card`, `SectionHeading`, and `TextField` from `src/components/ui/`.
- **Accessible Form Controls**: Every form field must be programmatically associated with its label via `id` and `htmlFor`. Validation errors must be announced with `aria-live="polite"` and `role="alert"`.

## 4. API & Backend Boundaries
- UI presentation components must never execute raw network `fetch` calls or embed mock datasets directly.
- All network operations must route through `src/lib/api.ts` to ensure clean handoff to the future FastAPI backend.

## 5. Documentation Maintenance
- Whenever an architectural change, new route, or design rule is established, immediately update the six documents in `docs/`:
  - `docs/prd.md`
  - `docs/architecture.md`
  - `docs/design.md`
  - `docs/rules.md`
  - `docs/phases.md`
  - `docs/memory.md`

## 6. Backend Engineering Principles (Permanent Rules)

These principles are permanent project rules binding all future development and sessions:

- **KISS**: One clear service, one clear repository, one clear domain model per concern. Do not add a framework or abstraction layer the current requirement does not justify. A single table for a single-milestone feature does not need a schema-per-microservice or a generic ORM abstraction beyond what is used.
- **DRY**: Do not duplicate validation rules, configuration, DB setup, constants, or response formatting. Do not prematurely abstract code that only happens to look similar today.
- **YAGNI**: Do not build anything from the deferred list "just in case." Add it only when a real, current requirement appears. Do not add extra tables, columns, or migrations for data the frontend does not collect today.
- **SOLID, Applied Pragmatically**:
  - *Single Responsibility*: Routes handle HTTP only; application services handle orchestration; repositories handle persistence; domain code handles business concepts.
  - *Open/Closed*: The application depends on the `AppointmentRepository` abstraction, not on SQLAlchemy/PostgreSQL directly, so the persistence layer could change without touching business logic.
  - *Liskov Substitution*: Any repository implementation must honor the behavior the abstraction promises.
  - *Interface Segregation*: Repository interfaces expose only the operations actually used today; no speculative CRUD surface.
  - *Dependency Inversion*: Dependency direction is always `API -> Application -> Domain <- Infrastructure`. Domain code never imports FastAPI or SQLAlchemy.
- **Contract-First**: The frontend's existing request/response shape in `src/lib/api.ts` is the contract. Inspect it before finalizing any DTO. Adapt the backend to the real contract rather than guessing. If a change to the contract is genuinely necessary, state the difference explicitly and make the smallest compatible change.
- **Defensive Engineering**: Never trust client-side validation, URL params, or marketing parameters. Validate everything again at the backend boundary, and again at the database boundary via constraints. Fail safely; never leak a stack trace, a DB exception, an env value, or PHI to the frontend.
- **Minimal Data Principle**: Collect, log, and return only what the current product actually needs. Do not add DOB, SSN, address, diagnosis, treatment history, medical record number, or payment fields/columns unless a real, documented requirement introduces them later.
- **PHI-Safe Logging**: Never log patient name, phone, email, clinical notes, or insurance provider, not even inside exception messages, serialized request bodies, or raw SQL statement logging (disable SQL echo/statement logging in any mode that would print bound parameter values in production).
- **No Fake Functionality**: Never simulate availability, confirmation, or any other behavior and present it as real. If something is not implemented, say so in code comments and in `docs/memory.md`; do not disguise a stub as working.
- **Documentation as Code**: Documentation must always describe what is actually implemented, never what is planned or assumed. Never mark future work as done.
- **Migrations are the Schema's Source of Truth**: Never hand-edit the database schema outside of an Alembic migration, and never generate a migration you have not read and understood; autogenerate is a starting point, not a final answer.
- **Git Discipline**: `git status`/`git diff` review before and after every meaningful change; never commit `.env`, credentials, secrets, or real patient data; keep changes focused with no unrelated refactors bundled in.
- **Testing is Part of Implementation, Not a Final Step**: Write tests alongside each piece as it is built, not all at the end.
