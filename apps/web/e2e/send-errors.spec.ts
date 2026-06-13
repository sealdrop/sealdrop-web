import { expect, test } from "@playwright/test";

/**
 * Missing/expired send links must show generic, non-revealing errors (per
 * SECURITY.md: don't reveal whether an expired file ever existed), both when
 * the metadata is gone before the recipient ever sees the file, and when the
 * blob disappears between viewing the file card and pressing "Open".
 */
test.describe("send link error handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker;
    });
  });

  test("shows a generic expired message for a 404 metadata response", async ({ page }) => {
    await page.route("**/api/send/missing-file/metadata", async (route) => {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not_found" }) });
    });

    await page.goto("/s/missing-file#key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

    await expect(page.getByRole("heading", { name: "File unavailable" })).toBeVisible();
    await expect(page.getByText("This file is no longer available. It may have expired or already been opened.")).toBeVisible();
  });

  test("shows a generic expired message for a 410 metadata response", async ({ page }) => {
    await page.route("**/api/send/gone-file/metadata", async (route) => {
      await route.fulfill({ status: 410, contentType: "application/json", body: JSON.stringify({ error: "gone" }) });
    });

    await page.goto("/s/gone-file#key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

    await expect(page.getByRole("heading", { name: "File unavailable" })).toBeVisible();
    await expect(page.getByText("This file is no longer available. It may have expired or already been opened.")).toBeVisible();
  });

  test("shows an 'already opened' message when the blob disappears before download", async ({ page }) => {
    const fileId = "blob-gone-e2e-file";
    let encryptedMetadata = "";
    let metadataIv = "";
    let fileIv = "";

    await page.route("**/api/send/init", async (route) => {
      const body = route.request().postDataJSON() as { encrypted_metadata: string; metadata_iv: string; file_iv: string };
      encryptedMetadata = body.encrypted_metadata;
      metadataIv = body.metadata_iv;
      fileIv = body.file_iv;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ file_id: fileId, expires_at: new Date(Date.now() + 3600_000).toISOString() }),
      });
    });
    await page.route(`**/api/send/${fileId}/part/0`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });
    await page.route(`**/api/send/${fileId}/complete`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    await page.goto("/send");
    await page.locator('input[type="file"]').setInputFiles({
      name: "blob-gone.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("SealDrop blob-gone E2E check\n".repeat(50)),
    });
    await page.getByRole("button", { name: "Seal and share" }).click();
    await expect(page.getByRole("heading", { name: "File sealed" })).toBeVisible();

    const shareLink = await page.locator(".link-box__url").first().textContent();
    const url = new URL(shareLink!);

    await page.route(`**/api/send/${fileId}/metadata`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          encrypted_metadata: encryptedMetadata,
          metadata_iv: metadataIv,
          file_iv: fileIv,
          size_bytes: 1500,
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
          remaining_downloads: -1,
        }),
      });
    });
    // The file card loaded fine, but by the time "Open" is pressed the blob is gone
    // (e.g. raced with expiry/cleanup).
    await page.route(`**/api/send/${fileId}/blob`, async (route) => {
      await route.fulfill({ status: 410, contentType: "application/json", body: JSON.stringify({ error: "gone" }) });
    });

    await page.goto(url.pathname + url.hash);
    await expect(page.getByRole("button", { name: "Open file" })).toBeVisible();
    await page.getByRole("button", { name: "Open file" }).click();

    await expect(page.getByRole("heading", { name: "File unavailable" })).toBeVisible();
    await expect(page.getByText("This file is no longer available. It was already opened or has expired.")).toBeVisible();
  });
});
