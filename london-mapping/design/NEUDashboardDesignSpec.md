# NEU Organising Dashboard — Design Spec

Companion to `neu-dashboard-tokens.css`. Values below are the ones to implement verbatim.
**Dark mode is not defined by the NEU Design System** (source guide covers a marketing site only) — every dark-mode value here is derived by this spec, flagged `EXTENSION`, not sourced from NEU brand material.

## 1. Color tokens

| Token | Light | Dark | Notes |
|---|---|---|---|
| surface-page | `#F7F8F9` | `#1B1F22` | Light value nudged off pure white (DS default) so cards read as raised — `EXTENSION` |
| surface-card | `#FFFFFF` | `#262B2F` | |
| surface-sunken | `#EEF1F2` | `#14171A` | table headers, inset wells |
| surface-hover | `#E4E8EA` | `#2F353A` | row/list-item hover fill |
| text-primary | `#333F48` | `#F2F4F5` | |
| text-secondary | `#565D63` | `#9EA6AB` | |
| text-muted | `#767E84` | `#838A90` | |
| border (hairline) | `#D0D0CE` | `#383E43` | |
| gridline | `#DBE0E2` | `#333A3F` | table row dividers — one step lighter than `border` |
| accent | `#009CA6` | `#009CA6` | Pantone 320C turquoise, unchanged in dark |
| accent-ink | `#FFFFFF` | `#FFFFFF` | text/icons on top of accent fills |
| success / success-bg | `#2F7A4F` / `#E7F3EC` | `#34C77B` / `rgba(47,122,79,.22)` | |
| warning / warning-bg | `#A15C00` / `#FBEEE0` | `#E8A33D` / `rgba(161,92,0,.22)` | |
| critical / critical-bg | `#B3261E` / `#FBE9E8` | `#F4726A` / `rgba(179,38,30,.22)` | |

## 2. Contrast + colorblind flags (act on these)

- **All body-text pairings above pass WCAG AA** (checked against their paired surface): text-primary/secondary/muted on page and card surfaces all clear 4.5:1 in both modes (dark text-muted `#838A90` on `#262B2F` ≈ 4.7:1).
- **Fails AA — primary button fill:** white text (`accent-ink`) on `accent` (`#009CA6`) is **3.3:1** — fails the 4.5:1 normal-text threshold, only clears AA as "large text" (≥18.66px bold / 24px regular). Most button labels run smaller/semibold. **Fix:** use `--accent-hover` (`#00747C`, 5.5:1) as the *resting* fill for text buttons, reserving base `--accent` for large/bold labels, icon-only buttons, or non-text fills (progress bars, borders).
- **Colorblind risk:** `success` (#2F7A4F) and `critical` (#B3261E) sit at similar mid-low luminance — under deuteranopia/protanopia simulation they can read as similar dark, desaturated tones despite passing AA contrast individually. **Fix (required, not optional):** never encode status by color alone — every status pill/badge must pair color with an icon (✓ / ! / ✕ equivalent) or a text label ("Active", "At risk", "Overdue"). This is enforced in the component spec below.
- Dark-mode status colors were independently re-derived (not just lightened) to clear 4.5:1 against `surface-card` — e.g. critical needed brightening to `#F4726A` (light-mode `#B3261E` only hits ~4.2:1 on dark).

## 3. Typography

- **Stack:** `'Rubik', Arial, Helvetica, sans-serif` — Rubik loaded via `@font-face` (jsDelivr Fontsource CDN, woff2, weights 400/500/600/700) in the CSS file. Arial fallback per brand guidelines.
- **Floor:** body text never below `14.6px` (11pt).

| Role | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|
| Page heading (h1) | 28px | 700 | 1.1 | normal |
| Section heading (h2/h3) | 18–22px | 700 | 1.25 | normal |
| Body text | 14.6–16px | 400 | 1.5 | normal |
| Small / label text | 12–13px | 500 | 1.25 | normal |
| Uppercase micro-label (e.g. "STATUS", "REGION") | 12px | 600 | 1.25 | `0.06em`, `text-transform:uppercase` |
| Stat figure (KPI number) | 36–48px | 700 | 1.1 | normal, `font-variant-numeric:tabular-nums` |

## 4. Geometry

- Radii: sm `4px` (chips, inputs), md `8px` (cards, dialogs), lg `14px` (large panels), pill `999px` (buttons, badges)
- Borders: `1px` default hairline, `2px` for outline-button borders and focus-adjacent emphasis
- Shadows (light mode only — dark mode leans on the page/card tonal step instead):
  - sm `0 1px 2px rgba(51,63,72,.08)` — resting card
  - md `0 4px 12px rgba(51,63,72,.10)` — hovered card / dropdown
  - lg `0 12px 28px rgba(51,63,72,.14)` — modal/dialog
- Spacing scale: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40px`
- Focus ring: `0 0 0 3px` turquoise at 35% opacity (light) / 45% (dark, for visibility on dark fills)

## 5. Components

**Stat tile / KPI card**
- Container: `surface-card`, `radius-md`, `shadow-sm`, `border: 1px solid var(--border)`, padding `20px 24px`
- Label: uppercase micro-label style, `text-secondary`
- Number: stat-figure style (36–48px/700/tabular-nums), `text-primary`; use a status color (success/warning/critical) instead of `text-primary` only when the number itself IS the status signal (e.g. "3 disputes open" in critical) — plus an icon, per the colorblind rule above
- Optional trend delta: small text (13px/500) in success/critical color + a directional arrow glyph (never color alone)

**Data table**
- Header row: `surface-sunken` bg, `text-secondary`, 12px/600 uppercase with `0.06em` tracking, `border-bottom: 1px solid var(--border)`, height 40px
- Body row: `surface-card` bg, `text-primary` 14.6px/400, height 44px min (touch/click target), `border-bottom: 1px solid var(--gridline)`
- Row hover: bg → `surface-hover`, `duration-fast` ease
- Numeric columns: right-aligned, `tabular-nums`; text columns left-aligned
- Zebra striping: `surface-zebra` on even rows (~2% off `surface-card`). Originally specified as "not used", to keep the palette restrained per DS guidance; reversed once the tables were in use, because they scroll horizontally and a reader tracking one school across nine or more columns needs a band to follow. The shift is small enough to read as texture rather than colour, and `gridline` + hover still do most of the work. Tables with a sticky first column must restate the stripe on that cell, which paints its own background.
- Text cells: capped with `max-width` and ellipsised, full value on the `title` attribute — a long school name should not be able to set the column width for every other row.
- Proportion bars: density and turnout cells only, `--accent` at 16%, scaled 0–100% behind the value. Not used on any other numeric column; a bar on an unbounded count would imply a maximum that doesn't exist.

**Status pill / badge**
- Shape: `radius-pill`, padding `2px 10px`, 12px/600 text
- Fill: `{status}-bg`, text: `{status}` color, plus a leading icon (dot/check/triangle/x — 8–10px) — icon shape is the primary distinguishing signal, color is secondary reinforcement
- Example states: Active (success), At risk (warning), Overdue (critical), Info (info)

**Buttons**
- Primary: fill `--accent-hover` (see AA fix above; NOT base `--accent`) · text `--accent-ink` · `radius-pill` · padding `10px 20px` · 14.6px/600 · hover → `--accent-active` · focus → `focus-ring`
- Secondary (outline): transparent fill · `2px solid var(--border-strong` equivalent, i.e. `var(--text-secondary)`) border · text `--text-primary` · hover → bg `--surface-hover`
- Disabled: 40% opacity, no hover/focus response

**Form fields**
- Label: 13px/500, `text-secondary`, `margin-bottom:4px`
- Input / select / textarea: `surface-card` bg, `1px solid var(--border)`, `radius-sm`, padding `8px 12px`, 14.6px/400 `text-primary`; focus → border `--accent` + `focus-ring`; textarea min-height `88px`
- Error state: border `--color-critical`, helper text 12px `--color-critical` below field

**Sidebar nav item**
- Default: `text-secondary`, transparent bg, `radius-sm`, padding `10px 12px`, icon + label, 14.6px/500
- Hover: bg `--surface-hover`, text `--text-primary`
- Active: bg `color-mix(in oklch, var(--accent) 12%, transparent)`, text `--accent`, left 3px accent bar (only non-color cue: bold weight 600 on the label)

**Inline banner / alert strip**
- Full-width bar: `{status}-bg` fill, `4px solid {status}` left border (structural cue, not color-only — pairs with the icon), padding `12px 16px`, icon + 14.6px/400 text in `text-primary` (not the status color, for body-copy legibility), optional dismiss control right-aligned

## 6. Files
- `neu-dashboard-tokens.css` — drop-in custom-property definitions, light + `[data-theme="dark"]`
