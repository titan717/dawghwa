# Recommender evaluation plan (offline, on-device)

Owner: LENS (design). ORACLE runs it and fills the tables each cycle. Status: proposal. Docs only; no code changes in this PR.

Scope: the on-device recommender in `src/lib/intel/` (`features.ts`, `signals.ts`, `learner.ts`, `rank.ts`, `evaluate.ts`). Read with [RECOMMENDATIONS.md](RECOMMENDATIONS.md). Nothing in this plan uploads or collects reading data.

## What exists today

Read from the code on `main` (6a5a39e):

- `evaluate.ts` builds six synthetic personas from metadata predicates, shuffles each persona's liked titles with a seeded RNG, trains on 30% (min 3) and holds out the rest. The split is random, not chronological.
- Training events are synthetic: `open` plus one of `library_add`, `chapter_read`, `like`, an hour apart.
- Metrics: Precision@10, Recall@50, NDCG@10 (binary gain), and intra-list diversity of the top 10 as mean pairwise `1 - cosineSparse` over `vectorize()` vectors. Recall@50 divides by `min(50, |relevant|)`, so it's a capped recall, not plain recall.
- One baseline: popularity by `follows`.
- No catalogue coverage, no negative-leakage check, no per-evidence breakdown.
- RECOMMENDATIONS.md already says these numbers are optimistic because personas are defined by the same metadata the model learns. This plan keeps that point and builds on it.

Ranking today is `scoreTitle()` in `rank.ts`: evidence-scaled personal part (`tasteShort` 0.9, `tasteLong` 0.7, `model` 1.1), onboarding prefs 1.0 fading with evidence, popularity 0.35, quality 0.3, optional novelty, repeat penalty 0.4, a hard penalty for avoided tags, then MMR (`lambda` 0.75 by default, 0.85 in eval). Evidence is `evidence(s) = p / (p + 4)` where `p` is the number of titles with positive decayed weight.

## Principles

1. Chronological, per profile. Train only on what the profile did before a cut-off and test on what it did after. A random split leaks the future (later tastes inform earlier predictions) and flatters the model.
2. Unobserved means unknown, not disliked. A title the profile never touched after the cut-off is not a negative. Precision is therefore a lower bound. Only explicit actions (`dislike`, `not_interested`, `hide`, `dropped`) count as negatives, which matches `signals.ts`.
3. Synthetic personas are regression tests only. They check that the model can still recover a consistent taste and that guardrails hold. They are never quoted as quality.
4. Nothing leaves the device. Real-profile replay runs locally on data the reader already has, or on a backup file a person chose to hand over (see "Where profiles come from").
5. Proposals are replayed before they ship. The candidate score S below is a hypothesis. It ships only if it beats the current `rank()` on chronological replay without breaking a guardrail.

## Protocol

### Where profiles come from

| Source | How | Consent and privacy | Use |
| --- | --- | --- | --- |
| A. Own-device replay | A dev-only screen (or `npm run eval:intel -- --profile <backup.json>`) replays the active profile's own event log on the device | Data never leaves the device; output shown locally | Primary real-behaviour signal, tiny n |
| B. Volunteer backups | Team members or testers export their own Dawghwa backup file and hand it to ORACLE | Explicit opt-in per file, deleted after the run, never committed. Needs lead sign-off before first use | Small real-behaviour panel |
| C. Public datasets | See "Candidate datasets" | Licence-checked; never bundled in the app or repo | Method check at scale; proxy only |
| D. Synthetic personas | `PERSONAS` in `evaluate.ts` | None needed | Regression tests only |

Sources A and B are the only ones that say anything about Dawghwa readers. Report n alongside every number from them.

### Chronological holdout (per profile)

1. Take the profile's effective events (`effectiveEvents()`: latest explicit opinion per title, unhides cancel hides, forgotten titles removed). Sort by `at`.
2. Define engaged titles: titles with at least one of `chapter_read`, `title_finished`, `library_add`, `favorite`, `like`, `more_like_this`, or `return`. `open` alone does not make a title engaged (weight 0.08, too weak to be a label).
3. Cut-off T: the time of first engagement of the title at the 80th percentile of the profile's engaged titles in first-engagement order. Profiles with fewer than 5 engaged titles are skipped and counted.
4. Train: `train({ events: events with at < T, now: T, pool: catalogue })`.
5. Candidates: the catalogue minus every title with any event before T (seen), minus hidden or disliked as of T, minus onboarding avoid matches.
6. Relevant set R: titles whose first engagement is at or after T and that were not seen before T. Graded gain for NDCG: 1 for `chapter_read` or `return` only, 2 for `library_add` or `more_like_this`, 3 for `like`, `favorite` or `title_finished`. Binary variants use gain > 0.
7. Explicit negatives after T (set X) are kept separately for the harm metric. Everything else is unknown.
8. Rank with the system under test at K = 6 (one Home rail), 10 and 50.
9. Sliding variant: repeat with T at the 60th and 70th percentiles for profiles with 15 or more engaged titles, and average per profile first, then across profiles, so heavy readers don't dominate.

For public datasets without timestamps (see below), use a seeded random 80/20 split per user and label the run "random split" in the table. Never mix the two kinds of result in one average.

### Systems compared each cycle

| ID | System |
| --- | --- |
| S0 | Catalogue order (what a new profile sees) |
| S1 | Popularity by `follows` (current baseline) |
| S2 | Seeded random from candidates (floor) |
| S3 | Current `rank()` with `WEIGHTS` and MMR as on `main` |
| S4 | Candidate score S (below), same MMR settings as S3 |
| S5+ | Any ORACLE variant, one change at a time |

## Metrics

All per profile, then macro-averaged across profiles. For a ranked list L of length K, relevant set R, negatives X:

- Precision@K = \(|L_K \cap R| / K\). Lower bound, because unknowns may be liked.
- Recall@K = \(|L_K \cap R| / |R|\). Also report the existing capped form \(|L_K \cap R| / \min(K, |R|)\) so cycle 1 can be compared with RECOMMENDATIONS.md.
- NDCG@K = \(\mathrm{DCG}_K / \mathrm{IDCG}_K\) with \(\mathrm{DCG}_K = \sum_{i=1}^{K} (2^{g_i} - 1) / \log_2(i + 1)\), using graded gains from step 6. Report binary NDCG@10 too, which matches today's code.
- Catalogue coverage@K = share of catalogue titles that appear in at least one profile's top K, across all evaluated profiles. Meaningful on public datasets and synthetic sweeps; with a handful of real profiles it's mostly noise, so mark n.
- Intra-list diversity@K = mean over pairs in \(L_K\) of \(1 - \cos(v_a, v_b)\), with `vectorize()` and `cosineSparse()` as in `evaluate.ts`, so numbers stay comparable.
- Harm@K = \(|L_K \cap X| / K\): explicitly rejected titles that came back. Target 0.
- Popularity bias@10 = mean of `popularity()` (log follows, 0 to 1) over the top 10, against the same value for S1. Watch for S3/S4 collapsing into the popularity list.
- Explanation validity = share of shown reasons whose cited title or feature really is in the profile's pre-T events. Target 1.0 (the existing test asserts this on fixtures).

Uncertainty: paired bootstrap over profiles (1,000 resamples, fixed seed) for the difference between a variant and S3 on NDCG@10. Call a change a win only if the 95% interval is above 0.

### Hard guardrails (fail the cycle if broken)

- No hidden, disliked or `not_interested` title in any top K.
- No title matching an onboarding avoid tag.
- No duplicates in a list.
- A profile with no evidence gets catalogue order on re-ranked rows (`rerankRow()` contract).
- No reason shown without evidence.

These already exist as tests in `intel.test.ts`; the eval re-checks them on every replayed profile.

## Candidate score S (proposal, not shipped)

\[ S = \mathrm{clip}(0.60L + 0.25I + 0.10P + 0.05F - 0.25N,\ 0,\ 1) \]

The weights come from the brief. The component definitions below are LENS's proposal, chosen so every input already exists or is cheap to compute; ORACLE should confirm or replace them before the first replay.

| Term | Proposed meaning | From |
| --- | --- | --- |
| L | Learned personal match in [0, 1]: \(e \cdot \tfrac{1}{3}(\hat p + \tfrac{1 + c_s}{2} + \tfrac{1 + c_l}{2})\), where \(\hat p\) is `predict()`, \(c_s, c_l\) the short and long taste cosines, and \(e\) is `evidence()` | `learner.ts`, `rank.ts` |
| I | Onboarding interest match: `prefsMatch()` clipped to [0, 1] then divided by 1.5, scaled by \((1 - e)\) so it fades as behaviour grows (same intent as `prefW` today) | `rank.ts` |
| P | Popularity prior: `popularity()` (log follows) | `rank.ts` |
| F | Freshness: 1 if the title had a new chapter in the last 7 days, 0.5 within 14 days, else 0. Catalogue lists rarely carry `updatedAt` (D45), so F is often 0 until RELAY ships release dates (backlog B31) | API |
| N | Negative similarity: max `cosineSparse` to any title the profile explicitly rejected, 0 if none | `learner.ts` `disliked` |

Notes for the replay:

- S drops today's `quality` and `novelty` terms and the repeat penalty. Run S4 with and without the repeat penalty to see if it matters.
- Because S is clipped to [0, 1], many weak candidates tie at 0. MMR then decides order among ties. Report how many top-10 slots had S = 0.
- Weight sweep: vary each weight by ±50% one at a time (11 runs). If NDCG@10 moves less than the bootstrap interval across the sweep, the weights don't matter and the simpler model should win.
- Ship rule: S4 replaces S3 only if NDCG@10 and Recall@10 are not worse than S3 (interval includes or exceeds 0), at least one improves (interval above 0) on sources A+B, Harm@10 stays 0, diversity@10 drops by no more than 0.05, and every guardrail passes. If sources A+B are too small to decide (fewer than 10 profiles), S stays a proposal.

## Confidence evidence index C (transparency aid)

\[ C = M \cdot (1 - e^{-n_{\mathrm{eff}}/5}) \]

C is a label for the reader about how much the app has to go on. It is not a probability that a recommendation is right, it doesn't change ranking, and it must not be described as accuracy.

Proposed inputs (ORACLE to confirm):

- \(n_{\mathrm{eff}}\) = sum over titles of \(\min(1, \text{liked}[t] / 2)\), using the decayed long-term `liked` weights in `LearnerState`. One strong action (like, favourite, finish) on a title counts about 1; a single open counts about 0.04. This keeps binge reading of one title from inflating C.
- M = share of the profile's trainable events whose title had metadata at training time (`train()` skips titles without `meta`), so a profile built on titles we can't describe doesn't look "strong".

At \(n_{\mathrm{eff}} = 5\) and M = 1, C is about 0.63.

| C | Label shown |
| --- | --- |
| below 0.35 | Taste signal: early |
| 0.35 to below 0.70 | Taste signal: growing |
| 0.70 and up | Taste signal: strong |

Thresholds are a proposal. The replay checks them: NDCG@10 per C bucket should rise from early to strong. If it doesn't, the label is misleading and the thresholds (or inputs) change before the label ships. Where it would appear: next to "Taste profile" on Profile (`TasteDna` already computes `evidence()`), never on a recommendation card.

Relation to `evidence()`: today's `p / (p + 4)` counts titles with any positive weight, including a single open. C replaces that only as a display label; whether `evidence()` itself should change is a separate ORACLE question for replay.

## Candidate datasets (offline method checks only)

None of these is about Dawghwa readers. They test whether the method ranks sensibly at scale. Never bundle them in the app or commit them to the repo.

| Dataset | What it has | Timestamps for chronological split | Licence | Fit |
| --- | --- | --- | --- | --- |
| [UCSD Book Graph](https://mcauleylab.ucsd.edu/public_datasets/gdrive/goodreads/UCSD%20Book%20Graph.html), comics and graphic subset ([file index](https://mcauleylab.ucsd.edu/public_datasets/gdrive/goodreads/byGenre/)) | Public Goodreads shelves, ratings, reviews; anonymised users | The JSON interactions carry `date_added` and `date_updated` ([shelves page](https://sites.google.com/eng.ucsd.edu/ucsdbookgraph/shelves)) | Collected for academic use; the authors ask not to redistribute or use commercially ([shelves page](https://sites.google.com/eng.ucsd.edu/ucsdbookgraph/shelves)). Internal method testing only; confirm with the lead that this counts as permitted use | Best structural match: comics, shelves (to-read, read), chronology |
| [Anime Recommendation Database 2020](https://www.kaggle.com/datasets/hernan4444/anime-recommendation-database-2020) | MyAnimeList user lists with status (watching, completed, on hold, dropped, plan to watch) and scores, plus genres | None listed on the data card, so random split only | Kaggle shows CC0. The data was collected from MyAnimeList by the uploader, so the CC0 label may not reflect MyAnimeList's own terms: licence unverified | Has an explicit "dropped" negative; anime, not manga |
| [Anime Recommendations Database](https://www.kaggle.com/datasets/CooperUnion/anime-recommendations-database/data) | Ratings from 73,516 users on 12,294 anime | Not stated on the page: unverified | Kaggle shows CC0; same provenance caveat: licence unverified | Small, quick smoke test |
| [MovieLens](https://grouplens.org/datasets/Movielens/) (for example [ml-100k](https://files.grouplens.org/datasets/movielens/ml-100k-README.txt)) | Ratings with demographics | Yes, per the README | Research use under the README conditions; no public redistribution ([GroupLens](https://grouplens.org/datasets/Movielens/)) | Different domain; only for checking the harness against known published numbers |

Not usable as datasets:

- AniList API: its terms forbid hoarding or mass collection of data and use as a data store ([AniList terms](https://docs.anilist.co/guide/terms-of-use)).
- MangaDex API: fine for catalogue metadata under its acceptable-use policy (credit, no ads or paid services, [MangaDex API docs](https://api.mangadex.org/docs/)), but it has no public user-interaction data. The existing `src/test/fixtures/catalog.json` stays the candidate pool for synthetic tests.

Mapping: datasets use their own item ids. For a method check, run the learner on the dataset's own items using whatever metadata it has (genres, type, year), not by matching to the Dawghwa catalogue. Record the feature families available, since missing families (themes, authors) make results pessimistic.

## Metrics table (ORACLE fills each cycle)

One table per source (A, B, C-dataset, D). Copy the template, keep old cycles below the new one.

Run header:

| Field | Value |
| --- | --- |
| Cycle | |
| Date | |
| Commit SHA | |
| Source | A / B / C (name) / D |
| Split | chronological (pct) / random (seed) |
| Profiles evaluated / skipped (< 5 engaged) | |
| Median engaged titles per profile | |
| Catalogue size (candidates) | |
| Seed(s) | |

Results:

| System | P@6 | P@10 | R@10 | R@50 | R@50 capped | NDCG@10 graded | NDCG@10 binary | Coverage@10 | ILD@10 | Harm@10 | Pop bias@10 | Expl. validity | ΔNDCG@10 vs S3 (95% CI) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S0 catalogue | | | | | | | | | | | | n/a | |
| S1 popularity | | | | | | | | | | | | n/a | |
| S2 random | | | | | | | | | | | | n/a | |
| S3 current rank | | | | | | | | | | | | | 0 |
| S4 score S | | | | | | | | | | | | | |

By confidence bucket (sources A and B only):

| C label | Profiles | NDCG@10 S3 | NDCG@10 S4 | Recall@10 S3 |
| --- | --- | --- | --- | --- |
| early | | | | |
| growing | | | | |
| strong | | | | |

Guardrails: hidden leak ☐, avoid leak ☐, duplicates ☐, cold-start order ☐, reasons with evidence ☐. Decision for the cycle (ship / keep proposal / revert) with one line of why.

## Product metrics to track across cycles (on-device only)

Computed on the device from the local event log and shown in a local debug panel (or the monthly recap where it's already user-facing). Never uploaded, never sent in a crash report. If a reader chooses to export a backup, the raw events are already in it; no extra metrics file is added.

One rule to keep the learner clean: some of these need impressions (a card rendered on screen). Impressions must go to a separate local counter that `train()` never reads, because scrolling past is not a signal (`signals.ts`). That counter is a HEARTH/ORACLE design item and does not exist yet.

| Metric | Definition | Why |
| --- | --- | --- |
| Pick tap-through | Taps on personal-row cards / impressions of those cards, per week | Whether picks attract |
| Pick to engagement | Share of tapped picks that reach an engaged signal within 7 days | Whether picks hold |
| Pick rejection rate | `not_interested` + `hide` from personal rows / impressions | Early warning for bad picks |
| "Something different" engagement | Engagement rate of exploration slots vs normal slots | Is exploration worth its slot |
| Surprise me acceptance | Share of `surprise_pick` followed by a finished chapter | Fun-factor check |
| Continue usage | Share of reading sessions started from Continue vs elsewhere | Resume-first takeaway in DAWGHWA_RESEARCH |
| Chapter completion | Chapters reaching the last page / chapters opened | Reader quality |
| Weekly reading days | Distinct days with a finished chapter, per ISO week | Rhythm and streak health, without guilt |
| Return within 7 days | Share of weeks followed by any reading in the next week | Retention, locally |
| Time to first chapter | From profile creation to first finished chapter | Onboarding quality |
| Taste signal distribution | Days a profile spent in early, growing, strong | Sanity check for C |
| Genre breadth | Distinct genres with a finished chapter per month | Diversity outcome, not just diversity of lists |
| Incognito share | Share of sessions in incognito (once B20 exists) | Tells us how much data the learner never sees |

## Open questions for the lead

1. Can volunteer backups (source B) be used at all, and who deletes them after a run?
2. Is internal method testing on the UCSD Book Graph inside its academic-use terms for this project?
3. Does the "Taste signal" label ship before S is decided? It doesn't depend on S, only on the C bucket check.
