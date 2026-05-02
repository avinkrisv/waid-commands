# Layer: ui — 2 contract(s)

---

## Contract: HtmlTemplate

Source: `ui/HtmlTemplate.contract.md`


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

---

## Contract: InteractiveJS

Source: `ui/InteractiveJS.contract.md`


# InteractiveJS Contract

Layer: ui

## Responsibility

Inline JavaScript module — embedded by HtmlTemplate inside `<script id="waid-script">` — that reads the substituted analysis JSON, renders it into the DOM via `<template>` cloning, and wires all interactive behaviors: view toggle, theme toggle, TOC scroll-spy, glossary tooltips, section collapse, Mermaid hydration, quiz logic, and diagram zoom.

## Substitution / API Contract

InteractiveJS is a plain JavaScript file (`assets/template.js`). It ships as raw source; the launcher injects it verbatim. It must work without any module bundler, transpiler, or `import` / `require` — vanilla ES2020 is the target (no top-level `await`; no ES modules syntax unless the `<script>` tag carries `type="module"`, which it does not by default).

### Global Object: `window.WAID`

All public entry points are properties of a single namespace object assigned during script evaluation:

```js
window.WAID = {
  init(analysisJson),        // primary entry — call once after DOM ready
  setView(view),             // 'technical' | 'layman'
  setTheme(theme),           // 'light' | 'dark' | 'auto'
  getState(),                // returns { view, theme, collapsedSections: Set }
};
```

#### `window.WAID.init(analysisJson)`

| Concern | Spec |
|---|---|
| Idempotent | Yes — if called a second time it is a no-op (guard on `_initialized` flag). |
| Input | Parsed JS object conforming to AnalysisSchema, or `null`. |
| Null / invalid input | Sets `document.getElementById('waid-root').dataset.waidState = 'error'`; removes `hidden` from `#waid-error`; returns early. |
| Execution order | 1. Validate input. 2. Restore view + theme from localStorage. 3. Populate page chrome from JSON: set `document.title` and `#waid-title.textContent` to `${analysisJson.projectName} — Under the Hood`; set `<meta name="waid:schema-version">` content to `String(analysisJson.$schemaVersion)`. 4. Render each section. 5. Build TOC. 6. Wire all event listeners. 7. Start scroll-spy. 8. Hydrate Mermaid (async). 9. Set `data-waid-state="ready"` on `#waid-root`. |
| Self-invocation | The script reads `<script id="waid-data" type="application/json">` on `DOMContentLoaded` and calls `window.WAID.init(parsed)` automatically. Consumers may also call it manually (useful in tests). |

#### `window.WAID.setView(view)`

| Concern | Spec |
|---|---|
| Accepted values | `'technical'`, `'layman'` |
| Invalid value | Logs console warning; no-op. |
| DOM effect | Sets `document.getElementById('waid-root').dataset.waidView = view`; updates `aria-pressed` on `#waid-view-toggle`. CSS rules handle visibility of `[data-waid-view]` elements. |
| Persistence | `localStorage.setItem('waid-view', view)` |
| Custom event | Dispatches `CustomEvent('waid:view-change', { detail: { view } })` on `document`. |

#### `window.WAID.setTheme(theme)`

| Concern | Spec |
|---|---|
| Accepted values | `'light'`, `'dark'`, `'auto'` |
| Invalid value | Logs console warning; no-op. |
| DOM effect | Sets `document.getElementById('waid-root').dataset.waidTheme = theme`. CSS uses `[data-waid-theme]` + `@media (prefers-color-scheme)` for resolution. |
| Persistence | `localStorage.setItem('waid-theme', theme)` |
| Custom event | Dispatches `CustomEvent('waid:theme-change', { detail: { theme } })` on `document`. |

### localStorage Keys

| Key | Values | Default |
|---|---|---|
| `waid-view` | `'technical'` \| `'layman'` | `'technical'` |
| `waid-theme` | `'light'` \| `'dark'` \| `'auto'` | `'auto'` |

If `localStorage` throws (private browsing with storage blocked), the script catches and continues with in-memory defaults — no crash.

### Custom DOM Events (emitted on `document`)

| Event name | Detail shape | When fired |
|---|---|---|
| `waid:view-change` | `{ view: 'technical' \| 'layman' }` | After view toggle |
| `waid:theme-change` | `{ detail: { theme: 'light' \| 'dark' \| 'auto' } }` | After theme toggle |
| `waid:section-toggle` | `{ sectionName: string, expanded: boolean }` | After collapse/expand |
| `waid:quiz-answer` | `{ questionIndex: number, correct: boolean }` | After user selects a quiz choice |
| `waid:ready` | `{}` | After `init()` completes successfully |

### Required DOM Contract

InteractiveJS reads and writes the following IDs / attributes. All must be present in HtmlTemplate:

| Element | How used |
|---|---|
| `#waid-root` | State attribute hub (`data-waid-view`, `data-waid-theme`, `data-waid-state`) |
| `#waid-error` | Shown (`hidden` removed) on init failure |
| `#waid-title` | `textContent` set to `analysisJson.meta.project_name` |
| `#waid-view-toggle` | Click listener; `aria-pressed` toggled |
| `#waid-theme-toggle` | Click listener; icon updated |
| `#waid-toc-list` | TOC entries cloned from `#tpl-toc-item` and appended here |
| `#waid-main` | Scroll container for scroll-spy |
| `#waid-section-{name}` | `hidden` removed when section has data; `data-waid-empty` set when empty |
| `#waid-section-body-{name}` | Content cloned from templates and appended here |
| `.waid-section-header button.waid-section-toggle` | Click listener per section; `aria-expanded` toggled |
| `.waid-section-badge` | `hidden` removed and `textContent` set to `(—)` for empty sections |
| `#waid-data` | Source of analysis JSON text (`script[type="application/json"]`) |
| `#waid-arch-diagram` | Target container for Mermaid render |
| `.waid-mermaid-pending` | Shown while Mermaid is loading |
| `.waid-mermaid-fallback` | Shown if Mermaid fails; contains raw source in `<pre>` |
| `#waid-diagram-zoom` | `<dialog>` element; `showModal()` / `close()` called |
| `#waid-templates` | Parent of all `<template>` elements |
| `#tpl-toc-item` | Template for TOC entries |
| `#tpl-tech-stack-entry` | Template for tech stack cards |
| `#tpl-algo-entry` | Template for algorithm entries |
| `#tpl-method-entry` | Template for methodology entries |
| `#tpl-pattern-entry` | Template for pattern rationale entries |
| `#tpl-pitfall-entry` | Template for pitfall entries |
| `#tpl-glossary-entry` | Template for glossary entries |
| `#tpl-quiz-entry` | Template for quiz questions |
| `#tpl-quiz-choice` | Template for individual quiz answer buttons |

## Rendering Rules (XSS Safety)

1. **All analysis JSON strings are rendered as `textContent`**, never `innerHTML`. This is the default for all slot fills.
2. **One allowed exception — limited Markdown**: Overview (`overview.technical`, `overview.layman`), architecture prose, and individual tech/algo/pitfall descriptions may contain Markdown. These are passed through the internal `WAID._md(str)` function, which implements only:
   - `**bold**` → `<strong>`
   - `*italic*` → `<em>`
   - `` `code` `` → `<code>`
   - `[text](url)` → `<a href rel="noopener noreferrer">` (URL validated against allowlist: `https?://` only)
   - Newlines → `<br>`
   - No raw HTML passthrough — the input is first HTML-entity-escaped, then the above patterns are applied to the escaped string.
3. **Template cloning is the only way content enters the DOM.** No `document.createElement` + `innerHTML` on user-supplied strings. No `insertAdjacentHTML` on user-supplied strings.
4. **`data-term` attribute on glossary span** is set via `element.dataset.term = value` (attribute, not innerHTML).
5. Mermaid receives only the `architecture.mermaid` string through the Mermaid API (`mermaid.render(id, diagramSource)`), never via innerHTML directly.

## Behavior Specifications

### View Toggle

- `#waid-view-toggle` is a `<button>` with two inner `<span>` elements labeled "Technical" and "Layman".
- Clicking cycles `technical → layman → technical`.
- `aria-pressed="true"` indicates "Layman" is active (the non-default state).
- CSS handles all content visibility via `[data-waid-view]` on descendants; JS only updates the root attribute and `aria-pressed`.

### Theme Toggle

- `#waid-theme-toggle` cycles `auto → light → dark → auto`.
- Icons (SVG or Unicode): sun (`light`), moon (`dark`), circle-half (`auto`).
- When `auto`, the CSS resolves via `@media (prefers-color-scheme: dark)` — JS applies no additional class.
- `data-waid-theme` on `#waid-root` takes values `light`, `dark`, `auto`.

### TOC & Scroll-Spy

- TOC is built after all sections are rendered. One `<li>` per non-empty section, cloned from `#tpl-toc-item`, with `data-waid-slot="label"` filled and a `data-section="{name}"` attribute for targeting.
- Click on TOC item: `document.getElementById('waid-section-{name}').scrollIntoView({ behavior: 'smooth', block: 'start' })`.
- Scroll-spy: `IntersectionObserver` on each `[data-waid-section]` (threshold `0.2`). The TOC item for the topmost intersecting section receives `.waid-toc-item--active`.
- Empty sections get `.waid-toc-item--empty` and are scrollable but visually muted.

### Section Collapse / Expand

- Each `.waid-section-toggle` button controls its sibling `.waid-section-body` via CSS `grid-template-rows` transition.
- `aria-expanded="true"` when expanded (default). `aria-expanded="false"` when collapsed.
- Collapsed sections still occupy a header-height strip in the layout (not `display: none`).
- Collapse state is NOT persisted to localStorage (ephemeral per-page-load).

### Glossary Tooltips

- After all sections are rendered, `WAID._buildGlossaryIndex()` creates a `Map<string, { layman, technical }>` from `analysisJson.glossary`.
- Text nodes in rendered section bodies are NOT re-scanned for terms (that would be expensive and risky for XSS). Instead, only elements with explicit `data-waid-slot` fills receive glossary markup.
- When a `[data-waid-slot]` value matches a glossary term exactly, the slot element receives `class="waid-glossary-term"` and `data-term="{term}"`.
- Tooltip `<div role="tooltip">` is created lazily on first hover/focus of each unique term and appended to `<body>`.
- Tooltip content is set via `textContent` (the active view's definition — technical or layman).
- Tooltip repositioning: positioned absolutely relative to viewport using `getBoundingClientRect()`. If it would clip the right edge, it is shifted left. If it would clip the bottom, it opens upward.
- Tooltip is hidden on `mouseleave` / `blur`.

### Mermaid Hydration

1. After rendering the architecture section, InteractiveJS checks `typeof mermaid !== 'undefined'`.
2. If Mermaid is loaded: call `mermaid.initialize({ startOnLoad: false, theme: resolvedTheme })` then `mermaid.render('waid-mermaid-svg', diagramSource)` and inject the returned SVG into `#waid-arch-diagram` (replacing the `.waid-mermaid-pending` placeholder). The SVG is safe — it comes from Mermaid's own render function, not from user content.
3. If Mermaid is not yet loaded: add a `load` listener on the Mermaid `<script>` element (`document.querySelector('script[src*="mermaid"]')`). Retry once on load. If still unavailable after 8 seconds, switch to fallback.
4. Theme sync: when `waid:theme-change` fires, if a diagram is already rendered, call `mermaid.initialize(...)` with the new resolved theme and re-render.
5. Diagram zoom: clicking `#waid-arch-diagram` clones the rendered SVG into `#waid-diagram-zoom` content area and calls `dialogEl.showModal()`. Clicking the backdrop or pressing Escape calls `dialogEl.close()`.

### Quiz Logic

- Each quiz entry renders its question text and N choice buttons (cloned from `#tpl-quiz-choice`).
- `answerIndex` is stored in a `dataset.answerIndex` on the quiz entry container — NOT in a JS variable that could be inspected from the console trivially (though this is cosmetic security only, since the JSON is inline).
- On choice click:
  1. Determine if `buttonIndex === parseInt(container.dataset.answerIndex)`.
  2. Correct: add `.waid-quiz-correct` to the clicked button.
  3. Wrong: add `.waid-quiz-wrong` to the clicked button; add `.waid-quiz-correct` to the correct button.
  4. Reveal the explanation element (`[data-waid-slot="explanation-layman"]` or `explanation-technical` depending on current view), removing `hidden`.
  5. Disable all choice buttons in this entry (`button.disabled = true`).
  6. Dispatch `waid:quiz-answer` event.
- Quiz state resets on full page reload (no persistence).

## Visual / Behavior

- **Default state**: `data-waid-state="loading"` on `#waid-root` until `init()` completes. All sections have `hidden` attribute. After successful init: `data-waid-state="ready"`, sections unhidden, view/theme restored from localStorage.
- **Loading state**: The `data-waid-state="loading"` attribute allows CSS to show a minimal skeleton (e.g., pulsing bars) while sections are still `hidden`. JS completes synchronously for JSON parsing and DOM population; only Mermaid is async.
- **Empty state**: If a section array is empty, `data-waid-empty="true"` is set on `#waid-section-{name}`. The section is still unhidden (the header is visible); the body shows `<p class="waid-empty-notice">No entries available.</p>` (safe static string, not from JSON). TOC entry receives `.waid-toc-item--empty`.
- **Error state**: `data-waid-state="error"` on `#waid-root`; `#waid-error` shown. `window.onerror` and `window.onunhandledrejection` handlers also surface errors to `#waid-error` for unexpected failures after init.
- **Animations**: All transitions are defined in CSS using the token-based durations. JS only toggles classes / attributes — never sets `style.transition` directly. Exception: Mermaid SVG fade-in (`opacity: 0 → 1`) is applied via a CSS class `.waid-mermaid-loaded` added after render.
- **Interactions**: See HtmlTemplate contract Visual/Behavior section — InteractiveJS implements the behavior side of every interaction described there.

## Sizing / Layout

InteractiveJS does not set layout or sizing directly. It is layout-agnostic. It only:
- Adds / removes classes and `data-*` attributes that CSS uses for layout variants.
- Positions tooltips absolutely using `getBoundingClientRect()` — the only direct style manipulation.
- Sets `dialog.showModal()` which invokes the browser's native dialog positioning.

## Theme Dependency

InteractiveJS reads theme tokens indirectly via the DOM state (`data-waid-theme` on `#waid-root`). It does not read CSS custom property values directly. The one case where a theme value is needed programmatically is Mermaid — it maps `data-waid-theme` to a Mermaid theme string:

| `data-waid-theme` value | Resolved `prefers-color-scheme` | Mermaid theme passed |
|---|---|---|
| `light` | (any) | `default` |
| `dark` | (any) | `dark` |
| `auto` | `light` | `default` |
| `auto` | `dark` | `dark` |

Resolution is done via `window.matchMedia('(prefers-color-scheme: dark)').matches`.

The following tokens are referenced by name in comments within the JS for documentation purposes only (CSS owns the values):

- `--waid-color-quiz-correct` — applied via `.waid-quiz-correct` class
- `--waid-color-quiz-incorrect` — applied via `.waid-quiz-wrong` class
- `--waid-duration-fast`, `--waid-duration-medium` — referenced in animation timing comments
- `--waid-z-tooltip` — applied via `.waid-glossary-tooltip` class (CSS sets the z-index)

## Test Requirements

- [ ] `window.WAID` is defined after script evaluation
- [ ] `window.WAID.init(null)` shows `#waid-error` and does not throw
- [ ] `window.WAID.init(fixtureJson)` renders all 9 sections with correct content
- [ ] `window.WAID.init(fixtureJson)` called twice is a no-op on the second call
- [ ] `setView('layman')` toggles `data-waid-view` on `#waid-root` and fires `waid:view-change`
- [ ] `setView('layman')` persists to `localStorage['waid-view']`
- [ ] `setTheme('dark')` sets `data-waid-theme="dark"` on `#waid-root` and fires `waid:theme-change`
- [ ] `setTheme('dark')` persists to `localStorage['waid-theme']`
- [ ] All analysis text rendered as `textContent` — injecting `<script>alert(1)</script>` as a field value does not execute
- [ ] Template cloning: no `innerHTML` calls with user-controlled strings (static analysis / grep check)
- [ ] Empty `tech_stack: []` results in `data-waid-empty="true"` on the tech-stack section and `.waid-toc-item--empty` on its TOC entry
- [ ] Mermaid absent from global scope: architecture section shows `.waid-mermaid-fallback` with the raw diagram source, page does not throw
- [ ] Quiz: correct answer click adds `.waid-quiz-correct`, wrong click adds `.waid-quiz-wrong` and also reveals the correct button
- [ ] Quiz: all buttons disabled after any choice
- [ ] Quiz: explanation revealed after choice; active-view explanation matches current view
- [ ] Glossary tooltip: appears on hover of `.waid-glossary-term`; content matches the active view's definition
- [ ] localStorage blocked (throws): `init()` completes without error, defaults applied
- [ ] `waid:ready` event fires on `document` after successful `init()`
- [ ] Section collapse: clicking `.waid-section-toggle` flips `aria-expanded`; section body collapses; `waid:section-toggle` event fires
- [ ] Diagram zoom: clicking `#waid-arch-diagram` opens `#waid-diagram-zoom` dialog
- [ ] `prefers-reduced-motion: reduce` — no JS-driven animation callbacks fire (transitions are CSS-only and are suppressed by the CSS media query)
