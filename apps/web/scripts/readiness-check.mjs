#!/usr/bin/env node

import { createVerify } from "node:crypto";

const baseUrl = (process.argv[2] || process.env.SEALDROP_READINESS_URL || "https://sealdrop.io").replace(/\/$/, "");

const checks = [];

function ok(name, detail) {
  checks.push({ name, ok: true, detail });
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
}

async function request(path, init) {
  return fetch(`${baseUrl}${path}`, init);
}

async function expectStatus(path, status, init) {
  const res = await request(path, init);
  const name = `${init?.method || "GET"} ${path} status ${status}`;
  if (res.status === status) ok(name, `${res.status}`);
  else fail(name, `expected ${status}, got ${res.status}`);
  return res;
}

function expectHeader(res, header, pattern, name) {
  const value = res.headers.get(header) || "";
  if (pattern.test(value)) ok(name, value);
  else fail(name, `${header}: ${value || "<missing>"}`);
}

async function main() {
  const home = await expectStatus("/", 200);
  expectHeader(home, "content-security-policy", /default-src 'self'.*script-src-attr 'none'.*manifest-src 'self'/, "CSP includes hardened directives");
  expectHeader(home, "strict-transport-security", /max-age=63072000; includeSubDomains; preload/i, "HSTS preload header present");
  expectHeader(home, "x-content-type-options", /^nosniff$/i, "nosniff header present");

  const markdown = await expectStatus("/security", 200, { headers: { Accept: "text/markdown" } });
  expectHeader(markdown, "content-type", /^text\/markdown/i, "Markdown negotiation content type");
  expectHeader(markdown, "x-markdown-tokens", /^\d+$/, "Markdown token count header");

  const agents = await expectStatus("/.well-known/agents.json", 200);
  expectHeader(agents, "content-type", /^application\/json/i, "agents.json content type");

  const securityTxt = await expectStatus("/.well-known/security.txt", 200);
  expectHeader(securityTxt, "content-type", /^text\/plain/i, "security.txt content type");

  const skills = await expectStatus("/.well-known/agent-skills/index.json", 200);
  expectHeader(skills, "content-type", /^application\/json/i, "agent skills index content type");

  const skill = await expectStatus("/.well-known/agent-skills/sealdrop-secure-file-exchange/SKILL.md", 200);
  expectHeader(skill, "content-type", /^(text\/markdown|text\/plain)/i, "agent skill artifact content type");

  const missingWellKnown = await expectStatus("/.well-known/missing.json", 404);
  expectHeader(missingWellKnown, "content-type", /^text\/plain/i, "unknown well-known returns plain 404");

  const api = await expectStatus("/api", 404);
  expectHeader(api, "content-type", /^application\/json/i, "bare API path returns JSON 404");

  const manifest = await expectStatus("/build-manifest.json", 200);
  expectHeader(manifest, "content-type", /^application\/json/i, "build manifest content type");

  const { signature, ...unsignedManifest } = await manifest.json();
  if (!signature?.value) {
    fail("Build manifest signature", "missing signature field");
  } else {
    const publicKeyRes = await request("/build-manifest-public.pem");
    if (publicKeyRes.status !== 200) {
      fail("Build manifest signature", `public key fetch returned ${publicKeyRes.status}`);
    } else {
      const publicKeyPem = await publicKeyRes.text();
      const verifier = createVerify("SHA256");
      verifier.update(JSON.stringify(unsignedManifest));
      verifier.end();
      const valid = verifier.verify(publicKeyPem, signature.value, "base64");
      if (valid) ok("Build manifest signature", "valid");
      else fail("Build manifest signature", "signature does not verify against build-manifest-public.pem");
    }
  }

  const scanUrl = new URL(baseUrl);
  const canRunExternalScan = scanUrl.protocol === "https:" && !["localhost", "127.0.0.1", "0.0.0.0"].includes(scanUrl.hostname);

  if (!canRunExternalScan) {
    ok("Agent readiness scan", "skipped for local/non-HTTPS URL");
  } else try {
    const scan = await fetch("https://isitagentready.com/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: baseUrl }),
    });
    if (!scan.ok) {
      fail("Agent readiness scan", `scanner returned ${scan.status}`);
    } else {
      const data = await scan.json();
      const dnsAid = data?.checks?.discoverability?.dnsAid?.status;
      const markdownStatus = data?.checks?.contentAccessibility?.markdownNegotiation?.status;
      const agentSkills = data?.checks?.discovery?.agentSkills?.status;
      if (dnsAid === "pass" && markdownStatus === "pass" && agentSkills === "pass") {
        ok("Agent readiness scan", `dnsAid=${dnsAid}, markdown=${markdownStatus}, agentSkills=${agentSkills}`);
      } else {
        fail("Agent readiness scan", `dnsAid=${dnsAid}, markdown=${markdownStatus}, agentSkills=${agentSkills}`);
      }
    }
  } catch (err) {
    fail("Agent readiness scan", err instanceof Error ? err.message : String(err));
  }

  for (const check of checks) {
    const prefix = check.ok ? "PASS" : "FAIL";
    console.log(`${prefix} ${check.name}: ${check.detail}`);
  }

  if (checks.some((check) => !check.ok)) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
