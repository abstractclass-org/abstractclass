# The opening book explorer

**Status:** in force, not built. It is built on a test book in the site's own form, made from the third prototype's
book, and goes live with the engine repository's book (request 22). **Decided:** 2026-10-24, from user stories and
journeys, Lichess's opening explorer, KataGo's book pages and OGS's Joseki Explorer.

## Context

The opening book is a tree of positions from the start, for people to learn. It holds every fine move near the start
(Good or better), the tempting mistakes with their refutations, and a position symbol at each line's end (=, ⩲, ⩱, ±,
∓, +−, −+, ∞). The engine computes it offline with KataGo's book method, and the site serves it as static files (the
beads epic abscls-tpaj). Three prototypes grew small books on the site and showed them on the Analysis board (branches
abscls-tpaj.1 to abscls-tpaj.3). The final book comes from the engine repository, with a search that excludes the
book's moves.

This document decides how a player explores the book. The design started from the players and their situations, not
from the prototypes' table. Its working files are in [../ux/book-explorer/](../ux/book-explorer/): the context, 19
user stories, two journeys, the structure, the wireframes, an evaluation and the decision log. The survey of the
explorers that people use in chess and Go is [../research/03-opening-explorers.md](../research/03-opening-explorers.md).

## Decision

1. **Two situations in the first version:**
   - **After a game:** a player who reviews a game learns where it left the book, what the book plays there, and
     which traps the game met.
   - **Study:** a player learns the main line, the fine moves at each turn and the traps, with a first view that a new
     player can read.

   Preparation (kept lines, a drill, a shared position) and an idea on the Analysis board come later (stories 13 to
   19 in [stories-book-explorer.md](../ux/book-explorer/stories-book-explorer.md)).
2. **Where the book lives:**
   - **Openings** (`/openings`), a page of its own, after Analysis in the header. It has the Analysis board's layout
     and controls, with a state of its own, so that a visit never changes the player's lines on the Analysis board.
     The book is always on there.
   - **The review and the Analysis board:** the book's table in the analysis column, off until the player turns it on.
   - **The addresses** follow design 22: `/openings` opens the kept board, `/openings#record=<record>` the end of a
     line, `&at=<n>` a position on it. "Study in Openings" in the review and on the Analysis board opens the position
     on screen in Openings. "Open in Analysis" in Openings opens the path on the Analysis board.
3. **The book's table** takes the place of the engine's candidates in the analysis column. The engine header stays
   above it, and the move list and the step bar below it (design 06).
   - **One switch** in the table's title row chooses "Book" or "Candidates". Its name differs from the engine header's
     switch ("Engine"). It shows what the table holds: outside the book, "Candidates" is chosen and "Book" is
     unavailable, with "Not in the book" as the reason, and the player's choice comes back at the next book position.
     The key o turns the book on and off, and the browser keeps the choice for the review and for the Analysis board,
     each apart.
   - **The title row** names the turn, the side to move, the edge of the turn and the position's symbol. Its second
     line gives the book's source and version ("From the engine's analysis, not from games that people played. Book
     of …") and the switch "Show the values". Both stay above the table, so they keep their place as the table changes
     height.
   - **The groups,** in this order. A move is in one group only:

     | Group | Rows |
     |---|---|
     | Fine moves | the book moves that are Best, Great, Excellent or Good, the best first |
     | Other book moves | the book moves that the deeper values made worse than Good, with their labels |
     | Traps | each trap, the largest gap between its two values first. A book move that is a trap is here. |
     | Best outside the book | the best move outside the book and its value, as KataGo's "other" row |
     | Your game (the review only) | the game's move, when it is in no group above |

   - **A row** shows the edge with its label under it and the symbol at its line's end, in words. "Show the values"
     adds the win chance for the side to move, the bounds and the number of turns that the book goes on under the
     move. The browser keeps the choice. The values are closed by default.
   - **The table and the board point at each other:** the board numbers the rows' moves as the candidates are numbered
     (design 07). The pointer on a row highlights its edge and draws its line. The pointer on a numbered edge
     highlights its row.
4. **The review:**
   - **The Report** has an opening row: "The game left the book at turn {n}: {side}, {move}, {label}." When the game
     played a book move worse than Good before it left, the row names it: "Before that, at turn {n}, {side} played
     {move}, a book move and {a label}." A game with a trap has a trap row: "Turn {n}: {side} played a trap, {move}.
     {other side} played its refutation." or "… did not play its refutation." A click on a row goes to the position
     before the move, and turns the book on for that review only.
   - **The move list** marks the game's last book move with one mark, an open-book icon, "Last move in the book". The
     moves keep their review labels.
   - **One engine and one depth rule a game:** the review keeps its own labels, on book moves too (design 16). The
     book's table shows the book's values. The game's row has "—" in the book's columns, and its move cell gives the
     review's label and value with their source: "In your review: Good, Blue 46.5%".
   - **A book move played from the table** is a branch of the game, as any move that the player plays in a review is
     (design 07). "Delete from here" removes it.
5. **Openings:**
   - **The first view** opens at the start with the area map on. A box gives the main line, one turn a line, each with
     one sentence (item 6). The table follows under it.
   - **The live engine waits** at a book position, because the book's searches are deeper. "Candidates" starts it, and
     "Book" stops it. Outside the book it searches, as on the Analysis board.
   - **The move list holds the book's tree.** The main line is the best move at each position. The other book moves
     hang under the move before them, folded under a chevron: down when folded, up when open. The path to the position
     on screen is always open, and every other branch stays folded until the player opens it. Traps hang with the
     other branches, each followed by its refutation.
   - **Move orders:** a turn's two edges in either order are one branch. A position that move orders from other turns
     reach shows its subtree once, under its first parent in the book's order, as KataGo's pages name one canonical
     parent. Under every other parent, the branch ends with a link: "Continues in {line}". The title row lists the
     other move orders: "Also reached by: …".
   - **Mirror images:** the book stores a position and its mirror image as one. The page shows each position as the
     player reached it, with the book's moves mirrored to match, as KataGo's `symmetry` parameter does.
   - **The way back:** a click on any move of the path, the step bar's first step, and "Back to the main line".
   - **The end of the book:** "End of the book" with the symbol in words. Then the live engine searches.
6. **One sentence a turn, from the book's facts,** as the review builds its sentences from checked engine facts
   (design 04), never from a language model. The facts: how a line ends, how the other book moves end, the traps that a
   move avoids or sets, a trap's two values and its refutation. The main line's box has one sentence for each turn. At
   other positions, one sentence under the table explains the best move, and the pointer or the focus on another row
   shows that row's sentence. No sentence describes what a turn encloses: such sentences were exact and misleading
   (design 30, "Why"). The templates are in [journey-book-explorer.md](../ux/book-explorer/journey-book-explorer.md),
   "Copy specifications".
7. **A trap** shows why it tempts in its move cell, with the values open or closed: "Looks good: Blue 41%. Is not:
   Blue 17%." No number is set in bold. A row under it gives the refutation and plays it: "Play the refutation: 4.
   N12-Q10 L11-O12".
8. **Outside the book,** one line in the title row names the last book position on the path ("Not in the book. Last
   book position: turn 3."), with "Go there" and "Study in Openings". It is a line, not a box, because it shows at
   almost every position of a review.
9. **Keys and assistive technology:**
   - The arrow keys step, as in the review. The key o turns the book on and off, as t shows the area map and x the
     threat. "Keys and clicks" lists it.
   - Tab puts the focus in the table. There the up and down keys move between the rows, Enter plays the move, and the
     focused row's line is drawn. Escape returns the focus to the page.
   - Each chevron is a button that says whether it is open and how many moves it holds. The position on screen is the
     move list's current item. The count of the position's book moves ("4 book moves, 1 trap") comes once a step, as
     a polite announcement. Each label and symbol has its words.
10. **The phone:** the board, the book's table, the move list, then the step bar, as the Lichess app lays out its
    explorer. A tap anywhere on a row plays its move, and nothing in a row takes a tap of its own. Each row writes its
    symbol's words under the symbol. The step bar is fixed to the bottom of the screen on Openings, the review and the
    Analysis board (a change to design 06), so that the step back is in view whenever the board is.
11. **Loading and failure:** the book loads in parts, the start's part first. A position whose part still loads shows
    "Loading the book…". A failed load shows "The book did not load. Check your connection, then try again." with "Try
    again". The review and the boards work while the book loads or fails.
12. **Words:** "Openings" for the page, "Book" for the moves that the engine studied from the start, "Opening book" for
    the table's title, "Candidates" for the engine's candidates. "Explorer", "Theory", "Repertoire" and "Joseki" are
    kept out: a database of games played, an agreement of people, the player's own lines (a later feature), and Go's
    word for corner sequences. The eight symbols take Lichess's names, with Blue and Red: "Equal position", "Blue is
    slightly better", "Unclear position".
13. **No rewards for time spent:** no streaks, reminders, notifications or badges in the book. The counts follow design
    17: counts and ranges only, never a game, a line or a position.

## Why

- **The book is for people to learn.** So it shows every fine move, the traps that tempt, and a reason in words, and
  its first view is one line to learn, not a table of numbers.
- **The book comes to the position.** The review and the Analysis board are where a player meets the opening's
  positions, and Lichess's explorer sits on its analysis board in the same way. One board, one move list and one set of
  controls serve both journeys, and the player knows them from the review.
- **Published methods first:** Lichess's opening explorer for the panel, the click that plays a move into the tree, and
  the symbols' names. KataGo's book pages for the "other" row, the orientation across a mirror and the one canonical
  parent. OGS's Joseki Explorer for traps as a category of their own, followed by their refutation. The Lichess app for
  the phone's layout.
- **The departures, and their reasons:**
  - **The review marks where the game left the book.** Lichess and KataGo show it only by an empty table, and a player
    who does not look at the table at that move never learns it. Chess.com labels every book move, which doubles the
    marks where the labels matter.
  - **The table takes the candidates' place,** not a box under the move list as on Lichess. A review's move list holds
    120 edges and needs the column's height. At a book position, the book's values are deeper than the live engine's,
    so the table shows the better set and the switch shows the other.
  - **The book's depth under a move stands in for game counts.** The book has none, so the title row says where its
    order comes from, and the player does not read it as popularity.
  - **The move list shows the book's tree folded around the path.** No surveyed tool draws the tree around the
    position. The second prototype's view showed that the branches need folding.
  - **The table lists the other move orders.** No surveyed tool does. In the third prototype's book, all 31 positions
    that two move orders reach are a turn's two edges in the other order, so a turn's pair is one branch, and the list
    is for move orders across turns.
- **One edge at a time:** the book stores a position after each edge, and every surveyed explorer lists one move at a
  time. The move list keeps the review's turns.

## Alternatives

- **A page with a layout of its own,** as KataGo's book pages and OGS's Joseki Explorer have. The review's controls,
  lines and area map would have to be built twice.
- **The book on the Analysis board's own state.** It would overwrite the player's lines (one board a browser, design
  21).
- **A box under the move list,** as on Lichess. It would leave a review's move list a few rows.
- **Whole turns as one choice.** The list grows as each first edge times its second edges, and a half-played turn
  cannot be compared.
- **The book's values in the review's labels** wherever the game is in the book, as design 16 has each position use
  its deepest result. One review would then mix two networks.
- **A mark on every book move,** as Chess.com's "Book" label.
- **No sentences in the first version.** Stories 11 and 12 would fail, and the study would teach coordinates to
  memorize.
- **"44.4% or less" for the game's move** in the book's column. The best move outside the book comes from the
  position's own search, whose candidates with few visits can rate higher.
- **A board that draws fewer of the book's moves** where they crowd. Crowded numbers are the board's problem for the
  engine's candidates too (beads abscls-4kso).
- **Openings under Tools, or under a later Learn tab.** Tools holds the bookmarklet and the userscript. Openings can
  move under Learn when it comes, and keep its address.

## Consequences

- **The book file:** the explorer needs, for each position, its book moves with their labels, values, bounds and line
  ends, the number of turns under each move, its traps with both values and their refutations, the best move outside
  the book, its symbol, and its parents. It loads in parts, the start's part first. The site defines this form and
  builds on a test book in it, made from the third prototype's book (404 positions, 38 traps, an area map for each).
  The explorer stays out of the live build until the engine repository's book (request 22) is in.
- **Design 06 changes:** the step bar is fixed to the bottom of the screen on a phone, on all three board pages.
- **The header** gets a fourth tab. One row still fits above the menu's 1,024 pixels (design 22). The layout sweep
  (`npm run test:layout`) checks it.
- **Design 17** gets the book's counts: where the book opens (the review's opening row, the switch, the menu, a
  lesson's end), the refutations played, and the positions looked at in a visit, as a range.
- **The review's Report** gets one or two rows, and its move list one mark.
- **Tests with players:** five players for each task of the structure's test plan
  ([sitemap-book-explorer.md](../ux/book-explorer/sitemap-book-explorer.md), "IA test plan"), before the first version
  ships.

## Where it is

Not built. The design's files are in [../ux/book-explorer/](../ux/book-explorer/): `context-book-explorer.md`,
`stories-book-explorer.md`, `journey-book-explorer.md` and its diagram, `sitemap-book-explorer.md` and its diagram,
`wireframes-book-explorer.html`, `evaluation-book-explorer.md` and `decisions.md`. The prototypes' code is on the
branches abscls-tpaj.1, abscls-tpaj.2 and abscls-tpaj.3, never merged.

## Log entries

- [decisions/product.md](../decisions/product.md), "The opening book explorer, from user stories to wireframes"
  (2026-10-24).
