# Blueprints on the visitor's GPU, and the practice bot's threaded forms

**Status:** done (release `engine-91ab0b7d` of `abstractclass-org/blueprints-engine`, the engine repository's
abscls-wqdl), checked here on the CPU: Cyanotype takes it (abscls-8tl1.29, design 33, "The engine's files"). Its
GPU paths wait for a check on the GPU. **Asked:** 2026-11-05.

## What

Cyanotype, Blueprints' site, has everything that Hedge School has (the owner, 2026-11-05). Its engine runs on the CPU
today only because Blueprints' browser release has no GPU build: request 23 named the CPU build alone, and request 25
asked for the practice bot's batched and GPU forms later. Cyanotype is not released until it has them.

Blueprints' release `engine-3ac5c2fc` (`abstractclass-org/blueprints-engine`) lacks these kinds of Enclosure's
release (`abstractclass-org/enclosure-engine`, Hedge School's `engine.lock.json`):

1. **The review on the GPU** (request 06, design 15): `gpu-module`, the GPU module (Enclosure's
   `enclosure-engine-gpu.wasm`), and a `graph` for each network (`NAME.onnx`, named by the manifest's `graphOf`),
   which the GPU module evaluates through ONNX Runtime Web on WebGPU. Blueprints' release already has `gpu-library`.
2. **The practice bot's threaded forms** (design 24, `apps/hedgeschool/src/lib/practice/botForms.ts`, the engine
   repository's `games/enclosure/docs/design/22-practice-bot.md`): `practice-threaded-module`, the threaded bot
   (Enclosure's `enclosure-bot-batched.wasm`), with its network on the GPU (the `graph`) or on CPU workers through
   `practice-evaluator` (`enclosure-eval.wasm`) and `cpu-evaluator-library` (`cpu_evaluator.mjs`,
   `cpu_eval_worker.mjs`).

Each with the interface of Enclosure's, where it fits, so that the site's code serves both games (design 29). The
moves stay as request 23 gives them.

## Why

- **A jam game's site has everything that Hedge School has.** A visitor with a GPU gets the faster review and the
  faster practice bot on both sites.
- **Most of the site's code is shared.** The GPU client and worker, the first-use test and the practice bot are in
  the shared packages (design 29), and Cyanotype's build keeps the GPU worker and ONNX Runtime's settings
  (abscls-8tl1.28).

## Done when

- A release of `blueprints-engine` holds each kind above for the released network, with its manifest.
- The engine repository's documents say how Blueprints' GPU module and threaded bot differ from Enclosure's, if they
  do. A kind that Blueprints cannot have goes to the owner, with the reason, before it is left out.
- Cyanotype then runs the review on the GPU and the threaded practice bot as Hedge School does (abscls-8tl1.29).
