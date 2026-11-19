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
  const row = page.locator("section.row:not(.row-ranked)").filter({ has: page.locator(".row-track .card") }).first();
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
