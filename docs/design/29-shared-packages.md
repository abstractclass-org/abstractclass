# The shared packages: the engine, the storage and the analysis, behind a game interface

**Status:** in force. Built: the engine, the storage, the analysis and the review's view are in `packages/`. The
view's game interface rests on Hedge School's board and on Blueprints' (item 9). Drawing Board gives Blueprints' part
with its review (abscls-8tl1.7).
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
   styles, the header's bar and the page's area, the theme, the page's metadata and the pages' text style. Design 33
   moved it out of Hedge School (its item 4). A sixth, `@abstractclass/review` (`packages/review`), holds the review's
   and the Analysis board's view, with the view's game interface (item 9). The site's general controls that the view
   uses (the icons, the toast, the settings' parts, the players' colours and their swatch) and the page's scroll moved
   into `@abstractclass/site` with it.

   The engine package knows no game. The analysis package knows a game only through the game interface. No package
   imports a site.
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
   interface PositionInfo { player: Player; over?: boolean; scores: [number, number]; count?: number }
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
   (the settings' general part) and `game/store.ts` (the kept tree's shape).
9. **The views in a package, on two boards.** `@abstractclass/review` (`packages/review`) holds the review's and the
   Analysis board's view (`ReviewView.svelte`) and its parts: the charts, the labels' badges, the players' cards and
   their row, the move list's look, the step bar, the win bar, a line's drawing, the line that an image draws, and the
   area map's styles. Its style (`review.css`) holds the view's colour tokens in both themes (the quality labels', the
   last move's, the score line's, the engine's, the candidates' and the badges' text), the one-column variant, the gleam
   of work in progress (`bar-glider`) and the step bar's dock (`.step-dock`). The general controls that the view uses
   (the main button, the icon button, the dialogs and the keys' lists) are in `@abstractclass/site`'s `site.css`. A site
   gives the board's colour (Tailwind's `board`, from `--board-bg`) and the second number's line (`area`, from
   `--area`). The split happened on Blueprints' board, the first board of a second game (Drawing Board, design
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
     boards: Hedge School's board takes it as its prop `highlight`, and Drawing Board's as its prop `pointed`, which
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
   - **The texts:** the game's word for a move (`words`), the game's end (`ending`) and the move list's notes
     (`shortNote`, `turnShortNote`). The texts of the game's own parts come with each part.
   - **The display settings and the sounds:** the site keeps the settings under its own key (`display`), and lists its
     board's own layers (`layers`: Enclosure's regions before the area map's settings, and its invincible edges after
     them). The sounds (`sounds`) have the site's settings and the game's sound for each move (Enclosure's cut has its
     own).
   - **The site's engine and tools:** its networks (`networks`), and its tools that a site can leave out: the area
     map's points and the board's state now (`map`), the image of a line (`image`) and the opening book (`book`, in
     Hedge School's early edition). The view shows no tool that the site leaves out. The page's own menus go in the
     step bar (`tools`, a snippet that takes the labels' unit): the Export menu, and the Analysis board's New menu.
   - **The comparison of two moves is the game's** (`equal`): the view compares the engine's moves with it (the
     candidates, their twins, a line's steps). The game's tree, the engine's queries and the stored results know a
     move by its name, so there two names are two moves. Two of Blueprints' edits can give the same hand (design 33,
     item 9): `equal` takes no position, so it cannot compare them by their hands yet (abscls-8tl1.7).
   - **One type for the game:** Hedge School's `Enclosure` (`enclosure.ts`) extends `ViewTypes`, so that the review
     (`Review<Enclosure>`), the analysis and the view take one type. The view takes the game's types from `view` alone
     (TypeScript's `NoInfer` on its other props).

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

## Alternatives

- **One package for all:** fewer names, but every site that takes the engine takes the analysis and its game
  interface too.
- **Moves as names in the shared code:** no move type to pass, but a stored analysis holds Enclosure's tuples. The
  cache's shape would change, and every stored result would go.
- **The views now, with the rest:** the jam site would get a whole review at once, but the view's game interface would
  rest on one board, conflict with two variations in flight, and risk Hedge School's behaviour.
- **A copy in the jam site:** no risk to Hedge School, and two reviews that drift apart.

## Consequences

- **The tuning is the packages', the same for every site:** the search budgets (`SWEEP_VISITS` 32, `LABEL_VISITS`
  256, `DEEP_VISITS` 1,024, measured on Enclosure: design 05), a hard position's complexity (`HARD` 0.10, from
  Enclosure's archive: design 14), and how far below the first choice a candidate shows in points (3 times the game's
  `scoreScale`, KaTrain's 3 Go points). A new game may need other values. A change of one of these constants changes
  Hedge School's review too, so a game that needs another value first makes it the game's, as `scoreScale` is, with
  Enclosure's value as the default (the template, abscls-8tl1.2). The labels' bands are chess.com's, the same for
  every game (design 10).
- **What the engine package takes from the site's build:** the engine's files under `/engine/` with their manifest
  (Hedge School's `scripts/fetch-engine.mjs`), ONNX Runtime Web in its form that takes its WebAssembly from the page
  (the Vite condition `onnxruntime-web-use-extern-wasm`), and the workers as modules. Hedge School's `vite.config.ts`
  sets the last two. The engine package names `onnxruntime-web` as a peer dependency: the site's copy, whose
  WebAssembly the fetch script stores. A second site copies these until the template moves them into the package.
- **Paths in the documents:** a path that starts with `packages/` starts at the repository's root. A path to Hedge
  School's files starts at `apps/hedgeschool`, as before ([docs/README.md](../README.md)).
- **A change to a package is a change to every site that uses it.** Its tests and each site's checks run for it.
- **The engine's protocol:** the engine package speaks the protocol of Enclosure's site build (0.6.1). A jam game's
  browser build speaks the same (abscls-zdbf). The fields of `describe` are each game's own: Enclosure's are in
  Hedge School's `src/lib/engine/position.ts`.

## Where it is

- `package.json` at the root: the workspace (`apps/*`, `packages/*`).
- `packages/engine/`, `packages/storage/`, `packages/analysis/`: each with its `package.json` (name, `exports`,
  scripts), `tsconfig.json` and `src/`. `packages/site/` holds the sites' frame (design 33, item 4), on the same
  rules. Its check is `svelte-check`, since it holds components.
- `packages/record/`: the game record's frame (design 33). `packages/analysis/src/turns.ts`: the turns of one move,
  then two, for a game's `turn`.
- `packages/analysis/src/game.ts`: the game interface. `packages/analysis/src/testing/game.ts`: the test game, with
  the rules and a search's reply for a test's pool. `packages/analysis/src/testing/page.svelte.ts`: a page for the
  engine session's tests.
- `apps/hedgeschool/src/lib/review/enclosure.ts`: Enclosure's game and its part of the review, and Enclosure's types
  for the view.
- `packages/review/` (`@abstractclass/review`): the view (`ReviewView.svelte`) and its parts, on the same rules. Its
  check is `svelte-check`. `src/game.ts`: the view's game interface (item 9), the players' names, the score's
  format, and the class of a number in a move's shape (`DIGITS`). `src/ownership.ts`: the area map's styles and
  marks. `src/lineImage.ts`: the line that an image draws, and its animation's frames. `src/review.css`: the
  package's Tailwind source and the view's style (item 9), which a site's style imports after `site.css`.
- `apps/hedgeschool/src/lib/review/enclosureView.ts`: Enclosure's part of the view, which the review's and the
  Analysis board's pages give it. Its components: `EnclosureBoard.svelte` (Hedge School's board with the view's
  props, and the area map's margin), `EdgePill.svelte` (an edge's shape in the lists) and `EmptyBoard.svelte`.
  `enclosureMap.ts`: the board's state for the area map, and a point's numbers. `enclosureImage.ts`: an image's
  caption and file name. `src/lib/book/ReviewBookTable.svelte`: the book's table in the view.
- `packages/site/src/`: the site's general controls that the view uses (`Icon.svelte`, `Toast.svelte`,
  `SettingChoice.svelte`, `SettingToggle.svelte`, `settings.ts`, `Swatch.svelte`, `side.ts`) and the page's scroll
  (`pageScroll.ts`).
- `.github/workflows/tests.yml` and `deploy.yml`: the packages' checks.

## Log

[decisions/product.md](../decisions/product.md), "The analysis and the review in packages/" (2026-10-19), "The
review's view in packages/review" (2026-10-25), and "The review's styles in packages/review and packages/site"
(2026-10-26).
