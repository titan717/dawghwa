import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Grid2x2, Grid3x3, SlidersHorizontal, X } from "lucide-react";
import { updateSettings, useSettings } from "@/lib/settings";
import { DiscoverHub } from "./DiscoverHub";
import { TitleGrid } from "@/components/Grid";
import { EmptyState, GridSkeleton } from "@/components/States";
import { PartialNote, ResultsError } from "@/components/DiscoveryStates";
import { Sheet } from "@/components/Layer";
import { Segmented } from "@/components/Segmented";
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
const DEMO_LABELS: Record<string, string> = { shounen: "Shounen", shoujo: "Shoujo", seinen: "Seinen", josei: "Josei", none: "No demographic" };
const YEARS_BACK = 60;

/**
 * Catalogue browser over GET /api/catalog. Every control maps to a catalogue
 * filter and lives in the URL (shareable, back/forward safe):
 *   kind, status, demographic  comma lists (several values match any)
 *   tag, without               included / excluded tags
 *   match=any                  included tags match any instead of all
 *   year, order
 * Multi-value controls and demographic/match-any only appear when the API
 * advertises them (vocab.server); otherwise format/status are single-choice.
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
  const demographic = list(params, "demographic") as NonNullable<BrowseQuery["demographic"]>;
  const tagMode: "all" | "any" = params.get("match") === "any" ? "any" : "all";
  const order = (params.get("order") as BrowseOrder) || "popular";
  const THIS_YEAR = new Date().getFullYear();
  const year = Number(params.get("year")) || undefined;
  useHead({ title: "Discover manga, manhwa and manhua", path: "/discover", description: "Browse manga, manhwa and manhua by genre, theme, status and format." });

  const query: BrowseQuery = useMemo(
    () => ({
      kinds: kinds.length ? kinds : undefined,
      status: status.length ? status : undefined,
      demographic: demographic.length ? demographic : undefined,
      includedTags: tags.length ? tags : undefined,
      tagMode: tagMode === "any" && tags.length > 1 ? tagMode : undefined,
      excludedTags: without.length ? without : undefined,
      order,
      year,
    }),
    [params], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const q = useBrowseInfinite(query, 30);
  const items = useMemo(() => {
    const seen = new Set<string>();
    return (q.data?.pages ?? []).flatMap((p) => p.items).filter((t) => !ctx.exclude?.has(t.key) && !seen.has(t.key) && seen.add(t.key));
  }, [q.data, ctx.exclude]);
  const total = q.data?.pages[0]?.total;
  const approx = (q.data?.pages ?? []).some((p) => p.filteredLocally > 0);
  const server = vocab.data?.server;
  const maxOffset = vocab.data?.maxOffset ?? 10_000;

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
  const active = kinds.length + status.length + demographic.length + tags.length + without.length + (year ? 1 : 0);
  const drop = (k: string, v: string) => setOne(k, list(params, k).filter((x) => x !== v).join(",") || undefined);
  // several values when the server can OR them; otherwise one at a time
  const pick = (k: string, v: string, multi = false) => {
    const cur = list(params, k);
    if (multi) return setOne(k, (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(",") || undefined);
    setOne(k, cur.length === 1 && cur[0] === v ? undefined : v);
  };
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
            <button key={k} className="chip" aria-pressed={kinds.includes(k)} onClick={() => pick("kind", k, server?.multiKind)}>
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="eyebrow">Status</legend>
        <div className="chips">
          {STATUS.map((s) => (
            <button key={s} className="chip" aria-pressed={status.includes(s)} onClick={() => pick("status", s, server?.multiStatus)}>
              {cap(s)}
            </button>
          ))}
        </div>
      </fieldset>
      {(vocab.data?.demographic.length ?? 0) > 0 && (
        <fieldset>
          <legend className="eyebrow">Demographic</legend>
          <div className="chips">
            {vocab.data!.demographic.map((d) => (
              <button key={d} className="chip" aria-pressed={demographic.includes(d as never)} onClick={() => pick("demographic", d, true)}>
                {DEMO_LABELS[d] ?? cap(d)}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="eyebrow">Release year</legend>
        <select className="select" aria-label="Release year" style={{ width: "auto" }} value={year ?? ""} onChange={(e) => setOne("year", e.target.value || undefined)}>
          <option value="">Any year</option>
          {Array.from({ length: YEARS_BACK }, (_, i) => THIS_YEAR - i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
          {year && year < THIS_YEAR - YEARS_BACK + 1 ? <option value={year}>{year}</option> : null}
        </select>
      </fieldset>
      {server?.tagMode && (
        <fieldset>
          <legend className="eyebrow">Included tags must</legend>
          <Segmented label="Included tags must" value={tagMode} options={[["all", "Match all"], ["any", "Match any"]]} onChange={(m) => setOne("match", m === "any" ? "any" : undefined)} />
        </fieldset>
      )}
      {vocab.isError && <ResultsError error={vocab.error} retry={() => void vocab.refetch()} compact />}
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
          <p className="muted">
            {total !== undefined ? `${approx ? "About " : ""}${total.toLocaleString()} titles match` : "Browse the catalogue"}
          </p>
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
          {demographic.map((k) => (
            <button key={k} className="chip is-on" onClick={() => drop("demographic", k)} aria-label={`Remove ${DEMO_LABELS[k] ?? k}`}>
              {DEMO_LABELS[k] ?? cap(k)} <X size={14} />
            </button>
          ))}
          {tagMode === "any" && tags.length > 1 ? (
            <button className="chip is-on" onClick={() => setOne("match")} aria-label="Remove match any tag">
              Any of {tags.length} tags <X size={14} />
            </button>
          ) : null}
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
      {((total !== undefined && total > maxOffset) || approx) && (
        <p className="muted discover-coverage">
          {total !== undefined && total > maxOffset ? `Only the first ${maxOffset.toLocaleString()} titles can be browsed, so narrow the filters to reach the rest.` : ""}
          {approx ? " Some filters are applied on this device to each loaded page, so the count is approximate." : ""}
        </p>
      )}
      <div className="discover-layout">
        <aside className="discover-filters" aria-label="Filters">
          {filters}
        </aside>
        <div>
          {q.isError && !items.length ? (
            <ResultsError error={q.error} retry={() => void q.refetch()} />
          ) : q.isLoading ? (
            <GridSkeleton density={density} />
          ) : !items.length ? (
            <EmptyState title="No titles match these filters" action={<button className="btn" onClick={() => setParams({ view: "all" }, { replace: true })}>Clear filters</button>}>
              Try removing a filter.{tags.length > 1 ? (tagMode === "any" ? " Titles need at least one included tag." : " Titles need every included tag.") : ""}
            </EmptyState>
          ) : (
            <TitleGrid items={items} context="discover" density={density} hasMore={q.hasNextPage} loadingMore={q.isFetchingNextPage} onMore={() => void q.fetchNextPage()} />
          )}
          {q.isError && items.length > 0 && <PartialNote retry={() => void q.fetchNextPage()} />}
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
