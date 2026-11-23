// SHIELD accessibility sweep (gate 7): axe (WCAG 2.0/2.1 A and AA) on every screen, both themes, every viewport.
// Fails on any serious or critical violation. QA only, never shipped.
// Usage: node scripts/audit/axe.mjs [base-url] [--widths 360,390,412,768,1024,1440] [--themes dark,light]
//        [--routes /,/search] [--no-discover] [--out <dir>]
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STATIC_ROUTES, arg, baseUrl, firstLink, flag, newVisitor, passOnboarding, settle } from "./lib.mjs";

const base = baseUrl("https://dawghwa.vercel.app");
const widths = arg("widths", "360,390,412,768,1024,1440").split(",").map(Number);
const themes = arg("themes", "dark,light").split(",");
const routes = arg("routes") ? arg("routes").split(",") : STATIC_ROUTES;
const out = arg("out", `/tmp/shield-axe-${new Date().toISOString().replace(/[:.]/g, "-")}`);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const rows = [];
let discovered = null;
for (const theme of themes)
  for (const width of widths) {
    const ctx = await newVisitor(browser, { base, width, theme });
    const page = await ctx.newPage();
    await passOnboarding(page, base);
    let list = [...routes];
    if (!flag("no-discover")) {
      if (!discovered) {
        await page.goto(base + "/");
        await settle(page);
        const t = await firstLink(page, "a[href^='/title/'], a[href^='/t/']");
        let c = null;
        if (t) {
          await page.goto(base + t);
          await settle(page);
          c = await firstLink(page, "a[href^='/read/']");
        }
        discovered = { title: t, chapter: c };
      }
      list = [...list, discovered.title, discovered.chapter].filter(Boolean);
    }
    for (const path of list) {
      try {
        await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await settle(page, 1500);
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        rows.push({
          theme,
          width,
          path,
          final: new URL(page.url()).pathname,
          serious: bad.length,
          violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, targets: v.nodes.slice(0, 4).map((n) => n.target.join(" ")) })),
        });
      } catch (e) {
        rows.push({ theme, width, path, error: String(e).slice(0, 200) });
      }
    }
    await ctx.close();
  }
await browser.close();

const failing = rows.filter((r) => r.serious || r.error);
writeFileSync(join(out, "axe.json"), JSON.stringify({ base, at: new Date().toISOString(), discovered, rows }, null, 2));
// Aggregate by rule so the table stays readable.
const agg = {};
for (const r of rows)
  for (const v of r.violations ?? []) {
    const k = `${v.impact}|${v.id}`;
    agg[k] ??= { impact: v.impact, id: v.id, screens: new Set(), nodes: 0, targets: new Set() };
    agg[k].screens.add(`${r.path} ${r.theme} ${r.width}`);
    agg[k].nodes += v.nodes;
    v.targets.forEach((t) => agg[k].targets.size < 4 && agg[k].targets.add(t));
  }
const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
const md = [
  `# axe sweep ${new Date().toISOString()}`,
  "",
  `Base: ${base} · themes ${themes.join(",")} · widths ${widths.join(",")} · ${rows.length} screen runs · discovered ${JSON.stringify(discovered)}`,
  "",
  `**Result: ${failing.length ? "FAIL" : "PASS"}**, ${failing.length} screen runs with serious/critical violations or errors`,
  "",
  "| Impact | Rule | Screen runs | Nodes | Example targets | Routes |",
  "|---|---|---|---|---|---|",
  ...Object.values(agg)
    .sort((a, b) => order[a.impact] - order[b.impact] || b.screens.size - a.screens.size)
    .map((a) => `| ${a.impact} | ${a.id} | ${a.screens.size} | ${a.nodes} | ${[...a.targets].join("<br>").replace(/\|/g, "\\|")} | ${[...new Set([...a.screens].map((s) => s.split(" ")[0]))].join(" ")} |`),
  "",
  ...rows.filter((r) => r.error).map((r) => `- error ${r.path} ${r.theme} ${r.width}: ${r.error}`),
  "",
].join("\n");
writeFileSync(join(out, "axe.md"), md);
console.log(`axe ${base}: ${failing.length ? "FAIL" : "PASS"}, ${rows.length} runs, ${failing.length} failing; report ${join(out, "axe.md")}`);
process.exit(failing.length ? 1 : 0);
