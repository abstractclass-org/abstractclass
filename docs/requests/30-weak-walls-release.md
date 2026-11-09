# A release of Enclosure's engine with the weak walls

**Status:** open (beads abscls-0rls). **Asked:** 2026-11-08.

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
