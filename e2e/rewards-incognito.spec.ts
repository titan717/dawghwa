import { expect, test, type Page } from "@playwright/test";
import { maybeRelay, skipOnboarding } from "./helpers";

/**
 * Spec L: Incognito earns nothing. Runs without the API: the profile is seeded
 * straight into IndexedDB (a saved series and two days of finished chapters),
 * then earning actions are taken in Incognito from the Library card menu.
 */
test.beforeEach(async ({ context }) => maybeRelay(context));

const TITLE = { key: "e2e:keeper", sourceId: "e2e", id: "keeper", url: "https://example.test/keeper", title: "Keeper Test Series", meta: { genres: ["Action"] } };

async function seed(page: Page) {
  await page.evaluate(async (title) => {
    const db: IDBDatabase = await new Promise((res, rej) => {
      const r = indexedDB.open("dawghwa");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const profiles: { id: string }[] = await new Promise((res) => {
      const r = db.transaction("profiles").objectStore("profiles").getAll();
      r.onsuccess = () => res(r.result);
    });
    const now = Date.now();
    const tx = db.transaction(["titles", "library", "events"], "readwrite");
    tx.objectStore("titles").put({ ...title, cachedAt: now });
    for (const p of profiles) {
      tx.objectStore("library").put({ profileId: p.id, titleKey: title.key, status: "plan", favorite: false, collections: [], addedAt: now, updatedAt: now });
      [1, 0].forEach((ago, i) => {
        const d = new Date();
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() - ago);
        tx.objectStore("events").put({ profileId: p.id, seq: 9000 + i, kind: "chapter_read", titleKey: title.key, at: Math.min(d.getTime(), now - 1000), value: i + 1 });
      });
    }
    await new Promise((res) => (tx.oncomplete = res));
    db.close();
  }, TITLE);
}

/** Row counts per store for the whole database. */
async function counts(page: Page) {
  return page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((res, rej) => {
      const r = indexedDB.open("dawghwa");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const out: Record<string, number> = {};
    for (const name of ["events", "progress", "hidden"]) {
      out[name] = await new Promise<number>((res) => {
        const r = db.transaction(name).objectStore(name).count();
        r.onsuccess = () => res(r.result);
      });
    }
    db.close();
    return out;
  });
}

/** What the Achievements page shows: level, XP into level, streak chip, quests, Keeper badge. */
async function snapshot(page: Page) {
  await page.goto("/achievements");
  await expect(page.getByRole("heading", { name: /^Level \d+$/ })).toBeVisible();
  const keeper = page.locator(".badge").filter({ hasText: "Keeper" });
  return {
    level: await page.getByRole("heading", { name: /^Level \d+$/ }).textContent(),
    xp: await page.locator(".level-xp").textContent(),
    streak: await page.getByRole("region", { name: "Streak" }).getByTestId("streak-chip").textContent(),
    quests: await page.locator("#quests .quest").allTextContents(),
    keeper: await keeper.getAttribute("data-state"),
  };
}

/** The Incognito control: the header icon button when present, otherwise the Profile switch. */
async function setIncognito(page: Page, on: boolean) {
  const btn = page.getByRole("button", { name: on ? /turn on incognito/i : /turn off incognito/i });
  if (await btn.count()) {
    await btn.first().click();
    const gotIt = page.getByRole("button", { name: "Got it" });
    if (on && (await gotIt.count())) await gotIt.click();
    return;
  }
  await page.goto("/profile");
  const sw = page.getByRole("switch", { name: /Incognito/i }).or(page.getByRole("checkbox", { name: /Incognito/i })).first();
  if ((await sw.isChecked()) !== on) await sw.click();
}

/** Client-side navigation (a reload would end Incognito). */
async function go(page: Page, to: "/" | "/library", desktop: boolean) {
  await page.locator(desktop ? "header.app-header nav" : "nav.bottomnav").locator(`a[href="${to}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`${to === "/" ? "/$" : to}`));
}

test("Incognito earns nothing: no events, XP, streak, quest progress or badges", async ({ page }, info) => {
  const desktop = info.project.name === "desktop";
  await skipOnboarding(page);
  await seed(page);
  await page.reload();
  const before = await snapshot(page);
  expect(before.streak).toContain("2-day streak");
  expect(before.keeper).toBe("locked");
  const rows = await counts(page);

  await setIncognito(page, true);
  await expect(page.getByTestId("incognito-notice")).toBeVisible();

  // The Home quest card hides while nothing can progress.
  await go(page, "/", desktop);
  await expect(page.locator(".quest-home")).toHaveCount(0);

  // Earning actions in Incognito: favourite (Keeper badge) and Not interested (the "Tune your picks" quest).
  await go(page, "/library", desktop);
  const grid = page.getByRole("button", { name: "Show as cover grid" });
  if (await grid.count()) await grid.click();
  const card = page.getByRole("button", { name: `Options for ${TITLE.title}` }).first();
  await card.click();
  await page.getByRole("button", { name: /^Favourite/ }).click();
  await expect(page.locator(".reward-card")).toHaveCount(0);
  await card.click();
  await page.getByRole("button", { name: /Not interested/ }).click();

  expect((await counts(page)).events).toBe(rows.events);
  expect((await counts(page)).progress).toBe(rows.progress);

  await setIncognito(page, false);
  const after = await snapshot(page);
  expect(after).toEqual(before);
  expect((await counts(page)).events).toBe(rows.events);
});
