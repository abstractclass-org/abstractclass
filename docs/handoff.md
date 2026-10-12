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
  again when the layout moves), `6a87ac5` (the engine's settings, design 09), `e2b395d` (Lite at 512 visits, the
  pills, request 06), `aef2b94` (the engine repository's notes, request 06's first numbers and the site's answer),
  `2b29e8a` (Great confirmed by an equal search, the lab's speed sweep, label checks), `40bb303` (the default pool,
  half the cores up to 8), `32668ee` and `d03707d` (request 07, request 06's laptop numbers), `398a2b9` (the previews
  of branches and played moves, the chart's first estimates, "Lines on the board"), then the latest commit (labels by
  turn decided and measured, request 07 changed for both modes, numbers from one side, Biggest mistakes removed, the
  side columns that grow with the window).
- **Checks on the working tree:** `npm run check` has no errors or warnings. `npm test` passes (27 checks). `npm run
  build` succeeds.
- **The engine:** protocol 0.3, build `85c2adb` from the release `wasm-v2-engine-85c2adb` (request 03), the networks
  `b10c128-s66625408` (3.2M parameters) and `b15c192-s66999040` (10.3M), searching with KataGo's analysis defaults.
  The measurements so far used the older `b10c128-s46923648` (decisions/engine.md, "The released engine"). The review's Lite depth is 512 visits. Puzzles and learn run on mock
  data.

## In flight

- **Turn mode: built, checked in Edge, not committed** (decisions/product.md, "Turn mode built", "Turn mode, first
  feedback", "Turn mode, second feedback"). Labels by turn with "Review by" (Turn by default, or Edge), Great by turn,
  the move list's turn column, a turn's badges on both its edges, the chart by turn, the engine's best line as a branch
  under a bad turn, "Evaluate quality" for a branch's turn, Lichess's tree beside the branches, "Review for" (Both,
  Blue, Red), one decimal in the notes, the move menu everywhere in the move list. The label rules are in design 10.
  A turn's notes and branches in one band at the list's left, kept (decisions/product.md, "The notes and branches in
  a band"). The review's progress bar covers the key moments and the Great's confirmations, never goes
  back, and the key moments are searched again after a change of depth. An engine line gleams while it can still
  change (decisions/product.md, "Why the engine's best lines move", "The review's bar"). The bar shows its line's
  step, and the Advantage chart is in the Report, above the counts, with an area line, so the page fits the window
  (decisions/product.md, "The Advantage chart moved", "The Report"): the two-column and one-column layouts, where the
  Report is a tab, are not checked yet.
- **The early access** ([design/11-early-access.md](design/11-early-access.md), decisions/product.md, "Early access:
  the review only, as Hedge School"). Built and checked in Edge: the build switch, the name, no sample game, the
  pages About, The notation, Privacy and Notices, the Constellation import, unlisted. To do:
  - **Hosting, with the owner** (their accounts). Done: the domain is active on Cloudflare, and the private GitHub
    repository `seankao31/hedgeschool` exists, with no push yet. To do: DNSSEC (Cloudflare's DS record at Porkbun);
    the first push, when the owner says so (the remote `origin` is added, SSH to GitHub works, the repository is empty); the Pages project built from it (`npm ci`,
    `npm run engine -- --deploy`, tests, type check, `npm run build`, with `VITE_EDITION=early`,
    `VITE_GA_ID=G-C5RY6DWGWN` and later `VITE_CF_ANALYTICS_TOKEN` as its variables); the custom domain
    `hedgeschool.abstractclass.org`; long caching for `/engine/` (a `_headers` file). Read Cloudflare's current Pages
    guide first.
  - **Analytics: built and checked in Edge** (decisions/product.md, "Early access: the third round"). To do: the
    Cloudflare Web Analytics token once the site is live (its manual snippet, not the Pages project's one-click
    setup). Google Analytics receives the preview's visits (the owner checked).
  - Done since: the Review link that opens the last game reviewed, the engine's release (request 03), the notation
    page after request 11, the module's notices.
- **The labels' measure, reopened.** Built and committed: labels from a practical chance, σ(0.99 · lead /
  scoreStdev) fitted on the archive's games between near-equal players, with chess.com's fixed bands (design 10,
  decisions/product.md, "Labels from a human win chance: built"). The owner's doubts: the archive's players are
  beginners of a two-week-old game, so a curve fitted on them is lenient and will drift as they improve. Points alone
  (KaTrain: the lead lost, whatever the lead) do not tell 30 points lost at +20 from 30 at +120, which the owner wants
  told apart. So a turn's loss needs a curve from lead to the chance of winning, and the open question is its
  steepness: the engine's own win chance (perfect play, too steep), the practical chance (beginners), or a curve
  fitted on weaker versions of the engine (a fallible, competent player, as Lichess fits on 2300 and above). The
  measurements: decisions/engine.md, "Three measures of a turn's loss", "The lead fitted to human games".
  - **A test bench on bot games of known strength:** for each candidate measure, labels should get rarer smoothly as
    the bot gets stronger, the strongest should get few, they should not pile up in the opening or in decided games,
    and the accuracy gap between two bots should follow their Elo gap. Request 09
    ([requests/09-bot-games-analysis.md](requests/09-bot-games-analysis.md), accepted, being run): 620 V2 gauntlet
    games between players rated 2,000 to 3,000; 440 have an earlier b10c128 checkpoint, so fit with and without them.
    Request 10 ([requests/10-visit-ladder-analysis.md](requests/10-visit-ladder-analysis.md), open: the owner takes
    it to the engine repository): the GPU visit ladder's games of the site's network against itself, 16 against 32
    visits up to 512 against 1,024 (384 games).
  - **Committed:** the board's candidates back on the engine's own win chance and points (`shownCandidates`). On
    hold until the measure is chosen: "practical" named in the label notes, and a practical-chance line on the chart.
  - **The new network:** the curve (k 0.99) was fitted on the old small network, and the site now labels with a
    newer, more certain one. To ask the owner: should the engine repository analyse the archive again on it (about
    2.4 hours), and requests 09 and 10 use it?
  - The data: requests 07 and 08 in the engine repository's `runs/archive_analysis/`, out of Git; take each game once.
    Commit only statistics over many games and the curve, never a game.
- **Difficulty:** Guid and Bratko's complexity checked on request 07's readings (decisions/engine.md): it tells when
  players miss the engine's first choice, not when they err. Request 08 is done and checked
  ([requests/08-archive-first-look.md](requests/08-archive-first-look.md), "Delivered"): the prior, 32 visits and every
  candidate at 512 for 79,200 positions. Next: KaTrain's complexity (its constants scaled by 12) and Guid and Bratko's
  with the first look, against people's errors by rating band at the same stake.
- **Request 06 (WebGPU)** waits for the engine repository's step 2. Step 1 is measured on the RTX 5080 and on the
  owner's Apple laptop, and the site's answer is written: no need for reproducible searches, batch across searches
  first, the GPU's default chosen on each machine by a short test ([requests/06-webgpu.md](requests/06-webgpu.md)).
- **Move sounds:** the owner looks for other recordings, perhaps fountain pen strokes (decisions/open-items.md, "Other
  move sounds"). When they have candidates, build a sound lab to compare them by ear (design 08). The first lab was
  not kept.
- **Not yet heard:** the owner's view of the pills' round ends after the fix (the SVG is no longer clipped).

## Working notes

- **Testing in Edge:** put the real pointer on an element with the browser tool's hover for checks that last. A hover
  made with synthetic events is lost when the board redraws. After a tool hover, read the page a second or more later,
  or log the element's events: the tool's move can land late. Convert page coordinates to the screenshot's own size
  before a real click (the page here is 1,407 pixels wide, the screenshot 1,372).
- **Claude in Chrome runs in Edge only.** With the extension on in Chrome too, the two browsers took turns as one
  device and every action failed. Keep the Edge window in front for focus checks: a hidden page runs no animation
  frames.
- **This machine is often loaded** by the engine repository's training (WSL, about 28 GB, most of the CPU): its speed
  numbers are no baseline then. The owner's laptop gave the clean ones (decisions/engine.md, "Speed on a laptop").
- **The local server** ran from this session: the build on port 4173, with the tailnet's name allowed for the
  owner's laptop (`__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=<machine>.<tailnet>.ts.net exec node
  node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort`, again after each `npm run
  build`). It stops with the session. The tailnet mapping `tailscale serve --https=8443` to port 4173 stays until
  `tailscale serve --https=8443 off`.
- **The comparison kit** is in `runs/tailwind-check/` (not in Git): an old build and scripts that drive headless Edge.
  Use it only when the owner agrees. Visual checks go through Claude in Chrome.

## Check first

1. Ask the owner what is next: the label fit on request 07's data, the sound lab when they have recordings, or an
   item of the backlog (decisions/open-items.md).
