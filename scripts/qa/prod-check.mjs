// Production smoke test: real browser, no relay, records console errors and failed requests.
import { chromium } from "playwright";
const BASE = process.env.BASE || "https://dawghwa.vercel.app";
const out = process.env.OUT || "/tmp/prod";
const b = await chromium.launch();
for (const vp of [{ n: "m", width: 390, height: 844, mobile: true }, { n: "d", width: 1440, height: 900 }]) {
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: "dark" });
  const p = await ctx.newPage();
  const hosts = {};
  // console "Failed to load resource" lines carry no URL; classify failures by host instead
  p.on("response", (r) => { if (r.status() >= 400) { const u = new URL(r.url()); const k = `${r.status()} ${u.host}${u.pathname.startsWith("/api/") ? u.pathname : ""}`; hosts[k] = (hosts[k] ?? 0) + 1; } });
  p.on("requestfailed", (r) => { const k = `ERR ${new URL(r.url()).host}`; hosts[k] = (hosts[k] ?? 0) + 1; });
  await p.goto(BASE + "/");
  await p.waitForURL(/welcome/);
  await p.getByRole("button", { name: "Cancel" }).click();
  await p.waitForURL(/\/$/);
  await p.waitForTimeout(7000);
  const hero = await p.locator(".hero-slide h2, .hero-slide .hero-title").first().textContent().catch(() => null);
  const cards = await p.locator("a[href^='/title/']").count();
  await p.screenshot({ path: `${out}-${vp.n}-home.png` });
  await p.goto(BASE + "/library");
  const lib = await p.getByRole("heading", { level: 1, name: "My Series" }).waitFor({ timeout: 15000 }).then(() => true, () => false);
  await p.goto(BASE + "/title/mangadex/77bee52c-d2d6-44ad-a33a-1734c1fe696a");
  await p.waitForTimeout(6000);
  const h1 = await p.locator("h1").first().textContent();
  await p.screenshot({ path: `${out}-${vp.n}-title.png` });
  await p.goto(BASE + "/search?q=solo%20leveling");
  await p.waitForTimeout(6000);
  await p.locator("main a[href^='/title/']").first().waitFor({ timeout: 20000 }).catch(() => {});
  const hits = await p.locator("main a[href^='/title/']").count();
  await p.screenshot({ path: `${out}-${vp.n}-search.png` });
  console.log(JSON.stringify({ vp: vp.n, hero, cards, lib, h1, hits, failures: hosts }));
  await ctx.close();
}
await b.close();
