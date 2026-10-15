# The network's evaluations on the visitor's GPU: WebGPU

**Status:** done. The site uses step 2, from release `wasm-v2-engine-06534ee` and now `wasm-v2-engine-632f2a0`:
[design 15](../design/15-gpu.md).

## Built into the site (2026-10-12)

- `engine.lock.json` pins `wasm-v2-engine-06534ee`: the CPU module, the GPU module, its library and both graphs.
  ONNX Runtime Web 1.30.0 is a dependency, and the deploy serves its WebAssembly beside the engine.
- The GPU worker joins the CPU workers in the review's pool, with 16 searches. A task takes a free CPU worker first.
- The first-use test runs on the review's own work, not as a timing before the review, as the site's answer below
  first planned. Design 15 gives the reasons. The setting is Auto, On or Off.
- The 40.9 MB graph and ONNX Runtime's 26.8 MB WebAssembly exceed Cloudflare Pages' 25 MiB for a file. The deploy
  stores them compressed, the graph in two parts, and the page joins them.
- Since then, the release `wasm-v2-engine-632f2a0` made the graphs half as large (6.4 MB and 20.5 MB), with the same
  outputs. The site uses it (decisions/engine.md, "The release 632f2a0").

## Step 2 delivered: the GPU module (2026-10-12)

The release `wasm-v2-engine-06534ee` of `abstractclass-org/enclosure-engine` holds:

- `enclosure-engine-gpu.wasm`: the GPU module, protocol 0.3, build `06534ee`.
- `gpu_engine.mjs`: its JavaScript half, for the site's GPU worker.
- `NAME.onnx`: one graph for each network: 12.8 MB for HedgeFund 0.1 Lite and 40.9 MB for HedgeFund 0.1. Each graph
  keeps its network's display name, and the manifest's `graphOf` names its network file.
- The CPU module, built again at `06534ee` with the same behaviour, and the same two network files as
  `wasm-v2-engine-85c2adb`.

Use in a worker:

```js
import * as ort from "onnxruntime-web/webgpu"; // ONNX Runtime Web 1.30, the site's dependency
import { createGpuEngines, createOrtEvaluator, gpuEngineSupport } from "./gpu_engine.mjs";
if (!gpuEngineSupport().ok) { /* keep the CPU module: no JSPI or no WebGPU */ }
const evaluator = await createOrtEvaluator(ort, graphBytes); // throws when WebGPU has no adapter
const gpu = await createGpuEngines(await WebAssembly.compile(moduleBytes), evaluator, { searches: 16 });
await gpu.loadModel(modelBytes, { name }); // NAME.model-float16.bin
const reply = JSON.parse(await gpu.engines[k].call(request)); // the engine protocol, one search for each engine
```

- **Each engine** speaks the CPU module's protocol, one request at a time, searches in slices too. Several searches at
  once (the label pass) send their evaluations to the GPU together.
- **Needs** JSPI (Chrome and Edge 137 and later, Firefox 153, Safari 27) and WebGPU. `gpuEngineSupport()` says which is
  missing.
- **Memory:** about 9 to 13 MB for each engine. The weights are on the GPU, once.
- **Agreement with the CPU module:** the same top move in 332 of 332 positions, the win chance within 2.1e-6. In
  Chrome on WebGPU, 64 of 64.
- **Speed on an RTX 5080,** the label pass at 256 visits: HedgeFund 0.1 Lite 571 visits a second with 16 searches and
  812 with 32, against about 83 for one CPU module. HedgeFund 0.1: 471 and 647, against about 34 to 39.
- **Asked of the site:** move `engine.lock.json` to the new release, and keep the first-use speed test, as laptop
  GPUs differ.

## The site's answer for step 2 (2026-10-11)

- **The site does not need reproducible searches.** The published tools do not keep them: KaTrain's KataGo config
  searches each position with 8 threads and 12 positions at once (`numSearchThreads = 8`, `numAnalysisThreads = 12`,
  `nnMaxBatchSize = 96`), and KataGo's own `analysis_example.cfg` uses 16 threads a position. A search on more than
  one thread varies from run to run (the engine repository's design 04). A GPU module would not repeat the CPU
  module's results in any case: its arithmetic differs in the last digits (about 1e-5 in step 1), and that can turn a
  search to another move. So reproducibility should not choose the design. Speed should.
- **Batch across searches first.** Most of a review's work is its label pass: every position of the game, each
  searched to a fixed budget, independent of the others. Several searches in one module give batches of 16 to 32 at
  once, where step 1 shows the gain. KataGo's config gives the same advice for many positions: few threads a
  position, many positions at once.
- **Batch inside one search later, if at all,** for the position on screen, which is one search. KataGo's config
  advises more threads a position when one search's answer must come fast. In a worker with one thread, this means a
  search that takes several leaves a step. It weakens the search a little for each visit, as KataGo's threads do.
- **The site chooses the default on each machine.** Where the browser has WebGPU, the page times a few evaluations
  on the CPU module and on the GPU module the first time, in a second or two, and turns the GPU on by default only
  where it is faster. The setting's help line shows the result. So the integrated GPU's numbers do not set the
  site's default. They tell only whether step 2 is worth building for most visitors' machines.

## Step 1: the engine repository's first numbers (2026-10-11)

- **Method:** the fork's own ONNX graph (`katago dumponnx`, standard operators, the 48-channel edge policy), pruned to
  the outputs the search reads, run by ONNX Runtime Web 1.30's WebGPU backend in a dedicated worker in Chrome 155.
  Each run is the round trip: the inputs written to the GPU, the evaluation, every output read back. In FP32 the
  graph equals the C++ engine (policy within 1.8e-5, value within 2.5e-6, the same top move in 332 of 332).
- **Times,** ms a position, on an RTX 5080, with the engine's training using the GPU and the CPU:

  | Network | WebAssembly (CPU) | WebGPU, batch 1 | Batch 8 | Batch 16 | Batch 32 |
  |---|---|---|---|---|---|
  | b10c128 | 21.1 | 23.3 | 3.3 | 2.0 | 1.4 |
  | b15c192 | 55.9 | 28.2 | 4.3 | 2.9 | 2.1 |

- **Reading:** a run has about 20 ms of fixed cost. One position at a time gains nothing for b10c128 and about 2
  times for b15c192. Batches of 8 to 32 gain 6 to 15 times for b10c128 and 13 to 27 times for b15c192. So a GPU
  module pays only if the search evaluates in batches. FP16 is not faster here and is less exact (the same top move in
  30 of 32), so FP32 stays, and the bound "value within 1e-3" holds.
- **Still to measure:** an idle GPU (at a planned stop of the engine's training: part of the fixed cost may be the
  shared GPU). Chrome offers WebGPU only on the discrete GPU of the engine's machine.

## Step 1 on an integrated GPU: the owner's laptop (2026-10-11)

- **Method:** the engine repository's harness unchanged (`bench.html`, `bench_worker.mjs`, the models of
  `runs/webgpu/models`), served read-only from the engine's machine over the owner's tailnet, with the harness's own
  paths and isolation headers, and run in Chrome 154 on the laptop. A page ran each network and precision in turn at
  batches of 1, 8, 16 and 32, for 3 seconds each.
- **The machine:** an Apple Silicon Mac, 12 cores, on battery, as for its CPU's sweep. The adapter: Apple,
  `metal-3`, with 16-bit shaders.
- **Its CPU, for reference:** the site's WebAssembly module in the engine lab's speed sweep (every sixth position of
  the sample game at 256 visits, one search thread a worker, decisions/engine.md, "Speed on a laptop"), on battery:

  | Network | Workers | Visits a second, all workers | Each worker | About ms a visit, one worker |
  |---|---|---|---|---|
  | b10c128 | 1 | 66 | 66 | 15 |
  | b10c128 | 2 | 121 | 61 | |
  | b10c128 | 4 | 242 | 62 | |
  | b10c128 | 8 | 386 | 57 | |
  | b15c192 | 1 | 22 | 22 | 45 |
  | b15c192 | 2 | 40 | 20 | |
  | b15c192 | 4 | 76 | 20 | |
  | b15c192 | 8 | 129 | 19 | |

  A visit is one evaluation and its search's work, and the search is about 3% of the time (build.md, "Where the time
  went"), so a visit's time stands close to an evaluation's.
- **Times,** ms a position, round trip included:

  | Network | Precision | Same top move | Batch 1 | Batch 8 | Batch 16 | Batch 32 |
  |---|---|---|---|---|---|---|
  | b10c128 | FP32 | 32 of 32 | 6.76 | 2.49 | 2.24 | 2.12 |
  | b10c128 | FP16 | 32 of 32 | 6.53 | 2.19 | 1.92 | 1.78 |
  | b15c192 | FP32 | 32 of 32 | 11.83 | 6.38 | 5.96 | 5.77 |
  | b15c192 | FP16 | 32 of 32 | 11.02 | 5.40 | 4.95 | 4.77 |

  FP32 equals the C++ engine (largest difference times the scale: policy 2.3e-5 and 3.9e-5, value 7.6e-6). FP16 keeps
  the top move in 32 of 32 here, but its value differs by up to 0.18 (times the scale).
- **Reading:**
  - The fixed cost is small: about 7 ms a run for b10c128, against about 20 ms on the busy RTX 5080. One position at
    a time is already about 2 times one CPU worker for b10c128 (6.8 against about 15 ms) and about 4 times for
    b15c192 (11.8 against about 45 ms). So on this machine a single search, the position on screen, gains without
    batching, and b15c192 becomes practical for it.
  - Batches of 32 give about 470 positions a second for b10c128 and 173 for b15c192 in FP32: a little more than all 8
    CPU workers (386 and 129). The GPU and the CPU workers together would about double a review's speed.
  - FP16 is 3% to 17% faster here, and less exact. FP32 stays the path, as on the RTX 5080.
  - The two GPUs behave in opposite ways at one position: slower than the CPU on the RTX 5080, 2 to 4 times faster on
    this laptop. That supports choosing the GPU's default on each machine by a short test (above).

## What

Find out whether the browser module can evaluate the network on the visitor's GPU through WebGPU, and if the gain is
large, give the site a way to use it. In two steps, so that the engine repository builds the second only if the first
shows a gain:

1. **A measurement.** The time of one evaluation of b10c128 and of b15c192 through WebGPU in a browser worker, at a
   batch of 1 and at larger batches (8, 16, 32), against the WebAssembly build's time on the same machine (16.5 ms
   a position for b10c128 in V8, the engine repository's
   [`v2/docs/decisions/build.md`](https://github.com/abstractclass-org/enclosure-ai/blob/main/v2/docs/decisions/build.md),
   "The network in WebAssembly, faster"). The time must include the round trip: the inputs written to the GPU, the
   work, and the outputs read back. On a discrete GPU and on an integrated one, if possible, since many visitors have
   only the second.
2. **If the gain is large:** a build, or a mode of the module, that evaluates on the GPU and speaks the same protocol
   as the module the site has. The site keeps the CPU module for browsers and machines without WebGPU, and chooses
   between the two. The engine repository chooses the design. The site knows two constraints:
   - **The search is synchronous and the GPU is not.** The module runs on one thread with a synchronous evaluator
     (`NNEVAL_SYNCHRONOUS`), and WebGPU gives its results through promises. A search in slices already returns to the
     page between slices (the engine repository's
     [design 04](https://github.com/abstractclass-org/enclosure-ai/blob/main/docs/design/04-notation-and-protocol.md),
     "Search in slices"). An evaluation on the GPU needs a way to wait too: for example the search returns to the page
     at each evaluation or batch, or JSPI (JavaScript Promise Integration).
   - **One search thread asks for one evaluation at a time.** A GPU gains most from batches. The review searches many
     positions at once, in several workers, each with its own module. A batch can come from one search (more than one
     leaf a step) or from several searches in one module. Either changes the search, so the step-1 numbers at batch
     1 tell whether the site needs it.

If the protocol should say how a client asks for the GPU, or how it reports which backend runs, the site follows the
protocol.

## Why

The review searches every position on the visitor's CPU ([design/02](../design/02-static-site.md),
[design/09](../design/09-engine-settings.md)). The network is 97% of a search's time (build.md, "Where the time went").
On a fast desktop one worker of b10c128 searches about 70 to 90 visits a second, and b15c192 is three times slower
([decisions/engine.md](../decisions/engine.md)). A whole game's review at the Lite depth (512 visits a position) takes
minutes, and at the Standard depth (1,024) about twice as long. The engine repository's own backlog names WebGPU for
a site of our own (`docs/decisions/open-items.md`, "Other ideas"). The site would offer the GPU as an engine setting,
on by default where a short test on the visitor's machine finds it faster (above).

## Done when

- Step 1: the numbers above are in the engine repository's decisions, with the machine, the browser and the GPU.
  The answer says whether step 2 is worth it.
- Step 2, if taken: the site can load a module that evaluates on WebGPU in a worker and replies under the same
  protocol. Its outputs agree with the CPU module's as closely as the CPU module agrees with the CUDA build (value
  within 1e-3, the same top move in 332 of the 332 test positions, the check in build.md). The module tells the site
  when WebGPU is not there, so that the site can use the CPU module.
