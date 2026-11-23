# COMPASS design note, cycle 1 (Spec O: Search, Library, History)

Owner: COMPASS (Builder 3). Reviewer: PIXEL (UI), JUDGE (store/migration logic). Branch: `agent/c1-compass-search-library` -> PR into `agent/cycle-1`.

## What exists today (read on 5efc0d1)

- `src/routes/Search.tsx` (600 lines): debounced input (280 ms), recent searches per profile in `localStorage` `dawghwa:recent-searches:<profileId>` (the Incognito `setItem` guard already drops these writes), parsed-intent chips, filter sheet (sort, format, status, genres), grid skeleton, `ResultsError` (generic), `PartialNote`, a slower "Search more" stream. Idle screen: recent searches, trending rail, category tiles, example queries. No genre chips in idle.
- `src/routes/Library.tsx`: tabs Recent, Saved, 5 statuses, Favourites, one tab per collection name. Collections are `LibraryRecord.collections: string[]` (names, D28), so there's no collection record, no order, no rename and no delete.
- `src/routes/HistoryPage.tsx`: already grouped by day, `ListSkeleton` while the store opens, remove one, clear all with a confirmation sheet. Incognito skips `saveProgress`, so nothing gets recorded.
- No feature-flag module and no `src/lib/offline/` yet.

## Goals and acceptance criteria (cycle 1)

### A. Search states (Spec O)
1. Idle: recent searches (removable, plus "Clear all"), a genre-chip row (up to 12 genres from the vocabulary; tapping one sets the `tag` filter), then the trending rail and category tiles as they are now. If the vocabulary fails to load, the genre row is hidden and no error shows.
2. Loading: the existing `GridSkeleton` shows on the first keystroke (this is already tested). `aria-busy` sits on the results region.
3. Empty: heading "No matches", body "Try fewer filters." when filters are active, otherwise "Check the spelling, or try a shorter search." There's one action, "Clear filters", shown only when filters are active.
4. Error: `ResultsError` (generic, with Try again), plus an offline variant. It never shows `error.message` or the error details.
5. Partial: results are shown, plus the quiet line "Some results couldn't load." with a Try again button (existing `PartialNote`). This covers both the catalogue page failing after page 1 and stream lines that report an error.
6. No source names anywhere in the rendered text, `title` attributes or `aria-label`s. The e2e test checks this against a small deny-list held in the test file.
7. Fixes from DESIGN_REVIEW_C2 and SHIELD_AUDIT_C2 that I own:
   - no autofocus on coarse pointers (#14);
   - category tiles never repeat a cover (#19: dedupe across tiles, and the label gets its own row);
   - `.chip` and `.lib-find` are at least 44 px on `pointer: coarse`;
   - `.lib-find:focus-within` gets a focus ring.
   - The double desktop search field (#13) is FORGE's header. I'll send FORGE a handoff and won't edit the header.

### B. Library
1. Downloaded tab, shown only when `FEATURE_OFFLINE` is on. It lists the titles that have at least one chapter saved in this profile, with "N chapters saved" as the row meta. Empty state: "No downloads yet". When the flag is off, nothing appears in the DOM.
2. Polish:
   - hide the "0 series total / 0 unread" row when the list is empty (#22);
   - add an edge fade on the tab scroller (#20);
   - empty-state CTA buttons get `min-height: 48px` (#21).
   The full tab regrouping (Reading, Saved, Finished, Downloaded plus "More") waits for Cycle 2 alongside collections, so tabs only move once.

### C. "Not for me" (LOOP_STATE next step 3, LENS B7), only if small
"Not interested" already exists in the long-press or right-click `TitleActionsSheet`. What's missing is a visible way to reach it on personal-pick rows. Proposal:
- add an optional `onDismiss` prop to `TitleCard`. It renders a 44 px "Not for me" icon button (an `X` in a corner, `aria-label="Not for me: <title>"`);
- the button calls the existing `hideTitle(t, "not_interested")` and shows the existing Undo toast;
- the card leaves the row at once, because rows already filter out `hidden`;
- no new signal kind, and it's a no-op in Incognito (no writes, same as today).
Home rows are FORGE's file. I'll add the prop and ask FORGE to pass it on the "picked" and "because" rows. If FORGE prefers to own it, I'll only hand off.

### D. Collections (start in Cycle 1, ship in Cycle 2)
Cycle 1 ships only the pure module and its tests. Nothing gets wired to the UI.

Data shape (adapted from the Spec O sketch to the existing store):
- New `kv` row `collections:<profileId>` holding `{ v: 2, collections: Collection[] }`, where each `Collection` is `{ id, name, titleIds, order, createdAt }`.
- `migrateLibrary(raw, records)`:
  - if the kv row is already v2, it returns it unchanged after dropping ids that point to nothing and removing duplicates;
  - otherwise it builds v2 from the distinct names in `LibraryRecord.collections`. Collections are ordered by the first `addedAt`, and titles within a collection are ordered by `addedAt`.
- It does not create a default "Saved" collection, which differs from the sketch. "Saved" is already a tab built from status, so a collection with the same name would duplicate it.
- `LibraryRecord.collections` stays untouched and keeps being written by name. It acts as the backup and keeps export/import working.
- Reversible: deleting the kv row returns the app to v1 behaviour exactly.
- `moveCollection(list, id, dir)` comes from the spec, normalised so `order` is always 0..n-1.
- Tests:
  - v1 fixture in, with no titles lost and no duplicates;
  - an already-v2 input gives the same output (idempotent);
  - garbage input gives an empty v2;
  - `moveCollection` at both edges and with an unknown id.

## Files
- Edit: `src/routes/Search.tsx`, `src/routes/Library.tsx`, `src/components/TitleCard.tsx` (only the optional `onDismiss` prop).
- New:
  - `src/styles/search-library.css` (my CSS, so I avoid conflicts in `app.css`);
  - `src/lib/store/collections.ts` and `collections.test.ts`;
  - `src/lib/library/downloaded.ts` (adapter, see API contract);
  - `e2e/search-states.spec.ts`;
  - `e2e/library.spec.ts`;
  - `docs/loop/compass-c1.md`.
- No new dependencies.

## API contract and data shapes
- Search uses the existing `GET /api/catalog`, `/api/catalog/filters` and the `POST /api/search` NDJSON stream, with no changes. The e2e tests mock these with `page.route`, so they never touch real providers and need no API running.
- Downloaded filter, a contract with PULSE (Spec G). I'll consume one function from PULSE's module: `listDownloads(profileId): Promise<{ titleKey: string; n: number; bytes: number; savedAt: number }[]>`, plus `subscribeDownloads(fn): () => void`.
  - Until it lands, `src/lib/library/downloaded.ts` reads the Spec G store (`dawghwa-offline` / `chapters`, key `${profileId}:${titleId}:${n}`) read-only.
  - It checks `indexedDB.databases()` first so it never creates the database.
  - It returns `[]` on any failure.
  - The same `titleKey` the library uses is the join key.
- Flag: `FEATURE_OFFLINE`, read through a shared `flag()` helper if one lands this cycle (I've asked /root who owns it). Otherwise I'll add a minimal `src/lib/flags.ts`: `import.meta.env.VITE_FEATURE_OFFLINE === "1"` at build time, and in non-production builds only, `?ff=offline` for e2e.

## Tests
- Vitest: `collections.test.ts` (migration and moveCollection) and a pure helper for the search state choice (idle, loading, empty, error, partial).
- Playwright `e2e/search-states.spec.ts` on the mobile and desktop projects, with the API mocked:
  - idle shows recent searches and genre chips;
  - loading shows a skeleton (delayed route);
  - empty shows the copy;
  - error (500) shows Try again, and a retry recovers;
  - partial (page 2 fails, or a stream line with an error) shows results plus the note;
  - deny-list text check;
  - axe on each state, light and dark: 0 serious or critical.
- Playwright `e2e/library.spec.ts`:
  - Downloaded tab hidden when the flag is off;
  - with the flag on and a seeded `dawghwa-offline` row, only that title is listed;
  - "Not for me" removes the card and Undo restores it;
  - axe on Library and History.

## Risks
- Search code still sends a fixed catalogue id (`BROWSE_SOURCE` in `query.ts` and `run.ts`), and `titleKey`s carry a provider prefix (SHIELD #5). That belongs to the canonical-id migration (QUILL and RELAY). I won't touch it this cycle and have flagged it for SHIELD. My tests only check what the user sees.
- PULSE's key may use a canonical title id instead of `titleKey`. The adapter keeps the join in one place.
- `Search.tsx` is large. I keep the changes to its state branches so they merge cleanly.
