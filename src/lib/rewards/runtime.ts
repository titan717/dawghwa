import { celebrate } from "@/components/Celebrate";
import { getSettings } from "../settings";
import { isIncognito } from "../store/incognito";
import { getUser, onSignal, subscribeUser, type UserState } from "../store/user";
import { gains, progressionFor, type Gains, type Progression, type Quest } from "./index";
import { newlyUnlocked, type Cosmetic } from "./cosmetics";

/**
 * Turns new events into reward moments. Only events that can change progression
 * are considered (a finished chapter or series). A screen that wants to present
 * gains itself (the Reader's chapter-end panel) registers a sink; otherwise a
 * reward card is shown. Nothing here ever fires mid-chapter: `chapter_read` is
 * emitted only when the last page is reached.
 */
export interface Moment extends Gains {
  quests: Quest[];
  unlocks: Cosmetic[];
  after: Progression;
}
type Sink = (g: Moment) => void;
let sink: Sink | null = null;
export function setRewardSink(fn: Sink | null) {
  sink = fn;
}

const RELEVANT = new Set(["chapter_read", "title_finished", "favorite", "like", "dislike", "not_interested", "surprise_pick", "comment", "quiz_done"]);

export function describe(g: Moment): { kind: "level" | "badge" | "genre" | "series" | "quest" | "cosmetic"; title: string; detail?: string; mascot?: boolean } | null {
  if (g.levelUp) return { kind: "level", title: `Level ${g.levelUp.level} · ${g.levelUp.tier.name}`, detail: g.levelUp.tier.from === g.levelUp.level ? `New mascot accessory: ${g.levelUp.tier.accessory}` : `+${g.xp} XP`, mascot: true };
  if (g.completed) return { kind: "series", title: "Series complete", detail: `+${g.xp} XP`, mascot: true };
  if (g.quests[0]) return { kind: "quest", title: `Quest done: ${g.quests[0].title}`, detail: g.unlocks[0] ? `Unlocked ${g.unlocks[0].name}` : "+50 XP" };
  if (g.unlocks[0]) return { kind: "cosmetic", title: `Unlocked ${g.unlocks[0].name}`, detail: "Wear it from Achievements" };
  const t = g.tiers[0];
  if (t) return { kind: "badge", title: t.set.goals.length > 1 ? `${t.set.name} ${["", "I", "II", "III", "IV", "V"][t.tier]}` : `${t.set.name} badge`, detail: g.xp ? `+${g.xp} XP` : t.set.rule };
  if (g.genres.length) return { kind: "genre", title: `New passport stamp: ${g.genres.join(", ")}`, detail: `+${g.xp} XP` };
  return null;
}

/** Collections with at least two series where every series is marked Completed. */
export function completedCollections(s: Pick<UserState, "library">): Set<string> {
  const by = new Map<string, boolean[]>();
  for (const r of s.library.values()) for (const c of r.collections) by.set(c, [...(by.get(c) ?? []), r.status === "completed"]);
  return new Set([...by].filter(([, xs]) => xs.length >= 2 && xs.every(Boolean)).map(([c]) => c));
}

let started = false;
export function startRewards() {
  if (started) return;
  started = true;
  // Collection completion is derived from the library; only a change seen while the app
  // runs is celebrated (never on load), once per collection per session.
  let pid = getUser().profile?.id;
  let done = completedCollections(getUser());
  subscribeUser(() => {
    const s = getUser();
    const now = completedCollections(s);
    if (s.profile?.id !== pid) {
      pid = s.profile?.id;
      done = now;
      return;
    }
    const fresh = [...now].filter((c) => !done.has(c));
    done = new Set([...done, ...now]);
    if (fresh.length && getSettings().rewards && !isIncognito()) celebrate({ kind: "series", title: `Collection complete: ${fresh[0]}`, detail: "Every series in it is finished.", mascot: true });
  });
  onSignal((e) => {
    if (!RELEVANT.has(e.kind) || !getSettings().rewards || isIncognito()) return;
    const s = getUser();
    const before = progressionFor(s, s.events.filter((x) => x.seq !== e.seq));
    const after = progressionFor(s);
    const prevDone = new Set(before.quests.done.map((q) => q.id));
    const g: Moment = {
      ...gains(before, after),
      quests: after.quests.done.filter((q) => !prevDone.has(q.id)),
      unlocks: newlyUnlocked({ quests: before.quests.done.length, level: before.level.level }, { quests: after.quests.done.length, level: after.level.level }),
      after,
    };
    if (!g.xp && !g.tiers.length && !g.unlocks.length) return;
    if (sink) return sink(g);
    const d = describe(g);
    if (d) celebrate(d);
  });
}
