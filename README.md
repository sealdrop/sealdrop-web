# sealdrop-web

> Send or receive a sealed file. No account. Gone after use.

This repository contains the **frontend client and browser crypto code**
for [SealDrop](https://sealdrop.io) — the React/TypeScript app and the
shared Web Crypto utilities that run entirely in your browser to encrypt
and decrypt files before they're uploaded.

## What's in here

- `apps/web` — the React + Vite frontend (everything served at
  [sealdrop.io](https://sealdrop.io)).
- `packages/crypto` — the Web Crypto utilities used to encrypt/decrypt
  files, wrap keys, and derive keys from passphrases, entirely client-side.
- `packages/shared` — shared types, expiry presets, and validation schemas.

This repo intentionally does **not** include the backend API, storage, or
self-hosting infrastructure — those remain private for now. The frontend
talks to the SealDrop API over the endpoints documented in
[`docs/SECURITY.md`](https://sealdrop.io/security) (URL fragments holding
encryption keys are never sent to any server).

## Building and testing

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
```

(`pnpm build` must run before `pnpm test` — some tests check the built
`dist/` output, e.g. subresource integrity attributes and checksums.)

## Verifying production

The code here is what powers [sealdrop.io](https://sealdrop.io). To check
that the deployed site matches this source:

- [`/checksums.txt`](https://sealdrop.io/checksums.txt) — SHA-256 hashes of
  the deployed JavaScript/CSS bundles.
- [`/build-manifest.json`](https://sealdrop.io/build-manifest.json) — the
  commit, build time, and per-asset checksums, signed with an ECDSA key.
- [`/build-manifest-public.pem`](https://sealdrop.io/build-manifest-public.pem)
  — the public key used to verify that signature.

See [sealdrop.io/security](https://sealdrop.io/security) for the full
security model and verification steps.

**Note on this repo's history**: this repository is exported periodically
from SealDrop's internal monorepo, not mirrored automatically. The commit
hash recorded in `build-manifest.json` refers to the internal build
pipeline and won't generally correspond to a commit here — to verify a
production build, compare the *code* in this repo against the checksummed
bundles, rather than looking for a matching commit hash.

## License

MIT — see [`LICENSE`](./LICENSE).
