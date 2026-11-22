import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const script = resolve(root, "scripts/contrast-check.mjs");

describe("design tokens contrast (scripts/contrast-check.mjs)", () => {
  it("every text/background and UI pair passes WCAG AA in every theme and accent", () => {
    const out = JSON.parse(execFileSync(process.execPath, [script, "--json"], { encoding: "utf8" })) as {
      rows: { theme: string; accent: string; fg: string; bg: string; ratio: number; min: number; pass: boolean }[];
      problems: string[];
    };
    const fails = out.rows.filter((r) => !r.pass).map((r) => `${r.theme}/${r.accent}: ${r.fg} on ${r.bg} = ${r.ratio}:1 (< ${r.min})`);
    expect(fails).toEqual([]);
    expect(out.problems).toEqual([]);
    // 4 themes x 5 accents, all pairs present
    expect(new Set(out.rows.map((r) => `${r.theme}/${r.accent}`)).size).toBe(20);
  });

  it("fonts are self-hosted: no runtime requests to font CDNs", () => {
    const files = ["index.html", "src/main.tsx", "src/styles/tokens.css", "src/styles/base.css", "src/styles/app.css", "src/styles/landing.css", "src/styles/reader.css"];
    for (const f of files) {
      const text = readFileSync(resolve(root, f), "utf8");
      expect(text, f).not.toMatch(/fonts\.(googleapis|gstatic)\.com|use\.typekit|fonts\.bunny|@import\s+url\(\s*["']?https?:/);
    }
  });
});
