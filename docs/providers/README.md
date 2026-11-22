# Provider gates — cycle 1 (2026-11-22)

Author: SCOUT (provider researcher). Checks ran 2026-11-22 15:42–15:44 UTC from the agent sandbox. Each host got a few plain GETs (robots.txt, the homepage to find legal links, and terms/DMCA), at least 1.5 s apart, with one fixed browser user agent. A host was stopped at its first 403 or challenge, with no retries, mirrors, caches, proxies or browser. No title or chapter pages were fetched in this cycle. No adapter code or config was touched.

Gates: 1 site/operator/endpoints · 2 terms (ToS, DMCA, API terms; unreadable or unclear = FAIL) · 3 robots.txt and content signals · 4 access (any 403/challenge = STOP) · 5 politeness · 6 original code · 7 quality (12+ titles) · 8 reliability · 9 evidence (in each file).

Verdict key: **enabled** = all gates pass · **disabled** = reachable, but a terms/robots/quality gate fails · **blocked** = stopped at gate 4. For existing providers the verdict is a gate result and a recommendation only. Production config is unchanged.

## Candidates

| Candidate | Site / operator | 1 | 2 Terms | 3 robots | 4 Access | 5 | 6 | 7 | 8 | Verdict | Date |
|---|---|---|---|---|---|---|---|---|---|---|---|
| [Lux Manga](lux-manga.md) | luxmanga.net / unnamed (luxmanga.org: no DNS) | partial | FAIL (no terms page) | pass, ai-train=no | pass | pass | n/a | not run | not run | disabled | 2026-11-22 |
| [Eva Scans](eva-scans.md) | evascans.net / unnamed | partial | FAIL (terms name another site, no operator) | pass, ai-train=no | pass | pass | n/a | not run | not run | disabled | 2026-11-22 |
| [Violet Scans](violet-scans.md) | violetmanga.com / "Website Operator" | partial | FAIL (bans crawling/scraping) | pass | pass | pass | n/a | not run | not run | disabled | 2026-11-22 |
| [EZManga](ezmanga.md) | ezmanga.org / unknown | partial | unverified | unverified | FAIL (403 on robots.txt) | pass | n/a | not run | not run | blocked | 2026-11-22 |
| [RinkoComics](rinkocomics.md) | rinkocomics.com / "Rinko Comics" | pass | FAIL (bans bots/scrapers, redistribution) | pass | pass | pass | n/a | not run | not run | disabled | 2026-11-22 |
| [MagusManga](magusmanga.md) | magustoon.org / unknown | partial | unverified | read, `/api/*` disallowed | FAIL (challenge on homepage) | pass | n/a | not run | not run | blocked | 2026-11-22 |
| [Thunderscans](thunderscans.md) | en-thunderscans.com / unnamed | partial | FAIL (terms for another domain; bans scraping) | pass | pass | pass | n/a | not run | not run | disabled | 2026-11-22 |
| [Nyx Scans](nyx-scans.md) | nyxscans.com / unnamed | partial | FAIL (no ToS; DMCA page silent on access/reuse) | pass, `/api/*` disallowed | pass | pass | n/a | not run | not run | disabled | 2026-11-22 |
| [DivaScans](divascans.md) | divascans.org / "DivaScans" | pass | FAIL (bans automated download/scrape; rejects DMCA) | partial, ai-train=no | pass | pass | n/a | not run | not run | disabled | 2026-11-22 |
| [comix.ws](comix-ws.md) | comix.ws / unknown | partial | FAIL (unreadable, 403) | per PR #32: allow, ai-train=no | FAIL (challenge, 1 request) | pass | n/a | not run | not run | blocked | 2026-11-22 |

**Result: 0 of 10 candidates enabled.** Seven were reachable, and all seven failed on terms. Three were blocked.

## Existing API providers (terms and robots re-check only)

Gate 7 is reused from the live-API quality table in [PR #32](https://github.com/titan717/dawghwa/pull/32) (`docs/research/providers-2026-11.md`, 12 titles × 8 providers, 2026-11-22 ~14:24 UTC). It was not re-run.

| Provider | Site / operator | 1 | 2 Terms | 3 robots | 4 Access | 7 (PR #32) | Gate result | Date |
|---|---|---|---|---|---|---|---|---|
| [mangadex](mangadex.md) | mangadex.org, api.mangadex.org / MangaDex | pass | unverified (challenged) | unverified | FAIL from sandbox (own JS challenge) | matches 12/12, readable 5/12 | blocked (sandbox) | 2026-11-22 |
| [mangakatana](mangakatana.md) | mangakatana.com / unknown | partial | FAIL (no terms page) | pass | pass | strong (manga) | disabled | 2026-11-22 |
| [manhuaplus](manhuaplus.md) | manhuaplus.top / unnamed | partial | FAIL (personal non-commercial only) | pass | pass | strong (manhua/manhwa) | disabled | 2026-11-22 |
| [asurascan](asurascan.md) | asurascans.com / "Asura Scans" | pass | FAIL (bans scraping without permission) | pass | pass | strong (manhwa) | disabled | 2026-11-22 |
| [webtoon](webtoon.md) | webtoons.com / WEBTOON Entertainment | pass | FAIL (bans unauthorized crawling/scraping) | FAIL (`/*/search` disallowed) | pass | limited (originals) | disabled | 2026-11-22 |
| [weebcentral](weebcentral.md) | weebcentral.com / unknown | partial | unverified | Crawl-delay 10 | FAIL (challenge) | blocked every title | blocked | 2026-11-22 |
| [flamecomics](flamecomics.md) | flamecomics.xyz / unverified | partial | unverified | FAIL (`/api/` disallowed, used by adapter) | FAIL (challenge) | blocked every title | blocked | 2026-11-22 |
| [comix](comix-to.md) | comix.to / unknown | partial | unverified | unverified | FAIL (403 on robots.txt) | blocked every title | blocked | 2026-11-22 |

**Result: 0 of 8 existing providers pass every gate.** This is for the lead to decide on, and nothing was changed here. MangaDex is the only one where the failure might be environmental: the terms couldn't be read from the sandbox. A human should read its ToS and API acceptable-use policy in a normal browser.

## Other notes

- Unused adapter files already exist in `dawghwa.api/src/lib/scrapers/` for several candidates (divascans, evascans, magustoon, nyxscans, rinkocomics, thunderscans, violetscans). This cycle found none that pass the gates. `violetscans.ts` points at violetscans.org, which differs from the violetmanga.com site found by search. The `api.*` hosts used by the nyxscans and magustoon adapters were not checked.
- luxmanga.net, mangakatana.com and thunderscans.com appear in a Webtoon DMCA subpoena domain list reported by [TorrentFreak](https://torrentfreak.com/webtoon-targets-170-pirate-domains-through-dmca-subpoena-240821/).
- Internal UX notes: [ux-notes.md](ux-notes.md).
