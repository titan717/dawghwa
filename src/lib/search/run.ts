import { api } from "../api/endpoints";
import { isApiError } from "../api/errors";
import { cacheTitles } from "../store/db";
import { cosineSparse, vectorize } from "../intel/features";
import { fromResult, type Title } from "../titles";
import { toBrowseQuery, hasLocalFilters, type Intent } from "./intent";
import { applyLocal, textScore } from "./local";

export const BROWSE_SOURCE = "mangadex";

export interface IntentResult {
  items: Title[];
  /** Seed title for "similar to". */
  seed?: Title;
  seedMissing?: boolean;
  scanned: number;
  removedLocally: number;
  hasMore: boolean;
  nextOffset: number;
  /** Filter names the API rejected (unknown tags) and that were applied locally instead. */
  downgraded: string[];
  /** Filters that could not be judged because the catalogue does not return the data they need; they were not applied. */
  unavailable: string[];
  /** A later page failed: `items` holds what loaded before it. */
  partial?: boolean;
}

const PAGE = 100;

/**
 * Execute a structured intent: server filters via the catalogue (GET /api/catalog), then local
 * filters over successive pages until enough results are found (bounded so a
 * very narrow local filter cannot hammer the API).
 */
export async function runIntent(i: Intent, opts: { signal?: AbortSignal; want?: number; offset?: number; maxPages?: number; seed?: Title } = {}): Promise<IntentResult> {
  const want = opts.want ?? 30;
  const maxPages = opts.maxPages ?? (hasLocalFilters(i) ? 4 : 1);
  let seed: Title | undefined;
  let seedMissing = false;
  const q = { ...toBrowseQuery(i), source: BROWSE_SOURCE };
  const downgraded: string[] = [];
  const unavailable = new Set<string>();
  let li: Intent = i;

  if (opts.seed?.meta?.genres?.length) {
    seed = opts.seed;
    q.includedTags = [...new Set([...(q.includedTags ?? []), ...seed.meta!.genres!.slice(0, 2)])];
    if (!q.kinds?.length && seed.meta?.kind) q.kinds = [seed.meta.kind];
    q.order = i.order ?? "popular";
    delete q.query;
  } else if (i.similarTo) {
    const found = await api.browse({ source: BROWSE_SOURCE, query: i.similarTo, order: "relevance", limit: 10 }, { signal: opts.signal });
    const cands = found.items.map((r) => fromResult(r, found.sourceId, found.source));
    seed = cands.map((t) => ({ t, s: textScore(t, i.similarTo!) })).sort((a, b) => b.s - a.s)[0]?.t;
    if (!seed || textScore(seed, i.similarTo) < 0.5) {
      seedMissing = true;
      seed = undefined;
    } else {
      // seed's strongest genres become the server query; similarity ranks locally
      const genres = (seed.meta?.genres ?? []).slice(0, 2);
      q.includedTags = [...new Set([...(q.includedTags ?? []), ...genres])];
        if (!q.kinds?.length && seed.meta?.kind) q.kinds = [seed.meta.kind];
      q.order = i.order ?? "popular";
      delete q.query;
    }
  }

  const out: Title[] = [];
  let offset = opts.offset ?? 0;
  let scanned = 0;
  let removed = 0;
  let hasMore = true;
  let partial = false;
  for (let page = 0; page < maxPages && out.length < want && hasMore; page++) {
    let res;
    try {
      res = await api.browse({ ...q, offset, limit: PAGE }, { signal: opts.signal });
    } catch (e) {
      // an unknown tag for this source: drop it from the server query, keep it as a local filter
      const unknown = isApiError(e) ? (((e.details?.unknown ?? e.details?.unknownTags) as string[] | undefined) ?? []) : [];
      if (unknown.length && page === 0) {
        downgraded.push(...unknown);
        q.includedTags = q.includedTags?.filter((x) => !unknown.includes(x));
        q.excludedTags = q.excludedTags?.filter((x) => !unknown.includes(x));
        page--;
        continue;
      }
      // a later page failed: keep what loaded (a partial result), unless the search was cancelled
      if (page > 0 && out.length && !opts.signal?.aborted) {
        partial = true;
        break;
      }
      throw e;
    }
    const titles = res.items.map((r) => fromResult(r, res.sourceId, res.source));
    void cacheTitles(titles);
    scanned += titles.length;
    // never silently empty a search: a filter whose data the catalogue does not return is skipped and reported
    if (page === 0 || unavailable.size) {
      if (i.hiddenGems && titles.length && titles.every((t) => t.follows === undefined)) {
        unavailable.add("Hidden gems (needs follower counts)");
        li = { ...li, hiddenGems: false };
      }
      if (i.anyTags.length && titles.length && titles.every((t) => !t.meta?.tags)) {
        unavailable.add("Moods (need tags)");
        li = { ...li, anyTags: [] };
      }
      if ((i.includeThemes.length || i.excludeThemes.length) && titles.length && titles.every((t) => !t.meta?.description)) {
        unavailable.add("Story themes (need synopses)");
        li = { ...li, includeThemes: [], excludeThemes: [] };
      }
      if (i.demographic.length && titles.length && titles.every((t) => !t.meta?.demographic)) {
        unavailable.add("Demographic");
        li = { ...li, demographic: [] };
      }
    }
    const local = applyLocal(titles, li);
    removed += local.removed + local.unknown;
    out.push(...local.kept.filter((t) => t.key !== seed?.key));
    offset += titles.length;
    hasMore = res.pagination.hasMore && titles.length > 0;
  }

  let items = out;
  if (seed) {
    const sv = vectorize(seed);
    items = out
      .map((t) => ({ t, s: cosineSparse(sv, vectorize(t)) + Math.log10(1 + (t.follows ?? 0)) * 0.02 }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.t);
  } else if (i.text) {
    items = out.map((t, idx) => ({ t, s: textScore(t, i.text) * 2 - idx / out.length })).sort((a, b) => b.s - a.s).map((x) => x.t);
  }
  return { items, seed, seedMissing, scanned, removedLocally: removed, hasMore, nextOffset: offset, downgraded, unavailable: [...unavailable], partial };
}
