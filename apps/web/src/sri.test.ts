import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const distDir = resolve(__dirname, "../dist");

describe("SRI integrity attributes", () => {
  it("injects integrity into script tags", () => {
    const path = resolve(distDir, "index.html");
    expect(existsSync(path)).toBe(true);
    const html = readFileSync(path, "utf-8");

    const scriptMatches = html.match(/<script[^>]*integrity="sha384-[^"]+"[^>]*>/g);
    expect(scriptMatches).not.toBeNull();
    expect(scriptMatches!.length).toBeGreaterThanOrEqual(1);
  });

  it("injects integrity into CSS link tags", () => {
    const path = resolve(distDir, "index.html");
    const html = readFileSync(path, "utf-8");

    const cssMatches = html.match(/<link[^>]*rel="stylesheet"[^>]*integrity="sha384-[^"]+"[^>]*>/g);
    expect(cssMatches).not.toBeNull();
    expect(cssMatches!.length).toBeGreaterThanOrEqual(1);
  });

  it("uses crossorigin for integrity-protected resources", () => {
    const path = resolve(distDir, "index.html");
    const html = readFileSync(path, "utf-8");

    const hasCrossorigin = html.includes('crossorigin');
    expect(hasCrossorigin).toBe(true);
  });

  it("does not add integrity to the service worker registration script", () => {
    const path = resolve(distDir, "index.html");
    const html = readFileSync(path, "utf-8");

    const swScripts = html.match(/<script[^>]*src="\/registerSW\.js"[^>]*>/g);
    if (swScripts) {
      for (const s of swScripts) {
        expect(s).not.toContain("integrity");
      }
    }
  });
});