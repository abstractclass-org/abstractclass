# Cyanotype: Blueprints' site, on Hedge School's design

**Status:** in force. Built: the app (`apps/cyanotype`), with its checks in `npm run check:all`, its shell (the
header, the footer, the Home, About, Notation, Privacy and Notices pages, and the deploy job), and the notation and the
record, with the import of a strategyjam.org game as a record. The owner's step for the address is left
(abscls-8tl1.3). The board and the player's own moves are built, on positions that the engine's early build gave.
The review's view is in a package, on Hedge School's board and on Blueprints' (design 29, item 9). The tools for
strategyjam.org and the import page are built: the page opens the game that a tool sends in the review or the
Analysis board ("How a game comes in from strategyjam.org"). Their test on strategyjam.org waits for the owner
(abscls-8tl1.12). The site fetches Blueprints' first release, `engine-3ac5c2fc` (Stamp Duty 0.1, protocol 0.7.1, with
its practice bot), as Hedge School fetches its own ("The engine's files"). Practice against Stamp Duty (`/practice`)
is built ("Practice against Stamp Duty"). The review and the Analysis board are built (abscls-8tl1.7, "The review and
the Analysis board"), with no area map yet.
**Hedge School's features:** Cyanotype has every feature that Hedge School has, the GPU path too. Each gap has an
issue that holds the decision about it: to build the feature, or to leave it out. The work on the site never leaves
out a feature without that decision. "The gaps from Hedge School" lists each gap with its issue, and a gap with no
issue yet waits for one. The check `engine-kinds` of `npm run check:all` holds the engine lock to the same rule
(design 29, "Consequences").
**Decided:** 2026-10-25. Practice's layout and its bot: 2026-10-30. The review and the Analysis board: 2026-11-01. The
import page's choice: 2026-11-01. The name Cyanotype: 2026-11-04. Hedge School's features: 2026-11-05.

## Context

Blueprints is the game of strategyjam.org's Fall 2026 jam. Each jam game gets its own site in this repository
(design 26, design 29), with an Analysis board and a review. The plan was to build a template for such a site on a
rehearsal game (Connect-4) first, and to add the jam game's own parts when its rules came out. The rules are out
now, and the engine repository has ported them to KataGame (its `games/blueprints/`). Its network trains now. There
is no browser build of the engine yet.

The game, as the engine repository's `games/blueprints/README.md` gives it:

- An unbounded hex grid in axial coordinates (q, r). A cell is Normal, star or wall, and belongs to a player.
  (strategyjam.org's data stores a Normal cell's kind as `plain`.)
- Each player holds three blueprints: shapes of cells, reused at every placement. At the start, each is a star with a
  ring of six cells.
- A move places a blueprint on empty hexes touching the mover's own cells, or edits the hand: it moves one cell within a
  blueprint or between two of them. A placement captures every opponent cell touching it, except walls. The mover scores
  the opponent's stars captured, times the mover's own stars on the board before the move.
- Blue makes one move, then each player makes two moves a turn. The game ends after 120 moves. These are Enclosure's
  turns.

## Decision

1. **The names.** The site is **Cyanotype**, in `apps/cyanotype`. Its address is to be `cyanotype.abstractclass.org`,
   as Hedge School's is `hedgeschool.abstractclass.org`. The address, the Pages project and the DNS name are a step
   for the owner of the account (abscls-8tl1.3). The engine and its practice bot are **Stamp Duty**, as Hedge
   School's are HedgeFund. A cyanotype is the printing process that made blueprints: white lines on Prussian blue.
   The name belongs to Blueprints alone, and a more general name could fit many other games. Stamp duty is a tax on
   property, and a stamp is the game's main move.
2. **Hedge School's design, with Blueprints' parts.** Cyanotype has Hedge School's pages, layout, review, Analysis
   board, import and settings, as Hedge School's design documents give them. Only the game's own parts change: the
   board, the player's own moves, the notation and the record, the players' cards (the scores and the stars), the
   sounds, and the texts that name a move. A design document of Hedge School holds for Cyanotype, unless this
   document names a departure.
3. **No rehearsal game.** The view's split (design 29, item 9) happens on Blueprints' board, the first board of a
   second game. The work goes in this order:
   1. **Without the engine:** the app and its shell (its header, home, about, privacy and notation pages, its
      deploy job), the notation and the record, and the board (the cells, the hands, a move drawn on them).
   2. **The view's split** into a package, on Hedge School's board and Blueprints' board: `@abstractclass/review`, with
      the view's game interface (design 29, item 9). Cyanotype gives Blueprints' part of it with the review.
   3. **With the engine's browser build** (request 23): the review, the Analysis board, the import of a
      strategyjam.org game into them, and the player's own moves. The tools for strategyjam.org need no engine, and
      the import page needs its rules alone.
   4. **Later:** practice against Stamp Duty, lessons, puzzles and an opening book. The meaf.us tools stay Hedge
      School's: meaf.us plays Enclosure only.
4. **Move, do not copy.** A part that both sites use goes into `packages/`, as design 29 moved the engine, the storage
   and the analysis. This holds for the site's frame too (its header, its footer, its page metadata). A move keeps
   design 29's rules: pure renames first, Hedge School's behaviour unchanged, and its checks.
5. **The moves: strategyjam.org's strings, as they are.**
   - **A placement** is `K@q,r`: blueprint K (1, 2 or 3) with its anchor cell on the anchor hex (q, r). A blueprint's
     anchor cell is its first cell in reading order: the least r, then the least q. It is the cell (0, 0) of the
     blueprint's own frame. The anchor hex is in the board's axial coordinates. Their origin is between the two players'
     starting groups.
   - **An edit** is `I:q,r>J:q,r`: the cell at (q, r) of blueprint I moves to (q, r) of blueprint J. Both coordinates
     are in the blueprints' frames **as they are before the edit**. The rules put the two blueprints back in their
     frames only after the edit. So the string names one edit, also when the edit moves a blueprint's anchor cell
     (`2:0,0>2:1,2`), or puts a cell before it with a negative coordinate (`1:0,0>3:1,-1`). An empty blueprint takes
     a cell only at `J:0,0`.
   - **A pass** is `pass`: a player's clock ran out. The rules never offer it as a move.
   - **The board as the players see it:** pointy-top hexes, x = √3 (q + r / 2) and y = 1.5 r, with r down the
     screen. strategyjam.org draws its board so.
6. **A placement's capture mark:** `x` when it captures opponent cells, and `x+N` when it also scores N points
   (`2@-3,1x+24`). A placement that captures a star and scores 0 has `x` alone: the mover had no star on the board. No
   writer writes `+0`. The capture mark repeats what the position shows. A reader accepts a move with it or without
   it, and refuses a capture mark that the position does not confirm, as Hedge School's reader refuses `x` on an edge
   that cuts nothing. The quality marks (`?`, `!` and the others) come after it.
7. **The record: Hedge School's form** (its Notation page): the tags, with `Blue` and `Red` for the players, the turns
   with their numbers (1 to 61, as Enclosure's), the comments, the variations, the quality marks by turn, and the
   commands in comments (`[%eval]`, `[%clk]`). strategyjam.org numbers the moves (1 to 120). The record numbers the
   turns, because the review gives turns quality labels (design 10). A pass is one move, so the turns go on in twos
   after it. The record's frame moved out of Hedge School into `@abstractclass/record` (item 4): the game gives its
   moves' syntax and its marks as a parameter (`Notation`). Hedge School gives Enclosure's edges and its cut mark,
   Cyanotype Blueprints' moves and their capture marks. Hedge School's `src/lib/game/record.ts` stays at its path
   with its exports, as design 29's `engineSettings.ts` and `store.ts` do. So this move has no pure rename first: a
   rename would leave nothing at the old path, and no file comes back at a moved path (design 29, item 8). The turns of
   one move, then two (`turnFromCount`), are in the analysis package, beside the game interface's `turn`, because both
   games number them so.
8. **The move list** shows a move as strategyjam.org's move list does: the blueprint's number in a box, then the
   hex, then `+N` when the move scores, or a small `x` when it captures and scores nothing. An edit shows the kind of
   the cell that it moves. These are the glyphs of the setting "Move notation", whose other form is item 5's text ("The
   review and the Analysis board", item 4).
9. **Two moves can give one position.** A string names one edit, but two edits can leave the same blueprints: for
   example, the end wall of a line of walls moved to the line's other end, and the star beside it moved one cell up.
   Some edits leave the hand as it was. Two placements of equal blueprints on one anchor hex give one position too
   (blueprints 1 and 3 at the start). So the review compares two moves by the position that they give, not only by
   their names, as it takes Enclosure's two edges of a turn in either order as one turn (design 29):
   - **The key of the position after a move** (`afterKey`, in `src/lib/review/blueprints.ts`): for an edit, the
     mover's hand after it, with the two blueprints back in their frames (item 5). For a placement, its footprint: a
     placement leaves the hands as they are, and the board after it follows from the footprint. The game interface
     takes the key as an optional member (design 29, item 9). Enclosure gives none: each edge gives a position of its
     own.
   - **The candidates' twins.** Where the review reads an analysis with its position, a candidate that gives the
     position of an earlier candidate becomes the earlier one's twin. A move of the tree from that position can give
     a candidate's position under another name: the game's move or a variation's. It becomes a twin too (`withTwins`,
     in the analysis package). The review takes a twin as the same move, as it takes Enclosure's symmetric twins: one
     row of the table, one rank on the board, and Best for either move. The table's mark ⇅ names the twins "Same
     position". A twin from the tree has the candidate's values and the rest of its line, but no prior. So the meter
     and the complexity count the network's prior once.
   - **A turn of two moves** is the engine's turn when each of its moves gives the position of the engine's move in
     the same order. A symmetric twin of the first move does not count: after it, the position is the mirror image,
     so the engine's second move is another move there. In the other order, the moves compare by their names, as
     before (design 29, item 9).
   - **The tree.** A move from the board, a candidate or a line goes along the tree's move that gives the same
     position, where the tree has one: one position is one node (the shared analysis's `nodesOf`). After the tree's
     last known position, the positions are not known yet, so the moves make new nodes.
   - **The move list's note** names the engine's choice only for a move that gives another position.
   - **Names stay where the engine reads them.** The engine's queries, the stored results and a line's steps keep each
     move by its name. When a line changes to a move with another name, its steps come from the engine again. The
     board then shows the same position.
10. **A position's notation** (as FEN gives a chess position) waits for the board editor and for starts from a set-up
    position. The first version takes games as records: the standard start and the moves. So the record's reader
    refuses a `Position` tag. The shared frame refuses it for each game that gives the frame no start. The import
    refuses a strategyjam.org game whose first position is not the standard start. Every game of the archive starts
    from it.

## How the board takes a move

The player's own moves on the board are the board's part of the view's game interface (design 29, item 9): a
`MoveInput`, `input`, `inputStatus` and `clicks`. The input's rules are the position, its mover and every legal move
as a string: the engine's describe gives them (`legal`, request 23). The site has no rules: the input never computes
which moves are legal. It matches what the player points at against the list. The list must be complete: a partial
list marks a few hexes where the game has dozens, and the page then reads as if the rules were wrong.

1. **A placement:** the player clicks a blueprint in the mover's hand. A dot marks each anchor hex where a legal
   placement puts the blueprint's anchor cell: every one in the list, and no other hex. Under a mouse's pointer, the
   blueprint's footprint shows with a ring on its anchor hex: faded in the mover's colour on a marked hex, and as a
   dashed grey outline on another hex. A click on a marked hex makes the placement. The hex clicked is the anchor hex
   that the string names (`K@q,r`, item 5). While the input has its rules, the board's view fits the anchor hexes of
   every legal placement with the cells, so that every dot is in view. It fits them also while the input is off, so
   that the view stays as it is when the input turns on. A page that sets the rules after the position (the review,
   when the engine's describe answers) sees the view fit again once, when the rules come.
2. **An edit:** the player clicks a cell of a blueprint. A dot marks each legal new place of the cell, in that
   blueprint or another one, with both coordinates in the frames before the edit: every one in the list, and no other
   hex. A new place can be outside the blueprint's cells (a negative coordinate) or an empty blueprint's dashed hex
   0,0. A click on a marked new place makes the edit.
3. **The hands do not move.** An edit's new place touches its blueprint's cells, or is an empty blueprint's 0,0 (the
   engine repository's `games/blueprints/README.md`). So each blueprint's panel shows its cells and every hex that
   touches them, and the hex 0,0. Every new place of a legal edit is then in view, and a click reaches it. The panels
   do not depend on the input: each hand keeps its size, its scale and its place whether the input is on or off, and
   when the player chooses a blueprint or a cell.
4. **A click on a cell chooses both.** It chooses the cell's blueprint for a placement and the cell for an edit. The
   next click tells the two apart: a marked anchor hex on the board makes the placement, and a marked new place in a
   hand makes the edit. While a cell is chosen, a click on another hex of a blueprint's panel is an edit to a place
   that is not legal. With no cell chosen, it chooses that blueprint alone. A click on the chosen cell again cancels
   the move begun, as a click on Enclosure's first point does. The rules never give an edit back to the cell's own
   place: an edit puts the cell in a new place.
5. **Escape** cancels the move begun, as on Hedge School's board.
6. **A touch screen has no hover.** The first tap on a marked hex shows the move: a placement's footprint, or an
   edit's cell faded in its new place. A second tap makes it: on the footprint, or on the same new place. A tap on the
   board snaps to the nearest marked anchor hex whose centre is within 2 hex radii, as strategyjam.org's does, because
   a hex on a phone's board is a few pixels wide. The first tap keeps a wrong touch from making a move, and the
   board needs no button of its own to confirm it.
7. **The status line** (`inputStatus`) says what the move begun needs next: with a blueprint chosen, how to place
   it, and with a cell chosen, how to place its blueprint and, when the cell has a legal edit, how to move the cell.
   It says why a click did nothing only when the player tried that move: a placement on a hex that is not marked, an
   edit to a hex that is not marked, a click in the opponent's hand, or a click on the board with nothing begun. So
   it says "This cell has no legal edit." only after the player tries to move that cell. An empty blueprint has its
   own text: an edit can put a cell in it. While the input is on and nothing is begun, `firstStatus` says what to do
   first: "Click a blueprint or a cell in Blue's hand.", with the mover's name. `inputStatus` is null then, as the
   view's game interface asks, so that the page chooses where the first text goes. The lab page shows it in its
   status line. The review's status line shows the position when `inputStatus` is null, and the review
   (abscls-8tl1.7) chooses whether the first text goes there. On a touch screen every text says "tap", not "click",
   the first text too. The texts are strict Simplified Technical English, with the glossary's words: blueprint,
   hand, cell, anchor hex, footprint, placement, edit. Each fits in two lines of a phone's status line, and the
   status line keeps the height of two lines, so that a text that wraps does not move the board between a touch's
   two taps. No row of the page may change its height while the player points or clicks: a row that grew would move
   the board under the pointer, or make the board's area smaller. On the lab page, the hex under the pointer is in a
   row of one line, cut short when it is too long.
8. **"Tap" before the first touch.** Before the first click, the page cannot know of a touch from a click. So the
   input reads the device's primary pointer: when the media feature `pointer: coarse` (Media Queries Level 4)
   matches, the primary pointer is a finger, as on a phone, and the texts say "tap". After each click, the click's
   own pointer decides. A laptop with a touch screen has a fine primary pointer: its texts say "click" until the
   player taps. A pen counts as a touch: every pointer that is not a mouse shows a move with its first tap.
9. **The candidates and the input.** While the input is on, a click in the mover's hand goes to the input, and the
   pointer in a hand finds no candidate: a candidate's line would show its own hands under the pointer, in other
   frames than the dots'. A click on the board goes to the input too, unless nothing is begun and the hex is a
   candidate's: that click finds the candidate, as before. While a line shows, the board takes no move: its hands
   are the line's. The board decides this itself, so the review gets the same rule as the lab. The candidates' edits
   are clicked in the review's table.

**How strategyjam.org does it** (its game page's Blueprints module, saved by the game watch in the engine repository's
`runs/strategyjam/blueprints/`). The mover always has a chosen blueprint: the first, or the one that the keys 1 to 3,
a click on its box, or a click on one of its cells chose. A click on a cell "lifts" it: the editor marks its legal new
places, and the cell becomes the blueprint's grip on the board. Before a cell is lifted, the grip is the cell nearest
the blueprint's middle. A click on the board puts the grip on the hex clicked, and a click on a new place makes the
edit, so the next click tells a placement from an edit. The "Dots" button marks each hex where a click places the
blueprint: the grip's hex, not the anchor hex. A mouse shows the footprint under the pointer, with the captures that
it would make. A touch shows it on the tap's hex, snapped to the nearest legal place within 2 units, and a "Confirm"
button makes the move. A cell can also be dragged to its new place. Escape drops the lifted cell.

**Where Cyanotype departs from it:**

- **The anchor cell is the grip.** The hex clicked is the anchor hex that the move's string names, so a player who
  reads the coordinates sees the notation. strategyjam.org's grip is the middle cell or the lifted cell, and its
  dots mark the grip's hexes.
- **No blueprint is chosen until the player clicks one.** So the view's `pending` is null when nothing is begun, as
  Enclosure's is, and Escape cancels the choice of a blueprint too. There are no keys 1 to 3: the review's keys are
  the view's.
- **The dots always show** while a blueprint is chosen. strategyjam.org shows them only after the "Dots" button.
- **No captures in the footprint:** the site has no rules to compute them. The engine gives a move's captured cells
  only after the move.
- **A second tap, not a "Confirm" button,** on a touch screen, for a placement and for an edit.
- **No drag of a cell** to its new place: two clicks make an edit.
- **The chosen cell again cancels the whole move begun.** On strategyjam.org it drops the lifted cell, and the
  blueprint stays chosen.

Where it is: `apps/cyanotype/src/lib/board/input.ts` (what a click does, the status's texts and the clicks'
list, with its tests), `blueprintInput.svelte.ts` (the `MoveInput` that the board and the view take), and
`Board.svelte` and `Hand.svelte` (the dots, the footprint, the chosen blueprint and cell, and the clicks).

**The lab's positions come from the engine.** Each position of the lab page is a game of moves from the standard
start, which Stamp Duty's early build (`engine-0d2a5416`) played. The script
`apps/cyanotype/scripts/board-fixtures.mjs` (`npm run fixtures`) runs the site's build in Node, and stores what the
engine gives in `src/lib/board/fixtures.json`: each position, its mover, every legal move (describe), and what each
move did (describe_game: the footprint, the captured cells, the points and the hands after it). The candidates and
their lines are hand-made marks, and the engine plays each one where it stands, so each is a legal move. The 0.7
builds (`engine-b64eea10`, `engine-217be61f`, `engine-70dfdc0f` with a new network, then the release
`engine-3ac5c2fc`) give the five games the same data as the early build: only the file's header, which names the
build, changed. The data is the rules' alone, which no network changes.

- **The build and the tests read the stored file.** `fixtures.engine.test.ts` runs the engine again and compares, in
  the Tests workflow too. It is skipped when the site has no engine (`npm run engine` was not run).
- **The engine's own library starts the module,** through `@abstractclass/engine/node-engine.mjs`, which both sites'
  checks take. It loads the build's `gpu_engine.mjs` (the manifest's asset of kind `gpu-library`) and calls only its
  `createCpuEngine`, which drives the CPU module with the few WASI imports that it needs: the clocks, random bytes and
  standard error. The site keeps no copy of the engine's driver (CLAUDE.md, and design 29: "Move, do not copy").
  `npm run engine` checks the SHA-256 of each file against `engine.lock.json` ("The engine's files").
- **The board computes geometry only, and the tests check it against the engine.** A footprint is the blueprint's
  cells moved to the anchor hex (`footprintOf`): the board draws it under the pointer, and the lab's moves take it
  for their drawing. An edit's hexes in the frames after it come from the notation's frames (item 5). The tests
  compare both with what describe_game gives: each placement's footprint, and the hands after each edit.
- **The unit tests click every legal move** of each position. They check that each blueprint's dots are its legal
  placements' anchor hexes, all of them and no others, and that each cell's dots are its legal edits.

## The engine's files

Cyanotype takes the engine's files as Hedge School does (design 03): `apps/cyanotype/engine.lock.json` pins each
file by its SHA-256, and `npm run engine` (`packages/engine/src/fetch-engine.mjs`, which both sites run) puts them in
`static/engine/` with their manifest. The page loads them from there.

1. **The release:** `engine-3ac5c2fc`, Blueprints' first release (Stamp Duty 0.1), in the public repository
   [abstractclass-org/blueprints-engine](https://github.com/abstractclass-org/blueprints-engine), with its manifest.
   Its files: the module (`blueprints-engine.wasm`, build and search `3ac5c2fc`, protocol 0.7.1, with the search of
   the root's views of request 24), the practice bot (`blueprints-bot.wasm`, interface 0.1.2, with `practice_bot.mjs`,
   request 25), `gpu_engine.mjs`, `NOTICES.txt`, `LICENSE.txt` and bpj5's network `b6c96-s40806528-d2304635`, whose
   name in the release is Stamp Duty 0.1. Each entry of the lock takes its file from the release (a source of kind
   `release`), with the SHA-256 and the size of the release's manifest. The release's `settings.cfg` is the text of
   the search's settings, which the module embeds: the site does not read it, so the lock does not take it. The engine
   repository's record of the release: its
   [docs/decisions/organization.md](https://github.com/abstractclass-org/engines/blob/main/docs/decisions/organization.md),
   entry of 2026-11-05.
2. **Protocol 0.7.** Blueprints' build speaks 0.7.1, and Enclosure's stays 0.6.x (the engine repository's design 04,
   "Versioning"). 0.7.0 brought the search of the root's views, and 0.7.1 its move at few visits: a search whose
   passes find no candidate gives its first pass's policy move. The lock's `protocol` names the protocol that
   Cyanotype's code is written for (0.7.1, `ROOT_VIEWS_PROTOCOL`), and the manifest carries it, so `packages/engine`
   refuses a module of another minor version for each site: 0.6.x for Hedge School, 0.7.x from 0.7.1 for
   Cyanotype. The types take request 24's fields: the query's `rootViews`, a candidate's `checkVisits`,
   and `rootInfo`'s `views` and `searches`. The network's raw values are optional: a reply of more views has none.
3. **Every file from the release, for the deploy and the tests.** `npm run engine -- --deploy` refuses a file that is
   not from a release. The job `cyanotype` of the Deploy workflow takes the files before its checks and its build, so
   each deployment has its engine. The Tests workflow takes them too (the step `cyanotype-engine` of
   `npm run check:all`, and a step of the Windows job), so the checks that need the engine run there: the fixtures'
   test, the bot's test at few visits, the review's tests and the browser tests that play against the bot. Without
   `static/engine`, they skip with a message, and `/practice` says that the engine is not on the site. In CI, the
   browser tests of the review and of Practice fail instead of skipping, so that a build without the files cannot pass
   there.
4. **The CPU only, until Blueprints has a GPU build for the browser** (abscls-wqdl, abscls-8tl1.29). This is not a
   choice: Blueprints' release has no GPU module for the browser yet, and Blueprints is to get one, as Enclosure has.
   The lock has no GPU module, so the fetch script stores no ONNX Runtime for Cyanotype. The rules' worker starts the
   engine with `createCpuEngine` alone. The bot is the practice bot with one search thread, whose network runs in its
   own module, and its worker has no ONNX Runtime and no WebGPU code: Blueprints' release has no threaded bot yet.
   The lock's exceptions file (`engine.lock.exceptions.json`) names these kinds, each with abscls-8tl1.29 ("The gaps
   from Hedge School"). The GPU setting is Off whatever the browser kept
   (`src/lib/analysis/engineSettings.ts`), so the shared engine session never starts the GPU worker. With the GPU on
   and no GPU module in the manifest, `GpuControl.apply` (`packages/analysis/src/gpu.svelte.ts`) would give the
   status that the build has no GPU module.
5. **ONNX Runtime's files come from `static/engine`, as for Hedge School** ([hosting.md](../hosting.md), section 2).
   The shared engine session starts the GPU worker through its GPU control (`packages/analysis/src/gpu.svelte.ts`,
   then `packages/engine/src/gpuClient.ts`), so the build bundles that worker (`packages/engine/src/gpuWorker.ts`)
   with ONNX Runtime Web, ready for a GPU module. `vite.config.ts` copies Hedge School's two settings for the
   engine package ([design 29](29-shared-packages.md), "Consequences"): ONNX Runtime Web's form that takes its
   WebAssembly from the page (the resolve condition `onnxruntime-web-use-extern-wasm`), and the workers as modules.
   When the lock has a GPU module, the fetch script stores ONNX Runtime's two files in `static/engine`, with no change
   to the script. Without the condition, the build copies ONNX Runtime's WebAssembly (25.5 MiB) into the site, and
   Cloudflare Pages refuses the upload. The step `cyanotype-build-sizes` of `npm run check:all` fails on a file of the
   build over 25 MiB.

## Practice against Stamp Duty

A game against Stamp Duty in the browser, as Hedge School's Practice (design 24, design 25): the settings card, then
the game in the review's layout. The bot is the engine repository's practice bot for Blueprints (abscls-1if9), in
Hedge School's form where Blueprints allows: KataGo's GTP engine with its play settings, not the analysis module's
`chooseMove`, for the reasons of request 15 (the analysis settings, and a new tree for each query).

**The bot** (the engine repository's games/blueprints/README.md, "The practice bot"): `blueprints-bot.wasm`, one
search thread on the CPU, the native GTP engine's play settings, the root's views on. The page sends
`blueprints-start SEED`, then the visits and the variety (`kata-set-param`, with GTP's half-life of 19 moves, as for
Enclosure), then `play`, `genmove` and `undo` with the site's strings. Its visits are Hedge School's, 1 to 8,192: since
protocol 0.7.1 (abscls-csmy) its genmove gives a legal move at every visit count, also on a position of more views,
where the earlier build failed with 2n visits or fewer for a cover of n views. A reload sets the bot's game to the
kept moves with `blueprints-set-game`: `undo` then takes them back as any others, so a takeback works after a reload.

**The game:** the engine's rules worker gives each position, what each move did and the player's legal moves
(describe, describe_game), as on Hedge School's Practice. The page checks each of the bot's moves against the rules'
legal moves, and stops the game with an error when one is not legal. An error of the engine stops the game too, with
the engine's message ("The game stopped: ..."), as Hedge School shows it. The final score is the rules' score of the
game's last position (`scores`, and the margin of `outcome`). This browser keeps the game in progress
(`cyanotype:practice-game:1`), the choices (`cyanotype:practice-choices:1`) and the panel's place and size
(`cyanotype:practice-panel:1`).

**How it departs from Hedge School's Practice (design 24):**

1. **A search of more views takes its best check, with no temperature,** and a move of another view keeps no tree for
   the next move (the engine's README, "The search"). The variety then does not act on that move. Request 25 accepts
   this.
2. **No Your games, no stored game, no analytics and no review of a game played here:** the site has no store of
   games, no backend (design 25) and no analytics (design 17) yet. These are gaps, each in "The gaps from Hedge
   School". So a game that ends is no longer kept: the next visit starts a new one. Abort ends the game, and it is
   gone. The site ships only its lock's networks, so a new build can drop a kept game's network. Such a game cannot
   go on: the page drops it, and the settings card says so.
3. **Fewer display settings:** the points' bar always shows, with no second number (Blueprints has no area), and the
   page has no sounds. The player's notes are on the board ("The player's notes"). No game comes from a record or a
   set-up start. These are gaps too ("The gaps from Hedge School").
4. **The move list has one move a line,** each turn's number at its first move: Blueprints' moves are up to about 19
   characters long, and two in a row do not fit the side column.

**The layout** (chosen 2026-10-30, after screenshots of three layouts at design 06's sizes):

1. **On a computer, the board takes all the room** left of the side column and under the players' row: the window's
   height less the row, and the width that the side column leaves at its widest. Blueprints' grid has no edge, so the
   box need not be square, as Hedge School's is. The side column holds the bot's line, the move list at its full
   height and the step bar, with no hands.
2. **The hands float over the board, in a panel:** Blue's three blueprints above Red's, at about a side column's
   width (each hand 312 × 100 pixels at first). The player's own moves work in it as in the hands beside the board.
   It starts in the top-right corner.
3. **The player can drag it and resize it.** A drag of its top strip moves it, and the handle at its lower corner
   towards the board's middle resizes it. It stays inside the board's box, never covers the zoom buttons, and keeps 6
   pixels from both. Its smallest size gives each hand 216 × 72 pixels: a blueprint as the game starts it then has
   hexes 12 pixels across, which a mouse can still click. The page keeps its place and its size over a reload. It has
   no button to fold it away.
4. **A fit counts the panel:** after a fit, no cell and no legal anchor hex lies under the panel. The fit takes the
   largest scale at which the view has no hex under the panel, with 4 pixels round it, and the view nearest the plain
   fit's centre. It may move the panel to another corner when that gives a larger board. When the panel's place gives
   the same size, it stays. Corners of the same size go in this order: top right, top left, bottom right, bottom left.
5. **A drag or a resize is the player's choice,** as a pan or a zoom is: it never makes the board smaller. When the
   player puts the panel over cells, it covers them. The fits after it (a move, a change of the board's size) keep the
   panel where it is, and fit as if no panel were there. "Show all the cells" and a reload fit with the panel again,
   and may move it to a corner.
6. **On a phone, the hands go under the board,** Blue's above Red's, each as wide as the board and a third of that
   high at most, as the board's own rows. The board takes the window's height less the header, the row and the step
   bar, and at least a square field with its hands. The page scrolls down to the move list.
7. **The status line is in the step bar,** as the review's is, not in the side column as Hedge School's Practice has
   it: the board's input text ("How the board takes a move", item 7) needs its two lines in view, also on a
   phone.

**Why this layout:** the screenshots measured each layout's board, at 1,376 × 952, 1,920 × 1,080, 2,560 × 1,440 and
390 × 844, on a position of move 10 and one of move 100. With the hands beside the field in the board's box, the field
lost 252 pixels of its height at 1,376 × 952 (the box was too square for columns). With the hands beside the score
bar, a hand's hex was 14 pixels on a computer and 8 on a phone. With the hands in the side column, the board was the
largest, and the move list lost 222 pixels. The panel keeps that board, and the move list keeps its height. In the
six screenshots on a computer, a corner was always free at the plain fit's scale, so the panel cost the board nothing.

**What it shares with Hedge School** (design 29: move, do not copy): the settings card and the game's frame
(`@abstractclass/practice`: `PracticeCard.svelte`, and `PracticeFrame.svelte` with its board's box in the form
"fill"), the practice's part that is not Enclosure's (`practice.ts`: the visits, the variety and its help, the
choices and the kept game under each site's key, the GTP helpers, the takeback, the results), and the bot's page side
and its worker (`bot.ts`, `botWorker.ts`, `botMessages.ts`). Each site gives its worker module and the game's name in
the bot's commands. Hedge School's threaded forms (the GPU, the CPU workers) are in Hedge School only
(`botForms.ts`, `hedgefundWorker.ts`) until Blueprints' release has a threaded bot (abscls-wqdl, abscls-8tl1.29).
Hedge School's stored games (design 25) stay in Hedge School until Cyanotype has a backend:
the server's check names Enclosure's edges, and the Pages Function bundles it alone.

## How a game comes in from strategyjam.org

Cyanotype has Hedge School's bookmarklet and userscript for strategyjam.org (design 11) and its import page
(design 22), on the tools' frame in `@abstractclass/import` (design 29, item 10). Its own parts:

1. **The names, in Cyanotype's words.** The bookmark and the userscript are **Open in Cyanotype**. The button
   and Tampermonkey's menu entry say "Open this game in Cyanotype". The messages name "the Open in Cyanotype
   bookmark" and "the Cyanotype button". "Open", not Hedge School's "Review": the import page opens the game, in
   the review or on the Analysis board. The userscript's files are `/cyanotype.user.js` and
   `/cyanotype.meta.js`. It runs on Blueprints' game pages alone (`https://strategyjam.org/blueprints/game/*`).
2. **The page reader** (`strategyjamPage.ts`). Blueprints' game page is strategyjam.org's game page with Blueprints'
   module (the engine repository's `runs/strategyjam/blueprints/`, `g/blueprints/index-*.js`). In a wide window the
   module draws the stage itself (`.stage.stage-whole`), and in a narrow one strategyjam.org's own view draws it
   (`.stage`). Both keep the game in the props of the components above the stage, as Enclosure's page does, and both
   have strategyjam.org's replay slider (`input.replay-slider`). The reader takes the players, the first position
   (`initial`), the moves, the clock (`initialMs`, `incrementMs`), the result, the scores (from the page's own rules
   module, `observe`), the game's id (the last part of the page's path), and the position that the page shows (the
   slider's value). The record (`strategyjam.ts`) refuses a game of other rules, of another rules version, or from
   another start (item 10).
3. **The button's place:** at the end of the page's row of buttons for the game (`.stage .actions`: Sandbox, Download
   record, Resign), to the right, in a row of its own when the row is full. Both layouts draw that row inside the
   stage: at the foot of the column beside the board in a wide window, and in the panel in a narrow one. Hedge
   School's button on Enclosure's page ends the move list's legend, which Blueprints' page does not have. In a wide
   window the column at the window's right holds the player's own hand, which a button fixed in the corner would
   cover. Before the game comes, the button is fixed in the window's lower right corner, as Hedge School's is.
4. **The button's picture,** until the site has a logo ("Consequences"): a blueprint as the game starts it, a star with
   a ring of six cells, white on the button's dark ground, with the star marked.
5. **The import page** (`/import`) offers the game that a tool sent in the review or on the Analysis board, as
   Hedge School's does (its designs 21 and 22), in the choice's frame that both sites share
   (`@abstractclass/import/ToolChoice.svelte`). It shows the players, the number of moves and the position that the
   game's page showed (the moves before it, and that move's turn in the record). The review keeps the game in this
   browser. The Analysis board opens at that position, or at the game's end when the tool sent none. When the board
   kept here has moves, the board first asks "Replace your analysis?", as Hedge School's does ("The review and the
   Analysis board", item 11). The record as Cyanotype wrote it is under "The record", closed. For an out-of-date
   tool, the page says how to update it, as Hedge School's does. Without a game, the page goes to the tools page.
6. **The record's check comes first.** The page takes the game out of the address at once, as Hedge School's does.
   Then the engine's rules check the record, in a rules worker of the page's own, as the Analysis board checks a record
   brought to it ("The review and the Analysis board", item 11). A record that they refuse shows why, and the page
   opens nothing. A site with no engine files cannot check a record, so the page opens nothing there either. Hedge
   School's import page opens the game without its engine, since its review checks the game later. Each choice opens
   its page by that page's own address with the record (`/review#record=`, `/analysis#record=…&at=`), which takes it
   out of the address again, and which checks it again. Cyanotype has no analytics yet, so the import counts no
   event: the board's address names no source (`via`). A reload of the page after the game left its address goes to
   the tools page. A partner's links (`from=`, `packed=`, a partner's `save=`) are Hedge School's (its design 18): the
   page refuses `from=` and a link with no record, and reads no `save=`.
7. **The tools page** (`/tools`) gives the steps to install the bookmarklet and the userscript, in strict Simplified
   Technical English with the glossary's words. Its link is in the header from a tablet's width, and in the footer on
   a phone, as Hedge School's (design 22).

The tools have not run on strategyjam.org itself: they run in the player's own logged-in page, and that test waits for
the owner (abscls-8tl1.12). The tests use page states that they make, with moves that Stamp Duty's early build played
(`fixtures.json`), and the built tools ran on mock pages of both layouts in Chromium.

## The review and the Analysis board

Cyanotype's review (`/review`) and Analysis board (`/analysis`) are Hedge School's (designs 05, 06, 07 and 10), in
the shared view (design 29, item 9) with Blueprints' part (`src/lib/review/blueprintsView.ts`), on the practice page's
layout. The engine is Stamp Duty's early build, on the CPU until Blueprints has a GPU build ("The engine's files",
item 4). Each part below was chosen from drawings of the real page, from the engine's replies. The decision log
gives the measurements that led to each choice.

1. **The layout:** the practice page's board, with its hands' panel and its kept place ("Practice against Stamp
   Duty"), and the review's side columns, as Hedge School's. The board's box takes the window's height less the
   players' row and the charts. On a phone, the hands go under the board.
2. **The players' cards:** each player's points, and the stars on the board. The chart's second line is the stars'
   difference.
3. **The move list:** one move a row, by turn and by move, at every size. A turn's number stands at its first move.
   Two of Blueprints' moves do not fit one row: a move has 5 to 19 characters, and the test game's widest turn by move
   needs 440 pixels in a list of 325 at 1,376 pixels.
4. **The setting "Move notation"** in the display settings, as Lichess's "Piece notation": "Glyphs" (the default) or
   "Text".
   - **Glyphs,** as strategyjam.org's move list writes a move: a placement is its blueprint's number in a box, its
     anchor, and its capture mark, `+N` when it scores and a small `x` when it captures and scores nothing (item 6).
     An edit is its cell, with its kind, then each blueprint's number in a box with the cell's place, before and
     after. The boxes and the cell take the colour of the text round them.
   - **Text:** the notation of items 5 and 6, as the Notation page gives it (`2@-3,-9x+12`, `1:-1,2>2:0,4`).
   - The setting writes the move list, its notes ("Mistake. … was best."), the status line, the variations and the
     engine's line in the form "Notation", and the candidates' table. A screen reader reads the text in both forms.
   - A candidate, a note's best move and a line's move before the rules play it have no capture mark, in both forms:
     what they capture is not known yet.
5. **The small pictures** (the variations' form "Pictures", and the engine's line under the table): a placement is a
   hex in the mover's colour with its blueprint's number in it, which tells the hand that the move plays. An edit is
   its cell, with its kind, and an arrow drawn out of it, as one glyph. A pass is a dot. The engine's line has no
   numbers in this form: a number beside the hex would read as the blueprint's number, and the board numbers the
   line's moves. The form "Dots" keeps the board's numbers in its dots.
6. **The board's numbers:** a line's move has its number in a small disc at its anchor cell's corner, so that the cell
   shows. An edit candidate has its rank in a small badge at its cell's corner, in the hand.
7. **The marks of a turn:** at each position, the board marks every move of the turn so far: each placement's outline,
   and each edit's arrow in the hand. By turn and by move alike: the review's unit changes the labels' grouping only.
   Hedge School's board marks the edges of a turn so too.
8. **The hands' rank chips:** each candidate that places a blueprint has its rank in a chip at the blueprint's panel.
   The best chips that fit one row show, then a chip "+N" for the others (`src/lib/board/chips.ts`). A row that
   wrapped would cover the blueprint's cells.
9. **The candidates' table** follows the setting "Move notation", in the move list's monospaced font. A name is as
   large as its cell allows (the view's `fitName`): its full size, or smaller where it is wider than its cell, down to
   65%, below which it is cut and fades at its end (`src/lib/review/table.ts`). At 65% (9 pixels), the longest edit of
   strategyjam.org's archive fits as text in the cell at 1,376 pixels. As glyphs it would need 54%, too small to read.
   The Move header shows a cut name in full (design 06, item 12).
10. **The root's views** (request 24): on a position whose legal placements need more than one of the engine's views,
    the engine searches each view, so a candidate can lie outside the rule's view. The board draws a candidate
    anywhere, and the site reads every candidate placement as a placement, with its anchor. A test checks it on a
    position of two views, where the engine's best move lies outside the rule's view
    (`src/lib/review/rootViews.engine.test.ts`).
11. **A record's check:** the engine plays each move of a record and confirms each capture mark (item 6), on the
    review and on the Analysis board alike. The review then shows why it cannot review the game. The Analysis board
    keeps the board that this browser kept, and a notice says why it did not open the record. A record that the engine
    accepts replaces the board kept here. When that board has moves, the board first asks "Replace your analysis?":
    "Keep mine" keeps it. The question is Hedge School's (its design 21, item 6), in `packages/review`
    (`ReplaceAnalysis.svelte`), which both boards use.
12. **Not built yet:** each feature of Hedge School that Cyanotype lacks is in "The gaps from Hedge School", with its
    issue. The review keeps one game in this browser: `#record=` in a link brings one, and the import page sends one
    so ("How a game comes in from strategyjam.org", item 6). The engine's pool keeps its 2 workers while the page is
    open.

### The player's notes

The player draws notes on the board in the review, on the Analysis board and on Practice. Hedge School's three pages
have them too (design 07, item 16). The notes are Lichess's circles and arrows (its chessground board's drawable
shapes) on Blueprints' hexes.

1. **Hedge School's notes, at a hex, with Cyanotype's keys and arrows.** The logic and the colours are Hedge
   School's, in `packages/review` (`notes.ts`, which moved there from Hedge School). A Blueprints hex (q, r) is its
   point. A right-click highlights a hex, and a right drag from a hex to another draws an arrow. The same note again
   removes it. The same note in another colour changes its colour. An arrow drawn the other way is another arrow, as
   chessground keeps a shape's direction (`sameEndpoints`). An arrow has a head, so its direction is part of the
   note. Hedge School's line has no head, and the line drawn the other way is the same line (`sameNote`). Each site
   gives `toggleNote` its rule. The keys held choose the colour: purple with no key, yellow with Ctrl, green with
   Alt, and grey with Ctrl and Alt. Hedge School gives yellow to Shift or Ctrl. Cyanotype gives Shift to a drag
   of highlights (item 2). Each site gives its keys as one table (`BrushKeys` in `notes.ts`), and Cyanotype's is
   `NOTE_KEYS` in `Board.svelte`. The board chooses the colour by its table, and "Keys and clicks" shows the table.
   The colours are the view's tokens (`review.css`), 3:1 against the board that the two sites share.
2. **A right drag with Shift highlights each hex that it goes across,** as strategyjam.org's Sandbox does. The other
   keys held choose the colour. A highlight of another colour on a hex changes to the drag's colour. If the drag's
   first hex has a highlight of the drag's colour, the drag clears instead. It removes that colour's highlights from
   the hexes that it goes across, and adds none. So the same drag again clears the group that it drew, as a second
   right-click clears a highlight. A right-click with Shift highlights or clears one hex. Arrows stay. The drag takes
   the hexes between two of the pointer's moves (`hexesAlong` in `hex.ts`), at points at most a tenth of a hex's
   radius apart. So however fast the drag, it misses no hex that it crosses for a tenth of the radius or more. It can
   leave out a hex whose corner it only clips: the player did not mean that hex. "Keys and clicks" gives the drag and
   its clearing.
3. **A drag off the board on screen takes no hex,** as chessground drops a shape that is released off its board. Off
   the board is outside the field or under the hands' panel, where the player cannot see the hex. An arrow released
   there is no note.
4. **Only the drawing is Blueprints' own** (`Board.svelte`). A highlighted hex has a ring inside the hex, round a
   cell's mark, and a faint fill under the cells. An arrow runs from a hex's centre to the other hex's centre. Its
   head's tip stops short of that centre (`arrowPoints` in `hex.ts`). The ring and the arrow have a halo in the
   board's colour, so they read on a cell of either player.
5. **The notes belong to the position on screen, for the visit.** The view keeps them by position, as Hedge School's
   view does. Practice keeps them by its positions. The browser does not keep them.
6. **On the board only, not in the hands.** A note is at hexes of the board. The hands' cells are in each blueprint's
   own frame, and that frame changes. A line shows the hands after its last move, and an edit moves a cell. A note at
   a blueprint's cell would need a note of another kind. It could also point at a cell that is no longer there.
   strategyjam.org's Sandbox puts its notes on the board only too.
7. **An arrow between two hexes that touch is a note,** as Lichess draws an arrow between two squares that touch. Its
   shaft still shows (0.87 of a hex's radius long), since the tip stops 0.2 short of the centre.
8. **A note on a hex that holds a cell** keeps the cell readable. The fill goes under the cells, so the cell keeps
   its owner's colour. The ring goes over everything, round the cell's mark. The same hex under a candidate's or a
   line's faded cells shows the ring over them.
9. **While a preview shows another position,** the notes hide, and the board takes no note. A preview shows a move
   that the pointer is on in the move list, or a variation's move. The view then gives the board no notes
   (`ReviewView.svelte`, as for Hedge School). The notes come back with the position. A candidate's line on the
   position on screen does not hide them: the line belongs to that position.
10. **A click on the board clears the position's notes** (chessground's `eraseOnClick`), and does what it does
    besides. Hedge School's board does the same. A pan does not clear them, and a zoom does not. This board pans,
    and Hedge School's does not. A pan would lose the notes that the player drew to read the position.
11. **Where strategyjam.org differs** (its Sandbox's mode "Mark", read for reference). It has three colours (yellow,
    green and purple), chosen by a button or a key. In its mode "Mark", a left click marks a hex and a left drag
    draws an arrow. As here, a right drag draws an arrow in any mode, and Shift with a right drag highlights hexes.
    Cyanotype keeps Hedge School's four colours, with Ctrl in the place of Shift for yellow.
12. **Notes need a mouse.** A touch screen has no gesture for a note, since it has no right button. Hedge School's
    board has none either, and Lichess's board draws a shape only with the right button or Shift. The layout test of
    the board with notes draws them with a mouse and then sets the window to a phone's size (390 × 844): it checks the
    layout, not touch.
13. **Firefox and Shift, a known limit.** In Firefox, a right-click with Shift opens the browser's own menu, and the
    page gets no event `contextmenu` that it could cancel (MDN, "Element: contextmenu event"). So in Firefox, a right
    drag with Shift can end with Firefox's menu on screen. The page cannot stop it. Ctrl and Alt do not open it, and
    Hedge School's yellow has Ctrl too. The sites are tested in Chromium only.

### No area map yet

Cyanotype shows no area map (design 30): no switch, no legend and no shading, on the review and on the Analysis
board. The area map is essential to Enclosure, where the enclosed area decides the game. For Blueprints, it is not known
yet which view of the analysis helps a player. A later study can choose one, and the area map can then be one option:
`AREA_MAP` in `blueprintsView.ts`, with `blueprintsMap.ts` and its tests, is kept for it.

The map would take the engine's ownership as it is: the rule's view, a rhombus of 67 × 67 hexes round the mover's last
placements (the engine repository's `games/blueprints/README.md`, "The ownership"), with no mark outside it. The
archive check below gives the share of positions with cells outside that view.

### The archive check

Each record of strategyjam.org's archive that the engine repository keeps (`runs/strategyjam-archive/blueprints.jsonl`,
5,680 records when the check ran), read in place through the site's code path: the import, the record's reader, the
engine's describe_game, Blueprints' game, and the check of the capture marks, with the engine's describe at every 20th
position from move 10. Counts only: the archive's games are other people's, and stay out of this repository.

- The import refused 65 records, which have no moves. The engine accepted every move of the other 5,615 games (510,853
  moves), and the site read each.
- All 2,630 games that the rules end end with the record's winner. The other 2,985 end before the rules' end.
- Of 25,580 positions described, 6,444 (25.2%) have cells outside the rule's view: 729,739 of 6,074,915 cells
  (12.0%), and at most 917 in one position.
- 2,008 positions (7.9%) need more than one view, 4,717 (18.4%) need one view that is not the rule's, and 6,725
  (26.3%) have a legal placement outside the rule's view.
- The longest placement has 15 characters with its capture mark, and the longest edit 17. The largest score of one
  move is 1,206.

### The departures from Hedge School's view

- **One move a row in the move list** (item 3): two of Blueprints' moves do not fit one row. Enclosure's edges have 5
  to 7 characters, and two fit, as Lichess's moves do.
- **The setting "Move notation"** (item 4): a Blueprints move reads in two forms, strategyjam.org's glyphs and its
  notation. Enclosure's edge has one form, its notation.
- **The small pictures, and no numbers in the engine's line in "Pictures"** (item 5): Hedge School's pill lies along
  its edge and holds the line's number. Blueprints' hex holds the blueprint's number, so the line's number goes.
- **The table's names, each sized to its cell, in the monospaced font, by the notation setting** (item 9): Blueprints'
  names have 5 to 19 characters, so one size for every name in a cell would make the short ones small. Enclosure's
  names have 5 to 7 characters, and Hedge School keeps its one size for a cell.
- **No area map** ("No area map yet").
- **The notes' keys, their drawing, their arrows, and a pan that keeps them** ("The player's notes", items 1 to 4
  and 10). Ctrl alone gives yellow, and Shift with a right drag highlights the hexes that the drag goes across. Hedge
  School gives yellow to Shift or Ctrl. A highlighted hex takes the place of a ring round a point, and an arrow the
  place of a line. An arrow drawn the other way is another arrow, and Hedge School's line drawn the other way is the
  same line. A click clears the notes, as on Hedge School's board. A pan does not, since Hedge School's board does
  not pan.
- **The cards' second number:** the stars on the board, in the place of the enclosed area (item 2).

The Move header and the fade of a cut name are in the shared table, so Hedge School has them too (design 06, item
12).

## The gaps from Hedge School

The whole comparison of Cyanotype with Hedge School: by the engine lock's kinds, by page (`src/routes`), by the parts
of `src/lib`, by setting, and by the site's other files. Each gap names its issue, which holds the decision about it.
A part that Cyanotype puts off or leaves out says why, and the decision log has the decision ("Cyanotype's gaps from
Hedge School: built, put off and left out"). The list also names Hedge School's parts that only Enclosure uses: only
a decision leaves a feature out, also one that Blueprints seems not to need. Blueprints' own parts in the place of
Enclosure's (the board and its input, the notation, the record, the page reader of strategyjam.org) are not gaps.
When a gap closes, its line goes.

### By the engine lock's kinds

The check `engine-kinds` of `npm run check:all` (`scripts/engine-kinds.mjs`) fails on a kind of Hedge School's lock
that Cyanotype's lacks, unless `apps/cyanotype/engine.lock.exceptions.json` names its issue. Both locks have the
module, `gpu-library`, the practice bot (`practice-module`, `practice-library`), the network (`model`), the notices
and the terms.

- **`gpu-module` and `graph`:** the analysis on the visitor's GPU, with the network as an ONNX graph (design 15).
  abscls-8tl1.29, after Blueprints' release has them (abscls-wqdl).
- **`practice-threaded-module`, `practice-evaluator` and `cpu-evaluator-library`:** the threaded practice bot, with
  its network on the GPU or on CPU workers (design 24, `botForms.ts`). abscls-8tl1.29, after abscls-wqdl.

### By page

Both sites have the home page, About, Notation, Notices, Privacy, Tools, Practice, the review, the Analysis board,
the import page, the site map, the bookmarklet and the userscript. Cyanotype lacks these pages of Hedge School:

- **How reviews work** (`/how-reviews-work`): where the labels, the accuracy, the hard positions and the meter come from
  (designs 05, 10, 14 and 16). abscls-8tl1.37.
- **The board editor** (`/editor`): a position set up for the Analysis board (design 21). A position's notation waits
  for it ("Decision", item 10). abscls-8tl1.39.
- **The page for other sites** (`/developers`): how a partner site sends a game and takes its review back (design
  18). abscls-8tl1.51. The page describes what Cyanotype takes today, since partner sites are left out (below).
- **Openings** (`/openings`) and the book's table lab (`/lab/book-table`): the opening book's own page (design 32), in
  the builds that serve the test book. Put off until Blueprints has an opening book: abscls-8tl1.53 (deferred).
- **Puzzles, Learn and the engine lab** (`/puzzles`, `/learn`, `/lab/engine`): prototypes, only in the full edition
  (design 11). Left out while they are prototypes: Cyanotype takes each one when Hedge School makes it public.

### By the parts of `src/lib`

The parts of Hedge School's `src/lib` that Cyanotype has no counterpart for, as features:

- **The removal of earlier engine results after a release** (`game/earlierResults.ts`, design 20). abscls-8tl1.30.
- **Review files, loaded and exported** (`game/reviewFile.ts`, the review's file input). abscls-8tl1.34.
- **The review snapshot and the annotated export** (`review/annotate.ts`, `review/exportText.ts`, design 13): a
  saved review that reopens under an earlier engine, and the annotated record from the store. abscls-8tl1.35.
- **The area map** (`review/enclosureMap.ts`, design 30). abscls-8tl1.17 decides whether Blueprints has one ("No
  area map yet").
- **The player's games, kept in this browser** (`game/store.ts`, `game/import.ts`, `review/ReviewHome.svelte`,
  `ui/ConfirmDialog.svelte`, designs 11 and 22): the Review tab's list of games, a pasted record, the last review
  continued, a game's delete, a game's own network and depth (design 09), and the request to the browser to keep the
  stored games (`@abstractclass/storage/persist.ts`). Cyanotype's review keeps one game. abscls-8tl1.38.
- **One tab reviews a game at a time** (`game/reviewLock.ts`, design 11). abscls-8tl1.38.
- **The Export menus and the links** (`ExportMenu.svelte`, designs 13 and 21). The review's menu: its review file
  (abscls-8tl1.34), its annotated record (abscls-8tl1.35) and its link (`game/share.ts`, abscls-8tl1.41). The Analysis
  board's menu: its analysis file (`game/analysisFile.ts`), its annotated record and its link (`game/board.ts`),
  abscls-8tl1.41.
- **The Analysis board's New menu** (`analysis/NewMenu.svelte`, `game/paste.ts`, design 21): a set-up position, a pasted
  position or moves, and an analysis file loaded. abscls-8tl1.39.
- **"Play the bot from here"** on the Analysis board, and a Practice game from a set-up start (design 24).
  abscls-8tl1.40.
- **Practice's stored games** (`practice/send.ts`, `practice/stored.ts`, with the site's `functions/` and
  `migrations/`, design 25), and an ended game in the player's games for its review. Cyanotype has no backend
  ("Practice against Stamp Duty", item 2). abscls-8tl1.50.
- **Move sounds** (`sound.ts`, `ui/SoundSettings.svelte`, design 08), on the review and on Practice. abscls-8tl1.42.
- **The image of a line** (`board/boardImage.ts`, `board/gif.ts`, `review/enclosureImage.ts`, design 07, item 17).
  abscls-8tl1.43.
- **The opening book** in the review and on the Analysis board (`book/`, design 32). Put off with the Openings page:
  abscls-8tl1.53 (deferred).
- **The analytics and the consent** (`analytics.svelte.ts`, `ConsentBanner.svelte`, `AnalyticsAsk.svelte`,
  `ui/CornerCard.svelte`, `measure.ts`, `internalTraffic.ts`, `analysis/settingChanges.ts`, `game/sources.ts`,
  `hooks.client.ts`, designs 17, 25 and 27). abscls-8tl1.48.
- **Support Us** (`SupportDialog.svelte`, Ko-fi's panel, design 22). abscls-8tl1.49.
- **The logo** (`Collie.svelte`, `collie.ts`, design 12), with the favicon, the icon for a phone's home screen and the
  link previews' picture (`static/favicon.ico`, `static/apple-touch-icon.png`, `static/brand/card.png`). Cyanotype has a
  wordmark, no icon and no preview picture ("Consequences"). abscls-8tl1.44.
- **The review's marks before the first paint** (`review/pageMarks.ts`, design 23). abscls-8tl1.45.
- **The edition** (`edition.ts`, design 11): the early access, its mark in the header, and the full edition's pages.
  Left out with the prototypes that it serves (Puzzles, Learn and the engine lab, above).
- **Partner sites** (`game/partners.ts`, design 18): a partner's link that names where the review goes back, and a
  kept review sent to the import page (`from=`). Left out until a Blueprints site wants to be a partner.
- **meaf.us and Constellation** (`game/meaf.ts`, `game/meafPage.ts`, `game/constellation.ts`): their records and
  tools. Both play Enclosure only ("Decision", item 3), so they are left out.

### By setting

A setting of a feature above comes with that feature: the GPU choice (On, Auto, Off), the GPU's first-use test and
the bot's forms with the GPU module (abscls-8tl1.29), the sounds (on or off, the sound, the volume) with the move
sounds, the area map's settings (where it shows, its style, its thresholds, the chart's area line) with the area map
(abscls-8tl1.17), the mark of a book move with the opening book, and a game's own network and depth with the player's
games. The review's settings (what the labels judge, for whom, the win chance's form) are Hedge School's, and
Cyanotype adds "Move notation" ("The review and the Analysis board", item 4). These settings are gaps of their own:

- **The engine's pool** (design 09): Hedge School starts half the processor's threads as workers, at most 8
  (`defaultPoolSize`), and ends the idle workers after a minute, or 15 seconds in a hidden tab (`releaseWhenIdle`).
  Cyanotype starts 2 workers (`engineSettings.ts`) and keeps them while the page is open (`releaseIdle: false` on the
  review and the Analysis board), for a worker's start of 7 seconds and 331 MB in Blueprints' early build (abscls-qyms).
  That issue is closed, and the release in Cyanotype's lock has its fix. abscls-8tl1.46.
- **The networks** (design 09): Hedge School's settings and Practice offer two networks, HedgeFund 0.2 Lite and
  HedgeFund 0.2, and its lock keeps the earlier ones for the games that name them. Cyanotype offers the one network
  of Blueprints' release, Stamp Duty 0.1. Put off until Blueprints' release has a second network: abscls-8tl1.54
  (deferred).
- **The board's layers of Enclosure** (its regions, its invincible edges), in the display settings and on Practice:
  Blueprints has neither, so they are left out.
- **Practice's points' bar** (design 24): its switch and its direction (horizontal or vertical), abscls-8tl1.52. Its
  area lane is left out: Blueprints has no area.

### By the site's other files

No gap. `static/_headers` and the check of a deployed site (`scripts/release-check.mjs`) are as Hedge School's
("Where it is").

## Why

- **Hedge School's design is built and checked.** Its layout, its review and its quality labels hold for any game whose
  turns have one move or two (design 29). Blueprints' turns are Enclosure's.
- **The rehearsal game is not needed.** Its purpose was a second board before the jam game was known. Blueprints'
  board is a real second board, and it shows the view's real seams.
- **strategyjam.org's strings are the game's notation.** The players see them in the site's move list. The game page
  and the site's records hold them, so an import needs no translation. The engine repository's port speaks them in
  its test against the site's rules (its `platforms/strategyjam/site_diff.py`). Each move has one string, with no
  space, so the move tree can key on it (design 29). On Cyanotype's board, the hex that a player clicks for a
  placement is the anchor hex that the string names ("How the board takes a move").
- **The rule for an edit works on the site's games.** A model of the hand's rules, written for this check, replayed
  the 1,826 games of strategyjam.org's archive that the engine repository keeps. Every one of the 32,959 edits played
  is in its list of legal edits. 7,061 of them move the source's anchor cell, 7,944 put a cell before the target's
  anchor cell, 11,539 stay in one blueprint, and 53 go to an empty blueprint.
- **Two edits with one hand are common.** In 990 of the first 4,000 positions where a game played an edit, two of the
  legal edits give the same hand. A position had 706.6 legal edits and 702.0 different hands on average. One game
  played an edit that left its hand as it was.
- **`x` alone would join two events.** Of the archive's 105,820 placements, 73,599 capture an opponent's cell and 41,864
  score, 57.4 points on average. So 31,735 placements capture cells and score nothing. A score is the event that
  decides a game, and strategyjam.org's move label shows it.
- **No `+0`:** the capture mark gives the points, and the position's scores confirm it. A third case would give one
  move two spellings. strategyjam.org's label shows `+N` only when N is more than 0.

## Alternatives

- **The rehearsal game first:** a template on Connect-4's board, then Blueprints. It costs a board, an import and a
  notation that no player uses, and Connect-4's seams may not be Blueprints'.
- **A copy of Hedge School:** the fastest start, but two copies of the review (`ReviewView.svelte` alone has about
  1,900 lines) drift apart. Design 29 refused a copy for the same reason.
- **A notation of our own:** a placement named by the blueprint's star or its centre, or cube coordinates. A
  blueprint's shape changes with each edit, so it may have no star and no centre. Every player and record would need
  a translation.
- **`x` alone for every capture:** it does not tell a scoring placement from one that scores nothing.
- **A capture mark for a star captured:** it does not give the points, and it is wrong in the 83 placements where a
  star was captured and the score did not change.

## Consequences

- **The engine must speak the site's moves.** The port names a placement from a view that follows the play, and
  plays an edit as two actions: a pick, then a drop. The review takes a turn of one move or two. Request 23 asks for a
  browser build that takes and gives whole moves in the site's strings, before the trained network.
- **A placement outside the engine's view.** The engine sees 67 × 67 hexes around the mover's last placements, and
  97.6% of the placements in the site's games fall in it (the engine repository's `games/blueprints/README.md`).
  The engine must still play the others and describe the positions after them. Since request 24, the engine also
  searches the other views of a position, so a candidate can lie outside the rule's view ("The review and the Analysis
  board", item 10).
- **The review's constants are Hedge School's** until Blueprints' games show other values: the search budgets, the
  threshold of a hard position, and how far below the first choice a candidate shows (design 29, "Consequences"). The
  score's scale is the engine's (`SCORE_SCALE` 12 in the port).
- **The site's look:** a logo, a colour and the board's style are still to decide. The shell starts with Hedge
  School's style and a wordmark. Its accent is Hedge School's lavender in both themes, until Cyanotype's own colour
  comes with its logo. The userscript's button shows a blueprint until the logo comes ("How a game comes in from
  strategyjam.org", item 4).

## Where it is

- `apps/cyanotype/`: the app. `src/lib/site.ts`: the site's name, the engine's, the live address
  (`https://cyanotype.abstractclass.org`, the canonical address of each page) and the storage keys
  (`cyanotype:…`). `src/routes/+layout.svelte`: the header, with the wordmark, the game's pages, the pages about the
  site and the theme menu, and below a tablet's width the site's menu (`SiteMenu.svelte` of `packages/site`), which
  holds the links in their place, as Hedge School's below 1,024 pixels. `src/lib/SiteFooter.svelte`: the footer, with
  Privacy and Notices. `src/app.css`: the accent (Hedge School's lavender) and the board's colour tokens, after the
  shared style and the view's (`@abstractclass/review/review.css`).
- `apps/cyanotype/src/routes/+page.svelte`: the home page, as Hedge School's (design 22): what the site is, the calls to
  Practice and the review, the ways in for a game of one's own (a game from strategyjam.org through the tools, and the
  Analysis board), and a board that plays a scene from a reviewed game (`src/lib/home/HomeReplay.svelte`, on the
  shared replay `Replay.svelte` of `packages/site`). The scene is in `src/lib/home/replay.json`, and its first frame
  in `still.json`, which `scripts/home-replay.mjs` writes from the stored review of the review's test game (Hedge
  School's `tests/fixtures/cyanotype-review.json`, a game of Stamp Duty against itself): the 9 turns before the game's
  latest move with a bad label, and that move. That review gives one scene. More scenes need more reviewed games, and
  the script takes one stored review. The board is a picture there (`Board.svelte`, its prop `still`): no pan, no
  zoom and no zoom buttons, and the page scrolls over it.
- `apps/cyanotype/src/routes/`: the pages. The Notation page describes the moves, the marks and the record of
  items 5 to 7, 9 and 10, with one game made by hand as its examples. Item 8 is the move list's display, and comes
  with the move list. `sitemap.xml`, `static/robots.txt` and `static/_headers` follow
  design 23. The build's `404.html` answers each path that the site does not have. `static/_headers` also lets a
  browser keep each of the engine's files under `/engine/:id/:file` for a year, as Hedge School's: each folder's name
  comes from `engine.lock.json`, and names the engine's release or the network.
- `apps/cyanotype/scripts/release-check.mjs`: the check of a deployed site ([hosting.md](../hosting.md), "Deploy,
  check and roll back"), with the checks that both sites share (`packages/site/src/release-check.mjs`). It gives them
  no pages that lead home, because Cyanotype has no edition, and adds no check of a Function, because Cyanotype has
  none ("The gaps from Hedge School": "The edition" and "Practice's stored games"). When one of these gaps closes, its
  check comes into this script as in Hedge School's.
- `apps/cyanotype/src/lib/game/`: the game's notation and records, as Hedge School's `src/lib/game/` holds
  Enclosure's records. `notation.ts`: the moves (Blueprints' part of the game interface: `moves`), their capture
  marks, and the turns. `record.ts`: the record, on the shared frame. `check.ts`: the capture marks' check against
  each move's captured cells and points, which the engine will give (request 23). `strategyjam.ts`: a strategyjam.org
  game as a record. It is self-contained, as Hedge School's is, so that a tool can run it on the game's page.
  `strategyjamPage.ts`: the reader of Blueprints' game page, and the tools' messages. `tools.ts`: the tools' parts
  (their names, the button's picture and place, the page code), with the files that the routes serve.
- `apps/cyanotype/src/routes/import/` and `src/routes/tools/`: the import page and the tools page.
  `src/lib/review/recordCheck.ts`: a record's check by the engine's rules, for the import page and the Analysis
  board, with its test on the engine in Node (`recordCheck.engine.test.ts`).
  `src/routes/bookmarklet.js/`, `cyanotype.user.js/` and `cyanotype.meta.js/`: the tools' files, which
  `static/_headers` serves with `no-cache`. `vite.config.ts`: the build's address for the userscript, the
  userscript's versions, and the engine package's two settings ("The engine's files", item 5), as Hedge School's.
- `packages/import/` (`@abstractclass/import`): the tools' frame, the hash after the `#`, the import's events and the
  import page's choice for a tool's game (`ToolChoice.svelte`, with `import.css` for its classes), which both sites
  share (design 29, item 10).
- `packages/record/`: the record's frame (`record.ts`), with a test game of words. Hedge School's
  `src/lib/game/record.ts` gives Enclosure's moves and cut mark to it, with its calls as before.
- `packages/analysis/src/turns.ts`: the turns of one move, then two, for both games' `turn`.
- `packages/site/` (`@abstractclass/site`): the frame that the two sites share, moved from Hedge School (item 4).
  `site.css` (the general colour tokens, the players' colours, the base styles, the page area's rules and the general
  controls: the menus, the main button, the icon button, the dialogs and the keys' lists), `SiteFrame.svelte` (the
  header's bar over the page's own scrolling area, with each page's scroll place),
  `theme.svelte.ts` and `ThemeMenu.svelte` (the theme, under each site's own key), `PageMeta.svelte` and
  `origin.ts` (each page's metadata, from the site's live address), `prose.ts` (the pages' text style) and
  `LibraryNotices.svelte` (the libraries and the font Fira Code that the pages ship), and `themeTokens.ts` (the colour
  tokens of a site's style sheets in each theme, read in Node by Hedge School's `symbolShades.test.ts` and the hub's
  `scripts/enclosure-board.mjs`, for the checks that compare colours). Each site's root layout gives `SiteFrame`
  what its header holds, its live address and its keys. Each site keeps its own logo, accent and header links. Hedge
  School's Support Us dialog stays in Hedge School. `SiteMenu.svelte`: the site's menu on a narrow screen (design 22),
  with each site's links, and Hedge School's "Support Us" on a phone. `Replay.svelte`: the home page's board as a
  replay of scenes (design 22), with each site's frames and board. The two footers (`src/lib/SiteFooter.svelte`)
  have the same markup, with each site's links and the game's credit. They are still each site's own, and move into
  the package in a later change (item 4).
- `apps/cyanotype/engine.lock.json`: the engine's files ("The engine's files"), which `npm run engine` fetches into
  `static/engine/` (not in Git). `engine.lock.exceptions.json` beside it: each kind of Hedge School's lock that it
  lacks, with its issue, for the check `engine-kinds` (`scripts/engine-kinds.mjs`, "The gaps from Hedge School").
- `apps/cyanotype/src/lib/board/panel.ts`: the hands' panel: its place and size, its limits, the resize handle, and
  the fit's choice of corner (`fitWithPanel`). `view.ts`, `fitAround`: the fit that keeps the hexes out from under it.
  `Board.svelte`, its prop `hands`: the hands in the board's box ("box", the lab's), in the panel ("panel") or under
  the field ("under"), with the panel's `place` and `size`. Tests: `panel.test.ts` and `view.test.ts`.
- `apps/cyanotype/src/routes/practice/+page.svelte`: Practice. `src/lib/practice/game.svelte.ts`: the game, with
  the rules' worker and the bot. `stampduty.ts`: the site's part of `@abstractclass/practice` (its keys, its networks,
  the half-life, the bot's name). `botWorker.ts`: the bot's worker, in its one form. `bot.engine.test.ts`: the bot at
  1 and 2 visits on a position of more views, in Node.
  `src/lib/board/described.ts`: the engine's describe and describe_game as the board draws them, for the lab and
  Practice.
- `apps/hedgeschool/tests/cyanotype-practice.spec.ts`: whole games against the bot, with each side to start, and a
  reload in the middle. `layout.spec.ts`: the layout of `/practice` and of a game in progress. Both run with
  `CYANOTYPE_BASE_URL`, and the games skip when the site has no bot.
- `.github/workflows/deploy.yml`, the job `cyanotype`: the deploy, with the engine's release files, to the Pages
  project `cyanotype` ([hosting.md](../hosting.md), "Cyanotype").
- `apps/cyanotype/src/lib/board/`: the board, built on the lab's positions, which the engine's early build gave.
  - `Board.svelte`: the cells, the two hands, the last move (one outline round its footprint, its captured cells, an
    edit's arrow in the hand), the candidates, the line (numbered from the candidate), and the hex under the pointer
    with its coordinates. The last-move outline is the edge of the footprint as a whole, in the last move's colour. It
    is inside the footprint, so it has one width all round and does not cover a touching hex.
    Its props follow design 29, item 9: the position, the last move, the candidates (name, move, rank, note), the line
    (each move with its mover and the hands after it), and the candidate that the page points at (`pointed`: the one
    pointed at in the review's table, or else the pinned one). A move carries what the board draws of it: a
    placement's footprint and its captured cells come from the move's data, not from rules.
  - The hands: in a column on each side of a wide area (Blue's on the left, as Blue's cells start on the left), and
    in a row above and below a tall one, such as a phone's. Each blueprint has its own panel, with its number in a
    box and its frame's grid. A blueprint's anchor cell has no mark: it is the first in reading order. An empty
    blueprint shows its hex 0,0 dashed, where an edit can put a cell. All six blueprints have one scale.
  - The candidates: each placement's candidate outline round its footprint, the first choice's thicker and in the
    engine's colour, the others grey. The rank goes on the footprint's hex nearest its middle, or on the next nearest
    that keeps clear of a better candidate's rank and anchor hex. The outlines show each move's shape, and the board's
    cells stay visible. In the hands, a rank chip goes on each blueprint that a placement places, and an edit's rank
    goes on the cell that it moves, with an arrow to its new place, which is dashed. So a reader sees which blueprint
    each candidate takes without a hover. When a candidate is pointed at or pinned, its cells show faded in the
    mover's colour. A hover or a click finds a candidate by its anchor hex (the hex that its name, `K@q,r`, gives) or
    by its rank's hex. While a line shows, the candidates are hidden, and the pointer finds only the candidate whose
    line it is, as on Hedge School's board.
  - The view: the board fits the cells until the player pans or zooms, and again after "Show all the cells". A drag
    or one finger pans, two fingers pinch, and the wheel zooms round the pointer by d3-zoom's steps.
  - `position.ts`: the position in strategyjam.org's form and the move as the board draws it. `hex.ts`: the grid's
    geometry. `view.ts`: pan, zoom and fit. `fixtures.ts`: the lab's positions, from `fixtures.json` ("How the board
    takes a move").
- `apps/cyanotype/src/routes/lab/board/`: the board's lab page (`/lab/board`), in the site's frame: the start, a
  middle game with five candidates and their lines, a capture, an edit and an empty blueprint. The board fills the
  page area under the site's header. The address keeps the position and the pinned candidate.
- `apps/cyanotype/src/app.css`: the board's colour tokens that the shared style and the view's do not hold (the
  board's background and its points), Hedge School's. The last move's, the engine's and the candidates' colours are
  the view's (`packages/review/src/review.css`), and both sites take them from there.
- `apps/cyanotype/src/routes/review/` and `src/routes/analysis/`: the review and the Analysis board, in the shared
  view (`@abstractclass/review/ReviewView.svelte`). `src/lib/review/`: Blueprints' part of the view
  (`blueprintsView.ts`), its game for the analysis (`blueprints.ts`, with the glyphs' parts and the notes), the board
  (`ReviewBoard.svelte`), the glyphs (`MoveLabel.svelte`), the small pictures (`MoveShape.svelte`), the table's least
  size (`table.ts`), the display settings (`display.ts`), and the area map kept for later (`blueprintsMap.ts`).
  `src/lib/board/chips.ts`: the hands' rank chips. The player's notes ("The player's notes"): `notes.ts` and the
  notes' colours (`review.css`) in `packages/review`, which both sites use, and their keys (`NOTE_KEYS`) and drawing
  in `src/lib/board/Board.svelte`, with the arrow's shape and a drag's hexes in `hex.ts` (`arrowPoints`,
  `hexesAlong`).
  `packages/review/src/ReplaceAnalysis.svelte`: the board's question before a record replaces the analysis kept here,
  which both sites' boards use.
- `apps/hedgeschool/tests/cyanotype-review.spec.ts` and `move-header.spec.ts`: the browser tests of the review, and
  `layout.spec.ts` its layout. `cyanotype-notes.spec.ts`: the notes on the Analysis board and on Practice, with
  `cyanotype-notes.ts`, which the review's test, the layout test of the board with notes and Hedge School's test of
  its notes (`notes.spec.ts`) use too.
  `cyanotype-import.spec.ts`: the import page's choice, the Analysis board's question over a kept analysis, a
  record that the engine refuses and the notice of an out-of-date tool, and `layout.spec.ts` the page's layout. They
  run where the site has the engine's files, the Tests workflow too: without them they skip.
  The tests of the review, and the layout test's review and Analysis board, load a stored review of the test game
  (`cyanotype-review.ts`, `storeReview`) and ask the engine for no search: `tests/fixtures/cyanotype-review.json`,
  which `apps/hedgeschool/scripts/cyanotype-review-fixture.mjs` writes again when Cyanotype's `engine.lock.json`
  takes a new release. `cyanotype-live-review.spec.ts` reviews the game's first three turns with the engine, on the
  CPU, and checks that the browser's store then holds the stored review's results for them, value for value.
- `scripts/check-all.mjs`: its engine's release files, its type check, its unit tests, its build and its build's
  file sizes (`scripts/build-sizes.mjs`), in the Tests workflow's checks.
- [requests/23-blueprints-browser-build.md](../requests/23-blueprints-browser-build.md): what the site asks of the
  engine's browser build.

## Log

[decisions/product.md](../decisions/product.md), "Drawing Board, Blueprints' site" (2026-10-25), "The review's
styles in packages/review and packages/site" (2026-10-26), "The player's own moves on Drawing Board, from the
engine's legal moves" (2026-10-27), "The import's frame in packages/import, and Drawing Board's tools"
(2026-10-27), "Drawing Board's practice: its layout, its engine's files, and the shared parts" (2026-10-30),
"Drawing Board's practice: the bot and the page" (2026-10-30), "Drawing Board's practice on protocol 0.7.1"
(2026-10-30), "Drawing Board's review and Analysis board" (2026-11-01), "Drawing Board's import page opens the
review and the Analysis board" (2026-11-01), "Drawing Board's notes" (2026-11-02), "Blueprints' site is
Cyanotype" (2026-11-04), "Cyanotype's review takes two moves that give one position as one move" (2026-11-05),
"Cyanotype's engine from Blueprints' first release" (2026-11-05), and "Cyanotype's build without ONNX Runtime's
WebAssembly" (2026-11-05). The earlier entries name the site by its first name,
Drawing Board.
