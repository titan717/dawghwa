import { expect, type BrowserContext, type Page } from "@playwright/test";

/** Skip the onboarding flow (it is shown once per new profile). */
export async function skipOnboarding(page: Page) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome/);
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/$/);
}

export async function apiUp(page: Page) {
  const r = await page.request.get("/api/health").catch(() => null);
  return Boolean(r && r.ok());
}

/**
 * Some sandboxes block the browser from reaching image CDNs directly.
 * When E2E_RELAY_IMAGES=1, third-party requests are fetched by the test
 * runner instead. Off by default so real network behaviour is tested.
 */
export async function maybeRelay(ctx: BrowserContext) {
  if (process.env.E2E_RELAY_IMAGES !== "1") return;
  await ctx.route((u) => u.hostname !== "localhost", async (route) => {
    try {
      const r = await fetch(route.request().url());
      await route.fulfill({ status: r.status, contentType: r.headers.get("content-type") ?? undefined, body: Buffer.from(await r.arrayBuffer()) });
    } catch {
      await route.abort();
    }
  });
}
