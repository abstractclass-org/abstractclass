// The last step of a way in that keeps a game in this browser (design 22): the import page's game, a shared review's,
// a partner's. The site's own import keeps the game first. Then the review opens it by its id, as a link in the
// player's games does: no later address holds the record.

/** Opens the review of a game now kept in this browser, `id`: the review's address (`/review#game=`) in place of this
 *  page's, then loaded. A reload, not a navigation: on the review page itself, a change of the `#` alone would load
 *  nothing. Back then leads to the page before this one. */
export function openReview(id: string): void {
  history.replaceState(null, "", `/review#game=${id}`);
  location.reload();
}
