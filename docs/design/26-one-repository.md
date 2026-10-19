# One repository for the learning sites

**Status:** in force. Items 1 and 6 are built: Hedge School is in `apps/hedgeschool`, in one npm workspace. Item 4's
first parts are built: the engine, the storage and the analysis are in `packages/`, for the jam game's site (design 29).
Item 2's check on a preview deploy, and the hub (item 3), are still to do.
**Decided:** 2026-10-16.

## Context

The GitHub organization `abstractclass-org` holds the learning sites. Hedge School is the first. A hub site at
`abstractclass.org` and a site for a second board game are to follow. One repository is to hold them all:
`apps/hub`, `apps/hedgeschool`, `apps/<the next game>`, and shared code in `packages/`.

A map of `src/lib` by its imports, reviewed against the code by a second model (Codex), found three groups:

- **Enclosure's** (most of `src/lib`): the board, the engine, the analysis, the games, Practice and the review.
  `review/model.ts` builds in Enclosure's two-edge turns, Blue's side and the enclosed area, and so do the move list
  and the Advantage chart. A split of its types would remove imports, not these assumptions. Design 29 read the model
  again for the jam game's site: its turn is a run of one player's moves, and Enclosure's part of it is in its types,
  its turn numbers and its texts, which a game interface now gives.
- **General, with the site's identity or keys in it:** `edition.ts` (the site's name, address and links, imported
  almost everywhere), the analytics and the consent banner (their storage keys, and `+layout.svelte`'s part in them),
  the IndexedDB name, the theme, the site's menu, footer and Support dialog, the sounds (their events are an edge and a
  cut), and the two sides' colours (Blue and Red).
- **General as it is:** the local and persistent storage, the error text, the icons and settings controls, the
  review's tree (moves as words without spaces), the labels' bands (on a numeric loss) and the line drawing.

## Decision

1. **Hedge School moves whole** into `apps/hedgeschool`: its code, its Function, `migrations/`, `scripts/`,
   `engine.lock.json`, `static/` and `tests/`. One npm workspace, with one lockfile at the root. The workflows stay in
   `.github/workflows/` at the root.
2. **The moved site is checked as a release is:** `npm run engine`, the unit tests, the type check, the build, the
   layout sweep, and a preview deploy where a practice game is sent and then deleted.
3. **The hub is a small site of its own** (`apps/hub`), with its own Pages project and deploy job. At first it is a
   page of links to the sites, with a short description of each. It has no analytics, so it has no consent banner.
4. **A part goes into `packages/` when a second site needs it.** The second site is a strategy-jam game's (abscls-8tl1),
   whose rules come out only at the jam's start. So the parts that it needs moved before the game is known: the
   engine, the storage and the analysis (the review's model and labels, the move tree, the cache, the passes and the
   session), behind a game interface that each site gives them ([design 29](29-shared-packages.md)). The views, the
   theme's tokens, the fonts and the other components follow when the jam site's template shows what it needs. The
   consent and the practice games' storage stay in Hedge School.
5. **The addresses stay:** the hub at `abstractclass.org`, Hedge School at `hedgeschool.abstractclass.org`.
6. **This repository becomes the shared one:** `abstractclass-org/abstractclass`, named `hedgeschool` before.

## Why

- A shared package made before a second site would rest on guesses about a game that has no site. This is the rule of
  three: extract a part when real uses show its shape. The jam game's site needs the analysis before its game is
  known, so design 29 moved only the parts that compute with the engine's replies, and left the board, the notation,
  the import and the views to each site.
- The hub needs none of the game's code. With no analytics, it needs no consent banner and no privacy page.
- A browser keeps a site's data by its address: the players' games and analyses (IndexedDB), and their settings and
  consent choices (localStorage). A new address would lose them, and break every link to the site.
- This repository has the history, and the deploy that works: the secret, the repository variables and the workflow
  **Deploy** ([hosting.md](../hosting.md), section 3).

## Alternatives

- **Extract the shared parts first, then move:** more work before any gain, and the parts' edges would be guesses.
- **A new repository:** the history, the secret, the variables and the workflows would have to move, and links to this
  repository would rest on GitHub's redirects.
- **A new address for Hedge School:** the players' games, analyses, settings and consent choices would stay behind at
  the old address.

## Consequences

The move must keep these:

- **The deploy:** each app has its own deploy job and Pages project. Wrangler runs from `apps/hedgeschool`, or the
  Function in `functions/` is not uploaded. The Pages project `hedgeschool` keeps its `GAMES` bindings and its D1
  databases.
- **The engine's files:** npm puts `onnxruntime-web` in the workspace's `node_modules` at the root, not beside the app.
  So `scripts/fetch-engine.mjs` finds the package by Node's own resolution (`findPackageJSON`, from `node:module`),
  wherever npm puts it. Its checks of each file's SHA-256, the protocol and the search stay. Its download cache stays
  beside the app, in `apps/hedgeschool/node_modules/.cache/engine/`.
- **Local engine sources:** a `local` path in `engine.lock.json` starts at `apps/hedgeschool`. The engine
  repository's checkout is `../../../engines` from there.
- **The commands and the documents:** `npm ci` runs at the root, and the site's commands run in `apps/hedgeschool`.
  A path in the documents to the site's files starts there ([docs/README.md](../README.md)).
- **The players' data:** every storage key (`hedge-school:…`) and the IndexedDB name `learn-enclosure` stay as they are.
- **The imports:** the alias `#lib/*` (`apps/hedgeschool/package.json`, `imports`) belongs to the app's package. A
  shared package gets a name of its own: `@abstractclass/<package>`, imported by its files' names (design 29).
- **The tests:** the layout sweep (`tests/layout.spec.ts`) uses the app's fixtures, pages, storage keys and engine
  versions.
- **Consent:** a site at another address asks for consent again, because a browser keeps the choice by address.
- **Features:** work on Hedge School's features waits until the move is done.

## Where it is

- `package.json` at the root: the workspace (`apps/*`, `packages/*`), private. `package-lock.json` at the root: its one
  lockfile. `.node-version` and `.npmrc` stay at the root, where `actions/setup-node` and npm read them.
- `apps/hedgeschool/`: the site. Its `package.json` (the package `hedgeschool`) has its scripts, its dependencies and
  the alias `#lib/*`.
- `packages/`: the shared packages, `@abstractclass/engine`, `@abstractclass/storage` and `@abstractclass/analysis`
  (design 29).
- `.github/workflows/deploy.yml` and `tests.yml`: the default working directory is `apps/hedgeschool`, and only
  `npm ci` runs at the root. The caches, the failures' screenshots and the hash of `engine.lock.json` name their paths
  from the root.
- `apps/hedgeschool/scripts/fetch-engine.mjs`: finds `onnxruntime-web` by Node's resolution.
- `.gitignore`: the site's generated folders, under `apps/hedgeschool/`.

## Log

[decisions/architecture.md](../decisions/architecture.md), "One repository for the learning sites", "The
repositories get new names" and "Hedge School moves into apps/hedgeschool".
[decisions/product.md](../decisions/product.md), "The analysis and the review in packages/" (2026-10-19): item 4's
first parts.
