# Dawghwa design system (DESIGN.md)

This is the single design reference for Dawghwa. It consolidates `docs/DAWGHWA_DESIGN_SYSTEM.md` (history and component catalogue), the live tokens in `src/styles/tokens.css`, and the final product decisions in the builder brief. Where they disagree, this file and the brief win; `DAWGHWA_DESIGN_SYSTEM.md` is kept for history (its Archivo / lime / lavender / sidebar sections are superseded).

Owner: PIXEL. Changes to these rules go through /root.

## 1. Direction in one paragraph

Cover-first and quiet. The artwork is the only loud thing on screen. Chrome is neutral grey, type is one family at a handful of sizes, and colour is a signal, not decoration: green means "you can act here" or "this is the current state", the purple gradient means "this is a Dawghwa brand moment". Structure follows the shape readers already know from mainstream webtoon and manga apps (big key-art hero, horizontal cover rails with See all, two-up cover grids on phones, black tab bar). We take the information architecture only: never their branding, assets, copy, markup or styles.

## 2. Non-negotiables (checklist for every PR)

1. Covers lead. Every discovery surface shows covers before it shows chrome.
2. Greys carry layout. Surfaces, dividers, chips and secondary buttons use `--bg`, `--surface*`, `--line*`, `--ink*` only.
3. Green `#00f07a` (`--accent`) only for action and state, used as a fill with black text (`--accent-ink`). Green text or icons in light theme use `--accent-text` (`#00733a`).
4. Purple gradient (`--grad-brand`) only for brand moments (onboarding, the mascot stage, level-up / reward beat, install prompt). Never on routine UI.
5. Inter only, five working sizes (section 5).
6. 4/8 grid for every gap, padding and size.
7. Covers are 2:3 with one corner radius; titles sit beneath covers, never on them.
8. One corner radius for content (`--radius`, section 6); pills (`--radius-full`) only for chips and toggles.
9. Phone grids are two covers per row. Rails show about six items then See all.
10. Loading is skeletons, not spinners. Fades are short and soft. Everything honours reduced motion.
11. WCAG AA: 4.5:1 text, 3:1 large text and UI parts. Visible focus. 44px touch targets.
12. Light and dark at parity: every screen designed and checked in both.
13. Mobile: black bottom nav with a filled green active tab. Desktop (>=1024px): sticky header with navigation. No sidebar anywhere.
14. Users never see sources, providers, domains or backend details, including in hints and settings copy. Errors are generic ("Chapter unavailable").

## 3. Layout and breakpoints

| Range | Name | Chrome | Content |
| --- | --- | --- | --- |
| < 600px | phone | Black bottom nav, 5 labelled tabs (Home, Discover, Search, My Series, Profile). Home has its own sticky brand bar. | Gutter 16px. Grids 2 per row. Rails show ~2.5 covers to signal scroll. |
| 600-1023px | tablet | Same bottom nav, items centred (max 120px each). | Gutter `clamp(16px, 4vw, 32px)`. Grids 3-4 per row. |
| >= 1024px | desktop | Sticky `.app-header` (64px, `--app-header-h`): brand, text nav (Home, Discover, Search, My Series, History), search field, avatar. No sidebar. | Content column max 1440px. Rails show 6-8 covers. Grids auto-fill from 156px. |

Rules:
- One search entry per screen. On desktop the header search is the entry; the Search page should not repeat a second identical field above the fold (it owns the results view).
- Page widths: discovery pages use the full content column; settings-like pages (Profile, History) use a centred 720px reading column. Pick one per page type and keep it.
- `--topbar-h` is 0 on phone/tablet and 64px on desktop; sticky page elements sit below it.

## 4. Colour

Values are in `src/styles/tokens.css`. Do not add hues; add aliases if you need a new role.

### Neutrals (carry all layout)

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--bg` | `#171717` | `#ffffff` | Page |
| `--surface` | `#1e1e1e` | `#f2f2f2` | Cards, tiles, sheets |
| `--surface-2` | `#2a2a2a` | `#e8e8e8` | Chips, secondary buttons, cover placeholder |
| `--surface-3` | `#434343` | `#ececec` | Search field, pressed, ring track |
| `--line` / `--line-strong` | white 8% / 16% | ink 10% / 20% | Dividers, outlines |
| `--ink` | `#ffffff` (17.9:1) | `#111111` (18.9:1) | Titles, primary text |
| `--ink-2` | `#cfcfcf` (11.4:1) | `#3d3d3d` (10.9:1) | Body |
| `--ink-3` | `#9e9e9e` (6.6:1) | `#626262` (6.0:1) | Meta, captions, inactive nav |
| `--ink-4` | `#666666` | `#9a9a9a` | Decorative / disabled only, never readable text |
| `--nav-bg` | `#000000` | see note | Bottom nav |

Note on the bottom nav: the product rule is a black bottom nav. Today light theme sets `--nav-bg: #ffffff`. Decision: the nav is black in both themes (`--nav-bg: #000` everywhere, inactive labels `#9e9e9e`, active tab green fill). This is listed as a finding in `DESIGN_REVIEW_C2.md`.

### Action and state (green)

| Token | Value | Use |
| --- | --- | --- |
| `--accent` | `#00f07a` | Fill for the primary action on a screen, active nav tab, selected chip, toggle on, progress bar, focused field outline |
| `--accent-ink` | `#000000` | Text and icons on a green fill (about 15:1) |
| `--accent-text` | dark `#00f07a` / light `#00733a` (5.6:1) | Green as text or icon: rank lines ("#1 this year"), active nav label, links that are actions |
| `--accent-soft` | 14% green | Selected row background |
| `--badge-bg` / `--badge-ink` | dark `#005c27`/`#00f07a`, light `#d5fbe6`/`#00612f` | "New chapter" badge |

Rules:
- At most one green-filled button per view. Secondary actions are grey (`--surface-2`) or outline.
- Green never decorates: no green tile backgrounds, green section numbers, green border stripes, or green brand words.
- Never put `#00f07a` text on a white or light surface; use `--accent-text`.

### Brand (purple)

| Token | Value | Use |
| --- | --- | --- |
| `--grad-brand` | `#c631ff -> #ee31ff` | Onboarding Continue, reward / level-up beat, install prompt. |
| `--brand-stage` | `#040108` | Behind the mascot artwork. |
| `--lavender`, `--lavender-text` | `#a66bff`, dark `#c39bff` / light `#6a33c8` | Mascot glow, quest / reward accents inside the gamification layer only. |
| `--hot`, `--hot-text` | `#e040fb`, dark `#ec6dff` / light `#9c1fb8` | Reserved; avoid on routine UI. |

Purple is never used for format labels, section accents, avatars or chips outside a brand moment.

### Other

- `--good`, `--warn`, `--bad`: status messages only. They are text-safe in both themes (see 4.5), so use them directly for danger labels; never as fills.
- `--control-line` (dark `#7a7a7a`, light `#767676`): boundary for fields, switch-off tracks, slider and ring tracks. `--surface-3` alone is 1.81:1 (dark) / 1.18:1 (light) against the page and fails WCAG 1.4.11.

### 4.5 Verified pairs

`node scripts/qa/contrast-pairs.mjs` checks 67 token pairs and exits non-zero on an unexpected failure; the full table is in `docs/design/specs/README.md`. Known failures the specs route around:
- Dark `--ink-3` on `--surface-3` (3.69:1): placeholders in fields use `--ink-2` (6.35:1).
- Light `--accent` fill on white (1.53:1): green states always carry a check icon, text or position cue; green strokes and bars in light use `--accent-text` (5.98:1).
- Light `--lavender` as text (3.40:1) and white on `--lavender` (3.40:1): use `--lavender-text`, and `#000` on lavender fills (6.17:1).
- New tokens (radius alias, control line, scrims, incognito tint, sepia, motion travel) are listed in `docs/design/specs/README.md`.
- Avatars use neutral surfaces with the initial in `--ink`, or the profile's chosen cosmetic frame. No arbitrary orange/red discs.
- Art overlays: `--art-fade` (phone hero) and `--art-fade-side` (desktop hero); copy over key art is checked by `scripts/qa/hero-contrast.mjs`.

## 5. Type

Inter Variable for everything (`--font-body`; `--font-display` is also Inter). Weights 400, 500, 600, 700. No outlined, stroked or 900-weight display type.

Five working sizes:

| Role | Token | Size | Weight | Use |
| --- | --- | --- | --- | --- |
| Display | `--text-2xl` | 28-44px fluid | 700 | Hero title, page title (Home hero, Discover, My Series, History, Profile name) |
| Heading | `--text-lg` | 20px | 700 | Section heads ("Popular this year") |
| Body | `--text-base` | 15px | 400/500 | Paragraphs, list rows, buttons |
| Small | `--text-sm` | 13px | 500 | Cover titles (2 lines max), meta, hints |
| Label | `--text-2xs` | 11px | 600, uppercase, 0.06em | Badges, kickers, bottom-nav labels (10-11px) |

`--text-xs`, `--text-md`, `--text-xl`, `--text-3xl` stay in tokens for legacy use but new code uses only the five above. Literal `font-size` values in CSS are not allowed; use the token.

## 6. Space, radius, elevation

- Spacing: `--space-1` (4) through `--space-16` (64). Every margin, padding and gap is a multiple of 4; prefer 8, 16, 24, 32. No 6px, 10px, 14px, 18px literals.
- Gutter: 16px phone, `--gutter` beyond.
- Section rhythm: 32px between sections on phone, 40px on desktop; 12px between a section head and its rail.
- Radius: one content radius, 4px, matching the blueprint cover (`.cover` already uses 4px) and search field. It applies to covers, tiles, cards, buttons, fields and sheets' top corners. `--radius-full` is only for chips, toggles, avatars and dots. Retire `--radius-sm`, `--radius-md`, `--radius-lg` in new code. (Implementation: add `--radius: 4px` alias in tokens and migrate; see review.)
- Borders: 1px `--line` hairlines only. No 2px ink frames, offset "hard" shadows, dashed borders or halftone dot fields (the editorial "panel" language is retired).
- Elevation: flat. `--shadow` only for floating layers (sheets, menus, toasts). `--shadow-lift` on desktop hover is allowed if reduced motion zeroes the lift.

## 7. Covers and cards

- Aspect ratio 2:3 for every cover (`.cover`). Today `.cover` is 10:13 (`src/styles/app.css` `.cover { aspect-ratio: 10 / 13 }`); migrate to `2 / 3`.
- Radius: the one radius. Placeholder `--surface-2`, then a soft fade-in when the image loads.
- Title beneath the cover: `--text-sm`, `--ink`, 2 lines max with ellipsis. One meta line beneath in `--ink-3`, or a green reason/rank line in `--accent-text`.
- Badges on covers: at most one, top-left, label size, `--badge-bg`/`--badge-ink` for "New chapter". Mature covers are blurred with a neutral "Mature" pill.
- Progress: a 3px `--accent` bar along the cover's bottom edge.
- Press state: scale 0.98 for `--dur-fast`; disabled under reduced motion.

## 8. Rails and grids

- Rail (`src/components/Row.tsx`): section head (Heading size) with a visible "See all" text link and chevron on the right, then a horizontal scroll-snap row. Render about 6 items (max 8 on desktop) and send the rest to See all. Phones show ~2.5 covers so the row reads as scrollable; desktop shows arrows on hover.
- Grid (`.grid`): 2 per row under 600px, auto-fill from 156px above. 16px column gap, 24px row gap.
- Category / genre tiles: neutral `--surface` tile, label top-left, a single cover (or a 3-cover fan without tilt) bottom-right, never clipped badges. No tile is green; selection state can be.

## 9. Navigation

- Phone/tablet bottom nav (`.bottomnav` in `src/styles/app.css`): black (`#000`) in both themes, 62px + safe area, five tabs, each >= 44px. Inactive: `--ink-3` icon and label. Active: a filled green pill behind the icon (`--accent` fill, 48x28, `--radius-full`) with a black icon, and the label in `#00f07a` (on black, 11.6:1). `aria-current="page"` drives it.
- Desktop header (`.app-header`, `src/styles/shell.css`): sticky, 64px, `--bg` with a 1px `--line` bottom border and `--blur-chrome` frost when scrolled. Active link: `--ink` text with a 2px green underline. History lives here (and in My Series on phones).
- No sidebar anywhere.

## 10. Buttons, chips, fields

- Primary: green fill, black text, 44px min height (48px on phones for page-level CTAs), Body size 600.
- Secondary: `--surface-2` fill, `--ink` text. Over artwork: white fill / black text ("Start reading") and outline white ("Save"), which is the only white-pill exception.
- Chips: `--surface-2`, pill radius, 36px visual / 44px hit area. Selected: green fill, black text. 1px borders only.
- Search field: `--surface-3`, one radius, 46-48px, no border at rest; `--accent` outline only while focused.
- Toggles: on = green track, black knob; off = `--surface-3` track.

## 11. Motion

- Durations: `--dur-fast` 120ms (press), `--dur` 200ms (fades), `--dur-slow` 320ms (sheets). Ease `--ease-out`. No bounce on routine UI; `--ease-spring*` only in the reader and reward beat.
- Fades are opacity (plus at most 8px travel). Hero ken-burns (`--dur-drift`) is the only ambient motion.
- Reduced motion: `reducedMotion()` in `src/lib/settings.ts` sets `[data-reduce-motion]`, and `prefers-reduced-motion` applies the same zeroing in `tokens.css`. Any new duration, travel or scale must be added to both zeroing blocks. Cycle 1 adds `--sheet-travel`, `--toast-travel`, `--page-travel`, `--swipe-fly` (zeroed) and `--tilt-max-x` 6deg / `--tilt-max-y` 8deg (zeroed to 0deg). Tilt runs only on `(hover: hover) and (pointer: fine)`.

## 12. Loading, empty, error

- Skeletons in `--skeleton-a`/`--skeleton-b` matching the final layout (cover 2:3 plus two title lines). No spinners for content; `.spin` is only for an in-button pending state, and is static under reduced motion.
- Empty: centred mascot (small), one Heading-size line, one Body line in `--ink-2`, at most one primary action.
- Error: generic copy ("Chapter unavailable", "Something went wrong"), a Retry. Never HTTP status, provider or domain.

## 13. Accessibility

- Contrast: text 4.5:1, large text and UI parts 3:1, in both themes. The token table lists the ratios; recheck if you change a value.
- Focus: 2px `--color-focus` (`--accent-text`) outline with 2px offset, visible on every interactive element, never removed.
- Targets: 44x44px minimum, including small icon buttons and chevron "See all".
- Names: visible text is part of the accessible name (WCAG 2.5.3); use `.sr-only` suffixes, not replacing `aria-label`s. `e2e/a11y.spec.ts` enforces axe on all core routes in both themes.

## 14. Copy

- Sentence case for headings and buttons. Uppercase only at Label size.
- Plain, short, honest. Counts only when both sides are known. Language is a content choice.
- No source/provider vocabulary in UI text: say "Covers marked suggestive or adult are blurred" rather than "the source marks", "where available" rather than "where the source offers them".

## 15. Reference structure (not branding)

The screen structure is inspired by mainstream webtoon and manga reading apps: Home = key-art hero + stacked cover rails; Discover = genre/format entry points leading to grids; Search = trending covers + categories; My Series = tabs over a 2-up cover grid; Profile = settings list. We do not copy their logos, colours, illustrations, iconography, copy, markup or CSS.

## 16. Component specs

Cycle 1 component specs live in `docs/design/specs/` (index and shared rules in its README): hero, bottom sheet, toast, swipe cards, reader controls, settings, share sheet, profile, comment composer, and empty/loading/error/offline/partial states. Research: `docs/research/motion-and-a11y.md`.
