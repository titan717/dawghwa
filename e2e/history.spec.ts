import { expect, test, type Page } from "@playwright/test";
import { skipOnboarding } from "./helpers";

const EMPTY = "No reading history yet";

/** Write one series and its reading position into the active profile. */
async function seedHistory(page: Page) {
  await page.evaluate(async () => {
    const req = (r: IDBRequest) => new Promise<unknown>((ok, no) => ((r.onsuccess = () => ok(r.result)), (r.onerror = () => no(r.error))));
    const d = (await req(indexedDB.open("dawghwa"))) as IDBDatabase;
    const tx = d.transaction(["kv", "titles", "progress"], "readwrite");
    const active = (await req(tx.objectStore("kv").get("activeProfile"))) as { value: string };
    const now = Date.now();
    tx.objectStore("titles").put({ key: "t:history-demo", sourceId: "t", id: "history-demo", url: "", title: "History Demo Series", cachedAt: now });
    tx.objectStore("progress").put({
      profileId: active.value, titleKey: "t:history-demo", chapterId: "c1", chapterNumber: 3,
      page: 1, pageCount: 10, fraction: 0.2, read: {}, maxReadNumber: 0, startedAt: now, updatedAt: now,
    });
    await new Promise((ok) => (tx.oncomplete = ok));
    d.close();
  });
}

test("history never shows a false empty state while a profile with history is loading", async ({ page }) => {
  await skipOnboarding(page);
  await seedHistory(page);
  // Before the app boots: record whether the empty-state text is ever rendered, and
  // hold a write transaction on `progress` so the store cannot become ready until released.
  await page.addInitScript((empty) => {
    const w = window as unknown as { __sawEmpty: boolean; __release: () => void };
    w.__sawEmpty = false;
    let held = true;
    w.__release = () => (held = false);
    new MutationObserver(() => {
      if (document.body?.textContent?.includes(empty)) w.__sawEmpty = true;
    }).observe(document, { childList: true, subtree: true, characterData: true });
    const open = indexedDB.open("dawghwa");
    open.onsuccess = () => {
      const store = open.result.transaction("progress", "readwrite").objectStore("progress");
      const spin = () => { if (held) store.get("__hold__").onsuccess = spin; };
      spin();
      open.result.onversionchange = () => open.result.close();
    };
  }, EMPTY);
  await page.goto("/history");
  // Storage is held: nothing may claim the history is empty while the profile is loading.
  await page.waitForFunction(() => document.readyState === "complete");
  await expect(page.getByText(EMPTY)).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { __release: () => void }).__release());
  await expect(page.getByRole("link", { name: /History Demo Series Chapter 3 · page 2 of 10/ })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __sawEmpty: boolean }).__sawEmpty)).toBe(false);
});

test("history shows the empty state once loaded with nothing read", async ({ page }) => {
  await skipOnboarding(page);
  await page.goto("/history");
  await expect(page.getByText(EMPTY)).toBeVisible();
  await expect(page.locator("[aria-busy='true'][aria-label='Loading']")).toHaveCount(0);
});
