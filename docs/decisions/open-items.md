# Open items

**The one backlog:** all work still to do that is not in flight. What is in flight is in
[../handoff.md](../handoff.md), and nowhere else.

Rules:

- An item stays here until it is done. Then remove it, and write its result in its topic file.
- When work on an item starts, move it to the handoff. If the work stops unfinished, move it back here.
- Add new items at the end of their group.

## Foundations

- **Deploys:** a Cloudflare project, a deploy job that refuses local engine sources, long cache headers for
  `/engine/`. It waits for the first released engine build
  ([requests/03-release-artifacts.md](../requests/03-release-artifacts.md)).

## Milestone 1: a game report (design/01-analysis-tool.md, section 4)

- **The review's budget and pool size:** choose their defaults from the speed on visitors' machines. A visitor can
  change them in the engine settings (design/09-engine-settings.md). The pool is now half the cores, 1 to 8, from
  one fast laptop ([engine.md](engine.md), "Speed on a laptop"): measure a typical laptop and a phone too. KaTrain's
  schedule is the model: a fast sweep of the whole game (25 visits), then deeper searches where the player looks
  (500), and re-analysis on request ([research/01-ux-survey.md](../research/01-ux-survey.md), section 3). Keep within
  the memory of small machines (95 MiB an instance for b10c128, 244 MiB for b15c192).
- **A review in a hidden tab** runs slowly, because the browser lowers the tab's priority. Decide what the page does:
  tell the visitor, or accept it.

- **Ask meaf.us for an export:** a button or a public record link for finished games would replace the bookmarklet,
  which breaks when meaf.us changes its page. Its owner's choice: the owner of this site asks.
- **The noise floor:** search the same positions twice and measure how often the labels agree, before any label
  ships. The CPU module gives the same reply each time, so today this measures nothing. It applies to a GPU module
  (requests/06-webgpu.md: the site does not need reproducible searches), and between the CPU and GPU modules.
- **The label budget against a deeper reference, with the fitted bands:** measured against 4,096 visits on 100
  archive games with the placeholder bands ([engine.md](engine.md), "Label agreement on the archive's games"). The
  agreement depends on the bands, so measure it again when the fit gives new ones, and choose the review's depths
  from it.
- **Which score measures points lost:** `scoreSelfplay` (the expected final margin) or `scoreLead` (the starting
  score that would make the game even, trained since 2026-10-05). Measure both on reviewed games before the labels
  move from win chance to points (design 01, principle 1). KaTrain uses the lead. The archive's analysis has both, at
  every budget.

## Offline work (on the engine repository's GPU)

- **The archive's analysis stays offline:** it is other players' games. It stays in the engine repository's `runs/`,
  out of Git, and this repository commits only statistics over many games and the thresholds fitted from them
  ([requests/07-archive-analysis.md](../requests/07-archive-analysis.md), done).

## The owner's feedback on the review, puzzles and import (2026-10-10)

The simple items are done (decisions/product.md, "The review on the engine, first feedback"). These need a decision
or a design first:

- **The candidates on the board change with the search's depth** (decisions/product.md, "The candidates: which ones
  the board shows"): after the label pass (256 visits) many candidates pass the visit rule, after the deep search
  (1,024) few do. The board can lose candidates while the player looks. To watch: whether players find that
  confusing. The Good band is 5% of a human's win chance (design 10).
- **Extra analysis on request:** KaTrain offers "equalize" (every candidate gets as many visits as the top move),
  "sweep" (every legal move searched) and "alternative" (moves beyond the candidates) (`analyze_extra`,
  `core/game.py`). To decide which the page offers. It bears on the Great label below, on the board's candidates, and
  on the engine's lines for bad edges.
- **Learning from mistakes** (postponed): the "Retry mistakes" tab is removed (decisions/product.md, "The 'Retry
  mistakes' tab removed"). Bring it back as a mode of the Analysis panel, above the move list, as Lichess's "Learn
  from your mistakes" is, started from the Highlights. Follow Lichess's rules (research/01-ux-survey.md, "Learning
  from the game"): pick the moves where the win chance swung by more than 10 points, and accept any edge that keeps
  the win chance within 4 points of the position before the mistake, not only the engine's first choice. The engine's
  first choice can be beyond any human, and a retry of it teaches little. Judge a tried edge by searching the position
  after it, as Lichess does ("Evaluating your move…"). Make it teach: a hint before the solution (the area at stake),
  the engine's line after a solve, and what the game's edge allowed (the opponent's region, the points). It needs
  move input on the engine's rules (`EdgeInput` with the position's rules, as the puzzles have it). Puzzles
  need the same judging.
- **The lessons' edge input on the engine's rules:** the lessons check edges with small hand-written tests. Give
  `EdgeInput` each lesson step's legal edges and the mover's nodes from the engine's `describe`, as the puzzles do (decisions/product.md,
  "Edge input on the engine's rules, in the puzzles"). A lesson's position may need the `position` field of the query.
- **Other move sounds:** the crayon strokes (design 08) are to be replaced. Candidates: fountain pen strokes, or
  other free recordings. Choose by ear in a sound lab, as the crayon strokes were chosen (the lab was not kept).
- **Sound beyond the review's moves:** the review's move sounds are built (design 08). Still to decide: sounds in the
  puzzles and the lessons (a move, solved, failed), and whether a mistake's label has one.
- **Using the review page's space** (design 06): with the board large and three columns, look again at the
  Advantage chart's place and size (under the board, below the fold today), and at what the summary column shows
  besides the Highlights.
- **The notation, described for players:** Home names the turn labels and the edges in one line. Write a full
  description of the record (turns, edges, the cut mark `x`, `pass`, results, comments, branches) on a page of the
  site, from the engine repository's `docs/design/04-notation-and-protocol.md`, and link it from Home and `/import`.
- **One search tree across a game:** the notes are in
  [research/02-search-tree-reuse.md](../research/02-search-tree-reuse.md). Not needed for the first release. Decide
  later. The engine does not reuse a tree today. Its GTP bot's numbers and the request's shape (a query that continues
  the worker's tree, for the position on screen only) are in [engine.md](engine.md), "The engine repository's notes".
  Measure first how many visits the played move gets, since in a review the move is the player's.
- **A newer model:** the models since data row 12.44M rate higher in the engine's gauntlet (the newest b10c128 3,286
  to 3,374 against the site's 3,134; b15c192 3,694), and need a new module ([engine.md](engine.md), "The engine
  repository's notes"). When the rise settles, decide whether to request one.
- **Play settings:** `chooseMove` searches with the analysis settings, not the GTP bot's. If the site shows the
  engine's move or lets visitors play the engine, request play settings (root noise off, the history on).
- **An Analysis page:** a free analysis board (a position, or a game not reviewed), with the review's lines and
  branches (design 07) and Lichess's "Make main line", which the review leaves out because its line is the game's.
- **Export a review:** the game's record with each position's evaluation (the record's `[%eval]` comments), the
  labels, and the branches as variations, so that a review can be kept and shared. The sample game needs none: the
  engine is reproducible, so the same build and network give the same review.
