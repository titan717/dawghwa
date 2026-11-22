// SENTINEL: every main screen at 360/390/768/1024/1440, dark and light, unscrolled and scrolled.
// Records console errors and the sticky-header geometry used by the top-bar fix. QA only, not shipped.
// Usage: BASE=http://localhost:4173 OUT=/tmp/shots node scripts/qa/sentinel.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const base = process.env.BASE || "http://localhost:4173";
const OUT = process.env.OUT || "/tmp/sentinel";
const WIDTHS = (process.env.WIDTHS || "360,390,768,1024,1440").split(",").map(Number);
const THEMES = (process.env.THEMES || "dark,light").split(",");
const ROUTES = (process.env.ROUTES || "/,/search,/library,/discover,/profile,/history").split(",");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const report = [];
for (const theme of THEMES)
  for (const W of WIDTHS) {
    const mobile = W < 1024;
    const ctx = await browser.newContext({ serviceWorkers: "block", colorScheme: theme, viewport: { width: W, height: mobile ? 800 : 900 }, isMobile: mobile, hasTouch: mobile });
    // first run: skip the landing and onboarding the way a returning reader would
    await ctx.addInitScript(`localStorage.setItem("dawghwa:settings", JSON.stringify({ theme: "${theme}" })); localStorage.setItem("dawghwa:entered", "1");`);
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push("pageerror " + e.message));
    page.on("console", (m) => m.type() === "error" && errs.push("console " + m.text().slice(0, 200)));
    await page.goto(base + "/welcome");
    const skip = page.getByRole("button", { name: "Skip" });
    await skip.first().waitFor({ timeout: 15000 });
    await skip.first().click();
    await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 });
    for (const r of ROUTES) {
      await page.goto(base + r);
      await page.waitForTimeout(4000);
      const name = `${theme}-${W}-${r === "/" ? "home" : r.slice(1).replace(/\//g, "_")}`;
      await page.screenshot({ path: `${OUT}/${name}-top.png` });
      const geo = async () =>
        page.evaluate(() => {
          const pick = (sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const b = el.getBoundingClientRect();
            return { top: Math.round(b.top), bottom: Math.round(b.bottom), visible: getComputedStyle(el).display !== "none" && b.height > 0, position: getComputedStyle(el).position };
          };
          return { scrollY: Math.round(scrollY), homeBar: pick(".home-bar"), header: pick(".app-header"), sidebar: pick(".sidebar"), bottomnav: pick(".bottomnav") };
        });
      const before = await geo();
      await page.mouse.wheel(0, 1400);
      await page.waitForTimeout(1500);
      const after = await geo();
      await page.screenshot({ path: `${OUT}/${name}-scrolled.png` });
      report.push({ theme, W, route: r, before, after });
    }
    report.push({ theme, W, consoleErrors: errs });
    await ctx.close();
  }
await browser.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
const errors = report.filter((x) => x.consoleErrors?.length);
console.log(`shots in ${OUT}; contexts with console errors: ${errors.length}`);
for (const e of errors) console.log(e.theme, e.W, e.consoleErrors.slice(0, 3));
