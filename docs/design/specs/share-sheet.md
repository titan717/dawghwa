# Share sheet, share card, download button

Owner: PULSE. Uses the shared BottomSheet and Toast.

## ShareSheet

- Title "Share". Initial focus: the first action button.
- Preview row (~96px): cover 2:3 (64px wide) + title (Body 600) + link host "dawghwa.vercel.app" (Small `--ink-3`). Link text is selectable.
- Message: `<textarea>` label "Message" (visible, Small 600 `--ink-2`), 3 rows, `--surface-3` + 1px `--control-line`, focus outline. Max 280 chars; counter "260 / 280" visible when within 20 of the limit and announced politely once at the limit with "Limit reached" (`--bad`).
- Actions: grid of 48px round icon buttons (`--surface-2`, `--ink` monochrome glyphs, no brand colours), each with a visible text label below (Small): Share (native, hidden if unsupported), Copy link, X, Facebook, Save image (flag). Exactly one green fill: Share if available, else Copy link. Hit area >= 64x72 per item, 8px gaps.
- Copy link: label flips to "Copied" + check icon for 2s and toast "Link copied". Failure: alert toast "Couldn't copy. Long-press the link to copy it."
- Native share cancel (`AbortError`): no toast.
- Pending canonical id: the opener button shows an in-button pending state (static under reduced motion); failure toast "Can't share this right now."

## Share card (1080x1350 PNG)

- Background `#171717` in both themes (brand artefact). 64px padding. Cover 2:3 at top, `--radius` scaled (12px at 1080), never text over the cover.
- Title Inter 700 64px white, 3 lines max; message Inter 500 40px `#cfcfcf`; a line in `#00f07a` (11.73:1) for the kind ("Reading now", "Level 5"); wordmark "dawghwa" Inter 700 36px bottom-left.
- Badge, streak, level-up kinds may use `--grad-brand` behind the badge art only.
- No source names, no user email, no Incognito state.

## DownloadButton

- 44x44, three states with distinct icons: arrow-down, ring (3px `--accent-text` on `--control-line` track) with percentage in the name, check. Error: alert icon.
- Accessible names: "Download chapter 12" / "Downloading chapter 12, 40%" / "Chapter 12 downloaded. Remove download" / "Download failed. Try again". Announce progress at 25% steps only.
- Incognito: button stays; tapping shows toast "Downloads are off in Incognito."
- Only rendered when the flag is on and the chapter is downloadable; no explanation otherwise.

## Storage manager and offline settings

- Total line "Using 340 MB on this device". Rows: cover 40px + title + "8 chapters · 120 MB" (Small `--ink-3`) + 44px delete icon button "Delete downloads for <title>". "Delete all" opens a confirm sheet (focus on Cancel).
- "Keep downloads safe" button with inline result; note "Your browser may clear downloads you haven't opened in a while. Tap Keep downloads safe to ask it not to."
- Wi-Fi only: switch row. Unknown network: a sheet asks once.
