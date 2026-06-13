import { expect, test } from "@playwright/test";

const FILE_ID = "integrity-e2e-file";

/**
 * These tests run the real in-browser crypto for both the send and receive
 * sides: the "server" is a set of route mocks that simply store whatever
 * bytes the send flow uploads and play them back to the receive flow. This
 * exercises the actual chunked SHA-256 hashing (sender) and recomputation +
 * verification (recipient) end-to-end, without depending on a real backend.
 */
test.describe("download integrity check", () => {
  test.beforeEach(async ({ page }) => {
    // The File System Access API requires a real user gesture and is not
    // available in headless test runs; force the OPFS/Blob download fallback
    // so the receive flow can complete without it.
    await page.addInitScript(() => {
      delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker;
    });
  });

  test("shows 'Integrity verified' after a successful round trip", async ({ page }) => {
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
      expect(route.request().method()).toBe("PUT");
      blobBytes = route.request().postDataBuffer() ?? Buffer.alloc(0);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    await page.route(`**/api/send/${FILE_ID}/complete`, async (route) => {
      expect(route.request().method()).toBe("PUT");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    await page.goto("/send");
    await page.locator('input[type="file"]').setInputFiles({
      name: "integrity-check.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("SealDrop integrity E2E check\n".repeat(100)),
    });
    await page.getByRole("button", { name: "Seal and share" }).click();
    await expect(page.getByRole("heading", { name: "File sealed" })).toBeVisible();

    const shareLink = await page.locator(".link-box__url").first().textContent();
    expect(shareLink).toBeTruthy();
    const url = new URL(shareLink!);
    expect(blobBytes.byteLength).toBeGreaterThan(0);

    // Serve back exactly what the send flow uploaded.
    await page.route(`**/api/send/${FILE_ID}/metadata`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          encrypted_metadata: encryptedMetadata,
          metadata_iv: metadataIv,
          file_iv: fileIv,
          size_bytes: blobBytes.byteLength,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          remaining_downloads: -1,
        }),
      });
    });

    await page.route(`**/api/send/${FILE_ID}/blob`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/octet-stream", body: blobBytes });
    });

    await page.goto(url.pathname + url.hash);
    await expect(page.getByRole("button", { name: "Open file" })).toBeVisible();
    await page.getByRole("button", { name: "Open file" }).click();

    await expect(page.getByRole("heading", { name: "File opened" })).toBeVisible();
    await expect(page.getByText("Integrity verified — the file matches what was sent.")).toBeVisible();
    await expect(page.getByText("Warning: this file may be incomplete or corrupted")).not.toBeVisible();
  });

  test("shows a download error when the encrypted blob is truncated", async ({ page }) => {
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
      name: "integrity-check.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("SealDrop integrity E2E check\n".repeat(100)),
    });
    await page.getByRole("button", { name: "Seal and share" }).click();
    await expect(page.getByRole("heading", { name: "File sealed" })).toBeVisible();

    const shareLink = await page.locator(".link-box__url").first().textContent();
    const url = new URL(shareLink!);
    expect(blobBytes.byteLength).toBeGreaterThan(20);

    // Lop off the tail of the encrypted blob, simulating a truncated download.
    const truncated = blobBytes.subarray(0, blobBytes.byteLength - 20);

    await page.route(`**/api/send/${FILE_ID}/metadata`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          encrypted_metadata: encryptedMetadata,
          metadata_iv: metadataIv,
          file_iv: fileIv,
          size_bytes: blobBytes.byteLength,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          remaining_downloads: -1,
        }),
      });
    });

    await page.route(`**/api/send/${FILE_ID}/blob`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/octet-stream", body: truncated });
    });

    await page.goto(url.pathname + url.hash);
    await expect(page.getByRole("button", { name: "Open file" })).toBeVisible();
    await page.getByRole("button", { name: "Open file" }).click();

    await expect(page.getByRole("heading", { name: "File unavailable" })).toBeVisible();
    await expect(page.getByText("Failed to open the file. Please try again.")).toBeVisible();
  });
});
