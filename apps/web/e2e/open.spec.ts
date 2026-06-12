import { expect, test } from "@playwright/test";

const MOCK_HANDOFF_ID = "A7KP2M";
const MOCK_ENCRYPTED_PAYLOAD = "bW9ja2NpcGhlcnRleHQ"; // base64url
const MOCK_PAYLOAD_IV = "bW9ja2l2MTI";
const MOCK_KDF_SALT = "bW9ja3NhbHQxNg";
const MOCK_EXPIRES_AT = new Date(Date.now() + 600_000).toISOString();

// ─── /open page ───────────────────────────────────────────────────────────────

test.describe("/open page", () => {
  test("renders with correct heading and input", async ({ page }) => {
    await page.goto("/open");
    await expect(page.getByRole("heading", { name: "Open a SealDrop link" })).toBeVisible();
    await expect(page.getByPlaceholder(/A7KP2M/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Open file" })).toBeDisabled();
  });

  test("button enables when code is entered", async ({ page }) => {
    await page.goto("/open");
    await page.getByPlaceholder(/A7KP2M/).fill("A7KP2M 123 456 789");
    await expect(page.getByRole("button", { name: "Open file" })).toBeEnabled();
  });

  test("shows generic error for wrong-format code", async ({ page }) => {
    await page.goto("/open");
    await page.getByPlaceholder(/A7KP2M/).fill("NOTAVALIDCODE");
    await page.getByRole("button", { name: "Open file" }).click();
    await expect(page.getByText("This code is invalid or expired.")).toBeVisible();
  });

  test("shows generic error when server returns 404", async ({ page }) => {
    await page.route("**/api/open-links/A7KP2M", (route) =>
      route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not found" }) }),
    );
    await page.goto("/open");
    await page.getByPlaceholder(/A7KP2M/).fill("A7KP2M 123 456 789");
    await page.getByRole("button", { name: "Open file" }).click();
    await expect(page.getByText("This code is invalid or expired.")).toBeVisible();
  });

  test("shows generic error when decryption fails (wrong secret)", async ({ page }) => {
    await page.route("**/api/open-links/A7KP2M", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          encrypted_payload: MOCK_ENCRYPTED_PAYLOAD,
          payload_iv: MOCK_PAYLOAD_IV,
          kdf_salt: MOCK_KDF_SALT,
          kdf_iterations: 100000,
          expires_at: MOCK_EXPIRES_AT,
        }),
      }),
    );
    await page.goto("/open");
    // Correct ID but wrong secret → AES-GCM decrypt will throw
    await page.getByPlaceholder(/A7KP2M/).fill("A7KP2M 000 000 000");
    await page.getByRole("button", { name: "Open file" }).click();
    await expect(page.getByText("This code is invalid or expired.")).toBeVisible();
  });

  test("error clears when user edits the input", async ({ page }) => {
    await page.goto("/open");
    await page.getByPlaceholder(/A7KP2M/).fill("NOTAVALIDCODE");
    await page.getByRole("button", { name: "Open file" }).click();
    await expect(page.getByText("This code is invalid or expired.")).toBeVisible();
    // Start editing — error should clear
    await page.getByPlaceholder(/A7KP2M/).fill("A");
    await expect(page.getByText("This code is invalid or expired.")).not.toBeVisible();
  });
});

// ─── SendPage — "Open on another device" section ─────────────────────────────

test.describe("SendPage — Open on another device", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/send/init", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ file_id: "e2e-file", expires_at: new Date(Date.now() + 3600_000).toISOString() }),
      }),
    );
    await page.route("**/api/send/e2e-file/chunks/status", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ uploaded: [] }) }),
    );
    await page.route("**/api/send/e2e-file/chunk/0", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }),
    );
    await page.route("**/api/send/e2e-file/complete", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }),
    );
    await page.route("**/api/open-links", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ handoff_id: MOCK_HANDOFF_ID, expires_at: MOCK_EXPIRES_AT }),
      }),
    );
  });

  async function uploadAndSeal(page: Parameters<Parameters<typeof test>[1]>[0]) {
    await page.goto("/send");
    await page.locator('input[type="file"]').setInputFiles({
      name: "e2e-upload.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("SealDrop handoff E2E test"),
    });
    await page.getByRole("button", { name: "Seal and share" }).click();
    await expect(page.getByRole("heading", { name: "File sealed" })).toBeVisible();
  }

  test("shows 'Open on another device' section after upload", async ({ page }) => {
    await uploadAndSeal(page);
    await expect(page.getByText("Open on another device")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create open code" })).toBeVisible();
  });

  test("Create open code calls POST /api/open-links and shows code", async ({ page }) => {
    let capturedBody: Record<string, unknown> | null = null;
    await page.route("**/api/open-links", async (route) => {
      capturedBody = await route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ handoff_id: MOCK_HANDOFF_ID, expires_at: MOCK_EXPIRES_AT }),
      });
    });

    await uploadAndSeal(page);
    await page.getByRole("button", { name: "Create open code" }).click();

    await expect(page.getByText("sealdrop.io/open")).toBeVisible();
    await expect(page.getByText("Expires in 10 minutes.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy instructions" })).toBeVisible();

    // Verify request body — server must not receive plaintext URL or fragment
    expect(capturedBody).not.toBeNull();
    expect(capturedBody!["handoff_id"]).toBeTruthy();
    expect(capturedBody!["encrypted_payload"]).toBeTruthy();
    expect(typeof capturedBody!["encrypted_payload"]).toBe("string");
    // The plaintext share URL and fragment must NOT appear in the request body
    const bodyStr = JSON.stringify(capturedBody);
    expect(bodyStr).not.toContain("#key=");
    expect(bodyStr).not.toContain("e2e-file");
  });

  test("displayed code matches XXXXXX NNN NNN NNN format", async ({ page }) => {
    await uploadAndSeal(page);
    await page.getByRole("button", { name: "Create open code" }).click();
    await expect(page.getByText("sealdrop.io/open")).toBeVisible();

    // Find the monospace code element
    const codeEls = page.locator(".link-box__url");
    const count = await codeEls.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const text = (await codeEls.nth(i).textContent())?.trim() ?? "";
      if (/^[A-Z2-9]{6} \d{3} \d{3} \d{3}$/.test(text)) { found = true; break; }
    }
    expect(found).toBe(true);
  });

  test("shows error when open-links API call fails", async ({ page }) => {
    await page.route("**/api/open-links", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "internal error" }) }),
    );
    await uploadAndSeal(page);
    await page.getByRole("button", { name: "Create open code" }).click();
    await expect(page.getByText("Could not create open code. Try again.")).toBeVisible();
  });
});
