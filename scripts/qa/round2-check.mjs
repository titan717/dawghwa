// QA for critic round 1 defects: C2 wheel resume + fast reload, C3 title overflow + CTA, M13 search overflow, P7 header search.
import { chromium } from "playwright";
const base = process.env.BASE || "http://localhost:4173";
const R = "/read/mangadex/9a414441-bbad-43f1-a3a7-dc262ca790a3/d3c06606-4ee7-4454-a3a7-ffdb9ecf5d26";
const T = "/title/mangadex/77bee52c-d2d6-44ad-a33a-1734c1fe696a";
const browser = await chromium.launch();
const relay = async (ctx) => ctx.route((u) => !u.hostname.includes("localhost") && !u.hostname.includes("fonts"), async (route) => { try { const r = await fetch(route.request().url(), { method: route.request().method() }); await route.fulfill({ status: r.status, contentType: r.headers.get("content-type") ?? "image/jpeg", body: Buffer.from(await r.arrayBuffer()) }); } catch { await route.abort(); } });
const out = {};
async function mobile(w, h = 844) {
  const ctx = await browser.newContext({ serviceWorkers: "block", viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await relay(ctx);
  const p = await ctx.newPage();
  await p.goto(base + "/welcome");
  await p.getByRole("button", { name: "Cancel" }).click();
  await p.waitForTimeout(400);
  return { ctx, p };
}
// C3
for (const w of [360, 390, 412]) {
  const { ctx, p } = await mobile(w);
  await p.goto(base + T);
  await p.waitForSelector(".tp-cta", { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const m = await p.evaluate(() => { const c = document.querySelector(".tp-cta")?.getBoundingClientRect(); return { iw: innerWidth, sw: document.documentElement.scrollWidth, cta: c ? [Math.round(c.top), Math.round(c.bottom)] : null, ih: innerHeight }; });
  await p.screenshot({ path: `/tmp/r2-title-${w}.png` });
  await p.getByRole("tab", { name: /About/ }).click().catch(() => {});
  await p.waitForTimeout(500);
  m.aboutSw = await p.evaluate(() => document.documentElement.scrollWidth);
  await p.screenshot({ path: `/tmp/r2-about-${w}.png`, fullPage: true });
  await p.getByRole("button", { name: "About this series" }).click();
  await p.waitForTimeout(600);
  m.sheetOverflow = await p.evaluate(() => { const s = document.querySelector(".sheet"); return s ? s.scrollWidth - s.clientWidth : null; });
  await p.screenshot({ path: `/tmp/r2-sheet-${w}.png` });
  out["title" + w] = m;
  await ctx.close();
}
// M13
{
  const { ctx, p } = await mobile(390);
  await p.goto(base + "/search");
  await p.waitForTimeout(1500);
  const box = p.getByRole("searchbox").first();
  await box.fill("a very long recent search query that keeps going and going for ever and ever");
  await box.press("Enter");
  await p.waitForTimeout(2500);
  await p.getByRole("button", { name: "Clear search" }).click();
  await p.waitForTimeout(1500);
  out.searchSw = await p.evaluate(() => [innerWidth, document.documentElement.scrollWidth, document.querySelectorAll(".recent-list li").length]);
  await p.screenshot({ path: "/tmp/r2-search-390.png" });
  await ctx.close();
}
// P7
{
  const ctx = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1440, height: 900 } });
  await relay(ctx);
  const p = await ctx.newPage();
  await p.goto(base + "/welcome");
  await p.getByRole("button", { name: "Cancel" }).click();
  await p.waitForTimeout(1500);
  out.header = await p.evaluate(() => { const h = document.querySelector(".topbar").getBoundingClientRect(); const s = document.querySelector(".search-trigger").getBoundingClientRect(); return { hTop: h.top, hH: h.height, sTop: s.top - h.top, sBottom: h.bottom - s.bottom }; });
  await p.screenshot({ path: "/tmp/r2-desk-home.png" });
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
