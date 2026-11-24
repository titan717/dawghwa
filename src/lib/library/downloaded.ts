import { useEffect, useState } from "react";

/**
 * Downloaded chapters per title, for the Library "Downloaded" tab (Spec G, behind FEATURE_OFFLINE).
 *
 * Interim read-only reader of PULSE's offline store until `src/lib/offline` lands
 * (contract: listDownloads(profileId) / subscribeDownloads(fn)). Store: IndexedDB
 * "dawghwa-offline", object store "chapters", records
 * `{ key: "<profileId>|<titleKey>|<n>", profileId, titleKey, n, bytes, savedAt, complete }`.
 * It never creates the database: if it doesn't exist yet, there are no downloads.
 */
export interface DownloadedChapter {
  titleKey: string;
  n: number;
  bytes: number;
  savedAt: number;
}
export interface DownloadedTitle {
  titleKey: string;
  chapters: number;
  bytes: number;
  savedAt: number;
}

const DB = "dawghwa-offline";

async function dbExists(): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  if (typeof indexedDB.databases !== "function") return true; // can't tell; opening read-only below still won't add stores
  return (await indexedDB.databases()).some((d) => d.name === DB);
}

export async function listDownloads(profileId: string): Promise<DownloadedChapter[]> {
  try {
    if (!(await dbExists())) return [];
    const d = await new Promise<IDBDatabase>((ok, no) => {
      const r = indexedDB.open(DB);
      // the database didn't exist: abort so this read never creates it
      r.onupgradeneeded = () => r.transaction?.abort();
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    });
    try {
      if (!d.objectStoreNames.contains("chapters")) return [];
      const rows = await new Promise<unknown[]>((ok, no) => {
        const r = d.transaction("chapters", "readonly").objectStore("chapters").getAll();
        r.onsuccess = () => ok(r.result as unknown[]);
        r.onerror = () => no(r.error);
      });
      return rows.flatMap((x) => {
        const o = x as Partial<DownloadedChapter> & { profileId?: string; complete?: boolean };
        return o && o.profileId === profileId && o.complete === true && typeof o.titleKey === "string" && typeof o.n === "number"
          ? [{ titleKey: o.titleKey, n: o.n, bytes: Number(o.bytes) || 0, savedAt: Number(o.savedAt) || 0 }]
          : [];
      });
    } finally {
      d.close();
    }
  } catch {
    return [];
  }
}

/** Group chapters by title, newest save first. Pure. */
export function groupByTitle(chs: DownloadedChapter[]): Map<string, DownloadedTitle> {
  const out = new Map<string, DownloadedTitle>();
  for (const c of chs) {
    const g = out.get(c.titleKey) ?? { titleKey: c.titleKey, chapters: 0, bytes: 0, savedAt: 0 };
    g.chapters += 1;
    g.bytes += c.bytes;
    g.savedAt = Math.max(g.savedAt, c.savedAt);
    out.set(c.titleKey, g);
  }
  return new Map([...out].sort((a, b) => b[1].savedAt - a[1].savedAt));
}

/** Downloaded titles for a profile; `enabled` false (flag off) means no IndexedDB access at all. */
export function useDownloadedTitles(profileId: string | undefined, enabled: boolean): { ready: boolean; titles: Map<string, DownloadedTitle> } {
  const [s, setS] = useState<{ ready: boolean; titles: Map<string, DownloadedTitle> }>({ ready: !enabled, titles: new Map() });
  useEffect(() => {
    if (!enabled || !profileId) return;
    let live = true;
    const load = () => void listDownloads(profileId).then((xs) => live && setS({ ready: true, titles: groupByTitle(xs) }));
    load();
    // refresh when the tab comes back (a download may have finished elsewhere)
    const vis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", vis);
    return () => ((live = false), document.removeEventListener("visibilitychange", vis));
  }, [profileId, enabled]);
  return s;
}
