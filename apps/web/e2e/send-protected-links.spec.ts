import { expect, test } from "@playwright/test";

/**
 * Passphrase- and access-code-protected send links wrap the file key with a
 * PBKDF2-derived key instead of putting it directly in the URL fragment. The
 * recipient must enter the secret before the file can be decrypted. Each
 * test runs the real send + receive crypto round trip via route mocks.
 */
test.describe("protected send links", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker;
    });
  });

  test("passphrase-protected link requires the passphrase to open", async ({ page }) => {
    const fileId = "passphrase-e2e-file";
    let encryptedMetadata = "";
    let metadataIv = "";
    let fileIv = "";
    let blobBytes: Buffer = Buffer.alloc(0);

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
      blobBytes = route.request().postDataBuffer() ?? Buffer.alloc(0);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });
    await page.route(`**/api/send/${fileId}/complete`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    await page.goto("/send");
    await page.locator('input[type="file"]').setInputFiles({
      name: "passphrase.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("SealDrop passphrase E2E check\n".repeat(50)),
    });
    await page.getByRole("checkbox", { name: "Protect with a passphrase" }).check();
    await page.getByPlaceholder(/passphrase/i).fill("correct horse battery staple");
    await page.getByRole("button", { name: "Seal and share" }).click();
    await expect(page.getByRole("heading", { name: "File sealed" })).toBeVisible();

    const shareLink = await page.locator(".link-box__url").first().textContent();
    const url = new URL(shareLink!);
    expect(url.hash).toContain(":"); // wrapped-key:salt:iv
    expect(blobBytes.byteLength).toBeGreaterThan(0);

    await page.route(`**/api/send/${fileId}/metadata`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          encrypted_metadata: encryptedMetadata,
          metadata_iv: metadataIv,
          file_iv: fileIv,
          size_bytes: blobBytes.byteLength,
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
          remaining_downloads: -1,
        }),
      });
    });
    await page.route(`**/api/send/${fileId}/blob`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/octet-stream", body: blobBytes });
    });

    await page.goto(url.pathname + url.hash);
    await expect(page.getByRole("heading", { name: "Passphrase required" })).toBeVisible();

    // Wrong passphrase is rejected.
    await page.getByPlaceholder(/passphrase/i).fill("totally wrong passphrase");
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByText(/incorrect|wrong/i)).toBeVisible();

    // Correct passphrase unlocks and downloads.
    await page.getByPlaceholder(/passphrase/i).fill("correct horse battery staple");
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByRole("button", { name: "Open file" })).toBeVisible();
    await page.getByRole("button", { name: "Open file" }).click();

    await expect(page.getByRole("heading", { name: "File opened" })).toBeVisible();
    await expect(page.getByText("Integrity verified — the file matches what was sent.")).toBeVisible();
  });

  test("access-code-protected link requires the code to open", async ({ page }) => {
    const fileId = "access-code-e2e-file";
    let encryptedMetadata = "";
    let metadataIv = "";
    let fileIv = "";
    let blobBytes: Buffer = Buffer.alloc(0);

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
      blobBytes = route.request().postDataBuffer() ?? Buffer.alloc(0);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });
    await page.route(`**/api/send/${fileId}/complete`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    await page.goto("/send");
    await page.locator('input[type="file"]').setInputFiles({
      name: "access-code.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("SealDrop access-code E2E check\n".repeat(50)),
    });
    await page.getByRole("checkbox", { name: "Require access code" }).check();
    await page.getByRole("button", { name: "Seal and share" }).click();
    await expect(page.getByRole("heading", { name: "File sealed" })).toBeVisible();

    const links = await page.locator(".link-box__url").allTextContents();
    const shareLink = links[0]!;
    const accessCode = links[1]!;
    const url = new URL(shareLink);
    expect(url.hash).toContain("ac=1");
    expect(blobBytes.byteLength).toBeGreaterThan(0);

    await page.route(`**/api/send/${fileId}/metadata`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          encrypted_metadata: encryptedMetadata,
          metadata_iv: metadataIv,
          file_iv: fileIv,
          size_bytes: blobBytes.byteLength,
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
          remaining_downloads: -1,
        }),
      });
    });
    await page.route(`**/api/send/${fileId}/blob`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/octet-stream", body: blobBytes });
    });

    await page.goto(url.pathname + url.hash);
    await expect(page.getByRole("heading", { name: "Access code required" })).toBeVisible();

    // Wrong code is rejected.
    await page.getByPlaceholder("e.g. K7M9-R2QX").fill("WRONGCODE");
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByText(/incorrect|wrong/i)).toBeVisible();

    // Correct code unlocks and downloads.
    await page.getByPlaceholder("e.g. K7M9-R2QX").fill(accessCode);
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByRole("button", { name: "Open file" })).toBeVisible();
    await page.getByRole("button", { name: "Open file" }).click();

    await expect(page.getByRole("heading", { name: "File opened" })).toBeVisible();
    await expect(page.getByText("Integrity verified — the file matches what was sent.")).toBeVisible();
  });
});
