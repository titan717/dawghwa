# Vercel limits that matter for dawghwa and dawghwa.api

Owner: WARDEN. Accessed 2026-11-23. Summarised in my own words from official Vercel docs; numbers are as published on the pages below (each page's own "last updated" date in brackets). Re-check before relying on a number for a plan decision. Our plan tier is not visible to us (no Vercel login); the Hobby and Pro columns are both listed. The project URLs (`vercel.com/titan717s-projects/...`) suggest a personal Hobby team, but that is **unverified**.

## Sources

| # | Page | URL | Page updated |
|---|------|-----|--------------|
| S1 | Vercel Functions Limits | https://vercel.com/docs/functions/limitations | 2026-08-24 |
| S2 | Limits (platform) | https://vercel.com/docs/limits | 2026-09-16 (published date) |
| S3 | Hobby plan | https://vercel.com/docs/plans/hobby | 2026-11-12 |
| S4 | Fluid compute pricing | https://vercel.com/docs/functions/usage-and-pricing | 2026-06-16 |
| S5 | Streaming | https://vercel.com/docs/functions/streaming-functions | 2026-09-01 |

## Findings

### Function duration (S1, S2)
- Fluid compute (default for new projects). Node.js: Hobby 300 s default and maximum; Pro and Enterprise 300 s default, 800 s maximum, 1800 s in beta.
- The duration includes sending the response, streamed responses included. Over the limit the caller gets `504 FUNCTION_INVOCATION_TIMEOUT`.
- Edge runtime: must start responding within 25 s, may keep streaming up to 300 s.
- Our API sets `maxDuration = 60` on `/api/v2/chapter` and `/api/v2/img/[token]` (pacing wait up to 20 s plus a 12 s upstream timeout). That is well inside the Hobby ceiling.

### Response and request size (S1)
- Response body: 4.5 MB maximum for non-streamed responses. Streamed responses are exempt.
- Request body: 4.5 MB by default (`413 FUNCTION_PAYLOAD_TOO_LARGE` above it); 20 MiB is a beta that needs Pro with 4 GB memory.
- Impact (verified in code at dawghwa.api main 0dd3ca0): `/api/v2/img/[token]` returns a buffered `ArrayBuffer`, and `readCapped` allows up to `PAGE_MAX_BYTES = 20 * 1024 * 1024` (src/lib/services/cover-image.ts). Any page between 4.5 MB and 20 MB passes our cap but would fail at the platform. Long-strip manhwa pages can reach that size. Handoff to RELAY: lower the v2 page cap to about 4 MB (reject with the generic error), or stream the body instead of buffering.

### Streaming (S1, S5)
- Node.js functions can stream; streaming lifts the 4.5 MB response cap but still counts against max duration.
- No extra configuration is needed for Next.js app-router route handlers returning a `ReadableStream`.

### Memory and bundle (S1)
- Memory: Hobby 2 GB / 1 vCPU (fixed); Pro up to 4 GB / 2 vCPU.
- Bundle: 250 MB uncompressed per function (large functions beta up to 5 GB).
- File descriptors: 1,024 shared across concurrent executions in an instance; close upstream sockets (relevant to undici agents in the API).

### Bandwidth and usage allotments (S3, S4)
Hobby monthly included usage (exceeding it can pause the project; a paused Hobby team stays paused until action is taken, visitors see `503 DEPLOYMENT_PAUSED`):

| Resource | Hobby included |
|----------|----------------|
| Fast Data Transfer (CDN to visitor) | 100 GB |
| Fast Origin Transfer (function/origin to CDN) | 10 GB |
| CDN requests | 1,000,000 |
| Function invocations | 1,000,000 |
| Active CPU | 4 CPU-hours |
| Provisioned memory | 360 GB-hours |
| Image transformations | 5,000 |

- Pro has no fixed allowances for CPU, memory or invocations; it is billed on demand against a monthly credit (S4).
- Active CPU excludes time spent waiting on I/O; provisioned memory is billed for the whole time an instance has a request in flight, I/O included (S4).

### Proxied rewrites and platform (S2)
- The app's `vercel.json` rewrites `/api/:path*` to the API host. External rewrites time out at 120 s (`ROUTER_EXTERNAL_TARGET_ERROR`), on every plan.
- Hobby: 100 deployments per day, 100 builds per hour, 45 min build limit, runtime logs kept 1 hour (Pro: 1 day). Every merge to main and every PR preview counts as a deployment, so a busy cycle with ~20 PR branches stays well below 100 per day if branches are not pushed in tight loops.

### Usage reporting
- Usage is shown on the team's Usage page in the Vercel dashboard or with `vercel billing usage` (S4). We have no Vercel login, so the team cannot read usage directly; the owner must read it. Record it under "Could not verify" in cycle logs.
- Deploy state is visible without Vercel access through the GitHub commit status with context `Vercel` (see `scripts/release/verify-deploy.mjs`).

## Recommendations

1. Image proxy: keep each response under 4.5 MB (reject larger upstream images with the generic error), or stream; set long `s-maxage` (already done) so repeated pages are CDN hits and use Fast Data Transfer instead of function invocations and origin transfer.
2. Treat Fast Origin Transfer (10 GB on Hobby) as the tightest budget once `IMAGE_PROXY` is on: every uncached proxied page counts. A rough check before enabling: pages per chapter x average page size x uncached chapter reads per month must stay well under 10 GB. Ask the owner for real usage numbers from the dashboard after the first week.
3. Keep `maxDuration` at 60 s; nothing in the API needs longer, and shorter limits cap provisioned-memory cost on hung upstreams.
4. Avoid pushing agent branches repeatedly in loops to stay within 100 deployments per day on Hobby.
