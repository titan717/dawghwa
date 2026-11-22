#!/usr/bin/env node
/**
 * Baseline / after screenshots + axe counts for every core screen.
 *
 *   node scripts/screenshots.mjs [BASE_URL] [OUT_DIR]
 *   node scripts/screenshots.mjs https://dawghwa.vercel.app docs/screenshots/baseline
 *   node scripts/screenshots.mjs http://localhost:4173 docs/screenshots/after
 *
 * Widths 390/768/1440, light + dark (colorScheme AND the app's own
 * `dawghwa:settings.theme`), unscrolled + scrolled. Viewport-only JPEG q70.
 * Writes <OUT>/results.json with axe serious/critical counts and top-bar probes.
 * Env: TITLE_PATH (default a MangaDex title used by e2e), ONLY=home,search (subset).
 */
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.argv[2] ?? "https://dawghwa.vercel.app").replace(/\/$/, "");
const OUT = process.argv[3] ?? "docs/screenshots/baseline";
const TITLE_PATH = process.env.TITLE_PATH ?? "/title/mangadex/77bee52c-d2d6-44ad-a33a-1734c1fe696a";
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const WIDTHS = [390, 768, 1440];
const HEIGHT = { 390: 844, 768: 1024, 1440: 900 };
const THEMES = ["light", "dark"];
mkdirSync(OUT, { recursive: true });

const results = { base: BASE, date: new Date().toISOString(), shots: [], axe: {}, topbar: {}, errors: [] };
const want = (p) => !ONLY || ONLY.includes(p);

async function settle(page, ms = 1500) {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function axe(page, key) {
  try {
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    results.axe[key] = {
      serious: bad.filter((v) => v.impact === "serious").reduce((n, v) => n + v.nodes.length, 0),
      critical: bad.filter((v) => v.impact === "critical").reduce((n, v) => n + v.nodes.length, 0),
      rules: bad.map((v) => `${v.impact}:${v.id}(${v.nodes.length})`),
      minor: r.violations.filter((v) => v.impact === "minor" || v.impact === "moderate").map((v) => `${v.impact}:${v.id}(${v.nodes.length})`),
    };
  } catch (e) {
    results.errors.push(`axe ${key}: ${e.message}`);
  }
}

/** Probe for any fixed/sticky header-like element at the top of the viewport. */
async function probeTop(page) {
  return page.evaluate(() => {
    const bar = document.querySelector(".home-bar");
    const box = bar?.getBoundingClientRect();
    const fixed = [...document.querySelectorAll("body *")]
      .filter((el) => { const s = getComputedStyle(el); return (s.position === "fixed" || s.position === "sticky") && s.display !== "none" && el.getBoundingClientRect().height > 0; })
      .map((el) => { const b = el.getBoundingClientRect(); return `${el.tagName.toLowerCase()}.${[...el.classList].join(".")} pos=${getComputedStyle(el).position} top=${Math.round(b.top)} h=${Math.round(b.height)} w=${Math.round(b.width)}`; })
      .slice(0, 8);
    return {
      scrollY: Math.round(scrollY),
      homeBar: bar ? { display: getComputedStyle(bar).display, position: getComputedStyle(bar).position, top: Math.round(box.top), height: Math.round(box.height), visible: box.bottom > 0 && getComputedStyle(bar).display !== "none" } : null,
      fixedOrSticky: fixed,
    };
  });
}

async function scrollDown(page, px) {
  await page.evaluate((y) => {
    window.scrollBy(0, y);
    // some screens scroll an inner container
    const sc = [...document.querySelectorAll("main, [class*=scroll], .rd-strip")].find((el) => el.scrollHeight > el.clientHeight + 50 && /auto|scroll/.test(getComputedStyle(el).overflowY));
    if (sc && window.scrollY === 0) sc.scrollBy(0, y);
  }, px);
  await page.waitForTimeout(900);
}

async function shoot(page, name, width, theme, { scroll = true, scrollPx, axeIt = true } = {}) {
  if (!want(name)) return;
  const tag = `${name}-${width}-${theme}`;
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const top = await page.screenshot({ path: join(OUT, `${tag}-top.jpg`), type: "jpeg", quality: 70 });
  results.shots.push(`${tag}-top.jpg`);
  if (name === "home") results.topbar[`${width}-${theme}-top`] = await probeTop(page);
  if (axeIt) await axe(page, tag);
  if (scroll) {
    await scrollDown(page, scrollPx ?? Math.round(HEIGHT[width] * 0.9));
    await page.screenshot({ path: join(OUT, `${tag}-scrolled.jpg`), type: "jpeg", quality: 70 });
    results.shots.push(`${tag}-scrolled.jpg`);
    if (name === "home") results.topbar[`${width}-${theme}-scrolled`] = await probeTop(page);
  }
  void top;
}

async function run(browser, width, theme) {
  const ctx = await browser.newContext({
    viewport: { width, height: HEIGHT[width] },
    deviceScaleFactor: 1,
    colorScheme: theme,
    serviceWorkers: "block",
    isMobile: width < 768,
    hasTouch: width < 1024,
  });
  await ctx.addInitScript((t) => {
    const cur = JSON.parse(localStorage.getItem("dawghwa:settings") ?? "{}");
    localStorage.setItem("dawghwa:settings", JSON.stringify({ ...cur, theme: t, autoNext: false }));
  }, theme);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => results.errors.push(`${width}-${theme} pageerror: ${e.message}`));
  const step = async (label, fn) => { try { await fn(); } catch (e) { results.errors.push(`${width}-${theme} ${label}: ${e.message.split("\n")[0]}`); } };

  await step("landing", async () => {
    await page.goto(BASE + "/");
    await settle(page);
    await shoot(page, "landing", width, theme);
    await page.getByRole("button", { name: "Use in browser" }).click();
    await page.waitForURL(/\/welcome/);
  });
  await step("onboarding", async () => {
    await settle(page, 800);
    await shoot(page, "onboarding", width, theme, { scroll: false });
    await page.getByRole("button", { name: "Create reader" }).click();
    await page.waitForTimeout(800);
    await shoot(page, "onboarding2", width, theme);
    await page.getByRole("button", { name: "Skip" }).click();
    await page.waitForURL((u) => u.pathname === "/");
  });
  await step("home", async () => { await settle(page, 2500); await shoot(page, "home", width, theme); });
  await step("search", async () => {
    await page.goto(BASE + "/search"); await settle(page, 1500);
    await shoot(page, "search", width, theme, { scroll: false });
    const box = page.getByRole("searchbox").or(page.getByRole("combobox")).or(page.locator("input[type=search], input")).first();
    await box.fill("solo leveling"); await box.press("Enter");
    await settle(page, 3500);
    await shoot(page, "search-results", width, theme);
  });
  await step("title", async () => {
    await page.goto(BASE + TITLE_PATH);
    await page.locator(".chapter").first().waitFor({ timeout: 30_000 }).catch(() => {});
    await settle(page, 1500);
    await shoot(page, "title", width, theme, { scrollPx: 1400 });
  });
  await step("reader", async () => {
    await page.goto(BASE + TITLE_PATH);
    await page.locator(".chapter").first().waitFor({ timeout: 30_000 });
    await page.locator("a[href^='/read/']").first().click();
    await page.locator(".rd-page img").first().waitFor({ state: "attached", timeout: 30_000 }).catch(() => {});
    await settle(page, 3000);
    await shoot(page, "reader", width, theme, { scrollPx: 2500 });
  });
  for (const p of ["library", "history", "profile"]) {
    await step(p, async () => { await page.goto(BASE + "/" + p); await settle(page, 1500); await shoot(page, p, width, theme); });
  }
  await ctx.close();
}

const browser = await chromium.launch();
for (const w of WIDTHS) for (const t of THEMES) { console.log("run", w, t); await run(browser, w, t); }
await browser.close();
writeFileSync(join(OUT, "results.json"), JSON.stringify(results, null, 2));
console.log(`${results.shots.length} shots, ${results.errors.length} errors -> ${OUT}`);
