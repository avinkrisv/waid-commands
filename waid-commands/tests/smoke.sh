#!/usr/bin/env bash
# smoke.sh — runs the launcher against test fixtures and asserts the produced
# HTML is well-formed. Exits 0 on success, 1 on any assertion failure.
#
# Usage: tests/smoke.sh
# Requires: bash 3.2+, python3 3.6+, the plugin assets present.

set -euo pipefail

TESTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PLUGIN_ROOT="$( cd "$TESTS_DIR/.." && pwd )"
LAUNCH="$PLUGIN_ROOT/scripts/launch.sh"
FIXTURES="$TESTS_DIR/fixtures"

PASS=0
FAIL=0
TMP="$(mktemp -d -t waid-smoke-XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

ok()   { PASS=$((PASS+1)); printf "  \033[32m✓\033[0m %s\n" "$1"; }
fail() { FAIL=$((FAIL+1)); printf "  \033[31m✗\033[0m %s\n" "$1"; }

assert_file_exists() {
  if [ -f "$1" ]; then ok "$2"; else fail "$2 (missing: $1)"; fi
}

assert_html_contains() {
  if grep -qF "$2" "$1"; then ok "$3"; else fail "$3"; fi
}

assert_html_not_contains() {
  if grep -qF "$2" "$1"; then fail "$3 (found: $2)"; else ok "$3"; fi
}

run_launcher() {
  bash "$LAUNCH" "$@" >/dev/null 2>&1
}

run_launcher_capture() {
  bash "$LAUNCH" "$@" 2>&1
}

# ─── Setup checks ────────────────────────────────────────────────────────────

echo "── Setup ────────────────────────────────────────────────"
assert_file_exists "$LAUNCH" "launcher exists"
assert_file_exists "$PLUGIN_ROOT/assets/template.html" "template.html exists"
assert_file_exists "$PLUGIN_ROOT/assets/template.css" "template.css exists"
assert_file_exists "$PLUGIN_ROOT/assets/template.js" "template.js exists"
assert_file_exists "$FIXTURES/minimal.json" "minimal fixture exists"
assert_file_exists "$FIXTURES/rich.json" "rich fixture exists"

# ─── 1. minimal fixture ──────────────────────────────────────────────────────

echo "── Test 1: minimal fixture ─────────────────────────────"
OUT="$TMP/minimal.html"
run_launcher "$FIXTURES/minimal.json" --out="$OUT" --no-open
assert_file_exists "$OUT" "minimal HTML written"
assert_html_contains "$OUT" "minimal-fixture" "project name embedded in JSON"
assert_html_contains "$OUT" "<!DOCTYPE html>" "valid HTML5 doctype"
assert_html_contains "$OUT" 'id="waid-root"' "root element present"
assert_html_contains "$OUT" 'data-waid-section="overview"' "overview section present"
assert_html_contains "$OUT" 'data-waid-section="tech-stack"' "tech-stack section present"
assert_html_contains "$OUT" 'data-waid-section="architecture"' "architecture section present"
assert_html_contains "$OUT" 'data-waid-section="quiz"' "quiz section present"
assert_html_not_contains "$OUT" "__WAID_TEMPLATE_CSS__" "css placeholder substituted"
assert_html_not_contains "$OUT" "__WAID_TEMPLATE_JS__" "js placeholder substituted"
assert_html_not_contains "$OUT" "__WAID_GENERATED_AT__" "generated-at placeholder substituted"
assert_html_contains "$OUT" "2026-04-20T12:00:00Z" "embedded analysis timestamp present"

# ─── 2. rich fixture ─────────────────────────────────────────────────────────

echo "── Test 2: rich fixture ────────────────────────────────"
OUT="$TMP/rich.html"
run_launcher "$FIXTURES/rich.json" --out="$OUT" --no-open
assert_file_exists "$OUT" "rich HTML written"
assert_html_contains "$OUT" "rich-fixture" "project name embedded"
assert_html_contains "$OUT" "Node.js / TypeScript" "detectedStack embedded"
assert_html_contains "$OUT" "Repository pattern" "glossary term embedded"
assert_html_contains "$OUT" "answerIndex" "quiz items embedded"

# ─── 3. error: missing input ────────────────────────────────────────────────

echo "── Test 3: error handling ─────────────────────────────"
EXIT_CODE=0
run_launcher >/dev/null 2>&1 || EXIT_CODE=$?
if [ "$EXIT_CODE" -eq 1 ]; then ok "no-args exits 1"; else fail "no-args exit code (got $EXIT_CODE, want 1)"; fi

EXIT_CODE=0
run_launcher "/nonexistent/file.json" --no-open >/dev/null 2>&1 || EXIT_CODE=$?
if [ "$EXIT_CODE" -eq 1 ]; then ok "missing-file exits 1"; else fail "missing-file exit code (got $EXIT_CODE)"; fi

EMPTY="$TMP/empty.json"
: > "$EMPTY"
EXIT_CODE=0
run_launcher "$EMPTY" --no-open >/dev/null 2>&1 || EXIT_CODE=$?
if [ "$EXIT_CODE" -eq 1 ]; then ok "empty-file exits 1"; else fail "empty-file exit code (got $EXIT_CODE)"; fi

INVALID="$TMP/invalid.json"
echo "{not valid json" > "$INVALID"
EXIT_CODE=0
run_launcher "$INVALID" --no-open >/dev/null 2>&1 || EXIT_CODE=$?
if [ "$EXIT_CODE" -eq 1 ]; then ok "invalid-json exits 1"; else fail "invalid-json exit code (got $EXIT_CODE)"; fi

# ─── 4. determinism ──────────────────────────────────────────────────────────

echo "── Test 4: determinism (timestamp aside) ──────────────"
A="$TMP/deterministic-a.html"
B="$TMP/deterministic-b.html"
run_launcher "$FIXTURES/minimal.json" --out="$A" --no-open
run_launcher "$FIXTURES/minimal.json" --out="$B" --no-open
SIZE_A=$(wc -c < "$A" | tr -d ' ')
SIZE_B=$(wc -c < "$B" | tr -d ' ')
if [ "$SIZE_A" = "$SIZE_B" ]; then ok "byte-equal output across runs"; else fail "size mismatch ($SIZE_A vs $SIZE_B)"; fi

# Strip the only non-deterministic line (the generated-at meta) and diff
GREP_PATTERN='waid:generated-at'
DIFF_OUT=$(diff <(grep -vF "$GREP_PATTERN" "$A") <(grep -vF "$GREP_PATTERN" "$B") || true)
if [ -z "$DIFF_OUT" ]; then ok "byte-identical except timestamp"; else fail "diff found beyond timestamp"; fi

# ─── 5. schema validation ────────────────────────────────────────────────────

echo "── Test 5: schema sanity ──────────────────────────────"
python3 -c "
import json, sys
schema = json.load(open('$PLUGIN_ROOT/schema/analysis.schema.json'))
for f in ['$FIXTURES/minimal.json', '$FIXTURES/rich.json']:
    fixture = json.load(open(f))
    required = schema.get('required', [])
    for field in required:
        if field not in fixture: sys.exit('FAIL: '+f+' missing '+field)
print('PASS')
" 2>&1 | grep -q PASS && ok "fixtures contain all required schema fields" || fail "fixtures missing required fields"

# Stack rules sanity
python3 -c "
import json, sys
rules = json.load(open('$PLUGIN_ROOT/schema/stack-detection.json'))
ids = [s['id'] for s in rules['stacks']]
expected = ['flutter','rust','go','nodejs','python','java','ruby','php','dotnet','swift','unknown']
if ids != expected: sys.exit('FAIL: stack order is '+repr(ids))
if rules['stacks'][-1]['id'] != 'unknown': sys.exit('FAIL: unknown not last')
dotnet = next(s for s in rules['stacks'] if s['id']=='dotnet')
if not dotnet.get('manifestFilesAreGlobs'): sys.exit('FAIL: dotnet missing globs flag')
print('PASS')
" 2>&1 | grep -q PASS && ok "stack-detection rules consistent" || fail "stack-detection rules invalid"

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo "──────────────────────────────────────────────────────────"
echo "  $PASS passed, $FAIL failed"
echo "──────────────────────────────────────────────────────────"

[ "$FAIL" -eq 0 ]
