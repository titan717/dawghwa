# SHIELD audit, cycle 0 baseline (2026-11-23)

Target: production, https://dawghwa.vercel.app (app main 5efc0d1) and https://dawghwaapi.vercel.app (api main 0dd3ca0).
Follows docs/SHIELD_AUDIT_C2.md. Raw reports: docs/audit/shield-c0/.

## Tools added

| Script | What it checks | Gate |
|---|---|---|
| `node scripts/audit/leaks.mjs <url>` | Visits all static routes plus a discovered title and chapter. Scans URLs, request URLs and bodies, response headers and bodies, every JS chunk (and its sourcemap if one is served), `/sw.js`, manifest, robots, sitemap, rendered DOM text and attributes, localStorage, sessionStorage, IndexedDB keys and values, CacheStorage keys. Matches against `docs/providers/_names.json` (falls back to terms taken from `docs/providers/*.md` until SCOUT ships it). | 0 matches |
| `node scripts/audit/axe.mjs <url> [--widths ..] [--themes ..]` | axe-core WCAG 2.0/2.1 A+AA on every route, title and reader, every viewport and theme | 0 serious or critical |
| `node scripts/audit/incognito.mjs <url>` | Snapshots IDB row counts and contents plus localStorage, turns on Incognito, browses title, chapter, search, library, history, achievements, then diffs. | No IDB change, no localStorage change outside `dawghwa:settings`, `dawghwa:library-view`, `dawghwa:entered` |
| api `src/tests/v2/shield-adversarial.test.ts` | Token tamper (every bit flipped, swapped signatures, wrong secret, garbage), expiry, SSRF through a validly signed token (private, loopback, metadata, IPv6, encoded hosts, DNS rebinding, redirects), rate limit abuse, no cookie or auth forwarding, no spoofed headers | All pass with mocks only |

All scripts accept `--out <dir>` and write JSON + Markdown.

## Baseline results

| Check | Result |
|---|---|
| Leak audit, 390 px dark | FAIL: 129 match locations (bundle 7, request 7, response 78, DOM 20, URL 3, storage 14). 15 pages, 1033 requests, 476 bodies, 70 chunks, 0 sourcemaps served. Browser talks only to its own origin plus the API host. |
| axe, 390 and 1440, dark and light | PASS: 52 runs, 0 violations of any impact |
| axe, 360, 412, 768, 1024 | See docs/audit/shield-c0/ if present; otherwise not run in C0 (shared queue time) |
| Incognito boundary | FAIL: IDB `titles` 305 -> 461 rows (156 added, others rewritten), IDB `kv` `rq:REACT_QUERY_OFFLINE_CACHE` rewritten; warning: CacheStorage `covers` +32 entries. Flag stayed on. |
| API adversarial tests | 30 pass, 2 expected failures (`it.fails`) that document S0-1 and S0-6 |

## Findings

| ID | Severity | Finding | Evidence | Owner |
|---|---|---|---|---|
| S0-1 | High | Image proxy spoofs headers: `pageImageHeaders()` in api `src/lib/services/page-image.ts` sends a provider Referer, a forged Origin for one provider, and the default upstream UA (`src/lib/core/config.ts:133`) is a Chrome browser string. Breaks Spec H and section 14. Reported by JUDGE. | `shield-adversarial.test.ts` "no spoofed headers" (`it.fails`) | RELAY (c1). SHIELD verifies: the two `it.fails` must become `it` and pass. |
| S0-2 | High | Client hard-codes a catalogue source id: `BROWSE_SOURCE` (`src/lib/query.ts`, `src/lib/search/run.ts:9`), `CATALOG_PROVIDER` (`src/lib/api/catalog.ts:24`, sent as `/api/catalog?provider=` and `/api/catalog/filters?provider=`), provider links and names in `About.tsx`. Ships in the index, Search and About chunks and in request URLs. Reported by COMPASS. | leaks report rows "bundle" and "request" | RELAY: neutral browse endpoint (`/api/v2/browse`, no provider param, opaque refs). COMPASS/QUILL: switch client. FORGE: neutral About copy. |
| S0-3 | High | API responses carry provider identity: `/api/catalog` items have `provider`, `ref` `<provider>:<uuid>`, provider `url` and cover URLs; `/api/catalog/filters` has `attribution`; `/api/sources` lists providers; `/api/pages` returns provider image hosts; chapter lists name other providers. | 78 response rows | RELAY (v2 shapes with opaque ids and signed image tokens) |
| S0-4 | High | Routes and image URLs expose provider: `/title/<provider>/<id>/…`, `/read/<provider>/…?s=<provider>`, `/api/image?url=<provider host>&source=<provider>`. | URL and request rows | COMPASS/QUILL (routes on opaque ids), RELAY (token image URLs) |
| S0-5 | Medium | Service worker cover cache rule names a provider image host (`/sw.js`, images chunk). | bundle rows | FORGE/QUILL: cache by `/api/v2/img/` prefix only |
| S0-6 | Medium | Rate limit key trusts the first `X-Forwarded-For` entry; rotating a spoofed value gives a fresh bucket each request. | `shield-adversarial.test.ts` "XFF rotation" (`it.fails`) | RELAY: key on the platform address (`x-real-ip` / last trusted hop) |
| S0-7 | Medium | Local storage holds provider identity: IDB `titles`, `progress`, `events`, `intel` keys `<provider>:<uuid>`, `progress.sourceId`, persisted query cache `"source":"<name>"`. | storage rows | HEARTH: migrate to opaque ids |
| S0-8 | Medium | Title page DOM lists provider names in the source picker ("Not on this source"). The placeholder deny-list catches only some of them; the full list from SCOUT will catch more. | DOM rows | COMPASS/FORGE: neutral labels ("Source 2") or hide |
| S0-9 | Low | `sessionStorage["react-router-scroll-positions"]` keeps visited paths during Incognito. Not persisted across sessions but still a trail. | incognito report | HEARTH: skip scroll restoration storage in Incognito |
| S0-11 | High | Incognito writes to IndexedDB: browsing caches title metadata into `titles` and the persisted query cache into `kv`; the cover cache also grows. Matches C2 I1 and I2, still open. | docs/audit/shield-c0/incognito-prod.md | HEARTH: skip title cache writes and query persistence while Incognito is on; FORGE: no cover caching in Incognito |
| S0-10 | Info | Placeholder deny-list misses the short alias in `dwg:md:` ids and the API's internal slugs. Gate is only as good as `docs/providers/_names.json`. | lib.mjs | SCOUT |

Carried from C2 and still open: provider slugs in routes, `/api/sources`, IDB keys, service worker cover rule (S0-3 to S0-7 above).

## Research

docs/research/security-guidance.md: Google Play UGC and account deletion rules, OWASP guidance for the image proxy (SSRF), comments (XSS) and profile links, with test lists SHIELD will run in cycle 1.

## Cycle 1 plan

On each relevant PR (preview URL): leak audit, axe on all six widths and both themes, Incognito boundary, token tamper and SSRF tests, XSS payloads for comments and bio, rate-limit abuse against mocks. Result goes to WARDEN as PASS/FAIL.
