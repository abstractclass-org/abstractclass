# The lessons on the engine's rules

**Status:** in force, and built. **Decided:** 2026-10-18.

## Context

Learn (`/learn`) teaches the rules in short lessons, after Lichess Learn: each lesson is a few steps, and each step is
a task on a small board, with a goal, a hint and a result. The first version checked each edge with a small test
written for its one position, and drew a board made by hand after it. Those tests were a second copy of the rules, and
nothing showed where they differed from the engine's. The puzzles already took their edges from the engine's rules
([decisions/product.md](../decisions/product.md), "Edge input on the engine's rules, in the puzzles"). Learn is not
in the early access (design 11).

## Decision

1. **Teaching boards.** A step's board holds only the edges that the step needs, so no game reaches it. The board is
   a line of the position notation (the /notation page) in the course's file. The page sends it to the engine as the
   query's `position`, and ignores `describe`'s `check`: whether a game can reach the position.
   - Blue moves on every board, at the start of a turn of two edges (`b2`, with 3 edges played). So the board after
     the step's edge is still in Blue's turn: the scores do not change yet, and Red's invincible edge stays invincible.
   - A player with no edges has `-` in place of its list, as the notation writes it. No board needed a change.
2. **The engine's rules for the input,** as on the puzzles page: `describe` gives the edge input the legal edges and
   the mover's nodes. The first point must be one of Blue's nodes, and the board marks the legal ends from it. A
   click on another point does nothing, and the step says why, as the puzzles page does.
3. **The engine plays the edge:** the page sends `describe_game` with the edge as its one move. The reply gives the
   board before the edge and the board after it, with the edge cut, the regions and the areas. The page draws the
   board after it. No result board is made by hand.
4. **Each step keeps a test of its task only.** The test reads the engine's two boards, not the edge's points:
   - "Draw an edge": every legal edge does the task.
   - "Close a region": Blue's area grows by the square's 9. A diagonal closes a triangle of 4.5.
   - "Cut an enemy edge": the edge cuts an enemy edge.
   - "Invincible edges": the edge cuts an enemy edge that was not invincible. The engine refuses an edge that would cut
     the invincible one.
5. **A legal edge that fails the task is not placed.** The step shows its hint ("Not quite. …"), and the board stays
   as it was. The visitor can enter another edge at once, or press "Try again".
6. **Before the engine answers,** the page draws the step's line as the board editor reads it: the edges and their
   marks, with no regions. The input keeps the rules' box (any point within 3). An edge entered then waits for the
   engine, and an edge that the engine refuses gets "The rules do not allow this edge."
7. **Without the engine,** the input keeps the rules' box, as the puzzles' input does. The step says that the page
   cannot check the edge, and no edge is placed. This is a site where `npm run engine` was not run, or a browser
   where the engine does not start.

## Why

- **One copy of the rules.** The engine's protocol gives the rules as actions so that the site holds no second rules
  engine (the engine repository's design 04, "The rules as actions"). A hand-written test of a rule can be wrong, and
  no test compares it with the engine.
- **Teaching boards.** A step shows one idea. A position from a game would add edges that the step does not need.
- **The task stays hand-written.** A lesson sets its task, as a puzzle sets its solution. The engine gives the facts
  (a cut, an area), and the task's test reads them.
- **A failed edge is not placed.** The board keeps the step's idea in view, and the hint says what to do instead.

## Alternatives

- **Boards that a game reaches:** the engine's check would pass, but each board would carry edges that its step does
  not need.
- **The failed edge on the board:** the step would need a way back to its board, and a wrong board teaches nothing.
- **The engine for the input only, with the hand-made result boards:** a result board could differ from the rules.
- **The hand-written tests beside the engine:** two copies of the rules.

## Consequences

- A new step is a position line, a goal, a hint, a task test on the engine's boards and the text after it. The unit
  tests play each step's edges on the engine.
- A step's text must agree with the engine's board. The unit tests check the texts' facts: the square's area of 9,
  Red's nodes gone after the cut, and the invincibility kept for the rest of the turn.
- The board after an edge shows the new edge as the site shows a placed edge: wide, with a white line along it.
- Learn loads the engine's CPU module (1.4 MB) and its library, with no network, as the puzzles page does. It loads
  them when the visitor opens the first lesson, so a visit to the map alone loads no engine.

## Where it is

- The course: `src/lib/learn/lessons.ts` (the steps, their lines and task tests, and `lineBoard`). The page:
  `src/routes/learn/+page.svelte`.
- The edge input: `src/lib/board/edgeInput.svelte.ts`. Its words: `src/lib/board/EdgeInputHint.svelte`, which the
  puzzles page shows too. Its rules from a `describe` reply: `rulesOf` in `src/lib/engine/position.ts`, which the
  puzzles, Practice and the Analysis board use too.
- The tests: `src/lib/learn/lessons.test.ts`. Each step's line, and each step's task on the engine in Node
  (`scripts/node-engine.mjs`). The engine's tests are skipped without the engine's files.

## Log entries

- [decisions/product.md](../decisions/product.md): "Prototypes of the other parts" (2026-10-09), "Edge input on the
  engine's rules, in the puzzles" (2026-10-10), "The lessons on the engine's rules" (2026-10-18).
