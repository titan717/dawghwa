import { Link } from "react-router-dom";
import { Snowflake } from "lucide-react";
import { streakLabel, useStreak, type Streak } from "@/lib/rewards";
import "./StreakChip.css";

/**
 * Neutral "N-day streak" chip. No flame, no countdown, no guilt copy. A small
 * snowflake marks a week where the freeze covered a missed day; the state is
 * also in the text for screen readers, so it never relies on colour or the icon.
 * Renders nothing with Rewards off, in Incognito, or without a current streak.
 * Pass `to` to make it a link (44px target); otherwise it is static text.
 */
export function StreakChip({ streak, to, incognito, className }: { streak?: Streak | null; to?: string; incognito?: boolean; className?: string }) {
  const live = useStreak({ incognito });
  const s = streak === undefined ? live : streak;
  if (!s || s.days < 1) return null;
  const label = streakLabel(s);
  const body = (
    <>
      <span className="streak-chip-text">{label}</span>
      {s.freezeUsedThisWeek && (
        <span className="streak-chip-freeze" title="Freeze used this week">
          <Snowflake size={14} aria-hidden />
          <span className="sr-only">, freeze used this week</span>
        </span>
      )}
    </>
  );
  const cls = `streak-chip${className ? ` ${className}` : ""}`;
  return to ? (
    <Link to={to} className={`${cls} streak-chip-link`} data-testid="streak-chip">
      {body}
    </Link>
  ) : (
    <span className={cls} data-testid="streak-chip">
      {body}
    </span>
  );
}
