import { expect, test } from "@playwright/test";

const DROP_ID = "e2e-drop";
const RECEIVED_FILE_ID = "e2e-received-file";

/**
 * Full receive-mode round trip using the real in-browser ECDH/AES crypto:
 * create a drop (ReceivePage), upload a file as a stranger (DropPage), then
 * unlock and download it as the owner (OwnerPage). The "server" is just
 * route mocks that store and play back whatever the browser sends.
 */
test("receive flow: create drop, upload as visitor, download as owner", async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker;
  });

  let ownerPublicKey = "";

  await page.route("**/api/receive/init", async (route) => {
    const body = route.request().postDataJSON() as { public_key: string };
    ownerPublicKey = body.public_key;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ drop_id: DROP_ID }),
    });
  });

  await page.goto("/receive");
  await page.getByRole("button", { name: "Create drop link" }).click();
  await expect(page.getByRole("heading", { name: "Drop link ready" })).toBeVisible();

  const links = await page.locator(".link-box__url").allTextContents();
  expect(links.length).toBe(2);
  const dropUrl = new URL(links[0]!);
  const ownerUrl = new URL(links[1]!);
  expect(ownerUrl.pathname).toBe(`/r/${DROP_ID}/owner`);
  expect(ownerPublicKey).toBeTruthy();

  // --- Visitor uploads a file to the drop ---
  let fileInitBody: {
    encrypted_metadata: string;
    metadata_iv: string;
    file_iv: string;
    wrapped_file_key: string;
    ephemeral_public_key: string;
    wrapped_key_iv: string;
    size_bytes: number;
    chunk_count: number;
  } | null = null;
  let blobBytes: Buffer = Buffer.alloc(0);

  await page.route(`**/api/receive/${DROP_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        drop_id: DROP_ID,
        public_key: ownerPublicKey,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        max_files: 3,
        received_file_count: 0,
        is_open: true,
      }),
    });
  });

  await page.route(`**/api/receive/${DROP_ID}/files/init`, async (route) => {
    fileInitBody = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ received_file_id: RECEIVED_FILE_ID }),
    });
  });

  await page.route(`**/api/receive/${DROP_ID}/files/${RECEIVED_FILE_ID}/part/0`, async (route) => {
    blobBytes = route.request().postDataBuffer() ?? Buffer.alloc(0);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.route(`**/api/receive/${DROP_ID}/files/${RECEIVED_FILE_ID}/complete`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto(dropUrl.pathname);
  await expect(page.getByRole("heading", { name: "Someone requested a sealed file" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: "receive-e2e.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("SealDrop receive-mode E2E check\n".repeat(50)),
  });
  await page.getByRole("button", { name: "Seal and drop" }).click();
  await expect(page.getByRole("heading", { name: "File sealed and dropped" })).toBeVisible();

  expect(fileInitBody).not.toBeNull();
  expect(blobBytes.byteLength).toBeGreaterThan(0);

  // --- Owner lists and downloads the file ---
  await page.route(`**/api/receive/${DROP_ID}/owner/files`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        files: [
          {
            received_file_id: RECEIVED_FILE_ID,
            encrypted_metadata: fileInitBody!.encrypted_metadata,
            metadata_iv: fileInitBody!.metadata_iv,
            file_iv: fileInitBody!.file_iv,
            wrapped_file_key: fileInitBody!.wrapped_file_key,
            ephemeral_public_key: fileInitBody!.ephemeral_public_key,
            wrapped_key_iv: fileInitBody!.wrapped_key_iv,
            size_bytes: fileInitBody!.size_bytes,
            chunk_count: fileInitBody!.chunk_count,
            created_at: new Date().toISOString(),
          },
        ],
      }),
    });
  });

  await page.route(`**/api/receive/${DROP_ID}/owner/files/${RECEIVED_FILE_ID}/blob`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/octet-stream", body: blobBytes });
  });

  await page.goto(ownerUrl.pathname + ownerUrl.hash);
  await expect(page.getByRole("heading", { name: "Your sealed files" })).toBeVisible();
  await expect(page.getByText("receive-e2e.txt")).toBeHidden(); // filename only known after unlock

  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
  await expect(page.getByText("receive-e2e.txt")).toBeVisible();
});
