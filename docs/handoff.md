# Handoff (2026-10-10)

**In flight only:** what is half done, and what the next session must check first. Each session rewrites this file.
It holds no backlog: everything still to do that is not in flight is in
[decisions/open-items.md](decisions/open-items.md).

## State

- **Commits:** `39f72e3` (the first state), `bd2df9a` (the review on the engine, the budget measurement), `cc7a769`
  (game import), `61bdbad` (the review's feedback, the notation, the board's candidates, the layout), `812c9b2`
  (request 04 done, the cut mark checked in Chrome), `38d157d` (a cleanup of the library: shared helpers in place of
  copies), `7bb7fde` (the styles in Tailwind CSS 4 with the pages' part of the cleanup), then the review's tables
  fitted to their content (the log entry "The review's tables fit their content" in
  [decisions/product.md](decisions/product.md)).
- **Styles in Tailwind CSS 4** ([design/03-stack.md](design/03-stack.md), "Styles"; the log entry "Styles in
  Tailwind" in [decisions/architecture.md](decisions/architecture.md)). Every page uses utility classes. Plain CSS
  stays for the board's SVG (`Board.svelte`), the review layout grid (`ReviewView.svelte`), and the tokens and base
  styles (`app.css`). The conversion is checked against the build before it. The log entry has the method and the
  fixes.
- **Checks on the working tree:** `npm run check` has no errors or warnings. `npm test` passes (12 checks). `npm run
  build` succeeds.
- **The engine, the review, game import, puzzles and learn:** as at `812c9b2`. Protocol 0.1, build `8195171`, the
  networks b10c128 and b15c192. Puzzles and learn run on mock data.

## In flight

- **The owner's next review changes, being made:** decimals for the accuracy and the average points lost; a thumbs-up
  icon for Excellent, and the check mark for Good only; a narrower win-chance gauge with its text vertical; a display
  menu that stands out from the panel under it.
- **The comparison kit** is in `runs/tailwind-check/` (not in Git): the old build in `before-build/`, `serve.mjs`
  (a static server), `cdp.mjs` and `shots.json` (old and new screenshots side by side), `styles.mjs` (computed
  styles compared element by element), `probe.mjs` (one expression on both builds). They drive headless Edge, which
  hides scroll bars. Use them only when the owner agrees. Visual checks go through Claude in Chrome.
- **Claude in Chrome runs in Edge only.** The owner turned the extension off in Chrome: with both on, the two
  browsers took turns as one device and every action failed.
- **The local servers** ran from this session: the new build on port 4173 (`exec node node_modules/vite/bin/vite.js
  preview --host 127.0.0.1 --port 4173 --strictPort`, again after each `npm run build`) and the old build on port 4174
  (`node runs/tailwind-check/serve.mjs runs/tailwind-check/before-build 4174`). They stop with the session.
- **The tailnet mapping** `tailscale serve --https=8443` to port 4173 stays until `tailscale serve --https=8443 off`.
- **The engine repository is moving its bots to KataGo's GTP engine** and keeping `analysis_enclosure.cfg` for
  analysis only. Read that file's settings again when it lands (the backlog: searching for analysis).

## Check first

1. Finish the owner's review changes, check them in Edge, and show the owner.
2. Then ask the owner what is next. Candidates in the backlog: Bits UI for the tabs and the display menu, compiling
   the engine module once, using the review page's space, searching for analysis, the engine's lines and variations,
   learning from mistakes as a mode, move input on the engine's rules, sound.
3. The speed numbers so far came from a loaded machine. Rerun the lab's review on an idle machine before any change
   of budget.
