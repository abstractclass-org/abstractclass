# Every position of a game in one request

**Status:** done: `describe_game` in protocol 0.6.1, release `wasm-v2-engine-54486cd`, checked here. **Asked:**
2026-10-14.

## What

1. **One request for a game's positions:** a start (the standard start, or `position`) and `moves`, and in the reply
   what `describe` gives for each position of the game: before the first move, after each move, and after the last.
   The engine replays the moves once. The form is the engine repository's choice: a new action, or a field of
   `describe`.
2. **The fields that the board needs, and no more:** the position's notation, each player's edges, the protected and
   the placed edges, the regions, the areas, the scores, the mover, the edges left in the turn, the move count and the
   outcome. Hedge School does not need these positions' legal moves, nodes or check. KataGo's form would fit: the
   reply leaves a costly field out unless the request asks for it (`includePolicy`, `includeOwnership`).
3. **Each move's cut edge,** if the engine has it at no cost: the enemy edge that the move cuts, as `play` gives it.
   Hedge School finds it now by comparing the edges before and after each move (`src/lib/engine/describe.ts`).

## Why

- **The review shows nothing of the game until the rules answer.** A record lists edges only. The board's edges, the
  enclosed regions, the scores, whose turn it is and the end of the game come from the engine's rules, and this
  repository holds no copy of them. The review shows a skeleton of its layout until then.
- **The site asks for each position on its own:** `describeGame` sends one `describe` for each position, with the
  moves up to it. For a game of 120 moves, that is 121 requests, and the engine replays 7,260 moves in all.
- **Measured** in Edge on a desktop with 16 cores, on the local build, with the game's 121 positions:
  - **A worker alone:** the 121 requests took 118 milliseconds, 111 of them inside the engine (each reply's `ms`). A
    request took 0.3 milliseconds at the start and 1.3 milliseconds after 120 moves.
  - **In the review's start,** while the search workers start beside it: 160 to 285 milliseconds, then the review
    shows. A phone was not measured.
  - **The replies:** 7.6 KB on average, 917 KB for the game. The legal moves are 4.75 KB of each (519 edges on
    average), and the regions 1.3 KB. A player's own move asks `describe` for its position again, so these positions'
    legal moves are not used.
- **Not measured:** how long one request for the game would take. One replay and no legal moves should cost less than
  the requests above, but only the engine repository can measure it.

## Done when

- The engine repository's design 04 documents the request and its reply, with the protocol version that brings it.
- A release has it. Hedge School then checks, on the archive's games, that each position's fields equal what
  `describe` gives for the same moves, and measures the review's start again.

## Delivered

`describe_game` in engine protocol 0.6.1 (the engine repository's design 04, "A game's positions in one request"), in
release `wasm-v2-engine-54486cd`, in both analysis modules. The search is still `fdfe5ad`, so stored reviews stay
valid. 0.6.1 is a compatible change: a client of 0.6 takes any 0.6.x.

- **The request:** `{"id", "action": "describe_game", "position", "moves", "from"}`. `position` and `moves` are as
  `describe` takes them. `from` (0 when absent) is the first position in the reply: 0 is the position before the
  moves, and k the position after k moves. The moves are played once.
- **The reply:** `{"id", "positions": [...]}`, one entry for each position from `from` to the end. Each entry has
  `describe`'s `position`, `mover`, `movesLeft`, `moveCount`, `scores`, `edges`, `protected`, `placed`, `regions`,
  `areas` and `outcome`, and `cuts`: the opponent's edge that the move to the position cut, as `play` gives it (null
  for the position before the moves, and after a move that cuts nothing). So the cut of `moves[k]` is
  `positions[k - from + 1].cuts`.
- **Left out:** the legal moves, the nodes and the check. `describe` gives them for one position.
- **Errors:** a `from` that is not an integer from 0 to the number of moves gets `"field": "from"`. An illegal move
  gets `describe`'s error, which names the move's index.
- **A new action, not a field of `describe`:** KataGo's `analyzeTurns` is a field, but KataGo then sends one reply for
  each position. A module call gives one reply, so a field would have changed `describe`'s reply.
- **Measured there** (the CPU module in Node on a desktop with self-play on every core, the median of 7 runs): a game
  of 120 moves takes 12 to 20 ms in one `describe_game`, against 86 to 96 ms in 121 `describe` requests. The replies
  are 160 to 267 KB, against 700 to 775 KB. The engine repository's `tools/describe_speed.mjs` measures it.
- **Equal to `describe`:** each position's fields equal `describe`'s for the same start and moves. A position given as
  a string keeps its edges in another order than the same position reached by moves, so a region's polygon can then
  start at another corner, with the same shape and area.

**Checked here** (decisions/engine.md, "The release 54486cd"):

- **Equal to `describe`,** with `scripts/measure/describe-game-check.mjs` on the CPU module of `54486cd` in Node: the
  archive's 6,246 games, 528,952 positions. Every field of every position equals `describe`'s for the same moves, and
  every move's `cuts` equals the edge that the site found before by comparing the edges. The same holds from the
  middle of 624 games (`from`) and from the middle position of 625 games given as a string (a set-up start). A `from`
  of -1, 1.5 or 999 gets `"field": "from"`. In Node a game took 7.0 ms in `describe_game` and 38.6 ms in one
  `describe` for each position, its replies 109 KB and 454 KB (the means over the games).
- **The review's start,** in Edge on the local build, on a game of 120 edges, 6 loads: on the rules worker, in the same
  load, `describe_game` took 30 to 46 ms and the 121 `describe` requests 112 to 127 ms. Without that comparison, the
  rules answered (`review:rules`) 300 to 370 ms after the page's start, and the review showed 4 to 6 ms later. The tab
  was in the background.
