# The area map

**Status:** in force, built. **Decided:** 2026-10-20. **Changed:** 2026-10-21: the map shows the engine's ownership
again, with a second style for the change and the player's smallest value. The engine's lines get their own map. The
mistakes' captions and the opponent's turn drawn after a mistake are removed. A stored review gets the maps that it
lacks added on demand. The stored shape stays 5: a field that is only added takes no new shape.

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
"What a reply holds"). The WebAssembly module of release `engine-d6786eba`, which the site uses, returns both.

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

1. **The ownership is stored with the review.** Every search of the review asks for the root's ownership
   (`includeOwnership`) and each candidate's (`includeMovesOwnership`), whatever the display settings. A result keeps
   them in whole hundredths from Blue's side: the root's as `ownership` of the analysis, and each candidate's as
   `ownership` of the candidate, for the candidates on the board alone (`shownMaps` in
   `packages/analysis/src/model.ts`, with their symmetric twins). **The stored shape stays 5** (`SHAPE` in
   `packages/analysis/src/cache.ts`, design 05). A new shape is only for a change of what a result's fields mean, so
   that an older result is not misread. A field that is only added takes none: the reader checks whether the field is
   there, as it must for the results stored before it. So the two maps are optional fields of a result of shape 5. A
   review stored or exported before them opens at once with its results, which are never searched again or removed.
   The first builds of the map wrote shape 6 on their branch, for results of 5 with the ownership: the site reads them
   as shape 5 and keeps them (`READ_SHAPES`). The site before the map reads a review file of this site completely: it
   takes the results of shape 5 and ignores the fields that it does not know.
2. **The area map has two styles** (the display settings "Area map" and "Area map style", Board; `areaMap` in
   `src/lib/review/ownership.ts`):
   - **Ownership,** the default: each point shaded in the colour of the side that the engine expects to hold it, as
     strong as |ownership| ^ (1 / 1.33), at most 0.45, and blended by a blur, under everything else. These are
     KaTrain's gamma and drawing, with the strongest shade lower, so that the regions and the edges stay readable.
   - **Change:** the ownership less the board now, from Blue's side, where the board now is +1 strictly inside Blue's
     regions, −1 strictly inside Red's and 0 at the open points (`occupancy`). Dots on open area that a side will
     probably close, and hatching on closed area that its owner will probably lose, each in the colour of the side
     that gains. A region that stays its owner's gets nothing.
3. **The player sets the smallest value marked** ("Smallest value marked", from 0 to 1 in steps of 0.05), for each
   style apart (`mapMin` in `src/lib/review/display.ts`). At 0 the map shows every point with a value: the raw data.
   The defaults: 0 for the ownership (KaTrain's map), and 0.5 for the change (the second build's, measured on real
   games).
4. **The legend and the numbers.** While the map shows, one line in the board's empty margin above its top row says
   what it shows: "Shade: who the engine expects to hold each point", or the change style's two marks. While the
   mouse's pointer is on a point, the line gives that point's numbers in its place: its ownership, its state now and
   the change, for example "E5 · Blue 0.62 · now open · change 0.62 to Blue" (`pointReading`). Touch gives no
   numbers: a touch on the board is edge input.
5. **A map for the engine's lines.** While a candidate's line shows (the candidate pointed at, on the board or in the
   table, or pinned), the map shows that candidate's ownership: the engine's forecast after the move. The legend says
   so ("After D10-G10: …"). In the change style, the change is still from the board now. A branch's preview and a
   played move's preview show no map.
6. **A stored review gets the maps that it lacks, on demand, and keeps them.** When the site starts to use a kind of
   data that a stored result lacks, the result gets it added beside it. The result's own search, visits and
   candidates stay as they are: the review is not done again. For the maps (`askOwnership` and `mapAt` in
   `packages/analysis/src/analysis.svelte.ts`):
   - A position whose result has no ownership gets it from a short search of the position alone, while the map shows
     the position.
   - A candidate whose result has no candidates' maps gets its map from a short search of the
     position after its move, when the candidate is pointed at. Where that position has a result of its own (the
     game's next move), its ownership serves.
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
- **The ownership as the default style, because it reads at once.** The players read a shade by colour as "whose",
  and its strength as "how surely". The change style asks the player to subtract the board in their head. It stays
  as the second style for a player who wants to see only what moves.
- **The smallest value is the player's,** because the threshold is a judgement on what is noise, and it changes with
  the player and the position. At 0 the player sees the engine's data as it is.
- **The numbers under the pointer,** because a shade is a rough reading. A player who doubts a shade can read its
  value, and the change, at the point.
- **A map for the engine's lines, because the line is where the player asks "what does this move change?".** The
  candidate's own ownership comes from the search that ranked it, so the map and the candidate's numbers agree.
- **The shown candidates' maps alone,** because each map is about 1 kB stored, and an open position has scores of
  candidates with a few visits, which the board does not show.
- **Added maps, not a review again,** because a review again replaces results that a player looked at, and costs a
  whole review for one kind of data. A short search answers the same question as the full search's candidate map.
  A candidate on the board rests on few visits of the full search (a median of 17 on the test fixture's game), so a
  short search is about as deep. Measured there, a short search of 32 visits of the position after the move differs
  from the full search's candidate map by 0.007 at a point (the median candidate), and a search of 512 visits by
  0.009 ([decisions/product.md](../decisions/product.md), "A candidate's map from a short search").

## Departures from KaTrain

The site follows KaTrain's review (design 05). The display departs from it on purpose, for the reasons above:

- **A second style, the change.** KaTrain's Territory shades the ownership alone. In Go the stones are the state and
  the territory is not on the board. In Enclosure the regions are on the board, and a player can ask for the forecast
  less the board.
- **The player's smallest value.** KaTrain shades every point, as strong as its ownership. The default here is the
  same (0), and the player can raise it.
- **The strongest shade 0.45, not 0.75.** KaTrain's 0.75 is for black and white stones on a wooden board. Here the
  players' colours at 0.75 hide the regions' fill and the edges.
- **Off by default on the review.** KaTrain's Territory is on in its analysis mode. The review's first player steps
  through a whole game for a few mistakes. The Analysis board keeps KaTrain's default, and the key t is KaTrain's T.
- **The numbers of the point under the pointer.** KaTrain gives none.
- **The map of a candidate's line.** KaTrain shows the root's territory while a candidate's line shows.
- **No loss grid.** KaTrain's teaching mode shades where a move's ownership fell. On real games it was clear on a
  third of the mistakes, and it said where, not what.

## Alternatives

- **The change map alone** (the second build): hard to read, and its threshold was not the player's.
- **A caption from the opponent's next turn in the engine's line** (the second build): exact and misleading (Why).
- **A caption from the ownership's numbers** (the first build's bands: "holds it for half the turns left or more"):
  abstract.
- **The area that a mistake lost** (KaTrain's loss grid, the first build): where, not what, and clear on a third of
  the mistakes only.
- **Every candidate's map:** about 3 kB of JSON a candidate in the reply, for candidates that the board does not show.
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
- **The candidates' maps cost space and time.** On the test fixture's game, reviewed in the browser, they make the
  stored review three times as large (1,017 kB to 3,093 kB: 1,916 maps in 249 results) and the review about a fifth
  slower (323 s to 386 s, the median of three pairs; a search of 512 visits 5.0 s to 6.0 s)
  ([decisions/product.md](../decisions/product.md), "The candidates' maps: their size and their time").
- A candidate's map from a short search reads a shallower search than a candidate's own map. The legend does not say
  which: the two differ less than two deep searches do.
- **A general rule for later data:** when the site starts to use a kind of data that a stored review lacks, the review
  gets it added on demand, beside its results, and is not done again. The added data is stored with its source, and
  goes into a review file.
- "Learning from mistakes" (beads abscls-7e9) can take the map as its hint: the map of the position before the
  mistake, or of the engine's best candidate there.
- The weak-wall map (beads abscls-udwl) can later show which wall breaks, beside the map.

## Where it is

- `src/lib/review/ownership.ts`: `areaMap`, `occupancy`, `shade`, `pointReading`. Tests: `ownership.test.ts`.
- `src/lib/board/Board.svelte`: the map's two styles (`areaMap`, the layer `areaMap`) and the point under the
  pointer (`onpointat`).
- `src/lib/review/ReviewView.svelte`: `mapOn`, `toggleMap`, `lineCandidate`, `mapOwnership`, `shownMap`,
  `mapReading`, the legend, the settings and the key t. `src/lib/review/display.ts`: `areaMap`, `mapStyle`,
  `mapMin`.
- `packages/analysis/src/reply.ts` (the ownership in hundredths), `packages/analysis/src/model.ts` (`shownMaps`),
  `packages/analysis/src/analysis.svelte.ts` (every search asks for both maps, `askOwnership`, `mapAt`),
  `packages/analysis/src/cache.ts` (`SHAPE` 5, `READ_SHAPES`, `MAP_VISITS`, `mapKey`, `mapPut`, `mapGet`),
  `src/lib/game/earlierResults.ts` (the added maps kept with the site's results), `packages/engine/src/protocol.ts`
  (the fields).
- The measurements: `scripts/measure/review-ownership.mjs` (the maps' size and time in a whole review),
  `scripts/measure/candidate-maps.mjs` (a candidate's map from a short search) and `scripts/measure/ownership-maps.mjs`
  (the change style's share of the board on real games).

## Log entries

- [decisions/product.md](../decisions/product.md): "The area maps on real games", "The window of the area lost" and
  "The results of shape 5 stay readable" (2026-10-21), for the first build. "The area map and the explanations on real
  games" (2026-10-21), for the second. "The candidates' maps: their size and their time" and "A candidate's map from a
  short search" (2026-10-21), for this one.
- [decisions/engine.md](../decisions/engine.md): "The cost of the ownership in a whole review" (2026-10-21).
