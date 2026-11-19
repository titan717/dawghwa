// Verifies hero copy contrast against the real key art (D41): hides the copy, samples the
// pixels behind each text box and reports the contrast of the real text colour against the lightest
// 2% of them (a conservative "worst background" estimate). Usage: node scripts/qa/hero-contrast.mjs
import { chromium } from "playwright";

const base = process.env.BASE || "http://localhost:4173";
const lum = (r, g, b) => {
  const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const browser = await chromium.launch();
const scratch = await (await browser.newContext()).newPage();
let worst = Infinity;
for (const theme of ["dark", "light"])
  for (const vp of [{ width: 390, height: 844, isMobile: true }, { width: 1440, height: 900, isMobile: false }]) {
    const ctx = await browser.newContext({ serviceWorkers: "block", viewport: vp, isMobile: vp.isMobile, reducedMotion: "reduce" });
    await ctx.addInitScript((t) => { localStorage.setItem("dawghwa:settings", JSON.stringify({ theme: t })); localStorage.setItem("dawghwa:onboarded", "1"); }, theme);
    await ctx.route((u) => u.hostname !== "localhost", async (route) => {
      try { const r = await fetch(route.request().url()); await route.fulfill({ status: r.status, contentType: r.headers.get("content-type") ?? undefined, body: Buffer.from(await r.arrayBuffer()) }); } catch { await route.abort(); }
    });
    const page = await ctx.newPage();
    await page.goto(base + "/welcome");
    await page.getByRole("button", { name: "Skip" }).click();
    await page.waitForSelector(".hero-slide:not([aria-hidden]) .hero-title");
    await page.waitForTimeout(4000);
    const n = await page.locator(".hero-slide").count();
    for (let i = 0; i < n; i++) {
      await page.evaluate((i) => { const t = document.querySelector(".hero-track"); const s = t.children[i]; t.scrollLeft = s.offsetLeft - t.offsetLeft; }, i);
      await page.waitForTimeout(900);
      const boxes = await page.evaluate((i) => {
        const s = document.querySelectorAll(".hero-slide")[i];
        const els = [...s.querySelectorAll(".hero-kicker, .hero-title, .hero-genres, .hero-desc")].filter((e) => e.getClientRects().length);
        const r = els.map((e) => { const b = e.getBoundingClientRect(); const fg = getComputedStyle(e).color.match(/[\d.]+/g).slice(0, 3).map(Number); return { name: e.className, fg, x: b.x, y: b.y, w: b.width, h: b.height }; });
        // hide the copy (and its text-shadow) without transitions so only the art + fade remain
        for (const e of s.querySelectorAll(".hero-body, .hero-body *")) { e.style.transition = "none"; e.style.animation = "none"; e.style.visibility = "hidden"; }
        return r;
      }, i);
      await page.waitForTimeout(150);
      const shot = (await page.screenshot()).toString("base64");
      // decode in a scratch page (no PNG library needed)
      const pixels = await scratch.evaluate(async ({ shot, boxes }) => {
        const img = new Image();
        img.src = "data:image/png;base64," + shot;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0);
        return boxes.map((b) => { const d = g.getImageData(Math.max(0, b.x), Math.max(0, b.y), Math.max(1, b.w), Math.max(1, b.h)).data; return Array.from(d.filter((_, k) => k % 4 !== 3)); });
      }, { shot, boxes });
      for (const [bi, b] of boxes.entries()) {
        const ls = [];
        const px = pixels[bi];
        for (let k = 0; k < px.length; k += 3) ls.push(lum(px[k], px[k + 1], px[k + 2]));
        if (!ls.length) continue;
        ls.sort((a, c) => c - a);
        const bg = ls[Math.floor(ls.length * 0.02)];
        const ratio = (lum(...b.fg) + 0.05) / (bg + 0.05); // the element's real text colour
        const min = b.name.includes("hero-title") ? 3 : 4.5; // title is large text
        worst = Math.min(worst, ratio / min);
        console.log(`${theme} ${vp.width} slide ${i + 1} ${b.name.padEnd(12)} ${ratio.toFixed(2)}:1 ${ratio >= min ? "ok" : "FAIL"} (needs ${min})`);
      }
      await page.evaluate((i) => document.querySelectorAll(".hero-slide")[i].querySelectorAll(".hero-body, .hero-body *").forEach((e) => e.removeAttribute("style")), i);
    }
    await ctx.close();
  }
await browser.close();
if (worst < 1) { console.error("hero contrast below AA"); process.exit(1); }
console.log("hero contrast: AA everywhere");
