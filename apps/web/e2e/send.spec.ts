import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/send/init", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        file_id: "e2e-file",
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    });
  });

  await page.route("**/api/send/e2e-file/part/0", async (route) => {
    expect(route.request().method()).toBe("PUT");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route("**/api/send/e2e-file/complete", async (route) => {
    expect(route.request().method()).toBe("PUT");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
});

test("send flow seals a selected file and shows a share link", async ({ page }) => {
  await page.goto("/send");

  await expect(page.getByRole("heading", { name: "Send a file" })).toBeVisible();
  await expect(page.getByText("Tap to choose a file")).toBeVisible();
  await expect(page.getByRole("button", { name: "Seal and share" })).toBeDisabled();

  await page.locator('input[type="file"]').setInputFiles({
    name: "e2e-upload.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("SealDrop E2E upload check\n"),
  });

  await expect(page.getByText("e2e-upload.txt")).toBeVisible();
  await expect(page.getByRole("button", { name: "Seal and share" })).toBeEnabled();

  await page.getByRole("button", { name: "Seal and share" }).click();

  await expect(page.getByRole("heading", { name: "File sealed" })).toBeVisible();
  await expect(page.getByText("Share link")).toBeVisible();
  await expect(page.getByText(/\/s\/e2e-file#key=/)).toBeVisible();
});

test("send flow shows an error when init fails", async ({ page }) => {
  await page.route("**/api/send/init", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "internal error" }),
    });
  });

  await page.goto("/send");
  await page.locator('input[type="file"]').setInputFiles({
    name: "e2e-upload.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("SealDrop E2E upload check\n"),
  });
  await page.getByRole("button", { name: "Seal and share" }).click();

  await expect(page.getByText("Upload failed. Please try again.")).toBeVisible();
});
