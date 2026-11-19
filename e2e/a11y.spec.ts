import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { apiUp, maybeRelay, skipOnboarding } from "./helpers";

test.beforeEach(async ({ context }) => maybeRelay(context));

/** Serious and critical WCAG 2.x A/AA issues fail the build; minor ones are reported in docs. */
async function audit(page: Page, label: string) {
  await page.waitForTimeout(600);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${label}: ${v.id} (${v.nodes.length}) ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

for (const theme of ["dark", "light"] as const) {
  test(`axe: core routes have no serious violations (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("dawghwa:settings", JSON.stringify({ theme: t })), theme);
    await page.goto("/welcome");
    await audit(page, "welcome");
    await page.getByRole("button", { name: "Create reader" }).click();
    await audit(page, "welcome-reader");
    await page.getByRole("button", { name: "Skip" }).click();
    for (const path of ["/", "/search", "/library", "/achievements", "/profile", "/about"]) {
      await page.goto(path);
      await audit(page, path);
    }
    await page.goto("/profile");
    await page.getByRole("button", { name: "Sign out" }).click();
    await audit(page, "sign-in");
  });
}

// UI polish phase 2: the title page, with its banner, provider picker, jump rail and both tabs.
for (const theme of ["dark", "light"] as const) {
  test(`axe: title page has no serious violations (${theme})`, async ({ page }) => {
    test.skip(!(await apiUp(page)), "API not running");
    await page.addInitScript((t) => localStorage.setItem("dawghwa:settings", JSON.stringify({ theme: t })), theme);
    await skipOnboarding(page);
    await page.goto("/title/mangadex/77bee52c-d2d6-44ad-a33a-1734c1fe696a");
    await expect(page.locator(".chapter").first()).toBeVisible({ timeout: 30_000 });
    await audit(page, "title-chapters");
    await page.mouse.wheel(0, 1600);
    await audit(page, "title-scrolled");
    await page.getByRole("tab", { name: /About/ }).click();
    await audit(page, "title-about");
  });
}

test("rewards off: no quest rings, no level, card without level", async ({ page }) => {
  await skipOnboarding(page);
  await page.goto("/profile");
  await page.getByRole("checkbox", { name: /Show rewards/ }).uncheck();
  await page.goto("/");
  await expect(page.locator(".quest-strip, .card-ring, .continue-ring")).toHaveCount(0);
  await page.goto("/profile");
  await expect(page.locator(".level-card")).toHaveCount(0);
});
