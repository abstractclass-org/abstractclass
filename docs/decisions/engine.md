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
