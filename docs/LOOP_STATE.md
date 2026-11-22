# Dawghwa loop state

Owner: AMIT (lead orchestrator). This file is the single source of truth for the build-merge-deploy loop, so a restart resumes from here. Agents log under their own heading and post handoffs instead of editing another agent's files. A file named `STOP` at the repo root halts the loop.

- Mode: **active** (cycle 2 next)
- Last completed cycle: **1** (see cycle table)
- Consecutive cycles with nothing above medium: 0
- Consecutive reverts: 0
- Consecutive cycles without score improvement: 0

## Open PRs and file overlap (recorded before cycle 1, 2026-11-22)

| Repo | PR | Branch | Files | Overlaps | Action |
|---|---|---|---|---|---|
| dawghwa | #10 Blueprint v2 | feature/blueprint-v2 | 77 (brand assets, Shell, Home, Library, Search, Onboarding, Reader, TitleCard, app.css, reader.css, e2e) | Conflicted with main in 12 files (main moved 180 files ahead) | Cycle 0: main merged into it, conflicts resolved, squash-merged |
| dawghwa | #30 (fork auratitan616, draft, "do not merge") | feat/incognito-ux-overhaul | Shell.tsx, ProfileAvatar.tsx, catalog.ts (+tests), profile/avatar.ts, store/db.ts, store/transfer.ts, Profile.tsx, docs | Shell.tsx (#10, FORGE), db.ts/transfer.ts/Profile.tsx (HEARTH), catalog.ts (COMPASS) | Never run its workflows. Finish its open work (Incognito, per-profile resume, accessibility review) on our own branches; comment on #30 with links |
| dawghwa | #31 Android APK release workflow | agent/release-apk-workflow | .github/workflows/release-apk.yml, android/app/build.gradle | none | Left for its owner; not part of the loop |
| dawghwa | #32 provider research | agent/p4-provider-research | docs/research/* | none | SCOUT reads and cites it; not duplicated |
| dawghwa.api | #10 provider-neutral catalogue model | agent/p5-catalog-model | src/lib/catalog/*, src/lib/metadata/*, tests, docs | RELAY's catalogue area | RELAY builds on it; WARDEN merges it first in the API order |

## Cycle table

| Cycle | App (dawghwa) | API (dawghwa.api) | Checks | Merge / deploy | Revert |
|---|---|---|---|---|---|
| 0 | Blueprint v2 (#10) merged with 13k lines of main: v2 visuals over main's landing, sign-in/PIN, comments, rewards and reader engine. Nav = Home, Discover, Search, My Series, Profile. Surprise me moved into Home's bar. Onboarding keeps main's flow with v2 tiles. Reader end adds Creator, TOP and pull-to-next. Restored onboarding CSS removed as dead; fixed next-card contrast (1.75:1 to black on green). | none | tsc 0, eslint 0 warnings, 147/147 unit, build ok, e2e 95 passed / 17 skipped (live-only) / 2 flaky under load (pass 4/4 on rerun), console errors 0 on sampled screens | main 950eb7d, Vercel Ready, production bundle hash matches local build; production smoke (`scripts/qa/smoke.mjs`) 6/6 pass, 0 console errors; tagged `cycle-0` | none |
| 1 | Desktop sticky header, sidebar removed, sticky safe-area Home bar (FORGE #37); per-profile resume + generic reader copy (QUILL #35); generic Search/Discover states, History skeleton, provider names removed from Discover (COMPASS #39); streak with weekly freeze + daily XP cap 300 (SPARK #38); memory-only Incognito (HEARTH #40); replay eval baseline + Taste signal (ORACLE #36); provider gate records (SCOUT #33); competitor backlog (LENS #34). Integration: Incognito skip in reader positions, streak chip beside avatar, Incognito notice in shell, Taste signal on Profile, generic error copy, "Chapter unavailable" in reader, JUDGE fixes. | Provider-neutral catalogue model (#10); /api/v2/chapter + /api/v2/img with fallback, breaker, 1 req/s per host, opaque signed images; inert (503) until IMAGE_PROXY env is set (#11) | tsc 0, eslint 0 warnings, 216/216 unit, build ok; full e2e 124 passed / 17 skipped, then the 5 failures fixed (streak spec scoped to the Streak card; desktop Profile via avatar) and rerun: 9 touched specs 93 passed, app + discovery 25/25; axe core routes, reader, profile 0 serious/critical; SENTINEL 70 shots, 5 widths x 2 themes, sticky chrome after 1400px scroll everywhere, 0 sidebars, 0 console errors. API: tsc 0, lint 0, 1005 passed / 405 skipped, build ok | API 0dd3ca0 Ready (health 200, v2 503 generic). App: see cycle 1 log | none |

## Cycle 0 log

- Reproduced the top-bar bug before any fix (SENTINEL, `scripts/qa/sentinel.mjs`, build of cycle 0 merge):
  - 390px Home: `.home-bar` is `position: static`, top 16px; after a 1400px scroll its top is -1384px, so brand, Surprise me and avatar scroll away. The shell has no other header.
  - 1440px Home: `.home-bar` is `display: none`; the only navigation is a sticky 232px sidebar (which the final decision removes).
- Verified: the API source id `comix` is **comix.to** (`dawghwa.api/src/lib/scrapers/comix.ts`), not comix.ws.

## Cycle 1 log

- Top bar fixed and verified: at 360/390/768 `.home-bar` stays at top 0 (sticky) after a 1400px scroll; at 1024/1440 `.app-header` stays at top 0 (sticky); no `.sidebar` at any width (SENTINEL report, /tmp/sent1).
- JUDGE: all 7 PRs "approve with fixes". Fixed in integration: Incognito localStorage guard switched to an explicit activity denylist (positions, recent searches) so bookmarks and preferences still save; guard only removes its own patch; "Not saved in Incognito" toasts for Mark read and comments; header search 44px; duplicate Profile link removed (avatar is Profile); streak card hidden in Incognito; D38 references corrected to D68; D22 and D6 marked superseded; D70 added; empty "Credits:" line hidden; generic error copy everywhere (no "source"); TasteSignal says "Because of X". API fixes by RELAY (v2 refuses without proxy, misconfig log, maxDuration 60, SWR pacing).
- Open from JUDGE for cycle 2: legacy unscoped `dawghwa.pos.<chapterId>` keys need a backed-up, reversible HEARTH migration; reader must emit `read_time` (QUILL) so the 5-minute rule works; reader.spec resume assertions strengthened; canonical title/reader URLs (needs app on v2, which needs IMAGE_PROXY).
- PR #30 comment posted by HEARTH: https://github.com/titan717/dawghwa/pull/30#issuecomment-7082004202

## Blueprint fidelity per screen (SENTINEL, 0-10)

| Screen | Cycle 0 | Notes |
|---|---|---|
| Home | 7 → 8 | cycle 1: sticky bar on phones and sticky header on desktop, no sidebar; Surprise me readable at 360 |
| My Series | 8 | tabs, totals, sort, list/grid match |
| Search | 8 | flat field, What Everyone's Reading, Browse Categories match |
| Onboarding | 7 | v2 tiles and option cards inside main's mascot flow; hello/reader steps are main's |
| Reader end | 7 → 8 | credits no longer name the source; generic version labels |

## Provider table (SCOUT)

Full records: `docs/providers/` (PR #33). Result of cycle 1 gate run: **0 providers pass every gate**, so none is newly enabled.

| Provider | In app today | Failing gate | Evidence (summary) |
|---|---|---|---|
| mangadex | yes | 2 terms unverified | terms page redirects to a browser JS verification; not bypassed |
| mangakatana | yes | 2 terms | no terms page found |
| manhuaplus | yes | 2 terms | personal, non-commercial use only |
| asurascan | yes | 2 terms | no scraping without permission |
| webtoon | yes | 2 terms, 3 robots | bans crawling/scraping; robots disallows /*/search used by the adapter |
| weebcentral | yes | 4 access | 403/challenge; robots Crawl-delay 10 |
| flamecomics | yes | 3 robots, 4 access | robots disallows /api/; 403/challenge |
| comix (comix.to) | yes | 4 access | 403/challenge |
| comix.ws | no | 4 access | /terms 403 at 14:23 UTC and challenge at 15:42:58Z; stopped, no retries |
| 10 new candidates (Lux, Eva, Violet, Rinko, Thunderscans, Nyx, Diva, EZManga, MagusManga, luxmanga.org) | no | 1-4 | missing terms, scraping bans, 403/challenge, or no DNS; see docs/providers |

## Hidden-source leak audit (SHIELD)

Cycle 1: client-bundle `mangadex` matches 19 → 14; every user-visible provider name in Discover, Search, Home rows, reader and error copy removed. Remaining 14 are internal ids, the cover host and the About credits (allowed). Still open: provider ids in title/reader URLs (needs v2 + IMAGE_PROXY).

Cycle 0 baseline:
- Title and reader URLs contain provider ids, e.g. `/title/mangadex/<uuid>`, `/read/...`.
- Title page shows a provider picker ("Read from source"); reader end credits say "via <source>"; "caught up" copy names the source.
- Client bundle (main 950eb7d, no sourcemaps shipped): `mangadex` 19 matches; every other provider name 0 (`webtoon` 6 matches are the generic format word). User-visible: Discover "Browse the MangaDex catalogue", "Results come from the MangaDex catalogue", "By reader rating on MangaDex" (COMPASS, cycle 1). Internal: source-id constants and cover host `uploads.mangadex.org` (RELAY/QUILL, needs proxy). About page credits link to MangaDex as attribution (allowed: credits page).

## Recommendation and confidence (ORACLE)

Cycle 1 baseline (synthetic histories, regression only; `npm run eval:replay`; 24 profiles): S3 current ranker P@10 0.050, R@10 0.137, NDCG@10 0.106, coverage@10 0.163, ILD@10 0.297; popularity NDCG@10 0.006; S3 vs S1 NDCG@10 +0.100 (95% CI 0.020 to 0.193). No weights changed; the candidate score S is not shipped. Profile now shows "Taste signal: early / growing / strong" (C = M(1-exp(-n_eff/5))) instead of a percentage.

## Gamification status (SPARK)

Already on main before the loop: XP, levels, tiered achievements, genre passport, weekly quests, cosmetic unlocks, reward beat at chapter end, monthly recap, Rewards on/off setting. Cycle 1 shipped: streak (finished chapter per local day) with one freeze per ISO week, chip beside the avatar, hidden with Rewards off and in Incognito; daily XP cap 300 from 2026-11-23; Incognito earns nothing. Remaining gaps: 5-minute active-reading rule (reader emitter), shield-shaped badges, one small weekly quest card, weekly recap, mascot moods by level, IndexedDB per profile in export/import, Incognito earns nothing.

## Vercel usage and bandwidth (WARDEN)

Automatic production deployment from main is configured on both projects (Vercel commit status "Deployment has completed" on main). Usage and bandwidth dashboards are not reachable from the agents (no Vercel token, by design); WARDEN records request counts it can observe and flags any proxy-heavy change.

## Blocked: needs user decision

- Vercel usage/bandwidth numbers: agents have no Vercel dashboard access. Input needed: either share a read-only usage export each cycle, or accept proxy-change monitoring by request counts only.
- PR #31 (Android APK release workflow) is open and green but outside the loop's scope. Input needed: merge it or leave it.
- Existing providers vs section 6 gates: none of the 8 providers already live passes every gate (table above). Agents have not disabled them, because that would leave the app with no chapters. Input needed: "keep live as-is", "disable all failing", or a named subset to keep.
- MangaDex terms: the terms/API policy pages only load after a browser JS verification, which agents do not bypass. Input needed: a human reads https://mangadex.org/compliance (or the API acceptable-use page) and records whether third-party reader apps may use the public API.
- Recommender evaluation data (LENS): input needed: may volunteered profile backups be used for offline replay evaluation? May the UCSD Book Graph (academic-use dataset) be used as a synthetic benchmark?
- Image proxy (dawghwa.api Vercel project): input needed: set `IMAGE_PROXY=1` and `IMAGE_PROXY_SECRET` (32+ random characters, same on every instance); optional `IMAGE_PROXY_TTL_SECONDS`, `IMAGE_PROXY_RATE_PER_MINUTE`. Until then /api/v2/chapter answers 503 and the app keeps provider ids in reader URLs. Agents do not change env vars.

## Out of scope (noted, not done)

Push notifications, offline downloads, comments and reviews (main already has local-only comments from an earlier phase; not extended), tracker sync, coins, Watch tab, Canvas, unlock timers.

## Next steps (priority order, cycle 2)

1. HEARTH: backed-up, reversible migration for legacy unscoped `dawghwa.pos.<chapterId>` keys (assign to the active profile, then remove), tested on old data.
2. QUILL: emit `read_time` (foreground active seconds) so the 5-minute streak rule works; strengthen the resume e2e; v2 client behind a feature check (falls back to v1 on 503).
3. COMPASS: Updates view and "New this week" rail with release dates (LENS B1, B2, B31); "Not for me" (B7).
4. SPARK: shield-shaped badges, single weekly quest card on Home, weekly recap.
5. PIXEL: consolidate docs/DESIGN.md; Sentinel 0-10 scores per screen.
6. SHIELD: storage and URL leak audit (localStorage keys, IndexedDB), rate-limit review of /api/v2.
7. ORACLE: replay LENS's S4 score on synthetic histories; more realistic rejections so Harm@K is informative.

## Agent logs

### AMIT
- Cycle 0: listed open PRs, mapped overlaps, resolved #10 against main, started SCOUT and LENS research.

### WARDEN
- Cycle 0: ran typecheck, lint, unit, build, e2e on the merge; pushed the resolution to `feature/blueprint-v2`; squash-merged #10 after CI.

### SCOUT
- Cycle 1: ran gates 1-9 on the 8 live providers and 10 candidates plus comix.ws; 0 pass; PR #33. Stopped at first 403/challenge per host, no retries.

### PIXEL
- Cycle 1: specs given inline to builders (BRIEF product rules + docs/DAWGHWA_DESIGN_SYSTEM.md). `docs/DESIGN.md` consolidation is a cycle 2 task.

### LENS
- Cycle 1: `docs/LENS_BACKLOG.md` (31 items, top: New this week + release dates, Updates view, "Not for me", Incognito, earned freeze) and `docs/RECOMMENDER_EVAL.md`; PR #34. Conflicts with earlier decisions resolved by the final decisions: provider picker removed, streaks supersede D22 rhythm, header supersedes D6 sidebar, local comments kept but not extended.

### FORGE
- Cycle 1: #37 desktop sticky header (Brand, nav, Surprise me, search trigger with / and Ctrl+K, avatar), sidebar removed, sticky safe-area Home bar, new src/styles/shell.css.
### QUILL
- Cycle 1: #35 per-profile resume keys `dawghwa.pos.<profileId>.<hash>`; reader copy without source names; two-profile resume e2e.
### COMPASS
- Cycle 1: #39 History waits for the store (skeleton, no empty flash); Search "Search more" merged list; generic error/partial states; Discover copy without provider names.
### SPARK
- Cycle 1: #38 streak with weekly freeze (D68), StreakChip, daily XP cap (D69).
### HEARTH
- Cycle 1: #40 memory-only Incognito, central write gates, notice; commented on #30.
### RELAY
- Cycle 1: API #10 merged first; API #11 v2 chapter + image proxy, breaker, pacing; JUDGE fixes applied.
### ORACLE
- Cycle 1: #36 replay harness, baseline, confidence + TasteSignal.

### SENTINEL
- Cycle 1: 70 screenshots (6 routes, 5 widths, 2 themes, scrolled and unscrolled); geometry checks pass; `scripts/qa/smoke.mjs` added for production smoke.
- Cycle 0: `scripts/qa/sentinel.mjs` added (5 widths, 2 themes, scrolled and unscrolled, console errors, header geometry).

### JUDGE
- Cycle 1: reviewed API #11 and app #35-#40, all approve with fixes; no new dependencies.
### SHIELD
- Cycle 1: bundle leak count 19 → 14 (internal and credits only); axe 0 serious/critical on core routes, reader and Profile with Incognito on.
### SCRIBE
- Cycle 1: this log and the cycle 1 release notes in the merge commit.
### JUDGE, SHIELD, SCRIBE (cycle 0)
- Cycle 0: JUDGE reviewed the merge resolution; SHIELD recorded the hidden-source baseline above; SCRIBE wrote this file.
