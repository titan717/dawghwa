# FORGE design note, cycle 1: BottomNav, Incognito button, Hero3D

Owner: FORGE. Reviewer: PIXEL (UI). Research: `docs/research/bottom-bar.md`.
Branches (each a PR into `agent/cycle-1`, merged in this order):
1. `agent/c1-forge-ui-primitives`: `BottomSheet`, `Toast` upgrade (shared, lands first).
2. `agent/c1-forge-bottom-nav`: Spec B.
3. `agent/c1-forge-incognito-button`: Spec A.
4. `agent/c1-forge-hero3d`: Spec C and the airy Home pass.

No new dependency. Plain CSS with the existing tokens. No feature flag: all four are
Tier 1 core and replace existing behavior (rollback = revert the PR).

## 1. Shared primitives (per PIXEL's component spec)

- `src/components/ui/BottomSheet.tsx`: `role="dialog"`, `aria-modal="true"`,
  `aria-labelledby` its title; focus moves to the sheet and is trapped, restored on close;
  Escape, scrim tap and a drag-down on the handle close it; body scroll locked; sits
  above the bottom nav (z 60), bottom padding includes `--safe-bottom`; max width 560px
  centred from 600px up; slide-up 220ms `--ease-out`, none under reduced motion.
- `src/components/Toast.tsx` (existing store, same `toast()` API so no caller changes):
  add `data-testid`, keep one `aria-live="polite"` region, position above the bottom nav
  (already `bottom: calc(var(--bottomnav-h) + var(--safe-bottom) + 12px)`), and at 1024px+
  bottom-centre. A `src/components/ui/Toast.ts` re-export so specs' import path works.

## 2. Spec B: one BottomNav

Goal: one component, mounted once in the shell, identical box and look on every screen
below 1024px, hidden from 1024px.

Files: new `src/components/BottomNav.tsx`; `src/app/Shell.tsx` (replace inline nav);
`src/styles/app.css` bottom-nav block, `.shell[data-own-chrome]` rules; `tokens.css`
`--nav-bg` light; `e2e/bottom-nav.spec.ts`; `docs/loop/forge-c1.md`.

Behavior:
- `<nav class="bottom-nav bottomnav" aria-label="Primary">`, five tabs from the existing
  `navItems()` (Home, Discover, Search, My Series, Profile), order and labels unchanged.
- Black in both themes (`--nav-bg: #000`), inactive `#9e9e9e`, active: filled green pill
  behind the icon (`--accent`, 48x28, radius full, black glyph) and label `#00f07a`.
  Fixes DESIGN_REVIEW_C2 #3 and #4.
- Fixed height `--bottomnav-h` (62px) plus `--safe-bottom`; same 5 equal columns at
  every width below 1024px (drop the tablet 120px centring so the box is identical;
  PIXEL may veto and keep it).
- History and Achievements light the Profile tab (they are reached from Profile).
- Keyboard: `html[data-kbd]` hides the bar while the soft keyboard is open
  (`visualViewport` shrink over 150px, or the native `--keyboard-h` from Capacitor).
- Title pages: the bar now shows; the title page's sticky Read button moves up to sit
  directly above it (`bottom: calc(var(--bottomnav-h) + var(--safe-bottom))`). I change
  the shell rule; QUILL is told in a handoff since the title page is theirs.
- Reader: stays immersive with no bar in cycle 1 (D10). `BottomNav` accepts
  `autoHide` (hide on scroll down, show on scroll up or tap) for later reuse.
- `.main` keeps matching bottom padding; nothing else changes on pages.

Acceptance (`e2e/bottom-nav.spec.ts`, mobile projects 360x740, 390x844, 412x915):
count 1 on every route (`/`, `/discover`, `/search`, `/library`, `/profile`,
`/history`, `/achievements`, `/about`, 404, a title page when the API is up); bottom
edge equals viewport height; identical box across routes and after scrolling; black
background and green active pill in dark and light; with CDP safe-area insets (bottom
34) height is 96 and flush; keyboard simulation hides it; at 1024 and 1440
`display: none` and the header is visible.

## 3. Spec A: Incognito icon button

Goal: one press toggles Incognito from anywhere; state always obvious.

Files: new `src/components/IncognitoButton.tsx`, `src/components/IncognitoIcon.tsx`;
`Shell.tsx` (mount points, single `IncognitoNotice`, tint attribute); `Home.tsx` (Home
bar); `shell.css`; `src/lib/store/incognito.test.ts` (seen key); `e2e/incognito-button.spec.ts`.

Placement (needs PIXEL's call, see Risks):
- Desktop: in `.app-header-actions`, before the streak chip.
- Mobile Home: in the sticky Home bar, between Surprise me and the avatar.
- Mobile other tab routes: phones have no shell top bar (D6). Proposal: a slim sticky
  shell top bar (48px + safe-top, `--bg`, same edge treatment as the Home bar) on
  non-Home shell routes with only the brand mark (link home) on the left and the
  Incognito button on the right. Page h1s stay where they are. No search or avatar, so
  it does not repeat the bottom nav (UX audit #1). Title pages keep their own header and
  get the button from QUILL via a handoff (exported component).

Behavior: as Spec A. 44x44 target, `aria-pressed`, label "Turn on/off Incognito".
ON: filled icon, top bar and header tinted (`html[data-incognito]`, a 12% purple tint
token checked for AA), slim `IncognitoNotice` banner, bottom sheet the first time
(copy from Spec A, "Don't show this again" writes `dawghwa:incognito-sheet-seen`), toast
afterwards. OFF: toast "Incognito off". Memory only (store unchanged).
- `IncognitoNotice` mounted once in the shell for every route including `/profile`;
  Profile's own copy is removed by its owner (handoff) or I remove the one line with
  their OK. The reader gets a compact chip from QUILL (handoff).
- The guard is a deny-list, so the seen key already saves; a unit test pins that
  `canWriteLocal("dawghwa:incognito-sheet-seen")` is true while on.

Acceptance: e2e per route (button visible, first press opens a dialog named
Incognito, "Got it" closes, `aria-pressed=true`, banner by test id), second press OFF
with toast, "Don't show again" then toast-only, reload ends Incognito, storage
unchanged test (IndexedDB row counts and non-allow-listed localStorage keys after a
browse in Incognito), focus returns to the button, axe on the open sheet both themes.

## 4. Spec C: Hero3D with the real title

Files: new `src/components/Hero3D.tsx`, `src/styles/hero3d.css`; `Hero.tsx` becomes the
carousel shell using `Hero3D` slides; `Home.tsx` (QuestStrip moved below the first two
rails per SPARK and DESIGN_REVIEW_C2 #11, airier spacing); `src/components/Hero3D.test.tsx`;
`e2e/hero3d.spec.ts`.

Contract (agreed with NOVA for the landing):
`Hero3D({ title, subtitle?, kicker?, coverUrl, href, priority?, onClick?, actions? })`.
Root `div.hero3d` with fixed `aspect-ratio` (4/5 phone, 16/7 desktop) so a same-size
skeleton gives CLS 0. Cover and title are wrapped in one router `Link` (`onClick`
forwarded); `actions` (Start reading, Save) sit outside the link so no interactive
nesting. Title is a live `<h2>` with the exact series title and an extruded look from
stacked text-shadows; selectable and read by screen readers. `priority` sets
`fetchpriority="high"` and `loading="eager"` on the cover.

Motion: CSS 3D only. Pointer tilt sets `--rx/--ry` (max 10/14deg) on the card,
eased back on leave/blur; gyroscope only after an explicit tap on iOS (permission),
off by default elsewhere. Reduced motion (media query or the app's
`data-reduce-motion`) and low-end devices (`hardwareConcurrency <= 4` or
`saveData`) get a static layered version with `transform: none`.
Carousel: existing scroll-snap track kept; auto-advance every 7s, paused on hover,
focus-within, touch, hidden tab and reduced motion; arrow keys and visible focus.

Acceptance: unit test (h2 text equals title, priority attributes); e2e: pointer move
changes `--ry`; reduced motion keeps computed transform `none`; arrow keys move the
active slide; auto-advance pauses on hover; axe on Home in dark and light with 0
serious/critical; Lighthouse mobile on Home reported with real numbers.

## API contract

None. Uses existing catalog data only. No provider names in any new text or link.

## Risks

- Mobile top bar on non-Home routes reverses part of D6; PIXEL decides. Fallback if
  rejected: Incognito button only in the Home bar, Profile and the desktop header, and
  the e2e route list shrinks accordingly.
- Showing the bar on title pages touches QUILL's sticky CTA; coordinated by handoff.
- Equal-width tablet bar changes the M9 look; PIXEL may keep the centred variant (the
  identical-box test only runs at phone widths then).
- Auto-advance can annoy; it is off under reduced motion and pauses on any interaction.
- The heavy lock is shared; e2e runs are scoped to the three spec files.
