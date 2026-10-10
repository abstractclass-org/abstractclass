# The engine's lines and the player's variations

**Status:** in force. The line on the board is built. The variations are decided and not yet built. **Decided:**
2026-10-10, from KaTrain's and Lizzie's lines on the board and Lichess's variations and keys.

## Context

The review showed the engine's candidates for a position with their values, but not why a candidate is good or why
the game's edge was bad. The answer is in the moves that follow: the engine's expected line (KataGo's `pv`, in every
analysis reply) and the player's own tries.

The tools that the site follows:

- **KaTrain and Lizzie** (Go): point at a candidate on the board, and its line appears on the board as numbered
  stones. KaTrain draws them one move at a time (`set_animating_pv`, `katrain/gui/badukpan.py`, with an option to
  turn it off).
- **Lichess** (chess): the engine's lines as text under the engine's header. Pointing at a move shows a small board at
  that move, and clicking it plays the line up to there into the analysis as a branch (`renderPvs`,
  `ui/lib/src/ceval/view/main.ts`). A move made on the board that differs from the game's makes a branch, shown in
  brackets under the move in the move list. Keys (`ui/analyse/src/keyboard.ts`): ← and → along the line, ↑ and ↓ to
  choose a branch at a fork (else the first and the last move), Shift + ← and → to the previous and the next fork.
- **chess.com** has an "Explore" mode in its Game Review: free play, left by a button.

Enclosure differs from Go in one way that matters here: an edge can cut the opponent's edges, and a line's edges can
cut edges that are on the board, so a line drawn over the board can show edges that the line itself removes.

## Decision

1. **The engine's line is drawn on the board** while the pointer is on a candidate, on the board or in the candidates
   table (KaTrain's and Lizzie's way):
   - Its first 6 edges (three turns), dashed in each mover's colour, each with a number in a circle of the mover's
     colour. The candidate is 1.
   - The board shows what the line does: the edges it cuts leave the board and are drawn cut (faded, dashed, with ×,
     as the last edge's cut is), and the regions are the ones after the line's last drawn edge. The engine's rules
     give both (`describe` of each position along the line).
   - **One edge at a time** by default ("Animated" in the display menu, KaTrain's way): the first edge, then one more
     every half second, and the line stays drawn at its end. A click on the candidate or on its table row shows the
     whole line at once. The menu offers "Static" (all at once) instead. With reduced motion asked for, the line is
     drawn all at once.
   - The players' tags above the board show the area after the line's last drawn edge, in the accent colour (design
     06), so the area that a line closes or opens shows as the line is drawn.
   - While a line shows, the other candidates leave the board, so that its only numbers are the line's. The table
     keeps the candidates' ranks.
   - A line is shown only for a candidate with enough visits: the engine's first choice, or 15% of the most visited
     candidate's visits (the board's own rule, KataGo's `minVisitPropForLCB`).
   - **A line stops where its search thins out:** before its first edge with fewer than 25 visits through it (KataGo's
     `pvEdgeVisits`, asked for with `includePVVisits`, [request 05](../requests/05-pv-visits.md)). 25 is KaTrain's
     `low_visits`: below it, KaTrain draws a candidate small and faint, without its numbers. A line needs one edge after
     the candidate. Another candidate's table row says that it has too few visits for a line.
   - **The line grows with the search.** While the position is searched, a line can lengthen or change. The edges
     already drawn stay, and the drawing goes on from there. The regions and areas of the shared edges stay until the
     rules give those of the new edges.
2. **A player's own moves are always on in the Analysis** (Lichess's way, not a separate mode): at any position, one
   of the mover's nodes, then a marked end (the puzzles' edge input on the engine's rules). A move that differs from
   the game's makes a branch, and the new position is searched. A click on a candidate whose line is shown in full is
   to play it.
3. **Branches show inline in the move list** (Lichess's way): a branch in brackets on its own indented row under the
   turn where it starts, the game going on after it, a branch inside a branch indented further. **Lichess's keys.**

## Why

- **The board is where the line is read.** A line's edges matter by where they go: which region they close, which
  edge they cut. Text names the edges but leaves the player to find them on the board.
- **One edge at a time shows the order.** A line can jump from one side of the board to the other, and the numbers
  alone make the reader search for the next one. The click shows the whole line for a player who has seen the order.
- **The cuts and the regions keep the line honest.** In the first test, a line of 6 edges cut 3 of the opponent's
  edges (the sample game after edge 30). Drawn over the board as it was, the line crossed edges that would be gone.
- **Hiding the other candidates** keeps one set of numbers on the board at a time, without a second shape to learn.
- **Lines from barely searched candidates mislead.** A candidate with a handful of visits has a line from a handful
  of visits, and the end of any line can rest on a visit or two. KaTrain and Lizzie draw the whole line and do not ask
  for its visits. The site cuts it, with the count that KaTrain uses for an uncertain candidate. The visits through a
  move can grow along a line (graph search), so a line stops at its first thin edge, not where the visits sum up.
- **Always-on moves and inline branches** are the analysis board's common way (Lichess), and need no step to start.

## Alternatives

- **Text lines only** (Lichess's lines): the board keeps the candidates, and the player reads the line from text.
- **All at once by default:** simpler, but the order of a scattered line is hard to follow.
- **Numbers on the new point** (Go's numbered stones): different from the candidates' badges by place, but an edge
  that joins two nodes has no new point.
- **A different shape for the line's numbers** (rounded squares): a second shape to learn.
- **A search when pointing at a weak candidate:** a line for every candidate, but the machine works while the player
  only looks, and the line comes late.
- **The thin edges drawn faint** (KaTrain's way for its uncertain candidates): more to see, but faint edges still draw
  the eye and invite a reading.
- **A share of the candidate's visits** as the line's threshold: it scales with the search, but no published tool uses
  one.
- **A separate Explore mode** (chess.com): a stray click never changes the line, but there is a step to start.
- **A tree beside the move list** (Sabaki): clear for many branches, but it takes space the analysis column lacks.

## Consequences

- The analyses keep each candidate's line and the visits through each of its edges (the cache's shape version 4).
  Every search asks for them (`includePVVisits`).
- The review has a worker for the rules alone (`EnginePool.rules`): a line's positions and a player's moves need the
  rules at once, and a search worker takes one request at a time.
- A position in a branch needs its own analysis. Protocol 0.3 gives the network no moves from before the root, so a
  position gets the same analysis however it was reached.

## Where it is

- `src/lib/board/Board.svelte`: the line as far as drawn (`line`), its cuts and regions, the hidden candidates.
- `src/lib/review/ReviewView.svelte`: the line of the candidate pointed at, its animation, the click that shows it
  whole, and the players' areas.
- `src/lib/analysis/game.svelte.ts`: `lineSteps` (the line's positions from the rules), `toAnalysis` (the line).
- `src/lib/review/model.ts`: `lineMovers`, `enoughVisits`, `trustedLine` (the 25-visit cut, with its tests in
  `model.test.ts`), `LineStep`.
- `src/lib/review/display.ts`: the "one edge at a time" setting.

## Log entries

- [decisions/product.md](../decisions/product.md), "The engine's line on the board" and "The engine's line: where it
  stops".
