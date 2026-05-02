---
description: Generate a self-contained HTML report explaining the current project (tech stack, architecture, methodologies, pitfalls) with parallel Technical and Layman views.
argument-hint: "[--depth=quick|standard|deep] [--mode=technical|layman|both] [--out=PATH] [--no-open]"
---

# /under-the-hood

You are executing the `/under-the-hood` slash command. Follow every step below precisely. Do not skip steps. Do not make any network calls. Do not read files outside the project root.

---

## Argument Parsing

Parse the arguments the user supplied after `/under-the-hood`. Supported flags:

| Flag | Values | Default | Purpose |
|------|--------|---------|---------|
| `--depth` | `quick` \| `standard` \| `deep` | `standard` | Controls how many files are read |
| `--mode` | `technical` \| `layman` \| `both` | `both` | Which text variants to populate |
| `--out` | any file path | `./under-the-hood.html` | Forwarded to `launch.sh`; sets the HTML output path |
| `--no-open` | flag (no value) | unset (browser opens) | Forwarded to `launch.sh`; suppresses browser launch |

Store the resolved values. If an unrecognised flag is supplied, ignore it and continue.

**Depth file budgets:**

| Depth | Manifest + config cap | Source file sample cap | Total file cap | Token budget |
|-------|-----------------------|------------------------|----------------|--------------|
| `quick` | all manifests + up to 5 config files | 5 source files | ~10 files | ≤ 15k tokens |
| `standard` | all manifests + up to 10 config files | 15 source files | ~30 files | ≤ 40k tokens |
| `deep` | all manifests + up to 20 config files | 40 source files | ~60 files | ≤ 80k tokens |

---

## Step 1 — Detect the Project Stack

### 1a. Determine the plugin root

The plugin root is the directory that contains the `commands/` folder where this file lives. Concretely: given the path to this file (`commands/under-the-hood.md`), the plugin root is two levels up — `commands/../..` resolved to an absolute path. Store it as `PLUGIN_ROOT`.

### 1b. Read the stack-detection rules

Read `${PLUGIN_ROOT}/schema/stack-detection.json`. This file has a `stacks` array. Each entry has:
- `id` — internal stable identifier
- `humanName` — display name (used in `detectedStack` and `tech_stack.entries`)
- `manifestFiles` — list of filenames to look for (exact match, unless `manifestFilesAreGlobs: true`)
- `manifestFilesAreGlobs` — when `true`, treat `manifestFiles` entries as glob patterns (e.g. `*.csproj`)
- `keyConfigFiles` — secondary config files to read after a manifest match
- `entryPointHints` — suggested entry-point paths/globs to read
- `workspaceIndicators` — files/dirs that signal a monorepo layout

If `schema/stack-detection.json` is missing or unreadable:
- Emit a warning that will appear in the analysis `pitfalls` array.
- Continue with `detectedStack: "Unknown"` and skip stack-specific file prioritization.

Check that `$schemaVersion` is `1`. If it is not, note the discrepancy in pitfalls but continue.

### 1c. Scan the project root for manifest files

For each stack entry in the `stacks` array (in order):
1. Check whether any of the stack's `manifestFiles` exist **directly in the project root** (the CWD when Claude Code is running — not `PLUGIN_ROOT`).
2. Also check one level of **immediate subdirectories** (e.g. `src/`, `app/`, `lib/`, `backend/`, `frontend/`, `packages/`). Cap subdirectory manifest scanning at 20 manifest matches total across all immediate subdirs.
3. For stacks where `manifestFilesAreGlobs: true` (currently only `dotnet`): use file-extension matching instead of exact filenames (e.g. any file ending in `.csproj`, `.fsproj`, `.vbproj` counts as a match).

Collect every stack whose manifest was found. This is your **matched stacks** list.

### 1d. Determine `detectedStack` and `primaryStack`

- **No matches**: use the `unknown` entry. Set `detectedStack: "Unknown"`. Infer the stack from file extensions present in the repository (majority `.c` files → C, majority `.sh` files → shell script, etc.) and describe the inference using uncertainty language in narrative fields.
- **One match**: `detectedStack` = that stack's `humanName`. `primaryStack` = that stack.
- **Two or three matches**: `detectedStack` = join `humanName` values with `" + "` (e.g. `"Node.js / JavaScript + Python"`). `primaryStack` = the first matched stack.
- **More than three matches**: `detectedStack` = `"<humanName1> + <humanName2> + <humanName3> + others"`. `primaryStack` = the first matched stack.

**TypeScript upgrade**: if the `nodejs` stack is matched AND `tsconfig.json` is found (either at the project root or in a direct subdirectory), upgrade the `humanName` reported for the Node.js stack to `"Node.js / TypeScript"` in the `detectedStack` string and in all `tech_stack.entries` for that stack.

---

## Step 2 — Read Project Files Within the Depth Budget

Read files in this priority order. Stop when you reach the token budget for your `--depth`.

**Priority 1 — Manifest files** (always read, never trim):
Read every manifest file you found during detection (e.g. `package.json`, `pyproject.toml`, `Cargo.toml`).

**Priority 2 — Key config files** (per-stack, up to the depth cap):
For each matched stack, consult `stack-detection.json` for that stack's `keyConfigFiles` list. Read whichever of those files are present in the project, up to the config file cap for your depth.

**Priority 3 — Entry points** (per-stack):
For each matched stack, check `entryPointHints`. Expand glob-style hints with extension matching (e.g. `src/index.*` → try `.ts`, `.js`, `.tsx`, `.jsx`). Read files that exist.

**Priority 4 — README and changelogs**:
Read `README.md`, `README.rst`, `README.txt`, `CHANGELOG.md`, `CHANGELOG`, `HISTORY.md` if present (first one found of each type).

**Priority 5 — Source file sample** (up to the depth source-file cap):
Sample additional source files. Prefer:
1. Shallowest directory depth first.
2. Within the same depth, larger files first (more logic).

Skip silently:
- Binary files
- Lock files (`package-lock.json`, `yarn.lock`, `poetry.lock`, `Cargo.lock`, `pnpm-lock.yaml`, `composer.lock`)
- Generated/build output (`*.min.js`, `dist/`, `build/`, `__pycache__/`, `.git/`, `.next/`, `target/`, `vendor/`)

**Token budget enforcement**: if reading all prioritized files would exceed the token budget, trim the Priority 5 sample first, then Priority 4, then Priority 3, never Priority 1 or 2. For any individual file exceeding ~5000 tokens, read only the first ~150 lines.

**Hard constraints** — never violate these:
- NEVER read files outside the project root.
- NEVER make any network call.

---

## Step 3 — Produce the Analysis JSON

Produce a single JSON object conforming to `${PLUGIN_ROOT}/schema/analysis.schema.json`.

### Required top-level fields

```
$schemaVersion   integer   must be exactly 1
projectName      string    repository folder name, or "name" field from the top-level manifest
generatedAt      string    current UTC timestamp in ISO 8601 format: "YYYY-MM-DDTHH:MM:SSZ"
detectedStack    string    determined in Step 1d
overview         DualSection
tech_stack       TechStackSection
architecture     ArchitectureSection
algorithms       AlgorithmsSection
methodologies    MethodologiesSection
pattern_rationale PatternRationaleSection
pitfalls         PitfallsSection
glossary         GlossaryEntry[]
quiz             QuizItem[]
```

### DualSection shape (used by overview)

```json
{ "technical": "string (non-empty)", "layman": "string (non-empty)" }
```

### TechStackSection shape

```json
{
  "technical": "string",
  "layman": "string",
  "entries": [
    { "name": "TypeScript", "role": "primary language", "version": "5.4.0" }
  ]
}
```
`entries` must have at least one item. List every language, framework, runtime, and major tool detected. Use `"unknown"` for `version` when not pinned in the manifest.

### ArchitectureSection shape

```json
{
  "technical": "string",
  "layman": "string",
  "mermaid": "flowchart TD\n  A[Entry] --> B[Core]"
}
```
Mermaid diagram rules:
- Use `flowchart TD` or `graph TD` syntax for architecture; use `sequenceDiagram` for request-flow variants.
- Produce 5–15 nodes. Label each node with a meaningful name (not single letters).
- If the project is too small for a meaningful diagram (e.g. a single-file script), set `mermaid` to `""`.
- When the project would need more than 20 nodes for accuracy, simplify to a high-level view and note it in the `technical` text.

### AlgorithmsSection shape

```json
{
  "technical": "string",
  "layman": "string",
  "entries": []
}
```
`entries` may be empty (`[]`) for projects with no notable algorithms. When entries exist: `{ "name", "technical", "layman" }`.

### MethodologiesSection shape

```json
{
  "technical": "string",
  "layman": "string",
  "entries": [
    { "name": "Continuous Integration", "technical": "...", "layman": "..." }
  ]
}
```

### PatternRationaleSection shape

```json
{
  "technical": "string",
  "layman": "string",
  "entries": [
    { "pattern": "Repository pattern", "rationale_technical": "...", "rationale_layman": "..." }
  ]
}
```

### PitfallsSection shape

```json
{
  "technical": "string",
  "layman": "string",
  "entries": [
    { "title": "...", "severity": "medium", "technical": "...", "layman": "..." }
  ]
}
```
`entries` must have **at least one** item. `severity` must be one of `"low"`, `"medium"`, `"high"`. Pitfalls must be **concrete and project-specific** — observed in the actual files you read. Generic advice ("write more tests") is not acceptable.

### GlossaryEntry shape

```json
[
  { "term": "Dependency Injection", "layman": "...", "technical": "..." }
]
```
`technical` is optional. Include every domain-specific term used in the technical narratives. Minimum 5 entries for non-trivial projects.

### QuizItem shape

```json
[
  {
    "question": "...",
    "choices": ["A", "B", "C", "D"],
    "answerIndex": 0,
    "explanation_layman": "...",
    "explanation_technical": "..."
  }
]
```
3–5 questions. All must be **project-specific** (derived from the actual analysis content). No generic programming trivia. `answerIndex` is 0-based and must be less than `choices.length`.

### Mode handling

- `--mode=both` (default): populate **both** `technical` and `layman` fields in every section with substantive text.
- `--mode=technical`: populate `technical` fields with substantive text; set `layman` fields to `""`.
- `--mode=layman`: populate `layman` fields with substantive text; set `technical` fields to `""`.

### Quality bars for text variants

**Technical** (per variant):
- 2–6 sentences or a short bulleted list.
- Precise and jargon-correct. Reference actual file paths and dependency names where relevant.
- State the "why" behind architectural choices where inferable.
- Soft word counts: overview 100–180 words; tech_stack narrative 80–120; architecture narrative 100–200; methodologies 80–150; pattern_rationale 100–160; pitfall entries 60–100 each.

**Layman** (per variant):
- 2–5 sentences.
- 5th-grade reading level. Use an everyday analogy in the first sentence.
- Avoid jargon entirely. If a technical term must appear, immediately follow it with a parenthetical plain-English gloss.
- Same soft word-count targets as technical.

### Edge cases

- A required field cannot be determined from the files read → fill with the closest reasonable inference; add a note in `pitfalls` flagging the uncertainty with `severity: "low"`.
- Project root is nearly empty (scaffolded but undeveloped) → note in `overview`; produce a minimal but valid JSON; reduce analysis depth gracefully.
- Mermaid diagram would need more than 20 nodes → simplify to high-level; note in `architecture.technical`.

---

## Step 4 — Write the JSON to a Temp File

1. Verify the JSON you produced in Step 3 is valid (mentally parse it; ensure all braces/brackets are balanced, all strings are properly escaped, all required fields are present).
2. If the JSON is invalid or empty: **do not proceed**. Report the failure to the user with the raw output for inspection and suggest re-running with `--depth=quick`.
3. Compute the output path: `${TMPDIR:-/tmp}/waid-analysis-<uid>.json` where `<uid>` is a unique identifier (use a UTC timestamp in milliseconds, or a UUID). Never use shell `$$` directly — derive a stable unique suffix via a tool call.
4. Write the JSON as UTF-8 with a trailing newline to that path.
5. Fallback: if the temp directory is not writable, write to `./waid-analysis-tmp.json` in the project root and warn the user in the final report.
6. Verify the file was written and is non-empty (file size > 0).

Store the absolute path as `JSON_PATH`.

---

## Step 5 — Invoke the Launcher Script

Construct and execute the following shell command:

```
bash "${PLUGIN_ROOT}/scripts/launch.sh" "$JSON_PATH" [flags]
```

Forwarding rules:
- Always forward `$JSON_PATH` as the first positional argument.
- Forward `--out=<path>` only if the user supplied `--out`.
- Forward `--no-open` only if the user supplied `--no-open`.
- Do **not** forward `--depth` or `--mode` — those are consumed by this prompt only.

Capture the exit code, stdout, and stderr.

**On non-zero exit**:
- Do not silently succeed.
- Report to the user: `Error: launch.sh failed (exit <N>):` followed by the stderr verbatim.
- Append a one-line remediation hint: "Ensure bash ≥ 3.2 is available and the plugin assets are present under `${PLUGIN_ROOT}/assets/`."

**Note**: `launch.sh` does not require the execute bit — you are invoking it explicitly with `bash`, so it will run regardless of file permissions.

---

## Step 6 — Report Success

After the launcher exits with code 0, reply to the user with exactly one line:

```
Report written to: <absolute path of the HTML file> — opening in your browser.
```

If `--no-open` was set, omit "— opening in your browser":

```
Report written to: <absolute path of the HTML file>.
```

If `--out` was overridden by the user, report the overridden path.

---

## Error Handling Reference

| Failure | Action |
|---------|--------|
| `schema/stack-detection.json` missing | Add a `pitfall` entry noting the degradation; continue with `detectedStack: "Unknown"` |
| `schema/stack-detection.json` has `$schemaVersion ≠ 1` | Add a `pitfall` noting the version mismatch; continue |
| Could not produce valid JSON | Stop; report "Error: analysis JSON is invalid. Raw output: <text>". Suggest `--depth=quick`. |
| Temp dir not writable | Fall back to `./waid-analysis-tmp.json`; warn user in the final report |
| `launch.sh` exits non-zero | Report exit code + stderr verbatim; give the remediation hint |
| Token budget exceeded | Silently trim file sample per depth rules (no user message) |

---

## Privacy Notice

**This command makes no network calls.** The analysis JSON, the HTML report, and any intermediate files stay entirely on your local machine. No telemetry is sent. No external services are contacted. The rendered HTML may load the Mermaid diagramming library from a CDN when you open it in a browser — that is a browser-side request, not initiated by this command.

---

## Schema Field Summary (inline reference)

Use this summary if `schema/analysis.schema.json` cannot be read at runtime. The authoritative source is always the schema file itself.

```
Root object — required fields:
  $schemaVersion  : integer (const 1)
  projectName     : string (non-empty)
  generatedAt     : string (ISO 8601 UTC)
  detectedStack   : string (non-empty)
  overview        : { technical: string, layman: string }
  tech_stack      : { technical, layman, entries: [{name, role, version}] }
  architecture    : { technical, layman, mermaid: string }
  algorithms      : { technical, layman, entries: [{name, technical, layman}] }
  methodologies   : { technical, layman, entries: [{name, technical, layman}] }
  pattern_rationale: { technical, layman, entries: [{pattern, rationale_technical, rationale_layman}] }
  pitfalls        : { technical, layman, entries: [{title, severity, technical, layman}] }
  glossary        : [{term, layman, technical?}]  — may be []
  quiz            : [{question, choices[], answerIndex, explanation_layman, explanation_technical}] — may be []

pitfalls.entries.severity enum: "low" | "medium" | "high"
quiz.choices: 2–6 items; answerIndex is 0-based
```

All `technical` and `layman` string fields have `minLength: 1` — never emit `null` or omit a required field.
