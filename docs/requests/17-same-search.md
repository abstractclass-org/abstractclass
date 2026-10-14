# A release that searches as an earlier one: say so

**Status:** done, checked here (below, "Delivered"). **Asked:** 2026-10-14. **Delivered:** 2026-10-14.

## What

1. **For the release `wasm-v2-engine-27a7414`:** does its analysis search as the release `wasm-v2-engine-fdfe5ad`
   does? "The same search" means: the same rules, the same search code and parameters, and the same arithmetic of
   the network's evaluations, in both modules (the CPU module and the GPU module). An analysis of the same query with
   the same network then gives the same reply, apart from the engine tag and the variation between runs that the
   search has already (more threads, the GPU's arithmetic). Hedge School reads protocol 0.5's notes as "the position
   check is new, and the search is not changed", but the notes do not say it.
2. **From now on, a way to know without asking:** each build tells which search it has. Two ways, the engine
   repository's choice:
   - **The engine tag** of each analysis reply gets a field that names the search, for example `"search": "fdfe5ad"`:
     the first build that had this search. A build keeps the value while its search stays the same, and gets a new
     value when an analysis reply can change.
   - **The release's manifest** lists, for each module, the earlier builds that have the same search.

   Hedge School prefers the engine tag: the site keys each stored result by what the reply says (below), and a reply
   then carries all that the key needs.
3. **The rule for "the same search"** in the engine repository's documents, so that each release applies it. A change
   of the rules, the search, its defaults, the network's evaluation, or the meaning of a reply's field changes the
   search. A new action, a new check, a new error or a new field that an analysis does not use does not change it.

## Why

- **Hedge School keys each stored result by the engine's build** (`src/lib/analysis/cache.ts`): the build, the
  network's SHA-256, the position and the visits. A result of another build is not reused.
- **A new build makes every stored review a snapshot** (Hedge School's design 20). A player who opens a game reviewed
  before sees "Reviewed with an earlier version of the engine", with Review again. Review again costs as long as the
  first review, on a phone too.
- **The release `27a7414` adds the position check** (request 16), for the Analysis board's editor. Its networks and
  graphs are the same bytes as in `fdfe5ad`. If its search is the same, the snapshot is a false alarm for every
  player, at each release that changes no search.
- **The site does not need searches that repeat exactly** (request 06, Hedge School's design 15: the two modules
  agree on the top move in 332 of 332 positions, with the win chance within 2.1e-6). The same search needs the same
  method, not the same bytes.

## Done when

- The engine repository says whether `27a7414` has the search of `fdfe5ad`, and on what evidence. For example: the
  changes between the two builds, and the replies of both builds to the same queries (positions of the archive's
  games, each network, at 512 visits and more), compared as request 06 compared the two modules.
- Each build tells its search, in the engine tag or in the release's manifest, from the next release on. The engine
  repository also gives the value for `fdfe5ad` and `27a7414`, so that the site can apply it to the results that
  browsers keep now.
- The rule for "the same search" is in the engine repository's documents.

## Delivered

The engine repository's design 04, "The same search":

- **`27a7414` has the search of `fdfe5ad`.** The only change between the two builds that reaches the analysis modules
  is the position check. The other changes are in code that only the practice modules or the training compile. The
  networks, the graphs and `gpu_engine.mjs` are the same bytes.
- **The evidence:** both releases' modules answered the same queries, with each network. In the CPU module: 40
  positions of the archive's games at 512 visits, and 4 of them at 2,048. In the GPU module (its network in ONNX
  Runtime Web's WebAssembly backend on the CPU, one search at a time): 20 positions at 256 visits. Every reply is
  equal, apart from the engine tag. An analysis repeats exactly from its seed, so equal replies show the same search.
- **Protocol 0.6 adds `search`** to the engine tag, to `query_version` and to the release manifest's engine: the first
  build that searched as this one does. For `fdfe5ad` and `27a7414` the value is `fdfe5ad`, and their modules do not
  report it. Protocol 0.6 comes in the next release, with the practice modules, and its notes say whether its search
  changed.
- **The rule:** a change to the rules, the search code, its settings or their defaults, the network's evaluation (the
  backends, the graphs, `gpu_engine.mjs`, the compiler's arithmetic), or the meaning of an analysis reply's field
  changes the search. A new action, a new check, a new error, or a new field that an analysis does not use does not.
  The release tool gives a release that keeps a search and the latest release the same queries, and refuses the
  release if a reply differs.
- **For the key:** the search covers the modules' code and the network's evaluation of one network file, so the key
  keeps the network's SHA-256. A new graph of the same network changes the search.

**Checked here:** the site keys stored results by the search (`src/lib/analysis/cache.ts`) and moved to `27a7414`
(decisions/engine.md, "The release 27a7414"). In Edge, on the local build, a game reviewed with `fdfe5ad` opened on
`27a7414` as a review done, with its labels from the stored results, and no snapshot.
