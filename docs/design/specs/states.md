# Empty, loading, error, offline and partial states

Owner: FORGE builds shared `Skeleton`, `EmptyState`, `ErrorState`, `OfflineBanner` (extending `src/components/States.tsx`); every builder uses them. No ad-hoc state markup.

## Loading

- Skeletons match the final layout box exactly (CLS 0): cover 2:3 + two title lines (`CardSkeleton`), rows (`RowSkeleton`), hero aspect box. Colours `--skeleton-a`/`--skeleton-b`, `--radius`.
- Shimmer: `background-position` sweep 1.2s; under reduced motion static `--skeleton-a`.
- Container `aria-busy="true"`; one polite status "Loading" only if loading exceeds 1s; skeletons are `aria-hidden`.
- No spinners for content. `.spin` only inside a pending button (with `aria-disabled` and text "Saving...").

## Empty

- Centred column, max width 360px, 48px top margin: small mascot (64px, decorative `alt=""`) optional, heading (Heading size, `--ink`), one Body line `--ink-2`, at most one action (secondary unless it is the page's main action).
- Copy library: "Nothing here yet" / "Save series to read them later." + "Browse"; History "No history yet" / "Chapters you read show up here."; Search "No matches" / "Try fewer filters."; Inbox "You're all caught up".

## Error

- Same layout, heading "Something went wrong", body "Check your connection and try again.", button "Try again" (secondary). Chapter: "This chapter isn't available right now." Title: "This series isn't available right now."
- Never HTTP codes, URLs, provider or source names. Errors announced via the alert region only when the user triggered the action; page-load errors are just rendered (heading receives focus if it replaced the main content after a user action).

## Offline

- `OfflineBanner`: slim row under the top bar, `--surface-2`, `--ink`, wifi-off icon, "You're offline. Downloaded chapters still work." (or "...Your library still works." when downloads are off). Pre-mounted `role="status"`; added to the page top padding (never overlays content or the bottom nav). On reconnect: banner hides, toast "Back online".
- Offline page variants: Search "You're offline" / "Search needs a connection. Your recent searches are still here."

## Partial

- A rail or list that loaded some items: show them, then an inline row "Some results couldn't load." (Small `--ink-2`) + "Try again" text button (44px). No banner.

## Acceptance

Each screen scored in section 12 must show its loading, empty, error and offline variants in SENTINEL screenshots (mock routes), both themes.
