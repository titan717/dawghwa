# SCRIBE, cycle 0

Date: 2026-11-23. Branch `agent/c0-scribe-legal`, base `agent/cycle-1` (= main 5efc0d1).

## What I did

1. Wrote DRAFT legal text, rendered by HEARTH at `/terms` and `/privacy`:
   - [docs/legal/terms.md](../legal/terms.md)
   - [docs/legal/privacy.md](../legal/privacy.md)
   Both are marked DRAFT, pending owner review, not legal advice. Owner decisions are marked `[OWNER: ...]` (operator name, contact, minimum age, log retention, accounts backend, takedown process, governing law). Links inside them use app routes (`/terms`, `/privacy`).
2. Ran a Markdown link check over `docs/**/*.md` (results below).

## Traceability: every on-device claim in privacy.md

| Claim | Code |
|---|---|
| Profiles, per-profile isolation, prefs, cosmetics, rhythm | `src/lib/store/db.ts` (`ProfileRecord`, keys carry `profileId`) |
| PIN stored as salted SHA-256, not security | `src/lib/store/accounts.ts` (`makePin`, `hashPin`), `ProfileRecord.pin` |
| Library, progress, hidden, events, comments, intel (model) stores | `src/lib/store/db.ts` (`DawghwaDB`) |
| Rewards and recommendations derived from the event log | `src/lib/store/user.ts` (`signal`, `UserState.events`) |
| Comments private to the device | `src/lib/comments.ts`, `docs/DECISIONS.md` D5 |
| Bookmarks | `src/lib/store/bookmarks.ts` (`dawghwa.bookmarks.v1`) |
| Recent searches, up to 8 per profile | `src/routes/Search.tsx` (`dawghwa:recent-searches:<pid>`, `.slice(0, 8)`) |
| Reader position mirror, 20 per profile, hashed chapter id | `src/lib/reader/position.ts` (`POS_LIMIT = 20`) |
| Settings fields | `src/lib/settings.ts` (`Settings`, `dawghwa:settings` + kv `settings`) |
| Library view, welcome page seen | `src/routes/Library.tsx` (`dawghwa:library-view`), `src/app/landing.ts` (`dawghwa:entered`) |
| Last profile; session unlocks in sessionStorage | `src/lib/store/user.ts` (kv `activeProfile`), `src/lib/store/accounts.ts` (`dawghwa:session`) |
| Public title cache (bounded) | `src/lib/store/db.ts` (`cacheTitles`, `TITLE_CACHE_MAX`), `src/lib/titles.ts` (`dawghwa.unreadable`) |
| Service worker caches (app shell, fonts, covers); chapter pages not cached | `vite.config.ts` (workbox `runtimeCaching`) |
| Memory fallback when storage is blocked | `src/lib/store/db.ts` (`storageReady`, `isMemoryStorage`) |
| Incognito: memory only; skips progress, events, comments, positions, recent searches; settings and deliberate edits still save | `src/lib/store/incognito.ts` (`LOCAL_DENY_PREFIXES`), `src/lib/store/user.ts` (`saveProgress`, `signal`, `markChaptersRead`) |
| Network: one API client, no analytics scripts | `src/lib/api/client.ts` (only `fetch`); no analytics package in `package.json`; no third-party script in `index.html` |
| Failure report contains no profile data | `src/lib/api/endpoints.ts` -> API `src/app/api/reports/route.ts` (schema: sourceId, kind, chapter key, error code, fallback) |
| Per-IP rate limit in memory | API `src/lib/api/handler.ts` (`KeyedRateLimiter`, `x-forwarded-for`) |
| Share: series link via share menu; reader card drawn on device | `src/components/TitleActions.tsx`, `src/lib/profile/card.ts` (`shareCard`) |
| Export (JSON, v2 incl. comments), import as new profile | `src/lib/store/transfer.ts`, `src/routes/Profile.tsx` |
| Delete: history (one or all), comments, whole profile | `src/routes/HistoryPage.tsx`, `src/lib/comments.ts` (`deleteComment`), `src/lib/store/user.ts` (`deleteProfile`) |
| Mature cover blur | `src/lib/settings.ts` (`matureCovers`) |

Offline downloads and accounts are described as planned / not live (no code yet; flags `FEATURE_OFFLINE`, `FEATURE_ACCOUNTS` per the master prompt).

## Finding for other agents (not fixed by me)

- Share links today are built by `titlePath()` in `src/lib/titles.ts`: `/title/<sourceId>/<id>/<slug>` and, for some titles, `?u=<source url>`. That puts a source id (and sometimes a source URL) into shared links, which section 3 forbids. Planned format is `/t/<canonicalTitleId>`. Reported to /root; owner is PULSE (share system). The privacy text says only "a link to that series page", which is true either way.
- `docs/` says the Incognito localStorage guard uses an allow-list; the code now uses a deny-list (`LOCAL_DENY_PREFIXES`). The legal text follows the code.

## Link check (docs/**/*.md)

Method: Python script, all inline Markdown links outside code; relative paths and `#anchors` resolved against the file system; each unique external URL fetched once (curl `-L`, 12 s timeout), no retries. Provider-candidate and shadow-library sites were not contacted (safety rules), listed as not checked.

Totals: 186 links, 105 internal, 81 external (68 unique).

- Internal: 0 broken.
- External OK (HTTP 200): 51.
- External broken:

| Status | URL | In |
|---|---|---|
| 404 | https://apps.apple.com/us/app/pocket-comics-premium-webtoon/id1492654676 | docs/LENS_BACKLOG.md |
| 404 | https://github.com/KotatsuApp/Kotatsu/discussions/134 | docs/LENS_BACKLOG.md |
| 502 | https://dev.kotatsu.app/client-app/features/ | docs/LENS_BACKLOG.md (may be transient) |

- Could not verify (HTTP 403 bot wall on help-center pages; not retried, no workarounds): 4 help.manta.net articles and 1 help.tapas.io article, all in docs/LENS_BACKLOG.md.
- Not checked (provider candidates or related, deliberately not contacted): 9 URLs in docs/providers/eva-scans.md, docs/providers/ezmanga.md (2), docs/providers/lux-manga.md, docs/RECOMMENDER_EVAL.md, docs/DAWGHWA_RESEARCH.md (2), docs/LENS_BACKLOG.md (2).

Broken links are in LENS's file; handed to LENS rather than edited.

## Spelling

Manual read of both legal drafts; repeated-word check clean. No spell-checker is installed on the machine (codespell/aspell/hunspell absent).
