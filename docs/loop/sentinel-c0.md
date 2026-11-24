# SENTINEL, Cycle 0

- Added `scripts/qa/screens.mjs`: screen matrix at 360, 390, 412, 768, 1024, 1440, light and dark, unscrolled and scrolled, 13 screens including landing, onboarding, title page and reader; records page/console/request errors and layout geometry (bottom bar box and flush gap, mounted count, header, horizontal scroll, content under the bottom bar); writes report.json and summary.md; `STRICT=1` fails on any check.
- Added `scripts/qa/screens-diff.py` (gate 12 diff against a baseline dir) and `scripts/qa/gates.sh` (section 7 as runnable commands, writes gates.md and raw outputs for PR bodies).
- Ran the matrix on production and on a local build of main 5efc0d1: 156 screens each, 0 failed checks, 0 console errors. Numbers, findings and the gate table: `docs/BASELINE.md`. Contact sheets: `docs/baseline/c0/`.
- Gates on this branch: typecheck PASS, lint PASS, unit 216/216 PASS, replay 9/9 PASS, bundle 151.6 KB (baseline for the 10 percent growth rule).
