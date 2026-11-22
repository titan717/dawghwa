/// <reference lib="dom" />
/**
 * LIVE native-reader verification (real providers, nothing mocked).
 *
 * Runs only with E2E_LIVE=1 against a running Dawghwa API. Each provider case
 * goes: provider search -> Dawghwa title page (unified list) -> open chapter
 * in the native reader -> real images decode in the browser -> progress is
 * saved under the canonical chapter key with the provider version recorded.
 *
 * The fallback case forces ONE provider's page request to fail (the only
 * intercepted request in the suite) and checks the reader switches to the
 * same chapter on another real provider, says so, and keeps the language.
 */
import { expect, test, type Page } from "@playwright/test";
import { apiUp, maybeRelay, skipOnboarding } from "./helpers";

const AIURA = { id: "814b682b-4405-47f7-b568-19929304df47", slug: "aiura" };
const UNORDINARY = { id: "de34e04a-a9a4-4d9b-b434-f13ad275230c", slug: "unordinary" };

test.skip(process.env.E2E_LIVE !== "1", "live provider E2E (set E2E_LIVE=1)");
test.describe.configure({ mode: "serial" });
test.setTimeout(150_000);
test.beforeEach(async ({ context }) => maybeRelay(context));

interface Prog { titleKey?: string; chapterId: string; page: number; sourceId?: string; variantId?: string; language?: string }

async function progress(page: Page): Promise<Prog[]> {
  return page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    const out: Prog[] = [];
    for (const d of dbs) {
      if (!d.name) continue;
      const db = await new Promise<IDBDatabase>((res, rej) => {
        const r = indexedDB.open(d.name!);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      if (db.objectStoreNames.contains("progress")) {
        const rows = await new Promise<Prog[]>((res) => {
          const q = db.transaction("progress").objectStore("progress").getAll();
          q.onsuccess = () => res(q.result as Prog[]);
        });
        out.push(...rows);
      }
      db.close();
    }
    return out;
  });
}

/** Wait until at least `n` reader images have really decoded (naturalWidth > 0). */
async function decodedImages(page: Page, n = 1) {
  await expect
    .poll(async () => page.locator(".rd-page img").evaluateAll((els) => els.filter((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0).length), { timeout: 60_000 })
    .toBeGreaterThanOrEqual(n);
}

/**
 * Progress is written after the reader settles on a page; poll for it instead
 * of sleeping a fixed time (which was both slow and flaky on cold CDNs).
 */
async function savedProgress(page: Page, match: (p: Prog) => boolean, what: string): Promise<Prog> {
  let found: Prog | undefined;
  await expect
    .poll(async () => (found = (await progress(page)).find(match)) !== undefined, { message: what, timeout: 20_000 })
    .toBe(true);
  return found!;
}

async function openTitle(page: Page, t: { id: string; slug: string }) {
  await page.goto(`/title/mangadex/${t.id}/${t.slug}`);
  await expect(page.locator("[data-chapter-key]").first()).toBeVisible({ timeout: 60_000 });
}

async function search(page: Page, source: string, query: string, re: RegExp) {
  const r = await page.request.post("/api/search", { data: { query, source } });
  expect(r.ok(), `${source} search HTTP ${r.status()}`).toBe(true);
  const body = (await r.json()) as { results: { title: string }[] };
  expect(body.results.some((x) => re.test(x.title)), `${source} finds ${query}`).toBe(true);
}

async function findRow(page: Page, q: string, keySuffix: string) {
  await page.getByLabel("Find chapter").fill(q);
  const row = page.locator(`[data-chapter-key$="${keySuffix}"]`).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  return row;
}

test.beforeEach(async ({ page }) => {
  test.skip(!(await apiUp(page)), "API not running");
  await skipOnboarding(page);
});

test("MangaDex: search, unified list, native reader, real images, progress", async ({ page }) => {
  await search(page, "mangadex", "Aiura", /aiura/i);
  await openTitle(page, AIURA);
  const row = await findRow(page, "1", "/en/s0/ch:1");
  await row.getByRole("button", { name: /Choose version of/ }).click();
  await page.getByRole("dialog").getByRole("link", { name: /MangaDex/ }).first().click();
  await expect(page).toHaveURL(/\/read\/mangadex\/.+s=mangadex/);
  await decodedImages(page);
  await expect(page.locator(".rd-chapter").getByText(/via MangaDex/)).toBeVisible();
  const p = await savedProgress(page, (x) => x.chapterId.endsWith("/en/s0/ch:1"), "progress saved under canonical chapter key");
  expect(p.sourceId).toBe("mangadex");
  await page.screenshot({ path: "test-results/live-mangadex-reader.png" });
});

test("Dynasty Reader: search, version picker on the merged title page, native reader, progress", async ({ page }) => {
  await search(page, "dynasty-reader", "Aiura", /aiura/i);
  await openTitle(page, AIURA);
  const row = await findRow(page, "1", "/en/s0/ch:1");
  await row.getByRole("button", { name: /Choose version of/ }).click();
  const sheet = page.getByRole("dialog");
  // merged: the one chapter row lists both providers
  await expect(sheet.getByRole("link", { name: /MangaDex/ }).first()).toBeVisible();
  await expect(sheet.getByRole("link", { name: /Dynasty/ }).first()).toBeVisible();
  await page.screenshot({ path: "test-results/live-merged-versions.png" });
  await sheet.getByRole("link", { name: /Dynasty/ }).first().click();
  await expect(page).toHaveURL(/s=dynasty-reader/);
  await decodedImages(page);
  await expect(page.locator(".rd-chapter").getByText(/via Dynasty/)).toBeVisible();
  await savedProgress(page, (x) => x.chapterId.endsWith("/en/s0/ch:1") && x.sourceId === "dynasty-reader", "Dynasty progress saved for chapter 1");
  await page.screenshot({ path: "test-results/live-dynasty-reader.png" });
});

test("WEBTOON: search, unified list, native reader (long strip), progress", async ({ page }) => {
  await search(page, "webtoon", "unOrdinary", /unordinary/i);
  await openTitle(page, UNORDINARY);
  await page.getByLabel(/Sort/).click().catch(() => undefined);
  const first = page.locator("[data-chapter-key]").filter({ hasText: /Prologue|Episode 1\b|Chapter 0/i }).first();
  await page.getByLabel("Find chapter").fill("Prologue");
  await expect(first).toBeVisible({ timeout: 20_000 });
  const versions = first.getByRole("button", { name: /Choose version of/ });
  if (await versions.count()) {
    await versions.click();
    await page.getByRole("dialog").getByRole("link", { name: /WEBTOON/ }).first().click();
  } else {
    await first.getByRole("link").first().click();
  }
  await expect(page).toHaveURL(/s=webtoon/);
  await decodedImages(page, 2); // long strip: several pages decode at once
  await expect(page.locator(".rd-chapter").getByText(/via WEBTOON/i)).toBeVisible();
  await savedProgress(page, (x) => x.sourceId === "webtoon", "WEBTOON progress saved");
  await page.screenshot({ path: "test-results/live-webtoon-reader.png" });
});

test("merge: one Aiura title page carries chapters from MangaDex and Dynasty", async ({ page }) => {
  const r = await page.request.get(`/api/titles/mangadex:${AIURA.id}/chapters/all`);
  const body = (await r.json()) as { chapters: { key: string; variants: { sourceId: string }[] }[] };
  const merged = body.chapters.filter((c) => new Set(c.variants.map((v) => v.sourceId)).size > 1);
  expect(merged.length).toBeGreaterThan(50);
  await openTitle(page, AIURA);
  // the chapter list shows each merged chapter once, with a versions control
  const key = merged[0]!.key;
  await page.getByLabel("Find chapter").fill(key.split(":").pop()!);
  await expect(page.locator(`[data-chapter-key="${key}"]`)).toHaveCount(1);
  await expect(page.locator(`[data-chapter-key="${key}"]`).getByRole("button", { name: /Choose version of/ })).toBeVisible();
});

test("fallback: MangaDex page request fails -> same chapter, same language on Dynasty, with notice", async ({ page }) => {
  // Only MangaDex manifests are forced to fail; Dynasty is the real provider.
  await page.route("**/api/pages", async (route) => {
    const body = route.request().postDataJSON() as { source?: string } | null;
    if (body?.source === "mangadex") return route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: { code: "UPSTREAM_ERROR", message: "forced by test" } }) });
    return route.continue();
  });
  const reports: unknown[] = [];
  page.on("request", (req) => {
    if (req.url().endsWith("/api/reports") && req.method() === "POST") reports.push(req.postDataJSON());
  });
  await openTitle(page, AIURA);
  const row = await findRow(page, "2", "/en/s0/ch:2");
  const key = await row.getAttribute("data-chapter-key");
  await row.getByRole("button", { name: /Choose version of/ }).click();
  await page.getByRole("dialog").getByRole("link", { name: /MangaDex/ }).first().click();
  const notice = page.getByTestId("reader-notice");
  await expect(notice).toContainText(/MangaDex couldn't load Chapter 2/, { timeout: 60_000 });
  await expect(notice).toContainText(/Dynasty/);
  await expect(notice).toContainText(/EN/);
  await expect(page).toHaveURL(/s=dynasty-reader/);
  // still the same canonical chapter
  expect(decodeURIComponent(page.url())).toContain(key!);
  await decodedImages(page);
  await page.screenshot({ path: "test-results/live-fallback.png" });
  await expect.poll(() => reports.length).toBeGreaterThan(0);
  expect(JSON.stringify(reports[0])).toContain("mangadex");
});

const RAGNAROK = { id: "c3ea5ce6-f659-4fe9-95b6-520cec9fcb13", slug: "solo-leveling-ragnarok" };

test("Asura Scans: linked on the unified title page, native reader, real images, progress", async ({ page }) => {
  await search(page, "asurascan", "Solo Leveling: Ragnarok", /ragnarok/i);
  await openTitle(page, RAGNAROK);
  // exactly chapter 1: a "1" filter also matches 10, 11, 21..., so match the key suffix
  await page.getByLabel("Find chapter").fill("1");
  const rows = page.locator('[data-chapter-key$="/ch:1"]');
  await expect(rows.first()).toBeVisible({ timeout: 30_000 });
  const row = rows.first();
  const key = (await row.getAttribute("data-chapter-key"))!;
  const versions = row.getByRole("button", { name: /Choose version of/ });
  if (await versions.count()) {
    await versions.click();
    await page.getByRole("dialog").getByRole("link", { name: /Asura/ }).first().click();
  } else {
    await row.getByRole("link").first().click();
  }
  await expect(page).toHaveURL(/\/read\/.+s=asurascan/);
  await decodedImages(page, 2);
  await expect(page.locator(".rd-chapter").getByText(/via AsuraScan/)).toBeVisible();
  // images are relayed by the API, never loaded from the provider by the browser
  const srcs = await page.locator(".rd-page img").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).currentSrc || (e as HTMLImageElement).src));
  expect(srcs.every((s) => s.includes("/api/image") && s.includes("source=asurascan"))).toBe(true);
  await savedProgress(page, (x) => x.sourceId === "asurascan" && x.chapterId === key, `Asura progress saved for ${key}`);
  await page.screenshot({ path: "test-results/live-asura-reader.png" });
});

test("Scanlation site from 'Search more': provider title page, native reader, progress", async ({ page }) => {
  await page.goto("/search?q=ragnarok");
  await page.getByRole("button", { name: "Search more" }).click();
  // Wider results are one merged list with no source labels; pick this provider's entry by its link.
  const block = page.locator(".more-results");
  await expect(block.locator("a.list-item[href^='/title/thunderscans/']").first()).toBeVisible({ timeout: 120_000 });
  await expect(block).not.toContainText(/thunderscans/i);
  // pick the intended series by name, and require it to be unambiguous, rather than whatever ranks first
  const hit = block.locator("a.list-item[href^='/title/thunderscans/']").filter({ hasText: /solo leveling:?\s*ragnarok/i });
  await expect(hit, "exactly one Thunderscans result for Solo Leveling: Ragnarok").toHaveCount(1);
  await hit.click();
  await expect(page).toHaveURL(/\/title\/thunderscans\//);
  const row = page.locator("[data-chapter-key]").first();
  await expect(row).toBeVisible({ timeout: 60_000 });
  const key = (await row.getAttribute("data-chapter-key"))!;
  await row.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/read\/thunderscans\//);
  await decodedImages(page, 2);
  await savedProgress(page, (x) => x.chapterId === key && (x.sourceId === "thunderscans" || Boolean(x.titleKey?.startsWith("thunderscans"))), `Thunderscans progress saved for ${key}`);
  await page.screenshot({ path: "test-results/live-thunderscans-reader.png" });
});
