# Practice: a game against HedgeFund in the browser

**Status:** in force, built. **Decided:** 2026-10-14. The visits to 8,192, and any number of them: 2026-10-17.

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
2. **The bot's settings,** chosen before the game and fixed for it, as Lichess fixes the computer's level. Levels come
   later, from the engine repository's visit ladder and from games by setting.
   - **The network:** HedgeFund 0.2 Lite (the default) or HedgeFund 0.2. A game kept from an earlier visit goes on
     with its own network, also an earlier one that the list no longer offers (HedgeFund 0.1 Lite, HedgeFund 0.1): the
     site still ships them (design 09). A saved choice of an earlier network takes the default.
   - **The visits for each move:** any whole number from 1 to 8,192 (2^13). The default is 64. As in KataGo, the
     visits count the tree that the bot keeps from its last search (the engine repository's v2 design 22): every move
     ends with a tree of the same size, and the second edge of the bot's turn needs fewer new visits. The levels count
     them so.
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
3. **Before the game, one card,** "Practice against bot", as Lichess's "Play with the computer": the bot's settings,
   the player's name, then the side, which starts the game. The heading does not name the bot: the network's choice
   does. The sides are Blue, Random and Red, each with its dot (Random half Blue, half
   Red), as Lichess offers black, random and white, with Random in the middle and larger. Blue plays first.
4. **The start:** the standard start or a set-up start, and a record's moves from it, brought in as other pages
   take them (`/practice#position=…&record=…`, design 22). The Analysis board's Play button, beside New, opens
   Practice at the position on screen, as Lichess's "Continue from here" plays the computer from a position: the
   board's set-up start when it has one, and the moves from the start to the position on screen. It is not in the New
   menu: New makes a new board.
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
   the move sounds. The cards are the review's, two lines each. The bot's settings are in the side column's first line.
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
    engine's build, from the bot's own report (`enclosure-bot-info`).
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
- **Settings named for what they are,** until levels rest on results. A level guessed now could be far off, and a
  player could not tell.
- **Fixed settings make a record that one line describes,** and games by setting that the levels can later count.
- **Kept games lose no work:** a game without a clock is easy to lose to a closed tab, and an unfinished game can
  still teach in its review.
- **Lichess's choices** for the card, the side, the takeback, the lack of evaluation and the game's place in the
  history, where nothing in Enclosure argues for another way. Abort at any time is the one departure (item 8).
- **The review's layout and parts** (the players' row, the display settings): one look across the site, and less to
  keep.

## Alternatives

- **Named levels now** (Beginner to Strong): easier for a newcomer, but guessed. They wait for the visit ladder.
- **One strength slider** (visits alone): simpler, with the network and the variety fixed. The three settings cost
  little more, and a player who knows the engine wants them.
- **Visits by doublings only** (1 to 1,024 at first): each game at one of a few settings, which the levels count with
  no grouping. But a player cannot set a number between two doublings, and the levels can group the typed numbers.
- **A higher top,** such as 131,072 (2^17): about 7 minutes a move on 4 CPU workers and 6 hours a game, from the
  speeds above. Too slow for a game in one sitting, and not measured in a browser.
- **The engine settings' box** (design 09): a number outside the range becomes the range's nearest end, with no
  message. But the bot then plays a whole game at visits that the player did not type.
- **Settings that change during the game:** more freedom, but a record that needs a note at each change, and games
  that the levels' data cannot use.
- **Several games in progress,** as Lichess's correspondence games: more to build, for a use nobody asked for.
- **The analysis module's `chooseMove`:** no new download, but not HedgeFund's play.

## Consequences

- **The download:** the practice bot's module, about 1.4 MB, and for the CPU workers the evaluator, about 0.6 MB.
  The networks and the GPU's graph are the review's own files, which the browser keeps.
- **The levels need data:** the engine repository's visit ladder on the module, then games by setting.
- **The levels group typed numbers:** a game can have any number of visits from 1 to 8,192. The visit ladder and the
  games by setting must group them, by the doubling at or below them for example.
- **The site's own temperatures** (Medium and High) are a guess until games show what they do.

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
- **The bot:** `src/lib/practice/bot.ts` (the form to start, with a fall back to the next) and `botWorker.ts` (the
  bot in its worker, with ONNX Runtime set up as the GPU worker sets it up, `packages/engine/src/ort.ts`).
- **The pure parts:** `src/lib/practice/practice.ts`: the settings, the kept game (`hedge-school:practice-game:1`) and
  the choices (`hedge-school:practice-choices:1`) in the browser's local storage, the GTP commands, the results and
  the record. Tests: `practice.test.ts`. The score's display settings are kept under
  `hedge-school:practice-display:2`.
- **The files:** the release's practice files in `engine.lock.json`, which `scripts/fetch-engine.mjs` puts in
  `static/engine/engine-54486cd-lib/` and the bot's module folders.
- **The ways in:** the header, the sitemap, and the Analysis board's Play button (`src/routes/analysis/+page.svelte`).

## Log entries

- [decisions/product.md](../decisions/product.md): "Practice designed" (2026-10-14).
- [decisions/product.md](../decisions/product.md): "Practice built" (2026-10-14).
- [decisions/product.md](../decisions/product.md): "Practice: up to 8,192 visits, and any number" (2026-10-17).
- [requests/15-practice-bot.md](../requests/15-practice-bot.md): the bot, as the engine repository delivered it.
- [requests/20-practice-set-up-start.md](../requests/20-practice-set-up-start.md): the bot from a set-up start.
