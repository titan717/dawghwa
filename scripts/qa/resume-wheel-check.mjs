import { chromium } from "playwright";
const base = "http://localhost:4173";
const R = "/read/mangadex/9a414441-bbad-43f1-a3a7-dc262ca790a3/d3c06606-4ee7-4454-a3a7-ffdb9ecf5d26";
const browser = await chromium.launch();
const ctx = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.route((u) => !u.hostname.includes("localhost") && !u.hostname.includes("fonts"), async (route) => { try { const r = await fetch(route.request().url()); await route.fulfill({ status: r.status, contentType: r.headers.get("content-type") ?? "image/jpeg", body: Buffer.from(await r.arrayBuffer()) }); } catch { await route.abort(); } });
const p = await ctx.newPage();
await p.goto(base + "/welcome"); await p.getByRole("button", { name: "Cancel" }).click(); await p.waitForTimeout(400);
await p.goto(base + R); await p.waitForTimeout(6000); await p.screenshot({path:"/tmp/c2.png"}); console.log("pages", await p.locator(".rd-page").count(), await p.evaluate(()=>document.body.scrollHeight));
const st = () => p.evaluate(() => { const els = [...document.querySelectorAll(".rd-page")]; const el = els.find((e) => e.getBoundingClientRect().bottom > 0); const r = el.getBoundingClientRect(); return { y: scrollY, idx: el.dataset.index, into: Math.round(-r.top) }; });
const res = [];
for (const [dy, wait] of [[7200, 900], [2400, 250], [3600, 120]]) {
  for (let i = 0; i < dy / 1200; i++) await p.mouse.wheel(0, 1200);
  await p.waitForTimeout(wait);
  const a = await st();
  await p.reload(); await p.waitForTimeout(7000);
  const b = await st();
  res.push({ dy, wait, a, b, sameContent: a.idx === b.idx && Math.abs(a.into - b.into) < 50 });
}
console.log(JSON.stringify(res));
await browser.close();
