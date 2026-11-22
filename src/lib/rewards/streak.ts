import type { EventRecord } from "../store/db";
import { isoWeek } from "./quests";

/**
 * Reading streak (supersedes D22 "rhythm, not streak"; see D38).
 *
 * Derived, never stored: a pure function of the profile's event log, so it
 * travels with export/import and can't drift.
 *
 *  - A day counts when it has a meaningful read: a chapter finished (a
 *    `chapter_read` event, which the reader emits only at the last page) or at
 *    least five minutes of active reading that local calendar day
 *    (`read_time` events, value = active seconds).
 *  - The streak is the number of consecutive local calendar days with a
 *    meaningful read, ending today or yesterday (today isn't over yet).
 *  - One freeze per ISO week, refilled every Monday, never bought. It
 *    automatically covers a single missed day in its week. A covered day keeps
 *    the streak alive but doesn't add to it. Two missed days in a row always
 *    end the streak.
 *  - Events marked Incognito earn nothing.
 */

/** Seconds of active reading in one local day that make it a meaningful read. */
export const MEANINGFUL_SECONDS = 5 * 60;
/** Event kind for active reading time (value = active seconds). */
export const READ_TIME = "read_time";
/** Context marking an event recorded during an Incognito session. */
export const INCOGNITO = "incognito";

/** False for anything recorded while Incognito: it never earns. */
export const earns = (e: Pick<EventRecord, "context">) => e.context !== INCOGNITO;

/** Local calendar day label, e.g. "2026-11-22". Stable across DST changes. */
export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** Local midnight of the day containing t. */
export function dayStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
/** Local midnight of the next calendar day (23 or 25 hours later on DST days). */
function nextDay(start: number): number {
  const d = new Date(start);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Local days (as dayKey) with a meaningful read. */
export function meaningfulDays(events: Iterable<EventRecord>): Set<string> {
  const days = new Set<string>();
  const seconds = new Map<string, number>();
  for (const e of events) {
    if (!earns(e)) continue;
    if (e.kind === "chapter_read") days.add(dayKey(e.at));
    else if (e.kind === READ_TIME && typeof e.value === "number" && e.value > 0) {
      const k = dayKey(e.at);
      const s = (seconds.get(k) ?? 0) + Math.min(e.value, 24 * 3600);
      seconds.set(k, s);
      if (s >= MEANINGFUL_SECONDS) days.add(k);
    }
  }
  return days;
}

export interface Streak {
  /** Current streak length in reading days (0 when there is none). */
  days: number;
  /** Today already has a meaningful read. */
  readToday: boolean;
  /** This streak has a missed day in the current ISO week covered by a freeze. */
  freezeUsedThisWeek: boolean;
  /** This week's freeze is still unused. */
  freezeAvailable: boolean;
  /** Missed days covered by a freeze during the current streak (local midnights). */
  frozen: number[];
  /** Longest streak ever, in reading days. */
  longest: number;
}

export function streak(events: Iterable<EventRecord>, now = Date.now()): Streak {
  const read = meaningfulDays(events);
  const today = dayStart(now);
  const todayKey = dayKey(today);
  const usedWeeks = new Set<string>();
  const firstAt = [...read].sort()[0];
  let days = 0;
  let longest = 0;
  let frozen: number[] = [];
  let missed: number | null = null;
  if (firstAt) {
    const [y, m, d] = firstAt.split("-").map(Number) as [number, number, number];
    for (let t = new Date(y, m - 1, d).getTime(); t <= today; t = nextDay(t)) {
      const k = dayKey(t);
      if (read.has(k)) {
        if (missed !== null) {
          const w = isoWeek(missed);
          if (days > 0 && !usedWeeks.has(w)) {
            usedWeeks.add(w);
            frozen.push(missed);
          } else {
            days = 0;
            frozen = [];
          }
          missed = null;
        }
        days++;
        longest = Math.max(longest, days);
      } else if (k !== todayKey) {
        if (missed !== null) {
          // Two missed days in a row: the streak ends, whatever freezes are left.
          days = 0;
          frozen = [];
          missed = null;
        } else if (days > 0) missed = t;
      }
    }
  }
  // Yesterday was missed and today has no read yet: the freeze covers it if it can.
  if (missed !== null) {
    const w = isoWeek(missed);
    if (!usedWeeks.has(w)) {
      usedWeeks.add(w);
      frozen.push(missed);
    } else {
      days = 0;
      frozen = [];
    }
  }
  const week = isoWeek(today);
  return { days, readToday: read.has(todayKey), freezeUsedThisWeek: frozen.some((t) => isoWeek(t) === week), freezeAvailable: !usedWeeks.has(week), frozen, longest };
}

/** What the StreakChip shows: nothing with Rewards off, in Incognito, or with no streak. */
export function streakView(events: Iterable<EventRecord>, opts: { rewards: boolean; incognito?: boolean }, now = Date.now()): Streak | null {
  if (!opts.rewards || opts.incognito) return null;
  const s = streak(events, now);
  return s.days > 0 ? s : null;
}

/** Neutral label, e.g. "3-day streak". Never guilt copy. */
export const streakLabel = (s: Pick<Streak, "days">) => `${s.days}-day streak`;
