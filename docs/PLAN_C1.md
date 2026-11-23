# Plan: Cycle 1 (Tier 1 core, release candidate)

Owner: AMIT. Written 2026-11-23 from docs/LOOP_STATE.md ("Next steps, cycle 2" of the previous run), docs/DESIGN_REVIEW_C2.md, docs/SHIELD_AUDIT_C2.md and the master prompt. Integration branch: `agent/cycle-1` (recreated from main by WARDEN). Release: app `v0.4.0-rc.1`, API `v1.4.0-rc.1` (HERALD), after the Cycle 0 baseline `v0.3.0` / `v1.3.0`.

Each item: user story, acceptance criteria, owner, files, flag, API contract, tests. Builders code only after their design note (`docs/design-notes/<agent>-c1.md`) is APPROVED by PIXEL (UI) or JUDGE (logic/API). Gates: section 7 of the master prompt, all 14.

## Known constraints found in Cycle 0 inspection

- Title and reader routes still carry the provider id in the URL (`/title/:source/:id`, `/read/:source/:id/:chapterId`). Moving to canonical `/t/<id>` needs the app on the API's v2 endpoints, which answer 503 until the owner sets `IMAGE_PROXY` and `IMAGE_PROXY_SECRET` on the API's Vercel project. Cycle 1 ships the v2 client behind a feature check that falls back to v1 on 503 (QUILL), and the `/t/<id>` share route resolves to the existing title route (PULSE). Full canonical URLs are Blocked on the owner's env vars.
- The API is a Next.js 14 app-router project; specs that show plain Vercel handlers are adapted to route handlers.
- The previous run's provider gates passed 0 of 18 candidates. No provider flag changes unless SCOUT's re-check produces a full 9-gate pass.

## Items

### 1. Single shared bottom bar (FORGE) — Spec B
- Story: as a phone reader I see the same black bottom bar, in the same place, on every screen.
- Accept: one `nav.bottom-nav` mounted once in the shell; identical bounding box on every route at 360/390/412; flush with the bottom edge; content never hidden under it; hidden at 1024px and up; hidden while the soft keyboard is open; reader auto-hide uses the same component.
- Files: `src/app/Shell.tsx`, `src/styles/shell.css`, `index.html` (viewport-fit, interactive-widget). Flag: none.
- Tests: `e2e/bottom-nav.spec.ts` at 3 widths, light and dark, scrolled and unscrolled; axe.

### 2. Incognito icon button + bottom sheet (FORGE; wiring QUILL, SPARK, ORACLE) — Spec A
- Story: one tap turns Incognito on or off, and I always know which state I'm in.
- Accept: button in the mobile top bar and desktop header with `aria-pressed`; first enable opens a focus-trapped `BottomSheet` (Escape closes, aria-modal); "Don't show again" key on the Incognito allow-list; toast on later toggles; `IncognitoNotice` mounted once in the shell; Profile switch stays in sync.
- Files: `src/components/IncognitoButton.tsx`, `src/components/ui/BottomSheet.tsx`, `src/components/Toast.tsx` (extend), `src/lib/store/incognito.ts` (allow-list only).
- Tests: `e2e/incognito-button.spec.ts` on every route; storage-unchanged boundary test (SHIELD).

### 3. Hero3D with the real title (FORGE; reused by NOVA and QUILL) — Spec C
- Accept: real `h2` title text; pointer tilt; static under reduced motion; keyboard carousel; no 3D library.
- Tests: `e2e/hero3d.spec.ts`, unit test for the title, axe.

### 4. Reader modes and customization (QUILL) — Spec E
- Accept: scroll, paged-ltr, paged-rtl; suggested by title type; per-profile prefs and per-title override (IndexedDB), never written in Incognito; tap zones (standard, edge, off, custom); auto-scroll; keep awake; background, fit, gap, brightness, warm; presets Webtoon, Manga, Night, Data saver; tall-image chapters fall back to scroll; `read_time` emitted for the 5-minute streak rule.
- Files: `src/lib/reader/{prefs,tap,autoscroll,awake}.ts`, reader route and CSS.
- Tests: Vitest for tap mapping and RTL; Playwright per mode; prefs persist per profile; no position saved in Incognito; jank check on a long chapter.

### 5. "Try another version" and v2 client (QUILL + RELAY) — Spec P
- Contract: `GET /api/v2/chapter?...&alt=1` returns the same shape from a different source, chosen silently; `404 { "error": "UNAVAILABLE" }` when none. Last source carried opaquely, never readable.
- Accept: button on the reader error state and in the reader menu; one extra request; no source text anywhere.

### 6. Taste quiz with swipe cards (HEARTH UI, ORACLE logic, SPARK badge) — Spec D
- Accept: 10 to 15 cards; four gestures plus buttons and arrow keys, Z undo; skip anytime; Incognito does not learn and says so; results screen with genre bars; fallback to genre tiles if the catalog cannot supply varied cards; quiz XP and Taste Tester badge.
- Files: `src/lib/intel/quiz.ts`, `src/components/quiz/*`, onboarding route.
- Tests: `nextCard`/`applyFeedback` Vitest; Playwright for gestures, keys, undo, Incognito message; replay swipes-to-quality figure.

### 7. Settings screen and legal drafts (HEARTH; text by SCRIBE) — Spec F
- Accept: one searchable screen with Reading, Display, Notifications, Storage, Sleep mode, Legal (Account and Sync hidden unless `FEATURE_ACCOUNTS`); no video setting; clear cache leaves user data untouched; `/terms` and `/privacy` DRAFT pages; legacy `dawghwa.pos.<chapterId>` keys migrated (backup, reversible, fixture tests).

### 8. Share system (PULSE) — Spec I
- Accept: native share, copy link, X and Facebook links, editable message, canvas card 1080x1350; links carry canonical ids only plus `ref`/`c`; `/t/<id>` returns OG/Twitter meta for link-preview bots. Flag: `FEATURE_SHARE_CARDS` for the card image.

### 9. Offline chapters (PULSE manager, QUILL playback, COMPASS filter, RELAY flag) — Spec G
- Accept: download button only when the API says `downloadable: true` (currently false for every source, so the feature is built and tested with mocks and stays dark in production); progress, resume, quota error, delete; storage manager; Downloaded filter. Flag: `FEATURE_OFFLINE` (off in production).

### 10. Chapter endpoint and image proxy hardening (RELAY) — Spec H
- Accept: `downloadable` flag; `alt=1`; generic errors; leak test with `_names.json`; SSRF, token tamper/expiry, rate-limit tests; CORS for the app origin; `/api/updates` batched. Mocked upstreams only. Stays behind `IMAGE_PROXY`.

### 11. Landing page (NOVA) — Spec N
- Accept: Hero3D with a real featured title, one primary action, value story, real catalog rail, PWA install, Lighthouse mobile 90/95 reported.

### 12. Light quests and badges (SPARK) — Spec L
- Accept: one weekly quest card on Home; badge gallery with locked shield silhouettes; streak edge-case tests; Incognito earns nothing.

### 13. Search states and Downloaded filter (COMPASS) — Spec O
- Accept: idle, loading, empty, error, partial states; no source names; Downloaded filter behind `FEATURE_OFFLINE`; pure `migrateLibrary` with tests (collections UI in Cycle 2).

### 14. Provider skill and gate runner (WEAVER, SCOUT) — Spec Q
- Accept: `skills/site-analysis/SKILL.md`; `scripts/providers/gate.ts` with the 9 gates; fixture contract tests; no flag flips without a full pass.

### Quality and release (SENTINEL, SHIELD, JUDGE, PIXEL, WARDEN, HERALD, SCRIBE, LENS)
- SENTINEL `scripts/qa/screens.mjs` matrix on every PR; SHIELD `scripts/audit/leaks.mjs` and axe; JUDGE review checklist; PIXEL scores (section 12); WARDEN `verify-deploy.mjs` and `e2e/prod-smoke.spec.ts`; HERALD rc release; SCRIBE cycle log; LENS metrics.

## Merge order
API (RELAY, WEAVER, SCOUT docs) → shared app components (PIXEL tokens, FORGE BottomSheet/Toast/BottomNav) → features → docs. A branch that cannot be fixed this cycle is dropped from the release.
