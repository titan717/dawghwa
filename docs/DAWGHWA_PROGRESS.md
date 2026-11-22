# Progress

The latest entry is first. Every milestone passed typecheck, lint, unit tests and build, and was checked in the rendered UI before commit.

## 2026-11-17

### Merged

- API `titan717/dawghwa.api`: PR #2 (catalogue summary detail) and PR #1 (`/api/browse`). PR #1 had earlier been marked as superseded by `/api/catalog`. It is additive (571 tests, CI and Vercel preview green). The app does not depend on it.
- Frontend: PR #1 (app foundation) and PR #2 (manga design system, rebased onto main's `/api/catalog` semantics; e2e updated to match the redesigned home, mobile nav and Discover hub). CI was green (web, android, Vercel) before each merge.
- PR #3 (`feature/blueprint-experience`): open, with CI green on its last push. This entry is updated when it merges.

### Built on `feature/blueprint-experience`

- Home hero carousel and "Popular by category" (M1, M2). Title page rebuild (M4). Search landing (M3).
- C1: search shows matching titles first. C2: exact webtoon resume (verified: before, page 7 at 934px; after, page 7 at 933px).
- Library: Recent tab, uppercase tabs, "With unread chapters", centred empty states.
- Onboarding: icon chips, Skip, Next (n) disabled at 0, "Finding stories for you" (about 1.1s, skipped under reduced motion and for Skip). Verified with `scripts/qa/onboarding-check.mjs`.
- M5: Undo toasts. M7: reader centring, RTL cue, and auto-continue now fires once (it previously skipped ch1 to ch3). M8: errors and retries. M9: tablet and 1920 chrome. M10: mature-cover blur and dark default. P2 to P5, P9 and P10.
- Production deployment fix: `vercel.json` adds the SPA fallback (deep links such as `/library` returned 404 on dawghwa.vercel.app) and an `/api/*` rewrite to `https://dawghwaapi.vercel.app`. The production build had no `VITE_API_BASE_URL`, so the app's same-origin `/api` calls returned 404.
- Search CLS fix: the trending row reserves its height while loading (CLS 0.191 before, 0.004 after).

### Lighthouse (mobile, simulated throttling, local preview against the production API)

| Page | Perf before | Perf after | A11y | Best practices | CLS before | CLS after |
| --- | --- | --- | --- | --- | --- | --- |
| `/` (first run, onboarding) | 79 | 84 | 100 / 100 | 100 / 100 | 0 | 0 |
| `/search` | 71 | 75 | 100 / 100 | 96 / 100 | 0.191 | 0.004 |
| `/discover?order=popular` | 87 | 82 | 100 / 100 | 96 / 96 | 0.001 | 0 |
| `/title/...` (Eminence in Shadow) | 62 | 83 | 100 / 100 | 100 / 100 | 0.469 | 0.014 |

SEO is 54 to 58 on `/welcome` and `/search` because those pages are deliberately `noindex`. It is 92 elsewhere. The raw reports are in `lighthouse/` in the workspace, outside the repo.

### PR #3 merged (7ef87a1), production verified

Deep links, `/api/health` and `/api/catalog` return 200 on dawghwa.vercel.app. Browser smoke test on mobile and desktop: the hero, shelves, title page and search all render.

## Milestone: critic round 1 fixes (`fix/critic-round1`)

Round 1 scored 7.6 (not accepted). Fixes:
- C3: the title synopsis and About stat strip no longer widen phone layouts, and the sticky "Read" CTA is on screen at 360, 390 and 412px (new e2e test).
- C2: vertical resume measures the anchor at save time, saves on scroll (throttled to 500ms plus a trailing save), flushes on `pagehide` and `visibilitychange`, and mirrors the position synchronously to localStorage so a reload 120ms after scrolling restores it. `scripts/qa/resume-wheel-check.mjs` restores the same page to within 2px of content after wheel scrolling.
- M11: the hero CTA says "View series" when a title has no readable chapters. M12: synopses render as plain text (markdown stripped), and the About sheet shows Status and does not clip. M13: long recent searches ellipsize. M14: the title error and loading states keep a header with Back and Home, the reader error has padding, and the empty bottom bar is hidden. M8: "Search all sources" is hidden when the API is unreachable.
- P11: no "Understood" chip for exact title matches. P12: icons on the step-3 chips. P13: 24px hero dots. P14: "Latest ch. N" when it differs from the available count. P15: Undo on hero Save. P16: failing home shelves collapse into one banner with a single Retry. Broken hero art falls back to the brand gradient.

PR #4 merged (ffcabd0). Production served the new bundles (checked for the `dawghwa.pos.` and "View series" strings in the deployed chunks). Smoke test passed on both viewports; every failed request was to `uploads.mangadex.org`, which this sandbox cannot reach.

## Milestone: critic round 2 fixes (`fix/critic-round2`)

Round 2 scored 8.86 (all gate categories ≥ 9, no criticals). P12 and P16 were already in code but missing from the preview build the critic saw. Fixes:
- P16: if the hero or all shelves fail, home shows one banner whose Retry refetches every failed query. The category shelf and the end card step aside.
- N1: plain network-error copy. The search error state hides the sort select and the count label.
- N2: GETs retry a plain 5xx twice with backoff (400ms, then 800ms). Writes still retry once at most.
- N4: the reader subtitle has no leading separator and shows "via MangaDex"; the reader error is padded below the floating header. N5: 44px Profile footer link. N7: intent chips scroll on phones.
- N6 not done: the API returns no rating or follower statistics for MangaDex titles (checked `/api/titles/mangadex:{id}` and `/api/catalog`), so the About sheet shows only the stats it has.
- N3 not done: the catalogue has no readability signal, and probing chapters for every hero candidate would add 6 or more upstream calls to the LCP path. The hero CTA honestly says "View series" for those titles.
- The e2e reader test skips with a reason when MangaDex's circuit is open upstream (503 SOURCE_CIRCUIT_OPEN), instead of crashing.

PR #5 merged (672311e). Production verified: the deployed bundles contain the new strings.

## Fix: cover images not loading (`fix/cover-images`)

User report after release: images did not load. Cause: `uploads.mangadex.org` now answers browser requests (any browser User-Agent) with a bot challenge, either `403 Bot challenge not passed` or a 302 to `mangadex.org/edge/challenge`. Every MangaDex cover in the hero, shelves, search and title pages fell back to text. Earlier QA hid this because the screenshot scripts relayed images through Node, and I wrongly put the failures down to the sandbox.
- API PR #3 adds `GET /api/image`, a strict, CDN-cached relay for `uploads.mangadex.org/covers/...` only. Merged and checked in production: 200 `image/jpeg`, `x-vercel-cache: HIT`.
- The app sends MangaDex covers through `coverSrc()` at render time, which also fixes covers already saved in the library. The service worker caches only 200 responses from the relay (opaque failures were cacheable before). The dead preconnect is removed.
- Reader pages (`*.mangadex.network`) and AniList covers were never affected.
- Verified with `scripts/qa/images-check.mjs` in a real browser with no interception. Production before: home 78 text fallbacks, 34 failed image responses. Fixed build: home 92 of 92 images decoded, search 20 of 20, title 4 of 4, 0 failures. A new e2e test checks that covers decode and that no `<img>` points at uploads.mangadex.org.

## Milestone: critic round 3 accepted, then polish (`fix/critic-round3`)

Round 3 scored 9.0 overall (8.995 unrounded) and was ACCEPTED, with Blueprint 9.0, UX 9.0, Reader 9.2 and Responsive 9.4. Polish for the critic's remaining notes:
- N8: search no longer suggests a tag the query negates ("no harem" used to suggest Harem). Excluded tags are never suggested.
- N9: "Search all sources" is hidden when the active search errored.
- N10: a failed catalogue-filters fetch is cached for 20s, which stops request storms. Home's Retry clears it.
- N3 follow-up: titles found to have 0 readable chapters are remembered locally (catalogue fact, 7-day TTL, max 300) and skipped as the home hero.
- P17: the footer reads "through Dawghwa."
- Verified with `scripts/qa/round3-check.mjs`. The negated query got no suggestion and the positive one got Theme Harem. 6 filter requests over 2 page loads in 16s. 0 "all sources" on a 503. tsc, eslint, 50 unit tests, build, and Playwright e2e (17 passed, 1 reader test skipped because the upstream circuit was open) all pass.

## Milestone: blueprint v2 and new mascot (`feature/blueprint-v2`)

The user supplied a new blueprint PDF (15 pages: reader end, My Series, Search, Home, a 4-step onboarding and a new border-collie mascot) and asked for it to become the source of truth, running on the existing system.
- Mascot: cut out from the PDF's mascot page. `scripts/brand-assets.py` regenerates every app icon, maskable icon, favicon, OG image, Android launcher mipmap and splash from it. Stage colour #040108 with a violet glow.
- Tokens: Inter only (Archivo removed), neutral greys (#171717 / #1e1e1e / #2a2a2a), black bottom nav, green #00f07a accent, purple-magenta brand gradient for onboarding and primary CTAs. Light theme mirrors it (#fff / #f2f2f2, green #00733a).
- Home: Top Picks grid with green reasons, "Binge the Entire Series" with genre chips, plain cover rows with "#N" ranks and "New Chapter" badges, "Surprise me" bubble in the header.
- My Series: underline tabs, "series total / unread series" toggle, sort select, list rows with Continue/View buttons, grid toggle, find and history.
- Search: flat field, "What Everyone's Reading", "Browse Categories" tiles with stacked covers. Search and My Series drop the logo bar on phones, as on the blueprint.
- Onboarding: genre image tiles, formats, avoid list, ready screen with the mascot; gradient Continue, dots, Cancel.
- Reader end: credits (Creator), Next Chapter card with cover, TOP button and "Pull to read next chapter" (90px overscroll or tap).
- Not built because the API has no support: comments, coins, Watch tab, Canvas, downloads, unlock timers, notifications.
- Validation: tsc, eslint, 52 unit tests, build, Playwright e2e 19 passed / 1 desktop skip. `scripts/qa/v2-flow.mjs` walked dark 360/390/820/1440 and light 390/1920 with 0 console errors.
