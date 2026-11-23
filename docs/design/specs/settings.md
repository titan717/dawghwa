# Settings (`/settings`)

Owner: HEARTH. One searchable screen in the Shell; Profile links to it.

## Layout

- Phone: page title "Settings" (Display), sticky search field under the top bar, then groups. Desktop: same single column, max width 720px centred, no sidebar.
- Search: 44-48px field, `--surface-3` fill, 1px `--control-line` boundary (fill alone is 1.81:1 dark / 1.18:1 light), visible label "Search settings" (sr-only label + placeholder "Search"), placeholder `--ink-2` in dark. Filters by label and keywords; empty groups hide; polite status "4 settings" (debounced). Empty: heading "No settings match", body "Try another word." No mascot.
- Groups in order: Account (flag), Reading, Display, Notifications, Storage, Sync (flag), Sleep, Legal. Group heading `<h2>` Small 600 `--ink-2`, sentence case; group body `--surface`, `--radius`, rows separated by 1px `--line`.

## Rows

- Min height 56px, padding 12px 16px; label Body `--ink`; helper Small `--ink-3` under it. One control on the right.
- Switch row: the whole row is the `<label>`; `.switch` `role="switch"` `aria-checked`. Off: track `--surface-3` + 1px `--control-line` border, knob `--ink`. On: `--accent` track + knob moved right (position is the non-colour cue), knob `--accent-ink`.
- Segmented (<= 3 options): radio group, `--surface-2` container, selected segment `--surface` with `--ink` text 600 and a 1px `--control-line` outline (not green; green is reserved for the page's action). Theme (Dark / Light / System), Image quality (Data saver / Auto), Text size (Default / Large).
- Choice (> 3 options): value text (`--ink-3`) + chevron, opens a BottomSheet with a radio list.
- Slider: native range, value text right ("1.5x"), 44px row.
- Navigation row: chevron, whole row is the link.
- Danger: "Clear cache", "Reset recommendations": `--bad` label, opens a confirm sheet.

## Specific rows

- Theme: no AMOLED or accent options in cycle 1.
- Sleep timer: Off / 15 / 30 / 60 min (same as the reader).
- Storage usage: "About 120 MB used" (`navigator.storage.estimate()`), "Unknown" if missing.
- Keep data on this device: button; result inline under the row: "Your browser agreed to keep data" / "Your browser didn't agree. Data may be cleared if space runs low."
- Clear cache confirm sheet: title "Clear cache?", "Clears: covers, fonts, search cache" / "Keeps: library, progress, profiles, settings, downloads", buttons "Clear cache" (danger style) and "Cancel" (initial focus). Result toast "Freed about 24 MB".
- Legal: Terms (draft), Privacy (draft), About, version and licenses in Small `--ink-3` at the bottom; licenses open in a sheet.
- No video resolution control.

## Legal pages

`/terms`, `/privacy`: DRAFT banner (not dismissible) `--surface-2` with a warning icon in `--warn` and text "Draft, pending owner review. Not legal advice."; body max 68ch, Body size, headings only Display/Heading; `noindex`.

## Acceptance

Axe clean both themes; every row reachable by keyboard; text size Large does not clip at 360px; no row under 44px.
