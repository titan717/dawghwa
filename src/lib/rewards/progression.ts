import type { EventRecord, LibraryRecord } from "../store/db";
import type { Title } from "../titles";
import { GENRES, genreKey } from "../genres";
import { earns } from "./streak";

/**
 * Progression is *derived*, never stored. The ledger is a pure function of the
 * profile's append-only event log, so it survives "clear history", travels with
 * export/import, and cannot drift. Farm-proofing rules:
 *  - A chapter earns XP once per (series, chapter number), and only from a
 *    `chapter_read` event, which the reader emits only when the last page is reached.
 *    "Mark as read" in the chapter list never emits one, so it earns nothing.
 *    Un-marking and re-reading a chapter emits a second event; it is ignored.
 *  - A series counts as completed only when the reader finished it
 *    (`title_finished` with context "reader"), once per series, and only if at
 *    least half its chapters were read to the end here (the event carries the
 *    final chapter number). Opening only the last chapter, or marking a series
 *    "Completed" by hand, earns nothing.
 *  - A new series and a new genre are earned on the first finished chapter in them.
 *  - At most one XP award per chapter per day (in fact once per chapter, ever).
 *  - A daily cap: no more than DAILY_XP_CAP XP per local calendar day, from all
 *    reasons together. Chapters, series and stamps past the cap still count for
 *    badges and the passport; only the XP stops. The cap applies to days from
 *    DAILY_CAP_FROM on, so nobody loses XP or a level they already had.
 *  - Events recorded in Incognito earn nothing.
 */

export const XP = { chapter: 10, series: 25, complete: 100, genre: 15, quest: 50 } as const;

/** Most XP one local calendar day can add. A big day of new series is about 200. */
export const DAILY_XP_CAP = 300;
/** Local midnight of the first day the cap applies to (the day it shipped). */
export const DAILY_CAP_FROM = new Date(2026, 10, 23).getTime();

export type XpReason = keyof typeof XP;
export interface XpEntry {
  at: number;
  xp: number;
  reason: XpReason;
  titleKey?: string;
  /** Chapter number, genre name or quest id. */
  ref?: string | number;
}

export interface Ledger {
  entries: XpEntry[];
  total: number;
  chapters: number;
  series: number;
  completed: number;
  /** genre key -> { name, first stamped at, chapters read in it } */
  genres: Map<string, { name: string; at: number; chapters: number }>;
  /** Distinct local days with at least one finished chapter (all time). */
  activeDays: number;
}

const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export function ledger(events: Iterable<EventRecord>, titles: Map<string, Title>, extra: XpEntry[] = []): Ledger {
  const evs = [...events].filter(earns).sort((a, b) => a.at - b.at || a.seq - b.seq);
  const seenChapter = new Set<string>();
  const perSeries = new Map<string, number>();
  const seenSeries = new Set<string>();
  const seenComplete = new Set<string>();
  const genres = new Map<string, { name: string; at: number; chapters: number }>();
  const days = new Set<string>();
  const entries: XpEntry[] = [];
  for (const e of evs) {
    if (e.kind === "chapter_read") {
      const id = `${e.titleKey}|${e.value ?? "?"}`;
      if (seenChapter.has(id)) continue;
      seenChapter.add(id);
      perSeries.set(e.titleKey, (perSeries.get(e.titleKey) ?? 0) + 1);
      days.add(dayKey(e.at));
      entries.push({ at: e.at, xp: XP.chapter, reason: "chapter", titleKey: e.titleKey, ref: e.value });
      if (!seenSeries.has(e.titleKey)) {
        seenSeries.add(e.titleKey);
        entries.push({ at: e.at, xp: XP.series, reason: "series", titleKey: e.titleKey });
      }
      for (const name of titles.get(e.titleKey)?.meta?.genres ?? []) {
        const k = genreKey(name);
        const g = genres.get(k);
        if (g) g.chapters++;
        else {
          genres.set(k, { name, at: e.at, chapters: 1 });
          entries.push({ at: e.at, xp: XP.genre, reason: "genre", titleKey: e.titleKey, ref: name });
        }
      }
    } else if (e.kind === "title_finished" && e.context === "reader") {
      const need = Math.max(1, Math.ceil((e.value ?? 1) / 2));
      if (seenComplete.has(e.titleKey) || (perSeries.get(e.titleKey) ?? 0) < need) continue;
      seenComplete.add(e.titleKey);
      entries.push({ at: e.at, xp: XP.complete, reason: "complete", titleKey: e.titleKey });
    }
  }
  for (const x of extra) entries.push(x);
  entries.sort((a, b) => a.at - b.at);
  const capped = capDaily(entries);
  return { entries: capped, total: capped.reduce((s, x) => s + x.xp, 0), chapters: seenChapter.size, series: seenSeries.size, completed: seenComplete.size, genres, activeDays: days.size };
}

/** Applies DAILY_XP_CAP per local day (entries sorted by time). Trimmed-to-zero entries are dropped. */
export function capDaily(entries: XpEntry[], cap = DAILY_XP_CAP, from = DAILY_CAP_FROM): XpEntry[] {
  const used = new Map<string, number>();
  const out: XpEntry[] = [];
  for (const x of entries) {
    if (x.at < from) {
      out.push(x);
      continue;
    }
    const k = dayKey(x.at);
    const left = cap - (used.get(k) ?? 0);
    const xp = Math.max(0, Math.min(x.xp, left));
    if (!xp) continue;
    used.set(k, (used.get(k) ?? 0) + xp);
    out.push(xp === x.xp ? x : { ...x, xp });
  }
  return out;
}

// ------------------------------------------------------------------ levels

/** XP needed to go from level L to L+1: 60, 100, 140, ... (cumulative: L2 60, L3 160, L5 480, L10 1980). */
export const stepCost = (level: number) => 60 + 40 * (level - 1);
export function levelStart(level: number) {
  let s = 0;
  for (let l = 1; l < level; l++) s += stepCost(l);
  return s;
}

export interface Tier {
  id: "pup" | "bookhound" | "scout" | "keeper" | "archivist" | "legend";
  name: string;
  from: number;
  /** Mascot accessory unlocked with the tier (rendered as an emblem on the mascot). */
  accessory: string;
}
export const TIERS: Tier[] = [
  { id: "pup", name: "Pup", from: 1, accessory: "Paw print" },
  { id: "bookhound", name: "Bookhound", from: 3, accessory: "Bookmark" },
  { id: "scout", name: "Story Scout", from: 6, accessory: "Compass" },
  { id: "keeper", name: "Lore Keeper", from: 10, accessory: "Reading glasses" },
  { id: "archivist", name: "Archivist", from: 15, accessory: "Scroll" },
  { id: "legend", name: "Legend", from: 25, accessory: "Crown" },
];
export const tierFor = (level: number) => [...TIERS].reverse().find((t) => level >= t.from)!;

export interface Level {
  level: number;
  tier: Tier;
  xp: number;
  /** XP into the current level and the size of the level. */
  into: number;
  span: number;
  progress: number;
  nextTier?: Tier;
}

export function levelFor(xp: number): Level {
  let level = 1;
  let start = 0;
  while (xp >= start + stepCost(level)) {
    start += stepCost(level);
    level++;
  }
  const span = stepCost(level);
  const tier = tierFor(level);
  return { level, tier, xp, into: xp - start, span, progress: (xp - start) / span, nextTier: TIERS.find((t) => t.from > level) };
}

// ------------------------------------------------------------------ achievements

export interface AchievementSet {
  id: string;
  name: string;
  /** What counts, in plain words. */
  rule: string;
  value: number;
  goals: number[];
  /** Tiers earned (0 = locked). */
  tier: number;
  /** Progress toward the next goal, 0..1 (1 when maxed). */
  progress: number;
  /** Plain hint, e.g. "3 more chapters for tier II". */
  hint: string;
  unit: [string, string];
}

const ROMAN = ["", "I", "II", "III", "IV", "V"];

export function makeSet(id: string, name: string, rule: string, value: number, goals: number[], unit: [string, string]): AchievementSet {
  const tier = goals.filter((g) => value >= g).length;
  const prev = tier ? goals[tier - 1]! : 0;
  const next = goals[tier];
  const progress = next === undefined ? 1 : (value - prev) / (next - prev);
  const left = next === undefined ? 0 : next - value;
  const hint = next === undefined ? `All ${goals.length} tiers earned` : `${left} more ${left === 1 ? unit[0] : unit[1]} for tier ${ROMAN[tier + 1]}`;
  return { id, name, rule, value, goals, tier, progress: Math.max(0, Math.min(1, progress)), hint, unit };
}

export interface AchievementInput {
  ledger: Ledger;
  library: Iterable<LibraryRecord>;
  collections: number;
  quests?: number;
  comments?: number;
}

export function achievementSets({ ledger: l, library, collections, quests = 0, comments = 0 }: AchievementInput): AchievementSet[] {
  const lib = [...library];
  return [
    makeSet("chapters", "Page turner", "Chapters read to the last page", l.chapters, [1, 25, 100, 500], ["chapter", "chapters"]),
    makeSet("series", "Story hopper", "Different series started", l.series, [1, 5, 25], ["series", "series"]),
    makeSet("complete", "The end", "Series read to the final chapter", l.completed, [1, 5, 15], ["series", "series"]),
    makeSet("genres", "Wide reader", "Genres you have read a chapter in", l.genres.size, [3, 8, 15], ["genre", "genres"]),
    makeSet("days", "Regular", "Days you finished a chapter (any days, in a row or not)", l.activeDays, [3, 15, 50], ["day", "days"]),
    makeSet("favourites", "Keeper", "Series in Favourites", lib.filter((r) => r.favorite).length, [1, 10, 30], ["favourite", "favourites"]),
    makeSet("collections", "Curator", "Collections you made", collections, [1, 3, 6], ["collection", "collections"]),
    makeSet("quests", "Quest hound", "Weekly quests completed", quests, [1, 5, 20], ["quest", "quests"]),
    makeSet("comments", "Margin notes", "Chapters you left a comment on", comments, [1, 10, 50], ["chapter", "chapters"]),
  ];
}

// ------------------------------------------------------------------ passport

export interface Stamp {
  name: string;
  stamped: boolean;
  at?: number;
  chapters: number;
}

/** Headline genres first (stamped or not), then any other genre the reader has stamped. */
export function passport(l: Ledger): Stamp[] {
  const head = GENRES.map((name) => {
    const g = l.genres.get(genreKey(name));
    return { name, stamped: Boolean(g), at: g?.at, chapters: g?.chapters ?? 0 };
  });
  const known = new Set(GENRES.map(genreKey));
  const extra = [...l.genres.entries()].filter(([k]) => !known.has(k)).map(([, g]) => ({ name: g.name, stamped: true, at: g.at, chapters: g.chapters }));
  return [...head, ...extra.sort((a, b) => (a.at ?? 0) - (b.at ?? 0))];
}

// ------------------------------------------------------------------ diffs (what just happened)

export interface Gains {
  xp: number;
  levelUp?: Level;
  tiers: { set: AchievementSet; tier: number }[];
  genres: string[];
  completed: boolean;
}

/** Compare two snapshots (before/after an event) to decide what to celebrate. */
export function gains(before: { ledger: Ledger; sets: AchievementSet[] }, after: { ledger: Ledger; sets: AchievementSet[] }): Gains {
  const lb = levelFor(before.ledger.total);
  const la = levelFor(after.ledger.total);
  const prev = new Map(before.sets.map((s) => [s.id, s.tier]));
  return {
    xp: after.ledger.total - before.ledger.total,
    levelUp: la.level > lb.level ? la : undefined,
    tiers: after.sets.filter((s) => s.tier > (prev.get(s.id) ?? 0)).map((s) => ({ set: s, tier: s.tier })),
    genres: [...after.ledger.genres.entries()].filter(([k]) => !before.ledger.genres.has(k)).map(([, g]) => g.name),
    completed: after.ledger.completed > before.ledger.completed,
  };
}
