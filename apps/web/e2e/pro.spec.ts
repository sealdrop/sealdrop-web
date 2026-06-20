import { expect, test } from "@playwright/test";

test("Pro validation page explains the offer and accepts pilot interest", async ({ page }) => {
  await page.route("**/api/pro/waitlist", async (route) => {
    const request = route.request();
    expect(request.method()).toBe("POST");
    const body = request.postDataJSON() as Record<string, unknown>;
    expect(body).toMatchObject({
      email: "ucetni@example.cz",
      role: "accountant",
      frequency: "monthly",
      contact_consent: true,
    });
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ accepted: true }) });
  });

  await page.goto("/pro");
  await expect(page.getByRole("heading", { name: "One secure link for every client document." })).toBeVisible();
  await expect(page.getByText("€4 per month", { exact: true })).toBeVisible();

  await page.getByLabel("Work email").fill("ucetni@example.cz");
  await page.getByLabel("Your profession").selectOption("accountant");
  await page.getByLabel("How often do clients send you documents?").selectOption("monthly");
  await page.getByLabel(/SealDrop may contact me/).check();
  await page.getByRole("button", { name: "Join the pilot" }).click();

  await expect(page.getByText(/We will email you when we select/)).toBeVisible();
});

test("primary Pro action stays above the fold on a laptop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 960 });
  await page.goto("/pro");

  const action = page.getByRole("link", { name: "Join the pilot" });
  await expect(action).toBeVisible();
  const box = await action.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(960);
});

test("Pro portal follows pointer tilt like the landing preview", async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 960 });
  await page.goto("/pro");
  const portal = page.locator(".l-pro-portal");
  await expect(portal).toBeVisible();

  await page.mouse.move(100, 200);
  await page.waitForTimeout(150);
  const leftTransform = await portal.evaluate((element) => (element as HTMLElement).style.transform);
  await page.mouse.move(1450, 700);
  await page.waitForTimeout(150);
  const rightTransform = await portal.evaluate((element) => (element as HTMLElement).style.transform);

  expect(leftTransform).toContain("perspective(900px)");
  expect(rightTransform).toContain("perspective(900px)");
  expect(rightTransform).not.toBe(leftTransform);
});

test("Pro validation page is fully available in Macedonian", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("sealdrop_lang", "mk"));
  await page.goto("/pro");

  await expect(page.getByRole("heading", { name: "Еден безбеден линк за сите документи од клиентите." })).toBeVisible();
  await expect(page.getByText("4 € месечно", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Службена е-пошта")).toBeVisible();
  await expect(page.getByRole("button", { name: "Приклучи се на пилотот" })).toBeVisible();
});
