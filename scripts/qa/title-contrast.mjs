// Verifies title-page text contrast over the blurred banner art (D56). Every element with its own
// visible text inside the backdrop area is measured: text is made transparent (backgrounds stay),
// the real pixels behind it are read, and the real text colour is compared with the worst 2% of
// them (lightest pixels for light text, darkest for dark text).
// Usage: TITLE=/title/... node scripts/qa/title-contrast.mjs
import { chromium } from "playwright";

const base = process.env.BASE || "http://localhost:4173";
const TITLE = process.env.TITLE || "/title/mangadex/77bee52c-d2d6-44ad-a33a-1734c1fe696a";
const lum = (r, g, b) => {
  const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const browser = await chromium.launch();
const scratch = await (await browser.newContext()).newPage();
let worst = Infinity;
let worstLabel = "";
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
    await page.goto(base + TITLE);
    await page.waitForSelector(".tp-hero h1", { timeout: 60_000 });
    await page.waitForSelector(".chapter", { timeout: 60_000 });
    await page.waitForTimeout(2500);
    const boxes = await page.evaluate(() => {
      const bd = document.querySelector(".tp-backdrop").getBoundingClientRect();
      const out = [];
      const walker = document.createTreeWalker(document.querySelector(".tp"), NodeFilter.SHOW_TEXT);
      const seen = new Set();
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!n.textContent.trim() || seen.has(el) || el.closest("[aria-hidden='true'], .tp-cta-wrap, .tp-bar")) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || +cs.opacity === 0) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const r = range.getBoundingClientRect();
        if (!r.width || r.bottom > bd.bottom || r.bottom > innerHeight || r.top < 0 || r.right > innerWidth) continue;
        // skip text scrolled out of a clipping scroller (e.g. off-screen jump chips)
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (!hit || !(el === hit || el.contains(hit) || hit.contains(el))) continue;
        seen.add(el);
        const fg = cs.color.match(/[\d.]+/g).slice(0, 3).map(Number);
        const large = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
        out.push({ name: (el.className || el.tagName).toString().slice(0, 28) + " “" + n.textContent.trim().slice(0, 18) + "”", fg, large, x: r.x, y: r.y, w: r.width, h: r.height });
      }
      const st = document.createElement("style");
      st.id = "qa-hide";
      st.textContent = ".tp *, .tp *::before, .tp *::after { color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; transition: none !important; caret-color: transparent !important; } .tp svg { visibility: hidden !important; }";
      document.head.append(st);
      return out;
    });
    await page.waitForTimeout(150);
    const shot = (await page.screenshot()).toString("base64");
    const pixels = await scratch.evaluate(async ({ shot, boxes }) => {
      const img = new Image();
      img.src = "data:image/png;base64," + shot;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      return boxes.map((b) => Array.from(g.getImageData(Math.max(0, b.x), Math.max(0, b.y), Math.max(1, b.w), Math.max(1, b.h)).data.filter((_, k) => k % 4 !== 3)));
    }, { shot, boxes });
    let fails = 0;
    for (const [bi, b] of boxes.entries()) {
      const px = pixels[bi];
      const ls = [];
      for (let k = 0; k < px.length; k += 3) ls.push(lum(px[k], px[k + 1], px[k + 2]));
      if (!ls.length) continue;
      const fgL = lum(...b.fg);
      ls.sort((a, c) => c - a);
      const lightBg = ls[Math.floor(ls.length * 0.02)];
      const darkBg = ls[Math.ceil(ls.length * 0.98) - 1];
      // light text is threatened by the lightest pixels, dark text by the darkest
      const bg = fgL > (lightBg + darkBg) / 2 ? lightBg : darkBg;
      const ratio = (Math.max(fgL, bg) + 0.05) / (Math.min(fgL, bg) + 0.05);
      const min = b.large ? 3 : 4.5;
      if (ratio / min < worst) { worst = ratio / min; worstLabel = `${theme} ${vp.width} ${b.name} ${ratio.toFixed(2)}:1`; }
      if (ratio < min) { fails++; console.log(`FAIL ${theme} ${vp.width} ${b.name} ${ratio.toFixed(2)}:1 (needs ${min})`); }
    }
    console.log(`${theme} ${vp.width}: ${boxes.length} text boxes over the banner, ${fails} below AA`);
    await ctx.close();
  }
await browser.close();
console.log("tightest:", worstLabel);
if (worst < 1) { console.error("title contrast below AA"); process.exit(1); }
console.log("title contrast: AA everywhere");
