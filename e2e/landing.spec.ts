import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test } from "@playwright/test";
import { enterApp, maybeRelay } from "./helpers";

test.beforeEach(async ({ context }) => maybeRelay(context));

test("first visit shows the landing; Use in browser enters onboarding; the next visit skips it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Dawghwa" })).toBeVisible();
  await expect(page.locator(".bottomnav")).toHaveCount(0); // no app chrome on the landing
  await expect(page).toHaveTitle(/Free manhwa and manga reader in your browser/);
  await page.getByRole("button", { name: "Use in browser" }).click();
  await expect(page).toHaveURL(/\/welcome/);
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  await expect(page.getByRole("button", { name: "Use in browser" })).toHaveCount(0);
  // /start is the permanent address of the landing, and knows this browser has a shelf
  await page.goto("/start");
  await expect(page.getByRole("button", { name: "Open the app" }).first()).toBeVisible();
});

test("the installed app (start_url /?source=pwa) never shows the landing", async ({ page }) => {
  await page.goto("/?source=pwa");
  await expect(page).toHaveURL(/\/welcome/);
});

test("Name your reader carries the name and format into onboarding", async ({ page }) => {
  await page.goto("/");
  const dialog = page.locator("form.ld-dialog");
  await dialog.getByLabel("Reader name").fill("Ren");
  await dialog.getByText("Manga", { exact: true }).click();
  await dialog.getByRole("button", { name: "Start reading" }).click();
  await expect(page).toHaveURL(/\/welcome\?name=Ren&kind=manga/);
  await page.getByRole("button", { name: "Create reader" }).click();
  await expect(page.getByLabel("Reader name")).toHaveValue("Ren");
});

test("Install app uses the browser's prompt when one is offered", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const e = new Event("beforeinstallprompt", { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    e.prompt = async () => void ((window as unknown as { __prompted: boolean }).__prompted = true);
    e.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(e);
  });
  await page.getByRole("button", { name: "Install app" }).first().click();
  const sheet = page.getByRole("dialog", { name: "Install Dawghwa" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Install now" }).click();
  expect(await page.evaluate(() => (window as unknown as { __prompted?: boolean }).__prompted)).toBe(true);
  await expect(page.getByRole("dialog", { name: "Dawghwa is installed" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByText("Installed", { exact: true })).toBeVisible();
});

test("without a prompt, Install app explains the browser's own steps", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Install app" }).first().click();
  const sheet = page.getByRole("dialog", { name: "Install Dawghwa" });
  await expect(sheet).toContainText("install icon");
  await sheet.getByRole("button", { name: "Use in browser instead" }).click();
  await expect(page).toHaveURL(/\/welcome/);
});

test.describe("on iPhone", () => {
  test.use({ userAgent: devices["iPhone 13"].userAgent });
  test("Install app shows Share, then Add to Home Screen", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Install app" }).first().click();
    await expect(page.getByRole("dialog", { name: "Install Dawghwa" })).toContainText("Add to Home Screen");
  });
});

test("the shortcut list filters as you type", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("searchbox", { name: "Find a shortcut" });
  await input.fill("zoom");
  const list = page.getByRole("listbox", { name: "Reader shortcuts" });
  await expect(list.getByRole("option")).toHaveCount(1);
  await expect(list.getByRole("option", { selected: true })).toContainText("Double the page size");
  await input.fill("nothing like this");
  await expect(list).toContainText("No shortcut matches");
});

test("auto-scroll glides the page and pauses", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Auto-scroll this page" }).click();
  const pill = page.getByRole("group", { name: "Page auto-scroll" });
  await expect(pill).toBeVisible();
  await pill.getByRole("button", { name: "Faster" }).click();
  await expect(pill).toContainText("80 px/s");
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 }).toBeGreaterThan(20);
  await pill.getByRole("button", { name: "Pause auto-scroll" }).click();
  const y = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.scrollY)).toBe(y);
  await pill.getByRole("button", { name: "Stop auto-scroll" }).click();
  await expect(pill).toHaveCount(0);
});

for (const theme of ["dark", "light"] as const) {
  test(`axe: the landing has no serious violations (${theme} app theme)`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("dawghwa:settings", JSON.stringify({ theme: t })), theme);
    await page.goto("/");
    await page.waitForTimeout(600);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id} (${v.nodes.length}) ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}

test("returning readers from before the landing go straight to the app", async ({ page }) => {
  await enterApp(page);
  await page.getByRole("button", { name: "Skip" }).click();
  await page.evaluate(() => localStorage.removeItem("dawghwa:entered")); // onboarded, but never saw the landing
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Use in browser" })).toHaveCount(0);
});

// Regression: under reduced motion the fitted wordmark used to oscillate between two
// sizes (the app gives every element a 0.01ms transition), so the CTA never held still.
test("with reduced motion the wordmark fits once and the CTA holds still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForTimeout(800);
  const read = () =>
    page.evaluate(() => {
      const n = document.querySelector<HTMLElement>(".ld-name")!;
      return { w: n.offsetWidth, box: n.parentElement!.clientWidth, fs: n.style.fontSize };
    });
  const a = await read();
  await page.waitForTimeout(500);
  const b = await read();
  expect(b).toEqual(a);
  expect(Math.abs(a.w - a.box)).toBeLessThanOrEqual(2);
  await page.getByRole("button", { name: "Use in browser" }).click({ timeout: 5_000 });
  await expect(page).toHaveURL(/\/welcome/);
});
