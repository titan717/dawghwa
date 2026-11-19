import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowDownUp, ArrowLeft, Ban, BookOpen, Check, ExternalLink, Heart, Info, Layers, MoreHorizontal, Plus, RotateCw, Search, Share2, Sparkles, Star, ThumbsDown, ThumbsUp, Users, X } from "lucide-react";
import { Cover } from "@/components/Cover";
import { ChapterNo, Sticker } from "@/components/Editorial";
import { TitleCard } from "@/components/TitleCard";
import { Sheet } from "@/components/Layer";
import { EmptyState, ErrorState } from "@/components/States";
import { TitleActionsSheet, similarPath } from "@/components/TitleActions";
import { toast } from "@/components/Toast";
import { useBrowse, useChapters, useSources, useTitle, type ChapterList as ChapterListData } from "@/lib/query";
import { chapterBadge, chapterLabel, editionLabel, findChapter, isChapterRead, languageLabel, pickVariant, variantIdOf } from "@/lib/chapters";
import { useHead } from "@/lib/seo";
import { markChaptersRead, rate, setStatus, signal, toggleFavorite, useUser } from "@/lib/store/user";
import type { LibraryStatus } from "@/lib/store/db";
import { useRankContext } from "@/lib/feed/context";
import { explain, positivesOf, scoreTitle } from "@/lib/intel/rank";
import { cosineSparse, vectorize } from "@/lib/intel/features";
import { compactNumber, kindLabel, markUnreadable, plainText, readerPath, statusLabel, type Title } from "@/lib/titles";
import { useWindowVirtual } from "@/lib/useWindowVirtual";
import { share, haptic } from "@/lib/platform";
import type { Chapter } from "@/lib/api/types";
import { coverSrc } from "@/lib/api/images";
import { relativeTime } from "@/lib/time";
import { reducedMotion } from "@/lib/settings";

export const STATUS_LABELS: Record<LibraryStatus, string> = { reading: "Reading", plan: "Plan to read", completed: "Completed", on_hold: "On hold", dropped: "Dropped" };
const ROW_H = 56;

function SourceStatusBar({ data, onRetry, retrying }: { data: ChapterListData; onRetry: () => void; retrying: boolean }) {
  const loading = data.sources.filter((x) => x.status === "loading" || x.status === "linked");
  const failed = data.sources.filter((x) => x.status === "error" || x.status === "timeout");
  if (!data.unified || (data.complete && !failed.length)) return null;
  return (
    <div className={`banner chapter-status ${failed.length ? "banner-warn" : ""}`} role="status" aria-live="polite">
      <span>
        {!data.complete
          ? `Adding chapters from ${loading.map((x) => x.source).join(", ") || "more sources"}…`
          : `${failed.map((x) => x.source).join(", ")} didn't respond, so ${failed.length === 1 ? "its" : "their"} chapters are missing from this list.`}
      </span>
      {data.complete && failed.length > 0 && (
        <button className="btn btn-sm" onClick={onRetry} disabled={retrying}>
          <RotateCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

function VersionSheet({ title, chapter, onClose }: { title: Title; chapter: Chapter | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(chapter)} onClose={onClose} title={chapter ? `${chapterLabel(chapter)} · versions` : "Versions"}>
      {chapter && (
        <ul className="version-list">
          {(chapter.variants ?? []).map((v) => (
            <li key={variantIdOf(v)}>
              <Link className="version" to={readerPath(title, chapter.id, undefined, v.sourceId, variantIdOf(v))} onClick={onClose}>
                <span className="version-main">
                  <strong>{v.source}</strong>
                  <span className="muted">{[v.group?.name, editionLabel(v.edition)].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="lang-chip" title="Translation language">{languageLabel(v.language ?? chapter.language)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="muted" style={{ fontSize: "var(--text-xs)" }}>
        Versions are the same chapter from different sources or translation groups. Wording and page splits can differ.
      </p>
    </Sheet>
  );
}

type Row = { kind: "vol"; key: string; label: string; count: number } | { kind: "ch"; c: Chapter };

/** Report states that mean "you can't read this here": shown with a dashed frame, an icon and words, not just dimmed. */
const UNAVAILABLE: Record<string, string> = { "no-match": "Not on this source", error: "Didn't respond", timeout: "Timed out", cancelled: "Not checked", review: "Needs review" };

function ProviderPicker({ data, value, onChange }: { data: ChapterListData; value: string; onChange: (v: string) => void }) {
  const latest = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of data.chapters) for (const v of c.variants ?? []) if (Number.isFinite(c.number)) m.set(v.sourceId, Math.max(m.get(v.sourceId) ?? -Infinity, c.number));
    return m;
  }, [data.chapters]);
  if (!data.unified || data.sources.length < 2) return null;
  const available = data.sources.filter((x) => latest.has(x.sourceId));
  const others = data.sources.filter((x) => !latest.has(x.sourceId));
  return (
    <div className="provider-picker">
      <div className="provider-list" role="radiogroup" aria-label="Read from source">
        <button type="button" role="radio" aria-checked={value === "all"} className="provider" data-state="all" onClick={() => onChange("all")}>
          <span className="provider-name">All sources</span>
          <span className="provider-sub">{available.length} available</span>
        </button>
        {available.map((x) => (
          <button key={x.sourceId} type="button" role="radio" aria-checked={value === x.sourceId} className="provider" data-state="available" onClick={() => onChange(x.sourceId)}>
            <span className="provider-name">
              <Check size={14} aria-hidden="true" className="provider-icon" /> {x.source}
            </span>
            <span className="provider-sub">
              Available · latest ch. {Math.floor(latest.get(x.sourceId)!)}
            </span>
          </button>
        ))}
        {others.map((x) => {
          const loading = x.status === "loading" || x.status === "linked";
          return (
            <span key={x.sourceId} className="provider" data-state={loading ? "loading" : "unavailable"} aria-disabled="true">
              <span className="provider-name">
                {loading ? <RotateCw size={14} aria-hidden="true" className="provider-icon spin" /> : <Ban size={14} aria-hidden="true" className="provider-icon" />} {x.source}
              </span>
              <span className="provider-sub">{loading ? "Checking…" : x.status === "ok" ? "No readable chapters" : (UNAVAILABLE[x.status] ?? "Not available")}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ChapterList({ title, data, readable, sourceName, onRetry, retrying }: { title: Title; data: ChapterListData; readable: boolean; sourceName: string; onRetry: () => void; retrying: boolean }) {
  const chapters = data.chapters;
  const progress = useUser((s) => s.progress.get(title.key));
  const [desc, setDesc] = useState(true);
  const [find, setFind] = useState("");
  const [versions, setVersions] = useState<Chapter | null>(null);
  const languages = useMemo(() => [...new Set(chapters.map((c) => c.language ?? "und"))], [chapters]);
  const [lang, setLang] = useState<string>("all");
  const [provider, setProvider] = useState<string>("all");
  const ref = useRef<HTMLDivElement>(null);
  const jumpRef = useRef<HTMLElement>(null);
  const list = useMemo(() => {
    const f = find.trim().toLowerCase();
    let xs = lang === "all" ? chapters : chapters.filter((c) => (c.language ?? "und") === lang);
    if (provider !== "all") xs = xs.filter((c) => c.variants?.some((v) => v.sourceId === provider));
    if (f)
      xs = xs.filter(
        (c) =>
          (c.numberText ?? String(c.number)).startsWith(f) ||
          c.title?.toLowerCase().includes(f) ||
          c.display?.toLowerCase().includes(f) ||
          c.variants?.some((v) => v.group?.name.toLowerCase().includes(f) || v.source.toLowerCase().includes(f)),
      );
    const ordered = desc ? [...xs].reverse() : xs;
    if (!f) return ordered;
    // "jump to chapter": exact number matches (1, not 10 or 1.5) come first
    const exact = ordered.filter((c) => (c.numberText ?? "") === f);
    return exact.length ? [...exact, ...ordered.filter((c) => !exact.includes(c))] : ordered;
  }, [chapters, desc, find, lang, provider]);
  // Volume headers (D52): only when most chapters carry a volume and there are at least two, and not while searching.
  const rows = useMemo<Row[]>(() => {
    const withVol = list.filter((c) => c.volume).length;
    const vols = new Set(list.map((c) => c.volume).filter(Boolean));
    if (find.trim() || vols.size < 2 || withVol < list.length * 0.5) return list.map((c) => ({ kind: "ch", c }));
    const out: Row[] = [];
    let cur: Extract<Row, { kind: "vol" }> | undefined;
    for (const c of list) {
      const v = c.volume ?? "";
      if (!cur || cur.key !== v) {
        cur = { kind: "vol", key: v, label: v ? `Volume ${v}` : "No volume", count: 0 };
        out.push(cur);
      }
      cur.count++;
      out.push({ kind: "ch", c });
    }
    return out;
  }, [list, find]);
  const { start, end } = useWindowVirtual(ref, rows.length, ROW_H);
  // Jump rail (D53): volumes when grouped, otherwise even chapter ranges. Only for long lists.
  const jumps = useMemo(() => {
    if (rows.length < 60) return [];
    const heads = rows.flatMap((r, i) => (r.kind === "vol" ? [{ i, label: r.key ? `Vol. ${r.key}` : "No vol." }] : []));
    if (heads.length >= 2) return heads;
    const step = rows.length > 600 ? 100 : 50;
    const out: { i: number; label: string }[] = [];
    for (let i = 0; i < rows.length; i += step) {
      const a = rows[i] as Extract<Row, { kind: "ch" }>;
      const b = rows[Math.min(rows.length, i + step) - 1] as Extract<Row, { kind: "ch" }>;
      const n = (c: Chapter) => (c.numberText ?? (Number.isFinite(c.number) ? String(Math.floor(c.number)) : "?"));
      out.push({ i, label: `${n(a.c)}–${n(b.c)}` });
    }
    return out;
  }, [rows]);
  // A tapped jump stays current until the reader scrolls by hand: the last group is often too short
  // to reach the top of the window, so position alone would highlight the one before it.
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => {
    if (picked === null) return;
    const clear = () => setPicked(null);
    const opts = { passive: true, once: true } as const;
    window.addEventListener("wheel", clear, opts);
    window.addEventListener("touchstart", clear, opts);
    window.addEventListener("keydown", clear, opts);
    return () => {
      window.removeEventListener("wheel", clear);
      window.removeEventListener("touchstart", clear);
      window.removeEventListener("keydown", clear);
    };
  }, [picked]);
  const activeJump = picked !== null && picked < jumps.length ? picked : jumps.length ? jumps.reduce((acc, j, k) => (j.i <= start + 8 ? k : acc), 0) : -1;
  const jumpTo = (i: number, k: number) => {
    setPicked(k);
    const el = ref.current;
    if (!el) return;
    const rail = jumpRef.current;
    const stuck = rail ? parseFloat(getComputedStyle(rail).top) + rail.offsetHeight : 0;
    const y = el.getBoundingClientRect().top + window.scrollY + i * ROW_H - stuck - 4;
    window.scrollTo({ top: y, behavior: reducedMotion() ? "auto" : "smooth" });
  };
  const read = progress?.read;
  const readCount = chapters.filter((c) => isChapterRead(read, c)).length;
  const current = progress ? findChapter(chapters, progress.chapterId)?.chapter : undefined;
  const providerNames = [...new Set(chapters.flatMap((c) => c.variants?.map((v) => v.source) ?? []))];
  return (
    <section aria-labelledby="chapters-h">
      <div className="section-head">
        <div className="section-titles">
          <h2 id="chapters-h">{chapters.length.toLocaleString()} {chapters.length === 1 ? "chapter" : "chapters"}</h2>
          <p>
            {readCount ? `${readCount} read · ` : ""}
            {readable ? `Read in Dawghwa · ${providerNames.length > 1 ? providerNames.join(" + ") : providerNames[0] ?? sourceName}` : "Not available in the Dawghwa reader"}
          </p>
        </div>
      </div>
      <SourceStatusBar data={data} onRetry={onRetry} retrying={retrying} />
      <ProviderPicker data={data} value={provider} onChange={setProvider} />
      <div className="chapter-tools">
        <input className="input" type="search" inputMode="decimal" placeholder="Jump to chapter or search" aria-label="Find chapter" value={find} onChange={(e) => setFind(e.target.value)} />
        {languages.length > 1 && (
          <select className="input input-sm" aria-label="Translation language" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="all">All languages</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {languageLabel(l === "und" ? null : l)}
              </option>
            ))}
          </select>
        )}
        <button className="btn btn-sm" onClick={() => setDesc((d) => !d)} aria-label={`${desc ? "Newest" : "Oldest"} first. Sort ${desc ? "oldest first" : "newest first"}`}>
          <ArrowDownUp size={15} /> {desc ? "Newest" : "Oldest"}
        </button>
        {readCount > 0 && (
          <button className="btn btn-sm btn-ghost" onClick={() => void markChaptersRead(title, chapters, false).then(() => toast("Read marks cleared"))}>
            Clear read
          </button>
        )}
      </div>
      {jumps.length > 1 && (
        <nav ref={jumpRef} className="ch-jump" aria-label="Jump to chapters">
          {jumps.map((j, k) => (
            <button key={j.i} type="button" className="ch-jump-btn" aria-current={k === activeJump || undefined} onClick={() => jumpTo(j.i, k)}>
              {j.label}
            </button>
          ))}
        </nav>
      )}
      {!list.length && <p className="muted">No chapter matches "{find}".</p>}
      <div ref={ref} className="chapter-list" style={{ height: rows.length * ROW_H }} role="list" aria-busy={!data.complete || undefined}>
        {rows.slice(start, end).map((r, i) => {
          const idx = start + i;
          if (r.kind === "vol")
            return (
              <div key={`vol-${r.key}-${idx}`} className="ch-group" role="listitem" style={{ top: idx * ROW_H }}>
                <h3>{r.label}</h3>
                <span className="ch-group-count">
                  {r.count} {r.count === 1 ? "chapter" : "chapters"}
                </span>
              </div>
            );
          const c = r.c;
          const isRead = isChapterRead(read, c);
          const vs = c.variants ?? [];
          const sourcesHere = [...new Set(vs.map((v) => v.source))];
          const editions = new Set(vs.map((v) => v.edition ?? "unknown"));
          const when = relativeTime(c.lastUpdated);
          const meta = [
            vs.length > 1 ? `${vs.length} versions · ${sourcesHere.join(", ")}` : [vs[0]?.source ?? sourceName, vs[0]?.group?.name].filter(Boolean).join(" · "),
            editions.has("official") ? "Official" : null,
            c.volume && rows[0]?.kind !== "vol" ? `Vol. ${c.volume}` : null,
          ]
            .filter(Boolean)
            .join(" · ");
          const isCurrent = current?.id === c.id;
          const preferred = provider !== "all" ? pickVariant(c, { sourceId: provider }) : pickVariant(c, { previous: isCurrent && progress?.sourceId ? { sourceId: progress.sourceId } : null });
          const label = chapterLabel(c);
          const inner = (
            <>
              <ChapterNo n={c.number} label={c.numberText !== undefined ? chapterBadge(c) : undefined} />
              <span className="ch-body">
                <span className="ch-title">
                  {label}
                  {isCurrent && !isRead && <Sticker tone="accent">Reading</Sticker>}
                </span>
                <span className="ch-meta">
                  {data.unified && <span className="lang-chip" aria-label={`Language ${languageLabel(c.language)}`}>{languageLabel(c.language)}</span>}
                  {when && (
                    <time className="ch-when" dateTime={when.iso} title={when.full}>
                      {when.label}
                    </time>
                  )}
                  {when && meta ? " · " : ""}
                  {meta}
                </span>
              </span>
            </>
          );
          return (
            <div key={c.id} className="chapter" role="listitem" style={{ top: idx * ROW_H }} data-read={isRead || undefined} data-current={isCurrent || undefined} data-chapter-key={c.id}>
              {preferred ? (
                <Link to={readerPath(title, c.id, undefined, preferred.sourceId, variantIdOf(preferred))}>{inner}</Link>
              ) : (
                <span aria-disabled="true">{inner}</span>
              )}
              <span className="chapter-actions">
                {vs.length > 1 && (
                  <button className="btn btn-sm btn-ghost version-btn" aria-label={`${vs.length} versions. Choose version of ${label}`} aria-haspopup="dialog" onClick={() => setVersions(c)}>
                    <Layers size={15} /> {vs.length}
                  </button>
                )}
                <button className="icon-btn" aria-label={isRead ? `Mark ${label} unread` : `Mark ${label} read`} aria-pressed={isRead} onClick={() => void markChaptersRead(title, [c], !isRead)}>
                  {isRead ? <Check size={18} /> : isCurrent ? <span className="dot" /> : <Check size={18} style={{ opacity: 0.25 }} />}
                </button>
              </span>
            </div>
          );
        })}
      </div>
      <VersionSheet title={title} chapter={versions} onClose={() => setVersions(null)} />
    </section>
  );
}

function MoreLikeThis({ title }: { title: Title }) {
  const ctx = useRankContext();
  const g = title.meta?.genres?.slice(0, 2) ?? [];
  const q = useBrowse(g.length ? { order: "popular", limit: 60, includedTags: g, kinds: title.meta?.kind ? [title.meta.kind] : undefined } : null);
  const items = useMemo(() => {
    const v = vectorize(title);
    return (q.data?.items ?? [])
      .filter((t) => t.key !== title.key && !ctx.exclude?.has(t.key))
      .map((t) => ({ t, s: cosineSparse(v, vectorize(t)) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 16)
      .map((x) => x.t);
  }, [q.data, title, ctx.exclude]);
  if (q.isError && !q.data) return <ErrorState error={q.error} retry={() => void q.refetch()} compact />;
  if (g.length && !q.data)
    return (
      <div className="grid" aria-busy="true" aria-label="Loading similar series">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="cover skeleton" />
        ))}
      </div>
    );
  if (!items.length) return <EmptyState title="Nothing close enough yet">We couldn't find series that share enough of this one's genres and format.</EmptyState>;
  return (
    <>
      <div className="grid">
        {items.map((t) => (
          <TitleCard key={t.key} title={t} context="similar" />
        ))}
      </div>
      <p className="tp-more">
        <Link className="btn" to={similarPath(title)}>
          <Sparkles size={16} /> Explore more like this
        </Link>
      </p>
    </>
  );
}

/** Sliding underline: the active tab's box, as CSS variables on the tablist (transform-only animation). */
function useTabInk(ref: React.RefObject<HTMLElement | null>, active: string, mounted: boolean): React.CSSProperties {
  const [box, setBox] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const b = el.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (b) setBox((o) => (o && o.x === b.offsetLeft && o.w === b.offsetWidth ? o : { x: b.offsetLeft, w: b.offsetWidth }));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : undefined;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [ref, active, mounted]);
  return box ? ({ "--ink-x": `${box.x}px`, "--ink-w": `${box.w}px` } as React.CSSProperties) : {};
}

/**
 * Horizontal swipe on the tab panel moves to the neighbouring tab (touch only).
 * Ignored when the gesture starts in a control or in something that scrolls
 * sideways, and when it is more vertical than horizontal.
 */
function useTabSwipe(go: (dir: 1 | -1) => void) {
  const s = useRef<{ x: number; y: number; t: number } | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const el = e.target as HTMLElement;
      if (e.touches.length !== 1 || el.closest("input, select, textarea, [data-no-swipe]")) return (s.current = null);
      for (let n: HTMLElement | null = el; n && n !== e.currentTarget; n = n.parentElement) if (n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflowX !== "visible") return (s.current = null);
      const p = e.touches[0]!;
      s.current = { x: p.clientX, y: p.clientY, t: performance.now() };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const st = s.current;
      s.current = null;
      if (!st) return;
      const p = e.changedTouches[0]!;
      const dx = p.clientX - st.x;
      const dy = p.clientY - st.y;
      const fast = performance.now() - st.t < 600;
      if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.6 && fast) go(dx < 0 ? 1 : -1);
    },
  };
}

type Tab = "chapters" | "about" | "similar";
const TABS: { id: Tab; label: string }[] = [
  { id: "chapters", label: "Chapters" },
  { id: "about", label: "About" },
  { id: "similar", label: "Readers also like" },
];

export default function TitlePage() {
  const { source = "", id = "" } = useParams();
  const [params] = useSearchParams();
  const loc = useLocation();
  const nav = useNavigate();
  const t = useTitle(source, id, params.get("u") ?? undefined);
  const title = t.data;
  const chapters = useChapters(title);
  const sources = useSources();
  const lib = useUser((s) => (title ? s.library.get(title.key) : undefined));
  const progress = useUser((s) => (title ? s.progress.get(title.key) : undefined));
  const ctx = useRankContext();
  const [statusOpen, setStatusOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [barSolid, setBarSolid] = useState(false);
  useEffect(() => {
    const on = () => setBarSolid(window.scrollY > 240);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const [tab, setTabState] = useState<Tab>("chapters");
  // which way the panel slides in: +1 from the right (next tab), -1 from the left
  const [tabDir, setTabDir] = useState(0);
  const setTab = (next: Tab) => {
    const a = TABS.findIndex((x) => x.id === tab);
    const b = TABS.findIndex((x) => x.id === next);
    if (a === b) return;
    setTabDir(b > a ? 1 : -1);
    setTabState(next);
  };
  const onTabKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((x) => x.id === tab);
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = TABS[(i + d + TABS.length) % TABS.length]!.id;
    setTab(next);
    document.getElementById(`tp-tab-${next}`)?.focus();
  };
  const tablist = useRef<HTMLDivElement>(null);
  const ink = useTabInk(tablist, tab, !!title); // the tablist only mounts once the title has loaded
  const swipe = useTabSwipe((d) => {
    const i = TABS.findIndex((x) => x.id === tab);
    const next = TABS[i + d];
    if (!next) return;
    setTab(next.id);
    void haptic("light");
  });
  // desktop: when the hero CTA scrolls away, a compact copy rides in the sticky tab bar (D50)
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaGone, setCtaGone] = useState(false);
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setCtaGone(!e!.isIntersecting && e!.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [Boolean(title)]); // eslint-disable-line react-hooks/exhaustive-deps
  const opened = useRef<string | null>(null);

  const src = sources.data?.find((s) => s.id === source);
  const readable = Boolean(src?.capabilities.chapterPages) || Boolean(chapters.data?.chapters.some((c) => c.variants?.length));
  const sourceName = title?.sourceName ?? src?.name ?? source;
  const m = title?.meta;

  useEffect(() => {
    if (title && opened.current !== title.key) {
      opened.current = title.key;
      void signal("open", title, title.key, { context: "title" }); // weak signal, never counted as a like
    }
  }, [title]);

  useHead(
    title
      ? {
          title: `${title.title}${m?.kind ? ` (${kindLabel(m.kind)})` : ""}`,
          description: m?.description ? plainText(m.description).slice(0, 160) : `Read ${title.title} on Dawghwa.`,
          path: loc.pathname,
          image: title.coverLarge ?? title.cover,
          type: "book",
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Book",
            name: title.title,
            alternateName: m?.altTitles?.slice(0, 5),
            author: m?.authors?.map((a) => ({ "@type": "Person", name: a })),
            illustrator: m?.artists?.map((a) => ({ "@type": "Person", name: a })),
            genre: m?.genres,
            image: title.coverLarge ?? title.cover,
            description: m?.description,
            inLanguage: m?.originalLanguage,
            aggregateRating: title.rating ? { "@type": "AggregateRating", ratingValue: title.rating, bestRating: 10 } : undefined,
          },
        }
      : { title: "Loading title", noindex: true },
  );

  const reason = useMemo(() => {
    const fromNav = (loc.state as { reason?: string } | null)?.reason;
    if (fromNav) return fromNav;
    if (!title || !ctx.state || !title.meta) return undefined;
    const pos = positivesOf(ctx).filter((p) => p.key !== title.key);
    const sc = scoreTitle(title, ctx, pos);
    return sc.score > 0.55 ? explain(sc, ctx, pos)?.text : undefined;
  }, [title, ctx, loc.state]);
  useEffect(() => {
    // only a finished aggregation with no chapters means unreadable (partial stream events start empty)
    if (title && chapters.data && chapters.data.complete !== false && !chapters.data.chapters.length) markUnreadable(title.key);
  }, [title, chapters.data]);

  const bareBar = (
    <div className="tp-bar" data-scrolled="">
      <button className="icon-btn tp-icon" onClick={() => (window.history.state?.idx > 0 ? nav(-1) : nav("/"))} aria-label="Back">
        <ArrowLeft size={22} />
      </button>
      <span className="tp-bar-title">{t.isError ? "Series" : "Loading…"}</span>
      <Link className="btn btn-sm" to="/">
        Home
      </Link>
    </div>
  );
  if (t.isError && !title)
    return (
      <div className="tp">
        {bareBar}
        <div className="page page-narrow tp-error">
          <ErrorState error={t.error} retry={() => void t.refetch()} center />
        </div>
      </div>
    );
  if (!title)
    return (
      <div className="tp" aria-busy="true" aria-label="Loading series">
        {bareBar}
        <div className="tp-layout">
          <div className="tp-hero">
            <div className="tp-cover">
              <div className="cover skeleton" />
            </div>
            <div className="skeleton" style={{ height: 30, width: "70%", margin: "0 auto" }} />
            <div className="skeleton skeleton-line" style={{ width: "40%", margin: "12px auto" }} />
          </div>
        </div>
      </div>
    );

  const chs = chapters.data?.chapters ?? [];
  const current = progress ? findChapter(chs, progress.chapterId)?.chapter : undefined;
  const nextAfterCurrent = current && isChapterRead(progress?.read, current) ? chs[chs.indexOf(current) + 1] : current;
  const first = chs[0];
  const target = nextAfterCurrent ?? first;
  const targetNo = target ? (target.numberText ?? (target.kind && target.kind !== "regular" ? chapterLabel(target) : String(target.number))) : "";
  const startLabel = progress && target ? (isChapterRead(progress.read, target) ? `Reread ch. ${targetNo}` : `Continue ch. ${targetNo}`) : "Start reading";
  const status = lib?.status;
  const lastNum = chs.length ? chs[chs.length - 1]!.number : title.latestChapter;
  const facts = [
    kindLabel(m?.kind),
    statusLabel(m?.status),
    m?.year ? String(m.year) : undefined,
    m?.demographic && m.demographic !== "none" ? m.demographic[0]!.toUpperCase() + m.demographic.slice(1) : undefined,
  ].filter(Boolean) as string[];
  const readCount = progress ? chs.filter((c) => isChapterRead(progress.read, c)).length : 0;
  const pubStatus = statusLabel(m?.status);
  const stats = [
    pubStatus ? { label: "Status", value: pubStatus, icon: null } : null,
    title.rating ? { label: "Rating", value: title.rating.toFixed(2), icon: <Star size={14} aria-hidden="true" /> } : null,
    title.follows ? { label: "Followers", value: compactNumber(title.follows), icon: <Users size={14} aria-hidden="true" /> } : null,
    lastNum ? { label: "Latest", value: String(Math.floor(lastNum)), icon: null } : null,
    readCount ? { label: "Read", value: String(readCount), icon: <Check size={14} aria-hidden="true" /> } : null,
  ].filter(Boolean) as { label: string; value: string; icon: ReactNode }[];

  const synopsis = m?.description ? plainText(m.description) : "";
  const tags = [...(m?.genres ?? []), ...(m?.themes ?? [])];
  const names = (xs?: string[]) => (xs?.length ? xs.slice(0, 2).join(", ") + (xs.length > 2 ? ` +${xs.length - 2}` : "") : "");
  const sameCreators = m?.artists?.join() === m?.authors?.join();
  const credit = [m?.authors?.length ? `Story ${names(m.authors)}` : null, m?.artists?.length && !sameCreators ? `Art ${names(m.artists)}` : null].filter(Boolean).join(" · ");
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : nav("/"));
  const saveToggle = () => {
    if (status) return setStatusOpen(true);
    void setStatus(title, "plan");
    void haptic("light");
    toast(`Saved to ${STATUS_LABELS.plan}`, { label: "Undo", run: () => void setStatus(title, undefined) });
  };
  const art = coverSrc(title.coverLarge ?? title.cover);

  const makeCta = (cls = "btn btn-primary btn-lg tp-cta") =>
    chapters.isLoading ? (
      <button className={cls} disabled>
        <BookOpen size={18} /> Finding readable chapters
      </button>
    ) : target?.variants?.length ? (
      <Link className={cls} to={readerPath(title, target.id, current === target && progress?.page ? progress.page : undefined, (current === target && progress?.sourceId) || target.variants[0]?.sourceId, current === target ? progress?.variantId : undefined)}>
        <BookOpen size={18} /> {progress ? startLabel : `Read ${target.kind === "regular" || !target.kind ? `chapter ${targetNo}` : chapterLabel(target)}`}
      </Link>
    ) : (
      <Link className={cls} to={`/search?q=${encodeURIComponent(title.title)}`}>
        <Search size={18} /> Find readable sources
      </Link>
    );
  const cta = makeCta();

  const chapterPanel = chapters.isError ? (
    <ErrorState error={chapters.error} retry={() => void chapters.refetch()} compact />
  ) : chapters.isLoading || (!chs.length && chapters.data && !chapters.data.complete) ? (
    <div aria-busy="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="skeleton skeleton-line" style={{ height: 40, margin: "8px 0" }} />
      ))}
    </div>
  ) : !chs.length ? (
    <EmptyState
      title="No in-app chapters found"
      action={
        <button className="btn" onClick={() => nav(`/search?q=${encodeURIComponent(title.title)}`)}>
          Look for it on other sources
        </button>
      }
    >
      None of the currently compatible providers returned chapters that Dawghwa can read in-app. This does not mean the title has no chapters; source availability can change.
    </EmptyState>
  ) : (
    <ChapterList title={title} data={chapters.data!} readable={readable} sourceName={sourceName} onRetry={() => void chapters.refetch()} retrying={chapters.isFetching} />
  );

  const about = (
    <div className="tp-about">
      {stats.length > 0 && (
        <dl className="stat-strip" style={{ ["--n" as string]: stats.length }}>
          {stats.map((x) => (
            <div key={x.label}>
              <dt>{x.label}</dt>
              <dd>
                {x.icon}
                {x.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {synopsis && <p className="synopsis">{synopsis}</p>}
      {tags.length > 0 && (
        <div className="chips" aria-label="Tags">
          {tags.map((g) => (
            <Link key={g} className="tag" to={`/discover?tag=${encodeURIComponent(g)}`}>
              {g}
            </Link>
          ))}
        </div>
      )}
      <dl className="credits">
        {facts.length > 0 && (
          <div>
            <dt>Format</dt>
            <dd>{facts.join(" · ")}</dd>
          </div>
        )}
        {m?.authors?.length ? (
          <div>
            <dt>Story</dt>
            <dd>{m.authors.join(", ")}</dd>
          </div>
        ) : null}
        {m?.artists?.length ? (
          <div>
            <dt>Art</dt>
            <dd>{m.artists.join(", ")}</dd>
          </div>
        ) : null}
        {m?.altTitles?.length ? (
          <div>
            <dt>Also known as</dt>
            <dd>{m.altTitles.slice(0, 4).join(" · ")}</dd>
          </div>
        ) : null}
        <div>
          <dt>Source</dt>
          <dd>
            <a href={title.url} target="_blank" rel="noopener noreferrer">
              {sourceName} <ExternalLink size={12} aria-hidden="true" />
            </a>
          </dd>
        </div>
      </dl>
    </div>
  );

  return (
    <div className="tp">
      <div className="tp-backdrop" aria-hidden="true">
        {art && <img src={art} alt="" decoding="async" referrerPolicy="no-referrer" />}
      </div>
      <div className="tp-bar" data-scrolled={barSolid || undefined}>
        <button className="icon-btn tp-icon" onClick={back} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <span className="tp-bar-title" aria-hidden="true">
          {title.title}
        </span>
        <button className="btn btn-sm tp-save" data-saved={status ? "" : undefined} onClick={saveToggle} aria-haspopup={status ? "dialog" : undefined} aria-label={status ? `In library: ${STATUS_LABELS[status]}. Change` : "Save to library"}>
          {status ? <Check size={16} /> : <Plus size={16} />} {status ? STATUS_LABELS[status] : "Save"}
        </button>
        <button className="icon-btn tp-icon" onClick={() => setAboutOpen(true)} aria-label="About this series" aria-haspopup="dialog">
          <Info size={21} />
        </button>
        <button className="icon-btn tp-icon" onClick={() => setMenu(true)} aria-label="More actions" aria-haspopup="dialog">
          <MoreHorizontal size={22} />
        </button>
      </div>

      <div className="tp-layout">
        <section className="tp-hero" aria-labelledby="tp-h">
          <div className="tp-cover">
            <Cover src={title.cover} large={title.coverLarge} title={title.title} eager sizes="(min-width: 900px) 280px, 200px" />
          </div>
          {facts.length > 0 && (
            <p className="title-kicker">
              {facts.map((f, i) => (
                <span key={f} className={i === 0 ? "title-kind" : undefined}>
                  {f}
                </span>
              ))}
            </p>
          )}
          <h1 id="tp-h">{title.title}</h1>
          {credit && <p className="tp-credit">{credit}</p>}
          {(title.rating || title.follows || lastNum) && (
            <p className="tp-stats">
              {title.rating ? (
                <span>
                  <Star size={13} aria-hidden="true" fill="currentColor" /> {title.rating.toFixed(2)}
                </span>
              ) : null}
              {title.follows ? (
                <span>
                  <Users size={13} aria-hidden="true" /> {compactNumber(title.follows)} followers
                </span>
              ) : null}
              {lastNum ? <span>{chs.length && chs.length !== Math.floor(lastNum) ? `Latest ch. ${Math.floor(lastNum)}` : `${Math.floor(lastNum)} chapters`}</span> : null}
            </p>
          )}
          {readCount > 0 && chs.length > 0 && (
            <div className="title-progress" aria-label={`${readCount} of ${chs.length} chapters read`}>
              <span className="title-progress-bar">
                <span style={{ width: `${Math.min(100, (readCount / chs.length) * 100)}%` }} />
              </span>
              <span className="title-progress-label">
                {readCount} / {chs.length} read
              </span>
            </div>
          )}
          <div className="tp-cta-wrap" ref={ctaRef}>
            {cta}
          </div>
          <div className="react-bar">
            <button className="btn btn-sm" aria-pressed={lib?.rating === 1} onClick={() => void rate(title, lib?.rating === 1 ? undefined : 1)}>
              <ThumbsUp size={15} /> {lib?.rating === 1 ? "Liked" : "Like"}
            </button>
            <button
              className="btn btn-sm"
              aria-pressed={lib?.rating === -1}
              onClick={() => {
                void rate(title, lib?.rating === -1 ? undefined : -1);
                if (lib?.rating !== -1) toast("Got it. You'll see fewer titles like this", { label: "Undo", run: () => void rate(title, undefined) });
              }}
            >
              <ThumbsDown size={15} /> Not for me
            </button>
            <button
              className="btn btn-sm"
              aria-pressed={Boolean(lib?.favorite)}
              onClick={() => {
                const on = !lib?.favorite;
                void toggleFavorite(title);
                void haptic("light");
                toast(on ? "Added to favourites" : "Removed from favourites", { label: "Undo", run: () => void toggleFavorite(title) });
              }}
            >
              <Heart size={15} fill={lib?.favorite ? "currentColor" : "none"} /> {lib?.favorite ? "Favourited" : "Favourite"}
            </button>
            <button className="btn btn-sm" onClick={() => void share({ title: title.title, url: location.origin + loc.pathname + loc.search }).then((r) => r === "copied" && toast("Link copied"))}>
              <Share2 size={15} /> Share
            </button>
          </div>
          {synopsis && (
            <button className="tp-synopsis" onClick={() => setAboutOpen(true)} aria-haspopup="dialog">
              <span className="sr-only">Synopsis: </span>
              {synopsis}
              <span className="sr-only">. Open full details</span>
            </button>
          )}
          {tags.length > 0 && (
            <div className="chips tp-tags" aria-label="Tags">
              {tags.slice(0, 5).map((g) => (
                <Link key={g} className="tag" to={`/discover?tag=${encodeURIComponent(g)}`}>
                  {g}
                </Link>
              ))}
            </div>
          )}
          {reason && (
            <p className="why">
              <Sparkles size={16} /> <span>{reason}</span>
            </p>
          )}
        </section>

        <div className="tp-main">
          <div className="tp-tabbar">
            <div className="tp-tabs" role="tablist" aria-label="Series sections" onKeyDown={onTabKey} ref={tablist} style={ink}>
              {TABS.map((x) => (
                <button key={x.id} id={`tp-tab-${x.id}`} role="tab" aria-selected={tab === x.id} aria-controls={`tp-panel-${x.id}`} tabIndex={tab === x.id ? 0 : -1} onClick={() => setTab(x.id)}>
                  {x.label}
                  {x.id === "chapters" && chs.length > 0 && <small>{chs.length}</small>}
                </button>
              ))}
              <span className="tp-tabs-ink" aria-hidden="true" />
            </div>
            <div className="tp-mini-cta" data-on={ctaGone || undefined} aria-hidden={!ctaGone || undefined} inert={!ctaGone || undefined}>
              {makeCta("btn btn-primary tp-mini-btn")}
            </div>
          </div>
          <div className="tp-panel" role="tabpanel" id={`tp-panel-${tab}`} aria-labelledby={`tp-tab-${tab}`} data-dir={tabDir || undefined} key={tab} {...swipe}>
            {tab === "chapters" ? chapterPanel : tab === "about" ? about : <MoreLikeThis title={title} />}
          </div>
        </div>
      </div>
      <Sheet open={aboutOpen} onClose={() => setAboutOpen(false)} title={title.title}>
        {about}
      </Sheet>
      <Sheet open={statusOpen} onClose={() => setStatusOpen(false)} title="Library">
        <div className="menu-list" role="radiogroup" aria-label="Library status">
          {(Object.keys(STATUS_LABELS) as LibraryStatus[]).map((s) => (
            <button
              key={s}
              className="menu-item"
              role="radio"
              aria-checked={status === s}
              onClick={() => {
                const was = status;
                void setStatus(title, s);
                void haptic("light");
                setStatusOpen(false);
                if (was !== s) toast(`Moved to ${STATUS_LABELS[s]}`, { label: "Undo", run: () => void setStatus(title, was) });
              }}
            >
              <span className="radio-dot" aria-hidden="true" /> {STATUS_LABELS[s]}
            </button>
          ))}
          {status && (
            <button
              className="menu-item"
              onClick={() => {
                void setStatus(title, undefined);
                setStatusOpen(false);
                toast("Removed from library");
              }}
            >
              <X size={18} /> Remove from library
            </button>
          )}
        </div>
      </Sheet>
      <TitleActionsSheet title={title} open={menu} onClose={() => setMenu(false)} />
    </div>
  );
}
