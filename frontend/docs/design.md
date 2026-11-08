# Design System Specification — Marlow Dental

## 1. Visual Philosophy & Brand Identity
Marlow Dental's design evokes an architectural, editorial publication rather than a generic tech template or a clinical hospital.

Key brand decisions:
- **Pill Buttons (`rounded-full`)**: Preserved intentionally across all primary, secondary, and outline action buttons. The rounded pill shape conveys warmth, approachable care, and editorial softness, counterbalancing the clinical precision of dentistry.
- **Earth-Tone Palette**: Retained in full. The botanical forest green, warm bone paper, sand accents, and terracotta clay ground the experience in natural reassurance.
- **Depth via 2D CSS**: Depth is achieved through layered warm shadows, subtle border contrast, backdrop blurs, and pointer perspective tilt, rather than heavy WebGL 3D meshes.

## 2. Color Tokens

### 2.1 Light Theme (Editorial Parchment)
| Token | Hex | Role |
| :--- | :--- | :--- |
| `--color-bone` | `#FAF7F2` | Primary canvas background |
| `--color-cream` | `#F4EFE6` | Surface containers and card fills |
| `--color-sand` | `#E8DFD1` | Elevated highlights and badge backdrops |
| `--color-line` | `#E2DACB` | Architectural hairline dividers and borders |
| `--color-ink` | `#151613` | High-contrast display headings and text |
| `--color-ink-soft` | `#4F5047` | Muted clinical descriptions and metadata |
| `--color-forest` | `#1F3D34` | Primary brand accent and button fill |
| `--color-forest-deep` | `#12241E` | Deep grounding contrast and footer background |
| `--color-clay` | `#C4704F` | Eyebrow badges, active states, and accents |
| `--color-gold` | `#B8935A` | Warm metallic highlights and icons |

### 2.2 Dark Theme (Obsidian Emerald)
| Token | Hex | Role |
| :--- | :--- | :--- |
| `--color-bone` | `#0B0F0D` | Deep mineral background |
| `--color-cream` | `#121815` | Elevated card containers |
| `--color-sand` | `#1A2420` | Surface border accents and subtle chips |
| `--color-line` | `#22302A` | Muted dividers |
| `--color-ink` | `#F4F1EA` | High-contrast readable light text |
| `--color-ink-soft` | `#9BA7A1` | Secondary guidance and labels |
| `--color-forest` | `#2B5749` | Luminous botanical green |
| `--color-forest-deep` | `#070B09` | Deepest contrast container |
| `--color-clay` | `#D87D59` | Terracotta pop |
| `--color-gold` | `#C9A266` | Metallic accent |

## 3. Typography Scale

Google Fonts:
- **Display Serif**: `Fraunces` (variable optical size)
- **Interface Sans**: `Manrope` (variable geometric sans)

Fluid Type Classes:
- `.fluid-h1`: `clamp(2.35rem, 5.5vw, 4.25rem)`, line-height `1.04`, tracking `-0.03em`
- `.fluid-h2`: `clamp(1.85rem, 3.8vw, 2.75rem)`, line-height `1.1`, tracking `-0.025em`
- `.eyebrow`: `0.6875rem` (11px), tracking `0.18em`, font-weight `600`, uppercase

## 4. Shadow & Elevation Scale
All shadows use warm-black undertones (`rgba(20, 20, 15, ...)`), avoiding harsh pure black or neon glows:
- **Flat (`--shadow-flat`)**: `none`
- **Subtle (`--shadow-subtle`)**: `0 1px 3px rgba(20, 20, 15, 0.05), 0 1px 2px rgba(20, 20, 15, 0.03)`
- **Card (`--shadow-card`)**: `0 10px 25px -5px rgba(20, 20, 15, 0.07), 0 6px 10px -6px rgba(20, 20, 15, 0.03)`
- **Elevated (`--shadow-elevated`)**: `0 20px 40px -15px rgba(20, 20, 15, 0.18), 0 1px 3px rgba(20, 20, 15, 0.06)`
- **Modal (`--shadow-modal`)**: `0 25px 60px -15px rgba(20, 20, 15, 0.3)`

## 5. UI Primitives
- **`Button`**: Pill-shaped (`rounded-full`), primary (tactile 4-shadow emerald), secondary (tactile warm ivory / charcoal slate), outline, and ghost variants.
  - **Tactile 4-Shadow "Lit from Above" System (`.btn-premium-emerald`)**: Top-lit subtle gradient (`#194a36` to `#0d2b1f` in light mode, `#246349` to `#123828` in dark mode) paired with a 4-layer box-shadow:
    1. Specular top-edge highlight: `inset 0 1px 0 rgba(255, 255, 255, 0.35)`
    2. Bottom-edge inner shade: `inset 0 -2px 0 rgba(0, 0, 0, 0.25)`
    3. Contact shadow: `0 1px 2px rgba(0, 0, 0, 0.50)`
    4. Ambient emerald glow: `0 8px 24px -6px var(--color-btn-emerald-glow)`
  - **Active / Pressed State (`:active`)**: Physically depresses by `translateY(1px)`, flipping shadow to recessed `inset 0 2px 4px rgba(0, 0, 0, 0.40)` to eliminate specular bounce.
- **`Card`**: Surface container using `--radius-card` (4px) and warm shadow classes.
- **`SectionHeading`**: Consolidates eyebrow, fluid heading, and optional description.
- **`TextField`**: Accessible label-linked input with `htmlFor`, inline error messages, and `aria-live="polite"`.

## 6. Signature Interactive Components

### 6.1 Horizontal Scrolling Treatment Directory (`treatments.tsx`)
- **Category Filter Tabs**: Dynamic category pills (`All Treatments`, `Preventive`, `Restorative`, `Cosmetic`, `Emergency`) with the active tab highlighted using the tactile 4-shadow `.btn-premium-emerald` button style.
- **Horizontal Scrolling Cards Deck**: Hardware-accelerated smooth snapping carousel with left and right navigation chevrons.
- **Individual Treatment Cards**: Features high-resolution clinical imagery with eager loading to prevent image flash, category chip, duration badge (`Clock` + duration), procedural description, fee indicator (`From Rs. X`), and tactile 4-shadow `.btn-premium-emerald` booking CTA.
- **Signature Checkup Banner**: Diagnostic exam callout upgraded with the tactile 4-shadow emerald CTA.

### 6.2 Pure-CSS 3D Cylindrical Ring & Stage Arc (`our-team.tsx`)
- **Hardware-Accelerated 3D Transform**: Parent stage utilizes `perspective: 1600px` with central `.team-3d-ring` (`transform-style: preserve-3d`).
- **Equiangular Cylinder Geometry ($n \ge 8$)**: For full rosters ($n = 18$ All, $n = 10$ Islamabad), cards form an equiangular 360-degree cylinder ring with dynamically calculated chord radius $r = \max(420, \text{round}((W + G) / (2 \cdot \tan(\pi / n))))$.
- **Stage Arc Geometry ($n < 8$)**: Prevents 90-degree edge-on card occlusion on small filter subsets (e.g. Lahore with 4 clinicians, Karachi with 2 or 4 clinicians) by switching to an open 28-degree curved stage arc ($r = 580\text{px}$) keeping all doctors visible and facing forward.
- **Doctor Portrait Framing**: Taller 255px portrait box with custom focal point mapping (`object-[50%_65%] scale-110` for Dr. Maral, `object-[50%_25%]` for Dr. Bilal, `object-[50%_15%]` for standard studio framing) and eager sync image loading.
- **Interactivity & RTL**: Direct click-to-front navigation, continuous pointer drag with momentum snap, keyboard arrow navigation, and inverted rotation for Urdu RTL mode.
- **Mobile & Accessibility Fallbacks**: Viewports under `lg` or clients with `prefers-reduced-motion: reduce` gracefully transition to an accelerated touch-snapping horizontal carousel.

## 7. Motion & Animation Standards
- **Section Reveals**: `whileInView`, `opacity: 0 -> 1`, `y: 12-16px -> 0`, duration `0.35-0.45s`, threshold `0.2`.
- **List Staggering**: 60–80ms interval, capped under 350ms total.
- **FAQ Accordion**: Hardware-accelerated CSS `grid-template-rows: 0fr -> 1fr` duration `300ms ease-out`.
- **Reduced Motion**: Disables translations and scaling while preserving opacity fades.
