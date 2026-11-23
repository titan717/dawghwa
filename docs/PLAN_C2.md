# Plan: Cycle 2 (refine, Tier 2 behind flags, final release)

Owner: AMIT. Order: (1) regressions and production findings from Cycle 1, (2) polish from PIXEL scores and SENTINEL/SHIELD findings, (3) Tier 2 behind flags with local adapters. Final release: app `v0.4.0`, API `v1.4.0` (HERALD).

## Fix first
- Every Cycle 1 production failure, PIXEL score under 8, and SHIELD finding of medium or higher. Assigned by AMIT when Cycle 1 production verification completes.

## Tier 2 items
1. Accounts UI behind `FEATURE_ACCOUNTS` with `LocalAuthAdapter` (NOVA) — Spec J. Google + email code flows against the local adapter; delete-account and export; OFF in production until the owner supplies keys and reviews Terms and Privacy. Backend per `docs/adr/0001-accounts-backend.md` (proposal only).
2. Public profiles `/u/<handle>` (NOVA + HEARTH) — validators (`validHandle`, `cleanSocial`), live preview, public/private switch, Incognito never reflected.
3. Comments behind `FEATURE_COMMENTS` with `LocalCommentsAdapter` (NOVA) — threads, spoiler blur, reactions, report, block, rate limits, text-only rendering, posting disabled in Incognito. XSS tests (SHIELD).
4. Notifications inbox (PULSE) — Spec M. Updates, Social, Rewards tabs; unread counts; quiet hours; refresh throttled to 15 minutes via `/api/updates`.
5. Library collections (COMPASS) — Spec O. Mosaic covers, keyboard reorder, migration-safe.
6. Stats dashboard (ORACLE + SPARK) — Spec P. Local only.
7. Richer gamification (SPARK) — streak calendar, level timeline, level-up moment, mascot unlocks.
8. Reader polish (QUILL) — custom tap-zone editor, chapter drawer, pinch zoom, sleep timer fade.
9. Provider health re-check (SCOUT) — only if any provider passed in Cycle 1.

## Stop
After the final release and production verification, AMIT writes `docs/FINAL_REPORT.md` (section 13) and the loop stops. One extra fix cycle only on a production regression.
