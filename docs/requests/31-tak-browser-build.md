# Takumi in the browser, before the trained network

**Status:** open. **Asked:** 2026-11-23. **Issues:** abscls-shfz.24 (the rules and the analysis module, items 1 to
8) and abscls-shfz.25 (the practice bot, item 9), both with the label `engines`.

## What Mistak builds

Mistak, the Tak site (design 34), has Hedge School's and Cyanotype's pages: the review, the Analysis board, the
import, the tools for playtak's pages and Practice. Its engine is Takumi. The engine repository plans Tak's engine in
its `games/tak/docs/design/` (01-port-plan.md first). Its rules come first (abscls-shfz.3), and its network trains
later, on the GPU (abscls-shfz.2). The site works in three stages (design 34, "Before the network"): with no engine,
with the engine's rules and a test network, and with a trained network. This request asks for what the second stage
needs, as request 23 asked for Blueprints' engine before its network. It also lists what comes later, so that the
engine repository can plan for it.

The port plan's follow-up tickets name the review page as the site's work, and design 09 ("Decision: play and
analysis", item 4) gives the analysis to the site. No ticket of the plan builds Tak's browser module or its practice
bot. Items 1 to 9 ask for that new work. Each item names the engine's design that it builds on.

## What is needed

### The rules and the analysis module (items 1 to 8)

1. **Early, with any network.** The rules first, in the module of the browser pipeline (`core/wasm/build_engine.sh`,
   as for `blueprints-engine.wasm`), with a test network: a random network, or the pilot's first network. With it, the
   site replays records, draws their positions, checks their moves and takes a player's moves while the network trains.
   A later release changes only the network. The rules are the engine's step 1 (abscls-shfz.3, design 02). The module
   needs the encoding part too (port plan step 4, abscls-shfz.11), KataGame's end of a game from the rules with the
   draw as its own class (abscls-shfz.7), and a protocol for Tak, as `blueprintsprotocol.cpp` is Blueprints'.
2. **PTN's moves, whole, in one spelling.** Every move that the engine takes or gives is one PTN string: the moves
   sent, the legal moves, the candidates, the moves of a line and the practice bot's moves. The spelling is the short
   form, the form to which ptn.ninja normalizes a move (the engine repository's `games/tak/docs/research/ptn-ninja.md`,
   5.6): no `F`, no count of 1, and no drops when all the stones go to the next square (`a1`, `Sb3`, `Cc4`, `c3>`,
   `3b2+12`). Design 02's `action_text` already writes PTN (`c3`, `Sb3`, `Cc4`, `3c3>12`). Please confirm that it
   writes this form, and document it with the protocol. The site's reader takes every spelling that ptn.ninja and
   playtak's export write, and sends the short form. A move in another spelling can be refused. The site stores its
   results by the move's string (design 29, item 2), so one move must have one string.
3. **The protocol that `packages/engine` speaks:** the protocol of the engine repository's
   `docs/design/04-notation-and-protocol.md`, 0.6.x as Hedge School's engine speaks it and 0.8.0 as Cyanotype's
   does: `query_version`, `load_model`, `describe`, `describe_game`, `play`, the analysis, `continue` and `terminate`,
   with the module's transport, the reproducible search and the search in slices. The shared package then changes only
   by the reply's new fields (items 6 and 7). A query carries:
   - The board's size: the position's TPS, or the standard start of a size (5x5 or 6x6).
   - The komi, a multiple of half a flat, added to Black's flat count, as the record's `Komi` tag gives it (design 02,
     "Komi").

   `query_version` gives the rules, the sizes, the opening (swap) and the komi that the release's network was trained
   on, so that the site refuses a game outside them (design 34, item 8). The rules name their draw rule, which is still
   an open decision in the engine repository (design 02 proposes playtak's 50-ply rule).
4. **The position's fields** that the site draws, from `describe` and for each position of `describe_game`:
   - Each square's stack, its stones from the bottom to the top, each with its colour and its kind (flat, wall,
     capstone).
   - Each player's stones and capstones left.
   - Each player's flats on top (the flat count).
   - The player to move and the ply's number.
   - Whether the game ends there, its winner or a draw, and how: a road, the flat count, a flat tie after komi or the
     50-ply rule. Design 06 ("Decision: the result", item 1) plans this member of the rules part.
   - For `describe` alone, the legal moves.
   - For each move of `describe_game`, whether it flattened a wall, so that the site checks a record's `*` mark
     (design 34, item 5).

   If it is free, please give the plies since the last placement or flattening too (the draw clock, which design 02's
   `position_text` writes after the TPS), so that the site shows how near the 50-ply rule is. The fields' names are the
   engine repository's choice. Mistak's board lab draws a position from these fields before the engine exists (design
   34, "Before the network"), and only the site's reader changes.
5. **A position's check** from a TPS, with its reasons, as protocol 0.5 (request 16) and protocol 0.8.0 (request 28)
   give it for Enclosure and Blueprints: `describe` gives `check`, and an analysis of a position that no game reaches
   is refused. The board editor, the Analysis board's Import and a link's start take any TPS, and a TPS can hold what
   no game reaches: more stones or capstones of a colour than the size gives a player, a wall or a capstone under
   another piece, or a first ply that breaks the swap opening. The engine repository chooses which positions it
   refuses and the reasons' words. Please document them.
6. **The draw chance** in each reply, for the root and for each candidate, beside the win chance (`winrate`), which
   counts a draw as half a win. Design 06 keeps the draw as its own class, and design 09 shows the win, the draw and
   the loss. The site shows the three. The field's name is the engine repository's choice.
7. **The flat margin as the reply's score, and the lead off.** Design 06 trains the score on flat endings only, and
   leaves the lead out. The site shows the score as the margin if the game ends by the flat count (design 09, item 4).
   Please document what the score means in a position where a road ends most games, and keep `scoreLead` out of
   `query_version`'s `trained`, as Blueprints' build did before its lead trained.
8. **The engine's name, Takumi, and the release:** `displayName` Takumi in the manifest, with a name for each
   released network (request 12), in a public release repository with its manifest (request 03) and the terms
   (requests 14, 21 and 29), as for HedgeFund and StampDuty. A first build with the test network can stay on this
   machine with its manifest, as request 23's did.

### The practice bot (item 9)

9. **The practice bot,** as request 15 gave Enclosure's and request 25 Blueprints': KataGo's GTP engine with Tak's play
   settings (`gtp_tak.cfg`, design 09's "one play path"), the tree kept from move to move, and the interface of the
   other games' practice bots, so that `packages/practice` serves Tak too. It needs:
   - Its forms: one search thread, and several threads (request 26), with the GPU later (item 10).
   - Its play settings: a move limited by visits, the move temperature and a seed, takebacks, no resignation, and a
     version.
   - The size (5x5 or 6x6) and the komi of each game.
   - A start from a TPS, as request 20 and request 28 gave the other games a start from a set-up position, and a start
     from a game's moves, for a reload of the page.
   - The moves in the spelling of item 2, both ways.
   - The reply's names of the build, the network and the play settings, so that the game's record names its opponent.

   It can come after the rules and the analysis module, and it runs with the test network first.

### Later, not asked now

10. **Later:** the GPU module (request 06, request 26), the maps of heads C0 and C4 for the area map (design 06's
    "Analysis later", the site's design 30), the search with the other player to move for the threat (the site's
    design 31), an opening book (request 22) and a second network (the site's design 09). Each gets its own request
    when the site's feature starts.

### Done already

11. **The engine's design 09: nothing to ask.** Since the engine repository's commit 2d9c3e60b, its
    `games/tak/docs/design/09-strength-play-and-analysis.md` ("Decision: play and analysis") reads a game finished or
    not, as the site does (item 4 there). It also publishes a public TEI engine of its own for other Tak tools, once
    the engine is strong enough (item 5 there). That is the engine repository's work, not the site's.

## Why

- **The site holds no copy of the rules** (this repository's CLAUDE.md). Without the engine, it cannot replay a
  record, check a move or a mark, or end a game: the board, the reserves, the flat count and the end come from the
  rules.
- **The site's stages wait for the rules, not for the network.** The review, the Analysis board, the exports and the
  review file all run with a test network's values (design 34, "Before the network"). Only the labels need a trained
  network.
- **Tak has its own notation and positions.** PTN and TPS are the community's formats, and ptn.ninja and playtak write
  them. The site and the engine use them as they are, with one spelling of each move, so that a stored result keys on
  the move.
- **A draw is a result of its own in Tak.** A flat tie after komi and the 50-ply rule end games, so the win chance
  alone hides how often a line draws.
- **One protocol for three games.** `packages/engine` serves Hedge School and Cyanotype. A third game that speaks the
  same protocol adds only its own fields.

## Done when

- **The rules and the analysis module (abscls-shfz.24):** the engine repository's documents give the build's
  protocol for Tak: its moves' spelling, `describe`'s fields, the end of a game, the position check and its reasons,
  the draw chance and the score's meaning. A build with a test network is in a release or on this machine, with its
  manifest. Mistak then checks, on records written by hand and on the engine's own games, that the engine accepts
  every move played, gives the short form back, and ends each game with the record's result. A check against
  playtak's games runs locally and commits nothing (design 34, item 14).
- **The practice bot (abscls-shfz.25):** a build of the bot with the test network is on this machine, with its
  manifest, and Mistak's practice page plays a whole game against it on each trained size, from the start and from a
  TPS.
