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
