import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, X } from "lucide-react";
import { Cover } from "@/components/Cover";
import { Kicker } from "@/components/Editorial";
import { EmptyState, ListSkeleton } from "@/components/States";
import { Sheet } from "@/components/Layer";
import { toast } from "@/components/Toast";
import { useHead } from "@/lib/seo";
import { clearHistory, removeFromHistory, useUser } from "@/lib/store/user";
import { readerPath, titlePath, isMature } from "@/lib/titles";

const dayLabel = (ts: number) => {
  const d = new Date(ts);
  const today = new Date();
  const y = new Date(Date.now() - 86400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
};

export default function HistoryPage() {
  const progress = useUser((s) => s.progress);
  const titles = useUser((s) => s.titles);
  const ready = useUser((s) => s.ready);
  const [confirm, setConfirm] = useState(false);
  useHead({ title: "History", noindex: true });
  const groups = useMemo(() => {
    const xs = [...progress.values()].filter((p) => !p.hidden).sort((a, b) => b.updatedAt - a.updatedAt);
    const out: [string, typeof xs][] = [];
    for (const p of xs) {
      const l = dayLabel(p.updatedAt);
      if (out.at(-1)?.[0] === l) out.at(-1)![1].push(p);
      else out.push([l, [p]]);
    }
    return out;
  }, [progress]);
  return (
    <div className="page page-narrow">
      <header className="page-head">
        <div>
          <Kicker>Your trail</Kicker>
          <h1>History</h1>
          <p className="muted">Where you left off in each series.</p>
        </div>
        {ready && groups.length > 0 && (
          <button className="btn btn-ghost" onClick={() => setConfirm(true)}>
            <Trash2 size={16} /> Clear
          </button>
        )}
      </header>
      {!ready && <ListSkeleton />}
      {ready && !groups.length && (
        <EmptyState title="No reading history yet" pose="reading" action={<Link className="btn btn-primary" to="/">Browse home</Link>}>
          Chapters you read appear here so you can pick up where you stopped.
        </EmptyState>
      )}
      {ready && groups.map(([label, xs]) => (
        <section key={label} className="section" style={{ marginTop: 20 }}>
          <h2 className="eyebrow">{label}</h2>
          <div className="list">
            {xs.map((p) => {
              const t = titles.get(p.titleKey);
              if (!t) return null;
              const done = Object.keys(p.read).length;
              return (
                <div key={p.titleKey} className="list-item">
                  <Link to={titlePath(t)} aria-label={t.title}>
                    <Cover mature={isMature(t)} src={t.cover} title={t.title} sizes="56px" className="cover-sm" />
                  </Link>
                  <Link to={p.pageCount ? readerPath(t, p.chapterId, p.page || undefined) : titlePath(t)} style={{ minWidth: 0, flex: 1 }}>
                    <span className="title">{t.title}</span>
                    <span className="card-meta">
                      Chapter {p.chapterNumber}
                      {p.pageCount ? ` · page ${p.page + 1} of ${p.pageCount}` : ""}
                      {done ? ` · ${done} read` : ""}
                    </span>
                    <span className="progress-bar" style={{ display: "block", marginTop: 6 }}>
                      <i style={{ width: `${Math.round(p.fraction * 100)}%` }} />
                    </span>
                  </Link>
                  <button className="icon-btn" aria-label={`Remove ${t.title} from history`} onClick={() => void removeFromHistory(p.titleKey).then(() => toast("Removed from history"))}>
                    <X size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Clear reading history?">
        <p className="muted">This removes positions and read marks for every series in this profile. Your library and taste profile stay.</p>
        <div className="cluster" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => void clearHistory().then(() => (setConfirm(false), toast("History cleared")))}>
            Clear history
          </button>
          <button className="btn" onClick={() => setConfirm(false)}>
            Cancel
          </button>
        </div>
      </Sheet>
    </div>
  );
}
