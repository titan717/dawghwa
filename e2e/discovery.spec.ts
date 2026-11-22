import { expect, test } from "@playwright/test";
import { apiUp, maybeRelay, skipOnboarding } from "./helpers";

// UI polish phase 1 (D40-D47): discovery-surface interactions.
test.beforeEach(async ({ context }) => maybeRelay(context));

test("discover grid density toggle switches layout and persists across reloads", async ({ page }) => {
  test.skip(!(await apiUp(page)), "API not running");
  await skipOnboarding(page);
  await page.goto("/discover?view=all");
  const grid = page.locator(".grid").first();
  await expect(grid).toHaveAttribute("data-density", "covers", { timeout: 20_000 });
  const covers = page.getByRole("radio", { name: "Large covers" });
  const compact = page.getByRole("radio", { name: "Compact grid" });
  await expect(covers).toHaveAttribute("aria-checked", "true");
  await compact.click();
  await expect(compact).toHaveAttribute("aria-checked", "true");
  await expect(grid).toHaveAttribute("data-density", "compact");
  await page.reload();
  await expect(page.locator(".grid").first()).toHaveAttribute("data-density", "compact", { timeout: 20_000 });
  const box = await compact.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
});

test("search shows a skeleton on the first keystroke and highlights matched words", async ({ page }) => {
  test.skip(!(await apiUp(page)), "API not running");
  await skipOnboarding(page);
  await page.goto("/search");
  const box = page.getByRole("searchbox", { name: "Search titles" });
  await box.fill("solo");
  // before the 280ms debounce resolves, the result area already answers
  await expect(page.locator(".grid[aria-busy='true']")).toBeVisible({ timeout: 250 });
  await expect(page.locator(".card-title mark").first()).toHaveText(/solo/i, { timeout: 20_000 });
});

test("shelf arrows land on a card edge", async ({ page, isMobile }) => {
  test.skip(isMobile, "arrows are a pointer affordance");
  test.skip(!(await apiUp(page)), "API not running");
  await skipOnboarding(page);
  await page.goto("/");
  // rails with pointer arrows (the blueprint Binge row is a custom shelf without them)
  const row = page.locator("section.row:not(.row-ranked)").filter({ has: page.locator(".row-track .card") }).filter({ has: page.locator(".row-nav") }).first();
  await expect(row).toBeAttached({ timeout: 20_000 });
  await row.scrollIntoViewIfNeeded();
  await row.hover();
  const next = row.getByRole("button", { name: "Scroll right" });
  await expect(next).toBeEnabled({ timeout: 10_000 });
  await next.click();
  await page.waitForTimeout(800);
  const aligned = await row.locator(".row-track").first().evaluate((t) => {
    const base = (t.children[0] as HTMLElement).offsetLeft;
    return t.scrollLeft > 0 && Array.from(t.children).some((k) => Math.abs((k as HTMLElement).offsetLeft - base - t.scrollLeft) < 2);
  });
  expect(aligned).toBe(true);
});

test("advanced filters live in the URL, survive reload/back, and reach the API as server filters", async ({ page }) => {
  test.skip(!(await apiUp(page)), "API not running");
  await skipOnboarding(page);
  const caps = await (await page.request.get("/api/catalog/filters?provider=mangadex")).json();
  test.skip(!caps.capabilities.filters.includes("statuses"), "API without multi-value catalogue filters");
  const calls: URL[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.pathname === "/api/catalog") calls.push(u);
  });
  await page.goto("/discover?view=all");
  // Desktop shows the panel inline, phones open it from a button. Wait for one of them before choosing.
  const inline = page.locator(".discover-filters");
  await expect(inline.or(page.getByRole("button", { name: /^Filters/ })).first()).toBeVisible();
  let panel = (await inline.isVisible()) ? inline : null;
  if (!panel) {
    await page.getByRole("button", { name: /^Filters/ }).click();
    panel = page.getByRole("dialog");
  }
  // Format and status chips are single-choice until the server's capabilities arrive
  // (then they combine); demographic chips render with them, so wait for one first.
  await expect(panel.getByRole("button", { name: "Seinen", exact: true })).toBeVisible({ timeout: 30_000 });
  await panel.getByRole("button", { name: "Ongoing", exact: true }).click();
  await panel.getByRole("button", { name: "Hiatus", exact: true }).click();
  await panel.getByRole("button", { name: "Manhwa", exact: true }).click();
  await panel.getByRole("button", { name: "Manhua", exact: true }).click();
  await panel.getByRole("button", { name: "Seinen", exact: true }).click();
  await panel.getByRole("button", { name: "Action: any" }).click();
  await panel.getByRole("button", { name: "Fantasy: any" }).click();
  await panel.getByRole("radio", { name: "Match any" }).click();
  await panel.getByRole("button", { name: "Horror: any" }).click();
  await panel.getByRole("button", { name: "Horror: included" }).click();
  await panel.getByRole("combobox", { name: "Release year" }).selectOption("2020");

  await expect(page).toHaveURL(/status=ongoing%2Chiatus|status=ongoing,hiatus/);
  const url = new URL(page.url());
  expect(url.searchParams.get("kind")).toBe("manhwa,manhua");
  expect(url.searchParams.get("demographic")).toBe("seinen");
  expect(url.searchParams.get("tag")).toBe("Action,Fantasy");
  expect(url.searchParams.get("match")).toBe("any");
  expect(url.searchParams.get("without")).toBe("Horror");
  expect(url.searchParams.get("year")).toBe("2020");

  await expect.poll(() => calls.some((u) => u.searchParams.get("genreMode") === "or" && u.searchParams.get("year") === "2020")).toBe(true);
  const last = calls.findLast((u) => u.searchParams.get("year") === "2020")!;
  expect(last.searchParams.getAll("status")).toEqual(["ongoing", "hiatus"]);
  expect(last.searchParams.getAll("format")).toEqual(["manhwa", "manhua"]);
  expect(last.searchParams.getAll("demographic")).toEqual(["seinen"]);
  expect(last.searchParams.getAll("excludeGenre")).toEqual(["Horror"]);

  // a shared link restores the same state
  const shared = page.url();
  await page.goto("/");
  await page.goto(shared);
  if (await page.locator(".discover-filters").isVisible()) {
    await expect(page.locator(".discover-filters").getByRole("radio", { name: "Match any" })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator(".discover-filters").getByRole("button", { name: "Horror: excluded" })).toBeVisible();
  }
  await expect(page.getByLabel("Active filters").getByRole("button", { name: "Remove Seinen" })).toBeVisible();
  await expect(page.getByText(/titles match|No titles match/).first()).toBeVisible({ timeout: 20_000 });
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});
