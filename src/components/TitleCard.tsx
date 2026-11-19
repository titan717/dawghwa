import { memo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Star } from "lucide-react";
import { prefetchTitle } from "@/lib/query";
import { compactNumber, kindLabel, titlePath, type Title, isMature } from "@/lib/titles";
import { Cover } from "./Cover";
import { ProgressRing, useSeriesFraction } from "./ProgressRing";
import { useUser } from "@/lib/store/user";
import { TitleActionsSheet } from "./TitleActions";

export interface CardProps {
  title: Title;
  reason?: string;
  rank?: number;
  context?: string;
  eager?: boolean;
  progress?: { label: string; fraction: number };
  variant?: "card" | "ranked";
  /** Search query: matched words in the title are wrapped in <mark>. */
  highlight?: string;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Wrap every occurrence of the query's words (2+ chars) in <mark>. Case-insensitive; never alters the text. */
export function Highlight({ text, query }: { text: string; query?: string }) {
  const words = (query ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .sort((a, b) => b.length - a.length);
  if (!words.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${words.map(escapeRe).join("|")})`, "gi"));
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))}
    </>
  );
}

function useLongPress(onLong: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fired = useRef(false);
  const start = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    fired.current = false;
    timer.current = setTimeout(() => {
      fired.current = true;
      onLong();
    }, 520);
  };
  const cancel = () => clearTimeout(timer.current);
  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      onLong();
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (fired.current) {
        e.preventDefault();
        e.stopPropagation();
        fired.current = false;
      }
    },
  };
}

/** "Up" badge window: the provider says the series changed in the last 3 days. Only shown when the timestamp is known. */
const FRESH_MS = 3 * 24 * 3600 * 1000;
function isFresh(updatedAt?: number): boolean {
  if (!updatedAt) return false;
  const ms = updatedAt < 1e12 ? updatedAt * 1000 : updatedAt; // providers send seconds or milliseconds
  const age = Date.now() - ms;
  return age >= 0 && age < FRESH_MS;
}

/**
 * Reading state for a cover, independent of Rewards: how far through the series
 * (highest chapter finished over the latest known chapter) and how many newer
 * chapters exist. Both need both numbers; nothing is guessed.
 */
function useReadingState(titleKey: string, latest?: number): { reading?: number; unread: number } {
  const max = useUser((s) => s.progress.get(titleKey)?.maxReadNumber ?? 0);
  if (!latest || latest <= 0 || max <= 0) return { unread: 0 };
  return { reading: Math.min(1, max / latest), unread: Math.max(0, Math.floor(latest) - Math.floor(max)) };
}

export const TitleCard = memo(function TitleCard({ title: t, reason, rank, context, eager, progress, variant = "card", highlight }: CardProps) {
  const [menu, setMenu] = useState(false);
  const press = useLongPress(() => setMenu(true));
  const meta = [kindLabel(t.meta?.kind), t.latestChapter ? `Ch. ${t.latestChapter}` : undefined].filter(Boolean);
  const href = titlePath(t);
  const series = useSeriesFraction(t.key, t.latestChapter);
  const { reading, unread } = useReadingState(t.key, t.latestChapter);
  const fresh = isFresh(t.updatedAt);
  if (variant === "ranked")
    return (
      <div className="card">
        <Link to={href} className="ranked-item" onMouseEnter={() => prefetchTitle(t)} onFocus={() => prefetchTitle(t)} {...press}>
          <span className="ranked-num tabular" aria-hidden="true">
            {rank}
          </span>
          <Cover mature={isMature(t)} src={t.cover} large={t.coverLarge} title={t.title} eager={eager} sizes="74px" />
          <span style={{ minWidth: 0 }}>
            <span className="card-title"><Highlight text={t.title} query={highlight} /></span>
            <span className="card-meta" style={{ marginTop: 4 }}>
              {meta.map((m) => (
                <span key={m}>{m}</span>
              ))}
              {t.rating ? (
                <span>
                  <Star size={11} style={{ verticalAlign: -1 }} aria-label="Rating" /> {t.rating.toFixed(1)}
                </span>
              ) : null}
            </span>
          </span>
        </Link>
        <TitleActionsSheet title={t} open={menu} onClose={() => setMenu(false)} context={context} />
      </div>
    );
  return (
    <div className="card">
      <button className="card-menu" aria-label={`Options for ${t.title}`} aria-haspopup="dialog" aria-expanded={menu} onClick={() => setMenu(true)}>
        <MoreHorizontal size={18} />
      </button>
      <Link to={href} className="card-link" onMouseEnter={() => prefetchTitle(t)} onFocus={() => prefetchTitle(t)} {...press}>
        <span className="card-cover">
          <Cover mature={isMature(t)} src={t.cover} large={t.coverLarge} title={t.title} eager={eager} />
          {fresh ? (
            <span className="card-badge sticker sticker-accent">
              Up<span className="sr-only">, updated in the last 3 days</span>
            </span>
          ) : t.meta?.status === "completed" ? (
            <span className="card-badge sticker sticker-lavender">Done</span>
          ) : null}
          {unread > 0 && (
            <span className="card-unread tabular">
              {unread > 99 ? "99+" : unread} new<span className="sr-only"> {unread === 1 ? "chapter" : "chapters"} since you last read</span>
            </span>
          )}
          {series !== undefined && (
            <span className="card-ring">
              <ProgressRing value={series} size={30} stroke={3} label={`${Math.round(series * 100)}% of the series read`} />
            </span>
          )}
          {reading !== undefined && !progress && (
            <span className="card-progress" aria-hidden="true">
              <i style={{ transform: `scaleX(${reading})` }} />
            </span>
          )}
        </span>
        {progress && (
          <div className="progress-bar" aria-label={progress.label}>
            <i style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
          </div>
        )}
        <span className="card-title"><Highlight text={t.title} query={highlight} /></span>
      </Link>
      {reason ? (
        <span className="card-reason">{reason}</span>
      ) : (
        <span className="card-meta">
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
          {t.follows && !meta.length ? <span>{compactNumber(t.follows)} followers</span> : null}
        </span>
      )}
      <TitleActionsSheet title={t} open={menu} onClose={() => setMenu(false)} context={context} />
    </div>
  );
});
