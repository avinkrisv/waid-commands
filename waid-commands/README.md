# waid-commands

**What Am I Doing** — a Claude Code plugin that explains the project you're in.

Run `/under-the-hood` from any project directory. Claude analyzes your project (manifests, configs, entry points) and opens a self-contained HTML report in your browser. The report has parallel **Technical** and **Layman** views, so you can flip between power-user and beginner explanations.

## What you get

The report covers:

- **Overview** — what the project is and does, in one paragraph each
- **Tech Stack** — every language, framework, and tool, with a layman analogy for each
- **Architecture** — a Mermaid diagram of how the pieces connect, with both technical and layman narratives
- **Algorithms** — key algorithms or data-processing patterns observed in the code
- **Methodologies** — testing approach, state management, CI/CD, deployment patterns
- **Pattern Rationale** — *why* the observed patterns were chosen and what the trade-offs are
- **Pitfalls** — known risks, anti-patterns, and gotchas (color-coded by severity)
- **Glossary** — every domain-specific term used in the page, with hover tooltips
- **Quiz** — 3-5 multiple-choice questions to check your understanding

You can toggle the entire report between Technical and Layman views with one click. Light/dark theme is preserved across reloads.

## Install

Until this plugin is published to a registry, install from a local clone.

```bash
# Clone or copy the waid-commands/ directory into your Claude Code plugins folder.
# Default location:
mkdir -p ~/.claude/plugins
cp -r waid-commands ~/.claude/plugins/
```

Then enable the plugin in Claude Code (`/plugins` from the chat). Restart your Claude Code session.

## Usage

From any project directory:

```
/under-the-hood
```

Optional flags:

```
/under-the-hood --depth=quick           # Read ~10 files, fastest
/under-the-hood --depth=standard        # Read ~30 files (default)
/under-the-hood --depth=deep            # Read ~60 files, most thorough
/under-the-hood --mode=layman           # Pre-toggle the report to layman view
/under-the-hood --out=./my-report.html  # Write to a custom path
/under-the-hood --no-open               # Don't auto-open the browser
```

The report is written to `./under-the-hood.html` by default (or wherever you point `--out`).

## What it doesn't do

- **No network calls.** Analysis runs entirely on your machine. Only Mermaid (the diagram renderer) loads from a CDN at view time, and the page renders fine without it.
- **No telemetry.** The plugin sends nothing anywhere.
- **No project modification.** The plugin only reads files and writes a single HTML output. It never edits your code.

## Requirements

- Claude Code (latest)
- `bash` 3.2 or newer (macOS default ships with bash 3.2)
- `python3` 3.6 or newer (used for safe template substitution; `awk` fallback exists for environments without python3)

## Layout

```
waid-commands/
├── .claude-plugin/plugin.json   # plugin manifest
├── commands/under-the-hood.md   # slash command (drives Claude through analysis)
├── scripts/launch.sh            # injects analysis JSON into HTML and opens browser
├── assets/
│   ├── template.html            # HTML shell with placeholders
│   ├── template.css             # design tokens + component styles
│   └── template.js              # rendering, view toggle, Mermaid hydration, quiz
├── schema/
│   ├── analysis.schema.json     # canonical shape Claude must produce
│   ├── stack-detection.json     # 11 supported stacks: node, py, rust, go, ...
│   └── README.md                # schema documentation
├── tests/smoke.sh               # smoke test harness (Phase 6)
└── README.md                    # this file
```

## Privacy

Everything stays on your machine. The slash command makes no network calls; the launcher writes a single HTML file and (optionally) opens your default browser; the rendered page loads Mermaid from `cdn.jsdelivr.net` only when you view it (and degrades gracefully when offline). No telemetry, no analytics, no upload.

## License

MIT.
