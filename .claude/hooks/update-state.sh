#!/bin/bash
# Hook: PostToolUse — keep .framework/state.json in sync with the mode file.
#
# Fires after any Bash/Write/Edit. If the mode file changed since the last
# observation, update state.json's active_mode field. Cheap no-op when no
# state.json or no mode file is present.

set -e

STATE_FILE=".framework/state.json"
MODE_FILE=".framework/flags/trellis-mode"

if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

# Determine current mode header (if any)
CURRENT_MODE=""
if [ -f "$MODE_FILE" ]; then
  CURRENT_MODE=$(head -1 "$MODE_FILE" | tr -d '\n')
fi

# Update state.json's active_mode field via python for safe JSON handling
python3 - "$STATE_FILE" "$CURRENT_MODE" <<'PY'
import json, sys
state_path, current_mode = sys.argv[1], sys.argv[2]
try:
    with open(state_path) as f:
        state = json.load(f)
except (OSError, json.JSONDecodeError):
    sys.exit(0)

prev = state.get("active_mode", "") or ""
if prev == current_mode:
    sys.exit(0)

if current_mode:
    state["active_mode"] = current_mode
else:
    state.pop("active_mode", None)

with open(state_path, "w") as f:
    json.dump(state, f, indent=2)
    f.write("\n")
PY

exit 0
