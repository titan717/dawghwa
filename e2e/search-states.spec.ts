import { expect, test } from "@playwright/test";
import { skipOnboarding } from "./helpers";
import { ITEMS, axe, expectNoSourceNames, mockApi, page1, setTheme } from "./mock-api";

// Spec O: every search state, against a mocked catalogue (no API, no providers).
const box = (page: import("@playwright/test").Page) => page.getByRole("searchbox", { name: "Search titles" });
const status = (page: import("@playwright/test").Page) => page.getByTestId("search-status");

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await skipOnboarding(page);
});

test("idle: genre chips; a genre chip filters", async ({ page }) => {
  await page.goto("/search");
  const genres = page.getByRole("group", { name: "Genres" });
  await expect(genres.getByRole("button", { name: "Romance" })).toBeVisible();
  await expectNoSourceNames(page);
  await genres.getByRole("button", { name: "Romance" }).click();
  await expect(page).toHaveURL(/tag=Romance/);
  await expect(page.locator(".grid .card").first()).toBeVisible();
});

test("idle: genre chips stay hidden, without an error, when the vocabulary fails", async ({ page }) => {
  await page.route("**/api/catalog/filters**", (r) => r.fulfill({ status: 503, json: { error: "UNAVAILABLE" } }));
  await page.goto("/search");
  await expect(page.getByRole("heading", { name: "Browse Categories" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Genres" })).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("loading shows a skeleton, then results are announced", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.unrouteAll();
  await mockApi(page, {
    query: async (_q, route) => {
      await gate;
      await route.fulfill({ json: page1(ITEMS.slice(0, 5)) });
    },
  });
  await page.goto("/search");
  await box(page).fill("solo");
  await expect(page.locator(".search-results[aria-busy='true'] .grid[aria-busy='true']")).toBeVisible();
  release();
  await expect(page.locator(".grid .card")).toHaveCount(5);
  await expect(status(page)).toHaveText("5 results");
});

test("empty: No matches with the designed copy, and Clear filters when filters are on", async ({ page }) => {
  await page.unrouteAll();
  await mockApi(page, { query: (_q, route) => route.fulfill({ json: page1([]) }) });
  await page.goto("/search");
  await box(page).fill("zzzqqq");
  await expect(page.getByRole("heading", { name: "No matches" })).toBeVisible();
  await expect(page.getByText("Check the spelling, or try a shorter search.")).toBeVisible();
  await expect(status(page)).toHaveText("No matches");
  await page.goto("/search?q=zzzqqq&kind=manga");
  await expect(page.getByRole("heading", { name: "No matches" })).toBeVisible();
  await expect(page.getByText("Try fewer filters.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear filters" }).last()).toBeVisible();
  await expectNoSourceNames(page);
});

test("error: generic text and Try again recovers", async ({ page }) => {
  let fail = true;
  await page.unrouteAll();
  await mockApi(page, {
    query: (_q, route) => (fail ? route.fulfill({ status: 500, json: { error: "Upstream provider exploded", details: { source: "secret-source" } } }) : route.fulfill({ json: page1(ITEMS.slice(0, 3)) })),
  });
  await page.goto("/search");
  await box(page).fill("solo");
  const alert = page.getByRole("alert");
  await expect(alert.getByRole("heading", { name: "Something went wrong" })).toBeVisible({ timeout: 20_000 });
  await expect(alert).toContainText("Check your connection and try again.");
  await expect(page.locator("body")).not.toContainText("exploded");
  await expect(page.locator("body")).not.toContainText("secret-source");
  await expectNoSourceNames(page);
  fail = false;
  await alert.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".grid .card")).toHaveCount(3);
});

test("offline: You're offline, recent searches stay visible", async ({ page, context }) => {
  await page.goto("/search");
  await box(page).fill("solo leveling");
  await expect(page.locator(".grid .card").first()).toBeVisible();
  await page.waitForTimeout(2700); // the query is saved to recent searches after 2.5s
  await context.setOffline(true);
  await box(page).fill("tower");
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Search needs a connection. Your recent searches are still here.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent searches" })).toBeVisible();
  await expect(page.getByRole("button", { name: "solo leveling", exact: true })).toBeVisible();
  await context.setOffline(false);
});

test("partial: results stay, plus a quiet note, when part of the wider search fails", async ({ page }) => {
  const extra = ITEMS.slice(20, 23).map((i) => ({ id: String(i.providerId), title: i.title, url: "", latestChapter: 1, lastUpdated: "" }));
  await page.unrouteAll();
  await mockApi(page, {
    query: (_q, route) => route.fulfill({ json: page1(ITEMS.slice(0, 2)) }),
    stream: [
      { sourceId: "s1", results: extra },
      { sourceId: "s2", results: [], error: "timeout talking to secret-host.example" },
      { done: true },
    ],
  });
  await page.goto("/search");
  await box(page).fill("solo");
  await expect(page.locator(".grid .card")).toHaveCount(2);
  await page.getByRole("button", { name: "Search more" }).click();
  await expect(page.getByRole("heading", { name: "More results" })).toBeVisible();
  await expect(page.getByText("Some results couldn't load.")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("secret-host");
  await expectNoSourceNames(page);
});

test("no autofocus on touch phones", async ({ page, isMobile }) => {
  await page.goto("/search");
  await expect(box(page)).toBeVisible();
  if (isMobile) await expect(box(page)).not.toBeFocused();
  else await expect(box(page)).toBeFocused();
});

for (const theme of ["dark", "light"] as const) {
  test(`axe: search idle, results, empty and error (${theme})`, async ({ page }) => {
    test.setTimeout(120_000);
    await setTheme(page, theme);
    await page.unrouteAll();
    await mockApi(page, {
      query: (q, route) => (q === "boom" ? route.fulfill({ status: 500, json: {} }) : q === "zzzqqq" ? route.fulfill({ json: page1([]) }) : route.fulfill({ json: page1(ITEMS.slice(0, 6)) })),
    });
    await page.goto("/search");
    await expect(page.getByRole("group", { name: "Genres" })).toBeVisible();
    await axe(page, "idle");
    await box(page).fill("solo");
    await expect(page.locator(".grid .card")).toHaveCount(6);
    await axe(page, "results");
    await box(page).fill("zzzqqq");
    await expect(page.getByRole("heading", { name: "No matches" })).toBeVisible();
    await axe(page, "empty");
    await box(page).fill("boom");
    await expect(page.getByRole("heading", { name: "Something went wrong" })).toBeVisible({ timeout: 20_000 });
    await axe(page, "error");
  });
}
