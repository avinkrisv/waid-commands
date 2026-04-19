#!/bin/bash
# Hook: PreToolUse/Bash — enforce user approval before closing Trellis mode.
#
# Blocks `rm` of .framework/flags/trellis-mode unless .framework/flags/mode-approved
# exists on disk at the moment the Bash call starts.
#
# Because PreToolUse fires BEFORE the Bash command runs, an agent cannot satisfy
# this check by inlining `touch mode-approved && rm trellis-mode` in one call.
# The approval flag must be created in a prior, separate Bash call — which
# creates a durable checkpoint representing explicit user approval.

INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)

# Only care about commands that remove the mode file
if ! echo "$CMD" | grep -qE 'rm(\s+-[a-zA-Z]+)?\s+\.framework/flags/trellis-mode'; then
  exit 0
fi

# Require the approval flag to already exist
if [ ! -f ".framework/flags/mode-approved" ]; then
  cat >&2 <<'EOF'
BLOCKED: Cannot close Trellis mode without user approval.

Required flow:
  1. Report completion to the user and ask: "Close mode? (yes/no)"
  2. Wait for explicit user confirmation.
  3. Create the approval flag in a SEPARATE Bash call:
       touch .framework/flags/mode-approved
  4. THEN run the closure:
       rm -f .framework/flags/trellis-mode
       rm -f .framework/flags/mode-approved

Inlining touch + rm in the same command will NOT work — the approval flag
must exist on disk before this hook fires.
EOF
  exit 2
fi

exit 0
