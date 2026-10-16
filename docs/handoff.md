# Handoff (2026-10-15)

**In flight only:** what is half done, and what the next session must check first. Each session rewrites this file.
It holds no backlog: everything still to do that is not in flight is in
[decisions/open-items.md](decisions/open-items.md).

## State

- **Live:** `1cd3180` on `main` and `dev`, deployed on 2026-10-15 by the workflow **Deploy** (GitHub Actions). It
  has the move to the organization `abstractclass-org` and the deploy itself, with no change to the site's code since
  `048374e`. decisions/architecture.md, "The repositories move to the organization abstractclass-org", says what was
  checked. The test branch `deploy-test` is deleted. Its preview deployment is still in Pages (**Deployments**).
- **Released before it:** `048374e`. Each part's log entry in decisions/product.md says what was checked:
  - **Practice games stored** (design 25): a game against the bot goes to D1 when it ends (`hedgeschool-games`, and
    `hedgeschool-games-preview` for the previews), with a random ID in the browser when the visitor accepts. The new
    consent banner asks every visitor once (a new key, two purposes). The privacy page has a switch for each purpose
    and "Delete my practice games". The fixes from two Codex reviews: a Decline across tabs, a game that arrives
    after a delete, the switches. Log: "Practice games stored: built".
  - **The layout sweep and CI** (`npm run test:layout`, `tests/layout.spec.ts`, `tests/practice-games.spec.ts`,
    `.github/workflows/tests.yml`): each page at every width from 360 to 1,920 pixels with real scroll bars, the
    review in three displays, and a Decline across two tabs. CI runs the check, the unit tests and the browser tests
    in Chromium on Linux on each push to `dev`, about 10 minutes. Log: "The layout sweep".
  - **One monospaced font:** Fira Code on every system, with the analysis column at 364 pixels (design 06). Log: "One
    monospaced font".
  - **The site's text, a first pass.** Log: "The site's text, a first pass". Left: the passive verbs that the linter
    notes.
- **Released before `048374e`:** `01b29d8`, with `762e92b`:
  - **Practice first** (design 22): first in the header, and the home page's first call to action, beside a board
    that plays three reviewed scenes by edge, with the engine's candidates (`scripts/home-replay.mjs`,
    `HomeReplay.svelte`). Log: product.md, "Practice first" and "The home board plays reviewed scenes".
  - **"Support Us" through Ko-fi** (design 22): the header's button opens Ko-fi's tip panel in the site's dialog,
    with the collie. The site's menu shows below 1,024 pixels, and the button goes into it below 640. The privacy page
    says what goes to Ko-fi. Log: product.md, "Support Us through Ko-fi".
  - **Requests 19 and 20, done:** the reader takes only the start's own turn number after a `Position` tag, the lock
    is on `wasm-v2-engine-85f1792` (practice interface 0.1.1), and Practice takes set-up starts (design 24, item 4).
    requests/19 and requests/20 say what was checked.
  - **The board without bands** (design 03): protected and placed edges on the edge, with a white line. The label
    badge at radius 0.33, sidestepping on a length-1 edge. Log: product.md, "The board without bands".
  - **The review's move list** no longer runs under its scroll bar near 1,280 pixels: the page area is a container,
    and the board pages take their width from it (`100cqw`). Log: product.md, "The review's move list under its
    scroll bar".
  - **Two Google Analytics additions** (design 17): `support_open`, and `practice_from` set_up_start, with no new
    custom dimension.
  - **The site's text by what it does** (CLAUDE.md, "Writing the site's text"). A pass over the pages under this rule
    is not done.
- **Checks on `048374e`:** CI passes (the check, 116 unit tests, 11 browser tests on Linux). The sweep passes in
  Chromium and Edge on Windows. The live site serves it: its pages answer, its stylesheet names Fira Code, and the
  Function on `/api/practice-games` answers 400 to a request that is not JSON (it would answer 503 with no database).
  On the dev preview, a game was sent and then deleted (read through Cloudflare's API).
- **The engine:** protocol 0.6.1, the release `wasm-v2-engine-85f1792` (both analysis modules and the practice bot's
  files, in `engine-85f1792-lib`), with `NOTICES.txt` from `54486cd`, the terms from `27a7414`, and the networks
  and graphs from `wasm-v2-engine-632f2a0`: HedgeFund 0.1 Lite (`b10c128-s66625408`) and HedgeFund 0.1
  (`b15c192-s66999040`). The search is still `fdfe5ad`.
- **Checks on `01b29d8`:** `npm test` passes (111), `npm run check` has no errors or warnings, `npm run build`
  succeeds. In Edge on the local build: each log entry says what was checked and what not. The live site and the
  preview serve `01b29d8`, the live manifest lists the 9 files of `85f1792` with `54486cd`'s notices, and the home,
  Practice, Review, Analysis and Privacy pages answer, with Support Us and the privacy page's Ko-fi section (checked
  by HTTP). Not checked in a browser on the live site.

## In flight

- **One repository for the learning sites** (design 26): planned, not started. Hedge School moves whole into
  `apps/hedgeschool`, beside a hub at `abstractclass.org`. Feature work waits until the move is done. Design 26,
  "Consequences", lists what the move must keep: the deploy from the app's folder, the engine script's path to
  `onnxruntime-web`, the storage keys and the IndexedDB name.
- **To check on the live site:**
  - In Google Analytics' Realtime view (a browser that accepted the cookies, with no ad blocker): `support_open`,
    `practice_from` set_up_start, and Practice's events.
  - The home board in a shown tab: its timing (an edge every 1 to 2 seconds), the pause under the pointer, and
    reduced motion. A tab behind another slows its timers, so this was not measurable in the tests.
  - A tip through Ko-fi's panel, by the owner.
  - The site on a phone: the site's menu with Support Us, the header scrolling away, Practice in one column, and
    the home board.
- **The live site's practice games:** read `hedgeschool-games` after a day of visits (`SELECT outcome, side, network,
  visits, COUNT(*) FROM practice_games GROUP BY 1, 2, 3, 4`), and the Function's errors in Cloudflare's dashboard
  (**Workers & Pages → hedgeschool → Functions**).
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
- **This machine is often loaded** by the engine repository's training: its speed numbers are no baseline then.
- **Local builds leave `VITE_GA_ID` unset** (`VITE_EDITION=early npm run build`), so that test visits do not reach
  Google Analytics.
- **The local server:** `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=<machine>.<tailnet>.ts.net exec node
  node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort`, again after each build. It stops
  with the session.
- **The icon at `/favicon.ico`** is drawn from `src/lib/assets/favicon.svg` by `node scripts/favicon.mjs`, with
  headless Edge. Run it again when the logo changes.

## Check first

1. The move to one repository (In flight, design 26): no feature work until it is done.
2. The live site's practice games (In flight): that games arrive in `hedgeschool-games`, and the Function's errors.
3. The checks on the live site (In flight): Google Analytics' events, the home board in a shown tab, a phone.
4. What the owner thinks of the score display.
5. After the move, the backlog's newest items: Practice's levels, its set-up start and its checks still to run.
