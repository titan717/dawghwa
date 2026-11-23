# NOVA cycle 1 design note: landing page and first run (Spec N)

Owner: NOVA. Reviewer: PIXEL (UI). Branch: `agent/c1-nova-landing`, PR into `agent/cycle-1`. Status: awaiting PIXEL approval. No code before APPROVED.

## Goal

Turn the existing landing (`src/routes/Landing.tsx`, `src/styles/landing.css`) into a confident, cover-first front door that shows a REAL featured series in FORGE's `Hero3D`, offers one primary action ("Start reading"), tells a three-part value story, shows a live featured rail and a rewards teaser, offers install (PWA prompt, plus an Android download link once a GitHub Release exists), and never names a provider or source. First run goes landing, then onboarding (taste quiz), then Home. Returning readers go straight to Home (unchanged gate in `src/app/landing.ts`).

## What exists today (read 2026-11-23)

- Gate: `shouldShowLanding()` hides it for native, standalone, `?source=pwa`, onboarded profiles and `dawghwa:entered`. `/start` always shows it. Keep as is.
- Page: original-art hero with a fit-to-width "Dawghwa" word, a page auto-scroll, a "One chapter list" section that talks about "several sources", a fake reader mock ("Rooftop Courier"), a shortcut finder, four steps, a six-card FAQ with a "Sources" tab, a "Name your reader" form and an install sheet.
- Problems: no real catalog content; "sources" wording in Showcase and FAQ (flagged by DESIGN_REVIEW_C2 item 2 and SHIELD_AUDIT_C2); auto-scroll ignores the in-app reduced-motion setting (SHIELD); about 660 KB of illustration webp; two primary-looking actions (hero button and the bottom form).

## New structure (mobile first, 360 to 1440)

1. Top bar (sticky, 56px): brand mark left; Install (text button, hidden when installed) and About on the right. No Incognito button here: the landing is not the app shell and stores nothing but `dawghwa:entered`. Desktop: same bar, max width 1200px.
2. Hero: `Hero3D` with the featured series' real title as `<h2>` live text, its cover, genres as subtitle. Below it, page `<h1>` "Read manga, manhwa and manhua in one place", one line of lede, ONE primary pill "Start reading" (green `--accent`, black text, 48px tall) and a quiet secondary text link "Browse first" (goes to `/discover` and marks entered). Trust line: "Free. No account needed. Your reading stays on this device."
   - Loading: fixed `aspect-ratio: 4 / 5` (phone) and `16 / 9` (desktop) skeleton with the same box, so CLS stays 0.
   - Error or empty catalog: the hero falls back to the existing original art (mascot + rooftop strip) with the brand word as `<h2>`; the page never shows an error box above the fold.
   - Hero tap goes to `/title/<canonicalId>` route already used by Home (`titlePath()`), and marks entered.
3. Value story: three short cards, one icon each (lucide), one sentence each, no source talk:
   - "Learns your taste": "Tell it what you like and it picks your next series, right on your device."
   - "Streaks and rewards": "Keep a reading streak, earn XP and badges, and unlock looks for the mascot."
   - "Every chapter in one place": "One numbered chapter list per series, ready when you are."
4. Featured rail: "New and updated" (not "popular"; Spec K rule) from the catalog, 8 to 12 covers, horizontal scroll-snap, same `TitleCard` as Home, See all goes to `/discover`. Mature titles filtered with `isMature()` and known-unreadable titles with `isKnownUnreadable()` (same rules as the Home hero). Lazy: rendered when within one viewport of the fold (IntersectionObserver), images `loading="lazy"` with width and height.
5. Rewards teaser: the level mascot, a sample streak chip (7-day dots), and three badge shields, with a sentence "Finish chapters to grow your streak. One free freeze a week." Static, no fake numbers presented as the reader's own ("Example" label).
6. Install block: "Keep it one tap away". Uses existing `useInstallMode()` / `promptInstall()` and the existing install sheet (prompt, iOS, macOS Safari, manual). Android line: "Get the Android app" linking to `https://github.com/titan717/dawghwa/releases/latest`, shown only when build-time `VITE_ANDROID_RELEASE=1` (HERALD sets it after the first release with an APK). Hidden when running native.
7. FAQ (four cards, not six): Price, Account, Offline, Privacy. Remove "Sources". Offline answer matches Spec G wording once FEATURE_OFFLINE ships; until then current text.
8. Footer: About, Browse, Source code, DRAFT Terms and Privacy links (when SCRIBE's pages exist; otherwise omitted). Remove "Titles, covers and chapters come from their sources"; replace with "Dawghwa does not host comics."

Removed: the "One chapter list / 3 vs 1 sources" Showcase, the fake reader mock, the shortcut finder (keyboard shortcuts stay in About), the "Name your reader" form (onboarding already asks the name, so "Start reading" goes straight to `/welcome`). The page auto-scroll button is removed from the hero (it competed with the primary action); the `P` shortcut stays and honours both the OS and the in-app reduced-motion setting.

## First-run flow

- "Start reading": `markEntered()`, then `/welcome` (onboarding; HEARTH's taste quiz when it ships). Onboarding completion already lands on Home.
- "Browse first" and hero or rail taps: `markEntered()`, then the target. The reader can do onboarding later from Profile.
- Returning (onboarded profile or entered flag): never see `/`'s landing; `/start` still shows it with "Open the app" as the primary label.

## Head and PWA

- `useHead`: title "Dawghwa: read manga, manhwa and manhua", description "Pick up where you left off, discover what you'll love, and earn rewards for reading.", absolute `og:image` `https://dawghwa.vercel.app/og.png` (existing file), `twitter:card summary_large_image`. `index.html` defaults updated to the same strings. Theme colour stays `#171717`/`#FFFFFF` (DESIGN.md; Spec N's `#000000` would mismatch the manifest).
- Manifest and icons unchanged (already valid: 192, 512, maskable). Lighthouse installability is checked in the PR.

## Contract with FORGE (Hero3D, Spec C)

Needed from `src/components/Hero3D.tsx`: `Hero3D({ title, subtitle?, coverUrl, href, priority? })` where `priority` sets `fetchpriority="high"` and `loading="eager"` on the cover (LCP), title is an `<h2>`, reduced-motion gives static layers, and `onClick` is forwarded (so the landing can call `markEntered()`). One slide is enough for the landing; no carousel needed. If Hero3D is not merged when I start, I build against the props above with a temporary local wrapper and swap to FORGE's component before review.

## Data contract

- Uses existing `useBrowse(query)` from `src/lib/query.ts` with the same query Home's hero uses (no new endpoint, no API change). One request for hero plus rail (first page, 24 items). `staleTime` 15 min.
- Covers through `coverSrc()` (image proxy when IMAGE_PROXY is on). Nothing in links or DOM mentions a source id; links use `titlePath()`.

## Flags

None new. Landing is Tier 1 and ships on. Android link behind `VITE_ANDROID_RELEASE` via COMPASS's `src/lib/flags.ts` (I will ask COMPASS to add the key; I will not create a flag module).

## Acceptance criteria

1. First visit to `/` on web shows the landing; onboarded or entered readers see Home; `/start` always shows it.
2. The hero `<h2>` text equals the featured series' title from the (mocked) catalog exactly; no hardcoded series titles anywhere on the page.
3. Exactly one primary button above the fold ("Start reading"), which leads to `/welcome`.
4. Featured rail renders catalog items, excludes mature and unreadable titles, and keyboard-scrolls.
5. Install: with a mocked `beforeinstallprompt`, Install calls `prompt()`; with iOS UA it shows the Share steps; hidden when standalone.
6. Leak audit: 0 deny-list matches in landing DOM and copy; the words "source" and "provider" do not appear in rendered landing text.
7. Reduced motion (OS or in-app): no tilt, no reveal motion, auto-scroll steps instead of glides.
8. Axe: 0 serious or critical in dark and light at 360, 390, 412, 1024, 1440.
9. Lighthouse mobile on the preview: performance 90 or more, accessibility 95 or more, CLS under 0.1 (target 0). Real numbers pasted in the PR.
10. Landing JS chunk not larger than today's (it gets smaller: three sections removed).

## Files

- Edit: `src/routes/Landing.tsx`, `src/styles/landing.css`, `index.html` (meta strings), `src/app/landing.ts` (only if a helper is needed for "Browse first").
- New: `e2e/landing.spec.ts` (mocked `/api` catalog fixture from `src/test/fixtures/catalog.json`), `src/routes/Landing.test.tsx` (hero title, no "source" text, single primary CTA), `docs/loop/nova-c1.md`.
- Not touched: Shell, BottomNav, Hero3D (FORGE), onboarding (HEARTH), About (FORGE per SHIELD handoff), flags module (COMPASS).
- Assets: drop `strip-busstop.webp`, `panel-platform.webp` imports (kept in repo until JUDGE confirms no other user); keep mascot and rooftop strip for the fallback.

## Risks

- LCP depends on the catalog API. Mitigation: hero text and CTA render without data; the cover image is the LCP only once data arrives; preconnect to the API origin; skeleton keeps CLS 0. If performance is under 90 because of API latency, I report the real number and the breakdown rather than faking a static hero.
- Cover art contrast for the 3D title: FORGE's extruded shadow plus `--art-fade`; `scripts/qa/hero-contrast.mjs` run on the landing.
- Copy change removes the "Sources" FAQ; SHIELD noted possible attribution obligations. Attribution stays on About/NOTICE (FORGE), not on the landing.
- Machine load: Lighthouse runs through `heavy.sh`, one URL at a time.

## Tests to run before PR

`npm run typecheck`, `npm run lint`, `npm test`, `npm run build` (heavy.sh), `npx playwright test e2e/landing.spec.ts e2e/a11y.spec.ts` (heavy.sh), leak audit on the preview, Lighthouse mobile on the preview.
