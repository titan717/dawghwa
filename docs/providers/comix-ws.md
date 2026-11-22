# comix.ws (candidate)

Site: comix.ws; operator unknown. Not the same as Dawghwa's `comix` source, which is comix.to (see [comix-to.md](comix-to.md)).

Checked 2026-11-22 by SCOUT (cycle 1) from the agent sandbox. Plain HTTPS GETs, one fixed ordinary browser user agent for every host (never changed), no cookies, no login, ≥1.5 s between requests to the same host, stop at the first 403/challenge. Raw responses were inspected locally and are not committed; nothing from the site (text, markup, styles, images) is reproduced here beyond short quoted robots.txt directives.

## Gates

| Gate | Result |
|---|---|
| 1 Site/operator/endpoints | partial — site known; operator unknown |
| 2 Terms | FAIL — /terms unreadable (403), again today |
| 3 robots.txt | not re-fetched this cycle (brief allowed only one request). PR #32 recorded it as `Allow: /` with `search=yes,ai-train=no,use=reference` |
| 4 Access | FAIL — 403 Cloudflare "Just a moment…" challenge on the single /terms request |
| 5 Politeness | pass (handful of requests, ≥1.5 s apart) (1 request) |
| 6 Original code | n/a — no adapter code written (RELAY's job) |
| 7 Quality | not run (blocked at gate 4) |
| 8 Reliability | not run (blocked at gate 4) |

**Verdict: blocked (gate 4); terms FAIL**

## Notes

- One request only, as instructed. It was challenged, so I stopped. No title pages were fetched.
- Earlier (2026-11-22 14:23 UTC) PR #32 got 403 on `/terms` and `/dmca` and read robots.txt in full: [PR #32](https://github.com/titan717/dawghwa/pull/32), `docs/research/providers-comix-ws-terms.md` (branch `agent/p4-provider-research`).


## Evidence (gate 9)

| URL | HTTP | Time (UTC) | cf-ray | Result |
|---|---|---|---|---|
| https://comix.ws/terms | 403 | 2026-11-22T15:42:58Z | a5e90c0e3f324114-IAD | status 403 → STOP |
