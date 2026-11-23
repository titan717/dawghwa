#!/usr/bin/env bash
# SENTINEL gate matrix: MASTER_PROMPT section 7 as runnable commands. QA only, not shipped.
# Run from the app repo root (a worktree with node_modules). Every gate writes its real output to
# $OUT/gate-<n>.txt and a line to $OUT/gates.md (PASS, FAIL or SKIP with the reason).
#
# Usage: scripts/qa/gates.sh [gate numbers, default all]
#   OUT=/tmp/gates/pr-12 PREVIEW=https://<preview>.vercel.app API_DIR=../dawghwa.api \
#   BASELINE=/tmp/screens/main-local scripts/qa/gates.sh 1 2 3 4 5 6
# Env:
#   OUT       output dir (default /tmp/gates/<branch>)
#   PREVIEW   deployed URL for gates 8 and 12 (default: none, those use the local preview)
#   API_DIR   API repo worktree for gate 10 (default /home/user/workspace/base/dawghwa.api)
#   BASELINE  screens.mjs output dir to diff against for gate 12
#   DAWGHWA_API_DEV  API behind the local vite preview (default https://dawghwaapi.vercel.app)
#   HEAVY     wrapper for heavy commands (default /home/user/workspace/team/heavy.sh if present)
set -uo pipefail
BR=$(git rev-parse --abbrev-ref HEAD | tr '/' '_')
SHA=$(git rev-parse HEAD)
OUT=${OUT:-/tmp/gates/$BR}
API_DIR=${API_DIR:-/home/user/workspace/base/dawghwa.api}
export DAWGHWA_API_DEV=${DAWGHWA_API_DEV:-https://dawghwaapi.vercel.app}
HEAVY=${HEAVY:-$([ -x /home/user/workspace/team/heavy.sh ] && echo /home/user/workspace/team/heavy.sh || echo)}
# Gate 11: main JS growth under 10 percent per cycle vs the Cycle 0 baseline (151.6 KB gzip, docs/BASELINE.md).
export BUNDLE_LIMIT_KB=${BUNDLE_LIMIT_KB:-166.7}
mkdir -p "$OUT"
SUMMARY="$OUT/gates.md"
GATES=${*:-1 2 3 4 5 6 7 8 9 10 11 12 13}
[ -f STOP ] && { echo "STOP file present at repo root; halting"; exit 2; }
echo "# Gate matrix: $BR @ $SHA ($(date -u +%FT%TZ))" > "$SUMMARY"
echo "" >> "$SUMMARY"
echo "| # | Gate | Result | Detail |" >> "$SUMMARY"
echo "|---|------|--------|--------|" >> "$SUMMARY"
FAILED=0

row() { echo "| $1 | $2 | $3 | $4 |" >> "$SUMMARY"; echo "gate $1 $2: $3 $4"; [ "$3" = FAIL ] && FAILED=$((FAILED+1)); return 0; }
run() { # run <n> <name> <tail-pattern> <cmd...>
  local n=$1 name=$2 pat=$3; shift 3
  local f="$OUT/gate-$n.txt"
  ( echo "\$ $*"; "$@" ) > "$f" 2>&1; local rc=$?
  local detail; detail=$(grep -E "$pat" "$f" | tail -2 | tr '\n|' ' /' | sed 's/\x1b\[[0-9;]*m//g' | cut -c1-160)
  if [ $rc -eq 0 ]; then row "$n" "$name" PASS "${detail:-exit 0}"; else row "$n" "$name" FAIL "exit $rc ${detail}"; fi
}
skip() { row "$1" "$2" SKIP "$3"; }
has() { [ -e "$1" ]; }

# vite preview for e2e: started inside the heavy lock together with playwright
e2e() { # e2e <n> <name> <spec files...>
  local n=$1 name=$2; shift 2
  [ -d dist ] || { skip "$n" "$name" "no dist/ (run gate 4 first)"; return; }
  run "$n" "$name" "passed|failed|skipped|flaky" $HEAVY npx playwright test "$@" --reporter=list
}

for g in $GATES; do case $g in
  1) run 1 "Type check" "error TS|Found" $HEAVY npm run typecheck ;;
  2) run 2 "Lint" "problem|error|warning" npm run lint ;;
  3) run 3 "Unit tests" "Tests |Test Files" npm test ;;
  4) # Section 7 says "from a clean install (npm ci)"; machine rules forbid npm ci in worktrees,
     # so the build uses the shared base node_modules (same lockfile). Recorded as a caveat.
     run 4 "Build (shared node_modules, no npm ci)" "built in|error|warning|KB  initial" $HEAVY sh -c 'npm run build && node scripts/qa/bundle-size.mjs' ;;
  5) e2e 5 "E2E (mobile Pixel 7 412 + desktop 1440)" ;;
  6) if has e2e/bottom-nav.spec.ts; then e2e 6 "Bottom bar spec" e2e/bottom-nav.spec.ts
     else skip 6 "Bottom bar spec" "e2e/bottom-nav.spec.ts not in branch; see gate 12 bbox checks"; fi ;;
  7) if has e2e/a11y.spec.ts; then e2e 7 "Accessibility (axe)" e2e/a11y.spec.ts
     else skip 7 "Accessibility (axe)" "e2e/a11y.spec.ts missing"; fi ;;
  8) if has scripts/audit/leaks.mjs; then run 8 "Leak audit" "match|PASS|FAIL" node scripts/audit/leaks.mjs "${PREVIEW:-http://localhost:4173}"
     else skip 8 "Leak audit" "scripts/audit/leaks.mjs not in branch (SHIELD)"; fi ;;
  9) if has e2e/incognito-button.spec.ts; then e2e 9 "Incognito boundary" e2e/incognito-button.spec.ts
     else skip 9 "Incognito boundary" "e2e/incognito-button.spec.ts not in branch"; fi ;;
  10) if [ -d "$API_DIR" ]; then run 10 "API contract (API repo npm test)" "Tests |Test Files" sh -c "cd '$API_DIR' && npm test"
      else skip 10 "API contract" "API_DIR $API_DIR missing"; fi ;;
  11) if [ -d dist ]; then run 11 "Bundle size (initial JS gzip)" "initial JS|exceeds" node scripts/qa/bundle-size.mjs; else skip 11 "Bundle size" "no dist/"; fi
      if command -v lighthouse >/dev/null || has node_modules/.bin/lighthouse; then
        run 11 "Lighthouse mobile Home" "performance|accessibility" $HEAVY npx lighthouse "${PREVIEW:-http://localhost:4173}/" --form-factor=mobile --only-categories=performance,accessibility --quiet --chrome-flags=--headless --output=json --output-path="$OUT/lh-home.json"
      else skip 11 "Lighthouse" "lighthouse not installed in base (no new deps); NOVA runs it"; fi ;;
  12) SHOTS="$OUT/screens"
      if [ -n "${PREVIEW:-}" ]; then
        run 12 "Visual matrix (screens.mjs on preview)" "screens:|FAIL" $HEAVY env BASE="$PREVIEW" OUT="$SHOTS" STRICT=1 node scripts/qa/screens.mjs
      elif [ -d dist ]; then
        run 12 "Visual matrix (screens.mjs on local preview)" "screens:|FAIL" $HEAVY sh -c "npx vite preview --port 4173 --strictPort >'$OUT/preview.log' 2>&1 & P=\$!; sleep 4; BASE=http://localhost:4173 OUT='$SHOTS' STRICT=1 node scripts/qa/screens.mjs; R=\$?; kill \$P; exit \$R"
      else skip 12 "Visual matrix" "no PREVIEW and no dist/"; fi
      if [ -n "${BASELINE:-}" ] && [ -d "$SHOTS" ]; then
        run 12 "Visual diff vs baseline" "changed|screens" python3 scripts/qa/screens-diff.py "$BASELINE" "$SHOTS" "$OUT/diff"
      fi ;;
  13) run 13 "Recommender replay" "Tests |Test Files|Harm|nDCG" npm run eval:replay ;;
  14) skip 14 "Review (JUDGE + SHIELD)" "manual: approvals recorded in LOOP_STATE" ;;
  *) echo "unknown gate $g" ;;
esac; done

echo "" >> "$SUMMARY"
echo "Raw outputs: $OUT/gate-<n>.txt. Failed gates: $FAILED" >> "$SUMMARY"
cat "$SUMMARY"
[ $FAILED -eq 0 ]
