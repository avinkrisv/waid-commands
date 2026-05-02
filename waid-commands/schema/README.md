# Schemas

Static JSON files consumed by the slash command at run time.

- `analysis.schema.json` — the canonical shape of the analysis JSON Claude must emit. See `../../.framework/contracts/data/AnalysisSchema.contract.md`.
- `stack-detection.json` — manifest filenames + key config files + entry-point hints, one entry per supported stack. See `../../.framework/contracts/data/StackDetectionRules.contract.md`.

Both files are read-only at run time. Updating them is a contract change — bump `$schemaVersion` for breaking changes.
