# Bottom bar: reproduction, symptoms and root cause (FORGE, cycle 0)

Date: 2026-11-23. Owner: FORGE. Build inspected: `main` at
https://github.com/titan717/dawghwa/commit/5efc0d105b754670fae4afd645c444327aec184a
(Vercel status `success`). Production serves the same entry bundle as a local
`vite build` of that commit (`assets/index-DUcJoLz2.js` in both), so local and
production results below are the same code.

## Method

Playwright (Chromium, `isMobile`, touch, DPR 2, service workers blocked) against
https://dawghwa.vercel.app and a local `vite preview` of the same commit. A fresh
profile passes the landing (`dawghwa:entered=1`) and skips onboarding, then each
route is measured at the top and after scrolling to the end. Measured per route:
number of `nav.bottomnav` nodes, bounding box, computed `display`/`position`,
background, active tab, `.main` bottom padding, any ancestor that would trap a
`position: fixed` child (transform, filter, perspective, contain, backdrop-filter),
horizontal overflow, and the lowest content edge versus the bar's top.

Extra scenarios: soft keyboard (input focused, layout viewport shrunk by 336px,
which is what `interactive-widget=resizes-content` does on Android Chrome),
simulated notch and gesture-bar insets (CDP `Emulation.setSafeAreaInsetsOverride`,
top 47, bottom 34), a browser toolbar collapse (viewport grows 56px), widths 600,
768, 1023 and 1024, light theme, a title page and the reader.

Scripts (not shipped): `probe.mjs`, `probe2.mjs`, `probe3.mjs` in FORGE's
workspace; raw geometry for production dark in `docs/research/data/bottom-bar-prod-dark.json`.

## Results

### Geometry is correct on the shell routes

At 360x740, 390x844 and 412x915, on `/`, `/discover`, `/search`, `/library`,
`/profile`, `/history`, `/achievements`, `/about` and a 404, production and local:

- exactly one `nav.bottomnav`, `position: fixed`, `display: grid`, height 62px,
  bottom edge flush with the viewport (740 / 844 / 915), same box on every route;
- the box does not move while scrolling Home (12 samples, one unique box);
- no ancestor creates a containing block for fixed elements; no horizontal overflow
  (`scrollWidth === innerWidth`);
- `.main` has 86px bottom padding (62 + 24), so the last content ends above the bar;
- with simulated insets (47/34) the bar grows to 96px (62 + 34) and stays flush,
  and Home's sticky bar is 103px (56 + 47) starting at 0;
- after a toolbar collapse the bar follows the new bottom edge.

Screenshots: `img/bottom-bar/prod-360-home.jpg`, `prod-390-home-scrolled.jpg`,
`prod-412-search.jpg`, `prod-390-home-insets.jpg`, `local-360-home.jpg`,
`local-390-home.jpg`, `local-412-home.jpg`.

So the "detached bar on Home" from earlier cycles does not reproduce on this build
in emulation: the cycle 1 sticky Home bar fix (#41) holds. What remains are the
defects below, which are what makes the bar look different or misplaced.

### Defects found

| # | Symptom | Where | Root cause |
|---|---------|-------|------------|
| B1 | Bar floats on top of the soft keyboard: on `/search` with the input focused the bar sits at y=446..508 of a 508px layout viewport, covering suggestions right above the keys (`prod-390-search-keyboard.jpg`). | Android Chrome; also the native app (Capacitor `Keyboard.resize: "body"` resizes the page the same way) | `index.html` sets `interactive-widget=resizes-content`, so the layout viewport shrinks when the keyboard opens and `bottom: 0` moves up with it. Nothing hides the bar while the keyboard is open (no `visualViewport` listener, the native `--keyboard-h` variable set in `lib/platform/index.ts` is not used by the bar). |
| B2 | Bar disappears on title pages and is replaced by a full-width green "Read chapter 1" button (`prod-390-title.jpg`). | `/title/*` below 1024px | `Shell.tsx` sets `data-own-chrome` on `/title/` and `app.css` (`.shell[data-own-chrome] .bottomnav { display: none }`). Rule says the same bar on every screen. |
| B3 | No bar in the reader. | `/read/*` | The reader route is outside `<Shell>` in `router.tsx`, and `[data-immersive] .bottomnav` hides it too. Spec B allows auto-hide in the reader, with the same component. |
| B4 | Bar is white in light theme (`prod-390-home-light.jpg`). | light theme | `tokens.css` light block `--nav-bg: #ffffff`. Rule: black in both themes (DESIGN.md, DESIGN_REVIEW_C2 #3). |
| B5 | Active tab is a green tinted glyph and label, not a filled green tab; `.nav-ico` background is transparent on the active item in both themes. | all | `app.css` `.bottomnav a[aria-current="page"]` only sets `color` and fills the svg (DESIGN_REVIEW_C2 #4). |
| B6 | Tablet (600-1023px) bar differs: items capped at 120px and centred, labels 11px (`prod-768-home.jpg`). | 600-1023px | `app.css` M9 block. Not a bug per DESIGN.md, but a different look; keep or unify per PIXEL. |
| B7 | No tab is active on `/history`, `/achievements`, `/about`, 404. | those routes | They are not tabs. Expected; History and Awards could light their parent tab (Profile) so the bar never looks "lost". |
| B8 | The bar markup lives inline in `Shell.tsx` (class `bottomnav`), with no component, so there is nothing a test or the reader can reuse. | code | Not a visual bug; Spec B asks for one `BottomNav` component. |

### viewport-fit and keyboard

- `viewport-fit=cover` is already set, together with `interactive-widget=resizes-content`.
  `env(safe-area-inset-*)` is read through `--safe-*` tokens; verified with simulated insets.
- Capacitor 8 `SystemBars` (core) passes insets through to `env()` on WebView 140+
  when `viewport-fit=cover` is set; on older WebViews it pads the WebView natively and
  injects `--safe-area-inset-*` CSS variables, which our tokens do not read. Result on
  old WebViews: `env()` is 0, but the WebView itself is already inset, so no overlap.
  Unverified on a device (no Android device here).
- iOS Safari ignores `interactive-widget`; its keyboard overlays the page and the fixed
  bar stays behind it. Unverified on a device.
- Keyboard emulation in headless Chromium is a viewport resize, not a real IME.

### Incognito mounting (for Spec A)

- `IncognitoNotice` is mounted in `Shell.tsx` on every shell route except `/profile`,
  and Profile mounts its own copy with `showTurnOff={false}` next to its switch. So it
  is mounted twice in code and the reader (outside the shell) has none.
- There is no Incognito control outside the Profile switch.
- Phones have no shell top bar (decision D6); only Home has a sticky bar. So "icon in
  the mobile top bar" needs a decision for the other tab routes (see the design note).
- The storage guard in `lib/store/incognito.ts` is a DENY-list (`LOCAL_DENY_PREFIXES`),
  not the allow-list the master prompt describes. A new `dawghwa:incognito-sheet-seen`
  key therefore already saves in Incognito; a unit test will pin that.
- `Toasts` renders an always-present `role="status"` region, and the banner is also
  `role="status"`, so tests must target `data-testid="incognito-notice"`.

### Out-of-scope finding, reported to AMIT

Title links on production are `/title/<source>/<id>/<slug>`, and the first segment
is a provider id (seen on the Home hero link). That breaks the rule that no provider
or source name appears in any link. Owner: RELAY/QUILL (canonical ids, `/t/<id>`).

## Recommendation

1. Extract `BottomNav` (one component, mounted once in the shell, `nav.bottom-nav`
   plus the existing `bottomnav` class for compatibility), black in both themes, filled
   green active pill, same box at every width below 1024px.
2. Hide it while the keyboard is open: `visualViewport` delta over 150px or the native
   `--keyboard-h`, toggling `html[data-kbd]`.
3. Show it on title pages; the title page's sticky Read button sits above it
   (handoff to QUILL for the title page CSS).
4. Reader: keep it hidden in Cycle 1 (D10 removed the reader bottom bar); if PIXEL wants
   it, the reader mounts the same `BottomNav` with `autoHide`.
5. `e2e/bottom-nav.spec.ts` asserts count 1, flush bottom, identical box across routes
   and scroll, black background and filled active tab, at 360/390/412, both themes,
   with simulated insets, and the keyboard hide.
