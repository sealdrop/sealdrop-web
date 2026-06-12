const MARKDOWN_ROUTES = {
  "/": `---
title: SealDrop — Temporary encrypted file exchange
description: Send or receive a sealed file with end-to-end encryption. No account required. Files auto-delete after use or expiry.
image: https://sealdrop.io/og-image.png
---

# SealDrop

Send a private file link that disappears.

SealDrop encrypts files in your browser, gives you a link to share, and deletes the file after use or expiration. No account. No storage folder to manage.

## How it works

1. Upload a file and choose an expiration rule. The default is open once.
2. Share a secure link. The decryption key lives in the URL fragment, after the \`#\`.
3. The encrypted file disappears after its download limit or expiry is reached.

## Built for files that should not linger

- Client-side encryption: files and filenames are encrypted in the browser before upload.
- No account required: exchanges work through links, with no users, passwords, or profiles.
- Temporary by design: use open-once links, short expiry windows, and optional delete links.
- Simple link exchange: send a file directly or create a drop link so someone can send one to you.
- Privacy-first metadata: the server stores ciphertext and rounded size information, not plaintext content.
- Developer-friendly: open source, self-hostable, and built on standard browser crypto.

## Security model

SealDrop uses the Web Crypto API to encrypt files before upload. The server stores encrypted blobs. Decryption keys live in URL fragments, which browsers do not send over HTTP.

This does not remove every risk. File size and upload timing are visible, link access matters, and high-assurance users should review the source and served JavaScript.

## Key pages

- [How it works](https://sealdrop.io/how-it-works)
- [Security model](https://sealdrop.io/security)
- [Privacy policy](https://sealdrop.io/privacy)
- [Terms of service](https://sealdrop.io/terms)
- [Abuse and legal requests](https://sealdrop.io/abuse)
`,
  "/how-it-works": `---
title: How SealDrop works
description: Step-by-step explanation of SealDrop send and receive flows.
---

# How SealDrop Works

## Send a file

1. Pick a file from your device. Nothing leaves your machine yet.
2. Your browser generates a cryptographically random 256-bit key using the Web Crypto API.
3. The file contents and filename are encrypted with AES-GCM before any network request is made.
4. Only ciphertext and encrypted metadata are uploaded to the server.
5. You get a share link. The decryption key lives in the URL fragment, which browsers never send to servers.
6. The recipient decrypts locally in their browser.
7. The encrypted blob and metadata are deleted after first download or expiry.

## Receive mode

1. Create a drop link. Your browser generates an ECDH P-256 key pair.
2. The public key is sent to the server; the private key stays in your browser and appears only in your owner link.
3. Share the drop link. It contains only a random ID, with no private key.
4. Uploaders encrypt files to your public key in their browsers.
5. Each file key is wrapped to your public key using ECDH, HKDF, and AES-KW.
6. The server stores only ciphertext and wrapped key material.
7. You decrypt files locally with the owner link.

## Expiry and deletion

- Send files can expire after first open, 1 hour, 1 day, or 7 days.
- Receive drops can accept one file by default or up to three files.
- Deletion removes the encrypted blob and database record. There is no recovery.
`,
  "/security": `---
title: SealDrop security model
description: What SealDrop stores, what it never stores, and which risks it does and does not protect against.
---

# Security Model

The server should never read your file.

## Summary

- Files are encrypted before upload with AES-GCM 256-bit in your browser.
- The server receives ciphertext only.
- Plaintext filenames, MIME types, file contents, encryption keys, private keys, and URL fragments are never stored.
- Whoever holds a complete share link can decrypt the file. Treat links like passwords.

## Stored on the server

- Encrypted file blob
- Encrypted filename and MIME type
- Approximate file size, padded to a privacy bucket
- Expiry timestamp
- Random file and drop IDs
- IVs required for decryption

## Never stored on the server

- Plaintext file content
- Plaintext filename or MIME type
- Encryption keys
- Private keys
- URL fragments
- Exact file size or chunk count
- Any identifier linking you to a file

## Cryptographic primitives

- AES-GCM 256-bit encrypts file contents and metadata.
- ECDH P-256 is used in receive mode for owner/uploader key agreement.
- HKDF derives wrapping keys from ECDH shared secrets.
- AES-KW wraps per-file keys to the receiver.
- All crypto operations use the browser Web Crypto API.

## Size privacy

SealDrop supports size padding. Standard mode pads the last chunk to a 4 KB boundary. Enhanced mode rounds uploads to the next 1 MB. Maximum mode rounds to fixed buckets such as 10 MB, 50 MB, 100 MB, 500 MB, or 1 GB.

## Verifying this build

Each deployment publishes verification artifacts:

- [/checksums.txt](https://sealdrop.io/checksums.txt) — SHA-256 hashes of the deployed JavaScript and CSS bundles.
- [/build-manifest.json](https://sealdrop.io/build-manifest.json) — commit, build time, and per-asset checksums, signed with an ECDSA key.
- [/build-manifest-public.pem](https://sealdrop.io/build-manifest-public.pem) — the public key used to verify that signature.
- [/.well-known/security.txt](https://sealdrop.io/.well-known/security.txt) — vulnerability disclosure contact, per RFC 9116.

Verifying the manifest signature confirms it was produced by the real build pipeline and not altered in transit.

## Source

The frontend client and browser crypto code are published at [github.com/sealdrop/sealdrop-web](https://github.com/sealdrop/sealdrop-web). This repository is updated periodically rather than mirrored automatically, so the commit referenced in the signed build manifest may not match a commit there — to verify a production build, compare the code itself rather than commit hashes.

## Protects against

- Server compromise or full database dump
- R2 or D1 data leak
- Passive network observers reading plaintext payloads
- Plaintext filename leakage
- File ID enumeration

## Does not protect against

- Someone who holds the share link
- A compromised browser or malicious extension
- Traffic analysis of upload timing and transfer size
- Legal takedown requests; encrypted blobs can be deleted when required
- Cloudflare infrastructure access; Cloudflare runs the compute and storage layer

## Safe-use guidance

For highly sensitive files, use a trusted device and a browser profile with extensions disabled. SealDrop cannot protect against malware, a compromised operating system, or a malicious browser extension.
`,
  "/privacy": `---
title: SealDrop privacy policy
description: What SealDrop collects, stores, and does not store.
---

# Privacy Policy

## What this service stores

SealDrop stores encrypted file blobs, encrypted filenames and MIME types, approximate file sizes, expiry timestamps, and randomly generated file and drop IDs. None of these are linked to your identity.

## What this service does not store

- Your name, email address, or any personal identifier
- Plaintext file content or filenames
- Encryption keys or private keys
- URL fragments, because browsers never transmit them to servers
- IP addresses beyond what Cloudflare retains in standard access logs

## Data retention

Files are deleted automatically when their expiry condition is met: first download, time limit, or drop closure. No manual retention period applies. No backups of file content are maintained.

## Third-party services

SealDrop runs on Cloudflare infrastructure: Workers, R2 object storage, D1 database, and Pages. Cloudflare processes standard HTTP request metadata such as IP addresses, request timing, and headers as part of routing and serving requests. Cloudflare does not have access to encryption keys or plaintext content.

See the [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/) for details on what Cloudflare retains.

## Cookies and tracking

No tracking cookies are set. No third-party analytics or advertising scripts are loaded. No fingerprinting is performed. The only browser storage used is temporary in-memory key state during an active encryption or decryption session.

## Your rights

Because SealDrop does not store personal data linked to your identity, there is typically nothing to access, correct, or delete on our end. If you believe we hold personal data you can be identified by, contact us and we will investigate.

## Contact

To ask a privacy question or report a concern, email abuse@sealdrop.io.
`,
  "/terms": `---
title: SealDrop terms of service
description: Plain-language terms for using SealDrop.
---

# Terms of Service

## Using this service

SealDrop is provided free of charge and without warranty. By using it you agree to these terms. If you do not agree, do not use the service.

## Acceptable use

You may not use SealDrop to upload, share, or distribute:

- Content that is illegal in your jurisdiction or the jurisdiction where this service operates
- Content that infringes the intellectual property rights of others
- Malware, exploits, or tools designed to harm systems or people
- Content that constitutes abuse, harassment, or threats toward any person

## Content and encryption

Files uploaded to SealDrop are end-to-end encrypted. We cannot inspect their contents. This is fundamental to the service's privacy guarantees, and it means you are solely responsible for the files you upload and share.

## No warranty

The service is provided as is, without warranty of any kind. We do not guarantee availability, durability, or delivery. Files may be deleted earlier than their stated expiry if the service experiences technical issues. Do not use SealDrop as the sole copy of important data.

## Takedowns and abuse

We reserve the right to delete files by ID in response to credible abuse reports or legal requirements, without confirming or disclosing the content of any file. Because files are end-to-end encrypted we cannot inspect their contents, but we can delete them by ID.

To report abuse or send a legal request, see [Abuse and legal requests](https://sealdrop.io/abuse).

## Limitation of liability

To the maximum extent permitted by applicable law, we are not liable for any loss of data, failure to deliver files, or any other damages arising from your use of this service.

## Changes to these terms

These terms may be updated at any time. Continued use of the service after changes constitutes acceptance of the revised terms.
`,
  "/abuse": `---
title: SealDrop abuse and legal requests
description: How SealDrop handles abuse reports and legal requests for an end-to-end encrypted service.
---

# Abuse And Legal Requests

## What we can do

Upon receiving a credible abuse report or valid legal request, we can:

- Delete a file or drop by its random ID
- Prevent new uploads to a specific drop link

We aim to act on credible reports within 48 hours of receipt.

## What we cannot do

SealDrop is end-to-end encrypted. Before a file leaves a sender's device, it is encrypted with a key that only the recipient holds. The key is never transmitted to our servers.

This means:

- We cannot inspect the contents of any file
- We cannot decrypt files on request
- We cannot identify who uploaded a file or who holds a share link
- We cannot confirm or deny whether a specific file ID contains certain content

Deleting a file by ID removes the encrypted blob and its database record. If the recipient has already downloaded the file, deletion has no effect on their copy.

## What to include in a report

- The full URL of the file or drop link being reported. The random ID is all we need. Do not include any URL fragment, because that is the private decryption key.
- A brief description of the concern.
- For legal requests: the applicable law or order and jurisdiction.

## Contact

Send reports and legal requests by email to abuse@sealdrop.io.

We do not maintain a bug bounty programme, but responsible disclosure of security vulnerabilities is welcome at the same address.

## Transparency

Requests that ask us to do something technically impossible, such as decrypting a file or identifying a user, will receive an honest response explaining why we cannot comply. This is a consequence of how the encryption works.
`,
};

function acceptsMarkdown(accept) {
  if (!accept) return false;

  return accept.split(",").some((part) => {
    const [mediaType, ...params] = part.trim().toLowerCase().split(";").map((value) => value.trim());
    if (mediaType !== "text/markdown") return false;

    const q = params.find((param) => param.startsWith("q="));
    return !q || Number.parseFloat(q.slice(2)) > 0;
  });
}

function normalizeMarkdownPath(pathname) {
  if (pathname !== "/" && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function tokenCount(markdown) {
  return String(markdown.match(/\S+/g)?.length ?? 0);
}

function markdownResponse(markdown, request) {
  const headers = new Headers({
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    "Content-Signal": "ai-train=yes, search=yes, ai-input=yes",
    "Referrer-Policy": "no-referrer",
    "Vary": "Accept",
    "X-Content-Type-Options": "nosniff",
    "X-Markdown-Tokens": tokenCount(markdown),
  });

  return new Response(request.method === "HEAD" ? null : markdown, { headers });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function notFoundResponse(request) {
  return new Response(request.method === "HEAD" ? null : "Not found\n", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isMachineDiscoveryPath(pathname) {
  return pathname.startsWith("/.well-known/")
    || pathname === "/auth.md"
    || pathname === "/openapi.json"
    || pathname === "/.well-known";
}

function isHtmlFallback(response) {
  return response.headers.get("Content-Type")?.toLowerCase().includes("text/html");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname === "/api/") {
      return jsonResponse({ error: "not found" }, 404);
    }

    if ((request.method === "GET" || request.method === "HEAD") && acceptsMarkdown(request.headers.get("Accept"))) {
      const markdown = MARKDOWN_ROUTES[normalizeMarkdownPath(url.pathname)];
      if (markdown) return markdownResponse(markdown, request);
    }

    const response = await env.ASSETS.fetch(request);
    if (isMachineDiscoveryPath(url.pathname) && isHtmlFallback(response)) return notFoundResponse(request);

    return response;
  },
};
