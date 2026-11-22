import { expect, test } from "@playwright/test";
import { enterApp, maybeRelay } from "./helpers";

test.beforeEach(async ({ context }) => maybeRelay(context));

test("mascot onboarding creates a reader with a PIN and ends on the first quest", async ({ page }) => {
  await enterApp(page);
  await expect(page.locator(".onboard .bubble")).toContainText("reading buddy");
  await page.getByRole("button", { name: "Create reader" }).click();

  await page.getByLabel("Reader name").fill("Mina");
  await page.getByLabel(/Ask for a PIN/).check();
  const cont = page.getByRole("button", { name: /^Continue/ });
  await expect(cont).toBeDisabled(); // PIN switched on but empty
  await page.getByLabel("4-digit PIN").fill("1234");
  await cont.click();

  await expect(page.getByText("Select at least one")).toBeVisible();
  await expect(cont).toBeDisabled();
  await page.locator(".ob-tile").first().click();
  await expect(page.getByText("1 selected")).toBeVisible();
  await cont.click(); // formats
  await cont.click(); // avoid
  await cont.click();

  await expect(page.getByRole("heading", { name: "Your experience is ready!" })).toBeVisible();
  await expect(page.getByText("Your first quest")).toBeVisible();
  await page.getByRole("button", { name: "Go to Home" }).click();
  await expect(page).toHaveURL(/\/$/);

  // sign out, then sign back in with the PIN
  await page.goto("/profile");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByText("Who's reading today?")).toBeVisible();
  await page.getByRole("button", { name: /Mina/ }).click();
  const pin = page.getByLabel("Enter your 4-digit PIN");
  await pin.fill("9999");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toContainText("doesn't match");
  await pin.fill("1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mina" })).toBeVisible();
});

test("edit mode keeps only the taste steps and Cancel returns to Profile", async ({ page }) => {
  await enterApp(page);
  await page.getByRole("button", { name: "Skip" }).click();
  await page.goto("/welcome?edit=1");
  await expect(page.getByRole("button", { name: "Create reader" })).toHaveCount(0);
  await expect(page.locator(".ob-tiles")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).first().click();
  await expect(page).toHaveURL(/\/profile$/);
});
