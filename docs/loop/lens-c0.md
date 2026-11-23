# LENS cycle 0 log

Date: 23 Nov 2026. Branch `agent/c0-lens-research`. Docs only.

## Done

- `docs/research/competitors.md`: WEBTOON, MANGA Plus, Tapas, Mihon, Suwayomi, Manta, Comick (offline since Sep 2025, n/a) across reader modes and tap zones, onboarding taste quizzes, share, offline downloads, comments and profiles, gamification. Public pages only, every link with an access date, own words. Feature table, top 15 picks (B32 to B46) with owners, anti-patterns.
- `docs/METRICS.md`: Precision@K, Recall@K, NDCG@K, coverage, diversity, harm, leakage checklist, quiz swipes-to-quality, reader jank, Lighthouse, post-merge snapshot template.
- `docs/LENS_BACKLOG.md`: cycle 0 note superseding the offline and comments deferrals.
- Handoffs sent: QUILL (reader), HEARTH and ORACLE (quiz), PULSE (share and offline), SPARK (gamification), NOVA (comments and profiles).

## Findings for other agents

- Leakage (for ORACLE, formal review in cycle 1): `chronoSplit()` in `src/lib/intel/replay.ts` runs `effectiveEvents()` over the full log before cutting at T, so post-T opinions can remove pre-T training events. S1 popularity uses a post-T `follows` snapshot.
- `scripts/qa/reader-perf.mjs` forwards non-local requests to the network; for gate use it needs a fixture route (QUILL or SENTINEL).

## Next (cycle 1)

Review ORACLE's evaluation against the leakage checklist in METRICS.md; record the post-merge snapshot in `docs/loop/lens-c1.md`.
