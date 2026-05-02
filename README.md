# whatAmIDoing

Repository for the **waid-commands** Claude Code plugin and its build framework.

## What's in this repo

- `waid-commands/` — the actual plugin (this is what gets distributed). See `waid-commands/README.md` for install + usage.
- `.framework/` — Trellis development framework (plan, contracts, progress, build artifacts). Not part of the plugin distribution.
- `CLAUDE.md` — project instructions for Claude Code.

## Building

The plugin was built using the [Trellis](https://github.com/) framework. Phase progression is tracked in `.framework/progress.md`.

To use the plugin, you only need the `waid-commands/` directory — nothing else in this repo is required at run time.

## License

MIT.
