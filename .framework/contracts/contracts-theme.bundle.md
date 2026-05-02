# Layer: theme — 1 contract(s)

---

## Contract: DesignTokens

Source: `theme/DesignTokens.contract.md`


# DesignTokens Contract

Layer: theme

## Responsibility

Define all CSS custom properties (color, typography, spacing, radii, shadows, motion) consumed by every UI component in the `waid` HTML report, ensuring a calm, content-first appearance that remains legible in both light and dark modes.

---

## Color Tokens

All values live on `:root` (light defaults) and are overridden under `[data-theme="dark"]`. The `auto` variant is handled in CSS via `@media (prefers-color-scheme: dark)` inside a `[data-theme="auto"]` block.

| Token | Light Value | Dark Value | Usage |
|---|---|---|---|
| `--waid-color-bg-base` | `#fefefe` | `#0e1014` | Page background |
| `--waid-color-bg-surface` | `#f5f6f8` | `#14171d` | Cards, sidebar, code-block bg |
| `--waid-color-bg-sunken` | `#eceef2` | `#0b0d10` | Inset areas, quiz choice bg |
| `--waid-color-bg-overlay` | `#ffffff` | `#1c2029` | Tooltips, dropdowns |
| `--waid-color-border` | `#dde1e7` | `#2a2f3a` | Card borders, dividers |
| `--waid-color-border-subtle` | `#eceef2` | `#1e2229` | Subtle separators |
| `--waid-color-text-primary` | `#111318` | `#e8eaf0` | Body copy, headings |
| `--waid-color-text-secondary` | `#4a5260` | `#8b93a4` | Captions, metadata, labels |
| `--waid-color-text-tertiary` | `#7a8499` | `#5c6475` | Placeholder, disabled |
| `--waid-color-text-inverse` | `#ffffff` | `#111318` | Text on filled accent bg |
| `--waid-color-text-code` | `#1a2a44` | `#c9d8f0` | Inline code text |
| `--waid-color-accent` | `#3b72f2` | `#5d8fff` | Links, active TOC, focus rings |
| `--waid-color-accent-subtle` | `#eef2fe` | `#1a2545` | Accent tint backgrounds |
| `--waid-color-accent-muted` | `#7da0f8` | `#3b5db8` | Hover states for accent elements |
| `--waid-color-code-bg` | `#1e2330` | `#101318` | Fenced code block background |
| `--waid-color-code-border` | `#2d3348` | `#1e2330` | Code block border |
| `--waid-color-severity-low` | `#1e7a4f` | `#34c47a` | Pitfall — low severity text/icon |
| `--waid-color-severity-low-bg` | `#edfaf3` | `#0d2a1c` | Pitfall — low severity card bg |
| `--waid-color-severity-low-border` | `#a3dfc0` | `#1a4a32` | Pitfall — low severity border |
| `--waid-color-severity-medium` | `#92620a` | `#f0b94a` | Pitfall — medium severity text/icon |
| `--waid-color-severity-medium-bg` | `#fef9ec` | `#2a1e08` | Pitfall — medium severity card bg |
| `--waid-color-severity-medium-border` | `#f5d48a` | `#4a3410` | Pitfall — medium severity border |
| `--waid-color-severity-high` | `#b02020` | `#f27272` | Pitfall — high severity text/icon |
| `--waid-color-severity-high-bg` | `#fff0f0` | `#2a0e0e` | Pitfall — high severity card bg |
| `--waid-color-severity-high-border` | `#f5baba` | `#4a1818` | Pitfall — high severity border |
| `--waid-color-chip-bg` | `#eceef2` | `#1c2029` | Tech-stack chip background |
| `--waid-color-chip-text` | `#2e3442` | `#b0b8cc` | Tech-stack chip text |
| `--waid-color-chip-border` | `#dde1e7` | `#2a2f3a` | Tech-stack chip border |
| `--waid-color-toggle-bg` | `#dde1e7` | `#2a2f3a` | Toggle track background |
| `--waid-color-toggle-thumb` | `#ffffff` | `#e8eaf0` | Toggle thumb |
| `--waid-color-focus-ring` | `#3b72f2` | `#5d8fff` | Keyboard focus outline |
| `--waid-color-quiz-correct` | `#1e7a4f` | `#34c47a` | Quiz correct-answer highlight |
| `--waid-color-quiz-incorrect` | `#b02020` | `#f27272` | Quiz incorrect-answer highlight |

**Total color tokens: 32**

**Note on naming**: token families follow `--waid-{category}-{role}[-{variant}]`. Backgrounds use `bg-base/surface/sunken/overlay/code`; text uses `text-primary/secondary/tertiary/inverse/code`; severity uses `severity-{level}` plus `-bg` and `-border` companions. Earlier drafts of UI contracts referenced shorter names (`--waid-color-bg`, `--waid-color-fg`, `--waid-color-correct`, etc.); those are NOT defined — UI components must use the canonical names above.

---

## Typography Tokens

No CDN or `@import`. All stacks use system fonts with one fallback tier.

**Font families**

| Token | Value | Usage |
|---|---|---|
| `--waid-font-sans` | `"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | Body copy, headings, UI labels |
| `--waid-font-mono` | `"JetBrains Mono", "Fira Code", Menlo, Consolas, "Courier New", monospace` | Code blocks, inline code |

**Type scale** — 1.2 (minor third) ratio, base 16 px

| Token | Size | rem | Usage |
|---|---|---|---|
| `--waid-fs-xs` | 11 px | `0.6875rem` | Tertiary labels, chip text |
| `--waid-fs-sm` | 13 px | `0.8125rem` | Secondary labels, metadata, TOC items |
| `--waid-fs-base` | 16 px | `1rem` | Body copy |
| `--waid-fs-md` | 19 px | `1.1875rem` | Sub-section headings (h3) |
| `--waid-fs-lg` | 23 px | `1.4375rem` | Section headings (h2) |
| `--waid-fs-xl` | 28 px | `1.75rem` | Page-level headings (h1-equivalent) |
| `--waid-fs-2xl` | 33 px | `2.0625rem` | Report title |
| `--waid-fs-3xl` | 40 px | `2.5rem` | Hero / cover display (reserved) |

**Font weights**

| Token | Value | Usage |
|---|---|---|
| `--waid-fw-regular` | `400` | Body copy |
| `--waid-fw-medium` | `500` | Labels, TOC items, chip text |
| `--waid-fw-semibold` | `600` | Sub-headings, card titles |
| `--waid-fw-bold` | `700` | Section headings, report title |

**Line heights**

| Token | Value | Usage |
|---|---|---|
| `--waid-lh-tight` | `1.25` | Headings, chips, single-line UI |
| `--waid-lh-snug` | `1.4` | Labels, TOC items |
| `--waid-lh-body` | `1.6` | Body copy (exceeds WCAG minimum 1.5) |
| `--waid-lh-code` | `1.55` | Code blocks |

**Letter spacing**

| Token | Value | Usage |
|---|---|---|
| `--waid-ls-tight` | `-0.01em` | Large headings |
| `--waid-ls-normal` | `0em` | Body, code |
| `--waid-ls-wide` | `0.04em` | Uppercase labels, chip text |

**Total typography tokens: 23** (2 family + 8 scale + 4 weight + 4 line-height + 3 letter-spacing + family enumeration in component styles)

---

## Spacing Tokens

4 px base grid.

| Token | Value | Usage |
|---|---|---|
| `--waid-space-1` | `4px` | Tight padding inside chips, icon gaps |
| `--waid-space-2` | `8px` | Inline padding, small gaps |
| `--waid-space-3` | `12px` | Input / button vertical padding |
| `--waid-space-4` | `16px` | Card inner padding (mobile), list item gap |
| `--waid-space-6` | `24px` | Card inner padding (desktop), section gap |
| `--waid-space-8` | `32px` | Between major sections |
| `--waid-space-12` | `48px` | Section vertical rhythm |
| `--waid-space-16` | `64px` | Page-level vertical padding |

---

## Layout Tokens

| Token | Value | Usage |
|---|---|---|
| `--waid-content-max-width` | `880px` | Max width of the main content column |
| `--waid-toc-width` | `260px` | Sticky TOC sidebar width on `>= lg` viewports |

---

## Z-index Tokens

Layered stacking context for the report. Keep gaps of 10 between tiers so future inserts don't require renumbering.

| Token | Value | Usage |
|---|---|---|
| `--waid-z-header` | `100` | Sticky `#waid-header` |
| `--waid-z-toc` | `90` | Sticky `#waid-toc` sidebar |
| `--waid-z-tooltip` | `200` | Glossary tooltips |
| `--waid-z-dialog` | `300` | Diagram-zoom dialog overlay |

---

## Radius Tokens

| Token | Value | Usage |
|---|---|---|
| `--waid-radius-sm` | `4px` | Inline code, small chips, toggle thumb |
| `--waid-radius-md` | `8px` | Cards, buttons, quiz choices |
| `--waid-radius-lg` | `12px` | Code blocks, large modal-style surfaces |
| `--waid-radius-xl` | `16px` | Sidebar panel, hero areas |
| `--waid-radius-full` | `9999px` | Toggle track, pill chips, focus ring on circular icons |
| `--waid-radius-pill` | `9999px` | Alias of `--waid-radius-full`. Provided for naming clarity at call sites that semantically refer to "pills" rather than circles. |

---

## Shadow Tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--waid-shadow-xs` | `0 1px 2px rgba(0,0,0,0.06)` | `0 1px 2px rgba(0,0,0,0.3)` | Chips, subtle lift |
| `--waid-shadow-sm` | `0 2px 6px rgba(0,0,0,0.08)` | `0 2px 6px rgba(0,0,0,0.4)` | Cards at rest |
| `--waid-shadow-md` | `0 4px 16px rgba(0,0,0,0.10)` | `0 4px 16px rgba(0,0,0,0.5)` | Cards on hover, tooltips |
| `--waid-shadow-lg` | `0 12px 32px rgba(0,0,0,0.14)` | `0 12px 32px rgba(0,0,0,0.6)` | Diagram-zoom dialog |
| `--waid-shadow-focus` | `0 0 0 3px rgba(59,114,242,0.35)` | `0 0 0 3px rgba(93,143,255,0.4)` | Keyboard focus ring |

**Semantic aliases** (provided for self-documenting use at call sites):

| Alias Token | Resolves To | Usage |
|---|---|---|
| `--waid-shadow-card` | `var(--waid-shadow-sm)` | Section cards at rest |
| `--waid-shadow-tooltip` | `var(--waid-shadow-md)` | Glossary tooltips |
| `--waid-shadow-dialog` | `var(--waid-shadow-lg)` | Diagram-zoom dialog |

---

## Motion Tokens

| Token | Value | Usage |
|---|---|---|
| `--waid-duration-instant` | `80ms` | Toggle thumb snap, chip press |
| `--waid-duration-fast` | `150ms` | Collapse/expand icon rotation, hover state |
| `--waid-duration-medium` | `240ms` | Card collapse, tooltip fade, theme crossfade. Alias `--waid-duration-normal` provided for back-compat with prior naming. |
| `--waid-duration-normal` | `var(--waid-duration-medium)` | Alias of `--waid-duration-medium`. |
| `--waid-duration-slow` | `400ms` | Page-level transitions (reserved) |
| `--waid-ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard ease-in-out (Material curve) |
| `--waid-ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Toggle thumb overshoot |

**Reduced motion override**: Inside `@media (prefers-reduced-motion: reduce)` set all `--waid-duration-*` tokens to `0ms` and replace `--waid-ease-spring` with `linear`. Component transitions reference only these tokens, so they go instant automatically — no per-component override needed.

---

## Component Styles

All class definitions use token references only. No raw color, size, or timing values in component CSS.

### `.waid-card` — Section card (collapsible)

```css
.waid-card {
  background: var(--waid-color-bg-surface);
  border: 1px solid var(--waid-color-border);
  border-radius: var(--waid-radius-md);
  box-shadow: var(--waid-shadow-sm);
  padding: var(--waid-space-6);
  transition: box-shadow var(--waid-duration-fast) var(--waid-ease-default);
}
.waid-card:hover {
  box-shadow: var(--waid-shadow-md);
}
.waid-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  gap: var(--waid-space-2);
}
.waid-card__title {
  font-family: var(--waid-font-sans);
  font-size: var(--waid-fs-lg);
  font-weight: var(--waid-fw-semibold);
  line-height: var(--waid-lh-tight);
  letter-spacing: var(--waid-ls-tight);
  color: var(--waid-color-text-primary);
}
.waid-card__body {
  font-family: var(--waid-font-sans);
  font-size: var(--waid-fs-base);
  line-height: var(--waid-lh-body);
  color: var(--waid-color-text-primary);
  margin-top: var(--waid-space-4);
}
.waid-card--collapsed .waid-card__body {
  display: none;
}
.waid-card__toggle-icon {
  transition: transform var(--waid-duration-fast) var(--waid-ease-default);
}
.waid-card--collapsed .waid-card__toggle-icon {
  transform: rotate(-90deg);
}
```

### `.waid-chip` — Tech-stack pill

```css
.waid-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--waid-space-1);
  background: var(--waid-color-chip-bg);
  color: var(--waid-color-chip-text);
  border: 1px solid var(--waid-color-chip-border);
  border-radius: var(--waid-radius-full);
  padding: var(--waid-space-1) var(--waid-space-3);
  font-family: var(--waid-font-sans);
  font-size: var(--waid-fs-xs);
  font-weight: var(--waid-fw-medium);
  letter-spacing: var(--waid-ls-wide);
  box-shadow: var(--waid-shadow-xs);
  white-space: nowrap;
}
```

### `.waid-btn` — Generic button (view toggle, check-answer, etc.)

```css
.waid-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--waid-space-2);
  padding: var(--waid-space-2) var(--waid-space-4);
  border-radius: var(--waid-radius-md);
  font-family: var(--waid-font-sans);
  font-size: var(--waid-fs-sm);
  font-weight: var(--waid-fw-medium);
  line-height: var(--waid-lh-tight);
  cursor: pointer;
  transition:
    background var(--waid-duration-instant) var(--waid-ease-default),
    box-shadow var(--waid-duration-instant) var(--waid-ease-default);
}
.waid-btn--primary {
  background: var(--waid-color-accent);
  color: var(--waid-color-text-inverse);
  border: none;
}
.waid-btn--primary:hover {
  background: var(--waid-color-accent-muted);
}
.waid-btn--ghost {
  background: transparent;
  color: var(--waid-color-text-secondary);
  border: 1px solid var(--waid-color-border);
}
.waid-btn--ghost:hover {
  background: var(--waid-color-bg-sunken);
}
.waid-btn:focus-visible {
  outline: none;
  box-shadow: var(--waid-shadow-focus);
}
```

### `.waid-toc-item` — Table of contents entry

```css
.waid-toc-item {
  display: block;
  padding: var(--waid-space-2) var(--waid-space-3);
  border-radius: var(--waid-radius-sm);
  font-family: var(--waid-font-sans);
  font-size: var(--waid-fs-sm);
  font-weight: var(--waid-fw-medium);
  line-height: var(--waid-lh-snug);
  color: var(--waid-color-text-secondary);
  text-decoration: none;
  transition: background var(--waid-duration-instant) var(--waid-ease-default),
              color var(--waid-duration-instant) var(--waid-ease-default);
}
.waid-toc-item:hover {
  background: var(--waid-color-accent-subtle);
  color: var(--waid-color-accent);
}
.waid-toc-item--active {
  background: var(--waid-color-accent-subtle);
  color: var(--waid-color-accent);
  font-weight: var(--waid-fw-semibold);
}
.waid-toc-item:focus-visible {
  outline: none;
  box-shadow: var(--waid-shadow-focus);
}
```

### `.waid-quiz-choice` — Quiz answer option

```css
.waid-quiz-choice {
  display: flex;
  align-items: flex-start;
  gap: var(--waid-space-3);
  padding: var(--waid-space-3) var(--waid-space-4);
  border-radius: var(--waid-radius-md);
  border: 1px solid var(--waid-color-border);
  background: var(--waid-color-bg-sunken);
  font-family: var(--waid-font-sans);
  font-size: var(--waid-fs-base);
  line-height: var(--waid-lh-body);
  color: var(--waid-color-text-primary);
  cursor: pointer;
  transition: border-color var(--waid-duration-instant) var(--waid-ease-default),
              background var(--waid-duration-instant) var(--waid-ease-default);
}
.waid-quiz-choice:hover {
  border-color: var(--waid-color-accent);
  background: var(--waid-color-accent-subtle);
}
.waid-quiz-choice--correct {
  border-color: var(--waid-color-quiz-correct);
  background: var(--waid-color-severity-low-bg);
  color: var(--waid-color-severity-low);
}
.waid-quiz-choice--incorrect {
  border-color: var(--waid-color-quiz-incorrect);
  background: var(--waid-color-severity-high-bg);
  color: var(--waid-color-severity-high);
}
.waid-quiz-choice:focus-visible {
  outline: none;
  box-shadow: var(--waid-shadow-focus);
}
```

### `.waid-pitfall--low/medium/high` — Pitfall severity cards

```css
/* Base pitfall card — always pair with a severity modifier */
.waid-pitfall {
  padding: var(--waid-space-4) var(--waid-space-6);
  border-radius: var(--waid-radius-md);
  border-left: 4px solid;
  font-family: var(--waid-font-sans);
  font-size: var(--waid-fs-base);
  line-height: var(--waid-lh-body);
}
.waid-pitfall--low {
  background: var(--waid-color-severity-low-bg);
  border-color: var(--waid-color-severity-low);
  color: var(--waid-color-text-primary);
}
.waid-pitfall--low .waid-pitfall__label {
  color: var(--waid-color-severity-low);
  font-weight: var(--waid-fw-semibold);
}
.waid-pitfall--medium {
  background: var(--waid-color-severity-medium-bg);
  border-color: var(--waid-color-severity-medium);
  color: var(--waid-color-text-primary);
}
.waid-pitfall--medium .waid-pitfall__label {
  color: var(--waid-color-severity-medium);
  font-weight: var(--waid-fw-semibold);
}
.waid-pitfall--high {
  background: var(--waid-color-severity-high-bg);
  border-color: var(--waid-color-severity-high);
  color: var(--waid-color-text-primary);
}
.waid-pitfall--high .waid-pitfall__label {
  color: var(--waid-color-severity-high);
  font-weight: var(--waid-fw-semibold);
}
```

### `.waid-glossary-tooltip` — Hover tooltip for glossary terms

```css
/* Wrapper on the term reference site */
.waid-glossary-ref {
  position: relative;
  cursor: help;
  border-bottom: 1px dashed var(--waid-color-text-secondary);
  display: inline;
}
.waid-glossary-tooltip {
  position: absolute;
  bottom: calc(100% + var(--waid-space-2));
  left: 50%;
  transform: translateX(-50%);
  background: var(--waid-color-bg-overlay);
  border: 1px solid var(--waid-color-border);
  border-radius: var(--waid-radius-md);
  box-shadow: var(--waid-shadow-md);
  padding: var(--waid-space-3) var(--waid-space-4);
  width: max-content;
  max-width: 280px;
  font-family: var(--waid-font-sans);
  font-size: var(--waid-fs-sm);
  line-height: var(--waid-lh-body);
  color: var(--waid-color-text-primary);
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--waid-duration-fast) var(--waid-ease-default);
  z-index: 100;
}
.waid-glossary-ref:hover .waid-glossary-tooltip,
.waid-glossary-ref:focus-within .waid-glossary-tooltip {
  opacity: 1;
}
```

### `.waid-toggle` — View/theme toggle control

```css
/* Pill-shaped track containing two labeled segments */
.waid-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0;
  background: var(--waid-color-toggle-bg);
  border-radius: var(--waid-radius-full);
  padding: var(--waid-space-1);
}
.waid-toggle__option {
  padding: var(--waid-space-1) var(--waid-space-3);
  border-radius: var(--waid-radius-full);
  font-family: var(--waid-font-sans);
  font-size: var(--waid-fs-xs);
  font-weight: var(--waid-fw-medium);
  letter-spacing: var(--waid-ls-wide);
  color: var(--waid-color-text-secondary);
  cursor: pointer;
  border: none;
  background: transparent;
  transition: background var(--waid-duration-instant) var(--waid-ease-default),
              color var(--waid-duration-instant) var(--waid-ease-default);
}
.waid-toggle__option--active {
  background: var(--waid-color-bg-overlay);
  color: var(--waid-color-text-primary);
  box-shadow: var(--waid-shadow-xs);
}
.waid-toggle__option:focus-visible {
  outline: none;
  box-shadow: var(--waid-shadow-focus);
}
```

**Total component style classes defined: 8** — `.waid-card`, `.waid-chip`, `.waid-btn`, `.waid-toc-item`, `.waid-quiz-choice`, `.waid-pitfall` (with 3 severity modifiers), `.waid-glossary-tooltip`, `.waid-toggle`

---

## Theme Switching

The `<html>` element carries a `data-theme` attribute.

```
data-theme="light"   → explicit light — :root overrides only
data-theme="dark"    → explicit dark — [data-theme="dark"] block applies
data-theme="auto"    → inside [data-theme="auto"] { @media (prefers-color-scheme: dark) { /* dark overrides */ } }
```

The theme-toggle button cycles: auto → light → dark → auto. JavaScript writes the attribute; CSS variables update immediately without a page reload (no class toggling, no JS color lookups needed).

**Mermaid diagram theming**: a small JS snippet reads the resolved theme at diagram-render time:

```js
const resolvedDark =
  document.documentElement.dataset.theme === 'dark' ||
  (document.documentElement.dataset.theme === 'auto' &&
   window.matchMedia('(prefers-color-scheme: dark)').matches);

mermaid.initialize({ theme: resolvedDark ? 'dark' : 'default' });
```

Re-render diagrams when the toggle changes (destroy + re-init or use Mermaid's `theme` runtime API).

---

## Print Styles

Inside `@media print`:

- Expand all collapsed sections (remove `.waid-card--collapsed`; body always visible).
- Hide TOC sidebar, view toggle, theme toggle, collapse icons.
- Set `--waid-color-bg-base` to `#ffffff` and `--waid-color-text-primary` to `#000000` regardless of theme.
- Remove box-shadows and borders except the pitfall severity left-border.
- Force `color-adjust: exact` / `-webkit-print-color-adjust: exact` on pitfall and quiz cards to preserve background tints.
- Page breaks: `break-before: page` on each `.waid-card` is acceptable; let the user's print settings handle orphan control.

---

## Test Requirements

- [ ] All tokens resolve in light and dark modes without raw values leaking through (grep for `#`, `rgb(`, `rgba(` in component CSS — none should appear outside `:root` and `[data-theme]` blocks)
- [ ] Body text (`--waid-color-text-primary` on `--waid-color-bg-base`) achieves >= 4.5:1 contrast in both modes — verify with a contrast checker (light: #111318 on #fefefe ≈ 18:1; dark: #e8eaf0 on #0e1014 ≈ 14:1)
- [ ] Type scale body size uses `--waid-lh-body` (1.6), exceeding WCAG SC 1.4.12 minimum of 1.5
- [ ] Code block background (`--waid-color-code-bg`) is visually distinct from page background in both modes — no blending into surface
- [ ] Severity colors meet WCAG AA: low (#1e7a4f / #34c47a), medium (#92620a / #f0b94a), high (#b02020 / #f27272) — test against their respective bg tokens
- [ ] Mermaid diagrams render legibly after theme switch — JS re-initialises Mermaid with the correct theme token (`dark` or `default`)
- [ ] Keyboard focus ring (`--waid-shadow-focus`) is visible on both light and dark backgrounds for all interactive elements
- [ ] `@media (prefers-reduced-motion: reduce)` overrides set all `--waid-duration-*` to `0ms` — validate by toggling the OS preference and confirming no visible animation
- [ ] Print output: collapsed cards are expanded, TOC and toggles are hidden, page bg is white
- [ ] No `@import` or external font URL present in the CSS (system font stacks only)
