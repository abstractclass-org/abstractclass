# A review by an earlier engine opens as it was

**Status:** in force. **Decided:** 2026-10-14. **Changed:** 2026-10-21: the area map in a snapshot, and its maps kept.

## Context

The browser keeps each result of a review with the engine's search and the network file that found it (design 11,
the engine). When a release brings a new engine, or a new file of the same network, a game reviewed before is reviewed
again when the player opens it. That costs as long as the first review, on a phone too. A player who wants a quick
look at a past review pays it each time, and the earlier results are still in the browser.

## Decision

1. **A snapshot:** a game whose last review used an earlier engine, or an earlier file of the same network, opens as
   that review, when the browser has its results for every position of the game's line. Nothing is searched.
2. **What a review snapshot shows:** the stored results, each position at its deepest that the review reads: at the
   review's depth or a deeper budget (`BUDGETS` in `packages/analysis/src/cache.ts`), else at the sweep's depth or a
   budget. The labels, the notes in the move list, the variations kept, the engine's candidates and lines, the charts
   and the report all come from them. The engine gives the positions with its rules alone: it loads no network. The area
   map shows the ownership of the stored results. Where a result has none, it shows the map added to the position, with
   the same search and network file (design 30, item 6). Where the store has neither, the map's note says "No map saved:
   review snapshots do no searches". The threat (design 31) shows where the store has its result, with the same search
   and network file, and else the engine header says "No threat saved: review snapshots do no searches".
3. **What a review snapshot does not do:**
   - no search of the position on screen, and no change of its depth;
   - no new move: not on the board, not from a candidate, not from a line;
   - no "Evaluate quality", and no change of the variations (promote, delete);
   - no export: the review file names the engine of its results, and an export needs a review by the site's engine
     (design 13).

   The notes drawn on the board stay: they are for the visit. The engine settings stay too, and apply from the next
   review.
4. **A bar says what the review snapshot is:** "Reviewed on October 12, 2026 with an earlier version of the engine" (or
   of the network), with **Review again**, and under it "A snapshot: no searches and no new moves." The engine's switch
   shows off and does not move. A move that the review snapshot cannot add, and a click on the switch, light the bar's
   border. Review again reviews the game with the site's engine, as a new review does, and the board stays where it is.
   A network chosen as the new review starts applies to the new review, and the review snapshot's analysis searches
   nothing (design 05, "Another network"). When the new review ends, the game's mark names the site's engine. A later
   start then removes the earlier results that no other game needs (item 8).
5. **Without the earlier results** (another browser, data cleared, or results of an older shape), the game is reviewed
   again, as before, and the dialog and the line under the progress say why (design 11).
6. **Imports:** a review file keeps its mark when the site ships its network file (the same SHA-256), whatever its
   engine. A file from an earlier engine therefore opens as a review snapshot (design 13), and so does a review that a
   partner site kept and sends back (design 18). A mark of the site's engine stays over an earlier engine's. The mark
   keeps the search that the file's review names (item 7).
7. **The review snapshot's engine:** a stored result names the engine by its search (request 17: the first build that
   searched as this one does). The mark names the module by its SHA-256, and the module's search by the name that
   keys its results (the manifest's `search`). A new engine is a new search: a release that keeps the search keeps
   every review as it is, with no review snapshot. The manifest lists the earlier modules of the site's search
   (`sameSearchAs` in `engine.lock.json`), so a mark, a review file or a share link of one of them is the site's
   engine's.
   - **The page reads the results by their keys:** the mark's search and network, each position of the game's line,
     at the review's depth and at each deeper budget. Its time grows little with the store (Cost).
   - **A mark that names no search:** an older mark, which the site kept before marks held their search, or the mark
     of an older review file. The page reads every key of the store, and takes the search whose results of the mark's
     network cover the game's line. A mark of the site's search takes the name when a review of that search ends on
     the page, so these marks become fewer.
   - **The site's own search:** the review snapshot of an earlier engine's review never takes it. The site's engine
     reads those results itself, so the game opens as a review.
8. **An earlier engine's results go when no game needs them.** A result belongs to a position, not to a game. The site
   keeps every result of its own search with a network file that it ships. An earlier engine's result, or an earlier
   network file's, stays while the review snapshot of a stored game reads it. A review snapshot reads the results of one
   search: the mark's search, or the search that holds the game's line at its depth for a mark that names none (item 7).
   The removal takes the same search for each game. It reads the game's positions and the positions one move from them,
   as the game's review file holds them (design 13). For each game's review depth, it keeps the result of each position
   that the review snapshot shows (item 2). The other results of the position go: a shallower one, and a deeper one at a
   depth that the review snapshot does not read. Examples are an older review's deeper search of a custom depth, at
   twice its visits, and a Depth that the player typed. A threat that the review snapshot reads, after a pass (design
   31), keeps the position's result at the threat's visits too: the threat's size compares the two. A map added to one
   of these positions (design 30) stays while a review snapshot reads the position, whatever the depth of the results
   there. A map further from the game's positions goes, such as the map of a line's later edge. The other results of the
   store's shape go too:
   - **After Review again,** the game's mark names the site's engine when the new review ends. Its review snapshot then
     reads nothing. A position that another game's review snapshot reads keeps its result.
   - **After a delete,** the game needs nothing: the player confirms a delete and cannot undo it (design 11).
   - **A review file of an earlier engine** keeps its results while its mark is the game's. When the game keeps a
     mark of the site's engine (item 6), nothing reads them, and they go.
   - **After a release,** the previous engine's results go where no review snapshot reads them. Examples are a game
     never reviewed to its end, and a game whose review snapshot lacks a position (item 5). The Analysis board reads its
     own engine's results only.
   - **When:** at the site's start, when the removal is due. A mark in the browser's local storage keeps the engine
     files that the last removal ran for: the CPU module and the networks, by SHA-256. A release that changes one
     makes the removal due. A change of what the games need also makes it due. These changes are a mark that replaces
     a mark of another module or network file, the delete of a game, and the load of a review file. A start with
     nothing changed reads the mark alone. An analysis file keeps the results of the site's search only: the board
     reads no other.

## Why

- **One engine for all of a review snapshot's labels.** A label compares two positions' values. A new search would come
  from the site's engine, and a label between results of two engines would measure their difference in part. A review
  snapshot searches nothing, so no label mixes engines.
- **Published practice:** Lichess keeps a game's computer analysis as it was made, with the Stockfish of its day, and
  does not make it again when Stockfish changes. Its live engine is apart from it. KaTrain opens an analysis saved with
  a game as it was, and analyses again on request.
- **A quick look costs nothing,** and the player chooses when a review is made again.
- **The browser keeps only what a page reads:** a result that no game's review snapshot reads takes space and gives
  nothing, and each release would add one more set. The removal follows the reader: the rule that opens a review
  snapshot chooses the results that it keeps.

## Alternatives

- **Always review again** (before): the cost of a full review for each look.
- **The snapshot, with the site's engine for what the player explores:** a variation's first position searched again, so
  that its labels come from one engine. Each such position then has two values, the game's line's and the variation's.
- **Exploration with the earlier engine:** each release stays on the site, and the site keeps each earlier protocol.
- **Exploration without labels:** the variations lose the labels and "Evaluate quality", which teach.
- **Review again asked at the first exploration:** it stops the player at the start of the work.
- **A review snapshot's export:** to keep it, or to take it to another browser. A review snapshot cannot change, so an
  export adds nothing new. Review again, then export.
- **A read of every key of the store for each review snapshot** (before item 7 named the search in the mark): its time
  grows with the store, and the store grows with each result. It stays for a mark that names no search.
- **The search of an earlier file, from the file's results at its load:** each result names its search, but a file
  can hold the results of two searches for its line, and the mark must not take the wrong one. The read of every key
  serves such a file.
- **Keep every earlier result** (before item 8): each release adds one more set, which nothing reads.
- **A removal at once after each change** (the end of Review again, a delete): the start is the one place that
  removes, and one removal serves every change since the last one.
- **A removal at each start:** it reads every key of the store on each load.
- **An Undo of a delete:** design 11 gives why a question replaced it. It needed a lock across the tabs, which stopped
  the removal while an Undo showed.

## Consequences

- Export needs a review by the site's engine, as before (design 13). On the home page, a game's Export says to open
  it and review it again.
- The dialog that says why a game is reviewed again shows only when there is no review snapshot. After Review again, the
  line under the progress says why.
- Analytics: a review snapshot counts as `review_open`, with `done_before` set. Review again sends no second
  `review_open`, and its `review_done` counts the new review's time. The features `snapshot opened` and `review again`
  (design 17).
- **Cost:** while the engine's rules load, the page reads the results of the game's line by their keys, in one
  transaction. The review then finds them in memory. In headless Chromium, for a line of 59 positions, that read took
  about 8 ms with 5,000 stored results and with 20,000. A read of every key took 11 ms and 40 ms. A mark that names
  no search reads every key, as before: 5,097 keys took about 55 ms in a desktop browser. On that browser, a review
  snapshot was on screen 2.2 s after the page's navigation started, or sooner.
- **The removal's cost:** a start with nothing changed reads one value of local storage. A start when the removal is
  due loads its code once the page is idle. Then one transaction reads the games, their variations and the store's
  keys, and removes the results. The removal reads each key once. Until the transaction ends, the review's reads of
  the store wait. Not measured in a browser.
- **Two tabs:** one transaction reads and removes, so no write comes between. The load of a review file keeps the
  game's mark before its results, so a removal in another tab between the two takes none of them. A change of what
  the games need while a removal runs keeps the removal due. A tab of an earlier release that starts after a later
  release's can take the later engine's results of a review not yet done. That review then searches them again.
- **Results that stay longer:** a variation deleted after Review again, before the new review ends, keeps its earlier
  results until the next removal.

## Where it is

- `src/routes/review/+page.svelte` (the choice of a snapshot, its rules-only engine, Review again),
  `packages/review/src/ReviewView.svelte` (the bar, the controls off), `packages/analysis/src/cache.ts`
  (`snapshotSearch`, the read by keys: `warmCache`), `packages/analysis/src/analysis.svelte.ts` (`fromStore`),
  `src/lib/game/reviewFile.ts` (`readReviewFile`, the file's search, and `importReview`, the mark kept),
  `src/lib/game/store.ts` (`reviewAgainWhy`, the mark's `search`: `reviewMark`, `markReviewed`).
- The removal: `src/lib/game/earlierResults.ts` (`unneededResults`, `readsAt`, `removeEarlierResults`, which
  `src/routes/+layout.svelte` starts), `packages/analysis/src/cache.ts` (the mark: `earlierRemovalDue`,
  `makeEarlierRemovalDue`), `src/lib/game/store.ts` (`markReviewed`, `deleteGame`), `src/lib/game/analysisFile.ts`
  (`openAnalysisFile`), `packages/storage/src/db.ts` (`dbReadThenDelete`), `vite.config.ts` (`__ENGINE_FILES__`).

## Log entries

- [decisions/product.md](../decisions/product.md): "A review by an earlier engine opens as it was" (2026-10-14), "An
  earlier engine's results go when no game needs them" (2026-10-16), "The review snapshot reads its results by their
  keys" (2026-10-18), "A network chosen while the review starts its pool" (2026-10-20), "The map's bookkeeping in edge
  cases" and "The review of the map's bookkeeping" (2026-10-21).
