# The shared packages: the engine, the storage and the analysis, behind a game interface

**Status:** in force. Built: the engine, the storage, the analysis, the review's view, the import's frame and the
player's games are in `packages/`. The view's game interface rests on Hedge School's board and on Blueprints' (item
9). Cyanotype gives Blueprints' part with its review (abscls-8tl1.7). The import's frame serves Hedge School's tools and
Cyanotype's (item 10).
**Decided:** 2026-10-19.

## Context

Each strategy-jam game gets a site of its own in this repository, at `<game>.abstractclass.org`, with an Analysis
board and a review (abscls-8tl1). The jam's rules come out at its start, on 2026-10-24, so the site's shell must be
ready before anyone knows the game. Design 26 kept `packages/` empty until a second site needs a part (its item 4).
The jam game's site is that second site.

Design 26's map put the review's model among Enclosure's parts, since it builds in Enclosure's two-edge turns, Blue's
side and the enclosed area. A second reading of Hedge School's code, for this move, finds that the model's rules hold
for any game whose turns have one move or two, and that Enclosure is in its types and a few calls. The parts fall
into three groups:

- **General as they are:** the engine's client and its workers (they send the protocol's requests and pass the replies
  on), the pool, the storage, the move tree (moves as words), the labels (the engine's win chance and chess.com's
  bands, design 10) and the cache (keys from the moves' names).
- **General in their rules, with Enclosure in their types and a few calls:** the review's model, the analysis of a
  game (the stages, the focus, the batch) and the engine session. The model's turn is already a run of one player's
  moves. What is Enclosure's in them is the move's type (an edge as four numbers), its name, the position that the
  board draws, the cut, the turn numbers of the notation, the players' names and the texts that say "edge".
- **Enclosure's:** the notation, the board, the edge input, the records and their imports (meaf.us, strategyjam.org,
  Constellation), the practice bot, the lessons, the editor, and every page.

The view of the review and of the Analysis board (`ReviewView.svelte`, 1,900 lines) draws Enclosure throughout: the
board, the edges as pills along their slope, the regions and the invincible edges, the areas in the players' cards,
and "edge" in its texts.

Other branches change some of these files while they move. Git follows a file across a pure rename (`git mv`, with no
edit in the same commit), so their changes still apply.

## Decision

1. **Three packages** in `packages/`, in the one npm workspace (design 26):

   | Package | Folder | What it holds | From Hedge School's `src/lib/` |
   |---|---|---|---|
   | `@abstractclass/engine` | `packages/engine` | The engine in the browser: the protocol's general part, the client, the worker channel, the CPU and GPU workers, the engine's library, the artifacts and the manifest, the pool, and the error text | `engine/` (but `notation.ts`, `position.ts` and `analysis.ts`), `analysis/pool.ts`, `errors.ts` |
   | `@abstractclass/storage` | `packages/storage` | The browser's store (IndexedDB), local and session storage, persistent storage, and a store in memory for the tests | `storage/` |
   | `@abstractclass/analysis` | `packages/analysis` | The game interface, the review's model and its labels, the move tree, the analysis reply as the review reads it, the cache, the analysis of a game, the engine session, the GPU control, the engine settings' general part, the kept tree's shape, and the tests' loader of runes | `review/model.ts`, `review/labels.ts`, `review/tree.ts`, `engine/analysis.ts`, `analysis/` (but `engineSettings.ts`, `settingChanges.ts` and `NewMenu.svelte`), `testing/svelteModules.ts` |

   A fourth package, `@abstractclass/record` (`packages/record`), holds the game record's frame, with each game's
   moves and marks as a parameter. Design 33 moved it out of Hedge School's `src/lib/game/record.ts`. It also moved
   the turns of one move, then two (`turnFromCount`), out of `review/enclosure.ts` into the analysis package
   (`turns.ts`). A fifth, `@abstractclass/site` (`packages/site`), holds the sites' frame: the colour tokens and base
   styles, the header's bar and the page's area, the theme, the page's metadata, the pages' text style and the notices
   page (the site's and the engine's terms, the libraries and the icon). Design 33 moved it out of Hedge School (its
   item 4). It also holds the checks of a deployed site that both sites share, a script for Node that no page
   imports. A sixth, `@abstractclass/review` (`packages/review`), holds the review's
   and the Analysis board's view, with the view's game interface (item 9). The site's general controls that the view
   uses (the icons, the toast, the settings' parts, the players' colours and their swatch) and the page's scroll moved
   into `@abstractclass/site` with it. A seventh, `@abstractclass/import` (`packages/import`), holds the import's
   frame: the tools for a game site's pages, the hash that they send and the import's events, with each site's parts
   as parameters (item 10). An eighth, `@abstractclass/practice` (`packages/practice`), holds the practice's part that
   is not Enclosure's: the bot's settings, the kept game and the choices under each site's key, the GTP helpers, the
   takeback, the results, the settings card, the game's frame, and the bot's page side, its forms and its worker.
   Design 33 moved it out of Hedge School's `src/lib/practice/`, whose Enclosure's part is now `hedgefund.ts`. The
   bot's forms (`botForms.ts`) and their worker (`botFormsWorker.ts`, Hedge School's `hedgefundWorker.ts`) moved last,
   when Blueprints' release had the threaded bot (abscls-8tl1.29). The player's games, kept in the browser (Hedge
   School's designs 11 and 22), moved out of Hedge School with Cyanotype's list of games (design 33). The store and
   its review marks (`games.ts`), the lock that lets one tab review a game (`reviewLock.ts`) and a game's own network
   and depth (`settings.ts`, `ownSettingsOf`) went into the analysis package. The Review tab's list with its Delete
   (`GameList.svelte`) went into the review's. The question before an action that the player cannot undo
   (`ConfirmDialog.svelte`), one of the site's general controls, went into the site's. The engine's two scripts for
   Node, `node-engine.mjs` (the CPU module in Node, for the checks) and `fetch-engine.mjs` (which `npm run engine`
   ran: the fetch of a site's `engine.lock.json`), moved from Hedge School's `scripts/` into the engine package with
   it, for both sites. Now `npm run engine` runs each site's `scripts/engine.mjs`, which gives the package's
   `fetchEngine` the site's komi limit. The
   analytics moved out of Hedge School with Cyanotype's (design 33, "Analytics"): the site's package holds the
   analytics with each site's Cloudflare token and keys as parameters and the one PostHog key of the build
   (`analytics.svelte.ts`), PostHog's client (`posthog.ts`), the flag of internal traffic (`internalTraffic.ts`), the
   ranges (`measure.ts`), and the consent banner and its card (`ConsentBanner.svelte`, `CornerCard.svelte`, with the
   site's mark as a parameter). The engine settings' changes as events went into the analysis package
   (`settingChanges.ts`), the exports' event into the
   review's (`exportEvents.ts`) and a practice game's parameters into the practice's (`practiceEvents.ts`), each with
   the site's analytics and its networks' names as parameters.
   The review file (Hedge School's design 13) moved out of Hedge School's `src/lib/game/reviewFile.ts` with
   Cyanotype's review files. Its build, its reader, its import and its export from the store went into the analysis
   package (`reviewFile.ts`). Each site gives its name, its format, its record's reader, its store of games and its
   import's check. The way to tell a review file from an analysis file (`fileKind`) went into `files.ts`. The Export
   menu's entry for the review file, and the delivery of the review file and of the annotated record, went into the
   review package's `exports.ts`. Hedge School's files, its messages and its tests stayed as they were.
   The review from the browser's store alone (Hedge School's designs 13 and 20) moved out of Hedge School with
   Cyanotype's review snapshot. Three parts went into the analysis package (`storedReview.ts`): the steps of Hedge
   School's `src/lib/review/storedReview.ts`, the review snapshot's opening from its review page, and the annotated
   record of a stored game from its `exportText.ts`. Each site gives its step after the rules: Hedge School's opening
   book, Cyanotype's check of the capture marks.
   A ninth, `@abstractclass/measure` (`packages/measure`), holds the engine measure on a visitor's device: the run,
   its time estimate, its stop when the tab is hidden, the device's facts and the results block with Copy results
   (decisions/engine.md, "The engine measure on a visitor's device"). It started in the package (item 11). Each site
   gives its page at `/lab/measure` with its game's part: its default settings and its game's positions.

   The engine package knows no game. The analysis package knows a game only through the game interface. No package
   imports a site. A site gives a package what is its own as a parameter: each site's `scripts/engine.mjs` gives its
   record's komi limit to the engine step, for example. A check of `npm run check:all` (`scripts/package-imports.mjs`)
   refuses an import in `packages/` of a site's file or package. It also refuses SvelteKit's `$lib`: a site's build
   reads that alias as the site's own `src/lib`. A dynamic import of a computed path is refused too, but in the files
   that the check names with what they load.
2. **The game interface** (`packages/analysis/src/game.ts`): what a site gives the analysis about its game.

   ```ts
   /** A game's types, as its site keeps them. */
   interface GameTypes {
     move: unknown;           // a move, not a pass. Enclosure: an edge, [x1, y1, x2, y2]
     position: PositionInfo;  // a position, as the board draws it
     played: Played<this["move"]>; // a move played, with what the board draws of it. Enclosure: with its cut
     fields: unknown;         // a position, as describe_game gives it
     described: unknown;      // describe's reply: a position with its legal moves
     rules: unknown;          // a position's rules, for the player's own moves. Enclosure: the legal edges and nodes
     step: unknown;           // a move of a line, played: what the board draws after it. Enclosure: the cut, the regions
   }
   /** What the analysis reads of a position. */
   interface PositionInfo { player: Player; over: boolean; scores: [number, number]; count?: number }
   interface Played<M> { player: Player; edge: M | null } // `edge`: the move, null for a pass

   interface Game<G extends GameTypes> {
     equal(a: G["move"], b: G["move"]): boolean; // whether two values are one move
     moveName(move: G["move"] | null): string;   // the engine's name for it, its one spelling: "pass" for null
     parseMove(name: string): G["move"];         // the move of a name that is not "pass"
     position(fields: G["fields"]): G["position"];
     played(name: string, before: G["fields"], after: G["fields"]): G["played"];
     rules(described: G["described"]): G["rules"];
     step(after: G["fields"]): G["step"];
     turn(count: number): { turn: number; first: boolean }; // the notation's turn of the next move
     scoreScale: number;                         // the engine's points per Go point (KataGame's SCORE_SCALE)
     afterKey?(move: G["move"], before: G["position"]): string; // the position after a move, as a key (none: its name)
     enginePosition?(start: string): string;     // the engine's position for a set-up start in the notation (none: the notation's)
   }
   ```

   - **The board's drawing, the notation's texts and the import stay in the site.** The interface carries only what
     the shared code must compute with.
   - **The game compares and names its moves.** The shared code compares two moves with `equal` (Enclosure's
     `sameEdge`), and keys the tree, the queries and the stored results by the moves' names. Enclosure's name
     (`edgeName`) puts the lower point first: it is the edge's one spelling. A move's name has no space (a path in the
     tree joins the names with spaces), is not "pass", and does not start with "@" (the cache's mark of a set-up
     start).
   - **The turn structure comes from the positions:** each position says who moves next (`player`), and a turn is a
     run of one player's moves. `turn` gives only the notation's numbers. Enclosure's first turn has one edge, then
     two a turn. A game of one move a turn numbers each move.
   - **Each position says whether the game ends there** (`over`, from the engine's outcome). The type requires it. The
     analysis searches the position after the last move when that position is not the end (an unfinished game), and
     the review judges the last move from that search. At the game's end, the review takes the result as the value.
     Code that reads a position with no `over` must choose a default, and two readers can choose two defaults.
   - **A turn has one move or two.** The review judges a turn of two moves by Enclosure's rules: the same two moves in
     either order are one turn, and the engine's best turn is its first choice and the next move of that choice's
     line (`judgeTurn`, and `GameAnalysis`'s turns). A game of longer turns, or one where the order within a turn
     matters, needs these rules changed first.
   - **The values are the first player's:** the engine gives every win chance and score from the first player's side
     (KataGo's convention, in Enclosure from Blue's). The shared types keep Hedge School's field names (`blueWin`,
     `edge`, `players.blue`): the browser's store and the review files hold them. So in the shared code, "edge" means a
     move and "blue" the first player.
   - **The names that nothing stores take the glossary's word, "move":** `MoveReview`, `onlyMove`, `ONLY_MOVE_GAP`,
     `judgeMove`, `judgeBranchMove` and `likelyMoves`. They changed with the view's split (item 9). Hedge School's own
     names for Enclosure keep Enclosure's word, since an edge is Enclosure's move: its `enclosure.ts` gives
     `EdgeReview` and `judgeBranchEdge`. `blueScore` and the unit `"edge"`, which Hedge School's display settings store,
     keep theirs. The storage keys (`learn-enclosure:…`) and the database's name keep theirs (item 4).
3. **Generic types.** The shared types take the game's types as a parameter: `Analysis<M>` and `Candidate<M>` the
   move's, `Review<G>`, `ReviewData<G>` and `GameAnalysis<G>` the whole `GameTypes`. A function that compares moves
   takes the game (`rankOf(game, analysis, move)`), and so does `GameAnalysis`'s constructor.
   `src/lib/review/enclosure.ts` in Hedge School gives Enclosure's types (`Enclosure`) and its game (`enclosure`). It
   also gives the site's code the review's model as the site read it before: the shared names, the shared types named
   for Enclosure's (`Review`, `Analysis`), the functions that compare moves with Enclosure's game given (`review`,
   `rankOf`), and Enclosure's own part (its positions, a move with its cut, the turn numbers, the line's movers and the
   texts). The players' names are the review package's, every game's (item 9). So the site's calls stay as they were.
4. **The other ties to the site, beside the game:**
   - The engine session takes the site's analytics as an option (`tracker`): its events (`track`), and a network's
     name for them (`networkName`). Without it, the session sends no event. The engine settings' list of networks,
     the lock file and the settings' key stay in the site.
   - The storage keys and the database's name stay as they are. A browser keeps them by the site's address, so each
     site has its own. The database's stores are Hedge School's (`analysis`, `games`, `branches`). A site that needs a
     store of its own makes the stores the site's choice first.
5. **How a site imports a package:** `@abstractclass/<package>/<file>.ts`. Each package's `exports` maps `./*` to
   `./src/*`, and the site lists the package among its dependencies. Hedge School keeps `#lib/*` for its own files. A
   package imports its own files by relative paths, and another package by its name.
6. **The tests and the checks run in each package:** `npm run check` (TypeScript's `tsc`, which checks the runes'
   modules too) and `npm test` (Node's test runner, as Hedge School's). The workflows run them for every package beside
   Hedge School's (`--workspace=packages`). A package's tests use a test game unlike Enclosure: one move a turn, its
   moves as words. Hedge School's tests check Enclosure through the packages: they show that its behaviour did not
   change.
7. **The move goes in stages,** each a commit of pure renames (`git mv`), then the commits of the edits. Each stage
   ends with the checks of design 26 item 2: `npm run engine`, the unit tests, the type check, the build and the
   layout test.
   1. The engine and the storage.
   2. The analysis, with the game interface.
   3. The documents: this one, design 26 and the paths in the others.
8. **No file comes back at a moved path.** A later branch rebased over the move must still see each moved file as a
   rename. So Hedge School's new files have new names (`review/enclosure.ts`). Two modules that stay in Hedge School
   export the general part that moved out of them, so that their importers do not change: `analysis/engineSettings.ts`
   (the settings' general part, with a game's own settings for Hedge School's networks) and `game/store.ts` (the kept
   tree's shape, and the store of games for Hedge School's records, ids and keys, with the review marks).
9. **The views in a package, on two boards.** `@abstractclass/review` (`packages/review`) holds the review's and the
   Analysis board's view (`ReviewView.svelte`) and its parts: the charts, the labels' badges, the players' cards and
   their row, the move list's look, the step bar, the win bar, a line's drawing, the line that an image draws, and the
   area map's styles. Its style (`review.css`) holds the view's colour tokens in both themes (the quality labels', the
   last move's, the score line's, the engine's, the candidates' and the badges' text), the one-column variant, the gleam
   of work in progress (`bar-glider`) and the step bar's dock (`.step-dock`). The general controls that the view uses
   (the main button, the icon button, the dialogs and the keys' lists) are in `@abstractclass/site`'s `site.css`. A site
   gives the board's colour (Tailwind's `board`, from `--board-bg`) and the second number's line (`area`, from
   `--area`). The split happened on Blueprints' board, the first board of a second game (Cyanotype, design
   33, in place of a rehearsal game on Connect-4's board). The view's game interface (`packages/review/src/game.ts`,
   `ViewGame`) extends the game interface (item 2), and its types (`ViewTypes`) extend `GameTypes`. A site gives one
   object, and its pages give it to the view (the prop `view`). Hedge School's is `src/lib/review/enclosureView.ts`. The
   seams:
   - **The board** (`Board`): the site's component, with the view's props (`BoardProps`). They are the position, the
     move that led to it (`last`: the board draws what it did, Enclosure's cut or Blueprints' captured cells), the
     candidates (move, rank, note), the candidate pointed at from outside the board or else the pinned one
     (`pointed`), the line (each move with its mover, and its `step` once the rules have played it), the shape of the
     line's numbers (circles, or the threat's triangles), the move shown faintly (`preview`), the labels' marks, the
     layers, the player's own moves, the area map and the notes. `pointed` has one name and one meaning on both
     boards: Hedge School's board takes it as its prop `highlight`, and Cyanotype's as its prop `pointed`, which
     was `pinned`. The area map's switch and legend are a snippet that the board places (`mapControls`): Enclosure's
     board puts them in its empty margin above its top row. The skeleton shows the game's empty board (`EmptyBoard`).
   - **The player's own moves** (`input`, `inputStatus`, `clicks`): the game makes its own input. The view resets it
     and gives it the position's rules, and only the game's board reads the rest. The game says what a move begun
     needs next, for the status line, and lists its clicks for the list of keys and clicks.
   - **A move in the lists:** its notation with the game's marks (`notation`: Enclosure's cut mark), a line's move with
     its mark once the rules have played it (`lineNotation`), its shape (`Shape`: Enclosure's pill along the edge), and
     the widths of its text (`moveText`, `nameText`). The turn numbers come from the game interface's `turn`.
   - **Who plays each move** (`lineMovers`, `movesLeft`), from the turn structure, and what the board draws after a
     move of the game's tree (`treeStep`).
   - **The players:** the names and the colours are every game's (the glossary: Blue moves first). They are the
     package's `PLAYER_NAME` and `@abstractclass/site`'s colours. The cards show the score, and the game's second
     number when it has one (`second`: Enclosure's area, which the cards, the Advantage chart and an image's caption
     show).
   - **The texts:** the game's word for a move (`words`), the game's end (`ending`), its format of a margin
     (`fmtMargin`: Enclosure's one decimal, "27.5", and Blueprints' whole points, "24", or "24.5" from a half komi)
     and the move list's notes (`shortNote`, `turnShortNote`). The texts of the game's own parts come with each part.
   - **The result by the scores:** one rule and one text for every game, in `game.ts`. The rule is the record's: the
     margin rounded to six decimals, as a record writes it (`r+377.651497`), and a draw when that is 0
     (`resultOfScores`). Enclosure's areas are exact rationals, so a margin can be any number (design 24, "Whole
     points"). A win by 0.03 is a win, and the rounding takes away only the error of a floating-point sum. A record's
     result by the scores (`b+28.5`, `0`) takes the same rule (`resultOfRecord`). The words are "A draw", or the winner
     and the margin with no unit: "Blue won by 28.5" (`resultText`, with the game's `fmtMargin`). A margin that one
     decimal writes as 0.0 takes as many decimals as it needs, up to six: "Red won by 0.03" (`smallMargin`, in each
     game's format). The review uses them in each game's `ending` (`endingWords`: the result, a resignation, a forfeit,
     or no end yet), in the board's line at the game's end, and in the chart's result and the final margin. Practice
     uses them in its stored result and its outcome (`@abstractclass/practice`'s `scoreResult` and `practiceOutcome`),
     and in each site's line at the game's end.
   - **The display settings and the sounds:** the site keeps the settings under its own key (`display`), and lists its
     board's own layers (`layers`: Enclosure's regions before the area map's settings, and its invincible edges after
     them). The sounds (`sounds`) have the site's settings and the game's sound for each move (Enclosure's cut has its
     own).
   - **The site's engine and tools:** its networks (`networks`), and its tools that a site can leave out: the area
     map's points and the board's state now (`map`), the image of a line (`image`) and the opening book (`book`, in
     Hedge School's early edition). The view shows no tool that the site leaves out. The page's own menus go in the
     step bar (`tools`, a snippet that takes the labels' unit): the Export menu, and the Analysis board's New menu.
   - **The comparison of two moves is the game's** (`equal`): the view compares the engine's moves with it (the
     candidates, their twins, a line's steps). The engine's queries and the stored results know a move by its name.
     Two of Blueprints' moves with different names can give one position (design 33, item 9). So a game can give the
     key of the position after a move (`afterKey`). The review then takes the moves with one key as twins of one
     candidate (`withTwins`), and the tree takes them as one node. Enclosure gives no key: two names are two moves.
   - **One type for the game:** Hedge School's `Enclosure` (`enclosure.ts`) extends `ViewTypes`, so that the review
     (`Review<Enclosure>`), the analysis and the view take one type. The view takes the game's types from `view` alone
     (TypeScript's `NoInfer` on its other props).
10. **The import's frame in a package of its own.** Cyanotype takes strategyjam.org's games of Blueprints as Hedge
    School takes its games of Enclosure (designs 11 and 22, design 33). So the parts of Hedge School's import that are
    not Enclosure's moved out of its `src/lib/game/` into `@abstractclass/import` (`packages/import`), as pure renames
    first: the bookmarklet (`bookmarklet.ts`), the userscript (`userscript.ts`), the page code's frame
    (`pageCode.ts`), the hash after the `#` (`importHash.ts`) and the import's events (`importEvents.ts`). Each takes
    the site's parts as parameters:
    - **The page code** (`PageCode`): an object of the site's self-contained functions, which the tools carry as text.
      Its `read` reads the page on a click. It gives a game (an id, its record and the position that the page shows),
      or what to tell the player. When the page lacks the game's moves and another address has them (Hedge School's
      meaf.us watcher's view), it also gives that address. The tools' own code shows the message, opens the import
      page, loads the address that `read` gives, and in the userscript opens the game once the reloaded page has its
      moves. So meaf.us's case stays in Hedge School's page code, and the frame knows no game site.
    - **The tools** (`UserscriptSite`, one object for both): the site's name, the tools' own name, its id (the name of
      the userscript's files, of the elements that it adds and of its key), the button's picture, the button's place
      on each game site, and the header's description, author, homepage and pages (`@match`). The bookmarklet takes
      the two names and the page code. The frame makes the words that name the tools from the two names: "the
      Review in Hedge School bookmark", "the Hedge School button", and the button's label, "Open this game in Hedge
      School".
    - **The events:** the site's analytics (`track`), and a game's length as the site's range. Each site lists its
      import's sources, and names a tool's source (`toolSource`).
    - **What stays in each site:** Hedge School's `src/lib/game/tools.ts` (the page code that reads meaf.us and
      strategyjam.org, the tools' names, the collie, the button's places and `toolSource`) and `sources.ts` (its
      sources, with meaf.us's tools and Constellation's export, and the events with its analytics). Its page readers
      and records (`meafPage.ts`, `meaf.ts`, `strategyjamPage.ts`, `strategyjam.ts`) stay as they were. Cyanotype's
      are its `src/lib/game/tools.ts` and `strategyjamPage.ts` (design 33).
    - **Hedge School's tools work as before.** Its routes keep their addresses (`/bookmarklet.js`,
      `/hedge-school.user.js`, `/hedge-school.meta.js`). The userscript's header is the same but for the build's time.
      The code of the bookmarklet and of the userscript changed in its frame: the site's parts come as data, and the
      page code has `read`. The two builds did the same on mock pages of meaf.us and strategyjam.org (the log entry
      gives the check). The userscript's code version is a hash of the files that make the code, so it changed once: a
      player whose Tampermonkey has not yet taken the update sees the notice to update it once. The bookmark's loader
      takes the site's name as a third argument. A bookmark made before keeps its own loader, with the same version,
      so no player is asked to drag it again.
    - **Each site has its own reader of strategyjam.org's game page.** Hedge School's and Cyanotype's
      `strategyjamPage.ts` read the same props of the page, and give different games: Enclosure's and Blueprints'. They
      stay each site's, as Hedge School's tests check its reader as it is. One reader can serve both later, with both
      sites' tests.
11. **A new feature starts in a package.** A feature that is not one game's alone goes into `packages/` from its
    first commit, behind the game interface, and the same work puts it into each site: the site's part of each game
    and the page that shows it. A site keeps only its game's own parts (the board and its input, the record, the
    notation, the reader of a game site's page) and the pages that connect the shared parts. A feature that only one
    game has, such as Enclosure's area map, stays in that game's site. Code that a site copied from another site moves
    into a package too: abscls-8tl1.58 (the logo's files and the Export menu) and abscls-8tl1.15 (Practice's page
    parts).

## Why

- **The second site is real now.** Design 26 waited for a second game to show the shared parts' edges. The jam
  game's rules come too late for it to show them before the jam, so the edges come from reading Hedge School's code:
  the parts that compute with the engine's replies and not with Enclosure's rules.
- **Move, do not copy:** one copy of the review's rules (KaTrain's schedule, the labels, the cache) for every site.
  A copy would drift from Hedge School's.
- **Three packages:** the engine needs no game and no storage. A site that only plays the bot would take the engine
  alone. The storage serves the site's own data too (its theme, its games), not only the analysis.
- **Generic types, not one site-wide declaration** (as SvelteKit's `App` namespace types a site): a declaration
  types one game in each type check. The package's own tests could then not check a game unlike Enclosure.
- **The game's own comparison:** a move's value is the site's (Enclosure's are tuples). A comparison of names would
  give the same answers, at the cost of a name for each comparison: the review compares moves for each edge at each
  batch of results.
- **The field names stay:** a new name for a stored field makes every stored result and every review file
  unreadable. The cache's shape would change (design 05), and each player's stored analyses would go.
- **The views on two boards:** the view's seams with the game are many, and only a second board shows their right
  shape (the rule of three, design 26). Blueprints' board shaped each seam beside Enclosure's. The view is where a
  change of Hedge School's behaviour would show, so its split is checked page by page against the build before it
  (decisions/product.md, "The review's view in packages/review").
- **The import in a package of its own, not in `@abstractclass/site`:** the site's package holds the frame that a
  site's pages draw: styles and Svelte components, which `svelte-check` checks. The import's frame draws none of the
  site's pages. Its tools run on another site's page, as text that must stay self-contained, and its hash and events
  are plain TypeScript, which `tsc` and Node's tests check. The record has a package of its own for the same reason
  (item 1).
- **The check of a deployed site in `@abstractclass/site`, not in the engine package:** most of its checks are of the
  frame that each page shows (the footer's version, the header's links, the robots' header, the 404 page and the
  build's cache), and the rest read the engine's files. Beside `fetch-engine.mjs`, the engine package would have to
  know the sites' frame. In the site package, the check uses the engine package, as the review's and the practice's
  packages do. It draws no page, but one script does not need a package of its own.
- **A feature in a package from the start:** a feature first built inside one site is tied to that site's game.
  Cyanotype took each of Hedge School's features in three steps: the move out of Hedge School into a package, with
  Hedge School changed and checked again, then Blueprints' part, then the feature in Cyanotype's pages. A feature
  that was in a package already took a few lines in Cyanotype (the engine pool 32, Early Access 38). One that was in
  Hedge School took about as much work as a new one (the player's games 1,566 lines in Cyanotype, beside 1,058 in
  Hedge School and 1,170 in the packages). In a package from its first commit, a feature costs its game parts only,
  and a third game's site gets it with no move.
- **The site's page code decides, and the frame acts:** the flows that differ by game site (meaf.us's watcher's view,
  the login that strategyjam.org asks for) are each site's knowledge. With `read` in the site's page code, the frame
  has one way to read a page, and a new game site changes only the site that reads it.

## Alternatives

- **One package for all:** fewer names, but every site that takes the engine takes the analysis and its game
  interface too.
- **Moves as names in the shared code:** no move type to pass, but a stored analysis holds Enclosure's tuples. The
  cache's shape would change, and every stored result would go.
- **The views now, with the rest:** the jam site would get a whole review at once, but the view's game interface would
  rest on one board, conflict with two variations in flight, and risk Hedge School's behaviour.
- **A copy in the jam site:** no risk to Hedge School, and two reviews that drift apart.
- **The import's frame in `@abstractclass/site`:** one package fewer, but a package of components would also hold code
  that runs on other sites' pages, and its check would not be the import's.

## Consequences

- **The tuning is the packages', the same for every site:** the search budgets (`SWEEP_VISITS` 32, `LABEL_VISITS`
  256, `DEEP_VISITS` 1,024, measured on Enclosure: design 05), a hard position's complexity (`HARD` 0.10, from
  Enclosure's archive: design 14), and how far below the first choice a candidate shows in points (3 times the game's
  `scoreScale`, KaTrain's 3 Go points). A new game may need other values. A change of one of these constants changes
  Hedge School's review too, so a game that needs another value first makes it the game's, as `scoreScale` is, with
  Enclosure's value as the default. The labels' bands are chess.com's, the same for every game (design 10).
- **What the engine package takes from the site's build:** the engine's files under `/engine/` with their manifest
  (the package's `fetch-engine.mjs`, from the site's `engine.lock.json`), ONNX Runtime Web in its form that takes its
  WebAssembly from the page (the Vite condition `onnxruntime-web-use-extern-wasm`), and the workers as modules. Each
  site's `vite.config.ts` sets the last two: Hedge School's, and Cyanotype's, which copies both since abscls-8tl1.28.
  The engine package and the practice package name `onnxruntime-web` as a peer dependency: the site's copy, whose
  WebAssembly the fetch script stores. Both sites' locks have a GPU module, so the fetch script stores it for both.
- **The networks' sizes come from the site's lock:** the evaluators of the GPU and of the threaded bot's CPU workers
  need them (the engine library's `createOrtEvaluator` and `createCpuEvaluator`). The release's manifest gives them
  (`engine.sizes`), and the site's `engine.lock.json` copies them (`sizes`), as it copies the protocol. The fetch
  script puts them in the site's manifest, and the GPU worker and the bot's worker pass them on
  (`packages/engine/src/library.ts`, `sizesOption`). A lock without them gets Enclosure's, the library's default:
  Enclosure's releases give none, and their library takes no such option. So Hedge School's evaluators start as
  before, and Cyanotype's take Blueprints' sizes (a board of 67 and 6 policy channels). The threaded bot's CPU form
  also keeps to the evaluator's `maxThreads` where the lock gives it (Blueprints' 128).
- **A jam game's site has everything that Hedge School has,** the GPU path too. Each gap has an issue that holds the
  decision about it: to build the feature, or to leave it out. The work on a site never leaves out a feature without
  that decision. The site's design lists the whole comparison with Hedge School (by the engine lock's kinds, by page,
  by the parts of `src/lib`, by setting and by the site's other files), each gap with its issue, as design 33 does
  ("The gaps from Hedge School"). The check `engine-kinds` of `npm run check:all` (`scripts/engine-kinds.mjs`) takes
  each folder of `apps/` with a `package.json`, but Hedge School's, as a jam site. Each kind of Hedge School's engine
  lock is in the jam site's lock, or in `engine.lock.exceptions.json` beside it with its issue (`abscls-…`). A jam
  site with no lock has none of the kinds. The check also fails on a stale exception, a kind that the lock has now.
- **Paths in the documents:** a path that starts with `packages/` starts at the repository's root. A path to Hedge
  School's files starts at `apps/hedgeschool`, as before ([docs/README.md](../README.md)).
- **A change to a package is a change to every site that uses it.** Its tests and each site's checks run for it.
- **A new jam site's deploy job starts preview-only,** so that a release of another site does not launch it. Its
  launch is one commit, when the owner says to launch the site ([hosting.md](../hosting.md), "The launch switch").
- **The engine's protocol:** each site's code is written for one protocol, and the engine package refuses a module of
  another minor version (`protocol.ts`, `speaksProtocol`). Hedge School's is 0.6.1, the package's `PROTOCOL`. A site
  whose engine speaks another names its protocol in its `engine.lock.json`, and the manifest carries it: Cyanotype's
  0.8.0, with the search of the root's views and the position check (design 33, "The engine's files"). The fields of
  `describe` are each game's own: Enclosure's are in Hedge School's `src/lib/engine/position.ts`. The position check
  is both games' (`PositionCheck`, and `checkProblem`, which gives a site's lead and then each reason as a sentence),
  and each game's reason names its own places: Enclosure's edges, Blueprints' hexes.

## Where it is

- `package.json` at the root: the workspace (`apps/*`, `packages/*`).
- `packages/engine/`, `packages/storage/`, `packages/analysis/`: each with its `package.json` (name, `exports`,
  scripts), `tsconfig.json` and `src/`. `packages/site/` holds the sites' frame (design 33, item 4), on the same
  rules. Its check is `svelte-check`, since it holds components.
- `packages/record/`: the game record's frame (design 33). It also holds what both sites do with a set-up start: a
  record's start given apart (`withStartTag`), the place of a problem in a pasted record (`pastedError`), the check that
  the record's own start is the one given (`givenStartProblem`) and the review's refusal of a record from a set-up start
  (`setUpRefusal`). `packages/analysis/src/turns.ts`: the turns of one move, then two, for a game's `turn`, with the
  mover from the move count (`moverOf`), the last count (`LAST_COUNT`) and the first count with a given player to move
  (`countWithMover`), which both board editors use.
- `packages/analysis/src/share.ts`: the format of a link that carries a game's tree (design 13, item 8), with each
  site's moves as a parameter (`MoveCode`). `boardLink.ts`: the Analysis board's link (design 21). `files.ts`: how a
  site reads its files, the results that belong in a file, a file's kind, and the analysis file, in each site's
  format. `reviewFile.ts`: the review file (design 13), with each site's part as a parameter (`reviewFiles`). Hedge
  School's and Cyanotype's `src/lib/game/reviewFile.ts` give their parts. `annotate.ts`: the annotated record (design
  13), with how each game writes a move. Hedge School's `src/lib/game/share.ts`, `board.ts`, `analysisFile.ts` and
  `src/lib/review/annotate.ts` give Enclosure's parts, with the exports that its code and tests use.
- `packages/analysis/src/storedReview.ts`: a review from the store alone, with no search (designs 13 and 20): its
  first steps (`startStored`, `openStored`), the review snapshot (`openSnapshot`) and the annotated record of a stored
  game (`annotatedFromStore`), with each site's step after the rules. Hedge School's and Cyanotype's
  `src/lib/review/storedReview.ts` and `exportText.ts` give their parts.
- `packages/analysis/src/games.ts`: the store of the player's games (Hedge School's designs 11 and 22), with each
  site's record's reader, a game's id and the key of its last review as parameters (`gameStore`), and the marks of a
  finished review (design 13). `reviewLock.ts`: one tab reviews a game at a time (design 11). `settings.ts`: the
  engine settings' general part, and a game's own network and depth, with each site's networks as a parameter
  (`ownSettingsOf`, design 09). Hedge School's `src/lib/game/store.ts` and `src/lib/analysis/engineSettings.ts` and
  Cyanotype's `src/lib/game/store.ts` and `src/lib/analysis/engineSettings.ts` give their parts.
- `packages/analysis/src/game.ts`: the game interface. `packages/analysis/src/testing/game.ts`: the test game, with
  the rules and a search's reply for a test's pool. `packages/analysis/src/testing/page.svelte.ts`: a page for the
  engine session's tests.
- `apps/hedgeschool/src/lib/review/enclosure.ts`: Enclosure's game and its part of the review, and Enclosure's types
  for the view.
- `packages/review/` (`@abstractclass/review`): the view (`ReviewView.svelte`) and its parts, on the same rules. Its
  check is `svelte-check`. `src/game.ts`: the view's game interface (item 9), the players' names, the score's
  format, the result by the scores and its words, and the class of a number in a move's shape (`DIGITS`).
  `src/ownership.ts`: the area map's styles and marks. `src/lineImage.ts`: the line that an image draws, and its
  animation's frames. `src/ReplaceAnalysis.svelte`: the Analysis board's question before a line brought replaces the
  analysis kept in the browser. `src/GameList.svelte`:
  the Review tab's list of the player's games, with each game's Export and Delete and the line on what the browser
  keeps, with each site's rows (Hedge School's and Cyanotype's `src/lib/review/ReviewHome.svelte`), and the
  question before a Delete (`@abstractclass/site`'s `ConfirmDialog.svelte`). `src/ImportDialog.svelte`: the Analysis
  board's Import (design 21), a position, moves or both pasted, with each site's examples, board editor address and
  check (`onimport`). `src/ExportMenu.svelte`
  and `src/exports.ts`: the Export menu, with each page's entries (design 13), and the entries that both sites' pages
  share: the Analysis board's, the review's link, the review file and the annotated record. `src/NewMenu.svelte`: the
  Analysis board's New menu, with the ways that a site has (design 21). `src/PositionCheckStatus.svelte`: what the
  board editor says of its position, the engine's refusal, or whether a game can reach it with the engine's reasons,
  and each site's word for the places that the board marks (design 21, item 10). `src/howReviews/`: the sections that
  the two sites' pages "How a review works" share (the searches, the quality labels with their bands, Best and Great,
  the accuracy, the hard positions and the meter), with the numbers from the analysis package's code, and each site's
  words for a move ("edges" on Hedge School) and for the other player ("enemy") as props (design 33, "The review and
  the Analysis board", item 13). `src/review.css`: the package's Tailwind source and
  the view's style (item 9), which a site's style imports after `site.css`.
- `apps/hedgeschool/src/lib/review/enclosureView.ts`: Enclosure's part of the view, which the review's and the
  Analysis board's pages give it. Its components: `EnclosureBoard.svelte` (Hedge School's board with the view's
  props, and the area map's margin), `EdgePill.svelte` (an edge's shape in the lists) and `EmptyBoard.svelte`.
  `enclosureMap.ts`: the board's state for the area map, and a point's numbers. `enclosureImage.ts`: an image's
  caption and file name. `src/lib/book/ReviewBookTable.svelte`: the book's table in the view.
- `packages/site/src/`: the site's general controls that the view uses (`Icon.svelte`, `Toast.svelte`,
  `SettingChoice.svelte`, `SettingToggle.svelte`, `settings.ts`, `Swatch.svelte`, `side.ts`) and the page's scroll
  (`pageScroll.ts`). `ConfirmDialog.svelte`: the question before an action that the player cannot undo (design 11), for
  a game's Delete in the Review tab's list and for the privacy page's delete. Its action takes `btn-danger` from
  `@abstractclass/practice`'s style, which both sites import. `download.ts`: a file that a page gives the player to
  save. `release-check.mjs`: the checks of a deployed site that both sites share, moved from Hedge School's
  `scripts/release-check.mjs`. Each site's `scripts/release-check.mjs` runs them with its addresses and header, and adds
  its own checks ([hosting.md](../hosting.md), "Deploy, check and roll back"). It runs in Node, and it reads the
  engine's files with the engine package's `artifacts.ts`. It is the one file of the site package that imports the
  engine package, and no page imports it. So the site package depends on the engine package, and the frame's code in the
  browser still has none of the engine.
- `packages/import/` (`@abstractclass/import`, item 10): `bookmarklet.ts`, `userscript.ts` and `pageCode.ts` (the
  tools' frame), `importHash.ts` (the hash after the `#`) and `importEvents.ts` (the import's events), with tests on a
  test site whose games are words. `ToolChoice.svelte`: the import page's choice for a tool's game, between the review
  and the Analysis board, with each site's words (design 33, "How a game comes in from strategyjam.org"), and
  `import.css`, which lets Tailwind find its classes. `openReview.ts`: the review's opening of a game that a way in has
  kept (the import page's, a shared review's, a partner's), by the game's id. `apps/hedgeschool/src/lib/game/tools.ts`
  and `sources.ts`: Hedge School's parts.
- `packages/engine/src/node-engine.mjs` and `fetch-engine.mjs`: the engine in Node, and the fetch of a site's engine
  files (`fetchEngine`). Each site runs it in its own folder (`npm run engine`) by its `scripts/engine.mjs`, which
  gives the step its record's komi limit. `practice-check.ts`: the engine step's check of the practice modules'
  `minPlayoutsPerThread` (design 24, item 14), of their komi cap against the site's limit (design 24, item 15), and
  of Practice's CPU form against the one-thread bot (design 24, item 14). `lock-check.ts`: the engine step's checks
  of the lock, its numbers against the releases' manifests, its files as one release's set (one release of the lock
  names every file with the lock's entry) and its engine modules from one engine commit (design 03, "The engine's
  artifacts"). `release-manifests.ts`: the manifests of the lock's releases, which the step reads from its download
  cache, or downloads once. `protocol.ts`: the protocol that each site's
  code is written for (Hedge School 0.6.x, Cyanotype 0.8.x with the root's views and the position check), from the
  site's `engine.lock.json` and its manifest.
- `packages/practice/` (`@abstractclass/practice`): `practice.ts` (the practice's shared part, the way in from a
  position too: `practiceHref`, `broughtLine`, `newPractice` and `practiceFrom`, with tests on a game of words),
  `PracticeCard.svelte` (the settings card), `PracticeFrame.svelte` (the game's layout: a square board or one that fills
  the room), `ReplaceGame.svelte` (the question when a start comes while a game is in progress), `bot.ts`,
  `botWorker.ts` and `botMessages.ts` (the page's side of the practice bot and its worker), `botForms.ts` and
  `botFormsWorker.ts` (the bot's forms, and their worker module with the threaded bot's evaluators), and `practice.css`
  (the package's Tailwind source). `practice.css` also holds the utility `btn-danger`, the style of a button that ends
  something for good. `btn-danger` reads the view's `--blunder-fill`. The site package must not read the view's tokens,
  so `btn-danger` is not in `site.css`. The package's check is `svelte-check`.
  `apps/hedgeschool/src/lib/practice/hedgefund.ts`: Hedge School's part.
- `packages/measure/` (`@abstractclass/measure`): `measure.ts` (the plan and the results block, with its unit tests),
  `device.ts` (the device's facts), `run.svelte.ts` (the run: each pool size, then the GPU part), `MeasurePage.svelte`
  (the page) and `measure.css` (the package's Tailwind source). Each site's `src/routes/lab/measure/+page.svelte`
  gives its part. The package's check is `svelte-check`.
- `.github/workflows/tests.yml` and `deploy.yml`: the packages' checks.

## Log

[decisions/product.md](../decisions/product.md), "The analysis and the review in packages/" (2026-10-19), "The
review's view in packages/review" (2026-10-25), "The review's styles in packages/review and packages/site"
(2026-10-26), "The import's frame in packages/import, and Drawing Board's tools" (2026-10-27), "Cyanotype's
review takes two moves that give one position as one move" (2026-11-05), "Cyanotype on Stamp Duty 0.2, with the GPU
and the threaded bot" (2026-11-07), "Cyanotype refuses a set-up start before the click, and shared lookups"
(2026-11-08), "Cyanotype's review files, as Hedge School's" (2026-11-08), and "Cyanotype's review snapshot and
annotated record from the store" (2026-11-08).
[decisions/architecture.md](../decisions/architecture.md), "A launch switch in code replaces the approvals"
(2026-11-06), and "A new feature starts in a package" (2026-11-08).
