import { expect, test } from "@playwright/test";

const FILE_ID = "open-once-e2e-file";

/**
 * Open-once send links show a confirmation step before downloading, and the
 * file is gone for good afterwards. This exercises both halves with the real
 * in-browser crypto: the confirm -> download -> integrity-verified happy
 * path, and the server reporting the file gone on a later visit.
 */
test.describe("open-once send link", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker;
    });
  });

  test("shows the open-once confirmation, then downloads and verifies", async ({ page }) => {
    let encryptedMetadata = "";
    let metadataIv = "";
    let fileIv = "";
    let blobBytes: Buffer = Buffer.alloc(0);

    await page.route("**/api/send/init", async (route) => {
      const body = route.request().postDataJSON() as {
        encrypted_metadata: string;
        metadata_iv: string;
        file_iv: string;
      };
      encryptedMetadata = body.encrypted_metadata;
      metadataIv = body.metadata_iv;
      fileIv = body.file_iv;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          file_id: FILE_ID,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }),
      });
    });

    await page.route(`**/api/send/${FILE_ID}/part/0`, async (route) => {
      blobBytes = route.request().postDataBuffer() ?? Buffer.alloc(0);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    await page.route(`**/api/send/${FILE_ID}/complete`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    await page.goto("/send");
    await page.locator('input[type="file"]').setInputFiles({
      name: "open-once.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("SealDrop open-once E2E check\n".repeat(50)),
    });
    await page.getByRole("button", { name: "Seal and share" }).click();
    await expect(page.getByRole("heading", { name: "File sealed" })).toBeVisible();

    const shareLink = await page.locator(".link-box__url").first().textContent();
    const url = new URL(shareLink!);
    expect(blobBytes.byteLength).toBeGreaterThan(0);

    let consumed = false;

    await page.route(`**/api/send/${FILE_ID}/metadata`, async (route) => {
      if (consumed) {
        await route.fulfill({ status: 410, contentType: "application/json", body: JSON.stringify({ error: "gone" }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          encrypted_metadata: encryptedMetadata,
          metadata_iv: metadataIv,
          file_iv: fileIv,
          size_bytes: blobBytes.byteLength,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          remaining_downloads: 1,
        }),
      });
    });

    await page.route(`**/api/send/${FILE_ID}/blob`, async (route) => {
      if (consumed) {
        await route.fulfill({ status: 410, contentType: "application/json", body: JSON.stringify({ error: "gone" }) });
        return;
      }
      consumed = true;
      await route.fulfill({ status: 200, contentType: "application/octet-stream", body: blobBytes });
    });

    await page.goto(url.pathname + url.hash);
    await expect(page.getByRole("heading", { name: "Open once" })).toBeVisible();
    await expect(page.getByText("This file can only be opened once. Opening it now will make it permanently unavailable.")).toBeVisible();

    await page.getByRole("button", { name: "Open and download" }).click();

    await expect(page.getByRole("heading", { name: "File opened" })).toBeVisible();
    await expect(page.getByText("Integrity verified — the file matches what was sent.")).toBeVisible();

    // Revisiting the same link after it's been consumed shows a generic "gone" error.
    await page.reload();
    await expect(page.getByRole("heading", { name: "File unavailable" })).toBeVisible();
    await expect(page.getByText("This file is no longer available. It may have expired or already been opened.")).toBeVisible();
  });
});
