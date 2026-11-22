#!/usr/bin/env node
/**
 * WCAG 2.x contrast check for Dawghwa's design tokens (no dependencies).
 *
 * Reads src/styles/tokens.css, resolves every theme (dark, amoled, light, sepia, and the
 * system-light block) under every accent (coral, violet, lime, gold, mono), and checks each
 * text/background and UI/background pair below. Translucent colours are composited over the
 * theme background first, the way the browser paints them.
 *
 *   node scripts/contrast-check.mjs              # table of failures + summary, exit 1 on any failure
 *   node scripts/contrast-check.mjs --all        # every pair
 *   node scripts/contrast-check.mjs --markdown   # per-theme minimum table for docs/DESIGN.md
 *   node scripts/contrast-check.mjs --json
 *
 * Thresholds: 4.5:1 for text (all token text is treated as normal size, the strict case),
 * 3:1 for UI components and focus indicators (WCAG 1.4.11).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const TOKENS = resolve(here, "../src/styles/tokens.css");

export const THEMES = ["dark", "amoled", "light", "sepia"];
export const ACCENTS = ["coral", "violet", "lime", "gold", "mono"];
const TEXT = 4.5;
const UI = 3;

const SURFACES = ["bg", "bg-raised", "surface", "surface-2", "surface-3"];
const TEXT_TOKENS = ["ink", "ink-2", "ink-3", "accent-text", "new-text", "hot-text", "lime-text", "lavender-text", "good", "warn", "bad", "color-focus"];

/** [foreground, background, minimum, kind]. Backgrounds may be "a over b" (composited). */
export const PAIRS = [
  ...TEXT_TOKENS.flatMap((fg) => SURFACES.map((bg) => [fg, bg, TEXT, "text"])),
  // tinted backgrounds (selected chips, soft badges)
  ...["bg", "surface"].flatMap((under) => [
    ["accent-text", `accent-soft over ${under}`, TEXT, "text"],
    ["ink", `accent-soft over ${under}`, TEXT, "text"],
    ["lime-text", `lime-soft over ${under}`, TEXT, "text"],
    ["lavender-text", `lavender-soft over ${under}`, TEXT, "text"],
  ]),
  // header (translucent over the page)
  ["ink", "header-bg over bg", TEXT, "text"],
  ["ink-2", "header-bg over bg", TEXT, "text"],
  ["ink-3", "header-bg over bg", TEXT, "text"],
  ["accent-text", "header-bg over bg", TEXT, "text"],
  // text on fills
  ["accent-ink", "accent", TEXT, "text"],
  ["accent-ink", "accent-hover", TEXT, "text"],
  ["new-ink", "new", TEXT, "text"],
  ["hot-ink", "hot", TEXT, "text"],
  ["on-bright", "lime", TEXT, "text"],
  ["on-bright", "vermilion", TEXT, "text"],
  ["on-bright", "lavender", TEXT, "text"],
  ["chip-ink", "chip-bg", TEXT, "text"],
  ["reader-ink", "reader-bg", TEXT, "text"],
  ["reader-ink", "reader-bar over reader-bg", TEXT, "text"],
  // UI components: filled buttons / active indicators, control borders, focus ring
  ...["bg", "bg-raised", "surface", "surface-2"].flatMap((bg) => [
    ["accent", bg, UI, "ui"],
    ["line-ui", bg, UI, "ui"],
    ["color-focus", bg, UI, "ui"],
  ]),
];

// ---------------------------------------------------------------- CSS parsing
function parseBlocks(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(clean))) {
    const selector = m[1].replace(/^[\s\S]*\{/, "").trim().replace(/\s+/g, " ");
    const decls = {};
    for (const d of m[2].split(";")) {
      const i = d.indexOf(":");
      if (i < 0) continue;
      const k = d.slice(0, i).trim();
      if (k.startsWith("--")) decls[k.slice(2)] = d.slice(i + 1).trim();
    }
    blocks.push({ selector, decls });
  }
  return blocks;
}

function merged(blocks, selector) {
  const out = {};
  for (const b of blocks) if (b.selector === selector) Object.assign(out, b.decls);
  return out;
}

export function loadThemes(css = readFileSync(TOKENS, "utf8")) {
  const blocks = parseBlocks(css);
  const base = merged(blocks, ":root");
  const darkBlock = merged(blocks, ':root, [data-theme="dark"]');
  const themeBlocks = {
    dark: darkBlock,
    amoled: merged(blocks, '[data-theme="amoled"]'),
    light: merged(blocks, '[data-theme="light"]'),
    sepia: merged(blocks, '[data-theme="sepia"]'),
    system: merged(blocks, '[data-theme="system"]'),
  };
  const accentBlocks = Object.fromEntries(ACCENTS.map((a) => [a, a === "coral" ? {} : merged(blocks, `:root[data-accent="${a}"]`)]));
  for (const [name, b] of Object.entries({ ...themeBlocks, ...accentBlocks })) {
    if (name !== "coral" && Object.keys(b).length === 0) throw new Error(`tokens.css: no block found for "${name}"`);
  }
  return { base, darkBlock, themeBlocks, accentBlocks };
}

// ---------------------------------------------------------------- colour maths
function parseColor(v) {
  v = v.trim().toLowerCase();
  let m = v.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const n = [0, 2, 4, 6].map((i) => (h.length > i ? parseInt(h.slice(i, i + 2), 16) : 255));
    return { r: n[0], g: n[1], b: n[2], a: n[3] / 255 };
  }
  m = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[/,]\s*([\d.]+%?))?\s*\)$/);
  if (m) {
    let a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  return null;
}
const over = (top, under) => ({
  r: top.r * top.a + under.r * (1 - top.a),
  g: top.g * top.a + under.g * (1 - top.a),
  b: top.b * top.a + under.b * (1 - top.a),
  a: 1,
});
function luminance({ r, g, b }) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
const hex = (c) => "#" + [c.r, c.g, c.b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");

function resolver(vars) {
  const seen = new Set();
  const get = (name) => {
    const raw = vars[name];
    if (raw === undefined) throw new Error(`token --${name} is not defined`);
    if (seen.has(name)) throw new Error(`token --${name} is circular`);
    seen.add(name);
    try {
      const m = raw.match(/^var\(\s*--([\w-]+)\s*(?:,\s*(.+))?\)$/);
      if (m) return vars[m[1]] === undefined && m[2] ? m[2] : get(m[1]);
      return raw;
    } finally {
      seen.delete(name);
    }
  };
  return (name) => {
    const c = parseColor(get(name));
    if (!c) throw new Error(`token --${name} is not a plain colour: ${vars[name]}`);
    return c;
  };
}

// ---------------------------------------------------------------- run
export function check(css) {
  const { base, darkBlock, themeBlocks, accentBlocks } = loadThemes(css);
  const rows = [];
  const problems = [];

  // the system block must mirror light exactly
  const light = themeBlocks.light;
  const sys = themeBlocks.system;
  for (const k of new Set([...Object.keys(light), ...Object.keys(sys)])) {
    if (light[k] !== sys[k]) problems.push(`[data-theme="system"] --${k} (${sys[k]}) differs from light (${light[k]})`);
  }

  for (const theme of THEMES) {
    for (const accent of ACCENTS) {
      // cascade on <html>: :root base, the dark block (matches :root), accent, then the theme block
      const vars = { ...base, ...darkBlock, ...accentBlocks[accent], ...themeBlocks[theme] };
      const color = resolver(vars);
      const page = color("bg");
      const paint = (spec) => {
        const parts = spec.split(" over ");
        let c = color(parts[parts.length - 1]);
        if (c.a < 1) c = over(c, page);
        for (let i = parts.length - 2; i >= 0; i--) c = over(color(parts[i]), c);
        return c;
      };
      for (const [fg, bg, min, kind] of PAIRS) {
        const b = paint(bg);
        const f = over(color(fg), b);
        const r = ratio(f, b);
        rows.push({ theme, accent, fg, bg, kind, min, ratio: Math.floor(r * 100) / 100, fgHex: hex(f), bgHex: hex(b), pass: r >= min });
      }
    }
  }
  return { rows, problems };
}

function markdown(rows) {
  const out = [];
  out.push("| Theme | Accent | Pairs | Lowest text pair | Lowest UI pair |", "| --- | --- | --- | --- | --- |");
  for (const t of THEMES)
    for (const a of ACCENTS) {
      const rs = rows.filter((r) => r.theme === t && r.accent === a);
      const lo = (k) => rs.filter((r) => r.kind === k).sort((x, y) => x.ratio - y.ratio)[0];
      const tx = lo("text");
      const ui = lo("ui");
      out.push(`| ${t} | ${a} | ${rs.length} | ${tx.ratio.toFixed(2)}:1 (\`${tx.fg}\` on \`${tx.bg}\`) | ${ui.ratio.toFixed(2)}:1 (\`${ui.fg}\` on \`${ui.bg}\`) |`);
    }
  const pick = (rs, fg, bg) => rs.find((r) => r.fg === fg && r.bg === bg).ratio.toFixed(2);
  out.push("", "| Theme | Accent | `accent-ink` on `accent` | `accent-text` on `bg` | `accent-text` on `surface-2` | `accent` on `bg` (UI) |", "| --- | --- | --- | --- | --- | --- |");
  for (const t of THEMES)
    for (const a of ACCENTS) {
      const rs = rows.filter((r) => r.theme === t && r.accent === a);
      out.push(`| ${t} | ${a} | ${pick(rs, "accent-ink", "accent")} | ${pick(rs, "accent-text", "bg")} | ${pick(rs, "accent-text", "surface-2")} | ${pick(rs, "accent", "bg")} |`);
    }
  out.push("", "| Theme | `ink` on `bg` | `ink-2` on `bg` | `ink-3` on `bg` | `ink-3` on `surface-3` | `chip-ink` on `chip-bg` | `reader-ink` on `reader-bg` |", "| --- | --- | --- | --- | --- | --- | --- |");
  for (const t of THEMES) {
    const rs = rows.filter((r) => r.theme === t && r.accent === "coral");
    out.push(`| ${t} | ${pick(rs, "ink", "bg")} | ${pick(rs, "ink-2", "bg")} | ${pick(rs, "ink-3", "bg")} | ${pick(rs, "ink-3", "surface-3")} | ${pick(rs, "chip-ink", "chip-bg")} | ${pick(rs, "reader-ink", "reader-bg")} |`);
  }
  return out.join("\n");
}

function main() {
  const args = new Set(process.argv.slice(2));
  const { rows, problems } = check();
  const fails = rows.filter((r) => !r.pass);
  if (args.has("--json")) {
    console.log(JSON.stringify({ rows, problems }, null, 2));
  } else if (args.has("--markdown")) {
    console.log(markdown(rows));
  } else {
    const show = args.has("--all") ? rows : fails;
    for (const r of show)
      console.log(`${r.pass ? "ok  " : "FAIL"} ${r.theme.padEnd(6)} ${r.accent.padEnd(6)} ${r.fg.padEnd(14)} on ${r.bg.padEnd(26)} ${r.ratio.toFixed(2).padStart(5)}:1 (min ${r.min}) ${r.fgHex}/${r.bgHex}`);
    for (const p of problems) console.log(`FAIL ${p}`);
    console.log(`contrast: ${rows.length - fails.length}/${rows.length} pairs pass across ${THEMES.length} themes x ${ACCENTS.length} accents${problems.length ? `, ${problems.length} system/light drift problem(s)` : ""}`);
  }
  if (fails.length || problems.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
