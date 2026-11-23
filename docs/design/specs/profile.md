# Profile, quests and badges

Owners: HEARTH (Profile screen), SPARK (quests, badges, XP).

## Profile screen

- Header: avatar 72px (`--radius-full`, `--surface-2` with initial in `--ink`, or the chosen cosmetic frame), name (Display), level line "Level 5 · 340 XP to level 6" (Small `--ink-2`), XP bar 8px `--lavender` on `--surface-2` with 1px `--control-line` outline (bar `aria-hidden`; text carries the value).
- Stats row: three equal cells (Streak "7 days", Chapters "128", Badges "9"): number Heading 700, label Small `--ink-3`. Hidden values with Rewards off show only Chapters.
- Sections, in order: Quests (weekly card), Badges (grid), Profiles (switch, add, PIN, hidden titles), Settings row (gear, chevron), Back up and restore link to Settings.
- Incognito on: stats and quests show "Paused in Incognito" (Small `--ink-3`), not hidden silently.
- Rewards off: quests and badges sections hidden; the rest stays.

## Weekly quest card (Home and Profile)

- `--surface`, `--radius`, 16px padding, max 120px tall at 360px. Kicker "This week" (Label), title Body 600, detail Small `--ink-2`, ring 40px (`--lavender` stroke on `--surface-2` track with `--control-line`), "+50 XP" Small `--lavender-text`.
- Action is secondary (`--surface-2`, 44px). Link "1 of 3 done · All quests" with a 44px hit area.
- Done: ring full, copy "All 3 quests done this week". No confetti outside the reward beat.

## Badges

- One SVG shield path, 64px on Profile (grid auto-fill 88px cells, 16px gap), 40px inline.
- Earned: fill `--tier-1/2/3`, icon `#000`, tier numeral ribbon `#000` text (light tier-1 `#626262` with `#fff`). Shield vs page >= 3:1 (verified in README table).
- Locked: `--surface-2` fill, 1px `--control-line` stroke, icon silhouette `--ink-3`, plus visible text "Locked" or progress "2 of 5" under the name (not colour only).
- In progress: outline stroke `--accent-text` 3px with `pathLength=1` dash showing progress; static under reduced motion.
- Each badge is a button (44px+) opening a detail sheet: name, how to earn, progress text, date earned.
- Earn beat: the only place for `--grad-brand` and spring motion; reduced motion shows a static badge + toast.
