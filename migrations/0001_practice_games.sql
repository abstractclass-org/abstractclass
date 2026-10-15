/* Practice games, stored when they end (docs/design/25-practice-games-stored.md). One row a game, by its own random id,
   so that a game sent twice is kept once. `game` holds the whole game as the browser sent it (src/lib/practice/stored.ts,
   StoredPractice), and the columns before it repeat what the calibration reads most: the setting, the side and the
   outcome. `browser` is the browser's random number, kept only with the visitor's consent (NULL without), and it is the
   key by which the privacy page deletes a browser's games. Nothing here names a player, and no IP address is kept.
   The comments are block comments only: D1's Console joins a pasted file into one line, where a line comment would
   hide the rest of it. */
CREATE TABLE IF NOT EXISTS practice_games (
  id TEXT PRIMARY KEY,
  browser TEXT,
  ended TEXT NOT NULL,     /* the day the game ended, UTC, YYYY-MM-DD */
  received TEXT NOT NULL,  /* the day the site received it, UTC, YYYY-MM-DD */
  site TEXT NOT NULL,      /* the site's version that sent it */
  network TEXT NOT NULL,
  visits INTEGER NOT NULL,
  variety TEXT NOT NULL,
  form TEXT,               /* where the bot ran: gpu, cpu or single; NULL when not known */
  side TEXT NOT NULL,      /* the player's: blue or red */
  outcome TEXT NOT NULL,   /* the player's: won, lost, draw, resigned, aborted, or set_aside (left for a new start) */
  edges INTEGER NOT NULL,  /* the game's edges, the record's brought ones included */
  game TEXT NOT NULL       /* the game as sent, JSON */
);
CREATE INDEX IF NOT EXISTS practice_games_browser ON practice_games (browser);
CREATE INDEX IF NOT EXISTS practice_games_setting ON practice_games (network, visits, variety);
