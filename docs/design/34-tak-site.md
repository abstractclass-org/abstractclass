# Mistak, the Tak site: a plan, on Hedge School's and Cyanotype's design

**Status:** proposed. Nothing is built.
**Planned:** 2026-11-23 (abscls-teoc). **Revised:** 2026-11-23 (abscls-shfz.18.1).
**Scope:** every feature of Hedge School and of Cyanotype, unless a fact blocks it ("The rules of this work").

## Context

The owner chose Tak as the next game for an engine (epic abscls-shfz). In the session
f22f4acf-a7b1-4268-99ff-c352f2d89dd7, in their message of 2026-11-23 at about 17:50 (UTC+8), the owner wrote:

> I'd like to build another site similar to Hedge School and Cyanotype. Hopefully most of the features can carry over
> to this game without much effort. Agreed for playtak bot. We need a way to play games against anchor bots, though.
> Do we have the code and weights for them? Also we don't need to invent notations and protocol because unlike
> Enclosure and Blueprints, Tak has established its own already.

The same message put the GPU's work after Blueprints' run: "I'd say we work on parts that won't use GPU first. I
would hope Blueprints run be prioritized for now." The coordinator's comment in abscls-shfz quotes the whole message.
The answers to the first version's questions are in a comment of abscls-shfz.18 (the same session, 2026-11-23,
18:57 CST) and in a comment of abscls-shfz (19:20 CST). The names are in a comment of abscls-shfz.18 (19:30 CST).

The engine repository's research and plan for Tak are in its `games/tak/docs/`:

- `research/README.md`: the community, the engines, and "What this means for our engine".
- `research/ptn-ninja.md`: PTN and TPS (section 5), ptn.ninja and its links (section 2.6), playtak's PTN (section
  4.1).
- `research/playtak.md`: the play site, its web client, its API and its database (section 6).
- `research/community.md`, section 1.0: Takana, the community's review bot in Discord.
- `design/02-rules.md` to `design/09-strength-play-and-analysis.md`: the engine's plan. Each one is proposed, not
  built.

### Tak, as the site needs it

- **The board:** a square grid, 3x3 to 8x8. A square is `a1` to `h8`, and `a1` is the first player's lower left
  corner (`research/ptn-ninja.md`, 5.2). Each player has flat stones and capstones: 21 and 1 on 5x5, 30 and 1 on 6x6
  (`research/rules-theory.md`, 1.2).
- **A move** places a stone on an empty square (a flat, a standing stone or a capstone), or moves a stack that the
  mover's stone tops. A stack move carries up to the board's side in stones, in one direction, and drops at least one
  stone on each square of its path. Standing stones and capstones stop a stack. A capstone alone, at the end of its
  move, flattens a standing stone. There is no pass.
- **The first turn:** each player places one of the **opponent's** flats. This is the swap opening, the default of a
  record with no `Opening` tag (`research/ptn-ninja.md`, 5.3). playtak also has "no-swap" and "double black stack".
- **The end:** a road of flats and capstones that joins two opposite edges wins. When the board is full, or a player
  has no stones left, the most flats on top win. The komi adds half flats to the second player's count, in a flat
  win only. A flat tie is a draw. playtak also draws a game after 50 plies with no placement and no flattening. The
  engine's rules propose the same draw rule, which waits for a decision (`design/02-rules.md`).
- **Where people play:** playtak.com. Of its 883,250 games, 73% are 5x5 and 23% are 6x6. In 2026, 6x6 games had komi
  0 (53%), 2 (40%) or 2.5 (7%), and 5x5 games komi 0 (`research/rules-theory.md`, 2.2).
- **Tak's own formats:** PTN for moves and games, TPS for a position (`research/ptn-ninja.md`, section 5).
  - A placement is `a1`, `Sd3` or `Cb4` (`F` for a flat may be left out).
  - A stack move is `4c3>` or `3b2+111`: the count, the square, the direction (`<`, `>`, `+`, `-`) and the drops.
  - The marks: `*` when a capstone flattens a standing stone, `'` for tak and `"` for Tinuë, and `?? ? ?! !? ! !!`.
  - The results: `R-0`, `0-R`, `F-0`, `0-F`, `1-0`, `0-1` and `1/2-1/2`. A game is `[Tag "value"]` lines, then
    `1. a1 f6` and so on, with comments in `{ }`.
  - TPS is `x6/x6/x6/x6/x6/x6 1 1`: the rows from the top, the player to move and the move number. It holds no
    komi, no opening and no result.
- **playtak's API:** `https://api.playtak.com/v1/games-history/ptn/{id}` gives a finished game's PTN, with its
  `Komi`, `Clock` and players' tags (`research/playtak.md`, section 6). The ids are integers from 1 to 883,250.
  No document says whether the API allows a request from another site's page (CORS).
- **playtak's web client** is `playtak-ui`, in the US Tak Association's repositories (MIT). It shows a 3D board, and
  a 2D board that embeds ptn.ninja (`research/playtak.md`). A player watches a game in progress there too.
- **ptn.ninja** is the community's board and viewer (AGPL-3.0). A link is `https://ptn.ninja/<PTN>&ply=<n>`, with the
  PTN as text or compressed by lz-string (`research/ptn-ninja.md`, 2.6). Its own extensions add branches and notes
  to PTN (5.4), and engine notes such as `{name:"Tiltak" … pv> c3 d4}` (3.6).
- **Takana** reviews a game in Discord from a playtak id or PTN (`research/community.md`, 1.0), at three levels
  (Quick, Standard and Deep). It gives the game's statistics, a mark for each move (Spectakular, Brilliant, Great,
  Tactical, Good, Innacurate, Mistake, Blunder, Fatal) with a key on a move that every other move would make a
  Mistake, each player's accuracy from the loss of win chance, the flat count on its chart, "game snapshots", and a
  ptn.ninja link with two suggested moves for each position. Its thresholds and its weights are not public. "Takana's
  features" gives the site's part for each one.
- **The rights:** Crab Fragment Labs is the company of James Ernest, who designed Tak with Patrick Rothfuss (2016).
  It is the home of Cheapass Games, Tak's first publisher. Cheapass licensed its games to Greater Than Games in 2019,
  Flat River Group bought that company in 2021, and it stopped all publication of the games in 2025. Crab Fragment
  Labs then took Tak's rights back, and looks for a partner for a new print edition (`research/community.md`,
  "Summary" item 5 and section 6, and `research/rules-theory.md`). The research found no policy of theirs on fan
  software or AI. The site does not write to them, and it uses no art of Tak's.

### The rules of this work

- **Tak is another's game.** "We build AI and analysis for it, never our own copy of the game" (the engine
  repository's `games/tak/docs/design/02-rules.md`). The site runs no play between people. Practice is a game
  against the site's bot, as on Hedge School (design 24).
- **Every feature carries over, unless a blocker stops it.** A blocker is a fact: a part of the engine that does not
  exist yet, a licence, a platform's rule. Another rule of this plan is not a blocker. Each feature's row says "As it
  is", "With a change" or "Blocked by" a fact. A feature that waits for the engine names the part of the engine that
  it waits for. The two sites' features are in shared packages, so a feature costs Tak only its game's parts.
- **Unfinished games too,** as on Hedge School and Cyanotype (item 9). The engine's plan reads a game finished or not
  too (`games/tak/docs/design/09-strength-play-and-analysis.md`, "Decision: play and analysis", item 4).
- **Tak's formats, none invented:** PTN, TPS, playtak's ids and ptn.ninja's links.
- **The engine runs in the visitor's browser, on the CPU,** from the engine repository's browser pipeline
  (`core/wasm/`). Tak has no engine code and no network yet. Its training waits for the GPU (abscls-shfz.2).

## Decision

1. **Hedge School's design, with Tak's parts.** The site has Hedge School's and Cyanotype's pages, layout, review,
   Analysis board, import, tools, Practice and settings, as their design documents give them. Only the game's own
   parts change: the board and its stacks, the player's own moves, the notation (PTN) and the position (TPS), the
   import from playtak, the reader of playtak's page, the players' cards (the flats and the stones left), the sounds
   and the texts that name a move. A design document of Hedge School holds for Mistak, unless this document
   names a departure. This is design 33's item 2.
2. **The names:** the site is **Mistak**, at `mistak.abstractclass.org`, and its engine is **Takumi**. Both hold
   "tak". A check on the day of the choice found neither name on a playtak player or bot, no Tak project on GitHub
   named Takumi, and no repository named like Mistak about Tak. The names go where the other
   sites put theirs: the folder `apps/mistak`, the storage keys and the window messages (`mistak:…`, as
   `cyanotype:engine:2` and `cyanotype:failed`), the review file's format (`mistak-review`) and the analysis file's
   (`mistak-analysis`), the files' names (`mistak-…`), and the D1 databases (`mistak-games` and
   `mistak-games-preview`).
3. **Move, do not copy** (design 29, item 11, and design 33, item 4). A part that a second site uses is in
   `packages/` already. A part that Mistak is the first to need, and that is not Tak's alone, goes into a
   package in its first commit ("What the sites share, and what a third site adds").
4. **The moves: PTN's strings.** The engine and the site name a move by one PTN spelling, so that the move tree and the
   stored results key on it (design 29, item 2). The written form is the short one, the form to which ptn.ninja
   normalizes a move (`research/ptn-ninja.md`, 5.6): no `F`, no count of 1, and no drops when all the stones go to the
   next square (`a1`, `c3>`, `3b2+12`). PTN allows each of these omissions (5.2). The reader takes every spelling that
   ptn.ninja and playtak's export write, the explicit 1s too (`1e4<1`), and reads it as the short form. The engine
   request settles the form with the engine repository.
5. **The marks.** The writer writes `*` on a flattening, as the PTN page "most strongly" recommends. The reader
   refuses a `*` that the move does not confirm, as Cyanotype's reader refuses a capture mark. It reads `'` and `"`,
   and keeps no meaning from them: a mark of tak or Tinuë is a claim that the site does not check. The quality marks
   are PTN's, as the review's labels write them (design 13).
6. **The record is a PTN file,** with ptn.ninja's extensions where PTN has no form of its own.
   - **The tags:** `Size`, `Komi`, `Opening`, `Player1`, `Player2`, `Rating1`, `Rating2`, `Date`, `Result`, `Site`,
     `PlayTakID`, and `TPS` for a set-up start, in the place of Hedge School's `Position` tag.
   - **The turns** are PTN's: `1. a1 f6`, a number for each pair of plies, as PGN numbers chess. The review judges
     each ply: a game of one move a turn (design 29, item 2).
   - **The variations:** ptn.ninja's branches (`{3w1}`), so that ptn.ninja opens the annotated record.
   - **The evaluations:** ptn.ninja's engine note in a comment, in the place of Hedge School's `[%eval]`, so that
     ptn.ninja shows them.
7. **A position is TPS.** The board editor's field, the Analysis board's Import and a link's start hold it. TPS holds
   no komi and no opening, so the record's tags and a link's tags carry them, as a record's `Komi` tag does on Hedge
   School (design 21, item 9). The engine's position check (as request 16 and request 28 gave the two other games)
   checks that a game can reach it.
8. **The sizes, the opening and the komi.** The site reviews what the engine's network plays: 6x6 and 5x5, the swap
   opening, and the komi that the release names as trained. The engine's design 04 proposes 5x5 at 0 and 6x6 at 0 and
   2, each with a normal spread of one flat (`games/tak/docs/design/04-board-sizes-and-komi.md`). The owner's
   message in abscls-shfz adds "I'm thinking to add even more komi variants", so the site takes its range from the
   release. It refuses another size, another opening or a komi outside that range before the review, with its
   reason, as Hedge School refuses other rules (design 18, item 3). The reason is a fact: a network gives no true
   values for a size or an opening that it did not learn, so its labels there would mislead. Takana reviews the
   double black stack opening too, and the site refuses it until the engine trains it. Each site's
   `scripts/engine.mjs` gives its komi limit, its record's `MAX_RECORD_KOMI`, to the engine step (`fetchEngine`).
   Tak's limit depends on the size, so the work checks whether that step needs a limit for each size. Each new size
   or opening that the engine learns is a new release of the site.
9. **Unfinished games, as on Hedge School.**
   - **The import and the review** take a record whose result is `*`, and review it as any game (design 21, item 8).
   - **The Analysis board** starts from any position, as on Hedge School (design 21): a game, the standard start of
     each trained size, the board editor, a TPS, a list of moves and the free Import.
   - **The tools for playtak's pages** read a game in progress too, with the result `*`, and the page opens it in the
     review or on the board, as Hedge School's tools do ("The tools for playtak's pages").
10. **The ways in:**
    - **A playtak game by its id:** the Import dialog and the import page take an id (`/import#playtak=883250`, a
      parameter named by its payload, design 22). The player's browser fetches the PTN from playtak's API. The API's
      history holds finished games, so a game in progress comes in by the tools. A check of CORS comes first. If the
      API refuses a request from another site's page, the site asks playtak's administrators, and takes pasted PTN
      until then.
    - **A game from playtak's page,** finished or in progress, by the bookmarklet or the userscript ("The tools for
      playtak's pages").
    - **Pasted PTN,** in the Import dialog, as Hedge School takes its record.
    - **A ptn.ninja link,** pasted: the site reads the PTN from the link's path.
    - **A link back:** the review shows "View this game on playtak" from the `PlayTakID` tag, as Hedge School's review
      does from `Site` (design 18, item 2). It also offers "Open in PTN Ninja" at the position on screen.
11. **The engine:** the engine repository's browser pipeline builds Tak's module, as it builds HedgeFund and StampDuty.
    Before a network exists, the module runs the rules with a test network ("Before the network").
12. **Practice against Takumi,** the site's bot, as Hedge School's and Cyanotype's (designs 24 and 25, design
    33): its settings, its stored games, a start from a set-up position, "Play the bot from here" and the points
    bar. It waits for the engine's practice bot for Tak ("The engine request", item 9). Practice's settings add the
    board's size.
13. **The features that wait for the engine** each get an issue that depends on the engine's issue, as Cyanotype's
    did: the GPU (design 15), the area map (design 30), the threat (design 31), the opening book with the Openings
    page (design 32), the networks' choice (design 09) and Practice. Each one needs a part of the engine that its
    first release does not have. The check `engine-kinds` holds the engine lock to the same list.
14. **No playtak game in the public repository.** playtak asks people not to scrape it, and its database has no
    licence (`research/playtak.md`, "Open questions", 7). The repository is public, and CLAUDE.md asks before any
    public use of other people's games. So the tests, the home page's replay and the examples use records written by
    hand and the engine's own games. A check against playtak's games runs locally and commits nothing. The import
    fetches a game only when a player asks for it.
15. **Left out:**
    - **The parts that only Enclosure has** ("The parts that only Enclosure has"). Tak has none of them.
    - **The prototypes** (Puzzles, Learn and the engine lab), while Hedge School keeps them as prototypes, as
      Cyanotype does. Tak's puzzles would be Tinuë puzzles, after a solver.
    - **Takana's own marks and its snapshots** (the rare top moves, Fatal and the game snapshots), for now. Their
      rules and thresholds are not public, and the site's labels follow the published methods of chess.com and
      Lichess, as both sites do. Takana's idea of a "rare" move can be explored after the site ships with its own
      labels (abscls-shfz.18.2).
16. **The site stays unlaunched** until the owner says to launch it ("How the site stays unlaunched").

## Each feature, and what carries over

Each row is a feature of Hedge School or of Cyanotype, with the design that holds it. "As it is": the shared code and
the site's settings serve Tak with no change beyond Tak's words. "With a change": Tak needs work, which the row names.
"Blocked by": a fact stops the work now. For a part of the engine, the row names the part, and the work starts when
the engine has it. "Left out": a part that Tak does not have, or a prototype (item 15). Cyanotype has every feature of
Hedge School but those that design 33 ("The gaps from Hedge School") names.

### The pages

| Page | Carries over | Why, and the work |
|---|---|---|
| Home (`/`) and its replay | With a change | A replay of a Tak game on Tak's board. The game is one of the engine's own games, not a playtak game (item 14). |
| About, Privacy, Notices | With a change | Tak's texts. Privacy names the request to api.playtak.com, which the player's browser makes, and Practice's stored games (design 25). Notices lists the engine's terms and the libraries (lz-string, MIT, for ptn.ninja's links). |
| How reviews work | With a change | Tak's words and examples. The shared sections are in `packages/review/src/howReviews`. |
| Notation (`/notation`) | With a change | PTN and TPS, with links to the ustak pages, and the site's short form (item 4) and its marks (item 5). No notation of our own. |
| The review (`/review`) | With a change | "The review". |
| The Analysis board (`/analysis`) | With a change | "The Analysis board and its starts". |
| The board editor (`/editor`) | With a change | A position in TPS, with stacks, for each trained size ("The board"). The engine's position check checks it (the request, item 5). |
| Import (`/import`) | With a change | A playtak id, PTN, a ptn.ninja link and a tool's game (item 10). An unfinished game is reviewed too (item 9). |
| Tools (`/tools`), bookmarklet, userscript | With a change | "The tools for playtak's pages". |
| Practice (`/practice`) | Blocked by the engine's practice bot for Tak | "Practice". |
| Developers (`/developers`) | With a change | The shared sections (`packages/import/src/developers/`), with Tak's refusals and an empty partner list, as Cyanotype's. |
| The engine measure (`/lab/measure`) | With a change | `packages/measure` with Tak's default settings and positions. Its numbers wait for a network. |
| The board lab (`/lab/board`, Cyanotype's) | With a change | Tak's board drawn from fixed positions, for the board's work before the engine. |
| Openings (`/openings`), `/lab/book-table` | Blocked by the engine's opening book for Tak | The page needs a Tak book from the engine (request 22's method). Cyanotype waits for its book too. |
| Puzzles, Learn, `/lab/engine` | Left out while prototypes (item 15) | Hedge School shows them only in the full edition. Cyanotype takes each one when Hedge School makes it public. Tak's puzzles are Tinuë puzzles, which the community already uses. |
| The site map, robots and headers | As it is | Designs 22 and 23, with the site's address. |

### The review

| Feature | Design | Carries over | Why, and the work |
|---|---|---|---|
| The review's analysis: the sweep, then the depth per move | 05, 16 | As it is | The game interface serves a game of one move a turn. The budgets are Hedge School's until Tak's games are measured (design 33, "Consequences"). |
| An unfinished game (result `*`) | 21, item 8 | As it is | Reviewed as any game (item 9). |
| The layout: the board, the charts, the columns, the tabs | 06 | With a change | The board is square. A stack needs room for its height ("The board"). |
| The engine's lines and the player's variations | 07 | With a change | A line on hover draws each move: a placement's stone, and a stack move's path with its drops. |
| The image of a line, and its GIF | 07, item 17 | With a change | Tak's board in the image. The shared code is `packages/review/src/lineImage.ts` and `gif.ts`. |
| The quality labels | 10 | With a change | Chess.com's bands on the win chance, as on both sites. A draw counts as half a win in the win chance ("Draws"). Takana's own classes (Spectakular, Fatal) are left out for now (item 15). |
| The review's settings: "Review by" (a turn or a move) and "Review for" (Both, or one player) | 10 | With a change | "Review for" with White and Black. A Tak turn is one ply, so by turn and by move judge the same: the work checks whether "Review by" shows at all ("What the sites share", item 3). |
| Hard positions, the accuracy's weights, the Difficulty chart | 14 | As it is | KaTrain's complexity on the win chance. |
| The Advantage chart | 06, 14 | With a change | A second line for the flat count, with the komi, as Takana's chart shows it and as Hedge School's chart has its area line. The engine gives the flat count in the position ("The engine request", item 4). |
| The players' cards | 06 | With a change | Each player's name and rating (`Player1`, `Rating1`), the flats on top, the stones and the capstones left. |
| The lead | 06, 09 | With a change | Tak's network has no lead. Its score head gives the flat margin if the game ends by the flat count (`games/tak/docs/design/06-heads-and-results.md`). The table and the meter name it so, in flats. |
| A review by an earlier engine opens as a snapshot | 20 | As it is | `packages/analysis/src/storedReview.ts`. The word "snapshot" is the glossary's: Takana's "game snapshots" are a game's highlights, another thing. |
| The area map | 30 | Blocked by the engine's maps (heads C0 and C4) | Tak's network has a map of a flat ending (head C0) and a map of road threats (head C4), "Analysis later" in the engine's design 06. The area map's styles fit the flat map. |
| The weak walls | 30 | Left out | Enclosure's edges alone. Tak's standing stones are another thing. |
| The threat | 31 | Blocked by the engine's search with the other player to move | Tak has no pass. The threat needs the engine to search the position with the other player to move. In Tak that is the road threat, and it is worth the work. |
| The opening book in the review | 32 | Blocked by the engine's opening book for Tak | With the Openings page. |
| The move sounds | 08 | With a change | "The sounds". |
| The player's notes | 33 | As it is | `packages/review/src/notes.ts`, with Tak's move names. |
| The review lock, the kept tree, the removal of earlier results | 11, 20, 29 | As it is | The analysis package. |
| The archive check: an archive's records read through the site's code path | 33 | With a change | playtak's games through the import, the reader and the engine's check. It runs locally and commits no game (item 14). |

### Takana's features

Takana is the community's review bot (`research/community.md`, 1.0). Each of its features, and the site's part:

| Takana's feature | The site's part |
|---|---|
| A review from a playtak id or PTN | The import (item 10). |
| Three levels: Quick, Standard and Deep | The engine's settings: the visits, the time and the depth (designs 09 and 16). |
| The game's statistics | The review's Report: the result and the counts of each label (design 06). |
| A mark for each move | The labels, on chess.com's bands (design 10). |
| The key: every other move would be a Mistake | Great, the only good move (design 10, item 6). |
| Spectakular, Brilliant and Tactical: rare top moves | Left out for now (item 15, abscls-shfz.18.2). Their rarity score and thresholds are not public. |
| Fatal: a move that hangs a road, a tinuë or a gaelet | A Blunder by its loss of win chance (design 10). The mark of its own is left out for now (item 15). |
| Each player's accuracy from the loss of win chance | The accuracy (design 14). |
| The flat count on the chart | The flat line on the Advantage chart ("The review"). |
| "Game snapshots": rare moves, the start of the middle game, big Fatals and Blunders | Left out for now (item 15). Hedge School has no list of a game's highlights. A list of a game's key moments would be a new feature for every site, in `packages/review`, with a plan of its own. |
| A ptn.ninja link with two suggested moves in each position | The annotated record's engine notes, opened in ptn.ninja, and "Open in PTN Ninja" (items 6 and 10). |

### The Analysis board and its starts

| Feature | Design | Carries over | Why, and the work |
|---|---|---|---|
| The board from a game: the review's "Analyze", a record, a shared link, an analysis file | 21 | With a change | Tak's board and record. An unfinished game opens too (item 9). |
| The board from the standard start, the board editor, a TPS or a list of moves | 21 | With a change | As on Hedge School. The standard start is the empty board of each trained size. The board editor makes a TPS with stacks ("The board"). The free Import takes a TPS or PTN's moves. |
| Evaluate quality on request, the main line, Make main line | 21 | As it is | The shared view. |
| One board kept in each browser | 21 | As it is | |
| The komi on the board | 33 | With a change | The `Komi` tag, in half flats, in the trained range (item 8). |
| A position's check | 21, 33 | With a change | The engine's check of a TPS (the request, item 5). |
| Play the bot from here | 33 | Blocked by the engine's practice bot for Tak | With Practice. The bot starts from the board's TPS, as Cyanotype's bot starts from its position. |

### The engine and its settings

| Feature | Design | Carries over | Why, and the work |
|---|---|---|---|
| The engine in the browser, its workers, its pool | 02, 03, 09 | As it is | `packages/engine` knows no game. Tak's module speaks the same protocol (the request). |
| The engine's settings: the switch, the visits, the time, the depth, the workers | 09, 16 | As it is | |
| The networks' choice | 09 | Blocked by a second network for Tak | Hedge School offers two networks. Tak's first release has one, as Cyanotype's has. |
| The GPU | 15 | Blocked by the engine's GPU module for Tak | The pipeline can build a GPU module from an ONNX graph. The first build runs on the CPU. |
| The engine lock and its kinds | 29 | With a change | The check `engine-kinds` refuses a kind of Hedge School's that Mistak lacks, unless its exceptions file names the issue. Each kind that waits for the engine (the GPU, the practice bot) gets its line there (item 13). |
| The terms of the engine's release | requests 14, 29 | As it is | The release's terms file, on the Notices page. |

### Import, export and the partners

| Feature | Design | Carries over | Why, and the work |
|---|---|---|---|
| The Import dialog and the import page | 11, 22 | With a change | Item 10. |
| The review file and the analysis file | 13, 21 | As it is | The site's own formats (`packages/analysis/src/reviewFile.ts`), with the site's format name. |
| The annotated record | 13 | With a change | PTN with ptn.ninja's branches and engine notes (item 6). |
| The shared link (`#packed=`) | 13, 22 | As it is | |
| Partner sites | 18 | With a change | The frame in `packages/import`, an empty list, as Cyanotype's. |
| The player's games, kept in this browser | 11, 22 | As it is | The shared store and `GameList.svelte`. |
| The tools for a game site's pages: the bookmarklet, the userscript and the tools page | 11 | With a change | "The tools for playtak's pages". The loader and the tools page are `packages/import`'s. |

### Practice

Practice waits for the engine's practice bot for Tak ("The engine request", item 9). The site's part can then be
built with the test network, as each other part is.

| Feature | Design | Carries over | Why, and the work |
|---|---|---|---|
| Practice against the bot, its forms and its worker | 24 | Blocked by the engine's practice bot for Tak | `packages/practice` holds the shared part. The bot's forms are the ones that the engine builds (one search thread, several threads, the GPU later). The settings add the board's size, and the komi is in half flats in the trained range (item 8). |
| Practice's games stored on the site's server (D1) | 25 | Blocked by the engine's practice bot for Tak | With Practice. The site's own Pages Function and its two D1 databases, production and previews, as Cyanotype's (`docs/hosting.md`, "Cyanotype's practice games"). The databases are the owner's step. |
| Practice from a set-up start | 24, 33 | Blocked by the engine's practice bot for Tak | With Practice. The bot starts from a TPS. The page checks the position first, as Cyanotype's does. |
| Practice's points bar | 24 | Blocked by the engine's practice bot for Tak | With Practice. Its second lane shows the flat counts, with the komi. |

### The site's frame

| Feature | Design | Carries over | Why, and the work |
|---|---|---|---|
| The product's shape: the store in this browser, the explanations, the devices, the look | 04 | As it is | The shared packages, with Tak's texts. |
| The header, the footer, the menu, the theme | 29 | As it is | `packages/site`, with the site's name and links. The header's breakpoints need the layout test with Tak's links. |
| The early access and its build switch | 11 | As it is | `edition.ts` and `SiteName.svelte`, with the site's own repository variable. |
| Search engines and link previews | 23 | With a change | A preview image of Tak's board. |
| The logo and the colour | 12 | With a change | A logo of the site's own. No art of Tak's, which belongs to its rights holder ("The rights"). |
| The analytics, with PostHog and no consent | 17 | As it is | The shared analytics. The account's one Web Analytics site, `abstractclass.org`, takes every subdomain's beacon, so the site uses the shared `CF_ANALYTICS_TOKEN` and needs no Cloudflare step of its own (`docs/hosting.md`, sections 5 and 9). |
| Support Us | 22 | As it is | `packages/site`, as on both sites, with the site's name. |
| The error page, the notices of a page that does not load | | As it is | `packages/site`. |
| The check of a deployed site | | As it is | `@abstractclass/site/release-check.mjs`, with the site's addresses, its menu and the check of Practice's Function (`docs/hosting.md`, "Deploy, check and roll back"). |

### The parts that only Enclosure has

These are not in Cyanotype either, and Tak has none of them, so each one stays out (item 15): enclosuregame.com as a
partner, the tools for meaf.us and Constellation's export, the board's layers of Enclosure (its regions and its
invincible edges), the weak walls, and Practice's area lane.

## The board

Tak's board is the site's own part, as Blueprints' hexes are Cyanotype's.

- **A square for each cell, with the files and the ranks** on its edges, `a1` at the lower left, as ptn.ninja and
  playtak show it. The board turns, so that the second player can see it from their side.
- **A stack:** the top stone at full size, its kind clear by its shape (a flat, a standing stone, a capstone), and the
  stones below it as a column of thin bars in their owners' colours, from the bottom up. The height shows as a number
  from a size that the column cannot show. A click on a stack shows it whole.
- **The colours:** the first player's stones are light and the second's dark, as Tak's white and black. The shared
  code calls the first player "blue" (design 29, item 2), and the site's texts say "White" and "Black".
- **The player's own move,** from the engine's list of legal moves, as Cyanotype's board takes a move. The site has no
  rules. A placement: the square, then the stone. A stack move: the stack, the count, then each square of the path,
  where each click drops one more stone. The input matches the clicks against the list. The engine's `describe` reply
  gives the list for the position on the board, as it does for Cyanotype (`packages/engine/src/client.ts`). The
  analysis replies do not carry it. 6x6 has 4,572 move slots (`games/tak/docs/design/03-moves-and-policy.md`), so the
  list is short enough for that reply.
- **The board editor** chooses the size, then builds each stack stone by stone: a click puts the chosen stone (a flat,
  a standing stone or a capstone, of either colour) on top of the square's stack, and a second action takes the top
  stone off. Only the top stone of a stack can be a standing stone or a capstone, as TPS writes it. The editor sets
  the player to move and writes a TPS. The engine's position check refuses a position that no game reaches, with its
  reasons, as on both sites.

## The sounds

Two sounds, as on both sites (design 08): the move's sound, and the removal's sound for the move that changes the board
most. In Tak, that is a move that covers an opponent's top stone, a flattening too. A placement and a stack move that
covers only the mover's stones play the move's sound. The settings and the clips are the shared ones.

## The tools for playtak's pages

The bookmarklet and the userscript work as Hedge School's tools for meaf.us and strategyjam.org (design 11, "The
bookmarklet and the userscript"). The loader, the import page's `tool=` hash, the versions and the tools page are the
shared ones (`packages/import`). The site's own part is the reader of playtak's page.

- **The page:** playtak.com's web client, `playtak-ui`. Its code is public (MIT), so the work first reads it, to find
  where the page keeps the game's moves, its size, its komi, its opening, its players and its id.
- **What the tool reads:** the game that the player's page shows, from the client's own state, as Hedge School's tools
  read meaf.us's board. It sends no request to playtak, and uses nothing from the player's login. A game in progress
  gives the result `*`, as any unfinished game (item 9). The record carries the `PlayTakID` tag when the page gives
  the id.
- **playtak's rules:** the research found no rule of playtak's on tools that read its pages. Its one rule on its data
  asks people not to scrape the site ("Please don't scrape this site", `research/playtak.md`). A tool reads one game,
  the one on the player's screen, at the player's click.
- **The tests** read saved pages that hold games written by hand, never a playtak game (item 14).

## Draws

The shared result is a result by the scores: the winner and the margin, and a draw when the margin is 0
(`packages/analysis/src/result.ts`). In Tak, only a flat win and a flat tie are results by the scores. A road wins
with no margin, a game can end by resignation or time (`1-0`), and playtak draws a game after 50 plies with no
placement and no flattening. The engine's network gives a win, a draw and a loss
(`games/tak/docs/design/06-heads-and-results.md`). The shared code reads a win chance.

- **The win chance counts a draw as half,** as KataGo's no-result does. The engine's reply gives it so (the request,
  item 6), and the labels' bands and the charts work as they are.
- **The draw chance shows** in the meter's tooltip and the table's row, from the reply's draw field.
- **The result takes the game's kind:** a road, the flats, a resignation or time, or a draw (`R-0`, `F-0`, `1-0`,
  `1/2-1/2`). The review's value at the end and the records' result read it. The result by the scores
  (`result.ts`) stays the kind of Enclosure and Blueprints. The game interface gives each game's result: its winner
  or a draw, and its words. So Tak's kinds stay in Tak's reader, and the shared code reads only the winner and the
  words.

## What the sites share, and what a third site adds

**Shared already** (design 29): the engine in the browser (`packages/engine`), the browser's store
(`packages/storage`), the game interface, the review's model, its labels and the move tree (`packages/analysis`), the
record's frame (`packages/record`), the site's frame, its analytics and Support Us (`packages/site`), the review's and
the Analysis board's view (`packages/review`), the import's frame, the tools and the partners (`packages/import`),
Practice (`packages/practice`) and the engine measure (`packages/measure`). The engine repository shares the browser
pipeline (`core/wasm/`): one WebAssembly module for each game, the network loaded at run time, the practice bot's
modules and an optional GPU module. Its JavaScript stays in `games/enclosure/wasm/` (`core/wasm/README.md`):
`createCpuEngine` in `gpu_engine.mjs` runs any game's module, beside `practice_bot.mjs` and `cpu_evaluator.mjs`.

**What Mistak is the first to need,** each in the package where it serves every game:

1. **Board sizes:** a game with more than one board. The stored results' keys and the engine's query must name the
   size: `a1` on 5x5 and on 6x6 are two moves. `keyMoves` (`packages/analysis/src/cache.ts`) keys a set-up start as
   a word of its own, and a standard start as no word. So the work first checks the simplest form: a Tak game's start
   is always a TPS, the empty board's for a game from the start, and the key needs no change. The game interface
   then gives the empty board of each size. The Analysis board's New, the board editor and Practice's settings
   choose the size.
2. **Draws and results of several kinds** ("Draws"): the draw chance in the meter and the table, and a result that
   the game interface gives, beside the result by the scores.
3. **Two plies a row in the move list,** with PTN's numbers, as Lichess shows chess. The game interface's `turn`
   gives the notation's numbers, and the review judges a move by the same turns (`judgeTurn` in
   `packages/analysis/src/model.ts`): Enclosure's turn of two edges is one row and one judgement. Tak numbers two
   plies a turn and judges each ply. The shared change keeps the notation's numbers and the rows apart from the unit
   that the review judges.
4. **A record in a format that the game's community owns.** The record package's frame is Hedge School's form, with
   each game's moves as a parameter. PTN is close to it (tags, numbered moves, comments, results). Its branches and
   its notes are ptn.ninja's. The work checks first whether the record package takes PTN's parts as parameters, or
   whether Tak's reader and writer stay the site's own.
5. **A game fetched by its id** from a play site's API. It stays the site's own part, as each page reader is. The
   import's frame (`readImportHash`, the import's events) takes it as a new way in.

**The site's own parts:** the board, its input and its editor, PTN's moves and marks, TPS, the reader of playtak's
PTN, of playtak's page and of ptn.ninja's links, the players' cards, and the texts.

## Before the network

Tak has no engine code and no network. The engine's rules come first (abscls-shfz.3), and the network's training waits
for the GPU (abscls-shfz.2). The pipeline's module runs the rules before a network exists, with a test network, as
request 23 asked for Blueprints. So the work goes in three stages.

1. **With no engine:**
   - The app and its shell, its deploy job with the launch switch, and its pages' texts.
   - PTN's reader and writer of moves and records, TPS's reader and writer, with tests on records written by hand and
     on ptn.ninja's examples in its own documents.
   - The board drawn from a TPS, on `/lab/board`, in the shape of the engine's position fields (the request, item 4).
     The next stage then changes only where the fields come from.
   - The check of CORS on playtak's API, and the fetch of a game by its id.
   - The Import dialog and the import page, which read records and refuse them by their tags (the size, the opening
     and the komi).
   - The reader of playtak's page, the bookmarklet and the userscript, with tests on saved pages.
   - The shared work on board sizes, draws and the move list (items 1 to 3 above), with Hedge School's and Cyanotype's
     tests unchanged.
2. **With the engine's rules and a test network** (the engine request):
   - The player's own moves on the board, from the legal moves.
   - The rules' check of each record's moves and marks, and the position check of a TPS.
   - The review and the Analysis board, end to end, with all the board's starts and the board editor, and the test
     network's values. The labels have no meaning yet, but every part runs: the sweep, the variations, the exports,
     the review file, the snapshot.
   - The sounds, the image of a line, the engine measure's run.
   - Practice, its stored games, its set-up starts and "Play the bot from here", once the engine's practice bot
     exists.
3. **With a trained network:**
   - The labels and the accuracy on real games, the search budgets, the engine measure's numbers.
   - The flat margin in the table and the chart.
   - The site's first release to the previews with a network, and the owner's test.

## The engine request

A request in `docs/requests/` and an issue with the label `engines`, as request 23 was for Blueprints:

1. **Early, with any network:** the rules first, in the module of the browser pipeline.
2. **PTN's moves, whole,** in one spelling (item 4), in every reply and every query.
3. **The protocol that `packages/engine` speaks** (0.6.x for Hedge School, 0.8.0 for Cyanotype). The package then
   changes only by the reply's new fields (items 6 and 7). A query carries the size (as the position's TPS, or the
   start of a size) and the komi in half flats.
4. **The position's fields** that the site draws: each stack's stones, the stones and capstones left, the flats on
   top for each player, whether the game ends there, and how (a road, the flats, a draw, the 50-ply rule).
5. **A position's check** from a TPS, with its reasons, as protocols 0.5 and 0.8.0 give it for the two other games.
6. **The draw chance** in each reply, beside the win chance with a draw as half.
7. **The flat margin** as the reply's score, and the lead off.
8. **The engine's name, Takumi, and the release,** in a public release repository with its manifest and terms, as for
   HedgeFund and StampDuty.
9. **The practice bot,** as request 25 gave Blueprints' and request 15 Enclosure's: its forms (one search thread and
   several threads), its play settings, the komi, the size, and a start from a TPS. It can come after the rules, and
   it runs with the test network first.
10. **Later:** the GPU module, the maps of heads C0 and C4 for the area map, the search with the other player to move
    for the threat, an opening book and a second network.
11. **The engine's design 09: done, nothing to ask.** Since the engine repository's commit 2d9c3e60b, its
    `games/tak/docs/design/09-strength-play-and-analysis.md` ("Decision: play and analysis") reads a game finished or
    not, as the site does (item 4). It also publishes a public TEI engine of its own for other Tak tools, once the
    engine is strong enough (item 5). That is the engine repository's work, not the site's.

## How the site stays unlaunched

- **The deploy job starts with the launch switch** (`docs/hosting.md`, "The launch switch"): `if: github.ref_name !=
  'main'`. A push to `main` skips it, and only previews deploy. Their addresses answer with `noindex` (design 23).
- **No address and no DNS name** until the owner launches the site. The Pages project is a step for the owner of the
  account, as Cyanotype's was (abscls-8tl1.3).
- **No link from the hub** (`abstractclass.org`) and none from the other sites until the launch.
- **No PostHog key on the previews,** as for both sites (`docs/hosting.md`, section 4). The D1 databases for
  Practice's games come with Practice, as a step for the owner of the account.
- **The early access build** (`VITE_EDITION=early`) from the first deploy.
- **The launch is one commit,** made when the owner says to launch it.

## Why

- **Hedge School's design is built and checked twice.** Cyanotype took it to a second game with the shared packages.
  Tak's turns have one move, which the game interface serves (design 29, item 2).
- **Every feature, unless a fact stops it.** Each feature of the two sites is in a shared package, so Mistak
  pays only for its game's parts. A feature cut for another reason leaves a gap that the player cannot explain.
- **Tak's formats are established.** PTN, TPS and ptn.ninja's links are what every Tak player, tool and bot reads. The
  owner asked for no new notation.
- **The engine's design 09 already names the review's parts:** the win chance, the accuracy, the flat count, the flat
  margin and the suggested moves. The shared review gives all of these, and more.
- **The rules stay in the engine.** The site reads the legal moves and the positions from the engine, as Cyanotype
  does. So the engine's rules checks (perft and playtak's games) also check the site.

## Alternatives

- **A copy of Cyanotype:** the fastest start, but three copies of the review drift apart. Design 29 refused a copy.
- **Embed ptn.ninja as the board:** playtak's client does so. ptn.ninja is AGPL-3.0, and its embed runs no engine. The
  review's board draws the candidates, the lines and the labels, which an embed cannot take. The site links to
  ptn.ninja instead (item 10).
- **Practice left to playtak's bots:** playtak has graded bots, and the engine's own playtak bot is planned
  (abscls-shfz.16). But Practice is Hedge School's: a game against the site's bot at settings that the player
  chooses, then its review in one click. A bot on playtak does not give that.
- **Takana's classes:** the community knows them, but their thresholds are not public. The site's labels follow
  chess.com and Lichess, as both sites do.
- **A server that fetches playtak's games:** it avoids CORS, but it adds a server where the static site has none
  (design 02). It is the fallback if playtak refuses CORS and its administrators do not change it.

## Consequences

- **The site depends on playtak's API** for its main way in. A change there breaks the import by id, and pasted PTN
  still works.
- **The tools depend on playtak's page,** as Hedge School's depend on meaf.us's. A change of `playtak-ui` can break
  them, and the tools page then has a newer tool.
- **Each new size or opening** is a release of the engine, then of the site.
- **Practice adds the site's own Pages Function and D1 databases,** as on both sites.
- **Three games in the shared packages:** a change of the review is checked on three boards. The layout test and each
  site's tests run in `npm run check:all`.

## The tickets proposed

The coordinator files them. Each one has the labels `site` and `tak` (the request's issues have `engines`, and ticket
15 has `org`), under abscls-shfz.18. Each one names its work, its check, and the tickets that it waits for ("After").
A ticket with no "After" can start at once. Takana's own marks and snapshots have their issue already
(abscls-shfz.18.2).

1. **Mistak: the engine request, Tak in the browser before the trained network:** `docs/requests/31-…`, with the
   items of "The engine request". Two `engines` issues hold it: the rules and the analysis module (items 1 to 8),
   and the practice bot (item 9), which waits for the first. Check: the request's row in `docs/requests/README.md`,
   and the request and its issues linked both ways. Tickets 9 and 13 wait for the first `engines` issue, which
   waits for the engine's rules (abscls-shfz.3). Ticket 21 waits for the second.
2. **Mistak: the app, its shell and its deploy job with the launch switch:** `apps/mistak` with its pages' frame,
   the texts of About, Privacy, Notices, How reviews work, Notation and Developers, Support Us as on the other
   sites, the site's logo and colour, and its check of a deployed site. Previews only. Check: `npm run check:all`
   with the third site, the layout test with the site's links, a push to `main` that skips the deploy, a preview that
   answers `noindex`, and the check of a deployed site on that preview. After: 15.
3. **Mistak: PTN's moves and records, and TPS:** first the check whether `packages/record` takes PTN's parts as
   parameters ("What the sites share", item 4), then the reader and the writer: the short form, the marks, the tags
   and the results, `*` among them. Check: tests on hand-written records and on the examples of ptn.ninja's
   documents, each spelling read as the short form, and a record written and read back unchanged. After: 2.
4. **Mistak: the board and its stacks, drawn from a position:** `/lab/board`, in the shape of the engine's position
   fields, and the link previews' image of Tak's board (design 23). Check: the board lab in both themes, at every
   width down to 360 pixels, the layout test, and the preview image in the built site. After: 2, 3.
5. **Mistak: a playtak game by its id, pasted PTN and a ptn.ninja link:** the Import dialog and the import page,
   the fetch by id, and the refusals by the tags (the size, the opening, the komi). Check: a test of each refusal and
   of each way in, a record with the result `*` taken, and a game fetched by its id from a preview in a real
   browser. After: 2, 3, 16.
6. **Shared: a game with several board sizes:** the empty board of each size, the size in the stored results' keys
   (first the simplest form, "What the sites share", item 1, with what the shared code does otherwise at a set-up
   start), and the komi limit of each size (item 8). Check: a test that `a1` on 5x5 and `a1` on 6x6 key apart, a
   test of each size's komi limit, and Hedge School's and Cyanotype's tests unchanged.
7. **Shared: draws and the game's own result:** the draw chance in the meter and the table, a result that the game
   interface gives, and a road win with no margin. Check: tests of a reply with a draw chance and of each kind of
   result, with Hedge School's and Cyanotype's tests unchanged.
8. **Shared: two plies a row in the move list:** the notation's numbers and the rows apart from the unit that the
   review judges. Check: a test of a game that numbers two plies a turn and judges each ply, the layout test, and
   Hedge School's and Cyanotype's move lists unchanged.
9. **Mistak: the engine's rules on the site:** the player's own moves from the engine's legal moves (placements
    with their stone, stack moves with their drops), the rules' check of a record's moves and marks, and the position
    check of a TPS. Check: each legal move of the test positions entered by clicks, a click that matches no move
    refused, and a record with a false `*` refused. After: ticket 1's first `engines` issue, 4, 5.
10. **Mistak: the review and the Analysis board on Tak's board:** the view's Tak part, the lines drawn on Tak's board
    and their image and GIF, the review's settings, the players' cards, the flat line on the chart and the flat
    margin, the review of an unfinished game, and the archive check of playtak's games, run locally. Check: a review
    end to end in a real browser with the test network (the sweep, the variations, the exports, the review file, the
    snapshot), a review of a record with the result `*`, and the archive check with no game committed.
    After: 6, 7, 8, 9.
11. **Mistak: the annotated record in PTN, and links to ptn.ninja:** ptn.ninja's branches and engine notes, and
    "Open in PTN Ninja". Check: an exported record that ptn.ninja opens with its branches and notes, and that the
    site's reader reads back. After: 3, 10.
12. **Mistak: the move sounds:** the removal's sound for a move that covers an opponent's stone. Check: a test of
    which move plays which sound. After: 10.
13. **Mistak: the engine measure with Tak's positions:** `/lab/measure`, its numbers after a network. Check: a run
    of the measure with the test network. After: ticket 1's first `engines` issue, 2.
14. **Mistak: an issue for each feature that waits for the engine:** the GPU, the area map, the threat, the opening
    book with the Openings page, and the networks' choice (item 13), each one with its dependency on the engine's
    issue for its part, and each such kind of the engine lock in its exceptions file. Practice has ticket 21, and its
    kinds' lines stay in the exceptions file until it is done. Check: `engine-kinds` passes, and each such feature
    has its issue. After: 2.
15. **Planning repository: `glossary/tak.md`:** Tak's official words (flat, standing stone, capstone, road, tak,
    Tinuë, komi, PTN, TPS), and the site's words (Mistak, Takumi), in the shared glossary's "Contexts". Check: the
    file, linked from `GLOSSARY.md`.
16. **Mistak: the CORS check of playtak's API:** a request to `api.playtak.com` from another site's page. Check: the
    answer recorded in ticket 5 and in this document. If the API refuses, the site asks playtak's administrators
    (item 10).
17. **Mistak: the trained network:** the labels and the accuracy on real games, the search budgets, the engine
    measure's numbers, the home page's replay of one of the engine's own games, and the first preview with the
    network. Check: the review's constants measured on Tak's games and recorded in the decision log, and the owner's
    test on a preview. After: 10, 13, and the engine's release with a trained network.
18. **Mistak: the launch:** one commit, when the owner says to launch it ("How the site stays unlaunched"). Check:
    the site's address answers, with no `noindex`. After: 11, 12, 14, 17, 19, 20, 21.
19. **Mistak: the Analysis board's starts and the board editor:** the standard start of each trained size, the
    board editor with its stacks ("The board"), a TPS, a list of moves and the free Import, as on Hedge School, and
    the komi on the board in the trained range.
    Check: each start opens on the board and searches, the engine's check refuses an edited position that no game
    reaches, the editor at every width down to 360 pixels, and the layout test. After: 9, 10.
20. **Mistak: the tools for playtak's pages:** first a reading of `playtak-ui`'s code, then the reader of its page,
    the bookmarklet, the userscript and the tools page ("The tools for playtak's pages"). Check: tests on saved pages
    with hand-written games (a finished game and one in progress), and each tool on playtak.com in a real browser,
    with the game opened on the import page. After: 3, 5.
21. **Mistak: Practice against Takumi:** `/practice` on `packages/practice`, with the size in its settings, the bot's
    forms, the start from a TPS, "Play the bot from here", the points bar with the flat counts, and the stored games in
    the site's own D1 databases (`mistak-games` and `mistak-games-preview`). The databases are the owner's step
    (`docs/hosting.md`, as for Cyanotype). Check: a game against the bot with the test network, a game from a set-up
    start, its review in one click, and a stored game on a preview. After: ticket 1's second `engines` issue, 10, 19.

## Where it is

Nothing is built. This document is the plan. The engine's plan is in the engine repository's `games/tak/docs/design/`.

## Log

[decisions/product.md](../decisions/product.md), "The Tak site: the plan" and "The Tak site: the plan revised"
(2026-11-23).
