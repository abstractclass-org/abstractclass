# Practice games against Stamp Duty: Blueprints' GTP bot in the browser

**Status:** done (engine repository commits `217be61f` and `70dfdc0f`, the build `engine-70dfdc0f` on this machine),
checked here: Drawing Board's practice page plays whole games against the bot (design 33).
**Asked:** 2026-10-30.

## What Drawing Board builds

Drawing Board adds a practice page: a game of Blueprints against Stamp Duty in the player's browser, as Hedge School's
Practice (its design 24, request 15). No server and no clock: the bot searches to a set number of visits.

## Why the analysis module does not serve

Blueprints' browser module (request 23) is the analysis engine. A move from it (`chooseMove`) is not Stamp Duty's
play, for the reasons of request 15:

- **The settings are the analysis settings.** The build adds root noise (`wideRootNoise = 0.04`) to
  `analysis_blueprints.cfg`, whose own value for play is 0. The network sees no moves before the root, by the
  analysis defaults.
- **Each query builds a new tree.** The engine repository's design 04 says that tree reuse across positions is not
  built. KataGo's GTP engine keeps its tree from move to move, and the second move of a turn then starts from the
  first move's subtree.

The engine repository's bots play through KataGo's GTP engine (its v2 design 18), and Hedge School's practice bot is
that bot in the browser (`enclosure-bot.wasm`, the engine repository's
`games/enclosure/docs/design/22-practice-bot.md`).

## What is needed

1. **Stamp Duty's play in the browser:** KataGo's GTP engine with Blueprints' play settings, as the native GTP engine
   plays (it reads `analysis_blueprints.cfg`, with no root noise), the tree kept from move to move, and the search of
   the root's views, as `genmove` searches them.
2. **The site's moves,** as in request 23: a placement `K@q,r` in the board's own coordinates, an edit `I:q,r>J:q,r`
   as one move, and `pass`, for the moves sent and the moves that the bot plays.
3. **The interface of Hedge School's practice bot,** where it fits, so that the site's bot code can serve both games:
   its commands, a move limited by visits and not by time, the network as a separate file, the move temperature and a
   seed, takebacks, no resignation, and a version. A start from a game's moves, for a reload of the page (design 25).
4. **The CPU first:** one search thread, in any browser. The batched and GPU forms can come later.
5. **The reply names the build, the network and the play settings,** so that the game's record can name its opponent.
6. **A build on this machine with its manifest,** as request 23's early build, with the strongest network that the
   training has. Practice plays the network, so a test network does not serve. Stamp Duty 0.1 (bpj2's
   b6c96-s3635840-d475170) is far weaker than bpj4's networks. A build that stays on this machine needs no release, so
   its manifest names the network by its own name. A release and its Stamp Duty number come later.

The variety of request 15 stays as the engine gives it: in a search of more views, `genmove` takes the best check,
with no temperature. Drawing Board accepts this.

## Done when

- The engine repository's documents give the bot's commands for Blueprints and how they differ from Enclosure's.
- A build with its manifest is on this machine.
- Drawing Board then plays whole games against the bot in headless Chromium, with each side to start: every move that
  the bot plays is legal, and a reload keeps the game.

## Delivered

The practice bot in engine repository commit `217be61f` (KataGame `edadf38e`). The engine repository's
`games/blueprints/README.md`, "The practice bot", gives its settings, its commands and how they differ from
Enclosure's.

- **The build:** `runs/wasm/blueprints/engine-70dfdc0f/` in the engine repository, with its manifest and no release:
  `blueprints-bot.wasm` (interface 0.1.1) with `practice_bot.mjs`, the engine module (protocol 0.7.1), and bpj4's
  network b6c96-s22323968-d845223, which the manifest names by its own name. bpj4's gauntlet rates it 2411 over 16
  games, above 2270 over 40 games for b6c96-s19117184-d446546, the network of the first build (`engine-217be61f`).
- **The play:** the native GTP engine's settings (`analysis_blueprints.cfg`, with no root noise), the tree kept from
  move to move, and the search of the root's views. Its moves equal the native `genmove` in 240 of 240 positions.
- **A reload:** `blueprints-set-game` starts a game from its moves, and `undo` takes these moves back as any others.
- **The bot's info** gives the build, the rules, the network (its name, SHA-256 and size) and the settings.
- **Every visit count from 1 to 8,192** gives a legal move (engine repository commit `70dfdc0f`, abscls-csmy,
  interface 0.1.1). With a cover of n views, a search of `maxVisits` 2n or less finds no candidate, and the search
  then gives the first pass's policy move. In the first build, `genmove` gave an error there.
