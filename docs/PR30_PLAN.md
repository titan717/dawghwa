# PR #30 plan: state and remaining work

Facts only, gathered on 2026-11-22 from PR #30 ("Draft: Dawghwa reader reliability and UX improvements"), its 16 commits, 13 changed files, CI run 44951397966, and `main` at `6a5a39e`.

- Head: `auratitan616:feat/incognito-ux-overhaul` at `e6167b9` (fork; maintainers cannot push to it).
- Base: `main` at `6a5a39e`. The merge base is `6a5a39e`, so the head is current with `main` and GitHub reports it `MERGEABLE` (no conflicts).
- Diff review: client code, unit tests, and docs only. It adds no dependencies, no network calls, no filesystem or `process.env` access, and no workflow changes.

## Checks on the PR head

| Check | Result | Detail |
| --- | --- | --- |
| CI `web` | Failed | Typecheck, lint, unit tests and build passed. E2E failed 2 desktop tests (below). |
| CI `android` | Skipped | `needs: web`. |
| Vercel preview | Deployed | Vercel first asked a team member to authorise the fork deployment (PR comment). |

Failing e2e tests (desktop project only):

1. `e2e/app.spec.ts:14` "primary navigation reaches every section and back works": on desktop it uses `.sidebar nav` (line 16), which the PR removes, so `locator.click` times out.
2. `e2e/app.spec.ts:41` "Rewards toggle hides achievements and gives the nav slot back to Discover": it expects `.sidebar nav` to contain a Discover link (lines 50 to 52).

The CI log also shows many `vite preview` proxy errors (`ECONNREFUSED` for `/api/catalog...`). They come from live-data tests running without a reachable `DAWGHWA_API_URL` and also occur on `main`. They are not the cause of the failures.

## Done in PR #30

| Item | Files (PR head) |
| --- | --- |
| Bottom navigation at every width; the desktop sidebar markup is removed | `src/app/Shell.tsx` lines 18 to 26 (nav items) and 66 to 101 (render) |
| Local profile avatar: upload, display and remove, with format, size (1.5 MB) and 1024 px edge checks; GIF frame bounds; APNG and animated WebP rejected | `src/lib/profile/avatar.ts` (new, 284 lines), `src/components/ProfileAvatar.tsx`, `src/routes/Profile.tsx` lines 340, 451 to 506 |
| Optional `avatar` field on `ProfileRecord` | `src/lib/store/db.ts` lines 21 to 22 |
| Export and import revalidate the avatar; 100 MiB transfer cap | `src/lib/store/transfer.ts` lines 6, 8, 49 to 56, 67, 76, 100 to 103 |
| Skip `/api/catalog/filters` for simple browse queries | `src/lib/api/catalog.ts` lines 202 to 218 (`needsCatalogFilters`) |
| Tests for the above | `src/lib/api/catalog.browse.test.ts`, `src/lib/api/catalog.test.ts`, `src/lib/profile/avatar.test.ts` |
| Docs: README refresh, docs hub, design guide states that bottom nav is the only global navigation | `README.md`, `docs/README.md`, `docs/DAWGHWA_DESIGN_SYSTEM.md` lines 77 to 85 |

## Missing or broken in PR #30

1. Desktop e2e still targets the removed sidebar (`e2e/app.spec.ts` lines 16, 50). Result: CI is red.
2. The PR removed the sidebar's links and did not move them elsewhere:
   - History (`main` `src/app/Shell.tsx` lines 131 to 134). It is still reachable from Library (`src/routes/Library.tsx` line 124, icon button) and from Home's "Continue reading" row (`src/routes/Home.tsx` line 208, `more="/history"`). There is no labelled primary entry.
   - Discover while Rewards is on (`main` Shell.tsx lines 125 to 130). When Rewards is on, the Achievements tab takes the Discover slot (`navItems`, PR Shell.tsx line 26). Discover stays reachable from Search (`e2e/app.spec.ts` line 34 test).
   - Shortcuts "Top rated", "Completed series" and "New manhwa chapters" (`main` Shell.tsx lines 136 to 145).
   - The desktop profile chip showing "Stored on this device" (`main` Shell.tsx lines 147 to 166).
3. Layout is forced with inline styles (`style={{ display: "block" }}` at PR Shell.tsx line 67, `style={{ display: "grid" }}` at line 94) instead of CSS. About 13 `.sidebar` rules in `src/styles/app.css` (lines 210, 261, 276 to 330) are now dead code.
4. The test comment at `e2e/app.spec.ts` line 17 says History "is reached from Profile" on mobile. `src/routes/Profile.tsx` has no `/history` link; the real mobile entries are Library and Home.
5. The PR body lists work that is not implemented: Incognito, per-profile reader resume, and the accessibility review (see "Left to do").

## Left to do (PR #30 scope)

### One-tap Incognito

Nothing exists yet; `incognito` appears nowhere in `src/`. These paths write profile history or taste data and must be skipped while Incognito is on:

- `saveProgress` in `src/lib/store/user.ts` lines 314 to 354 (progress store, `rememberTitle`, `signal("return" | "chapter_read")`, and the automatic `setStatus` to "reading" or "completed").
- `signal` in `src/lib/store/user.ts` line 187 (events store, which feeds intel and recommendations).
- `markChaptersRead` in `src/lib/store/user.ts` line 356.
- The reader position mirror `writePos` in `src/routes/Reader.tsx` lines 1211 to 1235 (localStorage `dawghwa.pos.<chapterId>`).
- Recent searches in `src/routes/Search.tsx` lines 72, 238 and 259 (localStorage, per profile).

The copy must say that Incognito is local to the device, is not encryption, and does not hide activity from the device owner.

### Reader resume per profile

`src/routes/Reader.tsx` lines 1211 to 1235 key the mirror only as `dawghwa.pos.<chapterId>`, shared by all profiles. It is read at line 144. The IndexedDB `progress` store is already keyed by `[profileId, titleKey]` (`src/lib/store/db.ts` line 140). Related: bookmarks use one global localStorage key, `dawghwa.bookmarks.v1` (`src/lib/store/bookmarks.ts` line 19). They are not profile-scoped; whether to scope them is a decision for Phase 1.

### Accessibility review

Home (`src/routes/Home.tsx`), Search (`src/routes/Search.tsx`) and Onboarding (`src/routes/Onboarding.tsx`): keyboard, focus order, labels, contrast and reduced motion. The existing axe coverage is in `e2e/a11y.spec.ts`.

### History without the sidebar

Add a labelled History entry that does not depend on the sidebar.

### Checks and tests

- Update `e2e/app.spec.ts` for bottom-nav-only navigation.
- Tests must use real chapter data. The repo has real captured fixtures in `src/test/fixtures/catalog.json` and `src/test/fixtures/vocabulary.json`. For each test title, record which providers have it (via `GET /api/titles/:ref/sources` on the live API).

### Supersede #30

The fork cannot be pushed to, so open a new PR from `agent/phase1-finish-pr30` that carries the 16 commits plus fixes, then comment on #30 with the link.

## Related API code (dawghwa.api)

- `GET /api/catalog` (`src/app/api/catalog/route.ts`): metadata browse. It takes `provider=anilist|mangadex|mangaupdates` and rejects filters a provider cannot apply with a 400.
- `GET /api/catalog/filters` (`src/app/api/catalog/filters/route.ts`): provider vocabulary and capabilities. This is the request PR #30 skips for simple queries.
- `GET /api/catalog/providers`: live response (2026-11-22) lists `anilist` (`default: true`), `mangadex`, `mangaupdates`.
- The app hardcodes `CATALOG_PROVIDER = "mangadex"` (`src/lib/api/catalog.ts` line 24). Phase 4 changes this.
