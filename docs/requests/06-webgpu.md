# The network's evaluations on the visitor's GPU: WebGPU

**Status:** open.

## What

Find out whether the browser module can evaluate the network on the visitor's GPU through WebGPU, and if the gain is
large, give the site a way to use it. In two steps, so that the second is done only if the first shows a gain:

1. **A measurement.** The time of one evaluation of b10c128 and of b15c192 through WebGPU in a browser worker, at a
   batch of 1 and at larger batches (8, 16, 32), against the WebAssembly build's time on the same machine (16.5 ms
   a position for b10c128 in V8, the engine repository's
   [`v2/docs/decisions/build.md`](https://github.com/seankao31/enclosure-ai/blob/main/v2/docs/decisions/build.md),
   "The network in WebAssembly, faster"). The time must include the round trip: the inputs written to the GPU, the
   work, and the outputs read back. On a discrete GPU and on an integrated one, if possible, since many visitors have
   only the second.
2. **If the gain is large:** a build, or a mode of the module, that evaluates on the GPU and speaks the same protocol
   as the module the site has. The site keeps the CPU module for browsers and machines without WebGPU, and chooses
   between the two. The engine repository chooses the design. Two constraints are known:
   - **The search is synchronous and the GPU is not.** The module runs on one thread with a synchronous evaluator
     (`NNEVAL_SYNCHRONOUS`), and WebGPU gives its results through promises. A search in slices already returns to the
     page between slices (the engine repository's
     [design 04](https://github.com/seankao31/enclosure-ai/blob/main/docs/design/04-notation-and-protocol.md), "Search
     in slices"). An evaluation on the GPU needs a way to wait too: for
     example the search returns to the page at each evaluation or batch, or JSPI (JavaScript Promise Integration).
   - **One search thread asks for one evaluation at a time.** A GPU gains most from batches. The review searches many
     positions at once, in several workers, each with its own module. A batch can come from one search (more than one
     leaf a step) or from several searches in one module. Either changes the search, so the step-1 numbers at batch
     1 tell whether it is needed.

If the protocol should say how a client asks for the GPU, or how it reports which backend runs, the site follows the
protocol.

## Why

The review searches every position on the visitor's CPU ([design/02](../design/02-static-site.md),
[design/09](../design/09-engine-settings.md)). The network is 97% of a search's time (build.md, "Where the time went").
On a fast desktop one worker of b10c128 searches about 70 to 90 visits a second, and b15c192 is three times slower
([decisions/engine.md](../decisions/engine.md)). A whole game's review at the Lite depth (256 visits a position) takes
minutes, and at the Standard depth (1,024) about four times as long. The engine repository's own backlog names WebGPU
for a site of our own (`docs/decisions/open-items.md`, "Other ideas"). The site would offer the GPU as an engine
setting, off until the measurement shows that it helps.

## Done when

- Step 1: the numbers above are in the engine repository's decisions, with the machine, the browser and the GPU.
  The answer says whether step 2 is worth it.
- Step 2, if taken: the site can load a module that evaluates on WebGPU in a worker and replies under the same
  protocol. Its outputs agree with the CPU module's as closely as the CPU module agrees with the CUDA build (value
  within 1e-3, the same top move in 332 of the 332 test positions, the check in build.md). The module tells the site
  when WebGPU is not there, so that the site can use the CPU module.
