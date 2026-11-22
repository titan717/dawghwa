# Asura Scans (existing API provider `asurascan`)

Site: asurascans.com ("Asura Scans", contact by email). Endpoints in use: `/browse?search=…`, `/comics/<slug>`, chapter pages.

Checked 2026-11-22 by SCOUT (cycle 1) from the agent sandbox. Plain HTTPS GETs, one fixed ordinary browser user agent for every host (never changed), no cookies, no login, ≥1.5 s between requests to the same host, stop at the first 403/challenge. Raw responses were inspected locally and are not committed; nothing from the site (text, markup, styles, images) is reproduced here beyond short quoted robots.txt directives.

## Gates

| Gate | Result |
|---|---|
| 1 Site/operator/endpoints | pass — site, self-named operator, endpoints identified |
| 2 Terms | FAIL — terms forbid scraping or copying content without permission and the use of bots/scripts/automation to abuse the service |
| 3 robots.txt | pass for used paths — `Allow: /`; disallows `/api/`, login/register/settings/bookmarks/history/notifications; no content signals |
| 4 Access | pass (3 × 200, no challenge) |
| 5 Politeness | pass (handful of requests, ≥1.5 s apart) |
| 6 Original code | n/a |
| 7 Quality | from PR #32 (not re-run): strong manhwa coverage, e.g. Solo Leveling 201, ORV 312, Greatest Estate Developer 223 |
| 8 Reliability | not run this cycle |

**Verdict: disabled by gates (gate 2 fail) — recommendation only, no config change made**

## Terms summary (own words)

- `/terms-of-service` (updated April 2026): lawful use only. No unauthorized access, no disruption, no malware, **no scraping or copying of content without permission**, and no bots or automation used to manipulate or abuse the service. The site says it doesn't own the original works. Some features are premium.
- `/dmca`: a standard DMCA notice and counter-notice process with a repeat-infringer policy and an email agent.
- Why FAIL: Dawghwa's adapter reads pages automatically without permission.
- Gate 7 source: [PR #32](https://github.com/titan717/dawghwa/pull/32), `docs/research/providers-2026-11.md` (branch `agent/p4-provider-research`, run 2026-11-22 ~14:24–14:29 UTC).


## Evidence (gate 9)

| URL | HTTP | Time (UTC) | cf-ray | Result |
|---|---|---|---|---|
| https://asurascans.com/robots.txt | 200 | 2026-11-22T15:43:00Z | a5e90c1978fce06b-IAD | page served |
| https://asurascans.com/terms-of-service | 200 | 2026-11-22T15:43:01Z | a5e90c239e7e4967-IAD | page served |
| https://asurascans.com/dmca | 200 | 2026-11-22T15:43:03Z | a5e90c2ee9c5aa23-IAD | page served |
