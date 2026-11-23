import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { EventRecord } from "../store/db";
import { DAILY_XP_CAP, capDaily, type XpEntry } from "./progression";
import { isoWeek, weekStart } from "./quests";
import { MEANINGFUL_SECONDS, READ_TIME, dayKey, meaningfulDays, streak } from "./streak";

/**
 * Streak, cap and week boundaries in several real time zones. Each block sets
 * process.env.TZ in beforeAll and restores it in afterAll, and first proves the
 * zone actually applied (Node re-reads TZ on assignment on Linux and macOS).
 * All dates are built inside the tests, after the zone is set.
 */
let seq = 0;
const ev = (kind: string, at: number, extra: Partial<EventRecord> = {}): EventRecord => ({ profileId: "p", seq: ++seq, kind, titleKey: "a", at, ...extra });
const read = (t: number, n = ++seq) => ev("chapter_read", t, { value: n });
const local = (y: number, mo: number, d: number, h = 12, mi = 0, s = 0, ms = 0) => new Date(y, mo - 1, d, h, mi, s, ms).getTime();

function inZone(tz: string, janOffset: number, body: () => void) {
  describe(`in ${tz}`, () => {
    const prev = process.env.TZ;
    beforeAll(() => {
      process.env.TZ = tz;
    });
    afterAll(() => {
      process.env.TZ = prev;
    });
    it("the zone applied", () => {
      expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(janOffset);
    });
    body();
  });
}

/** Checks that hold in every zone. */
function common() {
  it("23:59:59.999 and 00:00 the next local day are two days in a row", () => {
    const a = local(2026, 11, 10, 23, 59, 59, 999);
    const b = local(2026, 11, 11, 0, 0, 0, 0);
    expect(dayKey(a)).toBe("2026-11-10");
    expect(dayKey(b)).toBe("2026-11-11");
    expect(streak([read(a), read(b)], local(2026, 11, 11, 18)).days).toBe(2);
  });
  it("one local day is one day, however its reads fall against UTC midnight", () => {
    const evs = [read(local(2026, 11, 10, 0, 1)), read(local(2026, 11, 10, 12)), read(local(2026, 11, 10, 23, 59))];
    expect(meaningfulDays(evs).size).toBe(1);
    expect(streak(evs, local(2026, 11, 10, 23, 59, 30)).days).toBe(1);
  });
  it("five minutes of reading: exactly 300 s across two sessions counts, 299 s doesn't", () => {
    const d = (s2: number) => meaningfulDays([ev(READ_TIME, local(2026, 11, 10, 9), { value: 100 }), ev(READ_TIME, local(2026, 11, 10, 21), { value: s2 })]);
    expect(d(MEANINGFUL_SECONDS - 100).has("2026-11-10")).toBe(true);
    expect(d(MEANINGFUL_SECONDS - 101).size).toBe(0);
  });
  it("reading time split across local midnight is not combined", () => {
    expect(meaningfulDays([ev(READ_TIME, local(2026, 11, 10, 23, 59), { value: 200 }), ev(READ_TIME, local(2026, 11, 11, 0, 0, 30), { value: 200 })]).size).toBe(0);
  });
  it("the daily XP cap resets at local midnight, not UTC midnight", () => {
    const x = (t: number, xp: number): XpEntry => ({ at: t, xp, reason: "chapter" });
    const out = capDaily([x(local(2026, 11, 30, 23, 0), DAILY_XP_CAP), x(local(2026, 11, 30, 23, 59), 10), x(local(2026, 12, 1, 0, 1), 10)]);
    expect(out.map((e) => e.xp)).toEqual([DAILY_XP_CAP, 10]);
    expect(dayKey(out[1]!.at)).toBe("2026-12-01");
  });
  it("a missed Sunday uses that week's freeze; a missed Monday uses the new week's", () => {
    // Mon 9 Nov 2026 .. Sun 15 Nov is ISO W46. Read Fri-Sat, miss Sun 15, read Mon 16 (W47), miss Tue 17, read Wed 18.
    const evs = [13, 14, 16, 18].map((d) => read(local(2026, 11, d)));
    const s = streak(evs, local(2026, 11, 18, 20));
    expect(s.days).toBe(4);
    expect(s.frozen.map(dayKey)).toEqual(["2026-11-15", "2026-11-17"]);
    expect(s.freezeAvailable).toBe(false);
  });
  it("two missed days in a row end the streak even with freezes left", () => {
    expect(streak([12, 13, 16].map((d) => read(local(2026, 11, d))), local(2026, 11, 16, 20)).days).toBe(1);
  });
  it("crosses the year through ISO week 53 (28 Dec 2026 to 3 Jan 2027)", () => {
    expect(isoWeek(local(2026, 12, 28))).toBe("2026-W53");
    expect(isoWeek(local(2027, 1, 3, 23, 59))).toBe("2026-W53");
    expect(isoWeek(local(2027, 1, 4, 0, 0))).toBe("2027-W01");
    // Read 30 Dec to 5 Jan, missing 1 Jan (W53 freeze) and 4 Jan (W01 freeze).
    const evs = [[2026, 12, 30], [2026, 12, 31], [2027, 1, 2], [2027, 1, 3], [2027, 1, 5]].map(([y, m, d]) => read(local(y!, m!, d!)));
    const s = streak(evs, local(2027, 1, 5, 20));
    expect(s.days).toBe(5);
    expect(s.frozen.map(dayKey)).toEqual(["2027-01-01", "2027-01-04"]);
  });
  it("today not read yet keeps yesterday's streak (today isn't over)", () => {
    const s = streak([read(local(2026, 11, 10)), read(local(2026, 11, 11, 23, 59))], local(2026, 11, 12, 0, 0, 1));
    expect(s).toMatchObject({ days: 2, readToday: false });
  });
}

/** Both DST directions: no day counted twice or skipped, weeks still start on local Monday 00:00. */
function dst(spring: [number, number, number], fall: [number, number, number]) {
  for (const [name, [y, m, d]] of [["spring forward (23-hour day)", spring], ["fall back (25-hour day)", fall]] as const) {
    it(`streak runs straight through ${name}`, () => {
      const days = [-2, -1, 0, 1, 2].map((k) => local(y, m, d + k, k % 2 ? 0 : 23, k % 2 ? 30 : 30));
      const keys = days.map(dayKey);
      expect(new Set(keys).size).toBe(5);
      const s = streak(days.map((t) => read(t)), local(y, m, d + 2, 23, 45));
      expect(s.days).toBe(5);
      expect(s.frozen).toEqual([]);
    });
    it(`one missed day on ${name} is one missed day`, () => {
      const s = streak([-2, -1, 1].map((k) => read(local(y, m, d + k))), local(y, m, d + 1, 20));
      expect(s.days).toBe(3);
      expect(s.frozen.map(dayKey)).toEqual([dayKey(local(y, m, d))]);
    });
    it(`the quest week starts at local Monday 00:00 around ${name}`, () => {
      const w = new Date(weekStart(local(y, m, d, 12)));
      expect([w.getDay(), w.getHours(), w.getMinutes()]).toEqual([1, 0, 0]);
    });
  }
}

inZone("Asia/Kolkata", -330, () => {
  common();
  it("05:29 and 05:31 IST (either side of UTC midnight) are the same local day", () => {
    const a = local(2026, 11, 10, 5, 29);
    const b = local(2026, 11, 10, 5, 31);
    expect(new Date(a).getUTCDate()).not.toBe(new Date(b).getUTCDate());
    expect(meaningfulDays([read(a), read(b)]).size).toBe(1);
  });
});
inZone("Pacific/Kiritimati", -840, () => {
  common();
  it("a local day that spans two UTC dates counts once", () => {
    expect(meaningfulDays([read(local(2026, 11, 10, 1)), read(local(2026, 11, 10, 22))]).size).toBe(1);
  });
});
inZone("America/Los_Angeles", 480, () => {
  common();
  dst([2026, 3, 8], [2026, 11, 1]);
});
inZone("Europe/London", 0, () => {
  common();
  dst([2026, 3, 29], [2026, 10, 25]);
});
