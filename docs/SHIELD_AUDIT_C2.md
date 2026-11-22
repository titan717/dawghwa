# SHIELD audit, cycle 2

Scope: app `main` a5c2d33, API `main` 0dd3ca0. Mostly static reading of the code. I also sent a few single `curl` requests to production `https://dawghwa.vercel.app/api/*`, which the app rewrites to `dawghwaapi.vercel.app` (see `vercel.json`). I did not run a browser. Nothing in this file is a test result. Each finding says who owns the fix, and none of the fixes are included in this PR.

Severity: **High** means the provider, source or backend is visible to a reader in normal use, or a server can be abused. **Medium** means it shows up in places a curious reader would look (URL bar, share sheet, devtools, a saved backup), or a control is weak. **Low** means it is stored internally, needs deliberate digging, or is hygiene.

Owners: FORGE (shell/home), QUILL (reader/title), COMPASS (search/discovery/library/history), SPARK (rewards), HEARTH (profiles/store/migrations), RELAY (API), ORACLE (intel).

## Top findings

| # | Sev | Finding | Owner |
|---|-----|---------|-------|
| 1 | High | Title page shows provider names in the UI: the "Read from source" picker, "Read in Dawghwa · MangaDex + …", the source name in each chapter row's meta, the "Adding chapters from …" text, a `Source` row linking to the provider site, and `<strong>{v.source}</strong>` in the version sheet | QUILL |
| 2 | High | The client receives the full provider registry (`/api/sources` returns name, baseUrl, description, priority; `/api/health` lists 82 provider slugs with Cloudflare status), and every chapter list carries `variants[].source/sourceId/url` | RELAY (+QUILL to stop calling `useSources`) |
| 3 | High | `/api/proxy/html` 403 body lists the allowlist: `details.allowedDomains:["weebcentral.com"]` (seen in production) | RELAY |
| 4 | High | `/api/image` has no rate limit (no `route()` wrapper, so no RateLimit headers; checked in production). It is an open relay for MangaDex covers and pages, Webtoons and Dynasty pages, and its errors name the provider (`url is not an allowed MangaDex page image`) | RELAY |
| 5 | High | URLs carry provider slugs and URLs: `/title/<provider>/<id>/slug`, `?u=<provider url>` for titles that can't be looked up by id, `/read/<provider>/<id>/<providerChapterId>?s=<sourceId>&v=<sourceId>:<id>`. Both share buttons copy them as-is | QUILL (paths, reader params), COMPASS (links in lists/search), RELAY (opaque ref) |
| 6 | Medium | Incognito still leaves a timestamped trace of viewed titles in IndexedDB `titles` (`cachedAt`), in the persisted query cache `kv/rq:*` (`title`, `chapters`), in `localStorage dawghwa.unreadable`, and in the service-worker `covers` cache | HEARTH (store), QUILL (call sites), FORGE (SW) |
| 7 | Medium | API rate limits live in each serverless instance's memory (`KeyedRateLimiter`), so on Vercel they only slow an attacker down. `/api/v2/chapter` uses the `standard` limit (120/min) although it fans out across providers | RELAY |
| 8 | Medium | Reader page `<img>` has no `referrerPolicy="no-referrer"`, so the provider CDNs receive `Referer: https://dawghwa.vercel.app/`. Page URLs are raw provider hosts (visible on long-press, "open image", devtools) until the app moves to `/api/v2/chapter` with `IMAGE_PROXY` | QUILL, RELAY (turn the proxy on) |
| 9 | Medium | The reader scrubber (`role="slider"`, `tabIndex=0`) sets `outline:none` and has no focus style. The search inputs (`.search-input input`, `.lib-find input`) remove the outline and their wrappers have no `:focus-within` | QUILL, COMPASS |
| 10 | Medium | Touch targets under 44px are used widely: `.btn-sm` 34px (32 lines use it), `.chip` 34px, `.segmented button` 34px, `.chip-lg` and `.lib-find` 42px. There is no `(pointer: coarse)` override | FORGE (shared tokens/classes) |

## 1. Hidden-source leaks beyond the bundle

### 1a. localStorage

| Key | Written by | Contains | Provider data? | Sev | Fix / owner |
|-----|-----------|----------|----------------|-----|-------------|
| `dawghwa:settings` | `src/lib/settings.ts:84` (and IDB `kv/settings` :88) | preferences | no | – | – |
| `dawghwa:entered` | `src/app/landing.ts:23` | "1" | no | – | – |
| `dawghwa:session` (sessionStorage) | `src/lib/store/accounts.ts:34` | unlocked profile | no | – | – |
| `dawghwa:library-view` | `src/routes/Library.tsx:90` | list/grid | no | – | – |
| `dawghwa:recent-searches:<profileId>` | `src/routes/Search.tsx:70,253,274` | query strings | no | – | Blocked in Incognito, good |
| `dawghwa.pos.<profileId>.<fnv36>` | `src/lib/reader/position.ts:98` | page/offset/t | no (hashed) | – | Good |
| **legacy `dawghwa.pos.<chapterId>`** | older builds; never read or pruned now (`position.ts:8-11`) | provider chapter id **in the key** | yes | Low | HEARTH: a migration (after backup) that deletes keys matching `^dawghwa\.pos\.[^.]+$` that aren't in the new format, once older builds are gone |
| `dawghwa.bookmarks.v1` | `src/lib/store/bookmarks.ts:38` | `Bookmark.sourceId`, `variantId` (`<sourceId>:<id>`), `titleKey` (`<sourceId>:<id>`) | yes, in values | Low | HEARTH: once canonical ids exist, drop `sourceId` and store an opaque variant ref (needs a migration) |
| `dawghwa.unreadable` | `src/lib/titles.ts:143` | `{ "<sourceId>:<id>": ts }`, 300 entries max | yes, in values; also a list of titles viewed (see §2) | Low | QUILL/HEARTH: key by the canonical id; skip writes in Incognito (add `dawghwa.unreadable` to `LOCAL_DENY_PREFIXES`) |

### 1b. IndexedDB `dawghwa` (v2, `src/lib/store/db.ts`)

Every private store is keyed by `[profileId, titleKey]`, and `titleKey = "<sourceId>:<id>"` (`titles.ts:8,22`). So provider slugs sit in the primary keys of `library`, `progress`, `hidden`, `events`, `comments` and `titles`.

| Store / field | Provider data | Sev | Fix / owner |
|---------------|---------------|-----|-------------|
| `progress.sourceId`, `progress.variantId`, `progress.chapterId` (provider chapter id on older records) `db.ts:49-56` | yes | Low | HEARTH: plan a v3 migration to canonical title/chapter keys (`dwg:…`) with opaque variant refs. Needs RELAY to expose stable opaque refs first |
| `titles.sourceId`, `sourceName`, `url` (provider page URL), `cover` (provider CDN) | yes | Low | HEARTH: strip `sourceName`/`url` from the cache once the UI stops using them (QUILL #1) |
| `comments.chapterId` | provider or canonical chapter id | Low | HEARTH, with the migration above |
| `kv/rq:*` (TanStack persister, `query.ts:31-43`) | persisted `browse`, `title`, `chapters` queries, including chapter lists with `variants[].source/url` | Low | RELAY (stop sending provider fields), then nothing to do here |
| Profile export JSON (`transfer.ts:28-49`, `Profile.tsx:561`) | all of the above plus `titles[].sourceName/url` in a file the user keeps | Medium | HEARTH: export canonical ids only; omit `sourceName`/`url` |

### 1c. URLs, share links, document head

- `src/app/router.tsx:17,29`: routes `title/:source/:id/:slug?` and `/read/:source/:id/:chapterId`. **High**.
- `src/lib/titles.ts:68-72` `titlePath` appends `?u=<encoded provider URL>` for titles that can't be looked up by id, so the full provider domain ends up in the URL bar and in shared links. **High**.
- `src/lib/titles.ts:74-81` `readerPath` sets `s=<sourceId>` and `v=<sourceId>:<providerChapterId>`. `src/routes/Reader.tsx:542-543` rewrites `s` and `v` when switching versions. **High**.
- Share: `src/components/TitleActions.tsx:88` (`titlePath`) and `src/routes/TitlePage.tsx:808` (`location.pathname + location.search`, so it copies `?u=` too). **High**.
- Fix (QUILL, with RELAY): route by canonical id only, `/title/<dwg-id>/<slug>` and `/read/<dwg-id>/<chapter-number>?lang=&alt=<k>`, matching `/api/v2/chapter`'s `title/n/lang/alt` contract, which never names a provider. Keep the old routes as redirects (resolve them client-side, then `replace`). Share links should be built from the canonical path, never from `location`. COMPASS owns every `titlePath`/`readerPath` caller in search, discovery, library and history.
- Canonical ids still contain provider hints: `dwg:md:<uuid>` (`md` = MangaDex alias, `src/lib/metadata/index.ts:63`), and the chapter key is `dwg:md:<uuid>/en/s0/ch:1`. **Low**. RELAY: consider an opaque hash for the public id.
- Head (`src/lib/seo.ts`): `document.title` is the title name only, which is fine. `og:url`/`canonical` copy the provider-slug path (`TitlePage.tsx:506`), and `og:image` plus JSON-LD `image` are the raw `uploads.mangadex.org` cover URL (`TitlePage.tsx:507,517`). **Medium**, QUILL: use the canonical path and `coverSrc()` (the API relay) for `og:image`.

### 1d. UI text (rendered, not only in the bundle)

- `src/routes/TitlePage.tsx:39` "Adding chapters from <sources>…", `:60` version sheet `<strong>{v.source}</strong>`, `:79` "Not on this source", `:92-114` "Read from source" radiogroup with provider names, `:223` "Read in Dawghwa · A + B", `:279` "n versions · A, B" or the source name in each row, `:704-708` `Source` row with the provider name linking to `title.url`. **High**, QUILL. The reader already labels versions as "Version n · group · language · edition" (`Reader.tsx:678`), so use that pattern on the title page too and drop the picker and the Source row.
- `src/routes/About.tsx:18-39` names MangaDex and links `GooglyBlox/comick-source-api`, and `Landing.tsx:342-344` has a "Sources" FAQ. **Flag for /root rather than delete.** The MIT notice for derived adapter code and the MangaDex API attribution may be license or terms obligations. Suggested approach: keep the legal notices in a licenses/credits page or the `NOTICE` file, and remove the wording that describes routing ("Chapters from other sources open on their own sites"). Owner: FORGE (About/Landing).

### 1e. API responses the client receives (checked in production)

- `GET /api/sources`: `{id:"mangadex",name:"MangaDex",baseUrl:"https://mangadex.org",description:"MangaDex - https://mangadex.org",clientOnly,priority,circuit}` for every provider (including `weebcentral`). The app calls it from `Reader.tsx:103` and `TitlePage.tsx:435`. **High**. QUILL: stop using it. RELAY: put it behind an operator key or reduce it to `{id-less capability flags}`.
- `GET /api/health`: 82 provider slugs (`arya-scans`, `asurascan`, …) with Cloudflare and anti-bot status. **High**, RELAY: operator-only. The app's health ping should hit a provider-free `/api/v2/status`.
- `GET /api/titles/<ref>/chapters/all`: `externalIds{mangadex,anilist,mal,mangaupdates}` and `variants[]{variantId:"mangadex:…",sourceId,source:"MangaDex",providerChapterId,url:"https://mangadex.org/chapter/…"}`. **High**, RELAY: a v2 chapter list with `{number, display, language, edition, group, versions:n}` and no provider fields; QUILL to adopt it.
- `POST /api/search`, `/api/catalog`: `url` and `coverImage` on provider hosts. **Medium**, RELAY.
- Errors name sources: `Unknown source "<id>"` (`pages/route.ts:42`, `manga/route.ts:30`, `search/route.ts:28`, `reports/route.ts:27`, `browse/route.ts:40`, `health/route.ts:87`, `sources/[id]/route.ts:13`, `titles/[ref]/chapters/route.ts:33`, `services/catalog.ts:40`). `image/route.ts:53` interpolates `provider.name`. `parseTitleRef` returns `details.supported` (provider list) (`metadata/index.ts:59-61`). The app already turns these into generic text (`errors.ts:57-91`, `States.tsx:162`), so the risk is in devtools only. **Medium**, RELAY: generic messages and no `details` in public bodies.
- `/api/proxy/html` 403 `details.allowedDomains` (`proxy/html/route.ts:39`). **High**, RELAY: remove `details`.
- Headers: there is no `x-source` (or similar) header anywhere in the API (`rg "headers.set(\"X-"`). `X-Dawghwa-Version`, `X-Request-Id` and `x-matched-path` are fine. **No issue.**
- `/api/v2/chapter` returns `{"error":"Chapter unavailable"}` with no provider fields, so its contract holds. When `IMAGE_PROXY` is off, page URLs are the raw upstream URLs (`v2/chapter.ts` `pageUrl` path is used only when the proxy is enabled). RELAY: set `IMAGE_PROXY`/`IMAGE_PROXY_SECRET` in production before QUILL adopts v2.

### 1f. Console logs

- App: no `console.log/info/debug` in `src` outside tests. **No issue.**
- API server logs (`reports/route.ts:29` logs `sourceId`, `handler.ts:139`) are server-side only. **No issue for readers.**

## 2. Incognito boundary

Design (`src/lib/store/incognito.ts`): the flag lives in memory, and while it is on, writes to `dawghwa.pos.` and `dawghwa:recent-search(es):` are dropped by a `Storage.prototype.setItem` guard. `saveProgress`/`markChaptersRead`/`signal` (`user.ts:193,321,363`), `retrain` (`intel/runtime.ts:113`), rewards (`rewards/runtime.ts:64,67`), comments (`comments.ts:91,103`) and `writePos` (`Reader.tsx:278`) all return early. These are correct.

Still recorded while Incognito is on:

| # | What | Where | Sev | Fix / owner |
|---|------|-------|-----|-------------|
| I1 | Opening a title writes `titles` with `cachedAt=now`, so IndexedDB holds a timestamped list of titles viewed in Incognito | `src/lib/query.ts:132` (`useTitle` → `cacheTitles`), `db.ts:198-209` | Medium | HEARTH: in `cacheTitles`, keep the existing `cachedAt` (or skip the write) when `isIncognito()`. Browse/search result caching (`query.ts:58`, `search/run.ts:88`) is fine because it is not a chosen title |
| I2 | The TanStack persister writes `title` and `chapters` queries for the viewed title to `kv/rq:*` | `src/main.tsx:46`, `query.ts:43` `shouldPersist` | Medium | HEARTH/FORGE: `shouldPersist` returns false for `title` and `chapters` while Incognito is on (keep `browse`/`vocab`). Optionally pause the persister |
| I3 | `dawghwa.unreadable` records titles opened (from the title page and the hero) | `titles.ts:137-145`, called from `TitlePage.tsx:536` and `Hero.tsx:87` | Low | HEARTH: add `dawghwa.unreadable` to `LOCAL_DENY_PREFIXES` |
| I4 | The service-worker `covers` cache stores covers of titles viewed | `vite.config.ts:34-41` | Low | FORGE: acceptable (browse already caches covers), but mention it in the Incognito notice copy, or leave it as is since covers also load on Home |
| I5 | Bookmarks still save | `bookmarks.ts:38` | – | Intentional (a deliberate edit, as documented) |
| I6 | `POST /api/reports` still sends `chapterKey`/`providerChapterId` on failures | `Reader.tsx:565,598` | Low | QUILL: skip `api.report` in Incognito (the server does not log `chapterKey`, `reports/route.ts:29-38`, but it receives it) |
| I7 | `forgetTitle`/`resetIntel` `kvSet` | `intel/runtime.ts:164,172` | – | Deliberate user actions, fine |
| I8 | The guard runs only while Incognito is on, and only patches `Storage.prototype.setItem` | `incognito.ts:81-90` | Low | HEARTH: add a vitest that turns Incognito on, opens a title (mocked), and asserts that the `titles`, `kv` and `localStorage` diffs are empty. That covers I1-I3 |

## 3. API controls

### Rate limits

- `route()` limiter (`src/lib/api/handler.ts:15-27,51-66`): an in-memory token bucket for each instance (120/min standard, 12/min expensive). On Vercel each instance counts separately and cold starts reset the counts, so this is best-effort. **Medium**, RELAY: Vercel Firewall rate-limit rules or a shared KV (Upstash) bucket for `/api/v2/*`, `/api/image`, `/api/proxy/html`, `/api/search`.
- Client identity: `TRUST_PROXY` defaults to true (`core/config.ts:199`) and the first `x-forwarded-for` entry is used. Requests arrive through the app's external rewrite (`dawghwa/vercel.json`). **Needs verification** that Vercel passes the original client IP through the rewrite, and not the app edge's address. Otherwise every reader shares one 120/min bucket. RELAY: log `clientId` cardinality for a day, or test with two networks.
- `/api/v2/chapter` (`v2/chapter/route.ts:26`): `standard` class. Each request may aggregate across providers and fetch manifests. **Medium**: use `{ rate: "expensive" }` or a dedicated class (for example 30/min).
- `/api/v2/img/[token]`: its own per-instance limiter, 600/min default (`v2/image.ts` `takeImageRate`). The token is AES-GCM with HMAC, bound to `{sourceId,url,exp}`, the URL is re-checked against `allowPageImage`, `assertPublicDestination` is applied, a size cap is enforced and the content type is checked. Responses are `public, immutable` until `exp`, so a token can be hotlinked until it expires (1800s by default). Acceptable. **Low**: also check `Sec-Fetch-Site`/`Referer` against the app origin to deter hotlinking.
- `/api/image` (`src/app/api/image/route.ts:35`): **no rate limit at all** (a bare `GET` with no `route()` wrapper, and production returns no `RateLimit-*`). The CDN cache (`s-maxage=2592000`) absorbs repeats, but unique URLs on MangaDex `@Home`, Webtoons or Dynasty hosts each cost a function call and upstream bandwidth. **High**, RELAY: wrap it in a limiter (a separate image class, for example 600/min), and drop the legacy keyless branch for page hosts once the v2 proxy is live.
- `/api/proxy/html`: `route()` standard, plus the provider limiter via `provider.run`. Fine.

### Input validation

- `/api/v2/chapter`: `n` ≤ 16 characters, `lang` matches a regex, `alt` is 0-99. `title` has no up-front length or shape check, but `parseTitleRef` (`metadata/index.ts:55-66`) caps the id at 64 characters and requires `<provider>:<id>`. Its error carries `details.supported` (the provider list), which the v2 route swallows into the generic body. Note that `?title=x&n=1` answers **503** in production, so the proxy-disabled check runs before validation. **Low**: validate `title` (`^[a-z:]{2,12}[A-Za-z0-9:_-]{1,80}$`) before anything else and return 400.
- `/api/image`: `url` ≤ 2048. With `source`, it is allowlisted per provider (`allowPageImage`). Without it, only the four parsers (`parseCoverUrl`, …) are accepted. Private IPs are refused, only `image/*` responses (or sniffed bytes) are relayed, the size is capped, there is a 12s timeout and redirects are manual. Good.
- `/api/proxy/html` (SSRF): https only, no credentials or custom ports, an exact host allowlist (`ownsUrl`), every redirect hop re-validated (3 max), and `assertPublicDestination` plus the pinned `guardedDispatcher` (`core/net-guard.ts:158-184`) via `upstreamFetch` → `guardedFetch`. `upstreamFetch` goes through `guardedFetch` (`core/http.ts:209`), so the connect-time lookup is pinned too. Good. Returned HTML gets `CSP: sandbox; default-src 'none'`. Issues:
  - `route.ts:103` `await res.text()` reads the whole body **before** the 5 MB check. **Medium**: stream with a byte cap (reuse `readCapped` from `v2/image.ts`).
  - `route.ts:39` `details.allowedDomains` leak (High, above).
  - `route.ts:95` the error message includes the upstream HTTP status. Low.
- JSON bodies: `readJson` caps size by header and while streaming (16 KB), and validates with zod. Good. `text/plain` is accepted on purpose to skip CORS preflight (`handler.ts:73-76`), which means simple cross-site POSTs work. Combined with `ACAO:*`, any site can drive the API (see CORS).

### CORS

- `middleware.ts:9`: `CORS_ORIGINS` defaults to `*`. Production answers `access-control-allow-origin: *` on `/api/sources`, `/api/health` and `/api/image`. `/api/proxy/html` hard-codes `*` (`route.ts:45-50`) and ignores `CORS_ORIGINS`. No credentials or cookies are involved, so this is not a data-theft issue, but it lets third-party sites use the API and the HTML proxy for free. **Medium**, RELAY: set `CORS_ORIGINS=https://dawghwa.vercel.app,capacitor://localhost,https://localhost` in production, make `proxy/html` use the shared `corsHeaders`, and stop accepting `text/plain` on endpoints the app doesn't need it for.
- Security headers: `nosniff`, `Referrer-Policy: no-referrer`, `XFO DENY`, HSTS and `CSP default-src 'none'` on JSON. Good. The app (`dawghwa/vercel.json`) has no CSP. **Low**, FORGE: add a CSP (`img-src` will need the provider CDNs until the v2 proxy is live).

## 4. Accessibility spot-check (code only)

### Touch targets under 44px (no `(pointer: coarse)` override anywhere)

| Selector | Size | File:line | Owner |
|----------|------|-----------|-------|
| `.btn-sm` | min-height 34px (32 lines across Comments, Quests, States, IncognitoNotice, DiscoveryStates, Shell, Profile ×6, Search ×5, Reader ×3, Discover, TitlePage ×10) | `src/styles/app.css:422-426` | FORGE (shared class); a `@media (pointer: coarse) { .btn-sm { min-height: 44px } }` fixes it everywhere |
| `.chip` | 34px | `app.css:447-452` | COMPASS |
| `.segmented button` | 34px | `app.css:587-589` | FORGE |
| `.chip-lg` | 42px | `app.css:2135-2136` | COMPASS |
| `.lib-find` | 42px | `app.css:4199` | COMPASS |
| `.rd-rate-btn` | no size set (depends on content) | `reader.css:1069` | QUILL: check it renders at 44px or more |
| `.tag` | 24px | `app.css:496-500` | only if interactive (check) |

These were fine: `.icon-btn` 44px, `.tabs button` 44px, `.input` 44px, `.rd-top-btn` 58px, and the `.rd-progress` hit band is 44px.

### Focus styles

- `.rd-progress` (keyboard slider, `Reader.tsx:950-953`) `outline:none`, with no `:focus-visible` rule in `reader.css`. **Medium**, QUILL: `.rd-progress:focus-visible::before { outline: 3px solid var(--color-focus); }`.
- `.search-input input` `outline:none` (`app.css:2053`), with no `.search-input:focus-within`. **Medium**, COMPASS.
- `.lib-find input` `outline:none` (`app.css:4200`), with no `.lib-find:focus-within`. **Medium**, COMPASS.
- `.input:focus`/`.select:focus` (`app.css:523-529`) only change a 1.5px border to `--lavender`. That is a weak indicator (check 3:1 against `--line-strong`, especially in light theme). **Low**, FORGE: add `outline: 2px solid var(--color-focus)` on `:focus-visible`.
- `.card-link:focus-visible` moves the outline onto `.card-cover` (`app.css:3758-3763`). Fine.
- The global `:focus-visible` exists (`base.css:61`).

### Motion

- The global guards (`base.css:95-110`) cover both `[data-reduce-motion]` and `prefers-reduced-motion`. The media-query branch lacks `animation-iteration-count: 1` and `scroll-behavior: auto` (the data-attribute branch has both), so infinite spinners and shimmers keep cycling at 0.01ms. **Low**, FORGE: copy those two lines into the media-query block.
- JS motion: pinch zoom (`readerGestures.ts:105`), back-to-top (`Reader.tsx:839`) and the title-page scroll (`TitlePage.tsx:210`) check `reducedMotion()`. Good.
- The Landing auto-scroll (`Landing.tsx:565`) checks only the OS media query and not the in-app setting (`reducedMotion()`/`[data-reduce-motion]`). **Low**, FORGE.
- The reader's auto-next 8s countdown (`Reader.tsx:665-669`) is opt-in (`settings.autoNext`) and pauses while comments are open. Fine.

## Handoffs (summary by owner)

- **RELAY**: rate-limit `/api/image`. Remove `details`/provider names from public errors (`proxy/html:39`, `image:53`, all `Unknown source`, `parseTitleRef.details`). Make `/api/sources` and `/api/health` operator-only and add a provider-free status. Serve a v2 chapter list with no `source/sourceId/url/externalIds`. Enable `IMAGE_PROXY` in production. Use the expensive rate class for `/api/v2/chapter`. Use a shared or edge rate limiter. Restrict `CORS_ORIGINS` and make `proxy/html` follow it. Stream-cap `proxy/html`. Verify the client IP through the rewrite. Validate `title` before the proxy check.
- **QUILL**: remove provider names from the title page (picker, header line, row meta, Source row, version sheet). Use canonical `/title/<id>` and `/read/<id>/<n>` routes, with redirects from the old ones. Remove `s`/`v`/`u` params. Build share links from the canonical path. Use `og:image` through `coverSrc`. Add `referrerPolicy="no-referrer"` on reader images. Stop `useSources` in Reader and TitlePage. Skip `api.report` in Incognito. Add a scrubber focus style. Check `.rd-rate-btn` is at least 44px.
- **COMPASS**: update `titlePath`/`readerPath` callers after QUILL's route change. Add search and library-find focus styles. Make `.chip`/`.chip-lg`/`.lib-find` at least 44px on coarse pointers.
- **HEARTH**: in Incognito, skip `cacheTitles` for viewed titles and do not persist `title`/`chapters`. Add `dawghwa.unreadable` to the denylist. Add an Incognito no-write test. Migrate legacy `dawghwa.pos.<chapterId>` keys. Plan a v3 migration to canonical keys (bookmarks, progress, comments). Remove provider fields from the export file.
- **FORGE**: `.btn-sm`/`.segmented` coarse-pointer sizes. Media-query parity in `base.css`. Landing auto-scroll should honour the in-app setting. `.input` focus outline. App CSP. Decide with /root on the About/Landing credits wording versus license obligations.
- **SPARK, ORACLE**: nothing found. Rewards and intel already return early in Incognito.
