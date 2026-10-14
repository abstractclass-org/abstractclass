# Handoff (2026-10-14)

**In flight only:** what is half done, and what the next session must check first. Each session rewrites this file.
It holds no backlog: everything still to do that is not in flight is in
[decisions/open-items.md](decisions/open-items.md).

## State

- **Live:** `543d5df` on `main` and `dev`, released on 2026-10-14. The site has the Review tab, the Analysis board with
  its New menu, the board editor (`/editor`), Tools in the header, and Import and Load as two acts (designs 21 and 22,
  decisions/product.md, the entries of 2026-10-14).
- **The engine:** protocol 0.5, the release `wasm-v2-engine-27a7414` (both modules), its library and graphs from
  `wasm-v2-engine-632f2a0`, the networks HedgeFund 0.1 Lite (`b10c128-s66625408`) and HedgeFund 0.1
  (`b15c192-s66999040`). The stored results are keyed by the engine's search, `fdfe5ad` (request 17,
  decisions/engine.md, "The release 27a7414").
- **Checks on `543d5df`:** `npm test` passes (94), `npm run check` has no errors or warnings, `npm run build`
  succeeds. The live site serves `engine-27a7414`, `/editor` and the home page's editor card (checked by HTTP).

## In flight

- **Google Analytics, the changes for loads and the board editor** (design 17, "After the setup"): done on
  2026-10-14, except one step. To do: star `load_saved` as a key event (Admin, **Events**). Google lists an event
  only some hours after it first receives one, from a load on the live site. Done: the dimensions **Load source** and
  **Load failure**, the new descriptions, the funnel's step "Game in" in both tabs and its tab **By load**, the tab
  **Editor users**, and the tabs **Loads** and **Failed loads** with **Load source** in **Old address**.
- **The next engine release** (request 15, Practice) brings protocol 0.6, with `search` in the engine tag and in
  `query_version`. The site accepts protocol 0.5 only (`PROTOCOL_REPORTED` in `src/lib/engine/protocol.ts`). To move to
  it: accept 0.6, take the search from the module (`searchOf` reads `version.search` first), and add 27a7414's CPU
  module to the lock's `sameSearchAs` if the search stays `fdfe5ad`.
- **Not mine to commit:** `docs/hosting.md` has a new section, "What Cloudflare shows", from another session. It is
  left out of the commits. The owner decides.
- **Not checked on the live site:** the board editor and the New menu in Edge (checked on the local build only).

## Working notes

- **Testing in Edge:** put the real pointer on an element with the browser tool's hover for checks that last. A hover
  made with synthetic events is lost when the board redraws. Convert page coordinates to the screenshot's own size
  before a real click.
- **A script the browser tool runs** waits for its promise. A promise that never settles, such as an IndexedDB request
  on a store that does not exist, holds the tool for 45 seconds and reads as a frozen page. The site's database is
  `hedge-school`. Check its store names before reading them.
- **Timers in a page behind other windows** run about once a second. Keep the Edge window in front for checks of
  focus and animation.
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

## Check first

1. Whether `load_saved` shows in GA's events, then star it.
2. Ask the owner what is next: Practice when request 15 is answered, or an item of the backlog.
