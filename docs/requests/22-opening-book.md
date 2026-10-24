# The opening book: KataGo's book method, as files for the site

**Status:** open (beads abscls-0dn8). **Asked:** 2026-10-24.

## What

1. **A book of Enclosure's opening, grown by KataGo's book method** (KataGo's `cpp/book/book.cpp` and `book.h`, the
   books of [katagobooks.org](https://katagobooks.org)):
   - **The cost rule** that orders which position grows next, the **expansion** of a position by a search with the
     book's moves excluded (`avoidMoveUntilByLoc`), and the **minimax** of the values and their bounds through the
     tree.
   - **The strongest released network,** with deep searches on the GPU (the beads epic abscls-tpaj, "Decided so far").
     The visits, the cost parameters and the budget are the engine repository's choice.
   - **The online rule variant,** as the engine uses it (docs/context.md, "The online rule variant").
   - **A position and its mirror image as one node,** and the positions that two move orders reach as one node.
2. **Breadth for people, not for a bot's play.** The book holds every fine move near the start: a position stays open
   while its best move outside the book is Good or better against the position's minimaxed value (a loss of 0.05 of
   the mover's win chance or less, `GOOD_WIN` in the site's `packages/analysis/src/labels.ts`). The cost rule still
   orders the growth, so the most important positions come first if the budget ends. A move that the deeper values
   make worse than Good stays in the book.
3. **Traps, each with its refutation.** A trap is a move that a short search of its position (32 visits) rates Good or
   better against that search's best move, and that its own deep search and the minimax rate a Mistake or worse (a
   loss of more than 0.10). At most 2 for each position, the largest gap between the two values first. Each trap's
   position after it is grown, so that the book holds the refutation.
4. **The depth:** at least the first 3 turns (5 edges: Blue's first turn is one edge, then two edges a turn), deeper
   where the budget allows. The engine repository chooses the depth and says why.
5. **Files that a static site serves,** with the values that the explorer needs (design 32,
   [32-book-explorer.md](../design/32-book-explorer.md), "Consequences"). For each position:
   - its notation, its parents (the positions and moves that lead to it), the side to move, and the edge of the turn;
   - Blue's win chance with its lower and upper bounds, and the expected score lead, all minimaxed;
   - each book move: its edge, the position it leads to, and its minimaxed values;
   - each trap: its edge, its value at the short search, its deep value, and the position it leads to;
   - the best move outside the book and its value (KataGo's "other" row);
   - the area map: the ownership of each point from the position's deep search, so that the board shows it without a
     live search. A coarse form (for example one byte a point) is enough.
   The labels, the position symbols and the sentences are the site's product rules: the site computes them from these
   values. The file holds no label and no symbol.
6. **In parts,** so that the start's part loads first: for example the first turns in one file, and each later
   subtree in its own file, with an index. Each part small enough to load at once on a phone (a few hundred kilobytes
   at most, before compression). The form, JSON or another, is the engine repository's choice. Cloudflare Pages
   serves files of up to 25 MiB.
7. **A versioned artifact,** as the engine's builds are: a release asset with its SHA-256, the network's name
   (request 12) and the date, so that the site pins it in `engine.lock.json` and names the book's version on the page.
   An earlier book stays available, as KataGo keeps its earlier books online.

## Why

- **The site's design waits for it.** Design 32 decides how a player explores the book, on the review, the Analysis
  board and a page of its own. It cannot be built without the book file.
- **The site's prototypes cannot grow the book well.** The three prototypes (branches abscls-tpaj.1 to abscls-tpaj.3,
  beads abscls-tpaj.1 to abscls-tpaj.3) searched with the site's engine in WebAssembly on two CPU threads, at 512
  visits:
  - **Without the excluded search,** a position grows by its own search's candidates. The second prototype took them
    in the order of the network's prior: 740 of its 1,645 growth moves were Inaccuracy or worse. The third took the most
    visited candidate outside the book: still, 30 fine candidates with 10 visits or more stayed out of the book, in 22
    of its 134 expanded positions. KataGo's search with the book's moves excluded finds them.
  - **Depth and strength:** 512 visits on a CPU, against KataGo's 15,000 for its 7 × 7 books, and the site's network,
    not the strongest.
- **KataGame carries KataGo's book code** (`katagame/cpp/book/`), but the game interface does not use it: it treats a
  move as a point, and Enclosure's move is an edge (the engine repository's design 06, "Positions that never recur, and
  moves as points in the opening books", and design 07, "The allowed symmetries"). The engine repository decides
  whether to adapt it or to grow the book another way with the same method.
- **No server:** the site is static files (design 02). A visitor's lookup runs in the browser and sends no game
  anywhere. Our own machine computes the book, so no visitor can write a false result.

## A sample

The third prototype's book is a sample of the values that the explorer reads: the branch abscls-tpaj.3,
`apps/hedgeschool/scripts/book-prototype/export.mjs`, which writes `static/book-prototype/book.json` (404 positions,
1.5 MB). Its form is not a request: the engine repository chooses its own.

## Done when

- The engine repository documents the book's method, its parameters and its file, with the reasons for each departure
  from KataGo's method.
- A release holds a book of at least 3 turns, with its SHA-256.
- Hedge School checks, on the release:
  - every position's fine moves: no candidate of the position's own search that is Good or better, with 10 visits or
    more, is outside the book;
  - each trap's two values and its refutation;
  - the mirror images and the move orders as one node;
  - the parts' sizes, and the start's part first;
  - a sample of positions against the site's own search, for the values' direction.
