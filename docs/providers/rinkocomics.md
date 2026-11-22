# RinkoComics (candidate)

Site: rinkocomics.com, operator "Rinko Comics" (no legal entity or address given; support via Discord)

Checked 2026-11-22 by SCOUT (cycle 1) from the agent sandbox. Plain HTTPS GETs, one fixed ordinary browser user agent for every host (never changed), no cookies, no login, ≥1.5 s between requests to the same host, stop at the first 403/challenge. Raw responses were inspected locally and are not committed; nothing from the site (text, markup, styles, images) is reproduced here beyond short quoted robots.txt directives.

## Gates

| Gate | Result |
|---|---|
| 1 Site/operator/endpoints | pass — site and self-named operator identified; no endpoints chosen |
| 2 Terms | FAIL — terms explicitly forbid bots, scrapers and any automated access/collection, and redistribution |
| 3 robots.txt | pass for public pages — disallows `/wp-json/`, `/search/`, `/?s=`, feeds, `/tag/`, `/author/`, `/comments/`, login/admin; no content signals |
| 4 Access | pass (3 × 200, no challenge) |
| 5 Politeness | pass (handful of requests, ≥1.5 s apart) |
| 6 Original code | n/a — no adapter code written (RELAY's job) |
| 7 Quality | not run (blocked at gate 2) |
| 8 Reliability | not run (blocked at gate 2) |

**Verdict: disabled (gate 2 fail)**

## Terms summary (own words)

- `/terms-of-service/` (effective 2026-11-20): the agreement is with "Rinko Comics" for the site and app. Coins unlock chapters and novels, with a personal read-only licence. All content is said to belong to the rights holders and to Rinko Comics. The user may only read on the service for private, non-commercial use. Prohibited: copying/capturing pages to share elsewhere, redistributing content on any other site or app, and **using bots, scrapers, scripts or any automated means to access, collect or save content**. Pages may carry invisible per-account watermarks.
- No DMCA page was linked from the homepage; none was fetched.
- Why FAIL: an explicit ban on automated access and redistribution.


## Evidence (gate 9)

| URL | HTTP | Time (UTC) | cf-ray | Result |
|---|---|---|---|---|
| https://rinkocomics.com/robots.txt | 200 | 2026-11-22T15:42:58Z | a5e90c0e3a6132d1-IAD | page served |
| https://rinkocomics.com/ | 200 | 2026-11-22T15:43:00Z | a5e90c1ddb493895-IAD | page served |
| https://rinkocomics.com/terms-of-service/ | 200 | 2026-11-22T15:43:03Z | a5e90c31ae3e5414-IAD | page served |
