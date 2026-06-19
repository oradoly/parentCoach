# Parent Coach Design System

## 1. Atmosphere & Identity

Parent Coach should feel like a quiet preparation desk for a parent sitting next to a child. It is calm, direct, and instructional without becoming schoolish or playful. The signature is a soft study surface: restrained blue accents, warm-neutral backgrounds, and compact cards that make the next sentence easy to say out loud.

## 2. Color

### Palette

| Role              | Token              | Light     | Dark      | Usage                          |
| ----------------- | ------------------ | --------- | --------- | ------------------------------ |
| Surface/primary   | `surfacePrimary`   | `#F7F8FA` | `#101418` | App background                 |
| Surface/secondary | `surfaceSecondary` | `#FFFFFF` | `#171C22` | Cards and panels               |
| Surface/muted     | `surfaceMuted`     | `#EEF2F5` | `#222A32` | Low-emphasis bands             |
| Text/primary      | `textPrimary`      | `#172033` | `#F4F7FA` | Headlines and body             |
| Text/secondary    | `textSecondary`    | `#5B667A` | `#A9B2C0` | Captions and helper text       |
| Border/default    | `borderDefault`    | `#D9E0E7` | `#333D49` | Card outlines and dividers     |
| Accent/primary    | `accentPrimary`    | `#2563EB` | `#6EA8FF` | Links, focus, primary emphasis |
| Status/success    | `statusSuccess`    | `#15803D` | `#4ADE80` | Confirmed states               |
| Status/warning    | `statusWarning`    | `#B45309` | `#FBBF24` | Cautions                       |
| Status/error      | `statusError`      | `#B91C1C` | `#F87171` | Errors                         |

### Rules

- Accent is functional, not decorative.
- Do not use answer-reveal colors in early coaching states.
- Add a semantic token before adding a new color.

## 3. Typography

### Scale

| Level   | Size | Weight | Line Height | Tracking | Usage                |
| ------- | ---- | ------ | ----------- | -------- | -------------------- |
| H1      | 28px | 700    | 34px        | 0        | Mobile screen title  |
| H2      | 22px | 700    | 28px        | 0        | Section title        |
| Body    | 16px | 400    | 24px        | 0        | Default reading text |
| Body/sm | 14px | 400    | 20px        | 0        | Supporting copy      |
| Caption | 12px | 600    | 16px        | 0        | Labels and metadata  |

### Font Stack

- Primary: system UI on each platform.
- Mono: platform monospace only for developer surfaces.
- Serif: not used.

### Rules

- Body text never goes below 14px.
- Parent scripts should remain short enough to read aloud without scanning a paragraph.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token     | Value | Usage                    |
| --------- | ----- | ------------------------ |
| `spaceXs` | 4px   | Tight icon or label gaps |
| `spaceSm` | 8px   | Compact text groups      |
| `spaceMd` | 16px  | Default padding          |
| `spaceLg` | 24px  | Card padding             |
| `spaceXl` | 32px  | Screen section spacing   |

### Grid

- Mobile-first single-column layout.
- Content should keep comfortable side margins on phones.
- Fixed-format controls must have stable dimensions.

### Rules

- Use 4px multiples.
- Avoid nested cards. Use a single framed surface for each distinct repeated item.

## 5. Components

### Development Status Card

- **Structure**: One centered card with title, short description, and status metadata.
- **Variants**: Development only.
- **Spacing**: `spaceLg` card padding, `spaceSm` text gap.
- **States**: Static in M0.
- **Accessibility**: Text must be readable with platform font scaling.
- **Motion**: None in M0.

## 6. Motion & Interaction

### Timing

| Type     | Duration  | Easing      | Usage        |
| -------- | --------- | ----------- | ------------ |
| Micro    | 100-150ms | ease-out    | Button press |
| Standard | 200-300ms | ease-in-out | Panel reveal |

### Rules

- M0 has no app motion.
- Future motion should use opacity and transform only.
- Respect reduced motion settings.

## 7. Depth & Surface

### Strategy

Use borders-only for M0.

| Type    | Value                     | Usage              |
| ------- | ------------------------- | ------------------ |
| Default | 1px solid `borderDefault` | Cards and dividers |

No shadows in M0. Future elevation must be added to this section before use.
