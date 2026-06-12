---
name: sealdrop-secure-file-exchange
description: Guide users through using SealDrop safely, including send vs receive mode, expiry choices, access codes, passphrases, size padding, and security limitations.
---

# SealDrop Secure File Exchange

Use this skill when a user asks how to use SealDrop, how to send or receive encrypted files safely, or what SealDrop's security model means in practice.

SealDrop is a browser-based end-to-end encrypted temporary file exchange service at `https://sealdrop.io`.

## Core Rules

- Do not claim that SealDrop can read plaintext files, filenames, encryption keys, private keys, passphrases, access codes, or URL fragments.
- Do not ask users to paste full SealDrop links containing URL fragments unless they explicitly need help inspecting a link. The fragment after `#` is key material.
- Do not send, upload, download, decrypt, or retrieve files on behalf of the user. SealDrop encryption and decryption happen in the user's browser.
- Do not promise absolute anonymity. Upload timing, IP metadata at infrastructure providers, and approximate padded file size can still be observable.
- Treat share links, owner links, delete links, access codes, and passphrases as sensitive secrets.

## Choosing A Flow

Use **Send** when the user has a file and wants to give someone a temporary encrypted download link.

Use **Receive** when the user wants someone else to send them a file without creating an account or revealing plaintext to the server.

In receive mode, the owner link is private. The drop link is safe to share, but the owner link unlocks received files and must be protected.

## Safe Send Checklist

1. Open `https://sealdrop.io/send` on a trusted device and browser.
2. Choose the file locally. The file is encrypted before upload.
3. Pick an expiry rule. Prefer open-once or a short time window for sensitive files.
4. For links that may pass through email, chat history, or link previews, enable an access code or passphrase.
5. Send the share link through an end-to-end encrypted channel when possible.
6. If using an access code or passphrase, send it through a different channel than the link.
7. If a delete link was generated, keep it private.

## Safe Receive Checklist

1. Open `https://sealdrop.io/receive` on a trusted device and browser.
2. Create a drop link.
3. Share only the drop link with uploaders.
4. Save the owner link somewhere private and durable. SealDrop cannot recover it.
5. Open the owner link only on a trusted device to decrypt received files.

## Security Model Summary

- Files and metadata are encrypted client-side using browser Web Crypto APIs.
- Send mode uses AES-GCM with keys stored only in URL fragments.
- Receive mode uses an ECDH P-256 key pair. The public key can be shared; the private key remains in the owner link fragment.
- URL fragments are not sent in HTTP requests, so the server should not receive file keys.
- The server stores encrypted blobs, encrypted metadata, expiry metadata, random IDs, and IVs required for decryption.
- The server does not store plaintext content, plaintext filenames, encryption keys, private keys, URL fragments, or exact chunk count.

## Expiry Guidance

- Use open-once for the most sensitive one-time transfers.
- Use short time windows when the recipient may not open immediately.
- Use longer expiry only when availability matters more than minimizing exposure.
- Explain that deletion removes the encrypted server copy, but cannot delete copies already downloaded by recipients.

## Access Codes And Passphrases

Use an access code when the user wants a short second factor for a share link. The code should be sent separately from the link.

Use a passphrase when the user and recipient can agree on a stronger secret. Use at least 8 characters; longer, unique passphrases are safer.

Do not represent access codes or passphrases as protection against compromised devices. They help if a link leaks, but not if an attacker has both the link and the secret or controls the browser/device.

## Size Privacy

SealDrop can pad encrypted uploads to reduce file-size leakage.

- Standard: pads the last chunk to a 4 KB boundary.
- Enhanced: rounds the upload to the next 1 MB boundary.
- Maximum: rounds to larger buckets such as 10 MB, 50 MB, 100 MB, 500 MB, or 1 GB.

Explain that padding reduces precision, but transfer size and timing can still reveal information.

## Limitations To Mention

- SealDrop cannot protect against malware, compromised operating systems, malicious browser extensions, or a malicious recipient.
- Anyone with the full share link can decrypt the file unless an access code or passphrase is also required.
- Cloudflare and network infrastructure can process normal HTTP metadata, but should not see decryption keys or plaintext file content.
- SealDrop is not long-term storage. It is for temporary exchange.

## Useful Public Pages

- How it works: `https://sealdrop.io/how-it-works`
- Security model: `https://sealdrop.io/security`
- Privacy policy: `https://sealdrop.io/privacy`
- Terms: `https://sealdrop.io/terms`
- Abuse and legal requests: `https://sealdrop.io/abuse`

These public pages support `Accept: text/markdown` for machine-readable retrieval.
