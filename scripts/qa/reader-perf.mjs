// Reader LCP and long-task time over 3 fresh loads at 390px (D67). Lighthouse cannot get past onboarding.
// Usage: BASE=http://localhost:4173 R=/read/<source>/<title>/<chapter> node scripts/qa/reader-perf.mjs
import { chromium } from "playwright";
const base = process.env.BASE; const r = process.env.R;
const browser = await chromium.launch();
const out = [];
for (let i = 0; i < 3; i++) {
  const ctx = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 }, isMobile: true });
  await ctx.addInitScript(() => { window.__lcp = 0; window.__lt = 0; new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true }); new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__lt += Math.max(0, e.duration - 50)))).observe({ type: "longtask", buffered: true }); });
  await ctx.route((u) => u.hostname !== "localhost", async (route) => { try { const x = await fetch(route.request().url()); await route.fulfill({ status: x.status, contentType: x.headers.get("content-type") ?? undefined, body: Buffer.from(await x.arrayBuffer()) }); } catch { await route.abort(); } });
  const page = await ctx.newPage();
  await page.goto(base + "/welcome"); await page.getByRole("button", { name: "Skip" }).click(); await page.waitForURL(/\/$/);
  await page.goto(base + r); await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(2000);
  out.push(await page.evaluate(() => ({ lcp: Math.round(window.__lcp), tbt: Math.round(window.__lt) })));
  await ctx.close();
}
console.log(base, JSON.stringify(out));
await browser.close();
