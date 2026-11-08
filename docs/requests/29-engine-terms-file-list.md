# The engine terms' list of the engine's own files

**Status:** open. **Asked:** 2026-11-08.

## What

The terms of the Enclosure engine (`LICENSE.txt`, the release asset `engine-85f1792-terms2` that the site serves as
`engine-85f1792-terms2/LICENSE.txt`) name every file of the engine's own code that a release ships.

Today the list names three of them:

- the engine's own code in `enclosure-engine.wasm` and `enclosure-engine-gpu.wasm`
- `gpu_engine.mjs`

The site's engine lock (`apps/hedgeschool/engine.lock.json`) takes six more files of the engine's own code from the
release `engine-d6786eba` and its kinds, and serves them:

- `enclosure-bot.wasm` and `enclosure-bot-batched.wasm` (the practice bot, one thread and threaded)
- `enclosure-eval.wasm` (the evaluation module of the CPU workers)
- `practice_bot.mjs`, `cpu_evaluator.mjs` and `cpu_eval_worker.mjs`

The request: the next terms file names these six as well, in the list of the engine's own code, or names the
engine's own code by a rule that covers every module and script that a release ships.

## Why

- **The list does not match what ships.** The terms' first sentence covers "the files of the repository ... and of
  its releases", and "No other right is granted" holds for every file, so no right changes. But a reader of the list
  finds three files of the nine that the site serves.
- **Blueprints' terms name every file** of its releases. The two engines' terms then read alike.
- Found by cyanotype-coord's abscls-8tl1.60 (both sites' Notices pages, 2026-11-08), and checked here against the
  files of dev's `apps/hedgeschool/static/engine` (abscls-1yyg).

## Done when

- A new terms asset of the engine repository's releases names each of the nine files, or a rule that covers them.
- The site takes the new terms file at its next engine update: the lock's terms entry, and the release check's
  download of the terms (`scripts/release-check.mjs`) with the new SHA-256.
