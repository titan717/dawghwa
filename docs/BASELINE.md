# Phase 0 baseline: live app screenshots and critique

Captured 2026-11-22 against the live build at https://dawghwa.vercel.app (main @ `6a5a39e`, "Landing page at the root"). Tooling: `scripts/screenshots.mjs` (Playwright + `@axe-core/playwright`). Raw probe data: [`screenshots/baseline/results.json`](screenshots/baseline/results.json).

- Widths: 390x844 (phone, touch), 768x1024 (tablet, touch), 1440x900 (desktop).
- Themes: Playwright `colorScheme` **and** the app's own pref `localStorage["dawghwa:settings"].theme` set to the same value.
- Profile seeded the way a visitor does it: `/` landing, "Use in browser", `/welcome`, "Create reader", "Skip". Reader screens use the e2e fixture title `/title/mangadex/77bee52c-d2d6-44ad-a33a-1734c1fe696a` (The Eminence in Shadow), first chapter link; so History and Library "Recent" contain one item.
- "scrolled" = `window.scrollBy(0.9 * viewport)` (title 1400px, reader 2500px).

Rerun for after-comparisons:

```sh
npm run build && npm run preview &          # http://localhost:4173 (needs the API for live data)
node scripts/screenshots.mjs http://localhost:4173 docs/screenshots/after
ONLY=home,title node scripts/screenshots.mjs https://dawghwa.vercel.app /tmp/shots   # subset
```

## Accessibility (axe, WCAG 2.0/2.1 A + AA tags)

66 audits (11 screens x 3 widths x 2 themes), top-of-page state.

| Result | Count |
|---|---|
| Critical | **0** on every screen |
| Serious | **0** on every screen |
| Moderate / minor | 0 |

Axe is green, but axe does not see the structural problems below (navigation that disappears, false empty states, clipped chip rows, uncalibrated percentages). Keyboard probe on Home (390px): Tab order is Skip to content → Profile avatar → hero title → Continue → Save; there is no brand/home link or Search in the top of the tab order on phones.

## Top bar bug (reproduced)

There is no global header. The only top bar is Home's own `.home-bar` (`src/routes/Home.tsx:398`, `src/styles/app.css:3691-3693`), which is `position: static` and `@media (min-width:1024px){display:none}`.

| Viewport | State | `.home-bar` measured | Other fixed/sticky chrome |
|---|---|---|---|
| 390 | top | flex, static, top=16, h=56, visible | `nav.bottomnav` fixed, top=782, h=62 |
| 390 | scrolled 760px | top=**-744**, scrolled off screen | bottom nav only |
| 768 | top | flex, static, top=16, h=56, visible | `nav.bottomnav` fixed, top=962, h=62 |
| 768 | scrolled 922px | top=**-906**, scrolled off screen | bottom nav only |
| 1440 | top and scrolled | **display:none**, h=0 | `aside.sidebar` sticky, 232px wide, full height |

Exact symptom:
1. Phones/tablets: on Home the brand + profile avatar bar is part of the content, so it scrolls away after ~70px and never returns. Nothing at the top of the screen anchors where you are; brand and profile are only reachable by scrolling back up (profile also sits in the bottom nav).
2. Every other shell route (Search, Library, History, Profile, Discover, Awards) has no top bar at all on any width: they open straight into a page H1.
3. ≥1024px: `.home-bar` is hidden; navigation moves into a 232px left sidebar, so desktop and mobile have two different navigation models, plus the Home-only bar: three in total.
4. Title pages (`data-own-chrome`) and the Reader bring their own bars, so the chrome changes on every route type.

Evidence: [home-390-light-top](screenshots/baseline/home-390-light-top.jpg) vs [home-390-light-scrolled](screenshots/baseline/home-390-light-scrolled.jpg); [home-1440-light-top](screenshots/baseline/home-1440-light-top.jpg); [search-390-light-top](screenshots/baseline/search-390-light-top.jpg) (no header).

<img src="screenshots/baseline/home-390-light-top.jpg" width="200" alt="Home 390 top: home-bar visible"> <img src="screenshots/baseline/home-390-light-scrolled.jpg" width="200" alt="Home 390 scrolled: home-bar gone"> <img src="screenshots/baseline/home-1440-light-top.jpg" width="420" alt="Home 1440: no top bar, sidebar">

Fix (Phase 1, builder_a): one sticky `<Header>` in `Shell.tsx` on all shell routes and widths, 56-64px fixed height + `env(safe-area-inset-top)`, `scroll-padding-top` equal to the header height so focused elements are not hidden, delete `.home-bar`, the sidebar and the bottom nav.

## Main and PR #30

**main (`6a5a39e`)**: React + Vite PWA with Capacitor. Shell = desktop sidebar (Home, Search, Library, Achievements, Profile, Discover, History + Shortcuts + profile footer) and a 5-slot mobile bottom nav (Home, Search, Library, Awards/Discover, Profile; D7). Landing at bare `/` for first visits (PR #29). Title page with provider chips, volume rail, jump field; scroll-only reader with auto-scroll; Library tabs (Recent, Saved, Reading, Plan to read, Completed, On hold, Dropped, Favourites); History; Profile with stats, rewards/level, genre passport, settings, profiles, PIN, taste profile with a "Confidence N%" figure. On-device recommender (`src/lib/intel`). Default theme is dark; the theme pref is `dawghwa:settings` in localStorage.

**PR #30** (fork `auratitan616/dawghwa`, draft, do-not-merge, 16 commits, CI never ran: `action_required`):
- `Shell.tsx` (+18 −133): deletes the desktop sidebar and uses the bottom nav at every width (inline `style={{display:"block"}}` on `.shell`), and strips many explanatory comments while reformatting. **Conflicts with the Phase 1 direction** (header-only shell, no bottom nav): take nothing from this file except the idea of a single nav model.
- Animated/static profile avatars: new `src/lib/profile/avatar.ts` (+284, size/dimension/format validation before decode, GIF frame bounds), tests (+113), `ProfileAvatar.tsx`, `ProfileRecord.avatar` in `db.ts`, avatar validation in profile import/export (`transfer.ts`), upload/remove controls in `Profile.tsx`. Worth porting with review.
- `catalog.ts`: `needsCatalogFilters(q)` skips the filter-vocabulary request for simple browse/search; tests for gating and request order. Small, worth porting.
- Docs: README rewrite, `docs/README.md` hub, design-system edit stating "bottom navigation, no global top bar" (must be reverted by Phase 1).
- Listed as still to do (none implemented): Incognito, profile-scoped reader resume (`dawghwa.pos.<chapterId>` leak), Incognito not writing history, home/search/onboarding a11y review.

## Issues ranked by severity

S1 = breaks navigation or tells the user something false; S2 = clear usability/visual defect; S3 = polish.

| # | Sev | Page(s) | Issue (evidence) | Concrete fix | Owner |
|---|---|---|---|---|---|
| 1 | S1 | Shell, all | No global header; Home `.home-bar` scrolls away on phones and is `display:none` ≥1024px (table above). | Single sticky header in Shell (brand, 3 labelled destinations, visible Search, profile, labelled More). Remove `.home-bar`. | builder_a |
| 2 | S1 | Shell, all | Three navigation models: phone bottom nav (fixed, 62px), desktop 232px sidebar, Home-only bar. Title/Reader add their own. Desktop sidebar takes 16% of 1440px. | Header-only shell; delete `.sidebar` and `.bottomnav` CSS and markup; Title page keeps a compact sub-bar below the header. | builder_a |
| 3 | S1 | Library | Opens on **Saved** and says "Your library is empty" while **Recent 1** holds the chapter just read ([library-390-light-top](screenshots/baseline/library-390-light-top.jpg)). | Default to the first non-empty tab (Recent when Saved is empty) and word the empty state per tab ("Nothing saved yet"), not "library is empty". | builder_b |
| 4 | S1 | Profile | "Confidence 31% · 3 interactions" presents an uncalibrated percentage; taste list mixes author names (sakano anri, aizawa daisuke) with genres ([profile-1440-light-scrolled](screenshots/baseline/profile-1440-light-scrolled.jpg)). | Replace with "Taste signal: early / growing / strong" + interaction count + "Because you read X"; separate creators from genres. | recommender, builder_c |
| 5 | S2 | Landing | Ignores the theme: dark pref + dark `colorScheme` still renders the light landing ([landing-390-dark-top](screenshots/baseline/landing-390-dark-top.jpg)). | Drive landing.css from the same theme tokens as the app. | designer, builder_a |
| 6 | S2 | Search | A plain title query ("solo leveling") also runs the description matcher: a second "Matching your description" grid with unrelated covers and "Filtered on this device: 361 of 400 fetched titles removed" ([search-results-390-light-scrolled](screenshots/baseline/search-results-390-light-scrolled.jpg)). | Only show the description section when intent parsing finds descriptive terms; otherwise one result list. Reword device filtering ("Applied on this device: genre, status") in Phase 3. | builder_b |
| 7 | S2 | Title | Provider chip row overflows and is clipped mid-word ("Dynasty Re…") with no scroll cue; unavailable providers shown with strikethrough text, which hurts legibility ([title-1440-light-top](screenshots/baseline/title-1440-light-top.jpg)). | Wrap chips (desktop) or horizontal scroller with edge fade + count; unavailable = normal text + status label ("No match"), no strikethrough. Phase 4 picker. | builder_b |
| 8 | S2 | Home | "Popular this year: Most-followed series first published in 2026" and "Popular by category" are labelled popular without a Dawghwa readership signal; ranked list columns are cut mid-card at the right edge and the outline numerals 4/5 are faint ([home-390-light-scrolled](screenshots/baseline/home-390-light-scrolled.jpg)). | Rename to what the data is ("Most followed on MangaDex" or "New in 2026"); scroll-snap whole columns; solid numerals at ≥3:1. | builder_a, recommender |
| 9 | S2 | History, Library, Onboarding (1440) | Desktop width is wasted: History list sits in a ~600px column with 60% empty space; onboarding step 2 pins Back/Continue ~600px below the form ([onboarding2-1440-light-top](screenshots/baseline/onboarding2-1440-light-top.jpg), [history-1440-light-top](screenshots/baseline/history-1440-light-top.jpg)). | Shared centered page container (max ~1200px, reading column ~720px); on ≥768px place onboarding actions directly under the form. | designer, builder_b, builder_c |
| 10 | S2 | Profile | One very long page: stats, mascot, level, 14-tile genre passport, then Settings, profiles, PIN, taste profile; device settings and profile settings are mixed ([profile-390-light-scrolled](screenshots/baseline/profile-390-light-scrolled.jpg)). | Split into Profile / Appearance & reader (per profile) / This device sections with an in-page nav; collapse genre passport. | builder_c |
| 11 | S2 | Library (390) | Status tabs are 11px uppercase tracked text, "PLAN TO READ" is clipped at the edge with no overflow cue. | 13-14px sentence-case tabs, horizontal scroller with edge fade, active tab scrolled into view. | builder_b |
| 12 | S2 | Visual system | Accent is acid lime on both themes; avatar orange, mascot purple and lime compete; light theme still has dark hero bands. Neither Phase 2 direction uses lime. | Phase 2 token set (A or B) with AA-verified accent per theme; one accent used for primary actions only. | designer |
| 13 | S3 | Cards (Home, Search) | Meta row inconsistent ("Manhwa  Ch. 200" vs "Manga" only); 2-line titles with ellipsis vary card height; search hit highlight is a heavy yellow `mark` in light mode. | Fixed meta row (type · latest ch. · status chip with text); clamp titles to 2 lines with reserved height; subtle underline/weight for matches. | builder_b |
| 14 | S3 | Title | Action buttons (Like, Not for me, Favourite, Share) wrap to two centered rows; Save is a low-contrast gray pill top-right, separate from the other actions; ⓘ and ⋯ icons are unlabelled visually. | One action row: primary "Read chapter N", secondary Save/Follow, overflow for Like/Not for me/Share; visible text or tooltip on icon buttons. | builder_b |
| 15 | S3 | Reader (390) | Top bar fits 5 icon buttons and truncates the title to "The Eminenc…"; chapter line "Chapter 1 · via …" also truncated. | Keep back + title + 2 icons; move comments/chapters/bookmark/auto-scroll/settings into one sheet. | builder_c |
| 16 | S3 | Onboarding | "Skip" is small top-right text with the same weight as the step dots; PIN note "it isn't encryption" is good honesty but small and dim. | Larger Skip text button; note at 13-14px body color. | builder_c |
| 17 | S3 | Motion | Hero does not auto-advance (good, `Hero.tsx`); reduced-motion rules exist only for a few selectors (`app.css` 3542, 3741, 4108). Transitions not measurable from stills. | Phase 2: global reduced-motion guard on tokens (durations → 0), fades/border changes only. | designer |

Not reproduced: History empty-state flash on a cold load of `/history` (sampled every 25ms: blank `main`, then content). It may still occur on in-app navigation before the profile store is ready; Phase 2 should add an explicit loading state anyway.

Not verified: real device safe areas, Android WebView, motion/transitions, screen-reader announcements, behavior with the API down.

## Page notes

- **Home**: strong hero art and clear "Start reading"/"Save" pair; quick-filter chips row ("Surprise me", "Short completed romance") is a good idea but reads as a second nav. Section numbering (01, 02) is decorative and competes with titles. Quests sit above content and push catalogue below the fold on phones.
- **Search**: empty state is good (what's reading, browse categories, "Try describing it"). Search field is clear and large. Filters chip row repeats Discover.
- **Title**: dense but well structured (cover, meta line, title, authors, latest, actions, synopsis, tags, tabs). Chapter rows have good rhythm; "EN · 7w ago · MangaDex · My Darling" metadata is small (12px) and low contrast in dark. Sticky "Read chapter 1" at the bottom on phones is good.
- **Reader**: chrome hides on scroll (good); strip is centered with comfortable width on desktop; light theme reader background is off-white around black-bordered pages, fine.
- **Library**: see #3, #11. Grid/list toggle and history icon have no text labels.
- **History**: clear "Where you left off" with progress bar; Clear action has no confirmation copy visible in the shot.
- **Profile**: see #4, #10.
- **Onboarding**: friendly mascot voice, clear honesty copy ("No account, no email"); colour swatches have checkmark (not colour only).
- **Landing**: bold typographic hero, but "Auto-scroll this page" as the first control is surprising; see #5.

<!-- gallery below is generated from the file names; rerun scripts/screenshots.mjs to refresh -->

## Screenshot gallery

Viewport-only JPEGs (q70) from `node scripts/screenshots.mjs https://dawghwa.vercel.app docs/screenshots/baseline`. Columns: light top, light scrolled, dark top, dark scrolled. Onboarding step 1 has no scrolled variant (it does not scroll).


### Home


**390px**

<a href="screenshots/baseline/home-390-light-top.jpg"><img src="screenshots/baseline/home-390-light-top.jpg" width="180" alt="Home 390px light top"></a> <a href="screenshots/baseline/home-390-light-scrolled.jpg"><img src="screenshots/baseline/home-390-light-scrolled.jpg" width="180" alt="Home 390px light scrolled"></a> <a href="screenshots/baseline/home-390-dark-top.jpg"><img src="screenshots/baseline/home-390-dark-top.jpg" width="180" alt="Home 390px dark top"></a> <a href="screenshots/baseline/home-390-dark-scrolled.jpg"><img src="screenshots/baseline/home-390-dark-scrolled.jpg" width="180" alt="Home 390px dark scrolled"></a>


**768px**

<a href="screenshots/baseline/home-768-light-top.jpg"><img src="screenshots/baseline/home-768-light-top.jpg" width="220" alt="Home 768px light top"></a> <a href="screenshots/baseline/home-768-light-scrolled.jpg"><img src="screenshots/baseline/home-768-light-scrolled.jpg" width="220" alt="Home 768px light scrolled"></a> <a href="screenshots/baseline/home-768-dark-top.jpg"><img src="screenshots/baseline/home-768-dark-top.jpg" width="220" alt="Home 768px dark top"></a> <a href="screenshots/baseline/home-768-dark-scrolled.jpg"><img src="screenshots/baseline/home-768-dark-scrolled.jpg" width="220" alt="Home 768px dark scrolled"></a>


**1440px**

<a href="screenshots/baseline/home-1440-light-top.jpg"><img src="screenshots/baseline/home-1440-light-top.jpg" width="220" alt="Home 1440px light top"></a> <a href="screenshots/baseline/home-1440-light-scrolled.jpg"><img src="screenshots/baseline/home-1440-light-scrolled.jpg" width="220" alt="Home 1440px light scrolled"></a> <a href="screenshots/baseline/home-1440-dark-top.jpg"><img src="screenshots/baseline/home-1440-dark-top.jpg" width="220" alt="Home 1440px dark top"></a> <a href="screenshots/baseline/home-1440-dark-scrolled.jpg"><img src="screenshots/baseline/home-1440-dark-scrolled.jpg" width="220" alt="Home 1440px dark scrolled"></a>


### Search (empty)


**390px**

<a href="screenshots/baseline/search-390-light-top.jpg"><img src="screenshots/baseline/search-390-light-top.jpg" width="180" alt="Search (empty) 390px light top"></a> <a href="screenshots/baseline/search-390-dark-top.jpg"><img src="screenshots/baseline/search-390-dark-top.jpg" width="180" alt="Search (empty) 390px dark top"></a>


**768px**

<a href="screenshots/baseline/search-768-light-top.jpg"><img src="screenshots/baseline/search-768-light-top.jpg" width="220" alt="Search (empty) 768px light top"></a> <a href="screenshots/baseline/search-768-dark-top.jpg"><img src="screenshots/baseline/search-768-dark-top.jpg" width="220" alt="Search (empty) 768px dark top"></a>


**1440px**

<a href="screenshots/baseline/search-1440-light-top.jpg"><img src="screenshots/baseline/search-1440-light-top.jpg" width="220" alt="Search (empty) 1440px light top"></a> <a href="screenshots/baseline/search-1440-dark-top.jpg"><img src="screenshots/baseline/search-1440-dark-top.jpg" width="220" alt="Search (empty) 1440px dark top"></a>


### Search: “solo leveling”


**390px**

<a href="screenshots/baseline/search-results-390-light-top.jpg"><img src="screenshots/baseline/search-results-390-light-top.jpg" width="180" alt="Search: “solo leveling” 390px light top"></a> <a href="screenshots/baseline/search-results-390-light-scrolled.jpg"><img src="screenshots/baseline/search-results-390-light-scrolled.jpg" width="180" alt="Search: “solo leveling” 390px light scrolled"></a> <a href="screenshots/baseline/search-results-390-dark-top.jpg"><img src="screenshots/baseline/search-results-390-dark-top.jpg" width="180" alt="Search: “solo leveling” 390px dark top"></a> <a href="screenshots/baseline/search-results-390-dark-scrolled.jpg"><img src="screenshots/baseline/search-results-390-dark-scrolled.jpg" width="180" alt="Search: “solo leveling” 390px dark scrolled"></a>


**768px**

<a href="screenshots/baseline/search-results-768-light-top.jpg"><img src="screenshots/baseline/search-results-768-light-top.jpg" width="220" alt="Search: “solo leveling” 768px light top"></a> <a href="screenshots/baseline/search-results-768-light-scrolled.jpg"><img src="screenshots/baseline/search-results-768-light-scrolled.jpg" width="220" alt="Search: “solo leveling” 768px light scrolled"></a> <a href="screenshots/baseline/search-results-768-dark-top.jpg"><img src="screenshots/baseline/search-results-768-dark-top.jpg" width="220" alt="Search: “solo leveling” 768px dark top"></a> <a href="screenshots/baseline/search-results-768-dark-scrolled.jpg"><img src="screenshots/baseline/search-results-768-dark-scrolled.jpg" width="220" alt="Search: “solo leveling” 768px dark scrolled"></a>


**1440px**

<a href="screenshots/baseline/search-results-1440-light-top.jpg"><img src="screenshots/baseline/search-results-1440-light-top.jpg" width="220" alt="Search: “solo leveling” 1440px light top"></a> <a href="screenshots/baseline/search-results-1440-light-scrolled.jpg"><img src="screenshots/baseline/search-results-1440-light-scrolled.jpg" width="220" alt="Search: “solo leveling” 1440px light scrolled"></a> <a href="screenshots/baseline/search-results-1440-dark-top.jpg"><img src="screenshots/baseline/search-results-1440-dark-top.jpg" width="220" alt="Search: “solo leveling” 1440px dark top"></a> <a href="screenshots/baseline/search-results-1440-dark-scrolled.jpg"><img src="screenshots/baseline/search-results-1440-dark-scrolled.jpg" width="220" alt="Search: “solo leveling” 1440px dark scrolled"></a>


### Title: The Eminence in Shadow


**390px**

<a href="screenshots/baseline/title-390-light-top.jpg"><img src="screenshots/baseline/title-390-light-top.jpg" width="180" alt="Title: The Eminence in Shadow 390px light top"></a> <a href="screenshots/baseline/title-390-light-scrolled.jpg"><img src="screenshots/baseline/title-390-light-scrolled.jpg" width="180" alt="Title: The Eminence in Shadow 390px light scrolled"></a> <a href="screenshots/baseline/title-390-dark-top.jpg"><img src="screenshots/baseline/title-390-dark-top.jpg" width="180" alt="Title: The Eminence in Shadow 390px dark top"></a> <a href="screenshots/baseline/title-390-dark-scrolled.jpg"><img src="screenshots/baseline/title-390-dark-scrolled.jpg" width="180" alt="Title: The Eminence in Shadow 390px dark scrolled"></a>


**768px**

<a href="screenshots/baseline/title-768-light-top.jpg"><img src="screenshots/baseline/title-768-light-top.jpg" width="220" alt="Title: The Eminence in Shadow 768px light top"></a> <a href="screenshots/baseline/title-768-light-scrolled.jpg"><img src="screenshots/baseline/title-768-light-scrolled.jpg" width="220" alt="Title: The Eminence in Shadow 768px light scrolled"></a> <a href="screenshots/baseline/title-768-dark-top.jpg"><img src="screenshots/baseline/title-768-dark-top.jpg" width="220" alt="Title: The Eminence in Shadow 768px dark top"></a> <a href="screenshots/baseline/title-768-dark-scrolled.jpg"><img src="screenshots/baseline/title-768-dark-scrolled.jpg" width="220" alt="Title: The Eminence in Shadow 768px dark scrolled"></a>


**1440px**

<a href="screenshots/baseline/title-1440-light-top.jpg"><img src="screenshots/baseline/title-1440-light-top.jpg" width="220" alt="Title: The Eminence in Shadow 1440px light top"></a> <a href="screenshots/baseline/title-1440-light-scrolled.jpg"><img src="screenshots/baseline/title-1440-light-scrolled.jpg" width="220" alt="Title: The Eminence in Shadow 1440px light scrolled"></a> <a href="screenshots/baseline/title-1440-dark-top.jpg"><img src="screenshots/baseline/title-1440-dark-top.jpg" width="220" alt="Title: The Eminence in Shadow 1440px dark top"></a> <a href="screenshots/baseline/title-1440-dark-scrolled.jpg"><img src="screenshots/baseline/title-1440-dark-scrolled.jpg" width="220" alt="Title: The Eminence in Shadow 1440px dark scrolled"></a>


### Reader: chapter 1


**390px**

<a href="screenshots/baseline/reader-390-light-top.jpg"><img src="screenshots/baseline/reader-390-light-top.jpg" width="180" alt="Reader: chapter 1 390px light top"></a> <a href="screenshots/baseline/reader-390-light-scrolled.jpg"><img src="screenshots/baseline/reader-390-light-scrolled.jpg" width="180" alt="Reader: chapter 1 390px light scrolled"></a> <a href="screenshots/baseline/reader-390-dark-top.jpg"><img src="screenshots/baseline/reader-390-dark-top.jpg" width="180" alt="Reader: chapter 1 390px dark top"></a> <a href="screenshots/baseline/reader-390-dark-scrolled.jpg"><img src="screenshots/baseline/reader-390-dark-scrolled.jpg" width="180" alt="Reader: chapter 1 390px dark scrolled"></a>


**768px**

<a href="screenshots/baseline/reader-768-light-top.jpg"><img src="screenshots/baseline/reader-768-light-top.jpg" width="220" alt="Reader: chapter 1 768px light top"></a> <a href="screenshots/baseline/reader-768-light-scrolled.jpg"><img src="screenshots/baseline/reader-768-light-scrolled.jpg" width="220" alt="Reader: chapter 1 768px light scrolled"></a> <a href="screenshots/baseline/reader-768-dark-top.jpg"><img src="screenshots/baseline/reader-768-dark-top.jpg" width="220" alt="Reader: chapter 1 768px dark top"></a> <a href="screenshots/baseline/reader-768-dark-scrolled.jpg"><img src="screenshots/baseline/reader-768-dark-scrolled.jpg" width="220" alt="Reader: chapter 1 768px dark scrolled"></a>


**1440px**

<a href="screenshots/baseline/reader-1440-light-top.jpg"><img src="screenshots/baseline/reader-1440-light-top.jpg" width="220" alt="Reader: chapter 1 1440px light top"></a> <a href="screenshots/baseline/reader-1440-light-scrolled.jpg"><img src="screenshots/baseline/reader-1440-light-scrolled.jpg" width="220" alt="Reader: chapter 1 1440px light scrolled"></a> <a href="screenshots/baseline/reader-1440-dark-top.jpg"><img src="screenshots/baseline/reader-1440-dark-top.jpg" width="220" alt="Reader: chapter 1 1440px dark top"></a> <a href="screenshots/baseline/reader-1440-dark-scrolled.jpg"><img src="screenshots/baseline/reader-1440-dark-scrolled.jpg" width="220" alt="Reader: chapter 1 1440px dark scrolled"></a>


### Library


**390px**

<a href="screenshots/baseline/library-390-light-top.jpg"><img src="screenshots/baseline/library-390-light-top.jpg" width="180" alt="Library 390px light top"></a> <a href="screenshots/baseline/library-390-light-scrolled.jpg"><img src="screenshots/baseline/library-390-light-scrolled.jpg" width="180" alt="Library 390px light scrolled"></a> <a href="screenshots/baseline/library-390-dark-top.jpg"><img src="screenshots/baseline/library-390-dark-top.jpg" width="180" alt="Library 390px dark top"></a> <a href="screenshots/baseline/library-390-dark-scrolled.jpg"><img src="screenshots/baseline/library-390-dark-scrolled.jpg" width="180" alt="Library 390px dark scrolled"></a>


**768px**

<a href="screenshots/baseline/library-768-light-top.jpg"><img src="screenshots/baseline/library-768-light-top.jpg" width="220" alt="Library 768px light top"></a> <a href="screenshots/baseline/library-768-light-scrolled.jpg"><img src="screenshots/baseline/library-768-light-scrolled.jpg" width="220" alt="Library 768px light scrolled"></a> <a href="screenshots/baseline/library-768-dark-top.jpg"><img src="screenshots/baseline/library-768-dark-top.jpg" width="220" alt="Library 768px dark top"></a> <a href="screenshots/baseline/library-768-dark-scrolled.jpg"><img src="screenshots/baseline/library-768-dark-scrolled.jpg" width="220" alt="Library 768px dark scrolled"></a>


**1440px**

<a href="screenshots/baseline/library-1440-light-top.jpg"><img src="screenshots/baseline/library-1440-light-top.jpg" width="220" alt="Library 1440px light top"></a> <a href="screenshots/baseline/library-1440-light-scrolled.jpg"><img src="screenshots/baseline/library-1440-light-scrolled.jpg" width="220" alt="Library 1440px light scrolled"></a> <a href="screenshots/baseline/library-1440-dark-top.jpg"><img src="screenshots/baseline/library-1440-dark-top.jpg" width="220" alt="Library 1440px dark top"></a> <a href="screenshots/baseline/library-1440-dark-scrolled.jpg"><img src="screenshots/baseline/library-1440-dark-scrolled.jpg" width="220" alt="Library 1440px dark scrolled"></a>


### History


**390px**

<a href="screenshots/baseline/history-390-light-top.jpg"><img src="screenshots/baseline/history-390-light-top.jpg" width="180" alt="History 390px light top"></a> <a href="screenshots/baseline/history-390-light-scrolled.jpg"><img src="screenshots/baseline/history-390-light-scrolled.jpg" width="180" alt="History 390px light scrolled"></a> <a href="screenshots/baseline/history-390-dark-top.jpg"><img src="screenshots/baseline/history-390-dark-top.jpg" width="180" alt="History 390px dark top"></a> <a href="screenshots/baseline/history-390-dark-scrolled.jpg"><img src="screenshots/baseline/history-390-dark-scrolled.jpg" width="180" alt="History 390px dark scrolled"></a>


**768px**

<a href="screenshots/baseline/history-768-light-top.jpg"><img src="screenshots/baseline/history-768-light-top.jpg" width="220" alt="History 768px light top"></a> <a href="screenshots/baseline/history-768-light-scrolled.jpg"><img src="screenshots/baseline/history-768-light-scrolled.jpg" width="220" alt="History 768px light scrolled"></a> <a href="screenshots/baseline/history-768-dark-top.jpg"><img src="screenshots/baseline/history-768-dark-top.jpg" width="220" alt="History 768px dark top"></a> <a href="screenshots/baseline/history-768-dark-scrolled.jpg"><img src="screenshots/baseline/history-768-dark-scrolled.jpg" width="220" alt="History 768px dark scrolled"></a>


**1440px**

<a href="screenshots/baseline/history-1440-light-top.jpg"><img src="screenshots/baseline/history-1440-light-top.jpg" width="220" alt="History 1440px light top"></a> <a href="screenshots/baseline/history-1440-light-scrolled.jpg"><img src="screenshots/baseline/history-1440-light-scrolled.jpg" width="220" alt="History 1440px light scrolled"></a> <a href="screenshots/baseline/history-1440-dark-top.jpg"><img src="screenshots/baseline/history-1440-dark-top.jpg" width="220" alt="History 1440px dark top"></a> <a href="screenshots/baseline/history-1440-dark-scrolled.jpg"><img src="screenshots/baseline/history-1440-dark-scrolled.jpg" width="220" alt="History 1440px dark scrolled"></a>


### Profile


**390px**

<a href="screenshots/baseline/profile-390-light-top.jpg"><img src="screenshots/baseline/profile-390-light-top.jpg" width="180" alt="Profile 390px light top"></a> <a href="screenshots/baseline/profile-390-light-scrolled.jpg"><img src="screenshots/baseline/profile-390-light-scrolled.jpg" width="180" alt="Profile 390px light scrolled"></a> <a href="screenshots/baseline/profile-390-dark-top.jpg"><img src="screenshots/baseline/profile-390-dark-top.jpg" width="180" alt="Profile 390px dark top"></a> <a href="screenshots/baseline/profile-390-dark-scrolled.jpg"><img src="screenshots/baseline/profile-390-dark-scrolled.jpg" width="180" alt="Profile 390px dark scrolled"></a>


**768px**

<a href="screenshots/baseline/profile-768-light-top.jpg"><img src="screenshots/baseline/profile-768-light-top.jpg" width="220" alt="Profile 768px light top"></a> <a href="screenshots/baseline/profile-768-light-scrolled.jpg"><img src="screenshots/baseline/profile-768-light-scrolled.jpg" width="220" alt="Profile 768px light scrolled"></a> <a href="screenshots/baseline/profile-768-dark-top.jpg"><img src="screenshots/baseline/profile-768-dark-top.jpg" width="220" alt="Profile 768px dark top"></a> <a href="screenshots/baseline/profile-768-dark-scrolled.jpg"><img src="screenshots/baseline/profile-768-dark-scrolled.jpg" width="220" alt="Profile 768px dark scrolled"></a>


**1440px**

<a href="screenshots/baseline/profile-1440-light-top.jpg"><img src="screenshots/baseline/profile-1440-light-top.jpg" width="220" alt="Profile 1440px light top"></a> <a href="screenshots/baseline/profile-1440-light-scrolled.jpg"><img src="screenshots/baseline/profile-1440-light-scrolled.jpg" width="220" alt="Profile 1440px light scrolled"></a> <a href="screenshots/baseline/profile-1440-dark-top.jpg"><img src="screenshots/baseline/profile-1440-dark-top.jpg" width="220" alt="Profile 1440px dark top"></a> <a href="screenshots/baseline/profile-1440-dark-scrolled.jpg"><img src="screenshots/baseline/profile-1440-dark-scrolled.jpg" width="220" alt="Profile 1440px dark scrolled"></a>


### Onboarding step 1


**390px**

<a href="screenshots/baseline/onboarding-390-light-top.jpg"><img src="screenshots/baseline/onboarding-390-light-top.jpg" width="180" alt="Onboarding step 1 390px light top"></a> <a href="screenshots/baseline/onboarding-390-dark-top.jpg"><img src="screenshots/baseline/onboarding-390-dark-top.jpg" width="180" alt="Onboarding step 1 390px dark top"></a>


**768px**

<a href="screenshots/baseline/onboarding-768-light-top.jpg"><img src="screenshots/baseline/onboarding-768-light-top.jpg" width="220" alt="Onboarding step 1 768px light top"></a> <a href="screenshots/baseline/onboarding-768-dark-top.jpg"><img src="screenshots/baseline/onboarding-768-dark-top.jpg" width="220" alt="Onboarding step 1 768px dark top"></a>


**1440px**

<a href="screenshots/baseline/onboarding-1440-light-top.jpg"><img src="screenshots/baseline/onboarding-1440-light-top.jpg" width="220" alt="Onboarding step 1 1440px light top"></a> <a href="screenshots/baseline/onboarding-1440-dark-top.jpg"><img src="screenshots/baseline/onboarding-1440-dark-top.jpg" width="220" alt="Onboarding step 1 1440px dark top"></a>


### Onboarding step 2


**390px**

<a href="screenshots/baseline/onboarding2-390-light-top.jpg"><img src="screenshots/baseline/onboarding2-390-light-top.jpg" width="180" alt="Onboarding step 2 390px light top"></a> <a href="screenshots/baseline/onboarding2-390-light-scrolled.jpg"><img src="screenshots/baseline/onboarding2-390-light-scrolled.jpg" width="180" alt="Onboarding step 2 390px light scrolled"></a> <a href="screenshots/baseline/onboarding2-390-dark-top.jpg"><img src="screenshots/baseline/onboarding2-390-dark-top.jpg" width="180" alt="Onboarding step 2 390px dark top"></a> <a href="screenshots/baseline/onboarding2-390-dark-scrolled.jpg"><img src="screenshots/baseline/onboarding2-390-dark-scrolled.jpg" width="180" alt="Onboarding step 2 390px dark scrolled"></a>


**768px**

<a href="screenshots/baseline/onboarding2-768-light-top.jpg"><img src="screenshots/baseline/onboarding2-768-light-top.jpg" width="220" alt="Onboarding step 2 768px light top"></a> <a href="screenshots/baseline/onboarding2-768-light-scrolled.jpg"><img src="screenshots/baseline/onboarding2-768-light-scrolled.jpg" width="220" alt="Onboarding step 2 768px light scrolled"></a> <a href="screenshots/baseline/onboarding2-768-dark-top.jpg"><img src="screenshots/baseline/onboarding2-768-dark-top.jpg" width="220" alt="Onboarding step 2 768px dark top"></a> <a href="screenshots/baseline/onboarding2-768-dark-scrolled.jpg"><img src="screenshots/baseline/onboarding2-768-dark-scrolled.jpg" width="220" alt="Onboarding step 2 768px dark scrolled"></a>


**1440px**

<a href="screenshots/baseline/onboarding2-1440-light-top.jpg"><img src="screenshots/baseline/onboarding2-1440-light-top.jpg" width="220" alt="Onboarding step 2 1440px light top"></a> <a href="screenshots/baseline/onboarding2-1440-light-scrolled.jpg"><img src="screenshots/baseline/onboarding2-1440-light-scrolled.jpg" width="220" alt="Onboarding step 2 1440px light scrolled"></a> <a href="screenshots/baseline/onboarding2-1440-dark-top.jpg"><img src="screenshots/baseline/onboarding2-1440-dark-top.jpg" width="220" alt="Onboarding step 2 1440px dark top"></a> <a href="screenshots/baseline/onboarding2-1440-dark-scrolled.jpg"><img src="screenshots/baseline/onboarding2-1440-dark-scrolled.jpg" width="220" alt="Onboarding step 2 1440px dark scrolled"></a>


### Landing (/ first visit)


**390px**

<a href="screenshots/baseline/landing-390-light-top.jpg"><img src="screenshots/baseline/landing-390-light-top.jpg" width="180" alt="Landing (/ first visit) 390px light top"></a> <a href="screenshots/baseline/landing-390-light-scrolled.jpg"><img src="screenshots/baseline/landing-390-light-scrolled.jpg" width="180" alt="Landing (/ first visit) 390px light scrolled"></a> <a href="screenshots/baseline/landing-390-dark-top.jpg"><img src="screenshots/baseline/landing-390-dark-top.jpg" width="180" alt="Landing (/ first visit) 390px dark top"></a> <a href="screenshots/baseline/landing-390-dark-scrolled.jpg"><img src="screenshots/baseline/landing-390-dark-scrolled.jpg" width="180" alt="Landing (/ first visit) 390px dark scrolled"></a>


**768px**

<a href="screenshots/baseline/landing-768-light-top.jpg"><img src="screenshots/baseline/landing-768-light-top.jpg" width="220" alt="Landing (/ first visit) 768px light top"></a> <a href="screenshots/baseline/landing-768-light-scrolled.jpg"><img src="screenshots/baseline/landing-768-light-scrolled.jpg" width="220" alt="Landing (/ first visit) 768px light scrolled"></a> <a href="screenshots/baseline/landing-768-dark-top.jpg"><img src="screenshots/baseline/landing-768-dark-top.jpg" width="220" alt="Landing (/ first visit) 768px dark top"></a> <a href="screenshots/baseline/landing-768-dark-scrolled.jpg"><img src="screenshots/baseline/landing-768-dark-scrolled.jpg" width="220" alt="Landing (/ first visit) 768px dark scrolled"></a>


**1440px**

<a href="screenshots/baseline/landing-1440-light-top.jpg"><img src="screenshots/baseline/landing-1440-light-top.jpg" width="220" alt="Landing (/ first visit) 1440px light top"></a> <a href="screenshots/baseline/landing-1440-light-scrolled.jpg"><img src="screenshots/baseline/landing-1440-light-scrolled.jpg" width="220" alt="Landing (/ first visit) 1440px light scrolled"></a> <a href="screenshots/baseline/landing-1440-dark-top.jpg"><img src="screenshots/baseline/landing-1440-dark-top.jpg" width="220" alt="Landing (/ first visit) 1440px dark top"></a> <a href="screenshots/baseline/landing-1440-dark-scrolled.jpg"><img src="screenshots/baseline/landing-1440-dark-scrolled.jpg" width="220" alt="Landing (/ first visit) 1440px dark scrolled"></a>

