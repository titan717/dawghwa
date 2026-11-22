import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { catalog } from "@/test/catalog";
import { addComment } from "@/lib/comments";
import { retrain } from "@/lib/intel/runtime";
import { readPos, writePos } from "@/lib/readerPosition";
import { getSettings, updateSettings } from "@/lib/settings";
import { cacheTitles, db, kvSet } from "@/lib/store/db";
import { resetBookmarks, toggleBookmark, bookmarksFor } from "@/lib/store/bookmarks";
import { importProfile } from "@/lib/store/transfer";
import { createProfile, deleteProfile, getUser, hideTitle, initUser, markChaptersRead, profileEvents, rate, removeFromHistory, saveProgress, setStatus, signal, toggleFavorite, updateProfile } from "@/lib/store/user";
import { markUnreadable } from "@/lib/titles";
import { markEntered } from "@/app/landing";
import { isIncognito, localStore, resetIncognitoForTests, setIncognito } from "./incognito";

const [a, b, c] = catalog;

/** Spy on every write path of localStorage and IndexedDB (object stores and the raw factory). */
function spyWrites() {
  const ls = vi.spyOn(localStorage, "setItem");
  const snapshot = () => JSON.stringify(Object.entries(localStorage).sort());
  const before = snapshot();
  const store = globalThis.IDBObjectStore.prototype;
  const put = vi.spyOn(store, "put");
  const add = vi.spyOn(store, "add");
  const del = vi.spyOn(store, "delete");
  const clear = vi.spyOn(store, "clear");
  return {
    localStorageSets: () => ls.mock.calls,
    /** Belt and braces: the stored contents must also be byte-identical. */
    localStorageChanged: () => snapshot() !== before,
    idbWrites: () => put.mock.calls.length + add.mock.calls.length + clear.mock.calls.length,
    idbDeletes: () => del.mock.calls.length,
  };
}

beforeEach(async () => {
  resetIncognitoForTests();
  localStorage.clear();
  resetBookmarks();
  await initUser();
});
afterEach(() => {
  vi.restoreAllMocks();
  resetIncognitoForTests();
});

describe("incognito", () => {
  it("the write spies see writes when Incognito is off (control)", async () => {
    const spy = spyWrites();
    await saveProgress({ title: a!, chapterId: "ch-1", chapterNumber: 1, page: 4, pageCount: 20, fraction: 0.25, finished: false });
    writePos(getUser().profile!.id, "ch-1", 4);
    await signal("open", a!);
    expect(spy.idbWrites()).toBeGreaterThan(0);
    expect(spy.localStorageSets().length).toBeGreaterThan(0);
    expect(spy.localStorageChanged()).toBe(true);
    expect(await profileEvents()).toHaveLength(1);
  });

  it("writes nothing to localStorage or IndexedDB while on", async () => {
    await setIncognito(true);
    expect(isIncognito()).toBe(true);
    expect(document.documentElement.hasAttribute("data-incognito")).toBe(true);
    const spy = spyWrites();

    // reading: progress, finishing a chapter (history + recommender events), the position mirror
    await saveProgress({ title: a!, chapterId: "ch-1", chapterNumber: 1, page: 4, pageCount: 20, fraction: 0.25, finished: false });
    await saveProgress({ title: a!, chapterId: "ch-1", chapterNumber: 1, page: 19, pageCount: 20, fraction: 1, finished: true });
    writePos(getUser().profile!.id, "ch-1", 4, 0.3);
    await markChaptersRead(b!, [{ id: "b-1", number: 1 }], true);
    // library, ratings, hiding, explicit signals, comments, bookmarks
    await setStatus(b!, "plan");
    await toggleFavorite(b!);
    await rate(c!, -1);
    await hideTitle(c!, "not_interested");
    await signal("open", a!);
    await addComment({ title: a!, chapterId: "ch-1", body: "secret note" });
    toggleBookmark({ titleKey: a!.key, chapterId: "ch-1", chapterLabel: "Ch. 1", page: 4, pageCount: 20 });
    await updateProfile({ name: "Renamed" });
    // caches and device flags
    await cacheTitles([a!, b!]);
    await kvSet("anything", 1);
    updateSettings({ theme: "light" });
    markUnreadable(a!.key);
    markEntered();
    localStore.set("dawghwa.any", "1");
    // the recommender retrains in memory but does not persist its model
    await retrain();

    expect(spy.localStorageSets()).toEqual([]);
    expect(spy.localStorageChanged()).toBe(false);
    expect(spy.idbWrites()).toBe(0);
    expect(spy.idbDeletes()).toBe(0);

    // the session still works in memory
    expect(getUser().progress.get(a!.key)?.page).toBe(19);
    expect(getUser().library.get(b!.key)?.favorite).toBe(true);
    expect(readPos(getUser().profile!.id, "ch-1")?.page).toBe(4);
    expect(bookmarksFor(a!.key)).toHaveLength(1);
    expect(getSettings().theme).toBe("light");
    // but no recommender event exists, in memory or on disk
    expect(getUser().events).toHaveLength(0);
    expect(await profileEvents()).toHaveLength(0);
  });

  it("discards the session when turned off and stores nothing from it", async () => {
    const pid = getUser().profile!.id;
    await setStatus(a!, "reading"); // saved before Incognito
    await setIncognito(true);
    await saveProgress({ title: b!, chapterId: "b-1", chapterNumber: 1, page: 7, pageCount: 20, fraction: 0.4, finished: false });
    await toggleFavorite(a!);
    writePos(pid, "b-1", 7);
    toggleBookmark({ titleKey: b!.key, chapterId: "b-1", chapterLabel: "Ch. 1", page: 7, pageCount: 20 });
    updateSettings({ theme: "light" });

    await setIncognito(false);
    expect(getUser().progress.has(b!.key)).toBe(false);
    expect(getUser().library.get(a!.key)?.favorite).toBe(false);
    expect(getUser().library.get(a!.key)?.status).toBe("reading");
    expect(readPos(pid, "b-1")).toBeUndefined();
    expect(bookmarksFor(b!.key)).toHaveLength(0);
    expect(getSettings().theme).toBe("dark");
    const d = await db();
    expect(await d.get("progress", [pid, b!.key])).toBeUndefined();
    expect(Object.keys(localStorage).filter((k) => k.startsWith("dawghwa.pos."))).toEqual([]);
  });

  it("refuses profile management instead of silently losing it", async () => {
    await setIncognito(true);
    await expect(createProfile("New")).rejects.toThrow(/Turn off Incognito/);
    await expect(deleteProfile(getUser().profile!.id)).rejects.toThrow(/Turn off Incognito/);
    await expect(importProfile("{}")).rejects.toThrow(/Turn off Incognito/);
  });

  it("still lets you delete history you already have", async () => {
    await saveProgress({ title: a!, chapterId: "ch-1", chapterNumber: 1, page: 3, pageCount: 20, fraction: 0.2, finished: false });
    await setIncognito(true);
    await removeFromHistory(a!.key);
    await setIncognito(false);
    expect(getUser().progress.has(a!.key)).toBe(false);
  });

  it("keeps its own flag out of localStorage", async () => {
    const spy = spyWrites();
    await setIncognito(true);
    await setIncognito(false);
    expect(spy.localStorageSets()).toEqual([]);
  });
});
