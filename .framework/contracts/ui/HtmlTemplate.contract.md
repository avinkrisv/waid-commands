# HtmlTemplate Contract

Layer: ui

## Responsibility

Single self-contained HTML shell — with inline CSS stub and deferred JS — that contains every section template element and chrome (view-toggle, theme-toggle, sticky TOC); the launcher script substitutes placeholder tokens to produce the final deliverable `under-the-hood.html`.

## Substitution / API Contract

The launcher (`scripts/launch.sh`) performs a literal string substitution pass over `assets/template.html`. Each placeholder is a unique sentinel that will not collide with normal HTML, CSS, or JSON content.

| Placeholder | Location in HTML | Substituted value shape | Failure mode |
|---|---|---|---|
| `__WAID_ANALYSIS_JSON__` | Inside `<script id="waid-data" type="application/json">__WAID_ANALYSIS_JSON__</script>` in `<head>` | Valid JSON string conforming to AnalysisSchema (no surrounding quotes; raw JSON object) | If empty/missing: `window.WAID.init` receives `null`; page renders error banner `#waid-error` and hides all section cards |
| `__WAID_TEMPLATE_CSS__` | Inside `<style id="waid-style">__WAID_TEMPLATE_CSS__</style>` in `<head>` | Full contents of `assets/template.css` (DesignTokens) as raw text | If empty: page renders unstyled but functionally intact |
| `__WAID_TEMPLATE_JS__` | Inside `<script id="waid-script">__WAID_TEMPLATE_JS__</script>` before `</body>` | Full contents of `assets/template.js` (InteractiveJS) as raw text | If empty: page is static; no interactivity; section content remains hidden (JS is required to call init) |
| `__WAID_GENERATED_AT__` | `<meta name="waid:generated-at" content="__WAID_GENERATED_AT__">` in `<head>` | ISO-8601 datetime string (e.g. `2026-05-02T14:30:00Z`) | If missing: meta tag has empty content; no visible effect |

The template uses **only these four** sentinels. Project name and schema version are NOT placeholders — they live inside the embedded analysis JSON (`projectName` and `$schemaVersion`) and are populated into the DOM by InteractiveJS at init time:

- `<title>` is set by JS to `${analysis.projectName} — Under the Hood` (default static title `Under the Hood` is overwritten at init).
- `<h1 id="waid-title">` is set by JS to `${analysis.projectName} — Under the Hood`.
- `<meta name="waid:schema-version" content="">` is populated by JS from `analysis.$schemaVersion`.

This keeps the launcher's substitution surface minimal and ensures a single source of truth (the embedded JSON).

### Substitution Safety Rules (enforced by launcher, documented here for auditability)

- `__WAID_ANALYSIS_JSON__` must NOT be escaped — it is raw JSON inside a `type="application/json"` script element (immune to HTML parser). The launcher must verify the JSON is valid before injecting.
- `__WAID_TEMPLATE_CSS__` and `__WAID_TEMPLATE_JS__` must NOT contain the literal string `</style>` or `</script>` respectively (they won't; CSS and JS don't naturally contain those). If they do the launcher must escape them.
- Substitution is performed with a single-pass `sed` or equivalent; placeholders are guaranteed not to appear in the substituted values.

## Visual / Behavior

- **Default state**: On first load (localStorage empty), view defaults to `technical`, theme defaults to `auto` (matches `prefers-color-scheme`). All section cards are expanded. TOC highlights the first entry. The view-toggle switch is in the "Technical" position; the theme button shows the current resolved theme icon.
- **Loading state**: Not applicable for a static file. The one quasi-loading case is Mermaid CDN: the architecture section shows a `<div class="waid-mermaid-pending">Rendering diagram…</div>` placeholder until Mermaid calls back; if Mermaid never loads (CDN failure or offline), the placeholder changes to `class="waid-mermaid-fallback"` with the raw Mermaid source in a `<pre>`.
- **Empty state**: If a section's array in the JSON is empty (e.g. `quiz: []`) the corresponding `<section data-waid-section="quiz">` receives `data-waid-empty="true"` and the section header shows a `(—)` badge; the section body shows `<p class="waid-empty-notice">No entries available.</p>`. The TOC entry for that section is greyed out (`.waid-toc-item--empty`) but still present and still scrolls to the section.
- **Error state**:
  - JSON malformed or null: `#waid-root` gets `data-waid-state="error"`. `#waid-error` banner (hidden by default with `hidden` attribute) becomes visible with message "Report data could not be loaded." All `<section data-waid-section>` elements remain hidden (`hidden` attribute).
  - Mermaid CDN failure: Architecture section renders the raw Mermaid source in a `<pre class="waid-mermaid-fallback">`. Rest of page unaffected.
  - Unexpected JS exception during render: `window.onerror` handler surfaces `#waid-error` banner with the error message. Partial renders are left in place.
- **Animations**: Section collapse/expand: CSS `transition: grid-template-rows 220ms ease`. View toggle: `transition: opacity 120ms ease` on content swap. Theme toggle: `transition: background-color 180ms ease, color 180ms ease` on `:root`. TOC active-item underline: `transition: transform 150ms ease`. No motion when `prefers-reduced-motion: reduce` matches — all transitions set to `0ms`.
- **Interactions**:
  - Click TOC entry → smooth-scroll to section (`scroll-behavior: smooth`; JS fallback for browsers that ignore CSS smooth-scroll).
  - Click section `<header class="waid-section-header">` → toggle collapse; `aria-expanded` flips on the header button; section body `<div class="waid-section-body">` toggles `data-collapsed`.
  - Hover/focus any `<span class="waid-glossary-term">` → tooltip `<div role="tooltip" class="waid-tooltip">` appears with the layman definition. Tooltip is positioned via JS (IntersectionObserver to keep in viewport).
  - Click `#waid-view-toggle` → calls `window.WAID.setView(...)`, flips all `[data-waid-view]` content, persists to localStorage.
  - Click `#waid-theme-toggle` → cycles `auto → light → dark → auto`, calls `window.WAID.setTheme(...)`, persists.
  - Click quiz choice `<button class="waid-quiz-choice">` → evaluates, adds `.waid-quiz-correct` or `.waid-quiz-wrong`, reveals explanation, locks remaining choices.
  - Click Mermaid diagram container `#waid-arch-diagram` → opens a `<dialog id="waid-diagram-zoom">` modal with full-size diagram; Escape or backdrop click closes it.

## DOM Structure Contract

The launcher and InteractiveJS depend on the following IDs / classes / attributes being present and stable in the template:

### Top-level shell

```
<body id="waid-root" data-waid-theme="auto" data-waid-view="technical" data-waid-state="loading">
  <div id="waid-error" hidden>…</div>
  <header id="waid-header">
    <h1 id="waid-title">Under the Hood</h1>  <!-- JS overwrites with `${analysis.projectName} — Under the Hood` at init -->

    <div id="waid-controls">
      <button id="waid-view-toggle" aria-pressed="false">…</button>
      <button id="waid-theme-toggle">…</button>
    </div>
  </header>
  <div id="waid-layout">
    <nav id="waid-toc" aria-label="Contents">
      <ol id="waid-toc-list"><!-- populated by JS --></ol>
    </nav>
    <main id="waid-main">
      <!-- one <section data-waid-section="…"> per report section -->
    </main>
  </div>
  <dialog id="waid-diagram-zoom">…</dialog>
</body>
```

### Section elements (static in HTML; content populated by JS from JSON)

Each section follows this pattern:
```html
<section id="waid-section-{name}" data-waid-section="{name}" hidden>
  <header class="waid-section-header">
    <button class="waid-section-toggle" aria-expanded="true" aria-controls="waid-section-body-{name}">
      <span class="waid-section-title">{Human Title}</span>
      <span class="waid-section-badge" hidden></span>
    </button>
  </header>
  <div id="waid-section-body-{name}" class="waid-section-body">
    <!-- JS clones <template> elements into here -->
  </div>
</section>
```

Section `{name}` values (must match exactly — InteractiveJS and TOC generation depend on them):

| `data-waid-section` | Human Title | Source JSON field |
|---|---|---|
| `overview` | Overview | `overview` |
| `tech-stack` | Tech Stack | `tech_stack` |
| `architecture` | Architecture | `architecture` |
| `algorithms` | Key Algorithms | `algorithms` |
| `methodologies` | Methodologies | `methodologies` |
| `pattern-rationale` | Pattern Rationale | `pattern_rationale` |
| `pitfalls` | Pitfalls | `pitfalls` |
| `glossary` | Glossary | `glossary` |
| `quiz` | Check Your Understanding | `quiz` |

### `<template>` elements (used by InteractiveJS for safe DOM cloning)

All templates live inside `<div id="waid-templates" hidden>`:

| Template ID | Cloned for | Key slots (data-waid-slot) |
|---|---|---|
| `tpl-toc-item` | Each TOC entry | `label` |
| `tpl-tech-stack-entry` | Each TechStackEntry card | `name`, `kind`, `technical`, `layman`, `analogy`, `version` |
| `tpl-algo-entry` | Each AlgoEntry | `name`, `technical`, `layman`, `complexity`, `location` |
| `tpl-method-entry` | Each MethodEntry | `name`, `technical`, `layman` |
| `tpl-pattern-entry` | Each PatternEntry | `pattern`, `why`, `tradeoffs`, `technical`, `layman` |
| `tpl-pitfall-entry` | Each PitfallEntry | `title`, `technical`, `layman`, `severity` |
| `tpl-glossary-entry` | Each GlossaryEntry | `term`, `layman`, `technical` |
| `tpl-quiz-entry` | Each QuizEntry | `question`, `choices` (repeated `tpl-quiz-choice`), `explanation-layman`, `explanation-technical` |
| `tpl-quiz-choice` | Each quiz answer button | `label` |

Slots are filled by InteractiveJS using `el.querySelector('[data-waid-slot="name"]').textContent = value` — never innerHTML — except where explicitly noted (see InteractiveJS contract for the one allowed markdown path).

### View-conditional content

Elements that carry dual content use `data-waid-view="technical"` or `data-waid-view="layman"`. CSS hides the inactive view:

```css
[data-waid-view="technical"] { display: none; }
[data-waid-view="layman"]    { display: none; }
#waid-root[data-waid-view="technical"] [data-waid-view="technical"] { display: revert; }
#waid-root[data-waid-view="layman"]    [data-waid-view="layman"]    { display: revert; }
```

### Glossary tooltip anchor

Glossary terms injected anywhere in rendered text use:
```html
<span class="waid-glossary-term" data-term="{term}" tabindex="0">{term}</span>
```
The matching tooltip element `<div role="tooltip" id="waid-tooltip-{term}" class="waid-tooltip" hidden>` is appended to `<body>` by JS on first hover.

## Sizing / Layout

- Content column max-width: `var(--waid-content-max-width)` (token; default 72rem).
- Breakpoints:
  - `< 768px` (mobile): single-column; TOC hidden; a floating "Contents" button (`#waid-toc-fab`) opens a bottom-sheet drawer `#waid-toc-drawer`.
  - `768px – 1099px` (tablet): single-column; TOC collapses to a horizontal pill strip above `#waid-main`.
  - `>= 1100px` (desktop): two-column grid — TOC sidebar (width `var(--waid-toc-width)`, default 14rem) on the left, `#waid-main` fills the rest; TOC is `position: sticky; top: var(--waid-space-4)`.
- `#waid-header` is `position: sticky; top: 0; z-index: var(--waid-z-header)`.
- Print: `@media print` — TOC hidden, all sections expanded, no sticky positioning, no animations, Mermaid diagram rendered inline if possible.
- Mermaid diagram container `#waid-arch-diagram`: `max-width: 100%; overflow-x: auto`.

## Theme Dependency

The template references only CSS custom property tokens — never raw values. All tokens below are defined in the `DesignTokens` contract and emitted by `assets/template.css`.

**Color**
- `--waid-color-bg-base` — page background
- `--waid-color-bg-surface` — section card background
- `--waid-color-bg-overlay` — glossary tooltip and dialog background
- `--waid-color-code-bg` — inline code and pre backgrounds
- `--waid-color-code-border` — code block border
- `--waid-color-text-primary` — primary text
- `--waid-color-text-secondary` — secondary / muted text (badges, empty notices)
- `--waid-color-accent` — interactive highlights, active TOC item underline, focus rings
- `--waid-color-accent-subtle` — hover backgrounds for interactive elements
- `--waid-color-border` — card and divider borders
- `--waid-color-border-subtle` — subtle separators
- `--waid-color-severity-low` / `--waid-color-severity-low-bg` / `--waid-color-severity-low-border` — pitfall LOW
- `--waid-color-severity-medium` / `--waid-color-severity-medium-bg` / `--waid-color-severity-medium-border` — pitfall MEDIUM
- `--waid-color-severity-high` / `--waid-color-severity-high-bg` / `--waid-color-severity-high-border` — pitfall HIGH
- `--waid-color-quiz-correct` — quiz correct answer highlight
- `--waid-color-quiz-incorrect` — quiz incorrect answer highlight
- `--waid-color-focus-ring` — keyboard focus outline

**Typography**
- `--waid-font-sans` — body text and UI label font stack
- `--waid-font-mono` — code / pre font stack
- `--waid-fs-xs` / `--waid-fs-sm` / `--waid-fs-base` / `--waid-fs-md` / `--waid-fs-lg` / `--waid-fs-xl` / `--waid-fs-2xl` — type scale
- `--waid-fw-regular` / `--waid-fw-medium` / `--waid-fw-semibold` / `--waid-fw-bold` — weight scale
- `--waid-lh-body` — body line height
- `--waid-lh-tight` — headings line height
- `--waid-lh-snug` — labels, TOC items
- `--waid-lh-code` — code block line height

**Spacing**
- `--waid-space-1` through `--waid-space-16` — 4px-based spacing scale

**Layout**
- `--waid-content-max-width` — main content column max width
- `--waid-toc-width` — sticky TOC sidebar width

**Shape**
- `--waid-radius-sm` — small radii (badges, chips)
- `--waid-radius-md` — cards, buttons, quiz choices
- `--waid-radius-lg` — code blocks, large surfaces
- `--waid-radius-pill` — pill buttons / tags (alias of `--waid-radius-full`)

**Elevation**
- `--waid-shadow-card` — section card box-shadow (alias of `--waid-shadow-sm`)
- `--waid-shadow-tooltip` — tooltip box-shadow (alias of `--waid-shadow-md`)
- `--waid-shadow-dialog` — zoom dialog box-shadow (alias of `--waid-shadow-lg`)
- `--waid-shadow-focus` — keyboard focus ring

**Motion**
- `--waid-duration-fast` — hover / icon rotation (~150ms)
- `--waid-duration-medium` — card collapse / tooltip fade (~240ms)
- `--waid-duration-slow` — page-level transitions (~400ms)
- `--waid-ease-default` — standard ease-in-out

**Z-index**
- `--waid-z-header` — sticky `#waid-header`
- `--waid-z-toc` — sticky `#waid-toc`
- `--waid-z-tooltip` — glossary tooltips
- `--waid-z-dialog` — diagram-zoom dialog

## Test Requirements

- [ ] All six placeholder tokens are present in the template exactly once each
- [ ] The template is valid HTML5 (passes the W3C Nu HTML Checker or equivalent)
- [ ] All `<template>` IDs listed above are present in the template
- [ ] All `data-waid-section` values are present and match the table above
- [ ] All required element IDs are present: `waid-root`, `waid-error`, `waid-header`, `waid-title`, `waid-controls`, `waid-view-toggle`, `waid-theme-toggle`, `waid-layout`, `waid-toc`, `waid-toc-list`, `waid-main`, `waid-diagram-zoom`, `waid-templates`
- [ ] Template renders readably in a browser when CSS and JS stubs are injected (no broken layout with empty content)
- [ ] `<meta charset="UTF-8">` and `<meta name="viewport" content="width=device-width, initial-scale=1">` are present
- [ ] Mermaid CDN `<script>` is loaded with `defer` (or `async`) — does not block first paint
- [ ] Print stylesheet hides `#waid-toc`, `#waid-controls`, `#waid-toc-fab`
- [ ] No inline event handlers (`onclick`, `onload`, etc.) — all wiring is done in InteractiveJS
