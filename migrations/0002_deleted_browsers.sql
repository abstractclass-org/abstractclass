/* The random numbers whose games were deleted (the privacy page's "Delete my practice games"), each alone: no game, no
   day, nothing else. A game that arrives later with one of them is not kept, so that a game sent before the delete,
   from another tab or after a failed send, does not come back after it (docs/design/25-practice-games-stored.md).
   Block comments only, as in 0001: D1's Console joins a pasted file into one line. */
CREATE TABLE IF NOT EXISTS deleted_browsers (
  browser TEXT PRIMARY KEY
);
