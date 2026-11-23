# Reader controls

Owner: QUILL. Prefs logic in kv `reader:<profileId>`. Sheet uses the shared BottomSheet.

## Chrome

- Top bar (56px + safe-top) and bottom bar (56px + safe-bottom) on `--reader-chrome` (rgb(0 0 0/.85)) with white text and icons in every background mode (15.13:1 worst case over a white page). Chrome is dark even in light theme.
- Top bar: Back (44px), title + "Ch. 12" (Small, 1 line ellipsis), Settings (44px, opens ReaderSheet), overflow (Share, Report, Try another version).
- Bottom bar: Previous chapter, page scrubber (native `<input type=range>`, 44px row, value text "3 / 18"), Next chapter. Paged RTL mirrors the scrubber direction (`dir="rtl"` on the range).
- Show/hide: tap the Menu zone or press M / Escape-free toggle; auto-hide after 3s of no input, never while focus is inside the chrome. Fade `--dur`; instant under reduced motion. Hidden chrome is `inert` + `aria-hidden` so focus can't land in it.
- Keyboard: Left/Right (or swapped in RTL) turn pages, Space/Shift+Space scroll, M menu, S settings, Escape closes the sheet first, then the reader.

## Tap zones

- Presets: Standard (left 30% Previous / centre 40% Menu / right 30% Next), Edges (left/right 15%), Off (tap only toggles menu), Custom (two sliders: Previous width, Next width, 10-45%).
- RTL swaps Previous/Next. Preview overlay in the sheet shows the zones with text labels "Previous / Menu / Next" on `--on-art-scrim` (not colour only).
- Zones are pointer helpers; every action also has a button.

## Reader surface

- Backgrounds: Black `#000`, Dark `#171717`, Sepia `--sepia-bg` with `--sepia-ink` notices (11.04:1), White `#fff` with `#111` notices. In-page notices (end of chapter, errors) use the matching ink.
- Brightness and Warmth: an overlay `pointer-events: none` between the pages and the chrome (chrome stays full contrast). Brightness 30-100% (black overlay opacity), Warmth 0-60% (amber overlay `multiply`). Static, no animation.
- Progress style: Line (3px `--accent` bar at the very bottom above safe area), Counter (chip "3 / 18", Small, white on `--on-art-scrim`, bottom-centre, 8px above the bar area), None.
- Gaps: 0 / 8 / 16px between pages (scroll mode). Fit: Width / Height / Original.
- Page turn (paged): `translateX(var(--page-travel))` slide over `--dur`; reduced motion: instant swap. No opacity flicker.
- Announcements: paged mode announces "Page 3 of 18" politely after a user turn only; scroll mode and auto-scroll announce nothing per page. Chapter change announces "Chapter 13".
- Long strip fallback: a one-time toast per chapter "This chapter is one long strip, so it scrolls."
- Sleep timer end: dim overlay + status "Sleep timer ended. Tap to keep reading."; the next tap restores and is not counted as a page turn.
- Keep screen on: only rendered when Wake Lock is supported.

## ReaderSheet (top to bottom)

1. Title "Reader settings". Scope segmented control "Apply to: This series | All series" (radio group, initial focus).
2. Live preview (~120px, mascot strip) reflecting background, brightness, warmth, gaps, fit; static under reduced motion.
3. Presets: chips Webtoon, Manga, Night, Data saver; selected = green fill + check icon.
4. Mode: segmented "Scroll | Pages left to right | Pages right to left" (visible text labels; wraps to stacked radios under 360px).
5. Look: background swatches as a radio group (32px swatch + text label each, 44px row), Brightness and Warmth sliders with value text ("80%").
6. Layout: Fit (segmented), Gaps (segmented).
7. Tap zones: radio list + Custom sliders + preview overlay.
8. Auto-scroll speed (slider with value), Sleep timer (Off / 15 / 30 / 60 min, same set as Settings).
9. Progress style (segmented), Keep screen on (switch, if supported).
10. Footer: "Reset this series" text button (only when scope has a per-series override); "Try another version" secondary button, or the text "No other version right now." when there is none (no disabled button).

Group headings: Small 600 `--ink-2`, sentence case. Changes apply live; no Save button.

## Errors

"This chapter isn't available right now." with "Try another version" and "Back to series". Switching shows the toast "Switched to another version." Never show version counts or source names.
