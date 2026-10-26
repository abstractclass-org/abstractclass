# Hedge School

A website that helps people learn the board game [Enclosure](https://meaf.us/sst1/), designed by webgoatguy. It reviews
their games, labels their moves, and later offers puzzles and training.

The site is static files (SvelteKit). The engine (the KataGo fork from
[engines](https://github.com/abstractclass-org/engines), compiled to WebAssembly) runs in the visitor's
browser, in Web Workers. Deep analyses run offline on a GPU and ship as JSON. See [docs/design/](docs/design/README.md).

## Status

**Early access:** the review only, at `hedgeschool.abstractclass.org`, unlisted
([docs/design/11-early-access.md](docs/design/11-early-access.md)). A player brings a game (a record in the site's
notation, Constellation's export, or the meaf.us bookmarklet), and the engine reviews it in the browser: the quality
labels, the Advantage chart, the engine's lines and the variations. The early access also has the pages About, The
notation, Privacy and Notices.

The full site, built without the early-access switch, also has the puzzles, the lessons and the engine lab, on mock
data. Analysis is not built yet.

## Commands

The repository is one npm workspace ([docs/design/26-one-repository.md](docs/design/26-one-repository.md)). Install at
the root. Run the site's commands in its folder, `apps/hedgeschool`:

```sh
npm install                           # at the root: the workspace's dependencies, in the one package-lock.json
npm run check:all                     # at the root: the Tests workflow's checks before its browser tests
cd apps/hedgeschool
npm run engine                        # get the engine's release that engine.lock.json pins, into static/engine/
npm run dev                           # the dev server
npm run check                         # type checks
npm test                              # the unit tests
npm run build                         # the full site, into build/
VITE_EDITION=early npm run build      # the early access
npm run preview                       # serve build/
npm run build:cloudflare              # what the deploy runs: the engine's release, tests, type check, build
npm run test:layout                   # the layout test in Chromium, against the preview (tests/layout.spec.ts)
HS_EDGE=1 npm run test:layout         # the same, with Edge too (the owner only; see docs/hosting.md)
node scripts/release-check.mjs <URL>  # the checks of a deployed site (docs/hosting.md)
```

`npm run check:all` runs the checks of the Tests workflow before its browser tests. The workflow runs the same command,
so the list of checks is in one place: `scripts/check-all.mjs`. Its last line says `check:all: PASS` or
`check:all: FAIL`, with each step's result.

The repository's own checks run at the root:

```sh
node scripts/doc-widths.mjs origin/dev    # added Markdown lines over 120 characters since origin/dev
node --test "scripts/*.test.mjs"          # the width check's tests
sh scripts/commit-msg.test.sh             # the commit-msg hook's tests (.githooks/commit-msg)
```

To add a dependency to the site, run `npm install <package> -w apps/hedgeschool` at the root.

The shared packages in `packages/` ([docs/design/29-shared-packages.md](docs/design/29-shared-packages.md)) have their
own type checks and tests. Run them at the root for every package, or with `npm run check` and `npm test` in a
package's folder:

```sh
npm run check --workspace=packages    # the packages' type checks
npm test --workspace=packages         # the packages' unit tests
```

`npm run engine` downloads the module and the networks from a GitHub Release of
[enclosure-engine](https://github.com/abstractclass-org/enclosure-engine), which holds only the engine's releases, and
checks each file's SHA-256 ([docs/design/03-stack.md](docs/design/03-stack.md)). `--deploy` refuses a local build.

The deployed build also names its analytics: `VITE_GA_ID` (Google Analytics) and `VITE_CF_ANALYTICS_TOKEN` (Cloudflare
Web Analytics). Without them, as in development, the build has neither.

## Layout

| Path | What |
|---|---|
| `docs/` | The documents: context, working notes, design, decision log, requests to the engine repository ([docs/README.md](docs/README.md)). |
| `.github/workflows/` | The deploy and the tests ([docs/hosting.md](docs/hosting.md)). |
| `packages/engine/` | `@abstractclass/engine`: the engine in the browser. Its client and its CPU and GPU workers, the protocol's general types, the pool of workers. |
| `packages/storage/` | `@abstractclass/storage`: the browser's database (IndexedDB), local storage and persistent storage. |
| `packages/analysis/` | `@abstractclass/analysis`: the game interface, the review's model and quality labels, the move tree, the cache, the analysis of a game (its schedule), the engine session and the GPU control, and the turns of one move, then two. |
| `packages/record/` | `@abstractclass/record`: the game record's frame (the tags, the turns, comments, variations, quality marks, commands and the result), with each game's moves and marks as a parameter. |
| `packages/import/` | `@abstractclass/import`: the import's frame (design 29, item 10): the bookmarklet and the userscript that bring a game from a game site's page, with each site's page code as a parameter, the hash that they send to the import page, and the import's events. |
| `packages/review/` | `@abstractclass/review`: the review's and the Analysis board's view (layout: design 06), its charts, cards, move list and step bar, and the view's game interface (design 29, item 9). |
| `packages/site/` | `@abstractclass/site`: the sites' frame (the colour tokens, the header's bar and the page's area, the theme, the page's metadata) and their general controls (the icons, the toast, the settings' parts). |
| `apps/hedgeschool/` | Hedge School, the site. The paths below start there. |
| `src/lib/engine/` | Enclosure's notation, and its engine's description of a position as the board draws it. |
| `src/routes/` | The pages. `review/` is the game review, on the engine. `import/` takes a game from the meaf.us bookmarklet. `about/`, `notation/`, `privacy/` and `notices/` are about the site. `lab/engine/` is the engine lab. |
| `src/lib/analysis/` | The engine's settings: the networks, the defaults, a game's own settings. |
| `src/lib/game/` | Game records (reading, the cut mark), the player's games, the meaf.us conversion and bookmarklet, Constellation's export. |
| `src/lib/board/`, `src/lib/review/` | The board (SVG), Enclosure's game and its part of the review (`review/enclosure.ts`), Enclosure's part of the review's view (`review/enclosureView.ts`), the display settings. |
| `src/lib/edition.ts`, `src/lib/analytics.svelte.ts` | The early-access switch and the site's name; the analytics and the consent banner. |
| `src/lib/sound.ts`, `static/sounds/` | The move sounds (design 08). |
| `src/lib/book/`, `scripts/test-book.mjs` | The opening book's file form, its loader and the converter that makes the test book (design 32). |
| `tests/fixtures/` | The browser tests' data, and the test book that the dev and preview servers serve at `/test-book/`. |
| `src/lib/mock/`, `scripts/mock/` | Mock data for the wireframes, and how it was made. |
| `scripts/measure/` | The measurements behind the quality labels (their results: `docs/decisions/`). |
| `engine.lock.json`, `scripts/fetch-engine.mjs` | The engine's artifacts, pinned by SHA-256. |
| `static/engine/` | The engine's artifacts, fetched. Not in Git. |
