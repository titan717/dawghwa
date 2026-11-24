# <Display name> (<candidate | existing provider>)

Site: <canonical domain>, operator <name as stated, or "unnamed">

Checked <YYYY-MM-DD> by <agent> (cycle <N>). Honest user agent `DawghwaBot/1.0 (+https://dawghwa.vercel.app/bot)`, no cookies, no login, at least 1 s between requests to the same host, stop at the first 401, 403 or challenge. Nothing from the site (text, markup, styles, images) is reproduced here beyond short robots.txt directives.

## Gates (MASTER_PROMPT section 11)

| Gate | Result | Evidence |
|---|---|---|
| 1 Terms | pass / FAIL / not run | terms URL, date read, one-line summary |
| 2 robots.txt | pass / FAIL / not run | paths needed and allow/disallow; content signals |
| 3 Rights and takedowns | pass / FAIL / not run | DMCA or rights contact URL; excluded titles |
| 4 Access without circumvention | pass / FAIL / not run | statuses seen; any block and when |
| 5 Rate and politeness | pass / FAIL / not run | requests, min interval, Retry-After seen, cache headers, projected daily volume |
| 6 Quality (12+ titles) | pass / FAIL / not run | runner report section |
| 7 Reliability (3 runs, 6 h apart) | pass / FAIL / not run | run dates, success rate, median page-list latency |
| 8 Hidden-source compliance | pass / FAIL / needs evidence | leak audit run link and result |
| 9 Offline permission | offlineAllowed: true / false | the clause or its absence, in own words |

**Verdict: <enabled | disabled | blocked> (<gate that decided it>)**. Re-check after: <date>.

## Terms summary (own words)

- ...

## robots.txt

- Groups that apply: ...
- Paths needed by an adapter: ...
- Content signals or AI-use lines: ...

## Public structure (own words)

- Catalog, title, chapter list, page images: page types or endpoints and the data shape, no pasted bodies.
- Caching and rate-limit headers: ...
- How several sources or groups appear for one title: ...

## Evidence

| URL | HTTP | Time (UTC) | Notable headers | Result |
|---|---|---|---|---|

## Runner report

<paste the markdown from `npm run gate:provider` here, or "not run: stopped at gate N">
