import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { apiUp, maybeRelay, skipOnboarding } from "./helpers";

test.beforeEach(async ({ context }) => maybeRelay(context));

/** Incognito is memory-only, so a full page load ends it: move around in-app instead. */
async function go(page: Page, path: string) {
  await page.evaluate((p) => {
    history.pushState({}, "", p);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  // the reader may rewrite its URL to the canonical chapter key, so only the route is checked
  await expect(page).toHaveURL((u) => u.pathname.startsWith(path.split("/").slice(0, 3).join("/")));
}

/** Row counts in the profile's private stores, read straight from IndexedDB. */
async function stored(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ progress: number; events: number; comments: number }>((resolve, reject) => {
        const r = indexedDB.open("dawghwa");
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const d = r.result;
          const tx = d.transaction(["progress", "events", "comments"]);
          const [p, e, c] = (["progress", "events", "comments"] as const).map((n) => tx.objectStore(n).count());
          tx.oncomplete = () => {
            d.close();
            resolve({ progress: p!.result, events: e!.result, comments: c!.result });
          };
        };
      }),
  );
}

const activityKeys = (page: Page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("dawghwa.pos.") || k.startsWith("dawghwa:recent-searches")));

async function turnOn(page: Page) {
  await page.getByRole("checkbox", { name: "Read in Incognito" }).check();
  await expect(page.getByTestId("incognito-notice")).toBeVisible();
}

test("Incognito is one tap, explains itself truthfully and ends on reload", async ({ page }) => {
  await skipOnboarding(page);
  await page.goto("/profile");
  await expect(page.getByTestId("incognito-notice")).toHaveCount(0);
  await turnOn(page);
  const notice = page.getByTestId("incognito-notice");
  await expect(notice).toContainText("isn't saved to this profile's history, progress, rewards or picks");
  await expect(notice).toContainText("doesn't hide activity from your network or this device's owner");
  await expect(notice).toContainText("nothing is encrypted");
  await expect(notice).not.toContainText(/private|secret|anonymous/i);

  // recent searches are not kept while it is on
  await go(page, "/search");
  const box = page.getByLabel("Search titles");
  await box.fill("solo");
  await box.press("Enter");
  await page.waitForTimeout(3500); // recent searches are saved after a 2.5s pause
  expect(await activityKeys(page)).toEqual([]);

  // the flag itself is never stored: a reload ends it
  const keys = await page.evaluate(() => Object.keys(localStorage).join(" "));
  expect(keys).not.toMatch(/incognito/i);
  await go(page, "/profile");
  await expect(page.getByRole("checkbox", { name: "Read in Incognito" })).toBeChecked();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Read in Incognito" })).not.toBeChecked();
  await expect(page.getByTestId("incognito-notice")).toHaveCount(0);
});

test("reading in Incognito leaves History and Continue reading unchanged; turning it off saves again", async ({ page, request }) => {
  test.skip(!(await apiUp(page)), "API not running");
  const browse = await request.get("/api/catalog?provider=mangadex&sort=popularity&limit=20");
  test.skip(browse.status() === 503, "Catalogue paused upstream; nothing to read right now");
  const items = ((await browse.json()) as { items: { providerId: string; url: string }[] }).items.map((i) => ({ id: i.providerId, url: i.url }));
  let target: { id: string; chapter: string } | undefined;
  for (const it of items) {
    const r = await request.post("/api/chapters", { data: { source: "mangadex", url: it.url } });
    const chs = ((await r.json()) as { chapters?: { id: string }[] }).chapters ?? [];
    if (chs.length) {
      target = { id: it.id, chapter: chs[chs.length - 1]!.id };
      break;
    }
  }
  test.skip(!target, "No readable chapters available right now");
  const readPath = `/read/mangadex/${target!.id}/${target!.chapter}`;

  await page.addInitScript(() => localStorage.setItem("dawghwa:settings", JSON.stringify({ autoNext: false })));
  await skipOnboarding(page);
  await page.goto("/profile");
  const before = await stored(page);
  await turnOn(page);

  await go(page, readPath);
  await expect(page.locator(".rd-page img").first()).toBeAttached({ timeout: 25_000 });
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(1500); // longer than the position-save debounce
  await page.keyboard.press("End"); // reach the end: would count the chapter as read
  await page.waitForTimeout(1500);

  await go(page, "/history");
  await expect(page.getByText("No reading history yet")).toBeVisible();
  await go(page, "/");
  await expect(page.locator("#continue")).toHaveCount(0);
  expect(await stored(page)).toEqual(before);
  expect(await activityKeys(page)).toEqual([]);

  // off again: the same reading is saved as normal
  await go(page, "/profile");
  await page.getByRole("checkbox", { name: "Read in Incognito" }).uncheck();
  await expect(page.getByTestId("incognito-notice")).toHaveCount(0);
  await go(page, readPath);
  await expect(page.locator(".rd-page img").first()).toBeAttached({ timeout: 25_000 });
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(1500);
  await go(page, "/history");
  await expect(page.getByText(/page \d+ of/)).toBeVisible();
  expect((await stored(page)).progress).toBe(before.progress + 1);
});

for (const theme of ["dark", "light"] as const) {
  test(`axe: Profile with Incognito on has no serious violations (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("dawghwa:settings", JSON.stringify({ theme: t })), theme);
    await skipOnboarding(page);
    await page.goto("/profile");
    await turnOn(page);
    await page.waitForTimeout(600);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id} (${v.nodes.length}) ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}
