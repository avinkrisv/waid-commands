#!/bin/bash
# Hook: SubagentStop — automatically copy agent output to .agent-logs/
# Receives JSON on stdin with agent details.

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('session_id',''))" 2>/dev/null)
TRANSCRIPT=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('transcript_path',''))" 2>/dev/null)
CWD=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null)

# Determine project dir
PROJECT_DIR="${CWD:-$(pwd)}"
LOG_DIR="$PROJECT_DIR/.agent-logs"
mkdir -p "$LOG_DIR"

# Copy the transcript if it exists and is a file
if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
  # Extract agent name from the first line of the transcript (the prompt usually contains it)
  AGENT_NAME=$(head -1 "$TRANSCRIPT" | python3 -c "
import sys,json
try:
    d=json.loads(sys.stdin.read())
    msg=d.get('message',{})
    content=msg.get('content','')
    if isinstance(content,str):
        # Try to extract agent name from prompt
        for line in content.split('\n')[:5]:
            if 'agent_name' in line.lower() or 'component agent' in line.lower():
                name=line.split(':')[-1].strip().strip('#').strip()
                if name: print(name); sys.exit()
        # Fallback: use description from prompt
        import re
        m=re.search(r'description.*?[\":]\\s*[\"]*([^\"\\n]+)', content)
        if m: print(m.group(1).replace(' ','-').lower()); sys.exit()
    print('')
except: print('')
" 2>/dev/null)

  # Fallback name
  if [ -z "$AGENT_NAME" ]; then
    AGENT_NAME="agent-$(date +%H%M%S)"
  fi

  # Sanitize name
  AGENT_NAME=$(echo "$AGENT_NAME" | tr ' /' '-' | tr -cd 'a-zA-Z0-9_-')

  # Copy with dedup
  DEST="$LOG_DIR/${AGENT_NAME}.log"
  if [ -f "$DEST" ]; then
    DEST="$LOG_DIR/${AGENT_NAME}-$(date +%s).log"
  fi

  cp "$TRANSCRIPT" "$DEST" 2>/dev/null
fi

exit 0
