# Brand Color Style Guide

The brand palette is built on five core colors: a primary blue, a vivid red accent, a deep navy for ink and dark surfaces, a light neutral gray, and white as the base surface.

## Palette

| Token | Hex | RGB | Role |
|-------|-----|-----|------|
| Primary | `#0E4D98` | `14, 77, 152` | Primary brand color — links, primary buttons, headers |
| Accent | `#EA2128` | `234, 33, 40` | Accent / call-to-action, alerts, highlights |
| Ink | `#11304F` | `17, 48, 79` | Body text, dark surfaces, footers |
| Neutral | `#CDCFD1` | `205, 207, 209` | Borders, dividers, disabled states |
| Surface | `#FFFFFF` | `255, 255, 255` | Page background, cards, base surface |

## CSS Custom Properties

```css
:root {
  --color-primary: #0E4D98;
  --color-accent:  #EA2128;
  --color-ink:     #11304F;
  --color-neutral: #CDCFD1;
  --color-surface: #FFFFFF;

  /* RGB channels for rgba() usage, e.g. shadows/overlays */
  --color-primary-rgb: 14, 77, 152;
  --color-accent-rgb:  234, 33, 40;
  --color-ink-rgb:     17, 48, 79;
  --color-neutral-rgb: 205, 207, 209;
  --color-surface-rgb: 255, 255, 255;
}
```

## SCSS Variables

```scss
$color-primary: #0E4D98;
$color-accent:  #EA2128;
$color-ink:     #11304F;
$color-neutral: #CDCFD1;
$color-surface: #FFFFFF;
```

## Accessibility — Contrast Pairings

Ratios are WCAG 2.1. AA requires 4.5:1 for normal text, 3:1 for large text and UI components; AAA requires 7:1 for normal text.

| Foreground | Background | Ratio | Verdict |
|------------|-----------|-------|---------|
| Ink `#11304F` | Surface `#FFFFFF` | 13.5:1 | ✅ AAA — primary text pairing |
| Primary `#0E4D98` | Surface `#FFFFFF` | 8.3:1 | ✅ AAA — links, headings |
| Surface `#FFFFFF` | Primary `#0E4D98` | 8.3:1 | ✅ AAA — primary buttons |
| Surface `#FFFFFF` | Accent `#EA2128` | 4.4:1 | ⚠️ Large text & UI only (just under AA for body text) |
| Neutral `#CDCFD1` | Surface `#FFFFFF` | 1.6:1 | ❌ Borders/dividers only — never text |
| Neutral `#CDCFD1` | Ink `#11304F` | 8.6:1 | ✅ AAA — muted text on dark surfaces |

## Usage Guidelines

- **Primary `#0E4D98`** — the dominant brand color. Use for primary actions, active states, links, and key headers. White text on top is fully accessible.
- **Accent `#EA2128`** — use sparingly for emphasis: CTAs, error/alert states, badges. Because white-on-red sits just below the AA threshold for body text, reserve white text on red for buttons and large labels; for small text on red, increase the font size/weight or use it as a background accent only.
- **Ink `#11304F`** — default body text color and dark surface fill (footers, nav bars). Pair with white or neutral gray text.
- **Neutral `#CDCFD1`** — structural only: borders, dividers, disabled controls, subtle fills. Do not use as a text color on white.
- **Surface `#FFFFFF`** — base background. Keep it dominant to let the blue and red carry the brand.

## Suggested Proportion

A balanced application leans on white and ink for most of the surface area, uses the primary blue as the consistent brand signal, and reserves the red accent for the small share of elements that need to draw the eye.