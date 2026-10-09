# Handoff (2026-10-09)

**In flight only:** what is half done, and what the next session must check first. Each session rewrites this file.
It holds no backlog: everything still to do that is not in flight is in
[decisions/open-items.md](decisions/open-items.md).

## State

- **The repository** has its documents ([README.md](../README.md)), four design documents, and a SvelteKit project
  that builds to static files. Nothing is committed yet.
- **The engine** is the engine repository's module, protocol 1.0 (`enclosure-engine.wasm`, build `8195171`), with the
  networks b10c128 and b15c192 loaded at run time. `src/lib/engine/` runs it in Web Workers. The engine lab
  (`/lab/engine`) checks it: the board from the engine's rules, an analysis in slices with a stop, a whole-game review
  ([decisions/engine.md](decisions/engine.md), "The engine protocol in the browser").
- **The engine's artifacts** come from local builds in `../enclosure/runs/wasm/v2/` (`engine.lock.json`). Run
  `npm run engine` after a fresh checkout.
- **The prototypes** of each main part run on mock data: home, review, puzzles, learn
  ([decisions/product.md](decisions/product.md)). The review's mock data came from the old module (win values only).
- **Requests to the engine repository** ([requests/](requests/README.md)): the design pointer and the protocol are
  done. Releases wait for the site's first deploy.

## In flight

- **Showing the site to the owner:** the production build served on this machine and exposed on the tailnet
  (`tailscale serve --https=8443`, https://<machine>.<tailnet>.ts.net:8443/). The preview server stops with the
  session. The tailnet mapping stays until `tailscale serve --https=8443 off`.

## Check first

1. Ask the owner what to build next. The candidates: the review on the real engine (a worker pool, KaTrain's schedule
   of a fast sweep then deeper searches, results kept in the browser), the noise floor of the labels, game import,
   stored history. The open questions are in the backlog.
2. The speed numbers so far came from a loaded machine (the engine repository's self-play ran). Rerun the lab's review
   on an idle machine before any budget decision.
