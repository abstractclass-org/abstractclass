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
     position of the game and its branches (`src/lib/game/reviewFile.ts`). Loading it opens the review at once.
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
   - **The Review tab** (design 22): the same menu beside each game, and "Load a review file", which takes a file
     chosen or dropped anywhere on the page. A file is loaded, not imported: it is Hedge School's own saved work
     (design 22, the words). The tab builds its annotated record from the stored results, with no
     search: the engine reads the rules only.
3. **Only a finished review exports,** every kind of export. A review is finished when every step of its bar is done:
   the sweep, the label pass, the key moments searched deeper, and the Greats' confirmations. Until then the Export
   button is off, and its tooltip says why: "Export once the review is done." on the review page, and "Open the game
   to review it, then export." (or "to finish its review") in the Review tab.
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
   - The game's results only: the positions of its line (the record's own moves) and of its branches (their path keys),
     and the positions one move from them, which confirm the Greats (`confirmGreats` in
     `src/lib/analysis/game.svelte.ts`: the position after the engine's second choice, searched to the review's
     depth). Without them, an import with the same settings searched the Greats' confirmations again: on the owner's
     game at 4,096 visits with the larger network, 5 such searches ran after the import.
   - Only the networks the site ships: a result of an older network is of no use to any copy of the site. A reviewed
     game of 120 edges at 32 and 1,024 visits: 240 results, 876 KB.
   - **Its version:** one number. A new field keeps the version, and a reader ignores the fields it does not know. A
     field that changes its meaning, or goes, takes the next version. A reader refuses a newer version ("a newer Hedge
     School wrote it") and says which older ones it no longer reads. Each result carries the store's shape in its key,
     so a change of the results' shape needs no new version of the file: a reader keeps the results of its own shape
     and searches the rest again. One number suffices, unlike the engine protocol's `MAJOR.MINOR`: one program writes
     and reads the file, and a visitor always has the newest copy of it, so only older files reach a reader.
5. **A load:** the site reads and checks the file: its format, version, record and branches. It drops an entry that
   is not a result. It keeps the game as it keeps a pasted record. The file's branches join the browser's own for that
   game: the browser's first, in their order, then the file's new ones. It keeps the results of the networks that this
   site ships, and leaves out the others. When the file's review ran with this site's engine module and a network it
   ships, the game keeps its mark too, so that it exports at once. When the file's review ran with a network that the
   site ships, **the game keeps that network and review depth** (`StoredGame.settings`, `setGameSettings` in
   `src/lib/game/store.ts`), as a shared link's game does (item 8), so that its review opens as it was made. Then the
   review opens.
   - **Only that game:** its review uses its own network and depth, and the settings kept in the browser serve every
     other game. The rest of the engine settings (on or off, the position on screen, the workers, the GPU) serve it too.
   - **Its engine settings** say that the game keeps the settings it came with, and show its own network and depth.
     A change of them there changes the game's only.
   - **No "my settings":** the settings kept in the browser are a convenience, the last ones chosen, not a player's
     settings that the site keeps as an account would. So the page offers no "Use my settings": a game that came with
     settings keeps them, and the player changes them in that game like any other setting.
   - The Review tab's Export of the game asks for a review with the game's own settings.
6. **Another engine:** the browser's store keys the results by the engine's build and network. An import keeps the
   file's mark when the site ships its network file, whatever the engine, and a mark of the site's engine stays over
   an earlier engine's. A file from an earlier engine therefore
   opens as a snapshot of its review (design 20), and Review again searches with the site's engine. An import into a
   site that ships another network keeps the game and the branches, and the review searches again.
7. **A deeper result answers a shallower question:** a review asks for each position at its own budget (32 visits, the
   label pass, the review's depth), and takes the deepest result the store has at that budget or deeper
   (`cacheGetAtLeast` in `src/lib/analysis/cache.ts`), as the review already takes a deeper result it holds in memory.
   So the file's deeper results, from the position on screen where the sender looked (design 09), count everywhere in
   the importer's review. Design 16 has every depth, and what a file and a link carry, with examples.
   So a file searched to 1,024 visits opens at once in a browser whose review depth is 512.
8. **A link that shares a review** (the Export menu's first entry but for item 9's, "Copy a link to share the review",
   `src/lib/game/share.ts`): the game's record, the player's branches, and what the review ran with (the engine
   module's and the network's SHA-256, their first 4 bytes, and the review's visits), after the review's `#`
   (`/review#packed=…`, design 22). The browser never sends that part of an address to a server.
   - **It holds no results:** the recipient's browser reviews the game again. So it does not carry the sender's deeper
     looks at positions (design 16, example 9): a review file does. The engine gives the same results for
     the same build, network and visits, so the review is the sender's. On a GPU the network's arithmetic differs a
     little (design 15), so a close call can rarely come out otherwise.
   - **The recipient's page** says so before anything runs: the game, its branches, and the sender's network and depth.
     "Review it" keeps the game and the branches (beside the recipient's own), and the sender's network and depth for
     that game alone, as an imported file's game keeps them (item 5), and opens the review. The page says that the
     recipient's settings for other games stay, when the site no longer has the sender's network (the review then uses
     the recipient's), and when the site's engine changed after the sender made the link.
   - **Its format:** bits, in base64url: each move as two points of 9 bits, the branches as a tree (a node's edge, 1
     bit for "evaluated", its number of children in 1 or 2 bits for none or one), the tags as UTF-8 text. A game's
     move costs 18 bits, and a branch's edge 20 where the branch goes on in one line. A version byte leads.
   - **The menu says what each export gives.** Under the link: "Short. The recipient's browser reviews the game
     again." Under the review file: "With the engine's results: the review opens at once."
   - **Its length:** a whole game of 120 edges with meaf.us's tags is a link of 653 characters (the tags 227 of them).
     A branch's edge adds 3.36 characters, and each new line of branches from another position about 22. The note
     after the copy gives the link's length, and warns past 2,000 characters, a Discord message's limit.
9. **The review file saved to a partner site** ([design 18](18-partner-links.md)): a game that came by a partner
   site's link offers "Save to" that site first in the Export menu. The review file goes to the site's save page, in
   the player's browser, when the player chooses it.

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

- `src/lib/game/reviewFile.ts` (the file: build, read, merge, export, import, `deliverExport`, the menu's entries
  `reviewExports`),
  `src/lib/review/annotate.ts` (the annotated record), `src/lib/analysis/cache.ts` (`cacheGetAtLeast`,
  `readAnalysisKey`), `src/lib/storage/db.ts` (`dbEntriesWhere`, `dbPutMany`), `src/lib/game/record.ts` (`writeTags`).
- `src/lib/ExportMenu.svelte` (the menu), `src/lib/review/exportText.ts` (`annotatedText`, `annotatedFromStore`),
  `src/lib/analysis/game.svelte.ts` (`fromStore`: a review from the stored results only).
- `src/routes/review/+page.svelte` (`exportAs`), `src/lib/review/ReviewView.svelte` (the menu's place),
  `src/lib/review/ReviewHome.svelte` (the menu beside each game, Load a review file, the drop).
- The share link: `src/lib/game/share.ts` (the format), `shareLink` and `importShare` in `src/lib/game/reviewFile.ts`,
  the recipient's page in `src/lib/review/Arrival.svelte`, `withReview` in `src/lib/analysis/engineSettings.ts`.
- The tests: `src/lib/game/reviewFile.test.ts`, `src/lib/review/annotate.test.ts`, `src/lib/game/share.test.ts`.

## Log entries

- [decisions/product.md](../decisions/product.md): "Export and import of reviewed games" (2026-10-12), "A review
  shared by link, and the Greats in the review file" (2026-10-13).
