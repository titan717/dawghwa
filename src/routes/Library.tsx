import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { History, LayoutGrid, List, Search as SearchIcon, X } from "lucide-react";
import { TitleGrid } from "@/components/Grid";
import { Cover } from "@/components/Cover";
import { EmptyState, ListSkeleton } from "@/components/States";
import { Sticker } from "@/components/Editorial";
import { useHead } from "@/lib/seo";
import { allCollections, useUser } from "@/lib/store/user";
import type { LibraryRecord, LibraryStatus, ProgressRecord } from "@/lib/store/db";
import { kindLabel, readerPath, titlePath, type Title, isMature } from "@/lib/titles";
import { STATUS_LABELS } from "./TitlePage";

type Tab = LibraryStatus | "recent" | "all" | "favorites" | `c:${string}`;
type Scope = "all" | "unread";
type View = "grid" | "list";
const SORTS = { updated: "Recently changed", added: "Date added", title: "Title A-Z", progress: "Most read" } as const;
const VIEW_KEY = "dawghwa:library-view";
const STATUS_TONE: Partial<Record<LibraryStatus, "accent" | "lime" | "lavender" | "ink">> = { reading: "accent", completed: "lavender", plan: "ink" };

const readCount = (p?: ProgressRecord) => (p ? Object.keys(p.read).length : 0);

/** Progress through a series, only when both sides are known (no guessed totals). */
function seriesProgress(t: Title, p?: ProgressRecord): { label: string; fraction?: number } | undefined {
  if (!p) return undefined;
  const n = readCount(p);
  const last = t.latestChapter;
  const label = `Ch. ${p.chapterNumber}${n ? ` · ${n} read` : ""}`;
  return { label, fraction: last && p.maxReadNumber ? Math.min(1, p.maxReadNumber / last) : undefined };
}

function LibraryRow({ t, r, p }: { t: Title; r?: LibraryRecord; p?: ProgressRecord }) {
  const prog = seriesProgress(t, p);
  const resume = p?.pageCount ? readerPath(t, p.chapterId, p.page || undefined) : undefined;
  return (
    <li className="lib-row">
      <Link to={titlePath(t)} className="lib-row-main">
        <Cover mature={isMature(t)} src={t.cover} title={t.title} sizes="56px" className="cover-sm" />
        <span className="lib-row-body">
          <span className="lib-row-title">{t.title}</span>
          <span className="lib-row-meta">
            {r?.status && <Sticker tone={STATUS_TONE[r.status] ?? "lime"}>{STATUS_LABELS[r.status]}</Sticker>}
            {r?.favorite && <span className="lib-fav">Favourite</span>}
            <span>{[kindLabel(t.meta?.kind), prog?.label].filter(Boolean).join(" · ")}</span>
          </span>
          {prog?.fraction !== undefined && (
            <span className="progress-bar" aria-label={`Reached chapter ${p!.maxReadNumber} of ${t.latestChapter}`}>
              <i style={{ width: `${Math.round(prog.fraction * 100)}%` }} />
            </span>
          )}
        </span>
      </Link>
      {resume && (
        <Link className="btn btn-sm" to={resume} aria-label={`Continue ${t.title}, chapter ${p!.chapterNumber}`}>
          Continue
        </Link>
      )}
    </li>
  );
}

/** Local-first library: everything here lives in this profile on this device (IndexedDB via the user store). */
export default function Library() {
  const [params, setParams] = useSearchParams();
  const library = useUser((s) => s.library);
  const ready = useUser((s) => s.ready);
  const titles = useUser((s) => s.titles);
  const progress = useUser((s) => s.progress);
  const state = useUser((s) => s);
  const tab = (params.get("tab") as Tab) || "all";
  const [sort, setSort] = useState<keyof typeof SORTS>("updated");
  const [find, setFind] = useState("");
  const [view, setViewState] = useState<View>(() => (localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"));
  const setView = (v: View) => (setViewState(v), localStorage.setItem(VIEW_KEY, v));
  useHead({ title: "Library", noindex: true });
  const collections = useMemo(() => allCollections(state), [state]);
  const recs = useMemo(() => [...library.values()].filter((r) => r.status || r.favorite || r.collections.length), [library]);
  const scope: Scope = params.get("only") === "unread" ? "unread" : "all";
  const unread = (t: Title, p?: ProgressRecord) => Boolean(p && t.latestChapter && t.latestChapter > (p.maxReadNumber || 0));
  const match = (r: LibraryRecord) => (tab === "all" ? Boolean(r.status || r.favorite || r.collections.length) : tab === "favorites" ? r.favorite : tab.startsWith("c:") ? r.collections.includes(tab.slice(2)) : r.status === tab);
  // Recent: every series opened in the reader on this profile, saved or not, newest first.
  const recent = useMemo(
    () =>
      [...progress.values()]
        .filter((p) => !p.hidden)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((p) => ({ r: library.get(p.titleKey), t: titles.get(p.titleKey), p }))
        .filter((x): x is { r: LibraryRecord | undefined; t: Title; p: ProgressRecord } => Boolean(x.t)),
    [progress, library, titles],
  );
  const rows = useMemo(() => {
    const f = find.trim().toLowerCase();
    const base: { r?: LibraryRecord; t: Title; p?: ProgressRecord }[] =
      tab === "recent"
        ? recent
        : recs
            .filter(match)
            .map((r) => ({ r, t: titles.get(r.titleKey), p: progress.get(r.titleKey) }))
            .filter((x): x is { r: LibraryRecord; t: Title; p: ProgressRecord | undefined } => Boolean(x.t));
    const xs = base
      .filter((x) => scope === "all" || unread(x.t, x.p))
      .filter((x) => !f || x.t.title.toLowerCase().includes(f) || x.t.meta?.altTitles?.some((a) => a.toLowerCase().includes(f)));
    if (tab !== "recent") xs.sort((a, b) => (sort === "title" ? a.t.title.localeCompare(b.t.title) : sort === "added" ? (b.r?.addedAt ?? 0) - (a.r?.addedAt ?? 0) : sort === "progress" ? readCount(b.p) - readCount(a.p) : (b.r?.updatedAt ?? 0) - (a.r?.updatedAt ?? 0)));
    return xs;
  }, [recs, recent, tab, sort, titles, progress, find, scope]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = (f: (r: LibraryRecord) => boolean) => recs.filter(f).length;
  const tabs: [Tab, string, number][] = [
    ["recent", "Recent", recent.length],
    ["all", "Saved", recs.length],
    ...(Object.keys(STATUS_LABELS) as LibraryStatus[]).map((s): [Tab, string, number] => [s, STATUS_LABELS[s], count((r) => r.status === s)]),
    ["favorites", "Favourites", count((r) => r.favorite)],
    ...collections.map((c): [Tab, string, number] => [`c:${c}`, c, count((r) => r.collections.includes(c))]),
  ];
  const tabLabel = tabs.find((t) => t[0] === tab)?.[1] ?? "this list";

  return (
    <div className="page library-page">
      <header className="lib-head">
        <div>
          <h1>Library</h1>
          <p className="muted">Saved on this device for {state.profile?.name ?? "this profile"}.</p>
        </div>
        <div className="lib-head-actions">
          <Link className="btn btn-sm" to="/history">
            <History size={16} aria-hidden="true" /> History
          </Link>
          <div className="segmented lib-view" role="radiogroup" aria-label="View">
            <button role="radio" aria-checked={view === "grid"} aria-label="Grid" onClick={() => setView("grid")}>
              <LayoutGrid size={16} />
            </button>
            <button role="radio" aria-checked={view === "list"} aria-label="List" onClick={() => setView("list")}>
              <List size={16} />
            </button>
          </div>
        </div>
      </header>
      <div className="tabs lib-tabs" role="tablist" aria-label="Library lists">
        {tabs.map(([id, label, n]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setParams(id === "all" ? {} : { tab: id }, { replace: true })}>
            {label}
            {n > 0 && <span className="count">{n}</span>}
          </button>
        ))}
      </div>
      <div className="lib-scope" role="radiogroup" aria-label="Show">
        {(
          [
            ["all", "All series"],
            ["unread", "With unread chapters"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="radio"
            aria-checked={scope === id}
            onClick={() => {
              const next = new URLSearchParams(params);
              if (id === "all") next.delete("only");
              else next.set("only", id);
              setParams(next, { replace: true });
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {tab !== "recent" && recs.length > 4 && (
        <div className="lib-tools">
          <label className="lib-find">
            <SearchIcon size={16} aria-hidden="true" />
            <input type="search" placeholder="Find in library" aria-label="Find in library" value={find} onChange={(e) => setFind(e.target.value)} />
            {find && (
              <button className="icon-btn" aria-label="Clear" onClick={() => setFind("")}>
                <X size={16} />
              </button>
            )}
          </label>
          <select className="select select-sm" aria-label="Sort library" value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}>
            {Object.entries(SORTS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </div>
      )}
      {!ready ? (
        <ListSkeleton />
      ) : rows.length ? (
        view === "grid" ? (
          <TitleGrid items={rows.map((x) => x.t)} context="library" />
        ) : (
          <ul className="lib-list">
            {rows.map((x) => (
              <LibraryRow key={x.t.key} t={x.t} r={x.r} p={x.p} />
            ))}
          </ul>
        )
      ) : find ? (
        <EmptyState center title={`No saved title matches "${find}"`} action={<button className="btn" onClick={() => setFind("")}>Clear search</button>} />
      ) : scope === "unread" ? (
        <EmptyState center title="You're all caught up" pose="done">
          No series in {tabLabel} has chapters newer than the last one you finished.
        </EmptyState>
      ) : (
        <EmptyState
          center
          title={tab === "all" ? "Your library is empty" : tab === "recent" ? "No recently read series" : `Nothing in ${tabLabel} yet`}
          pose="empty"
          action={
            tab === "all" || tab === "recent" ? (
              <Link className="btn btn-primary" to="/discover">
                Find something to read
              </Link>
            ) : undefined
          }
        >
          {tab === "all" ? "Save a series from its page, or long-press any cover." : tab === "recent" ? "Series you open in the reader appear here." : "Titles you give this status will show up here."}
        </EmptyState>
      )}
    </div>
  );
}
