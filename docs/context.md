# Project context

This file gives the background that drives decisions in this repository. For what was decided and measured, see
[decisions/](decisions/README.md). For the design in force, see [design/](design/README.md).

## Goal

A website that helps people learn the board game Enclosure. It reviews their games, labels their moves, and later
offers puzzles and training. The audience is Enclosure players who want to improve, top players included. The aim is
to be the best tool of its kind. Earlier tools for Enclosure, and the sites' own interfaces, are references, not
guidelines.

## The game and the sites

- **The rules:** [`enclosure/README.md`](https://github.com/abstractclass-org/engines/blob/main/enclosure/README.md) in
  the engine repository, verified against the site's own rules code. In short: a 19 × 19 lattice, edges up to 3
  units long, 1-2-2 turns (Blue's first turn is one edge, then two edges a turn), cuts of enemy edges, edges protected
  for one opponent turn, and the enclosed area added to each player's score after every turn. The game ends after
  120 edges.
- **The online rule variant:** `tempo 1-2-2`, `validation edges-1`, `pruneMode degree-zero`, `swallowing false`,
  `startPosition central-line`, `lastMoveInvincible`
  ([`docs/context.md`](https://github.com/abstractclass-org/engines/blob/main/docs/context.md) there). The engine
  uses the same variant.
- **meaf.us** ([meaf.us/sst1](https://meaf.us/sst1/)): the practice board, online play with a clock of 60 s + 15 s a
  turn, and an archive of rated games.
- **Constellation** ([constellation.blueshrimp.uk](https://constellation.blueshrimp.uk)): a site for bots. It runs
  WebAssembly bots in a Web Worker of the player's browser (one thread, 8 MB, 5 s a move).
- **Notation:** this site uses the engine repository's own notation. Points follow GTP: column letters A-T without I,
  rows 1-19.

## The engine repository

- **Where:** [github.com/abstractclass-org/engines](https://github.com/abstractclass-org/engines), checked out
  next to this repository as `../engines`.
- **Read-only from here.** Changes there go through that repository's own sessions. When this repository needs
  something from it, write a request in [requests/](requests/README.md).
- **What this repository takes from it:** a tagged WebAssembly build of the engine and a model, as files. Never copy
  its engine or rules code.
- **Do not copy the engine's facts here.** They change as the engine trains and the protocol develops. Link to the
  engine repository's documents instead:

  | What | Where, in the engine repository |
  |---|---|
  | The notation, the protocol, and what each output means | [`docs/design/04-notation-and-protocol.md`](https://github.com/abstractclass-org/engines/blob/main/docs/design/04-notation-and-protocol.md) |
  | The engine module the site uses (`enclosure-engine.wasm`): actions, slices, memory | the same design document, "In the code" |
  | The driver for both modules (WASI imports, loading, the GPU's batches), which the site loads from the release (`src/lib/engine/library.ts`) | [`v2/wasm/gpu_engine.mjs`](https://github.com/abstractclass-org/engines/blob/main/v2/wasm/gpu_engine.mjs) |
  | The WebAssembly builds: how they are built, their speed | [`v2/wasm/README.md`](https://github.com/abstractclass-org/engines/blob/main/v2/wasm/README.md) |
  | Strength against search budget | [`v2/docs/decisions/strength.md`](https://github.com/abstractclass-org/engines/blob/main/v2/docs/decisions/strength.md) |
  | The spatial outputs (ownership and the others) | [`katago/ENCLOSURE.md`](https://github.com/abstractclass-org/engines/blob/main/katago/ENCLOSURE.md), "Spatial targets" |

  This repository records only what it measured itself (for example, speed in the browser:
  [decisions/engine.md](decisions/engine.md)) and which builds it uses (`engine.lock.json`).

## Working agreements

- **Documents** are standalone documentation in Simplified Technical English (the `/asd-ste100` skill): short
  sentences, active voice, no semicolons, no labels that exist only in a chat, dates only where the reader needs
  them.
- **Follow published methods** (Lichess, KaTrain, Maia, KataGo). Name any departure, and ask before taking it. Find
  where each constant came from before relying on it.
- **Measure speed on the real workload** (a whole game review in a real browser). Decide questions of learning quality
  by reasoning, not by short tests.
- **Design questions:** ask a few at a time, each with its background and each option's merits. Stop only at real
  decisions.
- **Commits:** stage named files only. Commit only when asked. No attribution lines.
- **Names:** do not name the owner's accounts in prose. Do not tag text with who decided it. Mention iviazovetskyi
  only where an idea came from their work, with a link to it.
- **Other people's games:** the meaf.us archive holds other players' games. Ask before any use of them that the
  public can see (puzzles, statistics by player).
