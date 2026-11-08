# The engine terms' list of the engine's own files

**Status:** done: the engine repository's commit `3f8617ab`, release `engine-d6786eba-terms2`, checked here and
pinned here. **Asked:** 2026-11-08. **Delivered:** 2026-11-08.

## What

The terms of the Enclosure engine (`LICENSE.txt`, the release asset that the site served as
`engine-85f1792-terms2/LICENSE.txt`, from release `wasm-v2-engine-85f1792-terms2`) name every file of the engine's
own code that a release ships.

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

## The answer

The engine repository's commit `3f8617ab` (in `abstractclass-org/enclosure-engine`), in the release
`engine-d6786eba-terms2`. The release holds the files of `engine-d6786eba` byte for byte, with a new `LICENSE.txt`
(2,172 bytes) and a new manifest. The list of the engine's own code names all nine files:

- the engine's own code in `enclosure-engine.wasm`, `enclosure-engine-gpu.wasm`, `enclosure-bot.wasm`,
  `enclosure-bot-batched.wasm` and `enclosure-eval.wasm`
- `gpu_engine.mjs`, `practice_bot.mjs`, `cpu_evaluator.mjs` and `cpu_eval_worker.mjs`

The list of text also names `settings.cfg`. No right changes. The section "The engine's outputs" is the same, word for
word.

**Checked here:**

- The downloaded `LICENSE.txt` is 2,172 bytes, SHA-256 `01cdf550...121046e`. Against the old file, only the two
  lists and one sentence change ("The two modules also contain works of others" is now "The modules also contain
  works of others").
- The release has the 20 files of `engine-d6786eba`. By GitHub's digests, only `LICENSE.txt` and `manifest.json`
  differ, so each other file that `engine.lock.json` pins is in the new release with the lock's SHA-256 and size.
- The lock's terms entry is now `engine-d6786eba-terms2`, from the release `engine-d6786eba-terms2`, with the new
  SHA-256 and size. Nothing else in the lock changes. The engine step fetched the file and checked its SHA-256. The
  new id gives the terms a new path, so a browser does not keep the old file under the year's immutable cache.
- The release check (`packages/site/src/release-check.mjs`) takes the terms' entry and its SHA-256 from the lock, so
  it needs no change.
- In the local build, the notices page links to `/engine/engine-d6786eba-terms2/LICENSE.txt`. That path serves
  2,172 bytes with the locked SHA-256. In Playwright's Chromium, `tests/notices.spec.ts` fetched the link's address,
  and found the section "The engine's outputs" word for word on the page.
