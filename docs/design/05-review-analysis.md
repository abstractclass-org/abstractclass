# The review's analysis: schedule, labels, cache

**Status:** in force. **Decided:** 2026-10-09. The budgets come from the measurement of label agreement
([decisions/engine.md](../decisions/engine.md), "Label agreement against search budget"). **Labels by turn** decided
2026-10-11, with a switch to judge by edge, not built yet: the review still labels each edge.

## Context

A review analyses every position of a game on the visitor's CPU ([02-static-site.md](02-static-site.md)), with the
engine module in a pool of Web Workers. The engine reports, for each position, the win chance and two scores from
Blue's side: `scoreSelfplay` (the expected final margin) and `scoreLead` (the starting score that would make the game
even), and every candidate with the same values. It is reproducible: the same request and build give the same reply.
Design 01 asks for losses in points, labels with sourced thresholds, and labels only where they clear the search's
noise.

## Decision

1. **The schedule is KaTrain's** (`core/game.py`: `analyze_all_nodes`, `analyze_extra`):
   - **The rules first:** every position from the engine's `describe`, before any network, so the board works at once.
   - **A sweep:** every position at 32 visits (KaTrain's `fast_visits`, 25), for the game's shape: the Advantage chart
     and the win bar. Its labels are mostly wrong, so it shows none.
   - **A label pass:** every position at 512 visits, the Lite review. Standard runs the pass at 1,024 visits, and
     Custom at another depth (design 09). Under protocol 0.3, after the opening, 512 visits finds 64% of the bad turns
     of a 1,024-visit search, with 82% of its flags right, and 256 visits finds 54%, with 88% right (by edge: 67% and
     80%, 42% and 79%). A turn gets a label only when its first position and the position after it have at least 256
     visits, the first budget whose mistake flags are mostly right. A label search shows its result at 256 visits and
     then at its budget (it runs in slices of 256, which do not give way), so a label shows as early at every depth
     and can change when the search ends.
   - **Deeper where the player looks:** the position on screen to 1,024 visits, in slices, with the results shown as
     they come (KaTrain's `max_visits`). The engine settings change its visits and give it a time limit (design 09).
     Then the key moments, to 1,024 visits: both ends of each turn, since a loss needs both.
   - A pool of workers runs the most urgent work first: the position on screen, then the key moments, then the sweep.
     A search in slices gives way: when the position on screen finds no free worker, the pool stops a key moment's
     search, which runs again later. A focus that the player has left does not start its search.
2. **A loss is KaTrain's and Lichess's:** the mover's value before less the mover's value after, each from its
   position's search. In win chance, and in points. A turn's loss is the mover's value at the turn's start less the
   mover's value after its last edge. It equals the sum of its edges' losses: the value between them cancels, and so
   does the error of that search. So a turn's loss comes from its two ends, not from its edges' losses added: each
   edge's loss is at least 0, and their sum would bring the middle search's error back.
3. **Points come from the lead** (`scoreLead`), as KaTrain's points lost do. Whether the expected margin
   (`scoreSelfplay`) serves better is measured, not assumed (the backlog).
4. **The label belongs to the turn, and the edges explain it.**
   - **The turn is the decision.** The opponent does not move between a turn's edges, the score is paid at the turn's
     end, and both edges are protected together. Lichess and KaTrain give one label to each decision, and in their
     games a move is a turn. No published tool has turns of two moves, so labels by turn are this site's own choice
     ([decisions/product.md](../decisions/product.md), "Labels by turn").
   - **The label is the worse of two bands** (`src/lib/review/labels.ts`), as OGS colours a move: chess.com's bands of
     expected points on the win chance, and KaTrain's bands of points times the fork's score scale (12) on the
     points. These bands were made for one decision each. They are placeholders until the archive's fit.
   - **Judged by turn or by edge:** a display setting for the whole page, "Judge by", Turn by default. It sets the
     unit of the labels, the move list's numbers, the counts and the accuracy, and the key moments.
     By turn, no edge shows a label of its own: a Blunder turn beside a Good edge would contradict itself. A turn's
     note gives its edges' own losses after its own, so that one turn can be read by edge without the switch:
     "Blunder: −27.1% · −150 pts (D10-G10 −45 pts, G10-J12 −105 pts)", in the form of design 06's notes. By edge,
     each edge has its label, as the review had before labels by turn.
   - **An edge's own loss:** the first edge's loss is its cost when the best second edge follows it. The second
     edge's loss is its distance from the best second edge after the first.
   - **A turn's badge on the board,** by turn: the same badge on both its edges, and not on one edge only, which
     would read as that edge's label. Three things make the two badges read as one: both edges are marked as the turn
     just played (today only the last edge has that mark), pointing at either badge lights both edges and both badges
     with the turn's note, and the move list gives one glyph for the turn.
   - **Best:** the turn reaches the position of the engine's best turn. Each of its edges is the first choice of its
     position's search, or its two edges are the first candidate and the next edge of that candidate's line, in the
     other order. The engine's best turn is Best whatever its loss, so the noise of two searches cannot call it a
     mistake.
   - **Great is the only good turn, confirmed by equal searches.** Great is the best turn when every other turn is at
     least 0.10 of win chance worse (En Croissant's rule for a move, which compares two equal searches). Two other
     turns need a check:
     - **From the turn's start:** the first candidate that is not an edge of the played turn. The search of the
       position after it gives the best turn that starts with it. The edges of the played turn are left out there,
       because the best turn that starts with one of them is often the played turn in the other order.
     - **From the turn's middle:** the second choice after the played first edge. A turn of one edge needs only the
       first check.

     In the search before an edge, the second choice rests on few visits: in the sample game 25 of 28 such gaps had
     a second choice with under 15% of the first's visits. Root noise does not change that: it spreads some visits,
     but a search still gives most of them to the move it finds best. So a gap in one search only asks for a search
     of the position after the other choice, to the label budget, as deep as the position after the played turn. The
     turn is Great when each gap shows in its own search and each such search finds a value 0.10 below the value
     after the played turn, and Best until then. KaTrain's "equalize" gives every candidate the top move's visits for
     the same reason. It costs one or two searches for each turn that asks for them. The game's last turn is not
     confirmed: the game ends.
5. **Results stay in the browser** (IndexedDB), keyed by the stored shape's version, the engine build, the network's
   SHA-256, the moves and the visits. A stored result equals a fresh one, because the engine is reproducible.

## Why

- **The schedule:** KaTrain is the most used analysis tool in Go, and its schedule fits a slow engine. The sweep gives
  the whole game's shape in seconds. The search goes deepest where the player is reading.
- **Losses across positions:** the published method. The engine's first choice is labelled Best whatever its loss, so
  the noise of two searches cannot call the engine's own choice a mistake.
- **The worse of two bands:** the win chance saturates in decided games, the points do not.
- **Labels by turn:** a turn's label judges the decision the player made. Its loss rests on two searches, as an edge's
  does, but it is larger, so it stands further from their error. On 4 bot games a turn's mean error was 0.36 of its
  mean loss at 512 visits, and an edge's 0.45 ([decisions/engine.md](../decisions/engine.md), "Label agreement by
  turn"). The edges' losses still show where the turn went wrong.
- **The cache:** a review opened again costs nothing, and the key makes a stale result impossible.

## Alternatives

- **One fixed budget for every position** (Lichess's server analysis): simple, but the player waits for all of it, or
  reads a shallow result where it matters most.
- **The loss within one search** (the best candidate against the played one): less noisy when the played edge was
  searched, but often it was not, and it departs from the published method.
- **Win chance only:** saturates. **Points only:** a 50-point loss means little in a game decided by 2,000.
- **A label for each edge** (the review before labels by turn): two labels for one decision. A first edge's loss
  assumes the best second edge, so an Excellent first edge before a Blunder praises a plan that the player did not
  play. **A label for the turn and for each edge:** labels side by side that disagree. **A switch for each turn:**
  units mixed in one list and in the counts, and a state to keep for each turn. The turn's note gives its edges.
- **Marks on the edges that lost points** under a turn's label: they judge each edge alone, so they are labels by edge
  under another name. The switch gives labels by edge plainly.

## Consequences

- Labels change while the review runs: a turn has no label until both its ends are analysed, and a label can change
  when a deeper search replaces a shallow one.
- The thresholds are placeholders until they are fitted to Enclosure, by turn
  ([requests/07-archive-analysis.md](../requests/07-archive-analysis.md)). The budgets are measured against a
  1,024-visit reference, which is not the truth either: a deeper reference may move them.
- A turn whose two ends were searched to different depths mixes two budgets in its loss.

## Where it is

- `src/lib/analysis/pool.ts` (the pool and its priorities), `src/lib/analysis/game.svelte.ts` (the schedule),
  `src/lib/analysis/cache.ts` (the browser's store), `src/lib/review/labels.ts` and `src/lib/review/model.ts` (losses
  and labels), `src/lib/review/ReviewView.svelte` and `src/routes/review/+page.svelte` (the page).
- The measurement: `scripts/measure/budget-collect.mjs` and `scripts/measure/budget-summary.mjs`.

## Log entries

- [decisions/engine.md](../decisions/engine.md), "The review on the engine" and "Label agreement against search
  budget" (2026-10-09), "The position on screen first: searches that give way" (2026-10-10).
- [decisions/product.md](../decisions/product.md), "The engine's settings" (2026-10-11).
- [decisions/product.md](../decisions/product.md), "Labels by turn", and [decisions/engine.md](../decisions/engine.md),
  "Label agreement by turn" (2026-10-11).
- [decisions/product.md](../decisions/product.md), "The candidates: which ones the board shows, and the engine's
  order" (2026-10-10): a candidate's visits are KataGo's `edgeVisits`.
