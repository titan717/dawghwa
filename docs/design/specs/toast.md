# Toast and live regions

Owner: FORGE (`src/components/Toast.tsx`). Everyone else calls `toast()`.

## Regions

- Two regions mounted at app start, before any message: `role="status"` (`aria-live="polite"`) for normal toasts and a visually hidden `role="alert"` for errors that block a task. Inject text into the existing region; never mount a region together with its text (screen readers miss it).
- One shared polite announcer `announce(text)` for non-visual updates ("12 results", "Page 3 of 18"), debounced 500ms, deduped.

## Visual

- Position: bottom-centre above the bottom nav (`bottom: calc(var(--bottomnav-h) + var(--safe-bottom) + 8px)`), above the reader bottom bar in the reader, top-right on desktop >= 1024 below the header. Never covers the focused element (2.4.11) or the primary action of the view.
- Max width 420px, min height 48px, padding 12px 16px, `--radius`, `--shadow`. Dark: `--surface-2` with `--ink` (14.35:1). Light: `--surface` with `--ink` plus 1px `--line`.
- Optional leading icon (status meaning: check, info, alert in `--good`/`--warn`/`--bad` text tones) plus the text; never colour alone.
- Optional single action (text button, `--accent-text`, 44px): "Undo", "Try again", "View".
- Max 2 visible; newest at the bottom; a third replaces the oldest.

## Timing

- `--toast-ms` 5000 for text, `--toast-action-ms` 8000 with an action. Timer pauses on hover, focus within, and when the document is hidden (2.2.1); resumes on leave.
- Errors in the alert region stay until dismissed or the condition clears.
- Every action in a toast is also available elsewhere (Undo hide -> Hidden titles in Settings; Try again -> the page's error state).
- Close button (44px, `aria-label="Dismiss"`) on toasts with actions.

## Motion

Enter `translateY(var(--toast-travel))` + opacity over `--dur`; exit opacity `--dur-fast`. Reduced motion: opacity only.

## Copy

Short past tense or present state, full stop optional: "Link copied", "Added to library", "Removed from picks", "Couldn't save. Try again." No codes, no source names.
