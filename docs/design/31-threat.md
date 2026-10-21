# The threat

**Status:** in force, built. **Decided:** 2026-10-21, from Lichess's "Show threat".

## Context

A player who does not see the opponent's next close or cut loses the most points. A label says what a move cost, and
the engine's line shows a better move. Neither shows what the opponent threatens now.

Lichess's engine box has a switch, "Show threat", with the key x (`ui/analyse/src/keyboard.ts`, `ui/lib/src/ceval`).
With the switch on, the engine searches the position as if the side to move passed, and the box shows that position's
evaluation and the opponent's best line, drawn in red on the board.

Enclosure has a pass: a timeout pass forfeits the rest of a turn (the engine repository's
[docs/design/04-notation-and-protocol.md](https://github.com/abstractclass-org/engines/blob/main/docs/design/04-notation-and-protocol.md),
"The moves list"). So the engine can search the position after a pass, and the protocol needs nothing new. A pass
ends the turn as usual: the edges placed earlier in the turn stay protected during the opponent's next turn
(`end_turn` in KataGame's `cpp/game/enclosure/engine.h`), and the passer still scores its regions at the turn's end. At
a turn's start the pass places nothing, so nothing of the passer's is protected. That is what "do nothing more" means.

## Decision

1. **A switch in the engine header** (design 09), before the gear, and the key x, as on Lichess. It holds for the
   visit only, as Lichess's does. The display menu's Keyboard section and the list of keys ("?") name the key. x was
   one of the keys for the line beside this one (design 07): that line keeps Shift+↑ and Shift+↓, comma and period,
   and c goes with x.
2. **The search:** the position after a pass by the side to move (`askThreat` in
   `packages/analysis/src/analysis.svelte.ts`). At a turn's start the pass forfeits the whole turn, and the threat is
   the opponent's whole next turn, two edges. In a turn's middle the pass forfeits the turn's second edge.
   - It is searched as the position on screen is: to the Depth's visits, within the time limit (design 09), in slices
     whose results show as they come. A change of the Depth or the limit searches it again.
   - Its priority is below the position on screen's and the area map's short searches, and above the player's
     evaluations and the review's passes. In slices, so the pool stops it for the search of the player's own position
     when no worker is free, and runs it again later.
   - It follows the rules of the review's other searches. A stored result as deep is read and not searched again. The
     store keeps it as it keeps a result one move from the game (design 20, item 8): the site's own results always,
     and an earlier engine's while a snapshot reads the position before the pass. A review file takes it with the
     results one move from the game's positions (design 13).
   - Where the pass ends the game (the game's last edges), there is no threat. The rules say so before any search.
   - The engine off stops the search, and its result so far stays. The engine on searches it again.
   - **A snapshot** (design 20) searches nothing. It reads the threat from the store, with the search and the network
     file of its results, at the depths that a snapshot reads. Where the store has none, the header says "No threat
     saved: snapshots do no searches", and the switch's note says that a snapshot shows only a threat that was saved.
3. **The header, with the switch on,** shows the threat's search, as Lichess's engine box shows its threat's:
   - the first line's bar and visits are the threat's search;
   - the second line gives the values after the pass: "If Blue passes: margin Red +363 ± 182 · lead Red +349";
   - the third line, in the place of the position's difficulty (design 14), gives the threat's size: "Threat to Blue:
     −6.6% · −168.7 pts". Its note names the opponent's edges. While there is no size, the line says why: the search
     waits for the engine or runs, the engine is off, the game ends, or a snapshot has no threat saved.
4. **The threat's size is the engine's own estimate:** what passing costs by the engine's evaluation. The position's
   value less the value after the pass, from the player's side, in the units of a move's loss (design 10): win chance
   and the lead's points, written as a note writes a loss (`costText`). It is not the area that the threat's first
   turn closes. A turn's close or cut is never the real gain or loss: the rest of the game decides (design 30, "Why").
   So there is no caption about the regions that it closes.
5. **The threat is a line on the board,** drawn as the engine's lines are (design 07, item 1): numbered edges, the edges
   that they cut, the regions that they close, Animated or Static. It is the first choice's line after the pass, as
   far as the search trusts it (25 visits through each edge), and only the opponent's turn, so all of it is in the
   opponent's colour. While it shows, the other candidates leave the board. A candidate pointed at or pinned shows
   its own line in its place, and a preview shows over both. The players' tags show the areas after its last drawn
   edge.
6. **The area map follows it** as it follows any line (design 30, item 5): the map of the position after its last
   drawn edge, and "Maps of the threat: 1 of 2" while they come. Its step 0 is the position after the pass, whose map
   is the threat's search's. In After vs before, the map compares the position before the pass with the step shown,
   for the player who passes: it shows where the forecast falls if the player passes. The legend names the two: "After
   edge 2 of the threat vs before the pass".
7. **The review and the Analysis board** both have it: the view is the same (design 21).

## Why

- **Lichess's way.** The question "what does my opponent threaten?" is the threat's, and Lichess answers it with one
  search of a pass. KaTrain and Lizzie have no threat. A threat comes from a full search, and the engine needs nothing
  new.
- **The engine's own estimate for its size.** The area map's captions of a turn's close or cut were left out: a turn's
  immediate gain is exact and misleading (design 30, "Why"). The difference of two searches measures what the
  pass costs over the rest of the game, as a move's loss does.
- **A line, not a caption.** The board already draws a line's cuts and regions, and the area map already follows a
  line. The threat reads as the engine's lines read.
- **The opponent's turn only.** The threat is what the opponent does if the player does nothing. The edges after it
  are the player's answer, which the candidates already show.
- **Below the position's own search.** The player's own position comes first: its candidates are the player's choice.
  The threat waits for a free worker, or gives way in slices.
- **The Depth's visits:** the threat's value is compared with the position on screen's, which the Depth searches. Two
  searches as deep keep the difference from measuring a difference of depth.

## Alternatives

- **The network's opponent-reply head** (taken out of abscls-jk1c): it guesses the reply after the player's own move,
  with no search. The threat is a full search.
- **A caption of the regions that the threat closes:** exact and misleading (Why).
- **The threat's line in the opponent's colour beyond the opponent's turn:** the line's later edges are the player's,
  in the player's colour, and they answer a different question.
- **The threat's candidates in the table** (Lichess lists its threat's lines): the table then lists the opponent's
  moves in the player's position, and the player must read which side each row is for. The table keeps the
  position's own candidates.
- **The label budget for the threat's search:** cheaper, but the threat's value would be shallower than the position
  on screen's, and the difference would measure the depth too.
- **The switch kept between visits:** Lichess's is not kept. A threat costs a deep search at every position that the
  player looks at.

## Consequences

- With the switch on, each position that the player looks at costs a second search to the Depth, after its own. On a
  machine of one worker, the threat comes after the position's own search.
- The threat's results are stored, as every result is. The store grows by one result for each position looked at with
  the switch on.
- Self-play has no timeouts, so the network has seldom seen a position after a pass. The check on real games
  ([decisions/product.md](../decisions/product.md), "The threat on real games") measures whether it reads one well.

## Where it is

- `packages/analysis/src/analysis.svelte.ts`: `askThreat`, `threatAt`, `passedAt`, `threatState`, `readThreat` (a
  snapshot's), `dropThreat`, `PRIORITY.threat`, and the map of the threat's position waiting for its search
  (`ownSearchComes`). Tests: `analysis.test.ts`, "the threat: …".
- `src/lib/review/ReviewView.svelte`: `threatOn`, `toggleThreat` and the key x, `threat`, `threatEdges`, `threatCost`,
  `threatShown`, `threatNote`, the threat's steps (`threatStepsHad`), the map's `threat` line (`mapLine`, `diffBase`,
  `stepName`, `diffName`), and the switch in the engine header.
- `scripts/measure/threat-check.mjs`: the check on real games.

## Log entries

- [decisions/product.md](../decisions/product.md), "The threat on real games" (2026-10-21).
