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
   | `/review#tool=…&v=…&site=…&at=…&record=<record>` | a game from the bookmarklet or the userscript on meaf.us or strategyjam.org (design 11): the player chooses the review (the game kept, then reviewed) or the Analysis board at `at` (design 21) |
   | `/review#packed=<code>` | a shared review: its game, branches and engine settings (design 13) |
   | `/review#from=<origin>` | a review that a partner's page kept, sent back by window messages (design 18) |
   | `…&save=<url>` | with `record=` or `from=`: the partner's page that "Save to" opens (design 18) |
   | `/analysis` | the Analysis board kept in this browser |
   | `/analysis#record=<record>` | the record's line on the board, not kept as a game |
   | `/analysis#position=<position>` | a set-up start, from the board editor or another site; with `record=`, the record's start |
   | `/analysis#packed=<code>` | a shared analysis, or an analysis file loaded |
   | `…&at=<n>` | the position the board opens at: n edges from the start |
   | `…&via=<source>` | the way in that this site's own page names, for the analytics only: a pasted record, a tool's game, an analysis file, the board editor (design 17) |
   | `/editor` | the board editor, at the position it was left at |
   | `/editor#position=<position>` | the board editor at a position: the Analysis board's position on screen |
   | `/practice#record=<record>` | a game against the bot after the record's moves: the Analysis board's Play (design 24) |
   | `/practice#position=<position>` | a game from a set-up start; with `record=`, the record's start |

   Later pages take theirs the same way.
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
   - **The header:** Practice, Review, Analysis (later Puzzles, Learn), then Tools, The notation, About and "Support
     us". Practice
     comes first, as play comes first on Lichess: a game against the bot is the quickest way to begin. Tools is
     in the header because a player of meaf.us or strategyjam.org comes back to it for the bookmarklet or the
     userscript. It shows from a tablet's width: the tools are for a computer's browser. On a phone, the footer and
     the Review tab lead to it.
   - **The site's menu below 1,024 pixels,** as on Lichess's phone pages: a ☰ at the header's left holds its links
     (the tabs, then the pages about the site, Tools again from a tablet's width), and the header keeps the site's
     name, "Support Us" and the theme menu, in one row. The links and "Support Us" need 860 pixels for one row:
     narrower, they took a second row, and Tools a third (`src/lib/SiteMenu.svelte`). Below 640 pixels, "Support Us"
     goes into the menu too, after the pages about the site: the name and the theme menu fill a phone's header.
   - **"Support Us," for tips through Ko-fi,** in the accent's colour of each theme, as the site's other main buttons,
     with a heart. It opens Ko-fi's tip panel (Ko-fi's donation panel widget, a frame of its page) in the site's own
     dialog, so that a tip needs no other tab (`src/lib/SupportDialog.svelte`). The frame is made only when the dialog
     opens: until then, nothing goes to Ko-fi, and no script of Ko-fi's runs in the site's pages. The privacy page says
     what goes to Ko-fi, and when. Ko-fi's floating widget was the other way: a script on every page, which draws its
     own button at a fixed place, with its text and its two colours to set, and Ko-fi's colours inside. The frame's
     inside is Ko-fi's in this way too: it keeps Ko-fi's colours in both themes. The dialog also links Ko-fi's page in
     a new tab, for a browser that blocks the frame.
   - **The header stays in view on a screen with a mouse,** and the page scrolls in its own area under it
     (`src/routes/+layout.svelte`). That area keeps the scroll bar's room (`scrollbar-gutter: stable`), so that a page
     whose height changes while it loads does not move sideways, and the header, outside it, reaches the window's
     edge. A page sized to the window (the review, the Analysis board, Practice) takes its width from the area, a CSS
     container (`100cqw`), which leaves out the scroll bar's room: `100vw` counts that room in, and the review's move
     list then lost 7 pixels and ran under its scroll bar near 1,280 pixels. The browser draws nothing of a page in the
     room that the document itself keeps (the CSS working group's
     issue 5232), so the header stopped short there on every page that did not scroll. The layout keeps the area's
     scroll as the browser keeps a page's: each address's place for Back, Forward and a reload, and the top of a page
     opened anew. The area takes the focus after each navigation, in the body's place, so that Page Down and Space
     scroll it. A touch screen keeps the usual page: its scroll bars take no room, and the header scrolls away, so that
     its browser's bars hide as the page scrolls.
   - **Home:** what Hedge School is, and Practice as its first call to action ("Practice against bot"), beside a
     board that plays scenes from reviewed games as the review shows them judged by edge: the engine's first three
     candidates before each edge, and each edge's label on it (`src/lib/home/HomeReplay.svelte`). The board alone: no caption,
     and no row of players, points or win chance above it, which were more than the home page needs. An edge every 1
     to 2 seconds, at random, as players take their time. Each scene is the 9 turns
     before a game's latest edge with a bad label, and that edge. It holds before that edge and on its label. The
     games are the owner's bot's against another bot on meaf.us, with no names shown (`scripts/home-replay.mjs`, from
     the games' review files). Then the ways in for a game played elsewhere: the Review tab, the Analysis board and
     the board editor.
     - **Not like enclosuregame.com's board,** which plays a game out with its scores: this one shows the review's
       judgement, which is what Hedge School does.
     - **It stops** while the pointer is on it, so that a visitor can look, and while the page is hidden. With reduced
       motion, it shows a scene's labelled edge, still. The first frame is in the page, and the scenes (about 4 KB
       compressed) load after it shows.
   - **The Review tab** (`/review` without a game): import a game to review it (paste its record), load a review
     file, continue the last review, and the player's games, with their Export and Delete. A review is
     `/review#game=…`.
     - **Its first paint:** `/review` prerenders as the Review tab (design 23), with its fixed parts: the heading,
       the text, the import, "Load a review file" and the footer. They show before the page's code runs, and with no
       script at all. With a script, the footer waits for the games (below). The prerendered page cannot know whether
       the address names a game, since the game stays after the `#`. So a script in the page's head marks the address
       before the first paint, on the model of the theme's script (`src/app.html`). It marks an address that names a
       game (`holdsGame`, or a kept game's id), and a last review that this browser keeps. CSS then hides the Review
       tab for an address that names a game, and shows the line "Reading the game with the engine's rules…" in its
       place (design 06, item 10). Where the browser keeps a last review, CSS keeps the room of "Continue your last
       review".
     - **Its games come together** once the page's code has read them: "Continue your last review", the list and the
       line on storage. The link takes two lines on a phone and one from 640 pixels, and an ellipsis cuts its game to
       fit. So the page knows the link's height before the read. With a script, the footer under the list stays
       invisible from the first paint until the read. So nothing moves when the games come (a layout shift).
   - **The Analysis tab** (`/analysis`): the board, with its New menu (the standard start, the board editor, Import:
     a position or moves pasted, Load: an analysis file) and its Export.
   - **The board editor** (`/editor`): sets up a position for the board (design 21).
   - **Two words for bringing a game in, one for each act, on every page:**
     - **Import:** a game from outside Hedge School, its moves alone: a pasted record, Constellation's export, another
       site's record link, the tools for meaf.us and strategyjam.org. Hedge School then does the work. An import goes
       to the review (the game is kept, then reviewed) or to the Analysis board.
     - **Load:** Hedge School's own saved work, a review or an analysis: from a file, a share link, or a partner site
       that kept it. It brings the lines, and the engine's results when it has them. Desktop programs make the same
       cut: Open for their own documents, Import for other formats. "Open" already names other acts here (a game opens
       from the list, a link opens a page), so the site says Load.

     The events follow the words (design 17): `import_game` and `load_saved`.
   - **Tools (`/tools`):** the bookmarklet and the userscript, for meaf.us and strategyjam.org.
   - **How a review works (`/how-reviews-work`):** the review's rules and their numbers, for a player who wants to know
     where a label comes from (designs 10, 14 and 16), with the sources they follow. The review's report, the About page
     and the footer link it.
   - **The footer** of the pages that scroll: the pages that the header lacks, How reviews work, For developers,
     Privacy and Notices, and Tools on a phone, where the header leaves it out.

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

- **Analytics** (design 17): every import, to either page, is `import_game` with `import_to` and `import_source`.
  Every load is `load_saved` with `load_source`, which also says where it went. The funnel starts at the Review tab,
  and follows the imports and loads to the review. `/analysis` and `/tools` are new pages.
- **The meaf.us tools** open `/review`, which asks where the game goes (design 21). A userscript installed before this change is out of date, and the review says
  how to update it. The bookmarklet loads its code from the site at each click, so it changes with it.
- **Partners** (design 18) move their links to `/review#…`. enclosuregame.com's links keep working while `/import`
  forwards.

## Where it is

- `src/routes/review/+page.svelte` and `src/lib/review/Arrival.svelte` (the review's ways in),
  `src/lib/review/ReviewHome.svelte` (the Review tab), `src/lib/review/pageMarks.ts` (the script in the review page's
  head, and the variants `review-game` and `review-last` in `src/app.css`),
  `src/routes/analysis/+page.svelte` (the board's), `src/routes/import/+page.svelte` (the forwarding),
  `src/routes/tools/+page.svelte`, `src/routes/+layout.svelte` (the header, the analytics' start),
  `src/lib/game/importHash.ts` (the review's parameters, `holdsGame`), `src/lib/game/board.ts` and
  `src/lib/game/share.ts` (`packed`), `src/routes/developers/+page.svelte`.

## Log entries

- [decisions/product.md](../decisions/product.md): "The site's pages and their addresses" (2026-10-14).
- [decisions/product.md](../decisions/product.md): "The Review tab before the page's code runs" (2026-10-19).
