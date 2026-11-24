// SHIELD leak audit (gate 8). Visits the app like a reader and fails on any deny-list name
// (provider names, slugs and domains from docs/providers/_names.json) found in:
//   url       the address bar of every visited page (paths, query strings)
//   request   URLs the browser requests (images, API calls, third-party hosts)
//   header    response header names and values
//   response  text/JSON/HTML/JS/CSS response bodies (API and app)
//   bundle    every same-origin JS chunk, plus its sourcemap when one is served
//   dom       rendered text, link targets, image sources and <head> meta
//   storage   localStorage, sessionStorage, IndexedDB keys and values, Cache Storage URLs
// QA only, never shipped. Never point it at a provider site; it only visits the app under test.
//
// Usage: node scripts/audit/leaks.mjs [base-url] [--names <path>] [--width 390] [--theme dark]
//        [--out <dir>] [--routes /,/search] [--no-discover] [--allow-category request,storage]
// Exit code: 0 = no matches, 1 = matches found (or the run failed), 2 = usage error.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STATIC_ROUTES, arg, baseUrl, findMatches, firstLink, flag, loadDenyList, newVisitor, passOnboarding, settle } from "./lib.mjs";

const base = baseUrl("https://dawghwa.vercel.app");
const width = Number(arg("width", "390"));
const theme = arg("theme", "dark");
const out = arg("out", `/tmp/shield-leaks-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const routes = arg("routes") ? arg("routes").split(",") : STATIC_ROUTES;
const allowCats = new Set((arg("allow-category", "") || "").split(",").filter(Boolean));
const deny = loadDenyList();
if (!deny.terms.length) {
  console.error("deny-list is empty");
  process.exit(2);
}
const origin = new URL(base).origin;
mkdirSync(out, { recursive: true });

/** @type {{category:string, where:string, term:string, snippet:string}[]} */
const findings = [];
const seen = new Set();
function scan(category, where, text) {
  for (const m of findMatches(deny.re, text)) {
    // One row per location and term; query strings are ignored so 60 catalog pages count once.
    const k = `${category}|${where.replace(/\?[^\s\]]*/, "")}|${m.term.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    findings.push({ category, where, term: m.term, snippet: m.snippet });
  }
}

const TEXTY = /json|javascript|ecmascript|text\/|xml|manifest|svg/;
const bundles = new Set();
const stats = { responses: 0, scannedBodies: 0, requests: 0, thirdPartyHosts: new Set(), pages: [] };

const browser = await chromium.launch();
const ctx = await newVisitor(browser, { base, width, theme });
ctx.on("request", (req) => {
  stats.requests++;
  const u = req.url();
  if (u.startsWith("data:") || u.startsWith("blob:")) return;
  const h = new URL(u).host;
  if (new URL(u).origin !== origin) stats.thirdPartyHosts.add(h);
  scan("request", `${req.method()} ${req.resourceType()}`, u);
});
ctx.on("response", async (res) => {
  stats.responses++;
  const u = res.url();
  if (u.startsWith("data:")) return;
  const short = u.length > 140 ? u.slice(0, 140) + "…" : u;
  const headers = await res.allHeaders().catch(() => ({}));
  for (const [k, v] of Object.entries(headers)) scan("header", `${short} [${k}]`, `${k}: ${v}`);
  const ct = headers["content-type"] ?? "";
  if (!TEXTY.test(ct) || res.status() === 204 || (res.status() >= 300 && res.status() < 400)) return;
  const body = await res.text().catch(() => null);
  if (body == null || body.length > 8_000_000) return;
  stats.scannedBodies++;
  const sameOrigin = new URL(u).origin === origin;
  const isJs = /javascript|ecmascript/.test(ct) || /\.m?js(\?|$)/.test(new URL(u).pathname);
  if (sameOrigin && isJs) bundles.add(u);
  scan(sameOrigin && isJs ? "bundle" : "response", `${res.status()} ${short}`, body);
});

const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));

async function visit(path) {
  const t0 = Date.now();
  let status = null;
  try {
    const r = await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 30_000 });
    status = r?.status() ?? null;
  } catch (e) {
    stats.pages.push({ path, error: String(e).slice(0, 160) });
    return;
  }
  await settle(page);
  await page.mouse.wheel(0, 1500).catch(() => {});
  await page.waitForTimeout(800);
  const final = page.url();
  scan("url", path, decodeURIComponent(final));
  const dom = await page.evaluate(() => {
    const attrs = [];
    for (const el of document.querySelectorAll("[href],[src],[srcset],[content],[data-src],[title],[aria-label],[alt],[action]"))
      for (const a of ["href", "src", "srcset", "content", "data-src", "title", "aria-label", "alt", "action"]) {
        const v = el.getAttribute(a);
        if (v) attrs.push(`${el.tagName.toLowerCase()}[${a}]=${v}`);
      }
    return { text: document.body?.innerText ?? "", title: document.title, attrs: attrs.join("\n") };
  });
  scan("dom", `${path} text`, dom.title + "\n" + dom.text);
  scan("dom", `${path} attributes`, dom.attrs);
  stats.pages.push({ path, final: final.replace(origin, ""), status, ms: Date.now() - t0 });
}

const onboarded = await passOnboarding(page, base);
for (const r of routes) await visit(r);

// Discover a title and a chapter the way a reader would (first links on Home, then the title page).
const discovered = {};
if (!flag("no-discover")) {
  await visit("/");
  const t = await firstLink(page, "a[href^='/title/'], a[href^='/t/']");
  if (t) {
    discovered.title = t;
    await visit(t);
    const c = await firstLink(page, "a[href^='/read/']");
    if (c) {
      discovered.chapter = c;
      await visit(c);
    }
  }
  await visit("/search?q=solo");
}

// Storage: localStorage, sessionStorage, IndexedDB, Cache Storage.
const storage = await page.evaluate(async () => {
  const dump = (s) => Object.fromEntries(Array.from({ length: s.length }, (_, i) => s.key(i)).map((k) => [k, s.getItem(k)]));
  const idb = {};
  const dbs = (await indexedDB.databases?.()) ?? [];
  for (const { name } of dbs) {
    if (!name) continue;
    const db = await new Promise((ok, no) => {
      const r = indexedDB.open(name);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    }).catch(() => null);
    if (!db) continue;
    idb[name] = {};
    for (const store of Array.from(db.objectStoreNames)) {
      const tx = db.transaction(store, "readonly").objectStore(store);
      const get = (req) => new Promise((ok) => ((req.onsuccess = () => ok(req.result)), (req.onerror = () => ok([]))));
      const keys = await get(tx.getAllKeys(null, 2000));
      const vals = await get(db.transaction(store, "readonly").objectStore(store).getAll(null, 500));
      idb[name][store] = { count: keys.length, keys: keys.map((k) => JSON.stringify(k)), values: JSON.stringify(vals).slice(0, 2_000_000) };
    }
    db.close();
  }
  const cache = {};
  for (const n of (await caches?.keys?.()) ?? []) cache[n] = (await (await caches.open(n)).keys()).map((r) => r.url);
  return { local: dump(localStorage), session: dump(sessionStorage), idb, cache };
});
for (const [k, v] of Object.entries(storage.local)) {
  scan("storage", `localStorage key ${k}`, k);
  scan("storage", `localStorage value ${k}`, v);
}
for (const [k, v] of Object.entries(storage.session)) {
  scan("storage", `sessionStorage key ${k}`, k);
  scan("storage", `sessionStorage value ${k}`, v);
}
for (const [db, stores] of Object.entries(storage.idb))
  for (const [s, d] of Object.entries(stores)) {
    scan("storage", `IndexedDB ${db}/${s} keys`, d.keys.join("\n"));
    scan("storage", `IndexedDB ${db}/${s} values`, d.values);
  }
for (const [n, urls] of Object.entries(storage.cache)) scan("storage", `CacheStorage ${n}`, urls.join("\n"));

// Bundle: fetch every same-origin chunk we saw (already scanned) and look for sourcemaps.
const maps = [];
for (const u of bundles) {
  const js = await ctx.request.get(u).then((r) => r.text()).catch(() => "");
  const ref = js.match(/\/\/[#@] sourceMappingURL=([^\s'"]+)\s*$/m)?.[1];
  for (const cand of [ref && !ref.startsWith("data:") ? new URL(ref, u).href : null, u.split("?")[0] + ".map"].filter(Boolean)) {
    const r = await ctx.request.get(cand).catch(() => null);
    const ok = r && r.ok() && /json|octet|text/.test(r.headers()["content-type"] ?? "");
    const body = ok ? await r.text() : "";
    if (ok && body.trimStart().startsWith("{")) {
      maps.push(cand);
      scan("sourcemap", cand.replace(origin, ""), body);
      break;
    }
  }
  if (ref?.startsWith("data:")) {
    maps.push(`${u} (inline)`);
    scan("sourcemap", `${u.replace(origin, "")} inline`, Buffer.from(ref.split(",")[1] ?? "", "base64").toString());
  }
}
// The service worker and manifest are fetched outside the page's network events.
for (const p of ["/sw.js", "/manifest.webmanifest", "/robots.txt", "/sitemap.xml"]) {
  const r = await ctx.request.get(base + p).catch(() => null);
  if (r?.ok()) scan("response", `${r.status()} ${p}`, await r.text());
}

await browser.close();

const failing = findings.filter((f) => !allowCats.has(f.category));
const byCat = {};
for (const f of findings) byCat[f.category] = (byCat[f.category] ?? 0) + 1;
const report = {
  base,
  at: new Date().toISOString(),
  width,
  theme,
  onboarded,
  denyList: { source: deny.source, terms: deny.terms.length },
  discovered,
  pages: stats.pages,
  counts: { requests: stats.requests, responses: stats.responses, scannedBodies: stats.scannedBodies, bundles: bundles.size, sourcemaps: maps.length },
  thirdPartyHosts: [...stats.thirdPartyHosts].sort(),
  storageInventory: {
    localStorage: Object.keys(storage.local),
    sessionStorage: Object.keys(storage.session),
    indexedDB: Object.fromEntries(Object.entries(storage.idb).map(([db, s]) => [db, Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.count]))])),
    cacheStorage: Object.fromEntries(Object.entries(storage.cache).map(([k, v]) => [k, v.length])),
  },
  sourcemaps: maps,
  pageErrors,
  matchesByCategory: byCat,
  findings,
};
writeFileSync(join(out, "leaks.json"), JSON.stringify(report, null, 2));

// Markdown summary. Matched terms are printed so the team can fix them; this file is internal QA output.
const md = [
  `# Leak audit ${report.at}`,
  "",
  `Base: ${base} · viewport ${width} · ${theme} · deny-list: ${deny.terms.length} terms (${deny.source})`,
  "",
  `Pages: ${stats.pages.length} · requests ${stats.requests} · bodies scanned ${stats.scannedBodies} · JS chunks ${bundles.size} · sourcemaps served ${maps.length}`,
  "",
  `Discovered title: ${discovered.title ?? "none"} · chapter: ${discovered.chapter ?? "none"}`,
  "",
  `Third-party hosts requested by the browser: ${report.thirdPartyHosts.join(", ") || "none"}`,
  "",
  `**Result: ${failing.length ? "FAIL" : "PASS"}**, ${findings.length} match locations (${Object.entries(byCat).map(([k, v]) => `${k} ${v}`).join(", ") || "none"})${allowCats.size ? `; not failing on: ${[...allowCats].join(", ")}` : ""}`,
  "",
  "| Category | Where | Term | Context |",
  "|---|---|---|---|",
  ...findings.map((f) => `| ${f.category} | ${f.where.replace(/\|/g, "\\|")} | ${f.term} | ${f.snippet.replace(/\|/g, "\\|").slice(0, 160)} |`),
  "",
].join("\n");
writeFileSync(join(out, "leaks.md"), md);
console.log(`leak audit ${base} (${width}px ${theme}): ${failing.length ? "FAIL" : "PASS"}, ${findings.length} match locations ${JSON.stringify(byCat)}`);
console.log(`pages ${stats.pages.length}, requests ${stats.requests}, bodies ${stats.scannedBodies}, chunks ${bundles.size}, sourcemaps ${maps.length}`);
console.log(`report: ${join(out, "leaks.md")}`);
process.exit(failing.length ? 1 : 0);
