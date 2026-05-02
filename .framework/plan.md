# waid-commands — Plan

## App Overview

`waid-commands` ("What Am I Doing") is a Claude Code plugin that educates the user about the project they are currently in. The user runs the slash command `/under-the-hood` from any project directory; the plugin analyzes the project (manifests, configs, entry points, key files), produces a structured JSON understanding, injects it into a self-contained HTML template, writes the result to the project root, and opens it in the user's default browser.

Target audience: "vibe coders" using Claude Code who do not yet have a clear mental model of their own project's tech stack, architecture, methodologies, or pitfalls. The HTML report has two parallel views — **Technical** (for power users) and **Layman** (for beginners) — that the reader toggles at any time.

Target platform: Claude Code (CLI) on macOS / Linux / Windows; the rendered report is a single HTML file viewed in the user's default browser.

## Tech Stack

```yaml
language: bash + markdown + html + css + javascript
framework: Claude Code Plugin (commands)
state_management: filesystem (analysis JSON written to a temp path; HTML report written next to the project)
database: none
testing: smoke script that runs the plugin against fixture projects (node, python, rust) and asserts the HTML output contains expected sections
build_tool: none — all assets are static; no compile step
```

## Screens

### Screen: UnderTheHoodReport

- **Purpose**: A single self-contained HTML page that teaches the reader what their project is, how it works, and what to watch out for.
- **Key interactions**:
  - Toggle between **Technical** and **Layman** view (top-right switch, persists in localStorage).
  - Click any section in the sticky TOC to scroll-snap to it.
  - Hover a glossary term anywhere in the page to see the plain-English definition tooltip.
  - Expand/collapse each section card.
  - Toggle dark / light theme.
  - Take inline "check your understanding" quizzes (multiple choice, instant feedback).
  - Click any Mermaid diagram to zoom.
- **Data displayed**: The full analysis JSON produced by Claude — Overview, Tech Stack, Architecture (with Mermaid source), Key Algorithms, Methodologies, Pattern Rationale, Pitfalls, Glossary, Quiz items.
- **Data modified**: Reader preferences (view mode, theme, collapsed-section state) in localStorage. No server persistence.

## Component Inventory

### Layer 1: Data Components

```yaml
components:
  - name: AnalysisSchema
    responsibility: "Defines the canonical JSON shape Claude must emit when analyzing a project, with field-level docs and required/optional flags"
    owns:
      - schema/analysis.schema.json
      - schema/README.md
    key_complexity: "Capturing the dual technical/layman variants and Mermaid diagram source in a JSON schema that is strict enough to validate yet permissive enough for any stack"
    dependencies: []
  - name: StackDetectionRules
    responsibility: "Lists manifest filenames per stack (package.json, pyproject.toml, Cargo.toml, pubspec.yaml, go.mod, etc.) and which secondary files to prioritize for reading"
    owns:
      - schema/stack-detection.json
    key_complexity: "Covering enough stacks to be useful without becoming a brittle catalog; degrading gracefully when no manifest matches"
    dependencies: []
```

### Layer 2: UI Atom Components

```yaml
components:
  - name: HtmlTemplate
    responsibility: "Single self-contained HTML shell with placeholder for analysis JSON; renders all sections (overview, stack, architecture, algorithms, methodologies, rationale, pitfalls, glossary, quiz) and the view-toggle / TOC / theme-toggle chrome"
    owns:
      - assets/template.html
    key_complexity: "Keeping it self-contained (no build step) while supporting Mermaid (CDN), conditional rendering of technical vs layman text, and graceful empty-section handling"
    dependencies: []
  - name: InteractiveJS
    responsibility: "Inline JavaScript for the report — view toggle, theme toggle, TOC scroll-spy, glossary tooltips, section collapse, Mermaid init, quiz logic, JSON-into-DOM render"
    owns:
      - assets/template.js
    key_complexity: "Rendering arbitrary analysis JSON safely (no XSS), and wiring view/theme state to localStorage with a sensible default"
    dependencies: []
```

### Layer 3: Logic Components

```yaml
components:
  - name: SlashCommand
    responsibility: "The /under-the-hood Claude Code slash command — a markdown prompt that instructs Claude how to scan the project, what files to read, what JSON shape to emit, and how to invoke the launcher"
    owns:
      - commands/under-the-hood.md
    key_complexity: "Writing a prompt that produces consistent JSON conforming to AnalysisSchema across diverse stacks, with clear technical/layman variants and accurate Mermaid diagrams"
    dependencies: [AnalysisSchema, StackDetectionRules]
  - name: LauncherScript
    responsibility: "Bash script that takes the analysis JSON path, injects it into the HTML template, writes ./under-the-hood.html, and opens it in the default browser (cross-platform: open / xdg-open / start)"
    owns:
      - scripts/launch.sh
    key_complexity: "Cross-platform open command + safe JSON-into-HTML injection (no shell escaping bugs, no template-string collisions)"
    dependencies: [AnalysisSchema]
```

### Layer 4: Theme

```yaml
components:
  - name: DesignTokens
    responsibility: "CSS custom properties for the HTML report — color palette (light + dark), typography scale, spacing, radii, shadows, motion"
    owns:
      - assets/template.css
    key_complexity: "Readable typographic hierarchy that works in both light and dark, and is calm enough not to compete with code blocks and diagrams"
    dependencies: []
```

## Assembly Overview

The "assembly" for this project is the plugin packaging — combining the components into a valid Claude Code plugin directory layout:

```
waid-commands/
├── .claude-plugin/
│   └── plugin.json          # plugin manifest
├── commands/
│   └── under-the-hood.md    # SlashCommand
├── scripts/
│   └── launch.sh            # LauncherScript
├── assets/
│   ├── template.html        # HtmlTemplate
│   ├── template.css         # DesignTokens
│   └── template.js          # InteractiveJS
├── schema/
│   ├── analysis.schema.json # AnalysisSchema
│   ├── stack-detection.json # StackDetectionRules
│   └── README.md
├── tests/
│   └── smoke.sh             # runs the plugin against fixture projects
└── README.md                # install + usage
```

There is one screen — `UnderTheHoodReport` — and assembly consists of (a) writing the plugin manifest, (b) writing the README, and (c) verifying the slash command, launcher, and assets all reference each other with correct relative paths.

## Build Tiers

```yaml
tier_1:
  agents:
    - name: data-agent
      components: [AnalysisSchema, StackDetectionRules]
    - name: ui-agent
      components: [HtmlTemplate, InteractiveJS]
    - name: theme-agent
      components: [DesignTokens]
tier_2:
  agents:
    - name: logic-agent
      components: [SlashCommand, LauncherScript]
tier_3:
  agents:
    - name: assembler
      screens: [UnderTheHoodReport]
```

## Non-Functional Requirements

- **Self-contained report**: the generated HTML must work offline-first — Mermaid is the only allowed CDN dependency, and the page must still render readably if Mermaid fails to load.
- **No build step**: assets ship as-is; no bundler, transpiler, or package install required by the plugin.
- **Cross-platform**: the launcher script must work on macOS (`open`), Linux (`xdg-open`), and Windows (`start`, via Git Bash / WSL).
- **Safe rendering**: analysis JSON is rendered into the DOM as text, never as HTML — no innerHTML on Claude-produced strings except for explicitly whitelisted Markdown-to-HTML through a small renderer.
- **Stack-agnostic**: the slash command must produce a useful report even when no known manifest is detected (fallback to "language unknown — best-effort narrative from file extensions").
- **Privacy**: no telemetry, no network calls beyond Mermaid CDN; the analysis JSON never leaves the user's machine.
- **Plugin install footprint**: the entire plugin directory should be under 200 KB (excluding fixtures and tests).
