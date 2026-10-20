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
  branching points, the Delete key removes a move. **Sabaki** (`src/menu.js`): Ctrl + ↑ and ↓ for the previous and the
  next fork.

Enclosure differs from Go in one way that matters here: an edge can cut the opponent's edges, and a line's edges can
cut edges that are on the board, so a line drawn over the board can show edges that the line itself removes.

## Decision

1. **The engine's line is drawn on the board** while the pointer is on a candidate, on the board or in the candidates
   table (KaTrain's and Lizzie's way):
   - Its edges as far as the search trusts them (below), dashed in each mover's colour, each with a number in a circle
     of the mover's colour. The candidate is 1. The first build cut it at 6 edges (three turns), a number of the
     site's own, not of KaTrain's or Lizzie's: the visits alone end it now, as they end the listed line.
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
   board selects it too). So the pointer can go from a row to its line. The list shows the trusted line, as the board
   does. Pointing at an edge of the list draws the line up to it on the board, all at once. A click plays
   the line up to it as a branch and goes there (Lichess's `playUciList`). Where the line is the game's own
   continuation, the click goes along the game. The list's edges that are already in the tree, the game's own or a
   branch's, show as hollow circles (in text, dotted underlines), with "played in the game" or "in a branch" in their
   tooltip, so that the player sees where a click's branch will start.
3. **A player's own moves are always on in the Analysis** (Lichess's way, not a separate mode): at any position, one
   of the mover's nodes, then a marked end (the puzzles' edge input, on the position's rules from the engine's
   `describe`). Only the points a click acts on take the pointer, so that the candidates under the other points keep
   their hover and their clicks. A move that is the game's goes along the game. Another move makes a branch, and the
   new position is searched. The status line says what the next click does ("Now the edge's second point"). Escape drops
   an edge started. **A drag plays an edge too** (Lichess drags a piece as well as taking two clicks): a press on a node
   and a move of more than 4 pixels starts the edge there, the dashed edge follows the pointer to a marked end, and the
   release there plays it. A release elsewhere leaves the edge started. A press and release on one point is a click. On
   a touch screen a drag that starts on a point plays, and does not scroll the page.
4. **The game is a tree, as Lichess's analysis tree.** A place is a path of moves from the start. A node's children are
   the game's next move, then its branches in the order they were added. A branch's positions come from the engine's
   rules, and each is searched, as the game's are, when the player looks at it. **Lichess's keys:** ← and → go along the
   line on screen, back to the parent and on to the first child. At a fork, ↑ and ↓ pick the line that → follows (the
   board shows the picked edge, and the move list marks the picked move with a dashed outline and brings it into view),
   and elsewhere they go to the start and the line's end. Shift + ← and → go to the previous and the next fork, and
   Shift + ↑ and ↓ to the line beside this one, from the nearest fork above. Home and End go to the start and the line's
   end. **Single keys beside the Shift keys,** from other tools: k and j go back and forward (Lichess's). b and n go to
   the previous and the next fork (KaTrain's b). So do [ and ], and Shift + k and j (Lichess's). x and c, or comma and
   period, go to the line before and after (En Croissant's x and c). None of them clash. Kept free for later: m and
   Shift + m for the next and the previous mistake (KaTrain's n, which the forks take here), and Delete. "?" opens the
   list of keys and clicks (Lichess's "?"), as does "Keys and clicks" in the display settings.
5. **Branches show in the move list** under the turn where they start, after its comments (Lichess's column view):
   each on its own row, indented, and every turn with its number ("19..." for a row that starts at a turn's second
   edge). Where a branch forks again, its row ends at the fork, and every line from the fork follows one step further
   in, the first line too, so that the lines from a fork stand side by side (Lichess's way inside a variation).
   Lichess's tree stands beside them (its column view, `ui/analyse/css/_tview.scss`): the lines from one position hang
   from one rule, each with a tick, the rule ends at the last line's tick, and a shallower fork's rule passes the lines
   nested in it (`treeLines`). A turn's notes and branches share one band across the move list, as Lichess's
   "interrupt": a faint background and a rule above and below tie them to the turn, and they start at the
   list's left, so that a branch's row has the list's whole width.
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
   - **A rank is a distinct move.** In a position that is its own image (the start, under the mirror of row r to row
     20 - r), the engine searches one edge of each mirror pair and lists the other with the same numbers (protocol
     0.4, its "symmetric twins"). The table has one row for the pair, with a mirror mark (⇅) whose note names the
     twin ("Mirror: A10-D11"). The marks stand in one column, after a slot as wide as the widest edge's name. The board draws both edges with the pair's rank. Pointing lights one edge: the row is
     the searched edge, and on the board the edge under the pointer, with its own line. While that line shows, the
     other edge of the pair leaves the board, as the other candidates do. The ranks count the distinct moves, so the
     start's first five moves are ranks 1 to 5, not 1 to 10.
9. **A click on a candidate pins it,** on the board or in the table: the list shows its line, and the board keeps its
   line, still drawing, when the pointer leaves. A second click unpins it. The pinned row has an accent bar on its left.
10. **Playing a candidate:** Space plays the pinned candidate, or number 1 (Lichess's Space plays its best move). A
    double-click on a candidate on the board plays it, and so does the listed line's first edge.
11. **A branch's edges have no labels unless asked,** and a branch's positions are searched only while the player
    looks at them (Lichess's way). A line is often played only to show something, and searches for its labels would
    take the machine from the game's review. The move menu's "Evaluate quality" asks for the labels of the move's
    turn: every branch move of the turn is evaluated, and the positions before and after each are searched to the label
    budget (after the position on screen, before the rest). The turn is judged as the game's turns are (`judgeTurn`),
    and each edge as the game's edges are (`judgeEdge`, the same bands): "Review by" chooses which shows. Until then
    the move list shows "…". Then it shows the label as for the game (Great, Inaccuracy, Mistake, Blunder), by turn
    after the move that ends the turn, with every label in its tooltip, and the board shows the badges of the turn just
    played. The moves evaluated are kept with the branches. A branch that stops in a turn's middle has no turn label
    until the turn ends.
12. **Lichess's move menu** on a branch's move, by a right-click or a long press: "Evaluate quality" (item 11),
    "Promote variation" (the nearest branch on the path that is not the first from its parent becomes the first, as
    Lichess's `promoteAt`) and "Delete from here" (the move and what follows it, and the place on screen goes to the
    fork when it was inside). Every move, the game's own too, has "Copy image" and "Save image" (item 17). On the
    game's own moves in a review, the other actions are off: the review is of the game, so its line stays first, and
    its moves are evaluated already. On the engine's lines and the notes, the same menu opens with each action off,
    not the browser's menu. The Analysis board's main line has the actions, and "Make main line" for a branch's move
    (design 21).
13. **A branch's preview:** pointing at a move of a branch's row in the move list shows the branch's line on the board,
    from the position where the line leaves the game, up to that move (`branchLine` in `tree.ts`). A row that forks from
    another branch starts at the fork, but its line starts at the game: the preview draws and numbers the edges that the
    row shares with the other branch too. With the game A1 A2 A3 A4 and the branches A1 B1 B2 B3 and A1 B1 C1 C2,
    pointing at B3 numbers B1, B2 and B3 as 1, 2 and 3 from the position after A1, and pointing at C2 numbers B1, C1 and
    C2 as 1, 2 and 3. It is drawn as the engine's line is (item 3): the edges numbered, one at a time or all at once
    (the same display setting, "Lines on the board"), with the edges they cut and the regions they close, from the
    branch's own positions. Meanwhile the board shows nothing of the position on screen (no candidates, labels or own
    moves), and the status line says "Branch preview" and the position where the numbering starts. The engine's best
    line under a bad turn (item 15) shows in the same way, from where it leaves the game. The preview ends a moment (120
    ms) after the pointer leaves the move, unless the pointer comes onto another move first, so that it can cross the
    gap between two moves without the board going back. A click goes to the move. A display setting turns it off
    ("Preview branches"). Rows of dots or pills look alike, and the board tells them apart. A small board that pops up
    beside the move (Lichess's board on its engine lines) was the other choice: the main board is larger, and it draws
    as the engine's line does.
14. **A played move's preview:** pointing at one of the game's moves in the move list shows the position after it,
    with the move as the last edge, and nothing of the position on screen. The status line says "Preview" and the
    move. It ends as the branch's preview does, a moment after the pointer leaves the move. A display setting turns
    it off ("Preview played moves"). This is the site's own: Lichess's move list has none (its small board shows only
    a move of an engine line, `ui/lib/src/ceval/view/main.ts`, `renderPvBoard`), and the help pages of chess.com and
    Sabaki name none. Hover previews exist in browser extensions for those sites and in one Go client (SWHub).
15. **The engine's best line as a branch** under a Mistake's or a Blunder's note (Lichess shows the engine's line after
    a mistake as a variation): candidate 1's line from where the mistake started (by turn, from the turn's start), as
    far as the search trusts it (by visits, as the listed line), behind candidate 1's badge.
    - **It starts where it leaves the game,** as a branch does, and is the first of the branches from there. A line
      that leaves the game only after the turn shows nowhere: the engine played the turn as the player did.
    - **It is part of the tree** (`withLine` in `tree.ts`), as Lichess's computer lines are nodes of its tree, marked as
      the computer's. Along the line, each edge is the first child of the edge before it. An edge the player has
      played shows as the branch's own (solid, with its label), and an edge not played shows a little faded, so that
      the engine's line and the player's own edges read apart. Where a branch follows the line, the two are one row.
      Where they part, the row forks: the line's way first, then the branch's.
    - **A click on a faded edge** plays the line up to there as a branch (as the listed line's click does). The played
      edges then show solid in the same row, with no second row. Pointing at a faded edge previews the line up to it
      on the board, as a branch's line (item 13): from where it leaves the game.
    - **The line follows the search, and the player's branches stay.** The faded edges are not kept. When the line
      changes, a branch the player played along the old line shows as a branch of its own, and a branch on the new
      line merges into it. While its position's search can still change it (a search of it runs, or the label pass or
      the key moments' deeper search has yet to reach it), the line's rows gleam as the progress bars do: the line
      updates after each slice of the search.
16. **The player's notes on the board** (Lichess's circles and arrows, from its chessground board's drawable shapes):
    a right-click on a point rings it, and a right drag from a point to another draws a line between them. A note is
    only a drawing: it is not an edge, and it cuts and encloses nothing. Drawing a note again removes it, and in
    another colour changes its colour. The keys held choose the colour, as chessground's brushes: purple with no key,
    yellow (Shift or Ctrl), green (Alt) and grey (both). Lichess's red and blue would read as the players' colours
    here. "Keys and clicks" lists the colours with their keys, so that each can be found. A left click
    on the board clears the position's notes (chessground's `eraseOnClick`). The notes belong to the position on
    screen, as Lichess keeps an analysis board's shapes on each position of its tree, for the visit only: they are not
    kept in the browser. They hide while a preview shows another position.
17. **An image of a line** (the move menu's "Copy image" and "Save image", item 12, in a review and on the Analysis
    board): players share lines with their community as screenshots, a position and how it could have gone, with the
    edges numbered. The image is a PNG of the board with a caption under it, made in the player's browser.
    - **The line, by the move under the menu** (`imageLine` in `lineImage.ts`):
      - A branch's move: the branch's line from where it leaves the main line, numbered as its preview numbers it
        (item 13, `branchLine`). The position on screen does not change it.
      - A main line move ahead of the position on screen: the line from the position on screen to that move. A
        position made in the board editor has only a main line, so this is how a player shares a line from it.
      - Any other main line move (on screen, behind it, or on another line than the one on screen): the position
        after the move, with the edge that it cut, and no numbers.
    - **What the board draws:** all the line's edges at once with their numbers (the Static form of "Lines on the
      board", whatever the setting), the edges that they cut and the regions after the last edge, and the player's
      notes (item 16) on the position where the line starts. No candidates and no labels. The protected edges follow
      the display setting.
    - **The caption** (text that explains): the turn and who plays where the line starts ("Turn 12. Blue plays two
      edges."), then each player's points and area there ("Before edge 1: …") and after the line's last edge
      ("After edge 6: …"), and the site's name, small. A position with no line gives its numbers once.
    - **How it is drawn** (`boardImage.ts`): the board's SVG (`Board.svelte`) is drawn apart from the page, its
      computed colours and fonts are written into each element, and a canvas draws it at twice its size on screen, at
      least 1,200 pixels wide, with the caption under it. Lichess renders its board images on its server from the FEN.
      This one needs no server, so the site stays static.
    - **The light look, in either theme:** an image leaves the site, for chats and forums of either background and for
      print. The light board keeps the edges' and regions' contrast on paper and on a dark chat. One look also makes
      the images of a line alike, whoever made them.
    - **The clipboard:** `navigator.clipboard.write` with a `ClipboardItem` (Chrome, Edge, Safari, Firefox 127 and
      later). The write starts within the player's click, with the image still being drawn, as Safari asks. Where the
      browser refuses an image, a note says "This browser cannot copy an image. Save the image as a file." with a
      "Save image" button. "Save image" gives a file, `hedge-school-after-edge-N-line-M.png`.

## Why

- **The board is where the line is read.** A line's edges matter by where they go: which region they close, which
  edge they cut. Text names the edges but leaves the player to find them on the board.
- **One edge at a time shows the order.** A line can jump from one side of the board to the other, and the numbers
  alone make the reader search for the next one. The list's last edge shows the whole line for a player who saw
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
- **The symmetric twins as rows of their own** (KaTrain's, Lizzie's and Sabaki's way: KataGo lists each twin, and they
  show it as a candidate): the start's table then spent two rows on each move, with the same numbers, and the ranks
  counted each move twice. One row for the pair keeps the table's rows for distinct moves, and the board still shows
  both edges, since either can be played.

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
- The Report and the Advantage chart are the game's alone. In a branch, the chart marks the position where the
  branch leaves the game.

## Where it is

- `src/lib/board/Board.svelte`: the line as far as drawn (`line`), its cuts and regions, the hidden candidates.
- `src/lib/review/ReviewView.svelte`: the place in the tree (`path`), the line of the candidate pointed at, its
  animation, the click that shows it whole, the players' areas, the listed line (`lineList`), the branches in the
  move list (`branch`), and the keys.
- `packages/analysis/src/tree.ts`: paths, the game's line, a branch's rows, and the forks for the keys (`prevFork`,
  `nextFork`, `siblingLine`), with tests in `tree.test.ts`.
- `packages/analysis/src/analysis.svelte.ts`: `lineSteps` (the line's positions from the rules), `toAnalysis` (the
  line), `branches`, `addLine`, `deleteFrom`, `promote`, `judge`, `addNodes` and `keepBranches` (the branches and their
  keeping), `rulesAt` (the rules for the player's moves), and the searches on any path.
- `packages/analysis/src/model.ts`: `judgeEdge` (an edge's loss and label, for the game's edges and a branch's),
  `judgeBranchEdge`, `valuesAfter` (tests in Hedge School's `src/lib/review/enclosure.test.ts`).
- `src/lib/board/Board.svelte`: `onlyActive` (the points that take the pointer), `oncandidatedblclick`, the pointer's
  press, drag and release (a click, a dragged edge, a note), and the notes drawn.
- `src/lib/board/notes.ts`: the notes, `toggleNote` and `brushFor` (tests in `notes.test.ts`).
- The image of a line: `src/lib/review/lineImage.ts` (`imageLine`, `imageCaption`, `imageName`, tests in
  `lineImage.test.ts`), `src/lib/board/boardImage.ts` (the PNG, `copyPng`), `imageOf` in `ReviewView.svelte`, and the note in
  `src/lib/ui/Toast.svelte` (the Export menu's too).
  `[data-theme="light"]` in `src/app.css` gives the light tokens to the board that the image draws.
- `packages/analysis/src/model.ts`: `enoughVisits`, `trustedLine` (the 25-visit cut, with its tests in
  `src/lib/review/enclosure.test.ts`). `src/lib/review/enclosure.ts`: `lineMovers`, `LineStep`.
- `src/lib/review/display.ts`: the "one edge at a time" setting, and `branchText` (circles or notation).
- `packages/storage/src/db.ts`: the `branches` store.

## Log entries

- [decisions/product.md](../decisions/product.md), "The engine's line on the board", "The engine's line: where it
  stops", "The engine's line listed, and branches", its two rounds of feedback, and "The player's own moves, keys and
  the move menu", and "An image of a line".
