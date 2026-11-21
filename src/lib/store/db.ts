import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Title } from "../titles";

/**
 * Local-first persistence (IndexedDB "dawghwa").
 *
 * Every private record carries `profileId` in its key, so profiles never read
 * each other's library, progress, events or model. `titles` is a shared cache
 * of public catalogue metadata only.
 *
 * Records carry `updatedAt` so a future optional cloud sync can merge
 * last-writer-wins per record without a schema rewrite.
 */

export type LibraryStatus = "reading" | "plan" | "completed" | "on_hold" | "dropped";

export interface ProfileRecord {
  id: string;
  name: string;
  color: string;
  /** Optional bounded local image data; import and display paths revalidate it. */
  avatar?: string;
  createdAt: number;
  updatedAt: number;
  onboarded: boolean;
  /** Cold-start answers. Not a learned profile. */
  prefs: { genres: string[]; kinds: string[]; avoid: string[]; personalize: boolean };
  /** Equipped cosmetics (unlocks are derived). Optional: older records have none. */
  cosmetics?: { frame?: string; emblem?: string };
  /** Opt-in weekly reading rhythm, in days per week. 0 or missing = off. */
  rhythm?: number;
  /**
   * Optional 4-digit sign-in PIN (D4): SHA-256 of salt + PIN. A privacy curtain for
   * shared devices, not security; the data itself is not encrypted.
   */
  pin?: { salt: string; hash: string };
  /** Seed for weekly quests. Missing = derived from the profile id (questSeedOf). Import keeps the original, so quests survive a move (D34). */
  questSeed?: string;
}

export interface LibraryRecord {
  profileId: string;
  titleKey: string;
  status?: LibraryStatus;
  favorite: boolean;
  /** Explicit like (1) / dislike (-1). */
  rating?: 1 | -1;
  collections: string[];
  addedAt: number;
  updatedAt: number;
}

export interface ProgressRecord {
  profileId: string;
  titleKey: string;
  /** Canonical chapter key (unified lists) or a provider chapter id (older records / single-source titles). */
  chapterId: string;
  /** The provider version being read (`<sourceId>:<providerChapterId>`), so resume reopens the same source. */
  variantId?: string;
  sourceId?: string;
  language?: string | null;
  chapterNumber: number;
  chapterTitle?: string;
  /** Page index within the chapter (0-based) and page count. */
  page: number;
  pageCount: number;
  /** 0..1 position inside the chapter (scroll fraction in vertical mode). */
  fraction: number;
  /** Vertical mode: how far (0..1 of its height) the top page is scrolled past the viewport top. */
  offset?: number;
  /** chapterId -> time it was finished (reached the end). */
  read: Record<string, number>;
  /** Highest chapter number finished. */
  maxReadNumber: number;
  startedAt: number;
  updatedAt: number;
  hidden?: boolean;
}

export interface EventRecord {
  profileId: string;
  seq: number;
  kind: string;
  titleKey: string;
  at: number;
  value?: number;
  context?: string;
}

/**
 * A chapter comment. Stored on this device for this profile only (D5); there is
 * no server and no audience. `parentId` makes it a reply, `pinned` puts it under
 * "Top", `vote` is the reader's own thumbs up/down.
 */
export interface CommentRecord {
  profileId: string;
  id: string;
  titleKey: string;
  chapterId: string;
  chapterNumber?: number;
  body: string;
  parentId?: string;
  pinned?: boolean;
  vote?: 1 | -1;
  at: number;
  updatedAt: number;
  editedAt?: number;
}

export interface Hidden {
  profileId: string;
  titleKey: string;
  reason: "not_interested" | "hide";
  at: number;
}

interface DawghwaDB extends DBSchema {
  profiles: { key: string; value: ProfileRecord };
  titles: { key: string; value: Title & { cachedAt: number } };
  library: { key: [string, string]; value: LibraryRecord; indexes: { byProfile: string } };
  progress: { key: [string, string]; value: ProgressRecord; indexes: { byProfile: string } };
  hidden: { key: [string, string]; value: Hidden; indexes: { byProfile: string } };
  events: { key: [string, number]; value: EventRecord; indexes: { byProfile: string } };
  comments: { key: [string, string]; value: CommentRecord; indexes: { byProfile: string; byChapter: [string, string] } };
  intel: { key: string; value: { profileId: string; state: unknown; updatedAt: number } };
  kv: { key: string; value: { key: string; value: unknown } };
}

/** v1: initial schema. v2: `comments` store. Upgrades are additive and tested in db.test.ts. */
export const DB_VERSION = 2;

let dbp: Promise<IDBPDatabase<DawghwaDB>> | null = null;

export function db(): Promise<IDBPDatabase<DawghwaDB>> {
  if (!dbp) {
    dbp = openDB<DawghwaDB>("dawghwa", DB_VERSION, {
      upgrade(d, oldVersion) {
        if (oldVersion < 1) {
          d.createObjectStore("profiles", { keyPath: "id" });
          d.createObjectStore("titles", { keyPath: "key" });
          d.createObjectStore("library", { keyPath: ["profileId", "titleKey"] }).createIndex("byProfile", "profileId");
          d.createObjectStore("progress", { keyPath: ["profileId", "titleKey"] }).createIndex("byProfile", "profileId");
          d.createObjectStore("hidden", { keyPath: ["profileId", "titleKey"] }).createIndex("byProfile", "profileId");
          d.createObjectStore("events", { keyPath: ["profileId", "seq"] }).createIndex("byProfile", "profileId");
          d.createObjectStore("intel", { keyPath: "profileId" });
          d.createObjectStore("kv", { keyPath: "key" });
        }
        // v2 (Phase 4): chapter comments. Additive; v1 data is untouched.
        if (oldVersion < 2) {
          const c = d.createObjectStore("comments", { keyPath: ["profileId", "id"] });
          c.createIndex("byProfile", "profileId");
          c.createIndex("byChapter", ["profileId", "chapterId"]);
        }
      },
      blocking() {
        // another tab upgraded the schema: close so it can proceed
        void dbp?.then((x) => x.close());
        dbp = null;
      },
    });
  }
  return dbp;
}

let memoryMode = false;
/** True when IndexedDB is unavailable (private mode, sandboxed iframe) and data lives in memory only. */
export const isMemoryStorage = () => memoryMode;

/**
 * Open storage, falling back to an in-memory IndexedDB implementation when the
 * browser blocks IndexedDB. The UI tells the user that nothing will persist.
 */
export async function storageReady(): Promise<void> {
  try {
    await Promise.race([db(), new Promise((_, rej) => setTimeout(() => rej(new Error("IndexedDB timeout")), 4000))]);
  } catch {
    const mem = await import("fake-indexeddb");
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new mem.IDBFactory();
    (globalThis as unknown as { IDBKeyRange: typeof IDBKeyRange }).IDBKeyRange = mem.IDBKeyRange;
    dbp = null;
    memoryMode = true;
    await db();
  }
}

/** Test helper: forget the open connection. */
export function resetDbForTests() {
  dbp = null;
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get("kv", key))?.value as T | undefined;
}
export async function kvSet(key: string, value: unknown): Promise<void> {
  await (await db()).put("kv", { key, value });
}

const TITLE_CACHE_MAX = 3000;

export async function cacheTitles(titles: Title[]): Promise<void> {
  if (!titles.length) return;
  const d = await db();
  const tx = d.transaction("titles", "readwrite");
  const now = Date.now();
  for (const t of titles) {
    const prev = await tx.store.get(t.key);
    const merged = prev ? { ...prev, ...stripUndefined(t), meta: { ...(prev.meta ?? {}), ...(t.meta ?? {}) } } : t;
    await tx.store.put({ ...(merged as Title), cachedAt: now });
  }
  await tx.done;
}

export async function getCachedTitle(key: string): Promise<Title | undefined> {
  return (await db()).get("titles", key);
}

export async function getCachedTitles(keys: string[]): Promise<Map<string, Title>> {
  const d = await db();
  const out = new Map<string, Title>();
  await Promise.all(
    keys.map(async (k) => {
      const t = await d.get("titles", k);
      if (t) out.set(k, t);
    }),
  );
  return out;
}

/** Bound the shared title cache (oldest first), keeping titles referenced by any profile. */
export async function pruneTitleCache(keep: Set<string>): Promise<number> {
  const d = await db();
  const all = await d.getAll("titles");
  if (all.length <= TITLE_CACHE_MAX) return 0;
  const victims = all
    .filter((t) => !keep.has(t.key))
    .sort((a, b) => a.cachedAt - b.cachedAt)
    .slice(0, all.length - TITLE_CACHE_MAX);
  const tx = d.transaction("titles", "readwrite");
  for (const v of victims) await tx.store.delete(v.key);
  await tx.done;
  return victims.length;
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
