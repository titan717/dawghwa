import { expect, test, type Locator, type Page } from "@playwright/test";
import { skipOnboarding } from "./helpers";

/**
 * Post-merge production smoke (MASTER_PROMPT section 9, step 2). Owned by WARDEN.
 *
 * Runs ONLY when PROD_URL is set; playwright.config.ts then points baseURL at it,
 * skips the local web server and runs nothing but this file:
 *
 *   PROD_URL=https://dawghwa.vercel.app npx playwright test e2e/prod-smoke.spec.ts
 *   PROD_URL=... PROD_API_URL=https://dawghwaapi.vercel.app npx playwright test e2e/prod-smoke.spec.ts
 *
 * Features that have not shipped yet (Incognito icon button, paged reader mode,
 * Settings screen) are detected by their affordance: absent means the test is
 * skipped with a "not shipped" annotation. Set PROD_SMOKE_STRICT=1 once a cycle
 * ships them, so a missing affordance fails as a regression instead.
 *
 * Read-only: no comments posted, no settings persisted beyond the test's own
 * fresh browser context. Never touches upstream sites directly.
 */

const PROD = process.env.PROD_URL;
const API = process.env.PROD_API_URL;
const STRICT = process.env.PROD_SMOKE_STRICT === "1";

test.skip(!PROD, "PROD_URL not set: production smoke runs only after a deploy");
test.describe.configure({ timeout: 120_000 });

/** Skip (or fail when STRICT) if a feature's entry point is not in the page. */
async function shipped(loc: Locator, what: string) {
  const here = await loc
    .first()
    .waitFor({ state: "attached", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!here) {
    if (STRICT) throw new Error(`${what}: not found in production (PROD_SMOKE_STRICT=1)`);
    test.info().annotations.push({ type: "not shipped", description: what });
    test.skip(true, `${what} not shipped yet`);
  }
}

const ROUTES = ["/", "/search", "/discover", "/library", "/profile"];

async function titleLinks(page: Page) {
  const links = page.locator('main a[href^="/title/"]');
  await expect(links.first()).toBeVisible({ timeout: 30_000 });
  const hrefs = await links.evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("href")!))]);
  return hrefs.slice(0, 6);
}

/** Opens a title and then its first chapter that actually renders a page image. */
async function openReadableChapter(page: Page) {
  await page.goto("/");
  for (const href of await titleLinks(page)) {
    await page.goto(href);
    const ch = page.locator(".chapter a[href^='/read/']").first();
    if (!(await ch.waitFor({ timeout: 20_000 }).then(() => true).catch(() => false))) continue;
    await ch.click();
    await expect(page).toHaveURL(/\/read\//);
    const img = page.locator(".reader img, [data-reader] img").first();
    if (await img.waitFor({ state: "attached", timeout: 25_000 }).then(() => true).catch(() => false)) return true;
  }
  return false;
}

test.beforeEach(async ({ page }) => {
  // Every test starts as a first-time visitor who passes the landing and skips onboarding.
  page.on("pageerror", (e) => test.info().annotations.push({ type: "pageerror", description: e.message }));
});

test("landing loads", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.getByRole("button", { name: "Use in browser" })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("h1").first()).toBeVisible();
});

test("home loads with real rows", async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.locator("main h1").first()).toBeAttached();
  // Real catalogue data, not only skeletons: at least one row with title cards and covers.
  await expect(page.locator(".row-track").first()).toBeVisible({ timeout: 30_000 });
  expect((await titleLinks(page)).length).toBeGreaterThan(0);
  // At least one cover image actually decoded (real data, not only placeholders).
  await expect
    .poll(() => page.locator("main .row-track img").evaluateAll((imgs) => imgs.filter((i) => (i as HTMLImageElement).naturalWidth > 0).length), { timeout: 30_000 })
    .toBeGreaterThan(0);
});

test("a title page opens", async ({ page }) => {
  await skipOnboarding(page);
  const [href] = await titleLinks(page);
  await page.goto(href!);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".chapter").first()).toBeVisible({ timeout: 30_000 });
});

test("a chapter reads in scroll mode", async ({ page }) => {
  await skipOnboarding(page);
  expect(await openReadableChapter(page), "no title on Home had a chapter that rendered a page").toBe(true);
  const img = page.locator(".reader img, [data-reader] img").first();
  await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth), { timeout: 30_000 }).toBeGreaterThan(0);
  await page.mouse.wheel(0, 1200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test("a chapter reads in paged mode", async ({ page }) => {
  await skipOnboarding(page);
  expect(await openReadableChapter(page)).toBe(true);
  // Reader modes land in Cycle 1 (Spec E). The mode switch lives in the reader settings layer.
  const mode = page.getByRole("radio", { name: /^(Paged|Pages|Page by page)$/i }).or(page.getByRole("button", { name: /paged/i }));
  await shipped(mode, "paged reader mode");
  await mode.first().click();
  const pageImg = page.locator(".reader img, [data-reader] img").first();
  await expect(pageImg).toBeVisible({ timeout: 20_000 });
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".reader img, [data-reader] img").first()).toBeVisible();
});

test("search returns results", async ({ page }) => {
  await skipOnboarding(page);
  await page.goto("/search");
  await page.getByRole("searchbox", { name: "Search titles" }).fill("solo");
  await expect(page.locator('main a[href^="/title/"]').first()).toBeVisible({ timeout: 30_000 });
});

test("bottom bar: same box on every route, flush with the bottom edge, mounted once", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the bottom bar is the mobile navigation; desktop uses the sticky header");
  await skipOnboarding(page);
  let first: { x: number; y: number; width: number; height: number } | null = null;
  for (const r of ROUTES) {
    await page.goto(r);
    const bar = page.locator("nav.bottomnav");
    await expect(bar).toHaveCount(1);
    await expect(bar).toBeVisible();
    await page.waitForTimeout(300); // let route transitions settle
    const box = await bar.boundingBox();
    const vh = page.viewportSize()!.height;
    expect(box, `bottom bar box on ${r}`).not.toBeNull();
    expect(Math.abs(box!.y + box!.height - vh), `bottom bar flush on ${r}`).toBeLessThanOrEqual(1);
    if (!first) first = box;
    else {
      for (const k of ["x", "y", "width", "height"] as const) expect(Math.abs(box![k] - first[k]), `${k} on ${r}`).toBeLessThanOrEqual(1);
    }
  }
});

test("Incognito button toggles and its sheet explains it", async ({ page, isMobile }) => {
  await skipOnboarding(page);
  const scope = page.locator(isMobile ? ".home-bar" : "header.app-header");
  const btn = scope.getByRole("button", { name: /incognito/i });
  await shipped(btn, "Incognito icon button");
  const before = await btn.first().getAttribute("aria-pressed");
  await btn.first().click();
  await expect(page.getByRole("dialog", { name: /incognito/i })).toBeVisible();
  await expect(btn.first()).not.toHaveAttribute("aria-pressed", before ?? "false");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /incognito/i })).toBeHidden();
  // Memory-only: a reload ends it.
  await page.reload();
  await expect(page.locator(isMobile ? ".home-bar" : "header.app-header").getByRole("button", { name: /incognito/i }).first()).not.toHaveAttribute("aria-pressed", "true");
});

test("Settings opens", async ({ page }) => {
  await skipOnboarding(page);
  await page.goto("/profile");
  const link = page.getByRole("link", { name: /^Settings$/ });
  await shipped(link, "Settings screen");
  await link.first().click();
  await expect(page).toHaveURL(/\/settings/);
  await expect(page.getByRole("heading", { level: 1, name: /Settings/ })).toBeVisible();
});

test.describe("API (section 9 step 3)", () => {
  test.skip(!API, "PROD_API_URL not set");

  test("health, catalog and a title respond", async ({ request }) => {
    const h = await request.get(`${API}/api/health`);
    expect(h.status()).toBe(200);
    const c = await request.get(`${API}/api/catalog?limit=3`);
    expect(c.status()).toBe(200);
    const items = ((await c.json()) as { items: { ref: string }[] }).items;
    expect(items.length).toBeGreaterThan(0);
    const t = await request.get(`${API}/api/titles/${encodeURIComponent(items[0]!.ref)}`);
    expect(t.status()).toBeLessThan(500);
  });

  test("a tampered image token is refused with a generic error", async ({ request }) => {
    // Contract (docs/API_V2.md): 404 invalid or proxy off, 410 expired; body names nothing.
    const r = await request.get(`${API}/api/v2/img/tampered.token`);
    expect([404, 410]).toContain(r.status());
    const body = (await r.json()) as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(["error"]);
  });

  test("the chapter endpoint fails generically on bad input", async ({ request }) => {
    const r = await request.get(`${API}/api/v2/chapter`);
    expect(r.status()).toBe(400);
    expect(Object.keys((await r.json()) as object)).toEqual(["error"]);
  });
});
