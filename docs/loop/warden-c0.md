# WARDEN, Cycle 0

- Verified the old app `agent/cycle-1` was fully contained in main: its tree (31c2365) equals the tree of squash commit a5c2d33, an ancestor of main. Deleted and recreated `agent/cycle-1` from main in both repos (app 5efc0d1, api 0dd3ca0) and told every agent.
- Tooling (this PR): `.github/pull_request_template.md`, `scripts/release/verify-deploy.mjs` (polls the "Vercel" commit status, both repos), `e2e/prod-smoke.spec.ts` (section 9 steps 2 and 3, runs only with PROD_URL), PROD_URL switch in `playwright.config.ts`.
- Research: `docs/research/vercel-limits.md`. Finding handed to RELAY: the v2 image proxy allows 20 MiB pages but Vercel caps buffered responses at 4.5 MB.
- Production smoke baseline 2026-11-23 against https://dawghwa.vercel.app and https://dawghwaapi.vercel.app: 17 passed, 7 skipped (paged reader, Incognito button, Settings not shipped yet; bottom-bar check is mobile only).
