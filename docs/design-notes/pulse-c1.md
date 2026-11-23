# PULSE design note, cycle 1: Share (Spec I), Offline chapters (Spec G), Inbox (Spec M)

Owner: PULSE (Builder 10). Branch `agent/c1-pulse-share-offline` into `agent/cycle-1`. Research: `docs/research/share-offline.md`.
No new dependencies (uses `idb`, `fake-indexeddb`, `@capacitor/share|filesystem|network`, all already installed).

## Goal

1. Share (Tier 1): one share sheet for titles (and badge, streak, level-up, profile, taste kinds for SPARK/NOVA to call), with an editable message, native share, copy link, X and Facebook links and a 1080x1350 card image. Links are `/t/<canonicalTitleId>?ref=share&c=<channel>` only. `/t/<id>` gets server-rendered OG/Twitter tags for link-preview bots.
2. Offline chapters (Tier 1, behind `FEATURE_OFFLINE`, off in production until RELAY ships `downloadable`): download manager with progress, resume, quota errors, delete, storage manager. Download button appears only when the API says `downloadable: true`.
3. Inbox (Spec M): logic only this cycle (unread counts, quiet hours, 15-minute refresh throttle). UI in cycle 2 (Tier 2 list), since `/api/updates` does not exist yet.

## Acceptance criteria

Share
- `shareUrl(path, channel)` always returns `https://dawghwa.vercel.app<path>?ref=share&c=<channel>`, keeps no other query params, and rejects paths that are not `/t/`, `/u/`, `/c/` (falls back to `/`). Unit tested, plus a deny-list test (no provider names, no `?u=`, `s=`, `v=`, no Incognito or email).
- Title share link is built from the canonical title id (`UnifiedChapterRow.canonicalTitleId` / `chapters/all` `title.id`), never from `location`. If the canonical id is not known yet, the share button waits for it (disabled with a spinner, max 1 request).
- `ShareSheet` (bottom sheet via the shared `Layer`/sheet component): editable textarea prefilled from the template for the kind (max 280 chars, counter), buttons: Share (native, hidden when unsupported), Copy link, X, Facebook, Save image / Share image (only when `FEATURE_SHARE_CARDS`). Every button has an accessible name; 44px targets. Toast on copy.
- Native: Capacitor `Share.share` on Android (card written to `Directory.Cache` for files), `navigator.share` on the web, `AbortError` is "cancelled" (no error toast).
- Card: `renderShareCard()` returns a 1080x1350 PNG; cover drawn only via a same-origin or CORS-enabled URL, otherwise mascot art; test checks dimensions and non-blank pixels.
- `/t/:id` client route: resolves the canonical id to the title page (`replace`), with a generic not-found state. When QUILL lands canonical `/title/<dwg-id>` routes, `/t/:id` simply redirects there.
- `middleware.ts` (repo root, Vercel Routing Middleware, matcher `/t/:path*`): for link-preview bot user agents returns HTML with `og:title`, `og:description`, `og:image` (static `/og.png`, 1200x630), `og:url`, `og:type`, `twitter:card=summary_large_image`, escaped text, `Cache-Control: public, max-age=3600`. Others pass through to the SPA. Unit tested with fake `Request`s; after merge, curl as Twitterbot and facebookexternalhit.
- Existing share callers (`TitleActions.tsx`, `TitlePage.tsx:808`, which copy `?u=` today, SHIELD C2 finding 5) are switched to the new sheet. I hand these edits to QUILL (TitlePage) and ask FORGE/QUILL about `TitleActions` if they own it; otherwise I change only the share call site.

Offline (flag `FEATURE_OFFLINE` from COMPASS's `src/lib/flags.ts`)
- `src/lib/offline/db.ts`: own IndexedDB `dawghwa-offline` v1 via `idb`, stores `pages` (key `profileId|titleKey|n|i`, `{ blob, w, h }`) and `chapters` (key `profileId|titleKey|n`). Record: `{ key, profileId, titleKey, canonicalId, n, lang, pages, bytes, savedAt, complete }`. Separator `|` because titleKey already contains `:`. Does not touch the main `dawghwa` DB, so HEARTH's migrations and "clear cache" are unaffected (clear cache must skip `dawghwa-offline`; handoff to HEARTH).
- `download.ts`: `downloadChapter()` fetches `/api/v2/chapter?title=&n=&lang=`; refuses with `DownloadUnavailable` unless `downloadable === true`; `LowStorage` when quota minus usage < 50 MB or on `QuotaExceededError`; concurrency 3; resume skips stored pages; `AbortSignal` cancels; progress callback; marks `complete` only when all pages are stored. Token expiry (410) mid-download re-requests the chapter once.
- Queue (`manager.ts`): one active chapter at a time, "Download next 5/10", Wi-Fi only (Capacitor Network `wifi`; web: `navigator.connection.type`, `unknown` asks first), resume on app start and on `online`.
- Public API for COMPASS and QUILL (`src/lib/offline/index.ts`): `listDownloads(profileId)` -> `{ titleKey, n, bytes, savedAt }[]` (complete only), `subscribeDownloads(fn)`, `isDownloaded(profileId, titleKey, n)`, `getOfflinePages(profileId, titleKey, n)` -> `Blob[]` (QUILL makes object URLs and revokes them on unmount), `deleteChapter`, `deleteTitle`, `usage()`.
- UI: `DownloadButton` (download / progress ring using the existing `ProgressRing` / check, states announced via `aria-live`), rendered only when the flag is on AND the chapter response says `downloadable: true` (no explanation otherwise). `StorageManager` panel (per-title usage, total, delete, "Keep downloads safe" which calls `navigator.storage.persist()` after the click and shows the result). `OfflineSettings` group (Wi-Fi only, keep last N or delete after reading, image quality reserved) for HEARTH to mount in Settings. Offline indicator banner when `network.online` is false.
- Incognito: downloading writes to IndexedDB, so it is blocked while Incognito is on (button disabled, sheet explains "Downloads are off in Incognito"). Reading existing downloads is allowed; no progress is written (QUILL's gate).
- Downloaded files stay inside the app: no export, no Filesystem writes for pages.

Inbox (logic)
- `src/lib/inbox/inbox.ts`: `unreadCount(items, kind?)`, `inQuietHours(now, {start, end})` (wraps midnight), `createRefresher({ minInterval: 15 min, fetch })` that coalesces calls, batches up to 100 ids, records `lastChecked` and `error`. Never creates entries in Incognito. Vitest with fake timers.

## Files

New: `src/lib/share/{share,card,templates}.ts` + tests, `src/components/ShareSheet.tsx` + `src/styles/share.css`, `src/routes/ShareRedirect.tsx`, `middleware.ts` + `src/lib/share/og.ts` (pure HTML builder, tested), `src/lib/offline/{db,download,manager,index,settings}.ts` + tests, `src/components/offline/{DownloadButton,StorageManager,OfflineSettings,OfflineBanner}.tsx`, `src/lib/inbox/inbox.ts` + test, `e2e/share.spec.ts`, `e2e/offline.spec.ts`, `docs/loop/pulse-c1.md`.
Touch (one line each): `src/app/router.tsx` (add `t/:id` route), `src/lib/platform/index.ts` (`share()` gains `files`), `tsconfig.node.json` and `eslint.config.js` only if needed to include `middleware.ts`. `vite.config.ts`: no change (pages are never in the SW cache).
Not touched (handoffs): `TitlePage.tsx`/Reader (QUILL mounts DownloadButton per chapter row and reads offline pages), Library (COMPASS), Settings (HEARTH mounts OfflineSettings/StorageManager), flags.ts (COMPASS).

## API contract (RELAY)

`GET /api/v2/chapter` 200 body gains `"downloadable": boolean` (default `false`; `true` only when the provider's terms allow offline copies). Image tokens for a downloadable chapter must live long enough to finish (default TTL 1800 s is enough at 3 parallel). `/api/v2/img` already sends CORP cross-origin; it also needs `Access-Control-Allow-Origin` for the app origin(s) so `fetch()` from the app can read blobs (middleware already adds it for allowed origins; confirm it covers `/api/v2/img`). Requests go through the app's same-origin `/api` rewrite, so CORS only matters for Capacitor (`https://localhost`). Optional later: `/api/updates?ids=&since=` for the inbox (cycle 2).

## Flags

`FEATURE_OFFLINE` (default off; on in preview via `?ff=` per flags.ts), `FEATURE_SHARE_CARDS` (card image buttons; default on in preview, owner decides production). Share sheet itself is not flagged (Tier 1).

## Risks

- Canonical ids look like `dwg:md:<uuid>`; the `md` namespace and the uuid identify the metadata database. API docs call them opaque; SHIELD to confirm the deny-list does not match. If it does, RELAY needs a hashed public id; `/t/<id>` takes whatever id the API exposes.
- Routing Middleware order versus the SPA rewrite on a Vite project is unverified until the preview; fallback is a `api`-free function path rewrite in `vercel.json` (`/t/:id` with a `has` user-agent condition).
- `downloadable` does not exist yet, and v2 is inert in production (no `IMAGE_PROXY_SECRET`), so offline ships dark. Tests use mocked fetch and fake-indexeddb; Playwright offline test runs against a mocked `/api/v2` route.
- Bundle: share and offline code load lazily (sheet and manager are dynamic imports), target under 8 KB gzip on the main chunk. Checked with `scripts/qa/bundle-size.mjs`.
- Safari evicts unprotected storage after 7 days of no use; the storage manager says so plainly.
