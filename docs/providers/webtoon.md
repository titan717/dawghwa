# WEBTOON (existing API provider `webtoon`)

Site: www.webtoons.com / m.webtoons.com, operated by WEBTOON Entertainment (licensed publisher). Endpoints in use: `www.webtoons.com/en/search?keyword=…`, `m.webtoons.com/api/v1/webtoon/<titleNo>/episodes`.

Checked 2026-11-22 by SCOUT (cycle 1) from the agent sandbox. Plain HTTPS GETs, one fixed ordinary browser user agent for every host (never changed), no cookies, no login, ≥1.5 s between requests to the same host, stop at the first 403/challenge. Raw responses were inspected locally and are not committed; nothing from the site (text, markup, styles, images) is reproduced here beyond short quoted robots.txt directives.

## Gates

| Gate | Result |
|---|---|
| 1 Site/operator/endpoints | pass — operator and endpoints identified |
| 2 Terms | FAIL — Terms of Use forbid unauthorized crawling, scraping or harvesting, and limit content to personal non-commercial viewing |
| 3 robots.txt | FAIL for search — robots disallows `/*/search`, which the adapter's search URL matches; also disallows `/*/*/*/list?title_no=*&page=1`. `m.webtoons.com` robots not checked |
| 4 Access | pass (2 × 200, no challenge) |
| 5 Politeness | pass (handful of requests, ≥1.5 s apart) |
| 6 Original code | n/a |
| 7 Quality | from PR #32 (not re-run): Tower of God 652, Greatest Estate Developer 7 (free episodes), Dandadan 1 (probably a different work) |
| 8 Reliability | not run this cycle |

**Verdict: disabled by gates (gates 2 and 3 fail) — recommendation only, no config change made**

## Terms summary (own words)

- `/en/terms`: WEBTOON grants a limited, revocable, personal, non-commercial licence to view content. Users may not copy, redistribute, display or sublicense it, or bypass protections. Users may not engage in unauthorized crawling, scraping or harvesting, or use other unauthorized automated means to compile information from the services.
- Why FAIL: the content is legitimately licensed, but the terms rule out third-party automated access, and the search path is disallowed in robots.txt. The legal route would be linking out or a partnership, not an adapter.
- Gate 7 source: [PR #32](https://github.com/titan717/dawghwa/pull/32), `docs/research/providers-2026-11.md` (branch `agent/p4-provider-research`, run 2026-11-22 ~14:24–14:29 UTC).


## Evidence (gate 9)

| URL | HTTP | Time (UTC) | cf-ray | Result |
|---|---|---|---|---|
| https://www.webtoons.com/robots.txt | 200 | 2026-11-22T15:43:00Z | - | page served |
| https://www.webtoons.com/en/terms | 200 | 2026-11-22T15:43:02Z | - | page served |
