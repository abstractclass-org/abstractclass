// The marks that the review page's head puts on the root element before the first paint, on the model of the theme's
// script in src/app.html. `/review` prerenders as the Review tab (design 23), and the page's code runs after the first
// paint. Until it runs, CSS reads the marks (the variants `review-game` and `review-last` in src/app.css):
// - `data-review-game`: the address names a game: a way in that the review takes (reviewArrives in
//   @abstractclass/import's importHash.ts), or a kept game's id, after the `#` or in an older address's query (+page.svelte,
//   gameInAddress). The Review tab hides, and the line "Reading the game with the engine's rules…" shows in its place
//   (design 06, item 10). A record, which only the import page takes, gets the Review tab.
// - `data-review-last`: this browser keeps a last review (src/lib/game/store.ts, lastReview). The Review tab keeps the
//   room of "Continue your last review", which comes once the tab has read the browser's games.
import { LAST_REVIEW } from "#lib/game/store.ts";

/** Marks the root element for the address and the browser's storage (`lastKey`: the last review's key), and takes off
 *  a mark that no longer holds. The head holds its text (REVIEW_PAGE_SCRIPT), so it uses nothing outside itself, in
 *  the older JavaScript of the theme's script. */
function markPage(lastKey: string) {
  var root = document.documentElement, hash = location.hash.slice(1);
  var game = !!new URLSearchParams(location.search).get("game");
  // Parameters, not an older tool's bare record: a record's text starts with a tag, a turn or an edge, never with a
  // name and "=" (importHash.ts, hashParams).
  if (/^[A-Za-z_]+=/.test(hash)) {
    var params = new URLSearchParams(hash);
    if (/^tool=/.test(hash) || params.get("game") || params.has("packed") || params.has("from")) game = true;
  }
  var last = false;
  try { last = localStorage.getItem(lastKey) !== null; } catch (e) {}
  if (game) root.dataset.reviewGame = ""; else delete root.dataset.reviewGame;
  if (last) root.dataset.reviewLast = ""; else delete root.dataset.reviewLast;
}

/** The script in the review page's head. */
export const REVIEW_PAGE_SCRIPT = `(${markPage})(${JSON.stringify(LAST_REVIEW)});`;

/** Marks the page again as its code starts, for an address that a navigation in the page opened: a script that the
 *  page's code puts in the head does not run. */
export const markReviewPage = () => markPage(LAST_REVIEW);
