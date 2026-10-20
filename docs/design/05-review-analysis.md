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
     The page reads the game, the tab's lock on it (design 11) and the engine's manifest at the same time. The rules
     worker needs only the manifest: it starts when the manifest is read and the lock is held, so a game open in
     another tab starts no engine. When the game is read, the page chooses the pool that takes the worker: the
     review's, or a snapshot's (design 20). A game that this browser lacks ends the worker and frees the lock, and so
     does a page that closes meanwhile. Once the session has ended, it starts no pool.
   - **A sweep:** every position at 32 visits (KaTrain's `fast_visits`, 25), for the game's shape: the Advantage chart
     and the win bar. Its labels are mostly wrong, so it shows none. "Every position" is each position before a move,
     and the last one when the game is not over (an unfinished game, `*`): there the end has a search, not a result,
     so that the last move gets its label (`passCount` in `packages/analysis/src/analysis.svelte.ts`).
   - **A label pass:** every position at 512 visits, the Lite review. Standard runs the pass at 1,024 visits, and
     Custom at another depth (design 09). Under protocol 0.3, after the opening, 512 visits finds 64% of the bad turns
     of a 1,024-visit search, with 82% of its flags right, and 256 visits finds 54%, with 88% right (by edge: 67% and
     80%, 42% and 79%). A turn gets a label only when its first position and the position after it have at least 256
     visits, the first budget whose mistake flags are mostly right. A label search shows its result at 256 visits and
     then at its budget (it runs in slices of 256, which do not give way), so a label shows as early at every depth
     and can change when the search ends.
   - **Deeper where the player looks:** the position on screen to 1,024 visits, in slices, with the results shown as
     they come (KaTrain's `max_visits`). The engine settings change its visits and give it a time limit (design 09).
     The search's worker keeps the limit from the search's start: it ends the search at the end of the slice in which
     the limit passes. The protocol gives a search in slices no time limit (`maxTime` is for a whole search), and a
     timer of the page would stop it late in a hidden tab.
     Then the key moments, one doubling past the review's depth (twice its visits: 1,024 with Lite), both ends of each
     turn, since a loss needs both (design 09). Every depth together, and which result a position uses, with examples:
     design 16.
   - **One progress bar for all of it** (design 06): the sweep, the label pass, the key moments and the Great's
     confirmations.
   - **Another network** (design 09): the run of the passes ends with the old network, and the old pool's results
     that still arrive are dropped. No search starts until the next pool has loaded its network: the passes then run
     again from the sweep. A search on the old pool would keep the old network's result under the new one, and the
     new sweep would skip that position. A network chosen before the review's analysis shows waits for that analysis,
     and then applies to it at once: on a snapshot's Review again (design 20), or while the rules load. Until then,
     the session names the network of the results that the analysis holds, so the game's mark names it too. The GPU
     joins only the pool of the network chosen.
   - A pool of workers runs the most urgent work first: the position on screen, then the key moments, then the sweep.
     A search in slices gives way: when the position on screen finds no free worker, the pool stops a key moment's
     search, which runs again later. When the player leaves a focus, its search does not start.
   - **The results show in batches:** the page applies the searches' results together, at most every 100 ms
     (`BATCH_MS`): their results so far and their final results, the deepest result of each position. A search's end
     shows in the same batch as its result: the progress bar, the "time limit" note, and the end of the marks of a
     search that runs (the gleam on a line, the moving bar of the position on screen). A result from the browser's
     store shows at once. A search writes its final result to the browser's store first, and the result shows in the
     first batch after the write. So the game's mark of a review done (design 20) comes after every result that it
     covers is stored. The engine does not wait for the write: it takes its next search when its search ends. The next
     step waits for the batch: the key moments wait for the label pass's last result, and Review done for the last of
     all. When no search waits in the pool's queue, an engine can be free for that step, though the position on
     screen or another search still runs. Then the batch comes once the results are stored, without its timer. While
     a search waits, every engine is busy, and the batch keeps its timer. The batch with the label pass's last result
     comes without its timer all the same: the key moments' searches go before the Greats' confirmations that wait,
     so they are in the queue when the next engine is free. A hidden tab runs the batch's timer about once a second,
     and later still when the page's timers have used up their share of the processor (Chromium gives a hidden page's
     timers 1% of it). No search waits for a timer of the page.
   - **A search's budget is met only by a result in the store:** a result that the page read from the browser's store,
     or a search's final result, which the page writes before it shows it. Then no search of the position to that budget
     starts, and each step of the review's progress counts the position: the sweep, the label pass, the key moments and
     the Greats' confirmations. A position whose result the page no longer holds, such as a branch that the player
     deleted and played again, reads it from the store. Another search's results so far do not meet a budget, though the
     page shows them and the labels follow them (design 16). The position on screen can pass the label budget, or the
     key moments' depth, and then stop before its end: the player moves on, its time limit passes, or the engine goes
     off. The store never gets such a result. So the review's own search of that position runs, at the same time as the
     search of the position on screen while that one runs. A key moment's search can end with no result, when the engine
     goes off or fails. Its position then stays in the key moments' step, also when its results so far took the position
     out of the key moments. The engine on searches it again. So "Review done" and the game's mark (design 20) come only
     when the store holds every result that the steps count, and the next visit opens done.
   - **A search in slices yields by a message:** between two slices, the worker sends itself a message, so that a stop
     can arrive first. A timer would wait longer: from the sixth yield on, 4 ms at least, and 15.6 ms in a hidden tab
     of Edge.
   - **In a hidden tab,** the browser gives the tab's renderer process, and with it the search workers, the lowest
     priority (on Windows, the Idle class and power throttling). Where every process had the same priority, the
     review ran as fast as in front. Where other programs keep the processor busy, the lowest priority can give the
     review less processor time. The review's progress says so (design 06).
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

- `packages/engine/src/pool.ts` (the pool and its priorities), `packages/engine/src/channel.ts` (a search in slices,
  and its time limit),
  `packages/analysis/src/session.svelte.ts` (the rules worker started before its pool: `startRules`, `takeRules`),
  `packages/analysis/src/analysis.svelte.ts` (the schedule, and the searches that confirm Great by edge and by turn),
  `packages/analysis/src/cache.ts` (the browser's store, and the removal of older shapes, which
  `src/routes/+layout.svelte` starts),
  `packages/analysis/src/labels.ts` and `packages/analysis/src/model.ts` (losses and labels, by edge and by turn),
  `src/lib/review/display.ts` (the "Review by" setting), `src/lib/review/ReviewView.svelte`,
  `src/lib/board/Board.svelte` (a turn's badges) and `src/routes/review/+page.svelte` (the page).
- The measurement: `scripts/measure/budget-collect.mjs` and `scripts/measure/budget-summary.mjs`. The review's start:
  `scripts/measure/review-start.mjs`. A review in a hidden tab: `scripts/measure/review-hidden.mjs` and
  `scripts/measure/worker-yield.mjs`.

## Log entries

- [decisions/engine.md](../decisions/engine.md), "The review on the engine" and "Label agreement against search
  budget" (2026-10-09), "The position on screen first: searches that give way" (2026-10-10).
- [decisions/product.md](../decisions/product.md), "The engine's settings" (2026-10-11).
- [decisions/product.md](../decisions/product.md), "Labels by turn", and [decisions/engine.md](../decisions/engine.md),
  "Label agreement by turn" (2026-10-11).
- [decisions/product.md](../decisions/product.md), "The candidates: which ones the board shows, and the engine's
  order" (2026-10-10): a candidate's visits are KataGo's `edgeVisits`.
- [decisions/product.md](../decisions/product.md), "The site removes the analyses of older shapes" (2026-10-16).
- [decisions/product.md](../decisions/product.md), "A search's final results in the batch" (2026-10-18).
- [decisions/product.md](../decisions/product.md), "The engine's next search does not wait for a result's write"
  (2026-10-19).
- [decisions/product.md](../decisions/product.md), "The rules worker starts with the manifest" (2026-10-19).
- [decisions/product.md](../decisions/product.md), "A review in a hidden tab" (2026-10-19).
- [decisions/product.md](../decisions/product.md), "The passes end with the old network" (2026-10-20).
- [decisions/product.md](../decisions/product.md), "A network chosen while the review starts its pool" (2026-10-20).
- [decisions/product.md](../decisions/product.md), "A hidden tab's review: the key moments and the time limit without
  timers of the page" (2026-10-20).
- [decisions/product.md](../decisions/product.md), "A search's budget is met only by a result in the store"
  (2026-10-20).
