# A review by an earlier engine opens as it was

**Status:** in force. **Decided:** 2026-10-14.

## Context

The browser keeps each result of a review with the engine build and the network file that found it (design 11, the
engine). When a release brings a new engine, or a new file of the same network, a game reviewed before is reviewed
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
   and the board stays where it is. The earlier results stay in the browser.
5. **Without the earlier results** (another browser, data cleared, or results of an older shape), the game is reviewed
   again, as before, and the dialog and the line under the progress say why (design 11).
6. **Imports:** a review file keeps its mark when the site ships its network file (the same SHA-256), whatever its
   engine. A file from an earlier engine therefore opens as a snapshot (design 13), and so does a review that a partner
   site kept and sends back (design 18). A mark of the site's engine stays over an earlier engine's.
7. **The snapshot's engine:** a stored result names the engine by the build that the engine reports, and the mark
   names the module by its SHA-256. The page takes the build whose results of the mark's network cover the game's
   line, so it needs no record of earlier releases.

## Why

- **One engine for all of a snapshot's labels.** A label compares two positions' values. A new search would come from
  the site's engine, and a label between results of two engines would measure their difference in part. A snapshot
  searches nothing, so no label mixes engines.
- **Published practice:** Lichess keeps a game's computer analysis as it was made, with the Stockfish of its day, and
  does not make it again when Stockfish changes. Its live engine is apart from it. KaTrain opens an analysis saved with
  a game as it was, and analyses again on request.
- **A quick look costs nothing,** and the player chooses when a review is made again.

## Alternatives

- **Always review again** (before): the cost of a full review for each look.
- **The snapshot, with the site's engine for what the player explores:** a branch's first position searched again, so
  that its labels come from one engine. Each such position then has two values, the game's line's and the branch's.
- **Exploration with the earlier engine:** each release stays on the site, and the site keeps each earlier protocol.
- **Exploration without labels:** the branches lose the labels and "Evaluate quality", which teach.
- **Review again asked at the first exploration:** it stops the player at the start of the work.
- **A snapshot's export:** to keep it, or to take it to another browser. A snapshot cannot change, so an export adds
  nothing new. Review again, then export.

## Consequences

- Export needs a review by the site's engine, as before (design 13). On the home page, a game's Export says to open
  it and review it again.
- The dialog that says why a game is reviewed again shows only when there is no snapshot. After Review again, the line
  under the progress says why.
- Analytics: a snapshot counts as `review_open`, with `done_before` set. Review again sends no second `review_open`,
  and its `review_done` counts the new review's time. The features `snapshot opened` and `review again` (design 17).
- **Cost:** the page reads the store's keys (5,097 keys in about 55 ms in a desktop browser) and the engine's rules.
  On that browser, a snapshot was on screen 2.2 s after the page's navigation started, or sooner.

## Where it is

- `src/routes/review/+page.svelte` (the choice of a snapshot, its rules-only engine, Review again),
  `src/lib/review/ReviewView.svelte` (the bar, the controls off), `src/lib/analysis/cache.ts` (`snapshotBuild`),
  `src/lib/analysis/game.svelte.ts` (`fromStore`), `src/lib/game/reviewFile.ts` (`importReview`, the mark kept),
  `src/lib/game/store.ts` (`reviewAgainWhy`).

## Log entries

- [decisions/product.md](../decisions/product.md): "A review by an earlier engine opens as it was" (2026-10-14).
