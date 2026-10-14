# Practice games against HedgeFund: the GTP bot in the browser

**Status:** done: the practice bot in release `wasm-v2-engine-51fbe9d`, and in `wasm-v2-engine-54486cd` with
request 18 (the engine repository's v2 design 22). Not built here yet.

## What Hedge School builds

Hedge School adds **Practice:** a game against HedgeFund in the player's browser.

- **No server.** The bot runs in the player's browser, as the review's engine does (Hedge School's design 19: static
  files and the browser first). This departs from Lichess: its games against the computer run on its servers, as
  fishnet's `move` work, with a level from 1 to 8.
- **No clock.** The bot searches to a set number of visits, not for a set time. So a setting plays at the same
  strength on every machine, and a slow machine only waits longer.
- **The player sets the bot:** the network (one of the two released), the visits for each move, and the move
  temperature. Levels come later, from the results of games by setting.
- **During the game:** takebacks, and no evaluation. At the end, the player can review the game. This is Lichess's
  way for a game against the computer.
- **Later:** komi, and the handicaps of the engine repository's design 05 (extra edges, starting structures).

## Why the analysis module does not serve

The site's module is the analysis engine with `analysis_enclosure.cfg`. A move from it (`chooseMove`) is not
HedgeFund's play:

- **The settings are the analysis settings.** Root noise is on (`wideRootNoise = 0.04`), and the network sees no
  moves before the root (`ignorePreRootHistory = true`). A query cannot change either: `overrideSettings` refuses
  both.
- **Each query builds a new tree.** The GTP engine keeps its tree from move to move. The engine repository measured
  this on its GTP bot (b15c192, one thread): the second edge of a turn, searched from the first edge's subtree, reaches
  1.7 to 2 times the first edge's root visits.

The engine repository decided this for its bots already (its v2 design 18, "Bots play through KataGo's GTP
engine"): play goes through the GTP engine with `gtp_enclosure.cfg`, and "the WebAssembly bot is next". Its
Constellation bot (`v2/wasm/bot.cpp`) is that bot for another site.

## What is needed

1. **HedgeFund's play in the browser:** KataGo's GTP engine with `gtp_enclosure.cfg`, and the tree kept from move to
   move, as the Constellation bot does.
   - **The interface is the engine repository's choice.** Two ways exist:
     - **GTP commands** (`clear_board`, `play`, `genmove`, `undo`, `komi`), one at a time, as the Constellation bot
       runs them inside. Hedge School leans to this way: it is KataGo's play interface, and the bot then plays as the
       native GTP bot plays.
     - **The engine protocol, with what play needs added,** as the engine repository advised on 2026-10-11 (one
       protocol for the site, with GTP's parts added to it).
   - Hedge School takes the engine repository's advice on this.
2. **In the site's release:** the same release as the analysis module (request 03), with its manifest.
   - **The networks are separate files** that the page loads, as the analysis module loads them. The Constellation
     bot embeds one network. The site ships two, and the player chooses one.
   - **Moves are in the site's notation** (the engine repository's design 04), not in Constellation's move IDs.
3. **A move limited by visits, not by time.** The page gives the visits for each move, and no time limit. The
   Constellation bot stops at its move time, even with `limits.visits`.
4. **The settings that the page gives for a game:** the network, the visits for each move, the move temperature (the
   chosen-move settings that the protocol already takes), and a seed. Later: komi (a query input today), and the
   handicaps of design 05. Leave room for them in the interface.
5. **Takebacks:** undo the last turn (GTP's `undo`), or start again from the game's moves.
6. **No resignation:** the player practises to the end. `gtp_enclosure.cfg` already sets
   `allowResignation = false`.
7. **The GPU, and more than one worker, for one search.** A bot move is one search.
   - **The GPU module** (request 06, Hedge School's design 15) gains only from batches. Today it batches across
     searches, as in a review's label pass. One search needs its own batches: several leaves evaluated together, as
     KataGo's search threads give. Hedge School's answer to request 06 put this later. Practice needs it.
   - **The CPU:** one search runs on one worker, and the site has several.
   - **A constraint:** WebAssembly threads need a cross-origin isolated page (the COOP and COEP headers). The site
     loads ONNX Runtime's files and Google's tag. Hedge School will check what isolation changes on its side, if the
     engine repository's way needs it.
8. **The reply names the build, the network and the play settings,** so that the game's record can name its
   opponent.
9. **A version,** as the engine protocol has, with the same rule: an addition does not break a client.

**Also useful:** the results of the visit ladder of the WebAssembly bot (the league `runs/v2-wasm-visits`, each budget
against twice its budget). They would give each visit setting a line of help, and a start for levels.

## A game across a release

A game has no clock, so it can last days, and a release can come in the middle of it. Hedge School keeps the game's
moves.

- **The question:** can a bot of a new build continue a game from its moves alone, with nothing else carried across?
  The Constellation bot seems to do this: when a request does not extend its game, it starts a new board and plays
  every move.
- **Lichess:** each fishnet `move` job carries the game's moves, so a game is not tied to one worker or one build.
- **Hedge School's plan:** continue such a game with the new build, and write the change in the game's record. If
  something does not carry across, the plan changes.

## How to check

- **The bot plays as the native GTP bot plays,** at the same settings: a match at equal visits, as the gate in v2
  design 18.
- **Its replies name** the build, the network and the settings.
- **Speed in a real browser:** a move at 64, 256 and 1,024 visits, with each network, on CPU workers and on the GPU
  module, on a desktop and on a phone.
- **A game continues from its moves** on another build.

## Delivered

The engine repository's v2 design 22, in release `wasm-v2-engine-51fbe9d` with engine protocol 0.6, and in
`wasm-v2-engine-54486cd` (protocol 0.6.1) with request 18. Take `54486cd` for both. The analysis modules' search is
still `fdfe5ad`, so stored reviews stay valid.

- **The interface: GTP commands, one at a time.** Moves are in the site's notation, the colours `b` (Blue) and `w`
  (Red). A takeback of a turn is two `undo`s.
  - `enclosure-start SEED [THREADS]` after the network is written: the seed of the search and of the symmetries, and
    the search threads (the threaded module only).
  - `play`, `genmove`, `undo`, `clear_board`. `kata-set-param maxVisits N` (256 until set), `kata-set-param
    chosenMoveTemperature T` (and `chosenMoveTemperatureEarly`, `chosenMoveTemperatureHalflife`), and `komi K` for
    later. Other KataGo commands pass through, and their replies keep KataGo's move strings.
  - `enclosure-bot-info`: one JSON line with the interface's version (`0.1`, versioned as the protocol is), the
    build, the network (name, SHA-256, bytes) and the settings in force. It goes in the game's record.
  - The play settings are `gtp_enclosure.cfg`: no clock (each `genmove` searches to `maxVisits`), resignation off,
    and the tree kept from move to move.
- **The files** (the same manifest): `enclosure-bot.wasm` (one search thread, the network in the module, no JSPI),
  `enclosure-bot-batched.wasm` (several search threads in one instance through JSPI, their positions evaluated as one
  batch outside the module), `enclosure-eval.wasm` (the network alone, one in each CPU worker), and `practice_bot.mjs`,
  `cpu_evaluator.mjs` and `cpu_eval_worker.mjs` (they import `gpu_engine.mjs`).
  - One thread: `createPracticeBot(module)`, `setModel(bytes)`, then `command(line)`.
  - CPU workers: `createCpuEvaluator(evalModule, modelBytes, {workers, maxRows: threads, makeWorker})`, then
    `createBatchedPracticeBot(module, evaluator, {maxBatch: threads})` and `enclosure-start SEED THREADS`.
  - The GPU: `createOrtEvaluator(ort, graphBytes, {executionProviders: ["webgpu"]})` of `gpu_engine.mjs`, with the
    network's `.onnx` graph, in the place of the CPU evaluator.
  - No cross-origin isolation, and no shared memory.
- **Checked there:**
  - Matches against the native GTP bot at equal settings, in pairs from random openings: 23 of 40 (one thread, 64
    visits), and 21 of 40 (4 threads on 2 CPU workers, 128 visits).
  - On 197 positions of the archive at 128 visits with 4 threads, the module and the native bot play the same move as
    often as two runs of either one (about 62%), with the same visits a search.
  - A game continues from its moves alone on another build (`clear_board`, then `play` for each edge), also after a
    takeback. Only the tree is lost.
  - `enclosure-bot-info` names the build, the network and the settings.
- **Speed in Chrome** (a desktop with an RTX 5080 and 8 cores), seconds a move from a new tree, at 64, 256 and 1,024
  visits. In a game the bot's own moves reuse part of the tree, so a move can be faster.

  | Network | One thread | 4 CPU workers, 8 threads | WebGPU, 16 threads |
  |---|---|---|---|
  | HedgeFund 0.1 | 1.9, 6.9, 23 | 1.0, 2.8, 8.4 | 0.24, 0.51, 1.5 |
  | HedgeFund 0.1 Lite | 0.83, 2.8, 9.8 | 0.26, 1.0, 3.5 | 0.18, 0.40, 1.3 |

  Phones are not measured. `v2/webgpu/run_practice.mjs` and `practice_worker.mjs` in the engine repository show the
  measurement.
- **Later:** the visit ladder on the module, for the help text and the levels.
