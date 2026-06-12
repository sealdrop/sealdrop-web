import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { createVerify } from "crypto";
import { resolve } from "path";

const distDir = resolve(__dirname, "../dist");

describe("PWA build output", () => {
  it("generates manifest.webmanifest", () => {
    const path = resolve(distDir, "manifest.webmanifest");
    expect(existsSync(path)).toBe(true);
    const manifest = JSON.parse(readFileSync(path, "utf-8"));
    expect(manifest.name).toBe("SealDrop");
    expect(manifest.short_name).toBe("SealDrop");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  it("generates service worker", () => {
    const path = resolve(distDir, "sw.js");
    expect(existsSync(path)).toBe(true);
    const sw = readFileSync(path, "utf-8");
    expect(sw).toContain("self.skipWaiting");
    // injectManifest inlines + renames precacheAndRoute/addRoute during minification,
    // so assert on the precache manifest it injects instead of the literal symbol name.
    expect(sw).toContain('"url":"index.html"');
    expect(sw).toContain('"url":"manifest.webmanifest"');
  });

  it("ships the Pages markdown negotiation worker without precaching it", () => {
    const pagesWorkerPath = resolve(distDir, "_worker.js");
    const swPath = resolve(distDir, "sw.js");

    expect(existsSync(pagesWorkerPath)).toBe(true);
    expect(readFileSync(swPath, "utf-8")).not.toContain('"url":"_worker.js"');
  });

  it("generates a build manifest for deployed asset verification", () => {
    const path = resolve(distDir, "build-manifest.json");
    expect(existsSync(path)).toBe(true);

    const manifest = JSON.parse(readFileSync(path, "utf-8"));
    expect(manifest.schema).toBe("https://sealdrop.io/schemas/build-manifest-v1.json");
    expect(typeof manifest.commit).toBe("string");
    expect(typeof manifest.built).toBe("string");
    expect(Array.isArray(manifest.assets)).toBe(true);
    expect(manifest.assets.length).toBeGreaterThan(0);
    expect(manifest.assets[0]).toMatchObject({
      path: expect.stringMatching(/^assets\/.+\.(js|css)$/),
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it("signs the build manifest when a signing key is configured", () => {
    if (!process.env["SEALDROP_BUILD_MANIFEST_PRIVATE_KEY_PEM"]) return;

    const path = resolve(distDir, "build-manifest.json");
    const manifest = JSON.parse(readFileSync(path, "utf-8"));
    expect(manifest.signature).toMatchObject({
      alg: expect.any(String),
      value: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/),
    });

    const { signature, ...unsigned } = manifest;
    const publicKeyPath = resolve(__dirname, "../public/build-manifest-public.pem");
    const verifier = createVerify("SHA256");
    verifier.update(JSON.stringify(unsigned));
    verifier.end();
    expect(verifier.verify(readFileSync(publicKeyPath, "utf-8"), signature.value, "base64")).toBe(true);
  });

  it("includes the streaming-download service worker route", () => {
    const path = resolve(distDir, "sw.js");
    const sw = readFileSync(path, "utf-8");
    expect(sw).toContain("__sw-download");
    expect(sw).toContain("register-download");
  });

  it("injects manifest link into index.html", () => {
    const path = resolve(distDir, "index.html");
    expect(existsSync(path)).toBe(true);
    const html = readFileSync(path, "utf-8");
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('href="/manifest.webmanifest"');
  });

  it("includes theme-color meta tag", () => {
    const path = resolve(distDir, "index.html");
    const html = readFileSync(path, "utf-8");
    expect(html).toContain('name="theme-color"');
  });

  it("includes apple-touch-icon link", () => {
    const path = resolve(distDir, "index.html");
    const html = readFileSync(path, "utf-8");
    expect(html).toContain('rel="apple-touch-icon"');
  });

  it("includes favicon link", () => {
    const path = resolve(distDir, "index.html");
    const html = readFileSync(path, "utf-8");
    expect(html).toContain('rel="icon"');
  });

  it("has 192x192 icon", () => {
    const path = resolve(distDir, "manifest.webmanifest");
    const manifest = JSON.parse(readFileSync(path, "utf-8"));
    const icon192 = manifest.icons.find((i: { sizes: string }) => i.sizes === "192x192");
    expect(icon192).toBeDefined();
    expect(existsSync(resolve(distDir, icon192.src.replace(/^\//, "")))).toBe(true);
  });

  it("has 512x512 icon", () => {
    const path = resolve(distDir, "manifest.webmanifest");
    const manifest = JSON.parse(readFileSync(path, "utf-8"));
    const icon512 = manifest.icons.find((i: { sizes: string }) => i.sizes === "512x512");
    expect(icon512).toBeDefined();
    expect(existsSync(resolve(distDir, icon512.src.replace(/^\//, "")))).toBe(true);
  });

  it("declares an Android share target for inbound files", () => {
    const path = resolve(distDir, "manifest.webmanifest");
    const manifest = JSON.parse(readFileSync(path, "utf-8"));
    expect(manifest.share_target).toMatchObject({
      action: "/send/shared",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    });
    expect(manifest.share_target.params.files[0].name).toBe("file");
    expect(manifest.share_target.params.files[0].accept).toContain("application/*");
  });
});
