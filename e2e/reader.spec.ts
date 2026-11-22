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

/** Add a second, already-onboarded profile straight into the local store and make it active. */
async function activateProfile(page: import("@playwright/test").Page, id: string | null) {
  return page.evaluate(async (want) => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open("dawghwa");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const done = (t: IDBTransaction) => new Promise<void>((res, rej) => ((t.oncomplete = () => res()), (t.onerror = () => rej(t.error))));
    const kvGet = await new Promise<string>((res) => {
      const q = db.transaction("kv").objectStore("kv").get("activeProfile");
      q.onsuccess = () => res((q.result as { value: string }).value);
    });
    let id = want;
    if (!id) {
      id = crypto.randomUUID();
      const now = Date.now();
      const t = db.transaction("profiles", "readwrite");
      t.objectStore("profiles").put({ id, name: "Second", color: "#3fb8af", createdAt: now, updatedAt: now, onboarded: true, prefs: { genres: [], kinds: [], avoid: [], personalize: true }, questSeed: crypto.randomUUID() });
      await done(t);
    }
    const t = db.transaction("kv", "readwrite");
    t.objectStore("kv").put({ key: "activeProfile", value: id });
    await done(t);
    db.close();
    return { previous: kvGet, active: id };
  }, id);
}

test("two profiles keep separate resume positions", async ({ page, request }) => {
  test.skip(!(await apiUp(page)), "API not running");
  const browse = await request.get("/api/catalog?provider=mangadex&sort=popularity&limit=20");
  test.skip(browse.status() === 503, "MangaDex is paused upstream (circuit open)");
  const items = ((await browse.json()) as { items: { providerId: string; url: string }[] }).items;
  let target: { id: string; chapter: string } | undefined;
  for (const it of items) {
    const r = await request.post("/api/chapters", { data: { source: "mangadex", url: it.url } });
    const chs = ((await r.json()) as { chapters?: { id: string }[] }).chapters ?? [];
    if (chs.length > 1) {
      target = { id: it.providerId, chapter: chs[chs.length - 2]!.id };
      break;
    }
  }
  test.skip(!target, "No readable chapters available from the provider right now");
  const path = `/read/mangadex/${target!.id}/${target!.chapter}`;
  await skipOnboarding(page);
  await page.goto(path);
  const slider = page.getByRole("slider", { name: "Chapter progress" });
  await expect(slider).toHaveAttribute("aria-valuetext", /^Page 1 of \d+$/, { timeout: 25_000 });
  // profile A jumps well into the chapter (not to the end: that would finish it)
  const box = (await slider.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.5, box.y + 12);
  await expect.poll(async () => Number(await slider.getAttribute("aria-valuenow")), { timeout: 10_000 }).toBeGreaterThan(20);
  await page.waitForTimeout(1500); // position save is debounced
  const mirror = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("dawghwa.pos.")));
  expect(mirror).toHaveLength(1);
  // scoped by profile, and the key never carries chapter or source ids
  expect(mirror[0]).toMatch(/^dawghwa\.pos\.[0-9a-f-]{36}\.[0-9a-z]{1,7}$/);
  expect(mirror[0]).not.toMatch(/mangadex/i);

  // profile B opens the same chapter: it starts at the beginning
  const { previous: a, active: b } = await activateProfile(page, null);
  await page.goto(path);
  await expect(slider).toHaveAttribute("aria-valuetext", /^Page 1 of \d+$/, { timeout: 25_000 });
  await page.waitForTimeout(1500);
  expect(mirror[0]).toContain(a);
  expect(mirror[0]).not.toContain(b!);

  // back to profile A: its own position is restored
  await activateProfile(page, a);
  await page.goto(path);
  await expect.poll(async () => Number(await slider.getAttribute("aria-valuenow")), { timeout: 25_000 }).toBeGreaterThan(20);
});
