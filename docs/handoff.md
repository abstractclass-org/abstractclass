# Handoff (2026-10-09)

**In flight only:** what is half done, and what the next session must check first. Each session rewrites this file.
It holds no backlog: everything still to do that is not in flight is in
[decisions/open-items.md](decisions/open-items.md).

## State

- **The repository** has its documents ([README.md](../README.md)), five design documents, and a SvelteKit project
  that builds to static files. The first state is committed (`39f72e3`). The review on the engine and the budget
  measurement are not committed yet.
- **The engine** is the engine repository's module, protocol 1.0 (`enclosure-engine.wasm`, build `8195171`), with the
  networks b10c128 and b15c192 loaded at run time. `src/lib/engine/` runs it in Web Workers. The engine lab
  (`/lab/engine`) checks it: the board from the engine's rules, an analysis in slices with a stop, a whole-game review
  ([decisions/engine.md](decisions/engine.md), "The engine protocol in the browser").
- **The engine's artifacts** come from local builds in `../enclosure/runs/wasm/v2/` (`engine.lock.json`). Run
  `npm run engine` after a fresh checkout.
- **The review runs on the engine** ([design/05-review-analysis.md](design/05-review-analysis.md)): the rules first,
  a sweep at 32 visits for the graph, a label pass at 256 visits, the position on screen and the key moments to 1,024,
  results kept in the browser. Labels in points (the lead) and win chance, the worse of the two bands. The game is
  still the sample bot game.
- **The budgets are measured** ([decisions/engine.md](decisions/engine.md), "Label agreement against search budget"):
  256 visits is the first budget whose mistake flags are mostly right. Raw data: `runs/measure/` (not in Git).
- **Home, puzzles and learn** still run on mock data ([decisions/product.md](decisions/product.md)).
- **Requests to the engine repository** ([requests/](requests/README.md)): the design pointer and the protocol are
  done. Releases wait for the site's first deploy.

## In flight

- **Showing the site to the owner:** the production build served on this machine and exposed on the tailnet
  (`tailscale serve --https=8443`, https://<machine>.<tailnet>.ts.net:8443/). The preview server stops with the
  session. The tailnet mapping stays until `tailscale serve --https=8443 off`.

## Check first

1. Ask the owner what to build next. The candidates: game import (the engine's notation and `play` make it possible),
   puzzles from real analyses, stored history, a deeper reference for the budgets. The open questions are in the
   backlog.
2. The speed numbers so far came from a loaded machine (the engine repository's self-play ran). Rerun the lab's review
   on an idle machine before any budget decision.
