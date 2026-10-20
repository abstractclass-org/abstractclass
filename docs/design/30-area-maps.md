# The area maps: the ownership of each point, and the area that a mistake lost

**Status:** in force, built. **Decided:** 2026-10-20.

## Context

An engine tells a player what to play, not why. The review shows a mistake's label, its points lost and the better
move (design 10). In Enclosure the why is nearly always area: which side will hold which part of the board, and for
how long. Design 01 asks that explanations come from engine facts (principle 11).

The engine gives this fact. Its ownership of a point is the mean, over the turn ends left in the game, of +1 inside the
mover's regions and −1 inside the opponent's (the engine repository's
[games/enclosure/docs/design/06-ownership-and-spatial-targets.md](https://github.com/abstractclass-org/engines/blob/main/games/enclosure/docs/design/06-ownership-and-spatial-targets.md)).
So the map spreads the rest of the game's score over the points. It counts lattice points, while the score counts
exact area: the map shows where, and the points lost give how much.

The protocol has KataGo's two fields (the engine repository's `docs/design/04-notation-and-protocol.md`): the root's
ownership (`includeOwnership`) and each candidate's (`includeMovesOwnership`). The WebAssembly module of release
`engine-d6786eba` returns both, as 361 values from Blue's side, index y × 19 + x. Each candidate's is the mean over its
own subtree, and a symmetric twin's is mirrored. The GPU module computes the ownership head too (its graph's
`OutputOwnership`). So the site needs nothing more from the engine.

KaTrain, the Go review tool that the site follows (design 05), has both displays:

- **Territory** (`katrain/gui/badukpan.py`, `draw_territory`): a switch in the analysis controls, on by default in its
  analysis mode and off in its play mode, with the key T. Each point is shaded in the colour of the side that owns it,
  with an alpha of |ownership| ^ (1 / 1.33) (`OWNERSHIP_GAMMA`) times 0.75 for black and 0.8 for white. Its default
  style, "blended", paints a texture of one pixel a point over the board, so the shading is smooth between points.
- **The loss grid** (`draw_board_contents`): in its teaching mode, after a move that it took back, the ownership after
  that move less the ownership of the position before it, where it fell for the mover, in the colour of the move's
  class. It takes the territory's place.

## Decision

1. **The ownership at every position is stored with the review.** Every search of the review asks for the root's
   ownership (`includeOwnership`), whatever the display settings, so that a review opened again or imported has its
   maps. The review keeps it in whole hundredths, from Blue's side (`ownership` of an analysis). The stored shape
   becomes 6 (`SHAPE` in `packages/analysis/src/cache.ts`). The candidates' ownership is not asked for: it is about
   3 kB of JSON for each candidate (262 kB for one reply of 100 visits at the start, against 24 kB without it), and the
   root's serves (item 4).
2. **The area map** (the display setting "Area map", Board): at the position on screen, each point shaded by its
   ownership, blue where Blue holds it and red where Red does, as strong as |ownership| ^ (1 / 1.33) (KaTrain's
   gamma). The shading is under everything else on the board, as KaTrain draws it first. **On by default,** as
   KaTrain's Territory in its analysis mode. **The key t** shows or hides it, as KaTrain's T. The map shows on the
   review and on the Analysis board, from the search of the position on screen, as it comes.
3. **The area lost by a mistake** (the display setting "Area lost by a mistake", Board, on by default): after a Mistake
   or a Blunder on the game's line, for a player whom the review explains (design 10's "Review for"), the board at the
   position after the move shades the area that the move lost, in the site's accent (lavender), in the map's place. It
   shows whether the map is on or off. By turn (the default), the move is the turn, and the maps are compared at the
   turn's ends. By edge, it is the edge.
4. **What "lost" means.** KaTrain's loss grid: at each point, the mover's ownership before the move less the mover's
   ownership after it, where it fell (`lostArea` in `src/lib/review/ownership.ts`). Before the move is the root's
   ownership at the position before it: the mean over that search's tree, which follows the engine's best line. After
   it is the root's ownership at the position after it. These are the two searches that the move's loss reads (design
   10: the value before less the value after, each from its own search), so the map shows where the points lost went,
   with the same searches.
5. **The caption** under the move in the move list, from a template on the same numbers alone (design 01, principle
   11): who holds the lost area with the best move, and who holds it after the move played. Each is the mover's
   ownership over the area, weighted by how far each point fell, in three bands for each side: half the turns left or
   more (a mean of 0.5 or more, which needs the side's regions over the point at half the turn ends at least), some of
   them (0.15 or more), and open (between −0.15 and 0.15). Where both fall in one band, the second sentence says which
   way it went. For example: "The area lost, shaded after the turn: with the best turn, Blue holds it for half the
   turns left or more. After the turn played, Red holds it for some of the turns left." The size in points is not
   repeated: the turn's note gives the points lost. The caption shows with the notes on the key moves (the display
   setting "Notes on the key moves").
6. **When the area lost shows: when it is clear, at any edge.** A point that falls by 0.30 or more shows clearly
   (`CLEAR_FALL`). The area lost shows when a fifth of its fall or more is in such points (`CLEAR_SHARE`, `shownLost`).
   Else the fall is spread thin over the board, and the map would be a haze with nothing to point at: the board then
   shows the map, and the move list no caption. On 10 real games, this showed 42 of 128 Mistakes and Blunders by
   turn: 13 of 61 in the first 8 turns, 20 of 41 in edges 17 to 40, and 9 of 26 after. The mover's ownership fell in
   all on 41 of the 42.

## Why

- **A rule on each move, not an edge:** whether a map is clear can be measured for each move. An edge would hide the
  clear maps of the opening and show the hazy ones after it.
- **KaTrain's displays, because the site follows KaTrain's review** (design 05), and because they answer the player's
  question with the engine's own numbers, with no words to get wrong.
- **The root's ownership for "after the best move", not the best candidate's.** The root's map is the mean over the
  whole tree, and the engine's first choice holds most of the tree's visits. On the real games measured
  ([decisions/product.md](../decisions/product.md), "The area maps on real games"), the two differ by 0.006 per point
  on average, against values from −1 to 1. The candidates'
  maps would make each reply about ten times larger, and the review would store or send them for no visible gain.
  The before and after maps are also the two searches that the loss reads, so the map and the points lost agree by
  construction.
- **Stored with every search:** in a whole review, the ownership took no time that the measurement could show, and
  36% more space in the browser's store, about 1.1 kB for each result ([decisions/engine.md](../decisions/engine.md),
  "The cost of the ownership in a whole review"). A display setting then changes nothing in the store.

## Departures from KaTrain

- **The blend.** KaTrain paints a texture of one pixel a point and lets the graphics card blend it. The board is SVG:
  a square on each point, blurred by a Gaussian filter of 0.3 of a point. The look is the same.
- **The strength.** KaTrain's alpha is 0.75 for black and 0.8 for white, on a wooden board in two colours that are not
  its players' stones' only. Here the players' colours are the board's own, for edges, nodes and regions, so the map's
  strongest shading is 0.45, which leaves the edges and the regions readable. The area lost, shown alone, takes 0.6
  (KaTrain's hints take 0.8).
- **The area lost has its own switch, and shows in a review.** KaTrain shows its loss grid only in its teaching mode,
  after a move taken back, and only with the Territory on. A review shows a mistake after the fact, so the area lost
  shows at the position after the move, and the player can keep it without the map at every position.
- **The colour of the area lost.** KaTrain draws its loss grid in the colour of the move's class. Here a Blunder's
  colour is a red near Red's own, so a Red Blunder's lost area would read as Red's. The area lost takes the accent,
  which is neither player's.
- **The caption** is the site's own: KaTrain draws the grid with no words.

## Alternatives

- **The best candidate's ownership** (`includeMovesOwnership`) for "after the best move": the literal reading. Its
  replies are about ten times larger, and it differs little from the root's (Why).
- **The ownership only when the map is on:** a review made with the map off would have no maps, and a change of the
  setting would need the review again.
- **A point count in the caption** (the lost area's size in points of the board): the map counts lattice points and
  turn ends, not the score, and the review's points lost already give the size in the score's own points.

## Consequences

- The stored shape changed: the results stored before are removed at the site's next start, and each stored game is
  reviewed again once (design 05, item 3; design 20).
- A review imported from a file of shape 5 opens without its results, as any older file does.
- The area lost is also the hint that "Learning from mistakes" (beads abscls-7e9) asks for: the area at stake,
  shown before the retry, from the same function (`lostArea`).
- In the opening, few mistakes show their area lost: the engine holds the board open, and a mistake there moves a
  little of every point. The map at every position shows from the start, faint where nothing is held.
- **The map agrees with the points lost** on real games: the mover's ownership fell on 121 of 128 Mistakes and
  Blunders, and the points lost were close to the net fall times the turn ends left (a median ratio of 0.96 to 0.99 up
  to edge 60, a correlation of 0.83).

## Where it is

- `src/lib/review/ownership.ts`: `lostArea`, `areaCaption`, `shownLost` (`focusOf`, `CLEAR_FALL`, `CLEAR_SHARE`) and
  `shade` (KaTrain's gamma). Tests:
  `ownership.test.ts`.
- `src/lib/board/Board.svelte`: the map and the area lost on the board (`ownership`, `lost`).
- `src/lib/review/ReviewView.svelte`: `ownershipHere`, `lostHere`, `lostBetween` and `lostCaptions`, the settings
  and the key t. `src/lib/review/display.ts`: `areaMap` and `areaLost`.
- `packages/analysis/src/reply.ts` (the ownership in hundredths), `packages/analysis/src/analysis.svelte.ts` (every
  search asks for it), `packages/analysis/src/cache.ts` (`SHAPE` 6), `packages/engine/src/protocol.ts` (the fields).
- The measurements: `scripts/measure/ownership-maps.mjs` (the maps on real games) and
  `scripts/measure/review-ownership.mjs` (the cost in a whole review).

## Log entries

- [decisions/product.md](../decisions/product.md): "The area maps on real games" (2026-10-21).
- [decisions/engine.md](../decisions/engine.md): "The cost of the ownership in a whole review" (2026-10-21).
