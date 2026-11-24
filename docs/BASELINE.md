# Baseline (Cycle 0, SENTINEL)

Production baseline for the 20-agent run, measured 2026-11-23 (UTC) against https://dawghwa.vercel.app, which serves main at https://github.com/titan717/dawghwa/commit/5efc0d105b754670fae4afd645c444327aec184a (Vercel status "success"). A local build of the same commit (`vite preview`, `/api` proxied to https://dawghwaapi.vercel.app) was measured the same way for comparison. Every later cycle diffs against these numbers.

## How it was measured

- Script: `scripts/qa/screens.mjs` (extends `scripts/qa/sentinel.mjs`). Chromium via Playwright, service workers blocked, `isMobile`/`hasTouch` below 1024px, viewport height 800 (mobile/tablet) or 900 (desktop), device scale factor 1.
- Matrix: widths 360, 390, 412, 768, 1024, 1440 x themes light, dark x 13 screens x unscrolled and scrolled (1400px) = 312 screenshots per target (`/welcome` is captured unscrolled only, so 300 files).
- Screens: `/start` (landing), `/welcome` (onboarding, then Skip), `/` (Home), `/discover`, `/search`, `/library`, `/history`, `/profile`, `/achievements`, `/about`, `/settings`, the first title linked from Home, and that title's first chapter in the reader.
- Checks per screen: page errors, console errors, failed requests; horizontal overflow; sidebar visible; bottom bar mounted more than once; bottom bar missing, not flush with the bottom edge, or bounding box different across routes (mobile); bottom bar visible or header missing (desktop); last main content hidden under the bottom bar at the end of the page.
- Commands:
  - `BASE=https://dawghwa.vercel.app OUT=/tmp/screens/prod THEMES=light node scripts/qa/screens.mjs` (and `THEMES=dark`)
  - `npm run build && DAWGHWA_API_DEV=https://dawghwaapi.vercel.app npx vite preview --port 4174 & BASE=http://localhost:4174 OUT=/tmp/screens/local-main node scripts/qa/screens.mjs`
  - `python3 scripts/qa/screens-diff.py /tmp/screens/prod /tmp/screens/local-main`

## Results

| Check | Production | Local build of main |
|---|---|---|
| Screens captured | 156 of 156 | 156 of 156 |
| Failed geometry or console checks | 0 | 0 |
| Page errors, console errors, failed requests | 0 | 0 |
| Horizontal scroll | none at any width | none |
| Sidebar visible | never | never |
| Bottom bar instances | 1 on every shell screen | 1 |
| Bottom bar box, 360 / 390 / 412 / 768 | x 0, y 738, h 62, full width, `position: fixed`, gap to bottom 0px, identical on all 10 shell routes, top and scrolled | identical |
| Bottom bar at 1024 / 1440 | hidden; sticky header 64px on every shell route | identical |
| Home top bar (mobile) | sticky, 56px, y 0 | identical |
| Content under the bottom bar at page end | none | none |
| Initial JS (gzip, `scripts/qa/bundle-size.mjs`) | n/a | 151.6 KB (script limit 150 KB: FAILS by 1.6 KB) |
| Build warnings | n/a | 1 (Vite chunk size warning, existing) |

Time to network idle plus 0.8 s settle, median over 12 contexts (ms; this is a regression signal, not a Lighthouse metric):

| Screen | Production | Local |
|---|---|---|
| Landing `/start` | 4734 | 4599 |
| Onboarding `/welcome` | 1937 | 1797 |
| Home `/` | 7100 | 8167 |
| Discover | 4657 | 4814 |
| Search | 4938 | 4984 |
| Library | 4420 | 4423 |
| History | 4421 | 4382 |
| Profile | 4444 | 4467 |
| Achievements | 4416 | 4438 |
| About | 4427 | 4395 |
| Title page | 4782 | 4717 |
| Reader (first chapter) | 5769 | 5587 |

Visual diff production vs local main: 300 compared, 19 above 2 percent changed pixels, all on screens with live data or carousels (Achievements scrolled 12-14 percent, Title page up to 8 percent, Landing scrolled 3 percent). This is the noise floor for gate 12: changes of this size on these screens need a look, not an automatic failure.

## Findings for Cycle 1 (baseline defects, not regressions)

1. Hidden-source rule: the title and reader URLs on production contain provider identifiers in the path and a source query parameter (the reader link captured carried a `?s=` provider value). Expected until `/api/v2` and the image proxy are enabled (owner env vars, see LOOP_STATE), but it fails section 14 today. Owner: RELAY and QUILL; SHIELD to confirm with the leak audit.
2. `/settings` does not exist: it renders the "This page doesn't exist" screen inside the shell (Spec F, HEARTH).
3. Landing `/start` renders light even when the theme is dark, at every width (check against DESIGN.md; PIXEL to decide).
4. Reader at 1024 and 1440: the first page area is a solid black block at capture time (about 6 s after load) in both themes; mobile shows artwork. Either a dark first page or a slow image; QUILL to check.
5. Bundle size: initial JS is 151.6 KB gzip, already over the 150 KB guard in `scripts/qa/bundle-size.mjs`. Gate 11 uses growth under 10 percent per cycle against this 151.6 KB number.
6. The bottom bar shows no defect in this matrix (flush, identical box, mounted once, on all 10 shell routes at 360 to 768, both themes, top and scrolled). FORGE's reproduction of the reported bug needs a case this matrix does not cover (other viewport heights, keyboard open, iOS safe area, title page or reader transitions); gate 6 must include it.
7. The first Title page and Reader run in dark theme timed out finding links when Home took longer than 3 s; `screens.mjs` now waits up to 15 s. Live data timing varies by up to 20 s.

## Screenshots

Contact sheets (rows: screens, columns: widths) in `docs/baseline/c0/`: `prod-light-top.jpg`, `prod-light-scrolled.jpg`, `prod-dark-top.jpg`, `prod-dark-scrolled.jpg`. Full-size PNGs (300 production, 300 local) are kept outside git at `/tmp/screens/prod` and `/tmp/screens/local-main` on the team machine and are regenerated with the commands above.

## Gate matrix (section 7) as commands

`scripts/qa/gates.sh [gate numbers]` runs these and writes `$OUT/gates.md` plus each gate's raw output to `$OUT/gate-<n>.txt` for pasting into PRs.

| # | Gate | Command (run from the app repo root) | Pass rule | Notes |
|---|---|---|---|---|
| 1 | Type check | `heavy.sh npm run typecheck` | 0 errors | |
| 2 | Lint | `npm run lint` | 0 errors, 0 warnings (`--max-warnings 0`) | |
| 3 | Unit | `npm test` | all pass | |
| 4 | Build | `heavy.sh sh -c 'npm run build && node scripts/qa/bundle-size.mjs'` | succeeds, no new warnings | no `npm ci` on the shared machine; uses base node_modules from the same lockfile |
| 5 | E2E | `heavy.sh npx playwright test` | all pass | config projects are Pixel 7 (412) and desktop 1440; 360, 390 and 1024 are covered by gate 12 |
| 6 | Bottom bar | `heavy.sh npx playwright test e2e/bottom-nav.spec.ts` | identical bbox, flush, mounted once | spec does not exist yet (FORGE); gate 12 checks the same geometry meanwhile |
| 7 | Accessibility | `heavy.sh npx playwright test e2e/a11y.spec.ts` | 0 serious or critical | SHIELD extends to every screen and both themes |
| 8 | Leak audit | `node scripts/audit/leaks.mjs <preview-url>` | 0 matches | script does not exist yet (SHIELD) |
| 9 | Incognito boundary | `heavy.sh npx playwright test e2e/incognito-button.spec.ts` | storage unchanged | spec does not exist yet (FORGE, HEARTH) |
| 10 | API contract | `cd ../dawghwa.api && npm test` | all pass | |
| 11 | Performance | `node scripts/qa/bundle-size.mjs` (growth under 10 percent vs 151.6 KB); Lighthouse mobile on Home and Landing | perf 90+, a11y 95+ | Lighthouse is not installed in base and no new deps are allowed without JUDGE; NOVA runs it |
| 12 | Visual | `heavy.sh env BASE=<preview> OUT=<dir> STRICT=1 node scripts/qa/screens.mjs` then `python3 scripts/qa/screens-diff.py <baseline-dir> <dir>` | 0 failed checks; every diff explained; PIXEL 8+ per changed screen | |
| 13 | Recommender | `npm run eval:replay` | no metric drops more than 2 percent | |
| 14 | Review | JUDGE checklist and SHIELD sign-off | both approved | manual |
