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
