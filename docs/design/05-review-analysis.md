# The review's analysis: schedule and cache

**Status:** in force. **Decided:** 2026-10-09. The budgets come from the measurement of label agreement
([decisions/engine.md](../decisions/engine.md), "Label agreement against search budget"). The labels that read these
searches are in design 10.

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
     and the win bar. Its labels are mostly wrong, so it shows none. "Every position" is each position before a move,
     and the last one when the game is not over (an unfinished game, `*`): there the end has a search, not a result,
     so that the last move gets its label (`passCount` in `src/lib/analysis/game.svelte.ts`).
   - **A label pass:** every position at 512 visits, the Lite review. Standard runs the pass at 1,024 visits, and
     Custom at another depth (design 09). Under protocol 0.3, after the opening, 512 visits finds 64% of the bad turns
     of a 1,024-visit search, with 82% of its flags right, and 256 visits finds 54%, with 88% right (by edge: 67% and
     80%, 42% and 79%). A turn gets a label only when its first position and the position after it have at least 256
     visits, the first budget whose mistake flags are mostly right. A label search shows its result at 256 visits and
     then at its budget (it runs in slices of 256, which do not give way), so a label shows as early at every depth
     and can change when the search ends.
   - **Deeper where the player looks:** the position on screen to 1,024 visits, in slices, with the results shown as
     they come (KaTrain's `max_visits`). The engine settings change its visits and give it a time limit (design 09).
     Then the key moments, one doubling past the review's depth (twice its visits: 1,024 with Lite), both ends of each
     turn, since a loss needs both (design 09). Every depth together, and which result a position uses, with examples:
     design 16.
   - **One progress bar for all of it** (design 06): the sweep, the label pass, the key moments and the Great's
     confirmations.
   - A pool of workers runs the most urgent work first: the position on screen, then the key moments, then the sweep.
     A search in slices gives way: when the position on screen finds no free worker, the pool stops a key moment's
     search, which runs again later. When the player leaves a focus, its search does not start.
2. **The labels** read these searches: [10-labels.md](10-labels.md) gives every rule, by turn and by edge.
3. **Results stay in the browser** (IndexedDB), keyed by the stored shape's version, the engine's search (request 17:
   the first build that searched as this one does), the network's SHA-256, the moves and the visits. A stored result
   equals a fresh one, because the engine is reproducible, and a release that keeps the search keeps the results.
   A new shape makes the results of the older shapes useless: no reader reads them. The site removes them when it
   starts for the first time after the change, and a mark in the browser's local storage keeps the shape that it
   removed them for. The results of an earlier search or of an earlier network file stay while the snapshot of a
   stored game reads them, and go at a later start when no game needs them (design 20, item 8).

## Why

- **The schedule:** KaTrain is the most used analysis tool in Go, and its schedule fits a slow engine. The sweep gives
  the whole game's shape in seconds. The search goes deepest where the player is reading.
- **The cache:** a review opened again costs nothing, and the key makes a stale result impossible.

## Alternatives

- **One fixed budget for every position** (Lichess's server analysis): simple, but the player waits for all of it, or
  reads a shallow result where it matters most.

## Consequences

- Labels change while the review runs: a turn has no label until both its ends are analysed, and a label can change
  when a deeper search replaces a shallow one.
- The budgets are measured against a 1,024-visit reference, which is not the truth either: a deeper reference may move
  them.
- The removal of older shapes costs one read of local storage at a start with the same shape. The first start after
  a change reads the store's keys and removes the older ones, in one transaction. Until it ends, the review's reads of
  the store wait.

## Where it is

- `src/lib/analysis/pool.ts` (the pool and its priorities), `src/lib/analysis/game.svelte.ts` (the schedule, and the
  searches that confirm Great by edge and by turn), `src/lib/analysis/cache.ts` (the browser's store, and the
  removal of older shapes, which `src/routes/+layout.svelte` starts),
  `src/lib/review/labels.ts` and `src/lib/review/model.ts` (losses and labels, by edge and by turn),
  `src/lib/review/display.ts` (the "Review by" setting), `src/lib/review/ReviewView.svelte`,
  `src/lib/board/Board.svelte` (a turn's badges) and `src/routes/review/+page.svelte` (the page).
- The measurement: `scripts/measure/budget-collect.mjs` and `scripts/measure/budget-summary.mjs`.

## Log entries

- [decisions/engine.md](../decisions/engine.md), "The review on the engine" and "Label agreement against search
  budget" (2026-10-09), "The position on screen first: searches that give way" (2026-10-10).
- [decisions/product.md](../decisions/product.md), "The engine's settings" (2026-10-11).
- [decisions/product.md](../decisions/product.md), "Labels by turn", and [decisions/engine.md](../decisions/engine.md),
  "Label agreement by turn" (2026-10-11).
- [decisions/product.md](../decisions/product.md), "The candidates: which ones the board shows, and the engine's
  order" (2026-10-10): a candidate's visits are KataGo's `edgeVisits`.
- [decisions/product.md](../decisions/product.md), "The site removes the analyses of older shapes" (2026-10-16).
