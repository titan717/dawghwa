// QA: real image loading with no request interception. Counts rendered <img> that decoded vs broken.
import { chromium } from "playwright";
const base = process.env.BASE || "http://localhost:4173";
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/search", "/title/mangadex/77bee52c-d2d6-44ad-a33a-1734c1fe696a"];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
const page = await ctx.newPage();
const bad = [];
page.on("response", (r) => { if (r.request().resourceType() === "image" && r.status() >= 400) bad.push(`${r.status()} ${new URL(r.url()).host}`); });
await page.goto(base + "/welcome");
await page.getByRole("button", { name: "Cancel" }).click();
for (const p of paths) {
  await page.goto(base + p);
  await page.waitForTimeout(7000);
  const r = await page.evaluate(`(() => { const imgs = [...document.querySelectorAll("img")].filter((i) => i.complete && i.currentSrc && !i.currentSrc.startsWith("data:") && !i.currentSrc.includes("/mascot")); return { total: imgs.length, ok: imgs.filter((i) => i.naturalWidth > 0).length, fallbacks: document.querySelectorAll(".cover-fallback").length, sample: imgs.slice(0, 2).map((i) => i.currentSrc.slice(0, 90)) }; })()`);
  console.log(JSON.stringify({ path: p, ...r }));
}
console.log(JSON.stringify({ badImageResponses: bad.slice(0, 10), count: bad.length }));
await browser.close();
