# Engineering & Content Rules — Marlow Dental

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
