# Releases of the engine builds that the site deploys

**Status:** done on 2026-10-12, and checked here (below, "Delivered"). Asked for the site's first deploy, with a
notice of the licences of what is compiled into the module, which the site's notices page names.

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

## Delivered

The engine's builds are published as GitHub Releases of a public repository that holds only the releases,
`seankao31/enclosure-engine`. The engine repository itself stays private. The first release is
`wasm-v2-engine-85c2adb`: its tag names the commit that built the module.

| Asset | Bytes | What |
|---|---|---|
| `enclosure-engine.wasm` | 1,348,467 | the module, protocol 0.3, build `85c2adb` |
| `b10c128-s66625408-d13350730.model-float16.bin` | 6,499,365 | the small network |
| `b15c192-s66999040-d13350730.model-float16.bin` | 20,597,245 | the large network |
| `NOTICES.txt` | 10,042 | the licences of what is compiled into the module |
| `manifest.json` | | each file's name, SHA-256, size, kind, build and protocol, and each network's training samples and data rows |

- **The networks are newer than the snapshots the site used,** and stronger at 512 visits over 64 games each: the
  small network beat `b10c128-s46923648` 50 to 14 (about +220 Elo), and the large one beat `b15c192-s48758784` 53 to
  11 (about +270 Elo). The new small network beat the old large one 39 to 25 (about +80 Elo).
- **The module replaces `engine-319a5c4`,** which refuses every network trained since 2026-10-11. The new module also
  loads the old snapshots. Its network outputs match the trainer's within about 0.01 on 332 positions.
- **The networks' sizes are the same** (3.2M and 10.3M parameters), so a worker's memory should be as before. This
  is not measured.
- **The module's notices:** KataGo (MIT), its sha2.cpp (BSD-3-Clause), JSON for Modern C++ 3.8.0 (MIT), Eigen 3.4.0
  (MPL-2.0), the LLVM 19.1.5 runtime (Apache-2.0 WITH LLVM-exception), and wasi-libc (Apache-2.0 WITH
  LLVM-exception, Apache-2.0 or MIT) with parts from musl (MIT) and cloudlibc (BSD-2-Clause).
- **Checked here:** `engine.lock.json` pins the release (the module, both networks and the notices). `npm run engine
  -- --deploy` downloads every file without a login, and each matches its locked SHA-256 and size. In Edge, the
  early-access build reviewed an imported game with the new module and the small network.
- **What the new networks change:** the measurements here used the old small network (the human win curve, label
  agreement, requests 07 to 10). The new network is more certain: it puts 46 of 48 opening visits on one edge, where
  the old one spread them over four. Those numbers can move.
