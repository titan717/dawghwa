# Stop conditions and what to record

| Signal | How it shows | Action | Gate |
|---|---|---|---|
| 401 Unauthorized | status 401 | stop host, verdict `blocked` | 4 FAIL |
| 403 Forbidden | status 403, including on robots.txt or terms | stop host, verdict `blocked` | 4 FAIL |
| Challenge page | `cf-mitigated: challenge` header, a "just a moment" or "checking your browser" title, challenge scripts, DDoS-protection or firewall pages | stop host, verdict `blocked` | 4 FAIL |
| CAPTCHA | any CAPTCHA widget or CAPTCHA vendor domain | stop host, verdict `blocked` | 4 FAIL |
| Login wall | redirect to a sign-in page, or content replaced by a sign-in prompt | stop host, verdict `blocked` | 4 FAIL |
| Hotlink refusal | image requests answered with 403, a placeholder, or a redirect | stop host, verdict `blocked` | 4 FAIL |
| 429 Too Many Requests | status 429, maybe `Retry-After` | wait `Retry-After` (or 2 s, then 4 s); stop after 3 attempts | 5 evidence |
| 5xx | status 500 to 599 | back off as for 429; three failures in a row means stop for today | 7 evidence |
| Terms forbid automation | terms ban bots, crawling, scraping, automated collection or redistribution | stop, verdict `disabled` | 1 FAIL |
| robots disallows a needed path | `Disallow` matching a path the adapter needs, for our UA or `*` | stop, verdict `disabled` | 2 FAIL |

Never try a workaround after a stop: no other user agent, no Referer, no cookies, no headless browser, no proxy, no mirror, no web archive copy. Record the time and the response status, then move on.
