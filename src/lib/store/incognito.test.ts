import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { catalog, soloLevelingChapters } from "@/test/catalog";
import { isIncognito, setIncognito } from "@/lib/incognito";
import { db } from "./db";
import { getUser, initUser, markChaptersRead, saveProgress, signal } from "./user";
import { readPos, resetPositionsForTests, writePos } from "./position";

const solo = catalog[0]!; // Solo Leveling (real MangaDex fixture)
const [ch1, ch2] = soloLevelingChapters;

const finishCh1 = () =>
  saveProgress({ title: solo, chapterId: ch1!.id, variantId: ch1!.variants[0]!.variantId, sourceId: ch1!.variants[0]!.sourceId, chapterNumber: ch1!.number, page: 41, pageCount: 42, fraction: 1, finished: true, lastChapterNumber: 200 });

async function stored() {
  const d = await db();
  const pid = getUser().profile!.id;
  return {
    progress: await d.getAllFromIndex("progress", "byProfile", pid),
    events: await d.getAllFromIndex("events", "byProfile", pid),
    library: await d.getAllFromIndex("library", "byProfile", pid),
  };
}

beforeEach(async () => {
  sessionStorage.clear();
  localStorage.clear();
  resetPositionsForTests();
  await initUser();
});
afterEach(() => setIncognito(false));

describe("incognito", () => {
  it("is session-only: stored in sessionStorage, never localStorage", () => {
    setIncognito(true);
    expect(isIncognito()).toBe(true);
    expect(sessionStorage.getItem("dawghwa.incognito")).toBe("1");
    expect(Object.keys(localStorage).some((k) => k.includes("incognito"))).toBe(false);
    setIncognito(false);
    expect(sessionStorage.getItem("dawghwa.incognito")).toBeNull();
  });

  it("saves no progress, read marks, signals or automatic library status while on", async () => {
    setIncognito(true);
    expect(await finishCh1()).toBeUndefined();
    await signal("open", solo, solo.key, { context: "title" });
    expect(await markChaptersRead(solo, [ch1!, ch2!], true)).toBe(false);
    const s = await stored();
    expect(s.progress).toEqual([]);
    expect(s.events).toEqual([]);
    expect(s.library).toEqual([]);
    expect(getUser().progress.has(solo.key)).toBe(false);
    expect(getUser().events).toEqual([]);
    expect(getUser().library.get(solo.key)?.status).toBeUndefined();
  });

  it("keeps the reader position in memory only, for this session", () => {
    const pid = getUser().profile!.id;
    setIncognito(true);
    writePos(pid, ch1!.id, 12, 0.4);
    expect(Object.keys(localStorage).filter((k) => k.startsWith("dawghwa.pos."))).toEqual([]);
    expect(readPos(pid, ch1!.id)).toMatchObject({ page: 12, offset: 0.4 });
  });

  it("saves normally again once turned off", async () => {
    setIncognito(true);
    await finishCh1();
    setIncognito(false);
    await finishCh1();
    const s = await stored();
    expect(s.progress).toHaveLength(1);
    expect(s.progress[0]!.read[ch1!.id]).toBeTypeOf("number");
    expect(s.events.map((e) => e.kind)).toContain("chapter_read");
  });
});
