import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { maybeRelay, skipOnboarding } from "./helpers";

/** Spec L UI: one weekly quest card on Home, shield badges with visible locked state. No API needed. */
test.beforeEach(async ({ context }) => maybeRelay(context));

/** 30 finished chapters over the last 3 days, so some badges are earned and some locked. */
async function seed(page: Page) {
  await page.evaluate(async () => {
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
    const tx = db.transaction(["titles", "events"], "readwrite");
    tx.objectStore("titles").put({ key: "e2e:ui", sourceId: "e2e", id: "ui", url: "https://example.test/ui", title: "Badge Test Series", meta: { genres: ["Action", "Fantasy", "Comedy"] }, cachedAt: now });
    for (const p of profiles)
      for (let i = 0; i < 30; i++) tx.objectStore("events").put({ profileId: p.id, seq: 8000 + i, kind: "chapter_read", titleKey: "e2e:ui", at: now - 1000 - (i % 3) * 86_400_000, value: i + 1 });
    await new Promise((res) => (tx.oncomplete = res));
    db.close();
  });
}

async function axe(page: Page, include: string) {
  const r = await new AxeBuilder({ page }).include(include).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

for (const theme of ["dark", "light"] as const) {
  test(`Home shows one weekly quest card and Achievements uses one shield (${theme})`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.addInitScript((t) => localStorage.setItem("dawghwa:settings", JSON.stringify({ theme: t })), theme);
    await skipOnboarding(page);
    await seed(page);
    await page.reload();

    const card = page.locator(".quest-home");
    await expect(card).toHaveCount(1);
    await expect(page.locator(".quest-strip")).toHaveCount(0);
    await expect(card.getByRole("heading", { level: 2 })).toBeVisible();
    await expect(card).toContainText("This week");
    await expect(card).toContainText("+50 XP");
    const all = card.getByRole("link", { name: /^\d of \d done · All quests/ });
    await expect(all).toHaveAttribute("href", "/achievements#quests");
    expect((await all.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const go = card.locator(".quest-home-go");
    if (await go.count()) expect((await go.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if (info.project.name === "mobile") expect((await card.boundingBox())!.height).toBeLessThanOrEqual(120);
    expect(await axe(page, ".quest-home")).toEqual([]);
    if (process.env.SHOTS) await card.screenshot({ path: `${process.env.SHOTS}/home-quest-${info.project.name}-${theme}.png` });

    await page.goto("/achievements");
    const badges = page.locator(".badge-grid .badge");
    await expect(badges.first()).toBeVisible();
    const n = await badges.count();
    expect(n).toBeGreaterThanOrEqual(10);
    // Every badge draws the same shield path.
    const paths = await page.locator(".badge-grid .badge-fill").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("d")))]);
    expect(paths).toHaveLength(1);
    // Locked badges say so in text, not by colour alone.
    const locked = page.locator('.badge[data-state="locked"]');
    expect(await locked.count()).toBeGreaterThan(0);
    for (const b of await locked.all()) await expect(b.locator(".badge-state")).toHaveText(/^Locked/);
    await expect(page.locator('.badge[data-state="earned"], .badge[data-state="max"]').first()).toBeVisible();
    await expect(page.locator(".badge").filter({ hasText: "Taste Tester" })).toContainText("Locked · 0 of 1");
    await expect(page.getByText(/\+30.*taste quiz/)).toBeVisible();
    expect(await axe(page, ".badge-grid")).toEqual([]);
    if (process.env.SHOTS) await page.locator(".badge-grid").screenshot({ path: `${process.env.SHOTS}/badges-${info.project.name}-${theme}.png` });
  });
}

test("the quest card is hidden with Rewards off", async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.locator(".quest-home")).toHaveCount(1);
  await page.goto("/profile");
  await page.getByRole("checkbox", { name: /Show rewards/ }).uncheck();
  await page.goto("/");
  await expect(page.locator(".quest-home")).toHaveCount(0);
});
