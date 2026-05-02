# SlashCommand Contract

Layer: logic

## Responsibility

A Claude Code slash command delivered as a markdown prompt (`commands/under-the-hood.md`) that instructs Claude to detect the project's tech stack, read relevant files within a capped token budget, produce a structured JSON analysis conforming to AnalysisSchema, write it to a temp path, and invoke the launcher script.

## Inputs

| Input | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| (implicit) project root | filesystem path | yes | CWD when Claude Code runs | The directory to analyze |
| `--depth` | enum: `quick` \| `standard` \| `deep` | no | `standard` | Controls how many source files are sampled beyond manifests and entry points |
| `--mode` | enum: `technical` \| `layman` \| `both` | no | `both` | Which text variant(s) to populate in the JSON output |
| `--out` | file path string | no | `./under-the-hood.html` | Forwarded verbatim to `launch.sh` via `--out`; does not affect JSON path |
| `--no-open` | flag | no | (unset — browser opens by default) | Forwarded to `launch.sh`; suppresses browser launch |

**Project context Claude has access to**: the full directory tree visible to Claude Code in the user's session, including all readable files under the project root. Claude must NOT make any network calls, read files outside the project root, or write any file other than the temp JSON path.

### Depth semantics

| Depth | Manifest + config files | Source file sample cap | Total file cap |
|-------|------------------------|------------------------|----------------|
| `quick` | all detected manifests + 5 config files | 5 source files | ~10 files |
| `standard` | all detected manifests + up to 10 config files | 15 source files | ~30 files |
| `deep` | all detected manifests + up to 20 config files | 40 source files | ~60 files |

## Procedure / Methods

### Step 1 — Stack Detection

- **Invocation**: The prompt instructs Claude to read `schema/stack-detection.json` (relative to the plugin root, which is the directory containing `commands/under-the-hood.md`).
- **Behavior**:
  1. Read `schema/stack-detection.json`. This file maps stack names to arrays of manifest filenames and a list of secondary key-file globs to prioritize (see StackDetectionRules contract).
  2. Glob the project root (one level only, then check common subdirectory names like `src/`, `app/`, `lib/`) for each manifest filename listed in the detection rules.
  3. Collect all matched stacks. A project may be multi-stack (e.g., a Python backend + a Node frontend).
  4. If no manifest matches, set stack to `["unknown"]` and proceed with best-effort analysis of whatever files are readable.
- **Side effects**: none — read-only.
- **Edge cases**:
  - Monorepo with multiple manifests at different depths: detect all top-level manifests; note sub-package manifests as secondary stack hints in the overview.
  - Manifest exists but is empty or malformed: treat as "manifest present, stack detected, contents unreadable" and note in pitfalls.
  - `schema/stack-detection.json` itself is missing or unreadable: emit a warning in the analysis `pitfalls` array and continue with `stack: ["unknown"]`.

### Step 2 — File Reading

- **Invocation**: The prompt specifies an ordered reading list derived from detected stacks.
- **Behavior**:
  1. Always read (in order): manifest files detected in Step 1, `README.md` / `README.rst` / `README.txt` if present, top-level config files (`*.config.*`, `.env.example`, `Makefile`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/*.yml` up to 3 files, etc.).
  2. Per detected stack, consult `stack-detection.json` for that stack's `key_files` globs and read those next (e.g., for Node: `src/index.*`, `src/app.*`, `src/server.*`; for Python: `main.py`, `app.py`, `wsgi.py`, `asgi.py`).
  3. Sample additional source files up to the depth cap. Prefer files at the shallowest directory depth; within the same depth prefer larger files (they likely contain more logic). Skip binary files, lock files (`package-lock.json`, `yarn.lock`, `poetry.lock`, `Cargo.lock`), and generated files (`*.min.js`, `dist/`, `build/`, `__pycache__/`, `.git/`).
  4. Token budget: target total context consumed by file contents at ≤ 50 000 tokens. If reading all files in the list would exceed this, truncate the source sample (Step 2.3) first, then trim config files, never trim manifest files.
- **Side effects**: none — read-only.
- **Edge cases**:
  - File is binary: skip silently, do not count toward file cap.
  - File exceeds ~5 000 tokens: read only the first ~150 lines (enough for imports, class/function signatures, top-level comments).
  - Project root is nearly empty (scaffolded but not yet developed): note in overview and reduce analysis depth gracefully.

### Step 3 — JSON Production

- **Invocation**: The prompt instructs Claude to produce a single JSON object conforming to `schema/analysis.schema.json`.
- **Behavior**:
  1. Populate every required field in AnalysisSchema. Required fields must never be `null` or omitted.
  2. For every section that has both a `technical` and `layman` key: populate both if `--mode=both` (default), only the specified one if `--mode=technical` or `--mode=layman`, and fill the other with `""`.
  3. Mermaid diagrams (`architecture.diagram_source`): produce valid Mermaid syntax. Prefer `graph TD` or `flowchart TD` for architecture, `sequenceDiagram` for request flows. Diagrams must be syntactically valid — test by mentally tracing the graph. Maximum 20 nodes; label each node with a meaningful name, not just a letter.
  4. Layman text quality bar: each layman field should be 2–5 sentences. Use an everyday analogy in the first sentence. Avoid jargon; if a technical term must appear, immediately follow it with a parenthetical plain-English gloss. Aim for a Flesch-Kincaid grade level of 7–9.
  5. Technical text quality bar: each technical field should be 2–6 sentences or a short bulleted list. Be precise about versions, protocols, patterns. State the "why" behind architectural choices where inferable.
  6. Pitfalls: list at least 2 and at most 8 concrete, project-specific pitfalls observed in the files read. Generic platitudes ("remember to test your code") are not acceptable.
  7. Glossary: include every technical term used in the technical sections that a beginner might not know. Minimum 5 entries.
  8. Quiz: generate 3–5 multiple-choice questions derived from the actual analysis content, not generic trivia.
- **Side effects**: none — this step only constructs the JSON in Claude's context.
- **Edge cases**:
  - A required schema field cannot be determined from the files read: fill with the closest reasonable inference and add a note in `pitfalls` flagging the uncertainty.
  - Mermaid source would require more than 20 nodes to be accurate: use a simplified high-level view and note in the `technical` architecture text that the diagram is a simplified representation.

### Step 4 — Write JSON to Temp Path

- **Invocation**: The prompt instructs Claude to write the JSON string produced in Step 3 to a file.
- **Behavior**:
  1. Compute the path: `${TMPDIR:-/tmp}/waid-analysis-$$.json` where `$$` is the shell PID. Since Claude Code executes tool calls rather than a shell, use a stable unique suffix (e.g., a timestamp in milliseconds, or a UUID) appended to `waid-analysis-` inside the system temp directory.
  2. Write the JSON string as UTF-8 with a trailing newline.
  3. Verify the file was written (file size > 0).
- **Side effects**: creates one file in the system temp directory.
- **Edge cases**:
  - Temp directory is not writable: fall back to writing into the project root as `waid-analysis-tmp.json`; warn the user in the final report.
  - JSON string is empty or malformed (Claude failed to produce valid JSON): do not write the file; report the failure to the user with the raw output for inspection.

### Step 5 — Invoke Launcher

- **Invocation**: The prompt instructs Claude to call `scripts/launch.sh` (path relative to plugin root) with the arguments below.
- **Behavior**:
  1. Construct the command: `bash <plugin_root>/scripts/launch.sh "$JSON_PATH" [--out=<path>] [--no-open]`. The `--out` and `--no-open` flags are forwarded only if the user supplied them.
  2. Execute the command via Claude Code's shell tool (or equivalent execution primitive).
  3. Capture exit code and stderr.
  4. On non-zero exit: do not silently succeed. Report the exit code and the stderr output to the user verbatim, followed by a one-line remediation hint (e.g., "Ensure `bash` is available and the plugin root path is correct.").
- **Side effects**: `scripts/launch.sh` writes `under-the-hood.html` and may open a browser window (see LauncherScript contract).
- **Edge cases**:
  - `scripts/launch.sh` is not executable: the prompt instructs Claude to first attempt `bash <path>` explicitly, avoiding the need for execute permissions.
  - Plugin root cannot be determined: derive it as the directory two levels above `commands/under-the-hood.md` (i.e., `commands/../..` → plugin root).

### Step 6 — Success Report

- **Invocation**: After launcher exits 0.
- **Behavior**: Emit a single line to the user:
  `Report written to: <absolute path of under-the-hood.html> — opening in your browser.`
  If `--no-open` was set: omit "opening in your browser".
- **Side effects**: none beyond the user-visible message.
- **Edge cases**:
  - Output path was `--out`-overridden: report the overridden path, not `./under-the-hood.html`.

## Outputs

| Output | Type | When |
|--------|------|------|
| `waid-analysis-<uid>.json` | JSON file in system temp | Step 4: always on success |
| `under-the-hood.html` (or `--out` path) | HTML file | Step 5: written by `launch.sh` |
| One-line success message | stdout to user | Step 6: launcher exits 0 |
| Error message + stderr | stdout to user | Step 5: launcher exits non-zero |

## Error Handling

| Failure | Detection | Message to user | Recovery hint |
|---------|-----------|-----------------|---------------|
| `schema/stack-detection.json` missing | File read returns not-found | "Warning: stack-detection.json not found — analysis will proceed without stack-specific file hints." | Re-install the plugin or run from the correct project root. |
| Could not produce valid JSON | JSON parse check on Step 3 output | "Error: analysis JSON is invalid. Raw output: <text>" | Check the schema and retry with `--depth=quick`. |
| Temp dir not writable | Write failure in Step 4 | "Warning: could not write to temp dir; writing to ./waid-analysis-tmp.json instead." | Check temp directory permissions. |
| `scripts/launch.sh` exits non-zero | Exit code check in Step 5 | "Error: launch.sh failed (exit <N>):\n<stderr>" | See error details; ensure bash ≥ 3.2 and the HTML template files are present. |
| Token budget exceeded | Running count during Step 2 | (no message — silently trim file sample per depth rules) | User may re-run with `--depth=deep` once they understand the project is large. |

## Dependencies

**Layer 1 data components**:
- `AnalysisSchema` — Claude must produce JSON strictly conforming to `schema/analysis.schema.json`. The contract for AnalysisSchema is the authoritative source for required fields, types, and validation rules.
- `StackDetectionRules` — The prompt reads `schema/stack-detection.json` at runtime. Changes to that file's structure require a corresponding update to the Step 1 reading logic in this prompt.

**Environment dependencies**:
- Claude Code CLI — the prompt is interpreted by Claude running inside a Claude Code session; it relies on Claude Code's file-read and shell-execution tool primitives.
- A writable temp directory (`$TMPDIR` or `/tmp`).
- `bash` ≥ 3.2 on the PATH (for invoking `launch.sh`).
- No network access is required or permitted. The command must function entirely offline.

**Privacy**:
- The analysis JSON and the HTML report are written to the local filesystem only.
- No telemetry, no API calls, no external resource loading beyond the Mermaid CDN inside the rendered HTML (which the user controls by editing the template).

## Test Requirements

- [ ] Running `/under-the-hood` in a bare Node project (only `package.json`) produces valid JSON with `stack` containing `"node"`.
- [ ] Running `/under-the-hood` in a Python project (`pyproject.toml` present) detects the correct stack and populates relevant key files.
- [ ] Running `/under-the-hood` in an empty directory does not crash; `stack` is `["unknown"]` and `pitfalls` contains at least one entry.
- [ ] The produced JSON validates against `schema/analysis.schema.json` with no errors.
- [ ] Both `technical` and `layman` fields are non-empty strings (default `--mode=both`).
- [ ] `--mode=technical` produces empty-string `layman` fields; `--mode=layman` produces empty-string `technical` fields.
- [ ] `--depth=quick` reads no more than 10 files total.
- [ ] `--depth=deep` still respects the 50 000-token cap (files are truncated or dropped rather than overrunning context).
- [ ] `architecture.diagram_source` is valid Mermaid syntax (parse with `mermaid` CLI or equivalent fixture check).
- [ ] `glossary` has at least 5 entries.
- [ ] `quiz` has 3–5 questions, each with exactly 4 answer choices and a valid `correct_index`.
- [ ] `--no-open` is forwarded correctly to `launch.sh`; no browser window is opened.
- [ ] `--out=<custom_path>` is forwarded to `launch.sh`; the success message reports the custom path.
- [ ] On launcher failure (mocked exit 1), the error message contains the exit code and stderr, not just a generic failure string.
- [ ] The temp JSON file is removed (or left for the user to clean up) — document whichever behavior is chosen.
- [ ] No network calls are made during any phase of execution (verifiable via network sandboxing in CI).
