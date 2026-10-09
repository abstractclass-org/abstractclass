# Learn Enclosure

A website that helps people learn the board game [Enclosure](https://meaf.us/sst1/). It reviews their games, labels
their moves, and later offers puzzles and training.

The site is static files (SvelteKit). The engine (the KataGo fork from
[enclosure-ai](https://github.com/seankao31/enclosure-ai), compiled to WebAssembly) runs in the visitor's browser, in
Web Workers. Deep analyses run offline on a GPU and ship as JSON. See [docs/design/](docs/design/README.md).

## Status

Early. The review (`/review`) is a clickable wireframe on mock data. The engine lab (`/lab/engine`) runs the engine module in Web Workers: the board from the engine's rules, an
analysis in slices, and a whole-game review that measures the time a position.

## Commands

```sh
npm install
npm run engine      # get the engine builds that engine.lock.json pins, into static/engine/
npm run dev         # the dev server
npm run check       # type checks
npm run build       # the static site, into build/
npm run preview     # serve build/
SNAPSHOT=1 npm run build   # each page as one self-contained HTML file, into build-snapshot/
```

`npm run engine` needs the engine repository checked out at `../enclosure` while the lock file names local builds
([docs/design/03-stack.md](docs/design/03-stack.md)).

## Layout

| Path | What |
|---|---|
| `docs/` | The documents: context, handoff, design, decision log, requests to the engine repository ([docs/README.md](docs/README.md)). |
| `src/lib/engine/` | The engine module (protocol 1.0) in a Web Worker, the page's side of it, the protocol's types and the notation. |
| `src/routes/` | The pages. `review/` is the review wireframe. `lab/engine/` is the engine lab. |
| `src/lib/board/`, `src/lib/review/` | The board (SVG), the review's model and its graph. |
| `src/lib/mock/`, `scripts/mock/` | Mock data for the wireframes, and how it was made. |
| `engine.lock.json`, `scripts/fetch-engine.mjs` | The engine's artifacts, pinned by SHA-256. |
| `static/engine/` | The engine's artifacts, fetched. Not in Git. |
