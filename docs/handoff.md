# Handoff (2026-10-14)

**In flight only:** what is half done, and what the next session must check first. Each session rewrites this file.
It holds no backlog: everything still to do that is not in flight is in
[decisions/open-items.md](decisions/open-items.md).

## State

- **Live:** `314ca24` on `main` and `dev`, released on 2026-10-14. Since `f55e0f6`, three commits:
  - `2d88f8a`: the third code cleanup. The engine behind the review and the Analysis board is one class
    (`src/lib/analysis/session.svelte.ts`), and the board starts it while it chooses its board. Also: one reader for
    review and analysis files, the storage helpers everywhere, Arrival's phase as one value, the menus' and dialogs'
    Tailwind utilities (`src/app.css`). The Import dialog's Cancel no longer imports.
  - `ce6753d`: one search after an idle release starts no GPU (design 15, decisions/engine.md). The Review tab's
    Export reads the review that the game shows (`settingsFor`, decisions/product.md).
  - `5da9832`: engine release `wasm-v2-engine-54486cd`, protocol 0.6.1 (decisions/engine.md, "The release 54486cd").
- **The engine:** protocol 0.6.1, the release `wasm-v2-engine-54486cd` (both analysis modules), its library and graphs
  from `wasm-v2-engine-632f2a0`, the networks HedgeFund 0.1 Lite (`b10c128-s66625408`) and HedgeFund 0.1
  (`b15c192-s66999040`). The search is still `fdfe5ad`, and the CPU modules of `fdfe5ad` and `27a7414` are in
  `sameSearchAs`. The release's practice files (request 15) are in the lock on `dev`, not committed yet: the two bot
  modules, the CPU evaluator's module, and the three scripts, in `engine-54486cd-lib` (an artifact's `dir`).
- **Checks on `314ca24`:** `npm test` passes (99), `npm run check` has no errors or warnings, `npm run build`
  succeeds. `npm run engine` runs the CPU module in Node and checks the lock's protocol and search against it, on
  Cloudflare's build too. Request 18's checks are in requests/18-describe-game.md. In Edge on the local build: a
  stored review opened as done, the GPU started on the new GPU module, and the Analysis board played moves. On the
  preview, only `2d88f8a`'s Cancel was checked in Edge. The live site serves `314ca24`, with the modules of
  `54486cd`, and its pages answer (checked by HTTP). Not checked in Edge on the live site. The GPU's first-use test
  runs again once on each machine, because the GPU module is a new build (design 15).

## In flight

- **Practice, built and revised after a first look, not committed** (design 24, decisions/product.md "Practice
  built"): the page `/practice`, `src/lib/practice/`, `src/lib/engine/ort.ts`, the lock's practice files, the header
  and sitemap entries, the Analysis board's Play button, and the parts it now shares with the review
  (`src/lib/review/PlayerRow.svelte`, `PlayerCard.svelte`, `moveList.ts`, `src/lib/ui/ShareBar.svelte`,
  `Setting*.svelte`, `SoundSettings.svelte`, `settings.ts`, and the Advantage chart's `span`).
  `npm test` passes (106), `npm run check` has no errors or warnings, `npm run build` succeeds. Checked in Edge on the
  local build (the log entry says what, and what not). Commit it when asked, then check it on the preview. The checks
  still to run are in the backlog.
- **Practice's points bar** (design 24, item 12): its area lane and its direction, as switches. No chart. The bar is
  centred on the board in the review too, and the cards have two lines on every page (design 06). The settings are
  kept under `hedge-school:practice-display:2`. The `:1` key and `hedge-school:practice-score-picture:1` are left
  over in this browser from earlier builds, unread.
- **The page's own scrolling area under the header** (design 22), on a screen with a mouse: check on the preview
  on a phone (the usual page, with the header scrolling away), printing, and the review and the Analysis board at
  more window sizes.
- **The owner's practice game in this browser** (Edge, the local build): a game in progress at 1,024 visits. Tests
  here saved it and put it back. Do the same, or test in another browser profile.
- **Practice games stored** (design 25): decided, not built. The build: the Pages Function and its D1 schema, the
  sending and its queue, the takebacks and the times kept with the game, the consent banner's text, and the privacy
  page. The owner sets up the databases (production and previews) and their bindings first.
- **Google Analytics for Practice** (design 17): the nine custom dimensions (the rows from `practice_from` to
  `practice_game` in design 17's table) are registered. The events are not checked in a browser yet: a local build
  has no Google Analytics. Their parameters are tested (`practice.test.ts`). Check them in GA's DebugView or
  Realtime on the live site.
- **Requests 19 and 20:** the engine repository has answered both. Read the replies and record them in the
  requests (the first turn's number after a `Position` tag, and the practice bot from a set-up start).
- **The layout shift on the live site:** Cloudflare's Web Analytics gave `/review` a CLS of 0.151 before `f55e0f6`.
  On the local build it is now 0 to 0.0023 at the window sizes measured, and 0 on the Review tab. Read Cloudflare's
  Core Web Vitals for `/review` after a few days of visits (hosting.md, "What Cloudflare shows").
- **Google Search Console** (design 23, item 10): the owner registers the site and submits the sitemap. Not done
  yet.

## Working notes

- **Timing the review's start:** `src/routes/review/+page.svelte` sets the performance marks `review:rules` (the rules
  answered) and `review:shown` (the review shows). Read them with `performance.getEntriesByType("mark")`, beside the
  page's paint entries.
- **Request 18's check, again** (on a new release): `node scripts/measure/describe-game-check.mjs
  ../enclosure/runs/archive/games.jsonl [games]`, after `npm run engine`. All 6,246 games take about 6 minutes. It
  prints counts only.
- **Testing in Edge:** put the real pointer on an element with the browser tool's hover for checks that last. A hover
  made with synthetic events is lost when the board redraws. Convert page coordinates to the screenshot's own size
  before a real click: the screenshot's frame changes with the window's size.
- **A tab behind other windows** reports `document.visibilityState` "hidden". It runs no animation frame, so a Bits UI
  menu does not open on a click there, and a closed dialog stays in the page. Open a menu from the keyboard: focus its
  trigger, then send Enter, also on its entries. Its timers run about once a second, so keep a script's waits under
  the tool's 45 seconds. Keep the Edge window in front for checks of focus, animation and layout shift.
- **A script the browser tool runs** waits for its promise. A promise that never settles, such as an IndexedDB request
  on a store that does not exist, holds the tool for 45 seconds and reads as a frozen page. The site's database is
  `learn-enclosure` (`src/lib/storage/db.ts`). Check its store names before reading them. A stored game's `record` is
  text, not an object. Save what a test changes (a game's branches, the board under the key `board`, the engine
  settings) and put it back after.
- **Claude in Chrome runs in Edge only.** With the extension on in Chrome too, the two browsers took turns as one
  device and every action failed.
- **Google Analytics in the browser tool:** after a save, find the table's filter field again before typing: the old
  reference can send the keys to GA's top search. Rename an exploration's tab by a double-click on the active tab's
  label, after a screenshot: the tab strip moves when a tab opens.
- **This machine is often loaded** by the engine repository's training: its speed numbers are no baseline then.
- **Local builds leave `VITE_GA_ID` unset** (`VITE_EDITION=early npm run build`), so that test visits do not reach
  Google Analytics.
- **The local server:** `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=<machine>.<tailnet>.ts.net exec node
  node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort`, again after each build. It stops
  with the session.
- **The icon at `/favicon.ico`** is drawn from `src/lib/assets/favicon.svg` by `node scripts/favicon.mjs`, with
  headless Edge. Run it again when the logo changes.

## Check first

1. Practice on `dev` (In flight): whether it is committed, and the preview's check of it in Edge.
2. Requests 19 and 20: whether the engine repository answered.
3. What the owner thinks of the score display.
4. The backlog's newest items: Practice's levels, its set-up start and its checks still to run.
