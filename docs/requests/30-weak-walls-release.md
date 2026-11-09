# A release of Enclosure's engine with the weak walls

**Status:** done: the release `engine-c43233eb` of `enclosure-engine` (beads abscls-0rls), pinned here.
**Asked:** 2026-11-08. **Delivered:** 2026-11-09.

## What

A release of Enclosure's engine in the public releases repository (`abstractclass-org/enclosure-engine`) whose CPU
module answers protocol 0.6.2 or later, with the networks that the site loads. The site's engine lock then takes it
in place of `engine-d6786eba`.

Protocol 0.6.2 gives the weak walls (`includeWeakWalls`, the engine repository's
[docs/design/04-notation-and-protocol.md](https://github.com/abstractclass-org/engines/blob/main/docs/design/04-notation-and-protocol.md),
"The root's maps"). Request 02, item 5, asked for these heads, and the engine repository's commit `273223d9` gave them
(beads abscls-jk1c). No release has them yet:

- The site's module, release `engine-d6786eba`, answers protocol 0.6.1. It ignores `includeWeakWalls`: its reply has
  no `weakWalls`, and `query_version`'s `trained` does not list them. This repository checked it in Node, with
  HedgeFund 0.2 Lite.
- Both of the release's networks carry the heads (the engine repository's
  games/enclosure/docs/decisions/inputs-and-targets.md, "The weak walls and the future nodes"). So the networks can
  stay as they are. Only the module must change.
- A candidate from the engine repository's commit `354ae04c` (not published, in WSL's
  `v2scratch/2026-11-04-abscls-zdbf/release/enclosure-engine-354ae04c/`) answers 0.6.2. Its search is `fdfe5ad`, the
  same as `engine-d6786eba`'s, so the stored reviews keep their results.

## Why

- **The weak walls' prototype** (beads abscls-udwl, design 30, "The weak walls") asks the CPU module for them. With
  the released module, the board says "Weak walls: not in this engine". So the preview of a push to `dev` shows no
  walls, and the prototype shows them only in a local build with the candidate module.
- **The search stays the same.** The release can name `search` `fdfe5ad` (request 17), so the site's stored results
  stay valid.

## Done when

- A release of the releases repository has a CPU module that answers 0.6.2 or later, with the search `fdfe5ad` or a
  search that the site's lock can name as the same (`sameSearchAs`).
- The site's lock takes it, and the weak walls show on the preview of `dev` (the CPU workers' replies have
  `weakWalls`).

## The answer

The release `engine-c43233eb` of `enclosure-engine` (the engine repository's games/enclosure/docs/decisions/build.md,
"Release engine-c43233eb", engines `a4f60627`). Its CPU and GPU modules answer protocol 0.6.2, at build c43233eb,
with the search `fdfe5ad` of `engine-d6786eba`. With each of the four networks, the new modules give the same replies
as those of `engine-d6786eba`. The CPU module gives the weak walls with each network, and the GPU module refuses the
field. The networks, their graphs and `NOTICES.txt` have the bytes of `engine-d6786eba`, and `LICENSE.txt` has the
bytes of `engine-d6786eba-terms2`.

**Checked here:**

- The lock takes the release's five modules and four scripts, with the release manifest's SHA-256 and sizes. The CPU
  module's `sameSearchAs` adds the module of `engine-d6786eba`. The other entries stay as they are: the release holds
  their files with the same bytes.
- The engine step fetched every file with the lock's SHA-256, and the CPU module answered protocol 0.6.2 and the
  search `fdfe5ad`.
- In headless Chromium on the CPU, the review fixture, a review by the module of `engine-d6786eba`, opened with its
  results and no review snapshot. After 40 edges its weak walls showed four rings. The layout test's case "layout of
  the weak walls" needs the rings on the review and on the Analysis board.
- The engine log, [decisions/engine.md](../decisions/engine.md), "The release c43233eb", has the details.
