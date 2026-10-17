# A static site, with the analysis on the player's CPU

**Status:** in force. **Decided:** 2026-10-09.

## Context

The tool reviews games, labels moves, and later offers puzzles and training ([01-analysis-tool.md](01-analysis-tool.md)).
Each of these needs the engine: the rules, the search and the network. The engine lives in the engine repository
([engines](https://github.com/abstractclass-org/engines)). Its rules must match the site where people play
(meaf.us), and that repository's tests guard the match.

The engine already runs in a browser. V2, the KataGo fork, builds as one WebAssembly module
([`v2/wasm/README.md`](https://github.com/abstractclass-org/engines/blob/main/v2/wasm/README.md)) for
Constellation, which runs it in a Web Worker of the player's browser.

A server that searches for every visitor costs money for every visitor. A static site costs almost nothing to host.

## Decision

1. **The site is static files:** the pages, the engine's WebAssembly module, the network, and precomputed data. All
   analysis for a visitor runs on the visitor's CPU.
2. **This repository is separate from the engine repository.** It uses the engine as versioned artifacts: a tagged
   WebAssembly build and a model. It never copies engine or rules code.
3. **Parallelism comes from Web Workers.** Each worker holds one instance of the module and searches its own
   positions. The module itself has one thread.
4. **Heavy work runs offline.** Puzzle mining and deep searches run on the GPU with the native engine. Their results
   ship as static JSON.
5. **Decisions live where the thing decided lives.** Engine, rules, fork and protocol decisions stay in the engine
   repository. Product decisions (labels, thresholds, the interface, puzzles) live here. Documents link across the
   two repositories by URL and path.
6. **The engine interface is designed for analysis, not copied from a site.** UCI (chess) and GTP (Go) are the
   models: one protocol that any front end and any build of the engine can speak. The site interfaces
   (Constellation's Meridian ABI, the meaf.us move server) are references only. The engine repository designs the
   protocol and the move notation. This repository states what the product needs from them
   ([requests/02-engine-protocol.md](../requests/02-engine-protocol.md)).

## Why

- **Cost:** the visitor's CPU does the work. The host only serves files, and the files are cached.
- **One rules engine:** a copy of the rules here could drift from the site with no test to catch it. The engine
  repository already checks its engine against the site's own rules code with 0 mismatches.
- **Workers without threads inside the module:** threads in WebAssembly need `SharedArrayBuffer`. That needs the
  headers `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy`, which many static hosts cannot set and
  which block embedded content from other sites. A game review has about 120 positions, which divide among workers
  with no shared state.
- **Offline work:** a browser cannot mine thousands of games at a large budget. The GPU in the engine repository's
  machine can.
- **An interface of our own:** the site interfaces answer "which move to play in 5 s". Analysis needs more: every
  candidate, the score and its spread, the policy, the ownership, results while the search runs, and a way to stop
  it.

## Alternatives

- **A server that runs the engine:** stronger searches for each visitor, but a cost for each visitor, and a queue
  when many visitors come. Rejected for the visitor's own analysis. The offline jobs give deep results where they
  matter most.
- **Threads in the module:** one position searched faster on many cores. It needs the special headers above.
  Rejected, because many positions at a time keep the cores busy without them.
- **A rules engine in TypeScript for the board:** a fast board with no WebAssembly. Rejected, because it is a second
  rules engine.

## Consequences

- The strength of a review depends on the visitor's machine. A slow machine gets fewer visits a position, or waits
  longer. The budget is a product setting, set from measurements in the browser.
- The first visit downloads the module and the network (7.6 MB for b10c128, 21.7 MB for b15c192). The host must
  serve large files and allow long caching.
- The board needs the rules too (legal edges, captures, regions, scores). These come from the engine's module, so
  the engine interface must include the rules, not only the search.
- Every analysis result that is stored or shipped records the engine build and the model that made it.

## Where it is

- The engine in a Web Worker: [`src/lib/engine/`](../../apps/hedgeschool/src/lib/engine/worker.ts). The engine lab,
  which measures it: [`src/routes/lab/engine/`](../../apps/hedgeschool/src/routes/lab/engine/+page.svelte).
- The request for the engine interface: [requests/02-engine-protocol.md](../requests/02-engine-protocol.md).

## Log entries

- [decisions/architecture.md](../decisions/architecture.md), "The repository starts" (2026-10-09).
