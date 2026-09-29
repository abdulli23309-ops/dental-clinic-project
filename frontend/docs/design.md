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
- **`Button`**: Pill-shaped (`rounded-full`), primary (filled forest) and outline variants. Features subtle hover lift (`-translate-y-0.5` + shadow increase) and active press (`scale-[0.98]`).
- **`Card`**: Surface container using `--radius-card` (4px) and warm shadow classes.
- **`SectionHeading`**: Consolidates eyebrow, fluid heading, and optional description.
- **`TextField`**: Accessible label-linked input with `htmlFor`, inline error messages, and `aria-live="polite"`.

## 6. Motion & Animation Standards
- **Section Reveals**: `whileInView`, `opacity: 0 -> 1`, `y: 12-16px -> 0`, duration `0.35-0.45s`, threshold `0.2`.
- **List Staggering**: 60–80ms interval, capped under 350ms total.
- **FAQ Accordion**: Hardware-accelerated CSS `grid-template-rows: 0fr -> 1fr` duration `300ms ease-out`.
- **Reduced Motion**: Disables translations and scaling while preserving opacity fades.
