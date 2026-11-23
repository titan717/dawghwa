import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { groupByTitle, listDownloads } from "./downloaded";

function seed(rows: object[]) {
  return new Promise<void>((ok, no) => {
    const r = indexedDB.open("dawghwa-offline", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("chapters", { keyPath: "key" });
    r.onsuccess = () => {
      const tx = r.result.transaction("chapters", "readwrite");
      rows.forEach((x) => tx.objectStore("chapters").put(x));
      tx.oncomplete = () => (r.result.close(), ok());
      tx.onerror = () => no(tx.error);
    };
  });
}

describe("downloaded", () => {
  it("returns nothing, and creates no database, when the offline store doesn't exist", async () => {
    expect(await listDownloads("p1")).toEqual([]);
    expect((await indexedDB.databases()).some((d) => d.name === "dawghwa-offline")).toBe(false);
  });
  it("lists only complete chapters of this profile", async () => {
    await seed([
      { key: "p1|s:a|1", profileId: "p1", titleKey: "s:a", n: 1, bytes: 10, savedAt: 5, complete: true },
      { key: "p1|s:a|2", profileId: "p1", titleKey: "s:a", n: 2, bytes: 20, savedAt: 9, complete: true },
      { key: "p1|s:b|1", profileId: "p1", titleKey: "s:b", n: 1, bytes: 5, savedAt: 7, complete: false },
      { key: "p2|s:c|1", profileId: "p2", titleKey: "s:c", n: 1, bytes: 5, savedAt: 7, complete: true },
    ]);
    const xs = await listDownloads("p1");
    expect(xs.map((x) => `${x.titleKey}#${x.n}`).sort()).toEqual(["s:a#1", "s:a#2"]);
    expect([...groupByTitle(xs).values()]).toEqual([{ titleKey: "s:a", chapters: 2, bytes: 30, savedAt: 9 }]);
  });
  it("groups newest first", () => {
    const g = groupByTitle([
      { titleKey: "a", n: 1, bytes: 1, savedAt: 1 },
      { titleKey: "b", n: 1, bytes: 1, savedAt: 3 },
    ]);
    expect([...g.keys()]).toEqual(["b", "a"]);
  });
});
