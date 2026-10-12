# Export and import of reviewed games

**Status:** in force, built. **Decided:** 2026-10-12.

## Context

A review lives in one browser: its game, the player's branches and the engine's results are in that browser's store
(IndexedDB). A player wants to take a reviewed game to another browser or device, or share it, without the engine
searching it again, and to share it as text that others can read.

## Decision

1. **Two exports** (Lichess offers both a study's PGN and its own analysis. KaTrain can keep its analysis in its SGF
   files):
   - **The review file** (`.json`): the game's record, the player's branches, and the engine's results for every
     position of the game and its branches (`src/lib/game/reviewFile.ts`). Importing it opens the review at once.
   - **The annotated record** (text, copied or as a `.txt` file): the game in the site's notation, with the engine's
     view after each edge (`[%eval W L S]`), each Inaccuracy, Mistake, Blunder and Great as a comment ("Mistake. D10-G9
     G9-H10 was best.", Lichess's words), "A hard position." where the review marks one (design 14), the record's
     clocks, a note of the network (its name and id) and the depth, and the player's own lines as branches
     (`src/lib/review/annotate.ts`). The note's depth is the least visits among the game's searches, read from the
     results: the review depth set in the browser may differ from the depth of the stored results' searches.
     Its labels follow the page's "Review by" (turns or edges). Lines are at most 80 characters, as PGN's export format
     asks, and never break inside a command.
2. **Where:**
   - **The review page:** an Export menu beside the display settings' ☰: the review file, the annotated record copied,
     or the annotated record as a file. A short note beside it says what it did, or why it failed.
   - **The home page:** the same menu beside each game, and "Import a review", which takes a file chosen or dropped
     anywhere on the page. The home page builds its annotated record from the stored results, with no search: the engine
     reads the rules only. These review things sit on the home page for now: when the site has more, the home page
     becomes a home, and they move to the review page.
3. **Only a finished review exports,** every kind of export. A review is finished when every step of its bar is done:
   the sweep, the label pass, the key moments searched deeper, and the Greats' confirmations. Until then the Export
   button is off, and its tooltip says why: "Export once the review is done." on the review page, and "Open the game
   to review it, then export." (or "to finish its review") on the home page.
   - **The mark of a finished review:** when a review ends, the browser keeps it with the game
     (`StoredGame.reviewed` in `src/lib/game/store.ts`): the engine module's and the network's SHA-256 (from the
     site's manifest), the network's id, the review's depth, and the time. The home page reads the marks, so it needs
     no engine to know which games can export. A game exports when its mark names the site's engine module and the
     network set now, at the review depth set now or deeper. A deeper mark for the same engine and network stays.
   - **A safety net:** the home page's annotated record also refuses a game whose positions lack a stored result
     ("open the game to review it first", or "to finish its review first"). Every game shares the start, so the start
     does not count.
4. **The review file's contents:**
   - `format` (`hedge-school-review`), `version` (1), `exported`, `site` (the site's version), `review` (the finished
     review: the game's mark, with the network's name, as "HedgeFund 0.1 Lite"), `record`, `branches` (as the browser
     keeps them), and `analyses`: each result with its key in the browser's store (the store's shape, the engine's
     build, the network's SHA-256, the visits, and the position's moves).
   - The game's results only: the positions of its line (the record's own moves) and of its branches (their path keys).
   - Only the networks the site ships: a result of an older network is of no use to any copy of the site. A reviewed
     game of 120 edges at 32 and 1,024 visits: 240 results, 876 KB.
   - **Its version:** one number. A new field keeps the version, and a reader ignores the fields it does not know. A
     field that changes its meaning, or goes, takes the next version. A reader refuses a newer version ("a newer Hedge
     School wrote it") and says which older ones it no longer reads. Each result carries the store's shape in its key,
     so a change of the results' shape needs no new version of the file: a reader keeps the results of its own shape
     and searches the rest again. One number suffices, unlike the engine protocol's `MAJOR.MINOR`: one program writes
     and reads the file, and a visitor always has the newest copy of it, so only older files reach a reader.
5. **An import:** the site reads and checks the file: its format, version, record and branches. It drops an entry that
   is not a result. It keeps the game as it keeps a pasted record. The file's branches join the browser's own for that
   game: the browser's first, in their order, then the file's new ones. It keeps the results of the networks that this
   site ships, and leaves out the others. When the file's review ran with this site's engine module and a network it
   ships, the game keeps its mark too, so that it exports at once. Then the review opens.
6. **Another engine:** the browser's store keys the results by the engine's build and network, so an import into a site
   that ships another network keeps the game and the branches, and the review searches again with that site's engine.
7. **A deeper result answers a shallower question:** a review asks for each position at its own budget (32 visits, the
   label pass, the review's depth). When the store has no result at that budget, it takes the least deeper one it has
   (`cacheGetAtLeast` in `src/lib/analysis/cache.ts`), as the review already takes a deeper result it holds in memory.
   So a file searched to 1,024 visits opens at once in a browser whose review depth is 512.

## Why

- **The full results in a file, not in the record:** the engine repository's design keeps the full analysis out of the
  record, as Lichess keeps it out of its PGN. The record is for reading and for other programs. The file is for this
  site.
- **Search again with another engine:** a review's labels and its chart then come from one engine. Lichess keeps an old
  analysis as it was and lets the player ask for a new one, because its analysis costs a server's time. Here the engine
  runs in the player's browser, so a new review costs nothing but the wait.

## Alternatives

- **Export a review in part:** simpler for the player who stops early, but the record's note would name a depth that
  some positions lack, and a reader could not tell. Its file could still be imported to finish the review elsewhere.
  Kept simple for now: only a finished review exports.

- **Only one of the two exports:** the file alone cannot be read by a person or another program. The record alone
  cannot open a review without searching again.
- **Keep the results of another engine, labelled with it** (Lichess's old analyses): more to build and to explain, for
  a case that comes only after an engine's update.
- **A compressed file** (gzip: about a third of the size): a plain JSON file can be read and checked by hand.

## Consequences

- A result's key holds the store's shape. When the shape changes (to 5 for the priors, design 14), a file exported
  before imports without its results, and the review searches again.
- **The notation's rules for the record** (the engine repository's design 04, after
  [requests/13-branch-placement.md](../requests/13-branch-placement.md)):
  - A branch follows the turn it changes, after the turn's last edge, its mark and its comments. `N.` replaces the
    whole turn: `3. D10-G9 G9-H10 (3. D10-F13 F13-G10)`. `N...` keeps the turn's first edge:
    `4. N9-Q10 L10-N9 (4... M12-N9)`. The turn's branches from its start come first, then those from its second
    edge.
  - By turn, a turn's label is also its quality mark, after its last edge and any cut mark: Great `!`, Inaccuracy
    `?!`, Mistake `?`, Blunder `??`. Best, Excellent and Good have no mark, as PGN and Lichess have none for them. By
    edge, the labels stay in comments: a mark judges a turn.
  - The note comes before the first turn, after the tags, and the `Annotator` tag names Hedge School.
  - The site's own reader skips branches and comments, and drops a quality mark after any edge.

## Where it is

- `src/lib/game/reviewFile.ts` (the file: build, read, merge, export, import), `src/lib/review/annotate.ts` (the
  annotated record), `src/lib/analysis/cache.ts` (`cacheGetAtLeast`, `readAnalysisKey`), `src/lib/storage/db.ts`
  (`dbEntries`), `src/lib/game/record.ts` (`writeTags`).
- `src/lib/ExportMenu.svelte` (the menu), `src/lib/review/exportText.ts` (`annotatedText`, `annotatedFromStore`),
  `src/lib/analysis/game.svelte.ts` (`fromStore`: a review from the stored results only).
- `src/routes/review/+page.svelte` (`exportAs`), `src/lib/review/ReviewView.svelte` (the menu's place),
  `src/routes/+page.svelte` (the menu beside each game, Import a review, the drop).
- The tests: `src/lib/game/reviewFile.test.ts`, `src/lib/review/annotate.test.ts`.

## Log entries

- [decisions/product.md](../decisions/product.md): "Export and import of reviewed games" (2026-10-12).
