import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { catalog } from "@/test/catalog";
import { addComment, resetCommentsForTests, voteComment } from "../comments";
import { retrain } from "../intel/runtime";
import { progressionFor } from "../rewards";
import { setRewardSink, startRewards } from "../rewards/runtime";
import { db } from "./db";
import { canWriteLocal, isIncognito, setIncognito, subscribeIncognito } from "./incognito";
import { continueList, getUser, initUser, markChaptersRead, onSignal, profileEvents, saveProgress, signal } from "./user";

const t = { ...catalog[0]!, meta: { ...catalog[0]!.meta, status: "completed" as const, genres: ["Action"] } };
const u = (n: number, finished = true) => ({ title: t, chapterId: `c${n}`, chapterNumber: n, page: 9, pageCount: 10, fraction: 1, finished, lastChapterNumber: 3 });
const pid = () => getUser().profile!.id;
const rows = async (store: "progress" | "events") => (await db()).getAllFromIndex(store, "byProfile", pid());
const comments = async () => (await db()).getAllFromIndex("comments", "byProfile", pid());

beforeEach(async () => {
  setIncognito(false);
  localStorage.clear();
  resetCommentsForTests();
  await initUser();
});
afterEach(() => setIncognito(false));

describe("incognito flag", () => {
  it("is off by default, memory-only, and notifies subscribers", () => {
    const fn = vi.fn();
    const off = subscribeIncognito(fn);
    expect(isIncognito()).toBe(false);
    setIncognito(true);
    expect(isIncognito()).toBe(true);
    setIncognito(true); // no-op
    setIncognito(false);
    off();
    expect(fn).toHaveBeenCalledTimes(2);
    // never persisted anywhere
    expect(Object.keys(localStorage).some((k) => /incognito/i.test(k))).toBe(false);
  });
});

describe("progress and history", () => {
  it("saves nothing while on, and saves again once off", async () => {
    setIncognito(true);
    expect(await saveProgress(u(1))).toBeUndefined();
    await markChaptersRead(t, [{ id: "c2", number: 2 }], true);
    expect(await rows("progress")).toHaveLength(0);
    expect(getUser().progress.size).toBe(0);
    expect(continueList()).toHaveLength(0);
    expect(getUser().library.get(t.key)).toBeUndefined(); // no automatic "Reading" status either

    setIncognito(false);
    await saveProgress(u(1));
    expect(await rows("progress")).toHaveLength(1);
    expect(continueList().map((p) => p.titleKey)).toEqual([t.key]);
    expect(getUser().library.get(t.key)?.status).toBe("reading");
  });

  it("keeps an existing position untouched", async () => {
    await saveProgress(u(1, false));
    const before = (await rows("progress"))[0]!;
    setIncognito(true);
    await saveProgress({ ...u(2), page: 4 });
    expect((await rows("progress"))[0]).toEqual(before);
    expect(getUser().progress.get(t.key)).toEqual(before);
  });
});

describe("events", () => {
  it("logs no events and fires no listeners while on", async () => {
    const heard = vi.fn();
    const off = onSignal(heard);
    setIncognito(true);
    await signal("open", t);
    await signal("like", t);
    await saveProgress(u(1));
    expect(await profileEvents()).toHaveLength(0);
    expect(getUser().events).toHaveLength(0);
    expect(heard).not.toHaveBeenCalled();

    setIncognito(false);
    await signal("open", t);
    expect((await profileEvents()).map((e) => e.kind)).toEqual(["open"]);
    expect(heard).toHaveBeenCalledTimes(1);
    off();
  });
});

describe("rewards", () => {
  it("earns no XP and shows no reward moment while on", async () => {
    const sink = vi.fn();
    startRewards();
    setRewardSink(sink);
    setIncognito(true);
    await saveProgress(u(1));
    await saveProgress(u(2));
    expect(progressionFor(getUser()).ledger.total).toBe(0);
    expect(sink).not.toHaveBeenCalled();

    setIncognito(false);
    await saveProgress(u(1));
    expect(progressionFor(getUser()).ledger.total).toBeGreaterThan(0);
    expect(sink).toHaveBeenCalled();
    setRewardSink(null);
  });
});

describe("recommender", () => {
  it("does not retrain or store the model while on", async () => {
    await signal("like", t);
    setIncognito(true);
    await retrain();
    expect(await (await db()).get("intel", pid())).toBeUndefined();

    setIncognito(false);
    await retrain();
    expect(await (await db()).get("intel", pid())).toBeDefined();
  });
});

describe("comments", () => {
  it("keeps no comments, edits or votes while on", async () => {
    const kept = await addComment({ title: t, chapterId: "c1", body: "first" });
    setIncognito(true);
    expect(await addComment({ title: t, chapterId: "c1", body: "secret" })).toBeUndefined();
    await voteComment(kept!, 1);
    const stored = await comments();
    expect(stored.map((c) => c.body)).toEqual(["first"]);
    expect(stored[0]!.vote).toBeUndefined();
    expect((await profileEvents()).filter((e) => e.kind === "comment")).toHaveLength(1);

    setIncognito(false);
    await addComment({ title: t, chapterId: "c1", body: "second" });
    expect(await comments()).toHaveLength(2);
  });
});

describe("localStorage", () => {
  // Browsers dispatch localStorage.setItem through Storage.prototype, which is where the guard sits.
  // The unit-test DOM binds methods per instance, so the calls here go through the prototype the
  // way a browser does; e2e/profile.spec.ts checks the same thing in a real browser.
  const setLocal = (k: string, v: string) => Storage.prototype.setItem.call(localStorage, k, v);

  it("drops activity writes while on, keeps device preferences, and restores writes once off", () => {
    setIncognito(true);
    setLocal("dawghwa:recent-search:p", JSON.stringify(["solo"]));
    setLocal("dawghwa.pos.ch-1", "{}");
    setLocal("dawghwa.bookmarks.v1", "{}");
    expect(localStorage.getItem("dawghwa:recent-search:p")).toBeNull();
    expect(localStorage.getItem("dawghwa.pos.ch-1")).toBeNull();
    expect(localStorage.getItem("dawghwa.bookmarks.v1")).toBeNull();
    expect(canWriteLocal("dawghwa.pos.ch-1")).toBe(false);

    // device preferences are not activity
    setLocal("dawghwa:settings", JSON.stringify({ theme: "light" }));
    expect(JSON.parse(localStorage.getItem("dawghwa:settings")!).theme).toBe("light");
    expect(canWriteLocal("dawghwa:library-view")).toBe(true);

    // sessionStorage is already session-scoped and is left alone
    Storage.prototype.setItem.call(sessionStorage, "x", "1");
    expect(sessionStorage.getItem("x")).toBe("1");

    setIncognito(false);
    expect(canWriteLocal("dawghwa.pos.ch-1")).toBe(true);
    setLocal("dawghwa.pos.ch-1", "{}");
    expect(localStorage.getItem("dawghwa.pos.ch-1")).toBe("{}");
  });

  it("restores the original setItem when turned off", () => {
    const orig = Storage.prototype.setItem;
    setIncognito(true);
    expect(Storage.prototype.setItem).not.toBe(orig);
    setIncognito(false);
    expect(Storage.prototype.setItem).toBe(orig);
  });
});
