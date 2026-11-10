# The area map

**Status:** in force, built. **Decided:** 2026-10-20. **Changed:** 2026-10-21: three styles, a map for every
position that the board shows, the maps that a stored review lacks added on demand, the map's state, the map stage, and
the maps of a review snapshot. 2026-11-04: the signs of after vs before in green and yellow, by good and bad for the
player who chose. 2026-11-08: a prototype of the weak walls, for a look before a decision ("The weak walls: a
prototype"). 2026-11-09: the weak walls in one form, a ring whose colour gives the chance, and the margin's texts
that fit a window 360 pixels wide. 2026-11-10: the rings' colour in a ramp of three hues.

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
long, and each turn end scores. The protocol gives the root's ownership (`includeOwnership`), and each candidate's
too, the mean over the candidate's subtree (the engine repository's
[docs/design/04-notation-and-protocol.md](https://github.com/abstractclass-org/engines/blob/main/docs/design/04-notation-and-protocol.md),
"What a reply holds"). The WebAssembly module of release `engine-c43233eb`, which the site uses, returns both. The
site asks for the root's alone (item 6).

## Decision

1. **The ownership is stored with the review.** Every search of the review and of the Analysis board asks for the
   root's ownership, whatever the display settings, and a result keeps it in whole hundredths from Blue's side
   (`ownership` of the analysis). **The stored shape stays 5** (`SHAPE` in `packages/analysis/src/cache.ts`, design
   05). A new shape is only for a change of what a result's fields mean, so that an older result is not misread. A
   field that is only added takes none: the reader checks whether the field is there, as it must for the results
   stored before it. So the ownership is an optional field of a result of shape 5, and a review stored or exported
   before it opens at once with its results, which are never searched again or removed.
   - **Shape 6:** development builds of the area map wrote it, before this rule, for results of 5 with the
     ownership. The site reads a result of 6 as one of 5 and keeps it (`READ_SHAPES`). Of two results as deep, it
     takes the one of 6, which has the ownership.
   - **A file:** a review file and an analysis file hold every result under its key of shape 5 (`atShape`). So the
     site before the area map reads a file of this site whole: it takes the results of shape 5, ignores the fields
     that it does not know, and leaves out the maps of item 6.
2. **The area map has three styles** (the display setting "Area map style", Board: `ownershipMap`, `changeMap` and
   `differenceMap` in `packages/review/src/ownership.ts`). Each name says what the style compares, and the setting gives
   a short explanation of each. They differ by shape: shading, dots and hatching, and signs. The forecast's shade and
   the change's marks are in the colour of the side that the point moves toward, as every other mark of the board is.
   The signs of after vs before are in the colour of good or bad for the player who chose.
   - **Forecast** (the default): who the engine expects to hold each point, and how surely. Each point is shaded in
     the colour of that side, as strong as |ownership| ^ (1 / 1.33), at most 0.45, and blended by a blur, under
     everything else. These are KaTrain's gamma and drawing, with the strongest shade lower, so that the regions and
     the edges stay readable.
   - **Forecast vs board:** what the engine expects still to happen, whoever moves, with no move judged. The ownership
     less the board, from Blue's side, where the board is +1 strictly inside Blue's regions, −1 strictly inside Red's
     and 0 at the open points (`occupancy`). Dots mark open area that a side will probably close. Hatching marks closed
     area that its owner will probably lose. Each mark is in the colour of the side that gains. A region that stays
     its owner's gets nothing.
   - **After vs before:** what a choice changed. The forecast after it less the forecast before it, from the side of
     the player who chose: KaTrain's loss grid (katrain/gui/badukpan.py, draw_board_contents), with the rises too.
     Where the forecast rose for the player who chose, green plus signs show. Where it fell, yellow minus signs show.
     The colours are the same whichever side chose, so a sign's colour and its shape say the same thing: good or bad
     for the player who chose. The setting's explanation names the two colours, and the legend draws the two signs.
     Each sign is as strong as |difference| ^ (1 / 1.33), with no blur.
     - **The colours** are the tokens `--sign-green` and `--sign-yellow` (`packages/review/src/review.css`), the
       quality labels' green and yellow (`SIGN_COLOUR` and `signInk` in `ownership.ts`). Each is at least 3:1 against
       the board (WCAG 2.2, 1.4.11), whose colours Hedge School and Cyanotype share. The green is Excellent's: #4f8830
       on the light board (3.59:1) and #6faa52 on the dark board (4.32:1). On the dark board the yellow is
       Inaccuracy's fill, #d9a521 (5.35:1). On the light board Inaccuracy's own ink (#bc8d07) is only 2.53:1, so the
       yellow is the same hue darker: #9e7706 (3.45:1).
     - **The shapes** carry the meaning without the colours (1.4.1): a player who cannot tell green from yellow reads
       the plus and the minus.
     - **A halo in the board's colour** keeps each sign whole. It also keeps the sign's contrast where the sign meets
       another colour: a region's fill, an edge, and on Cyanotype a Blue or a Red cell. Against a cell or an edge, no
       green or yellow is 3:1: the four colours are 1.05:1 to 1.47:1. On the light board, none is 3:1 against a
       region's fill either: 2.83:1 to 2.94:1. The halo itself is at least 3.65:1 against a cell or an edge.

     The choice that it judges:
     - At the position on screen, or a played move's preview, it is the move to it, by the labels' unit (design 10).
       By turn, the forecast at the turn's start against the forecast here. By edge, the edge's. It shows at every
       move, the engine's best too, on the game's line and in a variation. The game's start has no move, and no map.
     - While a line or a variation's preview shows, it is the line: its start against the position after its last drawn
       edge, from the side of the player to move at the start. Along the engine's own line little shows. Along a poor
       candidate, its loss shows.

     The forecast before a move is the mean over the whole search there, not the best move's alone. So small falls
     and rises show after the engine's best move too.
3. **The player sets the smallest value marked** ("Smallest value marked", from 0 to 1 in steps of 0.05), for each
   style apart (`mapMin` in `src/lib/review/display.ts`). At 0 the map shows every point with a value: the raw data.
   The default is 0.05 for all three. At 0, after vs before marks a third of the board after the engine's best move,
   faintly. At 0.05, it marks a median of 7.5 points. A browser keeps the value that it has stored. The value applies
   to the falls and the rises alike.
4. **The legend and the numbers.** While the map shows, one line in the board's empty margin above its top row says
   what it shows: "Shade: who the engine expects to hold each point", "Forecast vs board:" with its two marks, or
   "After turn 21 vs before it:" with "fell for Blue" and "rose for Blue". While the mouse's pointer is on a point,
   the line gives that point's numbers in its place: its ownership, its state now and the change, for example
   "E5 · Blue 0.62 · now open · change 0.62 to Blue" (`pointReading`). In after vs before, it gives the two forecasts
   and the fall or the rise with its sign, for example "E5 · before Blue 0.80 · after Red 0.60 · fell 1.40 for Blue"
   (`differenceReading`). Touch gives no numbers: a touch on the board is edge input. A legend too long for the
   board's width ends in an ellipsis.
5. **The map is always the map of the position that the board shows.** That is the position on screen, or, while a
   line or a preview shows, the position after its last drawn edge (`mapLine`, `mapStep` and `drawnBoard`):
   - **The engine's line** (a candidate pointed at, on the board or in the table, or pinned): the map steps with the
     line as it draws one edge at a time ("Lines on the board": Animated). Drawn all at once (Static), the map is the
     map of the line's end. A line pointed at in the list up to an edge shows that edge's map.
   - **A variation's preview, the engine's line under a turn's note, and a played move's preview** follow the same rule.
   - **The threat** (design 31) is a line from the position after a pass: its step 0 is that position, whose map the
     threat's search gives. In after vs before it compares the position before the pass with the step shown, for the
     player who passes, so that it shows where the forecast falls if the player passes.
   - **In forecast vs board,** the board is the board as drawn: the position's edges less the ones that the line
     cuts, with the line's edges, and the regions after the last drawn edge.
   - **The maps of a line's positions** come as a candidate's map comes (item 6). While a line shows, the page asks
     for them in the order of drawing: the edge drawn now, the edges after it, then the line's start (`askOrder`). An
     edge already drawn is not asked again: its search, if it still waits for a worker, ends at once, and the edges to
     come get the workers.
   - **The legend always names the position that its map is from:** "After edge 3 of the line", "After edge 2 of the
     variation", "After 21. K19-N19", and nothing for the position on screen. While the map of the edge drawn now is
     searched, the board keeps the latest map of the line before it, and the legend names that map's edge. So the map
     never flickers off between two steps, and it never shows one position's map as another's. Where the edge drawn
     now ends the game, the engine does not search it, and the legend says so: "(edge 3: no map)".
6. **A stored review gets the maps that it lacks, on demand, and keeps them.** When the site starts to use a kind of
   data that a stored result lacks, the result gets it added beside it. The result's own search, visits and
   candidates stay as they are: the review is not done again. For the maps (`askOwnership` and `mapAt` in
   `packages/analysis/src/analysis.svelte.ts`):
   - A position whose result has no ownership gets it from a short search of the position alone, while the map shows
     the position.
   - A candidate gets its map from a short search of the position after its move, when the candidate is pointed at.
     The results keep no candidates' maps. So does each position of a line that the board draws (item 5). Where a
     position has a result of its own (the game's next move), its ownership serves.
   - A position of the game's tree with no result waits for its own search where the review searches it (a position
     of the game while the review runs, the position on screen). A variation's position and a position of the Analysis
     board, which nothing searches until the player looks at them, get a short search.
   - The short search has `MAP_VISITS` visits, 32, and runs just after the position on screen's search.
   - The map is stored in the analysis store beside the results, under its position's result's key for the search,
     at `MAP_VISITS`, with `map|` before it. Its value names its source: the short search and its visits (`mapKey`,
     `mapPut` and `mapGet` in `packages/analysis/src/cache.ts`). So a review opened again reads it with no search, and
     a review file takes it with its positions' results (design 13). The site before the area map never takes it as a
     result: its key does not start with a shape, so that site's key check refuses it, in a review file and in the
     store.
   - **A review snapshot** (design 20) searches nothing. It reads the maps added to its positions from the store, with
     the search and the network file of its results, and never takes a map as a search (`freeze`). A map that the store
     lacks cannot come, and the note says so (item 9).
   - **The removal of earlier results** keeps an added map at each position whose results a review snapshot reads
     (design 20, item 8: the game's positions and those one move from them), whatever the depth of the results there.
     Elsewhere it removes the map with its search's results (`src/lib/game/earlierResults.ts`). So the map of a line's
     later edge goes, and the review snapshot's line then lacks it.
7. **Defaults by page.** The review starts with the map off: the improving player steps through the whole game, and a
   clean board shows the labels first. The Analysis board starts with the map on: its player reads the whole board.
   Each page keeps its own start (`areaMap` in `display.ts`).
8. **A quick switch, on the page and on the keys.** In the board's top margin, at the left of the legend, on the review
   and on the Analysis board: Off, Forecast, Forecast vs board and After vs before, one click for each (`MAP_SWITCH`
   and `setMap` in `ReviewView.svelte`). Its buttons are small icons, with their names for screen readers and as
   tooltips, so that the switch and the legend fit the margin at 390 pixels. The legend ends in an ellipsis where it
   does not fit. A click on them takes no focus from the page, whose keys step through the game. **The key t** shows
   or hides the map, as KaTrain's T shows its Territory, so that hiding it is always one key. **Shift+T** goes to the
   next style (Forecast, Forecast vs board, After vs before, then Forecast again), and shows the map if it is hidden.
   The page keeps the style last chosen. The display menu keeps the same style setting ("Area map style"), each
   page's start and the smallest value marked, and both keys are in the list of keys ("?").
9. **The map's work is visible.** While the map is on, a short note in the legend's slot, before the legend, says
   what the map does (`mapWork` in `ReviewView.svelte`, `mapState` in `analysis.svelte.ts`):
   - For a position: "Map: waiting for the engine" while its search waits behind other searches, "Map: searching" while
     it runs, and "No map: the game ends here" where none can come. In a review snapshot, a map that the store lacks
     says "No map saved: review snapshots do no searches". In after vs before, the map before the move counts too, and
     the game's start says "No map: the game starts here". There is no note when the map shown is the position's own:
     the legend alone means that the map is ready.
   - For a line or a preview: "Maps of the line: 3 of 7", the positions of the line whose maps are there.
   While work goes on, the note carries the site's sign of work in progress, the gleam of the review's progress bar
   (bar-glider, Lichess's). The note stays on one line. Where the board is narrower than the note, as in a window 360
   pixels wide, the note ends with an ellipsis, and its title gives it in full. **Every state that the note shows
   ends:**
   - The note reads the map as the board does: a map that shows is ready.
   - "Waiting" means asked for and not yet searched, or the position's own search to come (`pending`). The analysis
     keeps what the page asked for last (its maps and the map stage), and asks again once the engine is ready or on
     again (`askAgain`): a page that opens or reloads asks before the engine's network has loaded.
   - A map that its task gave up without a try (a search that the page did not want when it started, or the engine
     off) is asked for again while the page wants it. No map's search starts while the engine is off.
   - A position with no result and no search to come gets a short search (item 6), never a wait. When the position's
     own search brings a result with no map (a result stored before the maps), the map is asked for again then.
   - Another network asks again for the maps that the old one was searching: it drops the old network's record of
     the maps in work, and the old network's tasks touch the new record no more.
   - The game's last position, where the game ends, knows that it has no map (`hasNoMap`), with no search.
   - Only the task that holds a map's state changes or ends it: a task that another task replaced, or a pass that the
     engine off ended, touches it no more.
   - A map that nothing asks for has no note.
10. **The map stage, for an older review.** While the map is on, once the review's stages are done, the analysis
    makes the maps of every position of the game that has none, in order from the position on screen to the game's
    end, then back to its start, and stores them as the maps of item 6 (`passMaps` in `analysis.svelte.ts`). It runs
    only on the review. Its progress is one more part of the review's progress bar, with its line ("Maps: 34 of
    120"), after the review's own parts. The review is done without it: its mark, its export and its end do not wait.
    A review whose results all have their maps never shows it.
    - **It gives way to the player.** Its searches have the lowest priority and run in slices of 8 visits
      (`MAP_SLICE`), so that the engine stops one at once for any search for the player and runs it again later. A
      map that the page asks for while the pass still holds it in its queue gets the page's own search, ahead of the
      pass.
    - **It stops when the map goes off.** Its searches in the queue go at once. A search that runs ends at its 32
      visits and keeps its map. A pass that starts again later counts only its own searches (`mapPassRun`).
    - **It stops when the engine goes off, and starts again when the engine comes on** (`setPaused` and `askAgain`).
      The engine off stops every search, so the pass lets go of its maps, and the pass that starts again searches
      them. Its part of the progress bar goes while the engine is off.

## Why

- **One explanation from engine facts, with no caption.** A mistake's label states what it cost, and the engine's
  line shows what was better. The map shows where: what each side is expected to hold, and what a choice changed. A
  sentence on one turn's close or cut was exact and misleading: what a mistake gave away is the difference over the
  whole rest of the game ([decisions/product.md](../decisions/product.md), "The area map and the explanations on real
  games").
- **The forecast as the default style, because it reads at once.** The players read a shade by colour as "whose",
  and its strength as "how surely". Forecast vs board asks the player to subtract the board in their head, and a
  threshold of the site's hid the data under it. It stays as a style for a player who wants to see only what is still
  to happen.
- **After vs before, because a label says what a move cost, and not where.** It compares two forecasts, before and
  after a choice, where forecast vs board compares one forecast with the board. The names and the legends say which,
  so that the two are not confused. The three styles stay while they are compared, and one may go later.
- **The players' colours say whose, the labels' colours say good or bad.** Every mark of the board that says whose
  is in the colour of the side that it favours: the regions, the edges, the candidates, the forecast and the change.
  The signs of after vs before say something else: good or bad for the player who chose. The players' colours say it
  badly. If a plus is in the colour of the player who chose and a minus in the enemy's, a blue minus reads as "Blue
  lost here". But it means that the point moved toward Blue, which is bad for Red, the player who chose. The colour
  and the shape then say two things, and the colour wins. In green and yellow, the labels' colours for good and
  inaccurate, the colour and the shape say one thing for either side. KaTrain's loss grid does the same: it draws its
  losses in one colour of its evaluation scale, whichever side moved. The signs use the labels' colour language, so
  they add no new one. A red-green colour-blind player can confuse the green and the yellow, and reads the plus and
  the minus.
- **The smallest value is the player's,** because the threshold is a judgement on what is noise, and it changes with
  the player and the position. At 0 the player sees the engine's data as it is.
- **The numbers under the pointer,** because a shade is a rough reading. A player who doubts a shade can read its
  value, and the change, at the point.
- **The switch on the page, because the style changes as often as a position is read.** The player compares what a
  position is expected to give (Forecast), what is still to happen (Forecast vs board) and what the last move changed
  (After vs before) at the same position, one after another. The other display settings change once in a while, and
  stay in the menu.
- **A map for the engine's lines, because the line is where the player asks "what does this move change?".**
- **The map follows the line as drawn,** because the map and the board must show one position. A map that stays at
  the line's first edge while the line goes on disagrees with the board from the second edge on. The players' area
  tags already follow the last drawn edge.
- **A candidate's map from the short search, not from the full search's candidates' maps,** because the full search's
  maps give nothing that the short search does not, at a cost that every review pays. A candidate on the board rests
  on few visits of the full search (a median of 17 of 512 on the test fixture's game), so a short search of the
  position after it is about as deep. A short search of 32 visits differs from the full search's map of the
  candidate by 0.007 at a point (the median candidate), and a search of 512 visits by 0.009
  ([decisions/product.md](../decisions/product.md), "A candidate's map from a short search"). On a close game of our
  own bots, the candidates on the board are few and well searched (a median of 355 visits), and a short search of 32
  visits differs by 0.019, a search of 512 visits by 0.015: a small cost, at a thirtieth of the time ("A candidate's
  map from a short search, on a close game"). The full search's maps made the stored review three times as large
  (1,017 kB to 3,093 kB) and the review about a fifth slower (a median of 323 s to 386 s) ("The candidates' maps:
  their size and their time").
- **Added maps, not a review again,** because a review again replaces results that a player looked at, and costs a
  whole review for one kind of data.
- **The map's work visible, because the player must see whether work goes on.** A map that waits for the engine
  looks like no map, and a line's maps that come one by one look like a map that does not follow the line. While a
  review runs, a map's short search waits for seconds behind the review's searches.
- **A pass for the whole game, because a stored review's positions lack their maps one by one.** Without it, each
  position of an older review waits for its short search as the player comes to it. The pass makes them while the
  engine has nothing else to do, so that the player who steps through the game finds them there.

## Departures from KaTrain

The site follows KaTrain's review (design 05). The display departs from it on purpose:

- **A style of the forecast vs board.** KaTrain's Territory shades the ownership alone. In Go the stones are the
  state and the territory is not on the board. In Enclosure the regions are on the board, and a player can ask for the
  forecast less the board.
- **The strongest shade 0.45, not 0.75.** KaTrain's 0.75 is for black and white stones on a wooden board. Here the
  players' colours at 0.75 hide the regions' fill and the edges.
- **Off by default on the review.** KaTrain's Territory is on in its analysis mode. The review's first player steps
  through a whole game for a few mistakes. The Analysis board keeps KaTrain's default, and the key t is KaTrain's T.
- **The player's smallest value, 0.05 by default.** KaTrain shades every point, as strong as its ownership, and its
  loss grid every fall. Here a value under 0.05 gets no mark by default: after the engine's best move, the difference
  at 0 marks a third of the board. The player can set 0, KaTrain's, or more.
- **The numbers of the point under the pointer.** KaTrain gives none.
- **The map of a candidate's line.** KaTrain shows the root's territory while a candidate's line shows.
- **The loss grid at every move.** KaTrain shows its loss grid only in its teaching mode, on a move that it took back:
  by default every move that loses 3 points or more, and half of those that lose 1.5 to 3 (its config.json,
  eval_thresholds and num_undo_prompts). Here after vs before shows at every move, on the review and on the Analysis
  board, because the player asks what each move gave away, not only past a label's threshold. The smallest value
  marked does the filtering.
- **The rises as well as the falls.** KaTrain's loss grid shows the falls alone (its max(0, …)). A move can lose area
  in one place and gain some in another, a trade, and still be worse than the engine's choice. With the falls alone,
  a trade looks like a pure loss, and what it bought is hidden.
- **Signs, not a shade.** KaTrain shades its loss grid as it shades its Territory, in one colour of its evaluation
  scale (draw_territory with its EVAL_COLORS). Here the rises and the falls are signs, a green plus and a yellow
  minus, so that they differ in shape from the forecast's shade and the regions' fill, and read without their
  colours.
- **Two colours, and a yellow fall.** KaTrain draws its losses alone, in one red of its evaluation scale
  (EVAL_COLORS[...][1]). Here the rises show too, so they take a second colour: green, good for the player who chose.
  The falls are yellow, the labels' colour of an inaccuracy. They are not red, because red is a player's colour on
  this board.
- **By turn.** KaTrain's loss grid compares one move with the position before it. Here the difference follows the
  labels' unit: by turn by default, the forecast at the turn's start against the forecast at its end, because a turn
  of Enclosure has up to two edges and the labels judge the turn (design 10). By edge, it compares one edge.

## Alternatives

- **The change map as the only map, at a change of 0.5 or more:** hard to read ("the ownership less the board"), and
  the threshold hid the data under it.
- **A caption from the enemy's next turn in the engine's line,** with that turn drawn on the board: exact and
  misleading (Why), and the engine's line already shows what comes next, one edge at a time (design 07).
- **A caption from the ownership's numbers** ("holds it for half the turns left or more"): abstract.
- **The area that a mistake lost, at a Mistake or a Blunder alone, where it was clear** (KaTrain's loss grid, with a
  rule of clarity): clear on a third of the mistakes only, and nothing at the other moves. After vs before shows it at
  every move, with no rule of clarity.
- **The full search's candidates' maps** (`includeMovesOwnership`, kept for the candidates on the board): the stored
  review three times as large and the review a fifth slower, for maps that a short search gives as well (Why).
- **No map for a result stored before the maps:** a stored review would never get the maps without a review again.
- **A new shape for each field added** (6 for the ownership, 7 for the candidates' maps): a shape says what a
  result's fields mean, and an added field changes no meaning. Each shape would also make the site before it drop a
  review file's results.
- **A review again for the maps:** a whole review's cost, and the results that the player looked at change.
- **The ownership only when the map is on:** a review made with the map off would have no map, and a change of the
  setting would need the review again.

## Consequences

- The stored shape did not change, and the results stored before stay: a stored game and a review file open at once
  with their quality labels, lines and losses in the lead (design 05, item 3, and design 13). Their maps come from the
  short searches of item 6, as the player looks, and then stay.
- **The review keeps its time and its size:** no search asks for the candidates' maps. The ownership of each
  position makes a stored result about 1.1 kB larger ([decisions/engine.md](../decisions/engine.md), "The cost of the
  ownership in a whole review"). A candidate's map costs one short search, the first time that it is pointed at in a
  browser, and then stays in the store. The map shows a median of 0.44 s after the pointer with the engine idle, and
  2.8 s (1 to 7 s) while the review's searches hold both workers ("The delay of a candidate's map").
- **A line's maps keep up when the engine is idle, and not while the review runs.** With the engine idle, the first
  step's map comes within half a second, and each later step's is there when its edge is drawn. While the review's
  searches hold both workers, a third of an animated line's steps never get their map while they are drawn: the
  legend then names the earlier map that shows ("The map follows the line as drawn").
- **After vs before marks a few points after a best move** at the default smallest value (0.05): a median of 7.5,
  and a third of the board at 0, faintly. The forecast before a move is the mean over its whole search ("After vs
  before: the third style", "The marks of After vs before, and 0.05").
- **Forecast vs board marks much of the board at 0.05:** a median of 20.9% of the board on the test fixture's game,
  and 63% in its opening, against 2.5% at 0.5. The player raises the value for fewer marks.
- **The map stage takes about 20 seconds for a game of 120 edges** with the engine idle (two searches of about 0.4 s
  at a time), and runs only once the review's own work is done ("The map's work made visible, and the map stage").
- **Shape 6 costs a read.** The site reads each position's results in shapes 5 and 6: 36 ms in place of 18 ms for
  the 121 positions of a game, at 12 depths, in headless Chromium. The read runs while the engine starts, which takes
  0.6 to 1.2 seconds, so the review's first frame does not wait for it.
- **A general rule for later data:** when the site starts to use a kind of data that a stored review lacks, the review
  gets it added on demand, beside its results, and is not done again. The added data is stored with its source, and
  goes into a review file.
- "Learning from mistakes" (beads abscls-7e9) can take the map as its hint: the map of the position before the
  mistake, or of the engine's best candidate there.
- The weak walls (beads abscls-udwl) show which walls will probably break, beside the map ("The weak walls: a
  prototype").

## The weak walls: a prototype

**Status:** a prototype, built for a look on the page. The look kept the weak walls in one form: a ring of one size,
in a ramp of three hues, at each point from 10% up. The points in "Still open" are not decided.

### What the engine gives

The engine's weak walls (protocol 0.6.2, `includeWeakWalls`: the engine repository's
[docs/design/04-notation-and-protocol.md](https://github.com/abstractclass-org/engines/blob/main/docs/design/04-notation-and-protocol.md),
"The root's maps") give, for each player, at each lattice point of the player's edges, the chance that an edge of this
player at the point is cut before the game ends. The points are the edges' ends and the lattice points that the edges
pass through. The values come from one network evaluation of the position, not from its search, so they are the same
at any visits. The engine repository checked them on HedgeFund 0.2's self-play: in every band of 10 percentage
points, the mean chance is within 1.5 points of the share that was cut, and the AUC is 0.926 (the engine repository's
games/enclosure/docs/decisions/inputs-and-targets.md, "The weak walls and the future nodes"). People's games give
weaker evidence.

**A point's chance is not an edge's chance.** A point's chance is the chance that some edge of the player at the point
is cut. An edge's chance is at most the smallest chance on its points, and a point where several edges meet gives the
chance that one of them is cut. So the board marks the points, and names no chance of an edge.

### What the prototype shows

1. **A display setting beside the area map,** on the review and on the Analysis board: "Weak walls", off by default
   on both pages, each page's own (`weakWalls` in `src/lib/review/display.ts`). A switch in the board's top margin, at
   the right of the area map's switch, shows or hides them, and so does the key w. The Openings page takes the site's
   view, and with it the walls and the Analysis board's setting.
2. **A mark at each point whose chance is 10% or more** (`WALL_MIN` in `src/lib/review/weakWalls.ts`). In HedgeFund
   0.2's self-play, about half of the points on edges are under 10%, and 1.6% of those were cut.
3. **A ring of one size at each marked point, whose colour gives the chance.** The colour is a ramp of three hues
   (`wallInk` in `src/lib/review/weakWalls.ts`, the tokens in `src/app.css`). It goes from `--wall-low` at 10%
   through `--wall-mid` at 55% to `--wall-high` at 1, in two straight parts in OKLab. On the light board it goes from
   yellow through orange to brown, as ColorBrewer's YlOrBr. On the dark board it goes the other way, from brown
   through orange to yellow. So on both boards, the likelier the cut, the bolder the ring against the board. Its
   contrast (WCAG 2.2) goes from 2.07:1 to 9.39:1 on the light board, and from 2.50:1 to 9.27:1 on the dark board.
   - **Why three hues:** the first ramp had one hue, a brown from light to dark (an amber from dim to bright on the
     dark board). On real positions, its 70% and 85% looked almost the same. In OKLab they are 0.055 apart on the
     light board and 0.047 on the dark board. A change of hue adds distance that one hue cannot give. On the ramp of
     three hues, 70% and 85% are 0.066 and 0.063 apart, and 20% and 35% are 0.059 and 0.064 apart (one hue: 0.058 and
     0.050). The look drew five forms at the positions below (docs/decisions/product.md, "The weak walls' colour: a
     ramp of three hues"). Classes of colour gave larger steps between classes, but each class shows its chances in
     one colour.
   - **Its hues** are apart from the players' blue and red and the signs' green. At its nearest, the ring's colour is
     0.108 from the players' red in OKLab on the light board and 0.102 on the dark board, and 0.147 and 0.153 from the
     signs' green. The unit tests keep it at least 0.10 from the red and 0.14 from the green at every chance. Near the
     middle, it comes to 0.035 from the signs' yellow on the light board (at 42%) and to 0.030 on the dark board (at
     63%). But a ring goes round a point, and a sign fills a point's square.
   - **The ring** is over the edges and the dots at their ends, with a halo in the board's colour that keeps it whole
     where it meets an edge. The prototype also drew two other forms for the look: a disc under the edges whose area
     grew with the chance, which hid a chance of 26% under the dot at an edge's end, and a ring filled from the top as
     far as the chance.
4. **The legend and the numbers:** while the weak walls show and the area map does not, the legend's line says
   "Weak walls: bolder means weaker", or "Weak walls: none at 10% or more" where no point is marked. While the mouse's
   pointer is on a point of an edge, the line gives its reading in its place, for example "E5 · Blue · cut chance 62%"
   (`wallReading`). With the area map on too, the area map's legend or its note shows, and the reading of a point
   on an edge takes its place under the pointer. So the map's note, such as "Map: waiting for the engine", never
   shows beside the walls' legend: the two do not fit side by side in a window 360 pixels wide.
5. **The position on screen only.** While a line or a preview shows, the board shows another position, and the
   walls hide. The legend's slot then says "Weak walls: not with a line". With the area map on, it says nothing: the
   map's legend names the line's position.
6. **From the CPU engine.** The GPU module refuses the field, so the search runs on a CPU worker (`askWalls` in
   `packages/analysis/src/analysis.svelte.ts`, and the pool's `cpu` task in `packages/engine/src/pool.ts`), also while
   the GPU searches. It has one visit and the priority of a map's short search.
7. **The work is visible,** as the area map's (the decision's item 9): "Weak walls: waiting", "Weak walls:
   searching", "Weak walls: the game ends here", and in a review snapshot "Weak walls: none in snapshots". A module
   before protocol 0.6.2 ignores the field, and the slot says "Weak walls: not in this engine". The site's release,
   `engine-c43233eb`, answers 0.6.2 ([requests/30-weak-walls-release.md](../requests/30-weak-walls-release.md)).
   One note shows at a time, the map's first. While the walls' note shows, it takes the place of the map's legend:
   the two do not fit side by side in a window 360 pixels wide.
8. **Kept for the page's visit only:** not in the store, in a review file or in a review snapshot.
9. **Each text fits the margin of a window 360 pixels wide,** with no ellipsis, as the review's other one-line texts
   do (docs/decisions/product.md, "The review's one-line texts at 360 pixels"): a phone shows no title. At 360 × 700
   the board is 313 pixels wide, and the two switches leave 219 pixels. A note has 207 of them inside its padding, and
   the legend's line 215. In DejaVu Sans at 12 pixels (Linux's `system-ui`, wider than Segoe UI), the longest note,
   "Weak walls: the game ends here", takes 196 pixels, the legend 204, and the widest reading, "M18 · Blue · cut
   chance under 1%", 203. The layout test checks that no walls' text ends with an ellipsis, at every width.

### Still open

- **The walls and the area map:** a setting of its own beside the map, as here, or a style of the map's switch.
- **A line's walls:** whether the walls follow a line as it is drawn, as the area map does (the decision's item 5).
- **Stored or not:** whether the walls are kept with the maps (the decision's item 6), for a review file and a
  review snapshot.

### Positions that show them

- **The review fixture** (`apps/hedgeschool/tests/fixtures/hedgefund-review.json`, by "Load a review file"): Home,
  then → 40 times. Four points are marked, and the pointer on G10 reads "G10 · Blue · cut chance 26%".
  In this game few points reach 10%: after 30 edges none does, and the legend says so.
- **The Analysis board:** from the start, Space six times (the engine's first choice each time). The opening's long
  walls are marked at 14 to 29 points, from 10% to above 50%, on both sides.

## Where it is

- `packages/review/src/ownership.ts`: `ownershipMap`, `changeMap`, `differenceMap`, `shade`, `differenceReading`,
  `valueText`, `mapStep`, `askOrder`, and the signs' colours and explanation: `SIGN_COLOUR`, `signInk`,
  `DIFFERENCE_HELP`. Tests: `ownership.test.ts`. The signs' tokens, `--sign-green` and `--sign-yellow`:
  `packages/review/src/review.css`. Enclosure's part, `src/lib/review/enclosureMap.ts`:
  `occupancy`, `pointReading` and `drawnBoard` (tests: `enclosureMap.test.ts`), which `src/lib/review/enclosureView.ts`
  gives the view (`map`), with the points' index and names.
- `src/lib/board/Board.svelte`: the map's marks (the prop `areaMap`: the shade, `AREA_ALPHA` and the blur, and the
  patterns of the dots, the hatching and the signs) and the point under the pointer (`onpointat`).
- `packages/review/src/ReviewView.svelte`: `MAP_STYLE_NAME`, `MAP_SWITCH`, `setMap`, `nextMapStyle`, `mapOn`,
  `toggleMap`, `mapLine`, `shownStep`, `shownOwnership`, `diffBase`, `shownMap`, `mapPlace`, `mapLegend`, `mapWork`,
  `mapReading`, the switch and the legend (`mapControls`), the settings, and the keys t and Shift+T. Enclosure's board
  places the switch and the legend in its margin (`src/lib/review/EnclosureBoard.svelte`).
  `src/lib/review/display.ts`: `areaMap`, `mapStyle`, `mapMin`.
- `src/routes/review/+page.svelte`: the map stage's part of the review's progress bar.
- `packages/analysis/src/reply.ts` (the ownership in hundredths), `packages/analysis/src/analysis.svelte.ts` (every
  search asks for the root's map, `askOwnership`, `mapAt`, `hasNoMap`, `freeze`, `mapState`, `passMaps`, `endPass`,
  `mapPass`), `packages/analysis/src/cache.ts` (`SHAPE` 5, `READ_SHAPES`, `atShape`, `MAP_VISITS`, `MAP_SLICE`,
  `mapKey`, `mapPut`, `mapGet`), `src/lib/game/earlierResults.ts` (the added maps kept with the site's results, and
  at the positions that a review snapshot reads),
  `src/lib/game/reviewFile.ts` and `src/lib/game/analysisFile.ts` (the files at shape 5),
  `packages/engine/src/protocol.ts` (the fields).
- The weak walls' prototype: `src/lib/review/weakWalls.ts` (`wallMarks`, `wallInk`, `wallReading`,
  `WALL_MIN`; tests: `weakWalls.test.ts`), the rings' tokens `--wall-low`, `--wall-mid` and `--wall-high` in
  `src/app.css`, the rings in `src/lib/board/Board.svelte` (the prop `walls`), `askWalls`, `wallsAt`
  and `wallState` in `packages/analysis/src/analysis.svelte.ts`, the pool's `cpu` task in
  `packages/engine/src/pool.ts` (tests: `pool.test.ts`), `weakWalls` in `packages/engine/src/protocol.ts`, the
  switch, the legend, the setting and the key w in `packages/review/src/ReviewView.svelte` (`wallsOn`, `shownWalls`,
  `wallWork`, `marginNote`, `wallReading`), and the layout test's case "layout of the weak walls". In
  `packages/review/src/game.ts`: the display's field `weakWalls`, the game's own type of the walls (the view types'
  `walls`) and the view game's `walls` (`WallParts`). Enclosure's type of the walls, the protocol's `WeakWalls`, is in
  `src/lib/review/enclosure.ts`, and its view game's `walls` is in `src/lib/review/enclosureView.ts`.
- The measurements, in `scripts/measure/`: `review-ownership.mjs` (the maps' size and time in a whole review),
  `candidate-maps.mjs` (a candidate's map from a short search), `candidate-map-delay.mjs` (its delay in the browser),
  `line-map-lag.mjs` (the maps' lag behind an animated line), `difference-at-best.mjs` (after vs before at the best
  moves), `ownership-maps.mjs` (the change style's share of the board on real games), `map-pass.mjs` (the map stage's
  time), `map-wait-check.mjs` (a browser check that the note's states end) and `wall-rings.mjs` (the weak walls'
  rings at the "Positions that show them", with a strip of their colours, the colour distances and the contrasts).

## Log entries

- [decisions/product.md](../decisions/product.md), 2026-10-21: "The area maps on real games", "The window of the area
  lost", "The results of shape 5 stay readable", "The area map and the explanations on real games", "The candidates'
  maps: their size and their time", "A candidate's map from a short search", "The delay of a candidate's map", "A
  candidate's map from a short search, on a close game", "The map follows the line as drawn", "After vs before: the
  third style", "The marks of After vs before, and 0.05", "The map's work made visible, and the map stage", "\"Map:
  waiting for the engine\" did not end", "The area map's review", "The map's bookkeeping in edge cases" and "The
  review of the map's bookkeeping". 2026-11-10: "The weak walls' colour: a ramp of three hues" and "The weak walls'
  texts at 360 pixels".
- [decisions/engine.md](../decisions/engine.md): "The cost of the ownership in a whole review" (2026-10-21), and
  "The release c43233eb: protocol 0.6.2 and the weak walls" (2026-11-09).
