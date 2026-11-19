// Visual regression captures for the UI polish phases (docs/DECISIONS.md D40+).
// Usage: OUT=/tmp/shots/before SET=home,discover,search,title,reader node scripts/qa/ui-shots.mjs
// Captures 390px and 1440px, dark and light, against `vite preview` (BASE) with the API proxied.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.env.BASE || "http://localhost:4173";
const out = process.env.OUT || "/tmp/shots";
const sets = (process.env.SET || "home,discover,search,title,reader").split(",");
const TITLE = process.env.TITLE || "/title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0";
mkdirSync(out, { recursive: true });

const VPS = [
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "1440", width: 1440, height: 900, mobile: false },
];
const browser = await chromium.launch();
for (const theme of ["dark", "light"]) {
  for (const vp of VPS) {
    const ctx = await browser.newContext({ serviceWorkers: "block", viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 1, reducedMotion: "reduce" });
    await ctx.addInitScript((t) => localStorage.setItem("dawghwa:settings", JSON.stringify({ theme: t })), theme);
    // The sandbox cannot reach image CDNs directly; the test runner relays them (QA only).
    await ctx.route((u) => u.hostname !== "localhost", async (route) => {
      try {
        const r = await fetch(route.request().url());
        await route.fulfill({ status: r.status, contentType: r.headers.get("content-type") ?? undefined, body: Buffer.from(await r.arrayBuffer()) });
      } catch {
        await route.abort();
      }
    });
    const page = await ctx.newPage();
    await page.goto(base + "/welcome");
    await page.getByRole("button", { name: "Skip" }).click();
    await page.waitForURL(/\/$/);
    const shot = async (name, full = false) => {
      const f = `${out}/${name}-${vp.name}-${theme}.png`;
      await page.screenshot({ path: f, fullPage: full });
      console.log(f);
    };
    const settle = (ms = 3500) => page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined).then(() => page.waitForTimeout(ms));
    if (sets.includes("home")) {
      await page.goto(base + "/");
      await settle();
      await shot("home");
      await page.mouse.wheel(0, vp.mobile ? 900 : 700);
      await settle(1500);
      await shot("home-rows");
    }
    if (sets.includes("discover")) {
      await page.goto(base + "/discover?view=all");
      await settle();
      await shot("discover");
      const compact = page.getByRole("radio", { name: "Compact grid" });
      if (await compact.count()) {
        await compact.click();
        await settle(800);
        await shot("discover-compact");
        await page.getByRole("radio", { name: "Large covers" }).click();
      }
    }
    if (sets.includes("search")) {
      await page.goto(base + "/search?q=solo");
      await settle();
      await shot("search");
    }
    if (sets.includes("title")) {
      await page.goto(base + TITLE);
      await settle(5000);
      await shot("title");
      await page.mouse.wheel(0, 900);
      await settle(1200);
      await shot("title-chapters");
    }
    if (sets.includes("reader")) {
      await page.goto(base + TITLE);
      await settle(5000);
      const cta = page.locator("a[href^='/read/']").first();
      if (await cta.count()) {
        await cta.click();
        await settle(6000);
        await shot("reader");
        await page.keyboard.press("End");
        await settle(2500);
        await shot("reader-end");
      }
    }
    await ctx.close();
  }
}
await browser.close();
