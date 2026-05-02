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
