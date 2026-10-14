# Handoff (2026-10-14)

**In flight only:** what is half done, and what the next session must check first. Each session rewrites this file.
It holds no backlog: everything still to do that is not in flight is in
[decisions/open-items.md](decisions/open-items.md).

## State

- **Live:** `f55e0f6` on `main` and `dev`, released on 2026-10-14. Since `543d5df`, two releases:
  - `ab857d7`: search engines (design 23). `robots.txt` allows every page and names the sitemap. Each page has its
    title, description, canonical address and Open Graph tags.
  - `f55e0f6`: the review without layout shift, with a skeleton of its layout while it starts (design 06, item 10).
    Also persistent storage, games that end early, the page How a review works (`/how-reviews-work`), a shorter
    footer, and `/favicon.ico` (design 12). See decisions/product.md, the entries of 2026-10-14.
- **The engine:** protocol 0.5, the release `wasm-v2-engine-27a7414` (both modules), its library and graphs from
  `wasm-v2-engine-632f2a0`, the networks HedgeFund 0.1 Lite (`b10c128-s66625408`) and HedgeFund 0.1
  (`b15c192-s66999040`). The stored results are keyed by the engine's search, `fdfe5ad` (request 17,
  decisions/engine.md, "The release 27a7414").
- **Checks on `f55e0f6`:** `npm test` passes (95), `npm run check` has no errors or warnings, `npm run build`
  succeeds. The layout shift and the skeleton were checked in Edge on the local build. The live site serves
  `/favicon.ico` (3 images), `/how-reviews-work`, the sitemap with it, and `/review` with the new icon link (checked
  by HTTP). Not checked in Edge on the live site.

## In flight

- **Request 18** (every position of a game in one request) is with the engine repository's session. When a release
  brings it, use it in the review's start (`describeGame` in `src/lib/analysis/game.svelte.ts`), then do the checks
  in the request's "Done when".
- **The next engine release** (request 15, Practice) brings protocol 0.6, with `search` in the engine tag and in
  `query_version`. The site accepts protocol 0.5 only (`PROTOCOL_REPORTED` in `src/lib/engine/protocol.ts`). To move to
  it: accept 0.6, take the search from the module (`searchOf` reads `version.search` first), and add 27a7414's CPU
  module to the lock's `sameSearchAs` if the search stays `fdfe5ad`.
- **The layout shift on the live site:** Cloudflare's Web Analytics gave `/review` a CLS of 0.151 before `f55e0f6`.
  On the local build it is now 0 to 0.0023 at the window sizes measured, and 0 on the Review tab. Read Cloudflare's
  Core Web Vitals for `/review` after a few days of visits (hosting.md, "What Cloudflare shows").
- **Google Search Console** (design 23, item 10): the owner registers the site and submits the sitemap. Not done
  yet.

## Working notes

- **Timing the review's start:** `src/routes/review/+page.svelte` sets the performance marks `review:rules` (the rules
  answered) and `review:shown` (the review shows). Read them with `performance.getEntriesByType("mark")`, beside the
  page's paint entries.
- **Testing in Edge:** put the real pointer on an element with the browser tool's hover for checks that last. A hover
  made with synthetic events is lost when the board redraws. Convert page coordinates to the screenshot's own size
  before a real click.
- **A script the browser tool runs** waits for its promise. A promise that never settles, such as an IndexedDB request
  on a store that does not exist, holds the tool for 45 seconds and reads as a frozen page. The site's database is
  `learn-enclosure` (`src/lib/storage/db.ts`). Check its store names before reading them. A stored game's `record` is
  text, not an object.
- **Timers in a page behind other windows** run about once a second. Keep the Edge window in front for checks of
  focus, animation and layout shift.
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

1. Whether the engine repository answered request 18 (`docs/requests/README.md`, and the engine repository's design
   04).
2. Ask the owner what is next. The backlog's newest items come from this session's measurements: the Review tab
   before the page's code runs, the rules worker started with the page, and the review's first frame. Practice waits
   for request 15.
