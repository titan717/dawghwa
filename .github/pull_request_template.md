<!--
Title: c<N> <AGENT>: <summary>   (base branch: agent/cycle-<N>, never main)
Paste REAL command output. "Passes locally" without output does not count (MASTER_PROMPT section 7).
-->

## Summary

## Why
<!-- Link the approved design note: docs/design-notes/<agent>-c<N>.md -->

## Changes per repo
- app (titan717/dawghwa):
- api (titan717/dawghwa.api):

## Tests run
<!-- Paste the real output (tail is fine) for each gate that applies. Mark N/A with a reason. -->

| # | Gate | Result |
|---|------|--------|
| 1 | `npm run typecheck` | |
| 2 | `npm run lint` | |
| 3 | `npm test` | |
| 4 | `npm run build` | |
| 5 | `npx playwright test <specs>` (mobile + desktop) | |
| 6 | `e2e/bottom-nav.spec.ts` | |
| 7 | axe (light and dark) | |
| 8 | `node scripts/audit/leaks.mjs <preview-url>` | |
| 9 | Incognito boundary | |
| 10 | API `npm test` | |
| 11 | Lighthouse / bundle size | |
| 12 | `scripts/qa/screens.mjs` visual diff | |
| 13 | `npm run eval:replay` | |
| 14 | JUDGE review, SHIELD sign-off | |

<details><summary>Output</summary>

```text

```

</details>

## Screenshots
<!-- Before / after at 390 and 1440, light and dark. File paths or uploaded links. -->

## Could not verify
<!-- Every gate that could not run, with the reason. -->

## Flags and env vars needed
<!-- FEATURE_* / IMAGE_PROXY / PROVIDER_*; state the default (OFF) and what the owner must set. Never paste secrets. -->

## Links
- Design note:
- Vercel preview:
- CI run:

## Checklist
- [ ] Base branch is `agent/cycle-<N>`
- [ ] Conventional Commits, each with the `Co-authored-by: Perplexity <noreply@perplexity.ai>` trailer
- [ ] No secrets, no provider or source names in client code, links, copy or logs
- [ ] New logic has tests; no new dependency without JUDGE approval
- [ ] Log written to `docs/loop/<agent>-c<N>.md` (not LOOP_STATE.md)

<sub>Created with [Perplexity](https://www.perplexity.ai/computer/tasks/fdef2d8e-d76d-4e6e-a795-103a46922127)</sub>
