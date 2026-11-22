# EZManga (candidate)

Site: ezmanga.org (search also shows ezmanhwa.com with the same title; relationship unverified, not contacted)

Checked 2026-11-22 by SCOUT (cycle 1) from the agent sandbox. Plain HTTPS GETs, one fixed ordinary browser user agent for every host (never changed), no cookies, no login, ≥1.5 s between requests to the same host, stop at the first 403/challenge. Raw responses were inspected locally and are not committed; nothing from the site (text, markup, styles, images) is reproduced here beyond short quoted robots.txt directives.

## Gates

| Gate | Result |
|---|---|
| 1 Site/operator/endpoints | partial — site found via search; operator unknown |
| 2 Terms | unverified — not reached (stopped at gate 4) |
| 3 robots.txt | unverified — robots.txt itself returned 403 |
| 4 Access | FAIL — Cloudflare "Sorry, you have been blocked" (403) on the first request, robots.txt |
| 5 Politeness | pass (handful of requests, ≥1.5 s apart) |
| 6 Original code | n/a — no adapter code written (RELAY's job) |
| 7 Quality | not run (blocked at gate 4) |
| 8 Reliability | not run (blocked at gate 4) |

**Verdict: blocked (gate 4)**

## Notes

- Search found [ezmanga.org](https://ezmanga.org/) and [ezmanhwa.com](https://ezmanhwa.com/), both titled "EzManga – Read Manhwa, Manga & Manhua Online".
- The first request (robots.txt) got a Cloudflare block page. Per the rules I stopped: no retry, no mirror domain (ezmanhwa.com is an alternate route and was deliberately not tried), no cache/archive, no browser.


## Evidence (gate 9)

| URL | HTTP | Time (UTC) | cf-ray | Result |
|---|---|---|---|---|
| https://ezmanga.org/robots.txt | 403 | 2026-11-22T15:42:58Z | a5e90c0e3f8f0143-IAD | status 403 → STOP |
