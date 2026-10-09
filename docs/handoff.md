# Handoff (2026-10-10)

**In flight only:** what is half done, and what the next session must check first. Each session rewrites this file.
It holds no backlog: everything still to do that is not in flight is in
[decisions/open-items.md](decisions/open-items.md).

## State

- **Commits:** `39f72e3` (the first state), `bd2df9a` (the review on the engine, the budget measurement). The game
  import work (record reader, the player's games, the meaf.us bookmarklet, `/import`) is done but not committed:
  ask the owner.
- **The engine:** the engine repository's module, protocol 1.0 (`enclosure-engine.wasm`, build `8195171`), with the
  networks b10c128 and b15c192 loaded at run time (`engine.lock.json`, `npm run engine`). `src/lib/engine/` runs it
  in Web Workers.
- **The review** runs on the engine ([design/05-review-analysis.md](design/05-review-analysis.md)): the rules first, a
  sweep at 32 visits for the graph, a label pass at 256 visits, the position on screen and the key moments to 1,024,
  results kept in the browser. The budgets are measured ([decisions/engine.md](decisions/engine.md), "Label agreement
  against search budget").
- **Game import** ([decisions/product.md](decisions/product.md), "Game import"): a pasted record on Home, or the meaf.us
  bookmarklet (`/import`). The owner checked the bookmarklet on a real meaf.us game: it works. Games are kept in the
  browser and listed on Home.
- **Puzzles and learn** still run on mock data.
- **Tests:** `npm test` (11 checks: the record reader and the meaf.us conversion). `npm run check` for types.
- **The engine repository's notation changed:** turn labels lose their letter (`1.`, `2.`, `4...`). Not yet followed
  here (the first item of the owner's feedback in the backlog).

## In flight

- **A local preview server** may still run on port 4173 (`vite preview`, started by the last session). Stop it, or
  start one with `exec node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort`.
- **The tailnet mapping** `tailscale serve --https=8443` to port 4173 stays until `tailscale serve --https=8443 off`.
  The owner is at this machine now and does not need it.

## Check first

1. Ask the owner whether to commit the game import work.
2. Work through "The owner's feedback on the review, puzzles and import" in the backlog. Ask the owner which first.
   The owner's view on "Retry mistakes": not a tab. The proposal recorded there: a mode of the Analysis panel, as on
   Lichess.
3. The speed numbers so far came from a loaded machine (the engine repository's self-play ran). Rerun the lab's review
   on an idle machine before any change of budget.
