// The marks that a review page's head puts on the root element before the first paint, on the model of the theme's
// script in each site's src/app.html. `/review` prerenders as the Review tab (Hedge School's design 23), and the page's
// code runs after the first paint. Until it runs, CSS reads the marks (the variants `review-game` and `review-last` in
// review.css):
// - `data-review-game`: the address names a game: a kept game's id (`#game=`), a shared review (`#packed=`) or a
//   partner's kept review (`#from=`) after the `#`. A site with older addresses (`olderAddresses`, Hedge School's) also
//   takes a tool's game from before the import page (`#tool=`, @abstractclass/import's importHash.ts, reviewArrives)
//   and an older address's query (`?game=`). The Review tab hides, and the line "Reading the game with the engine's
//   rules…" shows in its place (Hedge School's design 06, item 10). A record, which only the import page takes, gets
//   the Review tab.
// - `data-review-last`: this browser keeps a last review (@abstractclass/analysis/games.ts, `lastReviewKey`). The
//   Review tab keeps the room of "Continue your last review", which comes once the tab has read the browser's games.

/** Marks the root element for the address and the browser's storage (`lastKey`: the last review's key), and takes off
 *  a mark that no longer holds. The head holds its text (reviewPageMarks' `script`), so it uses nothing outside itself,
 *  in the older JavaScript of the theme's script. */
function markPage(lastKey: string, olderAddresses: boolean) {
  var root = document.documentElement, hash = location.hash.slice(1), game = false;
  // Parameters, not an older tool's bare record: a record's text starts with a tag, a turn or a move, never with a
  // name and "=" (importHash.ts, hashParams).
  if (/^[A-Za-z_]+=/.test(hash)) {
    var params = new URLSearchParams(hash);
    game = !!params.get("game") || params.has("packed") || params.has("from");
  }
  // The older addresses: a tool's game from before the import page, and an older address's query.
  if (olderAddresses && (/^tool=/.test(hash) || !!new URLSearchParams(location.search).get("game"))) game = true;
  var last = false;
  try { last = localStorage.getItem(lastKey) !== null; } catch (e) {}
  if (game) root.dataset.reviewGame = ""; else delete root.dataset.reviewGame;
  if (last) root.dataset.reviewLast = ""; else delete root.dataset.reviewLast;
}

/** A site's marks: `script`, the script in its review page's head, and `mark`, which marks the page again as its code
 *  starts, for an address that a navigation in the page opened (a script that the page's code puts in the head does
 *  not run). `lastKey`: the site's key of the last review. `olderAddresses`: the site takes the older ways in above. */
export function reviewPageMarks(lastKey: string, { olderAddresses = false } = {}) {
  return {
    script: `(${markPage})(${JSON.stringify(lastKey)}, ${olderAddresses});`,
    mark: () => markPage(lastKey, olderAddresses),
  };
}
