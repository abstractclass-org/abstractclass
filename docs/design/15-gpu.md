# The review on the visitor's GPU

**Status:** in force, built. Request [06](../requests/06-webgpu.md) asked the engine repository for the GPU module.

## Context

The review searches every position of a game in the visitor's browser, one position for each CPU worker
([design 02](02-static-site.md)). The network takes about 97% of a search's time. The engine repository's release
`wasm-v2-engine-06534ee` added a GPU module, and `wasm-v2-engine-632f2a0` made its graphs half as large: many searches in one worker, whose network evaluations go to the GPU in
batches through ONNX Runtime Web on WebGPU (the engine repository's
[games/enclosure/docs/design/19-webgpu-module.md](https://github.com/abstractclass-org/engines/blob/main/games/enclosure/docs/design/19-webgpu-module.md)).
The GPU is fast only in batches: one search alone runs no faster there than on a CPU worker. It needs JSPI and WebGPU,
which Chrome and Edge have from version 137.

## Decision

1. **The GPU worker is one more worker.** It joins the CPU workers in the review's pool and does not replace them. It
   runs 16 searches at once, and each counts as one engine in the pool. The engine repository measured 16. It starts
   when more tasks wait than the CPU workers can take: none is free, and each worker that still loads takes one. So a
   finished review loads no GPU, and neither does one search after the workers' idle release.
2. **A task takes a free CPU worker first,** and a free GPU engine when no CPU worker is free.
3. **A setting: Auto, On or Off.** It is in the engine settings, under the workers. Auto is the default.
4. **Auto tests the GPU on its first use, on the review's own work.** The GPU joins the review at once. When the GPU
   worker and the CPU workers have each searched for 20 seconds, the page compares the GPU worker's network
   evaluations a second with one CPU worker's visits a second. Where the GPU is slower, it leaves the review, and Auto
   keeps it off from then on. The browser keeps the result for each network, each GPU (by the vendor and
   architecture that WebGPU gives: "nvidia blackwell") and each build of the GPU module, which a new release can make
   faster. The setting's line names the GPU and gives its speed as a multiple of a worker's.
5. **One cache for both modules.** The page keeps a result from the GPU under the CPU module's build, as it keeps a
   result from a CPU worker ([design 05](05-review-analysis.md)). A review can mix the two.
6. **The deploy compresses the large files.** Cloudflare Pages serves no file over 25 MiB. The deploy stores each
   network's graph and ONNX Runtime's WebAssembly compressed with gzip, and splits a compressed file over 24 MiB into
   parts. The page joins the parts, decompresses them and checks the SHA-256.

## Why

- **One more worker.** The engine repository measured that the GPU and the CPU workers together are faster than
  either alone, on an Apple laptop too.
- **The CPU first.** Each search on the GPU waits for its batch, so it runs slower than a search on a CPU worker. On
  the engine repository's RTX 5080, 16 searches ran at 571 visits a second together, 36 each, against 83 for one CPU
  worker. The GPU gains by the number of its searches. So the CPU workers take the work first, and the GPU takes the
  rest: in the sweep and the label pass, that is most of the game. A few deep searches, such as the key moments,
  then run mostly on the CPU workers. Where the GPU took them first, they ran in small batches while the CPU workers
  were idle. KataGo's analysis config gives the same advice: many positions at once on the GPU.
- **Auto, with a test.** GPUs differ a lot. On the engine repository's RTX 5080, the GPU worker ran 7 times faster
  than one CPU worker. A weak integrated GPU can be slower than a CPU worker, and there a CPU worker does the same work
  better.
- **The test on the review's own work.** Request 06 first planned a test of a few evaluations, in a second or two,
  before the review. The test on real work measures what the review gets: full batches from the label pass, the
  search's own CPU time in the GPU worker, and the CPU workers' speed while the GPU worker runs beside them. A
  second or two would mostly measure the first batches, which compile the GPU's kernels. So the test's count starts
  after the GPU's first batch. And the test's work is not lost: it is the review's.
- **Evaluations, not visits, for the GPU.** A search on the GPU runs at a sixteenth of the GPU's speed, so it can take
  minutes on a weak GPU: on the integrated Radeon, a search of 707 visits took about three minutes. A count of the
  visits of the searches that end would see almost none of that work in 20 seconds. The first build counted so, and
  gave the Radeon 2 visits a second. The GPU's library counts its evaluations as they happen, and the page samples
  that count once a second. A visit needs at most one evaluation, so the comparison leans to the CPU a little.
- **One cache.** The two modules are one build of the engine and differ only in the network's arithmetic. They agree
  on the top move in 332 of 332 positions, with the win chance within 2.1e-6. The site does not need reproducible
  searches (request 06): a search on more threads varies from run to run in KaTrain and KataGo too.
- **Compressed files.** ONNX Runtime's WebAssembly is 26.8 MB, and gzip makes it 6.6 MB. gzip makes a graph 9%
  smaller (20.5 MB to 18.7 MB for HedgeFund 0.1).

## Alternatives considered

- **The GPU in place of the CPU workers.** The position on screen would be slower, and the CPU would sit idle.
- **A test before the review** (request 06's first plan). See Why.
- **Compare the GPU with all the CPU workers together.** The GPU worker adds to them and does not replace them. So the
  question is whether the GPU worker is worth more than one more CPU worker.
- **FP16 arithmetic on the GPU.** At most 17% faster, and less exact (the same top move in 30 of 32 positions). The
  graphs of `wasm-v2-engine-632f2a0` keep the weights in FP16, as the network file does, and compute in FP32: half
  the size of the first graphs, with the same outputs.
- **ONNX Runtime from its CDN.** The site would depend on another host. The site serves every file itself
  ([design 02](02-static-site.md)).

## Consequences

- **The first use downloads more:** the GPU module (1.1 MB), its library, ONNX Runtime's WebAssembly (6.6 MB
  compressed) and the network's graph (5.9 MB for HedgeFund 0.1 Lite, 18.7 MB for HedgeFund 0.1, compressed). In all,
  13.7 MB with Lite and 26.5 MB with the larger network. The setting's help line gives the size for the chosen
  network. The browser keeps the files.
- **Memory:** about 13 MB for each of the 16 searches (208 MB), and the graph's weights on the GPU.
- **A browser without JSPI or WebGPU keeps the CPU workers.** The setting's line says what is missing.
- **The test runs once for each network, GPU and GPU module on each browser.** A review shorter than the test leaves
  no result. Then the test continues on the next review. Clearing the site's data clears the result.
- **The cache keys of the earlier engine build no longer match,** so the stored reviews search again once with the
  new build.
- **The gain, measured on one desktop** (an RTX 5080, with the CPU busy with other work): with 4 CPU workers, the GPU
  made the label pass 2.05 times as fast with Lite ([decisions/engine.md](../decisions/engine.md), "The GPU in the
  review").
- **A faster GPU and a slower one, measured on the same quiet desktop:** with Lite, the RTX 5080 made 404 evaluations
  a second, against 62 visits a second for a CPU worker (6.5 times). The CPU's integrated AMD Radeon (2 compute units)
  made 38, against 59 (0.64 times), and Auto turned it off.
- **Not yet measured:** a laptop's integrated GPU and a phone.
- **Off ends the GPU worker at once,** and so does a test that finds the GPU slower. Its unfinished searches run again
  on the CPU workers, and their partial work is lost. Each of them runs at a sixteenth of the GPU's speed, so a new
  search on a CPU worker ends sooner where the GPU is slower than a worker. And Off frees the GPU for the visitor's
  other work.

## In the code

- `src/lib/engine/gpuWorker.ts`: the GPU worker: ONNX Runtime, the engine's library `gpu_engine.mjs`, and a search in
  slices for each engine.
- `src/lib/engine/gpuClient.ts`: the page's side: `GpuEngines` and its slots, and `gpuSupport()`.
- `src/lib/engine/channel.ts`: both workers' messages, on both sides: a promise for each request, and a search in
  slices.
- `src/lib/engine/library.ts`: the engine's library, which the CPU workers use too (`createCpuEngine`).
- `src/lib/engine/artifacts.ts`: a stored file's bytes: its parts joined, decompressed and checked.
- `src/lib/analysis/pool.ts`: `SearchEngine`, `addGpu`, `dropGpu`, `measureGpu`, a CPU worker first, and `SpeedMeter`.
- `src/lib/analysis/gpu.svelte.ts`: `GpuControl`, one for each pool (the setting applied, the start on a backlog, the
  test), the setting's states, the test's length and the stored results.
- `src/lib/analysis/session.svelte.ts`: a `GpuControl` for each pool (`EngineSession`).
- `scripts/fetch-engine.mjs`: the GPU's files, ONNX Runtime's two files, and the compressed storage.
- `vite.config.ts`: ONNX Runtime's build that takes its WebAssembly from the page, and module workers.

## Log

- [decisions/engine.md](../decisions/engine.md), "The GPU in the review".
