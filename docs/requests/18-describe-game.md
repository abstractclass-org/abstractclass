# Every position of a game in one request

**Status:** open. **Asked:** 2026-10-14.

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
