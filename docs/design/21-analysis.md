# The Analysis board

**Status:** in force. The board editor and starts from another position wait for request 16. **Decided:**
2026-10-14.

## Context

Lichess and chess.com both have a game's review and a free analysis board, and the two look alike.

- **Lichess** has one tool in two states. A game's computer analysis (made on Lichess's servers) puts its judgements
  on that game's analysis board: inaccuracies, mistakes, blunders, the accuracy and the advantage chart. `/analysis` is
  the same board without a game.
- **chess.com** has two products. Game Review is the guided report: its Highlights, the advantage graph, the Coach's
  summary and the move classifications. Its analysis board ("Self Analysis") is the free tool: engine lines, arrows,
  any moves.

Hedge School's review already follows Lichess: it has inline branches, the engine on the position on screen, its
candidates and lines (designs 07 and 09). So the difference between the two pages is where each starts, and what the
engine does by itself.

## Decision

1. **Review and Analysis:**

   | | Review | Analysis |
   |---|---|---|
   | Starts from | a played game | the start, or a line brought in |
   | The engine | searches the whole game: the sweep, the labels, the key moments, the Greats' confirmations | searches the position on screen only |
   | The line | the game's line, fixed: the player's moves are branches | the player's: "Make main line" |
   | Labels | every move | none, until the player asks: "Evaluate quality" |
   | Report, chart, review mark | yes | no |
   | Answers | how did I play, and where did the game turn? | what about this position, or this idea? |

2. **The line:** the first line from the start is the main line, in the move list's turns. The other lines are
   variations, as a review's branches are.
   - A move at the main line's end makes the main line longer. Any other new move starts a variation.
   - **Make main line** (Lichess's): the line of the move becomes the main line, and the main line from that point
     becomes a variation. **Promote variation** and **Delete from here** work as in a review, on the main line too.
3. **Labels on request:** "Evaluate quality" on a move of any line, main line too, searches the two positions to the
   label budget, as for a review's branch move (design 10). Other moves have no label.
4. **The engine:** the position on screen only, with the engine settings of the review (design 09): the network, the
   depth on screen, the time limit, the workers and the GPU. The review's depth applies only to "Evaluate quality",
   and the engine settings name it so ("Evaluate quality: Depth").
   - **The settings that never apply on the board are hidden,** not greyed out: "Review for" (the board labels the
     moves asked for, on both sides, and ignores it), and the Advantage chart's lines (the board has no chart). The
     help of the depth on screen and of the network leaves out the review.
   The results go to the browser's store, keyed by the position, as the review's (design 05). A position searched in
   a review opens with its result here, and the other way.
5. **The ways in:**
   - **Analysis** in the header: the board as the player left it.
   - **A link** that carries a line: `/analysis#record=…` (a record), or `/analysis#packed=…` (a shared analysis),
     with `&at=` for the position (design 22).
   - **"Analyze"** beside "Review" when the player brings a record: the record opens on the board, not as a game to
     review, so nothing is searched but the position on screen. The record is not kept in the list of games. It is
     checked as an import is (the rules, the variant), and its line becomes the main line. Its variations stay behind:
     the record's reader keeps the line only.
6. **One board in each browser:** its main line, its variations and the moves evaluated, in the browser's store (the
   branches' store, under `board`), and the position on screen, in the browser's local storage. It stays when the
   player leaves, as the review's branches stay. A link or a record brought in replaces it. The page asks first when
   the board has moves ("Replace your board?").
7. **Share and export the analysis,** as the review's Export menu does:
   - **The link:** the main line, the variations, the moves evaluated, and the position on screen, packed as a
     review's shared link packs them (design 13). It holds no engine results: the recipient's browser searches what it
     shows.
   - **The analysis file,** to open elsewhere: the lines and the engine's results for every position of them, and of
     the positions one move from them, as a review file chooses them (`src/lib/game/analysisFile.ts`). It opens at
     once, from the home page's "Open a file", which takes a review file or an analysis file.
   - **The record,** copied or as a file: the main line, the variations, the result `*` (unfinished, engine design
     04), the marks of the moves evaluated, and the evaluations of the positions searched (design 13's marks and
     `[%eval]` comments).
8. **Unfinished games:** the notation's result `*` marks a game not finished or not known. A record with `*` can be
   reviewed as any game, or opened on the board.
9. **A start from another position, and the board editor** (a second step):
   - **The record carries the start:** the notation's `[Position "…"]` tag (engine design 04, as PGN's `FEN` tag),
     with the moves after it. So a link and a file can carry a set-up position. Until this step, such a record is
     refused with its reason, as now (`variantProblem` in `src/lib/game/import.ts`).
   - **The editor sets the five fields of a position:** each player's edges, the protected and placed edges, the
     mover and the edges left in its turn, both scores, and the edge count. It starts from the position on screen, as
     Lichess's board editor starts from its analysis board.
   - **The engine checks that a position could occur** (request 16): the rules are the engine repository's. A
     position that could not occur is not searched, and the editor says why, as Lichess's editor refuses an invalid
     position.

## Why

- **Each page has one job.** The review judges a game played, and its line is the game. The board explores, and its
  line is the player's. Lichess and chess.com both keep a free board beside the review.
- **The board costs only what the player looks at:** no pass over a game, so it is ready at once on any machine.
- **Labels on request,** as a review's branches have them: a line played to see an idea should cost no search, and
  a label where the player did not ask is noise (design 07).
- **One board, not saved analyses:** Lichess's analysis board is not saved either. Its Studies keep work. Studies
  are later here too (design 19), as files and links.
- **The record carries a start, not a position alone:** the moves since the start keep the line, which the move list
  shows and the network's history reads. The notation's `[Position]` tag does this, as PGN's `FEN` tag does.

## Alternatives

- **Analysis as a mode of the review page:** one page, but its line would have two meanings, and a game's review
  mark and report would sit beside a free board.
- **Saved analyses in the list of games:** the list would mix games played with lines explored. Studies are the
  place for kept work.
- **A link with a position only** (a FEN-like line): it loses the moves before it, and so the line on the board.
- **An export of the lines alone,** with no results (the first choice): that is a board editor's output. The board's
  work is the engine's searches of the lines that the player explored, deeper than a review's, and the analysis file
  keeps them.
- **The editor before the engine's check:** a board that could not occur would be searched, and its numbers would
  mean nothing.

## Consequences

- **Practice** (request 15) can end on the board too: a practice game is a played game, so it opens in the review.
- **Analytics:** `analysis_open` and `analysis_failed` (the way in: page, home, record, packed, file), the board's
  features by `feature_name`, and its settings' changes and exports as the review's: the page's address tells them
  apart in the reports (design 17).
- **An unfinished line's end is searched,** on the board and in a review of an unfinished game: the review reads a
  line's last position as the result only when the game is over there (`review` in `src/lib/review/model.ts`).
- **The early access shows the board** (design 11).

## Where it is

- `src/routes/analysis/+page.svelte`: the board, its store and its ways in. `src/lib/review/ReviewView.svelte`: the
  view, in its board form (`BoardForm`). `src/lib/analysis/game.svelte.ts`: the board form of the analysis (`setMain`,
  `playLine`, `judgedMain`, `keptBoard`). `src/lib/game/board.ts`: the link and a record's line.
  `src/lib/game/analysisFile.ts`: the analysis file. `src/lib/review/model.ts`: `onlyJudged`. `src/routes/+page.svelte`:
  "Analyze", and "Open a file".

## Log entries

- [decisions/product.md](../decisions/product.md): "The Analysis board" (2026-10-14).
