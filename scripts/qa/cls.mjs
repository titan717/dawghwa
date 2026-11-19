// Cumulative layout shift per route (D40+: "zero new layout shift"). Usage: BASE=http://localhost:4173 node scripts/qa/cls.mjs
import { chromium } from "playwright";
const base = process.env.BASE || "http://localhost:4173";
const routes = (process.env.ROUTES || "/,/discover?view=all,/search?q=solo," + (process.env.TITLE || "/title/mangadex/77bee52c-d2d6-44ad-a33a-1734c1fe696a")).split(",");
const host = new URL(base).hostname;
const browser = await chromium.launch();
const rows = [];
for (const vp of [{ width: 390, height: 844, isMobile: true }, { width: 1440, height: 900, isMobile: false }]) {
  const ctx = await browser.newContext({ serviceWorkers: "block", viewport: vp, isMobile: vp.isMobile });
  await ctx.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__cls += e.value))).observe({ type: "layout-shift", buffered: true });
  });
  await ctx.route((u) => u.hostname !== host && u.hostname !== "localhost", async (route) => {
    try { const r = await fetch(route.request().url()); await route.fulfill({ status: r.status, contentType: r.headers.get("content-type") ?? undefined, body: Buffer.from(await r.arrayBuffer()) }); } catch { await route.abort(); }
  });
  const page = await ctx.newPage();
  await page.goto(base + "/welcome");
  await page.getByRole("button", { name: "Skip" }).click();
  await page.waitForURL(/\/$/);
  for (const r of routes) {
    await page.goto(base + r);
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(3000);
    const cls = await page.evaluate(() => window.__cls);
    rows.push({ vp: vp.width, route: r, cls: +cls.toFixed(4) });
  }
  await ctx.close();
}
await browser.close();
console.table(rows);
