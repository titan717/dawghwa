import { useSyncExternalStore } from "react";
import { localStore, onIncognitoExit } from "../privacy/incognito";

/**
 * Page bookmarks, stored locally (works offline, survives reloads). Keyed by
 * title and canonical chapter key, so a bookmark stays valid when the reader
 * switches provider version; the version is kept as a hint.
 */
export interface Bookmark {
  titleKey: string;
  chapterId: string;
  chapterLabel: string;
  page: number;
  pageCount: number;
  variantId?: string;
  sourceId?: string;
  createdAt: number;
}

const KEY = "dawghwa.bookmarks.v1";
const MAX_PER_TITLE = 200;
const listeners = new Set<() => void>();
let cache: Record<string, Bookmark[]> | undefined;

function load(): Record<string, Bookmark[]> {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStore.get(KEY) ?? "{}") as unknown;
    cache = v && typeof v === "object" ? (v as Record<string, Bookmark[]>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function persist(next: Record<string, Bookmark[]>) {
  cache = next;
  // storage full / blocked / Incognito: kept in memory for this session
  localStore.set(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

onIncognitoExit(() => {
  cache = undefined;
  listeners.forEach((l) => l());
});

export function bookmarksFor(titleKey: string): Bookmark[] {
  return load()[titleKey] ?? [];
}

export function isBookmarked(titleKey: string, chapterId: string, page: number): boolean {
  return bookmarksFor(titleKey).some((b) => b.chapterId === chapterId && b.page === page);
}

export function toggleBookmark(b: Omit<Bookmark, "createdAt">): boolean {
  const all = load();
  const list = all[b.titleKey] ?? [];
  const exists = list.some((x) => x.chapterId === b.chapterId && x.page === b.page);
  const next = exists ? list.filter((x) => !(x.chapterId === b.chapterId && x.page === b.page)) : [{ ...b, createdAt: Date.now() }, ...list].slice(0, MAX_PER_TITLE);
  persist({ ...all, [b.titleKey]: next });
  return !exists;
}

export function removeBookmark(titleKey: string, chapterId: string, page: number) {
  const all = load();
  persist({ ...all, [titleKey]: (all[titleKey] ?? []).filter((x) => !(x.chapterId === chapterId && x.page === page)) });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

export function useBookmarks(titleKey: string | undefined): Bookmark[] {
  return useSyncExternalStore(
    subscribe,
    () => (titleKey ? (load()[titleKey] ?? EMPTY) : EMPTY),
    () => EMPTY,
  );
}
const EMPTY: Bookmark[] = [];

/** Tests only. */
export function resetBookmarks() {
  cache = undefined;
}
