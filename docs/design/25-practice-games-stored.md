# Practice games, stored for the bot's levels

**Status:** in force, built. It stores games once the databases are set up (docs/hosting.md, section 7).
**Decided:** 2026-10-15.

## Context

Practice (design 24) lets a player play HedgeFund at many settings: two networks, visits from 1 to 8,192, and three
varieties. Its levels must rest on games by setting, not on guesses, and the games also show what players find hard.
Until now, a game stays in the player's browser (design 19, item 7: "Games stay in the player's browser until the
player gives one"), so no one can count them.

Lichess and chess.com keep every game played on them:

- **Lichess** keeps every game, an anonymous player's and a game against the computer among them: its games run on its
  servers. It publishes its rated games every month under CC0 ([its database](https://database.lichess.org/)). It sets
  only a session cookie, on its legitimate interest, and asks no consent: an anonymous player's session ties their
  games together, but play needs it ([its privacy policy](https://lichess.org/privacy)).
- **Chess.com** keeps the games of its accounts, with their "chess statistics", and treats the use of the site as the
  acceptance of its terms ([its legal FAQ](https://www.chess.com/legal/faqs)).

## Decision

1. **Every practice game is stored when it ends,** by the rules, by Resign or by Abort, on Hedge School's own backend,
   as Lichess keeps every game played on it. This replaces design 19's item 7 for the games played here. The games
   reviewed here were played on other sites: they stay in the browser.
2. **What a stored game holds:** its moves, with their cuts; the bot (the network, the visits, the variety, the form:
   GPU, CPU or one thread, and the engine's build); the player's side; how it ended, and its result; each takeback
   (where it was, and the edges that it undid); each move's time (the player's thinking time, the bot's search time);
   the day it ended; and the site's version. A game from a set-up start holds its start position too, and a game
   from the Analysis board's Play holds the edges that came with its record, apart from the edges played against the
   bot: the calibration can then take such games, or leave them out. Never the name typed for the record, and never
   the visitor's IP address.
3. **A random number in each browser that links its games, with the visitor's consent.** It lets the calibration tell
   a player's strength from a setting's. Without consent, a game goes with no number, and nothing links it to another
   game. Lichess's session cookie needs no consent because play needs it. The number serves the data only, so it
   needs consent (the EU's ePrivacy rules). The page calls it a random ID, and says what it does ("groups your games
   against bots"), not a name of ours. "Bots", not "HedgeFund": the consent then holds for a bot added later.
4. **No switch to keep games out:** a game with no number and no name identifies no one, as Lichess's anonymous
   games. For the linked games, the consent is the way out: Decline stops the link, and the privacy page deletes the
   games that went with this browser's number.
5. **The consent banner asks for both purposes, and is open about them** (design 11's banner, replaced): a visitor who
   declines most often does not read the banner, so it says, in a few lines, what each purpose does for the site.
   Accept and Decline cover both, and stay alike, so that declining is as easy as accepting. "Choose each" leads to
   the privacy page, which has a switch for each purpose, as consent must be given for each purpose on its own. The
   banner promises only what holds whatever the site adds later (accounts, ads, a donation link): it says the site
   is free, and that it never sells data. The banner, with the collie (the site's schoolmaster, design 12):

   > **Help the school get better**
   > Hedge School is free. If you accept, two things help us improve it:
   > - A random ID in this browser groups your games against bots, so we can tell how hard each setting is for real
   >   players.
   > - Google Analytics' cookies show which pages and tools you come back to, so that we work on those.
   >
   > Your games against bots are kept either way, never with your name. We never sell your data.
   > [Accept] [Decline] Choose each · Privacy

   The banner ships with the games' storage: a consent covers the purposes that it named, so a banner for Google
   Analytics alone, now, would ask everyone again then. The new banner asks every visitor once, the earlier choices
   included (a new key).
6. **The use:** the bot's levels (design 24), what players find hard, and an open dataset, without names, as Lichess
   publishes its games (CC0). The privacy page says so before the first game is stored.
7. **Where:** a Cloudflare Pages Function and a D1 database, on the site's own Cloudflare project (design 19, item
   6). A preview deployment writes to a database of its own, so that test games do not mix with the players'.
8. **The sending:** the page sends the game when it ends. A send that fails waits in the browser and goes on the next
   visit.
9. **Not now:** the player's rating on meaf.us, as a range, to put the levels on a scale that players know. The levels
   rest first on the bot's own ladder (the engine repository's visit ladder) and on the players' results.

## Why

- **The levels need the games of every setting,** from the players who play it. A game that a player chooses to give
  is more often a win, so games given one at a time would misstate the bot's strength.
- **A setting's strength and a player's strength are mixed in one game's result.** The number separates them across a
  browser's games, as a rating system rates players and bot settings together.
- **Lichess's practice:** every game kept, anonymous games among them, and an open database.
- **No name, no IP address:** the calibration needs neither, and the dataset can then be published.

## Alternatives

- **A choice for each game, or one choice asked once** (design 19's wording): the player's consent for every game,
  but gaps in the data, and the games given more often the player's wins.
- **A number for every browser, with no consent:** better data, but a number for research alone, without consent, is
  not allowed in the EU.
- **No number:** no consent needed, but the calibration cannot tell a strong player from a weak setting.
- **One Accept with no choice for each purpose:** a smaller page, but consent must be given for each purpose on its
  own. The banner's Accept and Decline cover both, and the privacy page holds the choice for each.
- **A switch in Practice to keep the games out:** more control, but gaps in the data, for games that identify no one.
- **Games kept for the project only, never published:** simpler to promise, but no open dataset without everyone's
  consent again.

## Consequences

- **The site's first backend:** a Pages Function and a D1 database. Their setup is the owner's: the database, its
  binding to the production deployment, and a second database for the previews.
- **The privacy page** changes before the first game is stored: what is stored, why, the link and its consent, a
  switch for each purpose, the publication, and the deletion.
- **The stored data has no time limit:** an open dataset keeps its games.
- **The analysis of the games** (the levels) is a later piece of work, here or in the engine repository.

## How it is built

- **The stored game** (`src/lib/practice/stored.ts`, `StoredPractice`): the fields of item 2, with the game's own
  random id, so that a game sent twice is kept once. The record has no name: the player's side reads "You". The
  server checks every field (`storedProblem`), and takes 64 KB at most.
- **The server:** a Pages Function, `functions/api/practice-games.ts`, on `/api/practice-games` only
  (`static/_routes.json`, so that the static pages stay free of the Function's requests). POST keeps a game, DELETE
  deletes a browser's games. It reads no game back: the games are read in Cloudflare's dashboard. A deployment with
  no database (its binding, `GAMES`) answers 503.
- **The database:** D1, `hedgeschool-games` for production and `hedgeschool-games-preview` for the previews. The
  table `practice_games` (`migrations/0001_practice_games.sql`): the columns that the calibration reads most (the
  setting, the side, the outcome, the edges), and the game as sent. The table `deleted_browsers`
  (`migrations/0002_deleted_browsers.sql`): the numbers whose games were deleted, each alone.
- **The sending** (`src/lib/practice/send.ts`): when a game ends, by the rules, by Resign, by Abort, or set aside: a
  game in progress that the player leaves for a new start that the Analysis board's Play brings (the page asks first).
  A set-aside game has an outcome of its own, `set_aside`, so that the calibration can tell it from an Abort. A game with no move played against the bot sends
  nothing. A send that fails waits in the browser (50 games at most) and goes on the next visit to any page. A game that
  the server refuses leaves the queue. A waiting game goes with the number only if the visitor still accepts the link
  when it goes, and the number is still the browser's. Only a build with `VITE_STORE_PRACTICE_GAMES=on` sends: production and the
  previews, so that a build on a developer's machine sends nothing.
- **The kept game** (`KeptPractice`) gains its id, where the bot ran, each takeback (the edges played before it, and
  the edges it undid) and each move's time: the player's from the moment the move was theirs, the bot's for its
  search of that edge. A move from before a visit's resumption has no time (null).
- **The consent** (`src/lib/analytics.svelte.ts`): a choice for each purpose, `analytics` and `games`, under a new key
  (`hedge-school:consent:2`). The banner's Accept and Decline set both. The privacy page has a switch for each. A
  change to one switch also keeps each purpose not chosen yet as declined, as its switch shows it off: a visitor can
  accept one purpose and decline the other without granting it first. The
  random number (`hedge-school:browser-number:1`) is made on the first game sent with consent. After a Decline it
  is no longer sent, and stays in the browser only so that the privacy page can still delete its games. "Delete my
  practice games" deletes them, and the number with them. It asks first, in the same dialog as a game's delete
  (`src/lib/ui/ConfirmDialog.svelte`, design 11). The dialog's text on the privacy page says what goes and where,
  and that the games in the Review tab stay. The waiting games with the number leave the queue unsent.
  The site keeps the deleted number alone, and keeps no game that arrives with it later: a game on its way from another
  tab, or sent again after a failed send, does not come back after the delete. The check is in the insert's own
  statement, so that a delete cannot come between them. Each tab follows a choice made in another tab (the browser's
  `storage` event), and a game takes the number, and goes with it, only as the browser keeps the choice at that moment.
- **The banner** (`src/lib/ConsentBanner.svelte`): item 5's text, with the collie, for the purposes that the build
  has: a build without Google Analytics, as the previews, does not name its cookies. Its card
  (`src/lib/ui/CornerCard.svelte`) also holds, in its place after it, the ask to allow Google Analytics in a blocker
  (design 27).
- **Tests:** `src/lib/practice/stored.test.ts` checks the stored game, and the Function on the real schema in Node's
  own SQLite, behind the part of D1's binding that the Function uses.

## Log entries

- [decisions/product.md](../decisions/product.md): "Practice games stored" (2026-10-15), "A question before the
  practice games' delete, and the cancelled deletes counted" (2026-10-17).
