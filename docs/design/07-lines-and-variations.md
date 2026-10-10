# The engine's lines and the player's variations

**Status:** in force. Built: the line on the board, the line listed under the table, and branches played from it,
shown in the move list and kept in the browser. Not yet built: the player's own moves, and the keys for forks (↑, ↓,
Shift). **Decided:** 2026-10-10, from KaTrain's and Lizzie's lines on the board, Lichess's lines, variations and keys,
and Go's way of showing a variation without notation.

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
  Lichess lists one line by default (`ceval.multipv`, 1, up to 5 in its settings), and keeps a game's analysis tree,
  the player's variations with it, in the browser (`ui/analyse/src/idbTree.ts`, the IndexedDB store `analyse-state`).
- **Go tools** (KaTrain, Sabaki, Lizzie) show a variation without notation: numbered stones on the board, and the
  game tree as circles.
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
   - **One edge at a time** by default ("Animated" in the display settings, KaTrain's way): the first edge, then one more
     every half second, and the line stays drawn at its end. Pointing at the listed line's last edge shows the whole
     line at once. The menu offers "Static" (all at once) instead. With reduced motion asked for, the line is drawn
     all at once.
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
2. **One line is listed under the candidates table** (Lichess lists one by default): the line of the candidate
   pointed at, or else of the selected candidate, number 1 or the row last clicked (a click on a candidate on the
   board selects it too). So the pointer can go from a row to its line. The list shows the trusted line, not only its
   first 6 edges. Pointing at an edge of the list draws the line up to it on the board, all at once. A click plays
   the line up to it as a branch and goes there (Lichess's `playUciList`). Where the line is the game's own
   continuation, the click goes along the game. The list's edges that are already in the tree, the game's own or a
   branch's, show as hollow circles (in text, dotted underlines), with "played in the game" or "in a branch" in their
   tooltip, so that the player sees where a click's branch will start.
3. **A player's own moves are always on in the Analysis** (Lichess's way, not a separate mode): at any position, one
   of the mover's nodes, then a marked end (the puzzles' edge input on the engine's rules). A move that differs from
   the game's makes a branch, and the new position is searched. Not yet built. A click on a candidate pins it (item 9),
   so how a candidate is played from the board is still to decide.
4. **The game is a tree, as Lichess's analysis tree.** A place is a path of moves from the start. A node's children are
   the game's next move, then its branches in the order they were added. A branch's positions come from the engine's
   rules, and each is searched, as the game's are, when the player looks at it. ← and → go along the line on screen
   (back to the parent, on to the first child), Home to the start, and End to the line's end. The keys for forks are
   to come with the player's own moves.
5. **Branches show in the move list** under the turn where they start, after its comments (Lichess's column view):
   each on its own row, indented, with a rule on its left, and every turn with its number ("19..." for a row that
   starts at a turn's second edge). Where a branch forks again, its row ends at the fork, and every line from the fork
   follows one step further in, the first line too, so that the lines from a fork stand side by side (Lichess's way
   inside a variation).
6. **Without notation by default** (Go's way): a branch's edges are dots in the mover's colour, after their turn's
   number. The turn numbers place the edges, so the dots carry no numbers: numbers of their own would read as a second,
   unrelated count beside the turns. The listed line's edges are circles numbered as the board numbers the line. A
   dot's or circle's tooltip names its turn and edge. The display settings call this "Dots and numbers", and offer
   "Text notation" (the record's, with the cut mark) instead. The digits in the circles and the rank badges are centred on their own height
   (`text-box: trim-both cap alphabetic`).
7. **A game's branches are kept in this browser** (Lichess's way), under the game's id, and come back when the game is
   opened again. A branch's analyses are in the analysis cache, which is keyed by the moves.
8. **The candidates' ranks are rounded squares,** on the board, in the table and before the listed line, and the
   line's numbers are circles (Go's numbered stones), so a rank is never read as a line's number. While a line shows,
   the other candidates still leave the board.
9. **A click on a candidate pins it,** on the board or in the table: the list shows its line, and the board keeps its
   line, still drawing, when the pointer leaves. A second click unpins it. The pinned row has an accent bar on its left.

## Why

- **The board is where the line is read.** A line's edges matter by where they go: which region they close, which
  edge they cut. Text names the edges but leaves the player to find them on the board.
- **One edge at a time shows the order.** A line can jump from one side of the board to the other, and the numbers
  alone make the reader search for the next one. The list's last edge shows the whole line for a player who has seen
  the order.
- **The cuts and the regions keep the line honest.** In the first test, a line of 6 edges cut 3 of the opponent's
  edges (the sample game after edge 30). Drawn over the board as it was, the line crossed edges that would be gone.
- **Two shapes for two kinds of number.** With the listed line, a candidate's rank and a line's numbers show side by
  side under the table, and in circles both read as a line. Hiding the other candidates was not enough.
- **A click pins, and does not jump.** A click that drew the whole line at once did two things. Pinning keeps the
  line the player chose on the board while the pointer goes to the list or the move list.
- **Lines from barely searched candidates mislead.** A candidate with a handful of visits has a line from a handful
  of visits, and the end of any line can rest on a visit or two. KaTrain and Lizzie draw the whole line and do not ask
  for its visits. The site cuts it, with the count that KaTrain uses for an uncertain candidate. The visits through a
  move can grow along a line (graph search), so a line stops at its first thin edge, not where the visits sum up.
- **Always-on moves and inline branches** are the analysis board's common way (Lichess), and need no step to start.
- **One listed line** keeps the move list's room. The table already lists every candidate, so the list shows the line
  of the one the player picks.
- **Circles, not notation:** an edge's name is two points to find on a 19 × 19 board. Go tools leave notation out of
  their variations for a board of that size. Numbers that match the board's line badges are read on the board itself.

## Alternatives

- **Text lines only** (Lichess's lines): the board keeps the candidates, and the player reads the line from text.
- **All at once by default:** simpler, but the order of a scattered line is hard to follow.
- **Numbers on the new point** (Go's numbered stones): different from the candidates' badges by place, but an edge
  that joins two nodes has no new point.
- **A different shape for the line's numbers** (rounded squares): the line's numbers then differ from Go's numbered
  stones, and from the list's circles.
- **Numbered circles in the move list's branches:** they match the board's line, but beside the turn numbers they
  are a second count, and a branch's numbers do not say where it leaves its branch.
- **A fork's first line going on in its branch's row** (Lichess's column view, for the game's own line): the first
  line then reads as the branch, and the others as set apart from it.
- **A search when pointing at a weak candidate:** a line for every candidate, but the machine works while the player
  only looks, and the line comes late.
- **The thin edges drawn faint** (KaTrain's way for its uncertain candidates): more to see, but faint edges still draw
  the eye and invite a reading.
- **A share of the candidate's visits** as the line's threshold: it scales with the search, but no published tool uses
  one.
- **A separate Explore mode** (chess.com): a stray click never changes the line, but there is a step to start.
- **A tree beside the move list** (Sabaki, KaTrain): clear for many branches, but it takes space the analysis column
  lacks, and it is a large piece of work.
- **One listed line for each candidate on the board** (Lichess with more lines on): every line at once, but 2 to 8
  rows taken from the move list.
- **Plain dots by turn** for a branch without notation (KaTrain's and Sabaki's tree nodes in a row): quieter, but the
  list's dots and the board's numbered line no longer match.
- **Branches for the visit only:** simpler, but the work on a variation is lost when the tab closes.

## Consequences

- The analyses keep each candidate's line and the visits through each of its edges (the cache's shape version 4).
  Every search asks for them (`includePVVisits`).
- The review has a worker for the rules alone (`EnginePool.rules`): a line's positions and a player's moves need the
  rules at once, and a search worker takes one request at a time.
- A position in a branch needs its own analysis. Protocol 0.3 gives the network no moves from before the root, so a
  position gets the same analysis however it was reached.
- The browser's store has a third store, `branches` (its version 3): a game's lines from the start, each to a
  branch's end, under the game's id (`gameId`, the SHA-256 of its moves).
- A branch's edges have no labels yet, and the Highlights and the Advantage chart are the game's alone. In a branch,
  the chart marks the position where the branch leaves the game.

## Where it is

- `src/lib/board/Board.svelte`: the line as far as drawn (`line`), its cuts and regions, the hidden candidates.
- `src/lib/review/ReviewView.svelte`: the place in the tree (`path`), the line of the candidate pointed at, its
  animation, the click that shows it whole, the players' areas, the listed line (`lineList`), the branches in the
  move list (`branch`), and the keys.
- `src/lib/review/tree.ts`: paths, the game's line, a branch's rows, and the lines kept (tests in `tree.test.ts`).
- `src/lib/analysis/game.svelte.ts`: `lineSteps` (the line's positions from the rules), `toAnalysis` (the line),
  `branches`, `addLine` and `loadBranches` (the branches and their keeping), and the searches on any path.
- `src/lib/review/model.ts`: `lineMovers`, `enoughVisits`, `trustedLine` (the 25-visit cut, with its tests in
  `model.test.ts`), `LineStep`.
- `src/lib/review/display.ts`: the "one edge at a time" setting, and `branchText` (circles or notation).
- `src/lib/storage/db.ts`: the `branches` store.

## Log entries

- [decisions/product.md](../decisions/product.md), "The engine's line on the board", "The engine's line: where it
  stops" and "The engine's line listed, and branches".
