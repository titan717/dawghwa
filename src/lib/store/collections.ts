import type { LibraryRecord } from "./db";

/**
 * Library collections (Spec O), stored per profile in the `kv` row `collections:<profileId>`.
 *
 * v1 had no collection records: membership lived only in `LibraryRecord.collections`
 * (names). v2 adds ids, order and per-collection title order. The v1 field is never
 * removed and keeps being written by name, so it is the backup and export/import stays
 * compatible; deleting the kv row returns the app to v1 behaviour exactly.
 */
export interface Collection {
  id: string;
  name: string;
  titleIds: string[];
  order: number;
  createdAt: number;
}
export interface LibraryV2 {
  v: 2;
  collections: Collection[];
}

export const collectionsKey = (profileId: string) => `collections:${profileId}`;

const isStr = (x: unknown): x is string => typeof x === "string" && x.length > 0;
const uniq = <T,>(xs: T[]) => [...new Set(xs)];

/** Stable id for a collection created from a v1 name (same name -> same id, so migration is idempotent). */
export function idFromName(name: string): string {
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619) >>> 0;
  return `c-${h.toString(36)}`;
}

function cleanV2(raw: { collections: unknown[] }, known?: Set<string>): LibraryV2 {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const out: Collection[] = [];
  for (const c of raw.collections) {
    const o = c as Partial<Collection> | null;
    if (!o || !isStr(o.id) || !isStr(o.name)) continue;
    const name = o.name.trim();
    if (!name || seenIds.has(o.id) || seenNames.has(name.toLowerCase())) continue;
    seenIds.add(o.id);
    seenNames.add(name.toLowerCase());
    const titleIds = uniq((Array.isArray(o.titleIds) ? o.titleIds : []).filter(isStr)).filter((t) => !known || known.has(t));
    out.push({ id: o.id, name, titleIds, order: Number.isFinite(o.order) ? o.order! : out.length, createdAt: Number.isFinite(o.createdAt) ? o.createdAt! : 0 });
  }
  return { v: 2, collections: normalise(out) };
}

/**
 * Migration on read. `raw` is the kv value (anything, including undefined);
 * `records` are the profile's library rows (the v1 source of truth).
 * - v2 input: cleaned (bad rows dropped, duplicate ids/names and titles removed, dangling titles dropped when records are given).
 * - anything else: built from the distinct names in `records[].collections`, collections ordered
 *   by when their first title was added, titles by `addedAt`. No title is lost and none is duplicated.
 * No default "Saved" collection is created: Saved is a status tab, not a collection.
 */
export function migrateLibrary(raw: unknown, records: Pick<LibraryRecord, "titleKey" | "collections" | "addedAt">[] = []): LibraryV2 {
  const o = raw as { v?: unknown; collections?: unknown } | null | undefined;
  if (o && o.v === 2 && Array.isArray(o.collections)) {
    return cleanV2({ collections: o.collections }, records.length ? new Set(records.map((r) => r.titleKey)) : undefined);
  }
  const byName = new Map<string, { name: string; first: number; titles: { key: string; at: number }[] }>();
  for (const r of records) {
    for (const n of uniq((r.collections ?? []).map((c) => c.trim()).filter(Boolean))) {
      const k = n.toLowerCase();
      const g = byName.get(k) ?? { name: n, first: Infinity, titles: [] };
      g.first = Math.min(g.first, r.addedAt);
      if (!g.titles.some((t) => t.key === r.titleKey)) g.titles.push({ key: r.titleKey, at: r.addedAt });
      byName.set(k, g);
    }
  }
  const collections = [...byName.values()]
    .sort((a, b) => a.first - b.first || a.name.localeCompare(b.name))
    .map((g, i) => ({
      id: idFromName(g.name.toLowerCase()),
      name: g.name,
      titleIds: g.titles.sort((a, b) => a.at - b.at || a.key.localeCompare(b.key)).map((t) => t.key),
      order: i,
      createdAt: Number.isFinite(g.first) ? g.first : 0,
    }));
  return { v: 2, collections };
}

/** Sorted by `order`, with `order` rewritten to 0..n-1. */
export function normalise(list: Collection[]): Collection[] {
  return [...list].sort((a, b) => a.order - b.order).map((c, k) => (c.order === k ? c : { ...c, order: k }));
}

/** Keyboard alternative to drag reorder: swap with the neighbour. Edges and unknown ids are no-ops. */
export function moveCollection(list: Collection[], id: string, dir: -1 | 1): Collection[] {
  const sorted = normalise(list);
  const i = sorted.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= sorted.length) return sorted;
  [sorted[i], sorted[j]] = [sorted[j]!, sorted[i]!];
  return sorted.map((c, k) => ({ ...c, order: k }));
}

/** First four cover title ids for the 2x2 mosaic. */
export const mosaicIds = (c: Collection) => c.titleIds.slice(0, 4);
