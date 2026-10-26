# The opening book explorer

**Status:** in force. The book file's form, its loader, a test book ("The book file"), the sentences (item 6) and the
book's table ("The table") are built. The review and the Analysis board show the table ("Where the pages show it").
The review's own parts (item 4) are built: the Report's rows and the move list's mark ("The review"). Openings is not
built. The work uses the test book, and it goes live with the engine repository's book (request 22).
**Decided:** 2026-10-24, from user stories and journeys, Lichess's opening explorer, KataGo's book pages and OGS's
Joseki Explorer.

## Context

The opening book is a tree of positions from the start, for people to learn. It holds every fine move near the start
(Good or better), the tempting mistakes with their refutations, and a position symbol at each line's end (=, ⩲, ⩱, ±,
∓, +−, −+, ∞). The engine computes it offline with KataGo's book method, and the site serves it as static files (the
beads epic abscls-tpaj). Three prototypes grew small books on the site and showed them on the Analysis board (variations
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
     switch ("Engine"). It shows what the table holds. Outside the book the table and its switch are not there (item
     8), and the player's choice comes back at the next book position. The key o turns the book on and off, and the
     browser keeps the choice for the review and for the Analysis board, each apart.
   - **The title row** names the turn, the side to move, the edge of the turn, the position's symbol and the win
     chance for the side to move. The heading's title gives the book's source and its date ("This book comes from the
     engine's analysis, not from games that people played. … Book of …"). The title row stays above the table, so it
     keeps its place as the table changes height.
   - **The groups,** in this order. A move is in one group only:

     | Group | Rows |
     |---|---|
     | Fine moves | the book moves that are Best, Great, Excellent or Good, the best first |
     | Other book moves | the book moves that the deeper values made worse than Good, with their labels |
     | Traps | each trap, the largest gap between its two values first. A book move that is a trap is here. |
     | Best outside the book | the best move outside the book and its value, as KataGo's "other" row |

   - **A row** shows the edge with its label's badge after it, on one line, then the win chance for the side to move
     and the symbol at its line's end. A second line has words only, where the row has them: "a trap" or "the book
     ends here". So a row with none is one line. The badge and the symbol show no words, as Lichess shows its position
     symbols: the label's word ("Excellent") and the symbol's name ("Blue is slightly better") are their titles and
     their accessible names. The title row's symbol keeps its words, on one line, so the table shows once what the
     symbols mean.
   - **The win chance shows alone** ("52.3%"), in the rows and in the title row. Its bounds (KataGo's book bounds) are
     its title, "Between 48.1% and 56.4%.", and assistive technology reads them after it. The table has no switch for
     its values and no column for the turns that the book goes on under a move.
   - **Each symbol takes a shade of its side's colour by its strength:** slightly better (⩲, ⩱) the faintest, better
     (±, ∓) the side's colour, and winning (+−, −+) the strongest. = and ∞ take the text's colour. The stronger the
     position, the more its symbol stands out from the panel. Each shade has a contrast of at least 3:1 against the
     panel, in both themes (WCAG 1.4.11). This is a departure from Lichess, whose symbols have no colour. Enclosure's
     sides are Blue and Red, so the colour names the side. The colour does not carry the meaning alone: the symbol's
     shape and its name give the side and the strength too.
   - **The table and the board point at each other:** the board numbers the rows' moves as the candidates are numbered
     (design 07). The pointer on a row highlights its edge and draws its line. The pointer on a numbered edge
     highlights its row.
4. **The review:**
   - **The Report** has an opening row: "The game left the book at turn {n}: {side}, {move}, {label}." When the game
     played a book move worse than Good before it left, the row names it: "Before that, at turn {n}, {side} played
     {move}, a book move and {a label}." When that book move is the one that reached the end of the book, the row says
     "The last book move, {move}, is {a label}.": "Before that" would put it before the end that it reached. A game
     with a trap has a trap row: "Turn {n}: {side} played a trap, {move}. {other side} played its refutation." or "…
     did not play its refutation." A click on a row goes to the position before the move, and turns the book on for
     that review only.
   - **The move list** marks the game's last book move with one mark, an open-book icon, "Last move in the book". The
     moves keep their review labels.
   - **One engine and one depth rule a game:** the review keeps its own labels, on book moves too (design 16). The
     book's table shows the book's values only, with no row for the game's move: the move list gives the review's
     label. The opening row gives the review's label of the edge itself, also when the review judges by turn. The book
     works by edge, also in the middle of a turn, so its row judges the edge that it names.
   - **A book move played from the table** is a variation of the game, as any move that the player plays in a review is
     (design 07). "Delete from here" removes it.
5. **Openings:**
   - **The first view** opens at the start with the area map on. A box gives the main line, one turn a line, each with
     one sentence (item 6). The table follows under it.
   - **The live engine waits** at a book position, because the book's searches are deeper. "Candidates" starts it, and
     "Book" stops it. Outside the book it searches, as on the Analysis board.
   - **The move list holds the book's tree.** The main line is the best move at each position. The other book moves
     hang under the move before them, folded under a chevron: down when folded, up when open. The path to the position
     on screen is always open, and every other variation stays folded until the player opens it. Traps hang with the
     other variations, each followed by its refutation.
   - **Move orders:** a turn's two edges in either order are one variation. A position that move orders from other turns
     reach shows its subtree once, under its first parent in the book's order, as KataGo's pages name one canonical
     parent. Under every other parent, the variation ends with a link: "Continues in {line}". The title row lists the
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
   - **The module** (`apps/hedgeschool/src/lib/book/sentences.ts`) builds them from a position as the loader gives it:
     a main line's turn, the best move with the trap that it avoids, another book move with its label, a trap, and
     the end of the book. The symbols' rule and their names are in `symbols.ts`, the one rule for the table and the
     sentences. A unit test reads each sentence back on every position of both test books, in both orientations, and
     checks each fact that it states against the values.
   - **One word, one meaning:** a trap "seems good after a short search", not "looks good at a short look", where
     "look" has two meanings. The table's group of traps and a trap's values take the same words. The best other move
     of a turn gets a sentence of its own. After "This move avoids a trap:", the sentence names the trap's edge again,
     not "it", which could refer to the best move.
   - **A trap's cost** is stated for the side that plays it: that side's win chance with the best move here and after
     the trap, for example "decreases Red's win chance from 55.3% to 46.8%". The symbols alone do not always show the
     cost. In the test book, a trap takes Blue from 36.4% to 16.6%, and both ends are "Red is winning".
   - **A trap's short-search value is not in its sentence.** It comes from another search than the deep values. For 30
     of the test book's 38 traps it is below the deep value with the best move, so beside that value it cannot show
     why the trap tempts. The trap's move cell gives its two values (item 7).
   - **A trap that is the first book move,** which happens only where a move outside the book is better, gets the
     trap's sentence on its row, as its row is in the group of traps. The sentence under the table adds "This move is
     a trap: …".
   - **A turn's sentence names a better move outside the book:** "4. G9-K10 is better, but it is not in the book.".
     The symbol before the turn counts that move, so without it "leaves the game equal" has no reason in the text.
   - **Where the main line ends,** the turn's sentence says "The main line ends here.", not "The book ends here.": at
     a position where a move outside the book is better, the book has moves after the main line's end.
   - **The labels** come from design 10's bands against the best move here, which is the first book move, or the best
     move outside the book when that is better. The book gives no Great, because a Great needs the position before
     the enemy's last turn.
   - **Not built:** a sentence for the trap that a move sets for the enemy.
7. **A trap** shows why it tempts in its move cell: "Seems good: Blue 41%. Is not: Blue 17%." No number is set in
   bold. A row under it gives the refutation and plays it: "Play the refutation: 4. N12-Q10 L11-O12".
8. **Outside the book,** the analysis column shows the engine's candidates as it does with no book: no title row, no
   switch and no line about the book. Most positions of a review are outside the book, so the book takes no room
   there. The table comes back at the next book position, with the player's choice. The move list's mark and the
   Report's opening row show where the game left the book. On Openings too, the column outside the book shows the
   candidates, and the path in the move list leads back (item 5). "Study in Openings" gets its place in the review
   and on the Analysis board when Openings is built.
9. **Keys and assistive technology:**
   - The arrow keys step, as in the review. The key o turns the book on and off, as t shows the area map and x the
     threat. "Keys and clicks" lists it.
   - Tab puts the focus in the table. There the up and down keys move between the rows, Enter or Space plays the move,
     and the focused row's line is drawn. Escape returns the focus to the page. When the key o hides the rows while one
     has the focus, the focus goes to the switch. A move that leaves the book removes the table, and the focus returns
     to the page.
   - Each chevron is a button that says whether it is open and how many moves it holds. The position on screen is the
     move list's current item. The count of the position's book moves ("4 book moves, 1 trap") comes once a step, as
     a polite announcement. Each label's badge and each symbol has its words as its accessible name.
10. **The phone:** the board, the book's table, the move list, then the step bar, as the Lichess app lays out its
    explorer. A tap anywhere on a row plays its move, and nothing in a row takes a tap of its own. A row shows its
    badge and its symbol without words, as on a wide screen: the colour and the title row's words say what the symbols
    mean. The step bar is fixed to the bottom of the screen on Openings, the review and the
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
  positions, and Lichess's explorer sits on its Analysis board in the same way. One board, one move list and one set of
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
  - **The table has no game counts.** The book has none. The heading's title says where the book comes from, so the
    player does not read the rows' order as popularity.
  - **The move list shows the book's tree folded around the path.** No surveyed tool draws the tree around the
    position. The second prototype's view showed that the variations need folding.
  - **The table lists the other move orders.** No surveyed tool does. In the third prototype's book, all 31 positions
    that two move orders reach are a turn's two edges in the other order, so a turn's pair is one variation, and the
    list is for move orders across turns.
  - **A row's symbol takes a shade of its side's colour.** Lichess's position symbols have no colour. Enclosure's sides
    are Blue and Red, so the colour names the side, and its shade the strength.
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
- **A row for the game's move** ("Your game"), with the review's label and value beside the book's. It put two
  engines' values in one table, and the move list gives the review's label already.
- **A switch "Show the values,"** with the bounds and the turns that the book goes on under each move. The win chance
  is the value that a player compares between rows, so it always shows, and its bounds go into its title.
- **A line outside the book** that named the last book position on the path, with "Go there". It showed at almost
  every position of a review, and the move list shows the path.
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
- **The header** gets a fourth tab. One row still fits above the menu's 1,024 pixels (design 22). The layout test
  (`npm run test:layout`) checks it.
- **Design 17** gets the book's counts: where the book opens (the review's opening row, the switch, the menu, a
  lesson's end), the refutations played, and the positions looked at in a visit, as a range.
- **The review's Report** gets one or two rows, and its move list one mark.
- **Tests with players:** five players for each task of the structure's test plan
  ([sitemap-book-explorer.md](../ux/book-explorer/sitemap-book-explorer.md), "IA test plan"), before the first version
  ships.

## The book file

The site reads the book in a form of its own, and proposes it to the engine repository (request 22, item 5). The
explorer reads the book through one interface, so a book in another form comes in through an adapter. The types are in
`apps/hedgeschool/src/lib/book/form.ts`, with each value's unit.

- **Values only.** The file holds positions, edges and values. It holds no label, no symbol and no sentence. The site
  computes them by its own rules: the labels by design 10, and the symbols by the prototypes' cut-offs. These are
  chess.com's table of engine evaluations (WGM Natalia Pogonina, "Chess engines: evaluations": = to 0.26 pawns, ⩲ to
  0.7, ± to 1.5, +− beyond), turned into a win chance by Lichess's curve (lichess.org/page/accuracy): 0.524, 0.564 and
  0.635 of Blue's win chance. ∞ replaces = for an equal position whose complexity is hard (design 14).
- **The units.** Every win chance is Blue's, from 0 to 1, whoever moves, as the engine gives it. A lead is Blue's
  expected score lead in points. An edge count is the number of edges played, 0 to 120: the fifth field of the
  position notation.
- **An index and its parts.** `index.json` gives the book's source (its name, date, network, the visits of the deep
  search and of the traps' short search, and a note), the start, and each part's file with the positions that it
  holds. The first part holds the start, so the site loads it first. The index tells which part holds a position, so
  a lookup loads that part only. Each part stays small enough to load at once on a phone: a few hundred kilobytes at
  most before compression. The index lists every position, at 60 to 150 bytes each, and the site loads it before the
  start's part. So it suits a book of a few thousand positions. A larger book needs its index in parts too, for example
  by a hash of the notation.
- **The positions' keys.** The book keys each position by the engine's position notation (the engine repository's
  `docs/design/04-notation-and-protocol.md`, "A position"). So the move orders that reach a position reach one key.
  The book stores a position and its mirror image (row r to row 20 − r) as one, in one of the two orientations. A
  lookup tries the position, then its mirror image. A position that is its own mirror image, such as the start, lists
  one edge of each pair of mirror images, as the engine's twins do.
- **A position** has these fields:

  | Field | What it holds |
  |---|---|
  | `position` | Its notation, as the book stores it. |
  | `mover`, `turn`, `edge` | The side to move (`b` or `r`), the turn of the next edge (1 to 61), and that edge's place in its turn (1 or 2). |
  | `parents` | The book moves that lead to it. Each has the position before it, the edge, and `mirrored` when the book stores this position as the mirror image of the one that the edge reaches. The first is the canonical parent: the page shows the subtree under it. |
  | `value` | Blue's win chance (`blueWin`), its lower and upper bounds (`low`, `high`) and Blue's lead (`lead`), minimaxed through the book. The bounds are KataGo's book bounds (the value less and plus its error times the error factor), cut to 0 to 1. |
  | `complexity` | KaTrain's complexity of the position's own deep search, in win chance (design 14), from 0 to 1. For each candidate that the search lists, twins too, the mover's loss of win chance from the search's own win chance (0 for a gain), weighted by the candidate's prior. |
  | `moves` | The book moves: the best first, then by the mover's win chance. Empty where the book ends. |
  | `outside` | The best move outside the book (KataGo's "other" row), in the orientation of the position as stored, and Blue's win chance when the mover plays outside the book (`blueWin`): KataGo's value not in the book, from the search with the book's moves excluded. Where the position has no book move, it is the position's own search value. Null when the book holds every move that the search found. |
  | `area` | The area map: one signed byte a point, in base64. Each byte is the ownership in hundredths from Blue's side, from −100 to 100, in the engine's order of points: y × 19 + x, with y = 0 at row 1. |

- **A book move** has these fields:

  | Field | What it holds |
  |---|---|
  | `move` | The edge, in the orientation of its position as the book stores it. |
  | `to`, `mirrored` | The position after the move as the book stores it, and `mirrored` as for a parent. |
  | `value` | The values after the move: the minimaxed values of `to`. By the minimax, they are also the values of the end of its main line, so the symbol at the line's end comes from them. A trap's deep value is this one. |
  | `end` | The edge count and the complexity of the end of the book's main line after the move. The main line follows each position's best move while that move is in the book. |
  | `last` | The edge count of the deepest book position under the move: how far the book goes on. |
  | `trap` | On a trap only: `short`, Blue's win chance after the move by the short search, and `refutation`, the book's line from the position after it: the rest of the trap's turn, then the enemy's turn that punishes it. The refutation's edges are in the orientation of `move`, so they play from the position that the move reaches: the image of `to` when `mirrored`. |

- **The loader** (`apps/hedgeschool/src/lib/book/book.ts`) gives the interface `Book`. `get` gives a position with its
  part loaded. `peek` gives it at once when its part is loaded, and tells from the index alone when the book does not
  hold it. A part that does not load makes each lookup in it fail, and a later lookup tries it again. A lookup takes the
  position as the player reached it, and gives it in the player's orientation: its edges, its area map, the positions
  that its moves reach and its parents. So a move's `to` is the position that the move reaches, and the `mirrored`
  flags stay inside the loader. `bookMove` gives the book move that an edge plays. In a position that is its own
  mirror image, an edge plays its twin's book move, turned over.

### The test book

The test book is not the engine's book. `apps/hedgeschool/scripts/test-book.mjs` makes it from the third prototype's
book, which the site's engine searched in WebAssembly at 512 visits, with the site's network. That book is the file
that the branch abscls-tpaj.3 writes with its `scripts/book-prototype/export.mjs` (`static/book-prototype/book.json`,
1.5 MB, not in Git). The script reads it from `apps/hedgeschool/runs/book-prototype-3/book.json`. So the test book in
Git is the copy that stays. It writes two books in `apps/hedgeschool/tests/fixtures/test-book/`, which the unit
tests read. The dev and preview servers serve them at `/test-book/` (`apps/hedgeschool/vite.config.ts`, `testBook`).
No build holds them, so no deployed site serves a book that is not the engine's:

- `prototype/`: the prototype's 404 positions and 38 traps, in 4 parts and 456 kB. The start's part holds the first two
  turns. Each later position is in the part of the first edge of its first line, one part for each of Blue's first
  moves.
- `cases/`: hand-made cases for what the prototype's book lacks, in 15 positions and 16 kB. A position that two move
  orders from different turns reach, a position that the book stores as its mirror image, and a part that the index
  lists and no file holds. Its six added positions have copied values, not searched ones.

A line that leaves the book and comes back is in `prototype/` itself, and the unit tests walk it. The script adds what
the prototype's file does not keep: the parents (it keeps only each position's first line), each move's line end and
depth, and each trap's refutation. It cuts the bounds to 0 to 1. It checks that the form holds what the symbols need:
the symbols computed from the values are the prototype's for 395 positions. The 9 others are on a cut-off, because
the prototype's file rounds its values to 3 decimals.

## The table

The book's table (item 3) is one component, `apps/hedgeschool/src/lib/book/BookTable.svelte`, which Openings, the
review and the Analysis board put in the candidates' place. It holds no state that the browser keeps: each page keeps
its own choice of "Book" or "Candidates", handles the key o, and plays the moves.

- **The rows** (`rows.ts`) take their labels from `moveLabel` in `sentences.ts`, the rule of the sentences (item 6,
  "The labels"): design 10's bands against the best move here, the first book move or the best move outside the book
  when that is better. The table gives no Great, as item 6 says: a Great needs the position before the enemy's
  last turn, and two move orders reach many book positions, so a Great would change a position's table with the
  path. The best move outside the book is Best when it is better than the first book move.
- **The symbols** come from `symbols.ts`, the rule of the sentences too: a position's from `positionSymbol`, a row's
  from `lineEndSymbol`, the symbol at the end of its main line. `BookSymbol.svelte` draws the eight symbols, because
  the site's font has no glyph for ⩲ and ⩱. In a row, it shows the symbol only, with its name as its title and its
  accessible name.
- **The shades** are colour tokens in `packages/site/src/site.css`, beside `--blue` and `--red`, in both themes:
  `--blue-slightly-better`, `--blue-better` and `--blue-winning`, and the same three for Red. "Slightly better" is the
  side's colour 15% of the way to the panel, "better" the side's colour, and "winning" the side's colour 30% of the
  way to black in the light theme and to white in the dark. `packages/site/src/symbolShades.test.ts` checks that each
  has a contrast of at least 3:1 against the panel and panel-2 (a lit row), and that the contrast grows with the
  strength.
- **The badges:** a row's label is `LabelBadge` in a wrapper that gives the label's word as its title and its
  accessible name. `LabelBadge` itself stays hidden from assistive technology, because the move list and the Report
  give the word in their own text.
- **The widths:** the last column ("Line ends") is as narrow as its head on one line, because its symbols are
  narrower than its head. The edge's column takes the rest. The layout test (`npm run test:layout`) checks the review
  with the table at the end of the test book at every width from 360 pixels, and that the head stays on one line.
- **The sentence under the table** is the page's: the lab page gives it from `sentences.ts`, the sentence of the row
  pointed at or focused (`moveSentence`), else the best move's (`bestMoveSentence`).
- **The end of the book** (item 5): a position with no book move shows "End of the book" with its symbol in words
  (`endSentence`), and then the best move outside the book in its row, as at any other position. Each end position
  of the test book has such a move.
- **The state at a position** (`lookup.svelte.ts`): loading, in the book, outside it, or failed until "Try again".
- **The lab page** `/lab/book-table` shows the board and the table on the test book. It has no engine: it draws the
  book's positions from their notation, with no regions.

### Where the pages show it

The review and the Analysis board draw one view (`ReviewView.svelte`), and it puts the table in its analysis column
for both (items 3 and 8). The page's part of the work is in `apps/hedgeschool/src/lib/book/place.svelte.ts`:

- **Where it shows:** in the early edition, where the book's index loads. The site loads one book for a visit. A build
  that serves no book keeps the analysis column as it was, with no switch. A deployed site serves no test book, so the
  live site does not change until the engine's book comes.
- **The kept choice:** the switch starts on "Candidates". The browser keeps "Book" or "Candidates" for the review and
  for the Analysis board apart.
- **Outside the book,** the view shows the engine's candidates as it does with no book (`BookPlace.inBook`). The key o
  does nothing there, and the choice of "Book" comes back at the next book position. A position whose part loads or
  failed is in the book: the table says so.
- **The board** numbers the book's rows while the table shows the book. The row pointed at in the table, or its number
  on the board, draws the row's line as the engine's line draws: one edge at a time, with the edges that it cuts and
  its regions. A click on a row or on its number plays the move as a variation. Space plays row 1, or the row that has
  the focus. A trap and its refutation play edge by edge at the engine's line's pace.

## The review

The review's own parts (item 4) read the game's path through the book from
`apps/hedgeschool/src/lib/book/game.ts` (`gameOpening`), and their sentences from `sentences.ts`. ReviewView.svelte
shows them in the early edition, where the book loads. They read the site's one book (`siteBook` in
`place.svelte.ts`), as the table does, so a review loads each part of the book once.

- **In the book** is a fact of a position: the book holds it, by any move order. The game leaves the book at the first
  position after the start that the book does not hold. A game that comes back to a book position by another move
  order starts a new stretch in the book.
- **The Report's rows** are under the counts: the heading "Opening" and its row, then the heading "Traps" and a row
  for each trap. Each row is one button, its sentence followed by the link text "Show the position".
- **The opening row** names the first departure, with the review's label of the edge that left, by turn too, and none
  for the player that "Review for" leaves out. A game that followed
  the book to its end gives the turn of the book move that reached the end. "Before that" names the book move worse
  than Good with the largest loss before the departure, by the book's label. When that move reached the end, the row
  says "The last book move, G10-J13, is an Inaccuracy." in place of "Before that". In the test book, 41 of the 75 book
  moves worse than Good (traps aside) reach an end. The opening row does not name a trap, because the trap has its own
  row.
- **A trap's row** says that the other side played its refutation when the game reached the refutation's turn and the
  other side's edges are the refutation's, in either order. The game reaches that turn when the side that played the
  trap ends its turn as the refutation does. Otherwise, the row gives the trap's first sentence only. A game that ends
  before the refutation's turn gets that sentence only too. A game that ends in the book, as a game imported while it
  is played, has no opening row.
- **The mark,** "Last move in the book", is at the last book move of each stretch in the book. So it marks a return
  too. It sits beside its turn's number, and its title names the move ("Last move in the book: O11-Q10"). The number's
  column has a fixed width (35 pixels). A number of one digit and the mark need 30 pixels. From turn 10 they need 38
  pixels: the mark goes 3 pixels into the gap of 4 pixels before the move, and does not touch it. In the move's own
  cell, the mark widened the column, and at the move list's narrowest width (1,260 pixels, by edge) the list hid 14
  pixels sideways (`npm run test:layout`).
- **A click** on a row or on the mark goes to the position, and turns the book on for this review only
  (`BookPlace.showForNow`): the switch shows "Book", and the choice that the browser keeps does not change. Only the
  switch and the key o change it. Below 1,260 pixels, the click opens the Analysis tab too.
- **The book did not load,** or a part of the game's path did not load: the Report has no opening row, and the move
  list has no mark. The rest of the review works. The table says what failed.
- **The test games:** `apps/hedgeschool/scripts/test-fixture.mjs` makes reviewed games that meet the test book in each
  way, with a given opening: `apps/hedgeschool/tests/fixtures/book-left-review.json`, `book-never-review.json` (it
  comes back too) and `book-trap-review.json`. The layout test's game (`hedgefund-review.json`) follows the test book
  to its end.

## Where it is

The book file's form, its loader and their unit tests are in `apps/hedgeschool/src/lib/book/`, the script that makes
the test book in `apps/hedgeschool/scripts/test-book.mjs`, and the test book in
`apps/hedgeschool/tests/fixtures/test-book/` ("The book file"). The sentences and the symbols are in
`apps/hedgeschool/src/lib/book/sentences.ts` and `symbols.ts` (item 6). The table is in `apps/hedgeschool/src/lib/book/`
too, with its lab page in `apps/hedgeschool/src/routes/lab/book-table/` ("The table"). The review and the Analysis
board show it through `place.svelte.ts` ("Where the pages show it"). Openings is not built. The design's files are in
[../ux/book-explorer/](../ux/book-explorer/): `context-book-explorer.md`, `stories-book-explorer.md`,
`journey-book-explorer.md` and its diagram, `sitemap-book-explorer.md` and its diagram, `wireframes-book-explorer.html`,
`evaluation-book-explorer.md` and `decisions.md`. The prototypes' code is on the branches abscls-tpaj.1, abscls-tpaj.2
and abscls-tpaj.3, never merged.

## Log entries

- [decisions/product.md](../decisions/product.md), "The opening book explorer, from user stories to wireframes"
  (2026-10-24).
- [decisions/product.md](../decisions/product.md), "The book in the review: its rows, its mark and the game's row"
  (2026-10-25).
- [decisions/product.md](../decisions/product.md), "The book's table: badges and symbols alone, the win chance
  alone, no game's row" (2026-10-26).
