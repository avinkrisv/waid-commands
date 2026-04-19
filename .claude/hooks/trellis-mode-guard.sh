#!/bin/bash
# Hook: PreToolUse — enforce Trellis mode rules.
# When a mode file exists (.framework/flags/trellis-mode), inject reminders about active rules.
#
# .framework/flags/trellis-mode contains the active mode (feature, fix, enhance) and its rules.
# This hook checks if the orchestrator is about to violate delegation rules.

INPUT=$(cat)
TOOL=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)

# Check if a mode is active
MODE_FILE=".framework/flags/trellis-mode"
# Legacy fallback for projects that haven't migrated yet
[ ! -f "$MODE_FILE" ] && [ -f ".trellis-mode" ] && MODE_FILE=".trellis-mode"
if [ ! -f "$MODE_FILE" ]; then
  exit 0
fi

HEADER=$(head -1 "$MODE_FILE" 2>/dev/null)
# Extract the mode name from "P7 - FEATURE - short desc" or legacy bare "feature"
MODE=$(echo "$HEADER" | awk -F ' - ' '/^P[0-9]+ - / {print tolower($2); next} {print tolower($0)}')
FILE_COUNT=$(grep "^files:" "$MODE_FILE" 2>/dev/null | cut -d: -f2 | tr -d ' ')

# If in feature/fix/enhance mode with 2+ files, warn on Write/Edit
if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ]; then
  if [ -n "$FILE_COUNT" ] && [ "$FILE_COUNT" -ge 2 ]; then
    DELEGATED=$(grep "^delegated:" "$MODE_FILE" 2>/dev/null | cut -d: -f2 | tr -d ' ')
    if [ "$DELEGATED" != "true" ]; then
      echo "WARNING: Trellis mode '$MODE' is active with $FILE_COUNT files. You should delegate to a Sonnet agent, not write directly. Set delegated:true in .framework/flags/trellis-mode if you've dispatched an agent." >&2
    fi
  fi
fi

exit 0
