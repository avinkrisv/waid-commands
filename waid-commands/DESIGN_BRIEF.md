# Design Brief — waid-commands HTML report

## Context

`waid-commands` is a Claude Code plugin. When a user runs `/under-the-hood`, Claude analyzes the user's project and writes a structured JSON file. A bash launcher injects that JSON into a self-contained HTML file (CSS + JS inline, single Mermaid CDN dep) and opens it in the user's default browser. Audience: developers, often "vibe coders" who don't yet have a strong mental model of their project. The page is a teaching tool, not a dashboard.

The page already works functionally. It does not work *visually*. We need a designer to take it from "renders" to "feels considered."

## Current state, honestly

A live screenshot shows multiple issues:

1. **Inline `<code>` reads as black censor bars.** Token `--waid-color-code-bg: #1e2330` (dark navy) was chosen for code *blocks* on a dark background, but it's also being applied to *inline* code on the light page background. Inline code paths like `analysis/v2_validators.rs` look like redaction marks instead of monospace text.
2. **No visible card / section boundaries.** Section component styles (`.waid-card`, etc.) exist in CSS but the HTML doesn't apply them — sections render as flat unstyled blocks. There's no rhythm, no surface, no shadow.
3. **TOC overlaps main content** at the current viewport width. Layout grid intent: 260 px sticky TOC on the left, ≤ 880 px content column on the right, > 960 px viewport. The implementation doesn't constrain widths or position the TOC correctly.
4. **No visible heading hierarchy.** H1 (page title) and H2 (section titles) look identical in size/weight. Body and caption text are also indistinguishable.
5. **View toggle (Technical / Layman) is two unstyled text words next to each other.** Should be a single segmented-control switch with a clear active state.
6. **Theme toggle doesn't actually toggle theme.** Even when working, "auto / light / dark" needs a clearer affordance than the current crescent icon. Dark mode CSS exists; activation does not.
7. **Stray "Methodologies" pill** floats inside one of the sections — looks like a misplaced badge.
8. **No max-width on the body.** On a wide monitor, paragraph lines run too long to read comfortably.
9. **Sticky header / TOC** are not visibly sticky — feels like a long static page.
10. **Glossary tooltips** are wired up in JS but the visual treatment of the glossary terms (dotted underline + hover surface) is barely visible.
11. **Pitfall severity** badges (`low` / `medium` / `high`) are colour-tokenized in CSS but not applied — every pitfall looks the same.
12. **Quiz cards** look like raw `<button>` elements, not interactive learning UI.

## Goals

- **Readable, calm, doc-site feel.** Think Linear changelog, Stripe docs, Vercel blog. Not dashboard, not marketing site.
- **Clear hierarchy** — page title, section title, sub-section, body, caption, code all distinct.
- **Light + dark mode that both feel intentional**, not "the same design with inverted colors."
- **Make the "two views" a defining feature.** The Technical ↔ Layman toggle is the product's reason to exist; it should be the most polished single control on the page.
- **Mobile-friendly.** Phone reading is a real use case — devs reading their own report on the train.

## Hard constraints

- **Single HTML file.** No build step. No `<link>` to external CSS or JS (Mermaid CDN is the only allowed exception).
- **System fonts only.** No Google Fonts, no `@import`. Stack: `Inter, system-ui, …` for sans, `JetBrains Mono, Menlo, …` for mono.
- **CSS custom properties already defined.** Token names are stable — see `assets/template.css`. Designer can re-tune values, can add new tokens, but should not rename existing ones (other components reference them).
- **Theme switching:** `data-theme="light" | "dark" | "auto"` on `<html>`. Dark mode CSS already partially in place, needs polish + ensure the JS toggle button actually works.
- **No CSS frameworks** (Tailwind etc.). Plain CSS.
- **Vanilla JS only.** No React/Vue.
- **Accessible.** WCAG AA contrast minimum, focus rings on all interactive elements, `prefers-reduced-motion` respected, keyboard nav for TOC and quiz.

## Sections to design (one HTML page, scrolling)

1. Sticky page header — title, view toggle (Technical ↔ Layman), theme toggle (light/dark/auto).
2. Sticky TOC sidebar — scroll-spies the active section, mobile collapses to a drawer.
3. **Overview** — single paragraph hero.
4. **Tech Stack** — list of chip cards, each: name, role, version. Possibly a short tagline.
5. **Architecture** — narrative + Mermaid diagram (renders as SVG; must be legible in both modes).
6. **Algorithms** — entries with name, complexity badge, technical/layman text.
7. **Methodologies** — entries with name + technical/layman.
8. **Pattern Rationale** — entries: pattern name, why-chosen, trade-offs.
9. **Pitfalls** — severity-coloured cards (low / medium / high), title + technical/layman.
10. **Glossary** — definition list with hover tooltips on terms used elsewhere.
11. **Quiz** — multi-choice questions with reveal-on-pick, correct/wrong styling.

## Deliverables

1. Updated `assets/template.html` (HTML structure + class hooks). Keep existing `id`s and `data-waid-section` attributes — the JS depends on them.
2. Updated `assets/template.css`. Re-tune tokens, fix the inline-code-as-redaction-bar bug, lay out the page properly, polish the toggle controls.
3. Light + dark mode mockups (Figma or PNG) of all 11 sections at desktop + mobile widths.
4. A short readme of any new tokens or component classes added.

## Reference fixtures

- `tests/fixtures/rich.json` — representative TypeScript/Postgres project. Use as the design data to show the page populated.
- `tests/fixtures/minimal.json` — to verify empty-state handling (empty glossary, empty quiz).

## Out of scope

- New sections beyond the 11 above.
- Server-rendered or interactive analytics.
- A separate landing page or marketing site.
- Telemetry, sign-in, social sharing.

## Success criteria

A developer who has never seen this project can open the report, in dark mode on a 13" laptop, read all 11 sections without squinting, identify the highest-severity pitfall in under five seconds, take a quiz question, and want to send it to a teammate.
