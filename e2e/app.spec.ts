import { expect, test } from "@playwright/test";
import { apiUp, maybeRelay, skipOnboarding } from "./helpers";

test.beforeEach(async ({ context }) => maybeRelay(context));

test("first run shows onboarding once, then home", async ({ page }) => {
  await skipOnboarding(page);
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("main h1").first()).toBeAttached();
  await expect(page.locator("nav.bottomnav, .sidebar nav").first()).toBeAttached();
});

test("primary navigation reaches every section and back works", async ({ page, isMobile }) => {
  await skipOnboarding(page);
  const nav = page.locator(isMobile ? "nav.bottomnav" : ".sidebar nav");
  // History lives in the desktop sidebar; on mobile it is reached from Profile.
  const sections = [
    ["My Series", /\/library$/, "My Series"],
    ...(isMobile ? [] : ([["History", /\/history$/, "History"]] as const)),
    ["Discover", /\/discover/, null],
    ["Profile", /\/profile$/, null],
  ] as const;
  for (const [name, url, heading] of sections) {
    await nav.getByRole("link", { name }).click();
    await expect(page).toHaveURL(url);
    if (heading) await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/discover/);
});

test("no shell top bar; Discover is reached from Search", async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.locator("header.topbar")).toHaveCount(0);
  await page.goto("/search");
  await page.getByRole("link", { name: "Discover" }).first().click();
  await expect(page).toHaveURL(/\/discover/);
});

test("Rewards toggle hides achievements and gives the nav slot back to Discover", async ({ page, isMobile }) => {
  await skipOnboarding(page);
  await expect(page.getByRole("heading", { name: "This week's quests" })).toBeVisible();
  await page.goto("/achievements");
  await expect(page.locator(".quest")).toHaveCount(3);
  await page.goto("/profile");
  const toggle = page.getByRole("checkbox", { name: /Show rewards/ });
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  const nav = page.locator(isMobile ? "nav.bottomnav" : ".sidebar nav");
  await expect(nav.getByRole("link", { name: "Achievements" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Discover" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "This week's quests" })).toHaveCount(0);
  await page.goto("/achievements");
  await expect(page.getByRole("button", { name: "Turn rewards on" })).toBeVisible();
});

test("empty library and history show honest empty states", async ({ page }) => {
  await skipOnboarding(page);
  await page.goto("/library");
  await expect(page.getByText(/Your library is empty|No recently read series/)).toBeVisible();
  await page.goto("/history");
  await expect(page.getByRole("heading", { level: 1, name: "History" })).toBeVisible();
});

test("natural-language search shows parsed filters", async ({ page }) => {
  test.skip(!(await apiUp(page)), "API not running");
  await skipOnboarding(page);
  await page.goto("/search?q=completed%20fantasy%20manhwa");
  for (const chip of ["Completed", "Fantasy", "Manhwa"]) await expect(page.getByText(chip, { exact: true }).first()).toBeVisible();
  await expect(page.locator("a[href^='/title/']").first()).toBeVisible({ timeout: 20_000 });
});

test("title page loads and offers a real action", async ({ page }) => {
  test.skip(!(await apiUp(page)), "API not running");
  await skipOnboarding(page);
  await page.goto("/discover?order=popular");
  const first = page.locator("a[href^='/title/']").first();
  await expect(first).toBeVisible({ timeout: 20_000 });
  await first.click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /Save to library|In library:/ })).toBeVisible();
});

test("favourite persists across reloads", async ({ page }) => {
  test.skip(!(await apiUp(page)), "API not running");
  await skipOnboarding(page);
  await page.goto("/discover?order=popular");
  const first = page.locator("a[href^='/title/']").first();
  await expect(first).toBeVisible({ timeout: 20_000 });
  await first.click();
  const fav = page.getByRole("button", { name: /^Favourite/ });
  await fav.click();
  await expect(fav).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: /^Favourite/ })).toHaveAttribute("aria-pressed", "true", { timeout: 20_000 });
});

test("offline: navigation keeps working and failures say offline, not 'updated'", async ({ page, context }) => {
  await skipOnboarding(page);
  await page.goto("/library");
  await expect(page.getByRole("heading", { level: 1, name: "My Series" })).toBeVisible();
  await context.setOffline(true);
  // Service workers are blocked in tests, so an unvisited screen's code cannot load offline.
  await page.locator("a[href='/history']:visible").first().click();
  const history = page.getByRole("heading", { level: 1, name: "History" });
  const offline = page.getByRole("heading", { level: 1, name: "You're offline" });
  await expect(history.or(offline)).toBeVisible();
  await expect(page.getByText("Dawghwa was updated")).toHaveCount(0);
  await context.setOffline(false);
});

test("title page never widens the phone viewport and keeps the read CTA on screen", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout check");
  test.skip(!(await apiUp(page)), "API not running");
  await skipOnboarding(page);
  for (const width of [360, 390, 412]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/title/mangadex/77bee52c-d2d6-44ad-a33a-1734c1fe696a");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".tp-cta")).toBeInViewport({ timeout: 20_000 });
    expect(await page.evaluate<number>("document.documentElement.scrollWidth")).toBeLessThanOrEqual(width);
    await page.getByRole("tab", { name: /About/ }).click();
    expect(await page.evaluate<number>("document.documentElement.scrollWidth")).toBeLessThanOrEqual(width);
  }
});

test("home covers actually load in the browser (no direct MangaDex cover links)", async ({ page }) => {
  test.skip(!(await apiUp(page)), "API not running");
  await skipOnboarding(page);
  await page.locator(".cover img").first().waitFor({ timeout: 20_000 });
  await expect
    .poll(async () => page.evaluate(`[...document.querySelectorAll(".cover img")].filter((i) => i.complete && i.naturalWidth > 0).length`), { timeout: 20_000 })
    .toBeGreaterThan(3);
  const direct = await page.evaluate(`[...document.querySelectorAll("img")].filter((i) => (i.currentSrc || i.src).startsWith("https://uploads.mangadex.org/")).length`);
  expect(direct).toBe(0);
});
