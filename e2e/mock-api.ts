import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * Mocked catalogue for state tests (Spec O). Never touches the real API or any provider:
 * every /api request is answered here, and anything unexpected gets a generic 503.
 */
type Item = Record<string, unknown> & { title: string };
const fixture = JSON.parse(readFileSync(new URL("../src/test/fixtures/catalog.json", import.meta.url), "utf8")) as { items: Item[] };
export const ITEMS = fixture.items.filter((i) => !i.adult).slice(0, 60);

export const FILTERS = {
  provider: "catalog",
  capabilities: { filters: ["genres", "formats", "statuses"], sorts: ["popularity", "score", "updated", "newest", "relevance"], formats: ["manga", "manhwa", "manhua"], statuses: ["ongoing", "completed", "hiatus"], maxLimit: 100 },
  genres: ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Thriller"],
  tags: [],
};

export const page1 = (items: Item[], hasNextPage = false) => ({ provider: "catalog", items, pageInfo: { page: 1, limit: items.length || 20, total: items.length, hasNextPage } });

export interface Mock {
  /** Response for a text query (`q` param). Default: the first 12 fixture titles. */
  query?: (q: string, route: Route) => Promise<void> | void;
  /** NDJSON lines for POST /api/search. */
  stream?: object[];
}

export async function mockApi(page: Page, m: Mock = {}) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    if (p === "/api/catalog/filters") return route.fulfill({ json: FILTERS });
    if (p === "/api/catalog") {
      const q = url.searchParams.get("q") ?? url.searchParams.get("query");
      if (q && m.query) return m.query(q, route);
      return route.fulfill({ json: page1(ITEMS.slice(0, 12)) });
    }
    if (p === "/api/search" && m.stream) return route.fulfill({ status: 200, contentType: "application/x-ndjson", body: m.stream.map((l) => JSON.stringify(l)).join("\n") + "\n" });
    if (p === "/api/health") return route.fulfill({ json: { sources: {} } });
    return route.fulfill({ status: 503, json: { error: "UNAVAILABLE" } });
  });
}

/** Words that must never reach the screen (source/provider vocabulary). */
export const DENY = [/mangadex/i, /anilist/i, /provider/i, /\bsource\b/i, /scanlat/i, /\bupstream\b/i];

export async function expectNoSourceNames(page: Page) {
  const text = await page.locator("main, body").first().innerText();
  const attrs = await page.evaluate(() => [...document.querySelectorAll("[aria-label],[title]")].map((e) => `${e.getAttribute("aria-label") ?? ""} ${e.getAttribute("title") ?? ""}`).join(" "));
  for (const re of DENY) {
    expect(text, `visible text matches ${re}`).not.toMatch(re);
    expect(attrs, `labels match ${re}`).not.toMatch(re);
  }
}

export async function axe(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${label}: ${v.id} (${v.nodes.length}) ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

export const setTheme = (page: Page, theme: "dark" | "light") => page.addInitScript((t) => localStorage.setItem("dawghwa:settings", JSON.stringify({ theme: t })), theme);
