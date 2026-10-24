# The book explorer: the design of the first version

## Anti-Pattern Verdict

Clean. The journeys, the structure and the wireframes have no deceptive, urgency, addictive or attention pattern. The
book has no streaks, reminders or rewards for time spent. Its counts keep every game, line and position in the
browser. It shows the engine's version, its bounds and the symbol ∞ for an unclear position
([context-book-explorer.md](context-book-explorer.md), "Ethical stance").

## Priority Issues

### Critical

None.

### Major

#### "Book" promises good moves, but the book holds weak ones and misses fine ones

**What and where.** The structure defines "Book" as "the word players of both games use for known good moves"
([sitemap-book-explorer.md](sitemap-book-explorer.md), "Labels"). The context says that a position's book moves are
"every fine move (Good or better)" ([context-book-explorer.md](context-book-explorer.md), "Product"). The wireframes
show otherwise ([wireframes-book-explorer.html](wireframes-book-explorer.html)). In "Openings: the first view", two of
the three book moves are Inaccuracies (D10-G9 and D10-F9), under no heading of their own. In "Openings: a position
with traps", A10-C11 is "Mistake · a book move and a trap". In "Review: where the game left the book", the game's
D9-G11 is "Good · not in the book", and the note says that "the book holds the fine moves that its search found, not
every fine move".

**Why it matters.** Journey 1 rests on "left the book" as the point where the opening "went its own way" (story 1). A
game that plays a book Inaccuracy stays in the book. A game that plays a fine move that the book does not hold leaves
it. So the Report's opening row can name a sound move as the departure and pass over an earlier weak one. In study, a
new player reads each book move as a move to play, and learns an Inaccuracy as a line.

**Heuristic.** Match between system and real world.

**Change.** Give "book" one meaning on every screen: the moves that the engine studied, not the good moves. Rewrite
the label "Book" in the structure's labels table to that meaning. Split the table's first group into "Fine moves"
(Good or better) and "Other book moves", each under its heading. When the game played a book move worse than Good
before it left the book, the Report's opening row names that move too.

#### The game's row puts the review's value in the book's column

**What and where.** In "Review: where the game left the book", the book's table ends with two rows outside the book.
"Best outside the book" is D9-F12, an Inaccuracy, at 44.4%. "Your game" is D9-G11, "Good · not in the book", at
46.5%. Both numbers stand in the column "Blue wins". The first is the book's value. The second is the review's, as the
note under the table says.

**Why it matters.** The table says that the best move outside the book is worth 44.4%, and then shows another move
outside the book at 46.5%. This is the one position that Journey 1 exists for. The player who asks what their move
cost (story 2) compares two engines and two depths on one scale, and the panel seems to contradict itself. The journey
asks that each place show its own rating, and also puts the review's value in the panel
([journey-book-explorer.md](journey-book-explorer.md), "A2").

**Heuristic.** Consistency and standards.

**Change.** Keep the book's columns for the book's values. In the game's row, the column "Blue wins" gives "44.4% or
less": by its own search, the book rates no move outside it above its best move outside it. The review's label and
value go in the move cell, after the words "In your review". Story 2's test then reads "each value with its source".

#### No book move says why it is played

**What and where.** "Openings: the first view" gives the main line in notation and its end in words: "The main line:
1. A10-D9 2. N11-Q10 L10-N11 3. D10-G12 G12-J15. Equal position." No row of the table and no step of the line gives a
reason. The context leaves the question open ("Does each book move get an explanation in words…"), and no decision
records why the book has none ([decisions.md](decisions.md)).

**Why it matters.** Story 12's test asks for "the main line and its reason". Story 11's test asks for an explanation
of each book move, or a recorded reason for none. Both stories are in the first version, and the design passes
neither test. The ethical stance says that the book teaches the reasons behind its moves, so that the player needs it
less over time. Without a reason, the study journey teaches a list of coordinates to memorize, which is the
dependence that the stance rejects.

**Heuristic.** Help and documentation.

**Change.** Give each turn of the main line one sentence built from the book's own facts, as the guided review builds
its sentences from checked facts ([design 04](../../design/04-product-shape.md), item 2): how the other book moves
end, and the trap that the move avoids. For example, at the start: "The other book moves leave Red slightly better."
Show the sentences in the first view's box, and the chosen move's sentence under its row at other positions. Do not
describe what one turn encloses: such sentences were exact and misleading
([design 30](../../design/30-area-maps.md), "Why"). If the first version has no sentences, record the reason as a
decision, and change the tests of stories 11 and 12.

#### The Book and Engine switch does not show what the table shows

**What and where.** In "Analysis board: a position outside the book", the switch stays on "Book" while the column's
heading says "Engine" and the table holds the engine's candidates. The note says: "The switch stays on Book." On
Openings at a book position, the engine header's switch, named "Engine", is off beside "Engine waits: the book answers
this position". A second control named "Engine" sits in the table's switch. No document says what a choice of
"Engine" does there while the live engine waits.

**Why it matters.** The switch is the one control that tells the player whose numbers the table holds. When it says
"Book" over the engine's candidates, the player can take the live engine's shallower values for the book's. On
Openings, a click on "Engine" has no defined result. A screen reader announces two controls with the name "Engine"
and two different effects (WCAG 2.4.6, Headings and Labels).

**Heuristic.** Visibility of system status.

**Change.** Make the switch show what the table holds. Outside the book, "Engine" is chosen and "Book" is unavailable,
with "Not in the book" as the reason. The player's choice of "Book" stays, and applies again at the next book
position. On Openings, a choice of "Engine" at a book position starts the live engine and shows its candidates, and a
choice of "Book" stops it. Give the table's switch and the engine header's switch different names.

### Minor

#### The keyboard and screen reader specification stops at the panel

**What and where.** The interaction rules say "One key opens and closes the panel", but name no key. In the panel, ↑
and ↓ move between the moves ([journey-book-explorer.md](journey-book-explorer.md), "Interaction specifications").
In the move list, ↑ and ↓ already pick the line at a fork, and elsewhere go to the start and the line's end
([design 07](../../design/07-lines-and-variations.md), item 4). The move list's folds and the open path have no
screen reader specification.

**Why it matters.** The meaning of ↑ and ↓ depends on the focus. The review keeps the arrow keys for the moves: a
click on a chart legend's box does not take the focus ([design 06](../../design/06-review-layout.md), item 3). So a
click on a row may or may not put the focus in the table, and the player cannot predict what ↑ does. A single-letter
key must be possible to turn off or remap, or work only on focus (WCAG 2.1.4, Character Key Shortcuts). A screen
reader player who does not hear which fold is open, or where the path is, loses "Where am I" (story 9).

**Heuristic.** Consistency and standards.

**Change.** Name the key, choose one that design 07 leaves free, and add it to "Keys and clicks". ↑ and ↓ move
between rows only after Tab puts the focus in the table. Each chevron is a button that says whether it is open and
how many moves it holds. The position on screen is the move list's current item. The count "4 book moves, 1 trap"
comes once a step, in a polite announcement. Done when: a player completes the study journey with the keyboard only,
and a screen reader names the position on screen and the state of each fold.

#### The "Not in the book" box repeats at every position after the book

**What and where.** In "Analysis board: a position outside the book", a box stands over the engine's candidates: an
icon, the heading "Not in the book", and a line with "Go there" and "Study in Openings". The structure asks for "one
line" there ([sitemap-book-explorer.md](sitemap-book-explorer.md), "The analysis column"). It turns the book on when
the player clicks the Report's opening row, and the browser keeps the book's state for the review.

**Why it matters.** The book covers the first turns, and a game has 120 edges. So in a review the box shows at
almost every position. After one click on the opening row, it can come back in every later review. It takes the
height that the design keeps for the move list, which is the reason why the table took the candidates' place.

**Heuristic.** Aesthetic and minimalist design.

**Change.** Show "Not in the book. Last book position: turn 3." as one line in the title row, with its two links, as
the structure says. A click on the Report's opening row turns the book on for that review only. Only the switch
changes the state that the browser keeps.

#### A trap's row hides why it tempts, then makes the tempting value the loudest

**What and where.** In the traps group of "Openings: a position with traps", with the values closed, a trap's row
shows the move, "Mistake · a trap" and the symbol at its line's end. With the values open, the short look's value is
in bold: F9-J7 shows 41.4% in bold, beside 36.4% for the best move, F9-J10.

**Why it matters.** Story 8's test asks for the trap's value at a short look and at the deep look. In the first view,
and by default on a phone, the values are closed, so the row does not say why the move tempts. With the values open,
the bold 41.4% is the largest number in the table. A player who scans the numbers reads the trap as the strongest
move.

**Heuristic.** Match between system and real world.

**Change.** Show a trap's two values in both modes, in its move cell, as the journey's sentence: "Looks good: Blue
41%. Is not: Blue 17%." Do not set the short look's value in bold.

#### The values switch and the book's source sit under a table whose height changes

**What and where.** In the wireframes, "Show the values" and the line "From the engine's analysis, not from games that
people played. Book of 23 October 2026." stand under the table. The journey puts the source in the panel's header
([journey-book-explorer.md](journey-book-explorer.md), "S1"). The structure puts the version in the title row
([sitemap-book-explorer.md](sitemap-book-explorer.md), "Inside the book's table").

**Why it matters.** The table has four rows at the start and six at the position with traps, so the switch moves at
each step, and the player must find it again. The source line explains the table's order, but the player reads the
order first and the line after it, in small print. A screen reader reaches the switch after the table that it
changes.

**Heuristic.** Consistency and standards.

**Change.** Put the switch and the source line in the title row, above the table, as the journey and the structure
say.

#### On a phone, a line's end is a bare symbol inside the row's tap target

**What and where.** In "Openings on a phone: the first view", the table's third column shows only the symbol (=, ⩱),
without its words. The note says that the words show on a tap, and that a tap on a row plays the move.

**Why it matters.** With the values closed, which is the phone's default, the label and the symbol's words carry the
judgement of each move. The phone keeps the label and drops the words. ⩲ and ⩱ differ only in which of their two
marks is on top, and +− and −+ only in their order. A player who does not know chess must learn eight symbols by
heart. The tap that shows the words is inside the row, and a tap on the row plays the move.

**Heuristic.** Recognition rather than recall.

**Change.** On a phone, write the symbol's words in the row, under the symbol, on two lines if necessary. A tap
anywhere on a row plays its move, and nothing in the row takes a tap of its own. Done when: at 360 pixels wide, each
row shows its line's end in words.

#### On a phone, the step bar is below the fold

**What and where.** On a phone, the order is the board, the table, the move list, then the step bar
([journey-book-explorer.md](journey-book-explorer.md), "Device variants"). In one column, the step bar sits under the
move list and moves down as the list grows ([design 06](../../design/06-review-layout.md), item 10).

**Why it matters.** Following a line is the phone's goal. A tap on a row plays a move, but the step back that undoes
it is at the page's foot, under a move list that grows with each branch. Each step back costs a scroll down, and a
scroll back up to see the board. The Lichess app, the model for this layout, keeps Previous and Next in a bottom bar
([03-opening-explorers.md](../../research/03-opening-explorers.md), section 3).

**Heuristic.** Flexibility and efficiency of use.

**Change.** On a phone, fix the step bar to the bottom of the screen, as the Lichess app does. Done when: on a
360 × 640 screen, the step back is in view whenever the board is in view.

### Cosmetic

#### One switch, two names: "Show the values" and "Hide the values"

**What and where.** The copy table gives the switch two strings, "Show the values" and "Hide the values"
([journey-book-explorer.md](journey-book-explorer.md), "Copy specifications"). The wireframes draw a switch with the
one name "Show the values", on or off.

**Why it matters.** A switch keeps its name and changes its state. A name that also changes makes a screen reader say
"Hide the values, on", which reads as the opposite.

**Heuristic.** Consistency and standards.

**Change.** Keep the one name "Show the values", and remove "Hide the values" from the copy table.

#### One column, two names: "Edge" and "Move"

**What and where.** In "Analysis board: a position outside the book", the engine's candidates name their first
column "Edge". The book's table names the same column "Move", although it lists one edge at a time. The "Book" and
"Engine" switch changes the heading in place.

**Why it matters.** The player sees one thing under two names in one place, and can take the book's rows for whole
turns.

**Heuristic.** Consistency and standards.

**Change.** Use "Edge" in both tables, as the candidates' table does.

## Heuristic Verdicts

- Visibility of system status: broken, by "The Book and Engine switch does not show what the table shows".
- Match between system and real world: broken, by "'Book' promises good moves, but the book holds weak ones and
  misses fine ones".
- User control and freedom: holds. No finding.
- Consistency and standards: broken, by "The game's row puts the review's value in the book's column".
- Error prevention: holds. No finding.
- Recognition rather than recall: strained, by "On a phone, a line's end is a bare symbol inside the row's tap
  target".
- Flexibility and efficiency of use: strained, by "On a phone, the step bar is below the fold".
- Aesthetic and minimalist design: strained, by "The 'Not in the book' box repeats at every position after the book".
- Help users recognize, diagnose, and recover from errors: holds. No finding.
- Help and documentation: broken, by "No book move says why it is played".

## Accessibility at wireframe level

- **Reading order:** strained, by "The values switch and the book's source sit under a table whose height changes".
  Elsewhere, the order on a desktop and on a phone follows the visual order: the board, the table, the move list, the
  step bar.
- **Reliance on colour:** holds. Each label has its shape. On the board, a trap's line and the game's move each have a
  dash of their own. The position on screen has an outline, and the chosen side of the switch is filled and pressed.
- **Keyboard:** strained, by "The keyboard and screen reader specification stops at the panel". Focus on a row draws
  its line, as the pointer does.
- **Screen reader:** strained, by "The keyboard and screen reader specification stops at the panel" and "The Book and
  Engine switch does not show what the table shows". The table has a header row, and every label and symbol has its
  words.
- **Touch:** strained, by "On a phone, a line's end is a bare symbol inside the row's tap target" and "On a phone, the
  step bar is below the fold".

## Cognitive Walkthrough Results

### After a game

| Step | Tries the right effect | Notices the action | Links action to effect | Sees progress | Rating | Finding |
|---|---|---|---|---|---|---|
| A2: compare the game's move with the book's moves | yes | yes | no | yes | Hesitation | The game's row puts the review's value in the book's column |
| A2: judge if the move that left the book was the error | yes | yes | no | yes | Hesitation | "Book" promises good moves, but the book holds weak ones and misses fine ones |
| A5: go on with the review after the opening | yes | yes | yes | no | Hesitation | The Book and Engine switch does not show what the table shows |

### Study

| Step | Tries the right effect | Notices the action | Links action to effect | Sees progress | Rating | Finding |
|---|---|---|---|---|---|---|
| S1: read why the main line is played | yes | no | no | no | Failure | No book move says why it is played |
| S3: choose among the book moves at the start | yes | yes | no | yes | Hesitation | "Book" promises good moves, but the book holds weak ones and misses fine ones |
| S4: see why a trap tempts, with the values closed | yes | no | yes | yes | Hesitation | A trap's row hides why it tempts, then makes the tempting value the loudest |
| On a phone: read where a book move's line ends | yes | yes | no | yes | Hesitation | On a phone, a line's end is a bare symbol inside the row's tap target |
| On a phone: step back after a tap plays a move | yes | no | yes | yes | Hesitation | On a phone, the step bar is below the fold |

## Positive Findings

- The Report's opening row and the one mark at the game's last book move answer Journey 1's question in one action,
  where Lichess shows the end of the book only by an empty table.
- Each book move that the player plays is a branch with the review's step controls and "Delete from here", so nothing
  in the book can change the game's own moves.
- The row "Best outside the book" gives the book's border from the book itself, before any live search.
- "Not in the book" always names the last book position with a link to it, so no position is a dead end.
- The values closed by default, with labels and symbols in words, give a new player a readable first view, and one
  kept switch gives an experienced player the numbers.
- The traps have their own group under a heading that defines the word ("they look good at a short look, and lose at
  a deep one"), so a trap does not read as one more poor move.
- The title row names the turn, the side to move and the edge of the turn ("edge 2 of 2"), which makes a table of
  single edges readable in a game of two-edge turns.
- The book's board keeps its own state, so a visit to Openings never overwrites the player's lines on the Analysis
  board.
- A position reached as a mirror image shows as the player reached it, so the book's moves point at the right points.
- The failure text names the problem and the next step ("The book did not load. Check your connection, then try
  again."), and the review works while the book loads or fails.

## Recommended Actions

- "Book" promises good moves, but the book holds weak ones and misses fine ones
- The game's row puts the review's value in the book's column
- No book move says why it is played
- The Book and Engine switch does not show what the table shows
- The keyboard and screen reader specification stops at the panel
- The "Not in the book" box repeats at every position after the book
- A trap's row hides why it tempts, then makes the tempting value the loudest
- The values switch and the book's source sit under a table whose height changes
- On a phone, a line's end is a bare symbol inside the row's tap target
- On a phone, the step bar is below the fold
- One switch, two names: "Show the values" and "Hide the values"
- One column, two names: "Edge" and "Move"
