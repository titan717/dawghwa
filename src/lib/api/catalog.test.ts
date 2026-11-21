import { describe, expect, it } from "vitest";
import raw from "@/test/fixtures/catalog.json";
import type { BrowseQuery } from "./types";
import { localOnly, needsCatalogFilters, toCatalogParams, toResult, UnsupportedFilterError, type CatalogItem } from "./catalog";

const items = (raw as unknown as { items: CatalogItem[] }).items;
const genres = new Set(["action", "fantasy", "romance"]);

describe("catalogue adapter", () => {
  it("only loads filter vocabulary when the query needs it", () => {
    expect(needsCatalogFilters({ query: "solo" })).toBe(false);
    expect(needsCatalogFilters({ kinds: ["manhwa"], status: ["ongoing"] })).toBe(false);
    expect(needsCatalogFilters({ includedTags: ["Action"] })).toBe(true);
    expect(needsCatalogFilters({ excludedTags: ["Harem"] })).toBe(true);
    expect(needsCatalogFilters({ demographic: ["seinen"] })).toBe(true);
    expect(needsCatalogFilters({ kinds: ["manga", "manhwa"] })).toBe(true);
    expect(needsCatalogFilters({ status: ["ongoing", "hiatus"] })).toBe(true);
  });

  it("translates a browse query to documented /api/catalog params", () => {
    const p = toCatalogParams({ kinds: ["manhwa"], status: ["completed"], includedTags: ["Action", "Monsters"], excludedTags: ["Harem"], order: "rating", year: 2020, offset: 60, limit: 30 }, genres);
    expect(p.get("provider")).toBe("mangadex");
    expect(p.get("format")).toBe("manhwa");
    expect(p.get("status")).toBe("completed");
    expect(p.getAll("genre")).toEqual(["Action"]);
    expect(p.getAll("tag")).toEqual(["Monsters"]);
    expect(p.getAll("excludeGenre")).toEqual(["Harem"]);
    expect(p.get("sort")).toBe("score");
    expect(p.get("year")).toBe("2020");
    expect(p.get("page")).toBe("3");
    expect(p.get("limit")).toBe("30");
  });

  it("does not send several formats or statuses as one server filter, and reports them as local", () => {
    const q = { kinds: ["manga", "manhwa"] as const, status: ["ongoing", "hiatus"] as const, demographic: ["seinen"] as const };
    const p = toCatalogParams({ ...q, kinds: [...q.kinds], status: [...q.status], demographic: [...q.demographic] }, genres);
    expect(p.has("format")).toBe(false);
    expect(p.has("status")).toBe(false);
    expect(localOnly({ kinds: ["manga", "manhwa"], status: ["ongoing", "hiatus"], demographic: ["seinen"] })).toEqual(["kinds", "status", "demographic"]);
    expect(localOnly({ kinds: ["manga"], status: ["ongoing"] })).toEqual([]);
  });

  it("sends several formats, statuses and demographics to a server that advertises them", () => {
    const server = new Set(["formats", "statuses", "demographics", "genreMode"]);
    const q: BrowseQuery = { kinds: ["manga", "manhwa"], status: ["ongoing", "hiatus"], demographic: ["seinen"], includedTags: ["Action", "Romance"], tagMode: "any" };
    const p = toCatalogParams(q, new Set(["action", "romance"]), server);
    expect(p.getAll("format")).toEqual(["manga", "manhwa"]);
    expect(p.getAll("status")).toEqual(["ongoing", "hiatus"]);
    expect(p.getAll("demographic")).toEqual(["seinen"]);
    expect(p.getAll("genre")).toEqual(["Action", "Romance"]);
    expect(p.get("genreMode")).toBe("or");
    expect(localOnly(q, server)).toEqual([]);
  });

  it("refuses match-any rather than silently sending match-all to an older API", () => {
    expect(() => toCatalogParams({ includedTags: ["Action", "Romance"], tagMode: "any" }, genres)).toThrow(UnsupportedFilterError);
    // one tag: all and any are the same query
    expect(toCatalogParams({ includedTags: ["Action"], tagMode: "any" }, genres).has("genreMode")).toBe(false);
    // demographic is never sent to a server that cannot apply it
    expect(toCatalogParams({ demographic: ["seinen"] }, genres).has("demographic")).toBe(false);
  });

  it("defaults to relevance for text and popularity otherwise, and clamps limit", () => {
    expect(toCatalogParams({ query: "solo" }, genres).get("sort")).toBe("relevance");
    expect(toCatalogParams({}, genres).get("sort")).toBe("popularity");
    expect(toCatalogParams({ limit: 500 }, genres).get("limit")).toBe("100");
  });

  it("maps real catalogue items without inventing fields", () => {
    const solo = items.find((i) => i.title === "Solo Leveling")!;
    const r = toResult(solo);
    expect(r.id).toBe(solo.providerId);
    expect(r.metadata?.kind).toBe("manhwa");
    expect(r.metadata?.genres).toEqual(solo.genres);
    expect(r.metadata?.description).toBe(solo.description);
    // the catalogue has no follower counts or ratings for MangaDex lists
    expect(r.metadata?.follows).toBeUndefined();
    expect(r.rating).toBeUndefined();
    const bare = toResult({ ...solo, tagNames: undefined, description: undefined, demographic: undefined });
    expect(bare.metadata?.tags).toBeUndefined();
    expect(bare.metadata?.description).toBeUndefined();
    expect("demographic" in (bare.metadata ?? {})).toBe(false);
  });

  it("marks unknown status as missing rather than a value", () => {
    expect(toResult({ ...items[0]!, status: "unknown" }).metadata?.status).toBeUndefined();
  });
});
