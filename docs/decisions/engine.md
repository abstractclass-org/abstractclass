# The engine in the browser

Loading the engine, its speed, the engine interface, and the requests for it.

### The current module in a Web Worker, and the time a position (2026-10-09)

- **What:** the engine lab (`/lab/engine`) loads the engine repository's b10c128 module
  (`v2-b10c128-s46923648-d9407005`, Meridian ABI 1) in Web Workers behind the WASI imports, sends Constellation's
  analysis request, and shows the candidates and Blue's win chance. It reviews a whole game: every one of its 120
  positions, at a fixed budget, spread over a pool of workers.
- **The workload:** one game of 120 edges from the engine repository's visit ladder (b10c128 at 256 visits as Blue
  against 512 visits as Red, 3,405 to 3,465). Bots played it, so it holds no person's moves.
- **The machine:** AMD Ryzen 7 9800X3D (8 cores, 16 threads), Chrome (V8), the production build served on localhost.
  The engine repository's self-play used the CPU at the same time (load average about 32 in WSL), and the load
  varied. So these numbers are lower bounds for this machine, not a visitor's speed.
- **Loading** (b10c128): compile 40 ms, instantiate 1 ms, first request 225 ms (the engine's set-up and the network
  read). The first search ran at 47 visits a second, because V8 starts the module with its baseline compiler and
  optimizes it while it runs. Later searches ran at about twice that speed.
- **One worker, the whole game at 128 visits, in Chrome:** 168 s. A position: mean 1.40 s, median 1.27 s, slowest
  2.85 s. 92 visits a second. Node gave 89 visits a second on the same requests, so Chrome adds no cost.
- **A pool of workers** (Node worker threads with the same requests, because the Chrome tab was hidden, see below):

  | Workers | Whole game at 128 visits | Visits a second, each worker | Visits a second, in all |
  |---|---|---|---|
  | 1 | 213 s | 72 | 72 |
  | 4 | 81 s | 48 | 189 |
  | 8 | 51 s | 39 | 303 |

  More workers share 8 busy cores, so each worker slows down. The machine's load was heavier during these runs than
  during the run in Chrome.
- **b15c192** against b10c128, one instance, the same 20 positions at 128 visits (Node): 23.1 against 68.6 visits a
  second (3.0 times slower). Memory: 244 MiB against 95 MiB of linear memory an instance. First request: 584 ms.
- **The cost of the legal-move list:** the module needs the site's legal moves in each request, and the site has no
  rules engine, so it sends all 17,328 move IDs. At 1 visit a request took 38 ms with the full list and 34 ms with one
  ID. So the list costs about 4 ms a request, small next to 1.4 s at 128 visits.
- **A hidden tab is slow:** with the tab hidden, 4 workers reviewed about 20 positions in 2 minutes, slower than 1
  worker in a visible tab. Chrome lowers the priority of a hidden tab's process, and the busy machine then starves
  its workers. A visitor who switches tabs during a review can see the same.
- **Reading:**
  - At 128 visits a whole-game review takes about 1 to 3.5 minutes on this machine, by the number of workers.
    Each doubling of visits doubles the time. So a deep review in the browser (512 visits and more) takes many
    minutes, and the budget is a product decision.
  - The engine itself costs nearly all of the time. The browser, the interface and the request add little.
  - Memory limits the pool on small machines: 8 instances of b10c128 use about 760 MiB, and of b15c192 about 2 GiB.
- **Next:** measure on an idle machine and on a typical laptop, and decide the review's budget and the pool size from
  that (the backlog).

### The engine repository answers the requests (2026-10-09)

- **The design pointer:** done in its commit `fb5b28e`. Its `docs/analysis-tool-design.md` now points here.
- **The protocol's needs:** accepted. Its draft design,
  [`docs/design/04-notation-and-protocol.md`](https://github.com/seankao31/enclosure-ai/blob/main/docs/design/04-notation-and-protocol.md),
  covers the notation (points as GTP, edges sorted, a one-line position, a game record) and the protocol.
- **Releases:** accepted, for later. Development uses local builds until then.

### The engine protocol in the browser (2026-10-09)

- **What arrived:** the engine repository built the protocol that request 02 asked for
  ([`docs/design/04-notation-and-protocol.md`](https://github.com/seankao31/enclosure-ai/blob/main/docs/design/04-notation-and-protocol.md)
  there): KataGo's analysis protocol as JSON lines, with the rules as actions (`describe`, `play`), the network
  loaded at run time, search in slices with `continue` and `terminate`, reproducible replies, and the engine tag
  (protocol, build, the network's SHA-256) on every analysis. The module is `enclosure-engine.wasm` (build
  `8195171`, 1.3 MB). Its notation: points as GTP, edges sorted, a position in one line.
- **A correction from the engine repository:** the lead head is trained (since 2026-10-05, on 5% of self-play moves).
  Request 02 had said it was untrained. Whether points-lost labels use `scoreLead` or `scoreSelfplay` is still to
  be measured.
- **Done here:**
  - `engine.lock.json` pins the module and two networks apart: b10c128 (6.5 MB) and b15c192 (20.5 MB). Both load
    into the same module. The Meridian builds (the network inside the module) are gone from the site.
  - `src/lib/engine/`: `module.ts` loads the module behind its few WASI imports, after the engine repository's
    reference driver (`tools/engine_run.mjs`). `worker.ts` runs one instance a worker, requests one at a time, and a
    search in slices: after each slice it posts the results so far and yields, so that a stop can arrive.
    `client.ts` gives the page a promise a request, and refuses a protocol whose major version it does not know.
    `protocol.ts` types the fields the site uses. `notation.ts` converts edges between the notation and the board's
    numbers.
  - The Meridian adapter and the site's move-ID converter are deleted.
  - The engine lab draws the board from `describe` (no network needed), analyses a position in slices with a stop,
    and reviews a whole game over a pool of workers.
- **Checked in Node** (the engine repository's driver): `describe` at the start and after moves, `play` (legal and
  illegal), an analysis refused before `load_model`, slices with `continue`, the policy (109 legal edges in one
  position), the ownership (361 values), an analysis from a position line, and both networks.
- **Checked in Chrome** (the lab, the production build): the board from `describe` in 7 ms with no network, the
  module started in 170 ms, an analysis of 256 visits in slices with live results, and a stop that ended a long
  search at 352 visits. Memory: 87 MiB an instance with b10c128 (the engine repository's figure: about 160 MiB at
  most, with a full cache). b15c192 used 242 MiB in Node. A whole-game review over 4 workers at 64 visits finished
  all 120 positions, at most 95 MiB an instance. Its times (22 visits a second a worker) do not count: the tab was
  hidden on a loaded machine.
- **Found:** an analysis without slices was sent with no `id`, which the engine refuses. Fixed in `client.ts`.

### Label agreement against search budget (2026-10-09)

- **Why not "the same position searched twice":** design 01 sets the labels' noise floor that way. The engine is now
  reproducible (the same request gives the same reply), so two searches always agree. The noise that remains is the
  budget's: how far labels at a small budget stand from labels at a deep search.
- **Method** (`scripts/measure/budget-collect.mjs`, `budget-summary.mjs`): 4 bot games from the engine repository's
  visit ladder (bots at 512 to 2,048 visits, 480 positions, no person's games), b10c128. One search of 1,024 visits a
  position, read after each slice: the result after a slice equals a fresh search of that many visits, so one search
  gives every budget. Each edge's loss and label as the review computes them (`labels.ts`, losses across positions),
  at 32, 64, 128 and 256 visits, compared with 1,024. Great counts as Best (the collector keeps no second candidate).
  The last edge of each game is left out. 476 edges, 48 of them Inaccuracy or worse at 1,024 visits (24 after the
  first 16 edges).
- **Result,** points from the lead, edges after the first 16:

  | Visits | Same label | Mistakes found (of the reference's) | Mistakes flagged that are right | Points lost, mean error |
  |---|---|---|---|---|
  | 32 | 56% | 29% | 27% | 11.5 |
  | 64 | 62% | 29% | 35% | 9.6 |
  | 128 | 64% | 38% | 43% | 8.0 |
  | 256 | 71% | 58% | 67% | 6.7 |

  Over every edge the same order holds (at 256 visits: 70% the same label, 67% of mistakes found, 80% right). Points
  from the margin (`scoreSelfplay`) do about as well, a little worse at 256 visits (65% found, 78% right over every
  edge).
- **Reading:**
  - A 32-visit sweep (KaTrain's budget, 25 visits, is for a much stronger network per visit) cannot label: it finds
    under a third of the mistakes, and most of what it flags is not one. It still gives the game's shape.
  - 256 visits is the first budget whose flags are mostly right, and it still misses a third. The reference itself
    (1,024 visits) is not the truth: a deeper reference (the native engine on the GPU, when it speaks the protocol)
    would tell how far 1,024 stands from it.
  - The lead and the margin measure points lost about equally well. The lead stays (KaTrain's choice).
- **Decided for the review** ([design/05-review-analysis.md](../design/05-review-analysis.md)):
  - The sweep at 32 visits, for the graph only.
  - A label pass of every position at 256 visits. A label shows only when both positions of an edge have it.
  - The position on screen and the key moments deeper, to 1,024 visits.
- **To do:** a deeper reference, more games, and b15c192 (stronger per visit, slower).

### The position on screen first: searches that give way (2026-10-10)

- **Found:** after the label pass, the key moments' deep searches (1,024 visits each) filled the workers, and the
  pool does not stop a running task. On a loaded machine the position on screen waited minutes for its own deep
  search.
- **Found too:** a fast step through the game queued a deep search for every position passed. `focus` dropped the
  waiting focus searches, but each search read the cache first and reached the queue only after the next step's
  drop. After 50 steps, about 50 deep searches waited before the position on screen.
- **Now:** a task that can stop (a search in slices) gives way. When a more urgent task finds no free worker, the pool
  stops the least urgent such task, and that task waits in the queue again (`src/lib/analysis/pool.ts`). The key
  moments' searches run in slices for this. Slices change no result (the engine's search in slices). A stopped
  search starts again from nothing: its tree is not kept.
- **Now:** each focus has a generation. A search for an earlier focus does not start when its turn comes.
- **Now:** a task dropped from the queue rejects with `Cancelled`, which the callers ignore. Before, its promise never
  settled.
- **Checked** in Chrome, on a machine kept busy by the engine repository's visit-ladder match, with the tab hidden:
  with the key moments' searches running, a step through 50 positions, then the position on screen went from 256 to
  1,024 visits in 27 seconds. The key moments went on after it (4, then 9 positions done at 1,024 visits 30 seconds
  later). No engine error.

### The engine module compiled once (2026-10-10)

- **Now:** the page compiles `enclosure-engine.wasm` once (`WebAssembly.compileStreaming`, one promise for each URL in
  `src/lib/engine/client.ts`) and posts the compiled `WebAssembly.Module` to each worker, which only instantiates it.
  Before, each worker fetched and compiled the module itself: four compiles at once for the review's pool, and one
  more for the import's rules check.
- **Measured** in Edge on the engine lab, four workers, five page loads each, from creating the workers until all of
  them answered `query_version` (the lab's new "until all workers started"): before 227, 127, 137, 155 and 209 ms
  (median 155), after 140, 161, 139, 288 and 94 ms (median 140). Inside the slowest worker the start fell from 54 to
  109 ms to 34 to 71 ms. The difference on the page is within the noise: on this machine the workers' own start
  takes most of the time, and the 1.3 MB module compiles fast.
- **Kept** for what this machine cannot show: one compile in place of four at once on a machine with few cores, and
  one copy of the compiled code for all the workers. Measure again on a typical laptop with the speed measurement
  (decisions/open-items.md).

### Protocol 0.3 (2026-10-10)

- **Now:** the site pins the module build `319a5c4` (protocol 0.3, `engine.lock.json`) and accepts only 0.3
  (`PROTOCOL` in `src/lib/engine/protocol.ts`). The network b10c128 is the same file. The engine repository's commit
  `319a5c4` and its design 04 give the changes. 0.2 added `chooseMove`, `seed`, the chosen move's settings in
  `overrideSettings`, a position's turn number from its edge count, and the cut mark `x` read in moves. 0.3 seeds the
  search from `seed`, and makes KataGo's analysis defaults the engine's search settings.
- **Decided: the review keeps KataGo's analysis defaults,** and sends no settings. Root noise is on
  (`wideRootNoise = 0.04`, before 0.0), so more candidates get visits and values: from the start at 400 visits, the
  engine repository measured 251 to 308 visits for the top move (before 377) and 70 to 129 for the second (before
  14). The Great label compares the first choice with the second, and the board's candidates need 15% of the most
  visited move's visits, so both had rested on moves with a handful of visits. The moves before the position no
  longer reach the network (`ignorePreRootHistory = true`), so a position gets the same analysis however it was
  reached: the variations to come need that. The play values stay in the engine repository's play config.
- **The cost:** every value changes, so the label budget (256 visits, "Label agreement against search budget") must
  be measured again under these settings (decisions/open-items.md).
- **Unchanged for the site:** it sends bare moves (the cut mark is optional), no `seed`, and no `history`.
- **Found while checking:** Edge served its kept copy of `/engine/manifest.json`, which named the old build, and the
  site refused the old module ("engine protocol 1.0: this site speaks 0.3"). The preview server sends no cache headers,
  so the browser may keep a copy, and a host can do the same after a deploy. `loadManifest` now fetches the manifest
  with `cache: "no-cache"`, so the browser asks the server each time. The artifacts are in folders named by build and
  network, so they can stay cached.
- **Checked in Edge:** the lab reports protocol 0.3 and build `319a5c4`; two analyses of the position after edge 40 at
  256 visits, without a seed, gave the same reply, row for row; at that position number 1 had 109 visits and the next
  candidates 54, 32, 29 and 17. The review starts afresh (the cache key holds the build), with two candidates on the
  board at the first position. The puzzles' rules work.

### Label agreement against search budget, under protocol 0.3 (2026-10-11)

- **Why:** protocol 0.3 made KataGo's analysis defaults the engine's search settings (root noise on, no moves from
  before the root), so every value changed ("Protocol 0.3").
- **Method:** as in "Label agreement against search budget": the same 4 bot games (480 positions, no person's games),
  b10c128, one search of 1,024 visits a position read after each slice of 32, and the same summary
  (`scripts/measure/budget-summary.mjs`). 512 visits added to the budgets. The data is in
  `runs/measure/budget-b10c128-p03.jsonl` (not in Git). **Checked first:** under protocol 0.3 a search read after a
  slice still equals a fresh search of that many visits (32 and 256 visits, positions 0, 30, 60 and 90 of a ladder
  game, every candidate's visits and values the same).
- **Result,** points from the lead, edges after the first 16 (412 edges; 36 Inaccuracies or worse at 1,024 visits,
  against 24 under protocol 0.2). Protocol 0.2's values in brackets:

  | Visits | Same label | Mistakes found (of the reference's) | Mistake flags that are right | Points lost, mean error |
  |---|---|---|---|---|
  | 32 | 52% (56%) | 25% (29%) | 36% (27%) | 12.7 (11.5) |
  | 64 | 53% (62%) | 14% (29%) | 25% (35%) | 11.9 (9.6) |
  | 128 | 60% (64%) | 28% (38%) | 59% (43%) | 9.7 (8.0) |
  | 256 | 67% (71%) | 42% (58%) | 79% (67%) | 7.8 (6.7) |
  | 512 | 75% | 67% | 80% | 4.9 |

  Over every edge: at 256 visits 67% the same label, 58% of mistakes found, 85% of flags right; at 512 visits 74%,
  75% and 87%. Points from the margin give about the same (after the first 16 edges, at 256 visits: 38% found, 87%
  right).
- **Reading:**
  - At 256 visits a flag is right more often than under protocol 0.2 (79% against 67%), but the flags find fewer of
    the reference's mistakes (42% against 58%). 256 visits still gives flags that are mostly right, and it misses more
    than half of the mistakes after the opening.
  - 512 visits finds two thirds of them with flags right as often (80%), and its points' error is 4.9 against 7.8.
  - The samples are small. After the opening, one reference mistake is about 3% of "found": 42% against 58% is about
    5 mistakes. The reference changed too: 1,024 visits under protocol 0.3 is not the reference of protocol 0.2.
  - A possible cause, not tested: root noise sends more visits to weaker moves, and the root's value averages them,
    so a value at a small budget stands further from the deep one.
- **Decided:** the review's Lite depth searches 512 visits, Standard stays at 1,024, and an edge still gets its label
  from 256 visits on (design 05, design 09). A review exists to show the player's mistakes, and 512 finds most of them
  with flags as often right. KaTrain's analysis of a move uses 500 visits (`max_visits`).
- **To do:** a deeper reference (4,096 visits) and more games (decisions/open-items.md).

### The engine repository's notes: interfaces, tree reuse, play settings, models, WebGPU (2026-10-11)

- **The protocol stays the base.** KataGo has two interfaces: GTP (one stateful session for play and a GUI's
  analysis, streamed and stopped by a command) and the JSON analysis engine (stateless queries, "primarily intended
  for people writing tools", KaTrain's backend). The engine protocol is the analysis engine's JSON with search in
  slices. GTP's streaming needs a second thread, which a WebAssembly worker does not have, and its analysis has Go's
  shape (points, a policy of 361). The engine repository's advice: keep one protocol, and add to it what the site
  wants from GTP.
- **Tree reuse is not built.** The engine's design 04 said it was a query option. Every query clears the tree
  (`Search::setPosition`), as research/02-search-tree-reuse.md says. Design 04 now says so (engine repository commit
  `bf61bdb`). Measured on the engine's GTP bot (b15c192, one thread, about 30 visits a second): the second edge of a
  turn, searched from the first edge's subtree, reaches 1.7 to 2 times the first edge's root visits. Across the
  opponent's turn, with pondering, 5 of 31 first edges kept 400 to 1,100 visits. A request would be a query that
  continues the worker's tree by playing moves, off by default, for the position on screen only, so that the labels
  stay on fresh, reproducible searches. In a review the played move is the player's, so its share of the visits needs
  measuring first (research/02).
- **`chooseMove` is not the bot's move.** It applies GTP's move rule to a search with the analysis settings (root
  noise on, no moves before the root). The GTP bot plays with root noise off and the history on. The site shows no
  engine move today. If it shows "the bot's move" or lets visitors play the engine, it needs play settings (a
  request).
- **Continuous analysis** (a GUI's search until the player moves on) is possible in slices. The site declined it for
  the worker's memory: its tree grows with its visits, and the memory of a WebAssembly worker does not shrink
  (design 09, "No limit on visits").
- **A finished position:** the protocol refuses it (`{"error": "the game is over", "field": "position"}`), since a
  search of it fails an assert in the engine. Checked in this repository: the site never asks for it. The label pass
  searches the positions before each edge, `searchable` leaves out the game's end and a branch's finished position,
  and the key moments leave out the position after the last edge (`src/routes/review/+page.svelte`).
- **Newer models need a new module.** The models exported since data row 12.44M have 4 RGSC heads, which a module
  built before that change refuses. The engine's gauntlet (128 visits a move): the site's b10c128-s46923648-d9407005
  at 3,134 (3,033 to 3,346), the newest b10c128 models 3,286 to 3,374, b15c192 at row 12.84M 3,694 (3,606 to 3,934).
  The rise since row 12.44M has not settled. A stronger model is a request: the engine repository chooses the model
  and builds the module.
- **WebGPU, step 1 of request 06:** the first numbers, on an RTX 5080 with the machine busy, are in
  [requests/06-webgpu.md](../requests/06-webgpu.md). One position at a time gains nothing for b10c128, and batches
  gain 6 to 27 times.

### Speed on a laptop: the engine lab's sweep (2026-10-11)

- **The machine:** an Apple Silicon Mac (WebGPU "apple metal-3"; Chrome names every Mac "Intel Mac OS X 10_15_7"),
  12 logical cores, at least 32 GB of memory, Chrome 154, on battery.
- **Method:** the engine lab's speed sweep: every sixth position of the sample game (20 positions) at 256 visits, for
  each network and 1, 2, 4 and 8 workers, after one short search in each worker. "A Lite review": 120 positions at 32
  and 512 visits, at the speed of all the workers.

  | Network | Workers | Visits a second, all workers | Each worker | A Lite review of the game |
  |---|---|---|---|---|
  | 3.2M | 1 | 66 | 66 | 16.5 min |
  | 3.2M | 2 | 121 | 61 | 9.0 min |
  | 3.2M | 4 | 242 | 62 | 4.5 min |
  | 3.2M | 8 | 386 | 57 | 2.8 min |
  | 10.3M | 1 | 22 | 22 | 48.9 min |
  | 10.3M | 2 | 40 | 20 | 27.4 min |
  | 10.3M | 4 | 76 | 20 | 14.3 min |
  | 10.3M | 8 | 129 | 19 | 8.5 min |

- **Reading:**
  - Each worker keeps 86% to 94% of one worker's speed up to 8 workers, so the speed grows almost in proportion to
    the workers on this machine. An idle desktop (Ryzen 7 9800X3D) gave 72 visits a second for one worker of 3.2M.
  - The default pool (half the cores, at most 4: design 02) gives 4 workers here: a Lite review in 4.5 minutes, 2.8
    with 8 workers. The 10.3M network takes 14 minutes with 4.
  - One fast laptop. A typical laptop has fewer and slower cores.
- **This desktop's sweep at the same time** was loaded by the engine repository's training: 3.2M at 48, 86, 172 and
  264 visits a second with 1, 2, 4 and 8 workers. It is no baseline.

### Label agreement by turn (2026-10-11)

- **Why:** the label moves from the edge to the turn (decisions/product.md, "Labels by turn"). A turn's loss is the
  mover's value at the turn's start less the mover's value after its last edge. The value between its edges cancels,
  and so does the error of that search. This measures whether turn labels agree with a deeper search better than edge
  labels do.
- **Method:** the data of "Label agreement against search budget, under protocol 0.3" (4 bot games, 480 positions,
  b10c128, a reference of 1,024 visits), with no new search. `scripts/measure/budget-summary.mjs --unit turn` gives
  each turn's loss and label with the site's placeholder bands, the same bands as for an edge. A turn is Best when
  each of its edges is the first choice: the collector keeps no line, so the best turn in its other order counts as
  not Best. The game's last turn is left out, as its last edge is. With `--unit edge` the script gives the edges'
  numbers above again (412 edges, 36 flags).
- **Result,** points from the lead, after the first 16 edges: 204 turns, 28 of them Inaccuracy or worse at 1,024
  visits. The edges' numbers in brackets:

  | Visits | Same label | Mistakes found (of the reference's) | Mistake flags that are right | Points lost, mean error |
  |---|---|---|---|---|
  | 256 | 66% (67%) | 54% (42%) | 88% (79%) | 9.6 (7.8) |
  | 512 | 73% (75%) | 64% (67%) | 82% (80%) | 5.8 (4.9) |

  Over every turn: at 256 visits 65% the same label, 63% of mistakes found, 91% of flags right. At 512 visits 72%,
  74% and 89%. Points from the margin give about the same (after the first 16 edges, at 512 visits: 65% found, 85%
  right).
- **The size of a loss:** after the first 16 edges, at 1,024 visits, a turn loses 16.1 points on average and an edge
  10.7. The mean error divided by the mean loss is 0.59 for a turn and 0.73 for an edge at 256 visits, 0.36 and 0.45 at
  512 visits.
- **The bad turns' edges:** of the 28 bad turns after the opening, at 1,024 visits, 5 have both edges bad alone (each
  edge's own loss reaches the Inaccuracy band), 19 have one, and 4 have neither: their loss is spread over the two
  edges. Over every turn: 12, 29 and 5 of 46.
- **Reading:**
  - At 256 visits the turn labels do better: they find more of the reference's mistakes (54% against 42%), and more of
    their flags are right (88% against 79%). At 512 visits the two are about equal.
  - For its size, a turn's loss is more exact than an edge's at both budgets. The cancelled middle search explains
    this.
  - The samples are small. One bad turn is about 4% of "found", so 54% against 42% is about 3 turns. These are bot
    games: people may share a turn's loss between its edges in another way. Request 07 gives both on the archive.
  - The placeholder bands were made for one decision, and a turn is one decision. The archive's fit (request 07) gives
    the turns their own bands.
- **Decided:** the budgets stay. Labels by turn keep 512 visits for Lite, and a label from 256 visits on.

### The search in a turn's middle: turn 9 of the sample game (2026-10-11)

- **Found:** turn 9 of the sample game (edges 16 and 17, J11-M13 then J11-M14, Blue) is Great by turn, but its note
  gave the first edge −27 points and the second 0. At 1,024 visits, Blue's lead is −22 at the turn's start, −49 in its
  middle and −23 at its end: the two ends agree, and the search of the middle alone puts Blue 27 points lower. A turn's
  loss leaves that search out. Each edge's loss uses it. The engine is reproducible, so the sample game keeps this case:
  the same build and network give the same values.
- **Measured** on the budget data (4 bot games, two-edge turns after the first 16 edges), the mover's lead in the
  middle less the mean of the two ends:

  | Visits | The engine's own turns (both edges its first choice, 60 turns) | Every turn (204) |
  |---|---|---|
  | 512 | +4.7, sd 17.3 | +4.7, sd 23.0 |
  | 1,024 | +2.5, sd 15.2 (3 turns at 25 points or more from it) | +3.8, sd 24.6 |

- **Reading:** the middle is not valued lower than its ends: its mean stands within about 2 standard errors of 0, on
  the side of the mover. Its spread, about 15 points at 1,024 visits, is the error of one search. Turn 9's 27 points is
  one such error, near 2 standard deviations, at one position. One position does not show a fault of the network's
  training, and these are bot games: request 07 gives people's games.
- **Also seen, not yet understood:** over the engine's own turns the mover's lead rose from the turn's start to its end
  by 9.6 points on average at 1,024 visits (sd 28.8, standard error 3.7), and 13.4 at 512. Request 07's data will show
  whether turns gain points on average, which would shift every turn's loss.

### Label agreement on the archive's games (2026-10-12)

The first look at request 07's data ([requests/07-archive-analysis.md](../requests/07-archive-analysis.md),
"Delivered"): part 2, 100 archive games of human players, 8,533 positions read at 256, 512, 1,024, 2,048 and 4,096
visits. `scripts/measure/budget-summary.mjs` read the file unchanged, against 4,096 visits as the reference, with the
placeholder bands (design 10). Points from the lead:

| Visits | By edge: same label | Mistake flag found | Mistake flag right | By turn: same label | Mistake flag found | Mistake flag right |
|---|---|---|---|---|---|---|
| 256 | 60% | 85% | 89% | 67% | 90% | 94% |
| 512 | 66% | 88% | 90% | 73% | 93% | 95% |
| 1,024 | 73% | 91% | 94% | 78% | 94% | 96% |
| 2,048 | 81% | 94% | 95% | 85% | 97% | 97% |

- **By turn agrees more than by edge** at every budget, as on the bot games ("Label agreement by turn"): a turn's loss
  is larger, so it stands further from the error of its two searches.
- **The margin (`scoreSelfplay`) in place of the lead** gives about the same agreement (within 1 point of %), and a
  larger mean error of points lost: 17.7 against 16.4 by edge at 512 visits.
- **The placeholder bands flag most human moves:** at 4,096 visits, 4,240 of 8,433 edges (50%) and 3,025 of 4,337
  turns (70%) are Inaccuracy or worse. Of those bad turns, 1,246 have both edges bad alone, 1,607 one, and 172
  neither. The bands are chess's and Go's (design 01, principle 3), and these numbers show that they do not fit
  Enclosure's human play. The fit (decisions/open-items.md, "Label thresholds") sets new ones.
- **Not tested:** the agreement with the fitted bands, which will differ, since fewer moves will be near a band's
  edge or fewer will be flagged. The reference is a deeper search, not the truth.

### The engine's win chance against human results, and what flags the archive's turns (2026-10-12)

Part 1 of request 07 (1,000 archive games), at 512 visits, by turn, points from the lead.

**The engine's win chance overstates how often human players win.** At each turn's start of the 981 games with a
winner (resignations and timeouts included), the mover's engine win chance against the share of those positions whose
mover won the game:

| Engine's win chance | Players below 1600 | 1600 to 1800 | 1800 and above |
|---|---|---|---|
| 0 to 5% (mean 1%) | 6% won | 5% | 7% |
| 5 to 20% (mean 11 to 12%) | 24% | 27% | 20% |
| 20 to 40% (30%) | 33% | 35% | 31% |
| 40 to 60% (51 to 52%) | 45% | 46% | 48% |
| 60 to 80% (69%) | 49% | 53% | 57% |
| 80 to 95% (88 to 89%) | 62% | 61% | 71% |
| 95 to 100% (99%) | 88% | 89% | 91% |

The engine's value assumes that both sides play as the engine does. Human players convert an advantage less often:
where the engine says 89%, they won 61 to 71% of the time. So a loss of 0.20 of the engine's win chance is often a
smaller loss of a human's real chance. Lichess (one curve) and chess.com (from the player's rating and the evaluation)
both turn the engine's value into the win chance of human games before they apply their bands (design 01, principle
2). Each position counts once, so a long decided game weighs more than a short one.

**What flags the archive's turns** with the placeholder bands:

| Mean rating | Turns | Inaccuracy or worse | Flagged by points only | of them, in a game decided (engine under 5% or over 95%) | Win chance lost 0.10 or more | 0.20 or more |
|---|---|---|---|---|---|---|
| All | 42,693 | 72% | 43% of the bad | 41% of the bad | 34% | 23% |
| Below 1200 | 377 | 84% | 36% | 34% | 49% | 41% |
| 1200 | 9,383 | 84% | 42% | 41% | 42% | 32% |
| 1400 | 10,046 | 80% | 40% | 39% | 41% | 29% |
| 1600 | 10,243 | 74% | 41% | 39% | 36% | 25% |
| 1800 | 9,624 | 57% | 49% | 46% | 21% | 12% |
| 2000 and above | 3,020 | 47% | 52% | 50% | 14% | 7% |

- Almost every turn that only the point bands flag is in a game the engine already calls decided. chess.com and
  Lichess judge by win chance so that moves in a decided game are not flagged. The point bands (KaTrain's Go points
  times 12) bring that problem back.
- Losses fall as the rating rises, by both measures: the check that design 01's first milestone asks for.
- Not tested: how many turns a human win chance would flag. The win band alone flags 34% of turns at 0.10 of the
  engine's win chance, and the table above suggests that a human curve gives smaller losses.

### Guid and Bratko's complexity on the archive (2026-10-12)

Guid and Bratko ("Computer analysis of world chess champions", ICGA Journal 2006) score a position's complexity so:
search it at depths 2 to 12, and each time the best move differs from the previous depth's, add the gap between the
best and the second-best moves' values. They found that players found the best move more often where the gap was
large. Here the depths are the archive's readings: 256, 512 and 1,024 visits (part 1), and up to 4,096 (part 2). The
human's error: the mover's engine win chance lost by the played edge, at the deepest reading. Edges where the mover's
win chance is between 5% and 95% only (34,204 of part 1's 80,901), since in a decided game every loss is near 0.

| Complexity (part 1) | Edges | Loss 0.10 or more | Played the engine's first choice | Mean gap, first to second |
|---|---|---|---|---|
| 0 (the first choice never changed) | 19,907 | 44% | 17% | 0.080 |
| up to 0.02 | 5,996 | 32% | 10% | 0.012 |
| 0.02 to 0.05 | 4,411 | 36% | 9% | 0.029 |
| 0.05 to 0.10 | 2,578 | 45% | 6% | 0.057 |
| over 0.10 | 1,312 | 59% | 9% | 0.136 |

The positions with no change have the most errors but also a large gap. So the errors split by the gap at 1,024 visits
(the stake) and by whether the first choice changed:

| Gap, first to second | Stable: edges | loss 0.10+ | played first | Changed: edges | loss 0.10+ | played first |
|---|---|---|---|---|---|---|
| 0 to 0.02 | 6,442 | 35% | 12% | 7,066 | 31% | 10% |
| 0.02 to 0.05 | 4,106 | 35% | 15% | 3,992 | 38% | 9% |
| 0.05 to 0.10 | 3,995 | 48% | 18% | 2,101 | 49% | 7% |
| 0.10 to 0.20 | 3,488 | 60% | 22% | 913 | 59% | 10% |
| 0.20 to 1 | 1,874 | 61% | 32% | 225 | 76% | 8% |

- **At one stake, a change of the first choice halves how often players find the engine's first choice** (22% against
  10% at a gap of 0.10 to 0.20): Guid and Bratko's effect holds. **It barely changes how often they lose 0.10 or more**
  (60% against 59%). Only at a gap of 0.20 or more do the changed positions show more errors (76% against 61%), on 225
  edges.
- **The errors rise with the gap,** but partly by construction: where the second choice is 0.10 worse, almost every
  other edge loses 0.10. The gap measures the stake, not how hard the good edge is to see.
- The same holds by rating band (players below 1600, 1600 to 1800, 1800 and above): the stronger make fewer errors at
  every complexity, in the same pattern. Part 2, with readings up to 4,096, gives the same pattern.
- **Not tested, and the measure's limits here:** the first reading is 256 visits, already deep. Guid and Bratko start
  at depth 2, and the shallow readings, nearest a player's first look, are not in the archive's data: the network's
  prior and a search of 32 visits (the review's sweep). Complexity and loss come from the same search. The loss is the
  engine's win chance, not a human one.

**The games' lengths** (part 1): a full game has 120 edges. Of the 387 games that ended on the score, 322 ran all 120.
The 524 resigned games had a median of 63 edges, and the 89 abandoned ones 55.

### The human win curve fitted on the archive (2026-10-12)

`scripts/measure/fit-win-curve.mjs` on part 1 of request 07: every position of the 892 games with a winner that were
not abandoned (Lichess's fit also leaves out abandoned games: lila pull request 11148), from the side of the player to
move. Each game counts once: a position weighs 1 / its game's positions. The games split by id into 730 to fit and 162
to test. P(win) = σ(z), the logistic curve.

| Formula | z | Fitted at 1,024 visits | Test log loss | Test Brier |
|---|---|---|---|---|
| The engine's win chance, as it is | | | 0.454 | 0.129 |
| The engine's win chance, refitted | a · logit(W) + b | a 0.352, b −0.132 | 0.388 | 0.127 |
| The lead | k · L | k 0.0039 | 0.423 | 0.137 |
| The lead and the edges left (Stern) | k · L / √(E + c) | k 0.033, c 10 | 0.416 | 0.135 |
| The lead by stage, a k for each 10 edges | k_stage · L | 12 values | 0.417 | 0.136 |
| **The lead and the spread** | k · L / scoreStdev | **k 1.04** | 0.389 | 0.126 |
| The same, with a power on the ratio | k · sign(u) · \|u\|^p | k 1.19, p 0.8 | 0.389 | 0.126 |
| The same, with the normal curve | Φ(k · L / scoreStdev) | k 0.58 | 0.391 | 0.128 |

- **The edges left do not give the lead's weight:** the k fitted for each block of 10 edges is U-shaped (0.0053 with
  1 to 10 left, 0.0031 with 61 to 70, 0.0052 with 111 to 120), not falling with √E as Stern's model has it. The
  engine's own spread for each position (`scoreStdev`) gives it better.
- **The engine's win chance as it is** fits worst: where it says 99%, players won 92%. Refitted, it matches the lead
  and the spread.
- **Calibration** of the lead and the spread on the test games: 4% → 2% won, 15% → 11%, 25% → 14%, 35% → 22%, 46% →
  43%, 54% → 50%, 65% → 68%, 75% → 81%, 85% → 87%, 96% → 98%. The curve is too flat between 20% and 80%. The power and
  the normal curve do not mend it. The cause is not known.
- **By rating band**, k fitted on each band alone: 0.98 below 1600, 1.06 from 1600 to 1800, 1.12 at 1800 and above.
  Stronger players hold a lead more often, as Lichess's author found for chess (the constant from −0.002 for weak
  players to −0.0038 for strong ones). Fitted on the 233 games at 1800 and above only, k is 1.12, and the test log loss
  on every rating's test games is 0.386: no worse than the fit on every rating.
- **At 512 visits** (the review's Lite depth) k is 1.05, and 1.12 on 1800 and above: the curve does not depend on the
  budget.
- **The labels by turn,** the share of turns that lose 0.05, 0.10 and 0.20 or more of each chance (Inaccuracy or
  worse, Mistake or worse, Blunder), by loss only, without the rule for Best:

  | Rating band | Turns | The engine's win chance | The lead and the spread, fitted on every rating |
  |---|---|---|---|
  | Every rating | 38,914 | 38% / 31% / 20% | 42% / 27% / 11% |
  | Below 1600 | 16,701 | 44% / 37% / 26% | 50% / 34% / 14% |
  | 1600 to 1800 | 9,655 | 42% / 35% / 23% | 47% / 30% / 11% |
  | 1800 and above | 12,558 | 27% / 19% / 11% | 27% / 15% / 5% |

  Blunders fall by half. Inaccuracies rise a little: where the engine is saturated, at 99% or more, a human chance of
  96% can still fall to 91%, as principle 1 of design 01 asks.

### The win curve's flat middle: the side to move, and the stronger player (2026-10-12)

The curve σ(k · lead / scoreStdev), fitted on every archive game ("The human win curve fitted on the archive"), was
too flat between 20% and 80%. Part 1 at 1,024 visits, the same games and the same split. Scripts in the session's
scratch space, not committed: the method that is chosen goes into `scripts/measure/fit-win-curve.mjs`.

- **Not a floor of upsets:** a curve ε + (1 − 2ε) σ(k x) fits ε = 0.01 and gains nothing (test log loss 0.3890
  against 0.3892).
- **The data's own curve is lopsided.** By bins of x = lead / spread for the player to move: at x near +1.1 the mover
  won 74% (the curve 75%), at x near −1.1 only 16% (the curve 24%), and at x near 0, 47.5%. A curve that treats both
  sides alike cannot follow it.
- **The side to move, at a turn's start, wins less than its lead says.** σ(k x + b): b = −0.27 at a turn's start (two
  edges to play), −0.02 in its middle (one edge). By colour: −0.21 for Blue to move, −0.07 for Red.
  - **Not a bias of the engine:** in the 1,568 two-edge turns played as the engine plays (both edges its first choice),
    the mover's win chance changes by +0.32% from the start to the middle and −0.14% from the middle to the end. At
    4,096 visits (part 2, 170 turns) the same.
  - **A human effect:** a human turn loses about 11% of the engine's win chance on average (5.3% for its first edge,
    5.8% for its second). At a turn's start the mover is the next to err, so on average the mover stands about half a
    turn's error behind (b = −0.27 is about 7% at an even lead). In a turn's middle, the rest of the mover's turn and
    the opponent's next turn cancel (b near 0).
  - **For the labels:** the term belongs in the fit, so that it does not bend k. It stays out of a label's loss: with
    it, a turn played as the engine plays would gain about 11%, and the label would measure against an average human
    turn, not against the engine's best.
- **The stronger player's lead.** With the turn-start term, k fitted for each 10 edges is U-shaped: about 2.0 in the
  first 10 edges, 0.8 in the middle, 1.1 in the last 10. In the archive, an early lead also shows who is the stronger
  player, who then keeps playing better, so it predicts the result more than the position does.
  - With the players' rating difference in the fit, k in the first 10 edges falls from 1.99 to 0.57. But the rating
    term comes out at 1.34 (2.33 below 1600) on Elo's scale of 1: the archive's ratings were fitted on these same
    games, so they hold the results. As a term in the fit they take too much.
  - **Fitted only on games between near-equal players** (ratings within 150: 301 games to fit, 78 to test), with the
    turn-start term: k by stage is 0.79 to 1.19 (1.17 in the first 10 edges), and one k, 0.96, predicts the test games
    nearly as well (log loss 0.4142 against 0.4134). Calibration on those test games: 15% → 13% won, 25% → 21%, 35% →
    34%, 45% → 53%, 54% → 49%, 65% → 67%, 75% → 76%, 85% → 87%. The curve fitted on every game, on the same test
    games: 25% → 22%, 75% → 71%, 0.4152.
- **The labels by turn** with the near-equal games' curve (its turn-start term left out), by loss only: Inaccuracy or
  worse / Mistake or worse / Blunder:

  | Rating band | Turns | The engine's win chance | Every game's curve, one k | Near-equal games' curve |
  |---|---|---|---|---|
  | Every rating | 38,914 | 38% / 31% / 20% | 42% / 27% / 11% | 43% / 29% / 12% |
  | Below 1600 | 16,701 | 44% / 37% / 26% | 50% / 34% / 14% | 51% / 36% / 17% |
  | 1600 to 1800 | 9,655 | 42% / 35% / 23% | 47% / 30% / 11% | 49% / 32% / 13% |
  | 1800 and above | 12,558 | 27% / 19% / 11% | 27% / 15% / 5% | 28% / 16% / 6% |

- **Not tested:** whether k differs by rating band among near-equal players (too few games in each band). The ratings
  that choose the near-equal games were fitted on the same games, a weaker leak than a rating term. Request 09's bot
  games, between players of known strength, can check both.

### Three measures of a turn's loss on the archive: the practical chance, KaTrain's points, the lead in spreads (2026-10-12)

Part 1 of request 07 at 1,024 visits, every turn of the games that were not abandoned (40,054 turns), by the rating
of the player who made the turn. The practical chance: σ(0.99 · lead / spread) lost, with chess.com's bands. KaTrain's
points: the lead lost, with KaTrain's Go bands times 12 (36, 72, 144 points from Inaccuracy). The lead in spreads: lead
/ spread lost, the practical chance's input before its curve, with the bands that equal chess.com's in an even game
(0.2, 0.4, 0.8). Scratch scripts, not committed.

| Measure, its own bands | Inaccuracy or worse / Mistake or worse / Blunder, every turn | Mistake or worse, 1800 and above |
|---|---|---|
| Practical chance | 43% / 28% / 12% | 15% |
| KaTrain's points | 68% / 53% / 32% | 37% |
| Lead in spreads | 59% / 41% / 20% | 25% |

With KaTrain's bands, 64% of the turns in edges 1 to 40 are Mistake or worse: the lead swings most early, where the
engine's lead is least sure. At equal shares (each measure's bands set where it flags 43%, 28% and 12% of turns):

| Measure | Its bands | Mistake or worse: below 1600 / 1600 to 1800 / 1800 and above | Weakest to strongest | Mistakes in decided games | Mistake or worse by stage: edges 1 to 40 / 41 to 80 / 81 to 120 |
|---|---|---|---|---|---|
| Practical chance | 0.051, 0.101, 0.205 | 37% / 28% / 15% | 2.49 | 24% | 39% / 23% / 12% |
| KaTrain's points | 101, 161, 286 points | 38% / 25% / 17% | 2.26 | 48% | 36% / 24% / 16% |
| Lead in spreads | 0.38, 0.61, 1.12 | 38% / 27% / 15% | 2.46 | 44% | 30% / 27% / 26% |

- Decided games (the engine under 5% or over 95% at the turn's start) are 57% of all turns.
- Each measure flags 1% of the turns played as the engine plays, before the rule for Best.
- The player with the smaller mean loss won 94% to 96% of the games by every measure: the loser loses more by
  definition, so this does not tell the measures apart.
- **Reading:** the lead in spreads separates weak from strong players as well as the practical chance, and keeps
  counting in decided games, as points do. Raw points separate them least: a point weighs differently at each stage and
  spread. Which share of flags belongs to decided games is a choice, not a measurement.

### The lead fitted to human games: the practical lead (2026-10-12)

The final margin that people reach from the engine's lead, by stage, on part 1's 387 games that ended on the score
(their final scores are the game's end). At the game's last searched position the engine's lead and the final margin
agree: median difference −0.2 points, 80% of games within −15 to +4. Between near-equal players (ratings within 150),
with a robust scatter (1.4826 × the median absolute residual):

| Edges left | Final margin per point of the engine's lead | Intercept | People's scatter | The engine's spread |
|---|---|---|---|---|
| 111 to 120 | 2.12 | −101 | 505 | 314 |
| 81 to 90 | 1.52 | −88 | 440 | 234 |
| 61 to 70 | 1.39 | −51 | 362 | 191 |
| 41 to 50 | 1.15 | −41 | 236 | 194 |
| 21 to 30 | 1.02 | −32 | 151 | 179 |
| 1 to 10 | 0.98 | −24 | 51 | 112 |

- **Early leads grow in people's games:** a point of the engine's lead in the first 10 edges ends as about 2 points of
  margin between near-equal players (about 4 over every game, where the stronger player also gets ahead early). From
  40 edges left the engine's lead is what people reach.
- **The side to move falls short** by 24 to 101 points: the turn-start effect of "The win curve's flat middle".
- **People's margins scatter about twice the engine's spread** in the middle game, and less than it near the end.

**As a label** (scratch script, not committed): the final points people lose in a turn (slope × the lead lost),
against people's scatter at the turn's start, beside the three measures of "Three measures of a turn's loss". With
bands that equal chess.com's in an even game (0.125, 0.25, 0.5 of a scatter): 73% / 59% / 38% of turns at Inaccuracy
or worse, Mistake or worse, Blunder. At equal shares (bands 0.425, 0.665, 1.184): weakest to strongest players 2.15
(the practical chance 2.49), 53% of its Mistakes in decided games (24%), by stage 31% / 23% / 30% (39% / 23% / 12%).
Late in the game people's scatter is small, so a small loss of points is many scatters, though it cannot change who
wins. The practical chance asks of the same fitted lead whether the turn changes who wins: in a game won by any margin,
that is the question a label answers.

### Weaker versions of the engine in the archive's positions: four measures tested (2026-10-12)

Request 08's first look ([requests/08-archive-first-look.md](../requests/08-archive-first-look.md)): at each of the
79,200 positions of part 1's games that were not abandoned, the edge each mover chose, judged against the 512-visit
search's first choice. The movers: the raw network (the top prior, no search), the 32-visit search's first choice, and
the people who played, by the mover's own rating. Every edge but a pass. An engine's edge is valued within the 512
search, from that edge's candidate (left out where the search did not visit it: 493 of the raw network's). A person's
edge too, where the search visited it, else from the next position as labels do: 23% of the edges of people at 1800
and above, 37% from 1600 to 1800, 52% below 1600. Edges, not turns. Each measure has its own bands: chess.com's in win
chance (0.05, 0.10, 0.20 from Inaccuracy), KaTrain's Go bands times 12 in points (36, 72, 144), and the even-game
equivalents in spreads (0.2, 0.4, 0.8). The practical chance takes the position's spread for every candidate: the
first look has no candidate's own. Scratch script, not committed.

| Measure | Mover | Inaccuracy or worse | Mistake or worse | Blunder | Of its Mistakes: in decided positions / in edges 1 to 40 |
|---|---|---|---|---|---|
| The engine's win chance | 32-visit search | 8.1% | 3.1% | 0.6% | 3% / 64% |
| | Raw network | 14.6% | 8.1% | 2.7% | 5% / 70% |
| | People, 1800 and above | 19.7% | 12.3% | 5.5% | 9% / 70% |
| | People, below 1600 | 33.5% | 24.6% | 12.1% | 8% / 76% |
| Practical chance | 32-visit search | 4.6% | 0.9% | 0.1% | 29% / 37% |
| | Raw network | 11.4% | 3.4% | 0.6% | 25% / 51% |
| | People, 1800 and above | 17.6% | 7.5% | 2.0% | 28% / 51% |
| | People, below 1600 | 33.8% | 15.0% | 3.8% | 23% / 60% |
| KaTrain's points | 32-visit search | 16.3% | 6.2% | 1.5% | 66% / 42% |
| | Raw network | 26.2% | 12.8% | 3.9% | 54% / 52% |
| | People, 1800 and above | 39.9% | 22.9% | 8.8% | 57% / 49% |
| | People, below 1600 | 60.6% | 39.8% | 16.5% | 51% / 57% |
| Lead in spreads | 32-visit search | 11.8% | 3.0% | 0.5% | 73% / 20% |
| | Raw network | 21.5% | 7.5% | 1.7% | 59% / 33% |
| | People, 1800 and above | 31.4% | 14.9% | 4.7% | 58% / 34% |
| | People, below 1600 | 51.7% | 26.4% | 8.2% | 50% / 45% |

(People from 1600 to 1800 lie between the two bands shown, in every measure.)

- **Every measure orders the movers the same way:** the 32-visit search, the raw network, people from strong to weak.
- **Where they flag differs.** The engine's win chance puts two thirds or more of its Mistakes in the first 40 edges,
  and almost none in decided positions (the engine under 5% or over 95%), where it has saturated. KaTrain's points and
  the lead in spreads put half or more in decided positions, and so does the 32-visit search's own: 66% and 73% of
  its Mistakes. There, the search of 32 visits gives away points that the search of 512 keeps, in positions whose
  result does not change. The practical chance flags the 32-visit search least (0.9% of its edges at Mistake or
  worse), and spreads every mover's Mistakes between the opening and later play, a quarter of them in decided
  positions.
- Decided positions are more than half of the archive's positions (57% of its turns).
