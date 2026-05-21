# SmartMENA Design System

## Overview

SmartMENA is a B2B SaaS analytics platform built for small and medium enterprises (SMEs) across the MENA region. It provides business intelligence, reporting, and data visualization tools localized for Arabic-speaking markets.

**Key characteristics:**
- Bilingual product: Arabic (RTL primary) and English (LTR)
- Target users: Finance managers, operations leads, and founders at MENA SMEs
- Platforms: Web application (desktop-first, tablet-responsive)

---

## Design Philosophy: Warm Desert Modernism

The visual language draws from the MENA region's architectural and material culture — warm sandstone, geometric precision, structured openness — rather than generic Silicon Valley SaaS aesthetics. The system is clean and professional but has regional soul: warm neutrals, structured grid, and typography that treats Arabic as a first-class language, not an afterthought.

**Principles:**
1. **Bilingual first** — every component is designed for both RTL and LTR from the ground up
2. **Data clarity** — information hierarchy is paramount; decoration serves data, never obscures it
3. **Warm confidence** — colors are professional but not sterile; drawn from earth tones, not tech blues
4. **Settled motion** — animations are subtle and purposeful; nothing bounces or surprises

---

## Sources

This design system was created from scratch for SmartMENA. No external codebase or Figma file was provided. The system is fully original.

---

## CONTENT FUNDAMENTALS

**Tone:** Professional, direct, and regionally aware. Copy feels like a trusted local advisor, not an impersonal SaaS product.

**Voice characteristics:**
- Concise and factual in data contexts ("Revenue grew 14% this quarter")
- Warm but not casual in UI chrome ("Welcome back, Ahmad")
- Action-oriented CTAs ("View Report", "Export Data" — not "Get Started!" or "Let's Go!")
- No exclamation marks in data/analytics contexts
- Numbers use MENA-appropriate formatting: Arabic-Indic numerals available as option, Western Arabic numerals default for B2B

**Bilingual rules:**
- Arabic is RTL; English is LTR. Never mix in a single sentence.
- UI labels are translated fully, not anglicized (no "Dashboard دَشبورد")
- Dates: Gregorian default, Hijri available as toggle
- Currency: SAR, AED, EGP, USD as configurable locale

**Casing:**
- English: Title Case for navigation, Sentence case for body copy and labels
- Arabic: Standard Arabic capitalization rules apply (no uppercase equivalents)

**Emoji:** Not used in product UI. Data-only context prohibits casual emoji.

---

## VISUAL FOUNDATIONS

See `colors_and_type.css` for full token definitions.

**Colors:**
- Base palette: Warm sand whites (#FDFAF6), deep inkstone for text
- Primary: Deep Teal — communicates trust, precision, professionalism with regional warmth
- Secondary accent: Warm Amber — data highlights, alerts, call-to-action contrast
- Brand: Terracotta — subtle brand identity, used sparingly in illustrations/onboarding
- Neutrals: Warm-tinted, never cold grays

**Typography:**
- English: IBM Plex Sans (400/500/600/700) — structured, analytical, humanist
- Arabic: IBM Plex Sans Arabic (400/500/600) — shares optical metrics with English counterpart, ensuring visual harmony in mixed layouts
- Mono: IBM Plex Mono — for data values, code, IDs
- Scale: Major Third type scale (1.25 ratio)

**Spacing:** 8px base grid. Tokens: 4, 8, 12, 16, 24, 32, 48, 64, 96px

**Backgrounds:**
- App background: `--bg-base` warm off-white (#FDFAF6)
- Card surfaces: `--bg-surface` white with subtle warm tint
- Sidebar: `--bg-sidebar` deep inkstone
- No full-bleed images in app chrome; imagery confined to onboarding and empty states

**Corner radii:**
- Small (inputs, chips): 6px
- Medium (cards, modals): 10px
- Large (sheets, drawers): 16px
- Pills (tags, badges): 999px

**Shadows:**
- Cards: `0 1px 3px rgba(30,22,12,0.06), 0 1px 2px rgba(30,22,12,0.04)`
- Elevated (modals): `0 8px 24px rgba(30,22,12,0.12), 0 2px 8px rgba(30,22,12,0.06)`
- No harsh box shadows; all use warm-tinted black (inkstone base)

**Borders:**
- Default: 1px solid `--border-subtle` (warm gray, very low contrast)
- Focus: 2px solid `--color-primary`
- Error: 1px solid `--color-danger`

**Motion:**
- Duration: 150ms (micro), 250ms (standard), 400ms (page transition)
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` for standard; `cubic-bezier(0.0, 0, 0.2, 1)` for enter; `cubic-bezier(0.4, 0, 1, 1)` for exit
- No spring/bounce animations in data contexts
- Hover: opacity shift or subtle background color change (no transforms unless interactive)

**Hover/press states:**
- Buttons: background darkens 8% on hover, 14% on press
- Table rows: `--bg-hover` warm tint
- Links: underline appears on hover (no color change)
- Cards: subtle shadow lift on hover for clickable cards

**Iconography:** See ICONOGRAPHY section below.

---

## ICONOGRAPHY

**System:** Phosphor Icons (https://phosphoricons.com) — chosen for:
- Clean, consistent stroke weight (regular weight default)
- Full Arabic-compatible neutral design (no culturally specific gestures)
- Available as CDN font or SVG
- Wide coverage for analytics/finance/settings use cases

**Usage rules:**
- Default weight: `regular` (1.5px stroke equivalent)
- Data/emphasis contexts: `bold` weight
- Size: 16px inline, 20px in buttons, 24px in section headers
- Never use emoji as icons
- Never use filled icons alongside outline icons in the same context
- CDN: `https://unpkg.com/@phosphor-icons/web`

---

## CHART COLOR SYSTEM

8-color categorical palette designed for:
- Distinguishability across color vision deficiencies
- Legibility on both white and warm-tinted backgrounds
- Harmony with the brand palette

Colors: Teal, Amber, Terracotta, Sage, Plum, Sky, Gold, Slate

---

## File Index

| File | Description |
|------|-------------|
| `README.md` | This file — system overview and foundations |
| `colors_and_type.css` | All CSS custom properties: color tokens, type scale, spacing, radii, shadows |
| `preview/colors-brand.html` | Brand color palette swatches |
| `preview/colors-semantic.html` | Semantic color tokens |
| `preview/colors-charts.html` | Data visualization color palette |
| `preview/type-english.html` | English type scale specimen |
| `preview/type-arabic.html` | Arabic type scale specimen |
| `preview/type-pairing.html` | Bilingual pairing examples |
| `preview/spacing-tokens.html` | Spacing scale tokens |
| `preview/radius-shadow.html` | Border radius + shadow system |
| `preview/components-buttons.html` | Button variants + states |
| `preview/components-inputs.html` | Form input variants |
| `preview/components-cards.html` | Card variants |
| `preview/components-badges.html` | Badge, tag, and status indicators |
| `preview/motion-guidelines.html` | Motion/animation guidelines |
| `SKILL.md` | Agent skill definition |

---

## UI Kits

No UI kits created yet. To generate a UI kit for the SmartMENA web app, invoke this skill and request screen designs.
