#!/usr/bin/env bash
# launch.sh — Inject analysis JSON + CSS + JS into the HTML template and open the result.
#
# Usage: scripts/launch.sh <analysis.json> [--out=PATH] [--no-open] [--template-dir=PATH]
# Flags use --flag=VALUE form only (no space-separated values).
# Requires: python3 >= 3.6 (primary substitution); awk fallback when python3 absent.
#
# Exit codes: 0=success  1=bad args/missing files  2=substitution/write failure
# Browser-open failure is warn-only; script still exits 0.

set -euo pipefail

_usage() {
  echo "Usage: launch.sh <analysis.json> [--out=PATH] [--no-open] [--template-dir=PATH]" >&2
  echo "       python3 >= 3.6 required for template substitution." >&2
}

[ "$#" -eq 0 ] && { _usage; exit 1; }

# --- resolve-args ------------------------------------------------------------

if [[ "$1" == --* ]]; then
  echo "Error: first argument must be the analysis JSON path, not a flag." >&2
  _usage; exit 1
fi

ANALYSIS_JSON="$1"; shift
OUT_PATH=""; NO_OPEN=""; TEMPLATE_DIR_OVERRIDE=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --out=*)           OUT_PATH="${1#--out=}" ;;
    --no-open)         NO_OPEN="1" ;;
    --template-dir=*)  TEMPLATE_DIR_OVERRIDE="${1#--template-dir=}" ;;
    --*)               echo "Unknown option: $1" >&2; _usage; exit 1 ;;
    *)                 echo "Unexpected argument: $1" >&2; _usage; exit 1 ;;
  esac
  shift
done

# --- resolve paths -----------------------------------------------------------

# Script directory (bash 3.2 compatible — no realpath)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Template directory
if [ -n "$TEMPLATE_DIR_OVERRIDE" ]; then
  TEMPLATE_DIR="$TEMPLATE_DIR_OVERRIDE"
else
  TEMPLATE_DIR="$SCRIPT_DIR/../assets"
fi
TEMPLATE_DIR="$( cd "$TEMPLATE_DIR" 2>/dev/null && pwd )" || {
  echo "Error: template directory not found: $TEMPLATE_DIR" >&2; exit 1
}

# Output path
[ -z "$OUT_PATH" ] && OUT_PATH="./under-the-hood.html"

if [ -d "$OUT_PATH" ]; then
  echo "Error: --out path '$OUT_PATH' is a directory. Provide a file path." >&2; exit 1
fi
OUT_PARENT="$( dirname "$OUT_PATH" )"
if [ ! -d "$OUT_PARENT" ]; then
  echo "Error: parent directory of '$OUT_PATH' does not exist." >&2; exit 1
fi

# --- validate-inputs ---------------------------------------------------------

[ ! -f "$ANALYSIS_JSON" ] && { echo "Error: analysis JSON not found: '$ANALYSIS_JSON'." >&2; exit 1; }
[ ! -s "$ANALYSIS_JSON" ] && { echo "Error: analysis JSON is empty: '$ANALYSIS_JSON'."   >&2; exit 1; }

# JSON parse check (skip silently if python3 absent; substitution step will reveal any issue)
if command -v python3 >/dev/null 2>&1; then
  python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$ANALYSIS_JSON" 2>/dev/null || {
    echo "Error: analysis JSON is not valid JSON: '$ANALYSIS_JSON'." >&2; exit 1
  }
fi

TEMPLATE_HTML="$TEMPLATE_DIR/template.html"
TEMPLATE_CSS="$TEMPLATE_DIR/template.css"
TEMPLATE_JS="$TEMPLATE_DIR/template.js"

for f in "$TEMPLATE_HTML" "$TEMPLATE_CSS" "$TEMPLATE_JS"; do
  [ ! -f "$f" ] && { echo "Error: template file not found: '$f'." >&2; exit 1; }
done

grep -qF '__WAID_ANALYSIS_JSON__' "$TEMPLATE_HTML" || {
  echo "Error: template.html does not contain the required placeholder __WAID_ANALYSIS_JSON__." >&2; exit 1
}
for s in '__WAID_TEMPLATE_CSS__' '__WAID_TEMPLATE_JS__' '__WAID_GENERATED_AT__'; do
  grep -qF "$s" "$TEMPLATE_HTML" || \
    echo "Warning: template.html missing placeholder $s — substitution will be a no-op." >&2
done

# --- substitute-and-write ----------------------------------------------------

GENERATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
TMP_OUT="${OUT_PATH}.tmp.$$"
trap 'rm -f "$TMP_OUT"' EXIT

if command -v python3 >/dev/null 2>&1; then
  # Primary method: python3 via env vars (safe against all shell metacharacters).
  export WAID_TEMPLATE="$TEMPLATE_HTML" WAID_JSON="$ANALYSIS_JSON" \
         WAID_CSS="$TEMPLATE_CSS"       WAID_JS="$TEMPLATE_JS" \
         WAID_GENERATED_AT="$GENERATED_AT"

  python3 - <<'PYEOF' > "$TMP_OUT" || { echo "Error: substitution failed — python3 error." >&2; exit 2; }
import sys, os
template = open(os.environ['WAID_TEMPLATE']).read()
json_val = open(os.environ['WAID_JSON']).read().rstrip('\n')
css_val  = open(os.environ['WAID_CSS']).read()
js_val   = open(os.environ['WAID_JS']).read()
ts_val   = os.environ['WAID_GENERATED_AT']
result = (template
    .replace('__WAID_ANALYSIS_JSON__', json_val, 1)
    .replace('__WAID_TEMPLATE_CSS__',  css_val,  1)
    .replace('__WAID_TEMPLATE_JS__',   js_val,   1)
    .replace('__WAID_GENERATED_AT__',  ts_val,   1))
sys.stdout.write(result)
PYEOF

else
  # Fallback: awk — sequential single-pass substitutions.
  # \034 (ASCII File Separator) is safe as a delimiter: cannot appear in JSON/CSS/JS.
  command -v awk >/dev/null 2>&1 || {
    echo "Error: substitution failed — neither python3 nor awk is available." >&2; exit 2
  }

  # _awk_replace sentinel replacement_file input_file output_file
  _awk_replace() {
    awk -v sentinel="$1" -v repfile="$2" '
      BEGIN {
        n=0
        while ((getline line < repfile) > 0) { rep = (n==0 ? line : rep "\n" line); n++ }
        close(repfile); done=0
      }
      {
        if (!done && index($0, sentinel) > 0) {
          p = index($0, sentinel)
          print substr($0,1,p-1) rep substr($0,p+length(sentinel))
          done=1
        } else { print }
      }
    ' "$3" > "$4" || return 1
  }

  T1="${OUT_PATH}.awk1.$$"; T2="${OUT_PATH}.awk2.$$"; T3="${OUT_PATH}.awk3.$$"
  TS_FILE="${OUT_PATH}.ts.$$"
  trap 'rm -f "$TMP_OUT" "$T1" "$T2" "$T3" "$TS_FILE"' EXIT
  printf '%s' "$GENERATED_AT" > "$TS_FILE"

  _awk_replace '__WAID_ANALYSIS_JSON__' "$ANALYSIS_JSON" "$TEMPLATE_HTML" "$T1" || { echo "Error: substitution failed (awk step 1)." >&2; exit 2; }
  _awk_replace '__WAID_TEMPLATE_CSS__'  "$TEMPLATE_CSS"  "$T1"            "$T2" || { echo "Error: substitution failed (awk step 2)." >&2; exit 2; }
  _awk_replace '__WAID_TEMPLATE_JS__'   "$TEMPLATE_JS"   "$T2"            "$T3" || { echo "Error: substitution failed (awk step 3)." >&2; exit 2; }
  _awk_replace '__WAID_GENERATED_AT__'  "$TS_FILE"       "$T3"        "$TMP_OUT" || { echo "Error: substitution failed (awk step 4)." >&2; exit 2; }
fi

# Atomic rename — output file is never partially written
mv "$TMP_OUT" "$OUT_PATH" || { echo "Error: failed to write output file '$OUT_PATH'." >&2; exit 2; }

# Absolute path (bash 3.2 compatible — no realpath)
ABS_OUT="$( cd "$( dirname "$OUT_PATH" )" && pwd )/$( basename "$OUT_PATH" )"

# --- open-browser ------------------------------------------------------------

if [ -z "$NO_OPEN" ]; then
  OPEN_CMD=""
  case "${OSTYPE:-}" in
    darwin*)           OPEN_CMD="open" ;;
    msys*|cygwin*|mingw*) OPEN_CMD="start" ;;
    linux*)
      if [ -n "${WSL_DISTRO_NAME:-}" ] && command -v wslview >/dev/null 2>&1; then
        OPEN_CMD="wslview"
      elif [ -n "${BROWSER:-}" ]; then OPEN_CMD="$BROWSER"
      else OPEN_CMD="xdg-open"; fi ;;
    *)  # OSTYPE empty or unknown — fall back to uname
      case "$(uname -s 2>/dev/null || true)" in
        Darwin)          OPEN_CMD="open" ;;
        MINGW*|MSYS*|CYGWIN*) OPEN_CMD="start" ;;
        Linux)
          if [ -n "${WSL_DISTRO_NAME:-}" ] && command -v wslview >/dev/null 2>&1; then
            OPEN_CMD="wslview"
          elif [ -n "${BROWSER:-}" ]; then OPEN_CMD="$BROWSER"
          else OPEN_CMD="xdg-open"; fi ;;
        *)               OPEN_CMD="xdg-open" ;;
      esac ;;
  esac

  # "start" is a cmd.exe built-in — invoke via cmd.exe directly on Windows/Git Bash
  if [ "$OPEN_CMD" = "start" ]; then
    cmd.exe //c start "" "$ABS_OUT" &>/dev/null & true
  elif command -v "$OPEN_CMD" >/dev/null 2>&1; then
    "$OPEN_CMD" "$ABS_OUT" &
  else
    echo "Warning: could not open browser ($OPEN_CMD not found). Report is at: $ABS_OUT." >&2
  fi
fi

# --- success -----------------------------------------------------------------
echo "Report written to: $ABS_OUT"
