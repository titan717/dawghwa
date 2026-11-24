# WEAVER, cycle 1 log

Role: Builder 9, provider skill and adapters.

## Done
- `skills/site-analysis/SKILL.md` (Spec Q): read terms and robots.txt before any other request,
  human pace (one page at a time, 1 req/s at most), stop at 401, 403, CAPTCHA or login wall,
  never copy code, markup, text or assets, write findings in own words to
  `docs/providers/<name>.md` using `references/record-template.md`.
- `references/stop-conditions.md`: what ends a session and what to record.
- API repo (separate PR): gate runner `scripts/providers/gate.ts`, `src/lib/gate/*`,
  `PROVIDER_GATES` wiring (ADR 0002), tests.

## Not done / handed off
- Real provider runs: SCOUT runs the gate runner per candidate after a terms review.
- No provider flag was turned on.
