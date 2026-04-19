#!/bin/bash
# Hook: Notification chimes for Claude Code events.
# Plays different sounds for different events.
#
# Requires macOS `afplay` (built-in).

EVENT=$(python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('hook_event_name',''))" 2>/dev/null || echo "")

# macOS system sounds
CHIME_PERMISSION="/System/Library/Sounds/Funk.aiff"      # waiting for permission
CHIME_DONE="/System/Library/Sounds/Glass.aiff"           # turn complete
CHIME_AGENT="/System/Library/Sounds/Purr.aiff"           # agent finished

case "$EVENT" in
  PreToolUse)
    # This fires before permission prompt — play permission chime
    afplay "$CHIME_PERMISSION" &
    ;;
  Notification)
    # Agent completion notification
    afplay "$CHIME_AGENT" &
    ;;
  Stop)
    # Turn finished, waiting for user input
    afplay "$CHIME_DONE" &
    ;;
esac

exit 0
