import { expect, test, type Page } from "@playwright/test";
import { apiUp, maybeRelay, skipOnboarding } from "./helpers";

// UI polish phase 2 (D50-D57): title-page interactions.
const TITLE = "/title/mangadex/77bee52c-d2d6-44ad-a33a-1734c1fe696a";

test.beforeEach(async ({ context }) => maybeRelay(context));

async function open(page: Page) {
  await skipOnboarding(page);
  await page.goto(TITLE);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".chapter").first()).toBeVisible({ timeout: 30_000 });
}

/** A fast horizontal finger flick across the tab panel. */
async function swipe(page: Page, dx: number) {
  await page.locator(".tp-panel").evaluate((el, dx) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = Math.min(r.top + 80, window.innerHeight - 40);
    const touch = (cx: number) => new Touch({ identifier: 1, target: el, clientX: cx, clientY: y });
    const fire = (type: string, cx: number) =>
      el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === "touchend" ? [] : [touch(cx)], changedTouches: [touch(cx)] }));
    fire("touchstart", x);
    fire("touchmove", x + dx / 2);
    fire("touchend", x + dx);
  }, dx);
}

test("swiping the tab panel moves between Chapters, About and Similar", async ({ page, isMobile }) => {
  test.skip(!isMobile, "swipe is a touch gesture");
  test.skip(!(await apiUp(page)), "API not running");
  await open(page);
  const chapters = page.getByRole("tab", { name: /Chapters/ });
  const about = page.getByRole("tab", { name: /About/ });
  await expect(chapters).toHaveAttribute("aria-selected", "true");
  await swipe(page, -140);
  await expect(about).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".tp-panel")).toHaveAttribute("data-dir", "1");
  await swipe(page, 140);
  await expect(chapters).toHaveAttribute("aria-selected", "true");
  // a short drag is not a swipe
  await swipe(page, -30);
  await expect(chapters).toHaveAttribute("aria-selected", "true");
});

test("the tab underline slides to the selected tab", async ({ page }) => {
  test.skip(!(await apiUp(page)), "API not running");
  await open(page);
  const list = page.getByRole("tablist", { name: "Series sections" });
  const ink = () => list.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--ink-x")) || 0);
  // measured on first paint, not only after the first tab change
  const first = (await page.getByRole("tab", { name: /Chapters/ }).boundingBox())!;
  await expect.poll(async () => (await page.locator(".tp-tabs-ink").boundingBox())?.width ?? 0).toBeGreaterThan(10);
  const c0 = (await page.locator(".tp-tabs-ink").boundingBox())!;
  expect(Math.abs(c0.x + c0.width / 2 - (first.x + first.width / 2))).toBeLessThan(2);
  const before = await ink();
  await page.getByRole("tab", { name: /About/ }).click();
  await expect.poll(ink).toBeGreaterThan(before);
  const tab = (await page.getByRole("tab", { name: /About/ }).boundingBox())!;
  const center = async () => { const b = (await page.locator(".tp-tabs-ink").boundingBox())!; return b.x + b.width / 2; };
  await expect.poll(async () => Math.abs((await center()) - (tab.x + tab.width / 2))).toBeLessThan(2);
});

test("chapter rows show relative update times", async ({ page }) => {
  test.skip(!(await apiUp(page)), "API not running");
  await open(page);
  const when = page.locator(".chapter time.ch-when").first();
  await expect(when).toBeVisible();
  await expect(when).toHaveText(/ago|just now|yesterday|\d{4}/i);
});

test("provider picker: available sources are radios, unavailable ones are labelled, and picking filters the list", async ({ page }) => {
  test.skip(!(await apiUp(page)), "API not running");
  await open(page);
  const group = page.getByRole("radiogroup", { name: "Read from source" });
  test.skip(!(await group.isVisible({ timeout: 20_000 }).catch(() => false)), "title has a single source");
  const all = group.getByRole("radio", { name: /All sources/ });
  await expect(all).toHaveAttribute("aria-checked", "true");
  const radios = group.getByRole("radio");
  const n = await radios.count();
  test.skip(n < 2, "no readable source besides 'All'");
  const first = radios.nth(1);
  await expect(first).toContainText(/Available/);
  await first.click();
  await expect(first).toHaveAttribute("aria-checked", "true");
  await expect(all).toHaveAttribute("aria-checked", "false");
  await expect(page.locator(".chapter").first()).toBeVisible();
  const off = group.locator("[data-state='unavailable']");
  if (await off.count()) await expect(off.first()).toHaveAttribute("aria-disabled", "true");
  for (const r of await radios.all()) expect((await r.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test("jump rail scrolls the chapter list to a group", async ({ page }) => {
  test.skip(!(await apiUp(page)), "API not running");
  await open(page);
  const rail = page.getByRole("navigation", { name: "Jump to chapters" });
  test.skip(!(await rail.isVisible({ timeout: 5_000 }).catch(() => false)), "list is short enough to not need a rail");
  const buttons = rail.getByRole("button");
  const last = buttons.nth((await buttons.count()) - 1);
  const y0 = await page.evaluate(() => window.scrollY);
  await last.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y0 + 200);
  await expect(last).toHaveAttribute("aria-current", "true");
});
