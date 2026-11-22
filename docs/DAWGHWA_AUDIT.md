# Dawghwa audit

Baseline: `main` before this work (the merged `feature/app-foundation`), served from `baseline-dist` and screenshotted into `before/`. The independent critic's round-0 report (`critic/round0/REPORT.md`, outside the repo) scored it 6.7 out of 10 (not accepted).

## Blueprint

The blueprint is the Drive PDF "dawghwa blueprint", 17 pages, rendered to `bp/hi-01..17.png` during the audit. It shows a WEBTOON-style mobile app:

| # | Screen | Key elements |
| --- | --- | --- |
| 1 | Home | Full-bleed key-art hero with title, genre line, white "Start Reading" pill and "+ Subscribe"; "Popular Series by Category" chip row with covers; labelled 5-item bottom nav |
| 2 to 6 | Title | Back, "+ Subscribe", info and overflow in the header; centred cover; title, author, 3-line synopsis, tags; tabs Preview / Episodes / Readers Also Like; full-width sticky "Read Episode 1"; About sheet; "Subscribed" toast |
| 7 to 10 | My Series | Title with icon actions; uppercase underline tabs (Recent, Subscribed, Downloads, ...); "Series total / Unread series" toggle; centred grey empty copy |
| 11 | Search | "Search" title, pill input, "What Everyone's Searching" cover row, "Browse Categories" 2-column tiles with cover thumbnails |
| 12 to 17 | Onboarding | "What stories do you like?" icon chips, Skip top-right, full-width "Next (n)", disabled at 0; "Finding stories for you" mascot loader |

## Baseline findings (round 0)

Critical defects:
- C1. A search for a title name was turned into intent filters and hid the title itself.
- C2. Reopening a webtoon chapter did not restore the scroll position inside the page.

Major defects:
- M1 to M4. The hero, category row, search landing and title page did not follow the blueprint structure.
- M5. There was no feedback after saving or favouriting.
- M6. Onboarding had no icons, no "Next (n)" button and no "Finding stories" step.
- M7. The reader had top-aligned paged pages and no RTL cue. Auto-continue could skip a chapter.
- M8. Errors showed raw "Service Unavailable" text, the reader header was stuck on "Loading", search showed "SEARCHING..." while offline, and failures caused a retry storm (about 55 requests).
- M9. The tablet bottom nav was stretched, the header search was off-centre, and the 1920px header was misaligned.
- M10. Suggestive covers appeared at the top of a fresh install.

Minor defects (P1 to P10): uneven sheet rows, status sheet with no radio indicator, a footer disclaimer on every empty state, small footer tap targets, light theme by default on light OSes, source maps in dist, and left-aligned large empty states.

The critic verified these as working (kept): the local-first library and profiles, the explainable recommender, the natural-language search parser, and the honest capability gating (no fake controls).

## Technical authority

- The API is `https://dawghwaapi.vercel.app`. Its catalogue is `/api/catalog` (AniList by default; one format and one status per request; `year`; sort by popularity, score, updated, new, relevance or title; adult titles off by default) together with `/api/titles/{ref}`, chapters, pages and stream search.
- Nothing in the UI depends on an endpoint the API does not provide. The rows "Hidden gems" (which need follower counts) and demographic filters are not shown, because the catalogue does not return that data.

## Outcome

The fixes are tracked in `DAWGHWA_PROGRESS.md`, and the critic's scores in `DAWGHWA_QA_SCORECARD.md`.


## Blueprint v2 analysis

| Blueprint page | Screen | Status |
|---|---|---|
| 1–2 | Comments, pull to next, TOP | Pull-to-next and TOP built; comments need an API that does not exist |
| 3–4 | Reader end: credits, Creator, Next Episode | Built as "Next Chapter" with real authors and artists |
| 5–6 | My Series | Built: tabs, totals/unread toggle, sort, list/grid, Continue/View |
| 7 | Search | Built: field, What Everyone's Reading, Browse Categories |
| 8–10 | Home | Built: Top Picks, Binge with chips, ranked rows, badges, black nav |
| 11–14 | Onboarding | Built: genres, formats, avoid, ready screen |
| 15 | Mascot | Replaced everywhere (app, icons, Android, OG) |

Not implementable without backend features: comments, coins/free coins, Watch tab, Canvas, downloads, unlock timers, notification bell.
