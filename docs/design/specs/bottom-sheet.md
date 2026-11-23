# Bottom sheet (one component for the whole app)

Owner: FORGE. Evolves `src/components/Layer.tsx` `Sheet` into `BottomSheet`; every builder (reader settings, share, filters, confirm, Incognito, long-press) uses it. No second sheet implementation.

## Behaviour

- Element: native `<dialog>` opened with `showModal()` (top layer, built-in inert background, Escape closes, focus returns to the opener). Fallback if a target lacks it: `div role="dialog" aria-modal="true"` plus `inert` on `#root` siblings.
- `aria-labelledby` -> the sheet title (`<h2>`, Heading size). Optional `aria-describedby` for one line of help.
- Initial focus: the first meaningful control, or the element passed as `initialFocus` (e.g. Cancel in a destructive confirm). Never the close button by default, never the sheet container unless the content is long text.
- Close: Escape, the close button (44px, top-right, `aria-label="Close"`), scrim tap, Android back (existing `onBack` in `src/lib/platform`), and swipe down on the grabber.
- Focus returns to the opener on close. Body scroll is locked (`overflow: hidden` on `html`), with scrollbar-gutter kept to avoid shift.
- Drag: the grabber (36x4 visual, 44px tall hit row) can be dragged down; release past 30% height or fast flick closes. Dragging is never the only way (2.5.7): Close button and Escape always present.

## Layout

- Phone (< 768): full width, anchored bottom, top corners `--radius`, max height `min(92dvh, 100% - var(--topbar-h))`, padding 16px, bottom padding `calc(16px + var(--safe-bottom))`. Header row: grabber centred, title left, close right. Body scrolls; footer actions sticky at the bottom with `--surface` background and a top `--line`.
- Tablet/desktop (>= 768): centred dialog, width min(560px, 100% - 48px), all corners `--radius`, max height 80dvh.
- Surface: `--surface` in both themes, `--shadow`, scrim `--scrim`.
- Footer: at most one green fill (the confirming action), secondary grey. Destructive action: `--bad` text on `--surface-2` with a 1px `--control-line` border, never a red fill; focus starts on Cancel.

## Motion

- Enter: `translateY(var(--sheet-travel))` -> 0 over `--dur-slow` `--ease-out`; scrim opacity 0 -> 1 over `--dur`. Exit reverses at `--dur`.
- Reduced motion: travel 0, opacity fade only (or none).

## Incognito button and sheet (Spec A)

- Button in the top bar (phone) / header (desktop): 44px icon button, incognito glyph outline when off, filled when on, `aria-pressed`, visible label on desktop "Incognito". When on, the top bar uses `--incognito-tint` and `IncognitoNotice` shows the banner (`INCOGNITO_COPY`), so the state is never colour-only.
- Tapping opens a BottomSheet titled "Incognito", one line "History, picks and rewards are paused while it's on. Your library stays.", a `.switch` row "Incognito" and a "Done" button (secondary). No green fill except the switch's on state.

## Acceptance

Axe clean with the sheet open; Tab cycles inside; Escape and back close; focus returns; nothing behind is reachable by screen reader; no shift on open; works at 360 with the on-screen keyboard (body scrolls, footer stays visible above the keyboard via `dvh`).
