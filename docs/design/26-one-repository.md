# One repository for the learning sites

**Status:** in force, not built. Hedge School is still at the repository's root.
**Decided:** 2026-10-16.

## Context

The GitHub organization `abstractclass-org` holds the learning sites. Hedge School is the first. A hub site at
`abstractclass.org` and a site for a second board game are to follow. One repository is to hold them all:
`apps/hub`, `apps/hedgeschool`, `apps/<the next game>`, and shared code in `packages/`.

A map of `src/lib` by its imports, reviewed against the code by a second model (Codex), found three groups:

- **Enclosure's** (most of `src/lib`): the board, the engine, the analysis, the games, Practice and the review.
  `review/model.ts` builds in Enclosure's two-edge turns, Blue's side and the enclosed area, and so do the move list
  and the Advantage chart. A split of its types would remove imports, not these assumptions.
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
4. **Nothing goes into `packages/` yet.** A part moves there only when two existing sites need it, the visual parts
   first: the theme's tokens, the fonts, a few components. The review, the engine, the storage, the consent and the
   practice games' storage stay in Hedge School until another game shows what it needs.
5. **The addresses stay:** the hub at `abstractclass.org`, Hedge School at `hedgeschool.abstractclass.org`.
6. **This repository becomes the shared one:** `abstractclass-org/hedgeschool`, with a new name later if one is wanted.

## Why

- A shared package made now would rest on guesses about a game that has no site yet. The review is built on
  Enclosure's rules, so only a second game can show which parts of it are general. This is the rule of three: extract
  a part when real uses show its shape.
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
- **The engine's files:** `scripts/fetch-engine.mjs` reads `node_modules/onnxruntime-web` beside the app. npm
  workspaces can put that package at the root instead, so the script must find it there. Its checks of each file's
  SHA-256, the protocol and the search stay.
- **The players' data:** every storage key (`hedge-school:…`) and the IndexedDB name `learn-enclosure` stay as they are.
- **The imports:** the alias `#lib/*` (`package.json`, `imports`) belongs to the app's package. A shared package gets
  a name of its own.
- **The tests:** the layout sweep (`tests/layout.spec.ts`) uses the app's fixtures, pages, storage keys and engine
  versions.
- **Consent:** a site at another address asks for consent again, because a browser keeps the choice by address.
- **Features:** work on Hedge School's features waits until the move is done.

## Where it is

Not built yet.

## Log

[decisions/architecture.md](../decisions/architecture.md), "One repository for the learning sites".
