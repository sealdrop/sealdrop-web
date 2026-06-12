import { expect, test } from "@playwright/test";

test("non-default language locales are loaded on demand", async ({ page }) => {
  // Clear any stored language preference
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("sealdrop_lang"));

  const initialRequests: string[] = [];
  page.on("request", (r) => { if (r.url().includes("/locales/")) initialRequests.push(r.url()); });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // On initial load with default (English), only en is fetched
  const initial = initialRequests.filter((u) => u.includes("/locales/"));
  expect(initial.some((u) => u.includes("/locales/en/"))).toBe(true);
  expect(initial.some((u) => u.includes("/locales/cs/"))).toBe(false);
  expect(initial.some((u) => u.includes("/locales/mk/"))).toBe(false);

  // Switch to Czech
  const afterSwitch: string[] = [];
  page.on("request", (r) => { if (r.url().includes("/locales/")) afterSwitch.push(r.url()); });

  await page.getByRole("button", { name: "Česky" }).click();

  // Wait for Czech locale to be fetched
  await expect.poll(() => afterSwitch.some((u) => u.includes("/locales/cs/")), { timeout: 10000 }).toBe(true);
  // Czech should not pull in Macedonian
  expect(afterSwitch.some((u) => u.includes("/locales/mk/"))).toBe(false);
});
