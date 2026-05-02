# Layer: data — 2 contract(s)

---

## Contract: AnalysisSchema

Source: `data/AnalysisSchema.contract.md`


# AnalysisSchema Contract

Layer: data

## Responsibility

Defines the canonical JSON shape Claude must emit when analyzing a project, with field-level documentation and required/optional flags, serving as the single source of truth for every downstream consumer (SlashCommand prompt, LauncherScript injector, InteractiveJS renderer).

## JSON Schema Definition

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://waid-commands/schema/analysis.schema.json",
  "title": "ProjectAnalysis",
  "description": "The complete structured analysis Claude produces for a project. Every top-level section carries parallel technical and layman text variants so the HTML report can switch views without a network round-trip.",
  "type": "object",
  "required": [
    "$schemaVersion",
    "projectName",
    "generatedAt",
    "detectedStack",
    "overview",
    "tech_stack",
    "architecture",
    "algorithms",
    "methodologies",
    "pattern_rationale",
    "pitfalls",
    "glossary",
    "quiz"
  ],
  "additionalProperties": false,
  "properties": {
    "$schemaVersion": {
      "type": "integer",
      "const": 1,
      "description": "Schema version. Increment on breaking field changes. Consumers gate on this value."
    },
    "projectName": {
      "type": "string",
      "minLength": 1,
      "description": "Human-readable project name — e.g. the repository folder name or the name field from the top-level manifest."
    },
    "generatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO-8601 UTC timestamp of when Claude produced this analysis."
    },
    "detectedStack": {
      "type": "string",
      "minLength": 1,
      "description": "The humanName of the detected primary stack (e.g. 'Node.js / JavaScript'). Set to 'Unknown' when no manifest matched. For multi-stack monorepos, join with ' + ' (e.g. 'Node.js / JavaScript + Python')."
    },
    "overview": {
      "$ref": "#/$defs/DualSection",
      "description": "High-level summary of what the project is and does."
    },
    "tech_stack": {
      "type": "object",
      "description": "Breakdown of every language, framework, tool, and runtime detected in the project.",
      "required": ["technical", "layman", "entries"],
      "additionalProperties": false,
      "properties": {
        "technical": { "type": "string", "minLength": 1, "description": "Technical narrative of the full technology stack." },
        "layman": { "type": "string", "minLength": 1, "description": "Plain-English explanation of the technology stack for a non-developer." },
        "entries": {
          "type": "array",
          "minItems": 1,
          "description": "Individual stack entries, one per language/framework/tool.",
          "items": {
            "type": "object",
            "required": ["name", "role", "version"],
            "additionalProperties": false,
            "properties": {
              "name":    { "type": "string", "minLength": 1, "description": "Technology name, e.g. 'TypeScript'." },
              "role":    { "type": "string", "minLength": 1, "description": "What this technology does, e.g. 'primary language'." },
              "version": { "type": "string", "description": "Version string from manifest, or 'unknown' if not pinned." }
            }
          }
        }
      }
    },
    "architecture": {
      "type": "object",
      "description": "Structural overview of how the project is organized and how its major parts connect.",
      "required": ["technical", "layman", "mermaid"],
      "additionalProperties": false,
      "properties": {
        "technical": { "type": "string", "minLength": 1, "description": "Technical narrative: layers, modules, data flows, service boundaries." },
        "layman":    { "type": "string", "minLength": 1, "description": "Plain-English analogy of how the pieces fit together." },
        "mermaid":   { "type": "string", "description": "Valid Mermaid diagram source, or empty string when no meaningful diagram can be produced. Renderer shows 'No diagram available' on empty string." }
      }
    },
    "algorithms": {
      "type": "object",
      "description": "Key algorithms or data-processing patterns used in the project.",
      "required": ["technical", "layman", "entries"],
      "additionalProperties": false,
      "properties": {
        "technical": { "type": "string", "minLength": 1 },
        "layman":    { "type": "string", "minLength": 1 },
        "entries": {
          "type": "array",
          "description": "May be empty for projects with no notable algorithms.",
          "items": {
            "type": "object",
            "required": ["name", "technical", "layman"],
            "additionalProperties": false,
            "properties": {
              "name":      { "type": "string", "minLength": 1 },
              "technical": { "type": "string", "minLength": 1 },
              "layman":    { "type": "string", "minLength": 1 }
            }
          }
        }
      }
    },
    "methodologies": {
      "type": "object",
      "required": ["technical", "layman", "entries"],
      "additionalProperties": false,
      "description": "Development methodologies, workflows, and process patterns observed.",
      "properties": {
        "technical": { "type": "string", "minLength": 1 },
        "layman":    { "type": "string", "minLength": 1 },
        "entries": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "technical", "layman"],
            "additionalProperties": false,
            "properties": {
              "name":      { "type": "string", "minLength": 1, "description": "e.g. 'Continuous Integration', 'Feature Flags'." },
              "technical": { "type": "string", "minLength": 1 },
              "layman":    { "type": "string", "minLength": 1 }
            }
          }
        }
      }
    },
    "pattern_rationale": {
      "type": "object",
      "required": ["technical", "layman", "entries"],
      "additionalProperties": false,
      "description": "Explains why the observed patterns were chosen — reasoning, not just names.",
      "properties": {
        "technical": { "type": "string", "minLength": 1 },
        "layman":    { "type": "string", "minLength": 1 },
        "entries": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["pattern", "rationale_technical", "rationale_layman"],
            "additionalProperties": false,
            "properties": {
              "pattern":              { "type": "string", "minLength": 1, "description": "e.g. 'Repository pattern'." },
              "rationale_technical":  { "type": "string", "minLength": 1 },
              "rationale_layman":     { "type": "string", "minLength": 1 }
            }
          }
        }
      }
    },
    "pitfalls": {
      "type": "object",
      "required": ["technical", "layman", "entries"],
      "additionalProperties": false,
      "description": "Known risks, anti-patterns, technical debt, and gotchas.",
      "properties": {
        "technical": { "type": "string", "minLength": 1 },
        "layman":    { "type": "string", "minLength": 1 },
        "entries": {
          "type": "array",
          "minItems": 1,
          "description": "At least one required. For pristine projects, use a low-severity note.",
          "items": {
            "type": "object",
            "required": ["title", "severity", "technical", "layman"],
            "additionalProperties": false,
            "properties": {
              "title":     { "type": "string", "minLength": 1 },
              "severity":  { "type": "string", "enum": ["low", "medium", "high"], "description": "Renderer color-codes low=yellow, medium=orange, high=red. InteractiveJS defaults to 'medium' on invalid value." },
              "technical": { "type": "string", "minLength": 1 },
              "layman":    { "type": "string", "minLength": 1 }
            }
          }
        }
      }
    },
    "glossary": {
      "type": "array",
      "description": "Definitions for key terms. Rendered as hover-tooltips and a dedicated section. May be empty.",
      "items": {
        "type": "object",
        "required": ["term", "layman"],
        "additionalProperties": false,
        "properties": {
          "term":      { "type": "string", "minLength": 1 },
          "layman":    { "type": "string", "minLength": 1, "description": "Required. Plain-English definition." },
          "technical": { "type": "string", "description": "Optional. Precise technical definition. Omit when no nuance beyond layman." }
        }
      }
    },
    "quiz": {
      "type": "array",
      "description": "Multiple-choice questions testing understanding of this project. May be empty.",
      "items": {
        "type": "object",
        "required": ["question", "choices", "answerIndex", "explanation_layman", "explanation_technical"],
        "additionalProperties": false,
        "properties": {
          "question":                { "type": "string", "minLength": 1 },
          "choices":                 { "type": "array", "minItems": 2, "maxItems": 6, "items": { "type": "string", "minLength": 1 } },
          "answerIndex":             { "type": "integer", "minimum": 0, "description": "0-based index into choices. Must be < choices.length — JSON Schema cannot enforce this cross-field constraint; InteractiveJS validates at runtime." },
          "explanation_layman":      { "type": "string", "minLength": 1 },
          "explanation_technical":   { "type": "string", "minLength": 1 }
        }
      }
    }
  },
  "$defs": {
    "DualSection": {
      "type": "object",
      "required": ["technical", "layman"],
      "additionalProperties": false,
      "properties": {
        "technical": { "type": "string", "minLength": 1, "description": "Technical prose for the power-user view." },
        "layman":    { "type": "string", "minLength": 1, "description": "Plain-English prose for the beginner view." }
      }
    }
  }
}
```

## Consumer Access Patterns

### SlashCommand uses the schema to constrain Claude's output

- **Reader**: SlashCommand (`commands/under-the-hood.md`)
- **How**: `schema/analysis.schema.json` is referenced in the slash command prompt. Claude reads it at analysis time and must produce JSON that validates against it before invoking the launcher. The prompt also embeds an inline field summary as a fallback if the schema file cannot be read.
- **Behavior**: Claude produces a single JSON document conforming to `ProjectAnalysis`.
- **Edge cases**:
  - Schema file missing at runtime: inline summary takes over; output may be less strictly validated.
  - Claude produces non-conforming JSON: LauncherScript detects parse failure, surfaces a human-readable error, no HTML produced.
  - Very large project: all string fields have `minLength: 1` but no `maxLength`; the slash command prompt should include per-field soft word-count targets.
  - Claude omits optional fields (e.g. `glossary[n].technical`): valid by schema; InteractiveJS must guard with nullish-coalescing.

### LauncherScript injects the analysis blob into the HTML template

- **Reader**: LauncherScript (`scripts/launch.sh`)
- **How**: Reads the temp JSON file produced by the slash command and performs safe sentinel-substitution into the HTML template using `awk` or `python3` — never bare shell string interpolation.
- **Behavior**: Validates the file is non-empty and parses as valid JSON. Does not re-validate against the schema. Injects the JSON string at the `__WAID_ANALYSIS_JSON__` placeholder inside the `<script id="waid-data" type="application/json">` element.
- **Edge cases**:
  - JSON contains shell-special characters (backticks, `$`, quotes): file-based injection avoids this entirely.
  - Temp file empty or absent: exit with clear error, no HTML produced.
  - JSON exceeds ARG_MAX (~2 MB on Linux): file-based injection handles this.
  - Sentinel placeholder missing from template: launcher detects substitution failure and errors with a diagnostic.

### InteractiveJS reads the embedded JSON at page-load time

- **Reader**: InteractiveJS (`assets/template.js`)
- **How**: The analysis JSON is embedded in the HTML inside `<script id="waid-data" type="application/json">`. InteractiveJS reads it at `DOMContentLoaded` via `JSON.parse(document.getElementById('waid-data').textContent)`.
- **Behavior**: Walks the structure section by section. Renders `technical`/`layman` text as DOM text nodes (never `innerHTML`). Renders glossary as tooltip triggers, quiz as interactive cards, Mermaid source via `mermaid.render()`.
- **Edge cases**:
  - `architecture.mermaid === ""`: skip `mermaid.render()`, show "No diagram available" placeholder.
  - `glossary === []`: show "No glossary entries for this project."
  - `quiz === []`: hide quiz section via `display:none`.
  - `algorithms.entries === []`: render narrative text only, no entry cards.
  - Required field absent (schema violation): every access uses `?? '[data unavailable]'`; no throws.
  - `answerIndex >= choices.length`: emit `console.warn`, render without correct-answer highlight.
  - `pitfalls.entries[n].severity` not in enum: default to `"medium"` styling.
  - `$schemaVersion !== 1`: display a warning banner at the top of the page.

## Domain Model

```typescript
// Root document
interface ProjectAnalysis {
  $schemaVersion: 1;             // const; consumers check this first
  projectName: string;
  generatedAt: string;           // ISO-8601 UTC
  detectedStack: string;         // humanName from StackDetectionRules, or "Unknown"
  overview: DualSection;
  tech_stack: TechStackSection;
  architecture: ArchitectureSection;
  algorithms: AlgorithmsSection;
  methodologies: MethodologiesSection;
  pattern_rationale: PatternRationaleSection;
  pitfalls: PitfallsSection;
  glossary: GlossaryEntry[];     // may be []
  quiz: QuizItem[];              // may be []
}

interface DualSection {
  technical: string;   // non-empty
  layman: string;      // non-empty
}

interface TechStackSection extends DualSection {
  entries: TechStackEntry[];   // minItems: 1
}
interface TechStackEntry {
  name: string;       // e.g. "TypeScript"
  role: string;       // e.g. "primary language"
  version: string;    // e.g. "5.4.0" | "unknown"
}

// The only section with a Mermaid field
interface ArchitectureSection extends DualSection {
  mermaid: string;    // valid Mermaid source, or "" when unavailable
}

interface AlgorithmsSection extends DualSection {
  entries: AlgorithmEntry[];   // may be []
}
interface AlgorithmEntry {
  name: string;
  technical: string;
  layman: string;
}

interface MethodologiesSection extends DualSection {
  entries: MethodologyEntry[];
}
interface MethodologyEntry {
  name: string;
  technical: string;
  layman: string;
}

interface PatternRationaleSection extends DualSection {
  entries: PatternRationaleEntry[];
}
interface PatternRationaleEntry {
  pattern: string;
  rationale_technical: string;
  rationale_layman: string;
}

type PitfallSeverity = "low" | "medium" | "high";

interface PitfallsSection extends DualSection {
  entries: PitfallEntry[];   // minItems: 1
}
interface PitfallEntry {
  title: string;
  severity: PitfallSeverity;   // renderer defaults "medium" on invalid
  technical: string;
  layman: string;
}

// technical is intentionally optional
interface GlossaryEntry {
  term: string;
  layman: string;
  technical?: string;
}

interface QuizItem {
  question: string;
  choices: string[];              // 2–6 items
  answerIndex: number;            // 0-based; < choices.length enforced at runtime only
  explanation_layman: string;
  explanation_technical: string;
}
```

## Distribution

- **Format**: JSON file shipped statically with the plugin; no server, no browser fetch
- **Path in plugin**: `schema/analysis.schema.json`
- **Versioning**: `$schemaVersion: 1` (const) in both the schema file and every emitted analysis. Minor additive changes (new optional fields) do not increment. A mismatch surfaces a warning banner in the rendered HTML; rendering continues with best effort.
- **Cache strategy**: N/A — never fetched at browser runtime. Read only by the slash command prompt and offline validation tooling.

## Dependencies

None. (Layer 1 components have no dependencies on other components.)

## Test Requirements

- [ ] `schema/analysis.schema.json` is valid JSON (no parse error)
- [ ] `schema/analysis.schema.json` is a valid JSON Schema draft 2020-12 document (`ajv --spec=draft2020`)
- [ ] Known-good Node.js fixture validates with zero errors
- [ ] Known-good Python fixture validates with zero errors
- [ ] Known-good Rust fixture validates with zero errors
- [ ] Analysis with `detectedStack: "Unknown"` validates (no-manifest fallback)
- [ ] Analysis with `architecture.mermaid: ""` validates
- [ ] Analysis with `glossary: []` and `quiz: []` validates
- [ ] Analysis with `algorithms.entries: []` validates
- [ ] Glossary entry missing `technical` validates (field is optional)
- [ ] `pitfalls.entries` with all three severity values validates
- [ ] Document missing any required top-level field fails validation
- [ ] `quiz[0].choices` with 1 item fails validation (`minItems: 2`)
- [ ] `quiz[0].choices` with 7 items fails validation (`maxItems: 6`)
- [ ] Document with `$schemaVersion: 2` fails validation (`const: 1`)
- [ ] Monorepo fixture with multiple `tech_stack.entries` validates
- [ ] `pitfalls.entries: []` fails validation (`minItems: 1`)
- [ ] Runtime: `answerIndex >= choices.length` → `console.warn` emitted, no crash
- [ ] Runtime: `$schemaVersion !== 1` in embedded analysis → warning banner rendered

## Open Questions

1. **`answerIndex` bounds**: Cannot be enforced by JSON Schema — cross-field constraint. InteractiveJS contract must own this runtime guard explicitly.
2. **Mermaid source validity**: Any string is accepted. Invalid Mermaid fails only at `mermaid.render()`. InteractiveJS contract must specify the fallback behavior.
3. **String length guidance**: No `maxLength`. SlashCommand prompt should include per-field soft word-count targets (e.g. ~150 words per variant for overview) to prevent oversized HTML.
4. **Multi-stack monorepos**: `detectedStack` is a single string. Convention is to join with ` + `. A future schema version might use an array. SlashCommand prompt must document the join convention.
5. **XSS / safe rendering**: The plan prohibits `innerHTML` on Claude-produced strings. This is a rendering constraint owned by the InteractiveJS contract, not enforceable by the schema.

---

## Contract: StackDetectionRules

Source: `data/StackDetectionRules.contract.md`


# StackDetectionRules Contract

Layer: data

## Responsibility

Lists manifest filenames per technology stack in priority order, plus secondary config files and entry-point hints to prioritize for reading, so the SlashCommand can discover what kind of project it is analyzing and focus its file reads efficiently.

## JSON Schema Definition

This component owns two things: (1) the schema for the rules file format, and (2) the actual rules content (inlined below in "Distribution").

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://waid-commands/schema/stack-detection.schema.json",
  "title": "StackDetectionRules",
  "description": "Ordered list of stack detection rule entries. The SlashCommand iterates this list in order, checking for manifest files in the project root and workspace subdirectories. The first match wins for primary stack identification; all matches contribute to tech_stack.entries.",
  "type": "object",
  "required": ["$schemaVersion", "stacks"],
  "additionalProperties": false,
  "properties": {
    "$schemaVersion": {
      "type": "integer",
      "const": 1,
      "description": "Version of this rules file. Increment on breaking changes to the rule entry shape."
    },
    "stacks": {
      "type": "array",
      "description": "Ordered list of stack rule entries. Priority order matters: more specific stacks should appear before generic fallbacks. The 'unknown' entry must be last.",
      "minItems": 1,
      "items": { "$ref": "#/$defs/StackRule" }
    }
  },
  "$defs": {
    "StackRule": {
      "type": "object",
      "required": ["id", "humanName", "manifestFiles", "keyConfigFiles", "entryPointHints"],
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "pattern": "^[a-z][a-z0-9-]*$",
          "description": "Stable lowercase kebab-case identifier for this stack, e.g. 'nodejs', 'python', 'rust'. Used internally; never displayed."
        },
        "humanName": {
          "type": "string",
          "minLength": 1,
          "description": "Display name of the stack, e.g. 'Node.js / JavaScript'. This value is what gets written to detectedStack in the analysis JSON."
        },
        "manifestFiles": {
          "type": "array",
          "description": "Filenames (not paths) to look for in the project root or workspace package directories. Listed in priority order — the first file found is treated as the primary manifest. Exact filenames by default; entries are interpreted as glob patterns when `manifestFilesAreGlobs: true` is set on the same rule. May be empty for the `unknown` fallback entry only.",
          "items": {
            "type": "string",
            "minLength": 1
          }
        },
        "manifestFilesAreGlobs": {
          "type": "boolean",
          "default": false,
          "description": "When true, every entry in `manifestFiles` is interpreted as a glob pattern (e.g. `*.csproj`) instead of an exact filename. The SlashCommand uses extension/filename pattern matching for these rules. Default false."
        },
        "keyConfigFiles": {
          "type": "array",
          "description": "Secondary config filenames to read after the manifest is identified. Provides richer context for the analysis (e.g. tsconfig.json reveals TypeScript settings, .eslintrc reveals linting style). May be empty. Glob patterns are NOT supported.",
          "items": {
            "type": "string",
            "minLength": 1
          }
        },
        "entryPointHints": {
          "type": "array",
          "description": "Relative path patterns (from project root) suggesting where the main application code begins. Used to focus Claude's file reads. May include glob-style wildcards (e.g. 'src/index.*', 'main.py'). May be empty for stacks where entry points are always manifest-driven.",
          "items": {
            "type": "string",
            "minLength": 1
          }
        },
        "workspaceIndicators": {
          "type": "array",
          "description": "Optional. Files or directory name patterns that indicate a monorepo/workspace layout for this stack (e.g. 'packages/', 'apps/', 'pnpm-workspace.yaml'). When present, SlashCommand should scan subdirectories for additional manifests.",
          "items": {
            "type": "string",
            "minLength": 1
          }
        },
        "notes": {
          "type": "string",
          "description": "Optional. Human-readable notes for the developer adding/editing this rule entry. Not used by the slash command."
        }
      }
    }
  }
}
```

## Actual Rules Content

The file `schema/stack-detection.json` ships with this content (the schema above is its structural contract; this section is the normative data):

```json
{
  "$schemaVersion": 1,
  "stacks": [
    {
      "id": "flutter",
      "humanName": "Flutter / Dart",
      "manifestFiles": ["pubspec.yaml"],
      "keyConfigFiles": [
        "analysis_options.yaml",
        "dart_test.yaml",
        ".flutter-plugins",
        "flutter_launcher_icons.yaml"
      ],
      "entryPointHints": ["lib/main.dart", "lib/app.dart"],
      "workspaceIndicators": ["melos.yaml", "packages/"],
      "notes": "pubspec.yaml is unique to Dart/Flutter. Check for flutter: key inside to confirm Flutter (vs pure Dart)."
    },
    {
      "id": "rust",
      "humanName": "Rust",
      "manifestFiles": ["Cargo.toml"],
      "keyConfigFiles": [
        "Cargo.lock",
        "rust-toolchain.toml",
        "rust-toolchain",
        ".cargo/config.toml",
        "clippy.toml",
        ".rustfmt.toml"
      ],
      "entryPointHints": ["src/main.rs", "src/lib.rs"],
      "workspaceIndicators": ["Cargo.toml"],
      "notes": "Cargo.toml may contain [workspace] for monorepos. Check members field."
    },
    {
      "id": "go",
      "humanName": "Go",
      "manifestFiles": ["go.mod"],
      "keyConfigFiles": [
        "go.sum",
        ".golangci.yml",
        ".golangci.yaml",
        "Makefile"
      ],
      "entryPointHints": ["main.go", "cmd/main.go", "cmd/*/main.go"],
      "workspaceIndicators": ["go.work"],
      "notes": "go.work indicates a Go workspace (multi-module monorepo)."
    },
    {
      "id": "nodejs",
      "humanName": "Node.js / JavaScript",
      "manifestFiles": ["package.json"],
      "keyConfigFiles": [
        "tsconfig.json",
        "tsconfig.base.json",
        ".eslintrc",
        ".eslintrc.js",
        ".eslintrc.json",
        ".eslintrc.cjs",
        ".eslintrc.yaml",
        ".eslintrc.yml",
        "eslint.config.js",
        "eslint.config.mjs",
        "prettier.config.js",
        ".prettierrc",
        ".prettierrc.json",
        ".prettierrc.yaml",
        "jest.config.js",
        "jest.config.ts",
        "vitest.config.ts",
        "vitest.config.js",
        "vite.config.ts",
        "vite.config.js",
        "next.config.js",
        "next.config.ts",
        "next.config.mjs",
        "nuxt.config.ts",
        "svelte.config.js",
        "astro.config.mjs",
        "webpack.config.js",
        "rollup.config.js",
        "esbuild.config.js",
        ".babelrc",
        "babel.config.js"
      ],
      "entryPointHints": [
        "src/index.ts",
        "src/index.js",
        "src/main.ts",
        "src/main.js",
        "index.ts",
        "index.js",
        "app.ts",
        "app.js",
        "server.ts",
        "server.js"
      ],
      "workspaceIndicators": [
        "pnpm-workspace.yaml",
        "lerna.json",
        "nx.json",
        "turbo.json",
        "packages/",
        "apps/"
      ],
      "notes": "tsconfig.json presence indicates TypeScript. Framework detection (React/Vue/Next/etc.) is done by reading package.json dependencies, not by additional manifest files."
    },
    {
      "id": "python",
      "humanName": "Python",
      "manifestFiles": [
        "pyproject.toml",
        "setup.py",
        "setup.cfg",
        "requirements.txt"
      ],
      "keyConfigFiles": [
        "requirements-dev.txt",
        "requirements-test.txt",
        "constraints.txt",
        "tox.ini",
        "pytest.ini",
        ".flake8",
        "mypy.ini",
        ".mypy.ini",
        "pyproject.toml",
        "ruff.toml",
        ".ruff.toml",
        "Pipfile",
        "poetry.lock",
        "uv.lock",
        "conda.yaml",
        "environment.yml"
      ],
      "entryPointHints": [
        "main.py",
        "app.py",
        "run.py",
        "manage.py",
        "src/main.py",
        "src/app.py",
        "__main__.py"
      ],
      "workspaceIndicators": ["packages/", "libs/", "services/"],
      "notes": "pyproject.toml is the modern standard (PEP 518/621). setup.py and requirements.txt are legacy. Multiple manifest files may coexist in the same project."
    },
    {
      "id": "java",
      "humanName": "Java / JVM",
      "manifestFiles": ["pom.xml", "build.gradle", "build.gradle.kts"],
      "keyConfigFiles": [
        "settings.gradle",
        "settings.gradle.kts",
        "gradle.properties",
        "gradlew",
        ".mvn/wrapper/maven-wrapper.properties",
        "checkstyle.xml",
        "spotbugs.xml",
        "application.properties",
        "application.yml"
      ],
      "entryPointHints": [
        "src/main/java/**/*Application.java",
        "src/main/java/**/Main.java",
        "src/main/kotlin/**/*Application.kt"
      ],
      "workspaceIndicators": ["settings.gradle", "settings.gradle.kts"],
      "notes": "pom.xml = Maven; build.gradle(.kts) = Gradle. Kotlin detection: look for .kt files and kotlin plugin in the build file. Spring Boot: spring-boot-starter in dependencies."
    },
    {
      "id": "ruby",
      "humanName": "Ruby",
      "manifestFiles": ["Gemfile"],
      "keyConfigFiles": [
        "Gemfile.lock",
        ".ruby-version",
        ".rubocop.yml",
        "Rakefile",
        "config/application.rb",
        "config/routes.rb"
      ],
      "entryPointHints": [
        "app/controllers/application_controller.rb",
        "config.ru",
        "bin/rails",
        "app.rb"
      ],
      "workspaceIndicators": [],
      "notes": "Gemfile presence is definitive. config/application.rb confirms Rails."
    },
    {
      "id": "php",
      "humanName": "PHP",
      "manifestFiles": ["composer.json"],
      "keyConfigFiles": [
        "composer.lock",
        "phpunit.xml",
        "phpunit.xml.dist",
        "phpcs.xml",
        ".php-cs-fixer.php",
        "phpstan.neon",
        "psalm.xml",
        "artisan",
        "webpack.mix.js",
        "vite.config.js"
      ],
      "entryPointHints": [
        "public/index.php",
        "index.php",
        "bootstrap/app.php",
        "src/index.php"
      ],
      "workspaceIndicators": [],
      "notes": "artisan file confirms Laravel. composer.json with symfony/* dependencies confirms Symfony."
    },
    {
      "id": "dotnet",
      "humanName": ".NET / C#",
      "manifestFiles": ["*.csproj", "*.fsproj", "*.vbproj", "global.json"],
      "manifestFilesAreGlobs": true,
      "keyConfigFiles": [
        "Directory.Build.props",
        "Directory.Build.targets",
        "NuGet.Config",
        "nuget.config",
        ".editorconfig",
        "appsettings.json",
        "appsettings.Development.json",
        "launchSettings.json"
      ],
      "entryPointHints": [
        "Program.cs",
        "Startup.cs",
        "src/**/Program.cs"
      ],
      "workspaceIndicators": ["*.sln"],
      "notes": "*.csproj glob requires the slash command to use file-extension matching, not exact filename. *.sln indicates a Visual Studio solution with multiple projects."
    },
    {
      "id": "swift",
      "humanName": "Swift / Apple Platforms",
      "manifestFiles": ["Package.swift"],
      "keyConfigFiles": [
        "Package.resolved",
        ".swiftformat",
        ".swiftlint.yml",
        "Podfile",
        "Cartfile",
        "project.pbxproj"
      ],
      "entryPointHints": [
        "Sources/**/main.swift",
        "Sources/**/*App.swift",
        "Sources/**/*Application.swift"
      ],
      "workspaceIndicators": [],
      "notes": "Package.swift = Swift Package Manager. Podfile = CocoaPods (often alongside Xcode project). project.pbxproj inside *.xcodeproj indicates an Xcode project without SPM."
    },
    {
      "id": "unknown",
      "humanName": "Unknown",
      "manifestFiles": [],
      "keyConfigFiles": [
        "Makefile",
        "makefile",
        "GNUmakefile",
        "CMakeLists.txt",
        "meson.build",
        "BUILD",
        "BUILD.bazel",
        "WORKSPACE",
        "Dockerfile",
        "docker-compose.yml",
        "docker-compose.yaml"
      ],
      "entryPointHints": [],
      "workspaceIndicators": [],
      "notes": "Fallback when no known manifest is found. The SlashCommand should infer the stack from file extensions present in the repository (e.g. majority .c files suggests C, majority .sh files suggests shell scripting) and describe it in the analysis with appropriate uncertainty language."
    }
  ]
}
```

> Note: the schema's `minItems` constraint on `manifestFiles` was dropped (resolution to open question 2 below). Empty `manifestFiles` is permitted at the schema level and is reserved for the `unknown` fallback entry. The SlashCommand prompt enforces non-emptiness for every named stack at runtime.

## Consumer Access Patterns

### SlashCommand reads the rules to guide project scanning

- **Reader**: SlashCommand (`commands/under-the-hood.md`)
- **How**: The slash command prompt references `schema/stack-detection.json` by path and instructs Claude to read it at the start of the analysis. Claude iterates the `stacks` array in order, checking for manifest files in the project directory.
- **Behavior**: First manifest match sets `detectedStack` in the analysis output. All manifest matches contribute `tech_stack.entries`. After identifying the stack, Claude prioritizes reading `keyConfigFiles` and checks `entryPointHints` for entry-point discovery.
- **Edge cases**:
  - No manifest matches: use the `unknown` entry; infer stack from file extensions; use uncertainty language in all narrative fields.
  - Multiple manifests match (monorepo with Node.js + Python subdirectories): collect all matching stacks; set `detectedStack` to joined string (e.g. `"Node.js / JavaScript + Python"`); include all detected technologies in `tech_stack.entries`.
  - `workspaceIndicators` present: scan immediate subdirectories (one level deep) for additional manifests before concluding detection.
  - `keyConfigFiles` listed but not present in project: skip silently; do not error.
  - `entryPointHints` contain glob patterns (e.g. `src/index.*`): Claude expands these with case-insensitive extension matching (.ts, .js, .tsx, .jsx).
  - `dotnet` stack uses `*.csproj` glob in `manifestFiles`: the slash command must use file-extension scanning, not exact filename matching, for this stack only.
  - Rules file missing or unreadable at runtime: slash command falls back to built-in inline rules (a minimal subset hardcoded in the prompt) and notes the degradation in the analysis.

### LauncherScript does not read StackDetectionRules

- **Reader**: N/A
- **How**: The launcher only processes the already-analyzed JSON. Stack detection is complete by the time the launcher runs.
- **Behavior**: No access.
- **Edge cases**: N/A.

### InteractiveJS does not read StackDetectionRules

- **Reader**: N/A
- **How**: The rendered analysis JSON already contains `detectedStack` (a string) and `tech_stack.entries`. The rules file is an input to analysis, not to rendering.
- **Behavior**: No access.
- **Edge cases**: N/A.

## Domain Model

```typescript
// The shape of schema/stack-detection.json
interface StackDetectionRulesFile {
  $schemaVersion: 1;
  stacks: StackRule[];   // ordered; "unknown" must be last
}

interface StackRule {
  id: string;                     // kebab-case, e.g. "nodejs", "python"
  humanName: string;              // display name, e.g. "Node.js / JavaScript"
  manifestFiles: string[];        // exact filenames (except dotnet globs); minItems: 1 for named stacks, [] for "unknown"
  keyConfigFiles: string[];       // secondary files to read after manifest match; may be []
  entryPointHints: string[];      // relative paths or glob-like patterns; may be []
  workspaceIndicators?: string[]; // optional: files/dirs that signal a monorepo
  notes?: string;                 // optional: developer commentary; not used by slash command
}

// Derived types produced by the SlashCommand's detection logic (not in the JSON file itself — these live in the slash command's reasoning)

interface DetectionResult {
  primaryStack: StackRule | null;   // null only if "unknown" is the best match
  allMatches: StackRule[];          // every stack whose manifestFiles were found
  isMonorepo: boolean;
  detectedStackLabel: string;       // e.g. "Node.js / JavaScript + Python" or "Unknown"
  manifestsFound: string[];         // actual filenames found during scanning
  keyConfigFilesFound: string[];    // subset of keyConfigFiles actually present
  entryPointsFound: string[];       // subset of entryPointHints actually found
}
```

## Distribution

- **Format**: JSON file shipped statically with the plugin; no server, no browser fetch
- **Path in plugin**: `schema/stack-detection.json`
- **Versioning**: `$schemaVersion: 1` (const). Adding a new stack entry is a non-breaking additive change; changing the shape of an existing entry (e.g. renaming `manifestFiles` to `manifests`) is breaking and requires incrementing the version. The slash command prompt should check `$schemaVersion` and warn if it encounters an unexpected value.
- **Cache strategy**: N/A — static file, read once per slash command invocation. No caching required.

## Dependencies

None. (Layer 1 components have no dependencies on other components.)

## Test Requirements

- [ ] `schema/stack-detection.json` is valid JSON (no parse error)
- [ ] `schema/stack-detection.json` validates against the schema (with the `unknown` exemption applied)
- [ ] Every named stack entry (non-unknown) has at least one `manifestFiles` entry
- [ ] The `unknown` entry is the last item in the `stacks` array
- [ ] Every `id` is unique across all entries
- [ ] Every `id` matches the pattern `^[a-z][a-z0-9-]*$`
- [ ] These stacks are present by id: `nodejs`, `python`, `rust`, `go`, `flutter`, `java`, `ruby`, `php`, `dotnet`, `swift`, `unknown`
- [ ] No `manifestFiles` value appears in more than one named stack entry (uniqueness of detection signals)
- [ ] `package.json` appears only in the `nodejs` entry
- [ ] `pubspec.yaml` appears only in the `flutter` entry
- [ ] `Cargo.toml` appears only in the `rust` entry
- [ ] `go.mod` appears only in the `go` entry
- [ ] `pyproject.toml` appears in the `python` entry and is the first item (highest priority manifest)
- [ ] `Gemfile` appears only in the `ruby` entry
- [ ] `composer.json` appears only in the `php` entry
- [ ] `Package.swift` appears only in the `swift` entry
- [ ] `pom.xml` appears only in the `java` entry
- [ ] Smoke test: SlashCommand run against a Node.js fixture project detects `nodejs` and sets `detectedStack: "Node.js / JavaScript"`
- [ ] Smoke test: SlashCommand run against a Python fixture project detects `python` and sets `detectedStack: "Python"`
- [ ] Smoke test: SlashCommand run against a Rust fixture project detects `rust` and sets `detectedStack: "Rust"`
- [ ] Smoke test: SlashCommand run against a project with no manifest detects `unknown` and sets `detectedStack: "Unknown"`
- [ ] Smoke test: SlashCommand run against a monorepo with `package.json` + `pyproject.toml` sets `detectedStack: "Node.js / JavaScript + Python"` (or similar joined form)

## Resolved Decisions (was Open Questions)

1. **Glob support in `manifestFiles`** — *Resolved*: added explicit `manifestFilesAreGlobs: boolean` (default `false`) per rule. The `dotnet` entry sets it to `true`. The SlashCommand uses glob matching only when this flag is set.

2. **`unknown` stack with empty `manifestFiles`** — *Resolved*: dropped `minItems` at the schema level. The SlashCommand prompt enforces non-emptiness for every named stack at runtime; the `unknown` fallback is the sole exemption.

3. **Detection priority and conflict / multi-stack monorepos** — *Resolved*: SlashCommand caps `detectedStack` at the top 3 stacks (by manifest depth/file count). When more than 3 stacks are matched, the label is `"<a> + <b> + <c> + others"`. All matched stacks still appear in `tech_stack.entries`.

4. **Language variants (TypeScript vs JavaScript)** — *Resolved*: kept implicit. SlashCommand prompt documents the convention: when `tsconfig.json` is present in `keyConfigFiles`, upgrade the `humanName` reported to `"Node.js / TypeScript"` for the analysis output. No schema change.

5. **Framework sub-detection (React, Vue, Django, etc.)** — *Resolved (no change)*: framework detection stays in the SlashCommand prompt by reading manifest dependencies; rules file remains stack-level only. Two-phase approach is documented in SlashCommand contract.

6. **Workspace scan depth** — *Resolved*: SlashCommand caps subdirectory scan at one level deep, max 20 subdirectory manifests. Documented in SlashCommand contract.

## Open Questions

(none remaining)
