import { expect, test, type Page } from "@playwright/test";
import { skipOnboarding } from "./helpers";
import { axe, mockApi, setTheme } from "./mock-api";

// Spec O / Spec G: the Library Downloaded tab (FEATURE_OFFLINE) and Library/History polish.

/** Two saved titles in the active profile; only "Offline Demo" has a downloaded chapter. */
async function seed(page: Page, withDownload = true) {
  await page.evaluate(async (withDownload) => {
    const req = <T,>(r: IDBRequest<T>) => new Promise<T>((ok, no) => ((r.onsuccess = () => ok(r.result)), (r.onerror = () => no(r.error))));
    const d = await req(indexedDB.open("dawghwa"));
    const tx = d.transaction(["kv", "titles", "library"], "readwrite");
    const pid = ((await req(tx.objectStore("kv").get("activeProfile"))) as { value: string }).value;
    const now = Date.now();
    for (const [id, title] of [["offline-demo", "Offline Demo"], ["online-only", "Online Only"]]) {
      tx.objectStore("titles").put({ key: `t:${id}`, sourceId: "t", id, url: "", title, cachedAt: now });
      tx.objectStore("library").put({ profileId: pid, titleKey: `t:${id}`, status: "reading", favorite: false, collections: [], addedAt: now, updatedAt: now });
    }
    await new Promise((ok) => (tx.oncomplete = ok));
    d.close();
    if (!withDownload) return;
    const o = indexedDB.open("dawghwa-offline", 1);
    o.onupgradeneeded = () => o.result.createObjectStore("chapters", { keyPath: "key" });
    const od = await req(o);
    const t2 = od.transaction("chapters", "readwrite");
    t2.objectStore("chapters").put({ key: `${pid}|t:offline-demo|1`, profileId: pid, titleKey: "t:offline-demo", n: 1, pages: 3, bytes: 300, savedAt: now, complete: true });
    t2.objectStore("chapters").put({ key: `${pid}|t:online-only|1`, profileId: pid, titleKey: "t:online-only", n: 1, pages: 3, bytes: 100, savedAt: now, complete: false });
    await new Promise((ok) => (t2.oncomplete = ok));
    od.close();
  }, withDownload);
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await skipOnboarding(page);
});

test("Downloaded tab is absent when FEATURE_OFFLINE is off", async ({ page }) => {
  await seed(page);
  await page.goto("/library?ff=-offline");
  await expect(page.getByRole("tab", { name: /^Saved/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /^Downloaded/ })).toHaveCount(0);
  // an old link to the tab falls back to Saved
  await page.goto("/library?tab=downloaded");
  await expect(page.getByRole("tab", { name: /^Saved/ })).toHaveAttribute("aria-selected", "true");
});

test("Downloaded tab lists only titles with a complete download in this profile", async ({ page }) => {
  await seed(page);
  await page.goto("/library?ff=offline");
  await page.getByRole("tab", { name: /^Downloaded/ }).click();
  await expect(page.getByRole("tab", { name: /^Downloaded/ })).toHaveAttribute("aria-selected", "true");
  const rows = page.locator(".lib-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Offline Demo");
  await expect(rows.first()).toContainText("1 chapter saved");
});

test("Downloaded empty state, with no offline database created", async ({ page }) => {
  await seed(page, false);
  await page.goto("/library?ff=offline&tab=downloaded");
  await expect(page.getByRole("heading", { name: "No downloads yet" })).toBeVisible();
  await expect(page.getByText("Save chapters from a series page to read them offline.")).toBeVisible();
  const dbs = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  expect(dbs).not.toContain("dawghwa-offline");
});

test("empty library hides the zero counters; CTA is at least 48px", async ({ page }) => {
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Your library is empty" })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Show" })).toHaveCount(0);
  const cta = await page.getByRole("link", { name: "Find something to read" }).boundingBox();
  expect(cta!.height).toBeGreaterThanOrEqual(48);
});

test("the selected tab is scrolled into view", async ({ page }) => {
  await seed(page);
  await page.goto("/library?tab=dropped");
  const tab = page.getByRole("tab", { name: /^Dropped/ });
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await expect(tab).toBeInViewport({ ratio: 1 });
});

for (const theme of ["dark", "light"] as const) {
  test(`axe: library (saved, downloaded) and history (${theme})`, async ({ page }) => {
    test.setTimeout(90_000);
    await setTheme(page, theme);
    await page.reload();
    await seed(page);
    await page.goto("/library?ff=offline");
    await expect(page.locator(".lib-row").first()).toBeVisible();
    await axe(page, "library");
    await page.getByRole("tab", { name: /^Downloaded/ }).click();
    await expect(page.locator(".lib-row")).toHaveCount(1);
    await axe(page, "library-downloaded");
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "No reading history yet" })).toBeVisible();
    await axe(page, "history");
  });
}
