# A review by an earlier engine opens as it was

**Status:** in force. **Decided:** 2026-10-14.

## Context

The browser keeps each result of a review with the engine's search and the network file that found it (design 11,
the engine). When a release brings a new engine, or a new file of the same network, a game reviewed before is reviewed
again when the player opens it. That costs as long as the first review, on a phone too. A player who wants a quick
look at a past review pays it each time, and the earlier results are still in the browser.

## Decision

1. **A snapshot:** a game whose last review used an earlier engine, or an earlier file of the same network, opens as
   that review, when the browser has its results for every position of the game's line. Nothing is searched.
2. **What a snapshot shows:** the stored results, each position at its deepest. The labels, the notes in the move
   list, the branches kept, the engine's candidates and lines, the charts and the report all come from them. The engine
   gives the positions with its rules alone: it loads no network.
3. **What a snapshot does not do:**
   - no search of the position on screen, and no change of its depth;
   - no new move: not on the board, not from a candidate, not from a line;
   - no "Evaluate quality", and no change of the branches (promote, delete);
   - no export: the review file names the engine of its results, and an export needs a review by the site's engine
     (design 13).

   The notes drawn on the board stay: they are for the visit. The engine settings stay too, and apply from the next
   review.
4. **A bar says what the snapshot is:** "Reviewed on October 12, 2026 with an earlier version of the engine" (or of the
   network), with **Review again**, and under it "A snapshot: no searches and no new moves." The engine's switch shows
   off and does not move. A move that the snapshot cannot add, and a click on the switch, light the bar's border. Review again reviews the game with the site's engine, as a new review does,
   and the board stays where it is. When the new review ends, the game's mark names the site's engine. A later start
   then removes the earlier results that no other game needs (item 8).
5. **Without the earlier results** (another browser, data cleared, or results of an older shape), the game is reviewed
   again, as before, and the dialog and the line under the progress say why (design 11).
6. **Imports:** a review file keeps its mark when the site ships its network file (the same SHA-256), whatever its
   engine. A file from an earlier engine therefore opens as a snapshot (design 13), and so does a review that a partner
   site kept and sends back (design 18). A mark of the site's engine stays over an earlier engine's.
7. **The snapshot's engine:** a stored result names the engine by its search (request 17: the first build that
   searched as this one does), and the mark names the module by its SHA-256. A new engine is a new search: a release
   that keeps the search keeps every review as it is, with no snapshot. The manifest lists the earlier modules of the
   site's search (`sameSearchAs` in `engine.lock.json`), so a mark, a review file or a share link of one of them is
   the site's engine's. The page takes the search whose results of the mark's network cover the game's line, so it
   needs no record of the other searches.
8. **An earlier engine's results go when no game needs them.** A result belongs to a position, not to a game. The
   site keeps every result of its own search with a network file that it ships. An earlier engine's result, or an
   earlier network file's, stays while the snapshot of a stored game reads it. A snapshot reads the results of one
   search: the search that holds the game's line at its depth (item 7). It reads the game's positions and the
   positions one move from them, as the game's review file holds them (design 13). It shows each position at its
   deepest (item 2), so a shallower result of the same position goes. The other results of the store's shape go too:
   - **After Review again,** the game's mark names the site's engine when the new review ends. Its snapshot then reads
     nothing. A position that another game's snapshot reads keeps its result.
   - **After a delete,** the game needs nothing: the player confirms a delete and cannot undo it (design 11).
   - **A review file of an earlier engine** keeps its results while its mark is the game's. When the game keeps a
     mark of the site's engine (item 6), nothing reads them, and they go.
   - **After a release,** the previous engine's results go where no snapshot reads them. Examples are a game never
     reviewed to its end, and a game whose snapshot lacks a position (item 5). The Analysis board reads its own
     engine's results only.
   - **When:** at the site's start, when the removal is due. A mark in the browser's local storage keeps the engine
     files that the last removal ran for: the CPU module and the networks, by SHA-256. A release that changes one
     makes the removal due. A change of what the games need also makes it due. These changes are a mark that replaces
     a mark of another module or network file, the delete of a game, and the load of a review file. A start with
     nothing changed reads the mark alone. An analysis file keeps the results of the site's search only: the board
     reads no other.

## Why

- **One engine for all of a snapshot's labels.** A label compares two positions' values. A new search would come from
  the site's engine, and a label between results of two engines would measure their difference in part. A snapshot
  searches nothing, so no label mixes engines.
- **Published practice:** Lichess keeps a game's computer analysis as it was made, with the Stockfish of its day, and
  does not make it again when Stockfish changes. Its live engine is apart from it. KaTrain opens an analysis saved with
  a game as it was, and analyses again on request.
- **A quick look costs nothing,** and the player chooses when a review is made again.
- **The browser keeps only what a page reads:** a result that no game's snapshot reads takes space and gives
  nothing, and each release would add one more set. The removal follows the reader: the rule that opens a snapshot
  chooses the results that it keeps.

## Alternatives

- **Always review again** (before): the cost of a full review for each look.
- **The snapshot, with the site's engine for what the player explores:** a branch's first position searched again, so
  that its labels come from one engine. Each such position then has two values, the game's line's and the branch's.
- **Exploration with the earlier engine:** each release stays on the site, and the site keeps each earlier protocol.
- **Exploration without labels:** the branches lose the labels and "Evaluate quality", which teach.
- **Review again asked at the first exploration:** it stops the player at the start of the work.
- **A snapshot's export:** to keep it, or to take it to another browser. A snapshot cannot change, so an export adds
  nothing new. Review again, then export.
- **Keep every earlier result** (before item 8): each release adds one more set, which nothing reads.
- **A removal at once after each change** (the end of Review again, a delete): the start is the one place that
  removes, and one removal serves every change since the last one.
- **A removal at each start:** it reads every key of the store on each load.
- **An Undo of a delete:** design 11 gives why a question replaced it. It needed a lock across the tabs, which stopped
  the removal while an Undo showed.

## Consequences

- Export needs a review by the site's engine, as before (design 13). On the home page, a game's Export says to open
  it and review it again.
- The dialog that says why a game is reviewed again shows only when there is no snapshot. After Review again, the line
  under the progress says why.
- Analytics: a snapshot counts as `review_open`, with `done_before` set. Review again sends no second `review_open`,
  and its `review_done` counts the new review's time. The features `snapshot opened` and `review again` (design 17).
- **Cost:** the page reads the store's keys (5,097 keys in about 55 ms in a desktop browser) and the engine's rules.
  On that browser, a snapshot was on screen 2.2 s after the page's navigation started, or sooner.
- **The removal's cost:** a start with nothing changed reads one value of local storage. A start when the removal is
  due loads its code once the page is idle. Then one transaction reads the games, their branches and the store's
  keys, and removes the results. The removal reads each key once. Until the transaction ends, the review's reads of
  the store wait. Not measured in a browser.
- **Two tabs:** one transaction reads and removes, so no write comes between. The load of a review file keeps the
  game's mark before its results, so a removal in another tab between the two takes none of them. A change of what
  the games need while a removal runs keeps the removal due. A tab of an earlier release that starts after a later
  release's can take the later engine's results of a review not yet done. That review then searches them again.
- **Results that stay longer:** a branch deleted after Review again, before the new review ends, keeps its earlier
  results until the next removal.

## Where it is

- `src/routes/review/+page.svelte` (the choice of a snapshot, its rules-only engine, Review again),
  `src/lib/review/ReviewView.svelte` (the bar, the controls off), `src/lib/analysis/cache.ts` (`snapshotSearch`),
  `src/lib/analysis/game.svelte.ts` (`fromStore`), `src/lib/game/reviewFile.ts` (`importReview`, the mark kept),
  `src/lib/game/store.ts` (`reviewAgainWhy`).
- The removal: `src/lib/game/earlierResults.ts` (`unneededResults`, `removeEarlierResults`, which
  `src/routes/+layout.svelte` starts), `src/lib/analysis/cache.ts` (the mark: `earlierRemovalDue`,
  `makeEarlierRemovalDue`), `src/lib/game/store.ts` (`markReviewed`, `deleteGame`), `src/lib/game/analysisFile.ts`
  (`openAnalysisFile`), `src/lib/storage/db.ts` (`dbReadThenDelete`), `vite.config.ts` (`__ENGINE_FILES__`).

## Log entries

- [decisions/product.md](../decisions/product.md): "A review by an earlier engine opens as it was" (2026-10-14), "An
  earlier engine's results go when no game needs them" (2026-10-16).
