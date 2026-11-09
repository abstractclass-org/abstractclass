# Practice: a game against HedgeFund in the browser

**Status:** in force, built. **Decided:** 2026-10-14. The visits to 8,192, and any number of them: 2026-10-17. The
komi: 2026-11-06. The opening book at a komi: 2026-11-07.

## Context

A player learns from games, not only from the review of one. Lichess and chess.com let a player play their engine at
a chosen level, then review the game. Hedge School runs no play between people (design 19), but a game against the
engine is practice: it needs no other player, no matchmaking and no server.

The engine repository built the practice bot for this (request 15, its v2 design 22), in release
`wasm-v2-engine-54486cd`. It is KataGo's GTP engine with the bot's play settings (`gtp_enclosure.cfg`: resignation off,
the tree kept from move to move), not the analysis module's settings. It takes GTP commands in the site's notation,
searches each move to a number of visits, and runs in the browser in two forms:

- **One search thread** (`enclosure-bot.wasm`): the network in the instance, in any browser.
- **Several search threads** (`enclosure-bot-batched.wasm`): KataGo's threads as coroutines in one instance, their
  positions evaluated together by the GPU (ONNX Runtime Web on WebGPU) or by CPU workers (`enclosure-eval.wasm`). It
  needs JSPI, as the GPU module does (design 15).

Its speed on the engine repository's desktop, seconds a move, at 64, 256 and 1,024 visits, with HedgeFund 0.1 Lite: one
thread 0.83, 2.8 and 9.8; 4 CPU workers 0.26, 1.0 and 3.5; WebGPU 0.18, 0.40 and 1.3 (requests/15-practice-bot.md).
How strong each setting plays against people is not measured yet.

## Decision

1. **A page, `/practice`, for a game against HedgeFund in the player's browser,** on the practice bot. No server and
   no clock: each bot move searches to its visits, so a setting plays at the same strength on every machine, and a
   slow machine only waits longer. This departs from Lichess, whose games against the computer run on its servers
   (request 15). The header names it first, and it is the home page's first call to action (design 22).
2. **The bot's settings,** chosen before the game and fixed for it, as Lichess fixes the computer's level: the network,
   the visits, the variety and the komi. Levels come later, from the engine repository's visit ladder and from games
   by setting.
   - **The network:** HedgeFund 0.2 Lite (the default) or HedgeFund 0.2. A game kept from an earlier visit goes on
     with its own network, also an earlier one that the list no longer offers (HedgeFund 0.1 Lite, HedgeFund 0.1): the
     site still ships them (design 09). A saved choice of an earlier network takes the default.
   - **The visits for each move:** any whole number from 1 to 8,192 (2^13). The default is 64. As in KataGo, the
     visits count the tree that the bot keeps from its last search (the engine repository's v2 design 22): every move
     ends with a tree of about the same size (item 14: a few visits more on the threaded bot, fewer when the bot is
     far ahead), and the second edge of the bot's turn needs fewer new visits. The levels count them so.
     - **A slider and a box:** the slider steps by doublings, 14 stops from 1 to 8,192, as the engine settings' depth
       does (design 09). The box beside it shows the visits and takes any whole number in the range. The slider sets a
       doubling. A typed number sets the visits when the player leaves the box or presses Enter, as in the engine
       settings. The slider then shows the doubling at or below it: 3,000 visits show at 2,048. The engine settings
       show the doubling nearest by ratio (4,096).
     - **A number that the bot does not take:** outside the range, or not whole. The box keeps it and says the range,
       and the visits stay as they were. No side starts a game until the number changes.
     - **The top, 8,192:** a move takes about 8 times as long as at 1,024 visits. The page shows the bot's time
       (item 6), so a player sees when the machine is too slow for the visits set.
   - **Variety,** the move temperature: how often the bot plays a move other than its best. KataGo's temperatures, by
     the move: a temperature at the game's start, halved every 19 edges, down to a floor.

     | Variety | At the start | The floor |
     |---|---|---|
     | Low (the default) | 0.5 | 0.10 |
     | Medium | 0.8 | 0.3 |
     | High | 1.0 | 0.6 |

     Low is KataGo's own default. Medium and High are the site's, to check against games once levels are measured.
   - **The komi,** a starting score: points that one side has before the first move. The engine counts it so (the
     engine repository's `games/enclosure/docs/design/09-komi-and-lead.md`): Red receiving a komi K starts K points
     ahead, and a negative K favours Blue. The default is 0, the game played online. One setting, with no handicap
     presets and no levels (below, "Why").
     - **From the player's side:** the card sets the points that the player starts ahead, and a number below 0 gives
       them to the bot, whatever colour each side plays. The help line under the setting says it so: "You start 300
       points ahead", "HedgeFund starts 300 points ahead", and at 0 "Neither side starts ahead, as in a game online".
       The side can be Random, so the card cannot name Blue or Red. When the game starts, its side turns the choice
       into the engine's komi: K = N when the player is Red, and K = −N when the player is Blue. The game, its record
       and the stored game keep K, with its sign.
     - **A slider and a box,** as the visits have: the slider steps by 50 points from −3,000 to 3,000 (121 stops, 0 in
       the middle), and the box takes any whole number in that range. The slider's ends name whose head start each is:
       "HedgeFund ahead" on the left, "You ahead" on the right. A typed number sets the komi when the player
       leaves the box or presses Enter. The slider then shows the stop nearest to it. A number outside the range, or
       not whole, stays in the box with the range, and no side starts a game until it changes, as for the visits.
     - **Whole points:** Enclosure's areas are exact rationals (the engine counts the faces of the edges, whose corners
       include the points where edges cross), so a margin can be any number, at any komi. A half point does not keep a
       game from ending level here, as it does in Go, where every score is whole. A game with a komi can end level, as
       a game at 0 can: its result is `0`.
     - **During the game,** each player's points include their starting points, from the first position: the cards,
       the points bar, the result and the player's outcome count the komi. The side column's first line, with the
       bot's settings, says who started ahead and by how much.
     - **The bot** gets GTP's `komi K` before its first move, after its other settings. It keeps the komi through
       `clear_board` and a set-up start (`enclosure-set-position`): KataGo keeps its rules, the komi in them, across
       both. A game at komi 0 sends no `komi` and its record has no `Komi` tag, so it plays and records as before the
       setting.
     - **A game kept from an earlier visit** goes on with its komi. A game kept before the setting has none: 0. A
       stored game (design 25) keeps it.
     - **A record brought to Practice** (item 4) brings its moves and its start, not its komi: the card's komi
       applies, and the card shows it before the game starts.
     - **Cyanotype's Practice** (design 33) has the same setting, through the shared card, with the same range and
       step (below, "Why").
3. **Before the game, one card,** "Practice against bot", as Lichess's "Play with the computer": the bot's settings,
   the player's name, then the side, which starts the game. The heading does not name the bot: the network's choice
   does. The sides are Blue, Random and Red, each with its dot (Random half Blue, half
   Red), as Lichess offers black, random and white, with Random in the middle and larger. Blue plays first.
4. **The start:** the standard start or a set-up start, and a record's moves from it, brought in as other pages
   take them (`/practice#position=…&record=…`, design 22). The Analysis board's Play button, beside New, opens
   Practice at the position on screen, as Lichess's "Continue from here" plays the computer from a position: the
   board's set-up start when it has one, and the moves from the start to the position on screen. It is not in the New
   menu: New makes a new board.
   - **Practice refuses a record of other rules** (its `Rules` tag), in its own words (`variantProblem` in
     `src/lib/game/import.ts`): "Practice cannot start from this record: This game uses other rules (X). Practice
     plays games of the online rules only." The bot plays the online rules only. A set-up start is no refusal.
   - **The bot from a set-up start:** `enclosure-set-position` (the bot's interface 0.1.1, request 20), before the
     record's moves. The bot refuses a position that no game reaches, as the position check does.
   - **The record's edges are the game's start:** a takeback stops at them, as they were not played against the bot.
     The kept game counts them, and the stored game will too (design 25).
   - **The record and the move list number the turns from the start's own** (the engine repository's design 04,
     "The turns after a set-up start"): `51...` when the start is at a turn's second edge.
5. **During the game, the review's layout and parts** (design 06): the review's row above the board, with the
   players' names, scores and areas and the bar centred on the board, the board as large as the window lets it be,
   with the player's notes on it (design 07, kept for each position while the page is open, as in the review), and a
   side column of Lichess's width (250 to 350 pixels). The side column has the bot's settings and where it runs, whose
   turn it is, the review's move list (its spacing, its columns of edges and its outlines), and the review's bar
   under it (`StepBar`): the steps through the positions on the left, and the game's actions (Take back, Abort, Resign)
   and the display settings' button on the right, which go under the steps as a group when the column is too narrow
   for one row, the steps then spanning the column (design 06). While the bot starts, a skeleton of the same layout:
   the cards with the players' names (the review's `PlayerCardSkeleton`), the empty board's points, bars for the
   moves of a kept game, and the bar with its actions off. Before the page's code runs, the page shows nothing: it
   cannot know whether the card or a game comes. The game's own state only: no evaluation, no engine lines and no
   labels, as on Lichess. The display settings are the review's where they apply: the regions, the invincible edges and
   the move sounds. The cards are the review's, two lines each. The bot's settings are in the side column's first line,
   and after them a komi from the player's side ("You start 300 points ahead.").
6. **The bot's time, not its visits:** while the bot searches, the line says so, with the seconds so far, and then how
   long its last turn took. GTP's `genmove` answers only with the move, so the page cannot show the visits so far. The
   time tells the player whether the machine copes with the visits set.
7. **Take back, and looking back:**
   - **Take back,** on the player's turn, by turn: the bot's turn after the player's last turn, then that turn whole,
     as Lichess undoes the player's move and the reply. Halfway through the player's turn, the one edge played.
   - **Looking back:** the steps, the move list and the arrow keys show any earlier position, and the board takes
     moves only at the latest one.
8. **Take back, Abort and Resign,** with icons, each named in its tooltip ("Takeback", "Abort", "Resign"). Abort and
   Resign are red under the pointer and confirmed first, with a red button. No New game button during the game:
   - **Abort,** at any time: the game ends with no result, and goes into Your games as unfinished (`*`) when it has
     moves, so that it can still be reviewed. This departs from Lichess, which offers Abort only before the first
     move: a game here has no clock and no enemy who waits, and an aborted game can still teach in its review.
   - **Resign,** at any time, also while the bot searches: HedgeFund wins (`r+R` or `b+R`, as the meaf.us reader writes
     a resignation, with the tag `Termination "resignation"`).
   - **At the end** (the rules', or a resignation): the result, Review the game, and New game, which returns to the
     card.
9. **The game in progress:** one in each browser, kept as the player leaves it, and resumed on the next visit, as the
   Analysis board keeps its one board. A game has no clock, so it can last days. A record brought in asks first, and
   the game in progress then goes into Your games as unfinished. The page shows nothing until it knows whether a game
   is in progress, so that the card does not show for a moment before the game.
10. **A game that ends goes into Your games** in the Review tab, kept at once, and its review is one click away.
    Lichess keeps every game against the computer in the player's history. A game from a set-up start opens on the
    Analysis board ("Analyze the game"), from Practice and from Your games, as the Review tab reviews games from the
    standard start only. Its id in Your games covers its start with its moves.
11. **The record names both sides.** The player's side has the name that the player sets on the card, kept in this
    browser, and "You" without one. The bot's side is "HedgeFund 0.2 Lite, 64 visits, Low variety", for example. The
    record also gives the event (Practice), and the bot in full: the network's id, the visits, the variety, and the
    engine's build, from the bot's own report (`enclosure-bot-info`). A game with a komi has the tag `Komi`, the
    engine's K: `[Komi "300"]` when Red started 300 points ahead, `[Komi "-300"]` when Blue did. Its result counts
    the komi (`r+120` when Red won by 120 points with them). Every reader of records reads the tag (item 15, and the
    notation page, design 11).
12. **The points bar,** in Practice's display settings, as switches. The scores and the areas show as numbers in any
    case, as in the review. No chart: the bar is enough, and a chart under the board would change the board's size,
    and with it the side column's, each time it is turned on or off.
    - **The points bar** (on by default): each player's share of the points so far, drawn as the review's win chance.
      While it is on, two more settings: its direction, horizontal above the board (the default) or vertical beside
      it, and the area.
    - **The area** (off by default): a second, thinner lane, each player's area against their own score, under their
      own part of the bar. With a score of 300 and an area of 50, Blue's lane is a sixth of Blue's part. A player with
      an area and no score yet has a full lane. The share falls as the score grows, so the lane is long early and short
      late.
13. **A game across a release:** the kept game holds its moves and its settings, not the bot's state. A new build
    continues it from its moves alone (`clear_board`, then `play` for each edge), as the engine repository checked.
    Only the bot's tree is lost. The record notes the build that continued it.
14. **Where the bot runs:** in the page's own workers, with the engine settings' workers and GPU (design 09): on the
    GPU when the GPU setting allows it, else on the CPU workers, both through the threaded bot. A browser without JSPI
    plays the one-thread bot. The board's rules (the legal edges, the positions) come from the analysis module's
    rules worker, as on the Analysis board.
    - **The threads:** 16 search threads on the GPU, and two for each CPU worker. They are the most that a move
      uses. KataGo's play settings give each thread at least 8 of a move's new playouts (`minPlayoutsPerThread`,
      KataGo's default for GTP). So a move with N new playouts searches with T threads: N / 8, rounded down, at least
      one and at most the form's threads. A move with fewer than 16 new playouts searches with one thread. No config
      of ours sets the value. So each engine update checks it: `npm run engine` starts each practice module of the
      lock in Node, and stops when one gives another value (`packages/engine/src/practice-check.ts`).
    - **The visits that a move completes:** a thread checks the completed playouts against the setting before it
      starts a playout, and the playouts in flight then finish. So from a new tree, a move at a setting of N
      completes at most N + T - 1 visits. Below 16 visits it completes at most N, as the one-thread bot does. From 16
      visits, it completes less than an eighth more: at most 71 at 64 visits. A move that keeps a tree from the last
      search has fewer new playouts, and so fewer threads. The setting is KataGo's `maxVisits`, and the record and the
      board name it so ("64 visits").
    - **Fewer visits when far ahead:** on every form, KataGo's play settings scale the setting down to as little as
      0.4 once the bot's last three searches each gave a win-loss value above 0.95 (`searchFactorWhenWinning`, the
      engine repository's v2 design 18).
15. **A game with a komi, after Practice:** the record's `Komi` tag is the game's komi wherever a record goes. A
    record with no tag has komi 0, so every record before the setting reads as it did.
    - **The readers:** the review, the import (a pasted record, a partner's link, a review file, a shared review), Your
      games and the Analysis board read the tag. A `Komi` tag that is not a number of whole or half points is an
      error in the record, as a wrong turn number is: no reader takes the game at a komi that it did not read.
    - **Each game's limit:** a komi beyond what the game's engine takes is an error in the record too, and its message
      names the limit. Enclosure's engine takes up to 5,052 points either way, its score target cap (the engine
      repository's `Rules::MAX_USER_KOMI`). Blueprints' engine takes up to 90,980 points (its board's area and KataGo's
      margin, at its score scale). The engine repository's design 04 gives the tag no limit. Without the site's check,
      a larger komi fails at the engine, with the engine's own message. The card's range stays ±3,000 (item 2). A
      board's link and an analysis file beyond the limit do not open either. Their message is the record's, and the
      file's results do not go to the store. A board kept in the browser beyond the limit (kept from a link before
      the link's check) does not open: a new board opens, with the record's message as a notice, as Cyanotype opens a
      new board for a kept board that it cannot open (design 33). Each Notation page's Komi row states the limit.
    - **The limit is a copy:** each site's record copies its engine's cap. A release that moves the cap would make
      the site refuse a komi that the engine takes, or pass one that it refuses. So each engine update checks it.
      `npm run engine` sends each practice module GTP's `komi` at the site's limit either way, and at half a point
      past it. KataGo's `komi` refuses a komi past the cap with "unacceptable komi". The step stops when the module
      refuses the limit, or does not give that refusal half a point past it.
    - **The game's id** in Your games covers its komi with its start and its moves: the same moves at another komi
      are another game, with its own review.
    - **The review searches at the record's komi,** as KataGo's analysis takes a query's komi: each search's query
      has the field `komi` (the engine repository's design 04), so the win chance, the lead and the quality labels
      are the engine's at that komi. The game's end counts the komi too: its value is the result with the komi, and
      the players' points include their starting points, as in Practice.
    - **The stored results' keys hold a nonzero komi** (`komi=300` before the moves, after a set-up start's mark), as
      the engine's own cache keeps evaluations at another komi apart. A review at a komi never reads a result stored
      at 0, nor the reverse. A game at komi 0 keeps the keys that it had.
    - **Nothing from the opening book at a komi but the Book tab.** The opening book (design 32) is the engine's search
      at komi 0: its values, its position symbols and its book moves are true at komi 0 only. At another komi the
      game is a different game from the first move. The fixture game kept with the player Blue 400 points ahead shows
      it: at the start the engine gives Blue 99.3% (50.4% at komi 0), and the book still said "Blue is slightly
      better" at its end. So the review of a game at a komi takes nothing from the book:
      - No book values. The review searches the book's positions as any other.
      - No Opening section in the Report. It does not say where the game left the book, nor give the book's verdict.
        It has no trap row.
      - No book marks in the move list. A book move is a move that the book's search at komi 0 lists.
      - No display setting "Book moves". The setting shows only where the game has a book opening, so that it never
        shows where no book mark can show: a site with no book, a book that did not load, the board, a komi.
      The Book tab stays, for the player who wants the book's moves. Under its title row, one line says that the book
      moves and their values are the engine's at komi 0. At komi 0 the review takes the book as before.
    - **The exports keep the tag,** and each one opens back at the komi (design 13). The review file holds the record
      and the results at its komi. A result at another komi does not belong in it: a start at a komi is no move from
      the start at komi 0. The shared review holds the record's tags, and the annotated record writes them. Both sites'
      game ids cover the komi. The Analysis board keeps a board's komi with the board, in its link (the `Komi` tag, as
      a record has it) and in its analysis file (the board's `komi`, whole or half points). Its Play button opens
      Practice with the moves, and the card's komi applies (item 2).
    - **Openings is the book at komi 0** (design 32). A record brought there with a komi opens its line, and one line
      says that the book is at komi 0 and that Openings does not use the record's komi. "Study in Openings" from a
      game at a komi brings its komi with its moves, so the same line shows. From the start it brings no record, and no
      komi. The book stays at komi 0 there.
    - **Cyanotype's Analysis board takes no komi yet** (design 33, a gap from Hedge School). Its analysis searches at
      komi 0, so it would search a board at a komi at komi 0. It refuses a record, a link or an analysis file with a
      komi, and says why. A record goes to the review instead, which searches at its komi.

## Why

- **The bot plays as HedgeFund plays:** the GTP engine with its play settings, not the analysis module's `chooseMove`,
  whose root noise and new tree for each query are not the bot's play (request 15).
- **8,192 visits at the most:** a search's time grows about in line with its visits. From the speeds above, a move at
  8,192 visits takes about 10 s on the GPU, 27 s on 4 CPU workers and 1.3 minutes on one thread. A game of 48 bot
  moves then takes about 8 minutes, 21 minutes and an hour. In a browser on a loaded machine, on 4 CPU workers, a move
  searched from no tree took 39 s with HedgeFund 0.1 Lite and 2.3 minutes with HedgeFund 0.1. The second edge of the
  bot's turn took less than a second (decisions/product.md, "Practice: up to 8,192 visits, and any number").
- **Any number of visits, and the doubling at or below it on the slider:** a player can set a number between two
  doublings. The slider never shows more visits than the bot searches. It shows the doubling by which the levels can
  group the game.
- **The threaded bot at every setting:** it keeps to its setting below 16 visits. From 16 visits it passes the
  setting by less than an eighth (item 14). By ratio, that is about a sixth of the slider's step, a doubling. The cap
  on its threads is KataGo's own (decisions/product.md, "Practice: the threaded bot's visits at each setting", with
  the measurement).
- **Settings named for what they are,** until levels rest on results. A level guessed now could be far off, and a
  player could not tell.
- **Fixed settings make a record that one line describes,** and games by setting that the levels can later count.
- **Kept games lose no work:** a game without a clock is easy to lose to a closed tab, and an unfinished game can
  still teach in its review.
- **Lichess's choices** for the card, the side, the takeback, the lack of evaluation and the game's place in the
  history, where nothing in Enclosure argues for another way. Abort at any time is the one departure (item 8).
- **The review's layout and parts** (the players' row, the display settings): one look across the site, and less to
  keep.
- **The komi as one setting:** the engine repository's handicap design (its `docs/design/05-handicap.md`) keeps komi as
  the finest step of a handicap, and the engine reads it now. Its extra edges and starting structures wait for its
  handicap lab, which measures what each is worth. Presets or levels now would be guesses of what a step is worth.
- **The komi's range, ±3,000 points,** from what the network reads and what games need (the engine repository's
  `games/enclosure/docs/decisions/komi.md`):
  - Self-play trains komi out to ±3,000 points: 10% of its games draw a komi with a spread of 1,000 points.
  - The lead is the even komi up to 500 points. Above 500 points the network reads a komi short before the game's last
    30 edges: with a lead of 1,000 to 5,000 points given as komi, the side ahead still wins 95% (the reading at row
    18.03M). Its expected margin reads 90 to 105% of a komi of ±500, 95 to 99% of ±1,000 and 96 to 101% of ±2,500.
  - Games against the bots need more than 500 points: on meaf.us, the margins of our bots against people had a median
    of 773 points and a 90th percentile of 2,546 ("Komi: our answers on the design").
  - So the range keeps the larger komis that a player can need, and the bot plays them with a short reading: when it
    gives a komi above 500 points, it takes itself to be further ahead than it is early in the game. The game's
    result always counts the komi in full: the rules add it.
- **Steps of 50 points on the slider,** the site's own: a unit square enclosed early is worth about 61 points over a
  game (the handicap design), so a step is about the smallest gain a player can picture. The box takes any whole
  number for a finer komi.
- **The komi from the player's side,** a departure from KaTrain and OGS: they set the komi for White, Go's second
  player, as Go's komi pays White for Black's first move. Enclosure's fair komi is about 0 (Blue's mean margin in
  self-play is +2.6 ± 8.2 points), so a komi here is a head start for one side, and a player chooses whom it favours.
  The record keeps the engine's form, Red's komi, as KataGo's GTP and analysis take it.
- **Whole points,** against Go's half points (its usual komi is 6.5 or 7.5): KataGo takes a whole or a half
  point (`Rules::komiIsIntOrHalfInt`, in its `komi` command and the rules it reads). A half point keeps Go's games from
  ending level because Go's scores are whole. Enclosure's are not, so a half point would add a digit and change
  nothing.
- **The same range and step for Blueprints** (Cyanotype, design 33), from the engine repository's
  `games/blueprints/README.md`, "Komi": Stamp Duty's run gives every self-play game a komi, out to ±3,000 points (5% of
  games at a spread of 1,000), and the sweep of bpj2's network (`games/blueprints/docs/decisions/port.md`, 2026-10-26)
  found its win chance rising with the komi in each of 178 positions from −3,000 to +3,000, its expected margin moving
  0.8 to 1.25 times the komi. People's margins in Blueprints are of the same size as Enclosure's: a median of 409
  points and a 90th percentile of 2,060. Blueprints' scores are whole points, so a half point there would rule out a
  draw, which the real game has (12 of the site's 737 finished games). Whole points keep draws as at komi 0. The
  network that Cyanotype ships has no komi sweep of its own yet (abscls-49tz, put off with Blueprints' engine work).

## Alternatives

- **Named levels now** (Beginner to Strong): easier for a newcomer, but guessed. They wait for the visit ladder.
- **One strength slider** (visits alone): simpler, with the network and the variety fixed. The three settings cost
  little more, and a player who knows the engine wants them.
- **Visits by doublings only** (1 to 1,024 at first): each game at one of a few settings, which the levels count with
  no grouping. But a player cannot set a number between two doublings, and the levels can group the typed numbers.
- **A higher top,** such as 131,072 (2^17): about 7 minutes a move on 4 CPU workers and 6 hours a game, from the
  speeds above. Too slow for a game in one sitting, and not measured in a browser.
- **The one-thread bot at every setting:** it never passes its setting. But it evaluates the network one position at
  a time, so it is slower (the speeds above).
- **A search that counts its playouts in flight against `maxVisits`:** no form would pass its setting. But it departs
  from KataGo, which lets its threads pass `maxVisits` so, and it is the engine repository's work.
- **The engine settings' box** (design 09): a number outside the range becomes the range's nearest end, with no
  message. But the bot then plays a whole game at visits that the player did not type.
- **Settings that change during the game:** more freedom, but a record that needs a note at each change, and games
  that the levels' data cannot use.
- **Several games in progress,** as Lichess's correspondence games: more to build, for a use nobody asked for.
- **The analysis module's `chooseMove`:** no new download, but not HedgeFund's play.
- **The komi in the engine's form on the card** (Red's points, as KataGo's and OGS's komi is White's): one number,
  the record's. But the side can be Random, and a player thinks of a head start for themselves or for the bot.
- **The komi apart from the points** ("+300" beside Red's points, the rules' points alone): the rules' own numbers.
  But the engine counts the komi as a starting score, and the bar and the lead then read differently from the result.
- **A range of ±500 points,** where the network reads a komi in full: too small a head start for most players against
  HedgeFund.

## Consequences

- **The download:** the practice bot's module, about 1.4 MB, and for the CPU workers the evaluator, about 0.6 MB.
  The networks and the GPU's graph are the review's own files, which the browser keeps.
- **The levels need data:** the engine repository's visit ladder on the module, then games by setting.
- **The levels group typed numbers:** a game can have any number of visits from 1 to 8,192. The visit ladder and the
  games by setting must group them, by the doubling at or below them for example.
- **A setting of 16 visits or more searches a little more on the threaded bot:** less than an eighth more visits a
  move than on the one-thread bot (item 14). The games by setting mix the two forms, unless the levels count them
  apart: the analytics give each game's form (`bot_form`, design 17).
- **The site's own temperatures** (Medium and High) are a guess until games show what they do.
- **A game with a komi is not an even game:** the levels must count its komi, or leave it out. The stored game holds
  it (design 25).
- **Results at a komi are their own:** a review at a komi searches every position again, though the same moves at 0
  were reviewed. It takes nothing from the opening book but the Book tab.

## Where it is

- **The page:** `src/routes/practice/+page.svelte`: the card, then the game: the players' row, the board, the move
  list, the steps, Abort, Resign and the display settings.
- **The review's parts it shares:** the players' row (`packages/review/src/PlayerRow.svelte`, `PlayerCard.svelte`),
  the win bar and gauge (`packages/review/src/ShareBar.svelte`), the move list's look
  (`packages/review/src/moveList.ts`, and Enclosure's width of a move, `MOVE_TEXT` in `src/lib/review/enclosure.ts`),
  the controls' icons (`packages/site/src/Icon.svelte`), and the settings' rows and the sound settings
  (`packages/site/src/SettingChoice.svelte`, `SettingToggle.svelte`, and `src/lib/ui/SoundSettings.svelte`).
- **The game:** `src/lib/practice/game.svelte.ts`: the moves to the bot and to the rules worker, the bot's time,
  Abort, Resign, the end and the save into Your games.
- **The bot,** in `@abstractclass/practice` (design 29), for both sites: `packages/practice/src/botForms.ts` (the
  form to start, with a fall back to the next, and where each form runs for the line under the board) and
  `botFormsWorker.ts` (the threaded bot's evaluators in the bot's worker, with ONNX Runtime set up as the GPU worker
  sets it up, `packages/engine/src/ort.ts`, and the network's sizes of the manifest), `bot.ts` (the bot in one form,
  sent GTP commands one at a time), `botWorker.ts` (the bot in its worker, `serveBot`) and `botMessages.ts`. The page
  gives the game's name in the bot's commands (`enclosure`).
- **The pure parts:** the shared part in `packages/practice/src/practice.ts` (`@abstractclass/practice`, design 29): the
  visits and the variety, the choices and the kept game under each site's key, the GTP commands with each site's
  half-life, the takeback's reach, the results and the outcome, and the way in from a position (`practiceHref`, the
  card's line `broughtLine`, the new game `newPractice`, and its `practice_from`, `practiceFrom`). Hedge School's part
  in `src/lib/practice/hedgefund.ts`: its keys (the kept game `hedge-school:practice-game:1` and the choices
  `hedge-school:practice-choices:1`, in the browser's local storage), its networks, the bot's half-life, the turns after
  a set-up start, the analytics' parameters and the record. Tests: `practice.test.ts` here, and the package's own on a
  game of words. The score's display settings are kept under `hedge-school:practice-display:2`.
- **The card and the frame:** `packages/practice/src/PracticeCard.svelte` (the settings card) and
  `PracticeFrame.svelte` (the game's layout: the row, the square board, the side column and the step bar), which
  Cyanotype's practice shares (design 33). The page gives their content. `ReplaceGame.svelte`: the question when a
  start comes while a game is in progress, with each site's words.
- **The files:** the release's practice files in `engine.lock.json`, which `npm run engine`
  (`packages/engine/src/fetch-engine.mjs`) puts in `static/engine/engine-54486cd-lib/` and the bot's module folders.
- **The ways in:** the header, the sitemap, and the Analysis board's Play button (`src/routes/analysis/+page.svelte`).
- **The komi:** its range, the choice, the kept game's field, the turn between the player's side and Red's
  (`komiSide`), its words (`komiHelp`, `komiLine`) and the GTP command in `packages/practice/src/practice.ts`, its
  control in `PracticeCard.svelte`. The scores with it: `withKomi` (`packages/analysis/src/game.ts`), in the practice
  game and in `GameAnalysis`. The tag: `komiOf`, `startTags` and `withTags` (`packages/record/src/record.ts`). The
  reader checks the tag and gives the record's `komi`. The review: `GameAnalysis`'s option `komi`
  (`packages/analysis/src/analysis.svelte.ts`: the searches' queries, the keys, the positions, no book), and the keys'
  word `komi=K` (`keyMoves`, `lineKeyMoves`, `snapshotPositions` and `parentKeyMoves` in
  `packages/analysis/src/cache.ts`). The opening book at a komi: the review's view asks the book's parts for the
  game's opening only where the analysis takes the book (`packages/review/src/ReviewView.svelte`, `takesBook`). The
  game's `book.opening` is `reviewOpening` (`src/lib/book/game.ts`). The view gives the game's komi to `book.place`.
  `giveBook` (`src/lib/book/reviewBook.ts`) gives no values and opens no part of the book at a komi. The annotated
  record from Your games makes no book at a komi (`src/lib/review/exportText.ts`). The Book tab's line is in
  `src/lib/book/ReviewBookTable.svelte` (`BookPlace`'s `komi`). Openings' line on a record's komi is in
  `src/routes/openings/+page.svelte`, and "Study in Openings" gives
  the komi in `src/lib/book/place.svelte.ts` (`study`). Each game's limit is its record's `MAX_RECORD_KOMI`
  (`src/lib/game/record.ts`, Cyanotype's `apps/cyanotype/src/lib/game/record.ts`), the shared reader's `maxKomi`.
  A board's link and an analysis file take it too (`readBoardLink` in `packages/analysis/src/boardLink.ts`,
  `readAnalysisFile` in `files.ts`), and so does the Analysis board's kept board (`keptKomiProblem` in `kept.ts`,
  in `chooseBoard` of `src/routes/analysis/+page.svelte`). Their words are the record's (`komiLimitProblem` in
  `packages/record/src/record.ts`). The Notation page's Komi row states the limit. The engine step checks the limit
  against each practice module's GTP `komi` (`checkKomiCap` in `packages/engine/src/practice-check.ts`). Each site
  gives the step its limit (its `scripts/engine.mjs`). The analysis modules share the practice modules' cap, because
  the step takes every engine module of the lock from one engine commit (design 03, "The engine's artifacts"). A site
  with no practice modules has no cap checked, and the step says so.
  The komi is in the game's id (`src/lib/game/store.ts`, `gameId`, and Cyanotype's
  `apps/cyanotype/src/lib/game/store.ts`, with `komiPrefix`), in the keys of the review file and of the removal
  of earlier results (`reviewFile.ts` and `earlierResults.ts`, with `positionKeys` in
  `packages/analysis/src/kept.ts`, and the results that belong in a file, `packages/analysis/src/files.ts`), and in
  the Analysis board's link and file (`packages/analysis/src/boardLink.ts`, `files.ts` and `kept.ts`). Whether an
  analysis takes the book is `GameAnalysis.takesBook`. Cyanotype's board refuses a komi in
  `apps/cyanotype/src/lib/game/board.ts` (`refuseKomi`), also for a kept board (its
  `apps/cyanotype/src/routes/analysis/+page.svelte`), and its practice game's result at a komi is `endResult`
  (`apps/cyanotype/src/lib/practice/stampduty.ts`). Tests: the packages' `record.test.ts`, `practice.test.ts`,
  `analysis.test.ts` ("a review at a komi …", "a komi game's end and labels follow the komi"), `share.test.ts` ("a
  board's link keeps its komi …") and `files.test.ts` ("a komi's start does not belong to a game at komi 0", the
  analysis file at a komi). Here: `practice.test.ts`, `stored.test.ts`, `store.test.ts`, `reviewFile.test.ts`,
  `analysisFile.test.ts`, `board.test.ts`, the book's `game.test.ts` ("the review of a game at a komi takes nothing
  from the book …") and `reviewBook.test.ts`. Cyanotype's: `store.test.ts`, `import.test.ts`, `board.test.ts`,
  `analysisFile.test.ts` and `stampduty.engine.test.ts` (the result at a game's end). In the browser:
  `tests/practice-komi.spec.ts` (the
  card, a game at a komi, its review, the opening book at a komi, also in a reviewed game whose moves have their
  labels, and the Analysis board's record and analysis file out and back in), `tests/openings.spec.ts` (a record with
  a komi) and Cyanotype's in `tests/cyanotype-practice.spec.ts`.

## Log entries

- [decisions/product.md](../decisions/product.md): "Practice designed" (2026-10-14).
- [decisions/product.md](../decisions/product.md): "Practice built" (2026-10-14).
- [decisions/product.md](../decisions/product.md): "Practice: up to 8,192 visits, and any number" (2026-10-17).
- [decisions/product.md](../decisions/product.md): "Practice: the threaded bot's visits at each setting"
  (2026-11-07).
- [requests/15-practice-bot.md](../requests/15-practice-bot.md): the bot, as the engine repository delivered it.
- [requests/20-practice-set-up-start.md](../requests/20-practice-set-up-start.md): the bot from a set-up start.
- [decisions/product.md](../decisions/product.md): "Practice: the komi, a fourth setting" (2026-11-06).
- [requests/27-komi-tag.md](../requests/27-komi-tag.md): the record's `Komi` tag, for the engine repository's design
  04.
- [decisions/product.md](../decisions/product.md): "The komi's follow-ups: shared helpers, Study in Openings, each
  game's limit" (2026-11-07).
