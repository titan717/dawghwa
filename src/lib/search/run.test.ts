import { beforeEach, describe, expect, it, vi } from "vitest";

const browse = vi.fn();
vi.mock("../api/endpoints", () => ({ api: { browse: (...a: unknown[]) => browse(...a) } }));
vi.mock("../store/db", () => ({ cacheTitles: async () => undefined }));

import { runIntent } from "./run";
import { parseIntent } from "./intent";

const item = (i: number) => ({ id: `t${i}`, title: `Title ${i}`, url: "", latestChapter: 1, lastUpdated: "", metadata: { genres: ["Action"], description: "a story of revenge and power" } });
const page = (from: number, n: number, hasMore = true) => ({ sourceId: "s", source: "S", items: Array.from({ length: n }, (_, k) => item(from + k)), pagination: { hasMore } });

describe("runIntent partial results", () => {
  beforeEach(() => browse.mockReset());
  it("keeps the first page when a later page fails, and marks the result partial", async () => {
    browse.mockResolvedValueOnce(page(0, 100)).mockRejectedValueOnce(new Error("boom"));
    const i = { ...parseIntent("revenge"), structured: true };
    const r = await runIntent(i, { want: 500, maxPages: 3 });
    expect(r.partial).toBe(true);
    expect(r.items.length).toBeGreaterThan(0);
    expect(browse).toHaveBeenCalledTimes(2);
  });
  it("still throws when the first page fails", async () => {
    browse.mockRejectedValueOnce(new Error("boom"));
    await expect(runIntent({ ...parseIntent("revenge"), structured: true }, { maxPages: 3 })).rejects.toThrow("boom");
  });
  it("is not partial when every page loads", async () => {
    browse.mockResolvedValueOnce(page(0, 100, false));
    const r = await runIntent({ ...parseIntent("revenge"), structured: true }, { want: 500, maxPages: 3 });
    expect(r.partial).toBe(false);
  });
});
