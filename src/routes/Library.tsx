import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, History, LayoutGrid, List, RotateCw, Search as SearchIcon, X } from "lucide-react";
import { TitleGrid } from "@/components/Grid";
import { Cover } from "@/components/Cover";
import { EmptyState, ListSkeleton } from "@/components/States";
import { useHead } from "@/lib/seo";
import { allCollections, useUser } from "@/lib/store/user";
import type { LibraryRecord, LibraryStatus, ProgressRecord } from "@/lib/store/db";
import { kindLabel, readerPath, titlePath, type Title, isMature } from "@/lib/titles";
import { STATUS_LABELS } from "./TitlePage";

type Tab = LibraryStatus | "recent" | "all" | "favorites" | `c:${string}`;
type Scope = "all" | "unread";
type View = "grid" | "list";
const SORTS = { updated: "Recently Updated", added: "Date Added", title: "Title A-Z", progress: "Most Read" } as const;
const VIEW_KEY = "dawghwa:library-view";

const readCount = (p?: ProgressRecord) => (p ? Object.keys(p.read).length : 0);

/** Progress through a series, only when both sides are known (no guessed totals). */
function seriesProgress(t: Title, p?: ProgressRecord): { label: string; fraction?: number } | undefined {
  if (!p) return undefined;
  const n = readCount(p);
  const last = t.latestChapter;
  const label = `Ch. ${p.chapterNumber}${n ? ` · ${n} read` : ""}`;
  return { label, fraction: last && p.maxReadNumber ? Math.min(1, p.maxReadNumber / last) : undefined };
}

/** "today", "yesterday", "3 days ago", or a short date. */
function lastRead(ts: number) {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Blueprint "My Series" row: cover flush left, title, chapter, last read, and a two-line action. */
function LibraryRow({ t, r, p }: { t: Title; r?: LibraryRecord; p?: ProgressRecord }) {
  const prog = seriesProgress(t, p);
  const resume = p?.pageCount ? readerPath(t, p.chapterId, p.page || undefined) : undefined;
  const fresh = Boolean(p?.maxReadNumber && t.latestChapter && t.latestChapter > p.maxReadNumber);
  const meta = p ? (prog?.label ?? `Ch. ${p.chapterNumber}`) : [r?.status ? STATUS_LABELS[r.status] : undefined, kindLabel(t.meta?.kind), t.latestChapter ? `${t.latestChapter} chapters` : undefined].filter(Boolean).join(" · ");
  return (
    <li className="lib-row">
      <Link to={titlePath(t)} className="lib-row-main">
        <span className="lib-row-cover">
          {fresh && <span className="new-badge">New Chapter</span>}
          <Cover mature={isMature(t)} src={t.cover} title={t.title} sizes="96px" className="cover-sm" />
        </span>
        <span className="lib-row-body">
          <span className="lib-row-title">{t.title}</span>
          <span className="lib-row-ch">
            {meta}
            {r?.favorite && <span className="lib-fav"> · Favourite</span>}
          </span>
          {p && <span className="lib-row-when">Last read {lastRead(p.updatedAt)}</span>}
        </span>
      </Link>
      {resume ? (
        <Link className="lib-go" to={resume} aria-label={`Continue reading ${t.title}, chapter ${p!.chapterNumber}`}>
          Continue
          <small>Reading</small>
        </Link>
      ) : (
        <Link className="lib-go" to={titlePath(t)} aria-label={`Open ${t.title}`}>
          View
          <small>Series</small>
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
  // blueprint "My Series" is a list; the cover grid stays one tap away
  const [view, setViewState] = useState<View>(() => (localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "list"));
  const [finding, setFinding] = useState(false);
  const setView = (v: View) => (setViewState(v), localStorage.setItem(VIEW_KEY, v));
  useHead({ title: "My Series", noindex: true });
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
  // totals for the blueprint's "N SERIES TOTAL | N UNREAD SERIES" switch, for the current list
  const totals = useMemo(() => {
    const list = tab === "recent" ? recent : recs.filter(match).map((r) => ({ t: titles.get(r.titleKey), p: progress.get(r.titleKey) }));
    const known = list.filter((x): x is { t: Title; p: ProgressRecord | undefined } => Boolean(x.t));
    return { all: known.length, unread: known.filter((x) => unread(x.t, x.p)).length };
  }, [tab, recent, recs, titles, progress]); // eslint-disable-line react-hooks/exhaustive-deps
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
        <h1>My Series</h1>
        <div className="lib-head-actions">
          <button className="icon-btn" aria-label="Find in my series" aria-expanded={finding} onClick={() => (setFinding((v) => !v), finding && setFind(""))}>
            <SearchIcon size={22} />
          </button>
          <Link className="icon-btn" to="/history" aria-label="Reading history" title="Reading history">
            <History size={22} />
          </Link>
          <button className="icon-btn" aria-label={view === "list" ? "Show as cover grid" : "Show as list"} onClick={() => setView(view === "list" ? "grid" : "list")}>
            {view === "list" ? <LayoutGrid size={21} /> : <List size={22} />}
          </button>
        </div>
      </header>
      <div className="tabs lib-tabs" role="tablist" aria-label="My series lists">
        {tabs.map(([id, label, n]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setParams(id === "all" ? {} : { tab: id }, { replace: true })} aria-label={`${label}, ${n}`}>
            {label}
          </button>
        ))}
      </div>
      {finding && (
        <div className="lib-tools">
          <label className="lib-find">
            <SearchIcon size={16} aria-hidden="true" />
            <input type="search" autoFocus placeholder="Find in my series" aria-label="Find in my series" value={find} onChange={(e) => setFind(e.target.value)} />
            {find && (
              <button className="icon-btn" aria-label="Clear" onClick={() => setFind("")}>
                <X size={16} />
              </button>
            )}
          </label>
        </div>
      )}
      <div className="lib-scope" role="radiogroup" aria-label="Show">
        <RotateCw size={16} className="lib-scope-ico" aria-hidden="true" />
        {(
          [
            ["all", `${totals.all} series total`],
            ["unread", `${totals.unread} unread series`],
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
      {tab !== "recent" && rows.length > 0 && (
        <div className="lib-sortbar">
          <span>{rows.length === 1 ? "1 series" : `${rows.length} series`}</span>
          <label className="lib-sort">
            <span className="sr-only">Sort</span>
            <select aria-label="Sort my series" value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}>
              {Object.entries(SORTS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </label>
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
