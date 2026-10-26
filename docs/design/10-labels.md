# How a turn or an edge gets its label

**Status:** in force, built in the review. **Decided:** 2026-10-09 (labels by edge), 2026-10-11 (labels by turn, the
rules for Best and Great by turn, the special cases below), 2026-10-12 (the engine's own win chance, with
chess.com's bands and no point bands, after a human's win chance fitted on the archive was tried the same day),
2026-10-21 (Great: En Croissant's whole rule).

## Context

A label says how good a move was: Great, Best, Excellent, Good, Inaccuracy, Mistake or Blunder (chess.com's names).
The plain rule is two bands of loss. The engine's searches and Enclosure's turns of two edges add cases that the
plain rule gets wrong. This document keeps every rule in one place, the plain one and the special ones, each with its
reason. Design 05 gives the searches that the labels read: their schedule, their budgets and their cache.

## Decision

1. **The unit.** The page judges each turn as a whole (the default) or each edge: the display setting "Review by"
   (Turn or Edge). A turn is the player's decision: the enemy does not move between its edges, the score is paid
   at its end, and both edges are invincible together. Lichess and KaTrain give one label to each decision, and in
   their games a move is a turn. No published tool has turns of two moves, so labels by turn are this site's own
   choice. The setting "Review for" (Both, Blue or Red) shows one player's labels, numbers, notes and engine lines
   only, on the board and the chart too. The counts keep both players.
2. **When a label exists.** An edge has a label once both its positions are searched to 256 visits or more. A turn has
   one once its first position and the position after it are. The values after the game's last move are its result.
   256 visits is the first budget whose mistake flags are mostly right ([decisions/engine.md](../decisions/engine.md),
   "Label agreement against search budget, under protocol 0.3", "Label agreement by turn"). The sweep's 32 visits
   give no label. A label can change when a deeper search replaces a shallow one.
3. **The loss** (KaTrain's and Lichess's): the mover's value before less the mover's value after, each from its own
   position's search, in the engine's win chance (below), and in the lead (the engine's `scoreLead`, as KaTrain's
   points lost) for the notes. Whether the expected final margin (`scoreSelfplay`) serves the notes better is measured,
   not assumed (decisions/open-items.md).
   - **An edge's loss:** from the position before it to the position after it. For a turn's first edge, that is its
     cost when the best second edge follows it. For the second edge, it is its distance from the best second edge.
   - **A turn's loss:** from the turn's start to the position after its last edge. It equals the sum of its edges'
     losses: the value between them cancels, and so does the error of that search.
   - **The label reads the loss at 0 or more:** a gain is no loss. The notes give the loss before that clamp: a gain
     has a plus.
4. **The engine's win chance, and the bands** (`packages/analysis/src/labels.ts`).
   - **The engine's own win chance** (its `winrate`), as chess.com and Lichess judge a move by the win chance their
     engine gives. It saturates once a game is decided, so a move there loses little: a label tells what a move cost
     the result, and a loss of 30 in the lead matters less at a lead of 120 than at a lead of 20.
   - **The bands:** chess.com's bands of expected points, the same for every player: Excellent to 0.02, Good to 0.05,
     Inaccuracy to 0.10, Mistake to 0.20, then Blunder. No site changes its bands by the player's rating.
   - **The loss in the lead does not label.** It shows in the notes. A band on the lead flags the moves of a decided
     game, which chess.com and Lichess leave alone.
   - **Tested on games of known strength** ([decisions/engine.md](../decisions/engine.md), "The label rules on games
     of known strength"): the flags fall as the player gets stronger, for the site's network at 16 to 1,024 visits,
     for 37 bots rated 2,000 to 3,000, and for people by rating. They fall mostly where the game is still open (73% of
     people's Mistakes and Blunders in the first 40 edges) and rarely once the engine holds it decided.
   - The same bands serve turns and edges.
5. **Best:** the engine's own move, whatever its loss, so that the error of two searches cannot call the engine's own
   choice a mistake.
   - **An edge** is Best when it is the first choice of its position's search (KataGo's order).
   - **A turn** is Best when it reaches the engine's best turn: each edge is the first choice of its own search (the
     middle searched to 256 visits or more), or the turn's two edges are the first choice and the next edge of its
     line, in either order. The same two edges in the other order make the same turn.
   - **By edge, both edges of the engine's best turn played in the other order are Best.** The first edge played is
     then the second edge of the engine's line, so it is not the first choice of its search, and its loss comes from
     the search between the two edges alone (turn 9 of the sample game: J11-M13 was Good, with a loss
     of 27 in the lead by that search).
6. **Great: the only good move, which keeps what the enemy's last turn gave** (En Croissant's rule for "!",
   [`src/utils/score.ts`](https://github.com/franciscoBSalgueiro/en-croissant/blob/d64ce9e/src/utils/score.ts),
   `getAnnotation`, at commit d64ce9e. En Croissant's name for "!" is "Good", in `src/utils/annotation.ts`). En
   Croissant's "!" needs three conditions:
   1. The move loses at most 0.05 of win chance. Else it is "?!", "?" or "??".
   2. The move is the engine's first line, and the first line is more than 0.10 better than the second: two lines of
      one MultiPV search, which Stockfish searches to the same depth.
   3. The best line is more than 0.05 better for the mover than the value before the enemy's last move: the move
      keeps what the enemy's last move gave. ("!!" when the move is also a sacrifice. Enclosure has no sacrifices.)

   Here, Best covers the first condition: the first choice is Great or Best whatever its loss (item 5). An equal search
   confirms the second condition (below). En Croissant asks for a gap of more than 0.10, and the site asks for 0.10 or
   more (`ONLY_MOVE_GAP` in `labels.ts`). The two differ only at a gap of exactly 0.10. The third condition:
   - **The values:** the first choice's win chance in the search before the move (En Croissant's best line), against
     the win chance of the position before the enemy's last turn, both for the mover. It must be more than 0.05
     better (`keepsGain` in `packages/analysis/src/model.ts`, `KEPT_GAIN` in `labels.ts`). The earlier position gives
     its root's win chance, as every loss reads a position. En Croissant reads that position's best line, which is the
     same value in Stockfish's search. In KataGo's search the two can differ a little.
   - **The enemy's last move is the enemy's last turn,** by turn and by edge alike: Enclosure's turns have two
     edges, and the enemy does not move between them. For a turn, and for a turn's first edge, the position is the
     start of the enemy's turn just before. For a turn's second edge, it is the same position: the mover's own first
     edge is between them, and the enemy's turn is still the last. For a variation move, the position is on the move's
     line: back over the mover's edge before it in the same turn, then back to the start of the enemy's turn. That
     start can be a variation's position or the game's. One function finds the position for the game's line and for a
     variation's (`earlierIndex` in `model.ts`).
   - **No result there, no Great:** the line's first turn has no turn of the enemy before it, so it is never Great
     (En Croissant reads a missing value as 0.00, an even position). A line from a set-up position in the middle of the
     enemy's turn has no start of that turn. A position not yet searched to the label budget counts as no result
     until it is.
   - **The other open tools ask the same of a Great:** the move must matter.
     - Chesskit's "!" (`isPerfectMove` in `src/lib/engine/helpers/moveClassification.ts`, commit 9622d50) needs a
       loss of at most 0.02. It does not mark a simple recapture, a move that leaves the mover under 0.50, or a move
       whose other line still wins (over 0.97). Then the move is the only good move (more than 0.10 better than the
       best other line), or it changes the outcome (more than 0.10 gained, across 0.50).
     - WintrChess's "Critical" (`shared/src/lib/reporter/classification/critical.ts` and `utils/criticalMove.ts`,
       commit d145b20) needs the top move, with the second line at least 0.10 of expected points worse. It does not
       mark these moves: a move that still wins without it (the second line at +7.00 or more), a move in a losing
       position (under 0), a queen promotion, an escape from check, a move with a mate in hand, and a capture of free
       material.
     - chess.com's Great Move (the help article "How are moves classified?") is "critical to the outcome of the game",
       such as a move that turns a losing position into an equal one, or that is the only good move. chess.com
       publishes no thresholds.
     - Lichess has no positive label: Inaccuracy, Mistake and Blunder only (lila, `modules/tree/src/main/Advice.scala`).
   - **So an only move that only holds the position is Best.** All these tools use the gap of 0.10, and each asks for
     more than the gap. En Croissant's third condition is the one of the rule that the site cites. On part1-1000 (1,000
     people's games, 512 visits), it keeps 952 of the 1,253 Greats by edge that the equal search confirms (76%), and
     152 of the 198 by turn (77%) ([decisions/product.md](../decisions/product.md), "Great: En Croissant's whole
     rule").

   **The equal search.** The win chance is the engine's, as for every loss. In the search before a move, the second
   choice rests on few visits: in the sample game, 25 of 28 such gaps had a second choice with under 15% of the
   first's visits. So a gap in one search only asks for a search of the position after the other choice, to the label
   budget, as deep as the position after the played move (KaTrain's "equalize" gives every candidate the top move's
   visits for the same reason). Until that search confirms the gap, the move is Best. A move that fails the third
   condition asks for no search: it cannot be Great (`greatNeeds` in `packages/analysis/src/analysis.svelte.ts`). A
   turn reads the gain at its start, and its second edge reads it at the middle. So a turn of two whose start keeps the
   gain asks for the search from its middle, also where its middle does not keep it. On part1-1000, the review then
   asks for 1,410 of the 1,882 searches that confirm the Greats: 472 fewer (25%).
   - **The position before the enemy's last turn, for a move that the player asked to evaluate.** A review has that
     position for each game move: the label stage searches every position of the game. A variation move and a move of
     the Analysis board may lack it. So "Evaluate quality" also searches it, to the label budget (`greatNeeds` and
     `confirmGreats`). It asks for this search only when the move can still be Great: the search before the move has the
     label budget, the move is the engine's first choice, and the gap of 0.10 is in that search. It asks for none where
     the position has a result of the label budget, or where the gap is absent. A deeper result before the move can
     change the first choice or the gap, and the analysis then asks for the search. This search and the confirmation
     after it are the player's evaluations. They have the priority of the evaluation's other searches (design 07), so
     the move does not wait for the review's stages. The steps of the review's progress bar do not count them. On the
     board, a turn asks for these searches only where the player evaluated each of its edges, as its label needs them
     all.
   - **As deep as the position after the played move, when the player searched it deeper** (the position on screen,
     design 09): the confirmation then searches to the same depth, the largest doubling of the label budget within
     that position's visits (`equalDepth` in `packages/analysis/src/model.ts`: the depths step by doublings, and a
     search still running or stopped at its time limit asks for no more than it has). Until a search that deep confirms
     the gap, the move is Best, so a Great never rests on unequal searches (design 16, example 5).
   - **An edge** is Great when it is Best, the second choice looks 0.10 worse in the search before it, the position
     after the second choice is 0.10 below the position after the edge, and the first choice keeps the gain (the third
     condition).
   - **A turn** is Great when it is Best and two checks confirm it. From the turn's start: the other candidate (the
     first candidate that is not an edge of the turn) looks 0.10 worse, and the position after it is 0.10 below the
     position after the turn. The turn's own edges are left out there, because the best turn that starts with one of
     them is often the turn in the other order. From the turn's middle, for a turn of two edges: the played second
     edge is the first choice there, and its second choice is confirmed 0.10 worse, as for an edge. And the first
     choice at the turn's start keeps the gain (the third condition).
   - **The game's last move or turn is not Great:** nothing after it can be searched to confirm it.
7. **Special cases.**
   - **A turn of one edge** (Blue's first turn, the game's last turn, or a turn cut by a timeout) is judged as one
     edge.
   - **A timeout pass** is a move without an edge: its loss counts, and it is never Best.
   - **A game that ends early** (a resignation, a forfeit, or a record with no end yet): only the rules end a game, so
     its last position is searched as any position, and its last move has a label from that search. The report names
     the end as the record's result gives it ("Blue won: Red resigned after edge 74", "Unfinished after edge 40"), with
     the scores on the board then. A game that the rules end takes its result from the scores, as before
     (`endingText` in `src/lib/review/enclosure.ts`).
   - **A variation's moves** have no labels until the player asks ("Evaluate quality" in the move menu). Then every
     variation move of that turn is searched and judged as the game's moves are (`judgeTurn`, `judgeMove`). A variation
     that stops in a turn's middle has no turn label until the turn ends. A move that would be Great waits for its extra
     searches (the position before the enemy's last turn, then the confirmation of the gap) and shows "Evaluating…"
     until they end (`GameAnalysis.awaitsGreat`).
   - **A turn's note** gives the turn's cost, then each edge's loss in the lead, in the turn's order: "Blunder:
     −25.2% · −144.0 (−144.0, 0.0)". The parts are rounded together, in tenths, so that they make the turn's loss in
     the lead (Hamilton's largest remainders, `roundTogether`). The engine's own turn, Best or Great, has no parts:
     its edges have nothing to explain, and their losses would show only the error of the search between them.
8. **What shows** (design 06 and design 07 give the places): the move list and the charts show Great, Inaccuracy,
   Mistake and Blunder, to stay quiet, and the board shows every label. The charts mark each such turn or edge with a
   dot (`chartMarks` in `packages/analysis/src/model.ts`). The notes under a turn or an edge are for
   Great, Mistake and Blunder: "Blunder. N9-Q10 M6-N9 was best.", "Great. The only good edges. It keeps the gain from
   the enemy's last turn.". Under a Mistake or a Blunder, the engine's best line from where it started shows as a
   variation. ◆ beside a loss marks a hard position (design 14), and the player's accuracy weighs each move by the
   position's difficulty.

## Why

- **One set of rules, kept here:** the plain bands no longer decide a label alone. Best and Great look at the engine's
  choices and at further searches, and turns add their own cases. A rule kept in one place can be checked against the
  code and against the next case like turn 9.
- **Losses across positions:** the published method (KaTrain, Lichess). The engine's first choice is Best whatever its
  loss, so the noise of two searches cannot call it a mistake.
- **Labels by turn:** a turn's label judges the decision that the player made. Its loss rests on two searches, as an
  edge's does, but it is larger, so it stands further from their error. On 4 bot games a turn's mean error was 0.36 of
  its mean loss at 512 visits, and an edge's 0.45 ([decisions/engine.md](../decisions/engine.md), "Label agreement by
  turn"). The edges' losses still show where a turn went wrong.

## Alternatives

- **The loss within one search** (the best candidate against the played one): less noisy when the played edge was
  searched, but often it was not, and it departs from the published method.
- **A human's win chance** (the labels of 2026-10-12, the same day): σ(0.99 · lead / scoreStdev), fitted on the
  archive's games between near-equal players, as Lichess fits its curve on human games (lila pull request 11148). It
  does not saturate: from the engine's 99%, the archive's players still lost 9 to 12% of their games. It flagged
  fewer turns and spread them over the game (23% of people's Mistakes in decided positions). Not kept: the archive's
  players are beginners of a young game, so a curve fitted on them is lenient and drifts as they improve, and the
  engine's own chance measures strength as well on games of known strength. Its fit and measurements stay in
  decisions/engine.md ("The human win curve fitted on the archive", "The win curve's flat middle") and
  `scripts/measure/fit-win-curve.mjs`.
- **Points only:** a 50-point loss means little in a game decided by 2,000. **The worse of a win-chance band and a
  point band** (OGS's rule, the labels before 2026-10-12, with KaTrain's Go bands times 12): the point bands flagged
  the moves of decided games, 41% of the archive's flagged turns, and 46% of people's Mistakes on games of known
  strength.
- **A curve by rating** (chess.com): one curve gives a label the same meaning for every player, and an imported game
  may not have the players' ratings. **Bands set from the percentiles of strong and weak players' losses:** they grade
  a move against other players of its rating, which no site does.
- **Only a label for each edge** (the review before labels by turn): two labels for one decision. A first edge's loss
  assumes the best second edge, so an Excellent first edge before a Blunder praises a plan that the player did not
  play. **A label for the turn and for each edge together:** labels side by side that disagree. **A switch for each
  turn:** units mixed in one list and in the counts. The turn's note gives its edges.
- **Marks on the edges that lost points** under a turn's label: they judge each edge alone, so they are labels by edge
  under another name. "Review by" gives labels by edge plainly.

## Consequences

- The labels are harsher on beginners than the human curve was: on the archive, Blunder on 30% of the turns of
  players under 1600, against 18%. They follow the network's certainty: the network the site ships since 2026-10-12
  is more certain than the one the tests read with, which steepens its win chance.
- Nothing is fitted to people, so the labels do not move as the players improve.
- An edge's number in the move list is its measured loss, also where the edge is Best: J11-M13 shows −27 beside its
  ★, the error of the search in its turn's middle.
- A turn whose two ends were searched to different depths mixes two budgets in its loss.
- About a quarter fewer Greats than the only good move alone gave (952 of 1,253 by edge on part1-1000). A Great no
  longer marks a move that only holds the position. A Great can still leave the mover losing: the rule does not ask
  for 0.50 after the move, as Chesskit and WintrChess do.

## Where it is

- `packages/analysis/src/labels.ts` (the bands, `classify`), `packages/analysis/src/model.ts` (`judgeMove`, `judgeTurn`,
  `otherCandidate`, `keepsGain`, `earlierIndex`, `review`, `costText`, `turnCost`, `roundTogether`),
  `scripts/measure/label-bench.mjs` (the test on games of known strength), `packages/analysis/src/analysis.svelte.ts`
  (`confirmGreats`: the searches that confirm Great, `earlierAt`: the position before the enemy's last turn,
  `judge`: a variation's turn on request), `scripts/measure/key-moments-opening.mjs` (part 4: the Greats on the
  archive), `packages/review/src/ReviewView.svelte` (what shows).
- The tests: `src/lib/review/enclosure.test.ts`, and `packages/analysis/src/analysis.test.ts` (the searches that a
  Great asks for).

## Log entries

- [decisions/product.md](../decisions/product.md): "The review wireframe, first feedback" (2026-10-09, the labels'
  names and glyphs), "Great confirmed by an equal search", "Labels by turn", "Judged by turn or by edge, and numbers
  from one side", "Turn mode built", "Turn mode, first feedback", "Turn mode, second feedback", "Labels in one place"
  (2026-10-11).
- [decisions/engine.md](../decisions/engine.md): "Label agreement against search budget" (2026-10-09), "Label
  agreement against search budget, under protocol 0.3", "Label agreement by turn", "The search in a turn's middle"
  (2026-10-11), "The engine's win chance against human results", "The human win curve fitted on the archive", "The
  win curve's flat middle" (2026-10-12).
- [decisions/product.md](../decisions/product.md): "Labels from a human win chance: fixed bands, one curve", "Labels
  back on the engine's win chance" (2026-10-12).
- [decisions/engine.md](../decisions/engine.md): "The label rules on games of known strength" (2026-10-12).
- [decisions/product.md](../decisions/product.md): "The charts mark every label, and every label has the review's
  depth" (2026-10-21).
- [decisions/product.md](../decisions/product.md): "Great: En Croissant's whole rule" (2026-10-21).
