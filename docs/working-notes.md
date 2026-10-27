# Working notes

How to work and test on this machine. Each note is a lesson that holds from session to session. Add a note when you
learn one, and remove a note when it stops being true. The work itself is in beads (label `site`).

- **Where the commands run:** `npm ci` at the repository's root, and the site's commands (the npm scripts, the
  scripts in `apps/hedgeschool/scripts/`, Playwright) in `apps/hedgeschool`. The scripts in the root's `scripts/`
  (the repository's own checks, README.md) run at the root. The shared packages' type checks and tests run in each
  package's folder, or all from the root: `npm run check --workspace=packages` and `npm test --workspace=packages`
  (design 29).
- **Before a commit, run `npm run check:all` at the root.** It runs the Tests workflow's checks before its browser
  tests, with the workflow's settings (the list is in `scripts/check-all.mjs`), and its last line gives each step's
  result. It takes minutes and builds the site: start it through `scripts/machine run` in the planning folder. Its
  engine step refuses a local engine file, as the deploy does.
- **The Git settings of this repository's checkouts.** The worktrees share the main checkout's settings, so these run
  once, in the main checkout, and a worker does not run them:
  - `git config core.hooksPath .githooks` turns on the two hooks. The commit-msg hook refuses a subject or a body
    line over 72 characters (CLAUDE.md in the planning folder, "Commit messages"). A body line of one word, such as a
    URL, may be longer. The pre-commit hook refuses a staged Markdown line over 120 characters, by the rules of the
    workflow Documents (below). A refused commit is not made: wrap the message or the lines, and commit again.
  - `git config merge.decision-log.driver "git merge-file --union --diff3 %A %O %B"` turns on the union merge of
    the decision logs (`.gitattributes`, docs/decisions/README.md). A rebase over another branch's new entry then
    keeps both entries, with no conflict. So add each entry at the end of its file. Two edits of the same lines give
    no conflict either: after a rebase, read each earlier entry that both branches changed.
- **The documents wrap at 120 characters.** The workflow Documents refuses an added Markdown line over 120 characters
  in a push to `dev`. A table row, a line in a code block and the length of a URL do not count. The pre-commit hook
  runs the same check on each commit. To check a branch: `node scripts/doc-widths.mjs origin/dev` at the root.
- **After a deploy, check the site:** `node scripts/release-check.mjs <base URL>` in `apps/hedgeschool`
  (docs/hosting.md, "Deploy, check and roll back").
- **The owner plays in this browser** (Edge, the local build): practice games and reviews of their own. Before a
  test that plays, save the keys that it changes (`hedge-school:practice-*`, the review's display settings) and the
  games' ids, and put them back after. Read the state again before each test: the owner plays between them.
- **Edge starts only with `HS_EDGE=1`,** and only the owner sets it: an Edge that a worker starts signs a new profile
  in to the owner's Windows account and syncs the owner's extensions. Every script that can start a browser goes
  through one gate, `scripts/edge.mjs`. The layout test does too. Only the gate gives Edge's program. Without the
  variable, a script refuses Edge with a message that names the variable, and a browser list is Chromium alone by
  default. A new script that starts a browser uses the gate.
- **The layout test** (`npm run test:layout` in `apps/hedgeschool`) runs in Chromium alone. Its default address is the
  owner's preview on port 4173. A worker sets `BASE_URL` to its own preview (another port, or a Cloudflare preview).
  Set it in the job's environment. From Git Bash: `BASE_URL=http://127.0.0.1:5216 MSYS_NO_PATHCONV=1 scripts/machine
  run … --windows -- cmd /c "npx playwright test …"`. Do not write `set "BASE_URL=…"` in the text after `cmd /c`: from
  Git Bash, its quotes reach cmd with backslashes, cmd does not set the variable, and the tests go to port 4173 with no
  error. The project `edge` comes only with `HS_EDGE=1` (the note "Edge starts only with `HS_EDGE=1`").
  `npx playwright test --list` shows the tests with no browser, and shows the project `edge` only with the variable.
- **The layout test on Drawing Board:** the test "the monospaced font draws no ligatures on Drawing Board" runs only
  when `DB_BASE_URL` gives the address of a running Drawing Board preview. Without the variable, Playwright skips the
  test with no error: its line in the output shows `-`, not `ok` or `✓`. The Tests workflow builds Drawing Board in
  each run, starts its preview on port 4174 and sets the variable. To run the test here, build Drawing Board (`npm run
  build` in `apps/drawingboard`). Start its preview as in the note "The local server", in `apps/drawingboard` and on a
  port other than Hedge School's. Then set `DB_BASE_URL` to the address of that preview, in the same way as `BASE_URL`
  (the note "The layout test"). The test does not serve a build itself, because a stale build would pass with no
  message.
- **The local server and a build:** stop the server before `npm run build`, then start it again. A build under a
  running server can stop it (a page asks for `_app/version.json` while the build replaces it).
- **The local server:** `node ../../node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort`
  in `apps/hedgeschool` (npm puts Vite in the workspace's `node_modules` at the root), again after each build. It
  stops with the session. The owner opens it from other devices through Tailscale: Vite then takes the machine's
  Tailscale name from the user environment variable `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS`. The name stays out of
  the repository.
- **Local builds leave `VITE_GA_ID` unset** (`VITE_EDITION=early npm run build`), so that test visits do not reach
  Google Analytics.
- **This machine is often loaded** by the engine repository's training: its speed numbers are no baseline then.
  Compare two builds in pairs: each pair is one build's set of runs, then the other's, back to back, and the build
  that runs first takes turns. Before each set, read the machine's state (`scripts/machine status` in the planning
  folder, `abstractclass-org`). A change counts only where every pair agrees, and where the gain is at least the
  spread between sets of one build. Chrome's trace gives each task's thread time, which the wait for a processor does
  not change.
- **Measuring speed in a browser:** a measuring script takes its tools from `scripts/measure/speed.mjs`. Do not
  write them again. Its tests are in `speed.test.mjs`. `review-first-frame.mjs`, `review-start.mjs`,
  `review-sweep.mjs` (a sweep's tasks, two builds in pairs), `review-hidden.mjs` (a review in a tab in front and in a
  hidden tab, in Chromium, and in Edge with `HS_EDGE=1`), `worker-yield.mjs` (a worker's yield between two slices of
  a search), `review-ownership.mjs` (a whole review's time and store, two builds in pairs), `layout-shift.mjs` and
  the area map's scripts (`candidate-map-delay.mjs`, `line-map-lag.mjs`, `map-pass.mjs`, `map-wait-check.mjs`) use
  it.
  - `watchSweep(settings)` is an init script that marks a review's sweep (`sweep:start`, `sweep:end`) and notes each
    search that the page sends to a worker, and each worker made and ended. `sweepGaps` gives the gaps between one
    engine's searches from those notes. `launchHideable` gives a browser whose tab can be hidden (see "A hidden tab in
    Playwright").
  - `preview(dir, port)` serves a build folder on a port of its own, as Cloudflare Pages serves it, with the headers
    of the folder's own `_headers`. To compare two builds, copy `build` to a folder in `runs/` (Git ignores it) after
    each build, and serve each copy on its own port.
  - `launch()` starts Playwright's Chromium with its scroll bars. `trace(browser, page, act)` records Chrome's trace
    while `act` runs.
  - `storeReview(page, url)` keeps the review of the test fixture (`FIXTURE`) in the page's browser, and waits until
    the review is done. `reloadReview(page)` reloads it, and waits for the review's first frame (`review:shown`) and
    3 seconds more. `importFile(page, url, file)` imports a review file or an analysis file.
  - `tasksBetween(trace, from, to, { paint })` gives the main thread's tasks between two marks, each with its wall
    time and its thread time. `eventTime(trace, name)` gives a named event's count and times on every thread.
    `longTasks(times)` gives the tasks over 50 ms (`LONG_TASK`): how many, their time beyond 50 ms, and the longest.
  - `layoutShift(page, since)` gives the page's Cumulative Layout Shift and each element that moved. It reads a
    buffered `PerformanceObserver`: `performance.getEntriesByType("layout-shift")` gives no entries.
    `layout-shift.mjs` compares two builds' layout shift with it, on the review, on the Analysis board and on the
    Review tab, in pairs.
  - `inPairs(builds, count, run)` runs two builds in alternating pairs, and reads the machine's load
    (`machineLoad()`) before each run. `verdict(pairs)` gives each pair's difference, each build's median and spread,
    and whether the pairs show a change: every pair agrees, and the median difference is at least the larger of the
    two builds' spreads. The sign of the difference tells a gain from a loss. `verdictText(v, f)` writes a verdict
    as one line.

  ```js
  import { inPairs, launch, preview, verdict } from "./speed.mjs";
  const builds = [await preview("runs/before", 4191), await preview("runs/after", 4192)];
  const browser = await launch();
  const pairs = await inPairs(builds, 5, async ({ url }) => { /* one set of runs at url: give its median */ });
  console.log(verdict(pairs.map(pair => pair.map(run => run.result))), pairs.map(pair => pair.map(run => run.load)));
  ```
- **A hidden tab in Playwright:** a browser that Playwright launches never hides a page. Its switches
  (`--disable-background-timer-throttling`, `--disable-renderer-backgrounding`,
  `--disable-backgrounding-occluded-windows`) stop the throttling, and its focus emulation
  (`Emulation.setFocusEmulationEnabled`) keeps `document.visibilityState` "visible", also behind another tab and in a
  minimized window. `launchHideable` in `scripts/measure/speed.mjs` starts Chromium (or Edge, with `HS_EDGE=1`)
  itself, headless, with a temporary profile, and connects with `connectOverCDP` and `noDefaults`. A new tab in front
  then hides the page, as a visitor's browser does:
  - **A browser started by hand needs Playwright's switches that keep its profile apart** (`APART` in `speed.mjs`).
    Without them, Edge signs a new profile in to the Windows account and syncs that account's extensions into it.
    They then install and open pages of their own, which hide the page and take the processor. Playwright's own
    contexts are off the record, but Playwright turns on its focus emulation in them, so the page stays in the
    profile's own context. `close()` throws when the profile signed in all the same.
  - The page's timers run once a second. After 5 minutes hidden and 30 seconds of silence, its chained timers (a
    timer set by a timer, 5 deep or more) run once a minute. A worker's timers are not throttled in Chromium. In
    Edge they run about 64 times a second (the system's timer resolution, 15.6 ms).
  - The hidden tab's renderer process gets the Idle priority class and Windows' power throttling (EcoQoS). Under
    `scripts/machine run`, the job object holds every process at BelowNormal, so the Idle class does not apply there.
  - Playwright's waits (`waitForFunction`, the checks before a click) use the page's animation frames or its timers,
    which a hidden page runs late or not at all. Ask from Node instead, with `page.evaluate` in a loop.
  - Each run reads `document.visibilityState` and the interval of a chained timer, to check the set-up
    (`scripts/measure/review-hidden.mjs`).
- **A size that the first frame needs** comes from CSS or from a read as the element mounts, not from a
  `ResizeObserver` (or Svelte's `bind:offsetHeight`, which uses one). The observer's first call comes after the
  frame's layout, and Chromium counts a change that it makes as a layout shift. A read at mount forces a layout, which
  costs time in the first frame: prefer CSS.
- **The browser tool's keys:** "PageDown", not "Page_Down": a key name that the tool does not know sends nothing, and
  the test then means nothing. Check that the key arrived (a `keydown` listener) before reading its effect.
- **Timing the review's start:** `src/routes/review/+page.svelte` sets the performance marks `review:rules` (the rules
  answered) and `review:shown` (the review shows), and `packages/review/src/ReviewView.svelte` sets `review:moves` (the
  move list's rows, a frame later). Read them with `performance.getEntriesByType("mark")`, beside the page's paint
  entries. `node scripts/measure/review-first-frame.mjs` reloads a stored review and reads the first draw's tasks, by
  wall time and thread time, and the page's layout shift. `node scripts/measure/review-start.mjs <before> <after>`
  times the steps before the review shows (the game's read, the lock, the manifest, the rules worker's start, the
  marks) in two builds, in pairs. The first engine result has no mark. To time it, wrap `Worker` in a Playwright init
  script (`addInitScript`), and note the first message whose reply has `rootInfo`. A fresh browser context gives a
  review with no stored results.
- **The CPU time of a SHA-256 check:** Chrome's trace event `DoDigest` (category
  `disabled-by-default-devtools.timeline`) gives the thread time (`tdur`) of each `crypto.subtle.digest` call. It
  shows on the thread that calls it: the page's main thread or a worker's. `eventTime(trace, "DoDigest")` in
  `scripts/measure/speed.mjs` adds them up. A worker's console messages and requests reach Playwright's
  `page.on("console")` and `page.on("request")`.
- **The GPU in Playwright's Chromium:** headless Chromium gets WebGPU on the real GPU with `--enable-unsafe-webgpu
  --use-angle=d3d11 --enable-features=Vulkan`. With `--use-webgpu-adapter=swiftshader --enable-unsafe-swiftshader`
  added, it gets Chrome's software adapter, which uses no GPU. The software adapter runs the GPU worker and the
  practice bot's GPU form, slowly: it checks that a path works, not its speed. Use it by default. A run on the real
  GPU goes through `scripts/machine run --gpu` in the planning folder (`abstractclass-org`): that job pauses the
  engines' training on the GPU and guards it. A GPU timeout of Windows (a TDR) on 2026-10-20 came from a client of
  the GPU on Windows while no training ran. Check that the GPU worker started before a
  measurement relies on it: in one review with the real GPU's flags, WebGPU gave an adapter, but the engine settings
  said "The GPU did not start: 9943656". The cause is not known.
- **A unit test of a module with runes** (`*.svelte.ts`): import `@abstractclass/analysis/testing/svelteModules.ts`
  first, then the module by a dynamic import, as `packages/analysis/src/analysis.test.ts` does. In Node the browser's
  store finds no IndexedDB, and every read of it answers as if the store were empty. The cache's memory (`cache.ts`)
  still keeps each result put in it, for the rest of the test file.
- **Request 18's check, again** (on a new release): `node scripts/measure/describe-game-check.mjs
  ../../../engines/runs/archive/games.jsonl [games]`, after `npm run engine`. All 6,246 games take about 6 minutes. It
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
  `learn-enclosure` (`packages/storage/src/db.ts`). Check its store names before reading them. A stored game's `record`
  is text, not an object. Save what a test changes (a game's variations, the board under the key `board`, the engine
  settings) and put it back after.
- **Claude in Chrome runs in Edge only.** With the extension on in Chrome too, the two browsers took turns as one
  device and every action failed.
- **Google Analytics in the browser tool:** after a save, find the table's filter field again before typing: the old
  reference can send the keys to GA's top search. Rename an exploration's tab by a double-click on the active tab's
  label, after a screenshot: the tab strip moves when a tab opens.
- **The icon at `/favicon.ico`** is drawn from `src/lib/assets/favicon.svg` by `node scripts/favicon.mjs`, with
  headless Edge. Run it again when the logo changes. It needs `HS_EDGE=1`, so only the owner runs it.
