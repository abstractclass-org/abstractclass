# The review's analysis: schedule, labels, cache

**Status:** in force. **Decided:** 2026-10-09. The budgets come from the measurement of label agreement
([decisions/engine.md](../decisions/engine.md), "Label agreement against search budget").

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
   - **A label pass:** every position at 256 visits. An edge gets a label only when both its positions have at least
     256 visits: the first budget whose mistake flags are mostly right (67% of them, finding 58% of the mistakes of a
     1,024-visit search, after the opening).
   - **Deeper where the player looks:** the position on screen to 1,024 visits, in slices, with the results shown as
     they come (KaTrain's `max_visits`). Then the key moments: both positions of each, since a loss needs both.
   - A pool of workers runs the most urgent work first: the position on screen, then the key moments, then the sweep.
     A search in slices gives way: when the position on screen finds no free worker, the pool stops a key moment's
     search, which runs again later. A focus that the player has left does not start its search.
2. **An edge's loss is KaTrain's and Lichess's:** the mover's value before the edge less the mover's value after it,
   each from its position's search. In win chance, and in points.
3. **Points come from the lead** (`scoreLead`), as KaTrain's points lost do. Whether the expected margin
   (`scoreSelfplay`) serves better is measured, not assumed (the backlog).
4. **The label is the worse of two bands** (`src/lib/review/labels.ts`), as OGS colours a move: chess.com's bands of
   expected points on the win chance, and KaTrain's bands of points times the fork's score scale (12) on the points.
   Best and Great as before ([decisions/product.md](../decisions/product.md)).
5. **Results stay in the browser** (IndexedDB), keyed by the stored shape's version, the engine build, the network's
   SHA-256, the moves and the visits. A stored result equals a fresh one, because the engine is reproducible.

## Why

- **The schedule:** KaTrain is the most used analysis tool in Go, and its schedule fits a slow engine. The sweep gives
  the whole game's shape in seconds. The search goes deepest where the player is reading.
- **Losses across positions:** the published method. The engine's first choice is labelled Best whatever its loss, so
  the noise of two searches cannot call the engine's own choice a mistake.
- **The worse of two bands:** the win chance saturates in decided games, the points do not.
- **The cache:** a review opened again costs nothing, and the key makes a stale result impossible.

## Alternatives

- **One fixed budget for every position** (Lichess's server analysis): simple, but the player waits for all of it, or
  reads a shallow result where it matters most.
- **The loss within one search** (the best candidate against the played one): less noisy when the played edge was
  searched, but often it was not, and it departs from the published method.
- **Win chance only:** saturates. **Points only:** a 50-point loss means little in a game decided by 2,000.

## Consequences

- Labels change while the review runs: an edge has no label until both its positions are analysed, and a label can
  change when a deeper search replaces a shallow one.
- The thresholds are placeholders until they are fitted to Enclosure. The budgets are measured against a 1,024-visit
  reference, which is not the truth either: a deeper reference may move them.
- An edge whose two positions were searched to different depths mixes two budgets in its loss.

## Where it is

- `src/lib/analysis/pool.ts` (the pool and its priorities), `src/lib/analysis/game.svelte.ts` (the schedule),
  `src/lib/analysis/cache.ts` (the browser's store), `src/lib/review/labels.ts` and `src/lib/review/model.ts` (losses
  and labels), `src/lib/review/ReviewView.svelte` and `src/routes/review/+page.svelte` (the page).
- The measurement: `scripts/measure/budget-collect.mjs` and `scripts/measure/budget-summary.mjs`.

## Log entries

- [decisions/engine.md](../decisions/engine.md), "The review on the engine" and "Label agreement against search
  budget" (2026-10-09), "The position on screen first: searches that give way" (2026-10-10).
- [decisions/product.md](../decisions/product.md), "The candidates: which ones the board shows, and the engine's
  order" (2026-10-10): a candidate's visits are KataGo's `edgeVisits`.
