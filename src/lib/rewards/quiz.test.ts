import { describe, expect, it } from "vitest";
import type { EventRecord } from "../store/db";
import { train } from "../intel/learner";
import { DAILY_CAP_FROM, DAILY_XP_CAP, QUIZ_DONE, XP, achievementSets, gains, ledger, quizAnswers, type XpEntry } from "./progression";
import { INCOGNITO } from "./streak";
import { describe as describeMoment, type Moment } from "./runtime";

let seq = 0;
const ev = (kind: string, at: number, extra: Partial<EventRecord> = {}): EventRecord => ({ profileId: "p", seq: ++seq, kind, titleKey: "quiz", at, context: "quiz", ...extra });
const quiz = (at: number, value: unknown) => ev(QUIZ_DONE, at, { value: value as number });
const T0 = new Date(2026, 10, 24, 12).getTime();
const none = new Map();
const taste = (l: ReturnType<typeof ledger>) => achievementSets({ ledger: l, library: [], collections: 0 }).find((s) => s.id === "taste")!;

describe("quiz value clamp", () => {
  it("accepts finite integers from 0 to 100 only", () => {
    expect(quizAnswers(12)).toBe(12);
    expect(quizAnswers(0)).toBe(0);
    expect(quizAnswers(100)).toBe(100);
    for (const junk of [101, -1, 5.5, NaN, Infinity, "12", null, undefined, {}, [7]]) expect(quizAnswers(junk)).toBe(0);
  });
  it("a junk value from a hand-edited import awards nothing", () => {
    for (const junk of [1e9, "50", 7.5, -10, Infinity]) expect(ledger([quiz(T0, junk)], none).total).toBe(0);
  });
});

describe("quiz XP and the Taste Tester badge", () => {
  it("awards 30 XP and the badge on a run of 5 or more answered cards", () => {
    const l = ledger([quiz(T0, 5)], none);
    expect(l.total).toBe(XP.quiz);
    expect(l.quizAt).toBe(T0);
    expect(taste(l)).toMatchObject({ name: "Taste Tester", tier: 1, goals: [1] });
  });
  it("is locked with fewer than 5 answers", () => {
    const l = ledger([quiz(T0, 4)], none);
    expect(l.total).toBe(0);
    expect(taste(l).tier).toBe(0);
  });
  it("two qualifying runs give 30 XP once", () => {
    const l = ledger([quiz(T0, 12), quiz(T0 + 86_400_000 * 8, 15)], none);
    expect(l.entries.filter((e) => e.reason === "quiz")).toHaveLength(1);
    expect(l.total).toBe(XP.quiz);
  });
  it("a 4 followed by a 6 awards on the 6", () => {
    const l = ledger([quiz(T0, 4), quiz(T0 + 1000, 6)], none);
    expect(l.entries.filter((e) => e.reason === "quiz").map((e) => e.at)).toEqual([T0 + 1000]);
    expect(l.quizAt).toBe(T0 + 1000);
  });
  it("is lost on a day already at the daily cap (like chapters), the badge still counts", () => {
    expect(T0).toBeGreaterThanOrEqual(DAILY_CAP_FROM);
    const cap: XpEntry[] = [{ at: T0 - 1000, xp: DAILY_XP_CAP, reason: "quest" }];
    const l = ledger([quiz(T0, 10)], none, cap);
    expect(l.total).toBe(DAILY_XP_CAP);
    expect(l.entries.some((e) => e.reason === "quiz")).toBe(false);
    expect(taste(l).tier).toBe(1);
  });
  it("Incognito-tagged runs earn nothing", () => {
    const l = ledger([{ ...quiz(T0, 12), context: INCOGNITO }], none);
    expect(l.total).toBe(0);
    expect(taste(l).tier).toBe(0);
  });
  it("the reward moment names the badge and the XP", () => {
    const before = { ledger: ledger([], none), sets: achievementSets({ ledger: ledger([], none), library: [], collections: 0 }) };
    const al = ledger([quiz(T0, 10)], none);
    const after = { ledger: al, sets: achievementSets({ ledger: al, library: [], collections: 0 }) };
    const m = { ...gains(before, after), quests: [], unlocks: [], after: {} } as unknown as Moment;
    expect(describeMoment(m)).toMatchObject({ kind: "badge", title: "Taste Tester badge", detail: `+${XP.quiz} XP` });
  });
});

describe("quiz_done never trains the recommender", () => {
  it("training with and without quiz_done gives the same model", () => {
    const t = { key: "a", title: "a", meta: { genres: ["Action"], kind: "manhwa" } };
    const titles = new Map([["a", t], ["quiz", t]]) as never;
    const base = [{ profileId: "p", seq: 1, kind: "like", titleKey: "a", at: T0 }];
    const a = train({ profileId: "p", events: base, titles, now: T0 + 1 });
    const b = train({ profileId: "p", events: [...base, quiz(T0, 12), { ...quiz(T0, 12), titleKey: "a" }], titles, now: T0 + 1 });
    const pick = (s: typeof a) => ({ w: [...s.w], bias: s.bias, n: s.n, liked: s.liked, disliked: s.disliked, affinity: s.affinity, shortT: [...s.shortT], longT: [...s.longT] });
    expect(pick(b)).toEqual(pick(a));
    expect(a.n).toBeGreaterThan(0);
  });
});

describe("Incognito favourites", () => {
  it("a series favourited in Incognito (no favorite event) does not count for Keeper", () => {
    const lib = [{ profileId: "p", titleKey: "a", favorite: true, collections: [], addedAt: T0, updatedAt: T0 }, { profileId: "p", titleKey: "b", favorite: true, collections: [], addedAt: T0, updatedAt: T0 }];
    const l = ledger([ev("favorite", T0, { titleKey: "a", context: undefined })], none);
    const keeper = achievementSets({ ledger: l, library: lib, collections: 0 }).find((s) => s.id === "favourites")!;
    expect(keeper.value).toBe(1);
  });
});
