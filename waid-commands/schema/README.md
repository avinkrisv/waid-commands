# Schema Files

Static JSON files read by the SlashCommand at run time to guide project analysis
and validate Claude's output. Do not modify these files directly — changes are
a contract change and must go through the Trellis Phase 7 process.

---

## analysis.schema.json

Defines the canonical shape of the `ProjectAnalysis` JSON document that Claude
must emit when the `/under-the-hood` command runs.

**Top-level structure:**

```
ProjectAnalysis
├── $schemaVersion        integer, const 1
├── projectName           string
├── generatedAt           string (ISO-8601 UTC)
├── detectedStack         string (humanName from StackDetectionRules, or "Unknown")
├── overview              DualSection { technical, layman }
├── tech_stack
│   ├── technical         string
│   ├── layman            string
│   └── entries[]         { name, role, version }  (minItems: 1)
├── architecture
│   ├── technical         string
│   ├── layman            string
│   └── mermaid           string (Mermaid source, or "" when unavailable)
├── algorithms
│   ├── technical         string
│   ├── layman            string
│   └── entries[]         { name, technical, layman }  (may be empty)
├── methodologies
│   ├── technical         string
│   ├── layman            string
│   └── entries[]         { name, technical, layman }
├── pattern_rationale
│   ├── technical         string
│   ├── layman            string
│   └── entries[]         { pattern, rationale_technical, rationale_layman }
├── pitfalls
│   ├── technical         string
│   ├── layman            string
│   └── entries[]         { title, severity, technical, layman }  (minItems: 1)
│       severity enum: "low" | "medium" | "high"
├── glossary[]            { term, layman, technical? }  (may be empty)
└── quiz[]                { question, choices[2-6], answerIndex, explanation_layman,
                            explanation_technical }  (may be empty)
```

Every section except `overview` includes both `technical` (power-user) and
`layman` (plain-English) text so the HTML report can switch views without a
network round-trip. `additionalProperties: false` is set throughout.

---

## stack-detection.json

An ordered list of stack detection rules. The SlashCommand iterates these in
order, matching manifest files found in the project. The first full match sets
`detectedStack`; all matches contribute to `tech_stack.entries`.

**Supported stacks (in detection priority order):**

| id       | humanName                 |
|----------|---------------------------|
| flutter  | Flutter / Dart            |
| rust     | Rust                      |
| go       | Go                        |
| nodejs   | Node.js / JavaScript      |
| python   | Python                    |
| java     | Java / JVM                |
| ruby     | Ruby                      |
| php      | PHP                       |
| dotnet   | .NET / C#                 |
| swift    | Swift / Apple Platforms   |
| unknown  | Unknown                   |

The `unknown` entry is always last. It has an empty `manifestFiles` array and
serves as the fallback when no other manifest is found.

The `dotnet` entry sets `"manifestFilesAreGlobs": true` because its manifest
filenames are glob patterns (`*.csproj`, `*.fsproj`, `*.vbproj`).

---

## Versioning policy

Both files carry `"$schemaVersion": 1` at the top level.

- **Do not increment** for purely additive changes (new optional fields, new
  stack entries with the same rule shape).
- **Increment** when the shape of an existing field changes in a
  backward-incompatible way (rename, type change, removal).
- The HTML renderer displays a warning banner when the embedded analysis JSON
  carries a `$schemaVersion` that does not equal 1.

---

## Important

These files are read by the SlashCommand at run time and must not be modified
by end users. Edits require a corresponding contract update in
`.framework/contracts/data/` and a Phase 7 refinement cycle.
