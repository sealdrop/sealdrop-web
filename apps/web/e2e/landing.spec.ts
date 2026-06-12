import { expect, test } from "@playwright/test";

test("landing page presents the product and navigates to send", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/SealDrop/);
  await expect(page.getByRole("heading", { name: "Send a private file link that disappears." })).toBeVisible();
  await expect(page.getByText("No account", { exact: true })).toBeVisible();
  await expect(page.getByText("Encrypted before upload", { exact: true })).toBeVisible();
  await expect(page.getByText("Automatically deleted", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Send a file" }).first().click();
  await expect(page).toHaveURL(/\/send$/);
  await expect(page.getByRole("heading", { name: "Send a file" })).toBeVisible();
});
