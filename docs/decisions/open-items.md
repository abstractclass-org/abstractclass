# Open items

**The one backlog:** all work still to do that is not in flight. What is in flight is in
[../handoff.md](../handoff.md), and nowhere else.

Rules:

- An item stays here until it is done. Then remove it, and write its result in its topic file.
- When work on an item starts, move it to the handoff. If the work stops unfinished, move it back here.
- Add new items at the end of their group.

## Foundations

- **Cloudflare's weekly Web Analytics summary:** an email each week with the visits, the pages and the speed
  (**Observability → Alerts**, the type "Web Analytics Metrics Update"). Not set yet. It saves a visit to the
  dashboard, at the cost of one more email each week (hosting.md, section 6).
- **Broken links among the scanners' 404 answers:** scanners get most of the 404 answers (hosting.md, "How to read
  the numbers"), so a broken link of the site hides among them. A 404 answer whose referrer is the site's own address
  is a broken link. Find whether a Cloudflare alert or a saved query can select these answers. Optional: a custom
  firewall rule that blocks the scanners' paths (`.php`, `/.env`, `/wp-`). It only makes the error charts quieter.
- **Cloudflare's managed `robots.txt`:** the live `robots.txt` starts with Cloudflare's managed lines, before the
  site's own. They give `Content-Signal: search=yes,ai-train=no,use=reference` and disallow the AI training crawlers
  (GPTBot, ClaudeBot, Google-Extended and others). They also disallow GoogleOther, Baiduspider and PetalBot. Decide
  whether to keep them (design 23).
- **`scripts/measure/budget-collect.mjs` does not run:** it imports `src/lib/engine/module.ts`, which no longer
  exists. Move it to `scripts/node-engine.mjs`, which runs the CPU module in Node, or remove it if its measurement is
  done.

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
- **A study, as Lichess's Study:** keep the player's notes on the board (rings and lines) and comments on moves with
  the game, and export them. The notes are for the visit only now, and no export holds them. The notation has room for
  them in comments, as Lichess writes `[%csl]` and `[%cal]` (the engine repository's design 04 would define the
  commands).
- **The GPU on other machines** (design 15): measure the GPU worker against a CPU worker on a laptop's integrated
  GPU, on a phone, and on a quiet desktop. On a phone, also its memory (16 searches at about 13 MB each) and its
  first download (13.7 MB with Lite).
- **A worker's memory with the build 632f2a0:** its CPU module frees the network's bytes after it loads them. The
  Workers setting's help line gives 100 MB a worker with Lite and 255 MB with the larger network (design 09), measured
  on earlier builds. Measure again in the engine lab, and correct `NETWORKS` in `engineSettings.ts`.
- **Stored analyses that no review reads:** a change of the stored shape (`SHAPE` in `analysis/cache.ts`) or of the
  engine's build leaves the older analyses in the browser, and nothing reads them again. In the owner's Edge, 2,796
  of 4,607 analyses were of older shapes (decisions/product.md, "Deleting a game, and the browser's storage"). Remove
  them, for example when the site starts with a new shape or build.
- **A search stopped at its time limit, kept** (design 16, example 6): the store keeps finished searches only, so a
  deeper look that stops at its time limit changes the review while the page is open, and not after it opens again.
  The store could keep it under the largest budget its visits reach (2,600 visits as 2,048). A small gain, if any.
- **A share link with the sender's deeper looks** (design 16, example 9): at the positions the sender searched deeper,
  the recipient's labels are the review's own until the recipient looks there as deep. The link holds no results, and
  a review file carries them. A small gain, if any.
- **The Review tab before the page's code runs:** the prerendered `/review` has the Review tab's title and
  description (design 23), but its body shows only "Reading the game with the engine's rules…". At build time, the
  page cannot know whether the address names a game. When the code runs, the Review tab shows only after its games
  are read (`ready` in `ReviewHome.svelte`). The usual fix, as the theme's script in `src/app.html` does:
  1. Prerender the Review tab's fixed parts: the heading, the text, the import form and the footer.
  2. A short script in the page's head marks an address whose `#` part names a game (`#game=`, `#record=` and the
     other forms in `src/lib/game/importHash.ts`) before the first paint. CSS then hides the Review tab for it.
  3. The same script reads whether a last review is kept (`learn-enclosure:last-review:1`), and CSS keeps the room
     of "Continue your last review".
  4. Remove `ready`.

  The game cannot go in the address's path: the game's id stays after `#`, so that no server gets it (designs 17
  and 22).
- **Start the rules worker with the page:** the review reads the game, then the lock, then the engine's manifest (60
  to 100 ms in all), and starts the rules worker only after them. The worker needs only the manifest, and no document
  gives a reason for the order. Read the three at the same time, and start the worker when the manifest is read.
  Measured in Edge on the local build, on a loaded desktop.
- **The review's first frame:** the page draws the review in one task of 109 to 144 ms (the same measurement). A
  click during it waits, which counts against the page's responsiveness (INP). Draw a part, such as the move list, in
  the next frame, to split the task.
- **A search's final results in the batch:** only the partial results wait for the batch of 100 ms (`PARTIAL_MS` in
  `analysis/game.svelte.ts`). Each final result applies at once, and runs the review again. The sweep sends about 100
  of them in its first seconds. Put them in the batch too: keep the deeper result of a position, and update the
  passes' progress there. Count the long tasks of a sweep of a long game before and after.
- **The network checked once for a page:** each CPU worker fetches the network and checks its SHA-256, and the GPU
  worker again, at each start, each change of network and each start after an idle release. Check it once in the
  page, as `compile` in `engine/client.ts` does for the module, and measure the start before and after.
- **A search waits for its result's write:** `search` in `analysis/game.svelte.ts` waits for `cachePut`, so an engine
  takes its next search only after the write commits. Measure the gaps between a sweep's searches, then decide.
- **The snapshot's scan of the stored keys:** a snapshot opens after `snapshotSearch` reads every key of the analysis
  store, and the store grows with each result. Keep the review's search in its mark (`game/store.ts`), and read the
  exact keys.
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
  `EdgeInput` each lesson step's legal edges and the mover's nodes from the engine's `describe`, as the puzzles do
  (decisions/product.md, "Edge input on the engine's rules, in the puzzles"). A lesson's position may need the
  `position` field of the query.
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
  to 3,374 against the site's 3,134, and b15c192 3,694), and need a new module ([engine.md](engine.md), "The engine
  repository's notes"). When the rise settles, decide whether to request one.
- **Play settings:** `chooseMove` searches with the analysis settings, not the GTP bot's. The practice bot (request 15)
  plays with the GTP bot's settings: where the site shows the engine's move, it can use the bot.
- **Practice's levels** (design 24): named levels from the engine repository's visit ladder on the practice module,
  which it gives later, then from games by setting. Check the Medium and High variety against those games.
- **Practice's checks still to run:** the one-thread bot in a browser without JSPI, a whole game played on the
  board, the Analysis board's Play with moves on screen, a phone, and the layout below 800 pixels.
- **Export a review:** the game's record with each position's evaluation (the record's `[%eval]` comments), the
  labels, and the branches as variations, so that a review can be kept and shared. The sample game needs none: the
  engine is reproducible, so the same build and network give the same review.

## Hedge School's place (design/19-position.md)

- **The licence of the engine's networks:** decide what a play site may embed. If the strongest network is free to
  embed, a play site's analysis can equal Hedge School's. Choices: all networks open, the older ones open and the
  newest kept for Hedge School, or none. The engine's terms belong to the engine repository (request 14): decide
  there.
- **An open database of enclosuregame.com's games,** as Lichess publishes its games: wait to see whether
  enclosuregame.com publishes one. If it does not, propose it: its games become puzzles that its players train on.
- **Accounts through a partner's sign-in,** in the place of Hedge School's own: ask the partners when a feature first
  needs accounts.
