import { expect, test } from "@playwright/test";
import { apiUp, maybeRelay, skipOnboarding } from "./helpers";

test.beforeEach(async ({ context }) => maybeRelay(context));

test("reader opens a supported chapter without marking it read", async ({ page, request }) => {
  test.skip(!(await apiUp(page)), "API not running");
  // Find a MangaDex title that actually has readable chapters right now.
  const browse = await request.get("/api/catalog?provider=mangadex&sort=popularity&limit=20");
  test.skip(browse.status() === 503, "MangaDex is paused upstream (circuit open); nothing to read right now");
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
  test.skip(!target, "No readable chapters available from the provider right now");
  await skipOnboarding(page);
  await page.goto(`/read/mangadex/${target!.id}/${target!.chapter}`);
  await expect(page.locator(".reader img, [data-reader] img").first()).toBeAttached({ timeout: 25_000 });
  // Scroll-only reader: the top bar slides away on scroll-down and is back on scroll-up (D61).
  // There is no bottom bar; the progress line is a slider (D63).
  const bar = page.locator(".rd-top");
  await expect(bar).toBeVisible();
  await page.mouse.wheel(0, 1200);
  await expect(bar).toHaveAttribute("data-hidden");
  await page.mouse.wheel(0, -60);
  await expect(bar).not.toHaveAttribute("data-hidden");
  await expect.poll(async () => (await bar.boundingBox())!.y).toBe(0);
  await expect(page.locator(".rd-bottom")).toHaveCount(0);
  await expect(page.getByRole("slider", { name: "Chapter progress" })).toBeAttached();
  // Comments live in the top bar: open, post, and see the count.
  await page.getByRole("button", { name: "Comments (0)" }).click();
  const sheet = page.getByRole("dialog", { name: "Comments (0)" });
  await expect(sheet.getByRole("tab", { name: "Top" })).toHaveAttribute("aria-selected", "true");
  await sheet.getByPlaceholder("Leave a comment").fill("That last panel!");
  await sheet.getByRole("button", { name: "Post" }).click();
  await expect(page.getByRole("dialog", { name: "Comments (1)" }).getByText("That last panel!")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Comments (1)" })).toBeVisible();
  await page.mouse.wheel(0, -5000);
  await page.waitForTimeout(300);
  // Position is saved after a short debounce (and on pause/pagehide).
  await page.waitForTimeout(1500);
  await page.goto("/history");
  // Near the top (tall first pages can leave it on page 2 after the wheel settles).
  await expect(page.getByText(/page [12] of/)).toBeVisible();
  // Opened but not finished: the chapter must not count as read.
  await expect(page.getByText(/read$/i)).toHaveCount(0);
});
