# Handoff (2026-10-10)

**In flight only:** what is half done, and what the next session must check first. Each session rewrites this file.
It holds no backlog: everything still to do that is not in flight is in
[decisions/open-items.md](decisions/open-items.md).

## State

- **Commits:** `39f72e3` (the first state), `bd2df9a` (the review on the engine, the budget measurement), `cc7a769`
  (game import), `61bdbad` (the review's feedback, the notation, the board's candidates, the layout), `812c9b2`
  (request 04 done, the cut mark checked in Chrome), `38d157d` (a cleanup of the library), `7bb7fde` (the styles in
  Tailwind CSS 4), `5686e1c` (the review's tables fitted to their content), `ef407ab` (the review's marks, gauge,
  display menu, side columns and move list), then the engine module compiled once, then the review without the
  "Retry mistakes" tab and with Bits UI for its tabs and display menu.
- **Checks on the working tree:** `npm run check` has no errors or warnings. `npm test` passes (12 checks). `npm run
  build` succeeds.
- **The engine:** protocol 0.1, build `8195171`, the networks b10c128 and b15c192. Puzzles and learn run on mock
  data.

## In flight

- **Move input on the engine's rules, for the puzzles first** (moved here from the backlog). Today any point can
  start an edge and nothing checks cuts or protection. After the first point, show where an edge may go: meaf.us
  draws a dashed box of the reach and a ghost edge that shows whether the current choice is legal. Constellation
  highlights the points that complete a legal edge. Either works. The engine's `describe` gives the legal edges, and
  `play` checks one. Lessons and the coming retries need the same.
- **The owner's order after it:** learning from mistakes as a mode of the analysis, then the engine's lines and
  variations. The speed on a visitor's machine waits in the backlog.
- **The comparison kit** is in `runs/tailwind-check/` (not in Git): the old build in `before-build/`, `serve.mjs`
  (a static server), `cdp.mjs` and `shots.json` (old and new screenshots side by side), `styles.mjs` (computed
  styles compared element by element), `probe.mjs` (one expression on both builds). They drive headless Edge, which
  hides scroll bars. Use them only when the owner agrees. Visual checks go through Claude in Chrome.
- **Claude in Chrome runs in Edge only.** The owner turned the extension off in Chrome: with both on, the two
  browsers took turns as one device and every action failed. Keep the Edge window in front for focus checks: a hidden
  page runs no animation frames.
- **The local servers** ran from this session: the new build on port 4173 (`exec node node_modules/vite/bin/vite.js
  preview --host 127.0.0.1 --port 4173 --strictPort`, again after each `npm run build`) and the old build on port 4174
  (`node runs/tailwind-check/serve.mjs runs/tailwind-check/before-build 4174`). They stop with the session.
- **The tailnet mapping** `tailscale serve --https=8443` to port 4173 stays until `tailscale serve --https=8443 off`.
- **The engine repository split its configurations** (its commit `cc18f75`): `analysis_play_enclosure.cfg` for
  playing games, and `analysis_enclosure.cfg`, still unchanged (`wideRootNoise` 0.0), left for analysis. The backlog
  item "Searching for analysis" can go on from there.

## Check first

1. Design the move input with the owner (the meaf.us form or the Constellation form), then build it for the puzzles.
2. The speed numbers so far came from a loaded machine. Rerun the lab's review on an idle machine before any change
   of budget.
