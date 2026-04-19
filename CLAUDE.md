claude# Trellis

This is a UI application built with the Trellis framework.
Components are built by layer (data, UI, logic, theme), tested in isolation,
then assembled into screens using a typed manifest.

```
Phase 1: Decomposition → Phase 2: Contracts → Phase 3: Skeleton
                                                      │
Phase 7: Refinement ← Phase 6: Polish ← Phase 5: Assembly ← Phase 4: Parallel Build
     ↺ (repeats)
```

## Current Phase

Read `progress.md` to determine the current phase. Check `.framework/progress.md` first; if not found, check `progress.md` at project root (legacy layout). If neither exists, we are in Phase 0 (project not yet started — begin with Phase 1).

## Path Resolution

This framework supports two directory layouts. **Check once at session start** which layout the project uses, then use those paths throughout:

| | New layout (`.framework/`) | Legacy layout (project root) |
|--|---|---|
| **Detect** | `.framework/framework/` exists | `framework/` exists at root |
| Phase files | `.framework/framework/phase*.md` | `framework/phase*.md` |
| Templates | `.framework/templates/` | `templates/` |
| Contracts | `.framework/contracts/` | `contracts/` |
| Plan | `.framework/plan.md` | `plan.md` |
| Progress | `.framework/progress.md` | `progress.md` |
| Manifest | `.framework/assembly_manifest.yaml` | `assembly_manifest.yaml` |
| App Map | `.framework/app-map.md` | `app-map.md` |

**Do NOT try `.framework/` paths repeatedly if the first check shows they don't exist.** Detect once, use the correct prefix for the rest of the session.

## Phase Execution

For each phase, read the corresponding instruction file before starting work:

| Phase | Instruction File | Trigger |
|-------|-----------------|---------|
| 1: Decomposition | `{fw}/framework/phase1-decomposition.md` | No `progress.md` exists |
| 2: Contracts | `{fw}/framework/phase2-contracts.md` | Phase 1 complete |
| 3: Skeleton | `{fw}/framework/phase3-skeleton.md` | Phase 2 complete |
| 4: Parallel Build | `{fw}/framework/phase4-parallel-build.md` | Phase 3 complete |
| 5: Assembly | `{fw}/framework/phase5-assembly.md` | Phase 4 complete |
| 6: Polish | `{fw}/framework/phase6-polish.md` | Phase 5 complete |
| 7: Refinement | `{fw}/framework/phase7-refinement.md` | Phase 6 complete (repeats) |

Where `{fw}` is `.framework` (new) or `.` (legacy). Always read the phase instruction file FIRST, then execute.

## Directory Structure

Framework and planning files are kept **separate** from the application codebase:

```
project-root/
├── .framework/              # ALL framework & planning files live here
│   ├── framework/           # Phase instruction files (1-7)
│   ├── templates/           # Contract templates, plan structure, agent prompts
│   ├── contracts/           # Generated in Phase 2, one file per component
│   ├── plan.md              # Project plan
│   ├── plan-index.md        # Auto-generated section index for plan.md
│   ├── progress.md          # Phase progress tracking
│   ├── assembly_manifest.yaml  # Generated in Phase 3
│   └── trellis-framework.md  # Full methodology reference
├── src/                     # Application code ONLY — no framework files here
├── CLAUDE.md                # Project instructions (stays at root)
└── ...
```

**Never mix framework files with application code.** The `.framework/` directory contains everything related to the development methodology. The `src/` directory (or equivalent) contains only the application being built.

## Active Mode

If `.framework/flags/trellis-mode` exists, a Phase 7 Refinement workflow is in progress. **Read it before doing anything.**

The file's first line uses the format: `P<phase> - <MODE> - <short description>` — for example:
- `P7 - FIX - login button unresponsive on iOS`
- `P7 - FEATURE - add dark mode toggle`
- `P7 - ENHANCE - debounce search input`

Subsequent lines carry metadata: `status:` (design/building), `files:` (count), `delegated:` (true/false).

**While a mode is active, follow its rules regardless of how the user phrases their request.** "Continue", "keep going", "fix that error" — all must follow the active mode's delegation and completion rules. The mode ends when `.framework/flags/trellis-mode` is deleted.

**Closing a mode requires explicit user approval.** Never `rm` the mode file on your own. The flow is:
1. Report completion and ask the user to approve closure.
2. After the user confirms, `touch .framework/flags/mode-approved` in one Bash call.
3. In a separate Bash call, remove both flag files.

A `PreToolUse` hook (`trellis-mode-closure-guard.sh`) enforces this — attempts to `rm` the mode file without the approval flag on disk will be blocked. All framework flag files live under `.framework/flags/`.

## Key Rules

1. **Never skip phases.** Each phase has a defined completion gate in its instruction file.
2. **Components communicate through contracts only** — never through implementation.
3. **Layer 1 (Data) and Layer 2 (UI) have ZERO cross-dependencies.**
4. **Layer 3 (Logic) depends on Layer 1 only.**
5. **Parallel agents work in git worktrees** — never on the main branch simultaneously.
6. **Only the assembler (Phase 5) touches screen files and wiring.**
7. **Update `progress.md`** after completing each phase or significant milestone.
8. **Framework files live in `.framework/`** — never in the application source tree.
9. **Never regenerate what exists on disk.** Before creating a file, check if it already exists. Use Edit for existing files, `cp`/`mv` for reorganising. Re-creating content wastes tokens and risks drift.
10. **Git checkpoint before significant changes.** Before starting a phase, dispatching agents, or making multi-file edits: `git add -A && git commit -m "checkpoint: before {description}"`. This creates a rollback point if things go wrong.

## Model Strategy

Use the right model for each task. See `.framework/templates/model-strategy.md` for full details.

| Task Type | Model | Rationale |
|-----------|-------|-----------|
| Planning, contracts, assembly | **Opus** | Requires architectural reasoning |
| Component building, skeletons | **Sonnet** | Good code gen, balanced cost/speed |
| Theme tokens, validation, file ops | **Haiku** | Fast, cheap, mechanical tasks |

When dispatching agents, set the `model` parameter:
```
Agent tool:
  model: "sonnet"    # or "haiku" for theme/validation agents
  prompt: ...
```

## Agent Dispatch Pattern (Phase 4)

Agents read contracts from bundle files (`.framework/contracts/contracts-{layer}.bundle.md`).
See `.framework/framework/phase4-parallel-build.md` for the complete dispatch protocol.

**Always dispatch agents with `run_in_background: true`** so their logs are persisted to `.agent-logs/`. For Phase 4, also try `isolation: "worktree"` — if worktree fails, keep `run_in_background: true` but drop isolation. See the phase file for details.

## Progress Tracking & Session Continuity

- **`.framework/progress.md`** — persistent record across sessions (source of truth for current phase)
- **TaskCreate/TaskUpdate** — in-session tracking during long phases
- Update `progress.md` at every phase gate and after each tier completion in Phase 4

### Session Handoff

When a session ends (user says stop, usage limits hit, or phase completes), **always update the `## Session Handoff` section in `.framework/progress.md`** with:

```markdown
## Session Handoff
last_session: {date and time}
last_action: {what was just completed}
next_steps:
  - {concrete step 1 — e.g., "Run build_runner to generate .g.dart and .freezed.dart files"}
  - {concrete step 2 — e.g., "Fix 3 null safety errors in vault_dao.dart lines 45, 89, 112"}
  - {concrete step 3}
pending_issues:
  - {known error or incomplete work — e.g., "flutter analyze shows 12 real errors after filtering codegen"}
agent_logs: .agent-logs/{list of log files from this session}
```

### Updating Working Memory

Use `/trellis-save` to save the current session to working memory at any time. Before ending a meaningful session, remind the user to run `/trellis-save` if they haven't already.

The assessment criteria for whether a session belongs in working memory:

**A session IS meaningful if any of:**
- Files were created, edited, or deleted
- A phase gate was reached or phase transitioned
- Architectural decisions were made
- Bugs were diagnosed and fixed
- Tests were written or build issues resolved

**A session is NOT meaningful if:**
- User only asked questions without requesting changes
- Session was a quick status check
- Only read operations occurred (no writes, edits, or commits)
- Session was abandoned after fewer than 2 substantive exchanges

**If meaningful**, append an entry to `working-memory.md` (before the first existing `### S` entry):

```
### S{next_number} | {date}T{time} | {STATUS}
**Goal**: {what the user wanted to accomplish}
**Summary**: {2-3 sentences: what was done, key changes, outcome}
**Key decisions**: {any architectural or design decisions made, or "None"}
**Files**: {comma-separated list of key files changed}
**Log**: {full path to session JSONL file — copy from pending-sessions.md or use current session path}
```

The **Log** path lets any future session drill into the full conversation if the summary isn't enough context. The LLM can `Read` the JSONL to recover details.

Where STATUS is: DONE (committed), PARTIAL (work done, not fully committed), BLOCKED (hit errors), INTERRUPTED (mid-workflow).

Also update the `## Project State` header (phase, timestamp, session count).

**If not meaningful**, do nothing — do not add an entry.

**Compaction**: If `## Sessions` has more than 20 entries, move the oldest entries to `## Condensed History` as one-liners (`- S{n} | {date} | {goal_summary} | {STATUS} | log: {filename}.jsonl`). Always preserve the log filename — it's the only way to recover full detail later. If condensed has more than 15 lines, merge the oldest into `## Archive` as a prose paragraph (log filenames can be dropped at this tier — the detail is too old to be useful).

### Resuming in a New Session

A `SessionStart` hook extracts context from previous sessions. When starting:

1. Read `working-memory.md` — cumulative history of all past sessions
2. **If `pending-sessions.md` exists**: it contains raw data from sessions that weren't recorded in working-memory.md (e.g., interrupted sessions). Assess each pending session against the criteria above. Add meaningful ones to working-memory.md, then delete pending-sessions.md.
3. Read `session-handoff.md` — detailed tactical context from the last session
4. Read `progress.md` — check Current Phase and Session Handoff section
5. Read the phase instruction file for the current/next phase
6. Follow the `next_steps` from progress.md
7. Check `pending_issues`
