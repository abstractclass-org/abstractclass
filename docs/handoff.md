# Handoff (2026-10-15)

**In flight only:** what is half done, and what the next session must check first. Each session rewrites this file.
It holds no backlog: everything still to do that is not in flight is in
[decisions/open-items.md](decisions/open-items.md).

## State

- **Live:** `8b60dd0` on `main` and `dev`, released on 2026-10-15: Practice (design 24), with the parts that it shares
  with the review (design 06: the players' row with the bar centred on the board, the cards on two lines, the move
  list's look, the win bar and gauge, the step bar, the drawn icons, the settings' rows), the skeletons of the
  Analysis board and Practice, the page's own scrolling area under a fixed header on a screen with a mouse and the
  site's menu below 768 pixels (design 22), Practice's Google Analytics events (design 17), and design 25 decided.
- **The engine:** protocol 0.6.1, the release `wasm-v2-engine-54486cd` (both analysis modules and the practice bot's
  files: the two bot modules, the CPU evaluator's module and three scripts, in `engine-54486cd-lib`), its library
  and graphs from `wasm-v2-engine-632f2a0`, the networks HedgeFund 0.1 Lite (`b10c128-s66625408`) and HedgeFund 0.1
  (`b15c192-s66999040`). The search is still `fdfe5ad`.
- **Checks on `8b60dd0`:** `npm test` passes (108), `npm run check` has no errors or warnings, `npm run build`
  succeeds. In Edge on the local build: decisions/product.md, "Practice built", says what was checked and what not.
  The live site and the preview serve `8b60dd0`, `/practice` answers, and the manifest lists the practice bot's
  files (checked by HTTP). Not checked in a browser on the live site. Practice's events not checked in Google
  Analytics.

## In flight

- **Requests 19 and 20, answered** (the engine repository's `85f1792` and its release `wasm-v2-engine-85f1792`):
  - **19:** after a `Position` tag, the first number is the start's own turn, `N...` at a turn's second edge, and a
    reader takes only that number (the engine repository's design 04, "The turns after a set-up start"). To do: make
    `parseRecord` as strict (`src/lib/game/record.ts`), fix the tests whose records number from 1 after a set-up
    start (`partners.test.ts` builds `1. D10-E13` after any tag), and record the reply in the request.
  - **20:** practice bot interface 0.1.1, `enclosure-set-position POSITION` (a position no game reaches is refused,
    `undo` stops at the start, the early temperature counts the start's edges), the same search as 54486cd, and the
    module now refuses unknown commands. To do: the lock to `85f1792`, the request's checks, and a short design pass
    for Practice from a set-up start (`#position=`, the Analysis board's Play on a set-up board, its review on the
    Analysis board, as the Review tab refuses set-up starts), then the build. Its design 22 also says that
    `maxVisits` counts the kept tree's visits: record that in design 24 for the levels.
- **Practice games stored** (design 25): decided, not built, after the requests (its stored game then holds a set-up
  start from the first day). The build: the Pages Function and its D1 schema, the sending and its queue, the
  takebacks and the times kept with the game, the consent banner (its text is in design 25), and the privacy page
  with a switch for each purpose. The owner sets up the databases (production and previews) and their bindings first.
- **To check on the live site:** Practice in Edge, Practice's events in Google Analytics (the nine custom dimensions
  are registered), and the site on a phone (the site's menu, the header scrolling away, Practice in one column).
- **The layout shift on the live site:** Cloudflare's Web Analytics gave `/review` a CLS of 0.151 before `f55e0f6`.
  On the local build it was 0 to 0.0023 at the window sizes measured, and 0.0025 at 1,282 pixels after `8b60dd0`'s
  changes (the summary column). Read Cloudflare's Core Web Vitals for `/review` after a few days of visits
  (hosting.md, "What Cloudflare shows").
- **Google Search Console** (design 23, item 10): the owner registers the site and submits the sitemap. Not done
  yet.

## Working notes

- **The owner plays in this browser** (Edge, the local build): practice games and reviews of their own. Before a
  test that plays, save the keys that it changes (`hedge-school:practice-*`, the review's display settings) and the
  games' ids, and put them back after. Read the state again before each test: the owner plays between them.
- **The local server and a build:** stop the server before `npm run build`, then start it again. A build under a
  running server can stop it (a page asks for `_app/version.json` while the build replaces it).
- **The browser tool's keys:** "PageDown", not "Page_Down": a key name that the tool does not know sends nothing, and
  the test then means nothing. Check that the key arrived (a `keydown` listener) before reading its effect.

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
