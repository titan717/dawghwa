# Hero (Hero3D, Home carousel, landing hero)

Owner: FORGE (component), NOVA (landing usage). Research: `docs/research/motion-and-a11y.md` sections 1-2.

## Anatomy

- Layers, back to front: blurred cover backdrop (static `filter: blur()` image, never animated blur) -> cover art (2:3, `--radius`) -> `--art-fade` (phone, bottom) or `--art-fade-side` (desktop, left) -> text block -> actions.
- Text block: optional kicker (Label size, e.g. "Featured", "#1 this year" in `--accent-text` on dark only), title (Display `--text-2xl` 700, white, max 2 lines, ellipsis), meta (Small, `#cfcfcf`), genres (Small).
- Actions: one primary (white pill / black text over art, "Start reading" or "Continue ch. 12"), one secondary outline white ("Save"). On the landing the primary is the green "Start reading" below the hero, so the hero itself has no green fill.
- Props: `{ title, subtitle?, coverUrl, href, priority?, headingLevel?: 1|2|'p', onClick? }`. `priority` sets `fetchpriority="high"`, `loading="eager"`, `decoding="async"` with width/height. Default `headingLevel` 2; landing passes `'p'` because its page `<h1>` follows.

## Sizes

| Width | Layout | Height |
| --- | --- | --- |
| 360-412 | Full-bleed, cover centred top, text over bottom fade | aspect 4/5, max 72vh |
| 768 | Full-bleed, cover left 40%, text right | aspect 16/10 |
| 1024-1440 | Max width 1200 centred, 7/5 columns, side fade | aspect 16/9, max 560px |

Text never sits on raw art: only on `--art-fade`/`--art-fade-side` (white on 0.82 black = 13.58:1). `scripts/qa/hero-contrast.mjs` must pass at all six widths in both themes.

## Tilt (3D)

- Only when `(hover: hover) and (pointer: fine)` matches and reduced motion is off (OS or in-app).
- Pointer position maps to `rotateX` within `+-var(--tilt-max-x)` (6deg) and `rotateY` within `+-var(--tilt-max-y)` (8deg); layers translate in Z 0/12/24px for depth.
- Updates in one `requestAnimationFrame` per frame; `will-change: transform` added on `pointerenter`, removed on `pointerleave`; return to 0 over `--dur-slow`.
- No gyroscope tilt in cycle 1 (needs a permission prompt on iOS; vestibular risk).
- The extruded title shadow (layered `text-shadow`) is static and does not move with tilt.

## Carousel (Home only)

- Up to 5 slides, `aria-roledescription="carousel"` on the region, each slide `role="group"` `aria-roledescription="slide"` `aria-label="2 of 5"`.
- Auto-advance every 7s, only when reduced motion is off, the tab is visible and no element inside has focus or hover. A visible Pause/Play button (44px, first control in the region, `aria-label="Pause slides"`) stops it (WCAG 2.2.2).
- Controls: previous/next 44px icon buttons on fine pointer; dots are 24px-spaced buttons with 44px hit areas, `aria-current="true"` on the active one (dot also filled, not colour only). Swipe on touch, plus the buttons (2.5.7).
- Slide change: crossfade `--dur` (opacity only); instant under reduced motion. The live region is off during auto-advance (`aria-live="off"`) and polite when the user changes slide.

## States

- Loading: `Skeleton` with the same aspect box (CLS 0), shimmer static under reduced motion.
- Error/empty: original brand art (mascot + rooftop strip) with the brand word; never an error box above the fold.
- Mature: never featured (filtered with `isMature()`); unreadable titles filtered with `isKnownUnreadable()`.

## Acceptance

Axe clean; one heading at the chosen level; LCP image has `fetchpriority=high`; no layout shift on load; tilt absent on touch and under reduced motion; Pause works by keyboard.
