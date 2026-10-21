# The Analysis board

**Status:** in force. The board editor and starts from another position are built, on the engine's release `27a7414`
(requests 16 and 17). **Decided:** 2026-10-14.

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
   - **Copy image** and **Save image** work as in a review (design 07, item 17). A position made in the board editor
     has only a main line: the image of a main line move ahead of the position on screen numbers the line from there.
3. **Labels on request:** "Evaluate quality" on a move of any line, main line too, searches the two positions to the
   label budget, as for a review's branch move (design 10). Other moves have no label.
   - **A hard position's ◆ is the position's,** not a label (design 14): every move of the board's lines whose
     position before it has a result gets it, main line and variations, evaluated or not. A move whose position before
     it has no result says "Not searched yet" in its tooltip, and a marked move says "Hard position". The annotated
     record keeps "A hard position." for the moves evaluated only, as before.
4. **The engine:** the position on screen only, with the engine settings of the review (design 09): the network, the
   depth on screen, the time limit, the workers and the GPU. The review's depth applies only to "Evaluate quality",
   and the engine settings name it so ("Evaluate quality: Depth").
   - **The settings that never apply on the board are hidden,** not greyed out: "Review for" (the board labels the
     moves asked for, on both sides, and ignores it), and the Advantage chart's lines (the board has no chart). The
     help of the depth on screen and of the network leaves out the review.
   The results go to the browser's store, keyed by the position, as the review's (design 05). A position searched in
   a review opens with its result here, and the other way. The board reads the stored results of every position of
   its main line and of its variations before it shows, in one read of the store, as the review reads its own. It
   only reads: the engine searches nothing more. The labels and notes of the moves evaluated are in its first frame,
   and do not move the bar under the moves when they come (a layout shift). The other positions' results give their
   ◆ (item 3), so that a mark does not show only where the player stood during this visit. They give no label. They
   also give the lead in the moves' tooltips, and their evaluations in the record (item 7).
5. **The ways in:**
   - **Analysis** in the header: the board as the player left it.
   - **A link** that carries a line: `/analysis#record=…` (a record), or `/analysis#packed=…` (a shared analysis),
     with `&at=` for the position (design 22).
   - **A game from the bookmarklet or the userscript** (design 11): the import page (`/import`, design 22) asks first,
     "Review the game" or "Analyze on the board" (`src/lib/review/Arrival.svelte`). A player who watches a game on
     meaf.us or strategyjam.org often wants to show how a move could have gone, not to wait for the review of the whole
     game.
     - **Review the game** keeps the game in the list of games, and reviews it.
     - **Analyze on the board** keeps no game in the list. The page goes to `/analysis#record=…&at=…&via=…`
       (`analysisAddress` in `src/lib/game/importHash.ts`): the game's moves are the main line, so each line that the
       player draws is a variation of the game. The board opens at the position that the game's page showed (`at`,
       design 11), else at the game's last move, the position that a page without a replay shows. `via` names the
       tool, for the import's source. The board checks the record and asks before it replaces the player's board, as
       for any record brought.
     - **The choice is the site's,** not the tools': the bookmark's loader stays as it is (`BOOKMARK_VERSION`), and the
       userscript updates itself, so no player installs a tool again. An older bookmark, or a userscript that
       Tampermonkey has not yet updated, gets the choice too, on the review if it opens the review. Its game carries no
       `at`, so the board opens at the game's end.
     - **The page asks before it keeps anything.** It reads the record first, so a record that it cannot read fails at
       once. The engine's rules check the record on the page chosen. A player who closes the page imports nothing.
     - **A partner's link** (design 18) goes straight to the review. Its button says "Review".
   - **The board's New menu,** beside its Export: every way to start the board again. Each replaces the analysis kept
     here, after the board asks (item 6).
     - **Standard start:** a new analysis from the game's start. Lichess's board needs none, since it keeps no
       analysis. This board keeps one, so the player needs a way back to an empty one.
     - **Board editor** (item 10), from the position on screen.
     - **Import a position or moves:** the position field and the moves field (item 9). The moves field asks for the
       moves "from the position": a game record, finished or not, or a plain list of edges. "A game" alone would read
       as a finished game. A position alone opens the board at it. A record is checked as an import is (the
       rules, the variant), and its line becomes the main line. It is not kept in the list of games. Its variations
       stay behind: the record's reader keeps the line only.
     - **Load an analysis file,** with the file chooser. An analysis file dropped in the Review tab comes here too. A
       file that cannot be read leaves the board as it was, with a line that says why.
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
     once, from the board's Load.
   - **The record,** copied or as a file: the main line, the variations, the result `*` (unfinished, engine design
     04), the marks of the moves evaluated, and the evaluations of the positions searched (design 13's marks and
     `[%eval]` comments).
8. **Unfinished games:** the notation's result `*` marks a game not finished or not known. A record with `*` can be
   reviewed as any game, or opened on the board.
9. **A start from another position:**
   - **The board's start** is the standard start, or a set-up position in the notation. The standard start written out
     is no set-up start (`setUpStart` in `src/lib/engine/notation.ts`), so its stored results stay its own. Every query
     of the board sends it (`position`, with the moves after it), and the stored results' keys name it (`keyMoves` in
     `packages/analysis/src/cache.ts`), so that a line from one start never takes another start's results.
   - **The record carries the start:** the notation's `[Position "…"]` tag (engine design 04, as PGN's `FEN` tag),
     with the moves after it. The board reads it, and its record export writes it. A review refuses such a record,
     and says to open it on the board (`variantProblem` in `src/lib/game/import.ts`): a review is of a game played
     from the standard start.
   - **A link and a file carry it:** the board's link packs it in its tags as `Position`, as a record carries it, and
     the analysis file keeps it in its board (`start`).
   - **The turns number from the start's:** the edge count fixes the turn, so a line from edge 4 starts at turn 3,
     and its first edge can be a turn's second, written `3... D10-G12` in the record and "3. …" in the move list.
   - **The Import takes a position and moves apart,** as Lichess's board takes a FEN and a PGN: a position field
     (empty for the standard start) and the moves from it. With both, the record's own `Position` tag must be the same
     or absent.
10. **The board editor** (`/editor`, Lichess's board editor):
    - **Its entries:** the board's New menu and the Import's link, which start it from the position on screen, as
      Lichess's editor starts from its analysis board, and a card on the home page. Its address is `/editor#position=…`.
      The position leaves the address at once, and the browser keeps the one being made, so that a reload keeps it.
    - **Three tools:** Blue's edges, Red's edges, and the marks. An edge is two clicks: its two points, at most 3 apart
      in each direction (the engine's 48 directions), or a drag from one to the other. The same edge again removes it,
      and the other player's tool gives it to that player. A mark is an edge of the turn: the waiting player's edges of
      the last turn (protected, `*`) and the mover's edges of this turn so far (placed, `+`). The page writes `*` or
      `+` from the edge's player and the mover, so a mark follows a change of the edge count. A player has at most two
      marked edges.
    - **The right button draws the other player's edge,** as in drawing programs: in MS Paint the left button draws
      the main colour and the right button the second. With Blue's tool, a left click draws Blue and a right click
      Red, and the other way with Red's. The click that completes an edge sets its player, and the dashed edge shows
      the player of the last click's button. With the marks, the right button does what the left does. The editor has
      no notes, so its right button is free. The Analysis board keeps its right button for notes (design 07, item 16).
      **X** swaps the two players' tools, as Photoshop's X swaps its two colours. A touch screen has no right button,
      so it keeps the tool buttons.
    - **Chains:** after an edge, its end point stays as the next edge's first point, so an enclosure's chain of edges
      takes one click for each edge. **Escape** ends the chain, and so does a click on that point again (the way on a
      touch screen). A removed edge ends the chain. A point too far for an edge begins a new one, and a drag always
      begins its edge at the pressed point. The marks take two clicks each, with no chain. The cost: a new edge that
      starts near the last edge's end needs the chain ended first, or else the first click draws an edge from that end.
    - **The edge count follows the board:** it is the edges drawn, all but the two start edges (A10-D10 and Q10-T10,
      each player's edge before the first), until the player types a count, which then stays. A choice "Blue to play"
      or "Red to play" changes the count to the next count with that mover. With a count from the board, the choice
      stays as the player draws edges. A typed count changes to the next count from itself with that mover, and stays
      typed. The scores stay as they are until the player types them: 0/0 from the start. A position pasted or brought
      from another page follows the board when its count is the one that the board gives, with or without a mover
      chosen, and else keeps its count as typed (`CountRule` in `src/lib/editor/position.ts`). The browser keeps the
      rule with the position being made, so that a reload keeps it. The page says that the engine's numbers assume
      this count and these scores.
    - **The edge count and the scores are not the board's:** the notation stays a complete position. Neither follows
      from the edges on the board (the engine repository's design 04): a score adds each player's enclosed area at
      each turn's end, a cut removes an edge, and a timeout's forfeited edges count. The edges drawn are the edges
      played only when no edge was cut and no turn forfeited. An exact position comes from a real game: the import
      can analyze it.
    - **The edge count and the scores** are fields. The edge count fixes the mover and the edges left in its turn,
      which the page shows (a pass forfeits the rest of its turn, and the forfeited edges count). The page computes
      only the notation's turn structure (`moverOf` in `src/lib/editor/position.ts`). The engine checks the rest.
    - **Keys and clicks:** a list under the tools, closed until opened, gives the clicks, X and Escape.
    - **The position in the notation** is a field too, with a Copy button: it shows the position, and a position
      pasted there replaces it.
    - **The engine draws and checks it** at each change (request 16, protocol 0.5's `describe`): the board with its
      regions, and whether a game could reach it. A position that no game reaches shows the engine's reasons, its
      named edges glow on the board, and Analyze is off. A finished game (120 edges) cannot be analyzed either.
    - **Analyze** opens the Analysis board from the position (`/analysis#position=…`), after the board asks before it
      replaces its analysis.
    - **Standard start** and **Remove all edges** reset it.

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
- **Analytics** (design 17): `editor_open` when the editor opens, and `editor_analyze` for its Analyze.
  `analysis_open` when the board opens. A game brought to it is an import, as one brought
  to the review: `import_game` with `import_to` = analysis, and a tool's game chosen for the board keeps its tool as
  its `import_source`. A shared analysis or an analysis file is a load:
  `load_saved` with `load_source`. The board's features, settings' changes and exports are
  the review's events: the page's address tells them apart in the reports.
- **An unfinished line's end is searched,** on the board and in a review of an unfinished game: the review reads a
  line's last position as the result only when the game is over there (`review` in `packages/analysis/src/model.ts`).
- **The early access shows the board** (design 11).

## Where it is

- `src/routes/analysis/+page.svelte`: the board, its store and its ways in. `packages/analysis/src/session.svelte.ts`:
  its engine, the review's (`EngineSession`). `src/lib/review/ReviewView.svelte`: the
  view, in its board form (`BoardForm`). `packages/analysis/src/analysis.svelte.ts`: the board form of the analysis
  (`setMain`, `playLine`, `judgedMain`, `keptBoard`). `src/lib/game/board.ts`: the link and a record's line.
  `src/lib/game/analysisFile.ts`: the analysis file. `packages/analysis/src/model.ts`: `onlyJudged`.
  `src/lib/game/paste.ts`: a pasted record. `src/lib/game/importEvents.ts`: the imports' events.

## Log entries

- [decisions/product.md](../decisions/product.md): "The Analysis board" (2026-10-14).
