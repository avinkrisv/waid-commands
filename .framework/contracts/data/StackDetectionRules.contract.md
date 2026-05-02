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
