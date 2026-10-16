# Working notes

How to work and test on this machine. Each note is a lesson that holds from session to session. Add a note when you
learn one, and remove a note when it stops being true. The work itself is in beads (label `site`).

- **The owner plays in this browser** (Edge, the local build): practice games and reviews of their own. Before a
  test that plays, save the keys that it changes (`hedge-school:practice-*`, the review's display settings) and the
  games' ids, and put them back after. Read the state again before each test: the owner plays between them.
- **The local server and a build:** stop the server before `npm run build`, then start it again. A build under a
  running server can stop it (a page asks for `_app/version.json` while the build replaces it).
- **The local server:** `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort`, again
  after each build. It stops with the session. The owner opens it from other devices through Tailscale: Vite then
  takes the machine's Tailscale name from the user environment variable `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS`. The
  name stays out of the repository.
- **Local builds leave `VITE_GA_ID` unset** (`VITE_EDITION=early npm run build`), so that test visits do not reach
  Google Analytics.
- **This machine is often loaded** by the engine repository's training: its speed numbers are no baseline then.
- **The browser tool's keys:** "PageDown", not "Page_Down": a key name that the tool does not know sends nothing, and
  the test then means nothing. Check that the key arrived (a `keydown` listener) before reading its effect.
- **Timing the review's start:** `src/routes/review/+page.svelte` sets the performance marks `review:rules` (the rules
  answered) and `review:shown` (the review shows). Read them with `performance.getEntriesByType("mark")`, beside the
  page's paint entries.
- **Request 18's check, again** (on a new release): `node scripts/measure/describe-game-check.mjs
  ../engines/runs/archive/games.jsonl [games]`, after `npm run engine`. All 6,246 games take about 6 minutes. It
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
- **The icon at `/favicon.ico`** is drawn from `src/lib/assets/favicon.svg` by `node scripts/favicon.mjs`, with
  headless Edge. Run it again when the logo changes.
