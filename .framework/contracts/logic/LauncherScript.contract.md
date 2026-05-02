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
