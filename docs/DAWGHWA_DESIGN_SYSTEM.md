# Dawghwa design system

The blueprint (WEBTOON-style screens, see `docs/DAWGHWA_AUDIT.md`) sets the structure. The identity is the selected directions B and C. B is the editorial grid: Archivo display type, numbered section heads, hard ink frames and stickers. C is the mascot-led warmth: the beagle reader, lime as the action colour, lavender and vermilion as secondary accents. The source of truth is `src/styles/tokens.css`. This page explains the tokens and the rules for using them.

## Blueprint v2 (current)

The v2 blueprint PDF supersedes the earlier editorial direction. Values live in `src/styles/tokens.css`.
- Type: Inter variable for everything; headings 700, section heads 21px, nav labels 10px uppercase.
- Dark: bg #171717, surface #1e1e1e / #2a2a2a / #434343, nav #000, ink #fff / #cfcfcf / #9e9e9e, accent #00f07a.
- Light: bg #fff, surface #f2f2f2, accent text #00733a, nav #fff.
- Brand: gradient #c631ff → #ee31ff (onboarding, primary CTAs); stage #040108 behind the mascot; "hot" #e040fb.
- Covers 10:13, 4px radius; titles one line; green reason line; "New Chapter" badge.
- Mascot: border collie with blue bandana and book (`src/assets/mascot/*`, `brand/mascot-source.png`), violet glow, white speech bubble.

## Principles

1. Dark first. Dark is the default theme. Light is a full alternative (Profile > Appearance), and System follows the OS.
2. Art leads. Covers and key art carry the colour. The chrome stays neutral, so the art is never fighting the UI.
3. One action colour. Lime (`--accent`) marks the primary action on a screen. White pills are used over artwork (hero "Start reading").
4. Quiet empty states. Centred grey copy and a small mascot, with one action at most.
5. Every control does something real. If the API cannot do something, the control is not shown.

## Colour

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--bg` | `#0e0e10` | `#f6f5f1` | Page |
| `--surface` / `-2` / `-3` | `#1c1c20` / `#26262b` / `#313137` | `#ecebe6` / `#e2e1db` / `#d6d5ce` | Cards, chips, pressed |
| `--ink` / `-2` / `-3` | 18.3:1 / 12.1:1 / 7.0:1 | 18.0:1 / 10.4:1 / 6.1:1 | Text hierarchy (contrast on `--bg`) |
| `--accent` (lime `#b8f35a`) | fill | fill | Primary buttons, active nav, selected markers |
| `--accent-text` | `#b8f35a` | `#3b6300` | Lime used as text (6.9:1 on paper) |
| `--hot` (vermilion `#ff5948`) | | | Avoid/negative chips, "hot" stickers |
| `--lavender` (`#b8a5f7`) | | | Mascot, brand mark, secondary stickers |
| `--on-bright` (`#151519`) | | | Text on lime, vermilion and lavender fills (5.9:1 or more) |

## Type

- Display: Archivo Variable (`--font-display`). Used for headings, titles over art, the brand word, onboarding questions and numbers.
- Body: Inter Variable (`--font-body`).
- Scale: `--text-2xs` 11px to `--text-3xl` (fluid, 34 to 60px). Uppercase labels use 11 to 12.5px with 0.05 to 0.1em tracking (tabs, kickers, nav).

## Space, radius and motion

- 4px base: `--space-1` (4) to `--space-16` (64). The page gutter is `clamp(16px, 4vw, 32px)`.
- Radius: 6px (`--radius-sm`), 8px for covers (`--radius-card`), 14px for hero and sheets, and full for pills.
- Motion: `--dur-fast` 120ms, `--dur` 200ms, `--dur-slow` 320ms, with `--ease-out`. Under reduced motion, animations are removed and the onboarding "Finding stories" beat is skipped.

## Components (where they live)

| Component | File | Blueprint reference |
| --- | --- | --- |
| Hero carousel (scroll-snap, dots, arrows, keys, no autoplay) | `src/components/Hero.tsx` | Home key art with "Start Reading" and "+ Subscribe" |
| Category shelf (genre tablist and cover row) | `src/components/CategoryShelf.tsx` | "Popular Series by Category" |
| Title card, cover (5:7, fallback, mature blur) | `src/components/TitleCard.tsx`, `Cover.tsx` | Cover rows |
| Title page (header, centred cover, tabs, sticky CTA, About sheet) | `src/routes/TitlePage.tsx` (`.tp*`) | Title, About sheet |
| Search landing (trending row, category tiles) | `src/routes/Search.tsx` | "What Everyone's Searching", "Browse Categories" |
| Library tabs and scope | `src/routes/Library.tsx` (`.lib-tabs`, `.lib-scope`) | My Series |
| Onboarding chips, Next (n), finding splash | `src/routes/Onboarding.tsx` (`.onboard-*`) | Onboarding |
| Sheets, menu rows (56/64px), radio dots | `src/components/Layer.tsx`, `.menu-item`, `.radio-dot` | Bottom sheets |
| Toast with Undo | `src/components/Toast.tsx` | "Subscribed to your list" |
| Empty, error and offline states | `src/components/States.tsx` | Centred empty copy |

## Layout breakpoints

- Under 600px: phone. Bottom nav with 5 labelled items, a topbar with brand, search and avatar, and a 4:5 hero.
- 600 to 1023px: tablet. The bottom nav is centred (up to 120px per item) and the hero is 4:3.
- 1024px and up: desktop. Sidebar navigation (with History and shortcuts), the header search box aligned to the 1440px content column, and a hero with blurred key art and the cover on the right.

## Content rules

- Mature covers (provider content rating of suggestive or adult, or Ecchi-type genres) are blurred by default. Profile > "Show mature covers" turns the blur off. The hero never features these titles.
- Error copy never shows raw HTTP status text.
- Counts and progress are shown only when both sides are known. Totals are never guessed.
