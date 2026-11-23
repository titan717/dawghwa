# SPARK cycle 1 log (Builder 4: Gamification)

## Done
- Home: a single weekly quest card (`QuestStrip` renders `section.quest-home`), picked by `pickHomeQuest()`. Hidden when Rewards is off, before the store is ready, and in Incognito. Secondary 44px action button, lavender ring, 44px "x of 3 done · All quests" link. Done copy reads "All 3 quests done this week", with no confetti.
- Badges: one SVG shield shape (`Badge.tsx`, `SHIELD_PATH`). Tier fills use --tier-1/2/3, ribbon numerals are #000 (#fff on light tier I), and locked badges show "Locked · x of y" with an --ink-3 silhouette. The progress stroke is --accent-text at 3px on --control-line. No animation.
- Quiz XP: `quiz_done` with `value >= 5` answers (clamped to a finite integer 0–100, otherwise 0) awards +30 XP once ever. XP earned on a day that is already capped is lost (this is in the code comment and in "How XP works"). New single-tier "Taste Tester" badge (lucide `Sparkle`).
- Keeper now counts only favourites that have a non-Incognito `favorite` event.
- Streak edge tests: TZ is set and restored per describe block and the offset is asserted. Covers Kolkata, Kiritimati, Los Angeles and London: midnight, DST, the 300 s rule, the cap at local midnight, a freeze across a week boundary, and ISO W53.
- e2e: Incognito earns nothing (rewards-incognito), plus a quest/badge UI and axe spec (rewards-ui).

## Handoffs
- SignalKind `quiz_done` is added by ORACLE's PR (agent/c1-oracle-quiz), not this one. This code compares strings, so it works in either merge order.
- Home placement: FORGE moves `<QuestStrip />` below the first two rails in agent/c1-forge-hero3d.
- HEARTH: Curator counts collections, and collections still save in Incognito. Proposed a `collection_add` event or Incognito-marked records.
- Shared spec touched: e2e/a11y.spec.ts selector `.quest-strip` changed to `.quest-home`.

## Not done
- Spec L's sqrt level curve was not applied, because it would shift existing users' levels.
