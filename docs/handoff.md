# Handoff (2026-10-12)

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
- **Checks on the working tree:** `npm run check` has no errors or warnings. `npm test` passes (52 checks). `npm run
  build` succeeds.
- **The engine:** protocol 0.3, build `632f2a0` from the release `wasm-v2-engine-632f2a0` (the CPU module, the GPU
  module and the graphs: decisions/engine.md, "The release 632f2a0"), the networks
  `b10c128-s66625408` (3.2M parameters) and `b15c192-s66999040` (10.3M), searching with KataGo's analysis defaults. The
  measurements so far used the older `b10c128-s46923648` (decisions/engine.md, "The released engine"). The review's Lite
  depth is 512 visits. Puzzles and learn run on mock data.

## In flight

- **This round, committed after `68d1ab1` and released to `main` on 2026-10-12:**
  - The bookmarklet on a game just over: it opens the game again as a watcher's view (`spectate=1`), and the result
    reads the winner by name (design 11, decisions/product.md, "The bookmarklet on a game just over"). Checked in
    Edge on the owner's test game. The owner drags the bookmarklet to the bar again after the release.
  - The userscript, a second way beside the bookmarklet (design 11, decisions/product.md, "The userscript, a second
    way"): a collie button and a Tampermonkey menu entry, served at `/hedge-school.user.js`. Its header names the
    author (`@author`, `@homepage`). The owner installed it in Edge from the local preview, and its button showed on a
    game opened from meaf.us's history. The bookmarklet's messages now name the bookmark to click.
  - Deleting a game, with an Undo in its row (design 11, decisions/product.md, "Deleting a game, and the browser's
    storage"). The backlog has two new items from it: stale analyses, and storage that the browser may clear.
  - The second code cleanup (`/simplify` since `7bb7fde`): one message channel for both workers (`channel.ts`), the
    CPU worker's network through `fetchArtifact`, a `GpuControl` for each pool, the GPU sampled only while its test
    runs, partial results applied together (`PARTIAL_MS`), the game's positions indexed (`mainKeys`), the cache read
    in one transaction, `LineDrawing` for both lines, one preview state, shared helpers (`storage/local.ts`,
    `deliverExport`, `branchNodes`, `ChartTip`, `rankBadge`). Checked in Edge: the line drawing, the three previews,
    both charts' notes, the board's notes, the candidate's note, the GPU on, off and back. Not checked: an export after
    the cleanup.
- **Then, released to `main` on 2026-10-13:**
  - The engine's best line merged into the branches (design 07, item 15, decisions/product.md, "The engine's best line
    merged into the branches"). Checked in Edge.
  - The e key beside l for the engine's switch, and no key in the switch's note (design 09). Checked in Edge with key
    events sent from a script: the browser tool's key presses did not reach the page in that run.
  - One tab for each game's review, with "Review here" (design 11, decisions/product.md, "One tab for each game's
    review"). Checked in Edge with two tabs.
- **Released to `main` on 2026-10-13:** the bookmarklet as a loader, and both tools telling the import page their version (design 11,
  decisions/product.md, "The bookmarklet and the userscript tell when they are out of date"). After its release, the
  owner drags the bookmarklet to the bar once more: the new one is the loader.
- **Released to `main` on 2026-10-13, after `323a0b5`:**
  - The engine's line listed under the table, pointed at past its 6th edge, drew the later edges with no mover (no
    colour, black badges). Each edge drawn now has its mover. Checked in Edge on a line of 15 edges.
  - `no-cache` for the meaf.us tools' files (hosting.md).
- **Released to `main` on 2026-10-13, after `5a4be2d`:**
  - A review shared by link (design 13, item 8, decisions/product.md, "A review shared by link, and the Greats in the
    review file"). Checked in Edge between two addresses of the local preview.
  - The review file carries the Greats' confirmations, and its import takes the file's network and depth (the same
    entry).
  - The board's line ends by visits only, with no cut at 6 edges (design 07, decisions/product.md, "The board's line
    ends by visits only").
  - hosting.md: the zone's cache rule for the tools' files. To do, by the owner: set it in Cloudflare's dashboard.
- **Released to `main` on 2026-10-13, after `1af74e9`:** the deepest stored result for each position, the Depth's help line and the report's note
  (decisions/product.md, "A deeper search where the player looks: kept, and said"), the Export menu's lines, the
  chart's first estimate faint and solid, a Great's confirmation as deep as the position it is compared with, a game
  that keeps the settings it came with (in place of a change of the browser's), the key moments at twice the
  review's depth, the likely edges' meter hidden while the engine settings are open, the Export's notes in a toast, and design 16
  (every depth and setting together, with examples).
- **Released to `main` on 2026-10-13, after `a6279fa`:** events to Google Analytics (design 17, decisions/product.md, "Events for the decisions that wait on
  data"), and the review's address with its game after the `#`. To do, by the owner, after the release: register the
  parameters in Google Analytics (design 17, "The setup in Google Analytics").
- **For the owner, after the release of `99106ff`:**
  - Drag the bookmarklet to the bar again: its code changed.
  - Install the userscript again from the live site's import page, then remove the copy from the local preview in
    Tampermonkey's dashboard. That copy updates from `127.0.0.1:4173`, and its namespace differs, so Tampermonkey
    keeps both, and both draw a button.

- **Turn mode: built, checked in Edge, committed** (decisions/product.md, "Turn mode built", "Turn mode, first
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
  - **Branches:** work on `dev`, pushed after each commit. Release with `git push origin dev:main` when the owner says
    (hosting.md, section 2). To do, by the owner: remove `VITE_GA_ID` from the Pages project's preview variables.
  - **The engine's name, HedgeFund: done** (request 12, design 09): "HedgeFund 0.1 Lite (6.5 MB)" and "HedgeFund 0.1
    (20.6 MB)" in the engine settings, from the lock's `displayName`.
  - **Hosting: live** at `hedgeschool.abstractclass.org`, set up as [hosting.md](hosting.md) tells
    (decisions/product.md, "The site live on Cloudflare Pages"). Not yet checked: a review on the live site in Edge.
  - **Analytics: live and checked** (decisions/product.md, "The analytics live"): Google Analytics, and Cloudflare Web
    Analytics with its token, the beacon added by the site's code.
  - Done since: the Review link that opens the last game reviewed, the engine's release (request 03), the notation
    page after request 11, the module's notices.
- **The labels: settled** on the engine's own win chance with chess.com's bands (design 10, decisions/product.md,
  "Labels back on the engine's win chance"), tested on games of known strength (requests 09 and 10, done). Not
  committed yet. Request 07 to 10's data stay in the engine repository's `runs/archive_analysis/`, out of Git: commit
  only statistics over many games, never a game.
- **Difficulty: built** (design 14, decisions/engine.md, "KaTrain's complexity on the archive"): KaTrain's complexity
  in win chance from the candidates' priors (the store's shape 5, so stored reviews search again), ◆ on hard positions
  (0.10 or more) with the tooltip "Hard position", the likely edges' meter
  after Maia's under the engine header's line, the Difficulty chart in a tab beside the Advantage chart (both under
  the board now, always in view: design 06), and the accuracy weighed by KaTrain's weights. Checked in Edge.
- **The GPU in the review: released** (design 15, request 06 done, decisions/engine.md, "The GPU in the review" and
  "The release 632f2a0"). Checked in Edge: Auto's test, Off and On, the per-GPU results, and Auto turning the
  integrated Radeon off. Not yet checked: a review on the live site, and a laptop's or a phone's GPU.
- **The round before, `68d1ab1`, released on 2026-10-12:** the labels on the engine's win chance (design 10), the logo (design 12), export and
  import (design 13), the notation's decisions in the export (request 13, done), difficulty with its numbers step by
  step (design 14), the networks' names (request 12, done), drag to play and notes on the board (design 07), no text
  selection (design 06), the protected edges' halo, the STE pass over the documents, and the GPU (design 15).
- **The STE pass** (`/asd-ste100` over `docs/`, its `ste-lint.py`): no semicolons, sentences at most 25 words, no
  present perfect where a simple tense says the same, one verb for one action. Left: 22 flags of two verbs for one
  action that are names or terms ("display settings", a Great's confirmation, DNSSEC validation, the Delete key), and
  about 290 passive-voice advisories, most in the older decision logs. The documents of this round use the active
  voice.
- **The logo: the owner's generated drawing 09,** traced to paths (design 12, decisions/product.md, "The logo from the
  generated drawings", "The charts under the board"): the full drawing from 48 pixels up, the head alone below
  (header, favicon, iOS icon). Checked in Edge in the dark scheme in the site, and in both schemes
  on the comparison page. The tracing scripts are in the session's scratch folder (`trace/`), not in the repository:
  to trace another drawing, write them into `scripts/` first.
- **Move sounds** (design 08, decisions/product.md, "Move sounds: a sound for a cut"). Built and committed: a sound for
  an edge and another for a cut, in two sets: the button by default ("Button Press", "Select Button UI"), and the
  pencil (two strokes, the cut's 12% faster). The crayon and the phone keyboard removed. The owner listens. The cutting
  script is in the session's scratch folder, not in the repository.
- **Not yet heard:** the owner's view of the pills' round ends after the fix (the SVG is no longer clipped).

## Working notes

- **Testing in Edge:** put the real pointer on an element with the browser tool's hover for checks that last. A hover
  made with synthetic events is lost when the board redraws. After a tool hover, read the page a second or more later,
  or log the element's events: the tool's move can land late. Convert page coordinates to the screenshot's own size
  before a real click (the page here is 1,407 pixels wide, the screenshot 1,372).
- **Timers in a page behind other windows** run about once a second, and a script the browser tool runs stops after 45
  seconds. To step through a game from a script, send the keys at once and wait on a `MessageChannel`, not on
  `setTimeout`. Close other review tabs first: two reviews at once make the page too slow to answer.
- **Claude in Chrome runs in Edge only.** With the extension on in Chrome too, the two browsers took turns as one
  device and every action failed. Keep the Edge window in front for focus checks: a hidden page runs no animation
  frames.
- **This machine is often loaded** by the engine repository's training (WSL, about 28 GB, most of the CPU): its speed
  numbers are no baseline then. The owner's laptop gave the clean ones (decisions/engine.md, "Speed on a laptop").
- **Local builds leave `VITE_GA_ID` unset** (`VITE_EDITION=early npm run build`), so that test visits do not reach
  Google Analytics: only the production build on Cloudflare has the ID (hosting.md, section 4).
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
