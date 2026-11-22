# MangaDex (existing API provider `mangadex`)

Site: mangadex.org / api.mangadex.org (MangaDex, a non-profit site). Endpoints in use: `api.mangadex.org` (search, feed, at-home server), `uploads.mangadex.org/covers`.

Checked 2026-11-22 by SCOUT (cycle 1) from the agent sandbox. Plain HTTPS GETs, one fixed ordinary browser user agent for every host (never changed), no cookies, no login, ≥1.5 s between requests to the same host, stop at the first 403/challenge. Raw responses were inspected locally and are not committed; nothing from the site (text, markup, styles, images) is reproduced here beyond short quoted robots.txt directives.

## Gates

| Gate | Result |
|---|---|
| 1 Site/operator/endpoints | pass — operator and endpoints identified from `dawghwa.api/src/lib/scrapers/mangadex.ts` |
| 2 Terms | unverified — terms unreadable from the sandbox today (challenge). Search snippets show a ToS at `/compliance/terms` (v2026.10.31) and an API acceptable-use policy requiring credit to MangaDex and scanlation groups, but these weren't read on the site, so they aren't relied on |
| 3 robots.txt | unverified — robots.txt also redirected to the challenge |
| 4 Access | FAIL (sandbox) — robots.txt, /compliance/terms and api.mangadex.org/docs/ all 302-redirected to MangaDex's own "Browser verification" page (JS + cookies) |
| 5 Politeness | pass (handful of requests, ≥1.5 s apart) |
| 6 Original code | n/a |
| 7 Quality | from PR #32 (not re-run): 12/12 exact matches but only 5 titles with substantial chapters; licensed titles 0–4 chapters |
| 8 Reliability | not run this cycle |

**Verdict: blocked at gate 4 from sandbox; terms unverified (no config change made)**

## Notes

- Not a Cloudflare page: MangaDex's own edge challenge (`/edge/challenge`). Disclosure: my fetch script only flagged 403s and known challenge text, so it missed this redirect-style challenge. It sent the planned second request to mangadex.org (`/compliance/terms`, 1.5 s after robots.txt) before I reviewed the responses. Both were challenged. After review I sent nothing more to MangaDex hosts, with no retries or alternate routes.
- In PR #32 the live Dawghwa API (Vercel) reached MangaDex fine. The challenge may be specific to this sandbox's IP. That's unverified, and it's not a reason to bypass it.
- Gate 7 source: [PR #32](https://github.com/titan717/dawghwa/pull/32), `docs/research/providers-2026-11.md` (branch `agent/p4-provider-research`, run 2026-11-22 ~14:24–14:29 UTC).
- Recommendation: a human should read the ToS and API acceptable-use policy in a normal browser and record them. Until then gate 2 is unverified. No config was changed.


## Evidence (gate 9)

| URL | HTTP | Time (UTC) | cf-ray | Result |
|---|---|---|---|---|
| https://mangadex.org/robots.txt | 200 (after 302) | 2026-11-22T15:42:58Z | - | redirected to https://mangadex.org/edge/challenge?src=L3JvYm90cy50eHQ (MangaDex "Browser verification" page, JS + cookies required) → treated as challenge, STOP |
| https://mangadex.org/compliance/terms | 200 (after 302) | 2026-11-22T15:42:59Z | - | redirected to https://mangadex.org/edge/challenge?src=L2NvbXBsaWFuY2UvdGVybXM (MangaDex "Browser verification" page, JS + cookies required) → treated as challenge, STOP |
| https://api.mangadex.org/docs/ | 200 (after 302) | 2026-11-22T15:42:58Z | - | redirected to https://mangadex.org/edge/challenge?src=L2RvY3Mv (MangaDex "Browser verification" page, JS + cookies required) → treated as challenge, STOP |
