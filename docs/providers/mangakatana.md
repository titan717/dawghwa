# MangaKatana (existing API provider `mangakatana`)

Site: mangakatana.com; operator unknown. Endpoints in use: `/?search=…&search_by=book_name`, `/manga/<slug>.<id>` and chapter pages.

Checked 2026-11-22 by SCOUT (cycle 1) from the agent sandbox. Plain HTTPS GETs, one fixed ordinary browser user agent for every host (never changed), no cookies, no login, ≥1.5 s between requests to the same host, stop at the first 403/challenge. Raw responses were inspected locally and are not committed; nothing from the site (text, markup, styles, images) is reproduced here beyond short quoted robots.txt directives.

## Gates

| Gate | Result |
|---|---|
| 1 Site/operator/endpoints | partial — site/endpoints known; operator unknown |
| 2 Terms | FAIL — no terms, DMCA or legal page is linked from the homepage |
| 3 robots.txt | pass — robots.txt only disallows `ia_archiver`; no content signals |
| 4 Access | pass (2 × 200, nginx, no challenge) |
| 5 Politeness | pass (handful of requests, ≥1.5 s apart) |
| 6 Original code | n/a |
| 7 Quality | from PR #32 (not re-run): strongest manga coverage, e.g. One Piece 1205, Kagurabachi 142, Dandadan 255, Tower of God 653 chapters |
| 8 Reliability | not run this cycle |

**Verdict: disabled by gates (gate 2 fail) — recommendation only, no config change made**

## Notes

- The homepage links out to nothing legal at all (only home, the manga list, and pagination). Terms unreadable = gate 2 FAIL.
- mangakatana.com appears in Webtoon's DMCA subpoena list reported by [TorrentFreak](https://torrentfreak.com/webtoon-targets-170-pirate-domains-through-dmca-subpoena-240821/).
- Gate 7 source: [PR #32](https://github.com/titan717/dawghwa/pull/32), `docs/research/providers-2026-11.md` (branch `agent/p4-provider-research`, run 2026-11-22 ~14:24–14:29 UTC).


## Evidence (gate 9)

| URL | HTTP | Time (UTC) | cf-ray | Result |
|---|---|---|---|---|
| https://mangakatana.com/robots.txt | 200 | 2026-11-22T15:42:58Z | - | page served |
| https://mangakatana.com/ | 200 | 2026-11-22T15:43:00Z | - | page served |
