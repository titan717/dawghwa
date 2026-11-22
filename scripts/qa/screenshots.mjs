import { chromium } from "playwright";
const base = process.env.BASE || "http://localhost:4173";
const [,, ...paths] = process.argv;
const browser = await chromium.launch();
const ALL = { s: { name: "s", width: 360, height: 740, mobile: true }, m: { name: "m", width: 390, height: 844, mobile: true }, l: { name: "l", width: 430, height: 932, mobile: true }, t: { name: "t", width: 820, height: 1180, mobile: true }, d: { name: "d", width: 1440, height: 900 }, x: { name: "x", width: 1920, height: 1080 } };
const VPS = (process.env.VPS || "m,d").split(",").map((k) => ALL[k]).filter(Boolean);
for (const vp of VPS) {
  const ctx = await browser.newContext({ serviceWorkers: "block", colorScheme: process.env.THEME || "light", viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  // Sandbox browser egress returns 502 for uploads.mangadex.org; relay through Node (QA only).
  await ctx.route((u) => u.hostname.includes("mangadex.org") || u.hostname.includes("mangadex.network"), async (route) => { try { const r = await fetch(route.request().url()); const body = Buffer.from(await r.arrayBuffer()); await route.fulfill({ status: r.status, contentType: r.headers.get("content-type") ?? "image/jpeg", body }); } catch { await route.abort(); } });
  const errs = [];
  page.on("pageerror", (e) => errs.push("pageerror " + e.message));
  page.on("console", (m) => m.type() === "error" && errs.push("console " + m.text()));
  // onboard quickly: skip
  await page.goto(base + "/welcome");
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.waitForTimeout(500);
  for (const p of paths) {
    await page.goto(base + p);
    await page.waitForTimeout(Number(process.env.WAIT||5000));
    const f = `${process.env.OUT || "/tmp/shots"}/${vp.name}-${p.replace(/[^\w]+/g, "_") || "home"}.png`;
    await page.screenshot({ path: f, fullPage: !!process.env.FULL });
    console.log(f);
  }
  console.log(vp.name, errs.slice(0, 10).join("\n"));
  await ctx.close();
}
await browser.close();
