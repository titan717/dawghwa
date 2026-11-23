import { memo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Star, X } from "lucide-react";
import { prefetchTitle } from "@/lib/query";
import { kindLabel, titlePath, type Title, isMature } from "@/lib/titles";
import { Cover } from "./Cover";
import { TitleActionsSheet } from "./TitleActions";
import { hideTitle, unhideTitle, useUser } from "@/lib/store/user";
import { toast } from "./Toast";
import "@/styles/search-library.css";

export interface CardProps {
  title: Title;
  reason?: string;
  rank?: number;
  context?: string;
  eager?: boolean;
  progress?: { label: string; fraction: number };
  variant?: "card" | "ranked";
  /** Blueprint green sublabel under the cover (reason, rank or genre). */
  sub?: string;
  /** Blueprint green corner badge, only when real data backs it (e.g. unread chapters). */
  badge?: string;
  /** Search query: matched words in the title are wrapped in <mark>. */
  highlight?: string;
  /**
   * Personal-pick rows only: a visible "Not for me" button (LENS B7). Uses the existing
   * not_interested hide (no new signal); the row drops the card because rows filter hidden titles.
   */
  notForMe?: boolean;
}

/** "Not for me": the same action as Not interested in the long-press sheet, with an 8s Undo. */
export async function dismissTitle(t: Title) {
  await hideTitle(t, "not_interested");
  toast("Got it. You'll see fewer like this.", { label: "Undo", run: () => void unhideTitle(t.key) }, 8000);
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

export const TitleCard = memo(function TitleCard({ title: t, reason, rank, context, eager, progress, variant = "card", sub, badge, highlight, notForMe }: CardProps) {
  const [menu, setMenu] = useState(false);
  // 2 = every known chapter read, 1 = started and newer chapters exist (real local progress only)
  const readState = useUser((s) => {
    const p = s.progress.get(t.key);
    if (!p || !t.latestChapter || !p.maxReadNumber) return 0;
    return p.maxReadNumber >= t.latestChapter ? 2 : 1;
  });
  const cornerBadge = badge ?? (readState === 1 ? "New Chapter" : undefined);
  const line = readState === 2 ? "✓ All read" : (sub ?? reason);
  const press = useLongPress(() => setMenu(true));
  const meta = [kindLabel(t.meta?.kind), t.latestChapter ? `Ch. ${t.latestChapter}` : undefined].filter(Boolean);
  const href = titlePath(t);
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
    <div className="card" data-dismissible={notForMe || undefined}>
      <button className="card-menu" aria-label={`Options for ${t.title}`} aria-haspopup="dialog" aria-expanded={menu} onClick={() => setMenu(true)}>
        <MoreHorizontal size={18} />
      </button>
      <Link to={href} className="card-link" onMouseEnter={() => prefetchTitle(t)} onFocus={() => prefetchTitle(t)} {...press}>
        {cornerBadge && <span className="card-badge new-badge">{cornerBadge}</span>}
        <Cover mature={isMature(t)} src={t.cover} large={t.coverLarge} title={t.title} eager={eager} />
        {progress && (
          <div className="progress-bar" aria-label={progress.label}>
            <i style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
          </div>
        )}
        <span className="card-title"><Highlight text={t.title} query={highlight} /></span>
      </Link>
      {notForMe && (
        <button className="card-dismiss" aria-label={`Not for me: ${t.title}`} onClick={() => void dismissTitle(t)}>
          <X size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
      )}
      {line && (
        <span className="card-reason" data-done={readState === 2 || undefined}>
          {line}
        </span>
      )}
      <TitleActionsSheet title={t} open={menu} onClose={() => setMenu(false)} context={context} />
    </div>
  );
});
