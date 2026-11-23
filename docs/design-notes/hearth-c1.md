# HEARTH cycle 1 design note: Settings, taste quiz UI, storage, legacy position migration

Owner: HEARTH (Builder 5). Specs: D (UI part), F. Reviewers: PIXEL (UI), JUDGE (data and migrations).
Branch: `agent/c1-hearth-settings`, PR into `agent/cycle-1`.

## What exists today (verified in code, 2026-11-23)

Device-level (one per browser, shared by all profiles):
- `Settings` in `src/lib/settings.ts`: IndexedDB `kv["settings"]`, mirrored to localStorage `dawghwa:settings` for first paint. Fields: theme (dark/light/system), reduceMotion, autoNext, dataSaver, rewards, matureCovers, gridDensity, readerWidth, autoScrollSpeed, autoScrollMode. Already has `migrateSettings()` (drops retired keys, maps `achievements` to `rewards`).
- `kv["activeProfile"]`, `kv["rq:*"]` (persisted React Query cache: browse, title, vocab, chapters), IndexedDB `titles` (shared public metadata cache).
- localStorage: `dawghwa:library-view`, `dawghwa:entered`, `dawghwa.bookmarks.v1`, `dawghwa.unreadable` (titles that failed to load, with timestamps). sessionStorage: `dawghwa:session` (PIN unlock).
- Cache Storage (Workbox via vite-plugin-pwa): `workbox-precache-v2-<scope>` (app shell), runtime `fonts` and `covers`. Nothing is named `dawghwa-*`, so the spec sketch `startsWith("dawghwa-")` would clear nothing.

Per-profile (keyed by profileId):
- `ProfileRecord` (name, color, onboarded, prefs {genres, kinds, avoid, personalize}, cosmetics, rhythm, pin, questSeed), stores `library`, `progress`, `hidden`, `events`, `comments`, `intel`.
- localStorage `dawghwa.pos.<profileId>.<fnv36>` (reader mirror) and `dawghwa:recent-searches:<profileId>`.
- Legacy: unscoped `dawghwa.pos.<chapterId>` from builds before #35, value `{ page, offset?, t }`. Today neither read nor pruned.

Decision: keep theme, density, motion, haptics, image quality, notifications and sleep device-level (theme must be known before the profile loads, to avoid a flash). Per-profile settings in cycle 1 are only nickname (= `profile.name`) and content language (new optional `ProfileRecord.settings?.contentLanguage`, additive, no DB version bump). The spec's `ProfileSettings.theme/accent/cardStyle` are not split out this cycle (would need a pre-paint profile read); recorded as a cycle 2 option.

## Goal and acceptance criteria

1. `/settings` route inside the Shell, one searchable screen. A search field filters rows by label and keywords; empty groups hide; "No settings match" state. Linked from Profile (gear row) and the desktop avatar menu if FORGE exposes one (handoff). Groups, in order:
   - Account (nickname, avatar, bio, links): rendered only when `FEATURE_ACCOUNTS` is on. Off in production.
   - Reading: content language (per profile), Image quality (Data saver / Auto; maps to existing `dataSaver`, no "High" option because the API has no quality tiers), auto-next, reader width, auto-scroll speed and mode, Retune my picks (opens the quiz).
   - Display: theme (Dark, Light, System; AMOLED only if PIXEL wants it and tokens support it), density (`gridDensity`), text size (Default / Large, root font-size step), animations (`reduceMotion`), haptics (new), mature covers, rewards on/off.
   - Notifications: in-app inbox categories (updates, social, rewards) and quiet hours. Settings only; PULSE's inbox reads them.
   - Storage: usage (`navigator.storage.estimate()`, "Unknown" when missing), "Keep data on this device" (`persisted()` / `persist()`, shows the result honestly), Clear cache (confirm sheet listing what is cleared and what is kept), Downloads (link to PULSE's manager, shown when `FEATURE_OFFLINE`), Back up and restore (existing export/import, moved from Profile), Reset recommendations.
   - Sync: only when accounts are on (history sync, last synced, Sync now; local stand-in from NOVA).
   - Sleep mode: auto-scroll sleep timer (Off, 15, 30, 45, 60 min), warm night filter (reader only / whole app), quiet hours shortcut.
   - Legal: Terms of Use (`/terms`), Privacy Policy (`/privacy`), About, app version (`__APP_VERSION__` from package.json via Vite define), open-source licenses (static list generated at build from package.json dependencies).
   - No video resolution control anywhere. `videoResolution` is reserved in the schema only.
2. Settings schema v2, migrate on read. Existing field names are kept (no consumer churn); new fields are added: `v: 2`, `haptics`, `textSize`, `wifiOnlyDownloads`, `notifications {updates, social, rewards, quietHours?}`, `sleep {timerMin, warmNight: "off"|"reader"|"app"}`, reserved `videoResolution?`. Before the first v2 write the v1 record is copied to `kv["backup:settings:v1"]`; `restoreSettingsBackup()` reverses it. Stored values are validated (bad values fall back to defaults).
3. `haptic()` in `lib/platform` respects `settings.haptics` (one check, all callers benefit).
4. Clear cache (`src/lib/settings/storage.ts`, `clearAppCache()`): deletes Cache Storage `covers`, `fonts` and any `dawghwa-cache-*` (reserved prefix for future disposable runtime caches); deletes `kv["rq:*"]` and calls `queryClient.clear()`; removes localStorage `dawghwa.unreadable`. Never touches: `workbox-precache-*` (offline app shell), `dawghwa-offline-*` (reserved for PULSE downloads), IndexedDB profiles/library/progress/hidden/events/comments/intel/titles, `kv.settings`, `kv.activeProfile`, backups, positions, bookmarks, sessionStorage (clearing it would sign the PIN session out, unlike the spec sketch). Returns bytes freed (estimate before/after).
5. Legacy position migration (`src/lib/reader/migrateLegacyPos.ts`, LOOP_STATE next step 1):
   - A key is legacy when it starts with `dawghwa.pos.` and does not start with `<known profileId>.` and is not UUID-shaped `<uuid>.<base36>` (orphans of deleted profiles are left alone).
   - Runs once after `initUser()` for the active profile, skipped while Incognito is on (retried next launch) and when storage is blocked.
   - Step 1 backup: `kv["backup:legacy-pos:v1"] = { at, profileId, entries: [[key, rawValue]] }` written and committed BEFORE anything changes.
   - Step 2: each valid entry becomes `posKey(profileId, chapterId)` unless a newer new-format entry exists (newest `t` wins); then the legacy key is removed. Invalid JSON is kept in the backup and removed. `prunePos()` caps to 20.
   - Step 3: marker `kv["migrations"].legacyPos = { at, profileId, moved, skipped, created: [keys] }`.
   - Reverse: `rollbackLegacyPos()` restores every legacy key from the backup and removes the created keys only if their value is still what the migration wrote. Backup kept until a later cycle removes it.
   - Note: an older cached build loses the mirror for those chapters after migration; IndexedDB progress still resumes the title (source of truth).
6. Taste quiz UI (Spec D, logic from ORACLE's `src/lib/intel/quiz.ts`: `applyFeedback`, `nextCard`, `Feedback`, `QuizCard`):
   - `src/components/quiz/SwipeCard.tsx` (pointer drag, no dependency), `TasteQuiz.tsx` (deck, progress "4 of 12", undo, Done), `QuizResults.tsx`.
   - Gestures: right like, left skip, up loved it, down not for me. Each has a 44px button and a key (Arrow keys, Z undo). Haptic on decide. "Skip quiz" always visible. 12 cards (stop early at 15 max or when the pool runs out; Done after 5).
   - Pool: popular browse (the onboarding already loads 100), with cover, not mature, not hidden; `QuizCard.type` from `meta.kind`. Fallback to the existing genre tiles when fewer than 10 cards or fewer than 6 distinct genres.
   - Answers buffer in memory (so Z undo is exact) and commit on Done: one `signal("quiz", title, key, { value: WEIGHT, context: feedback })` per answer (new `SignalKind` "quiz"; ORACLE to confirm the kind/value shape and how the learner weighs it), and the top genres from the taste map are written to `profile.prefs.genres` so the cold-start path keeps working. "Not for me" is a signal only; it does not add to the Hidden list.
   - Incognito: banner "Incognito is on, so your answers won't be saved", nothing committed (`signal()` already no-ops; prefs write skipped too).
   - Results: genre bars (top 5, text values, not color-only), mascot reaction, XP and "Taste Tester" badge only if SPARK exposes them (handoff), Share my taste via PULSE's share system when present (hidden otherwise).
   - Placement: onboarding step replacing the genre tiles (`hello, reader, formats, quiz|genres, avoid, ready`); "Retune my picks" at `/welcome?retune=1` from Profile and Settings. The "gentle prompt after a few reads" is cycle 2.
   - Reduced motion: no fly-out animation, instant swap. Live region announces each decision.
7. `/terms` and `/privacy`: full-screen-in-Shell pages rendering SCRIBE's `docs/legal` text, a visible DRAFT banner ("Draft, pending owner review. Not legal advice."), `noindex`, linked from Settings > Legal and from the sign-up screen (NOVA's, handoff).
8. Feature flags: COMPASS's `src/lib/flags.ts` (`VITE_FEATURE_<X>=1` at build, `?ff=` override outside production). I add no flag module.
9. Handoffs taken: SPARK: on quiz completion emit once `signal("quiz_done", undefined, "quiz", { value: answeredCount })` (answered = not skipped); SPARK derives +30 XP and the Taste Tester badge; the results screen shows the gain inline via `setRewardSink`. I add `"quiz"` and `"quiz_done"` to `SignalKind` (QUILL adds `"read_time"`, one line each). QUILL: profile export/import (format version 3, older versions still import) carries kv `reader:<profileId>`, and `deleteProfile` removes it.

## Files

New: `src/routes/Settings.tsx`, `src/routes/Legal.tsx` (terms + privacy), `src/lib/settings/storage.ts` (+test), `src/lib/reader/migrateLegacyPos.ts` (+test, fixtures in `src/test/fixtures/legacy-pos.json`), `src/components/quiz/{SwipeCard,TasteQuiz,QuizResults}.tsx` (+test), `src/components/WarmNight.tsx`, `src/styles/settings.css`, `e2e/settings.spec.ts`, `e2e/quiz.spec.ts`.
Changed: `src/lib/store/transfer.ts` (reader prefs in export v3), `src/lib/settings.ts` (v2 fields, backup, validation), `src/app/router.tsx` (routes), `src/main.tsx` (run migration after initUser), `src/routes/Profile.tsx` (settings sections move to /settings, link left behind), `src/routes/Onboarding.tsx` (quiz step), `src/lib/store/user.ts` (`"quiz"` SignalKind only), `src/lib/platform/index.ts` (haptics setting), `src/lib/store/db.ts` (optional `settings` on ProfileRecord, type only).

## Tests

Vitest: settings migration from v1 fixtures and garbage input, backup and restore round trip; nickname validation; clear cache leaves every IndexedDB store row count and protected kv/localStorage keys unchanged and deletes only allowed caches (CacheStorage mock); legacy migration on fixtures (only legacy, mixed with new-format, newer new-format wins, invalid JSON, orphan profile keys untouched, Incognito skips, idempotent second run, rollback restores byte-for-byte). Quiz component: buttons, keys, undo, Incognito commits nothing.
Playwright: every settings group renders and a setting from each group round-trips across reload; search filter; Account and Sync hidden without the flag; no "video" text; clear cache keeps library and progress; quiz swipe in 4 directions, buttons, keys, undo, skip, Incognito message; axe on /settings, /terms, /privacy and the quiz in light and dark.

## Risks

- Moving settings out of Profile changes existing e2e selectors (profile.spec, streak.spec); I update those specs in the same PR.
- ORACLE's quiz.ts and SCRIBE's legal text must land first or be stubbed; the quiz UI imports only the documented functions.
- `navigator.storage.estimate()` includes the browser's own padding (opaque responses), so usage is labeled "about".
- PULSE must name download caches `dawghwa-offline-*` (handoff) so Clear cache never deletes them.
