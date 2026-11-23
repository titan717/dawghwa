# Swipe cards (taste quiz)

Owner: HEARTH (UI), ORACLE (logic `src/lib/intel/quiz.ts`). Research: `docs/research/motion-and-a11y.md` section 6 (WCAG 2.5.1 pointer gestures, 2.5.7 dragging).

## Layout (phone first)

- Top row: "Skip quiz" text button right (44px), progress left: visible text "4 of 12" (Small `--ink-2`) plus a 4px bar (`--accent-text` fill on a `--surface-2` track with a 1px `--control-line` outline), bar `aria-hidden`.
- Card stack: the top card plus the edge of the next one (scale 0.96, `--surface-2`). Card width `min(80vw, 320px)`, cover 2:3 `--radius`, title (Body 600, 2 lines) and one meta line (Small `--ink-3`: format + top genre) BELOW the cover, never over the art.
- Decision row under the card: four equal buttons, 48px, icon + visible label, all `--surface-2` (equal choices, no green): "Not for me" (down arrow icon), "Skip" (left), "Like" (right), "Loved it" (up). On 360px labels stay on one line at Small size; on 320px wrap to 2x2 grid.
- Under the row: "Undo" (icon + text, hidden until there is something to undo) and, on fine pointer only, the hint "Use the arrow keys, or Z to undo" (Small `--ink-3`).
- Desktop: same column centred, max width 480px.
- The only green fill is "Done" (appears after 5 answers, sticky bottom) and "Continue" on results.

## Gestures

- Pointer drag on the top card: `translate3d(dx, dy, 0) rotate(clamp(-8deg, dx * 0.05deg, 8deg))`, with `touch-action: none` on the card only (page still scrolls elsewhere).
- Decision when release distance > 30% of card width (horizontal) or 25% of card height (vertical), or velocity > 0.5 px/ms. Otherwise spring back over `--dur` `--ease-out`.
- While dragging past half the threshold, a stamp shows the decision as text ("Like", "Skip", "Loved it", "Not for me") with its icon, top of the card, on `--on-art-scrim`. Never colour-only tinting.
- Fly-out: translate to `var(--swipe-fly)` in the decision direction over `--dur`, then the next card. Reduced motion: no drag rotation, no fly-out (instant swap); drag still works but the card snaps.
- Haptic tick on decision via `haptic()` (respects settings).

## Keyboard and AT

- The deck region (`role="group"`, `aria-label="Taste quiz"`) is focusable; arrow keys and Z work only while focus is inside it. Buttons always work by Tab/Enter.
- After each decision focus stays on the pressed button (or the deck), not lost to body.
- Polite announcement per decision: "Liked Solo Rise. 5 of 12." On undo: "Undid. 4 of 12."
- Card has `aria-label` "Title, format, genre" via its visible text, cover `alt=""` (title is next to it).

## States

- Loading pool: one card-shaped `Skeleton` + disabled-looking row (real buttons `aria-disabled="true"` with "Loading cards" status).
- Pool too small (< 10 cards or < 6 genres): fall back to genre tiles step (no error shown).
- Incognito: `IncognitoNotice` banner above the deck with "Incognito is on, so the quiz won't learn."
- End: results screen.

## Results

- `<h1>` "Your taste" (Display), small mascot reaction (static under reduced motion).
- Top 5 genre bars: label left (Body), value right as text ("38%"), bar 8px `--accent-text` on `--surface-2` with 1px `--control-line` outline, `--radius-full`. A list (`<ol>`), not a chart image.
- Inline reward line if SPARK exposes it: "+30 XP · Taste Tester badge" (Small `--lavender-text`).
- Actions: "Continue" (green, the only one), "Share my taste" (secondary, only if share exists), "Retake" text button.
