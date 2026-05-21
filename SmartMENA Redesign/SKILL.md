---
name: smartmena-design
description: Use this skill to generate well-branded interfaces and assets for SmartMENA, a B2B SaaS analytics platform for SMEs in the MENA region. Contains essential design guidelines, bilingual (Arabic RTL + English LTR) color tokens, type system, spacing, component patterns, and motion principles for prototyping or production.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

**Key reminders for SmartMENA:**
- Always import `colors_and_type.css` for tokens (colors, type, spacing, radii, shadows)
- Font stack: IBM Plex Sans (English) + IBM Plex Sans Arabic (Arabic/RTL) + IBM Plex Mono (data values)
- Every component must be tested in both LTR and RTL — use `dir="rtl"` and `lang="ar"` together
- Icons: Phosphor Icons via CDN (`https://unpkg.com/@phosphor-icons/web`)
- No glassmorphism, no gradient backgrounds, no AI-style glows
- Warm off-white canvas (`--bg-base`), not pure white
- Animations: max 250ms standard, cubic-bezier(0.4,0,0.2,1) — never bounce

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert product designer who outputs HTML artifacts or production code, depending on the need.
