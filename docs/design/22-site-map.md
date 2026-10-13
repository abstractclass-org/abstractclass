# The site's pages and their addresses

**Status:** in force. **Decided:** 2026-10-14.

## Context

The review was first the site's only tool, so one page took every game that came in: `/import`, from the meaf.us
tools, from other sites' links, from shared reviews and from partners' pages. It also showed how to install the meaf.us
tools. The Analysis board (design 21) is a second place for a game to go, and Practice, the puzzles and the lessons
will add more. A page whose name says "import" cannot say where the game goes.

## Decision

1. **Each page takes its own way in,** after the `#` of its address, as Lichess's pages take theirs in the path
   (`/analysis/pgn/…`, `/analysis/<FEN>`, `/editor/<FEN>`, its routes file):

   | Address | Opens |
   |---|---|
   | `/review#game=<id>` | a game kept in this browser |
   | `/review#record=<record>` | the game kept, then reviewed: from another site's link (design 18) |
   | `/review#tool=…&v=…&record=<record>` | the same, from the meaf.us bookmarklet or userscript (design 11) |
   | `/review#packed=<code>` | a shared review: its game, branches and engine settings (design 13) |
   | `/review#from=<origin>` | a review that a partner's page kept, sent back by window messages (design 18) |
   | `…&save=<url>` | with `record=` or `from=`: the partner's page that "Save to" opens (design 18) |
   | `/analysis` | the Analysis board kept in this browser |
   | `/analysis#record=<record>` | the record's line on the board, not kept as a game |
   | `/analysis#packed=<code>` | a shared analysis, or an analysis file imported |
   | `…&at=<n>` | the position the board opens at: n edges from the start |

   Later pages take theirs the same way: the board editor (`/editor`) and Practice (`/practice`), with a record or a
   position.
2. **A parameter is named by its payload's format,** not by how the link was made. Excalidraw's `#json=` and
   Lichess's `/analysis/pgn/` name theirs so.
   - `record`: the notation's text, readable, which anyone can write.
   - `packed`: Hedge School's compact form of a record and its lines (share.ts), which only Hedge School writes.
3. **The payload stays after the `#`:** a browser never sends that part of an address to a server, and Google
   Analytics does not record it. The analytics start only once a page has taken a game out of its address (`holdsGame`
   in `src/lib/game/importHash.ts`): a kept game's id and a place on the board name no moves, and may stay. This departs
   from Lichess, whose paths carry the game: Hedge School keeps players' games out of its host and its analytics
   (designs 11 and 17).
4. **`/import` is deprecated.** During the early access it forwards to `/review` with the same `#` part, and to
   `/tools` without one. It counts nothing. The page for developers says so, and says a month before when it stops.
5. **The pages:**
   - **The header:** Review, Analysis (later Practice, Puzzles, Learn), then The notation and About.
   - **Home:** what Hedge School is, and the way into each tab.
   - **The Review tab** (`/review` without a game): import a game to review it (paste its record, or import a review
     file), continue the last review, and the player's games, with their Export and Delete. A review is
     `/review#game=…`.
   - **The Analysis tab** (`/analysis`): the board, with its own Import (a record pasted, or an analysis file) and
     Export.
   - **One word for bringing a game in, on every page: import.** An import goes to the review (the game is kept, then
     reviewed) or to the Analysis board. Its events say where it went and how it came (design 17).
   - **Tools (`/tools`):** the meaf.us bookmarklet and userscript, and how to bring Constellation's export.
   - **The footer** of the pages that scroll: About, The notation, For developers, Privacy, Notices.

## Why

- **The address says where the game goes,** so a link reads as what it does, and a new page needs no new import page.
- **One way to write a link** for each page: a site that links a review learns to link the board at once.
- **Format names keep links stable:** a page that one day takes the same payload from another source keeps its name.

## Alternatives

- **`/import` for every page,** with a parameter for the page: one more step in every link, and the page's name still
  says nothing.
- **The payload in the path,** as Lichess's: the host and the analytics would record every game.
- **`s` for a shared review** (the first name): it names how the link was made, and a shared analysis would read the
  same and mean another thing. The early access's few `s=` links are not read.
- **`/import` forwarded for good:** an old address kept forever is a second way to write every link. The early access
  is the time to change it.

## Consequences

- **Analytics** (design 17): every import, to either page, is `import_game` with `import_to` and `import_source`. The
  funnel starts at the Review tab, and follows the imports to the review. `/analysis` and `/tools` are new pages.
- **The meaf.us tools** open `/review`. A userscript installed before this change is out of date, and the review says
  how to update it. The bookmarklet loads its code from the site at each click, so it changes with it.
- **Partners** (design 18) move their links to `/review#…`. enclosuregame.com's links keep working while `/import`
  forwards.

## Where it is

- `src/routes/review/+page.svelte` and `src/lib/review/Arrival.svelte` (the review's ways in),
  `src/routes/analysis/+page.svelte` (the board's), `src/routes/import/+page.svelte` (the forwarding),
  `src/routes/tools/+page.svelte`, `src/routes/+layout.svelte` (the header, the analytics' start),
  `src/lib/game/importHash.ts` (the review's parameters, `holdsGame`), `src/lib/game/board.ts` and
  `src/lib/game/share.ts` (`packed`), `src/routes/developers/+page.svelte`.

## Log entries

- [decisions/product.md](../decisions/product.md): "The site's pages and their addresses" (2026-10-14).
