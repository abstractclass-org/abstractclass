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
  panel), `98ddc5c` (the player's own moves, the keys and their list, the move menu), `3aba039` (the move sounds and
  the progress bars' gleam, design 08), `b3fc8c2` (the sound only on a change of the board, the side columns measured
  again when the layout moves), `6a87ac5` (the engine's settings, design 09), then the latest commit (below).
- **Checks on the working tree:** `npm run check` has no errors or warnings. `npm test` passes (21 checks). `npm run
  build` succeeds.
- **The engine:** protocol 0.3, build `319a5c4`, the networks b10c128 and b15c192, searching with KataGo's analysis
  defaults. Puzzles and learn run on mock data.

## In flight

- **Speed on the owner's laptop, measured** (decisions/engine.md, "Speed on a laptop: the engine lab's sweep"): an
  Apple Silicon Mac, 12 cores, 3.2M at 66 visits a second for one worker and 386 for eight. The default pool is now
  half the cores, 1 to 8 (decisions/product.md), not committed.
- **WebGPU on the owner's laptop, measured** ([requests/06-webgpu.md](requests/06-webgpu.md), "Step 1 on an
  integrated GPU"): one position at a time 2 to 4 times one CPU worker, batches of 32 a little more than eight. The
  owner takes the numbers to the engine repository. The tailnet port 8444 is removed.
- **Request 07 (the archive analysed for the labels)**, accepted for a sample of 1,000 games, is written
  ([requests/07-archive-analysis.md](requests/07-archive-analysis.md)) and open: every archive position at 256, 512
  and 1,024 visits with the site's network and settings, and a 4,096 reference on about 100 games, for fitting the
  label thresholds before the first deploy. The owner takes it to the engine repository.
- **Built, not committed:** Biggest mistakes as numbers, the chart's first estimates dashed (design 06), a branch's
  preview on the board (design 07, item 13), checked by the owner, and a played move's preview (item 14). Both end at
  the move and are display settings.
- **Great confirmed by an equal search** (design 05, decisions/product.md): built and checked in Edge on the sample
  game (24 of 28 gaps confirmed).
- **Label checks done** (decisions/product.md, "Label checks under protocol 0.3"). The two games' check had net1's
  review as its reference. The pills' SVG is no longer clipped: the owner to look at the ends.
- **Built in the latest commit:** the label budget under protocol 0.3 and Lite at 512 visits, with labels shown from
  256 visits during a deeper search (decisions/engine.md, design 05, design 09), "Done" after the engine settings'
  last setting, the pills as the default form with closer spacing (design 07), and request 06. Still to hear: the
  owner's view of the pills in use.
- **Request 06 (WebGPU):** step 1 is measured, and the site's answer for step 2 is written
  ([requests/06-webgpu.md](requests/06-webgpu.md)): no need for reproducible searches, batch across searches first,
  and a default chosen on each machine. The owner takes the answer to the engine repository. The engine repository's
  other notes are in decisions/engine.md ("The engine repository's notes").
- **Learning from mistakes is postponed** (decisions/open-items.md). The speed on a visitor's machine waits in the
  backlog too.
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
- **The local server** ran from this session: the new build on port 4173 (`exec node node_modules/vite/bin/vite.js
  preview --host 127.0.0.1 --port 4173 --strictPort`, again after each `npm run build`). It stops with the session.
  The old build on port 4174 (`node runs/tailwind-check/serve.mjs runs/tailwind-check/before-build 4174`) is not
  running.
- **The tailnet mapping** `tailscale serve --https=8443` to port 4173 stays until `tailscale serve --https=8443 off`.
  The server answers the tailnet's name only with the allowed-host variable, and that is for when the owner asks.

## Check first

1. The owner looks for new move sounds (decisions/open-items.md, "Other move sounds"). When they have candidates,
   build a sound lab to compare them by ear (design 08).
2. The speed numbers so far came from a loaded machine. Rerun the lab's review on an idle machine before any change
   of budget.
