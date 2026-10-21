# The area map

**Status:** in force, built. **Decided:** 2026-10-20. **Changed:** 2026-10-21: the map shows the engine's ownership
again, with a second style for the change and the player's smallest value. The engine's lines get their own map. The
mistakes' captions and the opponent's turn drawn after a mistake are removed. A stored review gets the maps that it
lacks added on demand. The stored shape stays 5: a field that is only added takes no new shape. A candidate's map
comes from a short search of the position after its move, not from the full search. The map is always the map of
the position that the board shows, and follows a line as it is drawn. A third style, "After vs before", shows what a
move or a line changed in the forecast: KaTrain's loss grid at every move, with the rises.

## The players and their questions

The site is for players who want to improve, top players included ([docs/context.md](../context.md)). Three of them
ask different questions of the engine's ownership:

1. **The improving player** knows the rules and does not yet see the tactics coming. This player imports a lost game
   and steps through it, about 60 turns, to find a few mistakes. The question is: "What did my turn give away?" This
   player comes first.
2. **The strong player** reads the whole board and wants dense, exact information, on the Analysis board. At any
   position, the question is: "Which areas are safe, which are at risk, which are open, and where is the fight?"
3. **Later, the learner** in lessons and in the retry of a mistake ("Learning from mistakes", beads abscls-7e9), for
   whom the map is a hint.

Both of the first two also ask, when they look at a candidate or its line: "What does this move change?"

## The engine's fact

The engine's ownership of a point is the mean, over the turn ends left in the game, of +1 inside Blue's regions and −1
inside Red's (the engine repository's
[games/enclosure/docs/design/06-ownership-and-spatial-targets.md](https://github.com/abstractclass-org/engines/blob/main/games/enclosure/docs/design/06-ownership-and-spatial-targets.md)).
It counts the lattice points strictly inside the regions, not the points on their walls. So it spreads the rest of
the game's score over the points. It is not who holds a point at the end, as in Go: regions form and break all game
long, and each turn end scores. The protocol gives the root's ownership (`includeOwnership`) and each candidate's, the
mean over the candidate's subtree (`includeMovesOwnership`, the engine repository's
[docs/design/04-notation-and-protocol.md](https://github.com/abstractclass-org/engines/blob/main/docs/design/04-notation-and-protocol.md),
"What a reply holds"). The WebAssembly module of release `engine-d6786eba`, which the site uses, returns both. The
site asks for the root's alone.

## What the builds showed

**The first build** followed KaTrain, the Go review tool that the site follows (design 05): its Territory, which
shades each point in the colour of the side that owns it, as strong as it owns it, and its loss grid, which shades
where a move's ownership fell. On real reviewed games, the loss grid was clear on a third of the mistakes only, and
its caption was abstract.

**The second build** replaced both. Its map showed the change from the board now to the ownership, at a change of 0.5
or more, as dots and hatching. A Mistake or a Blunder was explained by the opponent's next turn in the engine's line:
the board drew that turn, and a caption said what it cut and closed, for example "After this turn, Red closes 2
points of area at O11." On real games, 112 of 128 mistakes got such a caption
([decisions/product.md](../decisions/product.md), "The area map and the explanations on real games"). A look at it
showed three faults:

- **The captions said nothing useful.** One turn's close or cut is never the real gain or loss of a mistake: the
  whole board decides it. A caption that names one turn's facts points the player at the wrong thing.
- **The drawn turn repeated the engine's line.** The line already shows what happens next, one edge at a time
  (design 07).
- **The change map was hard to read, and its threshold was the site's choice.** A player could not tell what "the
  ownership less the board" means, and could not see the data under the threshold. The first build's map of the
  ownership itself was easier to read.

## Decision

1. **The ownership is stored with the review.** Every search of the review and of the Analysis board asks for the
   root's ownership (`includeOwnership`), whatever the display settings, and a result keeps it in whole hundredths
   from Blue's side (`ownership` of the analysis). No search asks for the candidates' (`includeMovesOwnership`): a
   candidate's map comes from the position after its move (item 5). **The stored shape stays 5** (`SHAPE` in
   `packages/analysis/src/cache.ts`, design 05). A new shape is only for a change of what a result's fields mean, so
   that an older result is not misread. A field that is only added takes none: the reader checks whether the field is
   there, as it must for the results stored before it. So the ownership is an optional field of a result of shape 5.
   A review stored or exported before it opens at once with its results, which are never searched again or removed.
   The first builds of the map wrote shape 6 on their branch, for results of 5 with the ownership: the site reads them
   as shape 5 and keeps them (`READ_SHAPES`). The site before the map reads a review file of this site completely: it
   takes the results of shape 5 and ignores the fields that it does not know.
2. **The area map has three styles** (the display settings "Area map" and "Area map style", Board; `areaMap` and
   `differenceMap` in `src/lib/review/ownership.ts`). Each name says what the style compares, and the setting gives
   one sentence for each:
   - **Forecast** (the default): who the engine expects to hold each point, and how surely. Each point shaded in the
     colour of that side, as strong as |ownership| ^ (1 / 1.33), at most 0.45, and blended by a blur, under
     everything else. These are KaTrain's gamma and drawing, with the strongest shade lower, so that the regions and
     the edges stay readable.
   - **Forecast vs board:** what the engine expects still to happen, whoever moves, with no move judged. The ownership
     less the board, from Blue's side, where the board is +1 strictly inside Blue's regions, −1 strictly inside Red's
     and 0 at the open points (`occupancy`). Dots on open area that a side will probably close, and hatching on
     closed area that its owner will probably lose, each in the colour of the side that gains. A region that stays
     its owner's gets nothing.
   - **After vs before:** what a choice changed: the forecast after it less the forecast before it, from the side of
     the player who chose. KaTrain's loss grid (katrain/gui/badukpan.py, draw_board_contents), the first build's area
     lost, with the rises too. Where the forecast fell, a shade in the site's accent (lavender), as strong as
     |difference| ^ (1 / 1.33), at most 0.6, blended as the forecast is, so that it never looks like a region. Where
     it rose, plus signs in the text's colour, as strong as it rose: a shape, so that no colour has to tell it from
     the fall, the change marks or the regions, in light and dark and for a colour-blind player. The choice:
     - at the position on screen, or a played move's preview: the move to it, by the labels' unit (design 10). By
       turn, the forecast at the turn's start against the forecast here; by edge, the edge's. At every move, the
       engine's best too, on the game's line and in a branch. The start of the game has no move, and no map.
     - while a line or a branch's preview shows: the line's start against the position after its last drawn edge,
       from the side of the player to move at the start. Along the engine's own line little shows; along a poor
       candidate its loss shows.
     The forecast before a move is the mean over the whole search there, not the best move's alone. So small falls
     and rises show after the engine's best move too.
3. **The player sets the smallest value marked** ("Smallest value marked", from 0 to 1 in steps of 0.05), for each
   style apart (`mapMin` in `src/lib/review/display.ts`). At 0 the map shows every point with a value: the raw data.
   The defaults: 0 for the forecast and for after vs before (KaTrain's maps), and 0.5 for the forecast vs board (the
   second build's, measured on real games). It applies to the falls and the rises alike.
4. **The legend and the numbers.** While the map shows, one line in the board's empty margin above its top row says
   what it shows: "Shade: who the engine expects to hold each point"; "Forecast vs board:" and its two marks; or
   "After turn 21 vs before it:" with "fell for Blue" and "rose for Blue". While the mouse's pointer is on a point,
   the line gives that point's numbers in its place: its ownership, its state now and the change, for example
   "E5 · Blue 0.62 · now open · change 0.62 to Blue" (`pointReading`), or in after vs before the two forecasts and
   the fall or rise with its sign, "E5 · before Blue 0.80 · after Red 0.60 · fell 1.40 for Blue"
   (`differenceReading`). Touch gives no numbers: a touch on the board is edge input. A legend too long for the
   board's width ends in an ellipsis.
5. **The map is always the map of the position that the board shows.** That is the position on screen, or, while a
   line or a preview shows, the position after its last drawn edge (`mapLine`, `mapStep` and `drawnBoard`):
   - **The engine's line** (a candidate pointed at, on the board or in the table, or pinned): the map steps with the
     line as it draws one edge at a time ("Lines on the board": Animated). Drawn all at once (Static), the map is the
     line's end's. A line pointed at in the list up to an edge shows that edge's map.
   - **A branch's preview, the engine's line under a turn's note, and a played move's preview** follow the same rule.
   - **In the change style,** the board is the board as drawn: the position's edges less the ones that the line cuts,
     with the line's edges, and the regions after the last drawn edge.
   - **The maps of a line's positions** come as a candidate's map comes: the position's own result's where it has one
     (the game's next move), and else a map added to it (item 6). While a line shows, the page asks for them in the
     order of drawing: the edge drawn now, the edges after it, then the line's start (`askOrder`). An edge already
     drawn is not asked again: its search, if it still waits for a worker, ends at once, and the edges to come get
     the workers.
   - **The legend always names the position that its map is from:** "After edge 3 of the line", "After edge 2 of the
     branch", "After 21. K19-N19", and nothing for the position on screen. While the map of the edge drawn now is
     searched, the board keeps the latest map of the line before it, and the legend says so: "After edge 2 of the line
     (edge 3: searching)". So the map never flickers off between two steps, and it never shows one position's map as
     another's. A position that the engine does not search (the game ends there) says "no map" in its place.
6. **A stored review gets the maps that it lacks, on demand, and keeps them.** When the site starts to use a kind of
   data that a stored result lacks, the result gets it added beside it. The result's own search, visits and
   candidates stay as they are: the review is not done again. For the maps (`askOwnership` and `mapAt` in
   `packages/analysis/src/analysis.svelte.ts`):
   - A position whose result has no ownership gets it from a short search of the position alone, while the map shows
     the position.
   - A candidate gets its map from a short search of the position after its move, when the candidate is pointed at,
     on every review: the results keep no candidates' maps. So does each position of a line that the board draws
     (item 5). Where a position has a result of its own (the game's next move), its ownership serves.
   - The short search has MAP_VISITS visits, 32, and runs just after the position on screen's search.
   - The map is stored in the analysis store beside the results, under its position's result's key for the search,
     at MAP_VISITS, with `map|` before it. Its value names its source: the short search and its visits (`mapKey`,
     `mapPut` and `mapGet` in `packages/analysis/src/cache.ts`). So a review opened again reads it with no search, a
     review file takes it with its positions' results (design 13), and the removal of earlier results treats it as a
     result of its search (`src/lib/game/earlierResults.ts`). A snapshot never takes it as a search (design 20). The
     site before the map never takes it as a result: its key does not start with a shape, so that site's key check
     refuses it, in a review file and in the store.
7. **Defaults by page.** The review starts with the map off: the improving player steps through the whole game, and a
   clean board shows the labels first. The Analysis board starts with the map on: its player reads the whole board.
   Each page keeps its own switch (`areaMap` in `display.ts`). **The key t** shows or hides the map on both, as
   KaTrain's T shows its Territory.

## Why

- **No captions for the mistakes, because one turn does not explain a mistake.** What a mistake gave away is the
  difference over the whole rest of the game. The label states the cost, and the engine's line and the map show
  where it goes. A sentence on one turn's close or cut was exact and misleading.
- **The forecast as the default style, because it reads at once.** The players read a shade by colour as "whose",
  and its strength as "how surely". The forecast vs board asks the player to subtract the board in their head. It
  stays as a style for a player who wants to see only what is still to happen.
- **After vs before, because a label says what a move cost, and not where.** It compares two forecasts, before and
  after a choice, where the forecast vs board compares one forecast with the board: the names and the legends say
  which, so that the two are not confused. The three styles stay while they are compared, and one may go later.
- **The smallest value is the player's,** because the threshold is a judgement on what is noise, and it changes with
  the player and the position. At 0 the player sees the engine's data as it is.
- **The numbers under the pointer,** because a shade is a rough reading. A player who doubts a shade can read its
  value, and the change, at the point.
- **A map for the engine's lines, because the line is where the player asks "what does this move change?".**
- **The map follows the line as drawn,** because the map and the board must show one position. A map that stays at
  the line's first edge while the line goes on disagrees with the board from the second edge on. The players' area
  tags already follow the last drawn edge.
- **A candidate's map from the short search, not from the full search** (`includeMovesOwnership`), because the full
  search's maps give nothing that the short search does not, at a cost that every review pays. A candidate on the
  board rests on few visits of the full search (a median of 17 of 512 on the test fixture's game), so a short search
  of the position after it is about as deep. A short search of 32 visits differs from the full search's map of the
  candidate by 0.007 at a point (the median candidate), and a search of 512 visits by 0.009
  ([decisions/product.md](../decisions/product.md), "A candidate's map from a short search"). On a close game of our
  own bots, the candidates on the board are few and well searched (a median of 355 visits), and a short search of 32
  visits differs by 0.019, a search of 512 visits by 0.015: a small cost, at a thirtieth of the time ("A candidate's
  map from a short search, on a close game"). The full search's maps
  made the stored review three times as large (1,017 kB to 3,093 kB) and the review about a fifth slower (a median of
  323 s to 386 s) ([decisions/product.md](../decisions/product.md), "The candidates' maps: their size and their
  time"). The short search costs a delay the first time that a candidate is pointed at: less than half a second
  with the engine idle, and 1 to 7 s while the review's searches run.
- **Added maps, not a review again,** because a review again replaces results that a player looked at, and costs a
  whole review for one kind of data.

## Departures from KaTrain

The site follows KaTrain's review (design 05). The display departs from it on purpose, for the reasons above:

- **A style of the forecast vs board.** KaTrain's Territory shades the ownership alone. In Go the stones are the
  state and the territory is not on the board. In Enclosure the regions are on the board, and a player can ask for the
  forecast less the board.
- **The player's smallest value.** KaTrain shades every point, as strong as its ownership. The default here is the
  same (0), and the player can raise it.
- **The strongest shade 0.45, not 0.75.** KaTrain's 0.75 is for black and white stones on a wooden board. Here the
  players' colours at 0.75 hide the regions' fill and the edges.
- **Off by default on the review.** KaTrain's Territory is on in its analysis mode. The review's first player steps
  through a whole game for a few mistakes. The Analysis board keeps KaTrain's default, and the key t is KaTrain's T.
- **The numbers of the point under the pointer.** KaTrain gives none.
- **The map of a candidate's line.** KaTrain shows the root's territory while a candidate's line shows.
- **The loss grid at every move.** KaTrain shows its loss grid only in its teaching mode, on a move that it took back:
  by default every move that loses 3 points or more, and half of those that lose 1.5 to 3 (its config.json,
  eval_thresholds and num_undo_prompts). Here "After vs before" shows at every move, on the review and on the Analysis
  board, because the player asks what each move gave away, not only past a label's threshold. The smallest value
  marked does the filtering.
- **The rises as well as the falls.** KaTrain's loss grid shows the falls alone (its max(0, …)). A move can lose area
  in one place and gain some in another, a trade, and still be worse than the engine's choice. With the falls alone,
  a trade looks like a pure loss, and what it bought is hidden.

## Alternatives

- **The change map alone** (the second build): hard to read, and its threshold was not the player's.
- **A caption from the opponent's next turn in the engine's line** (the second build): exact and misleading (Why).
- **A caption from the ownership's numbers** (the first build's bands: "holds it for half the turns left or more"):
  abstract.
- **The area that a mistake lost, at a Mistake or a Blunder alone, where it was clear** (KaTrain's loss grid, the
  first build): clear on a third of the mistakes only, with a caption, and nothing at the other moves. "After vs
  before" shows it at every move, with no rule of clarity.
- **The full search's candidates' maps** (`includeMovesOwnership`, kept for the candidates on the board: the third
  build): the stored review three times as large and the review a fifth slower, for maps that a short search gives as
  well (Why).
- **No map for a result stored before the maps** (a candidate's line of a stored review shows none): a stored review
  would never get the maps without a review again.
- **A new shape for each field added** (6 for the ownership, 7 for the candidates' maps, on the branch): a shape says
  what a result's fields mean, and an added field changes no meaning. Each shape would also make the site before it
  drop a review file's results.
- **A review again for the maps:** a whole review's cost, and the results that the player looked at change.
- **The ownership only when the map is on:** a review made with the map off would have no map, and a change of the
  setting would need the review again.

## Consequences

- The stored shape did not change, and the results stored before stay: a stored game and a review file open at once
  with their labels, lines and points lost (design 05, item 3, and design 13). Their maps come from the short
  searches of item 6, as the player looks, and then stay.
- **The review keeps its time and its size:** no search asks for the candidates' maps. A candidate's map costs one
  short search, the first time that it is pointed at in a browser, and then stays in the store. The map shows a
  median of 0.44 s after the pointer with the engine idle, and 2.8 s (1 to 7 s) while the review's searches hold both
  workers ([decisions/product.md](../decisions/product.md), "The delay of a candidate's map").
- **A line's maps keep up when the engine is idle, and not while the review runs.** With the engine idle, the first
  step's map comes within half a second, and each later step's is there when its edge is drawn. While the review's
  searches hold both workers, a third of an animated line's steps never get their map while they are drawn: the
  legend then says which earlier map shows ([decisions/product.md](../decisions/product.md), "The map follows the
  line as drawn").
- **After vs before marks a third of the board after a best move, faintly,** at the default smallest value (0): the
  forecast before a move is the mean over its whole search. From 0.1 up, a best edge marks a median of 2 points
  ("After vs before: the third style").
- **A general rule for later data:** when the site starts to use a kind of data that a stored review lacks, the review
  gets it added on demand, beside its results, and is not done again. The added data is stored with its source, and
  goes into a review file.
- "Learning from mistakes" (beads abscls-7e9) can take the map as its hint: the map of the position before the
  mistake, or of the engine's best candidate there.
- The weak-wall map (beads abscls-udwl) can later show which wall breaks, beside the map.

## Where it is

- `src/lib/review/ownership.ts`: `areaMap`, `differenceMap`, `occupancy`, `shade`, `pointReading`,
  `differenceReading`, `drawnBoard`, `mapStep`, `askOrder`. Tests: `ownership.test.ts`.
- `src/lib/board/Board.svelte`: the map's three styles (`areaMap`, the layer `areaMap`; `FALL_ALPHA` and the rise's
  pattern) and the point under the pointer (`onpointat`).
- `src/lib/review/ReviewView.svelte`: `MAP_STYLE_NAME`, `mapOn`, `toggleMap`, `mapLine`, `mapShown`, `diffBase`,
  `mapPlace`, `shownMap`, `mapReading`, the legend, the settings and the key t. `src/lib/review/display.ts`:
  `areaMap`, `mapStyle`, `mapMin`.
- `packages/analysis/src/reply.ts` (the ownership in hundredths), `packages/analysis/src/analysis.svelte.ts` (every
  search asks for the root's map, `askOwnership`, `mapAt`, `hasNoMap`),
  `packages/analysis/src/cache.ts` (`SHAPE` 5, `READ_SHAPES`, `MAP_VISITS`, `mapKey`, `mapPut`, `mapGet`),
  `src/lib/game/earlierResults.ts` (the added maps kept with the site's results), `packages/engine/src/protocol.ts`
  (the fields).
- The measurements: `scripts/measure/review-ownership.mjs` (the maps' size and time in a whole review),
  `scripts/measure/candidate-maps.mjs` (a candidate's map from a short search),
  `scripts/measure/candidate-map-delay.mjs` (its delay in the browser), `scripts/measure/line-map-lag.mjs` (the
  maps' lag behind an animated line), `scripts/measure/difference-at-best.mjs` (after vs before at the best moves)
  and `scripts/measure/ownership-maps.mjs` (the change style's share of the board
  on real games).

## Log entries

- [decisions/product.md](../decisions/product.md): "The area maps on real games", "The window of the area lost" and
  "The results of shape 5 stay readable" (2026-10-21), for the first build. "The area map and the explanations on real
  games" (2026-10-21), for the second. "The candidates' maps: their size and their time", "A candidate's map from a
  short search", "The delay of a candidate's map", "A candidate's map from a short search, on a close game", "The
  map follows the line as drawn" and "After vs before: the third style" (2026-10-21), for this one.
- [decisions/engine.md](../decisions/engine.md): "The cost of the ownership in a whole review" (2026-10-21).
