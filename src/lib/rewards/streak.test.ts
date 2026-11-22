import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { EventRecord } from "../store/db";
import { INCOGNITO, MEANINGFUL_SECONDS, READ_TIME, dayKey, meaningfulDays, streak, streakLabel, streakView } from "./streak";

let seq = 0;
const ev = (kind: string, at: number, extra: Partial<EventRecord> = {}): EventRecord => ({ profileId: "p", seq: ++seq, kind, titleKey: "a", at, ...extra });
/** Local time on a November 2026 day. Mon 2 Nov ... Sun 8 Nov, Mon 9 Nov (ISO weeks 45, 46). */
const at = (day: number, h = 12, m = 0) => new Date(2026, 10, day, h, m).getTime();
const ch = (day: number, h = 12, m = 0) => ev("chapter_read", at(day, h, m), { value: day });
const reads = (...days: number[]) => days.map((d) => ch(d));

describe("meaningful reads", () => {
  it("counts a finished chapter", () => {
    expect([...meaningfulDays([ch(3)])]).toEqual(["2026-11-03"]);
  });
  it("counts five minutes of active reading in one day, added up across sessions", () => {
    expect(meaningfulDays([ev(READ_TIME, at(3, 9), { value: 120 }), ev(READ_TIME, at(3, 20), { value: MEANINGFUL_SECONDS - 120 })]).has("2026-11-03")).toBe(true);
  });
  it("ignores less than five minutes, opens and other signals", () => {
    const d = meaningfulDays([ev(READ_TIME, at(3), { value: MEANINGFUL_SECONDS - 1 }), ev("open", at(4)), ev("favorite", at(5)), ev("title_finished", at(6))]);
    expect(d.size).toBe(0);
  });
  it("does not add reading time across midnight into one day", () => {
    const d = meaningfulDays([ev(READ_TIME, at(3, 23, 58), { value: 200 }), ev(READ_TIME, at(4, 0, 2), { value: 200 })]);
    expect(d.size).toBe(0);
  });
  it("ignores bad reading-time values", () => {
    expect(meaningfulDays([ev(READ_TIME, at(3)), ev(READ_TIME, at(3), { value: -900 })]).size).toBe(0);
  });
});

describe("streak", () => {
  it("is zero with no reading", () => {
    expect(streak([], at(10))).toMatchObject({ days: 0, longest: 0, readToday: false, freezeAvailable: true, freezeUsedThisWeek: false });
  });
  it("counts consecutive local days, ending today", () => {
    expect(streak(reads(3, 4, 5), at(5, 18))).toMatchObject({ days: 3, readToday: true });
  });
  it("stays alive through today before you have read (today isn't over)", () => {
    expect(streak(reads(3, 4, 5), at(6, 8))).toMatchObject({ days: 3, readToday: false, freezeUsedThisWeek: false });
  });
  it("counts several reads in one day once", () => {
    expect(streak([ch(4, 9), ch(4, 13), ch(4, 22)], at(4, 23)).days).toBe(1);
  });
  it("uses the freeze for a single missed day, without counting the missed day", () => {
    const s = streak(reads(3, 4, 6), at(6, 20)); // Thu 5 missed
    expect(s.days).toBe(3);
    expect(s.frozen.map(dayKey)).toEqual(["2026-11-05"]);
    expect(s).toMatchObject({ freezeUsedThisWeek: true, freezeAvailable: false });
  });
  it("covers yesterday automatically while today is still open", () => {
    const s = streak(reads(3, 4), at(6, 9)); // missed Thu 5, Fri 6 not read yet
    expect(s.days).toBe(2);
    expect(s.freezeUsedThisWeek).toBe(true);
  });
  it("ends on a gap of two days, even with a freeze left", () => {
    expect(streak(reads(2, 3, 6), at(6, 20)).days).toBe(1);
    expect(streak(reads(2, 3), at(6, 9)).days).toBe(0);
  });
  it("allows only one freeze per ISO week", () => {
    // Week 45: missed Tue 3 and Thu 5. The second miss ends the streak.
    const s = streak(reads(2, 4, 6), at(6, 20));
    expect(s.days).toBe(1);
    expect(s.longest).toBe(2);
    expect(s.freezeAvailable).toBe(false);
  });
  it("refills the freeze every Monday", () => {
    // Missed Wed 4 (week 45) and Tue 10 (week 46): both covered.
    const s = streak(reads(2, 3, 5, 6, 7, 8, 9, 11), at(11, 20));
    expect(s.days).toBe(8);
    expect(s.frozen.map(dayKey)).toEqual(["2026-11-04", "2026-11-10"]);
    expect(s.freezeUsedThisWeek).toBe(true);
  });
  it("Monday's fresh freeze is unused even when last week's was spent", () => {
    const s = streak(reads(2, 3, 5, 6, 7, 8, 9), at(9, 20));
    expect(s).toMatchObject({ days: 7, freezeAvailable: true, freezeUsedThisWeek: false });
  });
  it("a freeze covers a missed Sunday from that week's freeze", () => {
    // Missed Sun 8 (week 45, freeze unused), read Mon 9.
    const s = streak(reads(6, 7, 9), at(9, 20));
    expect(s.days).toBe(3);
    expect(s.frozen.map(dayKey)).toEqual(["2026-11-08"]);
    expect(s.freezeUsedThisWeek).toBe(false); // used last week, not this one
  });
  it("starts again after a break and remembers the longest", () => {
    const s = streak(reads(1, 2, 3, 4, 8, 9), at(9, 20));
    expect(s).toMatchObject({ days: 2, longest: 4 });
  });
  it("uses local calendar days: 23:59 and 00:01 are two days", () => {
    expect(streak([ch(3, 23, 59), ch(4, 0, 1)], at(4, 12)).days).toBe(2);
  });
  it("a chapter or five minutes both count toward the same streak", () => {
    expect(streak([ch(3), ev(READ_TIME, at(4), { value: MEANINGFUL_SECONDS })], at(4, 20)).days).toBe(2);
  });
  it("is independent of the order of stored events", () => {
    expect(streak(reads(6, 3, 5, 4), at(6, 20)).days).toBe(4);
  });
  it("ignores Incognito reading", () => {
    const evs = [...reads(3, 4), ev("chapter_read", at(5), { context: INCOGNITO }), ev(READ_TIME, at(6), { value: 3600, context: INCOGNITO })];
    expect(streak(evs, at(7, 9)).days).toBe(0); // 5 and 6 missed
    expect(streak(reads(3, 4), at(7, 9)).days).toBe(0);
  });
});

describe("streak across a daylight-saving change", () => {
  const tz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/New_York"; // clocks go back on Sun 1 Nov 2026
  });
  afterAll(() => {
    process.env.TZ = tz;
  });
  it("counts each calendar day once through a 25-hour day", () => {
    const days = [30, 31].map((d) => new Date(2026, 9, d, 23, 30).getTime()).concat([1, 2].map((d) => new Date(2026, 10, d, 0, 30).getTime()));
    const s = streak(days.map((t) => ev("chapter_read", t)), new Date(2026, 10, 2, 22).getTime());
    expect(s.days).toBe(4);
  });
});

describe("what the chip shows", () => {
  it("nothing with Rewards off or in Incognito; the streak itself is untouched", () => {
    const evs = reads(3, 4);
    expect(streakView(evs, { rewards: false }, at(4, 20))).toBeNull();
    expect(streakView(evs, { rewards: true, incognito: true }, at(4, 20))).toBeNull();
    expect(streakView(evs, { rewards: true }, at(4, 20))?.days).toBe(2);
  });
  it("nothing without a current streak", () => {
    expect(streakView([], { rewards: true }, at(4))).toBeNull();
  });
  it("uses neutral words, never guilt", () => {
    const label = streakLabel({ days: 3 });
    expect(label).toBe("3-day streak");
    expect(label).not.toMatch(/lose|lost|miss|don't|hurry|keep/i);
  });
});
