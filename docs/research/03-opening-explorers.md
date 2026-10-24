# Opening book explorers in chess and Go: a survey of their design

**Status:** research for the design of the book explorer. Nothing here is decided.

**Method:** the open-source tools were read in their source code (shallow clones on 2026-10-24, at the commits named
in section 1). The closed tools were read in their help pages and their live pages on the same day. Each claim names
its source. "Not checked" marks a claim that no source here confirms. The review and analysis pages of these tools are
in [01-ux-survey.md](01-ux-survey.md), and this file does not repeat them. The book explorer's users, stories and
constraints are in [../ux/book-explorer/](../ux/book-explorer/context-book-explorer.md).

## 1. The references

| Tool | Game | Source | What to learn from it |
|---|---|---|---|
| **Lichess's opening explorer** | chess | open: [lila](https://github.com/lichess-org/lila/tree/50472e4a) (`ui/analyse/src/explorer`), the app [lichess-org/mobile](https://github.com/lichess-org/mobile/tree/6b18f0c0) (`lib/src/view/explorer`) | A book as a panel of the analysis board, three databases, the tablebase as an exact book |
| **Lichess's opening pages** | chess | open: lila (`modules/opening`, `ui/opening`), live at [lichess.org/opening](https://lichess.org/opening) | Names, a page for each opening, text written by people, links to training |
| **KataGo's book pages** | Go | open: [KataGo](https://github.com/lightvector/KataGo/tree/d91ea855) (`cpp/book/book.cpp`, `cpp/book/bookcssjs.cpp`), live at [katagobooks.org](https://katagobooks.org/) | An engine-only book made by the method that Enclosure's book follows: values with uncertainty, symmetry, static files |
| **OGS's Joseki Explorer** | Go | open: [online-go.com](https://github.com/online-go/online-go.com/tree/95e2f596) (`src/views/Joseki`), its server [godojo-server](https://github.com/online-go/godojo-server/tree/8acab997) | Categories without numbers, the trick and its refutation, a play mode that tests the player |
| **Chess.com's explorer and opening pages** | chess | closed: [Game Explorer](https://support.chess.com/en/articles/8615183-what-is-the-game-explorer), [how to use it](https://support.chess.com/en/articles/8708732-how-do-i-use-the-game-explorer), [the Explore tab](https://www.chess.com/news/view/announcing-explore-tab), [chess.com/openings](https://www.chess.com/openings) | Counts and an engine value side by side, the Book label in a review |
| **Lichess's interactive lessons** | chess | open: lila (`ui/analyse/src/study/gamebook`) | A line drilled with the author's comment on each wrong move |
| **Chessable's MoveTrainer** | chess | closed: [its schedule](https://support.chess.com/en/articles/10319322-how-does-the-spaced-repetition-scheduling-work), [key moves](https://support.chess.com/en/articles/10319325-what-are-key-moves), [course settings](https://support.chess.com/en/articles/10319078-how-do-i-manage-my-course-settings), [FIDE's article](https://www.fide.com/from-flashcards-to-chessable/) | Lines learned, then reviewed on a schedule, move by move |
| **En Croissant's repertoire** | chess | open: [en-croissant](https://github.com/franciscoBSalgueiro/en-croissant/tree/2ddb5176) (`src/components/files/opening.ts`, `src/utils/repertoire.ts`, `src/components/panels/practice`) | A deck of positions scheduled by FSRS, coverage weighted by game counts |
| Waltheri, Josekipedia, AI Sensei, Many Faces of Go | Go | live pages and reviews (section 8) | Briefly |

The public source of OGS's joseki server ends in 2020. The live server is newer: the client reads fields, such as
`see_also`, that this source does not have.

## 2. The tasks, tool by tool

"yes": the tool serves the task directly. "part": partly, or by a side way, which its section describes. "no": it
does not. "?": not checked.

| Tool | Look up a position | Browse | Compare the candidates | Follow a line | Where one left the book | Traps and refutations | Drill | Prepare for an opponent |
|---|---|---|---|---|---|---|---|---|
| Lichess explorer | yes | yes | yes | part | part | no | no | yes |
| Lichess opening pages | yes, by name | yes | part | part | no | no | part | no |
| KataGo book pages | part | yes | yes | yes | part | part | no | no |
| OGS Joseki Explorer | yes | yes | part | yes | yes | yes | yes | no |
| Chess.com explorer | yes | yes | yes | part | part | no | no | yes |
| Lichess interactive lessons | no | part | no | yes | yes | part | yes | no |
| Chessable MoveTrainer | no | part | no | yes | yes | ? | yes | no |
| En Croissant repertoire | yes | yes | yes | part | part | no | yes | ? |

## 3. Lichess's opening explorer

The paths are in lila at `50472e4a`.

### Where it sits

- **A button opens it:** the book icon in the analysis board's control bar, "Opening explorer & tablebase"
  ([`ui/analyse/src/view/controls.ts`](https://github.com/lichess-org/lila/blob/50472e4a/ui/analyse/src/view/controls.ts)).
  The address `#explorer` opens it too (`checkHash` in
  [`explorerCtrl.ts`](https://github.com/lichess-org/lila/blob/50472e4a/ui/analyse/src/explorer/explorerCtrl.ts)).
- **A box in the tools column,** under the engine's lines and the move list
  ([`ui/analyse/src/view/tools.ts`](https://github.com/lichess-org/lila/blob/50472e4a/ui/analyse/src/view/tools.ts)).
  The explorer reads the position on screen. It has no board and no tree of its own.
- **A click on a row plays the move** on the analysis board, as a move of the board's tree
  ([`explorerView.ts`](https://github.com/lichess-org/lila/blob/50472e4a/ui/analyse/src/explorer/explorerView.ts),
  `ctrl.explorerMove`).
- **Hover on a row** draws the move as a pale blue arrow and hides the engine's arrows
  ([`ui/analyse/src/autoShape.ts`](https://github.com/lichess-org/lila/blob/50472e4a/ui/analyse/src/autoShape.ts)).
  The board shows no book move until the player hovers.
- **It needs an account now.** A visitor who is not signed in sees "You need an account to do that" and a sign-up
  button (`isAuth` in `explorerCtrl.ts`, `showAnon` in `explorerView.ts`). The live opening pages ask the visitor to log
  in "to load more opening pages".

### The three databases

The title row of the box holds three links, one for each database, and a gear for the filters
(`explorerTitle` in `explorerView.ts`, `explorerConfig.ts`).

- **Masters:** over-the-board games of players rated 2200 FIDE and higher, from 1952 (the string
  `masterDbExplanation` in `translation/source/site.xml`, with its arguments in `explorerView.ts`).
- **Lichess:** rated games played on Lichess. The filters choose the speeds, the average rating bands, and the months
  from and to.
- **Player:** one player's games, as White or as Black. A click on the name switches the side. On first use the server
  indexes the player's games, and a spinner shows the place in the queue ("Indexing N other players first").

### The move table

`showMoveTable` in `explorerView.ts`:

- **Move:** the move in SAN. Its tooltip gives the ECO code and the opening name that the move reaches.
- **Games:** the move's share of the position's games in percent, and the count in short form (for example 1.2M).
- **White / Draw / Black:** a bar in three parts. A part shows its percentage when it is wide enough. The tooltip gives
  the players' average rating, or in the Player database the performance rating and the average opponent.
- **Σ:** a last row with the position's totals.
- **Under the table:** "Top games" and "Recent games", with the players, ratings, result, date and speed. A click
  opens the game in a new tab. In a study, it offers View, Cite and Insert.
- **No engine value:** the engine's lines sit above the table in the same column, so the player compares the counts
  with the engine by eye.

### Opening names and the opening pages

- **The box's title** shows the position's ECO code and name, for example "C50 Italian Game", as a link to its opening
  page (`openingTitle`). The names come from scalachess's `OpeningDb`. A search result quotes
  [Lichess's blog post](https://lichess.org/@/lichess/blog/opening-explorer/Vs0xMTAA) as saying that the name takes
  transpositions into account. The post did not load here, so this is not checked.
- **The opening pages** ([`modules/opening/src/main/ui/OpeningUi.scala`](https://github.com/lichess-org/lila/blob/50472e4a/modules/opening/src/main/ui/OpeningUi.scala)
  and `OpeningBits.scala`):
  - The title splits the name into the family and its variations. Each part links to its own page. A back arrow goes
    to the previous page of the line.
  - A small board plays the line. A results bar beside it stretches the range from 30 % to 70 %, so that small
    differences show (`exaggerateResults`).
  - A description in Markdown, which users with a permission edit, with a revision history
    ([`WikiUi.scala`](https://github.com/lichess-org/lila/blob/50472e4a/modules/opening/src/main/ui/WikiUi.scala)).
    A page without one says "No description of the opening, yet." The index lists the openings still to explain, the
    most popular first (`showMissing`).
  - Two buttons, "Train with puzzles" (puzzles from this opening) and "Opening explorer", and a chart of the
    opening's popularity over time.
  - Two tabs: "Popular continuations" and "Example games". A continuation is a card with its popularity, the name
    that the move adds, the move, a results bar and a small board, the most played first (`whatsNext`).
  - A search by name, and a list page (`/opening/tree`) that folds the names into a tree.

### The tablebase: an exact book

- **When:** near the end of a game, when few pieces are left, the box shows the tablebase in place of the games
  (`tablebaseRelevant` in `explorerCtrl.ts`).
- **How:** the moves come in groups by their exact result for the mover: Winning, Unknown, the cases of the 50-move
  rule, Drawn, Losing (`show` in `explorerView.ts`). Each row gives the move and its distance in half-moves (DTZ, DTM,
  DTC or DTW), coloured by the winner
  ([`tablebaseView.ts`](https://github.com/lichess-org/lila/blob/50472e4a/ui/analyse/src/explorer/tablebaseView.ts)).
- **Why it matters here:** it is the one view of the explorer that comes from computation, not from games. It sorts
  nothing by popularity. It groups the moves by their result class and gives each one exact number.

### Moving in the tree

- The analysis board's move list holds the path and its variations. Back and forward are the board's controls and keys.
- The page caches the explorer's data by position (`cache[fen]`), so two move orders to one position share one table
  in a visit. That the server counts by position too is likely but not checked in the server's code.
- The analysis board's address does not name the position. The opening pages do: `/opening/<name>/<moves>`.

### Leaving the book

- A position with no games says "No games found" and suggests more games from the filters. At ply 50 it says "Max
  depth reached!" (`showEmpty`, and `MAX_ANALYSE_DEPTH` in `explorerUtil.ts`).
- The box counts the plies since the last position that had moves (`movesAway`). After two plies without data, the
  box shrinks and hides its message until hover (`.reduced` in
  [`ui/analyse/css/explorer/_explorer.scss`](https://github.com/lichess-org/lila/blob/50472e4a/ui/analyse/css/explorer/_explorer.scss)).
  So the explorer gets out of the way when the line has left it.
- The move list does not mark the last book move. In a game's analysis, "Learn from your mistakes" skips the moves
  that the explorer has ([01-ux-survey.md](01-ux-survey.md), section 3).

### On a phone

- **The web page:** on a narrow screen the columns stack ([01-ux-survey.md](01-ux-survey.md), section 3), so the box
  is under the board with the other tools.
- **The app** has an explorer screen of its own
  ([`opening_explorer_screen.dart`](https://github.com/lichess-org/mobile/blob/6b18f0c0/lib/src/view/explorer/opening_explorer_screen.dart)):
  - The board is at full width on top. A strip of the line's moves and the table follow.
  - A header gives the opening name, or "Start position", as a link to the opening page.
  - The table keeps three columns: the move, the games with their share, and the results bar
    (`opening_explorer_widgets.dart`).
  - A bottom bar holds the database (it opens the filters in a sheet), Flip, Previous and Next (a long press repeats).
  - Without a network, a message says that the explorer is not available offline (`opening_explorer_view.dart`).
- **On a tablet** the board and the table stand side by side.

### Beyond the numbers

The explorer has no text about a move. The names, the opening pages' descriptions, the example games and the puzzles
of an opening do the teaching.

## 4. KataGo's book pages

KataGo exports a book as static HTML: one file for each position, and one shared script and style sheet
(`exportToHtmlDir` in [`cpp/book/book.cpp`](https://github.com/lightvector/KataGo/blob/d91ea855/cpp/book/book.cpp),
the script in [`cpp/book/bookcssjs.cpp`](https://github.com/lightvector/KataGo/blob/d91ea855/cpp/book/bookcssjs.cpp)).
[katagobooks.org](https://katagobooks.org/) serves the books for boards from 6×5 to 9×9, for two rule sets each. Each
book is also an archive to read offline. The site keeps two earlier 9×9 books online beside the current one, with their
dates.

### A position

- **From the top:** a title, links to the rules, the home page, the root position and the "Canonical parent", the
  board in SVG, "Black to play!" or "White to play!", the move table, and a legend for its columns.
- **Not shown:** the moves that led here, move numbers, or the last move. The page shows the stones only.

### The candidates on the board and in the table

- **On the board,** each book move is a disc with its rank (1 is the most preferred). Its colour says how bad the move
  is (`getBadnessColor`): from cyan and green for the best, through yellow and orange, to red and dark red. The colour
  mixes the loss of win chance (the largest weight), the loss of score and a small term for a lower policy prior. The
  colour is worse when the side to move is already losing.
- **Symmetric twins:** on a symmetric position, each twin of a move shows the same number.
- **Hover** on a disc shows a shadow stone and outlines the move's row. Hover on a row shows the shadow stone on the
  board. A click on either opens the child's page.
- **The table** (the readers' export): Index, Move, Black's win %, Black's score, Win % uncertainty, Score
  uncertainty, Prior %, Visits and adjusted visits. Each row has the move's colour as its background.
- **The legend** calls the index the "order of preference of moves", a mix of win chance, score, uncertainty and
  prior, and says that other goals can want other orders. It calls the uncertainties "purely a heuristic indicator",
  and asks the reader to browse the book to learn their scale.
- **One side's view:** every value is from Black's side, whoever is to move.
- **A pass** that is a book move is a row of the table, not a mark on the board.
- **The developers' export** adds the bounds of the win chance and of the score, the raw and sharp scores, and the
  costs that drove the book's growth.

### Links, symmetry and transpositions

- **One page per position.** The book names a position by the smallest of its hashes under the 8 symmetries. So a
  position, its rotations and reflections, and every move order that reaches it are one node and one file
  (katagobooks.org, "How these books were generated", and `getFilePath`).
- **The orientation follows the reader.** Each link carries a `?symmetry=` parameter, and the page draws the board in
  the orientation of the path that the reader took (`getLinkForPos`, `compose`). The board does not flip when a
  reflection leads to the stored page.
- **The path is the browser's history.** A page links to one parent, its canonical one, not to all its parents. There
  is no forward link and no list of the other move orders.

### Outside the book

- **No page:** a move that the book did not expand, or whose node has fewer visits than the export's minimum, has no
  link. Its disc does not respond to hover (`stoneShadowUnhoverable`).
- **The "other" row:** the table's last row gives the values of the best move outside the book: its win chance, score,
  uncertainties and prior (`thisValuesNotInBook`). It has no mark on the board. So the reader sees how far the book's
  moves are from the best move that the book left out.
- **No free board:** the pages have no board to play on. A position outside the book cannot be reached on the site.

### On a phone

The style sheet has no rule for narrow screens. The board's size is fixed in pixels from the board's size
(`pixelsPerTile`), and the table has nine padded columns. Hover links the board and the table, and a touch screen has
no hover. Not checked on a phone.

### Beyond the numbers

- The pages have no text. The site's highlights pages, for example
  [9x9highlights.html](https://katagobooks.org/9x9highlights.html), explain the findings in prose, opening by opening,
  with diagrams and links into the book. They say where the analysis is not confident.
- The home page states the limits: the 9×9 book is a strong bot's opinion, not a solution, and deep misjudgements are
  likely. It asks readers to report mistakes.

## 5. OGS's Joseki Explorer

The paths are in online-go.com at `95e2f596`, unless named.

### Layout and modes

- **One board** in OGS's board view, with a row of tabs: Filter, Comments, Play, and Edit for editors, and a menu for
  the change log and the administration
  ([`src/views/Joseki/Joseki.tsx`](https://github.com/online-go/online-go.com/blob/95e2f596/src/views/Joseki/Joseki.tsx)).
  The header names the mode: Explore Joseki, Play Joseki, Edit Joseki.
- **Under the board:** the position's description, its tags, its source, the category of the last move, the
  contributor, "Moves made" (the sequence, as a link), a button that copies the link, and "This position leads to N
  others".

### The categories

- **Five categories:** each move has one of Ideal, Good, Mistake, Trick or Question (`MoveCategory` in
  [`joseki-utils.ts`](https://github.com/online-go/online-go.com/blob/95e2f596/src/views/Joseki/joseki-utils.ts),
  `PlayCategory` in the server's
  [`BoardPosition.java`](https://github.com/online-go/godojo-server/blob/8acab997/src/main/java/com/greenasjade/godojo/BoardPosition.java)).
- **A colour each:** Ideal dark green, Good olive green, Mistake red, Trick yellow, Question light blue (`ColorMap`).
- **No numbers:** no win rate, no count, no score. Editors set the categories.

### The candidates on the board

- **A label on each next move,** on its point: the variation's number (1 to 9, then "_"), in the category's colour
  (`renderCurrentJosekiPosition`). The description can add letter marks.
- **The order is the editors':** at the start, a hint says to click a marked stone, and that lower numbers are "more
  commonly chosen". The server gives each new move the next free number, in the order that editors add the moves
  (`nextVariationLabel` in `BoardPosition.java`). So the numbers stand in for popularity without a count.
- **Tenuki** (a play elsewhere) is a button under the board. Its border takes the colour of the tenuki move's category,
  and its tooltip names the category, for example "Tenuki would be a mistake here." Grey means that no tenuki is
  listed.
- **No table:** the candidates are on the board only.

### Comments, sources, tags and filters

- **A description** for each position, in Markdown, with board marks such as `<A:Q16>` and links such as
  `<position: 123>` (`applyJosekiMarkdown`). It is machine-translated for readers of other languages (`AutoTranslate`
  in [`ExplorePane.tsx`](https://github.com/online-go/online-go.com/blob/95e2f596/src/views/Joseki/ExplorePane.tsx)).
- **"See also"** links to other positions (`ExplorePane.tsx`). It is the place for a transposition. How editors fill
  it is not checked.
- **A source** for each position (a book or a URL), the contributor, and **tags** that describe the result, for
  example "Joseki: Done", "Black gets the corner", "Black gets sente", "Current" (the server's seed data in
  `J01Application.java`, and the client's strings). "This position leads to N others" opens the count of
  continuations for each tag (`showVariationCounts`).
- **Comments:** a thread for each position. Only signed-in users can write in it
  ([`CommentsPanel.tsx`](https://github.com/online-go/online-go.com/blob/95e2f596/src/views/Joseki/CommentsPanel.tsx)).
- **Filters** narrow the tree by tags, contributor and source. A hint says that the tag "Joseki: Done" keeps the
  verified sequences only. The browser keeps the filter.
- **A change log** for each position, and a lock on the whole database for editors.

### Moving in the tree

- Reset to root, Previous, Next, and a slider over the line visited, with the keys Home, Left and Right
  (`renderMoveControls`). Next replays the line that the player visited.
- The address follows the position (`/joseki/<id>`) but adds no browser history, so the browser's Back leaves the
  explorer.
- A position is a node in a tree of move sequences, so two move orders are two nodes. "See also" is the only link
  between them.

### Outside the book

A stone on a point that is not listed is played. The panel says "Last move: Experiment", the marks disappear, and the
position "has no continuations". An editor can save it as a new position.

### Play mode: the test

- **Setup:** the player chooses Play, and plays one side from the position on the board, under the current filter
  ([`PlayPane.tsx`](https://github.com/online-go/online-go.com/blob/95e2f596/src/views/Joseki/PlayPane.tsx)).
- **The computer's moves:** after each right move, the computer plays a random move among the listed continuations,
  whatever their category (`processNewMoves`).
- **Right and wrong:** a move is wrong when it is not listed, or when its category is Mistake or Question
  (`bad_moves`). Ideal, Good and Trick are right.
- **A wrong move** gets a red mark on the board, and the move bar is highlighted. The record says "That move isn't
  listed!" or names the category. Back works only after a mistake, and Next never works in play.
- **The record** lists each move with a mark: a tick for right, a cross for wrong, a screen for the computer, and a
  star with "Joseki!" when no right continuation is left. For a signed-in player, the server keeps the count of errors
  (`updatePlayerJosekiRecord`).
- **Hidden in play:** the comments, the filter, and the tenuki button's category.

### A trick and its refutation

- **In the tree:** the categories let one position carry a trap. A trick is a yellow move among green ones. The answer
  that refutes it is the next move marked Ideal or Good, and a natural wrong answer is red. The description can
  explain them. This follows from the categories' meaning. No live example was checked.
- **In play:** the computer can play a trick, because it picks among all the listed moves. The player must then find
  the refutation, because a red answer counts as wrong. When the player plays a trick, it counts as right.

### On a phone

The board view has a portrait layout in which the tabs scroll under the board (`.portrait .GobanView-mobile-scroll` in
`Joseki.css`). Not checked on a phone.

### Beyond the numbers

The descriptions, comments, sources and result tags are all the teaching. The tool has no numbers.

## 6. Chess.com's explorer and opening pages

- **Where:** chess.com/analysis/explorer, and the "Explore" tab of the Analysis, Game Review and Classroom pages
  ([how to use it](https://support.chess.com/en/articles/8708732-how-do-i-use-the-game-explorer),
  [the Explore tab](https://www.chess.com/news/view/announcing-explore-tab)).
- **Databases:** Master Games (nearly 3 million games of masters, updated each week), My Games, and Other Players by
  user name ([Game Explorer](https://support.chess.com/en/articles/8615183-what-is-the-game-explorer)).
- **Each move:** its count, sorted by popularity, a box with Stockfish's evaluation at a high depth, and a bar of White
  wins, draws and Black wins from the master games. In a review, the game's move is in bold (the Explore tab's
  article). A click on a move plays it.
- **Notable games** under the moves, sorted by relevance, rating or date. A game can be added to the board. The panel
  also offers practice against the computer.
- **Opening pages** ([chess.com/openings](https://www.chess.com/openings)): grouped by the first move, with Popular,
  All and Bookmarks tabs. A page such as [Sicilian Defense](https://www.chess.com/openings/Sicilian-Defense) has prose
  (the ideas, the pros and cons, the history), its main variations with their moves, notable games, top players, and
  lessons and videos.
- **Book in a review:** Game Review gives the label Book to each move that is part of opening theory
  ([chess.com's glossary](https://www.chess.com/terms/book-move-chess), and [01-ux-survey.md](01-ux-survey.md),
  section 3).
- **Not checked:** what the explorer shows past its data, whether it shows the opening's name, and its phone layout.

## 7. Drilling a line

### Lichess's interactive lessons

[`ui/analyse/src/study/gamebook/gamebookPlayCtrl.ts`](https://github.com/lichess-org/lila/blob/50472e4a/ui/analyse/src/study/gamebook/gamebookPlayCtrl.ts):

- An author writes a study chapter as an interactive lesson. Its main line is the right answer. The player plays one
  side.
- A move on the main line is good. The opponent's reply plays by itself after a second, or after the player reads the
  author's comment.
- A move off the main line is bad. The player sees the author's comment on that variation, or else the author's general
  comment for a deviation. Then the board goes back to the main line for another try.
- A hint (the author's text) and the solution (a green arrow) are there on request.
- The opponent always plays the main line. A trap for the opponent needs a chapter of its own.
- There is no schedule. The player chooses a chapter.

### Chessable's MoveTrainer

- **Learn:** the player reads the author's comment on a move and plays the move, move by move, then plays the whole
  line again ([FIDE's article](https://www.fide.com/from-flashcards-to-chessable/),
  [Andy Matuschak's note](https://notes.andymatuschak.org/zDr94hP6bG3jJYrdYy8B5hx)).
- **Review on a schedule:** eight levels, from 4 hours to 6 months. Each move has its own level. A right answer
  raises the level, and a mistake shortens the next interval
  ([the schedule](https://support.chess.com/en/articles/10319322-how-does-the-spaced-repetition-scheduling-work)).
- **Settings:** after a mistake, the move still goes up a level (Standard), stays at its level (Hard), or goes back to
  level 1 (Extra hard). The two help pages do not say the same thing about a mistake in the default setting. The
  review order follows the schedule, the course, or chance
  ([course settings](https://support.chess.com/en/articles/10319078-how-do-i-manage-my-course-settings)).
- **Key moves** let a line start at its interesting point and skip the common first moves
  ([key moves](https://support.chess.com/en/articles/10319325-what-are-key-moves)).
- **Rewards:** points and badges (FIDE's article).
- **Not checked:** who plays the opponent's moves in a review, and what a wrong move shows.

### En Croissant's repertoire

- **The cards:** a repertoire is a game file with variations, for one colour. Each position where the player is to move
  and the file has a reply is a card. The answer is the first reply only. One position is one card, whatever the move
  order (`buildFromTree` in
  [`opening.ts`](https://github.com/franciscoBSalgueiro/en-croissant/blob/2ddb5176/src/components/files/opening.ts)).
- **Train:** the board goes to a due card and hides the notation, the comments and the engine. Any move other than the
  answer is wrong: "The correct move was …", and the card is rated Again. After a right move, the player rates it
  Again, Hard, Good or Easy (keys 1 to 4), or the tool rates it by itself. FSRS (`ts-fsrs`) schedules the next review
  (`PracticePanel.tsx`, `src/components/boards/Board.tsx`).
- **Counts:** practiced, due and unseen cards, the session's right and wrong answers, the accuracy and the streak.
  "Practice Full Repertoire" goes once through every card, with no schedule.
- **Build:** with a reference database, each position shows the player's coverage, with the opponent's replies weighted
  by how often they occur. "Go to your next gap" and "Go to your biggest gap" jump to the most frequent reply that has
  no answer. Replies under a minimum count are "Rare moves", with "too few games to require preparation"
  (`computeTreeCoverage` and `findBiggestGap` in
  [`repertoire.ts`](https://github.com/franciscoBSalgueiro/en-croissant/blob/2ddb5176/src/utils/repertoire.ts)).
- **Positions, not lines:** the player never plays a line through.

### The three side by side

| | Lichess's lesson | MoveTrainer | En Croissant |
|---|---|---|---|
| A card is | a chapter's line | a move of a line | a position |
| The opponent's moves | the main line, played by the tool | not checked | none: the board jumps to the position |
| The right answer | the main line's move | the course's move | the first reply in the file |
| A wrong move shows | the author's comment, then a retry | not checked | the right move, then the next card |
| The schedule | none | 8 levels for each move | FSRS for each position |
| Rewards | none | points, badges | streak, accuracy |

## 8. Other Go tools, briefly

- **Waltheri's pattern search** ([ps.waltheri.net](https://ps.waltheri.net/)) finds a pattern of stones in professional
  games and shows the continuations with their counts, according to a
  [forum report](https://lifein19x19.com/viewtopic.php?p=167884). Its application did not load for this survey. Not
  checked.
- **Josekipedia** ([josekipedia.com](https://www.josekipedia.com/)) is a joseki wiki with a log of edits, a search and
  games. Its pages did not render here, and its marks are not checked.
- **AI Sensei** ([ai-sensei.com](https://ai-sensei.com/)) reviews games with KataGo and has a quiz mode on the player's
  mistakes. Its home page names no opening or joseki tool. Not checked inside the application.
- **Many Faces of Go's joseki library** (an older program, in the [British Go Association's
  review](https://britgo.org/node/613)) marks moves J (joseki), X (bad), T (trick) and F (the follow-up). The review
  says that four marks without comments cannot carry the subtlety. The trap and its answer as two marks are the same
  idea as OGS's Trick and refutation.

## 9. What the game counts give their users

The chess explorers rank and judge moves by the games that people played. Enclosure's book has no such counts. The
counts give their users these things:

1. **An order of the replies to prepare.** A player cannot learn every reply. The count says which replies come most
   often. Lichess's opening pages and Chess.com sort by it. En Croissant weights its coverage by it and sends the
   player to the most frequent reply that has no answer.
2. **A main line by custom.** The most played move is the line that a player meets first, and the line that the names
   follow (Lichess's continuations, the most played first).
3. **Results in practice, at a level.** The results bar, with the rating filter, shows how a move scores among players
   of one level. A move can be equal for the engine and score badly for people, or the reverse. Chess.com puts the
   counts and the engine's value side by side, so the player sees the gap. This is where a chess player sees a
   practical trap.
4. **A gradual end of theory.** The counts fall with depth, and "No games found" marks the end. The player sees the
   theory thin out.
5. **Model games.** Top, recent and notable games show how strong players went on after the book, and who plays the
   line.
6. **An opponent's habits.** Lichess's Player database and Chess.com's Other Players show what one person plays.
7. **Fashion.** Lichess's chart of an opening's popularity over time, and the date filters.
8. **Moves to skip.** En Croissant's "Rare moves" need no preparation.

What the engine-only tools use in their place:

- **The network's prior** (KataGo's Prior %): how likely the network is to play the move. It says how natural a move
  is to the engine. Hedge School already sums the prior for its likely edges' meter, in place of a human model, and
  names that departure ([design 14](../design/14-complexity.md)). It is the engine's view, not a measure of people.
- **The book's own order** (KataGo's index, OGS's variation numbers): a ranking without counts. OGS's comes from its
  editors.
- **The book's size under a move** (KataGo's visits, OGS's "leads to N others" with a count for each tag): how much the
  book knows about a line.
- **The value of the best move outside the book** (KataGo's "other" row): where the book stops, as the counts' fall
  shows it in chess.

The Enclosure book adds one more: a trap's value at a short look. It measures temptation at the engine's level, where
chess shows a popular move with poor results. What stays lost: what people of a level play and score, model games, an
opponent's habits, and trends. The site does not use other players' games in public
([context](../ux/book-explorer/context-book-explorer.md), "Constraints").

## 10. What carries over to Enclosure, and what does not

- **An engine book is KataGo's kind.** The Enclosure book has KataGo's method and its kinds of values: a win chance
  with bounds, a prior, visits. KataGo's pages are the closest model for the numbers. In chess, the closest model is
  Lichess's tablebase: made by computation, grouped by result.
- **Static files fit.** KataGo's export is one static file per position, named by its hash, with one shared script. It
  needs no server and works offline. Lichess's and Chess.com's explorers need a server for the counts, and Lichess now
  asks for an account. Hedge School is a static site ([design 02](../design/02-static-site.md)).
- **Symmetry carries over.** The Enclosure book merges a position and its mirror image, as KataGo merges 8 symmetries.
  KataGo's `?symmetry=` parameter keeps the board in the orientation of the reader's path. Chess has no such case, and
  OGS keys its tree by move sequence.
- **Transpositions:** Lichess and KataGo key by position, so a transposition joins silently. Neither tells the player
  that another move order reaches the position. KataGo names one parent, and OGS has hand-made "See also" links. Story
  10 of the book explorer asks for the other lines, which no tool here lists.
- **Candidates on the board:** KataGo's numbered discs and OGS's labels sit on points, and Lichess draws an arrow on
  hover. An Enclosure candidate is an edge, a segment between two points, and segments cross
  ([01-ux-survey.md](01-ux-survey.md), section 6). A rank or a colour needs an anchor other than a point.
- **Two edges a turn:** no tool here has a turn of two moves. Each lists one move at a time. A move off the board has a
  place in two of them: KataGo lists a pass as a row of the table, and OGS has a tenuki button.
- **Quality in colour alone:** KataGo's colour scale and OGS's five colours carry the judgement on the board with no
  shape or word. OGS gives the category in words only for the last move played. Hedge School's rule that no mark relies
  on colour alone ([context](../ux/book-explorer/context-book-explorer.md)) rules out a direct copy of either.
- **Labels and symbols:** Lichess's glyphs for a position are the same eight symbols as the Enclosure book's, each with
  a name in words, for example "Equal position", "Unclear position", "White is slightly better" (scalachess
  [`core/src/main/scala/format/pgn/Glyph.scala`](https://github.com/lichess-org/scalachess/blob/a4988192/core/src/main/scala/format/pgn/Glyph.scala)).
  Lichess uses them in studies, not in the explorer. No explorer here puts a symbol at a line's end.
- **Traps:** only OGS (Trick, in yellow, then its refutation) and Many Faces of Go (T and F) mark traps, and editors
  choose them. The Enclosure book finds its traps by search, a short look against a deep one, so each trap has two
  values. KataGo's pages have the parts (a high Prior % beside a bad colour) but no mark. The chess explorers show a
  trap only as a popular move with poor results.
- **Leaving the book:** most tools show it by absence: an empty table, no marks, a box that shrinks. OGS names it
  ("Experiment"). Chess.com labels every book move of a review. Outside the book, Hedge School has the live engine, as
  Lichess's board has its engine beside the explorer, but the live engine searches less deeply than the book.
- **Names:** the chess explorers hang on names and ECO codes. A name is a handle to search, to link and to remember.
  Enclosure has no catalogue of opening names that the site can rely on. KataGo's book has no names either, and a
  reader finds its pages only by clicks from the root.
- **Words:** the teaching text of Lichess's descriptions, OGS's descriptions and Chess.com's pages is written by people,
  and many positions have none. KataGo puts its prose in separate highlights pages. Hedge School's explanations come
  from templates over engine facts ([design 04](../design/04-product-shape.md)).
- **Drills:** a static site can keep a deck in the browser, as En Croissant keeps it in local files. The drills here
  reward with streaks, points or badges. The book's ethical stance has no streaks and no rewards for time spent
  ([decisions.md](../ux/book-explorer/decisions.md)), so those rewards do not carry over.
- **The phone:** the Lichess app's layout (the board on top, the table under it, a bottom bar with the database and
  the steps) is a tested pattern. KataGo's pages rely on hover and fixed sizes.
- **A changing book:** KataGo keeps its earlier books online with their dates. Lichess's Masters database names the
  month that it reaches. The Enclosure book changes when the network changes.

## 11. Patterns most of the tools share

1. **The position is the key.** Lichess, KataGo and En Croissant key their data by position, so move orders meet. OGS
   keys by sequence and links positions by hand.
2. **One row or mark per move, the best or the most played first. A click plays it.** The table and the board point
   at each other on hover (Lichess's arrow, KataGo's shadow stone).
3. **A compact result for each move:** a bar in three parts (Lichess, Chess.com), a colour (KataGo, OGS), or a group
   (Lichess's tablebase).
4. **The path belongs to the board or the browser.** Lichess uses the analysis board's move list, KataGo the browser's
   history, OGS a visited line with a slider. None draws the book's tree around the position.
5. **Leaving the book shows by absence.** Only OGS names it.
6. **People write the words,** apart from the numbers, and many positions have none.
7. **Filters narrow the book:** ratings, speeds and dates (Lichess), tags, contributor and source (OGS).
8. **A drill plays one side.** The tool picks the opponent's move: the main line (Lichess's lessons), a random listed
   move (OGS), or no opponent at all (En Croissant's positions). A wrong move shows the answer, then a retry. Spaced
   repetition schedules the reviews (MoveTrainer, En Croissant).
9. **The book links out to training and analysis:** Lichess's "Train with puzzles" and "Opening explorer",
   Chess.com's practice against the computer, OGS's Play tab.

## 12. Questions for the design

1. Is a book move an edge or a whole turn? The tools list one move at a time. KataGo's pass row and OGS's tenuki button
   show how a move that is not on the board finds a place.
2. What stands in for the game counts: the network's prior, the book's order, the size of the book under a move, or
   nothing? Where does the page say what is missing?
3. How does a trap show: in its own category and group (OGS), with its refutation one step later, and with its value at
   a short look beside its deep value?
4. How far is a move outside the book from the book's moves: a row like KataGo's "other", the live engine, or both?
5. Does the explorer list the other move orders that reach a position, which no tool here does? Does the board keep its
   orientation across a mirror, as KataGo's `?symmetry=` does?
6. If a drill comes later: is its unit a line (Lichess's lessons, MoveTrainer) or a position (En Croissant)? Which fine
   moves count as right? Who picks the opponent's replies: the main line, every fine move, or the traps too, as OGS's
   computer plays tricks?
7. Without names, what handle does a position have: its line, its turn, a small board?
8. On a phone, what replaces hover, which links the table and the board in Lichess and KataGo?
