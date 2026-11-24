import { describe, expect, it } from "vitest";
import { idFromName, migrateLibrary, moveCollection, mosaicIds, type Collection } from "./collections";

// v1 fixture: membership only in LibraryRecord.collections (names), with a duplicate name, stray spaces and a case variant
const v1 = [
  { titleKey: "s:a", collections: ["Weekend", "Favs "], addedAt: 30 },
  { titleKey: "s:b", collections: ["Weekend", "Weekend"], addedAt: 10 },
  { titleKey: "s:c", collections: [], addedAt: 5 },
  { titleKey: "s:d", collections: ["favs"], addedAt: 40 },
];

describe("migrateLibrary", () => {
  it("builds v2 from v1 names: no titles lost, no duplicates, ordered by first add", () => {
    const out = migrateLibrary(undefined, v1);
    expect(out.v).toBe(2);
    expect(out.collections.map((c) => [c.name, c.titleIds, c.order])).toEqual([
      ["Weekend", ["s:b", "s:a"], 0],
      ["Favs", ["s:a", "s:d"], 1],
    ]);
    const members = new Set(v1.filter((r) => r.collections.length).map((r) => r.titleKey));
    expect(new Set(out.collections.flatMap((c) => c.titleIds))).toEqual(members);
    for (const c of out.collections) expect(new Set(c.titleIds).size).toBe(c.titleIds.length);
  });
  it("leaves the v1 records untouched (they are the backup)", () => {
    const copy = structuredClone(v1);
    migrateLibrary(null, v1);
    expect(v1).toEqual(copy);
  });
  it("creates no default Saved collection", () => {
    expect(migrateLibrary(undefined, [{ titleKey: "s:a", collections: [], addedAt: 1 }]).collections).toEqual([]);
  });
  it("is idempotent: migrating a migrated value gives the same value", () => {
    const once = migrateLibrary(undefined, v1);
    expect(migrateLibrary(once, v1)).toEqual(once);
    expect(migrateLibrary(undefined, v1)).toEqual(once); // stable ids
  });
  it("cleans v2: drops bad rows, duplicate ids/names, duplicate and dangling titles", () => {
    const raw = {
      v: 2,
      collections: [
        { id: "x", name: "A", titleIds: ["s:a", "s:a", "s:gone", 7], order: 3, createdAt: 1 },
        { id: "x", name: "B", titleIds: [], order: 0, createdAt: 1 },
        { id: "y", name: " a ", titleIds: [], order: 1, createdAt: 1 },
        { id: "z", name: "", titleIds: [], order: 2 },
        null,
        { id: "w", name: "W", order: 9 },
      ],
    };
    const out = migrateLibrary(raw, v1);
    expect(out.collections.map((c) => [c.id, c.titleIds, c.order])).toEqual([
      ["x", ["s:a"], 0],
      ["w", [], 1],
    ]);
  });
  it("garbage in gives an empty v2", () => {
    for (const g of [undefined, null, 3, "x", [], { v: 3 }, { v: 2, collections: "no" }]) expect(migrateLibrary(g)).toEqual({ v: 2, collections: [] });
  });
});

describe("moveCollection", () => {
  const list: Collection[] = ["a", "b", "c"].map((id, i) => ({ id, name: id, titleIds: [], order: i * 10, createdAt: 0 }));
  const ids = (l: Collection[]) => l.map((c) => `${c.id}${c.order}`).join(" ");
  it("moves down and up", () => {
    expect(ids(moveCollection(list, "a", 1))).toBe("b0 a1 c2");
    expect(ids(moveCollection(list, "c", -1))).toBe("a0 c1 b2");
  });
  it("is a no-op at both edges and for unknown ids (orders normalised)", () => {
    expect(ids(moveCollection(list, "a", -1))).toBe("a0 b1 c2");
    expect(ids(moveCollection(list, "c", 1))).toBe("a0 b1 c2");
    expect(ids(moveCollection(list, "nope", 1))).toBe("a0 b1 c2");
  });
  it("does not mutate the input", () => {
    const before = structuredClone(list);
    moveCollection(list, "a", 1);
    expect(list).toEqual(before);
  });
});

it("mosaic uses the first four titles; ids are stable per name", () => {
  expect(mosaicIds({ id: "a", name: "a", titleIds: ["1", "2", "3", "4", "5"], order: 0, createdAt: 0 })).toEqual(["1", "2", "3", "4"]);
  expect(idFromName("weekend")).toBe(idFromName("weekend"));
  expect(idFromName("weekend")).not.toBe(idFromName("favs"));
});
