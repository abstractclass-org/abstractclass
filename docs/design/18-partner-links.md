# Links from other sites, and reviews saved back

**Status:** in force, and built. **Decided:** 2026-10-13.

## Context

Another site where Enclosure is played, enclosuregame.com, asked to work with Hedge School. It has accounts, matchmaking
and its own storage, and wants a button on its finished games that opens their review here. Hedge School has no
accounts and no server: a game and its review stay in the player's browser. Each site keeps its own work. The two meet
only where a game crosses from one to the other, so that place must stay small and stable: each change that both sides
must make costs both of them a release.

## Decision

1. **One link brings a game in:** `/import#record=…`, the game's record URL-encoded after the `#` (design 22). The
   import page keeps the game and opens its review at once, with no notice to update a tool (`readImportHash` in
   `src/lib/game/importHash.ts`). The partner's button says "Review", so the link goes straight to the review. Only a
   game from the meaf.us and strategyjam.org tools asks the player to choose the review or the Analysis board, on the
   same page (design 21, `src/lib/review/Arrival.svelte`). A link without `record` is refused by name ("the link has
   no record="). `/review#record=…`, which the page for developers named from 2026-10-14 to 2026-10-19, no longer
   opens a game: the review shows its Review tab.
2. **The record is this site's notation** (the /notation page), or a plain list of edges. Tags are optional. A web
   address in `Site` (Lichess writes its game's address there) gives the review a link back: "View this game on
   enclosuregame.com" under the result (`gamePage` in `src/lib/game/record.ts`).
3. **Other variants are refused, never reviewed wrongly.** A record with a `Rules` or `Position` tag gets a message
   that says why (`variantProblem` in `src/lib/game/import.ts`), from a link, a paste or a review file. The engine
   plays the online rules from the standard start only. enclosuregame.com has a "Race to 2000" mode.
4. **A partner site can take the review back:** the link may name a save page (`save`), on the partner's own host,
   over https. The site keeps a list of partners by host (`PARTNERS` in `src/lib/game/partners.ts`), and a save page on
   another host is ignored. The game keeps its partner's save page (`partner` in its stored record). Its review's
   Export menu then offers "Save to enclosuregame.com" first.
5. **The review file is what goes back,** not the annotated record. On Hedge School it reopens at once, and this
   site's label rules apply to it as they are then. An annotated record would keep the labels of its day.
6. **It goes by window messages, in the player's browser, when the player asks.** The site opens the save page in a
   new tab at the click (a browser opens a tab only within the click), and the two pages exchange messages
   (`postMessage`): the save page posts `hedge-school:ready` to its opener, this site answers `hedge-school:review`
   with `protocol: 1`, the file and its name, and the save page posts `hedge-school:saved` or `hedge-school:failed`.
   The field is `protocol`, not `version`: the review file has a `version` of its own. Each side checks the other's
   origin. This site waits a minute for each answer. The partner's page stores the file with its own sign-in.
7. **A saved review opens again from the partner's page,** by the same messages the other way. A review by an
   earlier engine opens as a snapshot of it (design 20). At the player's click,
   the partner's page opens `/review#from=` and its origin, with `window.open`. The review posts
   `hedge-school:ready` (`protocol: 1`) to it, and the partner's page answers `hedge-school:review` with the file, or
   `hedge-school:failed`. The review takes the file only from the page that opened it, on that origin, and only
   from a partner. It loads the file as the Review tab does, and the review opens at once, with the engine's results
   (`receiveFromPartner` in `src/lib/game/partners.ts`). The link can name the save page too, so that the game can be
   saved again: the partner passes `save` on this link too. In the browser that ran the review, the partner's first
   link also opens it again at once: the game's
   id comes from its moves, and the browser keeps the engine's results. The player can always load the file in the
   Review tab.
   - **The tie between the two pages:** a link with a `target` cuts it (browsers then give the new page no opener),
     and so does a `Cross-Origin-Opener-Policy` of `same-origin`. The save page must send no such header, and the page
     that opens Hedge School sends none or `same-origin-allow-popups`. Hedge School sends none. A later header for the
     engine's threads (cross-origin isolation) would cut the tie, and this design would have to change with it.
8. **One save, which updates:** "Save to" sends the game's whole review so far. Its branches hold the earlier save's
   (an opened review's branches merge with the browser's), and its results only grow. A save therefore replaces the
   earlier one. A partner that wants a history can keep versions: its choice. There is no "Save as new": it would
   need another message field, a list of versions on the partner's side, and a choice for the player, to keep a copy
   that the newer save already holds.
9. **One public description,** the page /developers ("For developers", as Lichess names its page for other sites,
   linked from the footer): the link, its parameters, both handshakes with examples, the tie between the pages, the
   buttons, testing, and what can change. The notation page describes the record only: the engine repository decides
   the notation, and this repository decides the link. The page promises:
   - **Lenient reading:** unknown tags, an edge's points in either order, lower case.
   - **Additions only:** new optional tags or parameters. A change that old links could not meet would come with a
     version in the link, and the old form would still be read. A link made once keeps working.
   - **A versioned handshake** (`protocol: 1`). A later protocol would be one that the save page asks for in its
     `ready` message, so a page that asks for none keeps protocol 1.
   - **The review file is this site's:** the partner stores it as it is, and its contents can change.
   - **A list of changes,** with dates.
10. **Measured as a way in:** `import_game` counts `site_link` and `site_review` (a kept review opened again), and
   `export` counts `partner` (design 17).
11. **Buttons as a kit, not a widget:** the page gives four labels, "Review in Hedge School" and "Review" for a finished
    game, "Open in Hedge School" and "Open" for a saved review, each with the collie's head. It gives the head as a file
    (`/brand/hedge-school.svg`, design 12), a sample style in the school's pale lavender with near-black text (design
    12, the pill of the bookmarklet's button), and the markup: "Review" is a link, "Open" a button that runs the open
    handshake. A short label leaves the site's name to the collie, so its button carries the full label as its
    `aria-label` and `title`. The partner may change the style, keeps the labels' words, and uses the head unchanged but
    for its size, only in a button or a link to Hedge School, from its own site. "Review in Hedge School" is the
    bookmarklet's name, so a player meets one name at every way in. "Save to" is in this site's Export menu, so it needs
    no button.

## Why

- **The link sits after the `#`,** so the game never reaches a server, as the bookmarklet's and a share link's do.
- **The import page, not the review's address** (the first choice, 2026-10-13, and the choice again on 2026-10-19):
  the review opens the games kept in the browser, and the import page keeps every game that comes in from outside
  (design 22). From 2026-10-14, design 22 had moved the link to `/review#record=…`, but partners were not told.
- **A list of partners:** "Save to …" sends the player's review, so it goes only to the site that the game came from,
  and only to a site this site agreed with.
- **Window messages, not a request from this site:** this site has no server, and a request from the page to the
  partner's server would need the partner's sign-in in a third-party cookie, which browsers block more and more. On
  its own page, the partner's sign-in works as always.
- **The player's click:** the privacy page promises that reviews stay on the player's computer. A review leaves only
  when the player asks, to the site the player chose.
- **Little to keep in step:** the link and the record are this site's reading, which is lenient. The labels, the
  engine and the review are this site's alone, and change freely. A change of the game's rules is the one change that
  needs both sites, and the `Rules` tag keeps it from giving wrong reviews.

## Alternatives

- **The game in the review's address, `/review#pgn=…`** (the partner's first idea): the review opens only games kept
  in the browser. The name `pgn`, read as another name for `record`, is not taken either: the name PGN means chess, and
  a second name is one more thing to keep. A partner that needs it can ask.
- **The description on the notation page:** that page follows the engine repository's decisions, and a link is this
  site's.
- **The annotated record sent back:** readable on the partner's site, but its labels go out of date when this site's
  rules change, and it does not reopen a review at once.
- **A request from this page to the partner's server,** or a form posted to it: the partner's sign-in would not come
  with it from another site.
- **A save page on any address the link names:** any site could then ask a player to send it a review.
- **A saved review opened only from its file:** a download and an import on another device. The same messages the
  other way save those steps, and the partner builds both buttons in one release.
- **A widget, a script on this site that draws the buttons and runs the handshakes:** less code for the partner, but
  this site's code would then run in the partner's pages, beside its signed-in players. The partner's security
  headers would have to allow it, and its buttons would break when this site is down or its script changes. The
  shared part would grow from a few messages to markup, styles, events and versions. A helper that the partner copies
  into its own code can come later, if more partners come.
- **The head served from this site for the buttons:** each partner's page would then depend on this site to draw its
  buttons. The partner keeps its own copy.
- **A saved review fetched from an address on the partner's site:** the file would have to be readable without the
  player's sign-in, by anyone with its address, and the partner's server would have to allow this site's requests.

## Consequences

- **A new partner** is a line in `PARTNERS`, and a release.
- **The partner's work:** the button on finished games of the online rules, with the link; and, to keep reviews, a
  save page that answers the handshake and checks this site's origin, and an "Open in Hedge School" button that sends
  a kept review.
- **A partner's test:** the build of the branch `partner_test`, and a local build with `VITE_PARTNER_TEST=1`, count
  `127.0.0.1` and `localhost` as a partner, "the local test site", over http too. The live site and the `dev` preview
  never do. A partner then tests its own pages, on its own computer, before its site is live. It gets the address of
  one `partner_test` deployment (`https://<hash>.hedgeschool.pages.dev`), never a branch's address: a deployment's
  address shows that deployment only, and deleting the deployment withdraws it. The previews' addresses are public:
  hosting.md gives them, and the public log of each run of the workflow **Deploy** gives its deployment's address.
  They can be public. A preview carries `noindex` (design 23, item 2). It holds no secret: its build gets none, and
  the deploy's one secret, its Cloudflare API token, serves only the upload (hosting.md, section 3). It keeps its
  practice games in a database of its own (design 25, item 7, and hosting.md, section 7). The /developers page names
  the live address in its examples, and tells a partner to ask for the test address: only a `partner_test` build
  takes a partner's local pages. The steps are in [hosting.md](../hosting.md).
- **The first test:** a local build, with a local test site, checked the whole way: its game page's button, the
  review, the link back, "Save to the local test site", the file received and saved, and the kept review opened again
  in a browser that had no game.
- **What can change** is listed on the /developers page, and a change there follows this design.

## Where it is

- `src/lib/game/importHash.ts` (the link), `src/lib/game/partners.ts` (the partners, the handshake),
  `src/lib/game/import.ts` (`variantProblem`), `src/lib/game/record.ts` (`gamePage`), `src/lib/game/store.ts`
  (`partner`, `setGamePartner`).
- `src/routes/import/+page.svelte` and `src/lib/review/Arrival.svelte` (the link's import, and a kept review's),
  `src/lib/game/reviewFile.ts`
  (`deliverExport`, kind `partner`, and "Save to …" in `reviewExports`), `src/lib/review/ReviewView.svelte`
  (the link back), `src/routes/review/+page.svelte`.
- The public description: `src/routes/developers/+page.svelte`, linked from `src/lib/SiteFooter.svelte`. The head for
  the buttons: `static/brand/hedge-school.svg`, which `src/lib/collie.test.ts` keeps the same as the site's head. The
  privacy page: "Games from another site".
- Tests: `src/lib/game/importHash.test.ts`, `src/lib/game/partners.test.ts`.

## Log entries

- [decisions/product.md](../decisions/product.md): "Links from another site, and reviews saved back" (2026-10-13).
- [decisions/product.md](../decisions/product.md): "One save to a partner site, which updates" (2026-10-14).
- [decisions/architecture.md](../decisions/architecture.md): "The previews' addresses are public" (2026-10-17).
