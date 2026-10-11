# The engine's lines and the player's variations

**Status:** in force, and built. **Decided:** 2026-10-10 and 2026-10-11, from KaTrain's and Lizzie's lines on the
board, Lichess's lines, variations, keys and move menu, and Go's way of showing a variation without notation.

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
  brackets under the move in the move list. Its keys (`ui/analyse/src/keyboard.ts`): ← and → go along the line. At a
  fork, ↑ and ↓ pick the line that → follows, and elsewhere they go to the first and the last move. Shift + ← and → go
  to the previous and the next fork, and Shift + ↑ and ↓ to the line beside this one. Space plays the engine's best
  move. A
  right-click on a move opens its menu (`ui/analyse/src/treeView/contextMenu.ts`): "Promote variation", "Make main
  line", "Delete from here", and copying the line's text.
  Lichess lists one line by default (`ceval.multipv`, 1, up to 5 in its settings), and keeps a game's analysis tree,
  the player's variations with it, in the browser (`ui/analyse/src/idbTree.ts`, the IndexedDB store `analyse-state`).
- **Go tools** (KaTrain, Sabaki, Lizzie) show a variation without notation: numbered stones on the board, and the
  game tree as circles.
- **chess.com** has an "Explore" mode in its Game Review: free play, left by a button. It judges the moves tried there.
- **KaTrain** analyses each move added to its tree (`analyze_fast`) and colours each node by the points it lost. A
  middle click plays the line under the pointer. Its keys (`gui/theme.py`): z and x beside ← and →, b back to the last
  branch point, n to the next mistake.
- **En Croissant** (`src/state/keybinds.ts`): x and c for the previous and the next branch, Shift + ← and → for the
  branching points, Delete to delete a move. **Sabaki** (`src/menu.js`): Ctrl + ↑ and ↓ for the previous and the
  next fork.

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
   - **One edge at a time** by default ("Animated" in the display settings, KaTrain's way): the first edge, then one
     more every half second, and the line stays drawn at its end. Pointing at the listed line's last edge shows the
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
2. **One line is listed under the candidates table** (Lichess lists one by default): the line of the candidate
   pointed at, or else of the selected candidate, number 1 or the row last clicked (a click on a candidate on the
   board selects it too). So the pointer can go from a row to its line. The list shows the trusted line, not only its
   first 6 edges. Pointing at an edge of the list draws the line up to it on the board, all at once. A click plays
   the line up to it as a branch and goes there (Lichess's `playUciList`). Where the line is the game's own
   continuation, the click goes along the game. The list's edges that are already in the tree, the game's own or a
   branch's, show as hollow circles (in text, dotted underlines), with "played in the game" or "in a branch" in their
   tooltip, so that the player sees where a click's branch will start.
3. **A player's own moves are always on in the Analysis** (Lichess's way, not a separate mode): at any position, one
   of the mover's nodes, then a marked end (the puzzles' edge input, on the position's rules from the engine's
   `describe`). Only the points a click acts on take the pointer, so that the candidates under the other points keep
   their hover and their clicks. A move that is the game's goes along the game. Another move makes a branch, and the
   new position is searched. The status line says what the next click does ("Now the edge's second point"). Escape drops
   an edge begun.
4. **The game is a tree, as Lichess's analysis tree.** A place is a path of moves from the start. A node's children are
   the game's next move, then its branches in the order they were added. A branch's positions come from the engine's
   rules, and each is searched, as the game's are, when the player looks at it. **Lichess's keys:** ← and → go along the
   line on screen, back to the parent and on to the first child. At a fork, ↑ and ↓ pick the line that → follows (the
   board shows the picked edge, and the move list marks the picked move with a dashed outline and brings it into
   view), and elsewhere they go to the start and the line's end. Shift + ← and → go to the previous and the next fork,
   and Shift + ↑ and ↓ to the line beside this one, from the nearest fork above. Home and End go to the start and the
   line's end. **Single keys beside the Shift keys,** from other tools: k and j go back and forward (Lichess's). b and
   n, [ and ], or Shift + k and j go to the previous and the next fork (KaTrain's b, Lichess's Shift + k and j). x and
   c, or comma and period, go to the line before and after (En Croissant's x and c). None of them clash. Kept free
   for later: m and Shift + m for the next and the previous mistake (KaTrain's n, which the forks take here), and
   Delete. "?" opens the list of keys and clicks (Lichess's "?"), as does "Keys and clicks" in the display settings.
5. **Branches show in the move list** under the turn where they start, after its comments (Lichess's column view):
   each on its own row, indented, with a rule on its left, and every turn with its number ("19..." for a row that
   starts at a turn's second edge). Where a branch forks again, its row ends at the fork, and every line from the fork
   follows one step further in, the first line too, so that the lines from a fork stand side by side (Lichess's way
   inside a variation).
6. **Without notation by default** (Go's way): a branch's edges are marks in the mover's colour, after their turn's
   number. The turn numbers place the edges, so the marks carry no numbers: numbers of their own would read as a
   second, unrelated count beside the turns. The listed line's marks are numbered as the board numbers the line. A
   mark's tooltip names its turn and edge. The display settings offer "Pills" (the default), "Dots" (circles, Go's
   stones) and "Notation" (the record's, with the cut mark). The digits in the marks and the rank badges are centred
   on their own height (`text-box: trim-both cap alphabetic`).
   - **Pills by default:** Go tools show a variation as stones, since a Go move is a point and a stone is its shape.
     An Enclosure move is a line between two points, so a pill along it is the nearer form, and it shows what the
     turn numbers do not: the edge's direction. A dot shows only whose edge it is, which the turn already tells.
   - **Pills** are this site's own form: no published tool shows an edge's direction in a move list. Each edge is a
     capsule in its mover's colour, at the edge's exact slope on the board (24 slopes, since an edge has no head), and
     every pill has the same length, so that a short edge stays as plain as a long one. A pass is a round dot. In the
     listed line, the number stands upright on the pill's centre: the centre is a disc as wide as the pill, so the
     number has the pill's colour behind it at every slope. A pill is never taller than its length, so every pill has
     one height and a row stays even. Its box is only as wide as the pill turned, so a steep pill takes little width.
     The branch's pills are 1.15 by 0.5 times the text's size (the dots are 0.85 across). The line's pills are about
     1.6 times the text's size long, against 1.16 for its circles.
   - **Spacing:** dots and pills stand closer than words: an eighth of a rem between them (a quarter between words),
     and a dot's or pill's button has a small margin for the outline that marks the move on screen. Between turns the
     turn number, or a small gap in the line, keeps the turns apart.
7. **A game's branches are kept in this browser** (Lichess's way), under the game's id, each node with its place
   among the branches from its parent, and come back when the game is opened again. A branch's analyses are in the
   analysis cache, which is keyed by the moves.
8. **The candidates' ranks are rounded squares,** on the board, in the table and before the listed line, and the
   line's numbers are circles (Go's numbered stones), so a rank is never read as a line's number. While a line shows,
   the other candidates still leave the board.
9. **A click on a candidate pins it,** on the board or in the table: the list shows its line, and the board keeps its
   line, still drawing, when the pointer leaves. A second click unpins it. The pinned row has an accent bar on its left.
10. **Playing a candidate:** Space plays the pinned candidate, or number 1 (Lichess's Space plays its best move). A
    double-click on a candidate on the board plays it, and so does the listed line's first edge.
11. **A branch's edges have no labels unless asked,** and a branch's positions are searched only while the player
    looks at them (Lichess's way). A line is often played only to show something, and searches for its labels would
    take the machine from the game's review. The move menu's "Evaluate move quality" asks for one edge's label: its
    two positions are searched to the label budget (after the position on screen, before the rest), and the edge is
    judged as the game's edges are (`judgeEdge`, the same bands). Until then the move list shows "…" after it. Then
    the move list shows its label, as for the game's edges (Great, Inaccuracy, Mistake, Blunder), with every label in
    its tooltip, and the board shows its badge on the turn just played. The edges evaluated are kept with the branches.
12. **Lichess's move menu** on a branch's move, by a right-click or a long press: "Evaluate move quality" (item 11),
    "Promote variation" (the nearest branch on the path that is not the first from its parent becomes the first, as
    Lichess's `promoteAt`) and "Delete from here" (the move and what follows it, and the place on screen goes to the
    fork when it was inside). The game's own moves have no menu: the review is of the game, so its line stays first.
    "Make main line" belongs to an analysis board, later (decisions/open-items.md).
13. **A branch's preview:** pointing at a move of a branch's row in the move list shows the row on the board, from the
    position where the row starts, up to that move. It is drawn as the engine's line is (item 3): the edges numbered,
    one at a time or all at once (the same display setting, "Lines on the board"), with the edges they cut and the
    regions they close, from the branch's own positions. Meanwhile the board shows nothing of the position on screen
    (no candidates, labels or own moves), and the status line says "Branch preview" and where the row starts. It ends
    a moment (120 ms) after the pointer leaves the move, unless the pointer comes onto another move first, so that it
    can cross the gap between two moves without the board going back. A click goes to the move. A display setting
    turns it off ("Preview branches"). Rows of dots or pills look alike, and the board tells
    them apart. A small board that pops up beside the move (Lichess's board on its engine lines) was the other choice:
    the main board is larger, and it draws as the engine's line does.
14. **A played move's preview:** pointing at one of the game's moves in the move list shows the position after it,
    with the move as the last edge, and nothing of the position on screen. The status line says "Preview" and the
    move. It ends as the branch's preview does, a moment after the pointer leaves the move. A display setting turns
    it off ("Preview played moves"). This is the site's own: Lichess's move list has none (its small board shows only
    a move of an engine line, `ui/lib/src/ceval/view/main.ts`, `renderPvBoard`), and the help pages of chess.com and
    Sabaki name none. Hover previews exist in browser extensions for those sites and in one Go client (SWHub).

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
- **Labels on branches only when asked:** a branch is often a demonstration (an engine line played out, or a try
  followed to its end), and a label needs both its positions searched to the label budget. Searching every position a
  branch adds spends the machine on lines nobody judges. A try the player wants judged costs two searches, on request.
- **A click pins, so playing needs another gesture.** Space is Lichess's. A double-click keeps the board's own way of
  playing a candidate, without a stray click changing the position.
- **One listed line** keeps the move list's room. The table already lists every candidate, so the list shows the line
  of the one the player picks.
- **Circles, not notation:** an edge's name is two points to find on a 19 × 19 board. Go tools leave notation out of
  their variations for a board of that size. Numbers that match the board's line badges are read on the board itself.

## Alternatives

- **Text lines only** (Lichess's lines): the board keeps the candidates, and the player reads the line from text.
- **The candidates as turns** (tried, and taken back): each candidate with the next edge of its line, at the first
  edge of a turn of two. One search gives one turn for each first edge, the best turn that starts with it. So the
  rows rank first edges, not turns. When A then B is the best turn, A then C the second, and B then D the third, the
  table shows A B and then B D, and A C not at all. The second row then reads as the second-best turn. The values do
  not change either: a first edge's values are already those of its best turn. The listed line under the table shows
  the second edge of the candidate pointed at.
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
- **Branches for the visit only:** simpler, but the work on a variation is lost when the tab closes.
- **A click on a candidate plays it** (KaTrain, Lizzie): fast, but a stray click changes the position, and pinning
  would stay in the table only.
- **Labels on every branch edge** (KaTrain judges every move in its tree, chess.com the moves tried): each new
  position searched to the label budget at once. It was built and checked, then left out: the searches went to lines
  played only to show something.
- **Labels only on the player's own edges:** fewer searches, but still a search for every try.
- **No labels on branches at all** (Lichess): no searches, but a try could not be judged as the game's edges are.
- **Delete only, by a key or a button:** no way to order the branches.
- **"Make main line" in the review:** the review's labels, chart and summary would follow a line that was not played.

## Consequences

- The analyses keep each candidate's line and the visits through each of its edges (the cache's shape version 4).
  Every search asks for them (`includePVVisits`).
- The review has a worker for the rules alone (`EnginePool.rules`): a line's positions and a player's moves need the
  rules at once, and a search worker takes one request at a time.
- A position in a branch needs its own analysis. Protocol 0.3 gives the network no moves from before the root, so a
  position gets the same analysis however it was reached.
- The browser's store has a third store, `branches` (its version 3): under the game's id (`gameId`, the SHA-256 of
  its moves), each branch node's path, its order, and whether its move was evaluated (the kept shape's version 2.
  Version 1 kept the lines, and is still read).
- An evaluation's searches have the pool's priority 7, between the position on screen and the game's key moments.
- The Highlights and the Advantage chart are the game's alone. In a branch, the chart marks the position where the
  branch leaves the game.

## Where it is

- `src/lib/board/Board.svelte`: the line as far as drawn (`line`), its cuts and regions, the hidden candidates.
- `src/lib/review/ReviewView.svelte`: the place in the tree (`path`), the line of the candidate pointed at, its
  animation, the click that shows it whole, the players' areas, the listed line (`lineList`), the branches in the
  move list (`branch`), and the keys.
- `src/lib/review/tree.ts`: paths, the game's line, a branch's rows, and the forks for the keys (`prevFork`,
  `nextFork`, `siblingLine`), with tests in `tree.test.ts`.
- `src/lib/analysis/game.svelte.ts`: `lineSteps` (the line's positions from the rules), `toAnalysis` (the line),
  `branches`, `addLine`, `deleteFrom`, `promote`, `judge`, `loadBranches` (the branches and their keeping),
  `rulesAt` (the rules for the player's moves), and the searches on any path.
- `src/lib/review/model.ts`: `judgeEdge` (an edge's loss and label, for the game's edges and a branch's),
  `judgeBranchEdge`, `valuesAfter` (tests in `model.test.ts`).
- `src/lib/board/Board.svelte`: `onlyActive` (the points that take the pointer), `oncandidatedblclick`.
- `src/lib/review/model.ts`: `lineMovers`, `enoughVisits`, `trustedLine` (the 25-visit cut, with its tests in
  `model.test.ts`), `LineStep`.
- `src/lib/review/display.ts`: the "one edge at a time" setting, and `branchText` (circles or notation).
- `src/lib/storage/db.ts`: the `branches` store.

## Log entries

- [decisions/product.md](../decisions/product.md), "The engine's line on the board", "The engine's line: where it
  stops", "The engine's line listed, and branches", its two rounds of feedback, and "The player's own moves, keys and
  the move menu".
