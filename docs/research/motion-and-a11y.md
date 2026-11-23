# Motion and accessibility research (PIXEL, cycle 0)

Scope: accessible 3D and tilt, reduced motion, WCAG 2.2 target size and focus, bottom-sheet (modal dialog) accessibility, toasts and status messages, swipe gestures. Time-boxed; summaries are in my own words. All sources accessed 2026-11-23. Anything not tested on a device is marked **unverified**.

Output of this note feeds `docs/design/specs/*.md` and the tokens in `docs/DESIGN.md`.

## 1. Accessible 3D and tilt (Hero3D)

Findings
- Only `transform` and `opacity` can be changed by the compositor alone, skipping layout and paint; anything else (width, top, box-shadow, filter in some engines) costs main-thread work every frame and janks on low-end phones. CSS transitions and animations on those two properties can keep running while the main thread is busy; JS that writes `style.transform` every frame cannot. Source: [web.dev, Stick to compositor-only properties](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count), [web.dev, Animations and performance](https://web.dev/articles/animations-and-performance).
- Each promoted layer (`will-change`, `translateZ(0)`) costs GPU memory; promoting many elements makes scrolling worse, not better. Promote only what moves, and only while it moves. Source: same web.dev articles; [MDN `will-change`](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change) (last resort, toggle from script).
- Animating `filter: blur()` is not reliably composited. The Spec C hero uses a blurred background image; that blur must be STATIC (set once), never transitioned.
- Tilt that follows the pointer is "motion triggered by interaction". WCAG 2.3.3 (AAA) asks that it can be disabled unless essential; the sufficient technique is honouring `prefers-reduced-motion` in CSS and JS (C39, SCR40). Source: [Understanding 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions).
- Parallax and multi-speed or multi-direction movement are known vestibular triggers; a reduced-motion variant should show the 2.5D composition as a still. Source: [WebKit, Responsive design for motion](https://webkit.org/blog/7551/responsive-design-for-motion/).
- Gyroscope tilt: on iOS Safari, `DeviceOrientationEvent.requestPermission()` must be called from a transient user activation (a click or `touchend`, not `touchstart`), on HTTPS; calling it on load rejects. Events also only fire while the document is visible. Source: [MDN requestPermission](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static), [W3C DeviceOrientation spec](https://www.w3.org/TR/2023/WD-orientation-event-20230130/), [Apple developer forum thread](https://developer.apple.com/forums/thread/128376).
- Real text over art: the title must be live text (`h2`), so it is read by screen readers, selectable and translatable. An extruded look via stacked `text-shadow` is paint-heavy if animated; keep the shadow constant and move the element with `transform` only.

Performance cost (estimates, **unverified** until SENTINEL measures on a throttled profile)
| Technique | Cost | Verdict |
| --- | --- | --- |
| CSS `perspective` + `rotateX/rotateY` on 1-2 layers, driven by a CSS var set in a `requestAnimationFrame`-throttled `pointermove` | Composite only; JS cost is one var write per frame | Use |
| Same, with `transition: transform 120ms` smoothing | Composite only | Use |
| Animated `filter: blur()` or `box-shadow` on tilt | Paint per frame | Do not |
| Gyroscope (`deviceorientation`) | ~60 events/s, battery; permission prompt on iOS | Opt-in only, Cycle 2, behind a "Motion effects" setting |
| WebGL / 3D library | Large bundle, GPU | Out of scope (Spec C forbids) |

Recommendation
1. Tilt only on `(hover: hover) and (pointer: fine)` and only when motion is allowed; touch phones get a static layered hero plus swipe (no tilt on touch drag; it fights the carousel swipe).
2. Max rotation 8deg Y, 6deg X (Spec C sketch uses 14/10; that is large for a card filling a phone screen). Reset on `pointerleave`, `blur`, and `visibilitychange`.
3. Throttle pointer handling to one write per animation frame. `will-change: transform` only while the pointer is over the hero.
4. Reduced motion (OS setting OR the app's `[data-reduce-motion]`): no tilt, no ken-burns, no auto-advance, no slide transition (crossfade 0ms), static extrusion kept (it is not motion).
5. Low-end guard: if `navigator.hardwareConcurrency <= 4` AND `deviceMemory <= 4` (where available), treat as reduced for tilt only. **Unverified** as a useful heuristic; SENTINEL to confirm with `scripts/qa/reader-perf.mjs`-style trace.

## 2. Reduced motion patterns

Findings
- `prefers-reduced-motion: reduce` means "remove or replace non-essential motion", not "remove every transition". Spatial motion (translate, scale, rotate, parallax, zoom) is the trigger; opacity and colour changes are generally safe. Source: [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion), [MDN media queries for accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility).
- A modal that fades instead of sliding up still communicates the state change. Source: [OpenReplay, prefers-reduced-motion](https://blog.openreplay.com/prefers-reduced-motion-accessible-animation/).
- Anything that moves automatically for more than 5 seconds (carousel auto-advance, ambient drift) needs a pause control or must not start automatically (WCAG 2.2.2 Pause, Stop, Hide, Level A). Source: [Primer motion guidance](https://primer.style/accessibility/design-guidance/motion-and-animation/).

Recommendation (matches what the codebase already does: `[data-reduce-motion]` from `src/lib/settings.ts` plus the `@media` block in `tokens.css`)
- Every new motion value is a token and is zeroed in BOTH blocks. New tokens added by these specs: `--sheet-travel`, `--toast-travel`, `--tilt-max-x`, `--tilt-max-y`, `--swipe-fly` (see DESIGN.md section 11).
- Under reduced motion: sheets and toasts fade (opacity, `--dur`) with 0px travel; swipe cards fade out instead of flying; reader auto-scroll is user-started and stays allowed (it is the essential function the user asked for), but page-turn slide becomes an instant swap; reward confetti and level-up bounce are replaced by a static card.
- Hero carousel: auto-advance off under reduced motion; otherwise every 7s with a visible Pause button; pauses on hover, focus-within, touch, and when the tab is hidden.
- In JS, read motion through one helper (`reducedMotion()` already exists) and subscribe to changes; never check `matchMedia` ad hoc in components.

## 3. WCAG 2.2 target size and focus

Findings
- 2.5.8 Target Size (Minimum), AA: pointer targets at least 24x24 CSS px, or spaced so a 24px circle centred on each does not touch another target; inline links in text are exempt. 2.5.5 (AAA) is 44x44. Source: [Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- 2.4.11 Focus Not Obscured (Minimum), AA: a focused component must not be entirely hidden by author content such as sticky headers, sticky footers or non-modal overlays. Sufficient technique C43: `scroll-padding` equal to the sticky chrome. Failure F110 is exactly a sticky footer covering the focused element. A proper modal dialog always passes. Source: [Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), [F110](https://www.w3.org/WAI/WCAG22/Techniques/failures/F110).
- 2.5.7 Dragging Movements, AA: anything done by dragging (swipe cards, reorder, sliders) needs a single-pointer, non-drag alternative (buttons, tap on track). 2.5.1 Pointer Gestures, A: path-based gestures (swipe direction) need a single-tap alternative too. Source: [Understanding 2.5.7](https://w3c.github.io/wcag/understanding/dragging-movements), [Understanding 2.5.1](https://w3c.github.io/wcag/understanding/pointer-gestures.html).
- 2.4.7 Focus Visible (AA) requires a visible indicator; 2.4.13 Focus Appearance (AAA) recommends an indicator at least as large as a 2px perimeter with 3:1 change. 1.4.11 Non-text Contrast (AA) needs 3:1 for UI component boundaries and state indicators. Source: [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

Recommendation
- Product target stays 44x44 (DESIGN.md rule 11, matches 2.5.5 AAA). 24x24 is the hard floor for dense secondary controls (chips inside a comment, reaction emoji) and only with 8px spacing. Visual size may be smaller than the hit area (`::before` inset hit area).
- Focus ring: 2px solid `--color-focus` with 2px offset (already the rule). Both themes pass 3:1 against the page (11.7:1 dark, 6.0:1 light, see the token table). On green fills, use an outer ring in `--ink` (offset 2px) so the ring is not green-on-green.
- Focus not obscured: set `html { scroll-padding-top: var(--topbar-h); scroll-padding-bottom: calc(var(--bottomnav-h) + var(--safe-bottom) + 8px); }`. Toasts are placed above the bottom bar and never over a focused field (move up when the keyboard is open, `--keyboard-h`).
- 1.4.11 gaps found in today's tokens (see DESIGN.md section 4.5): search field and off toggles are defined only by a fill that is under 3:1 against the page; green fills on white are 1.53:1. Fix with a new `--control-line` token and text or icon cues, not by changing the green.

## 4. Bottom sheet accessibility

Findings
- APG modal dialog: on open, focus moves inside; Tab and Shift+Tab cycle inside; Escape closes; on close, focus returns to the invoking element (or a logical next element if it is gone). The container is `role="dialog"`, `aria-modal="true"`, named by `aria-labelledby`. Initial focus: usually the first focusable element, but for content-heavy dialogs focus a static element at the top (tabindex -1) so the start of the text is visible; for "message then OK" dialogs focus the OK button. Source: [APG Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [APG modal example](https://wai-website.netlify.app/aria/apg/patterns/dialog-modal/examples/dialog/).
- Native `<dialog>` with `showModal()` gives top layer, inert background (hidden from AT and inoperable), focus move, Escape and focus return for free; do not add a manual trap or `role`/`aria-modal` on top of it. Use `overscroll-behavior: contain` on the dialog and backdrop to stop scroll chaining instead of `overflow: hidden` on body. Source: [MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog), [Chrome modern web guidance, Dialog](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-components/dialog), [W3C technique H102](https://www.w3.org/WAI/WCAG22/Techniques/html/H102.html).
- A visible close button is effectively required; Escape alone is not discoverable. Source: [web.dev, Learn HTML: dialog](https://web.dev/learn/html/dialog).
- Drag-to-dismiss on the grip is a dragging movement, so a Close button is the 2.5.7 alternative.

What the code has today: `src/components/Layer.tsx` `Sheet` is a div with `role="dialog"`, `aria-modal`, a hand-written Tab trap, Escape via `onBack` (`src/lib/platform/index.ts`), focus restore, `body.style.overflow = hidden`. It does NOT make the background inert (screen-reader virtual cursor can leave the sheet), and it hard-codes initial focus to the second focusable element. `Landing.tsx` already uses a native `<dialog>`.

Recommendation
- ONE sheet component. Evolve `Layer.tsx` `Sheet` into the `BottomSheet` of Spec A rather than adding a second one; keep its `onBack` integration (Android back button). Preferred implementation: native `<dialog>` + `showModal()`; acceptable fallback: keep the div but set `inert` on `#root` siblings while open. Either way: no manual trap with `showModal()`.
- Escape and Android back close the topmost sheet only. Backdrop tap closes, except for sheets that need an explicit choice (destructive confirms).
- Initial focus per sheet type is specified in `docs/design/specs/bottom-sheet.md`.

## 5. Toasts and status messages

Findings
- WCAG 4.1.3 Status Messages (AA): status changes must be announced without moving focus, through a live region (`role="status"` polite, `role="alert"` assertive for urgent errors). The live region container must already be in the DOM before the text is inserted, or many screen readers stay silent. Source: [W3C ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22), [Understanding 4.1.3](https://www.w3.org/WAI/WCAG21/Understanding/status-messages), [Sara Soueidan, live regions](https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-1/).
- Auto-dismiss is a time limit (2.2.1). It is acceptable when the same information is available elsewhere on the page (for example, the Incognito icon state); actions offered only in a disappearing toast are a problem. Timers should pause on hover and on focus. Source: [WCAG rules, accessible notifications](https://wcagrules.com/guides/accessible-notifications-and-toasts), [accessibility.build toast guide](https://accessibility.build/guides/accessible-notifications).
- A fixed toast over the focused control fails 2.4.11.

What the code has today: `src/components/Toast.tsx` mounts one `role="status"` container once (good), keeps 3 toasts, 4.5s fixed timer, no pause on hover or focus, an optional action button.

Recommendation: keep the pre-mounted region; add a separate visually hidden `role="alert"` region for errors; 5s for text-only, 8s when there is an action, paused on hover and focus-within; every toast action (Undo) must also exist somewhere else. Detail in `docs/design/specs/toast.md`.

## 6. Swipe cards

Findings: swipe in four directions is both a path-based gesture (2.5.1) and a dragging movement (2.5.7), so every outcome needs a single-tap button; arrow keys give keyboard parity (2.1.1). Haptics (`navigator.vibrate`) are unsupported on iOS Safari (**unverified on device**) and must never be the only feedback.

Recommendation: four always-visible buttons with text labels plus Undo; arrow keys and Z; a polite live region announcing each decision ("Liked Solo Leveling. 9 left."); reduced motion replaces the fly-out with a 0-travel fade. Detail in `docs/design/specs/swipe-cards.md`.

## 7. Open questions (no owner input needed; decided)

| Question | Decision | Reason |
| --- | --- | --- |
| Native `<dialog>` or ARIA div for sheets? | Native `<dialog>` preferred, div + `inert` accepted | Fewer hand-written focus bugs; existing Landing already uses it |
| Gyroscope tilt in Cycle 1? | No. Cycle 2 at the earliest, opt-in | Permission prompt on iOS, battery, vestibular risk |
| Target size floor | 44px product rule, 24px hard floor with spacing | 2.5.5 vs 2.5.8 |
| Toast timer | 5s / 8s with action, pause on hover and focus | 2.2.1 and screen reader reading time |
