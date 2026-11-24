# COMPASS, cycle 1 (Search, Library, History; Spec O)

Design note: `docs/design-notes/compass-c1.md`. PIXEL approved it with changes, and all 8 changes are applied; see below. PULSE confirmed the offline data contract.

## Shipped
- `src/lib/flags.ts` (separate PR #50, AMIT asked COMPASS to own it). This branch includes the same commit.
- Search states, chosen by a pure helper in `src/lib/search/state.ts` with unit tests:
  - Idle: recent searches, a genre chip row (a scroller with an edge fade; the selected chip gets a green fill plus a check icon). The row is hidden if the vocabulary fails.
  - Loading: a skeleton, with `aria-busy` on the results region.
  - Empty: "No matches" plus "Try fewer filters." or "Check the spelling, or try a shorter search."
  - Error: "Something went wrong" plus "Check your connection and try again." and a Try again button.
  - Offline: "You're offline" plus "Search needs a connection. Your recent searches are still here." The recent searches list stays visible.
  - Partial: a later catalogue page failing now keeps the earlier pages (`runIntent` returns `partial`), plus the quiet "Some results couldn't load." line.
  - One pre-mounted polite status line announces "N results" (debounced 600 ms).
  - Autofocus only with a fine pointer.
  - Category tiles never repeat a cover, and the label sits on its own row.
- Library:
  - Downloaded tab behind `FEATURE_OFFLINE`. It reads PULSE's `dawghwa-offline` store read-only and never creates it.
  - The zero counters are hidden when a list is empty.
  - The tab strip has an edge fade, and the active tab is scrolled into view.
  - Empty-state CTAs are at least 48 px, and `.lib-find` has a focus ring.
  - Chip and find targets are 44 px on coarse pointers.
  - Fixed the label-content-name-mismatch on the row action links, which axe flagged as serious.
- "Not for me": an optional `notForMe` prop on `TitleCard` adds a 28 px circle with a 44 px hit area. It uses the existing `not_interested` hide and an 8 s Undo. FORGE wires it on the Home picks rows.
- Collections, pure only (ships in Cycle 2): `src/lib/store/collections.ts`, with `migrateLibrary`, `moveCollection` and `mosaicIds`, plus tests.

## Handoffs
- FORGE:
  - pass `notForMe` on the "picked" and "because" rows;
  - the desktop double search field (DESIGN_REVIEW_C2 #13);
  - the toast pause-on-hover/focus from PIXEL's toast spec (the toast is shared).
- PULSE: when `src/lib/offline/index.ts` lands, `src/lib/library/downloaded.ts` switches to `listDownloads` and `subscribeDownloads`. That's a one-file change.
- SHIELD: the client still hard-codes the catalogue id (`BROWSE_SOURCE`, `CATALOG_PROVIDER`). That's left for the canonical-id work, per AMIT.
