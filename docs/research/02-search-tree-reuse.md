# One search tree across a game: notes for a later design

**Status:** research. Nothing here is decided, and nothing is built. Decide later: it is not needed for the first
release.

## Where the work is spent today

The review searches every position of a game three times (design
[05-review-analysis.md](../design/05-review-analysis.md)): a sweep at 32 visits, a label pass at 256, and a deep
search at 1,024 where the player looks and at the key moments. Each search starts from nothing. In the engine's
protocol, each analysis query calls KataGo's `Search::setPosition`, which clears the tree
(`katago/cpp/command/enclosureprotocol.cpp` in the engine repository), and an engine instance runs one search at a
time. So the work has two kinds of waste:

1. **Within a position:** a result at 1,024 visits costs 32 + 256 + 1,024 = 1,312 visits.
2. **Across positions:** the search of a position has already explored the move that the game played. The search of
   the next position starts again from nothing.

## Two ways to reuse a tree

### Grow one tree through the budgets

Keep a position's tree, and continue it from 32 to 256 to 1,024 visits. The engine's search in slices already shows
that a search continued in parts gives the same result as one whole search of the same visits (10 slices of 20
visits equal one search of 200: the engine repository's decision log). So the results, the cache key and the meaning
of "1,024 visits" do not change. The saving is about a fifth of the work at most (the 288 visits of the first two
passes).

The difficulty: an engine instance holds one tree, and the passes now run across the whole game before the next pass
starts (the shape of the game first). Keeping a tree for each position needs the engine to hold many trees, or a new
order of work.

### Keep the played move's subtree (forward through the game)

After a position's search, play the game's move in the tree and keep that move's subtree as the next position's
tree. KataGo's GTP engine does this between moves (`Search::makeMove`). GTP-based programs that analyse while the
player steps forward, such as Lizzie, get it this way. KaTrain uses KataGo's analysis engine, one query for each
position, and reuses nothing.

- **The direction is forward.** The tree grows in the order of play. Chess programs that analyse a game backwards do
  it for their hash table, which carries what was found in later positions back to earlier ones. A tree cannot go
  backwards.
- **The gain depends on the move played.** A good move often holds a large share of the parent's visits. A blunder
  holds almost none, so the position after it starts nearly from nothing. The gain can be measured before any
  design, from the analyses already kept: the played move's visits against the root's visits.
- **What "1,024 visits" means changes.** KataGo counts the reused visits towards `maxVisits` (the protocol counts
  the root's visits at the start of a search, `nonPlayoutVisits`). The same budget then costs less, or the same
  work gives more visits. The label budget (256 visits) was measured without reuse
  ([decisions/engine.md](../decisions/engine.md), "Label agreement against search budget"). It would need measuring
  again.
- **Reproducibility changes.** A position's result would depend on the search before it. The analysis of a whole
  game stays reproducible if the order and the budgets are fixed, but one position alone is not. The cache key
  (build, network, moves, visits) would have to name the chain too.
- **Parallel work.** A chain is sequential. Several workers would each take a stretch of the game, and the first
  position of each stretch reuses nothing. A jump to a position (the deep search where the player looks) breaks the
  chain, unless that worker still holds the tree of the position before it.

## What it needs from the engine repository

A query that continues from the instance's current tree by playing a move (KataGo's `Search::makeMove`), in place of
`setPosition`. For the first way, a query that continues a finished search to a larger budget. Either is a request
to the engine repository (`docs/requests/`).

## A first step, when the time comes

Measure the gain of the second way on the games already analysed: for each position, the share of the root's visits
in the played move. If the share is small for most moves, the first way (one tree through the budgets) is the simpler
saving.
