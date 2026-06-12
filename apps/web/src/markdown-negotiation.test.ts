import { pathToFileURL } from "url";
import { describe, expect, it } from "vitest";
import { resolve } from "path";

const workerUrl = pathToFileURL(resolve(__dirname, "../public/_worker.js")).href;

async function loadWorker() {
  return (await import(workerUrl)).default as {
    fetch(request: Request, env: { ASSETS: { fetch(request: Request): Response } }): Response | Promise<Response>;
  };
}

function assetsResponse() {
  return new Response("<html><body>app</body></html>", {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function jsonAssetResponse() {
  return new Response('{"ok":true}', {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

describe("Markdown content negotiation", () => {
  it("returns markdown for public pages when text/markdown is accepted", async () => {
    const worker = await loadWorker();
    const response = await worker.fetch(new Request("https://sealdrop.io/security", {
      headers: { Accept: "text/markdown" },
    }), { ASSETS: { fetch: assetsResponse } });

    expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("Vary")).toBe("Accept");
    expect(Number(response.headers.get("X-Markdown-Tokens"))).toBeGreaterThan(0);
    expect(await response.text()).toContain("# Security Model");
  });

  it("keeps HTML as the browser default", async () => {
    const worker = await loadWorker();
    const response = await worker.fetch(new Request("https://sealdrop.io/security", {
      headers: { Accept: "text/html,application/xhtml+xml" },
    }), { ASSETS: { fetch: assetsResponse } });

    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(await response.text()).toContain("<html>");
  });

  it("does not negotiate markdown for unlisted app routes", async () => {
    const worker = await loadWorker();
    const response = await worker.fetch(new Request("https://sealdrop.io/s/file-id", {
      headers: { Accept: "text/markdown" },
    }), { ASSETS: { fetch: assetsResponse } });

    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
  });

  it("returns real 404s for unknown machine discovery paths", async () => {
    const worker = await loadWorker();
    const response = await worker.fetch(new Request("https://sealdrop.io/.well-known/missing.json"), {
      ASSETS: { fetch: assetsResponse },
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(await response.text()).toBe("Not found\n");
  });

  it("passes through existing well-known JSON assets", async () => {
    const worker = await loadWorker();
    const response = await worker.fetch(new Request("https://sealdrop.io/.well-known/agents.json"), {
      ASSETS: { fetch: jsonAssetResponse },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
  });

  it("returns JSON 404 for bare API path handled by Pages", async () => {
    const worker = await loadWorker();
    const response = await worker.fetch(new Request("https://sealdrop.io/api"), {
      ASSETS: { fetch: assetsResponse },
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(await response.json()).toEqual({ error: "not found" });
  });
});
