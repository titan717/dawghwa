# On-device recommendations

Everything runs in the browser or WebView. No external AI service, no API key, and no reading data leaves the device. Code: `src/lib/intel/`.

## Pipeline

1. **Features** (`features.ts`, `themes.ts`): each title becomes a sparse hashed vector from the API's metadata: format, status, demographic, tags, year bucket, popularity bucket, and story themes detected only from words actually present in the description.
2. **Signals** (`signals.ts`): interactions are logged per profile in IndexedDB and mapped to training labels.
3. **Learner** (`learner.ts`): deterministic replay of events into a logistic model plus short-term (14-day half-life) and long-term (365-day) taste vectors. Repeated chapter reads of one title have diminishing weight. Only the latest explicit opinion per title counts.
4. **Ranking** (`rank.ts`): model score + taste similarity + onboarding preferences, MMR re-ranking for variety, a small exploration slot, and exclusion of hidden titles. A new profile keeps catalogue order until there is evidence.
5. **Runtime** (`worker.ts`, `runtime.ts`): training runs in a Web Worker; state is stored per profile.

## Signal rules

| Signal | Effect |
| --- | --- |
| Open a title | Very weak positive (0.08). Never a negative. |
| Read to the end of a chapter | Positive (0.45), diminishing per title |
| Finish a title, favourite, like | Strong positive |
| Add to library, "More like this", return after 6h+ | Positive |
| Dislike, Not interested, Hide, Dropped | Negative (explicit actions only) |
| Scrolling past a recommendation | Not a signal |
| Failed images, broken pages, errors | Not a signal |
| Unhide | Cancels the earlier hide |

## Explanations

"Because you read X" and similar reasons are built only from the profile's real events and the shared features between titles. If there is no evidence, no reason is shown.

## Evaluation

There are two harnesses. The chronological replay (`replay.ts`) is the evaluation of record; the random-split persona check (`evaluate.ts`) is kept as a regression test only. The full protocol is in [RECOMMENDER_EVAL.md](RECOMMENDER_EVAL.md).

### Cycle 1 baseline

Synthetic, regression only. The repo contains no real reading history, so these numbers come from simulated persona histories. They are not real-world accuracy and must not be quoted as such.

Command: `npm run eval:replay` (same as `npx vitest run src/lib/intel/replay.test.ts`), run on base commit `950eb7d`, 2026-11-22.

Setup:

- Histories: `syntheticHistories()`. Each of the 6 personas in `evaluate.ts` gets 4 profiles with 6, 12, 24 and 40 engaged titles (24 profiles), engaged in random order over 90 days with mixed signals (chapter reads, library adds, likes, favourites, finishes, returns). Each profile also opens about one unrelated title per three engaged (no label) and explicitly rejects about one popular non-matching title per five engaged (not interested, hide, dislike, dropped).
- Split: per profile, chronological. Cut-off T is the first engagement of the title at the 80th percentile of first-engagement order; train on events before T with `now = T`, test on titles first engaged at or after T. Profiles with fewer than 5 engaged titles are skipped (0 skipped).
- Candidates: the 1,012 fixture titles minus anything with an event before T.
- Relevance: graded gain 1 (chapter read, return), 2 (library add, more like this), 3 (like, favourite, finished). Titles never touched after T are unknown, not negatives, so precision is a lower bound. Explicit rejections after T are scored separately as Harm@K.
- S3 runs `rank()` with Home's Top Picks options on `main` (`explore 0.15`, `lambda 0.72`, `exploreEvery 6`). S3 is the lead's "S0 current ranker"; IDs here follow RECOMMENDER_EVAL.md.

Replay results: 24 profiles, 0 skipped, median 22 engaged titles, 1,012 catalogue titles.

| System | P@10 | P@20 | R@10 | R@20 | NDCG@10 | NDCG@20 | NDCG@10 binary | Coverage@10 | Coverage@20 | ILD@10 | ILD@20 | Harm@10 | Harm@20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S0 catalogue order | 0.004 | 0.006 | 0.006 | 0.037 | 0.006 | 0.015 | 0.005 | 0.011 | 0.023 | 0.426 | 0.417 | 0.000 | 0.000 |
| S1 popularity (follows) | 0.004 | 0.006 | 0.006 | 0.037 | 0.006 | 0.015 | 0.005 | 0.011 | 0.023 | 0.426 | 0.417 | 0.000 | 0.000 |
| S2 seeded random | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.204 | 0.380 | 0.678 | 0.678 | 0.000 | 0.000 |
| S3 current `rank()` | 0.050 | 0.044 | 0.137 | 0.280 | 0.106 | 0.151 | 0.123 | 0.163 | 0.269 | 0.297 | 0.307 | 0.000 | 0.000 |

NDCG@10 S3 minus S1: 0.100 (95% paired bootstrap over profiles 0.020 to 0.193, 1,000 resamples, seed 7).

By taste signal at the cut-off (S3):

| Taste signal | Profiles | NDCG@10 | R@10 |
| --- | --- | --- | --- |
| early | 0 | n/a | n/a |
| growing | 6 | 0.000 | 0.000 |
| strong | 18 | 0.141 | 0.183 |

Guardrails: 0 lists with duplicates, 0 lists containing a title already seen or hidden before T.

Reading the numbers:

- The fixture is stored in popularity order, so catalogue order and popularity give identical lists here.
- The chronological numbers are far lower than the random-split persona check below (NDCG@10 0.106 against about 0.9 to 1.0). Part of that is the harder protocol: each profile only touches a few of the titles that match its taste, and the rest count as unknown, not as hits.
- Harm is 0 for every system because the synthetic profiles reject few titles after T. It says nothing yet about real readers.
- The only "growing" profiles are the 6-title ones (4 titles before T), and they score 0. That fits the label (little to go on), but six synthetic profiles can't validate the thresholds. Real profiles are needed for that (sources A and B in RECOMMENDER_EVAL.md).
- No ranking weights were changed this cycle.

### Persona regression check (random split)

`npm run eval:intel` runs simulated readers over 1,008 real MangaDex titles captured from the API (`src/test/fixtures/catalog.json`). Each persona likes titles matching a metadata predicate; some liked titles are used as training events, the rest are held out. The model is compared with a popularity baseline.

Latest local run (NDCG@10 / Recall@50, model vs popularity):

| Persona | Model | Popularity |
| --- | --- | --- |
| Action fantasy manhwa | 1.000 / 0.88 | 0.000 / 0.00 |
| Romance manga | 1.000 / 1.00 | 0.066 / 0.26 |
| Martial arts manhua | 0.931 / 0.74 | 0.000 / 0.00 |
| Psychological / horror | 0.727 / 0.71 | 0.000 / 0.07 |
| Comedy slice of life | 1.000 / 1.00 | 0.208 / 0.30 |
| Noisy mixed reader | 1.000 / 0.98 | 0.000 / 0.02 |

These numbers are optimistic: personas are defined by the same metadata the model learns from, so they show the model can recover a consistent taste, not how well it predicts real people. Real-world quality needs consented, anonymised usage data, which Dawghwa does not collect.

Regression only: the split is random, not chronological, so later tastes leak into training.

The test suite asserts the model beats the baseline, never recommends hidden titles or duplicates, respects onboarding avoid lists, and explains only with real evidence.

## Taste signal (transparency aid)

Profile shows "Taste signal: early / growing / strong", not a confidence percentage. The label tells the reader how much this device has to go on. It is not a probability that a pick is right, it does not change ranking, and it is never described as accuracy. Code: `src/lib/intel/confidence.ts`, UI: `src/components/TasteSignal.tsx`.

\[ C = M \cdot (1 - e^{-n_{\mathrm{eff}}/5}) \]

- \(n_{\mathrm{eff}}\): distinct titles with at least one informative interaction on this profile, meaning any trained signal except a plain open, on a title with metadata. Explicit negatives (hide, not interested, dislike, dropped) count too. Reading many chapters of one title counts once. Forgotten titles, unhidden titles and anything before a reset are excluded, as in `train()`.
- \(M\): share of the profile's interacted titles whose metadata is known (the learner can't use the rest).

| C | Label | With full metadata |
| --- | --- | --- |
| below 0.35 | early | 0 to 2 titles |
| 0.35 to below 0.70 | growing | 3 to 6 titles |
| 0.70 and up | strong | 7 or more titles |

Next to the label the UI shows the number of useful interactions, "Because you read X" (the title with the strongest positive signals; a title the reader turned down is never named) and "Based on N of your reads and ratings on this device". The inputs are read from local storage only; nothing is uploaded.

The thresholds are a starting point. Replay groups NDCG@10 by label, and it should rise from early to strong. The synthetic run agrees (growing 0.000, strong 0.141, no early profiles), but that is not evidence about real readers.
