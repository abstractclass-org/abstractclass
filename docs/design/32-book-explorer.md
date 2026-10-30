# The opening book explorer

**Status:** in force. The book file's form, its loader, a test book ("The book file"), the sentences (item 6) and the
book's table ("The table") are built. The review and the Analysis board show the table ("Where the pages show it").
The review's own parts (item 4) are built: the Report's rows, the move list's mark and the book's values at a book
position ("The review"). Openings is not built. The work uses the test book, and it goes live with the engine
repository's book (request 22).
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

   - **"Review by"** (the display setting of design 10) rules the rows too. By edge, and in the middle of a turn, each
     row is one edge. By turn, the default, a turn's start has whole turns: each row is a book move, then a book move
     of the position that it reaches. The start is not a turn's start here, because its turn has one edge. Switching
     needs no new search: the book holds the position after each edge, with its minimaxed values. Where no book move
     at a turn's start has a book move after it, the book holds no whole turn there, and each row is one edge.
     - **A turn's row** names its two edges. Its win chance is the one after its second edge. Its quality label comes
       from its loss against the best turn, by the review's rule for a turn (design 10). By the book's minimax, the
       best turn has the position's best win chance: the first book move's, or the best move outside the book's.
     - **One row a position:** two orders of the same two edges reach the same position (the book's position after
       the second edge), so they are one row with one quality label, in every group. The row keeps the order that the
       book prefers: its first edge is the better book move. In the test book, 31 of the 284 whole turns at its 78 turn
       starts are a second order of another turn, at 24 of the starts.
     - **The groups by turn:** "Fine turns", "Other book turns", "Traps" (each turn that holds a trap's edge, with its
       refutation) and "Best turn outside the book". The table orders the fine and the other turns by the win chance
       for the side to move. The best 8 of them show, and the rest after a button ("Show 11 more turns" for 19), which
       comes before the traps. The traps and the best turn outside the book always show.
     - **The best turn outside the book** is the best for the side to move of two kinds of turn. The first kind is the
       best first edge outside the book (the position's "other" row). The book does not hold its second edge, so its
       row names one edge. The second kind is a book move, then the best second edge outside the book at the position
       that the move reaches.
     - **A trap's turn:** the trap's edge is the first or the second. A second edge's refutation is the enemy's turn
       after it. A first edge's refutation starts with the rest of its turn: after that second edge, the row's
       refutation is the rest. After another second edge, the book holds no refutation, and the row has none.
     - **The board** draws the first edge of each row that shows, with the number of the first row that starts with
       it. The row pointed at draws its two edges as its line, numbered as the engine's line is. A click on a row, or
       on its number, plays its two edges.
   - **A row** shows the edge and its quality label's badge on one line. Then come the win chance for the side to
     move and the position symbol at the end of the move's line. The edge takes the width of the longest edge
     (A10-D10, 7 characters), so the badges line up in a column. By turn, each of a row's two edges takes that width.
     Where the column has no room for both on one line, the second edge and the badge go under the first edge, so the
     heads stay on one line and the badges line up there too. A last line has words only, where the row has
     them: "a trap" or "the book ends here". So a row with none is one line. The badge and the symbol show no words, as
     Lichess shows its position symbols: the label's word ("Excellent") and the symbol's name ("Blue is slightly
     better") are their titles and their accessible names. The title row's symbol keeps its words, on one line, so
     the table shows once what the symbols mean.
   - **The win chance shows alone** ("52.3%"), in the rows and in the title row. Its bounds (KataGo's book bounds) are
     its title, "Between 48.1% and 56.4%.", and assistive technology reads them after it. The table has no switch for
     its values and no column for the turns that the book goes on under a move.
   - **Each symbol takes a shade of its side's colour by its strength:** slightly better (⩲, ⩱) the least saturated,
     better (±, ∓) the middle, and winning (+−, −+) the most saturated. = and ∞ take the text's colour, a neutral
     colour: near black in the light theme, near white in the dark theme. The stronger the position, the farther its
     shade from the text's colour: "slightly better" is near the text's colour, and "winning" is the most saturated. A
     side's three shades step evenly in lightness, so each strength differs as much from the next. Each shade has a
     contrast of at least 3:1 against the panel and a lit row, in both themes (WCAG 1.4.11). "Winning" has the lowest
     contrast, but its saturation makes it the most distinct from the neutral symbols and the text. This is a departure
     from Lichess, whose symbols have no colour. Enclosure's sides are Blue and Red, so the colour names the side. The
     colour does not carry the meaning alone: the symbol's shape and its name give the side and the strength too.
   - **The table and the board point at each other:** the board numbers the rows' moves as the candidates are numbered
     (design 07). The pointer on a row highlights its edge and draws its line. The pointer on a numbered edge
     highlights its row.
4. **The review:**
   - **The Report** has an opening row: "The game left the book at turn {n}: {side}, {move}, {label}." When the review
     labels a book move that the game played before it left worse than Good, the row names the worst one: "Before
     that, at turn {n}, {side} played {move}, a book move and {a label}." When that book move is the one that reached
     the end of the book, the row says "The last book move, {move}, is {a label}.": "Before that" would put it before
     the end that it reached. When the review labels no earlier book move worse than Good, the row says nothing of
     one. A game with a trap has a trap row: "Turn {n}: {side} played a trap, {move}. {other side} played its
     refutation." or "… did not play its refutation." A click on a row goes to the position before the move, and
     turns the book on for that review only.
   - **The move list** marks each book move: an edge that the book lists at its position, when the position after it is
     in the book too. A move that reaches a book position by another move order is not a book move.
     The mark takes the quality label's slot, whatever the label, from Great to Blunder. By turn, a turn shows it when
     all its edges are book moves, with the turn's quality label. The display setting "Book moves" gives two forms:
     the quality label on the book's brown (the default), or an open book in the quality label's colour. Each form
     follows the setting "Quality labels": a badge, or the quality mark alone. The moves keep their review labels,
     which are the book's on a book move (the next bullet).
   - **The book's values rule a book position:** at each position of the game that the book holds, the review takes
     the book's values in place of the engine's search, and does not search the position ("The review", "A book
     position's values"). The book's searches are the deeper (item 5). So a book move has one quality label and one
     loss on the page, the book's: in the move list, on its book mark, in the Report's opening row, in the charts and
     the counts, and in the book's table. The review's rules (design 10) give the labels from the book's values, as
     the book's rules do. The book's table has no row for the game's move. The opening row follows "Review by", as
     the table does. By turn it names the turn that left the book, with the turn's quality label, and it goes to the
     turn's start. Its earlier book turn worse than Good is a whole turn too, with the turn's quality label: "Before
     that, at turn {n}, {side} played {turn}, a book turn and {a label}.", or "The last book turn, {turn}, is {a
     label}.". By edge it names the edge and its quality label.
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
    badge and its symbol without words, as on a wide screen. The title row's symbol keeps its words, and the shape and
    the colour of each row's symbol say the side and the strength. The step bar is fixed to the bottom of the screen on
    Openings, the review and the Analysis board (a change to design 06), so that the step back is in view whenever the
    board is.
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
  - **The review marks where the game left the book,** in the Report's opening row, and each book move in the move
    list. Lichess and KataGo show the end of the book only by an empty table, and a player who does not look at the
    table at that move never learns it.
  - **A book move's mark keeps its quality label.** Chess.com's "Book" takes the place of the move's label, so a book
    move never shows as a poor move. A book move can still be a poor one: the book keeps the moves worse than Good
    that tempt, and the traps. So the mark shows the quality label: on the book's brown, or with the book in the
    quality label's colour. The default follows Chess.com's Book mark, a brown disc.
  - **The table takes the candidates' place,** not a box under the move list as on Lichess. A review's move list holds
    120 edges and needs the column's height. At a book position, the book's values are deeper than the live engine's,
    so the table shows the better set and the switch shows the other.
  - **The review takes the book's values at a book position,** where Lichess and KataGo keep the review's engine
    apart from the book. The book's searches are deeper than the review's (item 5), and KataGo's book method
    minimaxes them through the book's tree. With the book's values, a book move has the label and the loss that the
    book's table gives it, and the review saves its search of the opening. The cost: one review mixes two networks,
    the book's and the review's, and the move that leaves the book compares the book's value before it with a search
    after it ("A book position's values").
  - **The table has no game counts.** The book has none. The heading's title says where the book comes from, so the
    player does not read the rows' order as popularity.
  - **The move list shows the book's tree folded around the path.** No surveyed tool draws the tree around the
    position. The second prototype's view showed that the variations need folding.
  - **The table lists the other move orders.** No surveyed tool does. In the third prototype's book, all 31 positions
    that two move orders reach are a turn's two edges in the other order, so a turn's pair is one variation, and the
    list is for move orders across turns.
  - **A row's symbol takes a shade of its side's colour.** Lichess's position symbols have no colour. Enclosure's sides
    are Blue and Red, so the colour names the side, and its shade the strength.
- **One edge at a time, and whole turns by turn:** the book stores a position after each edge, and every surveyed
  explorer lists one move at a time. By edge and in a turn's middle, the table does too. By turn, the review judges
  whole turns, so a turn's start lists whole turns, and the table's quality labels agree with the move list's.
  This is a departure: no published explorer lists turns of two moves, because chess and Go have one move a turn. In
  the test book, 78 turn starts after turn 1 have book moves. With one row a position, they give a median of 1 whole
  turn and at most 33, and 6 of them give more than 8. So the table shows the best 8, and the rest after "Show more".
  The traps always show, so 5 starts have the button. The move list keeps the review's turns.

## Alternatives

- **A page with a layout of its own,** as KataGo's book pages and OGS's Joseki Explorer have. The review's controls,
  lines and area map would have to be built twice.
- **The book on the Analysis board's own state.** It would overwrite the player's lines (one board a browser, design
  21).
- **A box under the move list,** as on Lichess. It would leave a review's move list a few rows.
- **Whole turns as one choice, at every position.** The list grows as each first edge times its second edges (33
  whole turns at one turn's start of the test book), and a turn's middle has no whole turn to list. So whole turns
  come only by turn, at a turn's start, with the best 8 first.
- **Single edges by turn too.** The table then labelled each edge while the move list labelled each turn, and the
  Report's opening row named an edge where the review judges the turn.
- **A row for each order of a turn's two edges.** The same position then had two rows with the same win chance, and
  two labels: D9-G10 D10-G9 was Best and D10-G9 D9-G10 Excellent at turn 3 of the test game book-left-review.json.
- **The first 8 rows of the table, traps too, before "Show more".** At the turn's start with 33 whole turns, the 8
  traps came after 25 other turns, all under "Show more". The traps are what a player must learn, so they always
  show.
- **Heads on two lines and half the padding in a narrow box.** The table then fitted a window 360 pixels wide, but
  "Blue wins" and "Line ends" took two lines, and the head row was 49 pixels high, where by edge it is 29. A turn's
  second edge under its first takes the room from the rows, and the heads stay on one line.
- **A smaller font for a turn's edges.** It would make the edges harder to read, and the edges' own lines give the
  room.
- **The review's own labels on book moves,** from its search of each book position, which this design held before.
  One move then had two labels on one page: in book-left-review.json the table called O11-Q10 an
  Inaccuracy and the move list Good. The review's labels came from the shallower search.
- **The book's label in the Opening row only,** and the review's in the move list and on the mark. The page still gave
  one move two labels.
- **Chess.com's "Book" in the place of the label.** It hides the quality of a book move worse than Good.
- **One mark at the last book move of each stretch in the book,** beside the turn's number ("Last move in the book").
  Nothing said what it meant without a pointer, and the moves before it carried nothing, so it did not show how far
  the game followed the book.
- **One book icon for every book move.** It hides the move's quality, as Chess.com's "Book" does.
- **The book icon, but the label where it is Great or worse than Good.** A book move that the review calls an
  Inaccuracy or worse then never shows as a book move.
- **The label's badge with a small book tab.** At the badge's size, the tab reads as a dot.
- **The label's colour on the brown disc.** The labels' colours have a contrast of 1.04:1 (Best) to 1.47:1
  (Inaccuracy) against the brown, so their marks almost disappear.
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
- **Symbols' shades that rise in contrast with strength,** from just over 3:1 against a lit row to about 10:1
  against the panel. "Winning" then came nearest the text's colour, the colour of the neutral symbols = and ∞: near
  black in the light theme, near white in the dark theme. So the strongest position looked the most like = and ∞.
- **Shades that differ in chroma alone,** at the far shade's lightness. ⩲ and ± looked alike on strokes 1.6 units
  wide: neighbouring shades were only 0.04 to 0.05 apart in OKLab, against 0.10 to 0.12 on the line from the text's
  colour. In the light theme, Red's "slightly better" shade had a contrast of 2.96:1 against a lit row, under the floor.
- **A far shade at the edge of what sRGB can show** (chroma 0.20 to 0.25 in OKLCH). It is more saturated than the
  site's own `--blue` and `--red`, and its shades are only 1 to 13% farther apart in OKLab.
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
  accessible name, in its shade.
- **The shades** are Hedge School's colour tokens, in `apps/hedgeschool/src/app.css`, in both themes:
  `--blue-slightly-better`, `--blue-better` and `--blue-winning`, and the same three for Red. A side's three shades
  lie on a straight line in OKLCH, with the hue of the side's colour. The line starts at the lightness and the chroma
  of `--text` and ends at the side's far shade. The shades are at 0.45, 0.72 and 1 of the way, in lightness and
  chroma together. The far shade is "winning". It has the chroma of `--blue` or `--red` in its theme (cut to what sRGB
  can show), at the lightness where its contrast against panel-2 (a lit row) is 3.1:1.
  `apps/hedgeschool/src/symbolShades.test.ts` checks that each shade has a contrast of at least 3:1 against the panel
  and panel-2, that the stronger the position, the farther its shade from `--text` in OKLab and the lower its
  contrast, and that the steps in CIELAB L* differ by less than 1.
- **The badges:** a row's quality label is `LabelBadge` with its option `named`, which gives the label's word as its
  title and its accessible name. Without the option, `LabelBadge` stays hidden from assistive technology, because the
  move list and the Report give the word in their own text. The edge before it is 7 characters of the monospaced font
  wide (`7ch`), the longest edge's width, so the badges start at one place.
- **The widths:** the last column ("Line ends") is as narrow as its head on one line, because its symbols are
  narrower than its head. The edge's column takes the rest. Every head stays on one line. By turn, a row's two edges
  on one line need 154 pixels, and the table 313 pixels. A window 360 pixels wide with its scroll bars gives the
  table's box 264 pixels. So a turn's edges wrap (`flex-wrap`): the second edge and the badge, which stay together, go
  under the first edge where the column has no room for both. The table then needs the width that it needs by edge,
  and every row wraps at the same width, so the badges stay at one place. The layout test (`npm run test:layout`)
  checks the review with the table after the game's first edge, by edge and by turn. By edge the rows' edges have 6
  and 7 characters. By turn the rows are turn 2's whole turns. At every size from 360 pixels wide, the table fits its
  box, each head stays on one line, and the rows' badges start at one place. The sweep runs in full by edge too. The
  move list by edge fits from 360 pixels wide: where a turn's two moves do not fit side by side, the second move goes
  under the first (beads abscls-8n02).
- **The sentence under the table** is the page's: the lab page gives it from `sentences.ts`, the sentence of the row
  pointed at or focused (`moveSentence`), else the best move's (`bestMoveSentence`). By turn, the review gives the
  turns' sentences of the same templates (`turnSentence`, `bestTurnSentence`): "D10-G9 Q11-T10 is the best of the 3
  fine turns here."
- **The rows by turn** are `turnRows` in `rows.ts`, from the position and the book's position after each of its book
  moves. The page loads those positions first: until they load, the table says that the book loads. Two turns that
  reach one position (the book move's `to`) are one row: the first in the book's order of first edges.
- **The end of the book** (item 5): a position with no book move shows "End of the book" with its symbol in words
  (`endSentence`), and then the best move outside the book in its row, as at any other position. Each end position
  of the test book has such a move.
- **The state at a position** (`lookup.svelte.ts`): loading, in the book, outside it, or failed until "Try again".
- **The lab page** `/lab/book-table` shows the board and the table on the test book. It has no engine: it draws the
  book's positions from their notation, with no regions. It has no display settings, so its rows are single edges.
  Openings, when it is built, follows its own "Review by", as the Analysis board does.

### Where the pages show it

The review and the Analysis board draw one view (`ReviewView.svelte`), and it puts the table in its analysis column
for both (items 3 and 8). The page's part of the work is in `apps/hedgeschool/src/lib/book/place.svelte.ts`:

- **Where it shows:** in the early edition, where the book's index loads. The site loads one book for a visit. A build
  that serves no book keeps the analysis column as it was, with no switch. A deployed site serves no test book, so the
  live site does not change until the engine's book comes.
- **The kept choice:** the switch starts on "Candidates". The browser keeps "Book" or "Candidates" for the review and
  for the Analysis board apart.
- **Outside the book,** the table shows the engine's candidates alone, as the column does with no book. The key o
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
- **The opening row** names the first departure. It follows "Review by". By edge, it names the edge that left, with
  the review's quality label of the edge. By turn, it names the turn that left, with the review's quality label of
  the turn (`openingRow` and `openingSentence` in `game.ts`). The edge that left is the turn's first or its second.
  The row goes to the turn's start, where the table shows whole turns. The row has no quality label for the player
  that "Review for" leaves out. A game that followed the book
  to its end gives the turn of the book move that reached the end. "Before that" names the book move that the game
  played before the departure and that the review labels worst (`worstBookPlay` in `game.ts`). The review's label of
  the move is the one that the move list shows. Only a label worse than Good counts. The worst label comes first
  (Inaccuracy, then Mistake, then Blunder), and between equal labels the larger loss by the review's values comes
  first. A move that the review has not labeled yet, or has no label for (the player that "Review for" leaves out),
  is not named. When no earlier book move has a label worse than Good, the row says nothing of one. When the move
  reached the end, the row says "The last book move, G10-J13, is an Inaccuracy." in place of "Before that". The
  opening row does not name a trap, because the trap has its own row. The review gives the row its labels and losses
  as a function from an edge's index (`judged` in `openingRow`).
- **"Before that" by turn** names a whole book turn (`earlierTurns` in `game.ts`). The candidates are the game's turns
  before the departure whose edges are all book moves and none a trap. The review's label and loss of a turn are the
  turn's own (design 10), found by the index of the turn's first edge. Blue's first turn has one edge, and the row
  names it as a book move. The review's label and loss of a book move or turn are the book's ("A book position's
  values"). In the test game book-left-review.json, O11-Q10 is an Inaccuracy, a loss of 7.7% (by turn, N11-Q10
  O11-Q10, the same loss), in the row, in the move list, on its book mark and in the table.
- **A trap's row** says that the other side played its refutation when the game reached the refutation's turn and the
  other side's edges are the refutation's, in either order. The game reaches that turn when the side that played the
  trap ends its turn as the refutation does. Otherwise, the row gives the trap's first sentence only. A game that ends
  before the refutation's turn gets that sentence only too. A game that ends in the book, as a game imported while it
  is played, has no opening row.
- **The marks** are on each book move (`gameOpening`, `bookMoves`). A move that comes back to the book from a
  position outside it is not a book move, so the marks of a return start at the move after it. A book move with no
  quality label yet, or of the player that "Review for" leaves out, has no mark. Each mark's title and accessible name
  are the move's own tooltip, with "Book move" before it and the position symbol after the move at its end, in the
  symbol's words: "Book move · Best: +0.6% · +2.0 · Lead: Blue +14.9 · Equal position after it". By turn, they are the
  turn's tooltip and the position after the turn: "Book move · Good: −3.3% · −7.5 (+2.9, −10.4) · Blue is better after
  it". The mark is inside the move's button, or the turn's cell, so its title covers theirs: it keeps their numbers.
  The mark is in the label's slot, which has a fixed width (2.2 characters), so it never widens a move's column
  (`npm run test:layout`). By edge, the move's button tells a click on the mark from a click on the move.
- **The book's brown** is `--book` in `packages/review/src/review.css`: Chess.com's Book colour, #a88865, in the dark
  theme (4.5:1 against the panel, 3.9:1 against panel-2), and #a4835e, the same hue a little darker, in the light
  theme (3.5:1 and 3.0:1). #a88865 has only 2.8:1 against the light panel-2. White on the brown has 3.3:1 and 3.5:1,
  more than white on the Good (2.3:1), Inaccuracy (2.2:1) and Excellent (2.8:1) badges.
- **A click** on a row goes to the position before its move, and a click on a mark to the position before its move or
  its turn. Each turns the book on for this review only (`BookPlace.showForNow`): the switch shows "Book", and the
  choice that the browser keeps does not change. Only the switch and the key o change it. Below 1,260 pixels, the
  click opens the Analysis tab too.
- **The book did not load,** or a part of the game's path did not load: the Report has no opening row, and the move
  list has no mark. The rest of the review works. The table says what failed.
- **The test games:** `apps/hedgeschool/scripts/test-fixture.mjs` makes reviewed games that meet the test book in each
  way, with a given opening: `apps/hedgeschool/tests/fixtures/book-left-review.json`, `book-never-review.json` (it
  comes back too), `book-trap-review.json` and `book-turn-label-review.json`. In `book-turn-label-review.json`, Red
  leaves the book at turn 2 with N8-Q10, a Good edge. Red's next edge, N9-Q10, ends the turn, and the turn is a
  Blunder. So the opening row gives Good by edge and Blunder by turn. The layout test's game (`hedgefund-review.json`)
  follows the test book to its end.

### A book position's values

At each position of the game that the book holds, the review takes the book's values in place of the engine's search
(`apps/hedgeschool/src/lib/book/results.ts`, `GameAnalysis.useBook` in `packages/analysis/src/analysis.svelte.ts`).
The review's own rules (design 10) then give the labels, the losses, the charts and the counts from those values, as
from a search. A unit test checks every book move of the test book, by edge and by turn in both orders: the review's
label and loss are the ones that the book's table gives (434 edges, and 284 whole turns with each of their edges).

- **What the book's fields replace** in a search's result (`Analysis` in `packages/analysis/src/model.ts`, with
  `book`):
  - `value`: the win chance and the lead. By the book's minimax, the position's value is the best of the first book
    move's and the best move outside the book's, so the loss of a book move is the book's (`moveLoss`).
  - `moves` and `outside`: the candidates, the best for the side to move first. The first is the engine's first
    choice, which a Best needs. The first book move's line goes on with the best move after it, which a Best by turn
    needs: the best turn in the other order is Best too, as the table's one row a position is. By edge, each edge of
    that turn keeps the label that the table by edge gives it. The review's rule that makes both edges of the engine's
    best turn in the other order Best (design 10) does not apply to an edge between two positions with the book's
    values: the book's minimax values each such edge. It still applies to an edge that leaves the book or comes into
    it. At the start, each edge's mirror image follows it as its twin, as the engine lists twins.
  - `complexity`: the position's complexity (design 14), and so the hard positions and the accuracy's weights.
  - `area`: the area map (design 30). The map stage searches no book position.
  - The book's source: the visits of its deep search, as the result's visits. A label needs no more: the book's values
    count as deep enough at any review depth.
- **What the review still takes from a search at a book position:** nothing for its labels. The analysis column shows
  the engine's own search of the position on screen (design 16, the position on screen), as at any position: the
  switch's "Candidates" and the engine header (item 3). The threat (design 31) searches the position after a pass, as
  everywhere. The engine's results stay apart from the book's (`searched` in `ReviewData`), and the store keeps them.
- **The move that leaves the book** compares the book's value before it with the review's search after it: mixed
  depths, as design 16 accepts where a position holds a deeper result. A Great needs two equal searches (design 10),
  and the book's minimax is no search of a depth that the review can match. So no move from or into a book position is
  Great, and the book gives none either (item 6, "The labels"). The move can be Best: the book's best move outside the
  book is a candidate. A later move can be Great. Where the position before the other player's last turn is a book
  position, the Great's test of what that turn gave reads the book's value there, as the labels do (`earlierAt`).
- **A book that loads after the review started:** its values come once the parts that the game's positions need have
  loaded (`giveBook` in `reviewBook.ts`), and the stages skip each book position whose search still waits for an
  engine. A search that ran
  before keeps its result for the analysis column, and the labels take the book's values.
- **A book that does not load:** no values come, and the review searches every position, as with no book. A part that
  does not load leaves its positions to the review's search. The review does not try again: the table's "Try again"
  serves the table.
- **A review stored before:** its results at the book's positions stay in the store, and the review opens with them.
  The book's values then take their place in the labels, though a stored result is deeper (design 16, "The deepest
  result, everywhere"): the book's searches are the deeper by design. A result deeper than the review's at a book
  position does not count in the report's note on deeper searches.
- **The annotated record** that the home page exports from the store takes the book's values too, so it gives the
  review's labels. A review snapshot (design 20) takes them as the review did.
- **A review snapshot** asks the store for a result at each of the game's positions but the start and the positions
  that the book holds: the review did not search those. So the review snapshot starts the rules and waits for the
  book's values before it checks the store (`openSnapshot` in `src/routes/review/+page.svelte`, `snapshotSearch` in
  `packages/analysis/src/cache.ts`). Where the book does not load, it asks for every position, as without the book.
  The removal of earlier results (design 20, item 8) reads no book. For a mark that names its search, it keeps that
  search's results where they hold any position of the game's line, so it keeps what such a review snapshot reads. It
  can keep the results of a review snapshot that does not open, until the game is reviewed again. A mark that names no
  search is older than the book: its review searched every position. Its review snapshot and the removal ask for every
  position, as before.
- **The Analysis board and a set-up board** take no book values: the board's analysis searches its positions as
  before, and its labels stay on the moves that the player evaluates (design 21). The book's table shows the book there.
- **Values with three decimals:** the book's win chances have three decimals, so a loss can fall on a band's limit
  (0.55 less 0.5 is 0.05, Good). A quality label rounds the loss to 6 decimals (`classify` in
  `packages/analysis/src/labels.ts`), as the book's rule does, so that a floating-point error does not put it in the
  next band. Without the rounding, one book move of the test book went to the next band.

## Where it is

The book file's form, its loader and their unit tests are in `apps/hedgeschool/src/lib/book/`, the script that makes
the test book in `apps/hedgeschool/scripts/test-book.mjs`, and the test book in
`apps/hedgeschool/tests/fixtures/test-book/` ("The book file"). The sentences and the symbols are in
`apps/hedgeschool/src/lib/book/sentences.ts` and `symbols.ts` (item 6). The table is in `apps/hedgeschool/src/lib/book/`
too, with its lab page in `apps/hedgeschool/src/routes/lab/book-table/` ("The table"). The review and the Analysis
board show it through `place.svelte.ts` ("Where the pages show it"). The book's values in the review are in
`apps/hedgeschool/src/lib/book/results.ts`, `reviewBook.ts` and `GameAnalysis.useBook` ("A book position's
values"). Openings is not built. The design's files are in [../ux/book-explorer/](../ux/book-explorer/):
`context-book-explorer.md`, `stories-book-explorer.md`, `journey-book-explorer.md` and its diagram,
`sitemap-book-explorer.md` and its diagram, `wireframes-book-explorer.html`, `evaluation-book-explorer.md` and
`decisions.md`. The prototypes' code is on the branches abscls-tpaj.1, abscls-tpaj.2
and abscls-tpaj.3, never merged.

## Log entries

- [decisions/product.md](../decisions/product.md), "The opening book explorer, from user stories to wireframes"
  (2026-10-24).
- [decisions/product.md](../decisions/product.md), "The book in the review: its rows, its mark and the game's row"
  (2026-10-25).
- [decisions/product.md](../decisions/product.md), "The book's table: badges and symbols alone, the win chance
  alone, no game's row" (2026-10-27).
- [decisions/product.md](../decisions/product.md), "A mark on each book move, in two forms" (2026-10-27).
- [decisions/product.md](../decisions/product.md), "The book's table follows Review by: whole turns at a turn's
  start" (2026-10-27).
- [decisions/product.md](../decisions/product.md), "The Opening row gives the review's label of the earlier book
  move" (2026-10-27), replaced by the next entry.
- [decisions/product.md](../decisions/product.md), "A book move takes the book's label and loss: the review takes a
  book position's values from the book" (2026-10-30).
