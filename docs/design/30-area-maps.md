# The area map and the mistakes' explanations

**Status:** in force, built. **Decided:** 2026-10-20. **Changed:** 2026-10-21: the map shows change, not ownership,
and a mistake is explained by the opponent's next turn in the engine's line, not by the area that it lost.

## The players and their questions

The site is for players who want to improve, top players included ([docs/context.md](../context.md)). Three of them
ask different questions of the engine's ownership:

1. **The improving player** knows the rules and does not yet see the tactics coming. This player imports a lost game
   and steps through it, about 60 turns, to find a few mistakes. At a mistake, the question is: "What did my turn
   give away, and how?" This player comes first.
2. **The strong player** reads the whole board and wants dense, exact information, on the Analysis board. At any
   position, the question is: "Which areas are safe, which are at risk, which are open, and where is the fight?"
3. **Later, the learner** in lessons and in the retry of a mistake ("Learning from mistakes", beads abscls-7e9), for
   whom the map is a hint.

Both of the first two also ask, when they try a move: "What does this move change?"

## The engine's fact

The engine's ownership of a point is the mean, over the turn ends left in the game, of +1 inside the mover's regions
and −1 inside the opponent's (the engine repository's
[games/enclosure/docs/design/06-ownership-and-spatial-targets.md](https://github.com/abstractclass-org/engines/blob/main/games/enclosure/docs/design/06-ownership-and-spatial-targets.md)).
It counts the lattice points strictly inside the regions, not the points on their walls. So it spreads the rest of
the game's score over the points. It is not who holds a point at the end, as in Go: regions form and break all game
long, and each turn end scores. The protocol gives the root's ownership (`includeOwnership`) and each candidate's
(`includeMovesOwnership`), and the WebAssembly module of release `engine-d6786eba` returns both.

## What the first build showed, and why it changed

The first build followed KaTrain, the Go review tool that the site follows (design 05): its Territory, which shades
each point in the colour of the side that owns it, as strong as it owns it, on by default in its analysis mode, and
its loss grid, which shades where a move's ownership fell. Looked at on real reviewed games, it failed the players:

- **The forecast and the fact looked the same.** The board fills each player's regions in the player's colour, at
  0.16. The map shaded the same colour, up to 0.45. So the forecast hid the regions and looked like regions.
- **A faint shade read as "unsure" or as "late".** The ownership is the share of the turn ends left at which a point
  scores, not a chance that a side holds it at the end. A region that a side closes late has low ownership, though it
  is sure.
- **On by default at every position,** the map was noise for the improving player, who steps through the whole game
  to find a few mistakes.
- **The area lost showed on a third of the mistakes** (42 of 128 on real games,
  [decisions/product.md](../decisions/product.md), "The area maps on real games"), in the accent, with an abstract
  caption. It said where, not how. In Enclosure the how is nearly always concrete: the opponent closes a region, or
  cuts a wall.

## Decision

1. **The ownership at every position is stored with the review.** Every search of the review asks for the root's
   ownership (`includeOwnership`), whatever the display settings, in whole hundredths from Blue's side (`ownership` of
   an analysis). The stored shape is 6 (`SHAPE` in `packages/analysis/src/cache.ts`). Shape 6 only adds this field,
   so the site also reads shape 5 (`READ_FROM`, design 05): a review stored or exported before opens at once with its
   results. The candidates' ownership is not asked for: it is about 3 kB of JSON for each candidate (262 kB for one
   reply of 100 visits at the start, against 24 kB without it), and nothing here uses it.
2. **The area map shows change, not state** (the display setting "Area map", Board). At each point, the change is the
   engine's ownership less the board now, from Blue's side: the board now is +1 strictly inside Blue's regions, −1
   strictly inside Red's, and 0 at the open points (`occupancy` and `changeMap` in `src/lib/review/ownership.ts`).
   The map marks only a change of 0.5 or more (`CHANGE`), and only two things, each in the colour of the side that
   gains:
   - **dots** on open area that a side will probably close;
   - **hatching** on closed area that its owner will probably lose.

   A region that stays its owner's gets nothing more, and the regions keep their fill. Every mark has one strength:
   the map points at places, and the threshold says which. A short legend shows in the board's margin above its top
   row while the map shows. The map hides while the board draws a line: the line's regions are not the board's now.
3. **A mistake is explained by what happens next** (the display setting "Explain mistakes", Board). After a Mistake
   or a Blunder on the game's line, for a player whom the review explains (design 10's "Review for"), the position
   after the move has its stored search and the engine's line from it: its first choice's line, as far as the search
   trusts it (`trustedLine`, design 07). The rules play that line (`describe_game`), and each edge then has the edge
   that it cuts and the regions and areas after it (`explainMistake` in `src/lib/review/explain.ts`):
   - **On the board:** the line up to the end of the opponent's turn that explains the mistake, drawn as design 07
     draws a line (numbered, with the edges that it cuts and the regions as they become), and each region that the
     turn closes outlined by a wide soft band in the opponent's colour. The other candidates hide, as they do while
     a line shows.
   - **The caption,** under the move in the move list with the notes on the key moves, from a template on these facts
     alone (design 01, principle 11): the mover's edges that the turn cuts, the area that it closes and a point of its
     largest new region, and the area that the mover loses. For example: "After this turn, Red cuts B2-E2 and closes
     4 points of area at M12. Blue loses 9 points of area."
   - **Where that turn closes and cuts nothing,** the opponent's later turns in the same line are read, as far as the
     line goes: "In the engine's line, Red's second turn from here cuts B2-E2." A turn that the line ends before its
     end is not read: its facts are not whole.
   - **Where no turn of the line closes or cuts,** a plain sentence says so: "Red's next turn in the engine's line
     closes and cuts nothing. The points lost are spread over the board." The board then draws nothing more.
   - By turn (the default), the move is the turn. By edge, it is the edge, and the line starts with the mover's edge
     left in the turn, if any: "After this edge, Red's next turn closes …".
4. **Defaults by player.** The review starts with the map off and the mistakes' explanations on: the improving player
   gets a clean board and the how of each mistake. The Analysis board starts with the map on: its player reads the
   whole board. Each page keeps its own switch of the map (`areaMap` in `src/lib/review/display.ts`). **The key t**
   shows or hides the map on both, as KaTrain's T shows its Territory.
5. **A result with no ownership** (shape 5) gets it from a short search of the position alone, at the sweep's budget
   (32 visits), when the map shows it (`askOwnership` in `packages/analysis/src/analysis.svelte.ts`). The search runs
   just after the position on screen's, and the page keeps its ownership apart (`ownership` of the analysis). It never
   replaces the position's result, and the store does not keep it. The explanations need no ownership: they read the
   stored lines.

## Why

- **Change, not state, because the board already shows the state.** The regions are on the board, filled in their
  players' colours. A map of ownership repeats them, and looks like them. The change is what the board does not show:
  where the engine expects a region that is not there yet, and where it expects a region to break.
- **Marks, not a shade,** because the strength of the ownership mixes how sure and how soon. A threshold turns it into
  a yes or a no that the player can read: a change of 0.5 or more is, for an open point, a side's region over it at
  half the turn ends left at least, and for a closed point, its owner's hold falling by half or more. On real games
  the map then marks a median of 3.7% of the board at a position (about 13 points), at most 7% in the middle game
  ([decisions/product.md](../decisions/product.md), "The area map and the explanations on real games").
- **The opponent's next turn, because in Enclosure the how is concrete.** A mistake lets the opponent close a region
  or cut a wall. The engine's line holds that turn, and the rules give its facts exactly: the caption states what
  the board shows, with no number that a player must interpret. On real games, 112 of 128 Mistakes and Blunders get a
  caption with a close or a cut (96 from the opponent's next turn), and 13 the sentence that the loss is spread. The
  first build's area lost showed on 42 of them.
- **The line as far as the search trusts it,** because the engine's line is its guess of the best play, and its far
  end is a guess from few visits. The facts of a turn are exact when the line is.
- **Off on the review, on on the Analysis board,** because the two players ask different questions (the players
  above). One setting for both would fit neither.

## Departures from KaTrain

The site follows KaTrain's review (design 05). The display departs from it on purpose, for the reasons above:

- **The map shows the change, not the ownership.** KaTrain's Territory shades each point by its ownership. In Go the
  stones are the state, and the territory is not on the board, so the forecast adds what the board lacks. In
  Enclosure the regions are on the board, so the forecast less the board is what it lacks.
- **Marks at a threshold, not a shade by strength.** KaTrain shades each point as strong as |ownership| ^ (1 / 1.33).
  Here the strength mixes how sure and how soon, so a faint shade misleads.
- **Off by default on the review.** KaTrain's Territory is on in its analysis mode. The review's first player steps
  through a whole game for a few mistakes, and the map is noise to that player. The Analysis board keeps KaTrain's
  default, and the key t is KaTrain's T.
- **A mistake is explained by the opponent's reply, not by a loss grid.** KaTrain's teaching mode shades where the
  ownership fell after a move. It says where, not how, and on real games it was clear on a third of the mistakes.
- **The caption** is the site's own: KaTrain draws its grid with no words.

## Alternatives

- **The ownership as KaTrain shades it** (the first build): it looked like the regions, and its faint shades misled
  (what the first build showed).
- **The area that a mistake lost** (KaTrain's loss grid, the first build): where, not how, and clear on a third of the
  mistakes only.
- **A caption from the ownership's numbers** (the first build's bands: "holds it for half the turns left or more"):
  abstract. The line's facts are the ones that the player can see on the board.
- **A map graded by strength in two styles:** it keeps the problem of the faint shade.
- **The best candidate's ownership** (`includeMovesOwnership`): its replies are about ten times larger, and neither
  display uses it.
- **The ownership only when the map is on:** a review made with the map off would have no map, and a change of the
  setting would need the review again.
- **Shape 6 alone, with the results of shape 5 removed:** each stored game would be reviewed again once, and a review
  file of shape 5 would open with no results ([decisions/product.md](../decisions/product.md), "The results of shape 5
  stay readable").

## Consequences

- The stored shape changed, and the results stored before stay: a stored game and a review file of shape 5 open at
  once with their labels, lines and points lost (design 05, item 3, and design 13). Their map comes from the short
  searches of item 5, one position at a time, as the player looks.
- The explanation needs the rules' play of each explained move's line: one `describe_game` request for each, asked
  when the review has the line, and again when a deeper search changes it.
- The explanation follows the engine's first choice. Where the opponent has two good replies, it shows one.
- The caption's area is the area that the opponent's regions gain over the turn: a region that grows from an older
  one counts its new part. Its point is in the largest region that the turn closes.
- The last turn of a game has no explanation: the position after it ends the game, and has no search.
- The map is empty in the opening (a median of 0% of the board up to edge 20): the engine holds the board open, and
  no point changes by 0.5. In a game that one side leads by far, it marks much of the board: the engine expects that
  side to close it (51.5% of the board in edges 21 to 40 of the test fixture's game).
- "Learning from mistakes" (beads abscls-7e9) can take either as its hint: the map of the position before the
  mistake, or the opponent's reply that the explanation shows.
- The weak-wall map (beads abscls-udwl) can later show which wall breaks, beside the hatching.

## Where it is

- `src/lib/review/ownership.ts`: `occupancy`, `changeMap` (`CHANGE`). Tests: `ownership.test.ts`.
- `src/lib/review/explain.ts`: `explainMistake`, `explanationCaption`. Tests: `explain.test.ts`.
- `src/lib/board/Board.svelte`: the map's marks (`change`, the layer `areaMap`) and the outline (`outline`).
- `src/lib/review/ReviewView.svelte`: `mapOn`, `toggleMap`, `change`, `explainIn`, `explainLine`,
  `explanationCaptions`, the legend, the settings and the key t. `src/lib/review/display.ts`: `areaMap`, `explain`.
- `packages/analysis/src/reply.ts` (the ownership in hundredths), `packages/analysis/src/analysis.svelte.ts` (every
  search asks for it, and `askOwnership`), `packages/analysis/src/cache.ts` (`SHAPE` 6, `READ_FROM` 5),
  `packages/engine/src/protocol.ts` (the fields).
- The measurements: `scripts/measure/ownership-maps.mjs` (the map and the explanations on real games) and
  `scripts/measure/review-ownership.mjs` (the ownership's cost in a whole review).

## Log entries

- [decisions/product.md](../decisions/product.md): "The area maps on real games", "The window of the area lost" and
  "The results of shape 5 stay readable" (2026-10-21), for the first build. "The area map and the explanations on real
  games" (2026-10-21), for this one.
- [decisions/engine.md](../decisions/engine.md): "The cost of the ownership in a whole review" (2026-10-21).
