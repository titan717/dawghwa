import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Grid2x2, Grid3x3, SlidersHorizontal, X } from "lucide-react";
import { updateSettings, useSettings } from "@/lib/settings";
import { DiscoverHub } from "./DiscoverHub";
import { TitleGrid } from "@/components/Grid";
import { EmptyState, ErrorState, GridSkeleton } from "@/components/States";
import { Sheet } from "@/components/Layer";
import { useBrowseInfinite, useVocabulary } from "@/lib/query";
import { useHead } from "@/lib/seo";
import { useRankContext } from "@/lib/feed/context";
import type { BrowseOrder, BrowseQuery, MangaKind } from "@/lib/api/types";

const KINDS: [MangaKind, string][] = [
  ["manhwa", "Manhwa"],
  ["manga", "Manga"],
  ["manhua", "Manhua"],
];
const STATUS = ["ongoing", "completed", "hiatus", "cancelled"] as const;
const ORDERS: [BrowseOrder, string][] = [
  ["popular", "Most followed"],
  ["rating", "Top rated"],
  ["latest", "Recently updated"],
  ["new", "Newly added"],
  ["title", "Title A to Z"],
];
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const TAG_GROUP_LABELS: Record<string, string> = { genre: "Genres", theme: "Themes", format: "Style & format tags", content: "Content tags" };
const list = (p: URLSearchParams, k: string) => (p.get(k) ?? "").split(",").filter(Boolean);

/**
 * Catalogue browser over GET /api/catalog. Every control maps to a server-side
 * catalogue filter: one format, one status, a release year, included tags and
 * excluded tags. The catalogue has no demographic filter, so there is none here.
 *
 * With no filters set it shows the editorial hub instead.
 */
export default function Discover() {
  const [params] = useSearchParams();
  const hub = [...params.keys()].length === 0;
  useHead({ title: "Discover manga, manhwa and manhua", path: "/discover", description: "Browse manga, manhwa and manhua by genre, theme, status and format." });
  return hub ? <DiscoverHub /> : <Catalogue />;
}

/** Catalogue browser. Every filter maps 1:1 to a server-side /api/browse filter. */
function Catalogue() {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const settings = useSettings();
  const vocab = useVocabulary();
  const ctx = useRankContext();
  const kinds = list(params, "kind") as MangaKind[];
  const status = list(params, "status") as BrowseQuery["status"] & string[];
  const tags = list(params, "tag");
  const without = list(params, "without");
  const order = (params.get("order") as BrowseOrder) || "popular";
  const THIS_YEAR = new Date().getFullYear();
  const year = Number(params.get("year")) || undefined;
  useHead({ title: "Discover manga, manhwa and manhua", path: "/discover", description: "Browse manga, manhwa and manhua by genre, theme, status and format." });

  const query: BrowseQuery = useMemo(
    () => ({ kinds: kinds.length ? kinds : undefined, status: status.length ? status : undefined, includedTags: tags.length ? tags : undefined, excludedTags: without.length ? without : undefined, order, year }),
    [params], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const q = useBrowseInfinite(query, 30);
  const items = useMemo(() => {
    const seen = new Set<string>();
    return (q.data?.pages ?? []).flatMap((p) => p.items).filter((t) => !ctx.exclude?.has(t.key) && !seen.has(t.key) && seen.add(t.key));
  }, [q.data, ctx.exclude]);
  const total = q.data?.pages[0]?.total;

  const setOne = (k: string, v?: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };
  const tagGroups = useMemo(() => {
    const g = new Map<string, string[]>();
    for (const t of vocab.data?.tags ?? []) if (t.group !== "content") g.set(t.group, [...(g.get(t.group) ?? []), t.name]);
    return [...g.entries()].map(([k, v]) => [k, v.sort()] as const);
  }, [vocab.data]);
  const active = kinds.length + status.length + tags.length + without.length + (year ? 1 : 0);
  const drop = (k: string, v: string) => setOne(k, list(params, k).filter((x) => x !== v).join(",") || undefined);
  // the catalogue filters one format and one status at a time
  const pick = (k: string, v: string) => setOne(k, list(params, k).length === 1 && list(params, k)[0] === v ? undefined : v);
  const orderLabel = ORDERS.find(([o]) => o === order)?.[1];
  const heading = active === 1 && tags.length === 1 ? tags[0]! : active === 1 && kinds.length === 1 ? cap(kinds[0]!) : active === 1 && status.length === 1 ? `${cap(status[0]!)} series` : active === 1 && year ? `Published ${year}` : active === 0 ? (order === "popular" ? "Whole catalogue" : orderLabel ?? "Catalogue") : "Filtered catalogue";

  const tri = (name: string) => (tags.includes(name) ? "include" : without.includes(name) ? "exclude" : "off");
  const cycleTag = (name: string) => {
    const p = new URLSearchParams(params);
    const inc = list(p, "tag").filter((x) => x !== name);
    const exc = list(p, "without").filter((x) => x !== name);
    const s = tri(name);
    if (s === "off") inc.push(name);
    else if (s === "include") exc.push(name);
    if (inc.length) p.set("tag", inc.join(","));
    else p.delete("tag");
    if (exc.length) p.set("without", exc.join(","));
    else p.delete("without");
    setParams(p, { replace: true });
  };

  const filters = (
    <div className="stack" style={{ gap: 20 }}>
      <fieldset>
        <legend className="eyebrow">Format</legend>
        <div className="chips">
          {KINDS.map(([k, l]) => (
            <button key={k} className="chip" aria-pressed={kinds.includes(k)} onClick={() => pick("kind", k)}>
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="eyebrow">Status</legend>
        <div className="chips">
          {STATUS.map((s) => (
            <button key={s} className="chip" aria-pressed={status.includes(s)} onClick={() => pick("status", s)}>
              {cap(s)}
            </button>
          ))}
          <button className="chip" aria-pressed={year === THIS_YEAR} onClick={() => setOne("year", year === THIS_YEAR ? undefined : String(THIS_YEAR))}>
            Published {THIS_YEAR}
          </button>
          {year && year !== THIS_YEAR ? (
            <button className="chip" aria-pressed onClick={() => setOne("year", undefined)}>
              Published {year}
            </button>
          ) : null}
        </div>
      </fieldset>
      {vocab.isError && <ErrorState error={vocab.error} retry={() => void vocab.refetch()} compact />}
      {tagGroups.length > 0 && <p className="muted filter-hint">Tags: tap once to include, again to exclude, a third time to clear.</p>}
      {tagGroups.map(([group, names]) => (
        <fieldset key={group}>
          <legend className="eyebrow">{TAG_GROUP_LABELS[group] ?? `${cap(group)} tags`}</legend>
          <div className="chips">
            {names.map((n) => {
              const s = tri(n);
              return (
                <button key={n} className={`chip ${s === "exclude" ? "chip-neg" : ""}`} aria-pressed={s !== "off"} aria-label={`${n}: ${s === "off" ? "any" : s === "include" ? "included" : "excluded"}`} onClick={() => cycleTag(n)}>
                  {s === "exclude" ? `Not ${n}` : n}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );

  const density = settings.gridDensity;
  return (
    <div className="page discover">
      <Link to="/discover" className="back-link">
        <ArrowLeft size={16} /> Discover
      </Link>
      <header className="page-head">
        <div>
          <h1>{heading}</h1>
          <p className="muted">{total !== undefined ? `${total.toLocaleString()} titles match` : "Browse the MangaDex catalogue"}</p>
        </div>
        <div className="cluster">
          <select className="select" style={{ width: "auto" }} aria-label="Sort by" value={order} onChange={(e) => setOne("order", e.target.value === "popular" ? undefined : e.target.value)}>
            {ORDERS.map(([o, l]) => (
              <option key={o} value={o}>
                {l}
              </option>
            ))}
          </select>
          <div className="density-toggle" role="radiogroup" aria-label="Grid density">
            <button type="button" role="radio" aria-checked={density === "covers"} aria-label="Large covers" title="Large covers" onClick={() => updateSettings({ gridDensity: "covers" })}>
              <Grid2x2 size={18} aria-hidden="true" />
            </button>
            <button type="button" role="radio" aria-checked={density === "compact"} aria-label="Compact grid" title="Compact grid" onClick={() => updateSettings({ gridDensity: "compact" })}>
              <Grid3x3 size={18} aria-hidden="true" />
            </button>
          </div>
          <button className="btn discover-filter-btn" onClick={() => setOpen(true)} aria-label={`Filters${active ? `, ${active} active` : ""}`}>
            <SlidersHorizontal size={16} /> Filters{active ? ` (${active})` : ""}
          </button>
        </div>
      </header>
      {active > 0 && (
        <div className="active-filters" aria-label="Active filters">
          {kinds.map((k) => (
            <button key={k} className="chip is-on" onClick={() => drop("kind", k)} aria-label={`Remove ${k}`}>
              {cap(k)} <X size={14} />
            </button>
          ))}
          {status.map((k) => (
            <button key={k} className="chip is-on" onClick={() => drop("status", k)} aria-label={`Remove ${k}`}>
              {cap(k)} <X size={14} />
            </button>
          ))}
          {tags.map((k) => (
            <button key={k} className="chip is-on" onClick={() => drop("tag", k)} aria-label={`Remove ${k}`}>
              {k} <X size={14} />
            </button>
          ))}
          {without.map((k) => (
            <button key={k} className="chip chip-neg" aria-pressed="true" onClick={() => drop("without", k)} aria-label={`Remove exclusion ${k}`}>
              Not {k} <X size={14} />
            </button>
          ))}
          {year ? (
            <button className="chip is-on" onClick={() => setOne("year")} aria-label={`Remove published ${year}`}>
              Published {year} <X size={14} />
            </button>
          ) : null}
          <button className="btn btn-ghost btn-sm" onClick={() => setParams(order !== "popular" ? { order } : { view: "all" }, { replace: true })}>
            Clear all
          </button>
        </div>
      )}
      <div className="discover-layout">
        <aside className="discover-filters" aria-label="Filters">
          {filters}
        </aside>
        <div>
          {q.isError && !items.length ? (
            <ErrorState error={q.error} retry={() => void q.refetch()} />
          ) : q.isLoading ? (
            <GridSkeleton density={density} />
          ) : !items.length ? (
            <EmptyState title="No titles match these filters" action={<button className="btn" onClick={() => setParams({ view: "all" }, { replace: true })}>Clear filters</button>}>
              Try removing a filter. Tag combinations must all match.
            </EmptyState>
          ) : (
            <TitleGrid items={items} context="discover" density={density} hasMore={q.hasNextPage} loadingMore={q.isFetchingNextPage} onMore={() => void q.fetchNextPage()} />
          )}
          {q.isError && items.length > 0 && <ErrorState error={q.error} retry={() => void q.fetchNextPage()} compact />}
        </div>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Filters">
        {filters}
        <div style={{ position: "sticky", bottom: 0, paddingTop: 16, background: "var(--bg-raised)" }}>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setOpen(false)}>
            Show {total !== undefined ? total.toLocaleString() : ""} results
          </button>
        </div>
      </Sheet>
    </div>
  );
}
