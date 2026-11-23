# SPARK cycle 1 design note: light quest card, shield badges, quiz XP, streak edge cases (Spec L)

Owner: SPARK (Builder 4, gamification). Branch `agent/c1-spark-gamification`, PR into `agent/cycle-1`.
Reviewers: PIXEL (UI: quest card, badge shield), JUDGE (logic: quiz XP, anti-farming).

## What already exists (read before writing this)

Most of Spec L is already on main, all derived from the per-profile event log (never stored, so it travels in export/import and can't drift):

- `src/lib/rewards/progression.ts`: XP ledger (chapter 10, new series 25, new genre 15, series complete 100, quest 50), once per chapter ever, daily cap 300 from 2026-11-23, levels (step 60 + 40 per level), tiers with mascot accessories, 9 tiered achievement sets, genre passport, `gains()` for reward moments.
- `src/lib/rewards/quests.ts`: three seeded weekly quests per ISO week, reproducible from the log.
- `src/lib/rewards/streak.ts`: local-day streak, finished chapter or 5 min `read_time`, one freeze per ISO week, `earns()` filters Incognito-tagged events. Tests cover the freeze and one DST change (New York, fall back).
- `src/lib/rewards/runtime.ts`: reward moments; returns early in Incognito. `signal()` in `store/user.ts` writes no event at all in Incognito.
- UI: `QuestStrip` on Home (three rows), `Achievements` route (level card, tier ladder, quests, streak card, badges, cosmetics, recent XP), `Badge` (round medallion with a lock icon when locked).

Spec L's sketch (`advance()`, `levelForXp` sqrt curve) is NOT pasted: the existing derived quest book and level curve already cover it, and changing the curve would move existing users' levels. Kept as is.

## Goal (cycle 1, light versions)

1. One weekly quest card on Home instead of the three-row strip (DESIGN_REVIEW_C2 #11: the strip pushes Top Picks below the fold).
2. Badge gallery in one consistent shield shape, locked badges as silhouettes.
3. Quiz XP and the "Taste Tester" badge, hooked to ORACLE's quiz events and HEARTH's results screen.
4. Streak edge-case tests: timezones east and west of UTC, midnight boundaries, both DST directions.
5. e2e: Incognito earns nothing (no events, XP, streak, quest progress).

## Acceptance criteria

Quest card (Home)
- Exactly one card, `section.quest-card-home` labelled "This week's quest". It shows the most useful quest of this week: the unfinished one closest to done (ties: the order of the book); if all three are done, a done state ("All 3 quests done this week") with the reward.
- Contents: small kicker "This week", quest title, one-line detail, progress ring (`ProgressRing`, tone quest), "+50 XP", one action button (the quest's own link), and a "1 of 3 done · All quests" link to `/achievements#quests`.
- Hidden when Rewards is off, while the store isn't ready, and in Incognito (it can't progress there).
- Keeps the export name `QuestStrip` (mounted by Home) so FORGE's Home file needs no import change. Placement below the first two rails is FORGE's call in Home.tsx (handoff, see Risks); I do not edit Home.tsx.
- Height at 360px: one card, at most ~120px. Tap targets 44px. axe 0 serious/critical, light and dark.

Shield badges (Achievements)
- `Badge` renders one SVG shield path for every badge (same viewBox, same path), no circles.
- Earned: filled shield in the tier tone (I bronze-ish neutral, II, III use existing tokens only: `--surface-2`, `--accent`, `--lavender`), the set icon in the face, the tier numeral in a small ribbon at the bottom.
- Locked: the same shield as a flat muted silhouette (`--surface-2` fill, `--line` stroke), the set icon drawn as a darker silhouette (no lock glyph), full-contrast name and hint text so it reads as a goal, not a disabled control.
- Progress toward the next tier: the shield outline is a stroke drawn with `pathLength=1` and `stroke-dasharray`, so the ring idea follows the shield shape. Maxed badges have no progress stroke.
- Screen-reader text unchanged ("Locked." / "Tier N of M.") plus the hint. Reduced motion: no stroke animation.

Quiz XP and Taste Tester
- New event kind `quiz_done` emitted once at the quiz results screen through the existing `signal()`: `signal("quiz_done", undefined, "quiz", { value: answeredCount })`. Per-card answers stay ORACLE's `quiz` events (I don't read their payload).
- XP: `XP.quiz = 30`, awarded once per profile, ever, on the first `quiz_done` with `value >= 5` answered cards (skipping out early with fewer earns nothing; retuning later earns nothing more, so the quiz can't be farmed). Still inside the daily cap.
- Badge: a new single-tier set "Taste Tester" ("Finish the taste quiz"), goal [1], same rule as the XP. Shield icon: lucide `Sparkle`/`Wand` style icon already in the bundle.
- Reward moment: the quiz results screen can call `setRewardSink` like the reader end panel, or let the default card show "Taste Tester badge" + "+30 XP".
- Incognito: `signal()` already writes nothing, so no XP and no badge; HEARTH shows "The quiz doesn't learn in Incognito".
- Added to `RELEVANT` in `runtime.ts` and to "How XP works".

Streak edge cases (Vitest, `streak.test.ts`)
- Run the suite under several `process.env.TZ` values: `Asia/Kolkata` (UTC+5:30, the owner's zone), `Pacific/Kiritimati` (UTC+14), `America/Los_Angeles`, `Europe/London`.
- Midnight: a read at 23:59:59.999 and one at 00:00:00 the next local day count as two days; two reads either side of UTC midnight but on the same local day count as one (Kolkata 05:00 local is UTC midnight).
- DST spring forward (US 2026-03-08, EU 2026-03-29, 23-hour day) and fall back (2026-11-01, 2026-10-25): no double count, no skipped day.
- Freeze across an ISO week boundary (missed Sunday covered by that week's freeze; a missed Monday uses the new week's freeze), and year boundary (ISO 2026-W53 exists: Dec 28 2026 to Jan 3 2027).
- `read_time` summing to exactly 300 s across two events on one day counts; 299 s doesn't; time split across midnight does not combine.
- XP daily cap uses the same local day (cap resets at local, not UTC, midnight). Quest weeks start local Monday 00:00 across DST.

Incognito earns nothing (e2e, `e2e/rewards-incognito.spec.ts`)
- Fixture-only, no API needed: seed a profile, read XP/level/streak/quest numbers on Achievements and the event row count in IndexedDB; turn Incognito on (the Profile switch today; FORGE's icon button when it lands, matched by role/name `/incognito/i`); trigger earning actions through the app (Like/Hide on a title card served by a mocked `/api` fixture, and the quiz done event if HEARTH's quiz is present); turn it off without reload; assert event row count, XP, level, streak and quest values unchanged, no reward toast shown, quest card hidden while on.
- Unit: `progressionFor` with Incognito-tagged events equals without them (already partly covered; extend to quiz XP and the Taste Tester badge).
- Export and import round trip keeps quiz XP and the badge (they derive from `quiz_done`, which is a normal event row).

## Files to touch (all SPARK-owned)

- `src/lib/rewards/progression.ts` (XP.quiz, quiz ledger entry, Taste Tester set), `index.ts`, `runtime.ts` (RELEVANT, describe copy)
- `src/lib/rewards/streak.test.ts`, `progression.test.ts`, new `src/lib/rewards/edges.test.ts`
- `src/components/Quests.tsx` (single card), `src/components/Badge.tsx` (shield)
- `src/routes/Achievements.tsx` (icon map, "How XP works" line)
- CSS: the quest and badge rules in `src/styles/app.css` (only `.quest-*` and `.badge*` selectors)
- `src/lib/store/user.ts`: one line, add `"quiz_done"` to `SignalKind` (HEARTH owns the file; I will ask HEARTH, or HEARTH/ORACLE add it in their PR; whichever lands first, the other rebases)
- `e2e/rewards-incognito.spec.ts` (new)
- `docs/loop/spark-c1.md`

## API contract

No HTTP API. In-app contract with ORACLE and HEARTH:

```ts
// emitted once by the quiz results screen (HEARTH UI), after ORACLE's per-card `quiz` events
signal("quiz_done", undefined, "quiz", { value: answered /* cards answered, not skipped */ });
```

## Flag

None new. Everything sits behind the existing per-profile "Show rewards" setting and the Incognito guard.

## Risks

- Home.tsx belongs to FORGE: the card must move below the first two rails there. Handoff to FORGE; until then it renders where `QuestStrip` is today, at a third of the height.
- `SignalKind` is in HEARTH's store file; coordinate so only one PR adds `quiz_done`.
- If the quiz doesn't ship this cycle, the XP/badge code is inert (no `quiz_done` events) and harmless.
- Shield redesign changes Achievements screenshots: SENTINEL baseline update with reason "badges moved to shield shape (Spec L)".
- Changing TZ inside Vitest: Node re-reads `process.env.TZ` on set; tests restore it in `afterAll`. The suite does not use a global TZ, so other tests are unaffected.
- Adding a new XP source never lowers anyone's XP; the daily cap still applies.
