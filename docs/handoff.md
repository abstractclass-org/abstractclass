# Handoff (2026-10-10)

**In flight only:** what is half done, and what the next session must check first. Each session rewrites this file.
It holds no backlog: everything still to do that is not in flight is in
[decisions/open-items.md](decisions/open-items.md).

## State

- **Commits:** `39f72e3` (the first state), `bd2df9a` (the review on the engine, the budget measurement), `cc7a769`
  (game import), then the latest commit: the review's feedback rounds, the notation's changes, the protocol's
  versions, the board's candidates, the pool, and the review page's layout.
- **The engine:** the engine repository's module, protocol 0.1 (`enclosure-engine.wasm`, build `8195171`, which
  reports 0.1 as 1.0), with the networks b10c128 and b15c192 loaded at run time (`engine.lock.json`, `npm run
  engine`). `src/lib/engine/` runs it in Web Workers. The site accepts only protocol 0.1. Protocol 0.2 exists in the
  engine repository (the backlog).
- **The review** runs on the engine ([design/05-review-analysis.md](design/05-review-analysis.md)), in the layout of
  [design/06-review-layout.md](design/06-review-layout.md): the board fills the height, three columns from 1,260
  pixels, the Advantage chart under the board, a display menu (the win bar or gauge, the board's layers, the chart's
  score line). The candidates follow KataGo's visit rule ([decisions/product.md](decisions/product.md), "The
  candidates"). The move list shows the lead after each move.
- **Game import** ([decisions/product.md](decisions/product.md), "Game import"): a pasted record on Home, or the meaf.us
  bookmarklet (`/import`). Records are kept with the cut mark (`D10-G10x`), from the engine's rules.
- **Puzzles and learn** still run on mock data.
- **Tests:** `npm test` (12 checks: the record reader with the cut mark, and the meaf.us conversion). `npm run check`
  for types.

## In flight

- **Not checked in a browser:** an import with a wrong cut mark (the engine's refusal), and a stored record with marks
  added. The tests cover the reader and `markCuts`.
- **Request 04 to the engine repository** ([requests/04-edge-visits-and-order.md](requests/04-edge-visits-and-order.md))
  is written. The owner passes it on.
- **The local preview server** runs on port 4173, with the tailnet hostname allowed
  (`__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS`). `vite preview` indexes the build when it starts, so restart it after
  each `npm run build`, or the new files are not found (404).
- **The tailnet mapping** `tailscale serve --https=8443` to port 4173 stays until `tailscale serve --https=8443 off`.
- **The engine repository's visit-ladder match** (`tools/wasm_match.mjs`, 2,048 against 1,024 visits) keeps the CPU
  near 100%. A review in the browser is slow while it runs, and a hidden tab slows it further. That is not a bug.
- **The engine repository is moving its bots to KataGo's GTP engine** and keeping `analysis_enclosure.cfg` for
  analysis only. Read that file's settings again when it lands (the backlog: searching for analysis).

## Check first

1. Ask the owner what is next. The candidates in the backlog: using the review page's space (the chart, the summary
   column), searching for analysis (`wideRootNoise`, KaTrain's extra analyses; it bears on the Great label), the
   engine's lines and exploring variations, learning from mistakes as a mode of the analysis, move input on the
   engine's rules, sound.
2. The speed numbers so far came from a loaded machine. Rerun the lab's review on an idle machine before any change
   of budget.
