# Design review, cycle 2 (PIXEL)

Scope: the cycle 1 build (`a5c2d33`), reviewed against `docs/DESIGN.md`. Evidence: the existing screenshot set in `/tmp/sent1` (6 routes x 360/390/768/1024/1440 x dark/light, top and scrolled; 120 PNGs) and its `report.json` geometry, plus reading the CSS. No new captures, no code changes this cycle.

Limits: the screenshots are of a fresh profile, so My Series and History only show empty states, and Home shows no Continue rail. Loading (skeletons), focus rings and reduced motion are not visible in still captures; those notes come from the CSS and are marked "CSS".

## Shell (all screens): verified

From `report.json`: at 1024 and 1440 the header is visible and `position: sticky` before and after scroll, the bottom nav is absent; at 360/390/768 the bottom nav is `position: fixed` and visible; `sidebar` is `null` at every width and theme; console errors are empty for all 10 width/theme runs. This matches the product rule.

## Scores

Each axis is 0-10. Fidelity = match to the blueprint and the DESIGN.md rules. Hierarchy = is the most important thing the most prominent. Density = right amount on screen, airy without waste. Consistency = same parts look and behave the same, across themes and widths.

| Screen | Fidelity | Hierarchy | Density / airiness | Consistency | Overall |
| --- | --- | --- | --- | --- | --- |
| Home | 7 | 7 | 6 | 7 | 6.8 |
| Search | 7 | 6 | 7 | 6 | 6.5 |
| Discover | 3 | 5 | 5 | 3 | 4.0 |
| My Series (empty) | 6 | 7 | 7 | 6 | 6.5 |
| Profile | 4 | 5 | 5 | 4 | 4.5 |
| History (empty) | 7 | 8 | 7 | 6 | 7.0 |

Summary: Home, Search and History are close to the target. Discover and Profile still carry the retired "editorial" language (numbered heads, outlined numerals, 2px ink frames, dashed borders, halftone, green and purple used as decoration) and are the biggest gap. Two system-wide items (cover ratio, light-theme nav colour) and one copy rule breach (source wording in Profile) should be fixed first.

## Findings, ranked by severity

Severity: S1 = breaks a product rule or AA; S2 = clearly off the design system and visible on every visit; S3 = polish.

### S1

1. Profile copy mentions "the source" (rule: never surface sources). `src/routes/Profile.tsx:508` "Covers of series the source marks suggestive or adult are blurred until you turn this on." and `:525` "Compressed page images where the source offers them." Suggested: "Covers marked suggestive or adult stay blurred until you turn this on." and "Uses smaller page images when available." (Owner: Profile workstream; copy only.)
2. Out of the six screens but same rule, found while checking copy: `src/routes/About.tsx:17-28` names a provider and links its domain, and credits a source-adapter repo; `src/routes/Landing.tsx:344` FAQ talks about "sources connected to its API". Flag to /root as a handoff; this needs a product decision on what the About page says.
3. Light theme bottom nav is white, not black. `src/styles/tokens.css` light block `--nav-bg: #ffffff` (and `[data-theme="light"] .bottomnav { --nav-line }` in `app.css:223`). Rule: black bottom nav. Visible on every light-theme phone/tablet screenshot. Fix: `--nav-bg: #000` in both themes, inactive label `#9e9e9e`, active label `#00f07a`.
4. Active tab is a green tinted glyph and label, not a filled green tab. `app.css` `.bottomnav a[aria-current="page"]` sets `color: var(--accent-text)` and fills the svg; the comment says "no pill". Rule: filled green active tab. Fix: give `.nav-ico` (already 48x28, radius 8px) `background: var(--accent)` and `color: var(--accent-ink)` on the active item; keep the label green. Pairs with item 3 so the green is always on black.

### S2

5. Covers are 10:13, not 2:3. `src/styles/app.css:709` `.cover { aspect-ratio: 10 / 13 }`. Seen on every rail (Home, Search) at every width. Changing to `2 / 3` makes covers ~15% taller; recheck rail heights and the skeleton in `States.tsx`.
6. Discover uses green as decoration. `.genre-tile:nth-child(1)` (`app.css:2317`) paints the first genre (Action) solid green with a dot field; `.format-tile:nth-child(2) .format-name` (`:2387`) makes "MANGA" green and `:2390` makes "MANHUA" purple; `.shelf-list li:first-child .shelf-no` (`:2436`) makes "01" green; `.collection-tile:nth-child(3n+2|3n)` (`:2506-2509`) add green and purple left stripes. None of these is an action or a state. Fix: all tiles neutral `--surface`; colour only for selection.
7. Discover keeps the retired editorial language: numbered kickers "01 GENRES ... 05 COLLECTIONS", outlined numerals `.shelf-no` (`-webkit-text-stroke`, weight 900, `:2429`), thick rule under the header (`.hub-head`), halftone dots on genre tiles (`.genre-tile::before`), bordered theme chips with rotating styles (`.theme-chip:nth-child(3n+1|3n+2)`, `:2472-2475`). Fix: plain Heading-size section titles, a simple list for shelves (title, subtitle, chevron), plain chips.
8. Discover is not cover-first. The genre tiles show tiny tilted cover fans; at 1440 the small tiles show ~40px-tall slivers. Fanned covers on Horror, Thriller, Mystery and Slice of Life clip the "MATURE" pill to "ATUR" (visible at 768 and 1440). Fix: one upright cover per tile at a readable size, or a 2-up cover grid per genre like a reading app's genre page; hide the mature pill inside fans (keep the blur).
9. Profile uses 2px ink frames and dashed borders. `.stat-strip` (`app.css:1633`, `border: 2px solid var(--frame)` plus inset box-shadows), `.level-card` (`:3477`, 2px frame), `.passport a` (`:3502`, 2px dashed), and other dashed blocks (`:478`, `:483`, `:1305`, `:1589`). In light theme these read as heavy black boxes. Fix: `--surface` blocks, 1px `--line` dividers, no dashes.
10. Avatar is an off-palette orange-red disc with a 2px frame. `.avatar` (`app.css:1944`) with the profile colour; it appears in the desktop header and Home bar on every screen and large on Profile. Fix: neutral `--surface-2` disc with `--ink` initial, or limit profile colours to greys plus the cosmetic frame.
11. Home: quests strip sits above the first content rail. "This week's quests" (`.quest-strip`, `app.css:3540`) shows three empty 0-of-N rings directly under the hero on every width, pushing Top Picks below the fold on phones (390 top shot). Fix: move it below the first two rails, or collapse to a single-line chip ("0 of 3 quests").
12. Rails are long and See all is icon-only. `Home.tsx` slices rails to 12 or 24 items (`:110`, `:113`, `:289`); the 1440 shots show 8+ covers then an arrow. The section head shows a bare chevron (`Row.tsx:21` `.see-all`), the visible text "See all" is missing. Fix: ~6 items (8 on desktop) then a visible "See all" label with chevron, 44px target.
13. Search on desktop has two search fields. The header search and the page's own `.search-input` are both visible at 1024/1440. Fix: on `/search` at >=1024 hide the header field or let the header field drive the page.
14. Search field shows a green outline at rest in the screenshots (`.search-input:focus-within`, `app.css:2040`, likely autofocus). Green outline is fine for focus, but autofocusing on load makes the page open in a "state" and pops the keyboard on phones. Fix: don't autofocus on phones.
15. Type scale is much larger than five sizes. `app.css` has 44 distinct `font-size` values (many literals: `10px`, `1.6rem`, etc.) alongside nine size tokens. Page titles differ: "Discover" is visibly larger (hub-head h1) than "My Series", "Search" and "History". Fix: the five sizes in DESIGN.md section 5; start with page titles and section heads.
16. Many radii. `app.css` uses 25 distinct `border-radius` values (2, 3, 4, 6, 8, 9, 10, 14, 16px, pills). Tiles (8-14px) and covers (4px) disagree in the same view (Search categories, Discover). Fix: one `--radius` (4px) plus `--radius-full`.

### S3

17. Home bar "Surprise me" is a white speech-bubble label plus a shuffle icon (`.surprise-bubble`, `app.css:641`). In dark theme it is the brightest element in the top bar, competing with the hero; at 768 it crowds the icon. Fix: icon button only, with the label as `.sr-only`, or a grey chip.
18. "New Chapter" badge on every cover in the New chapters rail is redundant with the section title. Fix: drop the badge inside that rail; keep it in mixed rails.
19. Search category tiles repeat covers (Completed and Manhwa both use the same series; Manga and Romance share one) and "Recently updated" wraps into the cover at 360/390. Fix: dedupe tile art; give the label its own row.
20. My Series tab strip overflows on phones with no affordance ("PLAN TO READ" is cut at 390, 4 more tabs hidden). Fix: an edge fade on the scroller, or fewer tabs with a "More" sheet. The tabs are uppercase Label-size; the design system reserves uppercase for labels, which is acceptable, but sentence case at Small size would read calmer.
21. My Series and History empty-state buttons ("Find something to read", "Browse home") measure about 40px tall at 390 (from the shots). Target 44px minimum, 48px for page CTAs.
22. My Series shows zero counters ("0 SERIES TOTAL", "0 UNREAD SERIES") with a green sync icon on an empty library. Hide the stat row when empty.
23. Page width inconsistency: History and Profile use a centred ~720px column at 1440, My Series and Search use the full column; History's header is left-aligned within its narrow column while the empty state is centred. Pick per page type (DESIGN.md section 3).
24. Desktop hero card stays dark in light theme. This is acceptable (art stage), but the rounded 14px card radius disagrees with the 4px cover beside it; align to the single radius.
25. CSS: `.spin` (`app.css:4052`) still exists; it is disabled under reduced motion (`:4112`, `:4116`) which is correct. Confirm it is only used for in-button pending states and never for content loading.
26. CSS: reduced motion zeroing in `tokens.css` covers all motion tokens; but literal durations in `app.css` (e.g. `.search-input` `transition: border-color 0.15s`) bypass tokens. Minor, since colour transitions are not motion, but move to `--dur-fast` for consistency.

## Per-screen notes

### Home (6.8)
Good: big key-art hero with white "Start reading" and outline "Save", dots, genre line; stacked rails with Heading-size titles; rank lines in green text; mature blur; sticky header on desktop; light and dark at parity. Gaps: cover ratio (5), quests above content (11), long rails and icon-only See all (12), Surprise me bubble (17), redundant badges (18).

### Search (6.5)
Good: "What Everyone's Reading" cover rail first, 2-up category tiles on phones, clear example queries. Gaps: double field on desktop (13), resting green outline / autofocus (14), repeated tile art and label wrap (19), radius mismatch between tiles and covers (16).

### Discover (4.0)
Furthest from the system. Green Action tile, green/purple format names, outlined numerals, halftone, numbered kickers and thick rules (6, 7); covers too small and clipped pills (8); oversized page title (15). The structure (genres, formats, shelves, themes, collections) is sound; restyle, don't rebuild.

### My Series (6.5, empty state only)
Good: calm empty state with one green action, tabs, icons for search/history/density. Gaps: tab overflow (20), 40px button (21), zero counters (22). The populated grid could not be reviewed from these shots; `.grid` (`app.css:1089`, `minmax(min(136px, 42vw), 1fr)`) gives 2 per row at 360-414px, which matches the rule.

### Profile (4.5)
Good: sections are logical, toggles use green fill correctly, segmented theme control. Gaps: source wording (1), 2px frames and dashed passport (9), orange avatar (10), many uppercase kickers ("YOUR READING UNIVERSE", "INCOGNITO", "PROFILES", "TASTE PROFILE") add noise; long Incognito and Taste copy makes the phone page very long. Consider collapsing explanations behind "Learn more".

### History (7.0, empty state only)
Good: quiet empty state, clear title and subtitle, one action. Gaps: narrow column vs other pages (23), 40px button (21). Not in the phone bottom nav by design (reachable from My Series); fine.

## Suggested order for cycle 3

1. Copy fix in Profile (1) and handoff on About/Landing (2).
2. Bottom nav black in both themes with filled green active tab (3, 4).
3. Cover ratio 2:3 (5) with skeleton update.
4. Discover restyle (6, 7, 8) and Profile frames (9).
5. Rails to ~6 with visible See all (12), quests placement (11).
6. Type and radius consolidation (15, 16) as a tokens-first change.
