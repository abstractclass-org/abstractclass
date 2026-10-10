# Handoff (2026-10-10)

**In flight only:** what is half done, and what the next session must check first. Each session rewrites this file.
It holds no backlog: everything still to do that is not in flight is in
[decisions/open-items.md](decisions/open-items.md).

## State

- **Commits:** `39f72e3` (the first state), `bd2df9a` (the review on the engine, the budget measurement), `cc7a769`
  (game import), `61bdbad` (the review's feedback, the notation, the board's candidates, the layout), `812c9b2`
  (request 04 done, the cut mark checked in Chrome), `38d157d` (a cleanup of the library), `7bb7fde` (the styles in
  Tailwind CSS 4), `5686e1c` (the review's tables fitted to their content), `ef407ab` (the review's marks, gauge,
  display menu, side columns and move list), `409eb2c` (the engine module compiled once), `f792275` (the review
  without the "Retry mistakes" tab, and Bits UI for its tabs and display menu), `b73c4ef` (the puzzles' edge input on
  the engine's rules), then protocol 0.3 (decisions/engine.md, "Protocol 0.3").
- **Checks on the working tree:** `npm run check` has no errors or warnings. `npm test` passes (12 checks). `npm run
  build` succeeds.
- **The engine:** protocol 0.3, build `319a5c4`, the networks b10c128 and b15c192, searching with KataGo's analysis
  defaults. Puzzles and learn run on mock data.

## In flight

- **The engine's lines and exploring variations** (moved here from the backlog), being built. Decided with the owner:
  the line of a candidate on the board while the pointer is on it, as numbered edges (KaTrain's and Lizzie's way; to
  check whether cuts make it messy), and listed under the candidates table, where a click plays it to there as a
  branch; a player's own moves always on in the Analysis (Lichess's way, with the puzzles' edge input); branches
  inline in the move list under their turn, with Lichess's keys. The item as it was in the backlog: show the
  engine's best line (KataGo's `pv`, in the replies already) for number 1 and for every candidate, and for any other
  edge on request (search the position after it), so that a player sees why an edge is bad. Play out a line on the
  board, explore variations by hand, show the branches in the move list, and navigate them with keys, as other
  analysis tools do (Lichess, chess.com, KaTrain, Sabaki). To design: the game as a tree of moves, the branch notation
  (the record's `( )` branches), the keys, and how a variation's positions get their analyses. Protocol 0.3 makes an
  analysis independent of the moves before the position, which variations need.
- **The owner's order after it:** learning from mistakes as a mode of the analysis. The speed on a visitor's machine
  waits in the backlog.
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

## Check first

1. Build the engine's lines and variations as decided. Show the owner the line on the board early (the cuts).
2. The speed numbers so far came from a loaded machine. Rerun the lab's review on an idle machine before any change
   of budget.
