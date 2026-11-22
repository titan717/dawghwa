// WARDEN/SENTINEL production smoke test (also runs against a preview with BASE=...).
// Steps: landing -> app, home rows, search, a title page, a chapter in the reader, profile switching,
// and Incognito when the build has it. Exits non-zero on any failed step or console error. QA only.
import { chromium } from "playwright";

const BASE = process.env.BASE || "https://dawghwa.vercel.app";
const OUT = process.env.OUT || "/tmp/smoke";
const results = [];
const step = async (name, fn) => {
  const t = Date.now();
  try {
    const note = await fn();
    results.push({ name, ok: true, ms: Date.now() - t, note: note ?? "" });
  } catch (e) {
    results.push({ name, ok: false, ms: Date.now() - t, note: String(e?.message ?? e).split("\n")[0].slice(0, 200) });
  }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: "dark", serviceWorkers: "block" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror " + e.message));
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const text = m.text();
  // a third-party image host refusing a cover is a network fact, not an app error; everything else counts
  if (/Failed to load resource/.test(text)) return;
  errors.push("console " + text.slice(0, 200));
});

await step("landing -> app", async () => {
  await page.goto(BASE + "/");
  await page.getByRole("button", { name: "Use in browser" }).click();
  await page.waitForURL(/\/welcome/, { timeout: 15000 });
  await page.getByRole("button", { name: "Skip" }).click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 });
});
await step("home rows", async () => {
  await page.locator("a[href^='/title/']").first().waitFor({ timeout: 30000 });
  const n = await page.locator("a[href^='/title/']").count();
  await page.screenshot({ path: `${OUT}-home.png` });
  if (n < 6) throw new Error(`only ${n} title links`);
  return `${n} title links`;
});
let titleHref = "";
await step("search", async () => {
  await page.goto(BASE + "/search?q=solo%20leveling");
  const hit = page.locator("main a[href^='/title/']").first();
  await hit.waitFor({ timeout: 30000 });
  titleHref = (await hit.getAttribute("href")) ?? "";
  return `${await page.locator("main a[href^='/title/']").count()} results`;
});
await step("title page", async () => {
  await page.goto(BASE + "/title/mangadex/77bee52c-d2d6-44ad-a33a-1734c1fe696a");
  await page.locator("h1").first().waitFor({ timeout: 30000 });
  await page.locator("a[href^='/read/']").first().waitFor({ timeout: 30000 });
  await page.screenshot({ path: `${OUT}-title.png` });
  return (await page.locator("h1").first().textContent())?.trim();
});
await step("reader loads a chapter", async () => {
  await page.locator("a[href^='/read/']").first().click();
  await page.locator(".rd-page img").first().waitFor({ state: "attached", timeout: 40000 });
  await page.waitForFunction(() => [...document.querySelectorAll(".rd-page img")].some((i) => i.complete && i.naturalWidth > 0), null, { timeout: 40000 });
  await page.screenshot({ path: `${OUT}-reader.png` });
  return `${await page.locator(".rd-page img").count()} page images`;
});
await step("profile switching", async () => {
  await page.goto(BASE + "/profile");
  await page.getByRole("button", { name: "New reader" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill("Smoke B");
  await page.getByRole("button", { name: "Create and switch" }).click();
  await page.waitForURL(/\/welcome/, { timeout: 15000 });
  await page.goto(BASE + "/profile");
  await page.getByRole("heading", { level: 1, name: "Smoke B" }).waitFor({ timeout: 15000 });
  const other = page.locator("button.chip[aria-pressed='false']").first();
  await other.click();
  await page.getByRole("heading", { level: 1 }).filter({ hasNotText: "Smoke B" }).first().waitFor({ timeout: 15000 });
});
await step("incognito", async () => {
  await page.goto(BASE + "/profile");
  const toggle = page.getByRole("switch", { name: /Incognito/i }).or(page.getByRole("checkbox", { name: /Incognito/i })).or(page.getByRole("button", { name: /Incognito/i }));
  if (!(await toggle.count())) return "not in this build (skipped)";
  await toggle.first().click();
  await page.getByText(/Incognito/).first().waitFor({ timeout: 5000 });
  return "toggled on";
});
await browser.close();

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  ${r.ms}ms  ${r.note}`);
console.log(`console errors: ${errors.length}`);
for (const e of errors.slice(0, 10)) console.log("  " + e);
process.exit(failed.length || errors.length ? 1 : 0);
