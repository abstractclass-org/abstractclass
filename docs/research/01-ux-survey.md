# Analysis and training tools for chess and Go: a survey of their design

**Status:** research for the product's interface. Nothing here is decided. The design ideas in section 8 are a first
draft for discussion.

**Method:** the open-source tools were read in their source code (shallow clones of each repository on 2026-10-09).
The closed tools were read in their help pages and seen in their live pages. Each claim names its source.

## 1. The references

| Tool | Game | Source | What to learn from it |
|---|---|---|---|
| **Lichess** | chess | open: [lila](https://github.com/lichess-org/lila) (`ui/analyse`, `ui/puzzle`, `ui/learn`, `ui/lib/src/ceval`) | The analysis page, the engine in the browser, "Learn from your mistakes", puzzles and their themes, the Learn section |
| **Chess.com** | chess | closed: [Game Review help](https://support.chess.com/article/488-how-do-i-review-the-whole-game), [move classification help](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-and-etc), [Key Moments](https://www.chess.com/news/view/new-feature-key-moments-analysis) | The guided review (highlights, coach, key moments, retry), rating-aware labels |
| **En Croissant** | chess | open: [en-croissant](https://github.com/franciscoBSalgueiro/en-croissant) (Tauri, React, Mantine) | A desktop tool: tabs, several engines at once, a game report, local puzzles, repertoire training with spaced repetition |
| **Nibbler** | chess | open: [nibbler](https://github.com/rooklift/nibbler) | How to show many statistics per candidate (visits, prior, value, win-draw-loss) for a neural-network engine |
| **KaTrain** | Go | open: [katrain](https://github.com/sanderland/katrain) (Kivy) | Points lost, labels as coloured dots, candidates on the board, teaching mode, how it schedules a whole-game analysis |
| **Lizzie** | Go | open: [lizzie](https://github.com/featurecat/lizzie) | The first board that showed candidates as circles with value and visits, and the line on hover |
| **Sabaki** | Go | open: [Sabaki](https://github.com/SabakiHQ/Sabaki) | A clean game-record editor, the engine's analysis as a heat map |
| **OGS** (online-go.com) | Go | open: [online-go.com](https://github.com/online-go/online-go.com) (`src/components/AIReview`, `src/views/LearningHub`) | A web review: score or win-rate graph, move quality from both score and win rate, the Learning Hub |
| **AI Sensei**, **Fox Weiqi** | Go | closed | Commercial reviews. Not studied in depth. |

## 2. How each site is organised

- **Lichess:** the top bar has Play, Puzzles, Learn, Watch, Community, Tools. Tools holds the analysis board, the
  opening explorer, the board editor and game import. The puzzle section has its own side menu: Puzzles, Puzzle
  Themes, By openings, Puzzle Dashboard, Improvement areas, Strengths, Puzzle history, From my games.
- **Chess.com:** a rail of icons at the left: Play, Puzzles, Learn, Watch, News, Social. The analysis page starts
  with a box for a game record and cards: set up a position, new analysis, game collections, game search, explore
  (openings), saved analyses, classroom.
- **OGS:** Play, Learn (the Learning Hub in levels: Fundamentals, Basic Principles, Basic Skills, Intermediate,
  Advanced), Puzzles (collections), Joseki, Watch.
- **KaTrain** (desktop): one window with two modes, Play and Analysis.
- **En Croissant** (desktop): a side bar (boards, accounts, files, databases, engines, settings) and tabs, as in a
  code editor. Each tab is a game or an analysis.

The web sites put the review next to the games and put puzzles and lessons beside them as equals. The desktop tools
put everything around one board.

## 3. The review and analysis page

### The layout

Every tool uses the same frame (Lichess, chess.com and KaTrain, seen live and in KaTrain's screenshot):

- **The board** fills the left. An **evaluation gauge** stands next to it (Lichess, chess.com).
- **A side column** holds the engine's lines at the top and the move list below them.
  - Lichess writes each label into the move list as a comment, with the best move and its line: "Inaccuracy. e6 was
    best. 8…e6 9.Qe2 c5 …".
- **Controls** under the side column: first, back, forward, last, a menu.
- **Under the board,** in tabs (Lichess): the computer analysis (chart and summary), move times, crosstable, export.
- **On a narrow screen** the columns stack: board, then controls, then the rest.

KaTrain adds toggles above the board (next moves, dots, top moves, policy, expected territory), and a right column
with the players, a move strip, the graph, the statistics (win rate, estimated score, points lost or gained) and
notes.

### Move labels

| Tool | The measure | Labels and thresholds |
|---|---|---|
| Lichess (game analysis) | the drop in winning chances | ?! from 0.1, ? from 0.2, ?? from 0.3 ([design 01](../design/01-analysis-tool.md)) |
| Lichess (practice against the computer, `practiceCtrl.ts`) | the same | good under 0.025, inaccuracy under 0.06, mistake under 0.14, then blunder |
| Chess.com | expected points lost, from the rating and the evaluation | Best 0, Excellent to 0.02, Good to 0.05, Inaccuracy to 0.10, Mistake to 0.20, Blunder above. Also Brilliant and Great (by rules beyond the points, and "more generous" for new players), Book, and Miss (a failure to punish the opponent's mistake). |
| En Croissant (`utils/score.ts`) | the drop in win percent | ?! above 5, ? above 10, ?? above 20. ! when the move is the only one that keeps the advantage. !! for a sacrifice. |
| KaTrain (`config.json`) | points lost | classes at 12, 6, 3, 1.5 and 0.5 points, each a colour of dot on the stone |
| OGS (`generateHeatmapAndMarks.ts`) | score loss and win-rate loss, each against its own thresholds | Excellent, Great, Good, Inaccuracy, Mistake, Blunder. **The worse of the two decides**, so a move that throws away points in a decided game still shows as a blunder. Win-rate thresholds 0.4, 1.2, 2.4, 8 and 20 points. The colour blends inside each band. The engine's choice is a "blue move". |

### The summary of a game

- **Lichess:** for each player, the count of inaccuracies, mistakes and blunders, the average centipawn loss, the
  accuracy, and the accuracy in the opening, middlegame and endgame. A "Learn from your mistakes" button for each
  player. A link "Recommended puzzle training" on the game's opening.
- **Chess.com** opens the review on a **Highlights** screen: the game graph with a one-line summary by the coach, the
  accuracy, an estimated game rating, a grade for each phase, and the count of each label. "Start Review" then walks
  through the game.
- **En Croissant:** a card per player (accuracy, average centipawn loss) and a table with the count of each label.
- **KaTrain:** a report with accuracy, mean points lost, agreement with the engine's top move, and the count per
  class.

### The engine on the board

- **Candidates as marks on the board, with numbers** (Lizzie, KaTrain): each candidate shows its value (KaTrain: the
  points lost) and its visits. The best is highlighted. On hover, the candidate's line appears on the board with
  numbered stones.
- **Arrows** (Lichess, chess.com, En Croissant): the top lines as arrows, coloured by rank.
- **Heat maps** (Sabaki, KaTrain's policy, OGS): the engine's interest per point.
- **Ownership** (KaTrain's "expected territory"): who will own each point.
- **Labels on the played moves** (KaTrain's dots, chess.com's icons on the board).

### The graph

- **Lichess:** an area chart of the advantage, with dividers at the opening, the middlegame and the endgame. A click
  jumps to the move.
- **KaTrain and OGS:** the score and the win rate, as two lines or one at a time.
- **Chess.com:** the graph is the first thing on the Highlights screen.

### Learning from the game

- **Lichess "Learn from your mistakes"** (`ui/analyse/src/retrospect/retroCtrl.ts`, `nodeFinder.ts`):
  - **Which moves:** the player's moves where the win chance swings by more than 10 points (`evalSwings`: `povDiff`
    over 0.1. `povDiff` is half the difference of the winning chances, −1 to +1, so it is in win chance, 0 to 1). A
    lost mate in 3 or fewer counts too. Moves in the opening explorer are left out, and so are moves whose position
    has no computer line. Win chance flattens near a decided result, so a missed long mate in a won position is not a
    mistake here.
  - **What counts as solved:** the computer line's move, a move in the opening explorer, or a mate. Any other move is
    searched in the position after it ("Evaluating your move…"), and it is solved when the mover's win chance is
    within 4 points of the win chance before the mistake (`checkCeval`: `povDiff` over −0.04). The game's own move
    fails. So the player need not find the engine's first choice, only a move that does not lose.
  - States: find, evaluating, win, fail, view, off track. A counter shows the progress.
- **Chess.com "Retry"** and **Key Moments:** retries for inaccuracies, mistakes, blunders and missed wins. Key moments
  also include the end of the opening, turning points and good moves. After the retries the review shows an adjusted
  accuracy.
- **KaTrain's teaching mode** (`core/game.py`): during play, a move in a bad class is taken back automatically, with
  a probability per class (1, 1, 1, 0.5, 0, 0 from the worst class down), and the player tries again.

### How much the engine searches

- **KaTrain** first sweeps the whole game at 25 visits a position ("fast visits"), then searches the shown position to
  500. The player can add visits to one position, re-analyse the whole game at more visits, or re-analyse only the
  mistakes.
- **Lichess** analyses a game on its servers, and the position on screen in the browser. Its browser engine uses
  threads, by default one less than the number of cores (`ceval/ctrl.ts`). It reuses evaluations from a shared cache.
- **Chess.com** sets the depth by the device and the membership. Its help page says the same move can get another
  label with other settings.

## 4. Puzzles

- **Lichess** (`ui/puzzle`):
  - Three modes. **Play:** rated. After a wrong move it becomes **try:** unrated, the player can try again or view the
    solution. **View:** after the end.
  - After a puzzle: the rating change, a vote (up or down), "continue training", the link to the game it came from,
    and its themes.
  - A session history of the last puzzles (solved or failed), a difficulty choice, and "jump to the next puzzle at
    once".
  - **Themes:** phases (opening, middlegame, endgames by type), motifs, lengths, mates. Also by opening, and from the
    player's own games.
  - **Dashboard:** improvement areas and strengths, by theme.
  - **Timed and streak modes:** Streak (puzzles of rising difficulty until the first mistake, one skip), Storm (three
    minutes), Racer (against other players).
- **Chess.com:** rated puzzles, Puzzle Rush, Puzzle Battle, a daily puzzle, custom themes.
- **En Croissant** (`components/puzzles`): puzzles from a local database, a rating range, and a "progressive" option
  that moves the range to 50-100 points above the last puzzle. A streak counter.
- **OGS:** collections of puzzles made by authors, solved in order.
- **Spaced repetition:** En Croissant trains an opening repertoire with the FSRS scheduler (`ts-fsrs`), with cards
  due, unseen and learned.

## 5. Lessons

- **Lichess Learn** (`ui/learn`): short stages, one per piece or idea (capture, protection, fork, check, mate), each
  a few small scenarios on the board, with a score and a map of progress.
- **OGS Learning Hub:** a ladder of sections from the rules to advanced ideas, each page an interactive small board.
- **Lichess Practice:** positions with a goal ("win", "draw", "mate in N"), played against the engine.

## 6. What carries over to Enclosure, and what does not

- **The board shows edges, not pieces.** A candidate is a segment. Segments cross and overlap, so many candidates at
  once are harder to read than circles on points. Regions, protected edges and cuts also need marks.
- **Two edges a turn.** The move list groups edges by turn. A label can apply to an edge or to a whole turn.
- **Points every turn.** The score grows after every turn. So the graph can show the score so far and the expected
  final margin with its spread, which no chess or Go tool shows.
- **The win chance saturates.** OGS's rule (the worse of score loss and win-rate loss decides) and KaTrain's points
  lost both answer this. It agrees with principle 1 of [design 01](../design/01-analysis-tool.md).
- **The visitor's CPU does the work.** KaTrain's schedule (a fast sweep, then deeper searches where the player looks)
  fits the browser. Lichess shows that an engine in the browser is acceptable to players.
- **A static site has no accounts.** Lichess's dashboard, puzzle ratings and "from my games" need stored history.
  Local storage in the browser can hold one person's history. Puzzle ratings from many solvers need a server.

## 7. Patterns most of the tools share

1. A review opens on a **summary** (graph, accuracy, label counts), then lets the player **step through** the game.
2. **Labels sit in the move list**, with the better move and its line next to the mistake.
3. **The player tries again** at their own mistakes (Lichess, chess.com, KaTrain).
4. **The engine's candidates show on the board**, with their values, and their line on hover.
5. **The review leads to training** (Lichess: puzzles on the game's opening, puzzles from the player's games).
6. **Puzzles fail softly:** a wrong move ends the rated attempt, but the player can continue to learn from it.

## 8. Design ideas for Enclosure (a first draft)

Each idea names the tool it comes from.

1. **The site map:** Home (import a game, the daily puzzle, continue), Review, Analysis board, Puzzles, Learn, and a
   personal page. As on Lichess.
2. **The review page has three stages on one page:**
   - **Highlights** (chess.com): the margin graph, accuracy, points lost per player, label counts, the key moments.
   - **A guided walk** (chess.com's key moments, Lichess's "Learn from your mistakes"): the key moments one by one,
     each a chance to retry.
   - **Free analysis** (Lichess): the full board, engine and move list.
3. **The layout** (all tools): the board on the left, a gauge of the expected margin with its spread beside it, the
   candidates and the move list on the right, the graph and the summary below the board. Moves grouped by turn, with
   labels and the better line written in the list (Lichess).
4. **Candidates on the board** (Lizzie, KaTrain): the top few as coloured segments with their points lost. On hover,
   the line appears as numbered ghost edges.
5. **Overlays the player can switch on** (KaTrain's toggles): the ownership, the edges likely to be cut (weak walls),
   the policy.
6. **Labels by points lost,** with thresholds fitted to Enclosure ([design 01](../design/01-analysis-tool.md),
   principle 3). A colour scale that blends inside each band (OGS). A label for each edge and for each turn.
7. **The schedule of the analysis** (KaTrain): a fast sweep of the whole game across the workers, then deeper searches
   at the key moments and at the position on screen. A progress bar. The results stay in the browser (IndexedDB).
8. **Retry the key moments** (Lichess's states and its "solved" margin, adapted to points).
9. **Puzzles** from the games (Lichess's generator, design 01 principle 7). Themes from the tags. "From my games" from
   the reviews stored in the browser. Streak mode.
10. **Learn:** an interactive rules course in short stages (Lichess Learn), then the community's ideas (guards,
    spears) as lessons with small boards (OGS Learning Hub).
11. **A review link that needs no server:** the game record in the address, so a player can share a review.

## 9. Questions that followed

Four questions came from this survey: accounts and a server, text explanations, devices, and the look. The answers
are in [design/04-product-shape.md](../design/04-product-shape.md).
