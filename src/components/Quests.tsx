import { Link } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { XP, useProgression, type Quest } from "@/lib/rewards";
import { nextQuestUnlock } from "@/lib/rewards/cosmetics";
import { useSettings } from "@/lib/settings";
import { useUser } from "@/lib/store/user";
import { useIncognito } from "@/lib/store/incognito";
import { ProgressRing } from "./ProgressRing";

const label = (q: Quest) => (q.doneAt ? "Done" : `${q.value} of ${q.goal}`);

/** One weekly quest. Done quests stay visible (with their reward) until the week ends. */
export function QuestCard({ q, unlock }: { q: Quest; unlock?: string }) {
  const done = q.doneAt !== undefined;
  return (
    <li className="quest" data-done={done || undefined}>
      <ProgressRing value={q.value / q.goal} size={48} stroke={4} tone="quest" label={`${q.title}: ${label(q)}`}>
        {done ? <Check size={20} aria-hidden /> : q.goal > 1 ? `${q.value}/${q.goal}` : null}
      </ProgressRing>
      <div className="quest-body">
        <h3>{q.title}</h3>
        <p className="muted">{q.detail}</p>
        <p className="quest-reward">{done ? `Done · +${XP.quest} XP` : `+${XP.quest} XP${unlock ? ` · counts toward ${unlock}` : ""}`}</p>
      </div>
      {!done && (
        <Link className="btn btn-sm quest-go" to={q.action.to}>
          {q.action.label}
        </Link>
      )}
    </li>
  );
}

export function QuestList({ quests }: { quests: Quest[] }) {
  const { quests: book } = useProgression();
  const next = nextQuestUnlock(book.done.length);
  return (
    <ul className="quest-list">
      {quests.map((q) => (
        <QuestCard key={q.id} q={q} unlock={next?.name} />
      ))}
    </ul>
  );
}

/** The quest Home shows: the unfinished one closest to done (ties keep the book's order). */
export function pickHomeQuest(quests: Quest[]): Quest | undefined {
  const open = quests.filter((q) => q.doneAt === undefined);
  if (!open.length) return undefined;
  return open.reduce((best, q) => (q.value / q.goal > best.value / best.goal ? q : best), open[0]!);
}

/**
 * One weekly quest card on Home (Spec L). Hidden with Rewards off, before the
 * store is ready, and in Incognito, where quests can't move.
 */
export function QuestStrip() {
  const { rewards } = useSettings();
  const ready = useUser((s) => s.ready);
  const incognito = useIncognito();
  const { quests } = useProgression();
  if (!rewards || !ready || incognito || !quests.current.length) return null;
  const total = quests.current.length;
  const done = quests.current.filter((q) => q.doneAt !== undefined).length;
  const q = pickHomeQuest(quests.current);
  return (
    <section className="quest-home" aria-labelledby="quest-home-h" data-done={!q || undefined}>
      <ProgressRing value={q ? q.value / q.goal : 1} size={44} stroke={4} tone="quest">
        {q ? (q.goal > 1 ? `${q.value}/${q.goal}` : null) : <Check size={18} aria-hidden />}
      </ProgressRing>
      <div className="quest-home-body">
        <p className="quest-home-kicker">This week</p>
        <h2 id="quest-home-h">{q ? q.title : `All ${total} quests done this week`}</h2>
        <p className="quest-home-detail">
          {q ? (
            <>
              {q.detail} <span className="quest-home-xp">+{XP.quest} XP</span>
            </>
          ) : (
            <span className="quest-home-xp">+{XP.quest * total} XP earned</span>
          )}
        </p>
        <Link className="quest-home-all" to="/achievements#quests">
          {done} of {total} done · All quests <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
      {q && (
        <Link className="btn quest-home-go" to={q.action.to}>
          {q.action.label}
        </Link>
      )}
    </section>
  );
}
