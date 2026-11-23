import { describe, expect, it } from "vitest";
import { searchView, statusLine } from "./state";

const base = { showResults: true, loading: false, isError: false, offline: false, count: 0, partial: false };

describe("searchView", () => {
  it("idle without a query, whatever else is true", () => {
    expect(searchView({ ...base, showResults: false, isError: true, loading: true })).toBe("idle");
  });
  it("loading before data", () => expect(searchView({ ...base, loading: true })).toBe("loading"));
  it("empty after data with no items", () => expect(searchView(base)).toBe("empty"));
  it("results", () => expect(searchView({ ...base, count: 3 })).toBe("results"));
  it("error and offline only when nothing can be shown", () => {
    expect(searchView({ ...base, isError: true })).toBe("error");
    expect(searchView({ ...base, isError: true, offline: true })).toBe("offline");
    expect(searchView({ ...base, isError: true, loading: true })).toBe("error");
  });
  it("partial when some items loaded and part failed", () => {
    expect(searchView({ ...base, count: 2, isError: true })).toBe("partial");
    expect(searchView({ ...base, count: 2, partial: true })).toBe("partial");
  });
  it("keeps showing items while refetching", () => expect(searchView({ ...base, count: 2, loading: true })).toBe("results"));
});

describe("statusLine", () => {
  it("announces outcomes, never during idle or loading", () => {
    expect(statusLine("idle", 0)).toBe("");
    expect(statusLine("loading", 0)).toBe("");
    expect(statusLine("results", 1)).toBe("1 result");
    expect(statusLine("results", 36, true)).toBe("36+ results");
    expect(statusLine("partial", 4)).toBe("4 results. Some results couldn't load.");
    expect(statusLine("empty", 0)).toBe("No matches");
    expect(statusLine("error", 0)).toBe("Something went wrong");
    expect(statusLine("offline", 0)).toBe("You're offline");
  });
});
