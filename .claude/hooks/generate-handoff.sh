#!/bin/bash
# Hook: SessionStart — extract handoff from previous session log.
# Generates session-handoff.md so the new session has context.

CWD=$(python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null < /dev/stdin || pwd)
PROJECT_DIR="${CWD:-$(pwd)}"

# Only run if this is a Trellis project
if [ -f "$PROJECT_DIR/.framework/progress.md" ] || [ -f "$PROJECT_DIR/progress.md" ]; then
  python3 ~/.claude/frameworks/trellis/extract-handoff.py "$PROJECT_DIR" > /dev/null 2>&1
  python3 ~/.claude/frameworks/trellis/extract-pending-sessions.py "$PROJECT_DIR" > /dev/null 2>&1
fi

exit 0
