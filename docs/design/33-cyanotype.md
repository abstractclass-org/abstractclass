# Cyanotype: Blueprints' site, on Hedge School's design

**Status:** in force. Built: the app (`apps/cyanotype`), with its checks in `npm run check:all`, its shell (the
header, the footer, the Home, About, Notation, Privacy and Notices pages, and the deploy job), and the notation and the
record, with the import of a strategyjam.org game as a record. The owner's step for the address is left
(abscls-8tl1.3). The board and the player's own moves are built, on positions that the engine's early build gave.
The review's view is in a package, on Hedge School's board and on Blueprints' (design 29, item 9). The tools for
strategyjam.org and the import page are built: the page opens the game that a tool sends in the review or on the
Analysis board. For the review, it keeps the game first, as Hedge School's does ("How a game comes in from
strategyjam.org"). Their test on strategyjam.org waits for the owner (abscls-8tl1.12). The site fetches Blueprints'
release `engine-887be290` (Stamp Duty 0.2, protocol 0.8.0), as Hedge School fetches its own ("The engine's files"). It
has the GPU module and the practice bot's three forms, so the engine runs on the visitor's GPU as Hedge School's does.
Practice against Stamp Duty (`/practice`) is built ("Practice against Stamp Duty"). The review and the Analysis board
are built (abscls-8tl1.7, "The review and the Analysis board"), with no area map yet. A position's notation, the board
editor and starts from a set-up position are built (abscls-8tl1.39, "Decision", item 10, and "The board editor"), with
the engine's check that a game can reach a position (abscls-8tl1.59). The Analysis board's "Play the bot from here"
and Practice from a set-up start are built (abscls-8tl1.40, "Practice against Stamp Duty", "From a position"). The
early access is built, as Hedge School's ("Decision", item 11). The player's games, kept in this browser, are built as
Hedge School's (abscls-8tl1.38, "The player's games"), with their review files (abscls-8tl1.34, "The review files"), the
review snapshot and the annotated record from the store (abscls-8tl1.35). Partner sites are designed, not built
("Partner sites"). The analytics are built as Hedge School's (abscls-8tl1.48), with PostHog in place of Google
Analytics and no consent (abscls-xb0k, "Analytics").
**Hedge School's features:** Cyanotype has every feature that Hedge School has, the GPU path too. Each gap has an
issue that holds the decision about it: to build the feature, or to leave it out. The work on the site never leaves
out a feature without that decision. "The gaps from Hedge School" lists each gap with its issue, and a gap with no
issue yet waits for one. The check `engine-kinds` of `npm run check:all` holds the engine lock to the same rule
(design 29, "Consequences").
**Decided:** 2026-10-25. Practice's layout and its bot: 2026-10-30. The review and the Analysis board: 2026-11-01. The
import page's choice: 2026-11-01. The name Cyanotype: 2026-11-04. Hedge School's features: 2026-11-05. A position's
notation and the board editor: 2026-11-07. The early access: 2026-11-07. The player's games: 2026-11-07. Partner sites:
2026-11-08. The import page keeps the game: 2026-11-08. The review files: 2026-11-08. The position check: 2026-11-09.
The analytics: 2026-11-06, with PostHog and no consent: 2026-11-09. Practice from a position: 2026-11-09.

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
10. **A position's notation:** one line of seven fields, separated by spaces, as FEN gives a chess position, in the
    form of Hedge School's notation for an Enclosure position (the engine repository's design 04, "A position"). A
    record's `Position` tag, the board editor's field, the Analysis board's Import and a link's or a file's start hold
    it (`src/lib/game/position.ts`):
    1. Blue's cells on the board, in reading order (the least r, then the least q), separated by `;`. A cell is its hex
       `q,r`, then its kind's letter: `s` for a star, `w` for a wall, and none for a Normal cell. `-` for no cell.
    2. Red's cells, the same.
    3. Blue's hand: blueprints 1, 2 and 3, separated by `|`, each its cells in its own frame (item 5), in reading
       order. `-` for an empty blueprint.
    4. Red's hand, the same.
    5. The mover and the moves left in its turn: `b1`, `r2`, and `r0` after 120 moves. The moves played fix it, and
       the reader refuses another.
    6. The scores, Blue's, then Red's: `8/0`.
    7. The moves played, 0 to 120. A pass is one move.

    So a position has one spelling. The standard start has 435 characters, and the longest position of the review's
    test game has 5,009 (729 cells). A record from a set-up start numbers its turns from the start's moves played, as
    Hedge School's does: a start at a turn's second move opens with `N...`. The standard start written out is no set-up
    start (`setUpStart`), so a board from it keeps the standard start's stored results. The review takes games from the
    standard start only, and says to open another on the Analysis board (`setUpProblem` in `src/lib/game/record.ts`).
    The import still refuses a strategyjam.org game whose first position is not the standard start. Every game of the
    archive starts from it.
    - **Where it departs from Hedge School's form:**
      - **Cells, with `;` between them:** a hex has a comma, so the list takes `;`, as the engine's one-line position
        does. Hedge School's edges have none, and its list takes commas.
      - **A kind's letter, and none for a Normal cell:** Hedge School marks only the edges of the turn (`*`, `+`), and
        an edge with no mark is an edge of the board. So the most common kind has no letter. The engine's letter `p`
        (strategyjam.org's `plain`) is a word that the players do not read (the glossary's Normal).
      - **The hands,** fields 3 and 4: a move places a blueprint or edits one, so the hands are part of the rules'
        state, as the pieces in hand are in shogi's SFEN.
      - **No marks of the turn:** Blueprints' rules keep nothing of the moves of the turn so far, where Enclosure's
        protect the last turn's edges. The mover field and the moves played carry the turn.
      - **Whole scores:** a Blueprints score counts stars, so it has no fraction.
    - **SGF's setup properties** list the stones by colour (`AB`, `AW`), and `PL` names the player to move. The
      notation lists each player's cells, as SGF lists each colour's stones and Hedge School each player's edges.
    - **Where it departs from FEN and SGF:** the cells in reading order, where SGF's lists have no order, so that a
      position has one spelling and keys its stored results. The moves left in the turn beside the mover, where FEN
      and `PL` name the player only: a Blueprints turn has two moves. The moves played in place of FEN's move
      number and halfmove clock: they give the turn and the mover, and Blueprints has no draw by a count of moves. No
      castling or en passant field: Blueprints has nothing of the kind. The hands, as SFEN has the pieces in hand.
    - **Where it departs from the engine's one-line position** (the engine repository's games/blueprints/README.md,
      "The port"): the engine's form has nine fields. Its cells are from the middle of its rules board, with that
      middle's site coordinates (the offset), and it has the pick of an edit in progress and each player's last two
      placements' boxes, which set the network's view. The site's notation keeps the board's own coordinates, which
      the moves name, and leaves out the rest, as FEN leaves out what only an engine needs: a position between moves
      has no pick, and the boxes are history. The site writes the engine's form for each query (`enginePosition`):
      the middle of the cells' box as the offset, no pick and no boxes. The engine then puts the view at the middle of
      the cells, and the search of the root's views (item 10 of "The review and the Analysis board") reaches every
      legal placement. The game interface takes it as `enginePosition` (design 29, item 2): the board keeps the
      notation's text, the stored results' keys name it, and only the engine's queries take the engine's form.
    - **So the engine searches a start from its notation with another view** than the same position reached by its
      moves: the network sees the board round the middle of the cells, not round the last placements. The rules are
      the same, and the candidates are not. The measurement is of `engine-3ac5c2fc` (Stamp Duty 0.1, the network
      `b6c96-s40806528-d2304635`), on the CPU at 400 visits, and was not made again at `engine-91ab0b7d`. On 9
      positions of Stamp Duty's games (the lab's four games with moves, and the review's test game after 9, 20, 40, 77
      and 100 moves), the best move was the same in 2. The two top fives shared 0 to 3 moves, and the
      root's Blue win differed by 0 to 8.3 points (the median 0.9). The same position searched twice from its moves
      gave the same best move and top five each time. The stored results keep the two apart: their keys name the start's
      notation, or the moves from the standard start. A line played from a set-up start gets its placements' boxes
      from its own moves. Request 28 measured it again with Stamp Duty 0.2 at 400 visits, on 10 positions (the engine
      repository's games/blueprints/README.md, "A set-up start's view"): the moves gave the game's best move at 10,
      the engine's one-line form at 4 and the site's form at 4. No start without its moves can search as its game,
      because the search reads each player's last placements. So a game's position goes to the engine as its moves,
      and a set-up start keeps its own search.
    - **The rules' checks:** the engine reads a position, and refuses a hand that does not hold 21 cells, a blueprint
      that is not connected, and cells that span more than its rules board holds (511 × 511). The notation's reader
      refuses a blueprint that is not in its frame.
    - **The position check** (protocol 0.8.0, request 28, as Enclosure's protocol 0.5 checks its positions): the
      engine's `describe` says whether a game can reach its `position`, with the reasons when none can. Each reason
      has a code, words that a player reads, and the hexes that it names, in the board's coordinates. The check reads
      what the notation holds: the cells, both hands, the scores and the moves played. It refuses only what every
      game makes certain (the engine repository's games/blueprints/README.md, "The position check"):
      - With no move played, the position is the standard start.
      - The start's walls stay on their hexes.
      - No cell of Blue's that is not a wall touches a cell of Red's that is not a wall.
      - A player's cells and walls are no more than its moves can put.
      - Each hand holds the start's cells.
      - A player who has made no move has no points.

      Every position of the archive's games passes. The engine refuses an analysis of a position that no game
      reaches, and gives a finished one the game's end first. So the board editor, the Import and a start from a
      link or a file take the check before they open the Analysis board, as Hedge School's do (its design 21). A
      record from a set-up start takes it before its moves. A board kept in the browser whose start fails the check
      (one kept before the check) gives way to a new board, with a notice, as a kept board with a komi does.
      describe_game gives no check: the site asks describe for it (`src/lib/review/recordCheck.ts`, `startChecked`).
    - Every position of the lab's games and of the review's test game (125 positions with legal moves) comes
      back from its notation as the same position, with the same legal moves (`position.engine.test.ts`, at
      `engine-3ac5c2fc`, at `engine-91ab0b7d` and at `engine-887be290`).
    - **A position cut or changed:** the reader refuses a position with a field missing or a field it cannot read, and
      a mover field that the moves played do not give. A cut inside the moves played can still give another position
      that reads, when the shorter count gives the same mover (`r1 0/0 22` cut to `r1 0/0 2`), as a cut FEN can. The
      notation has no checksum, as a link has none. The engine's reading checks the hands and the frames, and its
      position check refuses only a position that no game reaches, not every change. Every cut of the lab's positions
      says what is wrong (`position.test.ts`).
11. **The early access, as Hedge School's** (design 11, "The header" and "One build switch"). The header shows "Early
    Access" beside the name, in the accent colour, at every width down to 360 pixels. It leads to the About page's
    section on the early access (`#early-access`). That section says first that everything can change (the pages and
    their addresses, the notation, the quality labels, the engine and its network, the files and links that the site
    makes, and what it keeps in the browser), then what the site does now. `VITE_EDITION=early` builds the early
    access, and the Deploy and Tests workflows build Cyanotype with it, as they build Hedge School. The switch
    (`edition.ts`) and the name with its link (`SiteName.svelte`) are in `packages/site`, for both sites. Cyanotype
    has none of Hedge School's prototype pages (Puzzles, Learn and the engine lab, "The gaps from Hedge School"), so
    its early access hides no page, and the link is all that the switch changes.

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
   when the engine's describe answers) sees the view fit again once, when the rules come. While a pointer is down on
   the board, the view keeps its fit, and it fits again after the release. A move of the hands' panel to another
   corner waits for the release too. So the board does not move under a press, as chessground's board never does.
   On a busy machine the rules can come during a click. A click, a tap or a right-click then takes the hex that it
   pressed, not the hex that the new fit puts under the pointer. A press on a hand in the panel does not hold the
   panel. If the panel moves under it, the click is lost.
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
builds (`engine-b64eea10`, `engine-217be61f`, `engine-70dfdc0f` with a new network, then the releases
`engine-3ac5c2fc` and `engine-91ab0b7d`) and the 0.8 release `engine-887be290` give the five games the same data as
the early build: only the file's header, which names the build, changed. The data is the rules' alone, which no
network changes.

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
file by its SHA-256, and `npm run engine` (`apps/cyanotype/scripts/engine.mjs`) puts them in `static/engine/` with
their manifest. The page loads them from there.

1. **The release:** `engine-887be290` (Stamp Duty 0.2), in the public repository
   [abstractclass-org/blueprints-engine](https://github.com/abstractclass-org/blueprints-engine), with its manifest.
   Its files: the module (`blueprints-engine.wasm`, build `887be290`, protocol 0.8.0 with the position check of
   request 28, and the search `91ab0b7d` of request 24's root's views), the GPU module (`blueprints-engine-gpu.wasm`,
   the same protocol and search) and the network's graph (request 26), `gpu_engine.mjs`, the practice bot with one
   search thread (`blueprints-bot.wasm`, interface 0.1.3, with `practice_bot.mjs`, request 25), the threaded practice
   bot (`blueprints-bot-batched.wasm`, interface 0.1.3) with its CPU evaluator (`blueprints-eval.wasm`,
   `cpu_evaluator.mjs` and `cpu_eval_worker.mjs`), `NOTICES.txt`, `LICENSE.txt` and bpj5's network
   `b6c96-s47076224-d3087660`, whose name in the release is Stamp Duty 0.2. Interface 0.1.3 adds
   `blueprints-set-position`, the bot from a set-up start, which Practice takes. Each entry of the lock takes its
   file from a release (a source of kind `release`), with the SHA-256 and the size of the release's manifest. The
   four files that the release changed (the two modules and the two bots) come from `engine-887be290`. The other
   nine have the same bytes in both releases (the same SHA-256 in both manifests), so they keep their entries of
   `engine-91ab0b7d` and their paths, and a browser's cache keeps them, as Hedge School's lock keeps the files that a
   release did not change. The lock also copies the manifest's networks' sizes (`sizes`: a board of 67
   and 6 policy channels, item 4) and the evaluator's `maxThreads` (128). `npm run engine` compares these numbers
   with the release's manifest, and stops at a difference ([design 03](03-stack.md)). It also holds the lock's files
   to one release's set: one release of the lock must name every file with the lock's entry. engine-887be290's
   manifest names all 13 files with the lock's SHA-256. And it plays the threaded bot on its CPU evaluator against the
   one-thread bot (design 24, item 14). The release's `settings.cfg` is
   the text of the search's settings, which the module embeds: the site does not read it, so the lock does not take
   it. The engine repository's record of the release: its
   [games/blueprints/docs/decisions/port.md](https://github.com/abstractclass-org/engines/blob/main/games/blueprints/docs/decisions/port.md),
   entries of 2026-11-07 (`engine-91ab0b7d`) and 2026-11-09 (`engine-887be290`). Blueprints' earlier releases,
   `engine-3ac5c2fc` (Stamp Duty 0.1, without the GPU module and the threaded bot) and `engine-91ab0b7d` (protocol
   0.7.1, without the position check), stay in `abstractclass-org/blueprints-engine`. The stored results of
   `engine-91ab0b7d` stay valid: their keys name the search, which is the same, and the network
   (`packages/analysis/src/cache.ts`).
2. **Protocol 0.8.** Blueprints' build speaks 0.8.0, and Enclosure's stays 0.6.x (the engine repository's design 04,
   "Versioning"). 0.7.0 brought the search of the root's views, and 0.7.1 its move at few visits: a search whose
   passes find no candidate gives its first pass's policy move. 0.8.0 brought the position check, and breaks a 0.7
   client, as Enclosure's 0.5 broke a 0.4 client: the engine refuses an analysis of a position that no game reaches. The
   lock's `protocol` names the protocol that Cyanotype's code is written for (0.8.0, `ROOT_VIEWS_PROTOCOL`), and the
   manifest carries it, so `packages/engine` refuses a module of another minor version for each site: 0.6.x for Hedge
   School, 0.8.x for Cyanotype. The types take request 24's fields: the query's `rootViews`, a candidate's
   `checkVisits`, and `rootInfo`'s `views` and `searches`. The network's raw values are optional: a reply of more
   views has none.
3. **Every file from the release, for the deploy and the tests.** `npm run engine -- --deploy` refuses a file that is
   not from a release. The job `cyanotype` of the Deploy workflow takes the files before its checks and its build, so
   each deployment has its engine. The Tests workflow takes them too (the step `cyanotype-engine` of
   `npm run check:all`, and a step of the Windows job), so the checks that need the engine run there: the fixtures'
   test, the bot's test at few visits, the review's tests and the browser tests that play against the bot. Without
   `static/engine`, they skip with a message, and `/practice` says that the engine is not on the site. In CI, the
   browser tests of the review and of Practice fail instead of skipping, so that a build without the files cannot pass
   there.
4. **The GPU and the threaded bot, as Hedge School's** (designs 09, 15 and 24). The engine settings offer the GPU
   (Auto, On and Off, Auto by default, `src/lib/analysis/engineSettings.ts`). The shared engine session starts the GPU
   worker for the review and the Analysis board, with Auto's first-use test (`packages/analysis/src/gpu.svelte.ts`).
   Practice starts the bot in the first form that the browser runs: the threaded bot with its network on the GPU or on
   the CPU workers, else the bot with one search thread (`packages/practice/src/botForms.ts`, "Practice against Stamp
   Duty"). A setting kept before the GPU came does not hold: the settings' key is `cyanotype:engine:2`, since
   version 1 kept the Off that the site set.
   - **The networks' sizes:** both evaluators, the GPU's and the CPU workers', run a network of the size that they are
     given, Enclosure's by default. Blueprints' network has a board of 67 and 6 policy channels, which the release's
     manifest gives (`engine.sizes`) and the lock copies (`sizes`). The GPU worker and the bot's worker pass them on
     (`packages/engine/src/library.ts`, `sizesOption`, design 29, "Consequences"). With Enclosure's sizes, the threaded
     bot's first search trapped (`unreachable`) at the standard start, and at a position of more views it played
     another move than the one-thread bot at 1 visit.
   - **The threads on the CPU workers:** at most 128, the evaluator's `maxThreads` in the release's manifest, which
     the bot's CPU form keeps to. The engine repository's evaluator ran 128 search threads and trapped at 256. Two
     threads for each worker reach 128 at 64 workers.
5. **ONNX Runtime's files come from `static/engine`, as for Hedge School** ([hosting.md](../hosting.md), section 2).
   The shared engine session starts the GPU worker through its GPU control (`packages/analysis/src/gpu.svelte.ts`,
   then `packages/engine/src/gpuClient.ts`), so the build bundles that worker (`packages/engine/src/gpuWorker.ts`)
   with ONNX Runtime Web, and the practice bot's worker with it (`packages/practice/src/botFormsWorker.ts`).
   `vite.config.ts` copies Hedge School's two settings for the
   engine package ([design 29](29-shared-packages.md), "Consequences"): ONNX Runtime Web's form that takes its
   WebAssembly from the page (the resolve condition `onnxruntime-web-use-extern-wasm`), and the workers as modules.
   The lock has a GPU module, so the fetch script stores ONNX Runtime's two files in `static/engine`, the WebAssembly
   compressed with gzip. Without the condition, the build copies ONNX Runtime's WebAssembly (25.5 MiB) into the site,
   and Cloudflare Pages refuses the upload. The step `cyanotype-build-sizes` of `npm run check:all` fails on a file of
   the build over 25 MiB.

## Practice against Stamp Duty

A game against Stamp Duty in the browser, as Hedge School's Practice (design 24, design 25): the settings card, then
the game in the review's layout. The bot is the engine repository's practice bot for Blueprints (abscls-1if9), in
Hedge School's form where Blueprints allows: KataGo's GTP engine with its play settings, not the analysis module's
`chooseMove`, for the reasons of request 15 (the analysis settings, and a new tree for each query).

**The bot** (the engine repository's games/blueprints/README.md, "The practice bot"), in the first of its forms that
the browser runs, as Hedge School's (design 24, item 14): the threaded bot (`blueprints-bot-batched.wasm`) with its
network on the GPU (16 search threads) or on the CPU workers (`blueprints-eval.wasm`, two search threads for each
worker, at most 128), else the bot with one search thread (`blueprints-bot.wasm`), which runs the network in its own
module. A browser without JSPI plays the last. Each form has the native GTP engine's play settings, with the root's
views on. The line under the bot's name says where it runs ("on the GPU", "on the CPU workers", "on one thread"). The
page sends `blueprints-start SEED` (with its threads, for the threaded bot), then the visits and the variety
(`kata-set-param`, with GTP's half-life of 19 moves, as for Enclosure), then the game's komi (`komi K`, design 24:
none at 0), then `play`, `genmove` and `undo` with the site's strings. Its visits are Hedge School's, 1 to 8,192: since
protocol 0.7.1 (abscls-csmy) its genmove gives a legal move at every visit count, also on a position of more views,
where the earlier build failed with 2n visits or fewer for a cover of n views. A reload sets the bot's game to the
kept moves with `blueprints-set-game`: `undo` then takes them back as any others, so a takeback works after a reload.
A game from a set-up start sets it again with `blueprints-set-position`, then plays the kept moves after it.

**From a position** (design 24, item 4): the Analysis board's "Play the bot from here", beside New, opens Practice at
the position on screen, as Hedge School's does. The address after the `#` gives the board's set-up start when it has
one (`position`), and the moves from the start to the position on screen as a record (`record`)
(`@abstractclass/practice/practice.ts`, `practiceHref`). They leave the address at once, then the page starts the
analytics, as Hedge School's Practice does: the layout does not start them while the address holds a start. A
`position` alone that is the standard start brings nothing.

1. **The check:** the engine's rules check the start brought as the Analysis board checks it (`recordCheck.ts`): a
   record's start and its moves (`recordProblem`), or a start alone (`startProblem`). A start that no game reaches, or a
   move that the rules refuse, starts no game. The settings card says why, in the words of the Analysis board's notice
   (`checkProblem`): "Practice cannot start from this position: no game can reach it.", then each of the position
   check's reasons, its first reason first ("this record: no game can reach its start." for a record). Its game starts
   from the standard start. A game kept in this browser does not come through the page's check, so the game checks its
   own start before the bot gets it, and stops with the same words ("The game stopped: no game can reach its start.
   ..."). The bot refuses such a start too, with the check's first reason (`blueprints-set-position`), so the site's
   check is not the only one.
2. **A game's position goes to the bot as its moves:** a board from the standard start sends its moves with
   `blueprints-set-game`. That is the game's search exactly. A position with no history searches differently from
   its game ("Decision", item 10, request 28's measurement), so the page never sends the position on screen as a
   set-up start.
3. **A board editor's start keeps its own position:** a board with a set-up start sends it with
   `blueprints-set-position`, in the engine's one-line form (`enginePosition`), then the moves after it with `play`,
   as the Analysis board searches it.
4. **The moves brought are the game's start:** a takeback stops at them, so the bot gets no `undo` past the start, as
   on Hedge School's Practice (`brought`, the kept game's count of them). The move list numbers the turns from the
   start's own (`startTurn`), with `51...` when the start is at a turn's second move. The settings card says where the
   game starts ("The game starts from the Analysis board's set-up position, after the record's 3 moves.").
5. **A game in progress:** the page asks first, once the rules have checked the start ("Play from this position?",
   `@abstractclass/practice/ReplaceGame.svelte`, Hedge School's question). Cyanotype keeps no practice game, so the
   game in progress ends ("Practice against Stamp Duty", item 2 of the departures). A start that the rules refuse
   leaves the game in progress, which goes on with the notice in the side column.

**Below 16 visits,** Practice plays the threaded bot, as Hedge School's Practice does at every setting (design 24,
item 14). KataGo's play settings give each search thread at least 8 of a move's new playouts, so a move below 16
visits searches with one thread. A check on the CPU confirmed it for Blueprints (`scripts/practice-forms.mjs`, and the
decision log's entry "Cyanotype on Stamp Duty 0.2, with the GPU and the threaded bot"). At 1, 4 and 8 visits, the
threaded bot with 4 or 16 search threads evaluated as many of the network's rows as with one thread. Its threads
changed the chosen move at a few positions (1 or 2 of 43 at 4 and 8 visits), not how far it searched. That is the
usual effect of a search on several threads, and Hedge School's bot has it too. A level is its visits, and those hold,
so Cyanotype has no rule for the visits below 16.

**The game:** the engine's rules worker gives each position, what each move did and the player's legal moves
(describe, describe_game), as on Hedge School's Practice. The page checks each of the bot's moves against the rules'
legal moves, and stops the game with an error when one is not legal. An error of the engine stops the game too, with
the engine's message ("The game stopped: ..."), as Hedge School shows it. The final score is the rules' score of the
game's last position (`scores`, and the margin of `outcome`). At a komi, each player's points include their starting
points, as on Hedge School, and the result is the margin of those points: the rules' `outcome` leaves the komi out.
This browser keeps the game in progress (`cyanotype:practice-game:1`), the choices (`cyanotype:practice-choices:1`)
and the panel's place and size (`cyanotype:practice-panel:1`).

**The komi** (design 24): the card's fourth setting, from the shared card, with Hedge School's range and step. Stamp
Duty's run trains komi in every self-play game, out to ±3,000 points, and people's margins in Blueprints are of the
size of Enclosure's (design 24, "Why"). The review searches at a record's `Komi` tag, as Hedge School's does, and
the game's id in this browser covers the komi, from a record and from a shared review. A record's komi beyond 90,980
points either way, the most that Blueprints' engine takes, is an error in the record (design 24, item 15), and so is a
link's or an analysis file's. The Analysis board does not take a komi yet. Its page builds the board's analysis after
it chooses the board, but at komi 0. So it refuses a record, a link or an analysis file with a komi, with a notice.
The analysis takes the board's komi in a later change (abscls-8tl1.50). The Import refuses a record with a komi in its
dialog, for the same reason: it puts the record in the page's address, and the page opens it as a record. The board
does not open a kept board with a komi either, and opens a new board with a notice. The board keeps only boards at
komi 0, so this is a defence. A position's notation has no komi. Nothing on Cyanotype writes the tag yet, as
its practice games are not kept. The board takes a komi as Hedge School's does when Cyanotype keeps its practice games
("The gaps from Hedge School").

**How it departs from Hedge School's Practice (design 24):**

1. **A search of more views takes its best check, with no temperature,** and a move of another view keeps no tree for
   the next move (the engine's README, "The search"). The variety then does not act on that move. Request 25 accepts
   this.
2. **No practice game in Your games, no stored game and no review of a game played here:** the site keeps no practice
   game, and has no backend (design 25) yet. These are gaps, each in "The gaps from Hedge School". So a game that ends
   is no longer kept: the next visit starts a new one. Abort ends the game, and it is gone. The site ships only its
   lock's networks, so a new build can drop a kept game's network. Such a game cannot go on: the page drops it, and the
   settings card says so.
3. **Fewer display settings:** the points' bar always shows, with no second number (Blueprints has no area), and the
   page has no sounds. The player's notes are on the board ("The player's notes"). These are gaps too ("The gaps from
   Hedge School").
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
choices and the kept game under each site's key, the GTP helpers, the takeback, the results), and the bot's page side,
its forms and its worker (`bot.ts`, `botForms.ts`, `botWorker.ts`, `botFormsWorker.ts`, `botMessages.ts`). Each site
gives the game's name in the bot's commands. The forms and their worker moved out of Hedge School when Blueprints'
release had the threaded bot (abscls-8tl1.29). Hedge School's stored games (design 25) stay in Hedge School until
Cyanotype has a backend:
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
4. **The button's picture:** a blueprint as the game starts it, a star with a ring of six cells, white on the button's
   dark ground, with the star marked. The logo shows the same blueprint in a drawing of its own ("The logo").
5. **The import page** (`/import`) offers the game that a tool sent in the review or on the Analysis board, as
   Hedge School's does (its designs 21 and 22), in the choice's frame that both sites share
   (`@abstractclass/import/ToolChoice.svelte`). It shows the players, the number of moves and the position that the
   game's page showed (the moves before it, and that move's turn in the record). The review keeps the game in this
   browser. The Analysis board opens at that position, or at the game's end when the tool sent none. When the board
   kept here has moves, the board first asks "Replace your analysis?", as Hedge School's does ("The review and the
   Analysis board", item 11). The record as Cyanotype wrote it is under "The record", closed. For an out-of-date
   tool, the page says how to update it, as Hedge School's does. Without a game, the page goes to the tools page. A
   record from a set-up start (a `Position` tag) is for the board only: the review refuses it, so the "Review the
   game" button is off, its reason (`setUpProblem`) takes the place of its text, and the Analysis board's button
   takes the review button's `autofocus`. Hedge School's import page offers the review for such a record and refuses
   it after the click.
6. **The record's check comes first.** The page takes the game out of the address at once, as Hedge School's does.
   Then the engine's rules check the record and each move's capture mark (`checkRecordMarks`), in a rules worker of
   the page's own, as the Analysis board checks a record brought to it ("The review and the Analysis board", item 11).
   A record that they refuse shows why, and the page opens nothing. A site with no engine files cannot check a record,
   so the page opens nothing there either. Hedge School's import page opens the game without its engine, since its
   review checks the game later.
7. **The import page keeps the game for its review,** as Hedge School's does. "Review the game" keeps the game in the
   player's games through the one import (`src/lib/game/import.ts`, `keepChecked`) with the answer of the page's check,
   so the rules check the game once on its way in. The game keeps its capture marks. Then the page opens the review by
   the game's id (`/review#game=…`, `openReview` in `@abstractclass/import`, which Hedge School's import page and both
   sites' shared reviews use too). The review takes the import page's place in the history, so Back leads to the page
   before it. While the page keeps the game, it says "Importing the game…", as Hedge School's does. A game that the
   browser cannot keep (a private window, or blocked site data) stays on the import page, with why, in Hedge School's
   words ("Cyanotype could not import the game: …"), and with no line about the tools page: newer tools do not help that
   browser. A record that the page cannot read or that the rules refuse keeps that line, since an old tool can send one.
   "Analyze on the board" opens the board by its own address with the record (`/analysis#record=…&at=`), which takes it
   out of the address again and checks it, as a link to the board does. The page counts the review's import once it
   keeps the game. The board's address names the tool's source (`via`), and the board counts the import by it
   ("Analytics", item 4). A reload of the page after the game left its address goes to the tools page. A
   partner's links (`from=`, `packed=`, a partner's `save=`) are Hedge School's (its design 18): the page refuses
   `from=` and a link with no record, and reads no `save=`, until the steps of "Partner sites". A link's record
   (`/import#record=…`) gets the same choice as a tool's.
8. **The tools page** (`/tools`) gives the steps to install the bookmarklet and the userscript, in strict Simplified
   Technical English with the glossary's words. Its link is in the header from a tablet's width, and in the footer on
   a phone, as Hedge School's (design 22).

The tools have not run on strategyjam.org itself: they run in the player's own logged-in page, and that test waits for
the owner (abscls-8tl1.12). The tests use page states that they make, with moves that Stamp Duty's early build played
(`fixtures.json`), and the built tools ran on mock pages of both layouts in Chromium.

## The review and the Analysis board

Cyanotype's review (`/review`) and Analysis board (`/analysis`) are Hedge School's (designs 05, 06, 07 and 10), in
the shared view (design 29, item 9) with Blueprints' part (`src/lib/review/blueprintsView.ts`), on the practice page's
layout. The engine is Stamp Duty's release, with the GPU worker as on Hedge School's review ("The engine's files",
item 4). Each part below was chosen from drawings of the real page, from the engine's replies (Stamp Duty's early
build). The decision log gives the measurements that led to each choice.

1. **The layout:** the practice page's board, with its hands' panel and its kept place ("Practice against Stamp
   Duty"), and the review's side columns, as Hedge School's. The board's box takes the window's height less the
   players' row and the charts. On a phone, the hands go under the board.
2. **The players' cards:** each player's points, and the stars on the board. The chart's second line is the stars'
   difference.
3. **The move list:** one move a row, by turn and by move, at every size. A turn's number stands at its first move.
   Two of Blueprints' moves do not fit one row: a move has 5 to 19 characters, and the test game's widest turn by move
   needs 440 pixels in a list of 325 at 1,376 pixels.
   - **By turn, the turn's judgement cell** (its quality label, the ◆ and the loss) stands on the row of the turn's
     last move: the second move's row, or the one row of a turn of one move. The judgement cell acts as the turn's
     last move. So when the board is after the turn, that move and the judgement cell light on one row, not on two.
     Hedge School has a turn's two moves in one row, and its judgement cell in a column of its own.
4. **The setting "Move notation"** in the display settings, as Lichess's "Piece notation": "Glyphs" (the default) or
   "Text".
   - **Glyphs,** as strategyjam.org's move list writes a move: a placement is its blueprint's number in a box, its
     anchor, and its capture mark, `+N` when it scores and a small `x` when it captures and scores nothing (item 6).
     An edit is its cell, with its kind, then each blueprint's number in a box with the cell's place, before and
     after. The boxes and the cell take the colour of the text round them.
   - **Text:** the notation of items 5 and 6, as the Notation page gives it (`2@-3,-9x+12`, `1:-1,2>2:0,4`).
   - The setting writes the move list, its notes ("Mistake. … was best."), the status line, the variations and the
     engine's line in the form "Notation", and the candidates' table. A screen reader reads the text in both forms.
   - In a line of text (a note, the status line, a name in the table), a move's glyphs sit on the middle of the line.
     An edit begins with its cell's picture, whose baseline is its lower edge: on the text's baseline, the edit
     would stand about 3 pixels higher than a placement beside it, as the two moves of a turn's note do.
   - **A middle dot between a turn's two moves:** in Glyphs, where a turn's two moves stand side by side in one line
     of text (a Mistake's, a Blunder's or an Inaccuracy's note by turn: "Mistake. … · … was best."), ` · ` stands
     between them, in the note's text colour (`GLYPH_SEPARATOR`, `inGlyphs` in `packages/review/src/game.ts`). A
     move in glyphs has spaces of its own (its box, then its hex), so a space does not show where the first move
     ends. A comma would meet the hexes' commas. The Text form, the note's title and every export keep the record's
     notation, a space between the moves (`3. 1@1,-3x 1@0,3x+8`). The move list has one move a line, the table one
     move a row, and the status line one move. The variations and the engine's lines in "Notation" have the same dot
     (the next bullet).
   - **The same dot in the variations and the engine's lines** (item 5): in a variation, in the engine's line under a
     note and in the engine's line under the table, between a turn's two moves, in two forms. In "Hexes", an edit's
     arrow ends at the next move's hex, so an edit and a placement side by side could read as one move. The view's game
     asks for the dot there (`shape.turnDot`): Hedge School's pills stand as before. In "Notation" while Move notation
     is Glyphs, a move has spaces of its own, as in a note, so a turn's two moves can read as one ("12. [cell] 1 1,1 > 2
     2,0 2 -1,-21 13."). With Move notation Text, "Notation" keeps the record's space. The turn's number stays before
     its first move. Under the table in "Hexes", where the line has no numbers, the space between two turns is wider
     than before (half a rem), so that a turn's two shapes stay together. "Dots" has no dot: a disc never reaches its
     neighbour, and a middle dot between discs would read as a smaller disc.
   - A candidate, a note's best move and a line's move before the rules play it have no capture mark, in both forms:
     what they capture is not known yet.
5. **The small hexes** (the variations' form "Hexes", and the engine's line under the table): a placement is a
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
    position of two views, where a candidate placement of the engine lies outside the rule's view
    (`src/lib/review/rootViews.engine.test.ts`: Stamp Duty 0.2's third candidate, after two edits).
11. **A record's check:** the engine plays each move of a record and confirms each capture mark (item 6), on the
    review and on the Analysis board alike. The review then shows why it cannot review the game. The Analysis board
    keeps the board that this browser kept, and a notice says why it did not open the record. A record that the engine
    accepts replaces the board kept here. When that board has moves, the board first asks "Replace your analysis?":
    "Keep mine" keeps it. The question is Hedge School's (its design 21, item 6), in `packages/review`
    (`ReplaceAnalysis.svelte`), which both boards use.
12. **The Export menus and the links,** as Hedge School's (its designs 13 and 21), in the shared menu
    (`packages/review/src/ExportMenu.svelte`):
    - **The Analysis board's Export:** a link that shares the board (`/analysis#packed=…`, `src/lib/game/board.ts`),
      the analysis file (`src/lib/game/analysisFile.ts`, format `cyanotype-analysis`), and the annotated record, copied
      or as a file (`src/lib/review/annotate.ts`). The record writes each move with its capture mark, and the engine's
      choice by its name ("Blunder. 3@4,-1 1@6,-3 was best."). Its New menu (`packages/review/src/NewMenu.svelte`) has
      Hedge School's four ways ("The board editor"). A file loads as Hedge School's does: its results go to the
      browser's store, and its lines to the board's address, so that the board asks before it replaces its analysis.
    - **The review's Export,** once the review is done: a link that shares the review (`/review#packed=…`,
      `src/lib/game/share.ts`, `src/lib/review/reviewExports.ts`), on the review and beside each game in the Review tab
      ("The player's games"). The link names the game's mark, its deepest review that ran to its end, as Hedge School's
      does, not the depth set when Export is clicked. The review file follows it, with the engine's results ("The review
      files"). The annotated record follows them, copied or as a file (`src/lib/review/exportText.ts`): the review page
      writes it from its review, and the Review tab from the store ("The review snapshot and the annotated record from
      the store"). When a link is longer than a Discord message takes, the note after it says to send the review file.
      The link's page (`src/lib/review/SharedArrival.svelte`) says what the link holds and what the sender's review ran
      with. "Review it" keeps the game in the player's games, as a pasted record: the engine's rules check it first, as
      the import page does, and a game that they refuse is not kept. So a link that the rules refuse says why.
    - **The recipient's review uses the sender's network and depth,** as Hedge School's: the game keeps them for its
      review (a game's own settings, Hedge School's design 09), when the site ships the sender's network. Other games
      review as before. With a network that the site does not ship, the review uses the recipient's, and the page
      says that some quality labels can differ. As Hedge School's page, it says that a GPU computes the network a
      little differently, so that on a GPU a close call can rarely give another result.
    - **Blueprints' moves in a link** (the shared format, `packages/analysis/src/share.ts`): a move's kind in 2 bits
      (a placement, an edit or a pass), then each blueprint's number in 2 bits and each coordinate as a signed Elias
      gamma (1 bit for 0, 3 bits for -1 and 1). The review's test game (`src/lib/review/fixtures/stamp-duty.txt`, 106
      placements and 14 edits) takes 19.5 bits a move, as an Enclosure edge takes 18. With its 10 tags (184 bytes),
      its link has 706 characters, within a Discord message's 2,000. The test (`src/lib/game/share.test.ts`) also
      sends every legal move of each of the game's positions through a link, from the engine's rules (125,322
      moves): each comes back as it was. A cut link says what is wrong. A link has no checksum, as Hedge School's
      has none, so a changed letter can give another game in the notation: the engine's rules then check it.
    - **A set-up start:** a link packs it in its tags as `Position`, and a file keeps it in its board (`start`), in the
      position's notation ("Decision", item 10), as Hedge School's do. The annotated record writes it in its
      `Position` tag. The engine reads a start that comes in before it replaces the board kept here: one that it
      refuses leaves that board, with a notice.
13. **How a review works** (`/how-reviews-work`), as Hedge School's page (its designs 05, 10, 14 and 16): the
    searches, the quality labels and their bands, Best and Great, the accuracy, the hard positions and the meter. The
    sections that the two pages share are in `packages/review/src/howReviews/`, so that the two pages cannot differ
    in them. The rules' numbers there come from the shared analysis's code (`cache.ts`, `settings.ts`, `labels.ts`).
    Only the constants of Lichess's accuracy formula are typed, because `model.ts` does not export them. Hedge
    School's page reads as before. Cyanotype's page says what differs for Blueprints:
    - **Its engine,** Stamp Duty, and "move" where Hedge School says "edge", "opponent" where it says "enemy".
    - **The turns:** Blue's first turn has one move, and each later turn two. The review judges whole turns by
      default, as Hedge School's.
    - **Two moves that give one position** are one move (item 9 of "Decision"): Best for either, one row of the
      table, and the network's likelihood counted once in the complexity and the meter.
    - **An edit's likelihood** in the complexity and the meter is its cell's: a candidate edit has its pick's prior
      (the engine repository's `games/blueprints/README.md`, "An edit").
    - **No opening book:** the engine searches every position of the game, the opening too.
    - **The examples** of the lead, in points, and of the hard positions, from the stored review of the test game
      (the decision log gives them).
    The footer, the About page (its section "How a review works"), the review's line under the report ("How it
    works", in the shared view) and the site map link to it, as Hedge School's do.
14. **Not built yet:** each feature of Hedge School that Cyanotype lacks is in "The gaps from Hedge School", with its
    issue.

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
14. **The hex under the pointer decides, as on chessground's board,** because the view does not move under a right
    press ("How the board takes a move", item 1). The fit changes when the position's rules come, and the review and
    the Analysis board get them from the engine for each new position. On a busy machine they can come during a
    right-click. The view then keeps its fit until the release, so the click highlights the hex that it pressed and
    draws no arrow. A Shift drag's highlights all come from one view. Hedge School's board does not move: its view is
    the game's board size.

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
- **The small hexes, and no numbers in the engine's line in "Hexes"** (item 5): Hedge School's pill lies along
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

## The board editor

Cyanotype's board editor (`/editor`) and the Analysis board's New menu are Hedge School's (its design 21, items 5 and
10), with Blueprints' pieces. The New menu has the standard start, the board editor from the position on screen, the
Import of a position or moves, and an analysis file loaded. The Import's dialog is Hedge School's
(`packages/review/src/ImportDialog.svelte`): a position field, and the moves from that position, as a record or a plain
list of moves (`src/lib/game/paste.ts`). The engine's rules check them in a worker of the page's own. Then the board's
opening checks them again with the board's rules, before they replace the board kept here. The home page has the way
in "Set up a position".

1. **The board and the hands:** the position being made, drawn at once, on Blueprints' board with both hands in its
   box. A click on a hex of the board puts a cell of the chosen player and kind there ("Blue cells" or "Red cells", and
   "Normal", "Star" or "Wall"). The same cell again removes it. A cell of the other player or of another kind changes
   to the chosen one, as Hedge School's editor gives an edge to the other player.
2. **The right button puts the other player's cell,** as Hedge School's right button draws the other player's edge (a
   drawing program's second colour). X swaps the two players. A touch screen has the player buttons.
3. **A hand's cell moves, as an edit moves it:** a click on a cell in a hand chooses it, and a click on an empty hex of
   the same hand puts it there. The two blueprints then go back to their frames (item 5). Each hand keeps its 21 cells
   and their kinds, as in every game: an edit moves a cell and makes none. A position pasted in the field can give a
   hand other cells, and the engine reads it: the rules check a hand's 21 cells and each blueprint's connection only.
4. **A click keeps the view,** as a pan does: the board does not fit its cells again under the pointer, so the next
   click finds its hex where it was. "Show all the cells" and a whole position loaded (the standard start, a pasted
   position, "Remove all cells") fit again.
5. **The moves played and the scores are fields.** The moves played fix the mover and the moves left in the turn
   (`moverOf`, which Hedge School's editor shares, in `packages/analysis/src/turns.ts`). "Blue to play" and "Red to
   play" move the count on to that player's next move. The count does not follow the board, as Hedge School's edge
   count can: the edits and the captured cells leave nothing on a Blueprints board, so no count follows from it. The
   scores are whole numbers.
6. **The engine reads the position at each change,** in its own form ("Decision", item 10). The page shows a refusal
   in the engine's words, with the players' names for its numbers. Then it says whether a game can reach the
   position (the engine's position check, "Decision", item 10), as Hedge School's editor does: "A game can reach this
   position.", or "No game reaches this position:" with each reason in the engine's words. The hexes that the reasons
   name glow on the board, as Hedge School's editor makes the reasons' edges glow. Analyze needs a position that the
   engine reads, that a game can reach, and that has moves left. The status and its words are Hedge School's
   (`packages/review/src/PositionCheckStatus.svelte`). A notice of the Analysis board or the Import says what cannot
   open, then why, in one sentence, then each reason in the engine's words: "The Analysis board cannot open this
   position: no game can reach it.", and "its start" for a record, a link or a file, "their start" for the Import's
   moves (`checkProblem`, `packages/engine/src/protocol.ts`, with Cyanotype's words in
   `src/lib/review/recordCheck.ts`).
7. **The position in the notation** is a field with a Copy button, as Hedge School's: a position pasted there replaces
   the one being made. The browser keeps the position being made (`cyanotype:editor:1`). The address
   `/editor#position=` brings one, and the position leaves the address at once.
8. **A drag with Shift puts the cell on each hex that it passes,** as a click on that hex does: the left button the
   chosen player's cell of the chosen kind, and the right button the other player's. The drag's first hex sets what
   it does. Where a click there removes a cell, the drag removes that cell from each hex that it passes, and leaves
   the other cells. Else it puts the cell on each hex, in the place of any other cell. A hex that the drag passes twice
   changes once. The drag takes the hexes between two of the pointer's moves, as the notes' drag of marks does ("The
   player's notes", item 2), so a fast drag misses no hex. Off the board on screen, it takes no hex. A drag without
   Shift pans, as before, and the hands keep their clicks. The engine reads the position once, at the drag's end. The
   editor has no takeback, so one drag is one change of the position, as one click is. The browser's menu does not
   open after a press of the right button on the board, also where the button comes up off the board.

**Where it departs from Hedge School's editor:** the pieces (cells of three kinds, and the hands), the count that does
not follow the board (item 5), the click that keeps the view (item 4: Hedge School's board does not pan), the drag with
Shift (item 8: Hedge School's editor draws an edge with two clicks, and a set-up position of Blueprints has many cells),
and the board that the page draws and the engine reads, where Hedge School's engine draws its regions.

## The player's games

Cyanotype keeps the player's games in this browser, as Hedge School does (its designs 11 and 22, with a game's own
settings of its design 09 and the marks of its design 13), in the code that both sites share (design 29).

1. **The Review tab** (`/review` without a game): a box for a game record, "Load a review file" ("The review
   files"), "Continue your last review", and the player's games, newest first, each with its link, its Export and its
   Delete. A review is `/review#game=…`. A game's link and "Continue your last review" open it. The address names no
   game, so the Review link in the header opens the tab, as Hedge School's does.
2. **A record comes in four ways:** pasted in the Review tab, the import page's "Review the game", a shared review's
   "Review it", and a review file. Each goes through one import (`src/lib/game/import.ts`). The import first refuses
   a game from a set-up start: the review takes games from the standard start only, and says to open it on the
   Analysis board. Then the engine's rules play the record and check its capture marks, in a rules worker of the
   page's own (`checkRecordMarks`, `src/lib/review/recordCheck.ts`). The import page has checked its game already,
   so it gives the import that check's answer ("How a game comes in from strategyjam.org", item 7). The list keeps no
   game that the review refuses: the page says why, in the import page's words ("Cyanotype cannot review this game:
   …"). The list keeps the record with a capture mark on every move that captures, as Hedge School's adds its cut
   marks. The review checks the game again when it opens, as Hedge School's does. A record after the review's `#`
   (`/review#record=…`) gets the Review tab, as on Hedge School (its design 22): only the import page takes one.
3. **The komi:** the review takes a record with a `Komi` tag, and searches at it ("Practice against Stamp Duty",
   "The komi"). A game's id covers its komi, so the same moves at another komi are another game. The Analysis board
   still refuses a komi, until abscls-8tl1.50.
4. **A game's id** is the id that the review used before the list: FNV-1a of the komi and the moves
   (`src/lib/game/store.ts`, `gameId`). So the games that the review kept before the list, each with its record and
   the time that it came, show in the list, and open with their variations. The review kept them before the engine's
   rules checked them, so the list can hold one that the review refuses: its review then says why, and its Delete
   removes it. Hedge School's id is a SHA-256, which also covers a set-up start: Cyanotype's review takes no set-up
   start.
5. **A game's Delete** asks first, in Hedge School's dialog: "Delete this game?", with Cancel focused, and a Delete
   that waits for the double-click time. It deletes the game, its variations and the pointer of "Continue your last
   review" to it. The engine's results stay: they belong to positions.
6. **The browser keeps the games:** when a game is kept, and in the Review tab when the browser holds games, the site
   asks for persistent storage, once a page. The line under the list says what the browser answered, as on Hedge
   School.
7. **One tab reviews a game at a time,** with the Web Locks API. Another tab for the game starts no engine, and says
   that the game is open in another tab, with "Review here".
8. **A game's own network and depth:** a shared review's game keeps the sender's, and a review file's game the
   file's, when the site ships that network. A game whose last review used a network that has left the menus keeps
   that review's. The review uses them, and the engine settings show and change them, as on Hedge School. Cyanotype
   ships one network now, so only a shared review's game and a review file's have their own.
9. **The mark:** a review that runs to its end marks its game with the engine, the network and the depth. The
   Export beside a game in the list opens when the mark covers the review that the game reviews with now. When the
   site's engine or network changes, a game reviewed before first opens as its earlier review, a review snapshot
   ("The review snapshot and the annotated record from the store"). After Review again, or when the store lacks the
   earlier review's results, the review runs again, and says why, in a dialog once in a visit and in a line under its
   progress.
10. **An analysis file** dropped on the Review tab opens on the Analysis board, as on Hedge School. A review file
    dropped there loads as one chosen with "Load a review file". The Analysis board's New menu refuses a review file,
    with Hedge School's words: "this is a review file: load it in the Review tab".
11. **The home page** has "Review a game you played" among its ways in, for a record, as Hedge School's.

**Where it departs from Hedge School's:**

- **No marks before the first paint:** until the page's code runs, `/review` shows the line "Reading the game with the
  engine's rules…", not the Review tab. abscls-8tl1.45.
- **No partner sites yet** ("Partner sites").
- **No game from a set-up start in the list:** the review takes none, and Cyanotype's practice games are not kept yet
  (abscls-8tl1.40, abscls-8tl1.50). Hedge School's list opens such a game on the Analysis board.

### The review files

A review file is Hedge School's (its design 13): the game's record as the list keeps it, the player's variations, the
review that ran to its end (the game's mark, with the network's name), and the engine's results for every position of
the game and its variations, and of the positions one move from them (the Greats' confirmations). Another browser opens
the review at once, with no search. The file and its reader are shared (`packages/analysis/src/reviewFile.ts`, design
29). Cyanotype's part is `src/lib/game/reviewFile.ts`.

1. **The format** is `cyanotype-review`, at the shared version 1. A file's name is `cyanotype-`, the players, and the
   game's id (`cyanotype-Ann-vs-Bo-review-39-0a1b2c3d.json`). Hedge School's reader refuses a Cyanotype file, and
   Cyanotype's a Hedge School file: "This is not a Cyanotype review file."
2. **The export:** the review's Export menu and the Export beside each game in the Review tab have "Review file, to
   load later or elsewhere", after the link, once the review is done ("The review and the Analysis board", item 12).
   The file holds the results of the networks that the site ships.
3. **The load:** "Load a review file" in the Review tab, or a file dropped there. The game comes in as a pasted
   record does ("The player's games", item 2): the review refuses a game from a set-up start, and the engine's rules
   check the record and its capture marks. A game that the review refuses keeps nothing: no game, no variations and no
   results. Then the variations join the game's own, the file's review becomes the game's mark when the site ships its
   network, the game keeps the file's network and depth (item 8 of "The player's games"), and the results of the
   shipped networks go to the browser's store. The review then opens at `/review#game=…`.
4. **A file of an earlier engine:** its review is the game's mark as that engine's, as on Hedge School, so the review
   opens as a review snapshot (the next section). A mark of the site's engine stays over an earlier engine's (Hedge
   School's designs 13 and 20, item 6). So when the list keeps the game with the site's review, a file of the same
   game by an earlier engine adds its variations and its results, and the review opens with the site's review, with
   no review snapshot.

### The review snapshot and the annotated record from the store

Both are Hedge School's (its designs 20 and 13), on one shared path: a review from the browser's store alone, with no
search (`packages/analysis/src/storedReview.ts`, design 29). The engine's rules give the positions, Cyanotype's step
checks the record's capture marks against them (`src/lib/review/storedReview.ts`), and the stored results give the
rest. Hedge School's step gives its opening book's values. The label snapshot takes the same steps, so its quality
labels are the ones that these show.

1. **The review snapshot:** a game whose mark names the CPU module of an earlier search or another file of its
   network opens as that review was, with the engine's rules alone and no network: the stored results of the mark's
   search, at the mark's depth. A line under the players says "Reviewed on (date) with an earlier version of the
   engine." The review searches nothing, and the Export waits ("Review again to export: this review used an earlier
   engine.").
   "Review again" reviews the game with the site's engine, and the earlier review stays on the board until the new
   results replace it. When the store lacks the earlier review's results, the review runs again at once, with the
   notice of "The player's games", item 9. When the record's capture marks are wrong, the page opens no review
   snapshot and reviews nothing. It says why, as for any record with wrong capture marks: "Cyanotype cannot review
   this game: …".
2. **The annotated record:** the review's Export menu and the Export beside each game in the Review tab have "Copy the
   annotated record" and "Annotated record as a file", after the review file. The record is the Analysis board's
   (item 12 of "The review and the Analysis board"), with the game's tags, result and clocks, and the note "Reviewed by
   Cyanotype with Stamp Duty 0.2 (the network …), at least N visits a position." The labels are by turn or by move, as
   the review shows them. The review page writes it from its review, the Review tab from the store with the engine's
   rules alone (`src/lib/review/exportText.ts`). The two give one text. A game whose review the store does not hold
   whole says to open the game first.

## Partner sites

Cyanotype takes games from partner sites and gives their players' reviews back to them, as Hedge School does (its
design 18). A partner is another site where Blueprints is played. It puts a button on its finished games that opens
their review here. It can also keep its players' reviews with its own sign-in, and open a kept review here again.
Hedge School has one partner, enclosuregame.com. Cyanotype has none yet. The build makes each part ready, and the
partners' test runs the whole way. A new partner is then one line in a list and a release, as on Hedge School.

Not built yet. The steps are abscls-8tl1.74 to abscls-8tl1.77 (the order is below).

### Each part of Hedge School's design

Each item is an item of Hedge School's design 18. Each says what Cyanotype does, and where the code lives: in a
package that both sites share (design 29, item 11), in Cyanotype as Blueprints' own part, or in Hedge School as
Enclosure's alone.

1. **One link brings a game in:** `/import#record=…`, with an optional `save=`. The import page keeps the game and
   opens its review at once. It asks no choice: only a game from the bookmarklet or the userscript asks for the review
   or the Analysis board. A link without `record` gets the message "the link has no record=". **Shared, and already
   in the package:** the link's reader (`readImportHash`, `packages/import/src/importHash.ts`). Cyanotype's import
   page keeps the game itself once abscls-8tl1.71 is done, and the link's game then goes through the same steps.
2. **The record is the site's notation.** For Cyanotype it is Blueprints' notation (the /notation page), and the
   import's checks are Cyanotype's: the import refuses a game from a set-up start, and the engine's rules check each
   move and each capture mark (`src/lib/game/import.ts`, "The player's games", item 2). **Blueprints' own part, and
   built.** A web address in the `Site` tag gives the review its link back, "View this game on …" under the result.
   **Shared, and built:** `gamePage` in `packages/record/src/record.ts`, the link in
   `packages/review/src/ReviewView.svelte`. Cyanotype's review already passes it (`siteLink`).
3. **Other rules are refused, never reviewed wrongly.** Hedge School refuses a record with a `Rules` or a `Position`
   tag (`variantProblem`). Blueprints has one set of rules, and its notation has no `Rules` tag. A set-up start gets
   its message before the review (`setUpProblem`), and the engine's rules refuse a move that they do not allow.
   **Blueprints' own part, and built.** When strategyjam.org gives Blueprints another version of its rules, the
   notation needs a tag for it, and the import refuses it, as the page reader refuses such a game now
   (`strategyjam.ts`).
4. **A list of partners, by host.** A save page (`save`) counts only on a partner's own host, over https. The game
   keeps its partner's name and save page in the browser's store. The review's Export menu then offers "Save to …"
   first. **Shared:** the list's checks (`partnerOf`, `gamePartner`) move to `packages/import/src/partners.ts`, with
   each site's list as a parameter. The stored game's `partner` and `setGamePartner` move to the shared store
   (`packages/analysis/src/games.ts`). The menu's entry moves to `packages/review/src/exports.ts`. **Each site's:**
   its list, in its `src/lib/game/partners.ts`. Hedge School's holds enclosuregame.com, which is Enclosure's alone.
   Cyanotype's is empty until a site asks to be a partner (choice 1, below).
5. **The review file is what goes back,** not the annotated record. **Shared:** the review file is in
   `packages/analysis/src/reviewFile.ts`, and Cyanotype's format is `cyanotype-review` (abscls-8tl1.34).
6. **Window messages, in the player's browser, at the player's click.** The site opens the save page in a new tab,
   and the pages exchange `ready`, `review`, and `saved` or `failed`, with `protocol: 1`, each page checking the other's
   origin, with a minute for each answer. **Shared:** `saveToPartner`, `receiveFromPartner` and `PROTOCOL` move to
   `packages/import/src/partners.ts`. The messages' names start with the site's name, which each site gives:
   `hedge-school:ready` on Hedge School, `cyanotype:ready` on Cyanotype (choice 2).
7. **A saved review opens again from the partner's page:** the partner's page opens `/review#from=` and its origin,
   with `window.open`, and sends the file when the review asks for it. The review loads it as a review file, and opens
   at once with the engine's results. A review by an earlier engine opens as a review snapshot (abscls-8tl1.35).
   **Shared:** the receiving step (the partner by its origin, the file received, loaded by the site's loader, and the
   save page kept) becomes one function in `packages/import/src/partners.ts`. Its call and its text ("Waiting for …
   to send the review…") stay in each site's arrival step. Cyanotype's review takes `from=` (`reviewArrives`, already
   shared), and its import page takes it too, as Hedge School's does. **The tie between the two pages:** Cyanotype
   sends no `Cross-Origin-Opener-Policy` (its `static/_headers`), as Hedge School sends none.
8. **One save, which updates.** **Shared as it is:** the review file holds the whole review so far, and an opened
   file's variations merge with the browser's (`packages/analysis/src/kept.ts`).
9. **One public description,** the /developers page. abscls-8tl1.51 builds Cyanotype's page, on a frame shared with
   Hedge School's page, and leaves out the sections on the review saved back, a saved review opened again, the
   buttons and the partners' test. abscls-8tl1.77 adds them on Cyanotype. Its list of changes starts on Cyanotype's
   own first day. Its promises are Hedge School's: lenient reading, additions only, a versioned handshake, the review
   file as the site's own.
10. **Measured as a way in:** the import's events count a link's game, a kept review opened again, and the save to
    a partner. Cyanotype's analytics are built ("Analytics and consent"), so the partner parts add these events.
11. **Buttons as a kit, not a widget:** four labels (choice 3), the site's head as a file, a sample style and the
    markup. **Blueprints' own part:** Cyanotype's head is the logo's simple drawing, at `/brand/cyanotype.svg`
    ("The logo", item 6), and the sample style is in Cyanotype's colours, white on the dark ground of its tools'
    button. A test keeps the file equal to the drawing, as Hedge School's `collie.test.ts` does for its collie.

**The partners' test** (Hedge School's design 18, "Consequences") is shared too. The build of the branch
`partner_test`, and a local build with `VITE_PARTNER_TEST=1`, count `127.0.0.1` and `localhost` as "the local test
site". Cyanotype's `vite.config.ts` sets it for that branch, as Hedge School's does. The deploy already builds a
preview of Cyanotype for each branch that is not `main`, `partner_test` too. `docs/hosting.md` gives the steps for
both projects.

**Enclosure's alone, and not in Cyanotype:** enclosuregame.com as a partner, and the tools for meaf.us and
Constellation's export ("The gaps from Hedge School"). Hedge School's history stays its own too: the
`/review#record=…` link that opened a game for a few days, and the import page's `from=` for a partner's older link.
Cyanotype's import page takes `from=` only so that one shared step serves both sites.

### Hedge School's files that move

Hedge School's behaviour stays the same: the same messages (`hedge-school:*`, protocol 1), the same partner list, the
same texts, the same events and the same tests. abscls-8tl1.74 moves the code, before Cyanotype uses it.

- `apps/hedgeschool/src/lib/game/partners.ts`: `partnerOf`, `gamePartner`, `PROTOCOL`, `saveToPartner`,
  `receiveFromPartner` and the test site move to `packages/import/src/partners.ts`. The site gives its message name,
  its list and its test switch. Hedge School's file keeps its list (`PARTNERS`) and its name. `partners.test.ts`
  moves with the code, and Hedge School keeps a test of its list.
- `apps/hedgeschool/src/lib/game/store.ts`: the stored game's `partner` and `setGamePartner` move to
  `packages/analysis/src/games.ts`.
- `apps/hedgeschool/src/lib/game/reviewFile.ts`: the menu's entry "Save to …" moves to
  `packages/review/src/exports.ts`. Each site's `deliverExport` keeps its partner case, which calls the shared
  `saveToPartner`.
- `apps/hedgeschool/src/lib/review/Arrival.svelte`: the steps of `receiveReview` become the shared receiving
  function. The page's phases and texts stay.
- Hedge School's `/developers` page: abscls-8tl1.51 moves its frame into a package.
- `static/brand/hedge-school.svg` and its test stay Hedge School's.

### The order of the work

1. **abscls-8tl1.71 first:** Cyanotype's import page keeps the game itself, as Hedge School's does. A link's save
   page is kept with the game in that same step, so the partner's link builds on it.
2. **abscls-8tl1.34** (review files) before the partner code moves: "Save to …" sends the review file, and a kept
   review comes back as one. That issue also changes Hedge School's `reviewFile.ts`, which the move changes again.
3. **abscls-8tl1.74:** Hedge School's partner code into the packages, unchanged.
4. **abscls-8tl1.75:** Cyanotype takes a partner's link and saves the review back (items 1 to 6, the partners'
   test). After 8tl1.71, 8tl1.74 and 8tl1.34.
5. **abscls-8tl1.76:** Cyanotype opens a review that a partner kept (item 7). After 8tl1.75, and after
   abscls-8tl1.35 for an earlier engine's review.
6. **abscls-8tl1.77:** the buttons' head and the partner sections of Cyanotype's /developers (items 9 and 11).
   After 8tl1.76 and abscls-8tl1.51.

abscls-8tl1.51 does not wait for the partner parts: the page is useful without them, since a site can send a game by
its link alone. It builds the shared frame with all of Hedge School's sections, so that abscls-8tl1.77 only adds the
partner sections on Cyanotype.

### The three choices

1. **No first partner yet.** The list starts empty, and the partners' test runs every part. A partner that asks is
   then one line and a release, as enclosuregame.com was for Hedge School. strategyjam.org can become a partner at any
   time, outside this repository: it would add a button to its game page and, to keep reviews, a save page. The
   build is the same either way.
2. **Each site names its own messages:** `cyanotype:ready`, `cyanotype:review`, `cyanotype:saved`,
   `cyanotype:failed`. A partner of both sites then tells the two apart, as each site's review file has its own
   format. Hedge School's names on both sites would need one handler less, but the messages would name a site that
   did not send them. Hedge School's names stay as they are.
3. **The buttons' labels have Hedge School's form:** "Review in Cyanotype" and "Review" for a finished game, "Open in
   Cyanotype" and "Open" for a saved review. "Open in Cyanotype" is also the bookmarklet's name, and both open a game
   here. A longer label for the saved review, such as "Open your review in Cyanotype", would differ from Hedge
   School's.

## The cells' marks

A cell has its owner's colour. A star cell and a wall also have a white mark, so that the shape tells the kinds apart,
not the colour alone. The decision log has the five options and the reasons for this design ("Cyanotype's cells:
striped walls and six-point stars"). The sizes below are shares of the grid's hex radius, from a hex's centre to a
corner (`hex.ts`). A cell's body has the radius 0.93, so that a gap shows between two cells.

1. **A Normal cell** has no mark. It is the most common kind.
2. **A star cell** has a six-point star: two equilateral triangles, one outline of twelve points. Each point is
   towards one of the hex's six corners, 0.64 from the centre.
3. **A wall** has three diagonal stripes that rise to the right, at 45°. Each stripe is 0.17 wide, and their middles
   are 0.38 apart. The middle one goes through the centre. A hex of radius 0.76 cuts off the stripes at their ends.
4. **The same marks everywhere a cell shows:**
   - The board and the hands' frames.
   - A captured cell, and a ghost: a cell that a candidate, a line or the player's own move would place. Both are
     faded and dashed, and their marks take the owner's colour.
   - A move's glyph in the move list and the notes, and an edit's cell in the form "Hexes". In a line of text, the
     cell takes the text's colour, and its mark the colour that the text gives.
5. **Why these marks:**
   - **They read at text size and in grey.** A move's glyph draws a cell about as high as the text round it,
     about 15 pixels. The thin lines of the earlier marks (a five-point star, and a wall's courses of bricks) blurred
     there, and on a faded cell.
   - **The star is round and shares the hex's corners.** A six-point star has the hex's symmetry, so it sits in the
     middle of the cell and fills more of it. A five-point star needs an offset to look centred, and its points do
     not match the hex.
   - **Stripes against a star: lines against a shape.** The two marks differ in their kind, not in a detail, so they
     stay apart in grey and for a reader who does not see the colours.
6. **The logo, the link preview picture and the strategyjam.org button keep their own drawings** ("The logo", and
   "How a game comes in from strategyjam.org"): their five-point star, and the bricks of the picture's walls.

`apps/cyanotype/src/lib/board/Cell.svelte` draws a cell, and `cellMarks.ts` gives the two marks' shapes.

## Analytics

Cyanotype measures its visits and its events as Hedge School does (its designs 11 and 17), in the code that both sites
share (design 29). It asks for no consent: its visit counts set no cookies, and it stores no practice games.

1. **The shared parts,** moved from Hedge School: in `packages/site`, the analytics (`analytics.svelte.ts`: one
   `Analytics` for each site, with its build's two services and its keys), the flag of internal traffic
   (`internalTraffic.ts`), the ranges (`measure.ts`), the card at the window's lower left with the site's mark
   (`CornerCard.svelte`) and the consent banner (`ConsentBanner.svelte`), which Cyanotype does not show, and PostHog's
   client (`posthog.ts`). The engine settings' changes (`packages/analysis/src/settingChanges.ts`), the
   exports (`packages/review/src/exportEvents.ts`) and a practice game's parameters
   (`packages/practice/src/practiceEvents.ts`), beside the import's events (`packages/import/src/importEvents.ts`).
   Each site's `src/lib/analytics.svelte.ts` makes its analytics. Its other files give the events the site's names of
   its networks and its sources. Hedge School's behaviour, events and keys stay as they were.
2. **The services:** the one PostHog project of all the sites (Hedge School's design 11). The two sites' events have
   the same names, and each event names its host (`$host`), so that a report splits them. Cloudflare Web Analytics is
   the domain's one site, `abstractclass.org`, which takes the beacon of every subdomain and splits the visits by host.
   The build reads Hedge School's variable names, `VITE_POSTHOG_KEY` and `VITE_CF_ANALYTICS_TOKEN`. The deploy gives
   the repository variable `POSTHOG_KEY` as `VITE_POSTHOG_KEY`, and the domain's token `VITE_CF_ANALYTICS_TOKEN` as it
   is, for `main` only. Without them, as in development and on the previews, nothing is measured, and the build holds
   none of PostHog's code. [docs/hosting.md](../hosting.md), "Cyanotype's analytics", gives the setup.
3. **No consent:** PostHog's cookieless mode sets no cookies and keeps nothing in the browser, and Cyanotype stores no
   practice games yet (abscls-8tl1.50), so it has no random number that links them. So Cyanotype shows no banner, and
   its Privacy page has no "Your choices". The Privacy page says what is measured, in Hedge School's words. The
   browser keeps the flag of internal traffic under `cyanotype:internal-traffic:1`: each site keeps its own. No
   build of Cyanotype measured with Google Analytics, so no visitor gave the consent that it asked for.
4. **The events have Hedge School's names and parameters** where the thing is the same, so that the two sites' reports
   compare. The layout starts the analytics, unless the address holds a game: then the page that takes the game out
   of the address starts them (the review, the import page, the Analysis board and the board editor). The pages send
   these events:
   - the review: `review_open`, `review_done`, `game_missing`, `engine_error`, `setting_change`, `feature`, `export`.
   - the Review tab: `import_game`, `import_failed`, `load_saved` (a review file), `load_failed`, `game_delete`,
     `game_delete_cancel`, `export`, and the visitor's property `games_stored`.
   - a shared review: `review_share_open`, `load_saved`, `load_failed`.
   - the import page: `tool_out_of_date`, `import_game` for a game that it keeps for its review, and `import_failed`
     for a game that it cannot read, open or keep.
   - the Analysis board: `analysis_open`, `import_game`, `import_failed`, `load_saved`, `load_failed`,
     `engine_error`, `setting_change`, `feature`, `export`.
   - the board editor: `editor_open`, `editor_analyze`.
   - Practice: `practice_start`, `practice_end`, `engine_error`, `feature`.
   - the engine's session, on the review and the Analysis board: `gpu_test`, and `engine_error` for the GPU.

   **Where Cyanotype's events differ from Hedge School's:**
   - **Its ways in** (`import_source`): `pasted_record`, `pasted_position`, `site_link`, `strategyjam_bookmarklet`
     and `strategyjam_userscript`. Cyanotype has no meaf.us tools (`bookmarklet`, `userscript`, `older_tool`) and no
     Constellation export (`pasted_constellation`): both are Enclosure's. Its tools always send their version, so
     `stale_tool` is never `older`.
   - **Its saved work** (`load_source`): `review_file`, `review_share_link`, `analysis_share_link` and
     `analysis_file`. Cyanotype has no partner sites yet, so it sends no `partner_review` and no `export_kind`
     `partner_save`.
   - **`edges` holds the game's moves.** Blueprints has no edges. The parameter keeps Hedge School's name, so that the
     reports have one dimension for a game's length.
   - **`network`** names Stamp Duty's networks (Stamp Duty 0.2).
   - **`practice_game` is always false:** Cyanotype keeps no practice game in the player's games yet (abscls-8tl1.50).
     `practice_from` takes Hedge School's values: `new`, `analysis_board` for the board's "Play the bot from here",
     `set_up_start` for a set-up start, and `resumed` (`practiceFrom` in `@abstractclass/practice/practice.ts`).
   - **Practice's features** (`feature_name`): `practice komi`, `practice takeback`, `practice look back` and `note
     drawn`. Cyanotype's Practice has no display settings of Hedge School's, so it sends none of their features.
   - **`error_kind` "rules"** on the review also counts a record whose capture marks the engine's rules refuse.
   - **No event of a part that Cyanotype lacks:** Support Us (`support_open`, abscls-8tl1.49) and Openings
     (abscls-8tl1.53).
5. **The test:** the layout test's analytics cases (Hedge School's `tests/analytics.spec.ts`) run on check:all's
   builds of both sites, each with a made-up PostHog key. Playwright's routes answer PostHog's addresses in its place
   and keep the events that the pages sent. Cyanotype's case checks its page views, with `internal` after
   `?internal=on`, and that it asks for no consent and keeps nothing in the browser. `tests/cyanotype-events.spec.ts`
   checks the events of the review files and the review snapshot in the same way. It checks a review file loaded and a
   file that cannot load. It checks the exports of the review file and of the annotated record, from the review and
   from the Review tab. It checks the review snapshot's open and Review again. A build without the key holds none of
   PostHog's code: check:all builds Cyanotype without the key first, and its step `cyanotype-no-posthog` refuses a
   script of that build that names PostHog's address or its client's extensions.

## The logo

Cyanotype's logo is **the cyanotype:** the start's blueprint, a star in its ring of six cells, printed white on
Prussian blue (`#163f6f`). A cyanotype is the print that made blueprints, so the logo ties the site's name to its game.
The decision log has the four options and the reasons for this one ("Cyanotype's logo: the cyanotype").

1. **Two drawings by size,** as Hedge School's collie has (design 12): the full print from 48 pixels up, and below
   that a simple drawing that reads at 16 pixels.
   - **The full print:** the seven cells in white lines, the star filled white in the middle one, and a thin border
     inside the tile, as a print's edge.
   - **The simple drawing:** the seven cells filled white, with gaps between them, and the star cut out of the middle
     one in the tile's blue. The thin lines and the border of the full print blur at 16 pixels.
2. **The same in both themes.** The tile carries its own colour, so the logo needs no dark form. The tile keeps a
   clear edge on a light page and on a dark one. Its blue sits beside the site's accent, Hedge School's lavender, in
   both themes: both are cool colours. The accent stays the lavender.
3. **The header** shows the simple drawing at 28 pixels before the site's name, on every page, at a phone's width as at
   full width.
4. **The favicon** is the simple drawing, the same on light and dark tabs, with the files of Hedge School's (design 12,
   item 5):
   - `src/lib/assets/favicon.svg`, which the page names.
   - `static/favicon.ico`: 16, 32 and 48 pixels, for browsers without SVG icons and for the clients that ask for
     `/favicon.ico` without reading the page.
   - `static/apple-touch-icon.png`: 180 pixels, for iOS's home screen. It is the full print on a full square with
     square corners: iOS rounds the corners itself and fills transparent ones with black.
5. **The link preview picture** (`static/brand/card.png`), as Hedge School's (design 23): 1,200 × 630 pixels, in the
   site's dark theme. On the left, a corner of a board, drawn by hand: each player's start blueprint, grown towards the
   other, with a wall of each. On the right, the full print, the site's name, "Learn Blueprints" in the accent, what
   the site does, and its address. The root layout gives it to every page (`og:image`, with its size and alt text, and
   `twitter:card` `summary_large_image`).
6. **The head for partner sites' buttons.** Hedge School gives its head to partner sites at
   `/brand/hedge-school.svg` (design 18). Cyanotype's comes with its partner sites ("Partner sites", item 11): the
   simple drawing at `/brand/cyanotype.svg`, abscls-8tl1.77. Until then Cyanotype has no such file.
7. **How each file is made.** The drawings are SVG in code (`src/lib/brand/logo.ts`, and the card in `card.ts`).
   `scripts/brand.mjs` writes the favicon's SVG file from them, and draws the PNG files in headless Chromium, each at
   its own size, with the launch options of the layout test (off the GPU on Windows). Run it again after a change of
   the drawings: `node scripts/brand.mjs` in `apps/cyanotype`. A test (`logo.test.ts`) keeps the favicon's file equal
   to the simple drawing.

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
that Cyanotype's lacks, unless `apps/cyanotype/engine.lock.exceptions.json` names its issue. No gap: since
`engine-91ab0b7d`, Cyanotype's lock has every kind of Hedge School's, so it has no exceptions file. Both locks have
the module, the GPU module and its library, the practice bot in its three forms (`practice-module`,
`practice-threaded-module`, `practice-evaluator`, `practice-library` and `cpu-evaluator-library`), the network
(`model`) and its graph, the notices and the terms.

### By page

Both sites have the home page, About, How reviews work, Notation, Notices, Privacy, Tools, Practice, the review, the
Analysis board, the board editor, the import page, the site map, the bookmarklet, the userscript and the engine
measure (`/lab/measure`, `packages/measure`). Cyanotype lacks these pages of Hedge School:

- **The page for other sites** (`/developers`): how a partner site sends a game and takes its review back (design
  18). abscls-8tl1.51. The page describes what Cyanotype takes today. Its sections on partner sites come with them
  ("Partner sites", item 9, abscls-8tl1.77).
- **Openings** (`/openings`) and the book's table lab (`/lab/book-table`): the opening book's own page (design 32), in
  the builds that serve the test book. Put off until Blueprints has an opening book: abscls-8tl1.53 (deferred).
- **Puzzles, Learn and the engine lab** (`/puzzles`, `/learn`, `/lab/engine`): prototypes, only in the full edition
  (design 11). Left out while they are prototypes: Cyanotype takes each one when Hedge School makes it public.

### By the parts of `src/lib`

The parts of Hedge School's `src/lib` that Cyanotype has no counterpart for, as features:

- **The removal of earlier engine results after a release** (`game/earlierResults.ts`, design 20). abscls-8tl1.30.
- **The area map** (`review/enclosureMap.ts`, design 30). abscls-8tl1.17 decides whether Blueprints has one ("No
  area map yet").
- **Practice's stored games** (`practice/send.ts`, `practice/stored.ts`, with the site's `functions/` and
  `migrations/`, design 25), and an ended game in the player's games for its review. Cyanotype has no backend
  ("Practice against Stamp Duty", item 2). abscls-8tl1.50.
- **The Analysis board at a komi** (design 24, item 15): a record, a link or an analysis file with a `Komi` tag opens
  at its komi and keeps it in the board's link and file. The board refuses them until then (the komi, above).
  abscls-8tl1.50.
- **Move sounds** (`sound.ts`, `ui/SoundSettings.svelte`, design 08), on the review and on Practice. abscls-8tl1.42.
- **The image of a line** (`board/boardImage.ts`, `board/gif.ts`, `review/enclosureImage.ts`, design 07, item 17).
  abscls-8tl1.43.
- **The opening book** in the review and on the Analysis board (`book/`, design 32). Put off with the Openings page:
  abscls-8tl1.53 (deferred).
- **Support Us** (`SupportDialog.svelte`, Ko-fi's panel, design 22). abscls-8tl1.49.
- **The review's marks before the first paint** (`review/pageMarks.ts`, design 23). abscls-8tl1.45.
- **Partner sites** (`game/partners.ts`, design 18): a partner's link that names where the review goes back, and a
  kept review sent back to the review (`from=`). To be built: "Partner sites" gives the steps, abscls-8tl1.74 to
  abscls-8tl1.77.
- **meaf.us and Constellation** (`game/meaf.ts`, `game/meafPage.ts`, `game/constellation.ts`): their records and
  tools. Both play Enclosure only ("Decision", item 3), so they are left out.

### By setting

A setting of a feature above comes with that feature: the sounds (on or off, the sound, the volume) with the move
sounds, the area map's settings (where it shows, its style, its thresholds, the chart's area line) with the area map
(abscls-8tl1.17), and the mark of a book move with the opening book. The review's settings (what the labels judge, for
whom, the win chance's form) are Hedge School's, and Cyanotype adds "Move notation" ("The review and the Analysis
board", item 4). These settings are gaps of their own:

- **The networks** (design 09): Hedge School's settings and Practice offer two networks, HedgeFund 0.2 Lite and
  HedgeFund 0.2, and its lock keeps the earlier ones for the games that name them. Cyanotype offers the one network
  of Blueprints' release, Stamp Duty 0.2. Put off until Blueprints' release has a second network: abscls-8tl1.54
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
- **The site's look:** the logo is the cyanotype ("The logo"). A colour of its own and the board's style are still
  to decide. The accent is Hedge School's lavender in both themes, and the logo's blue sits beside it. The userscript's
  button shows the start's blueprint, as the logo does ("How a game comes in from strategyjam.org", item 4).

## Where it is

- `apps/cyanotype/`: the app. `src/lib/site.ts`: the site's name, the engine's, the live address
  (`https://cyanotype.abstractclass.org`, the canonical address of each page) and the storage keys
  (`cyanotype:…`). `src/routes/+layout.svelte`: the icons, the link previews' tags, and the header, with the logo, the
  name and its "Early Access" link (`SiteName.svelte` and `edition.ts` of `packages/site`, "Decision", item 11), the
  game's pages, the pages about the site and the theme menu, and below a tablet's width the site's menu
  (`SiteMenu.svelte` of `packages/site`), which holds the links in their place, as Hedge School's below 1,024 pixels.
  `src/lib/SiteFooter.svelte`: the footer, with How reviews work, Privacy and Notices. `src/app.css`: the accent
  (Hedge School's lavender) and the board's colour tokens, after the shared style and the view's
  (`@abstractclass/review/review.css`).
- `apps/cyanotype/src/lib/analytics.svelte.ts`: Cyanotype's analytics ("Analytics"), on
  `packages/site/src/analytics.svelte.ts`, with the flag of internal traffic (`src/lib/internalTraffic.ts`, read as the
  site starts in `src/hooks.client.ts`), the sources and the imports' and exports' events (`src/lib/game/sources.ts`),
  the settings' changes (`src/lib/analysis/settingChanges.ts`) and a practice game's parameters
  (`src/lib/practice/stampduty.ts`). The layout starts the analytics. The deploy's two variables: the job `cyanotype` of
  `.github/workflows/deploy.yml`.
- `apps/cyanotype/src/lib/brand/`: the logo ("The logo"). `logo.ts` (the drawings), `Logo.svelte` (the logo at a size),
  `card.ts` (the link preview picture) and `logo.test.ts`. `scripts/brand.mjs` draws the files from them:
  `src/lib/assets/favicon.svg`, `static/favicon.ico`, `static/apple-touch-icon.png` and `static/brand/card.png`.
- `apps/cyanotype/src/routes/+page.svelte`: the home page, as Hedge School's (design 22): what the site is, the calls to
  Practice and the review, the ways in for a game of one's own (the Review tab for a record, a game from strategyjam.org
  through the tools, the Analysis board and its board editor), and a board that plays a scene from a reviewed game
  (`src/lib/home/HomeReplay.svelte`, on the shared replay `Replay.svelte` of `packages/site`). The scene is in
  `src/lib/home/replay.json`, and its first frame in `still.json`, which `scripts/home-replay.mjs` writes from the
  stored review of the review's test game (Hedge School's `tests/fixtures/cyanotype-review.json`, a game of Stamp Duty
  against itself): the 9 turns before the game's latest move with a bad label, and that move. That review gives one
  scene. More scenes need more reviewed games, and the script takes one stored review. The board is a picture there
  (`Board.svelte`, its prop `still`): no pan, no zoom and no zoom buttons, and the page scrolls over it.
- `apps/cyanotype/src/routes/`: the pages. The About page has the section on the early access (`#early-access`,
  "Decision", item 11), and the section "How a review works", with the link to its page. `how-reviews-work/`: How a
  review works ("The review and the Analysis board", item 13). The Notation page describes the moves, the marks and
  the record of items 5 to 7, 9 and 10, with one game made by hand as its examples. Item 8 is the move list's
  display, and comes with the move list. `sitemap.xml`, `static/robots.txt` and `static/_headers` follow design 23.
  The build's `404.html` answers each path that the site does not have. `static/_headers` also lets a browser keep
  each of the engine's files under `/engine/:id/:file` for a year, as Hedge School's: each folder's name comes from
  `engine.lock.json`, and names the engine's release or the network.
- `apps/cyanotype/scripts/release-check.mjs`: the check of a deployed site ([hosting.md](../hosting.md), "Deploy,
  check and roll back"), with the checks that both sites share (`packages/site/src/release-check.mjs`). It gives them
  no pages that lead home, because Cyanotype's early access hides no page ("Decision", item 11), and adds no check of
  a Function, because Cyanotype has none ("The gaps from Hedge School", "Practice's stored games"). When that gap
  closes, its check comes into this script as in Hedge School's.
- `apps/cyanotype/src/lib/game/`: the game's notation and records, as Hedge School's `src/lib/game/` holds
  Enclosure's records. `notation.ts`: the moves (Blueprints' part of the game interface: `moves`), their capture
  marks, and the turns. `record.ts`: the record, on the shared frame. `check.ts`: the capture marks' check against
  each move's captured cells and points, which the engine will give (request 23). `strategyjam.ts`: a strategyjam.org
  game as a record. It is self-contained, as Hedge School's is, so that a tool can run it on the game's page.
  `strategyjamPage.ts`: the reader of Blueprints' game page, and the tools' messages. `tools.ts`: the tools' parts
  (their names, the button's picture and place, the page code), with the files that the routes serve.
- `apps/cyanotype/src/routes/import/` and `src/routes/tools/`: the import page and the tools page.
  `src/lib/review/recordCheck.ts`: a record's check by the engine's rules, for the import page, the player's games and
  the Analysis board, with its test on the engine in Node (`recordCheck.engine.test.ts`).
  `src/routes/bookmarklet.js/`, `cyanotype.user.js/` and `cyanotype.meta.js/`: the tools' files, which
  `static/_headers` serves with `no-cache`. `vite.config.ts`: the build's address for the userscript, the
  userscript's versions, and the engine package's two settings ("The engine's files", item 5), as Hedge School's.
- `packages/import/` (`@abstractclass/import`): the tools' frame, the hash after the `#`, the import's events, the
  import page's choice for a tool's game (`ToolChoice.svelte`, with `import.css` for its classes) and the review's
  opening of a kept game (`openReview.ts`), which both sites share (design 29, item 10).
- `packages/record/`: the record's frame (`record.ts`), with a test game of words. Hedge School's
  `src/lib/game/record.ts` gives Enclosure's moves and cut mark to it, with its calls as before.
- `packages/analysis/src/turns.ts`: the turns of one move, then two, for both games' `turn`.
- `packages/site/` (`@abstractclass/site`): the frame that the two sites share, moved from Hedge School (item 4).
  `site.css` (the general colour tokens, the players' colours, the base styles, the page area's rules and the general
  controls: the menus, the main button, the icon button, the dialogs and the keys' lists), `SiteFrame.svelte` (the
  header's bar over the page's own scrolling area, with each page's scroll place),
  `theme.svelte.ts` and `ThemeMenu.svelte` (the theme, under each site's own key), `PageMeta.svelte` and
  `origin.ts` (each page's metadata, from the site's live address), `prose.ts` (the pages' text style), the
  notices page (`NoticesPage.svelte`, and `LibraryNotices.svelte` for the libraries, ONNX Runtime Web and the font
  Fira Code that the pages ship), and `themeTokens.ts` (the colour tokens of a site's style sheets in each theme, read
  in Node by Hedge School's `symbolShades.test.ts` and the hub's
  `scripts/enclosure-board.mjs`, for the checks that compare colours). Each site's root layout gives `SiteFrame`
  what its header holds, its live address and its keys. Each site keeps its own logo, accent and header links. Hedge
  School's Support Us dialog stays in Hedge School. `SiteMenu.svelte`: the site's menu on a narrow screen (design 22),
  with each site's links, and Hedge School's "Support Us" on a phone. `Replay.svelte`: the home page's board as a
  replay of scenes (design 22), with each site's frames and board. `edition.ts` and `SiteName.svelte`: the early
  access's build switch, and the site's name in the header with its "Early Access" link ("Decision", item 11), with
  each site's logo and name. The two footers (`src/lib/SiteFooter.svelte`)
  have the same markup, with each site's links and the game's credit. They are still each site's own, and move into
  the package in a later change (item 4).
- `apps/cyanotype/engine.lock.json`: the engine's files and the networks' sizes ("The engine's files"), which
  `npm run engine` fetches into `static/engine/` (not in Git). It has every kind of Hedge School's lock, so it has no
  exceptions file beside it for the check `engine-kinds` (`scripts/engine-kinds.mjs`, "The gaps from Hedge School").
- `apps/cyanotype/src/lib/board/panel.ts`: the hands' panel: its place and size, its limits, the resize handle, and
  the fit's choice of corner (`fitWithPanel`). `view.ts`, `fitAround`: the fit that keeps the hexes out from under it.
  `Board.svelte`, its prop `hands`: the hands in the board's box ("box", the lab's), in the panel ("panel") or under
  the field ("under"), with the panel's `place` and `size`. Tests: `panel.test.ts` and `view.test.ts`.
- `apps/cyanotype/src/routes/practice/+page.svelte`: Practice. `src/lib/practice/game.svelte.ts`: the game, with the
  rules' worker and the bot, from the standard start or a start brought ("From a position"). `stampduty.ts`: the site's
  part of `@abstractclass/practice` (its keys, its networks, the half-life, the bot's name). The bot's forms and its
  worker are `@abstractclass/practice`'s (`botForms.ts`, `botFormsWorker.ts`). `bot.engine.test.ts`, in Node: the
  one-thread bot at 1 and 2 visits on a position of more views, and on that position the threaded bot on its CPU
  evaluator with the manifest's sizes, which plays the one-thread bot's moves at 1, 4 and 8 visits.
  `scripts/practice-forms.mjs`: whole games of the threaded bot against the one-thread bot's from one seed, below 16
  visits ("Practice against Stamp Duty"). `src/lib/board/described.ts`: the engine's describe and describe_game as the
  board draws them, for the lab and Practice.
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
  - The view: the board fits the cells until the player pans or zooms, and again after "Show all the cells". It keeps
    its fit while a pointer is down. A drag or one finger pans, two fingers pinch, and the wheel zooms round the
    pointer by d3-zoom's steps.
  - `Cell.svelte`: a cell and its kind's mark ("The cells' marks"), with the marks' shapes in `cellMarks.ts`.
  - `position.ts`: the position in strategyjam.org's form and the move as the board draws it. `hex.ts`: the grid's
    geometry. `view.ts`: pan, zoom and fit. `fixtures.ts`: the lab's positions, from `fixtures.json` ("How the board
    takes a move").
- `apps/cyanotype/src/routes/lab/measure/`: the engine measure's page (`/lab/measure`, `packages/measure`), with
  Cyanotype's part: its default engine settings and the positions of the review's test game, the whole game.
- `apps/cyanotype/src/routes/lab/board/`: the board's lab page (`/lab/board`), in the site's frame: the start, a
  middle game with five candidates and their lines, a capture, an edit and an empty blueprint. The board fills the
  page area under the site's header. The address keeps the position and the pinned candidate.
- `apps/cyanotype/src/app.css`: the board's colour tokens that the shared style and the view's do not hold (the
  board's background and its points), Hedge School's. The last move's, the engine's and the candidates' colours are
  the view's (`packages/review/src/review.css`), and both sites take them from there.
- `apps/cyanotype/src/routes/review/` and `src/routes/analysis/`: the review and the Analysis board, in the shared
  view (`@abstractclass/review/ReviewView.svelte`). `src/lib/review/`: Blueprints' part of the view
  (`blueprintsView.ts`), its game for the analysis (`blueprints.ts`, with the glyphs' parts and the notes), the board
  (`ReviewBoard.svelte`), the glyphs (`MoveLabel.svelte`), the small hexes (`MoveShape.svelte`), the table's least
  size (`table.ts`), the display settings (`display.ts`), and the area map kept for later (`blueprintsMap.ts`).
  `src/lib/board/chips.ts`: the hands' rank chips. The player's notes ("The player's notes"): `notes.ts` and the
  notes' colours (`review.css`) in `packages/review`, which both sites use, and their keys (`NOTE_KEYS`) and drawing
  in `src/lib/board/Board.svelte`, with the arrow's shape and a drag's hexes in `hex.ts` (`arrowPoints`,
  `hexesAlong`).
  `packages/review/src/ReplaceAnalysis.svelte`: the board's question before a record replaces the analysis kept here,
  which both sites' boards use.
- The Export menus and the links ("The review and the Analysis board", item 12): `src/lib/game/share.ts` (Blueprints'
  moves in a link, the review's link and its record), `board.ts` (the board's link), `analysisFile.ts` (the analysis
  file), `reviewFile.ts` (the review file, "The review files"), `src/lib/review/annotate.ts` (the annotated record),
  `reviewExports.ts` (the review's entries, the link from a game's mark, the review file and the annotated record),
  `exportText.ts` (the review's annotated record, from its review and from the store) and `SharedArrival.svelte` (a
  shared review's page), with their tests. The shared parts: `packages/analysis/src/share.ts`, `boardLink.ts`,
  `files.ts`, `reviewFile.ts` and `annotate.ts`, and `packages/review/src/ExportMenu.svelte`, `exports.ts` and
  `NewMenu.svelte` (design 29, "Where it is").
- The review snapshot and the annotated record from the store ("The review snapshot and the annotated record from the
  store"): `src/routes/review/+page.svelte` (`openSnapshot`, `reviewAgain`), `src/lib/review/storedReview.ts`
  (Cyanotype's step after the rules) and `exportText.ts`, on `packages/analysis/src/storedReview.ts`.
  `apps/hedgeschool/tests/cyanotype-snapshot.spec.ts`: the browser tests of the review snapshot, by move and by turn,
  of a file of an earlier engine loaded after the site's review of the game, of the annotated record from the review
  and from the store, and of a review file that opens in a new browser.
- The board editor and a position's notation ("The board editor", "Decision", item 10): `src/routes/editor/+page.svelte`
  (the page), `src/lib/editor/position.ts` (a cell put, a hand's cell moved, the count and the scores),
  `src/lib/game/position.ts` (the notation, the engine's form and a start's turn), `src/lib/game/paste.ts` (the
  Import's moves), `src/lib/game/board.ts` (a record's board, from its start) and `src/lib/review/recordCheck.ts` (a
  record's or a start's check by the engine's rules), with their tests. `position.engine.test.ts` gives every position
  of the lab's games and of the review's test game to the engine through the notation. The shared parts:
  `packages/review/src/ImportDialog.svelte` (the Import), `packages/record/src/record.ts` (`withStartTag`,
  `pastedError`), `packages/analysis/src/turns.ts` (`moverOf`, `countWithMover`) and `packages/analysis/src/game.ts`
  (`enginePosition`). `apps/hedgeschool/tests/cyanotype-editor.spec.ts`: the browser tests of the editor, the Import,
  and a set-up start through a link and a file, and `layout.spec.ts` the editor's layout.
- The player's games ("The player's games"): `src/routes/review/+page.svelte` (the review's address, the lock and a
  game's own settings), `src/lib/review/ReviewHome.svelte` (the Review tab), `src/lib/game/store.ts` (the game's id and
  the store's calls), `src/lib/game/import.ts` (a record's way into the list, and a shared review's) and
  `src/lib/review/recordCheck.ts` (`checkRecordMarks`), with their tests (`store.test.ts`, `import.test.ts`).
  `src/lib/analysis/engineSettings.ts`: a game's own settings for Cyanotype's networks. The shared parts:
  `packages/analysis/src/games.ts` (the store and the marks), `reviewLock.ts` (the lock) and `settings.ts`
  (`ownSettingsOf`), `packages/review/src/GameList.svelte` (the list, its Export and its Delete),
  `packages/site/src/ConfirmDialog.svelte` (the question) and `packages/storage/src/persist.ts` (the request to keep the
  site's data), with their tests (design 29, "Where it is"). `apps/hedgeschool/tests/cyanotype-games.spec.ts`: the
  browser tests of the Review tab with kept games, the refusals, a game's Delete, the lock between two tabs and a shared
  review's own settings, and `layout.spec.ts` the Review tab's layout.
- `apps/hedgeschool/tests/cyanotype-review.spec.ts` and `move-header.spec.ts`: the browser tests of the review, and
  `layout.spec.ts` its layout. `cyanotype-notes.spec.ts`: the notes on the Analysis board and on Practice, with
  `cyanotype-notes.ts`, which the review's test, the layout test of the board with notes and Hedge School's test of
  its notes (`notes.spec.ts`) use too.
  `cyanotype-import.spec.ts`: the import page's choice, the game that it keeps for the review, the Analysis board's
  question over a kept analysis, a record that the engine refuses, a game that the browser cannot keep and the notice
  of an out-of-date tool, and `layout.spec.ts` the page's layout. They
  run where the site has the engine's files, the Tests workflow too: without them they skip.
  The tests of the review, and the layout test's review and Analysis board, load a stored review of the test game
  and ask the engine for no search: `tests/fixtures/cyanotype-review.json`, a review file, which
  `apps/hedgeschool/scripts/cyanotype-review-fixture.mjs` writes again when Cyanotype's `engine.lock.json` takes a new
  release. The script saves it from the review's Export menu, and adds the results of the Analysis board's position.
  The layout test's review loads it in the Review tab, as a player loads a review file (`cyanotype-review.ts`,
  `reviewStoredFile`). The other tests put its results in the browser's store (`storeReview`). The same script writes
  the other stored reviews (`cyanotype-fixture.ts`, `OTHER_STORED`), which only Cyanotype's label snapshot reads
  (`apps/cyanotype/src/lib/review/labels.snapshot.engine.test.ts`): the whole test game, and a second game of Stamp
  Duty against itself to the end of turn 23 (`src/lib/review/fixtures/stamp-duty-seed12.txt`). They are not review
  files: each holds its engine and its results. Their results have no ownership, because only the area map reads it.
  With them, the label snapshot reaches each quality label by move, each one by turn but Great, the turns in the other
  order and the twins (item 9). `cyanotype-fixture.ts` reads the stored reviews, with no Playwright import, for the
  label snapshot too.
  `cyanotype-live-review.spec.ts` reviews the game's first three turns with the engine, on the CPU, and checks that
  the browser's store then holds the stored review's results for them, value for value. The rank chips' test needs
  a position whose candidates place one blueprint more often than a panel shows. Stamp Duty 0.2's review of the test
  game has none, so the test makes one from the stored result after move 8, and puts the stored result back after
  it.
- `apps/hedgeschool/scripts/cyanotype-gpu-check.mjs`: the check of the GPU paths on Cyanotype's preview: the review,
  the Analysis board and Practice. One run checks the GPU On and then Auto (Auto's first-use test), each in a new
  browser context. `--on` or `--auto` checks one setting. The board has 1 worker and the threat on, so that its
  searches make the backlog at which the GPU joins (Hedge School's design 15, item 1). The check then counts the
  searches that go to the GPU worker. It runs only as a GPU-path check, in Playwright's full Chromium
  ([working-notes.md](../working-notes.md), "The GPU in Playwright's Chromium"). With `--cpu`, it checks the same
  pages off the GPU, where the board starts no GPU worker and the bot starts on the CPU workers. Its parts, its waits'
  limits and its watchdog are in `apps/hedgeschool/scripts/gpu-check.mjs`, which Hedge School's check shares.
- `apps/hedgeschool/scripts/cyanotype-gpu-diagnose.mjs`: a diagnosis of the GPU worker's start on Cyanotype's preview,
  for a GPU that does not start. It prints the adapters, the device that ONNX Runtime asks for, and each step of the
  start, in Playwright's full Chromium and in its headless shell, the control. It is a GPU-path run too
  ([working-notes.md](../working-notes.md), "Faults with the WebGPU flags").
- `apps/hedgeschool/scripts/measure/pool-start.mjs`: the start of the engine's pool on the Analysis board of a build
  of either site, on the CPU: each worker's start and memory, the time of the search's answers and of a visit, and the
  memory of the browser's renderers ([decisions/engine.md](../decisions/engine.md), "Cyanotype's engine pool at Hedge
  School's size").
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
"Cyanotype's engine from Blueprints' first release" (2026-11-05), "Cyanotype's build without ONNX Runtime's
WebAssembly" (2026-11-05), "Cyanotype's logo: the cyanotype" (2026-11-06), "Cyanotype's board editor and a
Blueprints position's notation" (2026-11-07), "Cyanotype on Stamp Duty 0.2, with the GPU and the threaded bot"
(2026-11-07), "A note's moves in glyphs on the middle of the line" (2026-11-07), "Cyanotype's variations in
"Hexes"" (2026-11-07), "Cyanotype's early access, as Hedge School's" (2026-11-07), "Cyanotype keeps the player's
games, as Hedge School's" (2026-11-07), "Cyanotype refuses a set-up start before the click, and shared lookups"
(2026-11-08), "Cyanotype's cells: striped walls and six-point stars" (2026-11-08), "Cyanotype's How a review works page"
(2026-11-08), "Cyanotype's partner sites: the design" (2026-11-08), "Cyanotype's analytics and consent, as Hedge
School's" (2026-11-08), "Cyanotype's board editor checks that a game can reach the position" (2026-11-09),
"Cyanotype's import page keeps the game, as Hedge School's" (2026-11-09), "Cyanotype's Play the bot from here, and
Practice from a set-up start" (2026-11-09), and "PostHog in place of Google Analytics" (2026-11-09). The earlier
entries name the site by its first name, Drawing Board.
