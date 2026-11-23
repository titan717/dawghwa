# QUILL design note, cycle 1: reader modes, customization, read_time, "Try another version"

Owner: QUILL (Builder 2). Reviewers: PIXEL (UI), JUDGE (logic, API contract). Specs: E and P (title page polish is cycle 2 unless time remains).

## Goal

Turn the scroll-only reader (D8) into a three-mode reader (scroll, paged LTR, paged RTL) with per-profile and per-title preferences, comfort controls and one-tap presets, without regressing anything the scroll reader does today (resume pinning, fallback, comments, end card, auto-scroll, zoom). Emit `read_time` so the 5-minute streak rule (D68) works. Add a generic "Try another version" action.

This supersedes D8 and D65's "no mode settings" wording; a new decision row (D70) records it in `docs/loop/quill-c1.md` for AMIT to fold into DECISIONS.md.

## What exists (read in cycle 0)

- `src/routes/Reader.tsx` (1286 lines): window-scrolled strip, IntersectionObserver page tracking, anchor/offset restore with pinning, `useAutoHideBar`, `useStripZoom` (pinch, double-tap), `useAutoScroll` (`src/lib/autoScroll.ts`, time-based, step mode under reduced motion, holds on layers/input/background), bookmarks, fullscreen, version fallback (`fallbackPlan`), end card.
- `writePos(..., { skip: isIncognito() })` is ALREADY wired (Spec A item for QUILL is done); `saveProgress` and `signal` are gated in the store; `dawghwa.pos.` is on the Incognito localStorage deny-list. I will add an e2e that proves it rather than re-wire it.
- Device settings (`src/lib/settings.ts`, kv `settings`): autoNext, dataSaver, readerWidth, autoScrollSpeed, autoScrollMode. They stay device-level. `RETIRED` keys (`readerMode`, `direction`, `fit`, `pageGap`, `tapZones`) remain dropped from device settings; the new prefs live in a separate per-profile record, so no clash with HEARTH's settings work.
- `prefersVertical(title)` in `src/lib/titles.ts` (longStrip flag, else manhwa/manhua) gives the mode suggestion.
- `src/lib/autoScroll.ts` already implements Spec E's `autoscroll.ts` (sub-pixel carry). I reuse it; I do not add a second auto-scroll module. In paged mode auto-scroll is hidden (it advances pages only in scroll mode).

## Research (time-boxed, accessed 2026-11-23)

Wake Lock: `navigator.wakeLock.request("screen")` is Baseline since March 2025: Chrome/Edge/Android WebView 84+, Firefox 126+, Safari 16.4+; iOS Home Screen web apps only from 18.4 ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API), [caniuse](https://caniuse.com/wake-lock), [OpenPWA](https://openpwa.net/reference/capabilities/wake-lock/)). HTTPS only; rejects with `NotAllowedError` when hidden, policy-blocked or on low battery; the browser releases it whenever the page is hidden, so re-acquire on `visibilitychange` ([MDN request()](https://developer.mozilla.org/en-US/docs/Web/API/WakeLock/request)). Decision: feature-detect, re-acquire on visible, release on reader unmount, show the toggle only when supported; no Capacitor plugin (JUDGE would have to vet a dependency; WebView 84+ covers Android).

Long strips in paged mode: comparable readers decide by declared type first and fall back to image shape; a common threshold is height/width > 2.5 for "long strip" ([MihonSY README](https://github.com/ruzhe85/MihonSY/blob/master/README.en.md), [Suwatte reading modes](https://www.suwatte.app/docs/reading-modes/)). Webtoon slices are uniform width and up to ~15,000 px tall ([ra8 issue](https://github.com/bsikar/ra8-firmware/issues/289)), so paging them shrinks lettering to unreadable. Decision: pure `isLongStrip(ratios)`: a chapter is long-strip when the median known h/w ratio is > 2.5 or any page is > 4. Ratios come from manifest `width/height` first, then from loaded images. In paged mode a long-strip chapter renders in scroll and shows one quiet notice ("This chapter is a long strip, so it scrolls."); the saved mode is not changed.

## Acceptance criteria

1. Modes: `scroll` (default for long-strip titles), `paged-ltr`, `paged-rtl` (default for manga). Paged shows one page per screen, `fit` screen/width/original, swipe and arrow keys turn pages (RTL swaps direction, swipe "inverted" option), tap zones map via `tapAction`. Page changes are announced (`aria-live` "Page 3 of 18").
2. Prefs (`src/lib/reader/prefs.ts`): `ReaderPrefs` per Spec E. Resolution order: per-title override, then profile default, then suggestion by title type, then `DEFAULTS`. Stored in IndexedDB kv under `reader:<profileId>` as `{ defaults, titles: { [titleKey]: Partial<ReaderPrefs> } }`, titles capped at 200 most recent. Validated on read (bad values dropped). In Incognito: changes apply in memory for the session, nothing is written.
3. Tap zones: `standard`, `edge`, `off`, custom `{left,right}` with a two-slider editor; pure `src/lib/reader/tap.ts` with Vitest (LTR, RTL, edge, custom, off, clamping). Scroll mode: center toggles the bar (current behavior), edges scroll by 80 percent of the viewport when zones are not `off`. Double-tap zoom keeps working (tap waits out the double-tap window, as today).
4. Comfort: background (black, dark, sepia, white), brightness 0.3 to 1 and warm 0 to 1 (a non-interactive overlay, `pointer-events: none`, so no repaint of images), gap on/off, keep screen awake (`src/lib/reader/awake.ts`), progress style (line, counter, none), sleep timer (stops auto-scroll and dims; 15/30/60 min).
5. Presets: one-tap Webtoon, Manga, Night, Data saver (Data saver flips the existing device `dataSaver` too). Live preview in the sheet uses mascot art, never chapter content.
6. Scope buttons in the sheet: "This series only" vs "All series" (writes override vs profile default); "Reset this series".
7. `read_time`: add `"read_time"` to `SignalKind`; a pure `ReadClock` counts foreground seconds while the reader is visible and there was input or auto-scroll within the last 60 s; flushes on chapter change, `pagehide`, hidden, and every 60 s (>= 5 s only). `signal()` already skips Incognito. Unit tests for the clock.
8. "Try another version" (Spec P): a plain button on the reader error state and in the settings sheet. With the v1 data the app has today it picks the next untried variant of the same chapter (any edition), carrying the position, with the generic notice "Switched to another version." It never shows how many versions exist or where they come from. v2 client: `api.chapterV2({ title, n, lang, alt })` calling `/api/v2/chapter`, used only when a v2 probe succeeds; any 503 falls back to v1 for the session. "Try another version" then passes the previous response's `version.next` as `alt` (contract below). One extra request per press.
9. Incognito: no `dawghwa.pos.*` key, no progress row, no `read_time`, no prefs write. Proven by e2e.

## API contract (with RELAY)

The existing v2 contract (`dawghwa.api/docs/API_V2.md`) uses `alt=<k>` (a version index, the previous response's `version.next`, wraps to 0) rather than a boolean `alt=1`; errors are `{"error":"Chapter unavailable"}`. I will follow the deployed contract: `alt=1` is valid (index 1) for the first press, later presses send `version.next`. The UI treats 404 as "This chapter isn't available right now." and any other non-200 as the generic error. Asking RELAY to confirm, and whether they want the "last source" carried inside the token instead of an index; the client code isolates this in one function so either works. The `version.count` field is never rendered.

## Files

New: `src/lib/reader/prefs.ts` (+test), `src/lib/reader/tap.ts` (+test), `src/lib/reader/awake.ts`, `src/lib/reader/longStrip.ts` (+test), `src/lib/reader/readClock.ts` (+test), `src/components/reader/PagedView.tsx`, `src/components/reader/ReaderSheet.tsx` (settings sheet split out of Reader.tsx), `e2e/reader-modes.spec.ts`, `e2e/fixtures/reader.ts` (mocked API: title, chapters, pages, generated images), `docs/loop/quill-c1.md`.
Changed: `src/routes/Reader.tsx` (mode switch, overlays, tap mapping, read clock, try-another), `src/styles/reader.css`, `src/lib/api/endpoints.ts` + `types.ts` (v2 client), `src/lib/store/user.ts` (one line: `"read_time"` in `SignalKind`; HEARTH informed), `docs/UNIFIED_READER.md`.
Not touched: settings.ts, incognito.ts, Shell, BottomNav.

## Flags

None for modes and prefs (Tier 1). The v2 client is gated by a runtime probe (503 means v1), not a build flag. No env vars.

## Tests

Vitest: tap (Spec E cases plus edge/clamp), prefs (resolution order, validation, cap, Incognito no-write), longStrip, readClock. Playwright (`e2e/reader-modes.spec.ts`, mocked API, no real providers): each mode renders and navigates (keys, taps, RTL direction), long-strip chapter in paged mode falls back to scroll, prefs persist across reload per profile and stay separate between two profiles, per-title override beats the default, Incognito leaves `dawghwa.pos.*`, progress and kv untouched, Try another version makes exactly one extra request and swaps pages, a 60-page jank check (long tasks during a scripted scroll). Existing `reader.spec.ts`, `reader-polish.spec.ts`, `auto-scroll.spec.ts` must stay green.

## Risks

- Reader.tsx is large and stateful; paged mode is a separate component sharing the pages, progress `save()` and fallback logic, so the scroll path stays byte-for-byte equivalent where possible. Restore in paged mode is just the page index.
- Profile export/import (`store/transfer.ts`, HEARTH) does not yet include `reader:<profileId>`; handoff to HEARTH to add it (and delete it with the profile). Losing it is harmless (defaults).
- Brightness overlay must not trap clicks or hurt contrast of the chrome: overlay sits under the top bar.
- Bundle: no new dependency; target < 8 KB gzip added to the reader chunk.
- Prod check: v2 is inert in production (503), so "Try another version" uses the v1 variant path there; a single-version chapter shows the button disabled with "No other version right now."
