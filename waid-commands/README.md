# waid-commands

**What Am I Doing** — a Claude Code plugin that explains the project you're in.

Run `/under-the-hood` from any project directory. The plugin analyzes your project (manifests, configs, entry points), produces a structured JSON understanding, and opens a self-contained HTML report in your browser. The report has parallel **Technical** and **Layman** views, covering:

- Tech stack
- Architecture (with diagrams)
- Key algorithms
- Methodologies
- Pattern rationale (why these choices)
- Pitfalls
- Glossary
- Quiz (check your understanding)

## Status

Phase 3 (Skeleton). Component stubs are in place; real implementations land in Phase 4.

See `../.framework/progress.md` for current build state.

## Layout

```
waid-commands/
├── .claude-plugin/plugin.json
├── commands/under-the-hood.md
├── scripts/launch.sh
├── assets/{template.html, template.css, template.js}
├── schema/{analysis.schema.json, stack-detection.json, README.md}
├── tests/smoke.sh
└── README.md
```

## Install (after Phase 6)

Instructions land in Phase 6.
