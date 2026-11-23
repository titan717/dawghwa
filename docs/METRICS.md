# Metrics spec

Owner: LENS. Status: spec for cycles 1 and 2. Docs only; no code changes.

One place that says what each number means, how it is computed, where it comes from, and what counts as a pass. The recommender protocol itself (profiles, systems S0 to S5, candidate score, dataset notes) stays in [RECOMMENDER_EVAL.md](RECOMMENDER_EVAL.md); this file defines the metrics and adds the quiz, reader and Lighthouse metrics that RECOMMENDER_EVAL.md does not cover. If the two ever disagree, the code in `src/lib/intel/replay.ts` is the truth for what was measured and this file is the truth for what should be measured; file the gap as an ORACLE task.

Privacy rule for every metric here: computed on the developer's machine or on the reader's own device. Nothing is uploaded, nothing is sent in crash reports, no analytics service is added. Incognito sessions produce no events, so they are invisible to every metric (that is intended).

## 1. Recommender metrics

Notation, per evaluated profile: \(L\) is the ranked list, \(L_K\) its top K, \(R\) the relevant held-out titles with graded gains \(g \in \{1,2,3\}\), \(X\) the explicit negatives after the cut-off, \(C\) the candidate catalogue. Every metric is computed per profile, then macro-averaged (each profile weighs the same). Report n (profiles evaluated and skipped) next to every number.

Gains (same as `ENGAGED` in `replay.ts`): 1 = `chapter_read` or `return`; 2 = `library_add` or `more_like_this`; 3 = `like`, `favorite` or `title_finished`. A title that is engaged and later rejected counts in \(X\), not \(R\). Unobserved titles are unknown, not negatives.

K values: 6 (one Home rail), 10 (gate metric), 20 and 50 (depth). Today's code reports K = 10 and 20; adding 6 and 50 is an ORACLE follow-up.

| Metric | Definition | Notes |
| --- | --- | --- |
| Precision@K | \(\lvert L_K \cap R\rvert / K\) | Lower bound, because unknowns may be liked |
| Recall@K | \(\lvert L_K \cap R\rvert / \lvert R\rvert\) | Profiles with \(R = \varnothing\) are skipped and counted. Also report the capped form \(\lvert L_K \cap R\rvert / \min(K, \lvert R\rvert)\) when comparing with RECOMMENDATIONS.md |
| NDCG@K (graded) | \(\mathrm{DCG}_K / \mathrm{IDCG}_K\), \(\mathrm{DCG}_K = \sum_{i=1}^{K} (2^{g_i}-1)/\log_2(i+1)\); IDCG uses the K highest gains in \(R\) | Gate metric is graded NDCG@10. Binary NDCG@10 (all gains 1) is reported alongside |
| Catalogue coverage@K | \(\lvert \bigcup_{\text{profiles}} L_K \rvert / \lvert C \rvert\) | Across all evaluated profiles. With fewer than 20 profiles it is mostly noise: print n |
| Intra-list diversity@K (ILD) | mean over pairs \(a \ne b\) in \(L_K\) of \(1 - \cos(v_a, v_b)\), with `vectorize()` and `cosineSparse()` | Range 0 to 1; higher is more varied |
| Genre spread@K | number of distinct primary genres in \(L_K\) divided by \(\min(K, \text{genres in } C)\) | Easier to read than ILD; proposal, not in code yet |
| Harm@K | \(\lvert L_K \cap X \rvert / K\) | Target 0 |
| Popularity bias@10 | mean `popularity()` over \(L_{10}\), compared with the same for S1 | Flags collapse into the popularity list |
| Explanation validity | share of shown reasons whose cited evidence is in the pre-cut-off events | Target 1.0 |

Uncertainty: paired bootstrap over profiles (1,000 resamples, fixed seed, `pairedBootstrap()` in `replay.ts`) for the difference between a variant and S3 on NDCG@10. A change is a win only if the 95% interval is above 0.

Gate 13 (section 7 of the master prompt): no metric above drops more than 2% (relative) against the baseline for S3 without a written reason. Harm@10 must stay 0 and every hard guardrail in RECOMMENDER_EVAL.md must pass.

Labelling: numbers from synthetic personas are always printed with "synthetic, regression only" and never quoted as quality.

### Leakage checklist (LENS reviews this every cycle)

A split leaks if anything computed after the cut-off T reaches training, candidate selection or the features used to rank. The review checks:

1. Training events are filtered by `at < T` from the raw log before any correction step. Corrections (`effectiveEvents()`: latest opinion wins, unhide cancels hide) are then applied to the pre-T events only. Applying them to the full log first lets a post-T dislike or unhide delete a pre-T event from training. Status at 5efc0d1: `chronoSplit()` applies `effectiveEvents()` to the full log before cutting, so this leak exists; ORACLE notified, formal review in cycle 1.
2. Training `now` equals T (decay is computed as of T, not as of the end of the log). Status at 5efc0d1: yes.
3. Candidates exclude titles seen before T, and nothing else depends on post-T data. Status: yes (seen-leak guardrail counted).
4. Catalogue features (`follows`, ranks, `updatedAt`, freshness) are snapshots taken after T. On the bundled fixture they can't be rewound, so any system using them (S1, the popularity and freshness terms) must be labelled "catalogue snapshot, may include post-T popularity".
5. The taste-signal bucket uses only pre-T events. Status: yes (`tasteEvidence(split.train, ...)`).
6. Synthetic histories are generated independently of the system under test (not tuned on the same seed that is reported).
7. Weight sweeps and threshold tuning use a different seed or profile subset from the one that is reported, or the report says "tuned and reported on the same data".

## 2. Quiz swipes-to-quality

Question: how many quiz cards does a new profile need before its first personal row is good, and does the swipe quiz beat the genre tiles? No competitor uses swipe cards (see [research/competitors.md](research/competitors.md)), so this is measured, not assumed.

### Offline curve (each cycle, synthetic plus volunteer data)

For each evaluated profile with a held-out relevant set (as in section 1, cut-off at the profile's first engagement, so training has quiz answers only):

1. Simulate the quiz with `nextCard()` from `src/lib/intel/quiz.ts` (Spec D, being built by ORACLE; adapt names to what lands). The simulated answer for a card comes from the persona's ground truth: love if the title is in the persona's liked set with gain 3, like if gain 1 or 2, hide if it matches the persona's avoid predicate, otherwise skip.
2. After \(n\) answered cards, for \(n \in \{0, 3, 5, 8, 10, 12, 15\}\), build the cold-start Home picks row from the quiz taste only and score NDCG@10 and Precision@6 against \(R\).
3. Plot quality against \(n\). Report:
   - Q(n): macro NDCG@10 after \(n\) cards. Q(0) is catalogue order (S0).
   - Swipes-to-quality \(n^{*}\): the smallest \(n\) with \(Q(n) \ge 0.9 \cdot Q(15)\). Target: \(n^{*} \le 10\). If \(n^{*} > 12\), the card picker is too slow to learn and ORACLE revisits `nextCard()`.
   - Marginal gain per card: \((Q(n_{j}) - Q(n_{j-1})) / (n_j - n_{j-1})\). If the gain from 10 to 15 is under 0.005 per card, recommend a 10-card default.
   - Tile baseline: Q for the genre-tile path with the persona's true top 3 genres selected. The swipe quiz should match or beat it by \(n = 10\); if it doesn't, the tiles stay the default and the quiz becomes optional.
4. Answer noise: rerun with 20% of answers flipped at random (seeded). Quality at \(n = 10\) should not fall below the tile baseline.

### On-device (local only, never uploaded)

Recorded per profile, in the local event log or the profile record, by ORACLE and HEARTH:

| Field | Meaning |
| --- | --- |
| `onboardingPath` | `quiz`, `tiles` or `skipped` |
| `quizAnswered` | number of answered cards, and counts per answer (love, like, skip, hide) |
| `quizUndo` | number of undos |
| `quizSeconds` | time from first card to results |
| `quizAbandonedAt` | card index if the user left before results, else null |

Local product metrics derived from them (shown in a dev panel, not to users):

- Completion rate: profiles reaching results / profiles that saw card 1.
- Median cards answered and median seconds.
- Pick tap-through and pick-to-engagement (defined in RECOMMENDER_EVAL.md) for the first 7 days, split by `onboardingPath`.
- Time to first finished chapter, split by `onboardingPath`.

With fewer than 10 profiles per path, report raw counts only and draw no conclusion.

## 3. Reader jank

Question: does the reader stay smooth while scrolling, paging and auto-scrolling on a mid-range phone?

Method (developer machine, fixtures only, never real providers): Playwright with Chromium, mobile context 390 x 844, `isMobile: true`, service workers blocked, CPU throttled 4x through CDP (`Emulation.setCPUThrottlingRate`). Chapter pages come from recorded fixtures served locally; the existing `scripts/qa/reader-perf.mjs` currently forwards non-local requests to the network, so for gate use it must be pointed at a fixture route instead (QUILL or SENTINEL follow-up). Each scenario runs 3 fresh loads; report the median.

Scenarios:

1. Open: cold load of a 40-page fixture chapter.
2. Scroll: 10 s of scripted scrolling at 2,000 px/s in scroll mode.
3. Page: 20 page turns in paged mode by tap-zone clicks, 300 ms apart.
4. Auto-scroll: 15 s at the default speed.
5. Chapter transition: scroll past the last page into the next chapter.

Measures (PerformanceObserver plus `requestAnimationFrame` sampling):

| Metric | Definition | Budget |
| --- | --- | --- |
| LCP (Open) | largest-contentful-paint start time | under 2.5 s |
| Long-task time | sum of (duration minus 50 ms) over `longtask` entries during the scenario | under 200 ms per scenario |
| Janky frame share | share of rAF intervals over 1.5 times the median interval (about 25 ms at 60 Hz) | under 5% in Scroll and Auto-scroll |
| Worst frame | longest rAF interval | under 100 ms |
| CLS | cumulative layout shift during Open and Chapter transition | under 0.05 (pages reserve their height from `w` and `h`) |
| INP proxy | longest delay from a tap-zone click to the next frame showing the new page | under 200 ms in Page |
| Memory | `performance.memory.usedJSHeapSize` after Scroll (Chromium only) | report only, no budget yet |

Regression rule: any metric worse than the previous cycle's baseline by more than 20% (or over budget) needs a written reason in the PR.

## 4. Lighthouse

Gate 11 in the master prompt: mobile performance 90 or more and accessibility 95 or more on Home and Landing; main JS bundle growth under 10% per cycle unless AMIT approves.

Method:

- Lighthouse mobile preset (default throttling: simulated slow 4G, 4x CPU), against `vite preview` on port 4173 inside `team/heavy.sh`, or the branch preview URL. Production is measured after merge.
- Pages: Landing (`/welcome`) and Home (`/`). Home needs the first-run flag set before the run, because Lighthouse can't click past onboarding (noted in `reader-perf.mjs`). Set the allow-listed `dawghwa:entered` key with a pre-run script (Playwright plus the Lighthouse Node API, or a Puppeteer flow), and say which method was used.
- Three runs per page; report the median score and the median of each core value: LCP, TBT, CLS, Speed Index, FCP. Also record accessibility, best practices and SEO scores.
- Bundle: `scripts/qa/bundle-size.mjs` output (main JS gzip and total), compared with the previous cycle's number.

| Page | Perf | A11y | LCP | TBT | CLS | Main JS (gzip) |
| --- | --- | --- | --- | --- | --- | --- |
| Landing | 90 or more | 95 or more | under 2.5 s | under 200 ms | under 0.1 | growth under 10% |
| Home | 90 or more | 95 or more | under 2.5 s | under 200 ms | under 0.1 | same bundle |

## 5. Where results are recorded

| Metric group | Who runs it | Where it is written |
| --- | --- | --- |
| Recommender (section 1) | ORACLE, reviewed by LENS | RECOMMENDER_EVAL.md metrics table, plus the PR body (gate 13) |
| Quiz curve (section 2) | ORACLE | RECOMMENDER_EVAL.md, new "Quiz" table |
| Reader jank (section 3) | QUILL before merge, SENTINEL after | PR body; cycle log |
| Lighthouse and bundle (section 4) | SENTINEL (gate 11) | PR body; cycle log |
| Post-merge snapshot of all of the above | LENS | `docs/loop/lens-c<N>.md` (AMIT consolidates into LOOP_STATE.md) |

Post-merge snapshot template (LENS fills after each merge to main):

| Field | Value |
| --- | --- |
| Cycle, date, main SHA | |
| Recommender S3 NDCG@10 / P@10 / R@10 / coverage@10 / ILD@10 / harm@10 (synthetic) | |
| Quiz \(n^{*}\) and Q(10) vs tile baseline | |
| Reader long-task ms and janky-frame share (Scroll) | |
| Lighthouse Landing perf/a11y, Home perf/a11y (production) | |
| Main JS gzip and change vs previous cycle | |
| Leakage checklist items failing | |
