# The practice bot from a set-up start

**Status:** open. **Asked:** 2026-10-14.

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
