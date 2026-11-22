import { expect, test } from "@playwright/test";
import { maybeRelay, skipOnboarding } from "./helpers";

test.beforeEach(async ({ context }) => maybeRelay(context));

/** Writes finished-chapter events for the active profile straight into the local database. */
async function seedReads(page: import("@playwright/test").Page, daysAgo: number[]) {
  await page.evaluate(async (ago) => {
    const db: IDBDatabase = await new Promise((res, rej) => {
      const r = indexedDB.open("dawghwa");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const profiles: { id: string }[] = await new Promise((res) => {
      const r = db.transaction("profiles").objectStore("profiles").getAll();
      r.onsuccess = () => res(r.result);
    });
    const tx = db.transaction("events", "readwrite");
    ago.forEach((n, i) => {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - n);
      for (const p of profiles) tx.objectStore("events").put({ profileId: p.id, seq: 9000 + i, kind: "chapter_read", titleKey: "e2e-streak", at: Math.min(d.getTime(), Date.now() - 1000), value: i + 1 });
    });
    await new Promise((res) => (tx.oncomplete = res));
    db.close();
  }, daysAgo);
}

test("Achievements shows a neutral streak chip, hidden with Rewards off", async ({ page }) => {
  await skipOnboarding(page);
  await page.goto("/achievements");
  await expect(page.getByRole("heading", { name: "Streak" })).toBeVisible();
  await expect(page.getByText("Read a chapter to start a streak.")).toBeVisible();
  await seedReads(page, [2, 1, 0]);
  await page.reload();
  const chip = page.getByRole("region", { name: "Streak" }).getByTestId("streak-chip");
  await expect(chip).toHaveText("3-day streak");
  await expect(page.getByText("This week's freeze is ready.")).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/don't lose|lose your streak/i);
  await page.goto("/profile");
  await page.getByRole("checkbox", { name: /Show rewards/ }).uncheck();
  await page.goto("/achievements");
  await expect(page.getByTestId("streak-chip")).toHaveCount(0);
});

test("a single missed day is covered by the weekly freeze", async ({ page }) => {
  await skipOnboarding(page);
  // Read 3 and 2 days ago, missed yesterday, today not read yet.
  await seedReads(page, [3, 2]);
  await page.goto("/achievements");
  const chip = page.getByRole("region", { name: "Streak" }).getByTestId("streak-chip");
  await expect(chip).toContainText("2-day streak");
  // The freeze shows on the chip when the missed day falls in the current week (not on a Monday).
  const monday = new Date().getDay() === 1;
  await expect(chip).toHaveText(monday ? "2-day streak" : "2-day streak, freeze used this week");
  await expect(page.getByText("This week's freeze is used. A new one comes on Monday.")).toHaveCount(monday ? 0 : 1);
});

test("the streak chip sits beside the avatar in the app chrome and stays hidden in Incognito", async ({ page }, info) => {
  await skipOnboarding(page);
  await seedReads(page, [1, 0]);
  await page.goto("/");
  const desktop = info.project.name === "desktop";
  const chrome = page.locator(desktop ? ".app-header" : ".home-bar");
  const chip = chrome.getByTestId("streak-chip");
  await expect(chip).toHaveText("2-day streak");
  await expect(chip).toHaveAttribute("href", "/achievements");
  const box = await chip.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  const avatar = chrome.locator(desktop ? ".app-header-avatar" : ".home-bar-avatar");
  const a = await avatar.boundingBox();
  expect(a!.x - (box!.x + box!.width)).toBeLessThan(24);
  await page.goto("/profile");
  await page.getByRole("switch", { name: /Incognito/i }).or(page.getByRole("checkbox", { name: /Incognito/i })).first().click();
  await page.locator(desktop ? "header.app-header nav" : "nav.bottomnav").getByRole("link", { name: "Home" }).click();
  await expect(chrome.getByTestId("streak-chip")).toHaveCount(0);
  await expect(page.getByTestId("incognito-notice")).toBeVisible();
});
