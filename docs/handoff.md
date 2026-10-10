# Handoff (2026-10-11)

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
  the engine's rules), `2d979cb` (protocol 0.3), `c09007c` (the engine's line on the board), `22fde6b` (the line cut
  by its visits, the players' row at narrow widths), `1d746e4` (the listed line, branches, the display settings'
  panel), `98ddc5c` (the player's own moves, the keys and their list, the move menu), then the move sounds and the
  progress bars' gleam (design 08).
- **Checks on the working tree:** `npm run check` has no errors or warnings. `npm test` passes (21 checks). `npm run
  build` succeeds.
- **The engine:** protocol 0.3, build `319a5c4`, the networks b10c128 and b15c192, searching with KataGo's analysis
  defaults. Puzzles and learn run on mock data.

## In flight

- **The engine's lines and the player's variations are built** (design
  [07-lines-and-variations.md](design/07-lines-and-variations.md); the log entries in decisions/product.md from "The
  engine's line on the board" to "The picked line at a fork, single keys, and the list of keys"). The owner has tried
  the keys and asked for the picked line in the move list and single keys, which are in. Still to hear: their view of
  own moves on the board, Space and the double-click, and the right-click menu (Promote variation, Evaluate move
  quality, Delete from here). A branch's edges have no labels unless the player asks, by the
  owner's choice (a line played to show something should cost no search).
- **Move sounds and the progress bars' gleam are built** (design 08, design 06; decisions/product.md,
  "Move sounds, and progress bars that show the work runs"). Every edge sounds like a recorded crayon stroke: five CC0
  strokes the owner chose by ear.
- **The owner's order after it:** learning from mistakes as a mode of the analysis. The speed on a visitor's machine
  waits in the backlog.
- **Testing in Edge:** a hover made with synthetic events is lost when the real pointer rests on the board and the
  board redraws: put the real pointer on the element (the browser tool's hover) for checks that last. Convert page
  coordinates to the screenshot's own size before a real click (the screenshot's width varies, 1,353 to 1,372).
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

1. Take the owner's next item: learning from mistakes as a mode of the analysis (above), or the backlog.
2. The speed numbers so far came from a loaded machine. Rerun the lab's review on an idle machine before any change
   of budget.
