#!/bin/bash
# Hook: PostToolUse — regenerate app-map.md when source files change.
# Only runs after Write, Edit, or Bash tools that affect source files.
# Debounced: skips if app-map was regenerated less than 5 seconds ago.

INPUT=$(cat)

# Extract tool name and file path from stdin JSON
TOOL=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)

# Only trigger on source file changes
IS_SOURCE=false
case "$TOOL" in
  Write|Edit)
    # Check if the file is a source file (not generated, not framework)
    case "$FILE_PATH" in
      */lib/*.dart|*/src/*.ts|*/src/*.tsx|*/src/*.js|*/src/*.jsx|*/src/*.py)
        IS_SOURCE=true ;;
    esac
    ;;
  Bash)
    # Check if bash command creates/moves/removes source files
    case "$COMMAND" in
      *mv*lib/*|*mv*src/*|*rm*lib/*|*rm*src/*|*mkdir*lib/*|*mkdir*src/*)
        IS_SOURCE=true ;;
    esac
    ;;
esac

if [ "$IS_SOURCE" != "true" ]; then
  exit 0
fi

# Debounce: skip if regenerated less than 5 seconds ago
APP_MAP=""
if [ -f ".framework/app-map.md" ]; then
  APP_MAP=".framework/app-map.md"
elif [ -f "app-map.md" ]; then
  APP_MAP="app-map.md"
fi

if [ -n "$APP_MAP" ]; then
  LAST_MOD=$(stat -f %m "$APP_MAP" 2>/dev/null || stat -c %Y "$APP_MAP" 2>/dev/null)
  NOW=$(date +%s)
  DIFF=$((NOW - LAST_MOD))
  if [ "$DIFF" -lt 5 ]; then
    exit 0
  fi
fi

# Regenerate in background (don't block the tool call)
python3 ~/.claude/frameworks/trellis/generate-app-map.py . > /dev/null 2>&1 &

exit 0
