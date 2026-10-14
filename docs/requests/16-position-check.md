# A position's check: whether it could occur in a game

**Status:** done (below, "Delivered"). The site runs the release, and the check is checked with the board editor.
**Delivered:** 2026-10-14.

## What Hedge School builds

The Analysis board (Hedge School's design 21) gets a board editor, as Lichess's analysis board has one. The editor sets
the five fields of a position (the engine repository's design 04): each player's edges, the protected and placed
edges, the mover and the edges left in its turn, both scores, and the edge count. A record carries such a start in
its `[Position "…"]` tag, and the board searches from it.

## The problem

The engine reads a position (`parse_position` in `katago/cpp/game/enclosure/notation.h`) and checks its form: five
fields, no edge twice, the marks on the right side, at most two protected and two placed edges, the scores, and an
edge count from 0 to 120. It does not check that the board could occur in a game. An editor can make a board that no
game reaches, for example:

- A Blue edge that crosses or touches a Red edge, though a move that does so cuts the other edge, or is illegal.
- A mover or edges left that do not follow from the edge count (Blue's first turn has one edge, the next turns two,
  the last turn one).
- Protected edges that the opponent's last turn could not have placed.
- An edge count smaller than the edges on the board.

The engine would search such a board, and its numbers would mean nothing. The rules are the engine repository's, so
Hedge School does not check them itself.

## What is needed

1. **A check,** in the engine protocol: for a position, whether it could occur in a game of the site's rules, and if
   not, each reason in words that a player reads, with the edges that it names. As an action of its own, or as a field
   of `describe`'s reply: the engine repository's choice.
2. **The rules decide** what "could occur" means. Hedge School asks only for what a game makes certain. A board that
   a game reaches only in a rare way still passes.
3. **The editor's edges:** which edges the editor can place for a player, if the rules restrict an edge's shape or
   reach apart from the board (the engine's `parse_edge` refuses some).
4. **In the next release** of the analysis module, as request 03's releases, with the protocol's version raised.

## How to check

- The positions of the archive's games all pass.
- Each example above fails, with its reason.
- A query that analyses a position that fails gets an error with the reason, as a finished game does today
  (`{"error": "the game is over", "field": "position"}`).

## Delivered

Engine protocol 0.5, in the release `wasm-v2-engine-27a7414`
([enclosure-engine](https://github.com/seankao31/enclosure-engine/releases/tag/wasm-v2-engine-27a7414)). Both modules
are new. The other files, the networks and their graphs among them, are the same bytes as in `wasm-v2-engine-fdfe5ad`.

- **The check:** `describe` gives `"check": {"possible", "reasons": [{"code", "text", "edges"}]}` for its `position`.
  The check reads the position before its moves, and the moves are checked as legal moves. `text` is for a player to
  read. `edges` names the edges in the notation.
- **An analysis of a position that fails** gets `{"error", "field": "position", "reasons"}`, with the first reason's
  text as the error, as a finished game does. `describe` and `play` work on any position, so the editor can show a
  board while the player makes it.
- **What "could occur" means:** only what every game makes certain. A rare board (timeouts, start edges that a cut
  removed) passes. The edge count fixes the mover and the edges left in its turn: a pass forfeits the rest of its
  turn, and the forfeited edges count. The archive's 2,527 games with passes all follow this rule.
- **The reasons' codes:**
  - `turn`, `start`, `edge-count`;
  - `cross`: a Blue edge crosses or touches a Red edge;
  - `node-inside`: a player's node inside its own edge;
  - `placed`, `placed-joined`, `protected`, `protected-joined`;
  - `score-negative`;
  - `score-high`: more than 324 for each turn end;
  - `score-low`: less than the area enclosed at the last turn end.
- **The editor's edges:** any edge between two different points at most 3 apart in each direction (48 directions).
  The check then names what no game reaches.
- **The engine repository's checks:** all 606,515 positions of the archive's 7,138 games pass. Each example of this
  request fails with its reason.

**Checked here:** the site runs `wasm-v2-engine-27a7414` (decisions/engine.md, "The release 27a7414"). The check
itself is checked with the board editor, which is its first use.
