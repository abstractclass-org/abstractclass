# The book explorer: structure

## Where the book lives

The book has one page and one place in two others:

| Where | What the player sees | The book's state |
|---|---|---|
| **Openings** (`/openings`), a page of its own | the book's board: the Analysis board's layout, the book's table in the analysis column, the book's tree in the move list | always on |
| **The review** (`/review`) | the book's table in place of the engine's candidates, at the game's book positions | off until the player turns it on, or clicks the Report's opening row |
| **The Analysis board** (`/analysis`) | the same as in the review, at the board's book positions | off until the player turns it on |

The book is reference material for the opening, and the review and the Analysis board are where a player meets the
opening's positions. So the book comes to the position, as Lichess's explorer comes to its analysis board
([03-opening-explorers.md](../../research/03-opening-explorers.md), section 3), and it also has a page where it is
the subject, as KataGo's book pages are (section 4).

## The header

Practice, Review, Analysis, **Openings**, then Tools, The notation, About and "Support Us".

- **After Analysis:** Openings is a place to study, as Analysis is a place to think. Both sit before the pages about
  the site.
- **Below 1,024 pixels** it goes into the ☰ menu with the other tabs (design 22, item 5).
- **When Learn comes** (design 22 names Puzzles and Learn as later tabs), Openings can move under it, beside the
  lessons. The address stays.
- The header's links need 860 pixels for one row now (design 22, item 5). One more tab of about 80 pixels still fits
  above the menu's 1,024 pixels. The layout sweep (`npm run test:layout`) checks it.

## The addresses

The page takes its own ways in after the `#`, as every page does (design 22, items 1 to 3):

| Address | Opens |
|---|---|
| `/openings` | the book's board kept in this browser, at its last position. The first visit opens at the start. |
| `/openings#record=<record>` | the book's board at the end of the record's line. The line replaces the kept one. |
| `…&at=<n>` | the position n edges from the start of the line |

- **From the review and the Analysis board:** "Study in Openings", in the book's table, opens
  `/openings#record=<the line to the position on screen>`.
- **From Openings:** "Open in Analysis", at any position, opens `/analysis#record=<the path>&at=<n>` (design 22).
- **A position outside the book** in a record: the book's board shows the line, and the analysis column shows "Not in
  the book" with a link to the line's last book position.
- **The analytics** start once the page has taken the record out of its address, as on the other pages
  (design 22, item 3).

## The analysis column

The analysis column keeps its order on all three pages: the engine header, then the table, then the move list, then
the step bar (design 06, item 2).

- **The table shows the book or the engine's candidates.** One switch in the table's title row ("Book" and
  "Candidates") chooses, on all three pages. Its name differs from the engine header's switch ("Engine"), which turns
  the live search on and off.
- **The switch shows what the table holds.** Outside the book, "Candidates" shows as chosen and "Book" is
  unavailable, with "Not in the book" as the reason. The player's choice of "Book" comes back at the next book
  position. On Openings, "Candidates" at a book position starts the live engine and shows its candidates, and "Book"
  stops it.
- **At a position outside the book,** one line in the title row, not a box, names the last book position on the path
  ("Not in the book. Last book position: turn 3."), with "Go there" and "Study in Openings".
- **The engine header stays** on every page. On Openings, the live engine waits at a book position and searches
  outside the book, so that the board does not spend the player's CPU on a position that the book already answers.
- **The switch and its state:** the key o also turns the book on and off. The browser keeps the choice for the
  review and for the Analysis board, each apart. A click on the Report's opening row turns the book on for that
  review only.

The table takes the candidates' place, not a box of its own under the move list as on Lichess:

- **Height:** the move list takes the height that the column leaves (design 06, item 2). A review's move list holds 120
  edges, and a box under it would leave it a few rows.
- **The better numbers win:** at a book position, the book's values come from deeper searches than the live engine's.
  The table shows one set of candidates, the better one, and the switch shows the other.
- **The prototype:** the third prototype's book mode puts the book's table in this place (branch abscls-tpaj.3).

## Inside the book's table

Each row of the table is exactly one of these. The groups come in this order:

| Group | Rows | Order |
|---|---|---|
| **Fine moves** | the book moves that are Best, Great, Excellent or Good | by value, the best first |
| **Other book moves** | the book moves that the deeper values made worse than Good, with their labels | by value, the best first |
| **Traps** | each trap of the position, with its two values. A book move that is a trap is here, not in the groups above. | the largest gap between the two values first |
| **Best outside the book** | one row: the best move outside the book and its value, as KataGo's "other" row | — |
| **Your game** (the review only) | the game's move at this position, when it is in none of the groups above, with the review's label and value in its move cell ("In your review: Good, Blue 46.5%") and "—" in the book's columns. When it is in a group above, its row carries the tag "Your game" instead. | — |

- A move is in one group only.
- With the values closed, a row shows the edge with its label under it, and the symbol at its line's end in words. A
  trap's row also shows its two values. "Show the values" adds the win chance, the bounds and the book's depth under
  the move.
- The table's title row names the position's turn, the side to move and the edge of the turn, and the symbol of the
  position. Its second line gives the book's source and version ("From the engine's analysis, not from games that
  people played. Book of …") and the switch "Show the values". Both sit above the table, so that they stay in place
  when the table changes height.

## Wayfinding on Openings

| The player asks | The answer on the page |
|---|---|
| Where am I? | the move list's path from the start, marked, every other branch folded; the step bar's status line (the edge, the turn, the side to move); the table's title row |
| Where can I go? | the table's rows (the moves from here); the chevrons in the move list (the alternatives at each move of the path, without playing them) |
| Am I on the right track? | each row's label and the symbol at its line's end, in words |
| Am I there? | "End of the book" with the symbol in words, at a line's end |
| How do I get back? | a click on any move of the path; the step bar's first step (the start); "Back to the main line" |

### The tree in the move list

- **The main line** is the book's main line: the best move at each position.
- **The other book moves** at each position hang under the move before them, folded under a chevron: down when
  folded, up when open (the prototype's).
- **The path to the position on screen** is always open, from where it leaves the main line. Every other branch is
  folded, until the player opens it.
- **Traps** hang under the move before them with the other branches, marked as traps, each followed by its refutation.

### One position, several move orders

The book is a graph: two move orders can reach one position. The move list is a tree.

- **The position's subtree shows once,** under its first parent in the book's order (the main line first, then by
  value), as KataGo's pages name one canonical parent.
- **Under every other parent,** the branch ends at the shared position with a link: "Continues in 2. N11-Q10 L10-N11"
  (the first parent's line). A click goes there, and the path follows the first parent.
- **The table's title row** lists the other move orders: "Also reached by: …", each a link.

### Mirror images

The book stores a position and its mirror image as one. The page shows each position the way the player reached it,
and mirrors the book's moves to match (KataGo's `symmetry` parameter, section 4 of the survey). The move list and the
address follow the player's line, not the stored one.

## Labels

| Label | Where | Why this word |
|---|---|---|
| **Openings** | the header, the page's title | names what the player finds: the openings. Lichess's opening pages and Chess.com's use the same word. |
| **Book** | the table's switch, short strings ("Not in the book", "End of the book") | the moves that the engine studied from the start. Most are fine moves, and the others show their labels. Players of both games say "book moves" for known moves, and KataGo calls its trees books. |
| **Opening book** | the table's title when the column has room | the full name, once |
| **Candidates** | the table's other switch | the engine's candidate moves, as the site calls them (design 07). Not "Engine", which names the engine header's switch (design 09). |
| **Fine moves**, **Other book moves**, **Traps**, **Best outside the book**, **Your game** | the table's groups and tags | what each row is, in the player's words |
| **Study in Openings** | the review's and the Analysis board's table | names the place it opens |
| **Open in Analysis** | Openings | the same form, for the other way |
| **Back to the main line** | Openings | names the destination |
| **Last move in the book** | the tooltip of the review's book mark | what the mark marks |

Words kept out:

- **Explorer:** Lichess's and Chess.com's word for a database of games played. The book has no games.
- **Theory:** it suggests what people agreed over time. The book is one engine's analysis.
- **Repertoire:** kept for the player's own chosen lines, a later feature (story 13).
- **Joseki:** a word of Go for local sequences in a corner. Enclosure's openings are whole-board.

## Search and browse

- **Browse only.** The book's first version is small (a few turns), and its positions have no names to search. The
  way in is the start, a game's position, or a line.
- **A line is the search:** a record pasted on the Analysis board, then "Study in Openings", finds its position in the
  book.
- **No result** is "Not in the book", always with the last book position of the line and a link to it.

## IA test plan

The players of Enclosure are few, so the tests are small and qualitative.

| Test | Players | Task | Good result |
|---|---|---|---|
| First click | 5 | "Where would you study the first turns of the game?" on the site's header | 4 of 5 click Openings |
| Task test, review | 5 | in a reviewed game: "Find the turn where this game left the book, and the book's best move there." | 4 of 5 in one minute, with no help |
| Task test, Openings | 5 | "Find a trap in the main line's first three turns, and play its refutation." | 4 of 5 in two minutes |
| Task test, the way back | 5 | after the trap: "Go back to the main line at turn 2." | 5 of 5, by the path or "Back to the main line" |
| Label check | 5 | after the tasks: "What do you expect under 'Openings'? Under 'Book' and 'Engine'?" | the answers name the book's lines and the live search |
