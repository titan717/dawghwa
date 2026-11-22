import { describe, expect, it } from "vitest";
import type { EventRecord } from "../store/db";
import type { Title } from "../titles";
import { DAILY_CAP_FROM, DAILY_XP_CAP, XP, achievementSets, capDaily, gains, ledger, levelFor, levelStart, makeSet, passport, stepCost, tierFor } from "./progression";

let seq = 0;
const ev = (kind: string, titleKey: string, at: number, extra: Partial<EventRecord> = {}): EventRecord => ({ profileId: "p", seq: ++seq, kind, titleKey, at, ...extra });
const title = (key: string, genres: string[]) => ({ key, title: key, meta: { genres } }) as unknown as Title;
const titles = new Map([title("a", ["Action", "Fantasy"]), title("b", ["Fantasy"]), title("c", ["Romance", "Cooking"])].map((t) => [t.key, t]));
const DAY = 86_400_000;
const T0 = new Date(2026, 10, 2, 12).getTime();

describe("ledger (farm-proofing)", () => {
  it("awards a chapter once, however many times it is finished", () => {
    const l = ledger([ev("chapter_read", "a", T0, { value: 1 }), ev("chapter_read", "a", T0 + 1, { value: 1 }), ev("chapter_read", "a", T0 + 2, { value: 1 })], titles);
    expect(l.chapters).toBe(1);
    expect(l.total).toBe(XP.chapter + XP.series + 2 * XP.genre);
  });
  it("ignores opens, favourites, likes and other signals", () => {
    const l = ledger([ev("open", "a", T0), ev("favorite", "a", T0), ev("like", "a", T0), ev("library_add", "a", T0), ev("return", "a", T0)], titles);
    expect(l.total).toBe(0);
  });
  it("only counts reader-earned completions with at least half the chapters read", () => {
    const manual = ledger([ev("chapter_read", "b", T0, { value: 1 }), ev("title_finished", "b", T0 + 1)], titles);
    expect(manual.completed).toBe(0);
    const lastOnly = ledger([ev("chapter_read", "b", T0, { value: 10 }), ev("title_finished", "b", T0 + 1, { context: "reader", value: 10 })], titles);
    expect(lastOnly.completed).toBe(0);
    const reads = Array.from({ length: 5 }, (_, i) => ev("chapter_read", "b", T0 + i, { value: i + 6 }));
    const real = ledger([...reads, ev("title_finished", "b", T0 + 9, { context: "reader", value: 10 }), ev("title_finished", "b", T0 + 10, { context: "reader", value: 10 })], titles);
    expect(real.completed).toBe(1);
    expect(real.entries.filter((e) => e.reason === "complete")).toHaveLength(1);
  });
  it("stamps each genre once and counts the series once", () => {
    const l = ledger([ev("chapter_read", "a", T0, { value: 1 }), ev("chapter_read", "a", T0 + DAY, { value: 2 }), ev("chapter_read", "b", T0 + 2 * DAY, { value: 1 })], titles);
    expect(l.series).toBe(2);
    expect([...l.genres.values()].map((g) => [g.name, g.chapters])).toEqual([["Action", 2], ["Fantasy", 3]]);
    expect(l.activeDays).toBe(3);
    expect(l.entries.filter((e) => e.reason === "genre")).toHaveLength(2);
  });
  it("is independent of event order in storage", () => {
    const evs = [ev("chapter_read", "a", T0 + 5, { value: 2 }), ev("chapter_read", "a", T0, { value: 1 })];
    expect(ledger(evs, titles).total).toBe(ledger([...evs].reverse(), titles).total);
  });
});

describe("daily cap and Incognito", () => {
  const D = DAILY_CAP_FROM + 10 * 3_600_000; // 10:00 on the first capped day
  const many = (start: number, n: number, key = "a") => Array.from({ length: n }, (_, i) => ev("chapter_read", key, start + i * 60_000, { value: i + 1 }));
  it("caps XP per local day, but chapters still count for badges", () => {
    const l = ledger(many(D, 60), titles);
    expect(l.chapters).toBe(60);
    expect(l.total).toBe(DAILY_XP_CAP);
  });
  it("starts fresh the next local day", () => {
    const l = ledger([...many(D, 40), ...many(D + DAY, 5, "b").map((e) => ({ ...e, value: (e.value ?? 0) + 100 }))], titles);
    expect(l.total).toBe(DAILY_XP_CAP + 5 * XP.chapter + XP.series);
  });
  it("includes quest XP in the cap", () => {
    const l = ledger(many(D, 40), titles, [{ at: D + 3_600_000, xp: XP.quest, reason: "quest", ref: "q" }]);
    expect(l.total).toBe(DAILY_XP_CAP);
  });
  it("never takes away XP from days before the cap shipped", () => {
    const early = DAILY_CAP_FROM - 2 * DAY;
    expect(ledger(many(early, 60), titles).total).toBe(60 * XP.chapter + XP.series + 2 * XP.genre);
  });
  it("trims the entry that crosses the cap and drops the rest", () => {
    const e = (xp: number, at: number) => ({ at, xp, reason: "chapter" as const });
    expect(capDaily([e(25, 1), e(25, 2), e(25, 3)], 60, 0).map((x) => x.xp)).toEqual([25, 25, 10]);
  });
  it("one award per chapter per day: re-reading the same chapter the same day earns nothing more", () => {
    const l = ledger([ev("chapter_read", "a", D, { value: 1 }), ev("chapter_read", "a", D + 1000, { value: 1 })], titles);
    expect(l.entries.filter((x) => x.reason === "chapter")).toHaveLength(1);
  });
  it("Incognito events earn nothing", () => {
    const l = ledger([ev("chapter_read", "a", T0, { value: 1, context: "incognito" }), ev("title_finished", "a", T0 + 1, { context: "incognito" })], titles);
    expect(l).toMatchObject({ total: 0, chapters: 0, series: 0, activeDays: 0 });
  });
});

describe("levels", () => {
  it("has a gentle, increasing curve", () => {
    expect(stepCost(1)).toBe(60);
    expect(levelStart(2)).toBe(60);
    expect(levelStart(3)).toBe(160);
    expect(levelFor(0)).toMatchObject({ level: 1, into: 0, span: 60 });
    expect(levelFor(59).level).toBe(1);
    expect(levelFor(60).level).toBe(2);
    expect(levelFor(170)).toMatchObject({ level: 3, into: 10 });
  });
  it("names tiers and the next one", () => {
    expect(tierFor(1).name).toBe("Pup");
    expect(tierFor(3).name).toBe("Bookhound");
    expect(tierFor(40).name).toBe("Legend");
    expect(levelFor(0).nextTier?.name).toBe("Bookhound");
    expect(levelFor(1e9).nextTier).toBeUndefined();
  });
});

describe("achievement sets", () => {
  it("reports tiers and a plain hint", () => {
    expect(makeSet("x", "X", "", 0, [1, 10], ["chapter", "chapters"])).toMatchObject({ tier: 0, hint: "1 more chapter for tier I", progress: 0 });
    expect(makeSet("x", "X", "", 4, [1, 10], ["chapter", "chapters"])).toMatchObject({ tier: 1, hint: "6 more chapters for tier II" });
    expect(makeSet("x", "X", "", 12, [1, 10], ["chapter", "chapters"])).toMatchObject({ tier: 2, progress: 1, hint: "All 2 tiers earned" });
  });
  it("derives every set from the ledger and library", () => {
    const l = ledger([ev("chapter_read", "a", T0, { value: 1 })], titles);
    const sets = achievementSets({ ledger: l, library: [{ profileId: "p", titleKey: "a", favorite: true, collections: [], addedAt: 0, updatedAt: 0 }], collections: 2 });
    const by = Object.fromEntries(sets.map((s) => [s.id, s.tier]));
    expect(by).toMatchObject({ chapters: 1, series: 1, complete: 0, favourites: 1, collections: 1, quests: 0 });
  });
});

describe("passport and gains", () => {
  it("lists headline genres then extra stamped ones", () => {
    const p = passport(ledger([ev("chapter_read", "c", T0, { value: 1 })], titles));
    expect(p.find((s) => s.name === "Romance")?.stamped).toBe(true);
    expect(p.find((s) => s.name === "Horror")?.stamped).toBe(false);
    expect(p.at(-1)?.name).toBe("Cooking");
  });
  it("detects level-ups, new tiers and new genres", () => {
    const before = ledger([], titles);
    const after = ledger(Array.from({ length: 5 }, (_, i) => ev("chapter_read", "a", T0 + i, { value: i + 1 })), titles);
    const s = (l: ReturnType<typeof ledger>) => ({ ledger: l, sets: achievementSets({ ledger: l, library: [], collections: 0 }) });
    const g = gains(s(before), s(after));
    expect(g.xp).toBe(after.total);
    expect(g.levelUp?.level).toBe(2);
    expect(g.genres).toEqual(["Action", "Fantasy"]);
    expect(g.tiers.map((t) => t.set.id)).toContain("chapters");
  });
});

describe("copy", () => {
  // Streaks exist (D68), but never as guilt: nothing to keep, lose or miss.
  it("never uses guilt copy about streaks", () => {
    const sets = achievementSets({ ledger: ledger([], titles), library: [], collections: 0 });
    for (const s of sets) expect(`${s.name} ${s.rule} ${s.hint}`).not.toMatch(/keep your streak|lose|lost|miss/i);
  });
});
