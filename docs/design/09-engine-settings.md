# The engine's settings

**Status:** in force, built in the review. **Decided:** 2026-10-11, from Lichess's and KaTrain's engine settings and
measurements in Edge.

## Context

The review searches every position on the visitor's CPU (design 02, design 05). Its budgets were fixed: the sweep at
32 visits, the label pass at 256, the position on screen and the key moments at 1,024 (the key moments now go one
doubling past the review's depth: below), a pool of half the machine's
cores (1 to 4 workers), and the network b10c128. Machines differ. On a fast desktop one worker of b10c128 searches
about 70 to 90 visits a second, and b15c192 is three times slower ([decisions/engine.md](../decisions/engine.md)).
A visitor on a laptop can want less load, and a visitor on a fast desktop can want deeper searches.

Published tools give these settings:

- **Lichess** (`ui/lib/src/ceval/view/settings.ts`, `ctrl.ts`): the engine box at the top of the analysis column has a
  switch that turns the engine on and off (also the l key), and a gear that opens its settings: the choice of engine,
  a search time (2 to 30 seconds, and 60, 120, 300 and no limit on a desktop, 8 seconds by default), the number of
  lines, threads (by default the cores, less one when their number is even) and memory. The display settings are in a
  separate menu (☰) under the move list.
- **KaTrain** (`config.json`, `engine`): `max_visits` 500, `fast_visits` 25, `max_time` 8 seconds, and the network. A
  search stops at its visits or its time, whichever comes first. Continuous analysis searches on until stopped.

## Decision

The engine has its own controls in the engine header, as in Lichess's engine box. The header has two lines. The first
line has the engine's switch, the search's bar with its visits, and the engine's gear. While the network loads, the line
says "Loading the engine's network…" in the place of the visits (design 06, item 7). The second line has the values (the
expected final margin and the lead) across the column's whole width. The settings are kept in this browser, and each
applies at once, without a reload.

1. **The engine's switch** is at the first line's left, and the e and l keys work it too: l is Lichess's, and e, for
   "engine", is the site's own (Lichess's e opens its opening explorer, which this site does not have). The switch's
   note names no key: the list of keys ("?") does. Off, the running searches stop, no search starts, and what was
   found stays, also the result so far of a stopped search. Results in the browser's store still load. The review's
   bar says "Engine off. The review is paused." and has no moving gleam.
   On, the work not done starts again. On by default, and kept between visits, as on Lichess.
2. **The engine's gear** is at the first line's right. It opens "Engine settings" under the header, in the place of the
   candidates and the move list, so the header's values and search bar stay in view while a setting changes. The
   likely edges' meter (design 14), under the values, is hidden while the panel is open: it says nothing about the
   settings. The values stay, since a change of depth shows in them as the search goes on. The gear,
   Escape and "Done" close it. "Done" is right after the last setting, a little below it, away from the gear. The
   display settings, opened from the bottom, have their "Done" at the top: each panel's "Done" is at the end away from
   the button that opened it, where the eye ends after the last setting. The display settings move to a
   menu button (☰) in the step controls' bar, Lichess's button in that place, so that the page has one gear. One panel
   shows at a time.
3. **Three groups,** each setting with one short line of help:
   - **Position on screen:** "Depth", its visits, from 256 to 16,384 (1,024 by default, as before).
     "Time limit": the search stops at this time even short of its visits (KaTrain's `max_time`: whichever comes
     first). The steps are Lichess's search times from 10 seconds (10, 20, 30, 60, 120 and 300 seconds, and none),
     and 30 seconds by default. A search stopped at its limit shows a full bar and "time limit" after its visits. The
     position is not searched again for the same settings, and is searched again when the depth or the limit changes.
     - **Deeper than the review, it updates the review there.** Each position keeps the deepest result it has, so the
       position's labels, the report's counts and accuracy, and the chart follow the deeper search as it runs. A review
       opened again, or imported, takes the deepest stored result of each position too (`cacheGetAtLeast` in
       `packages/analysis/src/cache.ts`), so it opens as the player left it. The Depth's help line says so ("Deeper than
       the review, it also updates the review there: the labels and the report."), and the report says how many of the
       game's positions have a result deeper than the review asked for (the review's depth, or 1,024 visits for a key
       moment). With the depth at most the review's, nothing changes: the review's own result is the deepest. Design 16
       has every depth together, with examples.
   - **Game review:** "Depth per move", the label pass's visits for each position: Lite (512), Standard (1,024), or
     Custom, which shows its visits from 256 to 16,384, the Depth's range. Lite by default. An edge gets its label
     from 256 visits on at every depth. A label search shows its result at 256 visits, and again after each further
     256, so a label shows as early at every depth and changes as the deeper search goes on. The key moments go one
     doubling deeper, to twice the review's depth (`momentVisits` in
     `packages/analysis/src/analysis.svelte.ts`): Lite's 512 gives 1,024, Standard's 2,048, a custom 16,384 gives
     32,768. So the moments that matter most get a surer search at every review depth. They stayed at 1,024 when the
     depths became settings, so a review at 1,024 or deeper gave them no more than any position. A branch move evaluated
     on request is searched to the review's depth.
   - **A game that keeps its own settings** (an imported review file's or a shared link's game, design 13) reviews with
     its own network and depth per move. The panel says so, shows the game's two, and changes the game's when they
     change. The settings kept in the browser serve every other game. A game's network can be an earlier one, which the
     Network setting does not offer (below): the panel's note then names it, and a network chosen there reviews the
     game again. The game keeps only the visits of its depth per move. While the page is open, the panel shows the
     depth per move as the player chose it, so Custom at Lite's 512 visits stays Custom with its row. When the page
     opens, the visits give it: 512 shows Lite, and the review is the same (`withOwn` and `changeOwn` in
     `src/lib/analysis/engineSettings.ts`).
   - **A game whose last review used an earlier network** with the browser's settings keeps that review's network and
     depth per move as its own, as a game from a review file does (`ownSettings` in
     `src/lib/analysis/engineSettings.ts`). So it opens at once with that review's results, its branches and Evaluate
     quality, and it exports. The game's review mark (design 13) holds the two, and the game stores no settings. A
     change of its depth lasts while the page is open, and a deeper review that runs to its end moves the mark. The
     panel's note names the earlier network. A network chosen in the Network setting gives the game the browser's
     settings and reviews it again with that network. Until that review runs to its end, the mark names the earlier
     network, so the game opens with the earlier review on the next visit.
   - **Engine:** "Network", named by the engine's release and by its download: "HedgeFund 0.2 Lite (6.5 MB)"
     (b10c128, the default) or "HedgeFund 0.2 (20.6 MB)" (b15c192). The names come from the release's manifest
     (`displayName`, copied into `engine.lock.json`), as the sizes do. A name belongs to one network file for life (the
     engine repository's `games/enclosure/docs/design/20-network-names.md`). The help line gives the parameters (3.2M
     and 10.3M) and adds that a network downloads once. In a narrow panel the label breaks only before the parenthesis
     ("HedgeFund 0.2 Lite" over "(6.5 MB)"): no-break spaces hold each part together.
     - **The earlier networks,** HedgeFund 0.1 Lite and HedgeFund 0.1, are off the menus, and the site still ships them
       (`engine.lock.json` keeps their files): a game, a review file, a shared link or a Practice game that names one
       still loads it (`shipsNetwork` in `src/lib/analysis/engineSettings.ts`). Settings kept in the browser with an
       earlier network take the default. So a review file exported before, and a review that a partner site kept, open
       with their results (design 13, design 20).

     The board keeps the old pool's rules while a new pool loads the other network. Then the analysis starts again,
     since every result came from the old network. The browser's store keys results by network, so a network's results
     come back at once when the player returns to it. "Workers": from 1 to the machine's logical cores, half the cores
     (1 to 8) by default. On a laptop of 12 cores each worker kept 86% of one worker's speed up to 8 workers, so a cap
     of 4 left about a third of the speed unused (decisions/engine.md, "Speed on a laptop: the engine lab's sweep").
     Half the cores leaves room for the page and the visitor's other work, and 8 workers of b10c128 take about 0.75 GB.
     The help line says that each worker uses more of the computer's memory, and asks the player to mind it: it gives no
     number, because a worker's memory depends on the browser and the network. A change adds workers, which load the
     network and then take work, or removes them: a free worker ends at once, a busy one when its task ends.
     **An idle review keeps no search engine:** after a minute with no search (15 seconds in a hidden tab), the
     review ends its workers and the GPU worker, and keeps the rules worker, so that the board still answers at once.
     The next search starts them again, in about a second (`releaseWhenIdle` in `packages/engine/src/pool.ts`). The
     page keeps the network's checked file, so the new workers do not download or check it again (`checked` in
     `packages/engine/src/client.ts`).
     The work in progress goes on. "GPU": Auto, On or Off, Auto by default. The GPU searches many positions at once
     beside the workers, and Auto keeps it where its first-use test finds it faster than a worker
     ([design 15](15-gpu.md)). The help line gives its first download for the chosen network, and says that it uses
     more memory while it searches, with no number: the GPU's share depends on the graphics card and its driver. A line
     under the choice gives its state and the test's two speeds.
4. **Sliders** set the values in steps, as Lichess's engine settings do. The value shows at the right of the name as
   the slider moves, and the setting changes when it is let go, so that a drag does not restart the search or the
   workers at each step.
5. **A number of visits has a slider and a box:** the Depth and the Custom depth. The slider steps by doublings (256,
   512, 1,024 and on to the largest). The box at the right of the name takes any whole number in that range, and a
   number out of the range becomes its nearest end. The setting changes when the box is left or Enter is pressed. The
   slider then shows the doubling nearest the number, by ratio: 3,000 visits show at 4,096.

## Why

- **The engine's controls in its own header,** as on Lichess: turning the engine on and off is a main action, and the
  engine's settings are about the search that the header shows. The controls and the bar take one line, so that the
  values below have the column's whole width.
- **Doublings on the slider, any number in the box.** A search's time grows with its visits, so each doubling doubles
  the time, as the Depth's steps always did. Doublings are the numbers that the presets and the measurements use (256,
  1,024). The box gives any other number without many steps on the slider. KaTrain's `max_visits` is a free number
  too.
- **Visits first, time as a limit.** The labels and the engine's lines depend on the visits. A search by time gives
  different results on different machines. The time limit only bounds the wait and the load on a slow machine or with
  b15c192. KaTrain does the same.
- **16,384 visits at most.** Each visit adds a node and its network output to the worker's memory, and a WebAssembly
  memory does not shrink. Measured in Edge (engine lab, b10c128, the position after edge 40): 16,384 visits in 207
  seconds (79 a second), and the worker's memory then at 162 MiB, against 95 MiB after the network loaded. That is
  about 4 KB a visit. Any worker can take the position on screen, so in time each worker reaches that size. A step
  more (32,768 visits) would take about 7 minutes on this machine.
- **The custom depth goes as deep as the Depth,** 16,384 visits. Each doubling doubles the review's time: reviews at
  4,096 visits took about 54 minutes on 9 to 16 cores, so a review at 16,384 takes about 3.6 hours there. Its key
  moments go one doubling deeper, to 32,768 visits, the site's deepest search. At about 4 KB a visit, a worker that
  searches one grows to about 230 MiB with b10c128, against 162 MiB at 16,384. That is an estimate from the
  measurement above, not a measurement of a review at 16,384 visits.
- **A time limit of 30 seconds** departs from the 8 seconds of KaTrain and Lichess. KaTrain's 8 seconds go with 500
  visits on a native engine. In the browser, 1,024 visits of b10c128 take about 11 to 21 seconds on a fast desktop,
  so 8 seconds would cut the default depth on most machines. With 30 seconds, a fast machine reaches 1,024 visits,
  and the limit bounds a slow machine or b15c192 (704 visits in 30 seconds, measured in Edge).
- **The page stops a timed search.** The protocol's `maxTime` does not apply to a search in slices (the engine
  repository's [design 04](https://github.com/abstractclass-org/engines/blob/main/docs/design/04-notation-and-protocol.md),
  "Fields for bots"). The page sends `terminate` at the limit, counted from the search's start, not from its wait in
  the queue.
- **Lite is 512 and Standard 1,024:** under protocol 0.3, after the opening, 256 visits finds only 42% of the
  mistakes that 1,024 visits finds, and 512 visits finds 67%, with 80% of its flags right ("Label agreement against
  search budget, under protocol 0.3" in [decisions/engine.md](../decisions/engine.md)). A review exists to show the
  player's mistakes, so Lite takes the budget that finds most of them. KaTrain analyses a move with 500 visits
  (`max_visits`). 1,024 is the reference of that measurement. Standard takes about twice as long as Lite. Custom
  starts at 256, because an edge gets no label under 256 visits.
- **Lite by default:** a new visitor gets labels that find most mistakes in half of Standard's time, and a visitor
  who wants surer labels can choose Standard.
- **Labels from 256 visits at every depth:** no label disappears when the review becomes deeper, and a deeper review
  shows its first labels as soon as a review at 256 visits would. A label changes when a deeper result arrives, as it
  does when the label pass replaces the sweep (design 05). The slices of 256 cost one more reply each, not more
  visits: a search in slices gives the same result as one search.
- **Networks by the engine's names** (as Lichess's menu names "Stockfish 17"): the engine repository names each network
  file, so a name is the same on the site, for the bots and in the players' talk, and changes only with the file
  (requests/12-network-names.md). The parameters (the trainer's counts, 3.22M and 10.25M, in the engine repository's
  `games/enclosure/docs/design/15-network-sizes.md`) stay in the help line: a size says what differs. The help line
  does not call the larger network stronger: it is stronger for each visit, but the smaller gets about three times the
  visits in the same time, and only a match at the site's clock tells which is stronger (the engine repository's
  `games/enclosure/docs/decisions/build.md`).
- **The download in the network's name:** what a change of network costs, which matters on a metered connection.
  Lichess's engine menu gives each engine's size: its default Stockfish network is a small one made for the download
  (7 MB), and the official one (40 MB) is a choice. Nothing asks before the default network downloads: a review is
  the engine's work, and the player opened it. A first review downloaded the module and the small network once for 8
  workers (1.3 and 6.5 MB, measured on a server that logged the requests), and a return visit only the 1.2 KB manifest:
  the browser keeps the engine's files (docs/hosting.md, the headers).
- **More workers make the review faster, not the position on screen.** Each worker searches its own positions with
  one thread (design 02).

## Alternatives

- **The engine's settings as a group of the display settings:** built first. The switch was then two clicks away, and
  the settings hid the header that shows their effect.
- **The switch and the gear at the two sides of the values,** with the bar under the values: built first. The values
  then had only the width between the controls, and wrapped onto two lines.
- **Custom steps in half doublings** (256, 384, 512, 768, 1,024 and on, each step about 1.4 times the last): built
  first, as a choice of this site, not from a published tool. Half of its numbers looked odd, and the box now gives
  any number between the doublings.
- **Steps of 256 visits:** each step adds the same time, but most of the numbers look odd too (1,280, 1,792), and the
  Depth's slider would have 64 steps.
- **A search time only** (Lichess's way): results would differ between machines.
- **Visits only:** a deep setting on a slow machine would run for minutes with no bound.
- **No limit on visits** (Lichess's infinite search, KaTrain's continuous analysis): the worker's memory would grow
  without a bound.
- **A search that goes on where it stopped:** a search's tree lives in its worker only until the search ends, and
  KataGo's analysis does not keep a tree between queries. So a new search of a position starts from zero, and its
  result shows only once it has more visits than the one held. A short time limit can then add little to the label
  pass: with 16,384 visits and 5 seconds, a position at 256 visits stayed at 256.
- **Threads inside one search** (Lichess's threads): they need `SharedArrayBuffer` and headers that many static hosts
  cannot set (design 02).
- **The GPU** (WebGPU, in the browser): the network's evaluations, nearly all of a search's time, could run there. It
  is an engine change (a WebGPU backend for the fork, and a module that can wait for the GPU's answers), so it is for
  the engine repository. A GPU gains most from batches, and one search on one thread asks for one evaluation at a
  time. Measured by the engine repository ([requests/06-webgpu.md](../requests/06-webgpu.md)): one position at a
  time gains nothing for b10c128 and about 2 times for b15c192, and batches of 8 to 32 gain 6 to 27 times. So a GPU
  setting waits for a module that evaluates in batches. When it comes, the page tests both modules on the visitor's
  machine the first time and turns the GPU on by default only where it is faster. This goes past the published tools,
  which choose a backend from a fixed order of preference (ONNX Runtime Web's execution providers, TensorFlow.js's
  backends) or from the browser's features (Lichess's engines). It follows this site's rule of measuring on the real
  machine.
- **Lichess's memory and lines settings:** the engine's cache size is set by its configuration, and the candidates
  table already shows every candidate.
- **Lite at 256 visits:** built first, from the measurement under protocol 0.2 (58% of the mistakes found after the
  opening, 67% of flags right). Under protocol 0.3 it finds 42%.
- **Free budgets for the review's passes:** the label bands were measured at 256 visits. Presets keep the labels
  comparable, and Custom stays at 256 or more.

## Consequences

- Workers cost memory: 95 MiB each with b10c128 and 244 MiB with b15c192 after loading, and about 4 KB more for each
  visit of their deepest search. Sixteen workers of b15c192 use about 3.8 GiB before any search. A tab holds them only
  while it searches: an idle review tab holds about 150 MB (decisions/engine.md, "A review's memory"). The page
  also keeps the checked file of each network that it loaded, for as long as it is open: 6.5 MB for HedgeFund 0.2
  Lite and 20.6 MB for HedgeFund 0.2 (decisions/engine.md, "The network checked once for a page").
- More workers than free cores do not fail: they share the cores, so each runs slower and the review gains little
  (decisions/engine.md: 8 workers on 8 busy cores ran at 39 visits a second each, against 72 for one). The page
  competes with them too. The limit is memory: on a machine short of it the browser can end the tab.
- Another network searches the whole game again, which takes minutes. Returning to a network is quick.
- A Standard review takes about twice as long as a Lite one. A Lite review takes about twice as long as it did at 256
  visits, but a position's first label comes at 256 visits, as before. A custom review at 16,384 visits takes 32 times
  as long as a Lite one.
- A review in a hidden tab still runs slowly (decisions/open-items.md).

## Where it is

- `src/lib/analysis/engineSettings.ts`: the settings, their steps and defaults, and their storage.
- `packages/analysis/src/analysis.svelte.ts`: `setPaused`, `setReview`, `setDepth`, `dropAnalysis`, `usePool`, and the
  time limit in `search`, which the search's worker keeps (`packages/engine/src/channel.ts`, `searchInSlices`).
- `packages/engine/src/pool.ts`: `resize` and `halt`. `packages/engine/src/client.ts`: `Stopped`, for the requests of an
  ended worker.
- `packages/analysis/src/session.svelte.ts` (`EngineSession`, for the review and the Analysis board): the settings
  applied as they change, another network's pool, and the GPU (`GpuControl`, design 15).
- `src/lib/review/ReviewView.svelte`: the engine header's switch and gear, the e and l keys, the `engineSettingsPanel`,
  `steps` and `visitsSteps` snippets, and "time limit" in the header.
- `src/routes/lab/engine/+page.svelte`: a single search's memory, for the measurement above.

## Log entries

- [decisions/product.md](../decisions/product.md), "The engine's settings", "The engine's switch and gear in its
  header" and "The engine header in two lines, boxes for visits, a slower gleam".
- [decisions/product.md](../decisions/product.md), "The networks' downloads in the engine settings".
- [decisions/product.md](../decisions/product.md), "The review's custom depth up to 16,384 visits".
- [decisions/engine.md](../decisions/engine.md), "The release d6786eba: HedgeFund 0.2".
