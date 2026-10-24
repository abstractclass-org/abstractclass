# Blueprints' engine in the browser, before the trained network

**Status:** open. **Asked:** 2026-10-25.

## What

Drawing Board, Blueprints' site (design 33), needs a browser build of Blueprints' engine, as Hedge School has
Enclosure's (requests 02, 03, 15, 18):

1. **Early, with any network.** The rules first: a build with a test network (a random one, or the run's first
   checkpoint) lets the site replay games, draw their positions and take a player's moves while the network trains. A
   later release changes only the network.
2. **The site's moves, whole.** Every move that the engine takes or gives is a string of strategyjam.org: a placement
   `K@q,r` in the board's own coordinates (not the view's), an edit `I:q,r>J:q,r` as one move, and `pass`. This
   holds for the moves sent, the legal moves, the candidates and the moves of a line. The pick and the drop, and the
   view's coordinates, stay inside the engine. How the engine gives an edit's values (a pick's node with its best
   drop, for example) is the engine repository's choice. Please document it.
3. **Every move of the site's games.** A placement with a cell outside the engine's view still plays, and the engine
   describes the positions after it (`place_at_site` in the port). Such a move is never among the candidates. A reply
   should say which of the moves sent were outside the view, if that is free.
4. **The protocol of Enclosure's site build** (0.6.1), so that the shared engine package (`packages/engine`) needs no
   change: `describe`, `describe_game` and the analysis. `describe`'s fields are the game's own. The board needs:
   - the cells: each hex with its owner and its kind (plain, star, wall), in the board's coordinates;
   - each player's three blueprints, in their own frames (the first cell at 0,0), and the scores;
   - the mover, the moves left in the turn, the move count, and the outcome;
   - for `describe` alone, the legal moves. For each move of `describe_game`, the hexes that it stamped, the cells
     that it removed and the points that it scored, as Enclosure's reply gives each move's cut. The marks `x` and
     `x+N` (design 33) come from these.
5. **The ownership** of each hex of the view, with the view's place in the board's coordinates, if the build gives it
   as Enclosure's does (for the area map, design 30).
6. **The engine's name:** Stamp Duty, in the manifest's `displayName`, with a name for each released network, as
   request 12 gave HedgeFund's.
7. **A release** in a public release repository with its manifest, as request 03 gave Enclosure's, and the
   network's terms, as requests 14 and 21 gave them.

## Why

- **The site holds no copy of the rules** (this repository's CLAUDE.md). Without the engine, it cannot replay a
  record: the board, the scores and the end of the game come from the rules.
- **The review takes a turn of one move or two** (design 29). The port plays an edit as two actions, so a turn of two
  edits would be four. The site's moves are what the players, the records and the game page use.
- **The board is unbounded.** A placement named from the view changes its meaning when the view moves, so a stored
  analysis or a record must name hexes in the board's coordinates.
- **The rules are ready.** The port matches the site's rules module on the site's games (the engine repository's
  `games/blueprints/docs/decisions/port.md`), and only the network waits for its training.

## Done when

- The engine repository's documents give the build's protocol for Blueprints: its moves, `describe`'s fields, the
  marks' data, and how an edit's values are given.
- A build with a test network is in a release or on this machine, with its manifest.
- Drawing Board then checks, on the archive's games, that the engine accepts every move played, and that each game
  ends with the winner of strategyjam.org's record.
