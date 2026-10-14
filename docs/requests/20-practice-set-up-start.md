# The practice bot from a set-up start

**Status:** done: `enclosure-set-position`, practice bot interface 0.1.1, release `wasm-v2-engine-85f1792`, checked
here, and Practice takes set-up starts. **Asked:** 2026-10-14.

## What

A GTP command that gives the practice bot a set-up start: a position in the position notation, as the analysis
module's `position` field takes it (design 04). Then `play`, `genmove` and `undo` work from that start, as they do
from the standard start after `clear_board`. The command's name and form are the engine repository's choice, for
example `enclosure-set-position POSITION`.

Hedge School also asks:

1. **`undo` back to the set-up start, and no further.**
2. **The early temperature by the game's edge count,** as the analysis module counts a position's turn from its edge
   count (protocol 0.2): a start at edge 60 is not at the game's start.
3. **An error for a position that could not occur in a game,** as the analysis module's `check` answers it (request
   16), in GTP's form: `? ...`.

## Why

- **Practice from a position** (Hedge School's design 24, item 4): the Analysis board's "Play HedgeFund from here"
  starts a practice game at the position on screen, as Lichess's "Continue from here" plays the computer from a
  position. A board from the board editor, or from an imported record with a `Position` tag, has a set-up start. The
  link works now only from the standard start, as `play` replays the moves on screen.
- **The bot has no command for it now** (release `wasm-v2-engine-54486cd`, the engine repository's v2 design 22: its
  commands are `clear_board`, `komi`, `play`, `genmove` and `undo`). Tried in Node with the one-thread module:
  - `set_position` is KataGo's own, for Go: it answers `? Expected a space-separated sequence of <COLOR> <VERTEX>
    pairs`.
  - `loadsgf x` (a file that does not exist) stops the module with `RuntimeError: unreachable`. In a page, the
    worker is then lost. Hedge School does not send `loadsgf`. This note is only for the engine repository.

## Done when

- The engine repository's v2 design 22 documents the command, and a release has it in both practice modules.
- Hedge School then checks, from set-up starts of the board editor and of the archive's positions, that each of the
  bot's moves is legal by the analysis module's `describe`, and that `undo` returns to the start. Practice then takes
  `#position=` and set-up records, and the Analysis board's link works from any start.

## Delivered

The engine repository's commit `85f1792` (its v2 design 22, interface 0.1.1), in release `wasm-v2-engine-85f1792`, in
both practice modules:

- **`enclosure-set-position POSITION`:** a new game from a position in the position notation, as `clear_board`
  starts one from the standard start. Then `play`, `genmove` and `undo` work from it.
- **`undo` stops at the start.** The early phase of the move temperature counts the start's edges. The start has no
  history: the network sees no earlier turns until the game has moves from the start.
- **A position that no game reaches** is refused with the position check's first reason (`? ...`). A finished game is
  taken, and `genmove` then refuses.
- **Only design 22's commands:** the module refuses every other command with `? unknown command`, and `kata-set-param`
  takes only `maxVisits` and the chosen move's settings, in range. Release 54486cd stopped on a command whose
  handler throws (`loadsgf` among them).
- **The same search as 54486cd:** the analysis modules keep protocol 0.6.1 and the search `fdfe5ad`, with new bytes
  from the engine's simplify pass. The networks, the graphs, `NOTICES.txt` and `LICENSE.txt` are the same bytes.

**Checked here** (`scripts/measure/practice-start-check.mjs`, the one-thread bot in Node, 16 visits, 8 moves from
each start), on 40 of the meaf.us archive's games:

- 128 starts: 88 from the archive's positions (40 of them at a turn's second edge, 3 at a finished game's end), and
  40 of the board editor's kind (a game's edges at edge count 0, which no game reaches). The bot took a start exactly
  when the analysis module's position check found it reachable (0 differences), and refused the others with `?`.
- Each of the bot's 673 moves from a start was legal by the analysis module's `describe`. `undo` went back to the
  start after each game, and one more `undo` was refused every time. A move after the undos was legal from the start.
  At the 3 finished games' ends, `genmove` was refused.
- The home page's game (`scripts/home-board.mjs`, seed 7, 64 visits) came out the same in 85f1792 as in 54486cd: 100
  moves of 100, from the standard start.
- In Edge on the local build: the Analysis board's Play from a set-up start with 2 edges on screen, a game against the
  bot from there, a takeback that stopped at the record's edges, a resumed game, a resignation, and the game opened
  on the Analysis board from Practice and from Your games.
- Not checked: the early temperature from a start (the move's spread is not visible in one game), and the threaded
  module from a set-up start in Node (the engine repository's `test_practice_module` ran both).
