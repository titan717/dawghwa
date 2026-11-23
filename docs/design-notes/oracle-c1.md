# ORACLE design note, cycle 1: taste quiz logic (Spec D) and quiz priors in the recommender (Spec K)

Status: PROPOSED, awaiting JUDGE. Branch `agent/c1-oracle-quiz` (app repo only). Research: [docs/research/cold-start.md](../research/cold-start.md).

## Goal

Give HEARTH's swipe-card quiz a pure, tested card picker and feedback model, record every answer through the existing `signal()` so the on-device learner treats quiz answers as explicit priors, keep Incognito learning-free, and prove with the replay that 10 to 15 swipes measurably improve picks.

## Baseline (main 5efc0d1, `npm run eval:replay`, synthetic, regression only)

24 profiles, 1,012 titles. S3 current rank(): NDCG@10 0.106, P@10 0.050, R@10 0.137, Cov@10 0.163, ILD@10 0.297, Harm@10 0. S1 popularity NDCG@10 0.006. Bucket: early 0, growing 6 (NDCG 0.000), strong 18 (0.141).

## Acceptance criteria

1. `nextCard` never repeats a card, never returns a hidden, mature, in-library or rejected title, never shows a third card of the same format in a row when another format is available, and covers at least 8 distinct genres in the first 12 cards on the fixture catalogue (seeded, deterministic in tests).
2. `applyFeedback` weights: love +2, like +1, skip -0.3, hide -1 per genre (Spec D). Undo restores the exact previous state.
3. Every answer goes through `signal()`; in Incognito no event, no hidden row and no learner change is written (Vitest against fake IndexedDB, row counts unchanged).
4. Quiz answers move the Taste signal from early to growing after about 6 informative answers, but quiz answers alone cannot reach strong (each quiz-only title counts 0.5 in n_eff, so 15 answers give C at most 0.78 only if all 15 are informative; typical 12-card run with 2 to 3 skips lands in growing).
5. "Because you liked X" style reasons appear for quiz-loved titles through the existing `explain()` (no new reason text that claims reading).
6. `npm run eval:replay`: S0 to S3 numbers unchanged versus baseline (no quiz events in those histories); new S3q (rank() after a simulated 12-swipe quiz) beats S3 on NDCG@10 for the same profiles; guardrails 0.
7. Swipes-to-quality figure: on synthetic personas taking only the quiz, NDCG@10 after n = 0..20 swipes for three card policies (ORACLE nextCard, random, popularity); report swipes needed to reach 80% and 90% of the 20-swipe value. Target 10 to 15 for 90%.
8. Fallback signal: `buildQuizPool` returns `ok: false` when the catalogue cannot supply at least 15 cards across at least 6 genres; HEARTH then shows the existing genre tiles.

## API contract (for HEARTH UI and SPARK badge)

```ts
// src/lib/intel/quiz.ts  (pure, no I/O)
export type Feedback = "love" | "like" | "skip" | "hide";
export type QuizCard = { id: string; genres: string[]; type: "manga" | "manhwa" | "manhua" | "other"; follows: number };
export const QUIZ = { min: 10, target: 12, max: 15 } as const;
export function cardOf(t: Title): QuizCard | undefined;
export function buildQuizPool(titles: Title[], opts?: { exclude?: Set<string>; limit?: number }): { cards: QuizCard[]; ok: boolean };
export function applyFeedback(taste: Map<string, number>, card: QuizCard, fb: Feedback): void;          // Spec D, mutates
export function nextCard(pool: QuizCard[], shown: QuizCard[], taste: Map<string, number>, hidden: Set<string>, random?: () => number): QuizCard | undefined;
// Immutable session helpers for React state:
export type QuizSession = { shown: QuizCard[]; answers: { card: QuizCard; fb: Feedback }[]; taste: Map<string, number> };
export function newSession(): QuizSession;
export function answer(s: QuizSession, card: QuizCard, fb: Feedback): QuizSession;
export function undo(s: QuizSession): { session: QuizSession; undone?: { card: QuizCard; fb: Feedback } };
export function isDone(s: QuizSession): boolean;            // >= target answers with >= 2 positives, or max reached
export function genreBars(s: QuizSession, n?: number): { genre: string; value: number }[]; // results screen, value 0..1

// src/lib/intel/quizRecord.ts  (store wiring, async)
export function quizLearns(): boolean;                                   // false in Incognito: UI shows "Incognito: the quiz won't learn"
export async function recordQuizAnswer(t: Title, fb: Feedback): Promise<boolean>; // false = nothing written
export async function undoQuizAnswer(t: Title, fb: Feedback): Promise<void>;
export async function finishQuiz(answered: number): Promise<void>;        // emits quiz_done for SPARK
```

Events (all through `signal()`, `context: "quiz"`):

| Answer | Event | Learner weight (signals.ts) | Notes |
| --- | --- | --- | --- |
| love (up) | `quiz_love` | y=1, w=2.0 (same as like) | explicit opinion |
| like (right) | `quiz_like` | y=1, w=1.0 (same as more_like_this) | explicit opinion |
| hide (down) | existing `hideTitle(t, "not_interested")` | existing not_interested y=0, w=1.4 | reversible in Hidden titles |
| skip (left) | `quiz_skip` | null (never trained) | skipping is not a dislike |
| undo | `quiz_undo` (love/like), `unhideTitle` (hide) | cancels the latest opinion like `unhide` | append-only log stays exact |
| finished | `quiz_done`, titleKey `quiz`, value = non-skipped answers net of undo | null | SPARK (agreed): 30 XP once ever and "Taste Tester" badge when value >= 5 |

`quiz_love`, `quiz_like` and `quiz_undo` join the opinion set in `effectiveEvents()`, so a later real like, dislike or hide replaces a quiz answer, and undo removes it exactly.

## Card selection

score = 0.45 x uncertainty + 0.35 x freshness + 0.15 x familiarity - run - 0.6 x avoided + 0.03 x jitter

- uncertainty: mean over the card's genres of a Beta posterior's normalised variance; prior Beta(1,1), love adds 2 to alpha, like 1, hide adds 1 to beta, skip 0.3 to beta.
- freshness: share of the card's genres not yet shown.
- familiarity: log follows normalised (popularity-aware elicitation, research finding 1), capped weight so the quiz is not a popularity list.
- run: 0.3 if the last two shown cards share this card's format.
- avoided: card shares a genre the reader already rejected twice or more.
- jitter: from an injected RNG (default Math.random; tests pass a seeded RNG).

## Files

New: `src/lib/intel/quiz.ts`, `quiz.test.ts`, `quizRecord.ts`, `quizRecord.test.ts`, `quizEval.ts`, `quizEval.test.ts`, `docs/loop/oracle-c1.md`. Small additive edits: `src/lib/store/user.ts` (5 new `SignalKind` members only), `src/lib/intel/signals.ts` (weights), `src/lib/intel/learner.ts` (opinion and cancel sets), `src/lib/intel/confidence.ts` (quiz-only titles count 0.5), `src/lib/intel/replay.ts` (S3q system), `package.json` (`eval:replay` also runs `quizEval.test.ts`), `docs/RECOMMENDER_EVAL.md` (cycle 1 table).

Not touched: any UI (HEARTH owns `src/components/quiz/*` and routes), rewards (SPARK reads `quiz_done`).

## Flag

None. The quiz is Tier 1; the logic is inert until HEARTH mounts the UI.

## Risks

- Synthetic personas are defined by the same metadata the learner uses, so swipes-to-quality is optimistic; labelled "synthetic, regression only".
- Quiz priors could crowd out reading signals: mitigated by the 14-day short-term decay on taste vectors, by real opinions replacing quiz opinions per title, and by the 0.5 n_eff weight.
- `hideTitle()` writes the hidden row before `signal()`'s Incognito guard; `recordQuizAnswer` checks `isIncognito()` first. Flagged to SHIELD as a separate gap outside the quiz.
- Catalogue rows from the provider-neutral API (rest of Spec K) are not in this note; cycle 2.
