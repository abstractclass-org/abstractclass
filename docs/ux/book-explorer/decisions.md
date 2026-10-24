# The book explorer: decision log

## 2026-10-24 · No more prototype rounds of the book's growth on the site
- Decided by: the designer
- Why: the engine repository computes the final book, with the search that excludes the book's moves. The site's work is
  the interface to explore it.
- Rejected: a fourth round (two turns deeper, an open position while any fine move with 10 visits or more is outside the
  book), because the engine's book replaces it.
- Rests on: beads abscls-tpaj.3, its comments and its verdict.

## 2026-10-24 · The design starts from user stories and journeys, on the base of the Analysis board
- Decided by: the designer
- Why: the book is for people to learn, so the interface follows what players do with it, not the prototype's table.
- Rejected: a fifth round of the prototype's view without stories.
- Rests on: beads abscls-tpaj, "Decided so far"; design 21.

## 2026-10-24 · Five situations make the user model
- Decided by: site-coord, default
- Why: they cover the ways into the book that the site already has (the review, the Analysis board, the menu and the
  lessons) and the book's purpose (study). No research with players exists yet.
- Rejected: personas by skill level alone, because the situation, not the level, decides what the player needs from the
  book.
- Rests on: docs/context.md, "Goal"; design 19; design 21; beads abscls-tpaj.

## 2026-10-24 · The book has no streaks, reminders or rewards for time spent
- Decided by: site-coord, default
- Why: the book is reference material for study. Rewards for time spent push the player to stay, not to learn.
- Rejected: design 04's small rewards (streaks, progress), which apply to puzzles and lessons, not to the book.
- Rests on: design 04, item 4.

## 2026-10-24 · The artifacts of this design
- Decided by: site-coord, default
- Why: the request asks for user stories and journeys first, and the build needs the screens and a design document.
- The list: the context, the user stories, a journey for each situation that the first version serves, the structure
  (where the explorer lives: a panel, a page, or both), the wireframes on the Analysis board's base, an evaluation, then
  a design document in docs/design/ and the build issues.
- Rests on: beads abscls-tpaj.4.

## 2026-10-24 · The first version serves two situations: after a game, and study
- Decided by: the designer
- Why: reviews are how most players reach the site now, and study is the book's purpose. A new player reads the study's
  first view.
- Rejected for the first version: preparation (kept lines, a drill, shared positions) and an idea on the board. Their
  stories stay in the list for later.
- Rests on: stories-book-explorer.md.

## 2026-10-24 · The book is a panel of the review and the Analysis board, and the menu opens a board of its own
- Decided by: site-coord, default
- Why: one board, one move list and one set of controls, which the player knows from the review. The book's board keeps
  its own state, so the player's work on the Analysis board (one board a browser, design 21) stays as it was.
- Rejected: a page of its own with another layout (KataGo's book pages, OGS's joseki explorer), because the review's
  controls, lines and area map would have to be built twice. A book that opens on the Analysis board's own state,
  because it would overwrite the player's lines.
- Rests on: Lichess's opening explorer, a panel of its analysis board; designs 06, 07 and 21.

## 2026-10-24 · The review's move list marks only the game's last book move
- Decided by: site-coord, default
- Why: every move already carries a label (design 10). One mark at the point of departure answers the question "where
  did my game leave the book" without a second mark on each move.
- Rejected: a mark on every book move, as chess.com's "Book" label is, because it doubles the marks in the first turns,
  where the labels matter.
- Rests on: design 10; chess.com's Game Review.

## 2026-10-24 · A book move played from the panel is a branch of the game
- Decided by: site-coord, default
- Why: the review's tree already holds the player's moves as branches (design 07), with "Delete from here" to undo.
  Lichess's explorer adds a played move to the analysis tree in the same way.
- Rejected: a preview that adds nothing to the tree, because the player could not step back through it with the review's
  controls.
- Rests on: design 07; Lichess's opening explorer.

## 2026-10-24 · The values are closed in the first view, behind "Show the values"
- Decided by: site-coord, default
- Why: a new player needs the main line and its reason first. The labels and the symbols in words carry the judgement
  without numbers. The browser keeps the choice, so an experienced player opens them once.
- Rejected: the prototype's table with every number open, for the first view.
- Rests on: stories-book-explorer.md, story 12.

## 2026-10-24 · The traps are a group of their own, under the fine moves
- Decided by: site-coord, default
- Why: a trap is not a move to play. Mixed into the fine moves by value, it sorts to the bottom and reads as one more
  poor move.
- Rejected: one table sorted by value, as in the prototype.
- Rests on: the third prototype's table (branch abscls-tpaj.3), where the traps sort among the poor moves.

## 2026-10-24 · Success targets of the journeys
- Decided by: site-coord, default
- Why: one review in five that has the opening row should use it, or the row does not earn its place. The study's counts
  have no earlier value, so the first version measures a baseline.
- Rests on: design 17.

## 2026-10-24 · Left to the next skills
- The panel's place in the analysis column and the menu entry's name: decided in the structure (below).
- The panel's final strings: the copy.

## 2026-10-24 · In a review, the review keeps its own labels, and the book panel shows the book's values
- Decided by: the designer
- Why: one engine and one depth rule for a whole game (design 16). The book can come from a newer network than the
  review's.
- Rejected: the book's deeper values in the review wherever the game is in the book, because one review would then mix
  two networks.
- Rests on: designs 16 and 20.

## 2026-10-24 · The panel ends with the best move outside the book, and keeps the player's orientation
- Decided by: site-coord, default
- Why: the row answers "how far is a move outside the book from the book's moves" from the book itself, before any live
  search. A position stored as its mirror image must show the way the player reached it, or the book's moves point at
  other points.
- Rests on: KataGo's book pages, the "other" row and the `symmetry` parameter (docs/research/03-opening-explorers.md,
  section 4).

## 2026-10-24 · The symbols' words are Lichess's names for its glyphs, with Blue and Red
- Decided by: site-coord, default
- Why: Lichess gives the same eight symbols a name each. Its names are short and known to chess players.
- Rejected: the journeys' first sentences ("The game is equal.").
- Rests on: scalachess, core/src/main/scala/format/pgn/Glyph.scala (docs/research/03-opening-explorers.md, section 10).

## 2026-10-24 · The phone takes the Lichess app's layout: the board, the panel, the move list, the step bar
- Decided by: site-coord, default
- Why: a tested layout for an explorer on a phone. A tap plays a move, and the step back undoes it, because the phone
  has no hover.
- Rejected: a long press to draw a line, which no surveyed tool uses.
- Rests on: lichess-org/mobile (docs/research/03-opening-explorers.md, section 3).

## 2026-10-24 · Departures from the published explorers
- Decided by: site-coord, default
- The review marks where the game left the book. Lichess and KataGo show it only by an empty table, and chess.com labels
  every book move. Why: the player of Journey 1 asks exactly this, and an empty table at one move is easy to miss.
- The panel lists the other move orders that reach a position. No surveyed tool does. Why: story 10, positions over
  sequences.
- The move list shows the book's tree folded around the path. No surveyed tool draws the tree around the position. Why:
  story 9, and the second prototype's look, where the branches needed folding.
- The book's depth under a move stands in for how often people play it. Why: the book has no game counts. The panel's
  header says that the book is the engine's, so the player does not read its order as popularity.
- Rests on: docs/research/03-opening-explorers.md, sections 3, 4, 9, 10 and 11.

## 2026-10-24 · The panel lists one edge at a time, and the move list groups the edges into turns
- Decided by: the designer
- Why: the book stores a position after each edge, and every surveyed explorer lists one move at a time. The move list
  keeps the review's turns.
- Rejected: whole turns as one choice (a long list, each first edge times its second edges, and no comparison of a
  half-played turn). A switch for a turn view on request (more to build and to explain).
- Rests on: docs/research/03-opening-explorers.md, section 12; design 10.

## 2026-10-24 · The book's page is Openings, at /openings, after Analysis in the header
- Decided by: the designer (the header now, not under a later Learn); site-coord, default (the label and the address)
- Why: the label names what the player finds, as Lichess's and Chess.com's opening pages do. The address takes its ways
  in after the `#`, as every page does.
- Rejected: "Explorer" (a database of games played), "Theory" (suggests what people agreed), "Repertoire" (kept for the
  player's own lines), "Joseki" (Go's word for local corner sequences), and a place under Tools (Tools holds the
  bookmarklet and the userscript).
- Rests on: design 22; docs/research/03-opening-explorers.md, sections 3 and 6.

## 2026-10-24 · The book's table takes the engine's candidates' place, with a "Book" and "Engine" switch
- Decided by: site-coord, default
- Why: the move list takes the height that the column leaves, and a review's 120 edges need it. At a book position the
  book's values come from deeper searches than the live engine's, so the table shows the better set and the switch shows
  the other.
- Rejected: Lichess's box under the move list, which would leave a review's move list a few rows. A tab of its own
  beside the candidates, which hides the book at the moment the player looks at the position.
- Rests on: design 06, item 2; the third prototype's book mode (branch abscls-tpaj.3);
  docs/research/03-opening-explorers.md, section 3.

## 2026-10-24 · The book is off by default in the review and on the Analysis board, and always on in Openings
- Decided by: site-coord, default
- Why: the review's subject is the game, and Lichess's explorer is off until the player opens it. The Report's opening
  row turns it on where the player asks.
- Rests on: docs/research/03-opening-explorers.md, section 3; design 30's rule for the area map (off on the review, on
  on the Analysis board).

## 2026-10-24 · On Openings, the live engine waits at a book position
- Decided by: site-coord, default
- Why: the book already answers a book position with deeper searches. A live search there spends the player's CPU for
  weaker numbers.
- Rests on: design 02 (the analysis on the player's CPU).

## 2026-10-24 · A shared position's subtree shows once, under its first parent, with links from the others
- Decided by: site-coord, default
- Why: the move list is a tree and the book is a graph. A subtree shown under every parent repeats whole lines and hides
  that they meet.
- Rejected: a copy of the subtree under each parent.
- Rests on: KataGo's book pages, one canonical parent (docs/research/03-opening-explorers.md, section 4).

## 2026-10-24 · Small qualitative tests in place of tree tests with 50 players
- Decided by: site-coord, default
- Why: Enclosure has few players. Five players find most problems of a task (Nielsen and Landauer, 1993).
- Rests on: sitemap-book-explorer.md, "IA test plan".

## 2026-10-24 · A turn's two edges in either order are one branch of the move list
- Decided by: site-coord, default
- Why: in the third prototype's book, all 31 positions that two move orders reach are a turn's two edges in the other
  order, and none comes from another turn. Links for each of them would fill the move list with links to the same turn.
- Rejected: a link under every other parent for these (the structure's first rule, which stays for move orders that
  differ across turns).
- Rests on: the third prototype's book (branch abscls-tpaj.3, static/book-prototype/book.json), counted in this session.

## 2026-10-24 · The table's move cell holds the edge over its label, and a trap's refutation is a row under it
- Decided by: site-coord, default
- Why: the analysis column is 460 pixels wide. With the values open, seven columns did not fit. The refutation's own row
  shows its line ("Play the refutation: 4. N12-Q10 L11-O12"), so the player reads it before playing it.
- Rejected: a label column of its own, and the refutation as a button in a column.
- Rests on: wireframes-book-explorer.html; design 06 (the analysis column's widths).

## 2026-10-24 · Crowded numbers on the board are not the book's problem; the table and the board highlight each other
- Decided by: the designer
- Why: many candidates that start near one point crowd the board for the engine's candidates too, not only for the book.
  The two-way highlight lets the player find each move.
- Rejected: a board that draws fewer of the book's moves.
- Rests on: wireframes-book-explorer.html (the review's turn 3); the survey's pattern of the table and the board
  pointing at each other (docs/research/03-opening-explorers.md, section 11).

## 2026-10-24 · The evaluation's findings, taken into the design
- Decided by: site-coord, default
- "Book" means the moves that the engine studied. The table splits them into "Fine moves" and "Other book moves", and
  the Report names an earlier book move worse than Good.
- The game's row keeps the book's columns for the book's values ("—"), and gives the review's label and value in its
  move cell, with their source. Rejected: "44.4% or less" in the book's column, because the best move outside the book
  comes from the position's own search, whose few-visit candidates can rate higher.
- The table's switch is "Book" and "Candidates", apart from the engine header's "Engine". It shows what the table holds:
  outside the book "Candidates" is chosen and "Book" unavailable. On Openings, "Candidates" starts the live engine and
  "Book" stops it.
- Outside the book, one line in the title row, not a box. A click on the Report's opening row turns the book on for that
  review only.
- A trap's two values sit in its move cell in both modes, and nothing is set in bold. The "Short look" column went.
- The book's source and "Show the values" sit in the title row, above the table. The switch keeps one name.
- The key o turns the book on and off. Tab puts the focus in the table, where the up and down keys move between rows.
- On a phone, each row writes its symbol's words, and the step bar is fixed to the bottom of the screen, on Openings,
  the review and the Analysis board (a change to design 06).
- The tables name their column "Edge".
- Rests on: evaluation-book-explorer.md.

## 2026-10-24 · Each main line turn and each position's best move gets one sentence, built from the book's facts
- Decided by: the designer
- Why: stories 11 and 12 ask for each move's reason, and the ethical stance asks for understanding over memory. Design
  04 builds the review's sentences from checked engine facts, never from a language model.
- The facts: how a line ends (its symbol), how the other book moves end, the traps that a move avoids or sets, a trap's
  two values and its refutation.
- Rejected: sentences on what a turn encloses (design 30 found them exact and misleading), and no sentences in the first
  version.
- Rests on: evaluation-book-explorer.md, "No book move says why it is played"; designs 04 and 30.
