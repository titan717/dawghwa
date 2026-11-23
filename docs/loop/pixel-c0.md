# PIXEL cycle 0 log

Date: 2026-11-23. Branch `agent/c0-pixel-specs` from `agent/cycle-1` (5efc0d1).

## Done
- Read DESIGN.md, DESIGN_REVIEW_C2.md, existing tokens, Layer.tsx Sheet, Toast.tsx, States.tsx, IncognitoNotice.tsx.
- Wrote `docs/research/motion-and-a11y.md` (accessible tilt, reduced motion, WCAG 2.2 target size and focus, bottom sheet, toasts, swipe cards).
- Wrote `docs/design/specs/` (README + 10 specs) and DESIGN.md 4.5 + section 16.
- Added `scripts/qa/contrast-pairs.mjs`: 67 pairs, 0 unexpected failures.
- Design note reviews sent (all APPROVED WITH CHANGES): SPARK, COMPASS, QUILL, PULSE, HEARTH, NOVA.

## Findings for FORGE (tokens.css owner)
- Add `--radius`, `--control-line`, `--scrim`, `--on-art-scrim`, `--reader-chrome`, `--incognito-tint`, `--sepia-*`, motion travel and tilt tokens; zero them in both reduced-motion blocks.
- Light `--nav-bg` must be `#000`.
- `.switch` off track and search field need a `--control-line` boundary (1.4.11).
- `.cover` aspect 10/13 -> 2/3.
- Sheet: move to native `<dialog>` + inert; initial focus rule; Toast: pre-mounted regions, pause on hover/focus, 5s/8s.

## Note
Review messages mentioned `--bad-text`; that token does not exist. Specs use `--bad`/`--warn` (already text-safe).
