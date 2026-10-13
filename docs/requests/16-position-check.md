# A position's check: whether it could occur in a game

**Status:** drafted, not sent yet: the board editor waits.

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
