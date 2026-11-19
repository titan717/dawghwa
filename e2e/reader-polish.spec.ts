import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { apiUp, maybeRelay, skipOnboarding } from "./helpers";

/** UI polish phase 3: one test per new reader interaction (D61-D64). */

test.beforeEach(async ({ context }) => maybeRelay(context));

/** A MangaDex chapter that has a next chapter, readable right now. */
async function openChapter(page: Page, request: APIRequestContext) {
  test.skip(!(await apiUp(page)), "API not running");
  const browse = await request.get("/api/catalog?provider=mangadex&sort=popularity&limit=20");
  test.skip(browse.status() === 503, "MangaDex is paused upstream (circuit open)");
  const items = ((await browse.json()) as { items: { providerId: string; url: string }[] }).items;
  let target: { id: string; chapter: string } | undefined;
  for (const it of items) {
    const r = await request.post("/api/chapters", { data: { source: "mangadex", url: it.url } });
    const chs = ((await r.json()) as { chapters?: { id: string }[] }).chapters ?? [];
    if (chs.length > 1) {
      target = { id: it.providerId, chapter: chs[chs.length - 2]!.id }; // never the newest: it needs a next chapter
      break;
    }
  }
  test.skip(!target, "No readable chapters available from the provider right now");
  await skipOnboarding(page);
  await page.goto(`/read/mangadex/${target!.id}/${target!.chapter}`);
  await expect(page.locator(".rd-page img").first()).toBeAttached({ timeout: 25_000 });
}

test("chapter-end card offers the next chapter, the series and a rating", async ({ page, request }) => {
  await openChapter(page, request);
  await page.keyboard.press("End");
  const card = page.getByRole("region", { name: "End of chapter" });
  await expect(card).toBeInViewport({ timeout: 15_000 });
  await expect(card).toHaveAttribute("data-in");
  // the bar comes back while the end card is on screen
  await expect(page.locator(".rd-top")).not.toHaveAttribute("data-hidden");
  await expect(card.getByRole("button", { name: /Up next/ })).toBeVisible();
  await expect(card.getByRole("link", { name: "Back to series" })).toBeVisible();
  const like = card.getByRole("button", { name: "Like this series" });
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "false");
});

test("double-tap zooms the strip and the chip resets it", async ({ page, request }) => {
  await openChapter(page, request);
  const reader = page.locator(".reader");
  const pages = page.locator(".rd-pages");
  const w0 = (await pages.boundingBox())!.width;
  const vp = page.viewportSize()!;
  await page.mouse.dblclick(vp.width / 2, vp.height / 2);
  await expect(reader).toHaveAttribute("data-zoom");
  await expect.poll(async () => Math.round((await pages.boundingBox())!.width / w0)).toBe(2);
  // a double-tap never toggles the bar
  await expect(page.locator(".rd-top")).not.toHaveAttribute("data-hidden");
  await page.getByRole("button", { name: /Reset zoom/ }).click();
  await expect(reader).not.toHaveAttribute("data-zoom");
  await expect(page.getByRole("button", { name: /Reset zoom/ })).toHaveCount(0);
  // keyboard: Z toggles, Escape resets before leaving the reader
  await page.keyboard.press("z");
  await expect(reader).toHaveAttribute("data-zoom");
  await page.keyboard.press("Escape");
  await expect(reader).not.toHaveAttribute("data-zoom");
  await expect(page).toHaveURL(/\/read\//);
});

test("the progress line is a scrubber: tap to jump, arrows step pages", async ({ page, request }) => {
  await openChapter(page, request);
  const slider = page.getByRole("slider", { name: "Chapter progress" });
  await expect(slider).toHaveAttribute("aria-valuetext", /^Page 1 of \d+$/);
  const box = (await slider.boundingBox())!;
  // the hit band sits under the 2px line
  await page.mouse.click(box.x + box.width * 0.6, box.y + 12);
  await expect.poll(async () => Number(await slider.getAttribute("aria-valuenow")), { timeout: 10_000 }).toBeGreaterThan(40);
  await slider.focus();
  await slider.press("Home");
  await expect.poll(async () => Number(await slider.getAttribute("aria-valuenow"))).toBeLessThan(5);
  await slider.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuetext", /^Page 2 of/, { timeout: 10_000 });
});
