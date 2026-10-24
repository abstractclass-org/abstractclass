# The book explorer: two journeys

## Problem statement

A player who wants to learn the opening of Enclosure has no reference today. The review labels each move, but it does
not say which moves are the known good ones, where the game left them, or which traps the game met. The Analysis
board searches one position at a time, and its live search on the player's CPU is shallower than the book's.

The book answers two questions, in two journeys:

- **After a game:** where did my game leave the book, what did the book play there, and did either side meet a trap?
- **Study:** what is the main line, what else is fine at each turn, and which traps must I know?

Each journey works when the player gets the book's answer at the position that they ask about, in one action, and
leaves with a line that they can play.

## User context and variations

| | After a game | Study |
|---|---|---|
| Who | a player who reviews their own game | a player who learns the opening, a new player first of all |
| Mindset | looks back at one game, wants the one point that matters | looks forward, unhurried, 10 to 30 minutes |
| Starts from | the review of a game (design 06) | the site's menu, the end of a lesson, or the review |
| Already knows | the game's moves, its labels | the rules (lessons), little or no theory |
| Leaves with | the book's move at the point where the game left, and the trap's refutation if there was one | the main line's first turns, the fine alternatives at each turn, the traps |
| Device | desktop, sometimes a phone after a game on meaf.us | desktop |

A new player and an experienced player see the same book. The new player sees the main line and its reason first,
and opens the values on request. The experienced player keeps the values open: the setting stays in the browser.

## The book on the site

The book is a panel that shows the book at the position on the board, in the review and on the Analysis board, as
Lichess's opening explorer is a panel of its analysis board. A menu entry opens the book's board: the Analysis board's
layout and controls at the start, with the panel open and a state of its own, so that the player's work on the
Analysis board stays as it was. So both journeys use one board, one move list and one set of controls, which the
player already knows from the review.

The panel is the book's table, in the place of the engine's candidates, with a switch between "Book" and "Engine",
and the menu entry is Openings ([sitemap-book-explorer.md](sitemap-book-explorer.md)). The panel follows the position
on screen, it opens and closes in one action, and its choice stays in the browser.

## Journey 1: after a game

```
the review ──▶ the Report's opening row ──▶ the position where the game left the book
                                                 │
                       a trap in the game? ◀─────┤
                       play its refutation       │
                                                 ▼
                                        a book line, as a branch ──▶ back to the game
```

### A1. The review, with the opening in the Report

**Why it exists:** the player came to see how the game went. The opening is one of the questions that the Report
answers, beside the result and the counts of labels.

- The Report has one row for the opening: the turn where the game left the book, the side that left it, and the label
  of that move. For example: "The game left the book at turn 3: Blue, D9-G11, Good." A book move is a move that the
  engine studied, not always a good one. So when the game played a book move worse than Good before it left the
  book, the row names that move too: "Before that, at turn 2, Red played O11-Q10, a book move and an Inaccuracy."
- The move list marks the game's last move in the book with the book's mark (an open-book icon, drawn as the site's
  other icons are). The moves after it have no mark. One mark only, not a mark on every book move: the move list
  already carries a label on every move (design 10). Lichess's explorer shows the end of the book only by an empty
  table, and a player who does not look at the table at that move never learns where the game left the book
  ([03-opening-explorers.md](../../research/03-opening-explorers.md), section 3).
- If the game met a trap, the Report has a second row: "Turn 3: Blue played a trap, F9-J7. Red did not play its
  refutation." or "… Red played its refutation."
- A click on the opening row, or on the mark in the move list, goes to A2. It turns the book on for this review only.
  Only the table's switch changes the choice that the browser keeps.

**Variations:**

- **The game never entered the book:** Blue's first edge is not a book move. The row says "The game was not in the
  book from the first move." and a click goes to A2 at the start.
- **The game stayed in the book to the book's end:** the row says "The game followed the book to its end, at turn
  N." and gives the symbol at that end, in words ("Blue is slightly better").
- **The game left the book and came back to a book position by another move order:** the row names the first
  departure. The move list marks the return too, with the same mark.
- **The book did not load:** the Report has no opening row, and the rest of the review works. A2's panel says what
  failed and offers to try again.

### A2. The position where the game left the book

**Why it exists:** this is the one point that the player came for. It puts the game's move beside the book's moves,
at the same position, with the same marks.

- The board shows the position before the game's move that left the book. The review's own controls stay.
- The book's table opens. It lists the fine moves at this position (Good or better), the best first, then the other
  book moves under their own heading. Each row has its label (shape and colour, design 10), its win chance for the
  side to move, and the symbol at the end of its line.
- The game's move is one more row, under the book's rows, marked "Your game" and "Not in the book". The book has no
  value for it, so the book's value column shows "—". The move cell gives the review's label and value with their
  source: "In your review: Good, Blue 46.5%".
- The table's last row is the best move outside the book and its value, as KataGo's book pages end with "other"
  ([03-opening-explorers.md](../../research/03-opening-explorers.md), section 4). So the player sees how far the
  book's moves are from the rest.
- The review keeps its own labels, on book moves too: one engine and one depth rule for the whole game (design 16).
  The panel's values are the book's, and its header names the book and its version. Where the book and the review
  rate the same move differently, each place shows its own rating.
- The pointer on a book move draws its line on the board to the line's end, as the review draws the engine's line
  (design 07). A click plays the move as a branch of the game (A4).
- The traps of this position are in their own group, under the fine moves (A3).

**Variations:**

- **The player opened the panel at another position** (by the panel's switch, not from the Report): the panel shows
  the book at that position. If the position is not in the book, the panel says so, and names the last book position
  of the game, with a link to it.
- **The game's move is in the book but is a trap:** the row is in the traps' group, marked "Your game".

### A3. A trap in the game

**Why it exists:** a trap is the opening's most useful lesson. Its refutation is the line that the player must
remember, whether they fell into the trap or missed the punishment.

- A trap's row shows why it tempts, in its move cell, with the values open or closed: its value after a short search
  and after the deep search ("Seems good: Blue 41%. Is not: Blue 17%.").
- One action plays the refutation on the board as a branch of the game, edge by edge, with the step controls. The
  panel then shows the position after the refutation, and the symbol of its line's end.
- If the game played the refutation, the move list marks those moves as the book's refutation, and A3 says so.

### A4. A book line, as a branch

**Why it exists:** after the point of departure, the player wants to see how the book goes on, without losing the
game.

- Each book move that the player plays from the panel is a branch of the game in the move list, as any move that the
  player plays in a review is (design 07). The panel follows the position on screen while it is in the book.
- At the book line's end the panel says "End of the book" with the symbol in words. The review's engine searches the
  position, as it searches every position on screen.
- "Delete from here" removes a branch, as in the review.

### A5. Back to the game

**Why it exists:** the review is the player's place. The book is a visit.

- A click on any move of the game in the move list returns to it. The branches stay until the player deletes them.
- The table's switch keeps the player's choice of "Book" or "Candidates" for every review. A click on the Report's
  opening row turns the book on for that review only.

**The end of the journey:** the player knows the book's move at the point of departure, and, for a game with a trap,
its refutation. The player goes on with the review, or opens the book for study (Journey 2) from the same position.

## Journey 2: study

```
the menu, a lesson's end ──▶ the first view: the main line ──▶ step through it
                                                                    │
                     lost? the path, back to any position ◀────────┤
                                                                    ▼
                         compare the fine moves ──▶ a trap and its refutation ──▶ the end of the book
```

### S1. The first view

**Why it exists:** a player who opens the book for the first time needs one line to start from, not a table of
numbers. A new player needs a sound start and its reason.

- The book's board opens at the start, with the book panel open and the area map on (design 30).
- The panel shows the book's main line from the start, one turn a line, each with one sentence built from the
  book's facts: how the line ends, and how the other book moves end. For example: "1. A10-D9 keeps the game equal.
  After the other first moves, Red is slightly better." The last line gives the symbol at the main line's end in
  words.
- The panel's header says that the book comes from the engine's analysis, not from games that people played, and
  names the book's version. The chess explorers order their moves by how often people play them. This book has no
  such counts, so the player must know that its order is the engine's.
- Under it, the fine moves at the start, the best first, with their labels, then the other book moves under their
  own heading. The win chances and the bounds are closed. One switch, "Show the values", opens them, and the browser
  keeps the choice. The switch and the book's source sit in the title row, above the table, so that they stay in
  place when the table changes height.
- The move list holds the book's main line, with the other book moves folded under each move (the prototype's
  chevrons: down when folded, up when open).

### S2. Step through the main line

**Why it exists:** a line is learned by playing it, edge by edge, and by seeing what each edge encloses.

- The step controls and the arrow keys step through the main line, one edge at a time, as in the review.
- The area map follows each position. The pointer on the next move draws the rest of the line on the board.
- The panel follows the position on screen: its book moves, the best first.

### S3. Compare the fine moves

**Why it exists:** a book for people shows every move worth playing, so that the player can choose a line that suits
their play (the book's purpose, beads abscls-tpaj).

- At any position, the panel lists every fine move (Good or better), each with its label, its win chance (when the
  values are open) and the symbol at the end of its line.
- The book moves that the deeper values made worse than Good follow under "Other book moves", with their labels, so
  that the player does not take them for moves to play.
- With the values open, each move also shows how many turns the book goes on under it. A deep line is a line that the
  book studied well, the nearest thing that an engine's book has to a line that people play often
  ([03-opening-explorers.md](../../research/03-opening-explorers.md), section 9).
- The last row is the best move outside the book, with its value, as in A2.
- Under the table, one sentence explains the book's best move at the position, from the same facts. The pointer or
  the focus on another row shows that row's sentence there.
- The pointer on a move draws its line to the end of the book. A click plays it: the move list opens that branch and
  marks the move on screen.
- A chevron in the move list opens the alternatives at a move without playing them, for an overview.

### S4. A trap and its refutation

**Why it exists:** the traps are the tempting moves. The player must avoid them, and can set them for an opponent.

- The panel lists the position's traps in their own group, under the book moves, each with its label and its two
  values in its move cell, with the values open or closed ("Seems good: Blue 41%. Is not: Blue 17%."). The short
  search's value is not set in bold: the trap is not the strongest move.
- One action plays the trap and its refutation as one line, edge by edge, with the step controls.
- A position where the opponent can set a trap shows it from the mover's side too: the trap's row names the side
  that plays it.

### S5. Where I am

**Why it exists:** the book's tree branches at every move, and a player who opens several branches loses the way.

- The move list folds every branch except the path from the start to the position on screen. The path's moves are
  marked, and a click on any of them goes back there.
- A position that two move orders reach says so in the panel ("Also reached by: …"), with a link to each other line.
  No published explorer lists them: Lichess and KataGo join the move orders without a word.
- One action ("Back to the main line") returns to the main line at the same turn, or at the last turn that the main
  line has.

### S6. The end of the book, or a move outside it

**Why it exists:** the book ends after a few turns. The player must know where the book's knowledge stops and the
live engine's begins.

- At a line's end, the panel says "End of the book" with the symbol in words. The board's engine searches the
  position, as on the Analysis board.
- A move that the player plays and that is not in the book: the panel says "Not in the book", and shows the book's
  moves at the position before, with a link back. If the move is the book's best move outside the book (the last
  row), the panel gives its value from the book. The live engine searches the new position.

**The end of the journey:** the player has played the main line's first turns, opened the alternatives at the turns
that interest them, and played each trap's refutation. The book's board keeps its last position in the browser, as
the Analysis board keeps its own (design 21), so the next visit opens where this one ended.

## Device variants

- **Desktop, three columns (1,260 pixels and more):** the board in the middle, the panel and the move list in the
  analysis column at the right. The pointer draws the lines on hover.
- **Two columns (800 to 1,260 pixels):** the panel is in the right column with the move list, as the engine's
  candidates are.
- **Phone (one column):** the board on top, the panel under it, then the move list and the step bar, as the Lichess
  app lays out its explorer ([03-opening-explorers.md](../../research/03-opening-explorers.md), section 3). A tap on a
  book move plays it, and the step back undoes it. The phone has no hover, so a line shows by playing it. The values
  stay closed by default. Each row writes its symbol's words under the symbol, and nothing in a row takes a tap of
  its own. The step bar is fixed to the bottom of the screen, as in the Lichess app, so that the step back is in view
  whenever the board is. The review and the Analysis board take the same bar on a phone (a change to design 06).
  Reading the book and following a line work. The comparison of many moves at once is a desktop task.

## Context variants

| Entry point | Where it opens | What is fixed | What changes |
|---|---|---|---|
| The Report's opening row (Journey 1) | the review, at the position where the game left the book | the panel, the table, the marks | the game's move as an extra row |
| The panel's switch in a review | the review, at the position on screen | the same | a position outside the book shows the link to the game's last book position |
| The menu | the book's board at the start, the panel open | the same | the book's main line in the move list, the other book moves folded |
| The end of a lesson | the same as the menu | the same | none |
| The Analysis board's panel switch | the Analysis board, at the position on screen | the same | the player's own lines stay in the move list |

## Copy specifications

Text that the player follows is in strict Simplified Technical English. These are the strings that the journeys need
first. The panel's name and the menu's name belong to the structure.

| Where | String |
|---|---|
| The Report, the opening row | "The game left the book at turn {n}: {side}, {move}, {label}." |
| The Report, a weak book move before | "Before that, at turn {n}, {side} played {move}, a book move and {a label}." |
| The Report, no book move | "The game was not in the book from the first move." |
| The Report, the whole book | "The game followed the book to its end, at turn {n}. {symbol in words}." |
| The Report, a trap | "Turn {n}: {side} played a trap, {move}. {other side} played its refutation." / "… did not play its refutation." |
| The panel, the game's row | "Your game" · "Not in the book" · "In your review: {label}, {side} {value}%" |
| The table's switch | "Book" · "Candidates". Book unavailable: "Not in the book" |
| The table's groups | "Fine moves" · "Other book moves" · "Traps: they seem good after a short search, and lose after a deep one" · "Best outside the book" · "Your game" |
| The panel, a trap's values | "Seems good: {side} {short}%. Is not: {side} {deep}%." |
| A sentence, a main line turn | "{n}. {edges} keeps the game equal." ("leaves" when the symbol before the turn differs, "keep" for two edges) then "The best other book move is {n}. {edge}. After it, {end in words}." or "The book has no other move in this turn.", and at the line's end "The main line ends here.". Before "The best other book move", "{n}. {outside} is better, but it is not in the book." for each edge of the turn where a move outside the book is better |
| A sentence, the only fine move | "{edge} is the only fine move here. After it, {end in words}." ("fine book move" when a move outside the book is fine too) |
| A sentence, several fine moves | "{edge} is the best of the {k} fine moves here. After it, {end in words}." |
| A sentence, a better move outside the book | "{edge} is the best book move here. After it, {end in words}. {outside} is better, but it is not in the book." |
| A sentence, another book move | "{edge} is an Excellent move here." / "a Good move" / "an Inaccuracy" / "a Mistake" / "a Blunder", then "After it, {end in words}." |
| A sentence, a trap the move avoids | "This move avoids a trap: {trap} seems good after a short search, but {trap} decreases {side}'s win chance from {best}% to {deep}%. After {refutation}, {end in words}." ({side}: the side that plays the trap. {best}: its win chance with the best move here) |
| A sentence, a best book move that is a trap | "This move is a trap: {trap} seems good after a short search, but {trap} decreases …", as above, after "{outside} is better, but it is not in the book." |
| A sentence, a trap | "{trap} seems good after a short search, but it decreases {side}'s win chance from {best}% to {deep}%. After {refutation}, {end in words}." |
| The panel, a trap's action | "Play the refutation" |
| The panel, a line's end | "End of the book. {symbol in words}." |
| The panel, outside the book | "Not in the book. Last book position: turn {n}." with a link to it |
| The panel, a transposition | "Also reached by: {line}" |
| The panel, the values' switch | "Show the values" (one name, on or off) |
| The panel, the book did not load | "The book did not load. Check your connection, then try again." with "Try again" |
| The symbols, in words (Lichess's names for its glyphs, with Blue and Red) | = "Equal position" ⩲ "Blue is slightly better" ⩱ "Red is slightly better" ± "Blue is better" ∓ "Red is better" +− "Blue is winning" −+ "Red is winning" ∞ "Unclear position" |

## Interaction specifications

- **The panel follows the position on screen** in every state, on every step, click and key.
- **The table's switch shows what the table holds.** At a book position the player chooses "Book" or "Candidates".
  Outside the book, "Candidates" shows as chosen and "Book" is unavailable, with "Not in the book" as the reason. The
  player's choice comes back at the next book position. On Openings, "Candidates" at a book position starts the live
  engine and shows its candidates, and "Book" stops it.
- **The table and the board point at each other.** The pointer on a row highlights its edge on the board and draws
  its line. The pointer on a numbered edge on the board highlights its row. On a phone, a tap on a row plays the move.
- **The board keeps the player's orientation.** The book stores a position and its mirror image as one. A position
  that the player reaches as the mirror image of the stored one shows as the player reached it, with the book's moves
  mirrored to match, as KataGo's book pages keep the reader's orientation with their `symmetry` parameter
  ([03-opening-explorers.md](../../research/03-opening-explorers.md), section 4).
- **Loading:** the book loads in parts, the part of the start first, so that the first view shows before the whole
  book has loaded. A position whose part is still loading shows the panel's frame with "Loading the book…" in place
  of the table. The review and the board work while the book loads.
- **A failed load** leaves the review and the board as they are, and the panel shows the failure with "Try again".
- **Undo:** each book move that the player plays is a branch, so the review's "Delete from here" and the step
  controls undo it. Nothing in the book changes the game's own moves.
- **Keyboard:** the arrow keys step, as in the review. The key o turns the book on and off, as t shows the area map
  and x the threat, and "Keys and clicks" lists it. Tab puts the focus in the table: then the up and down keys move
  between its rows, Enter plays the move, and the focused row's line is drawn, as hover draws it. Escape returns the
  focus to the page, whose arrow keys step again.
- **Screen readers:** the panel is a table with a header row. Each label and symbol has its words, not only its
  shape. Each chevron in the move list is a button that says whether it is open and how many moves it holds. The
  position on screen is the move list's current item. The count of the position's book moves ("4 book moves, 1
  trap") comes once a step, as a polite announcement.
- **Done when:** a player completes the study journey with the keyboard only, and a screen reader names the position
  on screen and the state of each fold.
- **Motion:** a played line steps one edge at a time, at the review's speed, and follows the reduced-motion setting.

## Multi-channel map

- **A game on meaf.us or strategyjam.org** comes in by the bookmarklet or the userscript (design 22), and the review
  opens. Journey 1 starts there. Nothing of the book goes back to the play site.
- **A link to a book position** waits for the preparation stories (a later version).
- **What persists in the browser:** the panel open or closed, "Show the values", the book's board's last position.

## Flow metrics and success criteria

| Measure | How | Success |
|---|---|---|
| The opening row is used | a count of clicks on the Report's opening row and on the move list's book mark, against the reviews that have the row (design 17's events) | one review in five that has the row |
| The traps are studied | a count of "Play the refutation", against the book panels opened | a baseline for the next version |
| The study journey starts | a count of book's boards opened from the menu and from a lesson's end | a baseline for the next version |
| Depth of study | the number of book positions on screen in a visit, as a range | most visits pass the start position |
| Task success | a usability test with five players: find the point where a game left the book, and play a trap's refutation | each task done in one minute or less, with no help |

The counts are counts and ranges only. No game, line or position leaves the browser.
