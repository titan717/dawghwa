// SHIELD audit helpers shared by leaks.mjs and axe.mjs. QA only, never shipped.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Shell routes visited by every audit. Title and reader routes are discovered from links at run time. */
export const STATIC_ROUTES = ["/start", "/welcome", "/", "/discover", "/search", "/library", "/history", "/profile", "/achievements", "/about", "/does-not-exist"];

export const VIEWPORTS = {
  360: { width: 360, height: 780, mobile: true },
  390: { width: 390, height: 844, mobile: true },
  412: { width: 412, height: 915, mobile: true },
  768: { width: 768, height: 1024, mobile: true },
  1024: { width: 1024, height: 800, mobile: false },
  1440: { width: 1440, height: 900, mobile: false },
};

export function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : fallback;
}
export const flag = (name) => process.argv.includes(`--${name}`);
export const baseUrl = (fallback) => (process.argv.slice(2).find((a) => /^https?:\/\//.test(a)) ?? process.env.BASE ?? fallback).replace(/\/$/, "");

/**
 * Deny-list. Preferred source: docs/providers/_names.json (owned by SCOUT), shape
 *   { "names": string[], "domains"?: string[], "ignore"?: string[] (regex sources for known-safe contexts) }
 * or a bare string array. Until that file exists, the list is derived from the
 * docs/providers/*.md records (H1 names, backticked provider ids and site domains).
 */
export function loadDenyList(path = arg("names", process.env.LEAK_NAMES || join(ROOT, "docs/providers/_names.json"))) {
  let names = [];
  let domains = [];
  let ignore = [];
  let source = path;
  if (existsSync(path)) {
    const j = JSON.parse(readFileSync(path, "utf8"));
    if (Array.isArray(j)) names = j;
    else {
      names = j.names ?? [];
      domains = j.domains ?? [];
      ignore = j.ignore ?? [];
    }
  } else {
    source = `derived from docs/providers/*.md (placeholder until ${path} exists)`;
    const dir = join(ROOT, "docs/providers");
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".md") && !["README.md", "ux-notes.md"].includes(f))) {
      const head = readFileSync(join(dir, f), "utf8").split("\n").slice(0, 4).join("\n");
      const h1 = head.match(/^#\s+([^(\n]+)/m)?.[1]?.trim();
      if (h1) names.push(h1, h1.replace(/\s+/g, ""));
      for (const m of head.matchAll(/provider `([a-z0-9-]+)`/g)) names.push(m[1]);
      for (const m of head.matchAll(/\b((?:[a-z0-9-]+\.)+(?:com|org|net|to|ws|xyz|top|dev|io|cc|me))\b/g)) domains.push(m[1]);
      names.push(f.replace(/\.md$/, ""));
    }
    // "webtoon" is also the generic name of the format the app serves; only the domain counts in the placeholder.
    ignore.push("^webtoons?$");
  }
  const ig = ignore.map((s) => new RegExp(s, "i"));
  const clean = (xs) => [...new Set(xs.map((s) => String(s).trim()).filter((s) => s.length >= 3 && !ig.some((r) => r.test(s))))];
  names = clean(names);
  domains = clean(domains);
  const terms = [...new Set([...domains, ...names])].sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Boundaries: a name must not be glued to other letters/digits ("dexter" is not "dex").
  const re = new RegExp(`(?<![a-z0-9])(?:${terms.map(esc).join("|")})(?![a-z0-9])`, "gi");
  return { names, domains, terms, re, source };
}

export function findMatches(re, text, max = 5) {
  if (!text) return [];
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text)) && out.length < max) {
    const a = Math.max(0, m.index - 50);
    out.push({ term: m[0], snippet: text.slice(a, m.index + m[0].length + 50).replace(/\s+/g, " ") });
  }
  re.lastIndex = 0;
  return out;
}

/** Create a context for a viewport/theme and walk past the landing page and onboarding like a new visitor. */
export async function newVisitor(browser, { base, width = 390, theme = "dark" }) {
  const vp = VIEWPORTS[width] ?? { width, height: 900, mobile: width < 1024 };
  const ctx = await browser.newContext({
    serviceWorkers: "allow",
    colorScheme: theme,
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  });
  // Keep whatever the app saved, only force the theme.
  await ctx.addInitScript((t) => {
    try {
      const cur = JSON.parse(localStorage.getItem("dawghwa:settings") || "{}");
      if (cur.theme !== t) localStorage.setItem("dawghwa:settings", JSON.stringify({ ...cur, theme: t }));
    } catch {
      /* storage blocked */
    }
  }, theme);
  return ctx;
}

export async function passOnboarding(page, base) {
  await page.goto(base + "/welcome", { waitUntil: "domcontentloaded" });
  const skip = page.getByRole("button", { name: "Skip" });
  try {
    await skip.first().waitFor({ timeout: 20_000 });
    await skip.first().click();
    await page.waitForURL((u) => u.pathname === "/", { timeout: 15_000 });
    return true;
  } catch {
    return false;
  }
}

export async function settle(page, ms = 2500) {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

/** First link on the page matching a CSS selector, as a path. */
export async function firstLink(page, sel) {
  return page.evaluate((s) => {
    const a = document.querySelector(s);
    return a ? new URL(a.href).pathname + new URL(a.href).search : null;
  }, sel);
}
