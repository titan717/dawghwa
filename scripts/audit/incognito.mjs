// SHIELD Incognito boundary test (gate 9). Turns Incognito on, reads like a user (Home, a title,
// a chapter, search, library, history) with in-app navigation only (a reload would end Incognito),
// and fails if any IndexedDB row or non-allow-listed localStorage key/value changed.
// Cache Storage and sessionStorage changes are reported as warnings.
// QA only, never shipped.
// Usage: node scripts/audit/incognito.mjs [base-url] [--width 390] [--out <dir>]
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { arg, baseUrl, newVisitor, passOnboarding, settle } from "./lib.mjs";

const base = baseUrl("https://dawghwa.vercel.app");
const width = Number(arg("width", "390"));
const out = arg("out", `/tmp/shield-incognito-${new Date().toISOString().replace(/[:.]/g, "-")}`);
// The documented allow-list (src/lib/store/incognito.ts): preferences only.
const LOCAL_ALLOW = new Set(["dawghwa:settings", "dawghwa:library-view", "dawghwa:entered"]);
mkdirSync(out, { recursive: true });

const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);

async function snapshot(page) {
  const raw = await page.evaluate(async () => {
    const dump = (s) => Object.fromEntries(Array.from({ length: s.length }, (_, i) => s.key(i)).map((k) => [k, s.getItem(k)]));
    const idb = {};
    for (const { name } of (await indexedDB.databases?.()) ?? []) {
      if (!name || name.startsWith("workbox")) continue;
      const db = await new Promise((ok) => {
        const r = indexedDB.open(name);
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ok(null);
      });
      if (!db) continue;
      for (const store of Array.from(db.objectStoreNames)) {
        const all = await new Promise((ok) => {
          const os = db.transaction(store, "readonly").objectStore(store);
          const out = [];
          const c = os.openCursor();
          c.onsuccess = () => {
            const cur = c.result;
            if (!cur) return ok(out);
            out.push([JSON.stringify(cur.key), JSON.stringify(cur.value)]);
            cur.continue();
          };
          c.onerror = () => ok(out);
        });
        idb[`${name}/${store}`] = all;
      }
      db.close();
    }
    const cache = {};
    for (const n of (await caches?.keys?.()) ?? []) cache[n] = (await (await caches.open(n)).keys()).map((r) => r.url);
    return { local: dump(localStorage), session: dump(sessionStorage), idb, cache };
  });
  const idb = {};
  for (const [store, rows] of Object.entries(raw.idb)) idb[store] = Object.fromEntries(rows.map(([k, v]) => [k, v]));
  return { ...raw, idb };
}

function diff(a, b) {
  const fails = [];
  const warns = [];
  for (const store of new Set([...Object.keys(a.idb), ...Object.keys(b.idb)])) {
    const x = a.idb[store] ?? {};
    const y = b.idb[store] ?? {};
    const added = Object.keys(y).filter((k) => !(k in x));
    const removed = Object.keys(x).filter((k) => !(k in y));
    const changed = Object.keys(y).filter((k) => k in x && x[k] !== y[k]);
    if (added.length || removed.length || changed.length)
      fails.push({ where: `IndexedDB ${store}`, rows: `${Object.keys(x).length} -> ${Object.keys(y).length}`, added: added.slice(0, 5), removed: removed.slice(0, 5), changed: changed.slice(0, 5), counts: { added: added.length, removed: removed.length, changed: changed.length } });
  }
  for (const k of new Set([...Object.keys(a.local), ...Object.keys(b.local)])) {
    if (a.local[k] === b.local[k]) continue;
    const row = { where: `localStorage ${k}`, before: a.local[k] == null ? null : hash(a.local[k]), after: b.local[k] == null ? null : hash(b.local[k]) };
    (LOCAL_ALLOW.has(k) ? warns : fails).push(row);
  }
  for (const k of new Set([...Object.keys(a.session), ...Object.keys(b.session)]))
    if (a.session[k] !== b.session[k]) warns.push({ where: `sessionStorage ${k}`, note: "changed during Incognito (ends with the tab)" });
  for (const n of new Set([...Object.keys(a.cache), ...Object.keys(b.cache)])) {
    const x = new Set(a.cache[n] ?? []);
    const added = (b.cache[n] ?? []).filter((u) => !x.has(u));
    if (added.length) warns.push({ where: `CacheStorage ${n}`, added: added.length });
  }
  return { fails, warns };
}

/** In-app navigation (keeps the memory-only flag): the router listens to popstate. */
async function go(page, path) {
  await page.evaluate((p) => {
    history.pushState({}, "", p);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  await settle(page, 2500);
}

async function turnOn(page) {
  // Cycle 1 icon button (Spec A) first, then the Profile switch that exists today.
  const btn = page.getByRole("button", { name: /incognito/i }).first();
  if (await btn.isVisible().catch(() => false)) {
    const pressed = await btn.getAttribute("aria-pressed");
    if (pressed !== "true") await btn.click();
    // close the explanatory sheet if one opened
    await page.keyboard.press("Escape").catch(() => {});
    return "icon button";
  }
  await go(page, "/profile");
  const sw = page.getByRole("checkbox", { name: /incognito/i }).or(page.getByRole("switch", { name: /incognito/i })).first();
  await sw.check();
  return "profile switch";
}

const browser = await chromium.launch();
const ctx = await newVisitor(browser, { base, width, theme: "dark" });
const page = await ctx.newPage();
const steps = [];
let result;
try {
  if (!(await passOnboarding(page, base))) throw new Error("could not pass onboarding");
  await settle(page, 4000);
  // Warm-up outside Incognito so the stores exist and caches are primed for a fair diff.
  await page.goto(base + "/");
  await settle(page, 4000);
  const before = await snapshot(page);
  const how = await turnOn(page);
  steps.push(`incognito on via ${how}`);
  await go(page, "/");
  const title = await page.evaluate(() => document.querySelector("a[href^='/title/'], a[href^='/t/']")?.getAttribute("href"));
  if (title) {
    await go(page, title);
    steps.push(`title ${title}`);
    const chapter = await page.evaluate(() => document.querySelector("a[href^='/read/']")?.getAttribute("href"));
    if (chapter) {
      await go(page, chapter);
      await page.mouse.wheel(0, 4000);
      await page.waitForTimeout(6000); // past the reader's position debounce
      await page.mouse.wheel(0, 4000);
      await page.waitForTimeout(3000);
      steps.push(`chapter ${chapter}`);
    }
  }
  await go(page, "/search?q=solo");
  const box = page.getByRole("searchbox").or(page.getByRole("textbox")).first();
  if (await box.isVisible().catch(() => false)) {
    await box.fill("tower");
    await box.press("Enter");
    await settle(page, 2500);
    steps.push("searched");
  }
  for (const p of ["/library", "/history", "/achievements", "/"]) await go(page, p);
  const after = await snapshot(page);
  result = diff(before, after);
  // Confirm the flag survived the whole walk (otherwise the test proves nothing).
  await go(page, "/profile");
  const sw = page.getByRole("checkbox", { name: /incognito/i }).or(page.getByRole("switch", { name: /incognito/i })).first();
  const stillOn = (await sw.isChecked().catch(() => null)) ?? (await page.getByRole("button", { name: /incognito/i }).first().getAttribute("aria-pressed").catch(() => null));
  steps.push(`incognito still on at the end: ${stillOn}`);
  if (stillOn === false || stillOn === "false") result.fails.push({ where: "flag", error: "Incognito turned off during the walk; the diff is not meaningful" });
  result.inventory = { idbStores: Object.fromEntries(Object.entries(after.idb).map(([k, v]) => [k, Object.keys(v).length])), localStorage: Object.keys(after.local) };
} catch (e) {
  result = { fails: [{ where: "run", error: String(e).slice(0, 300) }], warns: [] };
}
await browser.close();

const report = { base, at: new Date().toISOString(), width, steps, ...result };
writeFileSync(join(out, "incognito.json"), JSON.stringify(report, null, 2));
const md = [
  `# Incognito boundary ${report.at}`,
  "",
  `Base: ${base} · ${width}px · steps: ${steps.join(" → ")}`,
  "",
  `**Result: ${result.fails.length ? "FAIL" : "PASS"}** (${result.fails.length} failing changes, ${result.warns.length} warnings)`,
  "",
  "| Kind | Where | Detail |",
  "|---|---|---|",
  ...result.fails.map((f) => `| FAIL | ${f.where} | ${JSON.stringify({ ...f, where: undefined }).replace(/\|/g, "\\|").slice(0, 400)} |`),
  ...result.warns.map((f) => `| warn | ${f.where} | ${JSON.stringify({ ...f, where: undefined }).replace(/\|/g, "\\|").slice(0, 300)} |`),
  "",
].join("\n");
writeFileSync(join(out, "incognito.md"), md);
console.log(`incognito boundary ${base}: ${result.fails.length ? "FAIL" : "PASS"}, ${result.fails.length} failing changes, ${result.warns.length} warnings; report ${join(out, "incognito.md")}`);
process.exit(result.fails.length ? 1 : 0);
