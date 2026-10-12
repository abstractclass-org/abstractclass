# How a turn or an edge gets its label

**Status:** in force, built in the review. **Decided:** 2026-10-09 (labels by edge), 2026-10-11 (labels by turn, the
rules for Best and Great by turn, the special cases below), 2026-10-12 (a human's win chance, fitted on the meaf.us
archive, in place of the engine's, and no point bands).

## Context

A label says how good a move was: Great, Best, Excellent, Good, Inaccuracy, Mistake or Blunder (chess.com's names).
The plain rule is two bands of loss. The engine's searches and Enclosure's turns of two edges add cases that the
plain rule gets wrong. This document keeps every rule in one place, the plain one and the special ones, each with its
reason. Design 05 gives the searches that the labels read: their schedule, their budgets and their cache.

## Decision

1. **The unit.** The page judges each turn as a whole (the default) or each edge: the display setting "Review by"
   (Turn or Edge). A turn is the player's decision: the opponent does not move between its edges, the score is paid
   at its end, and both edges are protected together. Lichess and KaTrain give one label to each decision, and in
   their games a move is a turn. No published tool has turns of two moves, so labels by turn are this site's own
   choice. The setting "Review for" (Both, Blue or Red) shows one player's labels, numbers, notes and engine lines
   only, on the board and the chart too. The counts keep both players.
2. **When a label exists.** An edge has a label once both its positions are searched to 256 visits or more. A turn has
   one once its first position and the position after it are. The values after the game's last move are its result.
   256 visits is the first budget whose mistake flags are mostly right ([decisions/engine.md](../decisions/engine.md),
   "Label agreement against search budget, under protocol 0.3", "Label agreement by turn"). The sweep's 32 visits
   give no label. A label can change when a deeper search replaces a shallow one.
3. **The loss** (KaTrain's and Lichess's): the mover's value before less the mover's value after, each from its own
   position's search, in a human's win chance (below), and in points (the engine's `scoreLead`, as KaTrain's points
   lost) for the notes. Whether the expected margin (`scoreSelfplay`) serves the points better is measured, not
   assumed (decisions/open-items.md).
   - **An edge's loss:** from the position before it to the position after it. For a turn's first edge, that is its
     cost when the best second edge follows it. For the second edge, it is its distance from the best second edge.
   - **A turn's loss:** from the turn's start to the position after its last edge. It equals the sum of its edges'
     losses: the value between them cancels, and so does the error of that search.
   - **The label reads the loss at 0 or more:** a gain is no loss. The notes give the loss before that clamp: a gain
     has a plus.
4. **A human's win chance, and the bands** (`src/lib/review/labels.ts`).
   - **A human's win chance,** not the engine's: σ(k · lead / spread), from the engine's lead for the player
     (`scoreLead`) and the spread of the final score (`scoreStdev`), with k = 0.99. The engine's own win chance is that
     of a game between two engines: where it gives a player 89%, players of the archive won 61 to 71% of the time.
     Lichess turns Stockfish's centipawns into the win chance of human games in the same way (lila pull request
     11148). chess.com reads the engine with the player's rating.
   - **The fit** (`scripts/measure/fit-win-curve.mjs`, on request 07's analysis of the archive): one curve for every
     rating, as Lichess's. Fitted on the games between players at most 150 rating points apart (301 games), because
     between unequal players an early lead also shows who is the stronger player. With a term for the side to move at
     a turn's start in the fit only: that player is the next to err, and a label measures against the engine's best
     turn, not against an average one. Abandoned games are left out, as Lichess leaves them out. The formula fitted
     held-out games better than the engine's win chance, refitted or not, the lead alone, and the lead with the edges
     left (Stern's model of a lead and the time left). k is 0.986 at 1,024 visits and 0.998 at 512
     ([decisions/engine.md](../decisions/engine.md), "The human win curve fitted on the archive", "The win curve's
     flat middle").
   - **The bands:** chess.com's bands of expected points, the same for every player: Excellent to 0.02, Good to 0.05,
     Inaccuracy to 0.10, Mistake to 0.20, then Blunder. No site changes its bands by the player's rating.
   - **Points lost do not label.** They show in the notes. A point band flags the moves of a decided game, which
     chess.com and Lichess leave alone. A human's win chance does not saturate where the engine's does: from the
     engine's 99%, players still lost 9 to 12% of their games, so a lead thrown away still costs.
   - The same curve and bands serve turns and edges.
5. **Best:** the engine's own move, whatever its loss, so that the error of two searches cannot call the engine's own
   choice a mistake.
   - **An edge** is Best when it is the first choice of its position's search (KataGo's order).
   - **A turn** is Best when it reaches the engine's best turn: each edge is the first choice of its own search (the
     middle searched to 256 visits or more), or the turn's two edges are the first choice and the next edge of its
     line, in either order. The same two edges in the other order make the same turn.
   - **By edge, both edges of the engine's best turn played in the other order are Best.** The first edge played is
     then the second edge of the engine's line, so it is not the first choice of its search, and its loss comes from
     the search between the two edges alone (turn 9 of the sample game: J11-M13 was Good by that search's −27 points).
6. **Great: the only good move, confirmed by equal searches** (En Croissant's rule: the second choice at least 0.10 of
   win chance worse, from two equal searches). The win chance is a human's, as for every loss. In the search before a
   move, the second choice rests on few visits: in the sample game, 25 of 28 such gaps had a second choice with under
   15% of the first's visits. So a gap in one search only asks for a search of the position after the other choice, to
   the label budget, as deep as the position after the played move (KaTrain's "equalize" gives every candidate the top
   move's visits for the same reason). Until that search confirms the gap, the move is Best.
   - **An edge** is Great when it is Best, the second choice looks 0.10 worse in the search before it, and the
     position after the second choice is 0.10 below the position after the edge.
   - **A turn** is Great when it is Best and two checks confirm it. From the turn's start: the other candidate (the
     first candidate that is not an edge of the turn) looks 0.10 worse, and the position after it is 0.10 below the
     position after the turn. The turn's own edges are left out there, because the best turn that starts with one of
     them is often the turn in the other order. From the turn's middle, for a turn of two edges: the played second
     edge is the first choice there, and its second choice is confirmed 0.10 worse, as for an edge.
   - **The game's last move or turn is not Great:** nothing after it can be searched to confirm it.
7. **Special cases.**
   - **A turn of one edge** (Blue's first turn, the game's last turn, or a turn cut by a timeout) is judged as one
     edge.
   - **A timeout pass** is a move without an edge: its loss counts, and it is never Best.
   - **A branch's moves** have no labels until the player asks ("Evaluate quality" in the move menu). Then every branch
     move of that turn is searched and judged as the game's moves are (`judgeTurn`, `judgeEdge`). A branch that stops
     in a turn's middle has no turn label until the turn ends.
   - **A turn's note** gives the turn's cost, then each edge's points, in the turn's order: "Blunder: −25.2% · −144.0
     pts (−144.0 pts, 0.0 pts)". The parts are rounded together, in tenths, so that they make the turn's points
     (Hamilton's largest remainders, `roundTogether`). The engine's own turn, Best or Great, has no parts: its edges
     have nothing to explain, and their losses would show only the error of the search between them.
   - **The key moments** are the worst turns or edges, Inaccuracy or worse, at most 8, after the first 8 turns, as
     Regan and Haworth skip the opening: its values swing most.
8. **What shows** (design 06 and design 07 give the places): the move list and the chart show Great, Inaccuracy,
   Mistake and Blunder, to stay quiet, and the board shows every label. The notes under a turn or an edge are for
   Great, Mistake and Blunder: "Blunder. N9-Q10 M6-N9 was best.", "Great. The only good edges.". Under a Mistake or a
   Blunder, the engine's best line from where it started shows as a branch.

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
- **The engine's win chance:** the chance of a game between two engines, and it saturates. **Points only:** a 50-point
  loss means little in a game decided by 2,000. **The worse of a win-chance band and a point band** (OGS's rule, the
  labels before 2026-10-12, with KaTrain's Go bands times 12): the point bands flagged the moves of decided games, 41%
  of the archive's flagged turns.
- **A curve by rating** (chess.com): one curve gives a label the same meaning for every player, and an imported game
  may not have the players' ratings. **Bands set from the percentiles of strong and weak players' losses:** they grade
  a move against other players of its rating, which no site does. **A curve fitted on strong players' games only**
  (Lichess's 2300 and above): in the archive, games between near-equal players separate the position from the players
  better, at every level.
- **Only a label for each edge** (the review before labels by turn): two labels for one decision. A first edge's loss
  assumes the best second edge, so an Excellent first edge before a Blunder praises a plan that the player did not
  play. **A label for the turn and for each edge together:** labels side by side that disagree. **A switch for each
  turn:** units mixed in one list and in the counts. The turn's note gives its edges.
- **Marks on the edges that lost points** under a turn's label: they judge each edge alone, so they are labels by edge
  under another name. "Review by" gives labels by edge plainly.

## Consequences

- The curve is fitted for one network (`b10c128-s46923648-d9407005`) on 301 human games. A newer network, or more
  games, is fitted again with the same script. The site now ships a newer one (`b10c128-s66625408-d13350730`,
  [requests/03-release-artifacts.md](../requests/03-release-artifacts.md)), which is more certain, so the curve is
  not yet fitted for the network that labels the games.
- An edge's number in the move list is its measured loss, also where the edge is Best: J11-M13 shows −27 beside its
  ★, the error of the search in its turn's middle.
- A turn whose two ends were searched to different depths mixes two budgets in its loss.

## Where it is

- `src/lib/review/labels.ts` (`humanWin`, the bands, `classify`), `src/lib/review/model.ts` (`labelWin`,
  `candidateWin`, `judgeEdge`, `judgeTurn`, `otherCandidate`, `review`, `costText`, `turnCost`, `roundTogether`),
  `scripts/measure/fit-win-curve.mjs` (the fit), `src/lib/analysis/game.svelte.ts`
  (`confirmGreats`: the searches that confirm Great; `judge`: a branch's turn on request),
  `src/lib/review/ReviewView.svelte` (what shows).
- The tests: `src/lib/review/model.test.ts`.

## Log entries

- [decisions/product.md](../decisions/product.md): "The review wireframe, first feedback" (2026-10-09, the labels'
  names and glyphs), "Great confirmed by an equal search", "Labels by turn", "Judged by turn or by edge, and numbers
  from one side", "Turn mode built", "Turn mode, first feedback", "Turn mode, second feedback", "Labels in one place"
  (2026-10-11).
- [decisions/engine.md](../decisions/engine.md): "Label agreement against search budget" (2026-10-09), "Label
  agreement against search budget, under protocol 0.3", "Label agreement by turn", "The search in a turn's middle"
  (2026-10-11), "The engine's win chance against human results", "The human win curve fitted on the archive", "The
  win curve's flat middle" (2026-10-12).
- [decisions/product.md](../decisions/product.md): "Labels from a human win chance: fixed bands, one curve"
  (2026-10-12).
