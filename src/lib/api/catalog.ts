import { request } from "./client";
import type { BrowseOrder, BrowseQuery, BrowseResponse, BrowseVocabulary, MangaKind, MangaMetadata, SearchResult } from "./types";

/**
 * Adapter over the API's metadata catalogue (`GET /api/catalog`,
 * `/api/catalog/filters`, `/api/titles/{ref}`). The rest of the app speaks
 * `BrowseQuery`/`SearchResult`; this module translates to the catalogue's
 * documented parameters and back. It never invents fields: anything the API
 * did not return stays undefined.
 *
 * The catalogue provider is MangaDex so catalogue ids are the same ids the
 * reader uses for chapters and pages.
 *
 * What the API applies vs. what is applied here (transparently, see
 * `localOnly`): the API advertises its filters in `capabilities.filters`.
 * When it lists `formats`, `statuses` and `demographics`, several formats,
 * several statuses and demographics are server filters. Against an older API
 * that only knows single values they are filtered on this device over the
 * returned page (reported as `filteredLocally`). "Match any tag" needs the
 * server's `genreMode` filter; without it the request is refused, never
 * silently sent as "match all".
 */

export const CATALOG_PROVIDER = "mangadex";

export interface CatalogItem {
  ref: string;
  provider: string;
  providerId: string;
  title: string;
  altTitles: string[];
  url: string;
  coverImage?: string;
  format?: string;
  status?: string;
  year?: number;
  genres: string[];
  score?: number;
  adult: boolean;
  latestChapter?: number;
  description?: string;
  tagNames?: string[];
  demographic?: string;
}

export interface CatalogResponse {
  provider: string;
  items: CatalogItem[];
  pageInfo: { page: number; limit: number; total?: number; hasNextPage: boolean };
  attribution?: { name: string; url: string; terms: string };
  meta?: { cache?: "hit" | "stale" | "miss" | "bypass"; age?: number };
}

export interface CatalogFilters {
  provider: string;
  capabilities: { filters: string[]; sorts: string[]; formats: string[]; statuses: string[]; demographics?: string[]; maxLimit: number; maxDepth?: number };
  genres: string[];
  tags: { name: string; group?: string; adult?: boolean }[];
}

export interface TitleDetail extends CatalogItem {
  titles?: { english?: string; romaji?: string; native?: string };
  bannerImage?: string;
  tags: { name: string; group?: string; rank?: number; spoiler?: boolean }[];
  authors: string[];
  artists: string[];
  chapters?: number;
  volumes?: number;
  popularity?: number;
  countryOfOrigin?: string;
  originalLanguage?: string;
  links: { site: string; url: string; type?: string }[];
  updatedAt?: string;
}

const SORT: Record<BrowseOrder, string> = {
  popular: "popularity",
  rating: "score",
  latest: "updated",
  new: "newest",
  relevance: "relevance",
  title: "title",
};
const ORDER_FROM_SORT = Object.fromEntries(Object.entries(SORT).map(([k, v]) => [v, k])) as Record<string, BrowseOrder>;
const KINDS: MangaKind[] = ["manga", "manhwa", "manhua"];

type Opt = { signal?: AbortSignal };

let filtersPromise: Promise<CatalogFilters> | undefined;
let filtersFailedAt = 0;
/** A failed vocabulary fetch is remembered this long, so a tripped upstream isn't hammered by every consumer. */
const FILTERS_FAILURE_TTL = 20_000;
/** Forget a remembered failure (an explicit Retry). */
export function clearCatalogFiltersFailure() {
  if (filtersFailedAt) {
    filtersFailedAt = 0;
    filtersPromise = undefined;
  }
}
/** Filter vocabulary, fetched once per session (the API caches it for 24h). */
export function catalogFilters(o: Opt = {}): Promise<CatalogFilters> {
  if (filtersFailedAt && Date.now() - filtersFailedAt > FILTERS_FAILURE_TTL) clearCatalogFiltersFailure();
  filtersPromise ??= request<CatalogFilters>(`/api/catalog/filters?provider=${CATALOG_PROVIDER}`, { timeoutMs: 15_000 }).catch((e) => {
    filtersFailedAt = Date.now();
    throw e;
  });
  if (!o.signal) return filtersPromise;
  return new Promise((resolve, reject) => {
    o.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    filtersPromise!.then(resolve, reject);
  });
}

/** Server-side filters the catalogue advertises. Exported for tests. */
export type ServerFilters = ReadonlySet<string>;
const NONE: ServerFilters = new Set();

/** Which parts of a query the catalogue cannot apply (applied locally by `browseCatalog`). */
export function localOnly(q: BrowseQuery, server: ServerFilters = NONE): string[] {
  const out: string[] = [];
  if ((q.kinds?.length ?? 0) > 1 && !server.has("formats")) out.push("kinds");
  if ((q.status?.length ?? 0) > 1 && !server.has("statuses")) out.push("status");
  if (q.demographic?.length && !server.has("demographics")) out.push("demographic");
  return out;
}

export class UnsupportedFilterError extends Error {
  readonly code = "VALIDATION_ERROR";
  constructor(readonly filter: string) {
    super(`The catalogue cannot apply "${filter}" right now. Remove it to keep browsing.`);
    this.name = "UnsupportedFilterError";
  }
}

/** Translate to `/api/catalog` search params. Exported for tests. */
export function toCatalogParams(q: BrowseQuery, genres: Set<string>, server: ServerFilters = NONE): URLSearchParams {
  const p = new URLSearchParams({ provider: CATALOG_PROVIDER });
  const limit = Math.max(1, Math.min(100, q.limit ?? 30));
  const offset = Math.max(0, q.offset ?? 0);
  p.set("limit", String(limit));
  p.set("page", String(Math.floor(offset / limit) + 1));
  if (q.query) p.set("q", q.query);
  p.set("sort", SORT[q.order ?? (q.query ? "relevance" : "popular")]);
  const kinds = q.kinds ?? [];
  if (kinds.length === 1 || (kinds.length > 1 && server.has("formats"))) for (const k of kinds) p.append("format", k);
  const status = q.status ?? [];
  if (status.length === 1 || (status.length > 1 && server.has("statuses"))) for (const s of status) p.append("status", s);
  if (server.has("demographics")) for (const d of q.demographic ?? []) p.append("demographic", d);
  if (q.year) p.set("year", String(q.year));
  const included = q.includedTags ?? [];
  for (const t of included) p.append(genres.has(t.toLowerCase()) ? "genre" : "tag", t);
  if (q.tagMode === "any" && included.length > 1) {
    if (!server.has("genreMode")) throw new UnsupportedFilterError("match any tag");
    p.set("genreMode", "or");
  }
  // the catalogue's excludeGenre accepts any MangaDex tag name
  for (const t of q.excludedTags ?? []) p.append("excludeGenre", t);
  return p;
}

const lc = (s?: string) => s?.toLowerCase();

/** Map a catalogue item to the app's result shape. Exported for tests. */
export function toResult(it: CatalogItem): SearchResult {
  const kind = KINDS.includes(it.format as MangaKind) ? (it.format as MangaKind) : undefined;
  // tags only when the API sent the full tag list; genres alone would make tag checks wrongly fail
  const tags = it.tagNames;
  const metadata: MangaMetadata = {
    altTitles: it.altTitles,
    genres: it.genres,
    tags,
    themes: it.tagNames ? it.tagNames.filter((t) => !it.genres.includes(t)) : undefined,
    kind,
    status: it.status && it.status !== "unknown" ? it.status : undefined,
    year: it.year,
    description: it.description,
    demographic: it.demographic,
    contentRating: it.adult ? "erotica" : undefined,
    lastChapter: it.latestChapter,
  };
  return {
    id: it.providerId,
    title: it.title,
    url: it.url,
    coverImage: it.coverImage,
    latestChapter: it.latestChapter ?? 0,
    lastUpdated: "",
    // catalogue scores are 0-100; the app uses a 0-10 scale
    rating: it.score !== undefined ? Math.round(it.score) / 10 : undefined,
    metadata: Object.fromEntries(Object.entries(metadata).filter(([, v]) => v !== undefined)) as MangaMetadata,
  };
}

function keepLocal(r: SearchResult, q: BrowseQuery, local: string[]): boolean {
  const m = r.metadata ?? {};
  if (local.includes("kinds") && !(m.kind && q.kinds!.includes(m.kind))) return false;
  if (local.includes("status") && !(m.status && (q.status as string[]).includes(m.status))) return false;
  if (local.includes("demographic") && !(m.demographic && (q.demographic as string[]).includes(lc(m.demographic)!))) return false;
  return true;
}

/** Whether a browse request needs the catalogue's filter vocabulary/capabilities. */
export function needsCatalogFilters(q: BrowseQuery): boolean {
  return Boolean(
    q.includedTags?.length ||
    q.excludedTags?.length ||
    q.demographic?.length ||
    (q.kinds?.length ?? 0) > 1 ||
    (q.status?.length ?? 0) > 1,
  );
}

export async function browseCatalog(q: BrowseQuery, o: Opt = {}): Promise<BrowseResponse & { attribution?: CatalogResponse["attribution"]; filteredLocally: number }> {
  // Keep the first catalogue request fast for the common, unfiltered browse/search path.
  // Vocabulary is only needed to classify tags or negotiate server filter capabilities.
  const f = needsCatalogFilters(q) ? await catalogFilters(o) : undefined;
  const genres = new Set(f?.genres.map((g) => g.toLowerCase()) ?? []);
  const server: ServerFilters = new Set(f?.capabilities.filters ?? []);
  const params = toCatalogParams(q, genres, server);
  const res = await request<CatalogResponse>(`/api/catalog?${params}`, { signal: o.signal, timeoutMs: 20_000 });
  const all = res.items.map(toResult);
  const local = localOnly(q, server);
  const items = local.length ? all.filter((r) => keepLocal(r, q, local)) : all;
  const limit = Number(params.get("limit"));
  const offset = (res.pageInfo.page - 1) * limit;
  const total = res.pageInfo.total ?? offset + all.length;
  return {
    items,
    total,
    pagination: { offset, limit, returned: all.length, total, hasMore: res.pageInfo.hasNextPage },
    source: "MangaDex",
    sourceId: CATALOG_PROVIDER,
    meta: res.meta,
    attribution: res.attribution,
    filteredLocally: all.length - items.length,
  };
}

export async function catalogVocabulary(o: Opt = {}): Promise<BrowseVocabulary> {
  const f = await catalogFilters(o);
  return {
    source: "MangaDex",
    sourceId: CATALOG_PROVIDER,
    tags: [...f.genres.map((name) => ({ name, group: "genre" })), ...f.tags.map((t) => ({ name: t.name, group: t.group ?? "theme" }))],
    kinds: KINDS.filter((k) => f.capabilities.formats.includes(k)),
    status: f.capabilities.statuses,
    // only offered when the server can filter by it; never a page-local guess
    demographic: f.capabilities.filters.includes("demographics") ? (f.capabilities.demographics ?? []) : [],
    orders: f.capabilities.sorts.map((s) => ORDER_FROM_SORT[s]).filter((x): x is BrowseOrder => Boolean(x)),
    server: {
      multiKind: f.capabilities.filters.includes("formats"),
      multiStatus: f.capabilities.filters.includes("statuses"),
      demographic: f.capabilities.filters.includes("demographics"),
      tagMode: f.capabilities.filters.includes("genreMode"),
    },
    maxOffset: f.capabilities.maxDepth ?? 10_000,
    maxLimit: f.capabilities.maxLimit,
  };
}

/** Full metadata for one title, as the app's `MangaMetadata`. */
export async function catalogTitle(id: string, o: Opt = {}) {
  const r = await request<{ title: TitleDetail; attribution?: CatalogResponse["attribution"] }>(`/api/titles/${encodeURIComponent(`${CATALOG_PROVIDER}:${id}`)}`, {
    signal: o.signal,
    timeoutMs: 20_000,
  });
  const t = r.title;
  const base = toResult(t);
  const tagNames = t.tags.map((x) => x.name);
  const meta: MangaMetadata = {
    ...base.metadata,
    tags: [...new Set([...t.genres, ...tagNames])],
    themes: t.tags.filter((x) => x.group === "theme").map((x) => x.name),
    formats: t.tags.filter((x) => x.group === "format").map((x) => x.name),
    longStrip: tagNames.includes("Long Strip") || undefined,
    authors: t.authors,
    artists: t.artists,
    originalLanguage: t.originalLanguage,
    updatedAt: t.updatedAt,
    lastChapter: t.chapters ?? t.latestChapter,
  };
  return {
    manga: { title: t.title, id: t.providerId, url: t.url, coverImage: t.coverImage, metadata: Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined)) as MangaMetadata },
    source: "MangaDex",
    sourceId: CATALOG_PROVIDER,
    attribution: r.attribution,
    links: t.links,
  };
}
