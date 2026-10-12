# The notation, described for other developers: settle its open points and confirm the page

**Status:** done on 2026-10-12 (below, "Delivered"), and the page changed. **Asked:** 2026-10-12.

## What

This repository's site, Hedge School, has a page that describes the position notation and the game record notation
for anyone who writes a reader or a writer, as PGN's standard describes PGN: `src/routes/notation/+page.svelte`, served
at `/notation`. The notations are the engine repository's (its `docs/design/04-notation-and-protocol.md`). The page
describes them and does not change them. Please:

1. **Settle the points that the design leaves open or does not state,** as the page now writes them:
   - **The order of edges in a position's lists:** by their first points, then their second, a point by its column,
     then its row.
   - **The clock command:** `[%clk H:MM:SS]`, the mover's clock after the move.
   - **The evaluation command:** `[%eval W M S]`, after the move: Blue's win chance (0 to 1), the expected final margin
     (Blue less Red, signed), and its spread, in points. Which score is the margin: `scoreSelfplay` or `scoreLead`?
   - **The results:** `b+N` and `r+N` (won by N points), `b+R` and `r+R` (by resignation), `b+F` and `r+F` (by
     forfeit), `0` (equal scores), `*` (not over or not known). Nothing follows the result.
   - **The tags beyond the seven of PGN's roster:** `Scores` (the final scores, `Blue/Red`), `TimeControl` (`60+15`),
     `Termination` (`normal`, `resignation`, `forfeit`), `GameId`, and `Position` (a start other than the standard
     one).
   - **What a reader may accept:** lower-case letters, and an edge's points in either order.
2. **Confirm that the page matches the design,** or name what to change.
3. **Say where the description should live:** the page as the public description, with the design as its source, or
   a description in the engine repository that the page follows.

## Why

The site goes to players in early access (this repository's `docs/design/11-early-access.md`), and the page is where
another developer learns the notations. It must agree with the engine, which reads and writes them, and the design is
the engine repository's to decide.

## Done when

- The open points are decided in the engine repository's design, and the engine repository tells this repository.
- The page agrees with the design.

## Delivered

The open points are decided in the engine repository's design (its `docs/design/04-notation-and-protocol.md`):

- **Letters:** a writer writes upper case. A reader may accept lower case, and the engine's readers do.
- **An edge:** a writer writes the lower point first. A reader may accept the points in either order and sort them,
  and the engine's readers do.
- **A position's lists** are ordered by the edges' first points, then their second points, a point by its column,
  then its row.
- **A finished game's position** (120 edges) has the mover field `r0`. The protocol refuses to analyse it.
- **Tags** follow PGN's rules: `\"` and `\` in a value, `?` for an unknown required value and for each unknown
  digit of `Date`, `-` for no `Round`. `BlueRating`, `RedRating` and `Rules` (the variant, when it is not the online
  one) are optional tags, beside `Scores`, `TimeControl`, `Termination`, `GameId` and `Position`.
- **The result** ends the turns, and nothing follows it. `*` also means a result that is not known.
- **`[%clk H:MM:SS]`** comes once a turn, after the turn's last edge (or the pass that ends it). It gives the mover's
  time left as the turn ends, increment included: what the clock shows when the mover's next turn starts.
- **`[%eval W L S]`:** `W` is Blue's win chance. `L` is the lead (`scoreLead`): the komi that would make the game
  even, not the expected final margin. It carries its sign, `+` when Blue is ahead, and a reader accepts it with or
  without `+`. `S` is the spread of the final margin (`scoreStdev`). Any number of decimals.
- **Where the description lives:** the engine repository is private, so the site's page is the notations' public
  description. The design keeps the decisions and their reasons. A change is decided there first, then the site is
  told, and the page follows.

The page changed as asked: the clock once a turn after the turn's last edge, the lead as `[%eval]`'s middle number,
the tags `BlueRating`, `RedRating` and `Rules`, and `r0`. The engine repository found the rest of the page in line
with the design.
