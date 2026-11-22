# Violet Scans (candidate)

Site: violetmanga.com (search result titled "Violet Scans"). Note: the existing unused adapter file `dawghwa.api/src/lib/scrapers/violetscans.ts` points at violetscans.org, which was not checked.

Checked 2026-11-22 by SCOUT (cycle 1) from the agent sandbox. Plain HTTPS GETs, one fixed ordinary browser user agent for every host (never changed), no cookies, no login, ≥1.5 s between requests to the same host, stop at the first 403/challenge. Raw responses were inspected locally and are not committed; nothing from the site (text, markup, styles, images) is reproduced here beyond short quoted robots.txt directives.

## Gates

| Gate | Result |
|---|---|
| 1 Site/operator/endpoints | partial — site found; operator only called "Website Operator" |
| 2 Terms | FAIL — terms explicitly prohibit spidering, crawling and scraping |
| 3 robots.txt | pass — only `/wp-admin/` disallowed; no content signals |
| 4 Access | pass (4 × 200, no challenge) |
| 5 Politeness | pass (handful of requests, ≥1.5 s apart) |
| 6 Original code | n/a — no adapter code written (RELAY's job) |
| 7 Quality | not run (blocked at gate 2) |
| 8 Reliability | not run (blocked at gate 2) |

**Verdict: disabled (gate 2 fail)**

## Terms summary (own words)

- `/terms-and-conditions/`: a stock template agreement between an unnamed "Website Operator" and the user for violetmanga.com. Its prohibited uses include spamming, phishing, and spidering, crawling or scraping. It says no IP is transferred to the user, and gives no right to reproduce trademarks. The text also contains a stray reference to another site name ("shojoscans"), so it's an edited template.
- `/dmca/`: a standard notice-and-takedown process with counter-notices, by email.
- The page also shows a coin-purchase promotion, so some chapters are paid/locked.
- Why FAIL: an explicit ban on crawling/scraping rules out any adapter.


## Evidence (gate 9)

| URL | HTTP | Time (UTC) | cf-ray | Result |
|---|---|---|---|---|
| https://violetmanga.com/robots.txt | 200 | 2026-11-22T15:42:58Z | a5e90c0e3ccea9d6-IAD | page served |
| https://violetmanga.com/ | 200 | 2026-11-22T15:42:59Z | a5e90c1869125e53-IAD | page served |
| https://violetmanga.com/dmca/ | 200 | 2026-11-22T15:43:02Z | a5e90c271815d6db-IAD | page served |
| https://violetmanga.com/terms-and-conditions/ | 200 | 2026-11-22T15:43:04Z | a5e90c34afceca2b-IAD | page served |
