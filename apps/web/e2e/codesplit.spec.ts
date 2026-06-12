import { expect, test } from "@playwright/test";

const JS_RE = /\.(?:js|mjs)(\?.*)?$/;

test("send page code is not in initial bundle", async ({ page }) => {
  const initialJsRequests = new Set<string>();

  page.on("request", (req) => {
    const url = req.url();
    if (JS_RE.test(url) && url.startsWith("http://127.0.0.1:4177")) {
      initialJsRequests.add(url);
    }
  });

  await page.goto("/");

  const initialCount = initialJsRequests.size;
  expect(initialCount).toBeGreaterThan(0);

  // Mark which chunks are loaded by the initial page
  const beforeNav = new Set(initialJsRequests);

  // Navigate to /send — should load the SendPage chunk
  await page.goto("/send");
  await expect(page.getByRole("heading", { name: "Send a file" })).toBeVisible();

  // After navigation, more JS chunks should have been loaded
  // (the send-page chunk) — this proves code splitting works.
  const newChunks = [...initialJsRequests].filter((u) => !beforeNav.has(u));
  expect(newChunks.length).toBeGreaterThan(0);
});
