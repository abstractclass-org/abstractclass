# A position's difficulty: hard positions and the accuracy's weights

**Status:** in force, built. **Decided:** 2026-10-12. **Changed:** 2026-10-21 (the engine header's second line, and
the mark on a variation's moves and on the Analysis board's).

## Context

Design 01 (principle 4) makes a position's difficulty a first-class quantity: KaTrain's complexity for each position,
the accuracy weighted by it so that easy positions count less, and later the choice of puzzles. A game has many easy
moves. In a decided game no edge changes the result, and a plain mean of the moves' accuracy rewards them. A player
also wants to know where the game was hard, apart from where they lost.

## Decision

1. **The complexity** (KaTrain's, `complexity` in `packages/analysis/src/model.ts`): the mean loss of the searched
   candidates, each weighed by the network's prior, from the root's value, for the mover. It is in the engine's win
   chance, the labels' unit (design 10), not in points as KaTrain's. The stored analysis keeps each candidate's prior
   (the store's shape 5).
2. **A hard position:** a complexity of 0.10 or more (`HARD` in `packages/analysis/src/labels.ts`). The network's likely
   edges lose a Mistake's worth there on average. A turn is as hard as its harder position.
3. **What shows:** a mark where a position is hard, the complexity as a number, and two pictures of how hard. The
   mark's tooltip says "Hard position".
   - **The mark is the position's,** not the review's. It shows wherever the position before a move has a result with
     the priors, from the same result that the engine header shows for that position. A review searches every
     position of the game, so each of the game's moves has one. A variation (design 07) and the Analysis board
     (design 21) search only what the player looks at: there a move without the mark is easy, or the engine has not
     searched its position yet. The move's tooltip then says "Not searched yet", and a marked move's says "Hard
     position".
   - ◆ in the move list, beside the loss of a turn (or of an edge, by edge). Every row keeps a slot for it, so that a
     mark never moves the label beside it or widens the column. On the board, the main line's moves that the player
     did not evaluate have it too.
   - ◆ on a variation's moves, and on the board's variations: by edge, after the move and its label. By turn, at the
     move that ends the turn, from the harder of the turn's positions, as a game turn's. For the side reviewed only, as
     the labels. It is small and muted, as in the move list, with no slot of its own, as a variation's labels have none.
   - **The engine header's second line,** the difficulty of the position on screen, in every form (a game's move, a
     variation, the board). The first line gives the advantage ("Expected final margin … · lead …"). The second gives,
     in one row: the ◆'s slot, as wide as the move list's and empty when the position is not hard, the likely
     edges' meter (below), in the row's free width, and the complexity written as a loss to one decimal, as the notes
     write losses (`costText`): −14.3%, and 0.0% with no sign when it rounds to 0. The number has the width of the
     longest, −99.9%, so the meter keeps its width from one position to the next. Before the position has a result,
     the row keeps its height (an empty slot, the grey bar, no number): nothing under it moves. The engine settings
     cover it. Its tooltip, which is also its accessible name: "Hard position." when it is, then the difficulty in
     words, then the meter's shares. For example: "Difficulty −14.3%: the engine's likely edges lose 14.3% of win
     chance here on average. A position is hard from 10%. Likely edges: …".
   - **The Difficulty chart,** its own chart, in a tab beside the Advantage chart under the board (design 06), as
     Lichess sets its Move times chart beside its Advantage chart: a bar for each turn (or edge), as tall as its
     complexity, full at twice a hard position's. A hard one is in the ink, the others faint, and a dashed line marks
     the hard level. Each label that the move list shows is a dot, 7 pixels wide, in a row under the bars, under its
     turn (or edge): the bars' heights stay a picture of difficulty alone, a dot never covers a short bar, and the row
     reads as a line of time. So the chart shows whether the mistakes fell where the game was hard. Its legend: "Hard
     position" and "Easier", in swatches of one size.
   - **The difficulty chart's positions:** a bar belongs to the position before its move, where the player decided,
     and a click shows that position, with its meter. The Advantage chart and the move list show the position after a
     move. The tooltips say which: the Advantage chart's names the move played ("7. K9-K10 A9-D10"), and the
     Difficulty chart's names the decision ("7. Blue to play"), then "Played K9-K10 A9-D10", then "Hard position"
     when it is. The tooltip wraps inside the chart, on the side with more room.
   - **The charts stay the game's.** A chart needs every position of its line searched, and only a review searches a
     whole line. The board searches only what the player looks at, and bars for the visited positions alone would
     mislead. The board has no chart.
   - **The likely edges' meter,** in the engine header's second line, as Maia's Blunder Meter (its platform's
     `calculateBlunderMeter`): the network's prior of the searched edges, summed by the group of each edge's loss
     against the best searched edge's win chance, in the labels' colours: Good or better (a loss up to 0.05),
     Inaccuracy (to 0.10), Mistake (to 0.20) and Blunder. The groups go from good to bad, left to right: Maia's meter
     stands them top to bottom in that order, and the counts in the Report list the labels in it too. The bar's grey
     rest is the prior of the edges that the search
     did not visit. Its tooltip gives the shares: "Likely edges: 2% good or better · 15% inaccuracy · 32% mistake ·
     51% blunder · 1% not searched".
   - In the Report: "◆ marks a hard position."
   - In the annotated record (design 13): "A hard position." in the move's comment.
4. **The accuracy's weights** (KaTrain's `game_report`): each move's accuracy is Lichess's, as before. A player's
   accuracy is their mean weighed by KaTrain's weight for each move: max(0.05, min(1, max(complexity / 0.10,
   loss / 0.20))). KaTrain gives a move its full weight at a complexity of 1 Go point or a loss of 4 points. Here the
   full weight comes at a hard position's complexity or at a Blunder's loss. A move without a complexity (an analysis
   without priors) weighs 1.

5. **The numbers, step by step.** W is a win chance from the mover's side, from 0 to 1. A search gives W at its
   root and W for each candidate it visits. The network gives each legal edge a prior, and the priors of all legal
   edges add up to 1.
   - **A move's loss** (design 10): W before the move less W after it, from the two positions' searches, and 0 when
     the result is below 0.
   - **A move's accuracy** (Lichess's `AccuracyPercent`): 103.1668 × e^(−0.04354 × d) − 3.1669 + 1, where d is the
     loss in percent (0 to 100). The result stays between 0 and 100. A loss of 0 gives 100. A loss of 10% gives about
     65, and a loss of 40% about 16. Lichess adds the 1 for the engine's uncertainty.
   - **A position's complexity:** for each searched candidate with a prior, take its loss against the root,
     max(0, W at the root − W of the candidate), and multiply it by the candidate's prior. Add these, and divide by
     the sum of the same candidates' priors. Edges that the search did not visit do not count.
   - **A hard position:** a complexity of 0.10 or more. A turn's complexity is the largest of its positions'.
   - **A move's weight:** max(0.05, min(1, max(complexity ÷ 0.10, loss ÷ 0.20))). A move whose position has no
     complexity weighs 1.
   - **A player's accuracy in a game:** the sum of weight × accuracy over the player's judged turns (or edges, by
     edge), divided by the sum of their weights.
   - **The meter's shares:** take the best searched candidate's W. Put each searched candidate in a group by its loss
     against that W: up to 0.05 good or better, up to 0.10 Inaccuracy, up to 0.20 Mistake, more for Blunder. A
     group's share is the sum of its candidates' priors, not a count of them. The grey share is 1 less the four
     shares: the prior of the edges that the search did not visit. The complexity measures losses against the root,
     and the meter against the best candidate, as KaTrain and Maia do.
   - **A bar of the Difficulty chart:** min(complexity, 0.20) ÷ 0.20 of the chart's height, full at twice a hard
     position's complexity.
   - **An example.** Blue is to move, and W at the root is 0.60. The search visits three edges: A (W 0.60, prior
     0.50), B (W 0.52, prior 0.30) and C (W 0.35, prior 0.15). The search does not visit edges with a prior of 0.05.
     - The complexity is (0.50 × 0 + 0.30 × 0.08 + 0.15 × 0.25) ÷ 0.95 = 0.065. The position is not hard.
     - The meter shows 50% good or better (A), 30% Inaccuracy (B), 15% Blunder (C) and 5% grey.
     - If Blue plays B, and the next search agrees on W 0.52, the loss is 0.08. The move's accuracy is 70.7, and
       its weight is max(0.065 ÷ 0.10, 0.08 ÷ 0.20) = 0.65.

## Why

- **The weights:** on the archive, a player's accuracy in a game followed the rating at r = 0.63 with them and 0.43
  without. The complexity alone gave 0.58, the loss alone 0.50
  ([decisions/engine.md](../decisions/engine.md), "KaTrain's complexity on the archive").
- **Win chance, not points:** in points, 70% of the archive's positions reach KaTrain's cap scaled by 12, so nearly
  every move would weigh in full. A decided game has large swings in points but nothing at stake. In win chance, the
  share of played edges that lost 0.10 or more rose from 0% to 62% across the tenths of complexity, at every rating.
- **One constant for the mark and the weights:** the correlation barely changed for a full weight at 0.02, 0.05 or
  0.10. At 0.10, the mark falls on the hardest tenth of the archive's positions, and a hard position counts in full.
- **The mark beside the loss, not as a note:** a tenth of the positions are hard, and more of the turns. A line under
  each would crowd the move list.

The departures from the published methods:

- Maia's meter sums a human model's policy (Maia's, at a chosen rating). The site has no human model yet, so the meter
  sums the network's prior: what the engine would look at first, not what a person would play. Maia cuts its groups
  at 0.05 and 0.10 of win chance (Good, OK, Blunder). The meter cuts at the labels' bands, so at the same two places
  and at 0.20 too, and names its groups as the labels do.

- KaTrain's complexity in win chance, not in points, with its constants of 1 Go point and 4 points lost carried to
  0.10 and 0.20 of win chance.
- KaTrain's weights on Lichess's accuracy of each move. KaTrain weighs the points lost and reports 100 × 0.75^(the
  weighted mean). Lichess weighs each move by the volatility of the win chance around it and averages that mean with a
  harmonic mean. The site's mean was plain before.

## Alternatives

- **KaTrain's complexity in points, times 12:** it saturates, as above.
- **KaTrain's accuracy, 100 × 0.75^(weighted points lost):** it is in points, which the labels left.
- **Lichess's game accuracy** (the volatility weights and a harmonic mean): it weighs a move by how much the win chance
  moved around it, not by how hard the position was. Not measured here.
- **Guid and Bratko's complexity** (the first choice changing between depths): it needs several searches of each
  position, and on the archive it told when players find the engine's first choice, not when they err
  (decisions/engine.md, "Guid and Bratko's complexity on the archive").
- **A note under each hard turn:** it crowds the move list.
- **A strip under the Advantage chart** (the first form of the difficulty chart): difficulty is not advantage, and a
  strip that thin had no room for the labels' dots.
- **The complexity as a number in the tooltip** ("the engine's likely edges lose 12.3% here on average"), the first
  form: too many words, and a number that a player cannot weigh. The second line shows the number beside the meter
  and the ◆, in the notes' unit (a loss of win chance, as the notes write a move's cost), with the hard level in its
  tooltip. So a player can weigh it against a move's loss and against the level.
- **The ◆ at the end of the advantage's line, the meter under it:** the header reads as one line of advantage with
  the difficulty at its end, and the meter has no number.
- **The words and the number on a line of their own, the meter under them** ("Difficulty 14.3% · ◆ Hard position"):
  they make the header 18 pixels taller than the ◆ at the end of the advantage's line does, twice the 9 of the second
  line.
- **The Difficulty chart's bar lying down** in place of the meter: as tall as the second line, but it shows only the
  complexity, which the number gives, and drops the likely edges' shares.
- **A search of every variation position,** so that every variation move has its mark: design 07 refused it, because a
  line played to show something should cost no search. The positions not searched are mostly inside the engine's lines
  played to a point (a click on the engine's line adds every move before it). A move that the player plays starts
  from the position on screen, which the engine searches, and a variation's first move starts from a game position.
- **A hollow mark for a position not searched:** it clutters the list. A mark reads by its presence, as a variation's
  labels do, and the tooltip says "Not searched yet".

## Consequences

- Accuracies are lower and spread wider. On the archive, by edge: 59, 67 and 78 for players under 1600, 1600 to 1800,
  and 1800 and above, against 80, 84 and 90 as a plain mean.
- The store's shape changed from 4 to 5. A review stored before searches again when it opens. A review file exported
  before imports without its results, and the review searches again.
- The complexity depends on the network's prior and on the candidates the search visited. A deeper search visits more
  of them.
- The network's likely moves measure how hard a position is, not a player's. An edge that the network never considers is
  no trap here, though a player may fall into it. Design 01's principle 5 (a human policy) is for that.

## Where it is

- `packages/analysis/src/labels.ts` (`HARD`, `accuracyWeight`), `packages/analysis/src/model.ts` (`complexity`, a move's
  `complexity` and `hard`, `isHard`, the weighted accuracy in `summarize`, `HARD_NOTE`, `onlyJudged` keeps the
  complexity), `packages/analysis/src/reply.ts` (`toAnalysis` keeps the prior), `packages/analysis/src/cache.ts`
  (`SHAPE`), `packages/analysis/src/analysis.svelte.ts` (`fromStore`: the board reads its lines' stored results),
  `packages/review/src/ReviewView.svelte` (the marks, `branchHardness` and `searchNote`, the engine header's second
  line, the meter, the Report's line, the charts' tabs),
  `packages/review/src/DifficultyChart.svelte`, `src/lib/review/annotate.ts` (the record's comment),
  `packages/analysis/src/labels.ts` (`meterGroup`), `packages/analysis/src/model.ts` (`likelyMoves`).
- The measurement: `scripts/measure/complexity-check.mjs`.
- The tests: `src/lib/review/enclosure.test.ts`, and `packages/analysis/src/analysis.test.ts` (the board's read).

## Log entries

- [decisions/engine.md](../decisions/engine.md): "KaTrain's complexity on the archive" (2026-10-12).
- [decisions/product.md](../decisions/product.md): "Hard positions and the accuracy's weights" (2026-10-12).
- [decisions/product.md](../decisions/product.md): "Difficulty as the engine header's second line, and the ◆ on
  searched variation moves" (2026-10-21).
