# Hedge School

A website that helps people learn the board game [Enclosure](https://meaf.us/sst1/), designed by webgoatguy. It reviews
their games, labels their moves, and later offers puzzles and training.

The site is static files (SvelteKit). The engine (the KataGo fork from
[engines](https://github.com/abstractclass-org/engines), compiled to WebAssembly) runs in the visitor's
browser, in Web Workers. Deep analyses run offline on a GPU and ship as JSON. See [docs/design/](docs/design/README.md).

## Status

**Early access:** the review only, at `hedgeschool.abstractclass.org`, unlisted
([docs/design/11-early-access.md](docs/design/11-early-access.md)). A player brings a game (a record in the site's
notation, Constellation's export, or the meaf.us bookmarklet), and the engine reviews it in the browser: the labels,
the Advantage chart, the engine's lines and the branches. The early access also has the pages About, The notation,
Privacy and Notices.

The full site, built without the early-access switch, also has the puzzles, the lessons and the engine lab, on mock
data. Analysis is not built yet.

## Commands

```sh
npm install
npm run engine                        # get the engine's release that engine.lock.json pins, into static/engine/
npm run dev                           # the dev server
npm run check                         # type checks
npm test                              # the unit tests
npm run build                         # the full site, into build/
VITE_EDITION=early npm run build      # the early access
npm run preview                       # serve build/
npm run build:cloudflare              # what the deploy runs: the engine's release, tests, type check, build
```

`npm run engine` downloads the module and the networks from a GitHub Release of
[enclosure-engine](https://github.com/abstractclass-org/enclosure-engine), which holds only the engine's releases, and
checks each file's SHA-256 ([docs/design/03-stack.md](docs/design/03-stack.md)). `--deploy` refuses a local build.

The deployed build also names its analytics: `VITE_GA_ID` (Google Analytics) and `VITE_CF_ANALYTICS_TOKEN` (Cloudflare
Web Analytics). Without them, as in development, the build has neither.

## Layout

| Path | What |
|---|---|
| `docs/` | The documents: context, handoff, design, decision log, requests to the engine repository ([docs/README.md](docs/README.md)). |
| `src/lib/engine/` | The engine module (protocol 0.4) in a Web Worker, the page's side of it, the protocol's types and the notation. |
| `src/routes/` | The pages. `review/` is the game review, on the engine. `import/` takes a game from the meaf.us bookmarklet. `about/`, `notation/`, `privacy/` and `notices/` are about the site. `lab/engine/` is the engine lab. |
| `src/lib/analysis/` | The review's analysis in the browser: the pool of engine workers, the schedule, the cache, the engine's settings. |
| `src/lib/storage/` | The browser's database (IndexedDB): analyses and the player's games. |
| `src/lib/game/` | Game records (reading, the cut mark), the player's games, the meaf.us conversion and bookmarklet, Constellation's export. |
| `src/lib/board/`, `src/lib/review/` | The board (SVG), the review's model and labels, its page (layout: design 06), the Advantage chart, the display settings. |
| `src/lib/edition.ts`, `src/lib/analytics.svelte.ts` | The early-access switch and the site's name; the analytics and the consent banner. |
| `src/lib/sound.ts`, `static/sounds/` | The move sounds (design 08). |
| `src/lib/mock/`, `scripts/mock/` | Mock data for the wireframes, and how it was made. |
| `scripts/measure/` | The measurements behind the labels (their results: `docs/decisions/`). |
| `engine.lock.json`, `scripts/fetch-engine.mjs` | The engine's artifacts, pinned by SHA-256. |
| `static/engine/` | The engine's artifacts, fetched. Not in Git. |
