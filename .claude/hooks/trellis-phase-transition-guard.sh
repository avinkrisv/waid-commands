#!/bin/bash
# Hook: PreToolUse/Bash — block accidental phase regressions.
#
# Prevents re-initializing state.json back to Launch or Discover over a project
# that's already in Refine. Rationale: running /trellis-launch or /trellis-discover
# a second time would overwrite the phase, reset phase_entered_at, and potentially
# clobber a hand-curated app-map/features.md as downstream steps run.
#
# If the user genuinely wants to start over, they can either:
#   - Delete .framework/state.json manually, or
#   - Use /trellis-upgrade (for v1 migrations), or
#   - Call `state.py phase . launch` directly (explicit override)
#
# The guard fires on `state.py init` calls specifically — the entry point for
# a fresh state. It does NOT block `state.py phase` (explicit transitions are
# fine).

INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)

# Only care about state.py init calls
if ! echo "$CMD" | grep -qE 'state\.py\s+init\b'; then
  exit 0
fi

# No existing state.json → fresh init is fine
STATE_FILE=".framework/state.json"
if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

# Read current phase
CURRENT_PHASE=$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('phase',''))" 2>/dev/null)

# Block only if we're in refine and someone is trying to re-init
if [ "$CURRENT_PHASE" = "refine" ]; then
  cat >&2 <<EOF
BLOCKED: Project is in Refine phase. Re-running a fresh \`state.py init\` would
reset phase_entered_at and origin, and downstream /trellis-discover or /trellis-launch
steps would overwrite the existing app-map.md / features.md.

If you want to:
  - Start a refinement: use /trellis-fix, /trellis-feature, or /trellis-enhance
  - Genuinely restart: remove .framework/state.json manually, THEN re-init
  - Change a single field: use \`state.py set\` or \`state.py phase\`
EOF
  exit 2
fi

exit 0
