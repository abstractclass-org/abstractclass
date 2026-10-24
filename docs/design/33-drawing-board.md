# Drawing Board: Blueprints' site, on Hedge School's design

**Status:** in force. Built: the app's frame (`apps/drawingboard`), with its checks in `npm run check:all`, and the
notation and the record, with the import of a strategyjam.org game as a record. The shell and the board are in
progress. The review and the Analysis board wait for the engine's browser build (request 23).
**Decided:** 2026-10-25.

## Context

Blueprints is the game of strategyjam.org's Fall 2026 jam. Each jam game gets its own site in this repository
(design 26, design 29), with an Analysis board and a review. The plan was to build a template for such a site on a
rehearsal game (Connect-4) first, and to add the jam game's own parts when its rules came out. The rules are out
now, and the engine repository has ported them to KataGame (its `games/blueprints/`). Its network trains now. There
is no browser build of the engine yet.

The game, as the engine repository's `games/blueprints/README.md` gives it:

- An unbounded hex grid in axial coordinates (q, r). A cell is plain, star or wall, and belongs to a player.
- Each player holds three blueprints: shapes of cells, reused at every placement. At the start, each is a star with a
  ring of six cells.
- A move places a blueprint on empty cells next to the mover's own cells, or edits the hand: it moves one cell within
  a blueprint or between two of them. A placement removes every enemy cell next to it, except walls. The mover scores
  the enemy stars removed, times the mover's own stars on the board before the move.
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
   2. **The view's split** into a package, on Hedge School's board and Blueprints' board.
   3. **With the engine's browser build** (request 23): the review, the Analysis board, the import of a
      strategyjam.org game, and the player's own moves.
   4. **Later:** practice against Stamp Duty, lessons, puzzles and an opening book. The meaf.us tools stay Hedge
      School's: meaf.us plays Enclosure only.
4. **Move, do not copy.** A part that both sites use goes into `packages/`, as design 29 moved the engine, the storage
   and the analysis. This holds for the site's frame too (its header, its footer, its page metadata). A move keeps
   design 29's rules: pure renames first, Hedge School's behaviour unchanged, and its checks.
5. **The moves: strategyjam.org's strings, as they are.**
   - **A placement** is `K@q,r`: blueprint K (1, 2 or 3) with its first cell on the hex (q, r). A blueprint's first
     cell is its first in reading order: the least r, then the least q. It is the cell (0, 0) of the blueprint's own
     frame. The hex is in the board's axial coordinates. Their origin is between the two players' starting groups.
   - **An edit** is `I:q,r>J:q,r`: the cell at (q, r) of blueprint I goes to (q, r) of blueprint J. Both coordinates
     are in the blueprints' frames **as they are before the edit**. The rules put the two blueprints back in their
     frames only after the edit. So the string names one edit, also when the edit moves a blueprint's first cell
     (`2:0,0>2:1,2`), or puts a cell before it with a negative coordinate (`1:0,0>3:1,-1`). An empty blueprint takes
     a cell only at `J:0,0`.
   - **A pass** is `pass`: a player's clock ran out. The rules never offer it as a move.
   - **The board as the players see it:** pointy-top hexes, x = √3 (q + r / 2) and y = 1.5 r, with r down the
     screen. strategyjam.org draws its board so.
6. **The marks of a placement:** `x` when it removes enemy cells, and `x+N` when it scores N points (`2@-3,1x+24`).
   A placement that removes a star and scores 0 has `x` alone: the mover had no star on the board. No writer writes
   `+0`. The marks repeat what the position shows. A reader accepts a move with them or without them, and refuses a
   mark that the position does not confirm, as Hedge School's reader refuses `x` on an edge that cuts nothing. The
   quality marks (`?`, `!` and the others) come after them.
7. **The record: Hedge School's form** (its Notation page): the tags, with `Blue` and `Red` for the players, the
   turns with their numbers (1 to 61, as Enclosure's), the comments, the branches, the quality marks by turn, and the
   commands in comments (`[%eval]`, `[%clk]`). strategyjam.org numbers the moves (1 to 120). The record numbers the
   turns, because the review labels turns (design 10). A pass is one move, so the turns go on in twos after it. The
   record's frame moved out of Hedge School into `@abstractclass/record` (item 4): the game gives its moves' syntax
   and its marks as a parameter (`Notation`). Hedge School gives Enclosure's edges and its cut mark, Drawing Board
   Blueprints' moves and their capture marks. Hedge School's `src/lib/game/record.ts` stays at its path with its
   exports, as design 29's `engineSettings.ts` and `store.ts` do. So this move has no pure rename first: a rename
   would leave nothing at the old path, and no file comes back at a moved path (design 29, item 8). The turns of one
   move, then two (`turnFromCount`), are in the analysis package, beside the game interface's `turn`, because both
   games number them so.
8. **The move list** shows a move as strategyjam.org's move list does: the blueprint's number in a box, then the
   hex, then `+N` when the move scores. An edit shows the kind of the cell that it moves.
9. **Two edits can give the same hand.** A string names one edit, but two edits can leave the same blueprints: for
   example, the end wall of a line of walls moved to the line's other end, and the star beside it moved one cell up.
   Some edits leave the hand as it was. So the review compares two moves by the position that they give, not only by
   their names, as it takes Enclosure's two edges of a turn in either order as one turn (design 29).
10. **A position's notation** (as FEN gives a chess position) waits for the board editor and for starts from a set-up
    position. The first version takes games as records: the standard start and the moves. So the record's reader
    refuses a `Position` tag. The shared frame refuses it for each game that gives the frame no start. The import
    refuses a strategyjam.org game whose first position is not the standard start. Every game of the archive starts
    from it.

## Why

- **Hedge School's design is built and checked.** Its layout, its review and its labels hold for any game whose
  turns have one move or two (design 29). Blueprints' turns are Enclosure's.
- **The rehearsal game is not needed.** Its purpose was a second board before the jam game was known. Blueprints'
  board is a real second board, and it shows the view's real seams.
- **strategyjam.org's strings are the game's notation.** The players see them in the site's move list. The game page
  and the site's records hold them, so an import needs no translation. The engine repository's port speaks them in
  its test against the site's rules (its `platforms/strategyjam/site_diff.py`). Each move has one string, with no
  space, so the move tree can key on it (design 29). strategyjam.org's "Dots" button marks the hexes that a click
  places a blueprint from: the hex that a player clicks is the hex that the string names.
- **The rule for an edit works on the site's games.** A model of the hand's rules, written for this check, replayed
  the 1,826 games of strategyjam.org's archive that the engine repository keeps. Every one of the 32,959 edits played
  is in its list of legal edits. 7,061 of them move the source's first cell, 7,944 put a cell before the target's
  first cell, 11,539 stay in one blueprint, and 53 go to an empty blueprint.
- **Two edits with one hand are common.** In 990 of the first 4,000 positions where a game played an edit, two of the
  legal edits give the same hand. A position had 706.6 legal edits and 702.0 different hands on average. One game
  played an edit that left its hand as it was.
- **`x` alone would join two events.** Of the archive's 105,820 placements, 73,599 remove an enemy cell and 41,864
  score, 57.4 points on average. So 31,735 placements remove cells and score nothing. A score is the event that
  decides a game, and strategyjam.org's move label shows it.
- **No `+0`:** the mark gives the points, and the position's scores confirm it. A third case would give one move two
  spellings. strategyjam.org's label shows `+N` only when N is more than 0.

## Alternatives

- **The rehearsal game first:** a template on Connect-4's board, then Blueprints. It costs a board, an import and a
  notation that no player uses, and Connect-4's seams may not be Blueprints'.
- **A copy of Hedge School:** the fastest start, but two copies of the review (`ReviewView.svelte` alone has about
  1,900 lines) drift apart. Design 29 refused a copy for the same reason.
- **A notation of our own:** a placement named by the blueprint's star or its centre, or cube coordinates. A
  blueprint's shape changes with each edit, so it may have no star and no centre. Every player and record would need
  a translation.
- **One mark, `x`, for every removal:** it does not tell a scoring placement from one that scores nothing.
- **A mark for a star removed:** it does not give the points, and it is wrong in the 83 placements where a star went
  and the score did not change.

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
  School's style and a wordmark.

## Where it is

- `apps/drawingboard/`: the app. `src/lib/site.ts`: the site's name and the engine's.
- `apps/drawingboard/src/lib/game/`: the game's notation and records, as Hedge School's `src/lib/game/` holds
  Enclosure's records. `notation.ts`: the moves (Blueprints' part of the game interface: `moves`), their capture
  marks, and the turns. `record.ts`: the record, on the shared frame. `check.ts`: the capture marks' check against
  each move's removed cells and points, which the engine will give (request 23). `strategyjam.ts`: a strategyjam.org
  game as a record. It is self-contained, as Hedge School's is, so that a tool can run it on the game's page.
- `packages/record/`: the record's frame (`record.ts`), with a test game of words. Hedge School's
  `src/lib/game/record.ts` gives Enclosure's moves and cut mark to it, with its calls as before.
- `packages/analysis/src/turns.ts`: the turns of one move, then two, for both games' `turn`.
- `scripts/check-all.mjs`: its type check, its unit tests and its build, in the Tests workflow's checks.
- [requests/23-blueprints-browser-build.md](../requests/23-blueprints-browser-build.md): what the site asks of the
  engine's browser build.

## Log

[decisions/product.md](../decisions/product.md), "Drawing Board, Blueprints' site" (2026-10-25).
