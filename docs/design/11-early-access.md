# Early access: Hedge School's review on the web

**Status:** decided, being built. **Decided:** 2026-10-12.

## Context

The review works on the owner's machines: import a game, and the engine reviews it in the browser. The players of
Enclosure meet in a Discord, and the site can serve them before puzzles and lessons exist. The site is static files
([02-static-site.md](02-static-site.md)), so hosting serves files only, and the engine runs on the visitor's machine.

## Decision

1. **The name: Hedge School,** for the site and the project: the pages, the README and the package. The GitHub
   repository is `abstractclass-org/abstractclass`, the repository of the learning sites (design 26). The address:
   `hedgeschool.abstractclass.org`, on the owner's domain, so that it matches the name the visitor reads. The
   browser's storage keeps its first names (`learn-enclosure`), so that the games and settings a browser holds stay.
2. **The scope: the review and the Analysis board** (design 21).
   - **The home page:** what Hedge School is, and the way into each tab (design 22).
   - **The Review tab:** import a game, load a review file, continue the last review, and the player's games. No
     sample game: a review opens on a game the player brought. Each game has a Delete ([below](#deleting-a-game)).
   - **The ways to bring a game:** a pasted record in this site's notation, a pasted export of Constellation's
     analysis board, and the bookmarklet for meaf.us and strategyjam.org ([import](#constellations-export) below).
     The pages name the record and the two sites' tools. Constellation's export is on the notation page only, as a
     notation whose columns have `I`.
   - **The header:** the name, which leads home, with "Early Access" beside it in the accent colour, which leads to the
     About page's section on the early access. That section says first that everything can change (the pages and their
     addresses, the labels, the engine, the files and links, what the browser keeps), then what the site does now. Then
     Practice, Review and Analysis, and on its right Tools (from a tablet's width, design 22), The notation, About,
     "Support Us" (Ko-fi's tip panel, design 22) and the theme
     menu: System (the default: the computer's light or dark), Light or Dark. Its button shows the choice: a half-filled
     circle, a sun or a moon. The choice is kept in this browser, and a script in the page's head applies it before the
     page draws, so that a page never shows the other theme first. On a phone the header's gaps narrow, so that it fits
     in 360 pixels. Review opens the Review tab, where the last game reviewed in this browser is a click away. A
     review's address names its game, so a reload keeps it. **The footer,** on the pages that scroll (the home page and
     the pages about the site): the pages that the header lacks (How reviews work, For developers, Privacy, Notices, and
     Tools on a phone), the site's version (its commit), the site's copyright line, and "Enclosure by webgoatguy", so
     that the copyright does not read as the game's. The review has no footer: it fills the window. The About page
     credits webgoatguy as the game's designer, and says that the site is not an official site of the game: it is made
     independently of webgoatguy, strategyjam.org, meaf.us and Constellation.
   - **Not in the early access:** puzzles, lessons, free analysis and the engine lab. Their addresses lead home. Their
     code stays, for the full site.
3. **One build switch:** `VITE_EDITION=early` builds the early access. Without it, the build is the full site, for
   development.
4. **Listed** (design 23, which replaced the first rule, unlisted): search engines index the live address, and
   Cloudflare's preview addresses answer with `noindex`. The Discord is where players report problems.
5. **Hosting: Cloudflare Pages.** A GitHub Actions workflow builds the GitHub repository on every push, and
   uploads `main` to production (hosting.md, section 3, says why Pages does not build it itself):
   - **The build command,** `npm run build:cloudflare`: it downloads the engine from its GitHub Release (`npm run engine
     -- --deploy`, which refuses local engine files), runs the tests and the type check, then builds into `build/`.
     The workflow installs the dependencies first (`npm ci`, at the repository's root), and builds in the site's
     folder, `apps/hedgeschool` (design 26).
   - **Node 24** (`.node-version`): Node 22 cannot run the tests' TypeScript without a flag.
   - **The build's variables:** `VITE_EDITION=early`, `VITE_GA_ID` and `VITE_CF_ANALYTICS_TOKEN` (item 7). The footer
     shows the commit that the build runs from.
   - **The headers** (`static/_headers`): `noindex` on Cloudflare's preview addresses (design 23), and a year's cache, never checked again, for the
     build's hashed code (`/_app/immutable/`) and the engine's files (`/engine/<id>/<file>`): their paths name their
     content, so a file there never changes. `/engine/manifest.json` keeps the default check on each load. The meaf.us
     tools' files are checked at each use (`no-cache`), so that a deploy reaches the bookmark and Tampermonkey at
     once: Cloudflare's own rule kept a `.js` file for 4 hours.
   - **A 404 page** (`404.html`, adapter-static's fallback): without it, Pages serves the home page for any unknown
     address.
   - **The size:** 69 files, 29 MB. Each file is under Pages' limit of 25 MiB (the larger network is 20.6 MB).
   - A build from a clean clone, as Pages makes it, was run on the owner's machine: the engine downloaded, the tests
     and the type check passed, the site built.
6. **The engine:** a GitHub Release of `enclosure-engine`, a public repository that holds only the engine's
   releases, while the engine repository stays private
   ([requests/03-release-artifacts.md](../requests/03-release-artifacts.md)). The release has the module, both
   networks, as the engine settings offer both, and a notice of the licences of what is compiled into the module.
   The site ships that notice beside the module, and the notices page lists the works and links to it.
   - **A new engine:** the stored results' keys name the engine's build and the network's file. A game reviewed before a
     release opens as a snapshot of that review, with Review again (design 20). Where the browser lacks the earlier
     results, the game is searched again, and the player is told why (`reviewAgainWhy` in `src/lib/game/store.ts`): a
     dialog says that the engine was updated, once in a visit for each game and build, and a line under the review's
     progress says it while the review runs. In the Review tab, the game's Export, off until the review is done, says it
     too. A network or a depth that the player chose is not an update, and has no notice.
7. **Analytics: Cloudflare's and Google's.** Cloudflare's sets no cookies. Google Analytics runs in Google's consent
   mode, advanced form: the Google tag loads on every page with its cookies denied, and sends cookieless pings until
   the visitor accepts. A banner asks once, with Accept and Decline alike. The privacy page shows the choice, can
   change it, and names what the pings hold. The banner now asks for the practice games' link too, with a choice for
   each purpose on the privacy page (design 25, which replaces this item's banner). Neither service sees a game: the bookmarklet hands a game to the import
   page in the address's fragment (after `#`), and that page removes it before it starts them. Every other page
   starts them from the layout, and the review page names its game after the `#` too (`/review#game=ID`). Google
   Analytics also takes events, in counts and ranges, for the decisions that wait on data (design 17). The build
   names the services (`VITE_GA_ID`, `VITE_CF_ANALYTICS_TOKEN`). Without them, as in development, nothing loads.
8. **The notation page:** a full description of the position notation and the game record notation, written so that
   other developers can follow it, as PGN's standard describes PGN. The notations are decided in the engine
   repository's design (its `docs/design/04-notation-and-protocol.md`). That repository is private, so this page is
   their public description. A change is decided there first, then the page follows
   ([requests/11-notation-page.md](../requests/11-notation-page.md)).
9. **The labels:** as built (design 10), with no note that they may change. They are computed again from the stored
   analyses whenever the page opens, so a later change reaches every stored game without a new search.
10. **The site's own terms:** its code, text and design are under copyright, all rights reserved (`SITE_COPYRIGHT` in
    `src/lib/edition.ts`: "© 2026 Yshan"). The repository is public and has no licence file, so these terms are its
    terms too. GitHub's own terms still let each of its users view the repository and fork it on GitHub. The
    notices page states these terms first, and then the licences of the works of others that the site ships: the MIT
    licence there covers those works only. These licences cannot be removed: MIT, for example, requires its notice in
    every copy, and the site sends those libraries to each visitor. An open licence such as MIT would let anyone serve
    the site for profit. For the repository, a licence for non-commercial use (PolyForm Noncommercial 1.0.0) is the
    nearest to these terms. It would not cover the sounds: the Pixabay Content License does not permit their passing
    on alone.
    **The engine and its networks** have the same holder and the same terms, set in the engine repository (its
    `games/enclosure/docs/design/21-release-terms.md`, requests 14 and 21): all rights reserved, with Hedge School and
    its visitors permitted to serve and run them. The terms also cover the engine's outputs: its analyses, and the
    review files that hold them. Anyone may keep, share and publish the outputs as analysis, such as a player's reviews
    and the review files that a partner site keeps (design 18). No one may use the outputs to train, distil or tune
    another model, network or engine without the holder's written permission. Each release carries the terms as
    `LICENSE.txt`, which the site ships beside the modules (`engine.lock.json`, kind `terms`). The notices page gives
    the terms in the engine repository's words, before KataGo's MIT licence and the other works in `NOTICES.txt`.

### Constellation's export

Constellation's analysis board (`constellation.blueshrimp.uk/#analysis`) exports a game as one line: the start, then
one item for each turn, separated by spaces.

```
[B:A10-D10 R:P10-S10] D10-A7 P10-M10-J7 A7-A10,A7-D4 J7-L10-J13 …
```

- **The start:** `[B:… R:…]`, Blue's and Red's edges. The site imports games from the standard start only.
- **A turn:** one edge (`D10-A7`), two edges that meet, written as a path (`P10-M10-J7`: P10-M10, then M10-J7), or
  two edges apart, separated by a comma (`A7-A10,A7-D4`).
- **Points:** columns `A` to `S`, with `I`. Rows `1` to `19`. This site's columns are `A` to `T` without `I`, as GTP's,
  so a column keeps its place in the alphabet that skips `I`: `P` is `Q`, `M` is `N`, `J` is `K`. The rows count
  from the bottom on both sites (checked on Constellation's board).
- The import turns the export into this site's record (`[Site "Constellation"]`, then the turns), which the engine
  checks and the site keeps like any other record.
- **Where the site describes it:** the notation page, in "Columns with I": a notation with `I` among its columns,
  read only in a form that the site knows, since a list of edges looks the same in both letterings. The import
  boxes and the tools page do not name it: it is one more notation that a pasted record can be in.

### Deleting a game

- **Delete removes the game, its branches, and the Review link's pointer to it,** for good. The site's engine's
  analyses stay: they belong to positions, which other games can share, and an import of the same game then opens its
  review at once. An earlier engine's, which only the game's snapshot read, go at a later start, unless another game
  needs them (design 20, item 8).
- **A question first.** Delete opens a dialog: "Delete this game?", with the game's name, and a line that says that
  the player cannot undo the delete. Its buttons are Cancel and Delete. Cancel has the focus when the dialog opens, so
  that Enter does not delete. Escape and a click outside the dialog cancel, as Cancel does. The privacy page's "Delete
  my practice games" asks in the same dialog (design 25).
- **A double click on Delete deletes no game.** For 500 ms after the question opens, its Delete is disabled, with the
  look of the site's disabled buttons, then it turns red. So the second click of a double click cannot confirm, on a
  phone too, where the question's Delete can be under the row's. A click outside, or on Cancel, within those 500 ms
  closes the question. It is that second click, not a decision, so the count of cancels does not include it (design
  17). 500 ms is Windows' default double-click time.
- **A confirmed delete deletes the game, and its row goes at once.**

### Storage that the browser keeps

- **The problem:** the games and their analyses are best-effort storage. A browser may delete them when its disk is
  almost full, and Safari deletes them after seven days of use without a visit.
- **The site asks for persistent storage** (`navigator.storage.persist()`, `src/lib/storage/persist.ts`), once a page:
  when a game is kept (an import or a load), when the board keeps its analysis, and in the Review tab when the browser
  holds games. Chrome and Edge answer without a question, from how the visitor uses the site. Firefox asks the
  visitor.
- **The Review tab says what the browser answered,** under the games: "Kept in this browser until you delete them", or,
  without persistent storage, that the browser may clear them, with the advice to export the games to keep.

### One tab for each game's review

- **The problem:** a review keeps the game's branches in memory, reads them once when it opens, and stores them whole
  after each change. Two tabs on one game would store over each other's branches: a branch added in one tab would be
  lost after a change in the other, and a deleted branch could come back. Both tabs would also run the engine on the
  same positions, each with its own workers.
- **A tab holds the game's lock** (the Web Locks API, `navigator.locks`) while its review runs. Another tab for the same
  game starts no engine. It says "This game is open in another tab", with a **Review here** button. The button takes
  the lock (`steal`) and loads the page again. The tab that held the lock stops its engine at once, and says that the
  game is now open in another tab, with the same button. The browser frees the lock when its tab closes. Reviews of
  different games in two tabs run as before: they share only the machine.
- **A game deleted while its review is open** (in the Review tab, in another tab): the review stores no more branches
  for it, so a later import of the same game does not bring them back.

### The bookmarklet and the userscript (meaf.us, strategyjam.org)

The two tools work on the game pages of meaf.us and of strategyjam.org. strategyjam.org replaces meaf.us as the site
of the Enclosure strategy jam, the tournament (the engine repository's `docs/context.md`). On each site the tools
read the game from the player's own page.

- **On meaf.us, it reads the game that the board holds:** React's `game` property of the board. It sends no request
  to meaf.us and uses nothing from the player's login. It opens the import page (`/import`) with the record after the
  `#` (design 22), and the page asks the player to review the game or to analyze it on the board (design 21).
- **The bookmark is a loader** (`bookmarklet.ts`): a short `javascript:` that adds this site's `/bookmarklet.js` to the
  game's page at each click. So the bookmark stays as it is when the code changes, and the player drags it to the
  bar once. The script takes the site's address from its own address, so a game goes back to the site that the
  bookmark came from. A click can open a tab only for a few seconds after it: after a slower load, the game's tab
  goes to the import page instead. When the script cannot load, the bookmark says so.
  - **It depends on the sites' headers:** a content security policy that blocks other sites' scripts would stop it.
    Neither meaf.us nor strategyjam.org sends one. A check of strategyjam.org on 2026-10-17 found none. If one comes,
    the bookmark needs the code in itself again, as before the loader.
  - **The request** carries no game. By default the browser names only the game site's origin as the page that made
    it. The privacy page says so.
- **Each tool says what it is,** with each game (`importHash.ts`): `#tool=…&v=…&site=…&at=…&record=…` after the import
  page's address. The bookmarklet sends its loader's version (`BOOKMARK_VERSION`), and the userscript a hash of the
  files that make its code (the build's `__USERSCRIPT_CODE__`, `vite.config.ts`), so that a build that changes neither
  flags no one. `site` is the page's host: the import's source tells the two sites apart (design 17). A tool from before
  this sends the record alone, and one from before strategyjam.org sends no site.
- **The position on the page** (`at`): the game's moves before the position that the page shows, a pass one move, as the
  record counts them. Both sites have a replay slider whose value is that count. On meaf.us, it is
  `input[aria-label="Replay position"]`, in a watcher's view and in a finished game's view from the History page
  (`shownMove` in `meafPage.ts`). On strategyjam.org, it is `input.replay-slider` in the panel, live or in a replay, and
  the arrow keys and the move list move it too (`jamShownMove` in `strategyjamPage.ts`). The tools send the slider's
  value as it is, and the import page reads only a whole number (`readImportHash`). A page without a slider (a meaf.us
  game that the player plays) sends an empty `at`: it shows the game's last position. The Analysis board opens at `at`
  (design 21), and at the game's end without one. A tool from before this sends none.
- **An out-of-date tool:** the page says how to update the tool (drag the bookmarklet to the bar again, or open the
  userscript, both on the tools page), above the choice between the review and the board. A tool that sent no version
  counts as out of date. A tool from before the import page opens the review, which shows the same choice and notice
  (design 22, item 4).
- **No game on a page that shows one:** the tools' message says that the game's site may have changed its page, and
  names the tools page (`/tools`), which has the newest tools.
- **On meaf.us, a player's own game, just after it ends, has no moves in the page.** meaf.us asks its server for a
  game's moves only for a viewer who watches the game (`spectate=1` in the address, or a game of other players), or
  who opens it from the History page. The game's `historyLength` still counts the moves. On such a page, when the game
  is over, the bookmarklet opens the same game as a watcher's view, which loads the moves, and asks for a second click.
  During a game it only says to click again when the game is over: a watcher's view would take the board from the
  player.
- **On meaf.us, the winner is a name.** meaf.us gives the winner as the winning player's name, as the engine
  repository's archive tools read it (`tools/analyze_archive.py`). The record's result compares it with the two
  players' names.
- **On strategyjam.org, it reads the game that the game's page holds** (`/enclosure/game/ID`, `strategyjamPage.ts`):
  the props of the React component that draws the stage (`.stage`, the board and the panel). `game.rules` is the
  site's rules module, and `state` the game as the site sends it: the seats, the first position, the moves
  (`history`) and the result. The engine repository's `docs/context.md`, "strategyjam.org internals", describes them.
  - **The scores come from the page's own rules module,** which plays the moves again from the first position. The
    site gives no scores with a finished game, and the record's margin needs them.
  - **A finished game needs the player's login.** Its page reads the game from `/api/games/ID/record`, which answers
    only a player who is logged in. For a visitor, the page holds no game (`status` "login"), and the tools say to
    log in. The tools send no request of their own, so they never use the login. A game in play shows to any
    visitor, with every move.
  - **The record** (`strategyjam.ts`): First is Blue, since First starts with a10-d10, Blue's A10-D10. The columns a
    to s become the notation's A to T, with no I. The site gives the moves one by one: the first turn has one edge,
    each later turn two, and a pass (a timeout) ends its turn, as on meaf.us. The Site tag is the game's page, as
    Lichess writes it, so the review links back to it. The record has no TimeControl: the site adds its increment
    for each edge, and the notation's TimeControl adds it for each turn.
  - **The result:** the site gives the winner by seat, and its reason in words. A game that the rules ended (120
    edges, the forfeited ones included) takes its margin from the scores. A game that ended before, with a winner,
    ended by a resignation (a reason with "resign"), else by a forfeit: a timeout is a pass, and the game goes on. An
    aborted game, and a game in play, give `*`.
  - **Checked** with synthetic games that the site's own rules module played (`scripts/strategyjam-games.mjs`), on
    the site's own page code in Chromium, with the API answered by a test (no request to the site). The reader took
    the game from the page, and the review found every move legal and the same scores as the site, in a game with
    timeout passes too. The check did not load a real finished game, because such a game needs a player's login.
- **A userscript, a second way, for Tampermonkey.** It runs the bookmarklet's code (`meafPage.ts`, `meaf.ts`,
  `strategyjamPage.ts`, `strategyjam.ts`) on the game pages of meaf.us (`https://meaf.us/sst1/*`) and
  strategyjam.org (`https://strategyjam.org/enclosure/game/*`), in the page's own context (`@sandbox raw`: neither
  site sends a content security policy). It shows a round button with the school's collie near the page's lower
  right corner while a game shows, and adds "Review this game in Hedge School" to Tampermonkey's menu. Its note
  shows above the button.
  - **The button's place** (`BUTTON_PLACES` in `userscript.ts`, one entry for each site). On meaf.us: fixed in the
    window's lower right corner. strategyjam.org's page fills the window, and its move list holds the lower right
    corner. In a narrow window the panel under the board scrolls, and in a wide one the board can fill the height
    between the menu and the panel. So no fixed spot there stays free. The button goes at the end of the move list's
    legend ("can be cut", "can't be cut yet", `.enc-legend`), in the page's own layout. It sits to the right, in a
    row of its own when the legend fills its row, and it scrolls with the panel. It is 36 pixels wide, as the page's
    icon buttons. A sweep at the layout sweep's sizes (widths 360 to 1,920 by 10, heights 700, 860 and 1,000) found it
    over nothing: no text, control, board or scroll bar. The same sweep with the button fixed in the corner found it
    over the move list's scroll bar, the gains and the legend.
  - **It updates itself.** The site serves it at `/hedge-school.user.js`, and its header alone at
    `/hedge-school.meta.js`, which Tampermonkey checks for a newer version (`@updateURL`, as Greasy Fork serves a
    `.meta.js`). Each build gives it a later version (the build's time). A change of a site's page then needs no new
    install.
  - **One click for a finished game on meaf.us.** It opens the import page through Tampermonkey (`GM_openInTab`),
    which no popup blocker stops. So after the reload as a watcher's view, the script runs again, waits for the moves,
    and opens the game in Hedge School itself. It sends no position then. The player did not move the slider. Also,
    meaf.us's slider goes to the game's end only just after the page draws the moves, so a read before that gives an
    earlier position.
  - **No request for its look.** The script draws the button and its collie itself and fetches no image, so no site
    learns of a visit from the button.
  - **The site's address is part of the file** (the build's `SITE_ORIGIN`, `vite.config.ts`): the live site for a build
    of `main`, the preview for another branch, the local preview server for a local build.
  - Chrome and Edge from version 138 run a userscript only after the player turns on "Allow User Scripts" for
    Tampermonkey (Tampermonkey's FAQ, Q209). The tools page says so.

## Alternatives

- **A sample game,** to show the review before a player imports one: a bot game is not the player's own, and the
  early access is for players who bring their games.
- **An Undo, not a question** (before the question), as Gmail does: the site deleted the game at once, and its row
  showed "Deleted …" with an Undo until the page loaded again. A delete and a slip cost one click each. But an Undo
  could restore a game without the results that its snapshot reads, once the site removes an earlier engine's
  results (design 20, item 8). The question costs a second click on each delete.
- **The free `pages.dev` address:** the owner's domain is the lasting one.
- **Listed in search engines:** after the first players' reports.
- **A note that the labels may change:** not needed, since a change reaches stored games by itself.
- **No Review link:** a bare link led to a review with no game. The Review tab gives the link a use: it imports a
  game, and the last review is a click away. Before design 22, the link opened the last game reviewed.
- **Google's consent mode, basic form:** no Google tag until the visitor accepts. The advanced form's modeling needs
  1,000 events a day from visitors who decline and 1,000 daily users who accept, so a small site gains little from it.
- **Cloudflare's automatic Web Analytics** (one click on a Pages project): it adds the beacon to every page as it is
  served, so the beacon would start before a page removes a game from its address (design 22).

## Consequences

- The steps are issues in beads (label `site`): in progress while they run, open when they wait.
- The site's name changes in the pages. The bookmarklet's link text says Hedge School.
- A game that Constellation exports from another start cannot be imported yet.

## Where it is

- The switch, the name and the version: `src/lib/edition.ts`, `vite.config.ts` (the commit). The last game reviewed:
  `src/lib/game/store.ts`, read by `src/lib/review/ReviewHome.svelte`. The hidden pages:
  `src/routes/{puzzles,learn,lab/engine}/+page.ts`. Search engines: design 23.
- The import of Constellation's export: `src/lib/game/constellation.ts`, with its tests.
- Deleting a game: `deleteGame` in `src/lib/game/store.ts`, the rows in `src/lib/review/ReviewHome.svelte`, the
  question in `src/lib/ui/ConfirmDialog.svelte`.
- One tab for each game's review: `src/lib/game/reviewLock.ts`, used in `src/routes/review/+page.svelte`. The check
  for a deleted game: `keepBranches` in `src/lib/analysis/game.svelte.ts`.
- The pages: `src/routes/{about,notation,developers,privacy,notices}/+page.svelte`, `src/lib/SiteFooter.svelte`,
  `src/lib/prose.ts` (their text style).
- Analytics: `src/lib/analytics.svelte.ts`, `src/lib/ConsentBanner.svelte`, started in `src/routes/+layout.svelte`, or,
  when the address holds a game, by the page that removes it (design 22).
- Hosting: `package.json` (`build:cloudflare`), `.node-version` (at the root), `static/_headers`, `vite.config.ts`
  (the 404 page and the version). The setup, step by step, and how to deploy: [hosting.md](../hosting.md).

## Log entries

- [decisions/product.md](../decisions/product.md): "Early access: the review only, as Hedge School", "Early access:
  the second round", "Google Analytics in Google's consent mode, advanced", "Early access: the third round"
  (2026-10-12), "Deleting a game, and the browser's storage" (2026-10-12), "A question before a delete replaces the
  Undo" (2026-10-16).
- [decisions/architecture.md](../decisions/architecture.md): "The site's repository is public" (2026-10-17).
