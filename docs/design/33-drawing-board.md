# Drawing Board: Blueprints' site, on Hedge School's design

**Status:** in force. Built: the app (`apps/drawingboard`), with its checks in `npm run check:all`, its shell (the
header, the footer, the Home, About, Notation, Privacy and Notices pages, and the deploy job), and the notation and the
record, with the import of a strategyjam.org game as a record. The owner's step for the address is left
(abscls-8tl1.3). The board and the player's own moves are built, on positions that the engine's early build gave.
The review's view is in a package, on Hedge School's board and on Blueprints' (design 29, item 9). The tools for
strategyjam.org and the import page are built: the page shows the record that a tool sends ("How a game comes in from
strategyjam.org"). Their test on strategyjam.org waits for the owner (abscls-8tl1.12). The site fetches the engine's
0.7.0 build with its practice bot (`engine-217be61f`, on this machine only) as Hedge School fetches its own. Practice
against Stamp Duty (`/practice`) is built and plays on this machine ("Practice against Stamp Duty"). The review and the
Analysis board come after it (abscls-8tl1.7).
**Decided:** 2026-10-25. Practice's layout and its bot: 2026-10-30.

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

1. **The names.** The site is **Drawing Board**, in `apps/drawingboard`. Its address is to be
   `drawingboard.abstractclass.org`, as Hedge School's is `hedgeschool.abstractclass.org`. The address, the Pages
   project and the DNS name are a step for the owner of the account (abscls-8tl1.3). The engine and its practice bot
   are **Stamp Duty**, as Hedge School's are HedgeFund. A drawing board is where blueprints are drawn, and "back to
   the drawing board" is what a player does after a lost game. Stamp duty is a tax on property, and a stamp is the
   game's main move.
2. **Hedge School's design, with Blueprints' parts.** Drawing Board has Hedge School's pages, layout, review, Analysis
   board, import and settings, as Hedge School's design documents give them. Only the game's own parts change: the
   board, the player's own moves, the notation and the record, the players' cards (the scores and the stars), the
   sounds, and the texts that name a move. A design document of Hedge School holds for Drawing Board, unless this
   document names a departure.
3. **No rehearsal game.** The view's split (design 29, item 9) happens on Blueprints' board, the first board of a
   second game. The work goes in this order:
   1. **Without the engine:** the app and its shell (its header, home, about, privacy and notation pages, its
      deploy job), the notation and the record, and the board (the cells, the hands, a move drawn on them).
   2. **The view's split** into a package, on Hedge School's board and Blueprints' board: `@abstractclass/review`, with
      the view's game interface (design 29, item 9). Drawing Board gives Blueprints' part of it with the review.
   3. **With the engine's browser build** (request 23): the review, the Analysis board, the import of a
      strategyjam.org game into them, and the player's own moves. The tools for strategyjam.org and the import page
      need no engine, so they come first, and the import page shows the record until the review comes.
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
   Drawing Board Blueprints' moves and their capture marks. Hedge School's `src/lib/game/record.ts` stays at its path
   with its exports, as design 29's `engineSettings.ts` and `store.ts` do. So this move has no pure rename first: a
   rename would leave nothing at the old path, and no file comes back at a moved path (design 29, item 8). The turns of
   one move, then two (`turnFromCount`), are in the analysis package, beside the game interface's `turn`, because both
   games number them so.
8. **The move list** shows a move as strategyjam.org's move list does: the blueprint's number in a box, then the
   hex, then `+N` when the move scores. An edit shows the kind of the cell that it moves.
9. **Two edits can give the same hand.** A string names one edit, but two edits can leave the same blueprints: for
   example, the end wall of a line of walls moved to the line's other end, and the star beside it moved one cell up.
   Some edits leave the hand as it was. So the review compares two moves by the position that they give, not only by
   their names, as it takes Enclosure's two edges of a turn in either order as one turn (design 29). Not built yet:
   the view compares the engine's moves with the game's `equal`, which takes no position, and the game's tree keeps a
   move by its name (design 29, item 9). Drawing Board's review shapes this (abscls-8tl1.7).
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

**Where Drawing Board departs from it:**

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

Where it is: `apps/drawingboard/src/lib/board/input.ts` (what a click does, the status's texts and the clicks'
list, with its tests), `blueprintInput.svelte.ts` (the `MoveInput` that the board and the view take), and
`Board.svelte` and `Hand.svelte` (the dots, the footprint, the chosen blueprint and cell, and the clicks).

**The lab's positions come from the engine.** Each position of the lab page is a game of moves from the standard
start, which Stamp Duty's early build (`engine-0d2a5416`) played. The script
`apps/drawingboard/scripts/board-fixtures.mjs` (`npm run fixtures`) runs the site's build in Node, and stores what the
engine gives in `src/lib/board/fixtures.json`: each position, its mover, every legal move (describe), and what each
move did (describe_game: the footprint, the captured cells, the points and the hands after it). The candidates and
their lines are hand-made marks, and the engine plays each one where it stands, so each is a legal move. The 0.7.0
builds (`engine-b64eea10`, then `engine-217be61f`) give the five games the same data as the early build: only the
file's header, which names the build, changed.

- **The build and the tests read the stored file:** CI has no engine files. `fixtures.engine.test.ts` runs the engine
  again and compares. It is skipped when the site has no engine (`npm run engine` was not run).
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

Drawing Board takes the engine's files as Hedge School does (design 03): `apps/drawingboard/engine.lock.json` pins each
file by its SHA-256, and `npm run engine` (`packages/engine/src/fetch-engine.mjs`, which both sites run) puts them in
`static/engine/` with their manifest. The page loads them from there.

1. **The build:** `engine-217be61f`, the engine repository's 0.7.0 build with the search of the root's views (request
   24), its practice bot (`blueprints-bot.wasm`, interface 0.1.0, with `practice_bot.mjs`, request 25) and bpj4's
   network `b6c96-s19117184-d446546`. Every file comes from the one build. It is not released: the lock takes its
   files from the engine repository's checkout beside this one (a source of kind `engines`). So
   `npm run engine -- --deploy` refuses it, as it refuses each file that is not from a release. A live page needs a
   release with a trained network (the owner's yes) and Drawing Board's Pages project (abscls-8tl1.3).
2. **Protocol 0.7.** Blueprints' build speaks 0.7.0, and Enclosure's stays 0.6.x (the engine repository's design 04,
   "Versioning"). The lock's `protocol` names the protocol that Drawing Board's code is written for, and the manifest
   carries it, so `packages/engine` refuses a module of another minor version for each site: 0.6.x for Hedge School,
   0.7.x for Drawing Board. The types take request 24's fields: the query's `rootViews`, a candidate's `checkVisits`,
   and `rootInfo`'s `views` and `searches`. The network's raw values are optional: a reply of more views has none.
3. **No file only on this machine for the build or the tests.** The build and the Tests workflow run without
   `static/engine`. The checks that need the engine skip without it, with a message: the fixtures' test, and the
   browser tests that play against the bot. Without the files, `/practice` says that the engine is not on the site.
4. **The CPU only.** The lock has no GPU module, so the fetch script stores no ONNX Runtime for Drawing Board. The
   rules' worker starts the engine with `createCpuEngine` alone. The bot is the practice bot with one search thread,
   whose network runs in its own module, and its worker has no ONNX Runtime and no WebGPU code: Blueprints has no
   threaded bot.

## Practice against Stamp Duty

A game against Stamp Duty in the browser, as Hedge School's Practice (design 24, design 25): the settings card, then
the game in the review's layout. The bot is the engine repository's practice bot for Blueprints (abscls-1if9), in
Hedge School's form where Blueprints allows: KataGo's GTP engine with its play settings, not the analysis module's
`chooseMove`, for the reasons of request 15 (the analysis settings, and a new tree for each query).

**The bot** (the engine repository's games/blueprints/README.md, "The practice bot"): `blueprints-bot.wasm`, one
search thread on the CPU, the native GTP engine's play settings, the root's views on. The page sends
`blueprints-start SEED`, then the visits and the variety (`kata-set-param`, with GTP's half-life of 19 moves, as for
Enclosure), then `play`, `genmove` and `undo` with the site's strings. A reload sets the bot's game to the kept moves
with `blueprints-set-game`: `undo` then takes them back as any others, so a takeback works after a reload.

**The game:** the engine's rules worker gives each position, what each move did and the player's legal moves
(describe, describe_game), as on Hedge School's Practice. The page checks each of the bot's moves against the rules'
legal moves, and stops the game with an error when one is not legal. An error of the engine stops the game too, with
the engine's message ("The game stopped: ..."), as Hedge School shows it. The final score is the rules' score of the
game's last position (`scores`, and the margin of `outcome`). This browser keeps the game in progress
(`drawing-board:practice-game:1`), the choices (`drawing-board:practice-choices:1`) and the panel's place and size
(`drawing-board:practice-panel:1`).

**How it departs from Hedge School's Practice (design 24):**

1. **The visits start at 27,** not 1: Drawing Board offers 27 to 8,192. With the root's views on, the bot's genmove
   fails when the visits are at most twice the views of the position's cover, and the site's games have covers of up
   to 13 views. It failed on no position with 27 visits or more (the engine's README, "The search"). The least is one
   constant (`LEAST_VISITS` in `src/lib/practice/stampduty.ts`), so that the engine's fix (abscls-csmy, protocol
   0.7.1) can lower it to 1.
2. **A search of more views takes its best check, with no temperature,** and a move of another view keeps no tree for
   the next move (the engine's README, "The search"). The variety then does not act on that move. Request 25 accepts
   this.
3. **No Your games, no stored game, no analytics and no review:** the site has no store of games, no backend (design
   25) and no analytics (design 17) yet, and the review comes with abscls-8tl1.7. So a game that ends is no longer
   kept: the next visit starts a new one. Abort ends the game, and it is gone.
4. **Fewer display settings:** the points' bar always shows, with no second number (Blueprints has no area), and the
   page has no sounds and no notes on the board. No game comes from a record or a set-up start: the Analysis board's
   Play comes with it (abscls-8tl1.7).
5. **The move list has one move a line,** each turn's number at its first move: Blueprints' moves are up to about 19
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
"fill"), the practice's part that is not Enclosure's (`practice.ts`: the visits with each site's least, the variety
and its help, the choices and the kept game under each site's key, the GTP helpers, the takeback, the results), and
the bot's page side and its worker (`bot.ts`, `botWorker.ts`, `botMessages.ts`). Each site gives its worker module and
the game's name in the bot's commands. Hedge School's threaded forms (the GPU, the CPU workers) stay in Hedge School
(`botForms.ts`, `hedgefundWorker.ts`). Hedge School's stored games (design
25) stay in Hedge School until Drawing Board has a backend: the server's check names Enclosure's edges, and the
Pages Function bundles it alone.

## How a game comes in from strategyjam.org

Drawing Board has Hedge School's bookmarklet and userscript for strategyjam.org (design 11) and its import page
(design 22), on the tools' frame in `@abstractclass/import` (design 29, item 10). Its own parts:

1. **The names, in Drawing Board's words.** The bookmark and the userscript are **Open in Drawing Board**. The button
   and Tampermonkey's menu entry say "Open this game in Drawing Board". The messages name "the Open in Drawing Board
   bookmark" and "the Drawing Board button". "Open", not Hedge School's "Review": the import page opens the game, and
   the review is not built yet. The userscript's files are `/drawing-board.user.js` and `/drawing-board.meta.js`. It
   runs on Blueprints' game pages alone (`https://strategyjam.org/blueprints/game/*`).
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
5. **The import page** (`/import`) shows the game that a tool sent: the players, the number of moves, the position
   that the game's page showed (the moves before it, and that move's turn in the record), and the record as Drawing
   Board wrote it. It says that the review and the Analysis board come later. For an out-of-date tool, it says how to
   update it, as Hedge School's does. Without a game, the page goes to the tools page.
6. **Until the review comes** (abscls-8tl1.7), the import page departs from Hedge School's: it offers no choice
   between the review and the Analysis board, and the engine does not check the moves. The game stays in the page's
   address, since the site has no analytics yet and keeps no game: a reload shows the game again. With the review, the
   page takes the game out of the address as Hedge School's does, and the import's events count it.
7. **The tools page** (`/tools`) gives the steps to install the bookmarklet and the userscript, in strict Simplified
   Technical English with the glossary's words. Its link is in the header from a tablet's width, and in the footer on
   a phone, as Hedge School's (design 22).

The tools have not run on strategyjam.org itself: they run in the player's own logged-in page, and that test waits for
the owner (abscls-8tl1.12). The tests use page states that they make, with moves that Stamp Duty's early build played
(`fixtures.json`), and the built tools ran on mock pages of both layouts in Chromium.

## Why

- **Hedge School's design is built and checked.** Its layout, its review and its quality labels hold for any game whose
  turns have one move or two (design 29). Blueprints' turns are Enclosure's.
- **The rehearsal game is not needed.** Its purpose was a second board before the jam game was known. Blueprints'
  board is a real second board, and it shows the view's real seams.
- **strategyjam.org's strings are the game's notation.** The players see them in the site's move list. The game page
  and the site's records hold them, so an import needs no translation. The engine repository's port speaks them in
  its test against the site's rules (its `platforms/strategyjam/site_diff.py`). Each move has one string, with no
  space, so the move tree can key on it (design 29). On Drawing Board's board, the hex that a player clicks for a
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
  The engine must still play the others and describe the positions after them. They are never among its
  candidates.
- **The review's constants are Hedge School's** until Blueprints' games show other values: the search budgets, the
  threshold of a hard position, and how far below the first choice a candidate shows (design 29, "Consequences"). The
  score's scale is the engine's (`SCORE_SCALE` 12 in the port).
- **The site's look:** a logo, a colour and the board's style are still to decide. The shell starts with Hedge
  School's style and a wordmark. The userscript's button shows a blueprint until the logo comes ("How a game comes in
  from strategyjam.org", item 4).

## Where it is

- `apps/drawingboard/`: the app. `src/lib/site.ts`: the site's name, the engine's, the live address
  (`https://drawingboard.abstractclass.org`, the canonical address of each page) and the storage keys
  (`drawing-board:…`). `src/routes/+layout.svelte`: the header, with the wordmark, Notation, About and the theme
  menu. `src/lib/SiteFooter.svelte`: the footer, with Privacy and Notices. `src/app.css`: the neutral accent and the
  board's colour tokens, after the shared style and the view's (`@abstractclass/review/review.css`).
- `apps/drawingboard/src/routes/`: the pages. The Notation page describes the moves, the marks and the record of
  items 5 to 7, 9 and 10, with one game made by hand as its examples. Item 8 is the move list's display, and comes
  with the move list. `sitemap.xml`, `static/robots.txt` and `static/_headers` follow
  design 23. The build's `404.html` answers each path that the site does not have.
- `apps/drawingboard/src/lib/game/`: the game's notation and records, as Hedge School's `src/lib/game/` holds
  Enclosure's records. `notation.ts`: the moves (Blueprints' part of the game interface: `moves`), their capture
  marks, and the turns. `record.ts`: the record, on the shared frame. `check.ts`: the capture marks' check against
  each move's captured cells and points, which the engine will give (request 23). `strategyjam.ts`: a strategyjam.org
  game as a record. It is self-contained, as Hedge School's is, so that a tool can run it on the game's page.
  `strategyjamPage.ts`: the reader of Blueprints' game page, and the tools' messages. `tools.ts`: the tools' parts
  (their names, the button's picture and place, the page code), with the files that the routes serve.
- `apps/drawingboard/src/routes/import/` and `src/routes/tools/`: the import page and the tools page.
  `src/routes/bookmarklet.js/`, `drawing-board.user.js/` and `drawing-board.meta.js/`: the tools' files, which
  `static/_headers` serves with `no-cache`. `vite.config.ts`: the build's address for the userscript, and the
  userscript's versions, as Hedge School's.
- `packages/import/` (`@abstractclass/import`): the tools' frame, the hash after the `#` and the import's events, which
  both sites share (design 29, item 10).
- `packages/record/`: the record's frame (`record.ts`), with a test game of words. Hedge School's
  `src/lib/game/record.ts` gives Enclosure's moves and cut mark to it, with its calls as before.
- `packages/analysis/src/turns.ts`: the turns of one move, then two, for both games' `turn`.
- `packages/site/` (`@abstractclass/site`): the frame that the two sites share, moved from Hedge School (item 4).
  `site.css` (the general colour tokens, the players' colours, the base styles, the page area's rules and the general
  controls: the menus, the main button, the icon button, the dialogs and the keys' lists), `SiteFrame.svelte` (the
  header's bar over the page's own scrolling area, with each page's scroll place),
  `theme.svelte.ts` and `ThemeMenu.svelte` (the theme, under each site's own key), `PageMeta.svelte` and
  `origin.ts` (each page's metadata, from the site's live address), `prose.ts` (the pages' text style) and
  `LibraryNotices.svelte` (the libraries that the pages ship). Each site's root layout gives `SiteFrame` what its
  header holds, its live address and its keys. Each site keeps its own logo, accent and header links. Hedge School's
  site menu and Support Us dialog stay in Hedge School. The two footers (`src/lib/SiteFooter.svelte`) have the same
  markup, with each site's links and the game's credit. They are still each site's own, and move into the package in a
  later change (item 4).
- `apps/drawingboard/engine.lock.json`: the engine's files ("The engine's files"), which `npm run engine` fetches into
  `static/engine/` (not in Git).
- `apps/drawingboard/src/lib/board/panel.ts`: the hands' panel: its place and size, its limits, the resize handle, and
  the fit's choice of corner (`fitWithPanel`). `view.ts`, `fitAround`: the fit that keeps the hexes out from under it.
  `Board.svelte`, its prop `hands`: the hands in the board's box ("box", the lab's), in the panel ("panel") or under
  the field ("under"), with the panel's `place` and `size`. Tests: `panel.test.ts` and `view.test.ts`.
- `apps/drawingboard/src/routes/practice/+page.svelte`: Practice. `src/lib/practice/game.svelte.ts`: the game, with
  the rules' worker and the bot. `stampduty.ts`: the site's part of `@abstractclass/practice` (its keys, its networks,
  `LEAST_VISITS`, the half-life, the bot's name). `botWorker.ts`: the bot's worker, in its one form.
  `src/lib/board/described.ts`: the engine's describe and describe_game as the board draws them, for the lab and
  Practice.
- `apps/hedgeschool/tests/drawingboard-practice.spec.ts`: whole games against the bot, with each side to start, and a
  reload in the middle. `layout.spec.ts`: the layout of `/practice` and of a game in progress. Both run with
  `DB_BASE_URL`, and the games skip when the site has no bot.
- `.github/workflows/deploy.yml`, the job `drawingboard`: the deploy, skipped while `DRAWINGBOARD_PAGES_PROJECT` is
  empty ([hosting.md](../hosting.md), "Drawing Board").
- `apps/drawingboard/src/lib/board/`: the board, built on the lab's positions, which the engine's early build gave.
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
- `apps/drawingboard/src/routes/lab/board/`: the board's lab page (`/lab/board`), in the site's frame: the start, a
  middle game with five candidates and their lines, a capture, an edit and an empty blueprint. The board fills the
  page area under the site's header. The address keeps the position and the pinned candidate.
- `apps/drawingboard/src/app.css`: the board's colour tokens that the shared style and the view's do not hold (the
  board's background and its points), Hedge School's. The last move's, the engine's and the candidates' colours are
  the view's (`packages/review/src/review.css`), and both sites take them from there.
- `scripts/check-all.mjs`: its type check, its unit tests and its build, in the Tests workflow's checks.
- [requests/23-blueprints-browser-build.md](../requests/23-blueprints-browser-build.md): what the site asks of the
  engine's browser build.

## Log

[decisions/product.md](../decisions/product.md), "Drawing Board, Blueprints' site" (2026-10-25), "The review's
styles in packages/review and packages/site" (2026-10-26), "The player's own moves on Drawing Board, from the
engine's legal moves" (2026-10-27), "The import's frame in packages/import, and Drawing Board's tools"
(2026-10-27), "Drawing Board's practice: its layout, its engine's files, and the shared parts" (2026-10-30), and
"Drawing Board's practice: the bot and the page" (2026-10-30).
