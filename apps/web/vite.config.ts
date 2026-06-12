import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "child_process";
import { createHash, createSign } from "crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const buildCommit = (() => {
  try { return execSync("git rev-parse --short HEAD").toString().trim(); }
  catch { return "unknown"; }
})();
const buildTime = new Date().toISOString();

function sriAndChecksums(): Plugin {
  let outDir: string;
  return {
    name: "sealdrop-sri-checksums",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const htmlPath = resolve(outDir, "index.html");
      if (!existsSync(htmlPath)) return;

      // Inject SRI integrity attributes into index.html
      let html = readFileSync(htmlPath, "utf-8");
      const assetRe = /(src|href)="\/([^"]+\.(?:js|css))"/g;
      let m;
      while ((m = assetRe.exec(html)) !== null) {
        const [, attr, assetPath] = m;
        if (!assetPath || assetPath.includes("registerSW")) continue;
        const fullPath = resolve(outDir, assetPath);
        if (!existsSync(fullPath)) continue;
        const content = readFileSync(fullPath);
        const hash = createHash("sha384").update(content).digest("base64");
        html = html.replace(
          `${attr}="/${assetPath}"`,
          `${attr}="/${assetPath}" integrity="sha384-${hash}" crossorigin="anonymous"`,
        );
      }
      writeFileSync(htmlPath, html, "utf-8");
      console.log("SRI integrity attributes injected into index.html");

      // Write checksums.txt
      const assetsDir = resolve(outDir, "assets");
      const manifestAssets: Array<{ path: string; sha256: string }> = [];
      const lines = [
        "# SealDrop build verification",
        `# commit: ${buildCommit}`,
        `# built:  ${buildTime}`,
        "#",
        "# SHA-256 checksums of deployed client bundles.",
        "# Verify: sha256sum -c checksums.txt",
        "#",
      ];
      if (existsSync(assetsDir)) {
        for (const name of readdirSync(assetsDir).sort()) {
          if (!name.endsWith(".js") && !name.endsWith(".css")) continue;
          const content = readFileSync(resolve(assetsDir, name));
          const sha256 = createHash("sha256").update(content).digest("hex");
          manifestAssets.push({ path: `assets/${name}`, sha256 });
          lines.push(`${sha256}  assets/${name}`);
        }
      }
      writeFileSync(resolve(outDir, "checksums.txt"), lines.join("\n") + "\n", "utf-8");
      console.log("checksums.txt written");

      const buildManifest: Record<string, unknown> = {
        schema: "https://sealdrop.io/schemas/build-manifest-v1.json",
        commit: buildCommit,
        built: buildTime,
        assets: manifestAssets,
      };
      const signingKeyEnv = process.env["SEALDROP_BUILD_MANIFEST_PRIVATE_KEY_PEM"];
      if (signingKeyEnv) {
        let signingKey = signingKeyEnv.trim();
        // Secret managers sometimes wrap the value in matching quotes.
        if ((signingKey.startsWith('"') && signingKey.endsWith('"')) || (signingKey.startsWith("'") && signingKey.endsWith("'"))) {
          signingKey = signingKey.slice(1, -1).trim();
        }
        // Secret managers often flatten PEM newlines into literal "\n" escapes.
        if (signingKey.includes("\\n")) signingKey = signingKey.replace(/\\n/g, "\n");
        // CI runners can mangle multi-line secrets; allow the key to be stored base64-encoded.
        if (!signingKey.startsWith("-----BEGIN")) signingKey = Buffer.from(signingKey, "base64").toString("utf-8");
        const canonical = JSON.stringify(buildManifest);
        const signature = createSign("SHA256").update(canonical).end().sign(signingKey, "base64");
        buildManifest["signature"] = {
          alg: "SHA256withRSA-or-ECDSA",
          value: signature,
        };
      }
      writeFileSync(resolve(outDir, "build-manifest.json"), JSON.stringify(buildManifest, null, 2) + "\n", "utf-8");
      console.log("build-manifest.json written");
    },
  };
}

export default defineConfig({
  define: {
    __BUILD_COMMIT__: JSON.stringify(buildCommit),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    sriAndChecksums(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "SealDrop",
        short_name: "SealDrop",
        description: "Simple end-to-end encrypted file exchange with automatic expiry. No account. Gone after use.",
        theme_color: "#6366f1",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        share_target: {
          action: "/send/shared",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url",
            files: [
              {
                name: "file",
                accept: [
                  "image/*",
                  "video/*",
                  "audio/*",
                  "text/*",
                  "application/*",
                  ".7z",
                  ".csv",
                  ".doc",
                  ".docx",
                  ".gz",
                  ".json",
                  ".pdf",
                  ".ppt",
                  ".pptx",
                  ".tar",
                  ".xls",
                  ".xlsx",
                  ".zip",
                ],
              },
            ],
          },
        },
        icons: [
          {
            src: "/icon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "/icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        globIgnores: ["**/_worker.js"],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env["VITE_API_URL"] ?? "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
