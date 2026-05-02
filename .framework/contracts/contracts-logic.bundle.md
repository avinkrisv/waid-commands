# Layer: logic — 2 contract(s)

---

## Contract: LauncherScript

Source: `logic/LauncherScript.contract.md`


# LauncherScript Contract

Layer: logic

## Responsibility

A bash script (`scripts/launch.sh`) that reads a validated analysis JSON file, injects it and the full CSS/JS asset files into the HTML template via safe placeholder substitution, writes a self-contained `under-the-hood.html` to the output path, and opens it in the user's default browser using the correct cross-platform open command.

## Inputs

| Input | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| `<analysis.json>` | positional: file path | yes | — | Path to the JSON file produced by the slash command |
| `--out=PATH` | flag: file path | no | `./under-the-hood.html` (CWD) | Destination for the rendered HTML file |
| `--no-open` | flag | no | (unset — browser opens) | Skip opening the file in a browser after writing |
| `--template-dir=PATH` | flag: directory path | no | directory of `launch.sh` joined with `../assets` | Override the directory where `template.html`, `template.css`, `template.js` are found |

**Environment variables consulted**:

| Variable | Purpose | Fallback |
|----------|---------|---------|
| `TMPDIR` | System temp directory (used by SlashCommand, not launch.sh directly) | `/tmp` |
| `BROWSER` | Explicit browser binary to use for opening (Linux) | Auto-detect via `xdg-open` |
| `OSTYPE` | Shell-set string used for platform detection (`darwin*`, `linux*`, `msys*`, `cygwin*`) | `uname -s` used as fallback |

**Files expected to exist** (relative to the resolved `--template-dir`):

| File | Placeholder it fills | Notes |
|------|---------------------|-------|
| `template.html` | — (the base template) | Must contain all four `__WAID_*__` sentinels |
| `template.css` | `__WAID_TEMPLATE_CSS__` | Entire file content inlined verbatim |
| `template.js` | `__WAID_TEMPLATE_JS__` | Entire file content inlined verbatim |

## Procedure / Methods

### resolve-args

- **Signature**: invoked as the first action of the script before any file I/O.
- **Behavior**:
  1. Parse `$1` as the mandatory `<analysis.json>` path. If absent or if `$1` starts with `--`, print usage to stderr and exit 1.
  2. Parse remaining arguments in a `while` loop using `case "$arg" in --out=*) ... --no-open) ... --template-dir=*) ...`. Unknown flags: print a warning to stderr but continue (lenient).
  3. Resolve `--template-dir` default: `"$(dirname "$0")/../assets"` — computed using `dirname` on `$0` (compatible with bash 3.2).
  4. Resolve `--out` default: `"./under-the-hood.html"`. Convert a directory path to an error (exit 1 with a clear message).
- **Side effects**: none.
- **Edge cases**:
  - `--out` points to an existing directory: exit 1, message: "Error: --out path '<PATH>' is a directory. Provide a file path."
  - `--out` parent directory does not exist: exit 1, message: "Error: parent directory of '<PATH>' does not exist."

### validate-inputs

- **Signature**: called after `resolve-args`.
- **Behavior**:
  1. Check `<analysis.json>` exists and is a regular file. Exit 1 if not: "Error: analysis JSON not found: '<PATH>'."
  2. Check `<analysis.json>` is non-empty (size > 0). Exit 1 if empty: "Error: analysis JSON is empty: '<PATH>'."
  3. Check `template.html`, `template.css`, `template.js` all exist under `--template-dir`. Exit 1 for each missing file: "Error: template file not found: '<PATH>'."
  4. Validate that `template.html` contains the sentinel `__WAID_ANALYSIS_JSON__`. Exit 1 if missing: "Error: template.html does not contain the required placeholder __WAID_ANALYSIS_JSON__."
- **Side effects**: none.
- **Edge cases**:
  - `analysis.json` is present but not valid UTF-8: proceed anyway — the substitution treats it as raw bytes; the rendered HTML may display a JSON parse error in-browser, which is acceptable.
  - `template.html` contains some but not all four sentinels: warn to stderr for each missing sentinel but do not exit — the missing substitutions will be no-ops.

### substitute-and-write

- **Signature**: the core transformation step.
- **Behavior**:
  1. Read `template.html` into a variable: `template_content=$(cat "$TEMPLATE_DIR/template.html")`.
  2. Read `template.css` into a variable: `css_content=$(cat "$TEMPLATE_DIR/template.css")`.
  3. Read `template.js` into a variable: `js_content=$(cat "$TEMPLATE_DIR/template.js")`.
  4. Read `<analysis.json>` into a variable: `json_content=$(cat "$ANALYSIS_JSON")`.
  5. Compute the ISO 8601 timestamp: `generated_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")`. This is the ONLY place a timestamp is generated — it goes into `__WAID_GENERATED_AT__`, never mutated into the JSON.
  6. Perform substitution using `python3 -c` with a heredoc strategy (see "Substitution safety" below). If `python3` is not available, fall back to `awk` with a sentinel delimiter. Exit 2 if both methods fail.
  7. Write the result to `--out` using a temp-then-rename pattern: write to `<out>.tmp.$$`, then `mv "$out.tmp.$$" "$out"` — this ensures the output file is never partially written.
- **Side effects**: creates (or replaces) the file at `--out`.
- **Edge cases**:
  - Output file already exists: silently overwrite via the rename pattern.
  - `python3` unavailable and `awk` unavailable: exit 2, message: "Error: substitution failed — neither python3 nor awk is available."
  - Disk full during write: the `mv` will fail; exit 2, message: "Error: failed to write output file '<PATH>'."

#### Substitution safety

Shell variable interpolation and `sed` are both unsafe when the replacement string (JSON content, CSS content, JS content) contains backslashes, ampersands, forward slashes, newlines, or shell metacharacters.

**Primary method (python3)**:

```python
python3 - <<'PYEOF'
import sys, os

template = open(os.environ['WAID_TEMPLATE']).read()
json_val  = open(os.environ['WAID_JSON']).read().rstrip('\n')
css_val   = open(os.environ['WAID_CSS']).read()
js_val    = open(os.environ['WAID_JS']).read()
ts_val    = os.environ['WAID_GENERATED_AT']

result = (template
    .replace('__WAID_ANALYSIS_JSON__',  json_val,  1)
    .replace('__WAID_TEMPLATE_CSS__',   css_val,   1)
    .replace('__WAID_TEMPLATE_JS__',    js_val,    1)
    .replace('__WAID_GENERATED_AT__',   ts_val,    1))

sys.stdout.write(result)
PYEOF
```

Pass file paths via environment variables (`export WAID_TEMPLATE`, `WAID_JSON`, `WAID_CSS`, `WAID_JS`, `WAID_GENERATED_AT`) rather than shell-expanding them into the Python source string. Python's `str.replace()` with `maxreplace=1` is byte-safe and does not interpret regex or shell metacharacters.

**Fallback method (awk)**:

Use `awk` with a sentinel that cannot appear in JSON, CSS, or JS. Use a UUID-tagged line marker as the record separator:

```awk
BEGIN { RS="\034"; ORS="" }   # ASCII FS (file separator) as record separator
```

Embed each replacement value as a separate awk input file piped via process substitution. Since the ASCII File Separator character (`\034`) cannot appear in valid JSON, CSS, or JS produced by this plugin, it is safe as a delimiter. This fallback is more complex; document it as "best-effort" and prefer python3.

**What is explicitly forbidden**:
- `sed 's/__PLACEHOLDER__/'"$variable"'/g'` — unsafe with backslashes, `&`, and newlines.
- Bash parameter expansion substitution (`${var//old/new}`) — corrupts strings containing `&` or `\n` in some bash versions.
- Any method that shell-expands the replacement value before passing it to the tool.

### open-browser

- **Signature**: called after `substitute-and-write` unless `--no-open` is set.
- **Behavior**:
  1. Detect platform:
     - If `$OSTYPE` matches `darwin*`: use `open`.
     - If `$OSTYPE` matches `msys*` or `cygwin*`: use `start`.
     - Otherwise (Linux and others): use `xdg-open` if on PATH; if `$BROWSER` is set, use that instead.
  2. Run the open command with the absolute path to the output file as its argument. Resolve the absolute path using `$(cd "$(dirname "$out")" && pwd)/$(basename "$out")` — compatible with bash 3.2 (no `realpath` required).
  3. If `uname -s` is needed as a fallback (when `$OSTYPE` is empty): `case "$(uname -s)" in Darwin) ... Linux) ... MINGW*|CYGWIN*) ... esac`.
  4. Run the open command in the background (append `&`) so the script returns immediately.
  5. If the open command is not found or exits non-zero: emit a warning to stderr, exit 0 (the HTML was successfully written — the failure to open is non-fatal). Exit code 3 is reserved for this case but the script still exits 0 overall; the exit code 3 is only emitted when the script is run with a `--strict` flag (not standard, reserved for future use).
- **Side effects**: opens a browser window (or tab) showing the rendered HTML.
- **Edge cases**:
  - No graphical environment (headless server): `xdg-open` or `open` may fail silently or return non-zero. Treat as a warning, not an error.
  - Multiple open-command candidates available: prefer the platform-native one in the order listed above.
  - Output path contains spaces: the absolute path must be double-quoted when passed to the open command.

## Outputs

| Output | Type | When |
|--------|------|------|
| `under-the-hood.html` (or `--out` path) | self-contained HTML file | Always on success (exit 0) |
| Absolute path of output file | printed to stdout | Always on success |
| Browser window/tab | side effect | On success unless `--no-open` |
| Error message | stderr | On any exit > 0 |

**Stdout on success** (exactly one line):
```
Report written to: <absolute_path>
```

**Determinism**: given the same `analysis.json`, `template.html`, `template.css`, and `template.js`, the script produces byte-identical output every time except for the `__WAID_GENERATED_AT__` placeholder value (which changes with the clock). This is by design — the timestamp lives in a dedicated placeholder, not embedded in the JSON or CSS.

## Error Handling

| Failure | Detection | Exit code | Message format | Recovery hint |
|---------|-----------|-----------|---------------|---------------|
| `<analysis.json>` argument missing | `$#` check before arg parsing | 1 | `Usage: launch.sh <analysis.json> [--out=PATH] [--no-open] [--template-dir=PATH]` | Provide the path to the JSON file produced by the slash command. |
| `<analysis.json>` file not found | `-f` test | 1 | `Error: analysis JSON not found: '<PATH>'.` | Check the temp path printed by the slash command. |
| `<analysis.json>` is empty | `-s` test | 1 | `Error: analysis JSON is empty: '<PATH>'.` | Re-run the slash command; the JSON write may have failed. |
| Template file missing | `-f` test for each | 1 | `Error: template file not found: '<PATH>'.` | Verify the plugin installation; check `--template-dir`. |
| `--out` target is a directory | `-d` test | 1 | `Error: --out path '<PATH>' is a directory. Provide a file path.` | Use a file path, e.g. `--out=./report.html`. |
| `--out` parent dir missing | `-d` test on `dirname` | 1 | `Error: parent directory of '<PATH>' does not exist.` | Create the parent directory first. |
| Substitution failure | python3 / awk exit code | 2 | `Error: substitution failed — <reason>.` | Ensure python3 ≥ 3.6 or awk is available. |
| Write / rename failure | `mv` exit code | 2 | `Error: failed to write output file '<PATH>'.` | Check disk space and directory write permissions. |
| Browser open command fails | open/xdg-open exit code | 0 (warning only) | `Warning: could not open browser (<cmd> exited <N>). Report is at: <PATH>.` | Open the file manually in your browser. |

## Dependencies

**Layer 1 data components**:
- `AnalysisSchema` — the script does not validate the JSON against the schema (that is Claude's job), but it must pass the raw JSON content through without modification. The `__WAID_ANALYSIS_JSON__` placeholder in `template.html` must receive the exact JSON string as produced by the slash command.

**Layer 2 UI components** (consumed as files, not code dependencies):
- `HtmlTemplate` (`assets/template.html`) — must contain the four sentinels `__WAID_ANALYSIS_JSON__`, `__WAID_TEMPLATE_CSS__`, `__WAID_TEMPLATE_JS__`, `__WAID_GENERATED_AT__`.
- `DesignTokens` (`assets/template.css`) — inlined wholesale into the HTML output.
- `InteractiveJS` (`assets/template.js`) — inlined wholesale into the HTML output.

**Runtime environment**:
- `bash` ≥ 3.2 (macOS default since 10.3). No bash 4+ features are used. Specifically: no associative arrays (`declare -A`), no `mapfile`/`readarray`, no `{a..z}` brace expansion with steps.
- `python3` ≥ 3.6 on PATH (primary substitution engine). If absent, the awk fallback is used.
- `awk` on PATH (fallback substitution engine). POSIX awk is sufficient.
- `cat`, `mv`, `date`, `dirname`, `basename` — standard POSIX utilities, assumed always present.
- `open` (macOS), `xdg-open` (Linux), or `start` (Windows/Git Bash) — one must be available for browser launch; absence produces a warning, not a failure.
- No internet access is required or used. The generated HTML may load Mermaid from a CDN when opened in a browser, but that is a browser-side concern, not the script's.

**Bash version note**: `date -u +"%Y-%m-%dT%H:%M:%SZ"` works on both macOS (`BSD date`) and Linux (`GNU date`). No `-d` flag (GNU-only) is used.

## Required Placeholder Substitutions

All four must appear verbatim in `template.html` and be substituted exactly once each:

| Sentinel | Replaced with | Source |
|----------|--------------|--------|
| `__WAID_ANALYSIS_JSON__` | Raw contents of `<analysis.json>` (trailing newline stripped) | `$ANALYSIS_JSON` file |
| `__WAID_TEMPLATE_CSS__` | Raw contents of `template.css` | `$TEMPLATE_DIR/template.css` file |
| `__WAID_TEMPLATE_JS__` | Raw contents of `template.js` | `$TEMPLATE_DIR/template.js` file |
| `__WAID_GENERATED_AT__` | ISO 8601 UTC timestamp: `YYYY-MM-DDTHH:MM:SSZ` | `date -u` at script runtime |

The sentinels are designed to be collision-resistant: no valid JSON value, CSS rule, or JavaScript expression can contain the literal string `__WAID_ANALYSIS_JSON__` etc., so a single-pass `str.replace()` is safe.

## Test Requirements

- [ ] `launch.sh` with no arguments exits 1 and prints usage to stderr.
- [ ] `launch.sh` with a non-existent JSON path exits 1 with a "not found" message.
- [ ] `launch.sh` with an empty JSON file exits 1 with an "empty" message.
- [ ] `launch.sh` with a missing `template.html` exits 1 with a "template file not found" message.
- [ ] `launch.sh` with `--out` pointing to an existing directory exits 1 with the directory error message.
- [ ] `launch.sh` with `--out` whose parent directory does not exist exits 1 with the parent-directory error message.
- [ ] Successful run: output HTML exists, is non-empty, and contains the injected JSON literal.
- [ ] Output HTML contains the CSS content inline (no `<link>` tag to template.css).
- [ ] Output HTML contains the JS content inline (no `<script src>` tag to template.js).
- [ ] Output HTML contains an ISO 8601 timestamp string matching `WAID_GENERATED_AT`.
- [ ] JSON content containing backslashes, ampersands, `</script>`, and newlines survives substitution intact.
- [ ] JSON content containing the string `__WAID_TEMPLATE_CSS__` is embedded verbatim (no recursive substitution — substitution is single-pass).
- [ ] `--no-open` suppresses the browser open command (mock the open command to assert it is not called).
- [ ] `--template-dir=<custom>` reads templates from the custom directory instead of the default `../assets`.
- [ ] `--out=<custom_path>` writes the HTML to the custom path; stdout reports the custom path.
- [ ] Write-then-rename pattern: partial output is not left on disk if a write fails (simulate with a full-disk scenario or a read-only target directory).
- [ ] On macOS (`OSTYPE=darwin21.0`), the platform detection chooses `open`.
- [ ] On Linux (`OSTYPE=linux-gnu`), the platform detection chooses `xdg-open`.
- [ ] When the browser open command fails, the script still exits 0 and the HTML file is present.
- [ ] Same `analysis.json` + same templates = byte-identical HTML (excluding the timestamp line) — verifiable by running twice within the same second or by mocking `date`.
- [ ] Script runs under bash 3.2 without syntax errors (`bash --version` check in CI; test on macOS runner without homebrew bash).
- [ ] python3 unavailable (mock by removing from PATH): awk fallback is used and output is correct.
- [ ] awk unavailable when python3 also absent: exits 2 with the substitution-failure message.

---

## Contract: SlashCommand

Source: `logic/SlashCommand.contract.md`


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
