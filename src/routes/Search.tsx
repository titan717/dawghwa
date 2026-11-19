import { toApiError } from "@/lib/api/errors";
import { useOnline } from "@/lib/platform/useOnline";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, Compass, Globe, Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { Sheet } from "@/components/Layer";
import type { BrowseOrder, BrowseQuery, MangaKind } from "@/lib/api/types";
import { TitleCard } from "@/components/TitleCard";
import { TitleGrid } from "@/components/Grid";
import { EmptyState, ErrorState, GridSkeleton, RowSkeleton } from "@/components/States";
import { Cover } from "@/components/Cover";
import { parseIntent, type Intent } from "@/lib/search/intent";
import { runIntent } from "@/lib/search/run";
import { textScore } from "@/lib/search/local";
import { streamSearch } from "@/lib/api/endpoints";
import { useBrowse, useVocabulary } from "@/lib/query";
import { useHead } from "@/lib/seo";
import { getCachedTitles } from "@/lib/store/db";
import { useUser } from "@/lib/store/user";
import { useRankContext } from "@/lib/feed/context";
import { fromResult, titlePath, type Title, isMature } from "@/lib/titles";
import { coverSrc } from "@/lib/api/images";

const KINDS: [MangaKind, string][] = [
  ["manhwa", "Manhwa"],
  ["manga", "Manga"],
  ["manhua", "Manhua"],
];
const STATUSES = [
  ["completed", "Completed"],
  ["ongoing", "Ongoing"],
  ["hiatus", "On hiatus"],
] as const;
const SORTS: [BrowseOrder | "", string][] = [
  ["", "Best match"],
  ["popular", "Most followed"],
  ["rating", "Top rated"],
  ["latest", "Recently updated"],
  ["new", "Newly added"],
];
const plist = (p: URLSearchParams, k: string) => (p.get(k) ?? "").split(",").filter(Boolean);

/** Explicit filters from the URL (chips / sheet) merged into the parsed intent. All are real catalogue filters (or labelled on-device ones). */
function withFilters(i: Intent, f: { kinds: string[]; status: string[]; tags: string[]; order?: BrowseOrder }): Intent {
  const n = f.kinds.length + f.status.length + f.tags.length + (f.order ? 1 : 0);
  if (!n) return i;
  const kinds = [...new Set([...i.kinds, ...(f.kinds as MangaKind[])])];
  const status = [...new Set([...i.status, ...f.status])] as Intent["status"];
  const includeTags = [...new Set([...i.includeTags, ...f.tags])];
  const chips = [...i.chips];
  for (const k of f.kinds) if (!i.kinds.includes(k as MangaKind)) chips.push({ id: `fk:${k}`, label: KINDS.find(([x]) => x === k)?.[1] ?? k, where: "server" });
  for (const st of f.status) if (!i.status.includes(st as never)) chips.push({ id: `fs:${st}`, label: STATUSES.find(([x]) => x === st)?.[1] ?? st, where: "server" });
  for (const t of f.tags) if (!i.includeTags.includes(t)) chips.push({ id: `ft:${t}`, label: t, where: "server" });
  return { ...i, kinds, status, includeTags, order: f.order ?? i.order, chips, structured: true };
}

const EXAMPLES = ["Manhwa with an overpowered MC and revenge", "Completed fantasy manga with romance", "Dark Korean manhwa without a love triangle", "Something similar to Solo Leveling", "Completed romance with fewer than 100 chapters"];

function useDebounced<T>(v: T, ms: number) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

const recentKey = (pid?: string) => `dawghwa:recent-searches:${pid ?? "none"}`;
function readRecent(pid?: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(recentKey(pid)) ?? "[]") as string[];
  } catch {
    return [];
  }
}

interface SourceRun {
  sourceId: string;
  source: string;
  items: Title[];
  error?: string;
  durationMs?: number;
}

/** Multi-source title search over the NDJSON stream, started explicitly (it hits every provider). */
function AllSources({ q }: { q: string }) {
  const [runs, setRuns] = useState<SourceRun[]>([]);
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [err, setErr] = useState<unknown>();
  const ac = useRef<AbortController | null>(null);
  useEffect(() => () => ac.current?.abort(), []);
  useEffect(() => {
    ac.current?.abort();
    setRuns([]);
    setState("idle");
  }, [q]);
  const start = async () => {
    ac.current?.abort();
    const c = new AbortController();
    ac.current = c;
    setRuns([]);
    setState("running");
    try {
      await streamSearch(q, {
        signal: c.signal,
        onLine: (l) => {
          const items = l.results.map((r) => fromResult(r, l.sourceId, l.source)).sort((a, b) => textScore(b, q) - textScore(a, q));
          setRuns((r) => [...r, { sourceId: l.sourceId, source: l.source, items, error: l.error, durationMs: l.durationMs }]);
        },
      });
      if (!c.signal.aborted) setState("done");
    } catch (e) {
      if (c.signal.aborted) return;
      setErr(e);
      setState("error");
    }
  };
  if (state === "idle")
    return (
      <div className="inline-state">
        <Globe size={18} />
        <span style={{ flex: 1 }}>Not finding it? Search every connected source for "{q}". Results stream in as each source answers.</span>
        <button className="btn btn-sm" onClick={() => void start()}>
          Search all sources
        </button>
      </div>
    );
  const found = runs.filter((r) => r.items.length);
  const failed = runs.filter((r) => r.error);
  return (
    <section className="section" aria-live="polite">
      <div className="section-head">
        <div>
          <h2>All sources</h2>
          <p>
            {state === "running" ? `Searching... ${runs.length} sources answered` : `${runs.length} sources answered, ${found.length} with matches`}
            {failed.length ? `, ${failed.length} unavailable` : ""}
          </p>
        </div>
        {state === "running" && (
          <button className="btn btn-sm" onClick={() => ac.current?.abort()}>
            Stop
          </button>
        )}
      </div>
      {state === "error" && <ErrorState error={err} retry={() => void start()} compact />}
      <div className="stack">
        {found.map((r) => (
          <div key={r.sourceId} className="list">
            <div className="eyebrow" style={{ padding: "8px 0" }}>
              {r.source} · {r.items.length}
            </div>
            {r.items.slice(0, 5).map((t) => (
              <Link key={t.key} className="list-item" to={titlePath(t)}>
                <Cover mature={isMature(t)} src={t.cover} title={t.title} sizes="48px" className="cover-sm" />
                <span style={{ minWidth: 0 }}>
                  <span className="title">{t.title}</span>
                  <span className="card-meta">{t.latestChapter ? `Ch. ${t.latestChapter}` : ""}</span>
                </span>
              </Link>
            ))}
          </div>
        ))}
      </div>
      {failed.length > 0 && <p className="source-status muted">Unavailable: {failed.map((f) => f.source).join(", ")}</p>}
    </section>
  );
}

const CATEGORIES: { label: string; to: string; q: BrowseQuery }[] = [
  { label: "Top rated", to: "/discover?order=rating", q: { order: "rating" } },
  { label: "New releases", to: "/discover?order=new", q: { order: "new" } },
  { label: "Recently updated", to: "/discover?order=latest", q: { order: "latest" } },
  { label: "Completed", to: "/discover?status=completed", q: { status: ["completed"], order: "popular" } },
  { label: "Manhwa", to: "/discover?kind=manhwa", q: { kinds: ["manhwa"], order: "popular" } },
  { label: "Manga", to: "/discover?kind=manga", q: { kinds: ["manga"], order: "popular" } },
  { label: "Manhua", to: "/discover?kind=manhua", q: { kinds: ["manhua"], order: "popular" } },
  { label: "Romance", to: "/discover?tag=Romance", q: { includedTags: ["Romance"], order: "popular" } },
];

/** Category tile: the label plus the cover of that category's current top series (a real browse result). */
function CategoryTile({ label, to, q }: { label: string; to: string; q: BrowseQuery }) {
  const r = useBrowse({ ...q, limit: 2 });
  const t = r.data?.items[0];
  return (
    <li>
      <Link className="cat-tile" to={to}>
        <span className="cat-tile-label">{label}</span>
        <span className="cat-tile-art" aria-hidden="true">
          {t?.cover ? <img src={coverSrc(t.cover)} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <span className="skeleton" />}
        </span>
      </Link>
    </li>
  );
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const profileId = useUser((s) => s.profile?.id);
  const online = useOnline();
  const userTitles = useUser((s) => s.titles);
  const [text, setText] = useState(params.get("q") ?? "");
  const q = useDebounced(text.trim(), 280);
  const vocab = useVocabulary();
  const ctx = useRankContext();
  const input = useRef<HTMLInputElement>(null);
  const [recent, setRecent] = useState<string[]>(() => readRecent(profileId));
  const similarKey = params.get("similar") ?? undefined;
  const [sheet, setSheet] = useState(false);
  const fKinds = plist(params, "kind");
  const fStatus = plist(params, "status");
  const fTags = plist(params, "tag");
  const fOrder = (params.get("order") as BrowseOrder) || undefined;
  const filterCount = fKinds.length + fStatus.length + fTags.length + (fOrder ? 1 : 0);
  const toggleParam = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    const cur = plist(p, k);
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    if (next.length) p.set(k, next.join(","));
    else p.delete(k);
    setParams(p, { replace: true });
  };
  const setParam = (k: string, v?: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };
  const clearFilters = () => {
    const p = new URLSearchParams(params);
    ["kind", "status", "tag", "order"].forEach((k) => p.delete(k));
    setParams(p, { replace: true });
  };
  const trending = useBrowse({ order: "popular", year: new Date().getFullYear(), limit: 10 });
  const removeRecent = (r: string) => {
    const next = readRecent(profileId).filter((x) => x !== r);
    localStorage.setItem(recentKey(profileId), JSON.stringify(next));
    setRecent(next);
  };
  useHead({ title: q ? `Search: ${q}` : "Search", path: "/search", noindex: true });

  useEffect(() => setRecent(readRecent(profileId)), [profileId]);
  useEffect(() => {
    const p = new URLSearchParams(params);
    if (q) p.set("q", q);
    else p.delete("q");
    if (similarKey && !q.toLowerCase().startsWith("similar to")) p.delete("similar");
    if (p.toString() !== params.toString()) setParams(p, { replace: true });
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fromUrl = params.get("q") ?? "";
    if (fromUrl !== q) setText(fromUrl);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!q || q.length < 3) return;
    const t = setTimeout(() => {
      const next = [q, ...readRecent(profileId).filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8);
      localStorage.setItem(recentKey(profileId), JSON.stringify(next));
      setRecent(next);
    }, 2500);
    return () => clearTimeout(t);
  }, [q, profileId]);

  const intent = useMemo(() => withFilters(parseIntent(q, vocab.data), { kinds: fKinds, status: fStatus, tags: fTags, order: fOrder }), [q, vocab.data, params]); // eslint-disable-line react-hooks/exhaustive-deps
  // typed but not yet debounced: show the result skeleton at once so the screen answers the keystroke
  const pending = text.trim() !== q && text.trim().length > 0;
  const hasQuery = Boolean(q) || filterCount > 0;
  const showResults = hasQuery || pending;
  const genres = useMemo(() => (vocab.data?.tags ?? []).filter((t) => t.group === "genre").map((t) => t.name).sort(), [vocab.data]);
  const words = text.trim().toLowerCase().split(/\s+/);
  const lastWord = words.at(-1) ?? "";
  // "no harem", "without gore": the word is an exclusion, so offering it as an include filter would invert the ask
  const negated = /^(no|not|without|except|minus|non|zero)$/.test(words.at(-2) ?? "");
  const tagSuggest =
    lastWord.length >= 2 && !negated
      ? (vocab.data?.tags ?? []).filter((t) => t.group !== "content" && t.name.toLowerCase().startsWith(lastWord) && !intent.includeTags.includes(t.name) && !intent.excludeTags.includes(t.name)).slice(0, 4)
      : [];
  const seedQ = useQuery({
    queryKey: ["seed", similarKey],
    enabled: Boolean(similarKey),
    queryFn: async () => userTitles.get(similarKey!) ?? (await getCachedTitles([similarKey!])).get(similarKey!) ?? null,
  });
  const structured = intent.structured || Boolean(intent.similarTo);
  const ready = !similarKey || seedQ.isFetched;
  const intentQ = useQuery({
    queryKey: ["intent", JSON.stringify({ ...intent, raw: undefined, chips: undefined }), similarKey ?? ""],
    enabled: hasQuery && structured && ready,
    queryFn: ({ signal }) => runIntent(intent, { signal, want: 36, seed: seedQ.data ?? undefined }),
    staleTime: 10 * 60_000,
  });
  // The literal title search always runs, so a title that happens to contain intent words
  // ("Tower of God", "Romance Dawn") is never replaced by a genre browse.
  const textQ = useBrowse(q.length >= 2 ? { query: q, order: "relevance", limit: 40 } : null);
  const textItems = useMemo(() => (textQ.data?.items ?? []).map((t, i) => ({ t, s: textScore(t, q) * 2 - i / 40 })).sort((a, b) => b.s - a.s).map((x) => x.t), [textQ.data, q]);
  const titleHits = useMemo(() => (structured ? textItems.filter((t) => textScore(t, q) >= 0.75).slice(0, 6) : []), [structured, textItems, q]);
  // an exact title match ("tower of god") is the answer; the parsed theme chip would only confuse
  const exactTitle = !filterCount && textItems.slice(0, 3).some((t) => textScore(t, q) >= 0.95);
  const hitKeys = new Set(titleHits.map((t) => t.key));
  const items = (structured ? intentQ.data?.items?.filter((t) => !hitKeys.has(t.key)) : textItems)?.filter((t) => !ctx.exclude?.has(t.key)) ?? [];
  const active = structured ? intentQ : textQ;
  // the catalogue call failed at the network layer: every other source goes through the same API
  const apiUnreachable = (() => {
    const e = active.isError ? toApiError(active.error) : undefined;
    return Boolean(e && (e.kind === "network" || e.kind === "offline" || e.kind === "timeout"));
  })();
  const local = intent.chips.filter((c) => c.where === "local");

  const filters = (
    <div className="stack" style={{ gap: 20 }}>
      <fieldset>
        <legend className="eyebrow">Sort</legend>
        <div className="chips">
          {SORTS.map(([o, l]) => (
            <button key={o || "best"} className="chip" aria-pressed={(fOrder ?? "") === o} onClick={() => setParam("order", o || undefined)}>
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="eyebrow">Format</legend>
        <div className="chips">
          {KINDS.map(([k, l]) => (
            <button key={k} className="chip" aria-pressed={fKinds.includes(k)} onClick={() => toggleParam("kind", k)}>
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="eyebrow">Status</legend>
        <div className="chips">
          {STATUSES.map(([k, l]) => (
            <button key={k} className="chip" aria-pressed={fStatus.includes(k)} onClick={() => toggleParam("status", k)}>
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      {genres.length > 0 && (
        <fieldset>
          <legend className="eyebrow">Genres (all must match)</legend>
          <div className="chips">
            {genres.map((g) => (
              <button key={g} className="chip" aria-pressed={fTags.includes(g)} onClick={() => toggleParam("tag", g)}>
                {g}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <p className="muted filter-hint">
        These filters are sent to the catalogue. Themes, moods, length and "hidden gems" can be typed into the search box; they're applied on this device and marked as such.
      </p>
    </div>
  );

  return (
    <div className="page search-page">
      <div className="search-head">
        <h1 className="search-title">Search</h1>
        <Link className="btn btn-sm search-discover" to="/discover">
          <Compass size={16} aria-hidden="true" /> Discover
        </Link>
      </div>
      <div className="search-box">
        <form
          className="search-input"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            input.current?.blur();
          }}
        >
          <SearchIcon size={20} aria-hidden="true" />
          <input ref={input} autoFocus type="search" enterKeyHint="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Title, or describe it: dark revenge manhwa..." aria-label="Search titles" autoComplete="off" spellCheck={false} />
          {text && (
            <button type="button" className="icon-btn" aria-label="Clear search" onClick={() => (setText(""), input.current?.focus())}>
              <X size={18} />
            </button>
          )}
        </form>
        <div className="filter-bar" aria-label="Quick filters">
          <button className="chip chip-filter" onClick={() => setSheet(true)} aria-label={`All filters${filterCount ? `, ${filterCount} active` : ""}`}>
            <SlidersHorizontal size={15} /> Filters{filterCount ? ` · ${filterCount}` : ""}
          </button>
          {KINDS.map(([k, l]) => (
            <button key={k} className="chip" aria-pressed={fKinds.includes(k)} onClick={() => toggleParam("kind", k)}>
              {l}
            </button>
          ))}
          <button className="chip" aria-pressed={fStatus.includes("completed")} onClick={() => toggleParam("status", "completed")}>
            Completed
          </button>
          {fTags.map((t) => (
            <button key={t} className="chip" aria-pressed="true" onClick={() => toggleParam("tag", t)} aria-label={`Remove ${t}`}>
              {t} <X size={13} />
            </button>
          ))}
          {filterCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
        {tagSuggest.length > 0 && (
          <div className="suggest-row" aria-label="Genre suggestions">
            {tagSuggest.map((t) => (
              <button
                key={t.name}
                className="suggest"
                onClick={() => {
                  setText(text.trim().split(/\s+/).slice(0, -1).join(" "));
                  toggleParam("tag", t.name);
                }}
              >
                <small>{t.group === "genre" ? "Genre" : t.group === "theme" ? "Theme" : "Tag"}</small> {t.name}
              </button>
            ))}
          </div>
        )}
        {hasQuery && intent.chips.length > 0 && !exactTitle && (
          <div className="chips understood" aria-label="Understood filters">
            <span className="understood-label">Understood</span>
            {intent.chips.map((c) => (
              <span key={c.id} className={`chip ${c.where === "local" ? "chip-local" : ""} ${c.negative ? "chip-neg" : ""}`} title={c.where === "local" ? "Applied on this device after fetching results" : "Sent to the catalogue as a filter"}>
                {c.label}
                {c.where === "local" && <small>on device</small>}
              </span>
            ))}
          </div>
        )}
      </div>

      {!showResults && (
        <div className="search-home">
          {recent.length > 0 && (
            <section className="section">
              <div className="section-head">
                <div className="section-titles">
                  <h2>Recent searches</h2>
                </div>
                <button className="btn btn-sm btn-ghost" onClick={() => (localStorage.removeItem(recentKey(profileId)), setRecent([]))}>
                  Clear all
                </button>
              </div>
              <ul className="recent-list">
                {recent.map((r) => (
                  <li key={r}>
                    <button className="recent-q" onClick={() => setText(r)}>
                      <Clock size={16} /> <span className="recent-text">{r}</span>
                    </button>
                    <button className="icon-btn" aria-label={`Remove "${r}" from recent searches`} onClick={() => removeRecent(r)}>
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!trending.isError && (!trending.data || trending.data.items.length > 0) && (
            <section className="section" aria-labelledby="trend-h">
              <div className="section-head">
                <div className="section-titles">
                  <h2 id="trend-h">What everyone's reading</h2>
                  <p>Most-followed series first published this year</p>
                </div>
                <Link className="see-all" to={`/discover?year=${new Date().getFullYear()}`}>
                  See all
                </Link>
              </div>
              {trending.data ? (
                <div className="row-track">
                  {trending.data.items.slice(0, 10).map((t, n) => (
                    <TitleCard key={t.key} title={t} context="trending" rank={n + 1} />
                  ))}
                </div>
              ) : (
                <RowSkeleton count={6} />
              )}
            </section>
          )}
          <section className="section" aria-labelledby="cat-h">
            <div className="section-head">
              <div className="section-titles">
                <h2 id="cat-h">Browse categories</h2>
              </div>
            </div>
            <ul className="cat-tiles">
              {CATEGORIES.map((c) => (
                <CategoryTile key={c.label} {...c} />
              ))}
            </ul>
          </section>
          <section className="section">
            <div className="section-head">
              <div className="section-titles">
                                <h2>Try describing it</h2>
                <p>Search understands formats, genres, themes, length and "similar to", on your device.</p>
              </div>
            </div>
            <div className="example-list">
              {EXAMPLES.map((e) => (
                <button key={e} className="example" onClick={() => setText(e)}>
                  <span>"{e}"</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {showResults && (
        <div style={{ marginTop: 8 }}>
          {!pending && titleHits.length > 0 && (
            <section className="section title-hits" aria-labelledby="hits-h">
              <div className="section-head">
                <div className="section-titles">
                  <h2 id="hits-h">Titles matching "{q}"</h2>
                </div>
              </div>
              <TitleGrid items={titleHits} context="search-title" highlight={q} />
              <h2 className="hits-then">Matching your description</h2>
            </section>
          )}
          {!(active.isError && !items.length) && (
          <div className="result-head">
            <p className="result-count" aria-live="polite">
              {pending ? "Searching..." : active.data ? (items.length ? `${items.length}${structured && intentQ.data?.hasMore ? "+" : ""} ${items.length === 1 ? "title" : "titles"}` : "No titles") : active.isError ? (online ? "Couldn't search" : "Offline") : online ? "Searching..." : "Offline"}
            </p>
            <select className="select select-sm" aria-label="Sort results" value={fOrder ?? ""} onChange={(e) => setParam("order", e.target.value || undefined)}>
              {SORTS.map(([o, l]) => (
                <option key={o || "best"} value={o}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          )}
          {structured && intentQ.data && (intentQ.data.seed || intentQ.data.seedMissing || local.length > 0 || intentQ.data.downgraded.length > 0) && (
            <p className="muted result-note">
              {intentQ.data.seed ? `Ranked by similarity to ${intentQ.data.seed.title}. ` : ""}
              {intentQ.data.seedMissing ? `Couldn't find "${intent.similarTo}" in the catalogue, so this uses the other filters only. ` : ""}
              {local.length || intentQ.data.downgraded.length ? `Filtered on this device: ${intentQ.data.removedLocally} of ${intentQ.data.scanned} fetched titles removed.` : ""}
              {intentQ.data.downgraded.length ? ` Not supported by the catalogue, applied locally: ${intentQ.data.downgraded.join(", ")}.` : ""}
              {intentQ.data.unavailable.length ? ` Not applied, because the catalogue does not provide the data: ${intentQ.data.unavailable.join(", ")}.` : ""}
            </p>
          )}
          {active.isError && !items.length ? (
            <ErrorState error={active.error} retry={() => void active.refetch()} />
          ) : pending || active.isLoading || (structured && !intentQ.data) ? (
            <GridSkeleton count={12} />
          ) : !items.length ? (
            <EmptyState title={q ? `Nothing found for "${q}"` : "Nothing matches these filters"} action={filterCount > 0 ? <button className="btn" onClick={clearFilters}>Clear filters</button> : undefined}>
              {structured ? "Try fewer filters, or rephrase. Filters marked on device can only check titles that were fetched." : "Check the spelling, or search all sources below."}
            </EmptyState>
          ) : (
            <TitleGrid items={items} context="search" highlight={structured ? undefined : q} />
          )}
          {!structured && q.length >= 2 && online && !apiUnreachable && !active.isError && (
            <div style={{ marginTop: 28 }}>
              <AllSources q={q} />
            </div>
          )}
        </div>
      )}
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Filters">
        {filters}
        <div className="sheet-foot">
          {filterCount > 0 && (
            <button className="btn" onClick={clearFilters}>
              Clear
            </button>
          )}
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setSheet(false)}>
            Show results
          </button>
        </div>
      </Sheet>
    </div>
  );
}
