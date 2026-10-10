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
- **Speed on a visitor's machine:** run the engine lab's whole-game review on an idle machine and on a typical
  laptop, with 1, 2, 4 and 8 workers, for b10c128 and b15c192. The first measurement ran on a loaded machine
  ([engine.md](engine.md), "The current module in a Web Worker"). Note the lab's start time too: the module compiled
  once showed no gain on a fast machine ([engine.md](engine.md), "The engine module compiled once").

## Milestone 1: a game report (design/01-analysis-tool.md, section 4)

- **The review's budget and pool size:** choose them from the speed on visitors' machines. KaTrain's schedule is the
  model: a fast sweep of the whole game (25 visits), then deeper searches where the player looks (500), and
  re-analysis on request ([research/01-ux-survey.md](../research/01-ux-survey.md), section 3). Keep within the memory
  of small machines (95 MiB an instance for b10c128, 244 MiB for b15c192).
- **A review in a hidden tab** runs slowly, because the browser lowers the tab's priority. Decide what the page does:
  tell the visitor, or accept it.

- **Ask meaf.us for an export:** a button or a public record link for finished games would replace the bookmarklet,
  which breaks when meaf.us changes its page. Its owner's choice: the owner of this site asks.
- **The noise floor:** search the same positions twice and measure how often the labels agree, before any label
  ships.
- **Label thresholds:** fit them on the archive (design 01, principle 3). This needs the archive analysed offline.
- **Which score measures points lost:** `scoreSelfplay` (the expected final margin) or `scoreLead` (the starting
  score that would make the game even, trained since 2026-10-05). Measure both on reviewed games before the labels
  move from win chance to points (design 01, principle 1). KaTrain uses the lead.

## Offline work (on the engine repository's GPU)

- **Analyse the archive** at a large budget, for the thresholds, the win curve by rating, and the noise floor. Ask
  first: the archive holds other players' games.

## The owner's feedback on the review, puzzles and import (2026-10-10)

The simple items are done (decisions/product.md, "The review on the engine, first feedback"). These need a decision
or a design first:

- **The candidates on the board change with the search's depth** (decisions/product.md, "The candidates: which ones
  the board shows"): after the label pass (256 visits) many candidates pass the visit rule, after the deep search
  (1,024) few do. The board can lose candidates while the player looks. To watch: whether players find that
  confusing. The Good band (5%, 36 points) is still a placeholder.
- **The label budget, measured again under KataGo's analysis defaults:** the review now searches with them (protocol
  0.3: root noise on, no moves from before the root; [engine.md](engine.md), "Protocol 0.3"), so every value changed.
  Run the budget measurement again (`scripts/measure/budget-collect.mjs`, [engine.md](engine.md), "Label agreement
  against search budget") and keep or change the 256 visits of the label pass.
- **Extra analysis on request:** KaTrain offers "equalize" (every candidate gets as many visits as the top move),
  "sweep" (every legal move searched) and "alternative" (moves beyond the candidates) (`analyze_extra`,
  `core/game.py`). To decide which the page offers. It bears on the Great label below, on the board's candidates, and
  on the engine's lines for bad edges.
- **Great is too frequent late in a game:** in the sample game almost every late move is Great (the first choice,
  with the second at least 10% of win chance worse: En Croissant's rule), each with a comment line in the move list.
  Tighten the rule, or drop the comment line for Great. A likely cause: the second choice's value comes from the same
  search, and it often has few visits, so its value is unreliable. Root noise (protocol 0.3) gives the second choice
  more visits: look again at the sample game under it first. A proposal: call an edge the only good one only when
  the second choice has enough visits (the board's rule: 15% of the most visited move's), or measure first how many
  Great labels have a second choice under that share.
- **Learning from mistakes:** the "Retry mistakes" tab is removed (decisions/product.md, "The 'Retry mistakes' tab
  removed"). Bring it back as a mode of the Analysis panel, above the move list, as Lichess's "Learn from your
  mistakes" is, started from the Highlights. Follow Lichess's rules (research/01-ux-survey.md, "Learning from the
  game"): pick the moves where the win chance swung by more than 10 points, and accept any edge that keeps the win
  chance within 4 points of the position before the mistake, not only the engine's first choice. The engine's first
  choice can be beyond any human, and a retry of it teaches little. Judge a tried edge by searching the position
  after it, as Lichess does ("Evaluating your move…"). Make it teach: a hint before the solution (the area at stake),
  the engine's line after a solve, and what the game's edge allowed (the opponent's region, the points). It needs
  move input on the engine's rules (`EdgeInput` with the position's rules, as the puzzles have it). Puzzles
  need the same judging.
- **The lessons' edge input on the engine's rules:** the lessons check edges with small hand-written tests. Give
  `EdgeInput` each lesson step's legal edges and the mover's nodes from the engine's `describe`, as the puzzles do (decisions/product.md,
  "Edge input on the engine's rules, in the puzzles"). A lesson's position may need the `position` field of the query.
- **Sound:** sounds for moves, to make play more satisfying. To design: which events (an edge placed, a cut, a region
  closed and scored, a label for a mistake, a puzzle solved or failed), a sound set with its licence, a switch to mute
  it, and no sound before the player interacts (browsers block it).
- **Using the review page's space** (design 06): with the board large and three columns, look again at the
  Advantage chart's place and size (under the board, below the fold today), and at what the summary column shows
  besides the Highlights.
- **The notation, described for players:** Home names the turn labels and the edges in one line. Write a full
  description of the record (turns, edges, the cut mark `x`, `pass`, results, comments, branches) on a page of the
  site, from the engine repository's `docs/design/04-notation-and-protocol.md`, and link it from Home and `/import`.
- **One search tree across a game:** the notes are in
  [research/02-search-tree-reuse.md](../research/02-search-tree-reuse.md). Not needed for the first release. Decide
  later.
- **An Analysis page:** a free analysis board (a position, or a game not reviewed), with the review's lines and
  branches (design 07) and Lichess's "Make main line", which the review leaves out because its line is the game's.
- **Progress bars that move while the work runs** (low priority): the review's bar (the top of the summary column) and
  the position's search bar (the engine header) stand still between updates, so a slow pass looks stopped. While the
  work runs, show that it runs: for example an animated stripe or a pulse on the bar's moving part, stopped when the
  work is done or stopped. Find how Lichess and chess.com show an analysis that is still running, and keep it still
  when the visitor asks for reduced motion.
