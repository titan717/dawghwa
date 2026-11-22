# Dawghwa design system, Phase 2

Source of truth: `src/styles/tokens.css`. Contrast proof: `npm run contrast` (`scripts/contrast-check.mjs`), run in CI by `src/test/contrast.test.ts`. This document supersedes the colour, motion and card sections of `docs/DAWGHWA_DESIGN_SYSTEM.md`; that file stays as the component inventory.

## Direction: Night Market stage, Paper Scroll pages

We merge the two directions instead of picking one.

- Direction A, Neon Night Market, is the stage for dark, AMOLED and light. Dawghwa is a reader for full-colour webtoon and manga art. A cool, neutral near-black (`#0B0D12`) makes covers and pages carry the colour, which is the existing principle "art leads" (DAWGHWA_DESIGN_SYSTEM.md). Most reading happens at night on phones, so dark stays the default. Coral (`#FF8A65`) is a warm, single action colour that reads as "lantern light" against the cool stage and never fights cover art the way the old lime did on every surface.
- Direction B, Paper Scroll, becomes the sepia theme. Warm paper `#F5F0E6` with brown ink `#28211A` is the best long-session reading surface for black-and-white manga and text-heavy chapters, and that is where its literary warmth helps. Making it the whole app would tint every cover sepia-adjacent and lose A's neutrality, so it is a theme, not the identity. Its violet (`#6B3FA0` / `#D0A7EF`) is offered as an accent.
- Kept from the current identity: Archivo (display) and Inter (body), the mascot colours (`--lime`, `--lavender`, `--vermilion`) as brand constants, and lime as the "new chapter" signal (`--new`), so coral (action) and lime (new) never compete.
- Not kept: hard offset shadows, ken-burns drift, lifts, springs and pops. Motion is fades and border/colour changes only.

## Attribute API

All attributes live on `<html>` (`document.documentElement`). The settings store (builder_c) writes them; tokens.css reads them.

| Attribute | Values | Default (no attribute) |
| --- | --- | --- |
| `data-theme` | `dark`, `light`, `amoled`, `sepia`, `system` | dark. `system` follows `prefers-color-scheme` in CSS (dark base, light values under the media query). The settings store may also resolve system to `dark`/`light` itself; both work. |
| `data-accent` | `coral`, `violet`, `lime`, `gold`, `mono` | coral |
| `data-density` | `compact`, `comfortable`, `spacious` | comfortable. Selector is `:root[data-density]`, so the existing `.grid[data-density="covers|compact"]` attribute does not collide. |
| `data-reduce-motion` | boolean | off; `prefers-reduced-motion: reduce` has the same effect |

Accents are defined per stage family: `--acc-dk-*` (dark, amoled) and `--acc-lt-*` (light, sepia). Each theme block maps them to `--accent*`. Never set `--acc-*` from components.

First paint: `index.html` reads `dawghwa:settings.theme` and accepts all four themes. If accent or density move to a per-profile store, the first-paint script must be extended (designer owns it; ask).

`<meta name="theme-color">` and Android system bars: use `--meta-theme` per theme (dark `#0B0D12`, amoled `#000000`, light `#F7F8FC`, sepia `#F5F0E6`).

## Colour tokens

Old names are all kept, so existing `app.css` keeps working; new names are additive.

| Token | Dark | AMOLED | Light | Sepia | Use |
| --- | --- | --- | --- | --- | --- |
| `--bg` | `#0B0D12` | `#000000` | `#F7F8FC` | `#F5F0E6` | Page |
| `--bg-raised` | `#10131A` | `#07080B` | `#FFFFFF` | `#FFFCF5` | Sheets, menus, cards that sit above the page |
| `--surface` | `#141821` | `#0E1117` | `#EEF0F6` | `#ECE5D6` | Inputs, rows, tiles |
| `--surface-2` | `#1C2330` | `#161B24` | `#E4E7EF` | `#E3DAC8` | Chips, hover |
| `--surface-3` | `#263042` | `#212836` | `#D7DBE5` | `#DDD3BF` | Pressed, progress track |
| `--ink` | `#F3F4F6` | same | `#171923` | `#28211A` | Primary text |
| `--ink-2` | `#C6CAD3` | same | `#3A3F4E` | `#4A3F33` | Secondary text |
| `--ink-3` | `#A3AAB8` | same | `#555B6C` | `#5D5145` | Meta text (chapter, source, time). AA on every surface |
| `--ink-4` | `#5B6270` | `#555C69` | `#9499A6` | `#A0937F` | Disabled and decorative only. Never informative text |
| `--line`, `--line-strong` | white 8% / 16% | 10% / 18% | ink 10% / 20% | ink 12% / 22% | Dividers and card outlines (decorative) |
| `--line-ui` (new) | `#6B7385` | same | `#767C8C` | `#85776A` | Borders that identify a control: inputs, unselected toggles, checkboxes. 3:1 on every surface |
| `--accent` | accent fill | | | | Primary button fill, active nav indicator, selected state. 3:1+ against every surface |
| `--accent-ink` | | | | | Text and icons on `--accent` |
| `--accent-text` | | | | | Accent as text, icons, links, focus ring (`--color-focus`) |
| `--accent-soft` | | | | | Tinted background for selected chips; text on it is `--accent-text` or `--ink` |
| `--new` / `--new-ink` / `--new-text` (new) | lime | | deep olive text | | "New chapter" / unread chips |
| `--hot` / `--hot-ink` / `--hot-text` | vermilion | | | | Legacy "hot" stickers. Use `--bad` for errors and negatives |
| `--good`, `--warn`, `--bad` | | | | | Status text colours, AA on every surface |
| `--chip-bg` / `--chip-ink` (new) | | | | | Neutral status chip |
| `--header-bg` (new) | translucent bg | | | | Sticky header fill (with `backdrop-filter: blur(var(--blur-chrome))`) |
| `--reader-bg` / `--reader-ink` / `--reader-bar` (new) | | | | | Reader stage; replaces hard-coded colours in reader.css |
| `--meta-theme` (new) | | | | | Browser/OS chrome colour |

### Accent options

| Accent | Dark-family fill / text | Light-family fill | Light-family text | Ink on fill |
| --- | --- | --- | --- | --- |
| coral (default, A) | `#FF8A65` | `#B4234D` | `#A51F47` | `#0B0D12` / `#FFFFFF` |
| violet (B) | `#D0A7EF` | `#6B3FA0` | `#6B3FA0` | `#0B0D12` / `#FFFFFF` |
| lime (legacy brand) | `#B8F35A` | `#3B6300` | `#3B6300` | `#151519` / `#FFFFFF` |
| gold | `#F2C35B` | `#7A4F00` | `#7A4F00` | `#0B0D12` / `#FFFFFF` |
| mono | `#F3F4F6` | `#171923` | `#171923` | `#0B0D12` / `#FFFFFF` |

Palette adjustments made by the contrast check: the brief's light coral `#B4234D` is 4.30:1 as text on sepia `--surface-3`, so coral text in the light family is `#A51F47` (the fill stays `#B4234D`, which only carries white text at 6.38:1). Sepia `--surface-3` was lightened from `#D7CCB6` to `#DDD3BF` and `--ink-3` darkened from `#62564A` to `#5D5145` (was 4.47:1). Coral `--accent-soft` in the light family is 8% (10% put coral text at 4.37:1 on sepia surface).

Teal and sky accents were left out on purpose: no hue in that range clears 3:1 as a fill on the light stages while also carrying dark text, and they would blur into `--good`.

## Measured contrast

Every pair below is checked in all 20 theme/accent combinations (94 pairs each, 1880 total). Text pairs need 4.5:1 (all token text is treated as normal size), UI pairs (`--accent` as a fill boundary, `--line-ui`, focus ring) need 3:1. Translucent tokens are composited over the theme background first. Regenerate with `node scripts/contrast-check.mjs --markdown`.

Pairs: `ink`, `ink-2`, `ink-3`, `accent-text`, `new-text`, `hot-text`, `lime-text`, `lavender-text`, `good`, `warn`, `bad`, `color-focus` on `bg`, `bg-raised`, `surface`, `surface-2`, `surface-3`; `accent-text`/`ink` on `accent-soft`, `lime-text` on `lime-soft`, `lavender-text` on `lavender-soft` (over `bg` and `surface`); `ink`, `ink-2`, `ink-3`, `accent-text` on `header-bg`; `accent-ink` on `accent` and `accent-hover`; `new-ink` on `new`; `hot-ink` on `hot`; `on-bright` on lime, vermilion, lavender; `chip-ink` on `chip-bg`; `reader-ink` on `reader-bg` and `reader-bar`; UI: `accent`, `line-ui`, `color-focus` on `bg`, `bg-raised`, `surface`, `surface-2`. The script also fails if `[data-theme="system"]` drifts from `[data-theme="light"]`.

| Theme | Accent | Pairs | Lowest text pair | Lowest UI pair |
| --- | --- | --- | --- | --- |
| dark | coral | 94 | 5.20:1 (`hot-text` on `surface-3`) | 3.31:1 (`line-ui` on `surface-2`) |
| dark | violet | 94 | 5.20:1 (`hot-text` on `surface-3`) | 3.31:1 (`line-ui` on `surface-2`) |
| dark | lime | 94 | 5.20:1 (`hot-text` on `surface-3`) | 3.31:1 (`line-ui` on `surface-2`) |
| dark | gold | 94 | 5.20:1 (`hot-text` on `surface-3`) | 3.31:1 (`line-ui` on `surface-2`) |
| dark | mono | 94 | 5.20:1 (`hot-text` on `surface-3`) | 3.31:1 (`line-ui` on `surface-2`) |
| amoled | coral | 94 | 5.80:1 (`hot-text` on `surface-3`) | 3.63:1 (`line-ui` on `surface-2`) |
| amoled | violet | 94 | 5.80:1 (`hot-text` on `surface-3`) | 3.63:1 (`line-ui` on `surface-2`) |
| amoled | lime | 94 | 5.80:1 (`hot-text` on `surface-3`) | 3.63:1 (`line-ui` on `surface-2`) |
| amoled | gold | 94 | 5.80:1 (`hot-text` on `surface-3`) | 3.63:1 (`line-ui` on `surface-2`) |
| amoled | mono | 94 | 5.80:1 (`hot-text` on `surface-3`) | 3.63:1 (`line-ui` on `surface-2`) |
| light | coral | 94 | 4.71:1 (`bad` on `surface-3`) | 3.37:1 (`line-ui` on `surface-2`) |
| light | violet | 94 | 4.71:1 (`bad` on `surface-3`) | 3.37:1 (`line-ui` on `surface-2`) |
| light | lime | 94 | 4.71:1 (`bad` on `surface-3`) | 3.37:1 (`line-ui` on `surface-2`) |
| light | gold | 94 | 4.71:1 (`bad` on `surface-3`) | 3.37:1 (`line-ui` on `surface-2`) |
| light | mono | 94 | 4.71:1 (`bad` on `surface-3`) | 3.37:1 (`line-ui` on `surface-2`) |
| sepia | coral | 94 | 4.89:1 (`accent-text` on `surface-3`) | 3.12:1 (`line-ui` on `surface-2`) |
| sepia | violet | 94 | 4.97:1 (`accent-text` on `surface-3`) | 3.12:1 (`line-ui` on `surface-2`) |
| sepia | lime | 94 | 4.76:1 (`accent-text` on `surface-3`) | 3.12:1 (`line-ui` on `surface-2`) |
| sepia | gold | 94 | 4.80:1 (`accent-text` on `surface-3`) | 3.12:1 (`line-ui` on `surface-2`) |
| sepia | mono | 94 | 4.98:1 (`lavender-text` on `surface-3`) | 3.12:1 (`line-ui` on `surface-2`) |

| Theme | Accent | `accent-ink` on `accent` | `accent-text` on `bg` | `accent-text` on `surface-2` | `accent` on `bg` (UI) |
| --- | --- | --- | --- | --- | --- |
| dark | coral | 8.39 | 8.39 | 6.81 | 8.39 |
| dark | violet | 9.67 | 9.67 | 7.84 | 9.67 |
| dark | lime | 13.87 | 14.81 | 12.01 | 14.81 |
| dark | gold | 11.78 | 11.78 | 9.55 | 11.78 |
| dark | mono | 17.65 | 17.65 | 14.32 | 17.65 |
| amoled | coral | 8.39 | 9.07 | 7.46 | 9.07 |
| amoled | violet | 9.67 | 10.45 | 8.59 | 10.45 |
| amoled | lime | 13.87 | 16.00 | 13.15 | 16.00 |
| amoled | gold | 11.78 | 12.73 | 10.46 | 12.73 |
| amoled | mono | 17.65 | 19.08 | 15.68 | 19.08 |
| light | coral | 6.38 | 6.85 | 5.88 | 6.01 |
| light | violet | 7.38 | 6.95 | 5.96 | 6.95 |
| light | lime | 7.06 | 6.66 | 5.71 | 6.66 |
| light | gold | 7.12 | 6.71 | 5.76 | 6.71 |
| light | mono | 17.50 | 16.49 | 14.14 | 16.49 |
| sepia | coral | 6.38 | 6.40 | 5.24 | 5.62 |
| sepia | violet | 7.38 | 6.50 | 5.31 | 6.50 |
| sepia | lime | 7.06 | 6.22 | 5.09 | 6.22 |
| sepia | gold | 7.12 | 6.27 | 5.13 | 6.27 |
| sepia | mono | 17.50 | 15.41 | 12.60 | 15.41 |

| Theme | `ink` on `bg` | `ink-2` on `bg` | `ink-3` on `bg` | `ink-3` on `surface-3` | `chip-ink` on `chip-bg` | `reader-ink` on `reader-bg` |
| --- | --- | --- | --- | --- | --- | --- |
| dark | 17.65 | 11.83 | 8.32 | 5.68 | 9.59 | 17.65 |
| amoled | 19.08 | 12.78 | 8.99 | 6.33 | 10.51 | 19.08 |
| light | 16.49 | 9.88 | 6.38 | 4.88 | 8.48 | 15.36 |
| sepia | 13.97 | 9.01 | 6.77 | 5.18 | 7.37 | 13.97 |

Not covered by this script: text over cover art and key art (that is `scripts/qa/hero-contrast.mjs` and `scripts/qa/title-contrast.mjs`, against real pixels), and component-level combinations a builder invents. axe in `e2e/a11y.spec.ts` covers rendered pages.

## Type

- Display: Archivo Variable (`--font-display`), weight `--weight-display` 800, tracking -0.02em, `--leading-tight` 1.08. Page titles, title names on the title page, section headings.
- Body and UI: Inter Variable (`--font-body`), `--leading-body` 1.5.
- Labels: Archivo at `--label-stretch` 68% width, uppercase, `--tracking-label` 0.06em, 11 to 13px. Use sparingly; no eyebrow above headings.
- Scale: `--text-2xs` 11 (labels only), `--text-xs` 12, `--text-sm` 13, `--text-base` 15, `--text-md` 17, `--text-lg` 20, `--text-xl` 22 to 28, `--text-2xl` 28 to 44, `--text-3xl` 34 to 60. Card titles `--text-sm`/`--text-base` weight `--weight-medium`, two lines max; meta `--text-xs` in `--ink-3`.
- Numbers in lists (chapter numbers, counts): `.tabular`.
- Fonts are self-hosted through `@fontsource-variable/archivo` (wdth axis) and `@fontsource-variable/inter`, imported in `src/main.tsx` and bundled by Vite. There are no runtime font requests (no Google Fonts, no CDN); `src/test/contrast.test.ts` fails if one is added to index.html or the stylesheets. No serif was added: the sepia theme gets its literary feel from paper and ink colour, and reader pages are images, so a new serif package would add weight without being read.

## Space, radius, elevation

- Space: 4px base, `--space-1` 4 to `--space-16` 64. Page gutter `--gutter` = clamp(16px, 4vw, 32px). Content column `--content-max` 1440px.
- Density tokens (comfortable / compact / spacious): `--control-h` 44 / 44 / 48 (never below 44px), `--row-h` 56 / 48 / 64, `--card-min` 132 / 108 / 156, `--grid-gap` 16 / 10 / 22, `--stack-gap` 24 / 16 / 36, `--pad-card` 12 / 8 / 16, `--pad-chip`, and a unitless `--density` 1 / 0.85 / 1.15. Use these instead of hard-coded gaps in grids, lists and sections so the density setting works everywhere.
- Radius: `--radius-xs` 3, `--radius-sm` 6 (buttons, inputs), `--radius-card` 8 (covers), `--radius-md` 10, `--radius-lg` 14 (sheets, menus), `--radius-full` (chips, pills).
- Elevation: `--elev-1` (menus, hovering cards), `--elev-2` (sheets, toasts), `--elev-3` (dialogs). AMOLED replaces shadows with 1px hairlines because shadows vanish on true black. Legacy `--shadow-lift`, `--shadow`, `--shadow-lg` alias these. Declare elevation once: border or shadow, not both. No hard offset shadows.
- Stacking: `--z-sticky` 20, `--z-header` 40, `--z-menu` 60, `--z-sheet` 80, `--z-toast` 85, `--z-skip` 100.

## Motion

- Only opacity fades and border/background/colour changes. No translate, scale, lift, drift, spring or parallax. `--lift`, `--rise`, `--panel-travel`, `--chapter-rise` are 0 and `--drift-scale`, `--pop-scale` are 1 everywhere, so older rules that still reference them become static.
- Durations: `--dur-fast` 120ms (hover, press, border), `--dur` 180ms (menus, toasts, image fade-in), `--dur-slow` 240ms (sheets). Easing `--ease-out`.
- Reduced motion (`data-reduce-motion` or `prefers-reduced-motion: reduce`): every duration token is 0ms and base.css clamps all animations and transitions to 0.01ms, one iteration, and disables smooth scrolling.
- Programmatic shelf scrolling (`--dur-slide`) moves scroll position, not elements, and is also 0 under reduced motion.

## Header spec (builder_a)

- One sticky header on every route except the reader: `position: sticky; top: 0; z-index: var(--z-header)`.
- Height: `--header-h` 56px under 1024px, 64px at 1024px and up. The box is `--header-total` tall (height + `--safe-top`), with `padding-top: var(--safe-top)` and `padding-inline: max(var(--gutter), var(--safe-left))` / `max(var(--gutter), var(--safe-right))`. The height never changes on scroll (no shrink), so there is no layout shift.
- Fill: `background: var(--header-bg)` with `backdrop-filter: blur(var(--blur-chrome))`, bottom `1px solid var(--line)`. All header text tokens are AA-checked over `--header-bg`.
- When mounted, set `:root { --topbar-h: var(--header-total); }` in shell.css. base.css then applies `scroll-padding-top` and `:focus { scroll-margin-top }` from it, so in-page anchors and keyboard focus land below the header (WCAG 2.4.11). Every other sticky element (tab bars, jump rails) uses `top: var(--topbar-h)`.
- Destinations: labelled text links (icon optional, never icon-only). Active page: `aria-current="page"`, text `--ink`, a 2px `--accent` bar under the label (UI contrast 3:1+), inactive `--ink-2`. Hover changes colour and background (`--surface`) only.
- Search: a visible field or a labelled button styled as one (`--surface` fill, `--line-ui` border, `--control-h` tall). The More menu is a `--bg-raised` panel, `--radius-lg`, `--elev-1`, `z-index: var(--z-menu)`, rows `--row-h`.

## Card spec (builder_b)

- Cover: `aspect-ratio: var(--cover-ratio)` (2:3), `border-radius: var(--radius-card)`, `object-fit: cover`, `background: var(--surface)` while loading, fade in with `--dur`. Covers never carry text other than art; the only overlays allowed on art are the mature-content blur label and a 3px progress bar along the bottom edge (`--accent` on `--surface-3`).
- Text below the art, never on it: title (`--ink`, `--text-sm` or `--text-base`, `--weight-medium`, 2-line clamp, full title in the accessible name), then one meta line (`--ink-3`, `--text-xs`): chapter info ("Ch. 112", "3 new", last read) and source.
- Status chips: always text, optionally with a 6px dot. Chip = `--chip-bg` fill, `--chip-ink` text, `--radius-full`, `--pad-chip`, `--text-2xs` to `--text-xs`, weight 600. Dot colours: ongoing `--good`, hiatus `--warn`, completed `--ink-3`, cancelled `--bad`. "New" chips: `--new` fill with `--new-ink` text. Colour is never the only signal.
- Hover/focus: border changes to `--line-strong` (or the cover outline to `--accent` for keyboard focus via `:focus-visible`), no lift. The whole card is one link; secondary actions (save, follow) are separate buttons outside the link.
- Grid: `grid-template-columns: repeat(auto-fill, minmax(var(--card-min), 1fr))`, `gap: var(--grid-gap)`. List style: rows of `--row-h`, 48px-wide cover thumbnail at 2:3.

## Component guidance for builders

- Use tokens, not literals. No raw `#fff`/`#000` on fills: text on `--accent` is `--accent-ink`, on `--new` is `--new-ink`, on `--hot` is `--hot-ink`, over artwork is `--on-art` behind `--art-fade`. Known literal debt in app.css for builders to replace: `.onboard-chip.is-neg` (`#fff` on `--hot` is about 3.2:1, fails: use `--bad`-tinted chip or `--hot-ink`), `.onboard-count`/`.onboard-tile*` fallback `#10140a`, hero pill whites (lines ~453 to 470), `.cover-mature`, reader.css `#0d0d10`/`#efeae0` (use `--reader-*`).
- Buttons: primary = `--accent` fill + `--accent-ink`, `--radius-sm`, height `--control-h`; secondary = `--surface` fill + `--ink` + `1px solid var(--line-ui)`; quiet = text `--ink-2`, hover `--surface`. Disabled = `--ink-4` text on `--surface`, plus `aria-disabled`.
- Inputs: `--surface` fill, `1px solid var(--line-ui)`, focus `2px` `--color-focus` outline (base.css default), placeholder `--ink-3`.
- Selected chips and toggles: `--accent-soft` fill + `--accent-text` text + `1px solid var(--accent)`; unselected: `--surface` + `--ink-2` + `--line-ui`. Selection must also be exposed via `aria-pressed`/`aria-checked`.
- Sections: heading in Archivo, `--stack-gap` between sections, no eyebrow labels, no numbered section heads.
- Empty, loading and error states: centred `--ink-2` copy with one action; skeletons use `--skeleton-a`/`--skeleton-b` with a fade (no shimmer sweep under reduced motion).
- Theme switcher previews (builder_c): render a small swatch per theme by setting `data-theme` on a wrapper element: theme blocks are attribute selectors, so `[data-theme="sepia"]` on any element re-themes its subtree (style the wrapper with `--bg`/`--ink` directly; the `--color-*` aliases resolve once at `:root` and do not follow). Accent previews: same with `data-accent` is not supported on non-root elements (selector is `:root[data-accent]`); render accent swatches from the documented hex values or a wrapper that sets `--accent`/`--accent-ink` inline.
- Before a PR: `npm run contrast` must pass if you add a token pair; add new pairs to `PAIRS` in scripts/contrast-check.mjs.
