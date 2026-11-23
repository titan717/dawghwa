import { Link } from "react-router-dom";
import { Award, BookOpen, CalendarDays, Compass, Flag, FolderHeart, Heart, Layers, MessageSquare, Snowflake, Sparkle, Sparkles } from "lucide-react";
import { Badge } from "@/components/Badge";
import { Kicker } from "@/components/Editorial";
import { EMBLEM_ICON, LevelMascot, TIER_ICON } from "@/components/LevelMascot";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { QuestList } from "@/components/Quests";
import { EMBLEMS, FRAMES, needsLabel, unlocked, type Cosmetic } from "@/lib/rewards/cosmetics";
import { StreakChip } from "@/components/StreakChip";
import { useIncognito } from "@/lib/store/incognito";
import { dayKey, meaningfulDays, streak as streakFor } from "@/lib/rewards/streak";
import { weekStart } from "@/lib/rewards/quests";
import { MascotSays } from "@/components/Mascot";
import { ProfileSkeleton } from "@/components/States";
import { DAILY_XP_CAP, QUIZ_MIN_ANSWERS, TIERS, XP, useProgression, type XpEntry } from "@/lib/rewards";
import { updateSettings, useSettings } from "@/lib/settings";
import { updateProfile, useUser } from "@/lib/store/user";
import type { EventRecord, ProfileRecord } from "@/lib/store/db";
import { useHead } from "@/lib/seo";
import { titlePath } from "@/lib/titles";

const ICONS: Record<string, typeof Award> = { chapters: BookOpen, series: Layers, complete: Sparkles, genres: Compass, days: CalendarDays, favourites: Heart, collections: FolderHeart, quests: Flag, comments: MessageSquare, taste: Sparkle };

export function RewardsOff() {
  return (
    <div className="state state-center">
      <MascotSays size={96}>Rewards are switched off for this profile. Your reading still counts; nothing was deleted.</MascotSays>
      <button className="btn btn-primary" onClick={() => updateSettings({ rewards: true })}>
        Turn rewards on
      </button>
    </div>
  );
}

const REASON: Record<XpEntry["reason"], string> = { chapter: "Chapter finished", series: "New series", complete: "Series complete", genre: "New genre", quest: "Weekly quest", quiz: "Taste quiz" };
interface Moment {
  at: number;
  xp: number;
  titleKey?: string;
  parts: string[];
}
/** One row per moment (a finished chapter can also stamp genres and start a series). */
export function groupRecent(entries: XpEntry[], n: number): Moment[] {
  const out: Moment[] = [];
  for (let i = entries.length - 1; i >= 0 && out.length <= n; i--) {
    const x = entries[i]!;
    const last = out.at(-1);
    const part = x.reason === "genre" ? `${x.ref}` : REASON[x.reason];
    if (last && last.at === x.at && last.titleKey === x.titleKey) {
      last.xp += x.xp;
      last.parts.unshift(part);
    } else out.push({ at: x.at, xp: x.xp, titleKey: x.titleKey, parts: [part] });
  }
  return out.slice(0, n).map((m) => {
    const genres = m.parts.filter((p) => !Object.values(REASON).includes(p));
    const rest = m.parts.filter((p) => Object.values(REASON).includes(p));
    return { ...m, parts: genres.length ? [...rest, `${genres.length === 1 ? "new genre" : "new genres"}: ${genres.join(", ")}`] : rest };
  });
}

const when = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Streak with a weekly freeze (D68). Derived from finished chapters and reading time; nothing to buy. */
function StreakCard({ events }: { events: EventRecord[] }) {
  const incognito = useIncognito();
  const s = streakFor(events);
  const read = meaningfulDays(events);
  const frozen = new Set(s.frozen.map(dayKey));
  const today = dayKey(Date.now());
  const start = weekStart(Date.now());
  const week = DOW.map((name, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const k = dayKey(d.getTime());
    return { name, k, read: read.has(k), frozen: frozen.has(k), future: k > today };
  });
  if (incognito) return null;
  return (
    <section className="profile-block streak-block" aria-labelledby="streak-h">
      <div className="profile-block-head">
        <h2 id="streak-h">Streak</h2>
        <p className="muted">Days in a row with a finished chapter. Each week brings one freeze that covers a single missed day by itself.</p>
      </div>
      <div className="streak-row">
        {s.days > 0 ? <StreakChip streak={s} /> : <span className="muted">Read a chapter to start a streak.</span>}
        <span className="muted">{s.freezeAvailable ? "This week's freeze is ready." : "This week's freeze is used. A new one comes on Monday."}</span>
      </div>
      <ol className="rhythm-week" aria-label="This week">
        {week.map((d) => (
          <li key={d.k} data-read={d.read || undefined} data-future={d.future || undefined} data-frozen={d.frozen || undefined}>
            <span className="rhythm-dot" aria-hidden="true">
              {d.frozen && <Snowflake size={10} aria-hidden />}
            </span>
            <span>{d.name}</span>
            <span className="sr-only">{d.read ? "read" : d.frozen ? "covered by the freeze" : d.future ? "still ahead" : "no reading"}</span>
          </li>
        ))}
      </ol>
      {s.longest > 0 && <p className="muted">Longest streak: {s.longest} {s.longest === 1 ? "day" : "days"}.</p>}
    </section>
  );
}

function Cosmetics({ quests, level, equipped, profile }: { quests: number; level: number; equipped: { frame?: string; emblem?: string }; profile: ProfileRecord }) {
  const equip = (c: Cosmetic) => void updateProfile({ cosmetics: { ...equipped, [c.kind]: c.id } });
  const row = (c: Cosmetic) => {
    const open = unlocked(c, quests, level);
    const on = (equipped[c.kind] ?? (c.kind === "frame" ? "none" : "tier")) === c.id;
    const Icon = c.kind === "emblem" ? (EMBLEM_ICON[c.id] ?? TIER_ICON.pup) : null;
    return (
      <li key={c.id}>
        <button className="cosmetic" aria-pressed={on} disabled={!open} onClick={() => equip(c)}>
          <span className="cosmetic-art" aria-hidden="true">
            {c.kind === "frame" ? <ProfileAvatar profile={profile} size={44} frame={c.id} /> : Icon && <span className="level-emblem cosmetic-emblem" data-tier={c.id === "tier" ? "tier" : c.id}><Icon size={18} aria-hidden /></span>}
          </span>
          <span className="cosmetic-name">{c.name}</span>
          <span className="cosmetic-need">{on ? "Equipped" : open ? "Tap to wear" : needsLabel(c)}</span>
        </button>
      </li>
    );
  };
  return (
    <section className="profile-block" aria-labelledby="cosmetics-h">
      <div className="profile-block-head">
        <h2 id="cosmetics-h">Cosmetics</h2>
        <p className="muted">Earned with quests and levels. Purely for looks.</p>
      </div>
      <h3 className="cosmetic-group">Avatar frames</h3>
      <ul className="cosmetic-grid">{FRAMES.map(row)}</ul>
      <h3 className="cosmetic-group">Mascot accessories</h3>
      <ul className="cosmetic-grid">{EMBLEMS.map(row)}</ul>
    </section>
  );
}

/** Achievements (bottom-nav "Awards"). Everything here is derived from reading already stored on this device. */
export default function Achievements() {
  const ready = useUser((s) => s.ready);
  const titles = useUser((s) => s.titles);
  const { rewards } = useSettings();
  const { level, sets, ledger, quests } = useProgression();
  const profile = useUser((s) => s.profile);
  const events = useUser((s) => s.events);
  useHead({ title: "Achievements", noindex: true });
  if (!ready) return <ProfileSkeleton />;
  if (!rewards)
    return (
      <div className="page page-narrow">
        <h1 className="page-title">Achievements</h1>
        <RewardsOff />
      </div>
    );
  const earned = sets.reduce((n, s) => n + s.tier, 0);
  const total = sets.reduce((n, s) => n + s.goals.length, 0);
  const recent = groupRecent(ledger.entries, 6);
  return (
    <div className="page page-narrow ach-page">
      <header className="ach-head">
        <Kicker>Just for fun</Kicker>
        <h1 className="page-title">Achievements</h1>
      </header>

      <section className="level-card" aria-labelledby="level-h">
        <LevelMascot level={level} size={104} emblem={profile?.cosmetics?.emblem} />
        <div className="level-body">
          <p className="level-tier">{level.tier.name}</p>
          <h2 id="level-h">Level {level.level}</h2>
          <p className="level-xp">
            <b>{level.into}</b> / {level.span} XP to level {level.level + 1}
          </p>
          <p className="muted level-next">{level.nextTier ? `${level.nextTier.name} at level ${level.nextTier.from} adds the ${level.nextTier.accessory.toLowerCase()}.` : "Every mascot accessory unlocked."}</p>
        </div>
      </section>

      <ol className="tier-ladder" aria-label="Level tiers">
        {TIERS.map((t) => {
          const Icon = TIER_ICON[t.id];
          const on = level.level >= t.from;
          return (
            <li key={t.id} data-on={on || undefined} aria-current={t.id === level.tier.id ? "step" : undefined}>
              <span className="tier-dot" aria-hidden="true">
                <Icon size={16} aria-hidden />
              </span>
              <span className="tier-name">{t.name}</span>
              <span className="tier-from">Lv {t.from}</span>
              <span className="sr-only">{on ? `Unlocked: ${t.accessory}` : `Locked until level ${t.from}`}</span>
            </li>
          );
        })}
      </ol>

      <section className="profile-block" id="quests" aria-labelledby="quests-h">
        <div className="profile-block-head">
          <h2 id="quests-h">This week's quests</h2>
          <p className="muted">New quests every Monday. Unfinished ones simply go away; nothing is lost.</p>
        </div>
        <QuestList quests={quests.current} />
        <p className="muted quest-total">
          {quests.done.length} {quests.done.length === 1 ? "quest" : "quests"} completed in total
        </p>
      </section>

      <StreakCard events={events} />

      <section aria-labelledby="sets-h">
        <div className="profile-block-head">
          <h2 id="sets-h">Badges</h2>
          <p className="muted">
            {earned} of {total} tiers
          </p>
        </div>
        <ul className="badge-grid">
          {sets.map((s) => (
            <li key={s.id}>
              <Badge icon={ICONS[s.id] ?? Award} name={s.name} tier={s.tier} tiers={s.goals.length} progress={s.progress} count={s.goals[s.tier] !== undefined ? `${Math.min(s.value, s.goals[s.tier]!)} of ${s.goals[s.tier]}` : undefined} hint={s.hint} detail={`${s.rule}: ${s.value}`} />
            </li>
          ))}
        </ul>
      </section>

      {profile && <Cosmetics quests={quests.done.length} level={level.level} equipped={profile.cosmetics ?? {}} profile={profile} />}

      {recent.length > 0 && (
        <section className="profile-block" aria-labelledby="xp-recent-h">
          <h2 id="xp-recent-h">Recent XP</h2>
          <ul className="xp-list">
            {recent.map((x, i) => {
              const t = x.titleKey ? titles.get(x.titleKey) : undefined;
              return (
                <li key={`${x.at}-${i}`}>
                  <span className="xp-amt">+{x.xp}</span>
                  <span className="xp-why">
                    {x.parts.join(", ")}
                    {t && (
                      <>
                        {" · "}
                        <Link to={titlePath(t)}>{t.title}</Link>
                      </>
                    )}
                  </span>
                  <span className="muted xp-when">{when(x.at)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="profile-block" aria-labelledby="xp-how-h">
        <h2 id="xp-how-h">How XP works</h2>
        <ul className="xp-rules">
          <li>
            <b>+{XP.chapter}</b> for each chapter you read to the last page, once per chapter
          </li>
          <li>
            <b>+{XP.series}</b> the first time you finish a chapter of a new series
          </li>
          <li>
            <b>+{XP.genre}</b> for the first chapter in a genre (a passport stamp)
          </li>
          <li>
            <b>+{XP.complete}</b> for reading a series to its final chapter
          </li>
          <li>
            <b>+{XP.quest}</b> for each weekly quest
          </li>
          <li>
            <b>+{XP.quiz}</b> once, the first time you finish the taste quiz ({QUIZ_MIN_ANSWERS} or more cards)
          </li>
          <li>
            Up to <b>{DAILY_XP_CAP}</b> XP a day in total. XP past the cap that day is lost, quiz XP included; badges still count
          </li>
        </ul>
        <p className="muted">Re-reading, opening chapters and marking chapters read by hand do not add XP. XP never expires and is never taken away.</p>
      </section>

      <p className="muted ach-foot">
        Turn rewards off any time in <Link to="/profile#rewards">Profile &gt; Rewards</Link>.
      </p>
    </div>
  );
}
