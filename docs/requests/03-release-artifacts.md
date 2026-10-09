# Releases of the engine builds that the site deploys

**Status:** accepted, for the site's first deploy. The engine repository confirms each release before it
publishes it. Development uses local builds until then.

## What

For each WebAssembly build that the site deploys, a GitHub Release of the engine repository:

- **The tag** names the build, for example `wasm-v2-b10c128-s46923648-d9407005`.
- **The assets:** the module (`enclosure-engine.wasm`), each network (`model-float16.bin`), and a manifest
  (`manifest.json`).
- **The manifest** gives, for each asset: the file name, its SHA-256, its size, the engine commit that built it, the
  model's name and training step, and the protocol version that the module speaks.

Releases are needed only for builds that the site ships, not for every checkpoint.

## Why

This repository pins the engine's files by SHA-256 ([design/03-stack.md](../design/03-stack.md)). A deploy, and every
result that ships (precomputed analyses, puzzles), must name a build that anyone can get again. A local file in
`runs/` is not reachable from CI, and it can change or disappear.

## Done when

`scripts/fetch-engine.mjs` in this repository can download a tagged build and its manifest, and the SHA-256 in the
manifest matches the file.
