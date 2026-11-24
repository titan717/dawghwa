---
name: site-analysis
description: Assess whether a public reading site may be used as a Dawghwa provider. Use before writing or enabling any provider adapter, when re-checking an existing provider, or when a gate record in docs/providers/ is out of date. Reads terms, rights pages and robots.txt first, observes public behavior at human pace, stops at any access control, and writes the record to docs/providers/<name>.md. Not for building adapters, for bypassing blocks, or for anything that copies a site's code, markup, assets, text or branding.
---

# Site analysis (provider gate evidence)

You are producing evidence for the 9 provider gates (MASTER_PROMPT section 11). The outcome is a record, not an integration. A provider flag (`PROVIDER_<NAME>`) never turns on from this skill; it turns on only after every gate passes, the runner report is attached, and AMIT approves.

## Hard stops (read before any request)

Stop the whole analysis for the host immediately, record what happened, and write the verdict `blocked` when you see any of:

- HTTP 401 or 403, on any URL, including robots.txt and the terms page.
- A CAPTCHA, a "checking your browser" or "just a moment" interstitial, a `cf-mitigated: challenge` header, or any other challenge page.
- A login wall, an age gate that needs an account, or a paywall in front of the content.
- A hotlink refusal on images (403, placeholder image, or a redirect to the homepage).

Then do nothing else on that host. No retry from another route, no mirror, no cache or archive copy, no headless browser, no proxy, no IP rotation, no changed or spoofed headers (User-Agent, Referer, Origin, Cookie). See [references/stop-conditions.md](references/stop-conditions.md).

## Order of work

1. Identify the site. Find the canonical domain and the operator name if one is given. If the domain has mirrors, pick the one the site itself names; never use unofficial mirrors.
2. Terms first. Find and read the terms of use, the DMCA or rights page, and any API terms. Read them in a normal way (one request per page). Decide:
   - Does anything forbid automated access, bots, crawling, scraping, collection or redistribution? If yes: gate 1 FAIL, stop here (no further requests).
   - Is there a working rights or takedown contact (gate 3)?
   - Do the terms explicitly allow offline or saved reading (gate 9)? Only an explicit allowance counts; silent or unclear means `offlineAllowed: false`.
   - No terms page, terms written for another site, or terms you cannot read count as FAIL.
3. robots.txt next. Parse the group for our user agent (`DawghwaBot`) and for `*`; the stricter reading wins. Record `Crawl-delay`, `Content-Signal` and any AI-use lines, and follow them. List the exact paths an adapter would need and mark each allowed or disallowed. Any needed path disallowed: gate 2 FAIL, stop.
4. Observe public behavior, only if steps 2 and 3 pass. Open a few ordinary public pages a reader would open (home, one title page, one chapter page) and note, in your own words:
   - which public endpoints or page types carry the catalog, title, chapter list and page images, and the shape of the data (field names and types are fine; never paste bodies);
   - caching headers (`cache-control`, `etag`, `last-modified`, `age`) and any rate-limit headers or `Retry-After`;
   - how several sources, groups or uploads appear for one title (merged, listed per group, filterable), described in a sentence or two.
5. Hand off to the runner. The 12-title quality run, reliability runs and request accounting are done by `scripts/providers/gate.ts` in the API repo, never by hand. You supply the terms review JSON it needs.
6. Write the record. Copy [references/record-template.md](references/record-template.md) to `docs/providers/<name>.md`, fill every gate with a result and evidence, and add the runner's markdown report when it ran.

## Pace and identity

- At most 1 request per second per host; prefer 2 seconds or more when browsing by hand. Honor `Crawl-delay` and `Retry-After` when they are longer.
- Back off on 429 and 5xx (2 s, 4 s, then stop). Never more than 3 attempts for one URL.
- Identify honestly with `DawghwaBot/1.0 (+https://dawghwa.vercel.app/bot)`. Do not pose as a browser, do not send cookies, do not log in, do not create accounts.
- Keep the total small: the manual part of an analysis is normally under 15 requests per host.

## Never copy

- Do not copy, paste, commit or reproduce a site's source, markup, CSS, scripts, images, logos, fonts, text or branding. This includes test fixtures: fixtures are synthetic data you write yourself.
- Summarize terms in your own words with the URL and the date you read them. Quote nothing except short robots.txt directives, which are configuration, not prose.
- Do not store raw responses in the repo. Keep only the evidence table (URL, status, time, notable headers).

## Hidden sources

The record lives in docs only. Provider names, domains and source ids never go into app code, API responses, errors, links, release notes or user-visible copy.

## Output checklist

- [ ] `docs/providers/<name>.md` exists and follows the template.
- [ ] Every one of the 9 gates has pass, FAIL, not run (with the reason), or needs evidence.
- [ ] Evidence table lists every request made: URL, HTTP status, UTC time, notable headers.
- [ ] Verdict is one of `enabled` (all 9 pass, runner report attached), `disabled` (a terms, robots, rights or quality gate failed) or `blocked` (stopped at an access control).
- [ ] A re-check date is set for any non-enabled verdict.
- [ ] `docs/providers/README.md` table row added or updated.
