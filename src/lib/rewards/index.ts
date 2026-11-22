import { useMemo } from "react";
import { allCollections, useUser, type UserState } from "../store/user";
import { XP, achievementSets, ledger, levelFor, passport, type AchievementSet, type Ledger, type Level, type Stamp, type XpEntry } from "./progression";
import { questBook, questSeedOf, type QuestBook } from "./quests";
import { earns, streakView, type Streak } from "./streak";
import { useSettings } from "../settings";

export * from "./progression";
export { questBook, weekStart, isoWeek, type Quest, type QuestBook } from "./quests";
export { streak, streakView, streakLabel, meaningfulDays, earns, MEANINGFUL_SECONDS, READ_TIME, INCOGNITO, type Streak } from "./streak";

export interface Progression {
  ledger: Ledger;
  level: Level;
  sets: AchievementSet[];
  stamps: Stamp[];
  quests: QuestBook;
}

/** Hooks for later phases (quests, comments) to add derived inputs without new stores. */
type Extra = (s: UserState) => { xp?: XpEntry[]; comments?: number };

const extras = new Set<Extra>();
export function registerProgressionInput(fn: Extra) {
  extras.add(fn);
  return () => extras.delete(fn);
}

export function progressionFor(s: UserState, all = s.events, now = Date.now()): Progression {
  // Incognito never earns: not XP, quests, badges or stamps.
  const events = all.filter(earns);
  let xp: XpEntry[] = [];
  // Distinct chapters commented on, from the event log: deleting and re-posting can't farm it.
  let comments: number = new Set(events.filter((e) => e.kind === "comment").map((e) => e.context ?? e.titleKey)).size;
  for (const f of extras) {
    const r = f({ ...s, events });
    if (r.xp) xp = xp.concat(r.xp);
    comments += r.comments ?? 0;
  }
  const book = questBook(questSeedOf(s.profile), events, s.titles, now);
  xp = xp.concat(book.done.map((q) => ({ at: q.doneAt!, xp: XP.quest, reason: "quest" as const, ref: q.title })));
  const l = ledger(events, s.titles, xp);
  return { ledger: l, level: levelFor(l.total), sets: achievementSets({ ledger: l, library: s.library.values(), collections: allCollections(s).length, quests: book.done.length, comments }), stamps: passport(l), quests: book };
}

export function useProgression(): Progression {
  const events = useUser((s) => s.events);
  const titles = useUser((s) => s.titles);
  const library = useUser((s) => s.library);
  const version = useUser((s) => s.signalVersion);
  const state = useUser((s) => s);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => progressionFor(state), [events, titles, library, version]);
}

/**
 * The streak for the StreakChip, or null when there is nothing to show (Rewards
 * off, Incognito, or no current streak). `incognito` is for the session flag
 * once Incognito exists; events tagged Incognito are ignored either way.
 */
export function useStreak(opts: { incognito?: boolean } = {}): Streak | null {
  const events = useUser((s) => s.events);
  const { rewards } = useSettings();
  const day = new Date().toDateString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => streakView(events, { rewards, incognito: opts.incognito }), [events, rewards, opts.incognito, day]);
}
