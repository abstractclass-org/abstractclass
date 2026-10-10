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
  ([engine.md](engine.md), "The current module in a Web Worker").

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
- **The engine's lines, and exploring variations:** show the engine's best line (KataGo's `pv`, in the replies
  already) for number 1 and for every candidate, and for any other edge on request (search the position after it),
  so that a player sees why an edge is bad. Play out a line on the board, explore variations by hand, show the
  branches in the move list, and navigate them with keys, as other analysis tools do (Lichess, chess.com, KaTrain,
  Sabaki). To design: the game as a tree of moves, the branch notation (the record's `( )` branches), the keys, and
  how a variation's positions get their analyses.
- **Searching for analysis, not only for the choice of move:** KataGo's analysis engine defaults to `wideRootNoise`
  0.04, which spreads visits over more moves so that more of them get values (its `analysis_example.cfg`: "explore
  and give evaluations to a greater variety of moves"). For play it is 0.0. The browser's module embeds the engine's
  `analysis_enclosure.cfg`, which sets 0.0 ("playing games"). A `load_model` request's `settings` can change it
  without a change to the engine. The engine repository is moving its bots to KataGo's GTP engine, KataGo's way to
  play, and keeping `analysis_enclosure.cfg` for analysis only (in progress there). Read that file's settings again
  when it lands. KaTrain also offers extra analysis on request: "equalize" gives every candidate as
  many visits as the top move, "sweep" searches every legal move, "alternative" looks for moves beyond the
  candidates (`analyze_extra`, `core/game.py`). To decide: whether the review searches with 0.04, which changes every
  value, so the label budget (256) would be measured again; and which extra analyses the page offers. It bears on the
  Great label below, on the board's candidates, and on the engine's lines for bad edges.
- **Great is too frequent late in a game:** in the sample game almost every late move is Great (the first choice,
  with the second at least 10% of win chance worse: En Croissant's rule), each with a comment line in the move list.
  Tighten the rule, or drop the comment line for Great. A likely cause: the second choice's value comes from the same
  search, and it often has few visits, so its value is unreliable. A proposal: call an edge the only good one only
  when the second choice has enough visits (the board's rule: 15% of the most visited move's), or measure first how
  many Great labels have a second choice under that share.
- **Learning from mistakes:** not a tab. Make it a mode of the Analysis panel, above the move list, as Lichess's
  "Learn from your mistakes" is, started from the Highlights button too. Make it teach. After a solve, play out the
  engine's line. Show what the game's edge allowed (the opponent's region, the points). Offer a hint before the
  solution (the area at stake). Judge a tried edge as the review judges a game's edge: when it is not a candidate
  with enough visits, play it and search the position after it (Lichess shows "Evaluating your move…" and runs the
  engine on the new position). Today an edge the engine did not search gets "The engine did not consider it", and
  an edge with few visits gets a noisy verdict. Puzzles need the same.
- **Move input** (puzzles, retries, lessons): use the engine's rules. Today any point can start an edge and nothing
  checks cuts or protection. After the first point, show where an edge may go: meaf.us draws a dashed box of the reach
  and a ghost edge that shows whether the current choice is legal. Constellation highlights the points that complete a
  legal edge. Either works. The engine's `describe` gives the legal edges, and `play` checks one.
- **Sound:** sounds for moves, to make play more satisfying. To design: which events (an edge placed, a cut, a region
  closed and scored, a label for a mistake, a puzzle solved or failed), a sound set with its licence, a switch to mute
  it, and no sound before the player interacts (browsers block it).
- **Using the review page's space** (design 06): with the board large and three columns, look again at the
  Advantage chart's place and size (under the board, below the fold today), and at what the summary column shows
  besides the Highlights.
- **The notation, described for players:** Home names the turn labels and the edges in one line. Write a full
  description of the record (turns, edges, the cut mark `x`, `pass`, results, comments, branches) on a page of the
  site, from the engine repository's `docs/design/04-notation-and-protocol.md`, and link it from Home and `/import`.
- **The engine's protocol 0.2** (the engine repository's commit `c168502`, a module build in its
  `runs/wasm/v2/engine-dev/`): it reads the cut mark in `moves` and `play`, and adds `chooseMove` and `seed`. Before
  1.0 any version may break a client, and the site accepts only 0.1 (`PROTOCOL` in `src/lib/engine/protocol.ts`). To
  move: pin the new build in `engine.lock.json`, read its changes, and set `PROTOCOL` to 0.2. Needed for bots, or for
  sending the marks.
- **One search tree across a game:** the notes are in
  [research/02-search-tree-reuse.md](../research/02-search-tree-reuse.md). Not needed for the first release. Decide
  later.
