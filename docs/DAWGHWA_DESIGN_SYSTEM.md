# Dawghwa design system

The blueprint (WEBTOON-style screens, see `docs/DAWGHWA_AUDIT.md`) sets the structure. The identity is the selected directions B and C. B is the editorial grid: Archivo display type, numbered section heads, hard ink frames and stickers. C is the mascot-led warmth: the beagle reader, lime as the action colour, lavender and vermilion as secondary accents. The source of truth is `src/styles/tokens.css`. This page explains the tokens and the rules for using them.

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
- Reward motion tokens: `--dur-enter` 360ms (reward card in), `--dur-ring` 700ms (ring fill), `--dur-celebrate` 3200ms (how long a reward card stays), `--stagger` 45ms, `--rise` 10px, `--pop-scale` 1.08, `--ease-spring`. All are zeroed under `[data-reduce-motion]` and `prefers-reduced-motion`, so rewards appear and change instantly. There is no confetti.
- Reward colours are aliases, not new hues: `--reward-xp` = lime (action, progress), `--reward-quest` = lavender (mascot, quests, cosmetics), `--reward-new` = vermilion (new genre stamps), `--ring-track`, and badge tiers `--tier-1` ink-3, `--tier-2` lavender, `--tier-3` lime.
- Discovery motion tokens (D42 to D44): `--dur-slide` 420ms (hero slides and shelf arrows, tweened in `src/lib/motion.ts`), `--dur-drift` 22s with `--drift-scale` 1.08 (hero key-art ken-burns), `--lift` -4px with `--shadow-lift` (card hover and focus). Reduced motion sets slide to 0ms, drift scale to 1 and lift to 0px, and the hero animations to `none`.
- Art fades: `--art-fade` (bottom, phone hero) and `--art-fade-side` (left, desktop hero). Copy over key art is checked against real pixels by `scripts/qa/hero-contrast.mjs`. Don't weaken a fade without running it.
- Cards: vermilion = new (the "Up" sticker and the "N new" unread pill), lime = progress (the bar along the cover's bottom edge). See D45.

## Components (where they live)

| Component | File | Blueprint reference |
| --- | --- | --- |
| Hero carousel (scroll-snap, dots, arrows, keys, no autoplay) | `src/components/Hero.tsx` | Home key art with "Start Reading" and "+ Subscribe" |
| Category shelf (genre tablist and cover row) | `src/components/CategoryShelf.tsx` | "Popular Series by Category" |
| Title card, cover (5:7, fallback, mature blur) | `src/components/TitleCard.tsx`, `Cover.tsx` | Cover rows |
| Title page (header, centred cover, tabs, sticky CTA, About sheet) | `src/routes/TitlePage.tsx` (`.tp*`) | Title, About sheet |
| Search landing (trending row, category tiles) | `src/routes/Search.tsx` | "What Everyone's Searching", "Browse Categories" |
| Library tabs and scope | `src/routes/Library.tsx` (`.lib-tabs`, `.lib-scope`) | My Series |
| Onboarding: mascot speech bubble, genre tiles with checks, colour swatches, progress dots, sticky footer, ready screen | `src/routes/Onboarding.tsx` (`.onboard-*`, `.ob-tile`, `.ob-ready`) | Onboarding (PDF pp. 9-14) |
| Sheets, menu rows (56/64px), radio dots | `src/components/Layer.tsx`, `.menu-item`, `.radio-dot` | Bottom sheets |
| Toast with Undo | `src/components/Toast.tsx` | "Subscribed to your list" |
| Empty, error and offline states; `ProfileSkeleton`, `ListSkeleton` | `src/components/States.tsx` | Centred empty copy |
| Reward card (`celebrate()`, haptics, optional mascot) | `src/components/Celebrate.tsx` (`.reward-*`) | n/a (gamification layer) |
| Progress ring | `src/components/ProgressRing.tsx` (`.ring*`) | n/a |
| Badge medallion (locked, tiers I-III, progress ring) | `src/components/Badge.tsx` (`.badge*`) | n/a |
| Quest card / list / Home strip | `src/components/Quests.tsx` (`.quest*`) | n/a |
| Avatar with cosmetic frame | `src/components/ProfileAvatar.tsx` (`.pavatar*`) | n/a |
| Segmented control | `src/components/Segmented.tsx` (`.segmented`) | n/a |
| Comments sheet / list / composer | `src/components/Comments.tsx` (`.cm*`) | n/a |
| Reader top bar, end panel, reward beat | `src/routes/Reader.tsx` (`.rd-top`, `.rd-end`, `.rd-beat`) | n/a |
| Series progress ring on cards | `ProgressRing` + `useSeriesFraction` (`.card-ring`, `.continue-ring`) | n/a |
| Achievements page | `src/routes/Achievements.tsx` (`.ach-*`, `.badge-grid`) | n/a |
| Sign-in ("Who's reading?", PIN pad) | `src/components/SignIn.tsx` (`.signin*`) | n/a |
| Monthly recap | `src/routes/Profile.tsx` (`.recap*`) | n/a |
| Reader card sheet and PNG | `src/lib/profile/card.ts`, `Profile.tsx` (`.reader-card*`) | n/a |

## Layout breakpoints

- Under 600px: phone. Bottom nav with 5 labelled items, a topbar with brand, search and avatar, and a 4:5 hero.
- 600 to 1023px: tablet. The bottom nav is centred (up to 120px per item) and the hero is 4:3.
- 1024px and up: desktop. Sidebar navigation (with History and shortcuts), the header search box aligned to the 1440px content column, and a hero with blurred key art and the cover on the right.

## Content rules

- Mature covers (provider content rating of suggestive or adult, or Ecchi-type genres) are blurred by default. Profile > "Show mature covers" turns the blur off. The hero never features these titles.
- Error copy never shows raw HTTP status text.
- Counts and progress are shown only when both sides are known. Totals are never guessed.

## Accessibility checks

Every control has an accessible name that contains its visible text (WCAG 2.5.3), touch targets are at least 44px, and colour pairs meet AA in both themes. `e2e/a11y.spec.ts` enforces this with axe-core on every core route. Use a `.sr-only` suffix rather than an `aria-label` that replaces visible text.
