// SENTINEL screen matrix (MASTER_PROMPT section 7 gate 12, section 12 scoring input). QA only, not shipped.
// Every screen at 360/390/412/768/1024/1440, light and dark, unscrolled and scrolled.
// Records console and page errors, failed requests, layout geometry (bottom bar bbox, header,
// horizontal overflow, content hidden under the bottom bar) and writes report.json + summary.md.
//
// Usage:
//   BASE=https://dawghwa.vercel.app OUT=/tmp/screens/prod node scripts/qa/screens.mjs
//   BASE=http://localhost:4173 OUT=/tmp/screens/local node scripts/qa/screens.mjs
// Env: WIDTHS=360,390 THEMES=dark ROUTES=/,/search  TITLE=/title/<src>/<id>  READER=/read/...
//      STRICT=1 exits 1 when any geometry or console check fails. WAIT=ms extra settle time.
// Diff against a baseline: python3 scripts/qa/screens-diff.py <baseline-dir> <new-dir>
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const base = (process.env.BASE || "http://localhost:4173").replace(/\/$/, "");
const OUT = process.env.OUT || "/tmp/screens";
const WIDTHS = (process.env.WIDTHS || "360,390,412,768,1024,1440").split(",").map(Number);
const THEMES = (process.env.THEMES || "light,dark").split(",");
const SETTLE = Number(process.env.WAIT || 800);
const DEFAULT_ROUTES = "/start,/welcome,/,/discover,/search,/library,/history,/profile,/achievements,/about,/settings,@title,@reader";
const ROUTES = (process.env.ROUTES || DEFAULT_ROUTES).split(",");
// Screens that bring their own chrome: no shared bottom bar expected.
const OWN_CHROME = (p) => p.startsWith("/start") || p.startsWith("/welcome") || p.startsWith("/read/") || p.startsWith("/title/");
mkdirSync(OUT, { recursive: true });

const slug = (r) => (r === "/" ? "home" : r.startsWith("/title/") ? "title" : r.startsWith("/read/") ? "reader" : r.slice(1).replace(/[/?=&]/g, "_"));

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(SETTLE);
}

const geo = (page) =>
  page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom), position: cs.position, visible: cs.display !== "none" && cs.visibility !== "hidden" && b.height > 0 };
    };
    const navs = [...document.querySelectorAll(".bottomnav")];
    const nav = navs.find((n) => n.getBoundingClientRect().height > 0 && getComputedStyle(n).display !== "none") || null;
    const doc = document.documentElement;
    return {
      path: location.pathname,
      vw: innerWidth,
      vh: innerHeight,
      scrollY: Math.round(scrollY),
      maxScroll: Math.max(0, doc.scrollHeight - innerHeight),
      hScroll: doc.scrollWidth > innerWidth + 1,
      scrollWidth: doc.scrollWidth,
      bottomnavCount: navs.length,
      bottomnav: box(nav),
      bottomGap: nav ? Math.round(innerHeight - nav.getBoundingClientRect().bottom) : null,
      header: box(document.querySelector(".app-header")),
      homeBar: box(document.querySelector(".home-bar")),
      sidebar: box(document.querySelector(".sidebar")),
      title: document.title,
    };
  });

// At the end of the page, is the last piece of main content hidden behind the bottom bar?
const coveredAtEnd = (page) =>
  page.evaluate(() => {
    const nav = document.querySelector(".bottomnav");
    const main = document.querySelector("main");
    if (!nav || !main || getComputedStyle(nav).display === "none") return null;
    const navTop = nav.getBoundingClientRect().top;
    let maxBottom = -Infinity;
    for (const el of main.querySelectorAll("*")) {
      const b = el.getBoundingClientRect();
      if (b.height === 0 || b.width === 0 || b.top >= innerHeight) continue;
      const cs = getComputedStyle(el);
      if (cs.position === "fixed" || cs.visibility === "hidden") continue;
      if (el.children.length === 0 || el.textContent?.trim()) maxBottom = Math.max(maxBottom, b.bottom);
    }
    return { navTop: Math.round(navTop), lastContentBottom: Math.round(maxBottom), covered: maxBottom > navTop + 1 };
  });

const browser = await chromium.launch();
const results = [];
let titlePath = process.env.TITLE || null;
let readerPath = process.env.READER || null;

for (const theme of THEMES)
  for (const W of WIDTHS) {
    const mobile = W < 1024;
    const ctx = await browser.newContext({ serviceWorkers: "block", colorScheme: theme, viewport: { width: W, height: mobile ? 800 : 900 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
    // Settings key carries the theme; first-run landing is reached explicitly via /start.
    await ctx.addInitScript(`try{const k="dawghwa:settings";const s=JSON.parse(localStorage.getItem(k)||"{}");s.theme="${theme}";localStorage.setItem(k,JSON.stringify(s));}catch{}`);
    const page = await ctx.newPage();
    let current = "";
    const errs = {};
    const push = (m) => (errs[current] ||= []).push(m.slice(0, 240));
    page.on("pageerror", (e) => push("pageerror " + e.message));
    page.on("console", (m) => m.type() === "error" && push("console " + m.text()));
    page.on("requestfailed", (r) => { const f = r.failure()?.errorText || ""; if (!/ERR_ABORTED/.test(f)) push(`requestfailed ${r.url().slice(0, 120)} ${f}`); });

    if (!ROUTES.includes("/welcome")) {
      // Partial runs: create the profile the way a returning reader has one (onboarding skipped).
      await page.goto(base + "/welcome", { waitUntil: "domcontentloaded" }).catch(() => {});
      const skip = page.getByRole("button", { name: "Skip" }).first();
      await skip.waitFor({ timeout: 15000 }).then(() => skip.click()).catch(() => {});
      await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 }).catch(() => {});
    }
    for (const raw of ROUTES) {
      let r = raw;
      if (raw === "@title") r = titlePath;
      if (raw === "@reader") r = readerPath;
      if (!r) { results.push({ theme, W, route: raw, skipped: "no link found" }); continue; }
      current = r;
      const t0 = Date.now();
      let status = null;
      try {
        const resp = await page.goto(base + r, { waitUntil: "domcontentloaded", timeout: 30000 });
        status = resp?.status() ?? null;
      } catch (e) {
        results.push({ theme, W, route: r, error: String(e).slice(0, 200) });
        continue;
      }
      await settle(page);
      if (r === "/welcome") {
        // Onboarding: capture, then skip so the profile exists for the rest of the run.
        const name = `${theme}-${W}-${slug(r)}`;
        await page.screenshot({ path: `${OUT}/${name}-top.png` });
        const before = await geo(page);
        const skip = page.getByRole("button", { name: "Skip" });
        if (await skip.first().isVisible().catch(() => false)) {
          await skip.first().click();
          await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 }).catch(() => {});
        }
        results.push({ theme, W, route: r, status, ms: Date.now() - t0, before, after: null, endCover: null });
        continue;
      }
      const name = `${theme}-${W}-${slug(r)}`;
      await page.screenshot({ path: `${OUT}/${name}-top.png` });
      const before = await geo(page);
      // Discover a real title and its first chapter once; live data can be slow, so wait up to 15 s.
      const firstHref = (sel) => page.locator(sel).first().waitFor({ state: "attached", timeout: 15000 }).then(() => page.locator(sel).first().getAttribute("href")).catch(() => null);
      if (r === "/" && !titlePath) titlePath = await firstHref('a[href^="/title/"]');
      if (r.startsWith("/title/") && !readerPath) readerPath = await firstHref('a[href^="/read/"]');
      await page.mouse.wheel(0, 1400).catch(() => {});
      await page.waitForTimeout(600);
      if ((await page.evaluate(() => scrollY)) < 10) await page.evaluate(() => scrollBy(0, 1400));
      await page.waitForTimeout(900);
      const after = await geo(page);
      await page.screenshot({ path: `${OUT}/${name}-scrolled.png` });
      // Scroll to the true end (feeds may grow on scroll; stop when the height is stable).
      for (let i = 0, h = -1; i < 4; i++) {
        const nh = await page.evaluate(() => (scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }), document.documentElement.scrollHeight));
        await page.waitForTimeout(700);
        if (nh === h) break;
        h = nh;
      }
      const endCover = await coveredAtEnd(page);
      results.push({ theme, W, route: r, status, ms: Date.now() - t0, before, after, endCover });
    }
    results.push({ theme, W, errors: errs });
    await ctx.close();
  }
await browser.close();

// ---- checks ----
const fails = [];
const rows = results.filter((x) => x.route);
for (const theme of THEMES)
  for (const W of WIDTHS) {
    const mobile = W < 1024;
    const ctxRows = rows.filter((x) => x.theme === theme && x.W === W && x.before);
    const shell = ctxRows.filter((x) => !OWN_CHROME(x.before.path));
    for (const x of ctxRows) {
      const id = `${theme} ${W} ${x.route}`;
      for (const g of [x.before, x.after].filter(Boolean)) {
        if (g.hScroll) fails.push(`${id}: horizontal scroll (scrollWidth ${g.scrollWidth} > ${g.vw})`);
        if (g.sidebar?.visible) fails.push(`${id}: sidebar visible`);
        if (g.bottomnavCount > 1) fails.push(`${id}: bottom bar mounted ${g.bottomnavCount} times`);
      }
      if (x.endCover?.covered) fails.push(`${id}: content under bottom bar at page end (last ${x.endCover.lastContentBottom} > nav top ${x.endCover.navTop})`);
    }
    if (mobile) {
      const boxes = new Set();
      for (const x of shell)
        for (const g of [x.before, x.after]) {
          if (!g) continue;
          if (!g.bottomnav?.visible) { fails.push(`${theme} ${W} ${x.route}: bottom bar missing (${g === x.before ? "top" : "scrolled"})`); continue; }
          if (Math.abs(g.bottomGap) > 1) fails.push(`${theme} ${W} ${x.route}: bottom bar not flush (gap ${g.bottomGap}px, ${g === x.before ? "top" : "scrolled"})`);
          boxes.add(`${g.bottomnav.x},${g.bottomnav.y},${g.bottomnav.w},${g.bottomnav.h}`);
        }
      if (boxes.size > 1) fails.push(`${theme} ${W}: bottom bar bbox differs across routes: ${[...boxes].join(" | ")}`);
    } else {
      for (const x of shell) if (x.before.bottomnav?.visible) fails.push(`${theme} ${W} ${x.route}: bottom bar visible on desktop`);
      for (const x of shell) if (!x.before.header?.visible) fails.push(`${theme} ${W} ${x.route}: desktop header missing`);
    }
  }
const errCtx = results.filter((x) => x.errors && Object.keys(x.errors).length);
for (const e of errCtx) for (const [route, list] of Object.entries(e.errors)) fails.push(`${e.theme} ${e.W} ${route}: ${list.length} console/page/request errors, first: ${list[0]}`);
for (const x of rows.filter((x) => x.error || x.skipped)) fails.push(`${x.theme} ${x.W} ${x.route}: ${x.error || x.skipped}`);

writeFileSync(`${OUT}/report.json`, JSON.stringify({ base, date: new Date().toISOString(), titlePath, readerPath, results, fails }, null, 2));
const shots = rows.filter((x) => x.before).length;
const md = [
  `# screens.mjs report`,
  ``,
  `- Base: ${base}`,
  `- Date: ${new Date().toISOString()}`,
  `- Widths: ${WIDTHS.join(", ")}; themes: ${THEMES.join(", ")}; routes: ${ROUTES.join(", ")}`,
  `- Title used: ${titlePath ?? "none"}; reader used: ${readerPath ?? "none"}`,
  `- Screens captured: ${shots}; checks failed: ${fails.length}`,
  ``,
  `| theme | width | route | HTTP | load ms | bottom bar (x,y,w,h) | gap | header | h-scroll | covered at end |`,
  `|---|---|---|---|---|---|---|---|---|---|`,
  ...rows.filter((x) => x.before).map((x) => {
    const b = x.before.bottomnav;
    return `| ${x.theme} | ${x.W} | ${x.route.length > 40 ? slug(x.route) : x.route} | ${x.status} | ${x.ms} | ${b?.visible ? `${b.x},${b.y},${b.w},${b.h}` : "-"} | ${x.before.bottomGap ?? "-"} | ${x.before.header?.visible ? `${x.before.header.h}px ${x.before.header.position}` : "-"} | ${x.before.hScroll || x.after?.hScroll ? "YES" : "no"} | ${x.endCover ? (x.endCover.covered ? "YES" : "no") : "-"} |`;
  }),
  ``,
  `## Failed checks (${fails.length})`,
  ``,
  ...(fails.length ? fails.map((f) => `- ${f}`) : ["- none"]),
  ``,
].join("\n");
writeFileSync(`${OUT}/summary.md`, md);
console.log(`screens: ${shots} screens in ${OUT}; failed checks: ${fails.length}`);
for (const f of fails.slice(0, 40)) console.log("  FAIL " + f);
if (fails.length > 40) console.log(`  ... ${fails.length - 40} more in ${OUT}/summary.md`);
if (process.env.STRICT === "1" && fails.length) process.exit(1);
