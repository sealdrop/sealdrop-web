import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
import { createHash } from "crypto";
import { execSync } from "child_process";

const distDir = resolve(import.meta.dirname, "../dist");
const htmlPath = resolve(distDir, "index.html");

if (!existsSync(htmlPath)) {
  console.error("index.html not found at", htmlPath);
  process.exit(1);
}

let html = readFileSync(htmlPath, "utf-8");

const assetRe = /(src|href)="\/([^"]+\.(?:js|css))"/g;
let m;

while ((m = assetRe.exec(html)) !== null) {
  const attr = m[1];
  const assetPath = m[2];
  const fullPath = resolve(distDir, assetPath);

  if (!existsSync(fullPath)) continue;
  if (assetPath.includes("registerSW")) continue;

  const content = readFileSync(fullPath);
  const hash = createHash("sha384").update(content).digest("base64");
  const integrity = "sha384-" + hash;

  const search = attr + '="/' + assetPath + '"';
  const replace = attr + '="/' + assetPath + '" integrity="' + integrity + '" crossorigin="anonymous"';
  html = html.replace(search, replace);
}

writeFileSync(htmlPath, html, "utf-8");
console.log("SRI integrity attributes injected into index.html");

// Write checksums.txt for build verification
const assetsDir = resolve(distDir, "assets");
const lines = [];

const commit = (() => {
  try { return execSync("git rev-parse --short HEAD").toString().trim(); }
  catch { return "unknown"; }
})();
const buildTime = new Date().toISOString();

lines.push(`# SealDrop build verification`);
lines.push(`# commit: ${commit}`);
lines.push(`# built:  ${buildTime}`);
lines.push(`#`);
lines.push(`# SHA-256 checksums of deployed client bundles.`);
lines.push(`# Verify: sha256sum -c checksums.txt`);
lines.push(`#`);

if (existsSync(assetsDir)) {
  for (const name of readdirSync(assetsDir).sort()) {
    if (!name.endsWith(".js") && !name.endsWith(".css")) continue;
    const content = readFileSync(resolve(assetsDir, name));
    const sha256 = createHash("sha256").update(content).digest("hex");
    lines.push(`${sha256}  assets/${name}`);
  }
}

writeFileSync(resolve(distDir, "checksums.txt"), lines.join("\n") + "\n", "utf-8");
console.log("checksums.txt written");