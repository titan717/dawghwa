import { describe, expect, it, vi } from "vitest";
import { request } from "./client";
import { browseCatalog } from "./catalog";

vi.mock("./client", () => ({ request: vi.fn() }));

const requestMock = vi.mocked(request);
const catalogue = {
  provider: "mangadex",
  items: [],
  pageInfo: { page: 1, limit: 30, hasNextPage: false },
};
const filters = {
  provider: "mangadex",
  capabilities: { filters: [], sorts: [], formats: [], statuses: [], maxLimit: 100 },
  genres: [],
  tags: [],
};

describe("browseCatalog request path", () => {
  it("skips vocabulary for simple queries and fetches it for tag queries", async () => {
    requestMock
      .mockResolvedValueOnce(catalogue as never)
      .mockResolvedValueOnce(catalogue as never);

    await browseCatalog({ query: "solo" });
    await browseCatalog({ kinds: ["manhwa"], status: ["ongoing"] });

    expect(requestMock.mock.calls).toHaveLength(2);
    expect(requestMock.mock.calls[0]![0]).toMatch(/^\/api\/catalog\?/);
    expect(requestMock.mock.calls[1]![0]).toMatch(/^\/api\/catalog\?/);
    expect(requestMock.mock.calls.some(([path]) => path.includes("/filters"))).toBe(false);

    requestMock
      .mockResolvedValueOnce(filters as never)
      .mockResolvedValueOnce(catalogue as never);
    await browseCatalog({ includedTags: ["Action"] });

    expect(requestMock.mock.calls).toHaveLength(4);
    expect(requestMock.mock.calls[2]![0]).toContain("/api/catalog/filters");
    expect(requestMock.mock.calls[3]![0]).toMatch(/^\/api\/catalog\?/);
  });
});
