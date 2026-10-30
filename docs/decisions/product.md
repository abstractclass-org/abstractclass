# The product

The interface and the review, labels and thresholds, game import and export, the Analysis board, practice, puzzles and
lessons, the site's pages and text, the logo and colours, analytics, the launch on Cloudflare Pages, and the layout
sweep.

### A survey of chess and Go tools (2026-10-09)

- **What:** the page design of Lichess, chess.com, En Croissant, Nibbler, KaTrain, Lizzie, Sabaki and OGS: the
  open-source ones from their code, the closed ones from their help pages and live pages
  ([research/01-ux-survey.md](../research/01-ux-survey.md)).
- **Patterns most of them share:** a review opens on a summary, labels sit in the move list with the better line,
  the player retries their own mistakes, candidates show on the board with their line on hover, and the review leads
  to training.
- **Two findings that apply at once:**
  - OGS labels a move by the worse of its score loss and its win-rate loss. This answers the saturation of the win
    chance, as principle 1 of design 01 does.
  - KaTrain sweeps the whole game at 25 visits, then searches where the player looks (500 visits). This is the model
    for the review's schedule in the browser.

### The product's shape (2026-10-09)

- **Decided** ([design/04-product-shape.md](../design/04-product-shape.md)):
  - Static now, a server later. History in the browser, designed for a later server.
  - Explanations from templates over engine facts only.
  - Desktop first, phone usable.
  - Plain and clear, with a few rewards.

### The review wireframe (2026-10-09)

- **What:** the review page as a clickable wireframe (`/review`) on mock data: one bot game from the engine
  repository's visit ladder. The positions come from the engine repository's Python engine, and the candidates and
  win values from the current WebAssembly module at 64 visits ([`scripts/mock/`](../../scripts/mock/README.md)).
  Published as a private artifact for review on other devices (the snapshot build, `SNAPSHOT=1`).
- **Built:**
  - **The board** (`src/lib/board/Board.svelte`, SVG): the lattice with GTP coordinates, each player's regions,
    edges and nodes, a halo on protected edges, the last edge in yellow, the edge it cut as a dashed ghost with a
    cross, the engine's top five candidates as coloured segments with a badge (★ for the best, otherwise the gap in
    win chance), a preview on hover, and label dots on played edges (KaTrain).
  - **The graph** under the board: Blue's win chance as an area around 50% (Lichess), the score difference so far as
    a line, the key moments as dots, click to jump.
  - **Highlights:** a sentence from facts, a card per player (accuracy, label counts), the key moments.
  - **The walk:** each key moment from the position before it. The player enters an edge by two clicks. It counts
    as solved within 0.02 of the best's win chance (Lichess's 0.04 of winning chances). Buttons show the best edge
    and the game's edge.
  - **Analysis:** layer switches, the candidates table, the move list grouped by turn (`1b.`, `2r.`) with labels and
    a comment under each mistake (Lichess).
- **Placeholders, to replace when the engine reports scores:** labels from the mover's loss of win chance at
  Lichess's thresholds, and the gauge shows the win chance, not the margin with its spread.
- **Found while building:**
  - At 64 visits two searches of consecutive positions disagree enough to label the engine's own first choice a
    mistake. So when the played edge is one of the search's candidates, its loss comes from that one search. The
    real review needs the noise floor measured first ([design/01-analysis-tool.md](../design/01-analysis-tool.md),
    section 4).
  - The opening's values swing most. Key moments leave out the first 8 turns, as Regan and Haworth skip the opening.
  - Candidate segments cross and overlap. Five with badges stay readable in the positions seen. More need another
    display.
  - Edge input by two clicks works on a desktop. It needs the engine's legal edges before it can refuse an illegal
    edge.

### The review wireframe, first feedback (2026-10-09)

- **The win-chance bar is horizontal,** above the board, between the players: Blue on the left and Red on the right,
  as they start (A10-D10 and Q10-T10). Chess and Go tools stand the bar upright because their players start at the
  bottom and the top. The bar keeps that idea: each side's part points to its home. Each side's percentage sits in its
  own colour.
- **The scores read as points:** "184 points" by each player's name. A line under the player to move.
- **The board's layers** (candidates, move labels, regions, protected edges) are switches under the board, in every
  stage.
- **Move labels as badges with glyphs,** as chess tools mark the last move: by the second point of each edge of the
  turn just played, and only for that turn.
- **Positive labels:** Great (`!`, the only good edge), Best (`★`, the engine's first choice), Excellent and Good
  (`✓`), then Inaccuracy (`?!`), Mistake (`?`), Blunder (`??`). Bands from chess.com's expected points, and Great
  from En Croissant's rule (the second choice at least 0.10 worse), until Enclosure's own thresholds are fitted.
- **The star is for played edges only.** The engine's candidates carry their rank (1, 2, 3, as in the candidates
  table). Number 1 is solid and cyan. The others are dashed and faded until hover, which shows the edge and its gap.
  Only candidates within the Good band of number 1 show, at most three.

### The review wireframe, second feedback (2026-10-09)

- **Candidate notes** are drawn in the board's top layer, so other candidates no longer cover them.
- **The walk is "Learn from your mistakes",** after Lichess's mode of that name and chess.com's Retry. The tab is
  "Retry mistakes".
  - **Whose mistakes:** Both, Blue or Red. Lichess asks for a side, and chess.com lets the player highlight their
    own, the opponent's or both. With no accounts, the page cannot know which side is the visitor's.
  - **Moving between mistakes:** previous and next, and a pip for each mistake, which a click opens.
  - **Stepping away:** the arrow keys and the graph still move through the game, as on Lichess. Away from the
    mistake's position, the card says so and offers "Back to the mistake". Edge input works only at the mistake.
  - **The wording:** what was played and what it lost, then "Find a better edge for Red." and how to enter an edge.
    Lichess's buttons: "View the solution" and "Skip". After a solution or a success: "Next mistake".

### The review wireframe, third feedback (2026-10-09)

- **The hovered candidate** is drawn whole (edge, number, note) in the board's top layer.
- **Move labels sit at the edge's midpoint.** An end point is a node that several edges share, so a mark there does
  not say which edge it labels. A candidate's midpoint never coincides with it, because a candidate is never an
  existing edge.
- **"Show the game's edge"** in the retry is a switch: the game's edge as a dashed ghost with its label badge.
- **The Highlights list** reads as the retry does: "Biggest mistakes", "Edge 22: Red played L12-O11", and the button
  "Learn from your mistakes".

### Prototypes of the other parts (2026-10-09)

- **Why:** breadth before polish. Rough prototypes of each main part, to judge the product as a whole before any part
  is refined. All on the same mock game, all linked as one site, published as one private artifact.
- **Home** (`/`): a box to import a game (a meaf.us link or a game record), then cards: continue the last review,
  the daily puzzle on a small board, the next lesson. Lichess leads with play. This site leads with review, its main
  job.
- **Puzzles** (`/puzzles`, `src/lib/puzzles/model.ts`):
  - **The puzzles:** positions where the engine's first choice beats its second by at least 10% win chance
    (Lichess's rule that the solution is the only good move, with En Croissant's 10% gap). 28 in the mock game.
    Positions right after the opponent's mistake come first, as Lichess starts its puzzles.
  - **The states,** as on Lichess: play (rated), then try after a wrong edge (unrated, try again or view the
    solution), then view (the rating change, the themes, a vote, "Continue training"). A session row of results.
  - **The modes:** Puzzles, Streak (easy to hard, ends at the first miss, one skip), Themes. "From my games",
    "Dashboard" and "History" show as not built: they need stored history.
  - **Placeholders:** the difficulty is predicted from the gap and the phase. The visitor's rating moves by Elo
    (Lichess uses Glicko-2). Themes are only the phase and "Only edge", because motif tags need the engine's rules.
- **Learn** (`/learn`, `src/lib/learn/lessons.ts`): a map of stages after Lichess Learn: "The rules" (edges, closing
  a region, cuts, protected edges, two edges a turn), then "First ideas" and "Structures", not built. Each lesson is a
  few tasks on a cropped board, with a goal, a hint, a check and a result. The checks are hand-written for each
  position until the engine gives the rules.
- **Shared:** two-click edge input (`src/lib/board/edgeInput.svelte.ts`), and the board's crop (`view`) and hint
  edges (`targets`).
- **Not built:** the analysis board (the review's Analysis tab covers it for now), the personal page.

### Game import, first part: records and the player's games (2026-10-10)

- **Reading a game record** (`src/lib/game/record.ts`): the engine repository's PGN-like record, from its design
  (`docs/design/04-notation-and-protocol.md` there, which has no record reader in code yet). Tag pairs, turn labels
  (`1b.`, `2r.`, checked in order and by player), edges (written lower point first), `pass`, the result, and
  `[%eval]` and `[%clk]` in comments. Branches are skipped: the review needs the main line. A plain list of edges
  works too. Errors name the problem and its line and column. The engine checks the rules: an illegal move stops the
  review with the engine's own message. Tests: `npm test` (`node --test`, 7 checks, from the design's own examples
  and a round trip of the sample game).
- **The player's games** (`src/lib/game/store.ts`, `src/lib/storage/db.ts`): kept in the browser, as the record's
  text, with a version, so an export is the record itself and a later server can import it as it is
  (design 04). The id is the start of the SHA-256 of the moves: a game imported twice is one game. The browser's
  database is now version 2 (the analyses, and the games). An upgrade only adds stores.
- **The flow:** Home takes a pasted record, saves it, and opens `/review?game=ID`. Home lists the player's games.
  The review opens the imported game, or the sample when the address names none.
- **A timeout pass is a move:** the review model takes a move with no edge (`pass`), and its text says that the clock
  ran out and the rest of the turn was lost.
- **meaf.us:** its archive API wants the player's username and a password hash in request headers, and sends no
  `Access-Control-Allow-Origin`. The site cannot read meaf.us games itself, and must not handle the player's
  credentials. How a meaf.us game becomes a record is an open question (the backlog).

### Game import, second part: the meaf.us bookmarklet (2026-10-10)

- **Decided:** a bookmarklet now, and later an export from meaf.us itself (its owner's choice, to ask). meaf.us lets
  no other site read its games, and the site must not handle the player's login.
- **How it works** (`src/lib/game/bookmarklet.ts`, `src/lib/game/meaf.ts`): the player keeps it in the bookmarks bar
  and clicks it on a meaf.us game page. It runs in that page. It finds the game the board's React component holds
  (as the engine repository's `tools/sitebot_driver.js` reads it), writes the game's record, and opens `/import` with
  the record after the `#`. Browsers never send the `#` to a server. It makes no request to meaf.us and reads nothing
  from the login.
- **The record from a meaf.us game:** the players, the date, the time control, the final scores, the result (by
  score, `R` for a resignation, `F` for a forfeit), the game's id, and the turns. A timeout pass ends the turn in
  progress. A game in another rule variant is refused, because the engine knows only the online one.
- **`/import`:** reads the record after the `#`, removes it from the address, checks the moves with the engine's
  rules, keeps the game, and opens its review. Without a record it shows the bookmarklet and how to install it.
  Home links to it.
- **Checked:** `npm test` (11 checks, 4 of them on the conversion: the sample game in meaf.us's shape, a pass, a
  resignation, another variant). In Chrome, on the production build: the minified bookmarklet (2.7 KB) against a
  stand-in board of meaf.us's shape wrote the right record, and `/import` with that record opened its review with the
  players' names. The owner then checked it on a real meaf.us game: it works.
- **Also:** Home checks a pasted record's moves with the engine's rules before it keeps the game, and names the first
  illegal edge counting from 1.

### The review on the engine, first feedback (2026-10-10)

- **Turn labels without the player's letter:** the engine repository's record now writes `1. D10-G10 2. N11-Q10
  L10-N11`, and `4... M12-N9` for a branch at a turn's second edge (its `docs/design/04-notation-and-protocol.md`). The
  number gives the player: Blue's turns are odd. The reader, the record writer and the meaf.us conversion take and
  write only the new form. No record in the old form is kept anywhere. The move list shows the number alone: the
  moves are already in the player's colour.
- **Candidates, the board and the table together:** a candidate pointed at, on the board or in the Analysis table,
  gets a halo (a wide soft band under its line and a ring around its number). Number 1 gets it too, because number 1
  is always fully opaque and a change of opacity does not show on it. The table row of that candidate is lit.
- **The hover note** no longer names the edge. The edge is on the board under the pointer.
- **Number 1's note in the engine's colour:** number 1's note gives its own values (`54% · lead +21`), the others'
  notes give their difference from number 1 (`−1%, −7 pts`). Number 1's note box has the colour of its badge, so the
  two kinds read apart. The Analysis table gives absolute values for every candidate.
- **The hover follows the edge, not the list:** the position's own search renews the candidates after each slice,
  and the hover and its note stay. A new position clears the hover.
- **The Analysis table keeps five rows:** the first five candidates in the engine's order, and empty rows when the
  engine has fewer or none ("Not analysed yet.", "The game is over."). It never has more. The move list under it no
  longer moves.
- **The move list:** a move under the pointer gets a box.
- **The review's progress** is a bar at the top of the side panel, not text under the board. The bar has two parts,
  the game's shape and the move quality (the labels), each as wide as its share of the visits (32 and 256 a
  position), so the bar moves at an even pace. A line under it names the pass ("Reviewing: move quality, 39 of 120
  positions"). "Move quality", not "accuracy": Accuracy is one number in the Highlights, and the pass gives every
  move its label. While the review runs, the Highlights
  counts are grey and italic, the summary says that they are partial, and the list says "Biggest mistakes so far".
  An engine error takes the bar's place.
- **The position's own search** has a thin bar under the win-chance bar: its visits against the budget of 1,024.
  As Lichess's depth bar does, it stays full when the search ends, to show that the search is done. The line under it
  reads "512 of 1,024 visits", then "1,024 visits". The search of the position on screen now also starts when the
  network loads. Before, it started only when the player moved.
- **The single-file build is removed** (`SNAPSHOT=1`, `scripts/snapshot-fragment.cjs`). It served only the
  artifacts, which are removed.
- **Checked** in Chrome on the production build, on the sample game: both bars (the search bar full and kept at
  1,024 visits), the halo and the lit row in both directions, both kinds of note, the note during a search, and the
  table at 153.5 pixels with five candidates and with none. `npm test` (11 checks) and `npm run check` pass.

### The review on the engine, second feedback (2026-10-10)

- **Biggest mistakes in the record's notation:** each line is the label, the move with its turn (`11... L12-O11`, in the
  mover's colour), and the points lost. `11.` marks a turn's first edge, `11...` its second, as the record's branches
  do.
- **Points lost** (`−145 pts`) is the engine's lead (KataGo's `scoreLead`, in Enclosure points) from the mover's
  side, before the edge less after it: KaTrain's points lost. The lead at a position is the search's value there.
- **The chart's hover:** the pointer snaps to the nearest position, with a line and a dot on the win-chance curve. A
  note gives the move that led there with its label (`11... L12-O11 · Blunder`), then one number, as Lichess's
  "Advantage" note does. The number is the engine's lead (`Lead: Red +37`), which is what KaTrain's graph plots
  (`B+n`) and what points lost come from. The start says "The start". The end gives the result.
- **Number 1's note box** is dark teal with a teal border, as the others' note box is darker than their grey line.
- **The move list:**
  - The moves line up in two columns. Each move is as wide as the longest (an edge such as `D10-G10` and `??`).
  - It scrolls with the position: the current move stays three rows from the top.
  - It shows only the labels Great, Inaccuracy, Mistake and Blunder. Best, Excellent and Good stay on the board. The
    chart's note shows the same four. The labels themselves do not change.

### The review on the engine, third feedback, and the cut mark (2026-10-10)

- **The cut mark** (the engine repository's notation, its commit `d5c5611`): a move that cuts an opponent's edge is
  written with `x` after it, `D10-G10x`. The reader takes a move with or without the mark and keeps the moves bare,
  because the pinned engine (protocol 0.1) does not read the mark. At import, Home and `/import` find with the
  engine's rules which moves cut, refuse a mark on a move that cuts nothing, and keep the record with a mark on every
  cutting move (`markCuts`, `src/lib/game/check.ts`). The game's id comes from the bare moves, so a game with and
  without marks is one game. The move list, the Biggest mistakes and the chart's note show the mark.
- **Checked in Chrome on Home:** `1. D10-E13x 2. Q10-R8 O11-Q10` is refused ("Edge 1 (D10-E13x) is marked as a cut,
  but it cuts nothing.") and nothing is kept. The sample game's first 13 turns without marks are kept as
  `… 12. L12-O11 L12-N15x 13. E7-H4x H4-J6x`, the three moves that cut. Its first 12 turns with `L12-N15x` already
  marked are kept with that one mark, not doubled.
- **The Advantage chart** is the chart's name, after Lichess's name for its own ("Advantage"), so that players can
  refer to it (`AdvantageChart.svelte`). The win chance is now a solid line, with the area to 50% still filled. The
  score so far is a second line in the accent colour.
- **The move list's column width is a constant:** the widest move is 10 characters, an edge with two-digit rows and
  the cut mark (`D10-G10x`) and the widest glyph (`??`). The current move stays four rows from the top.
- **Number 1 on the board is faded as the others are,** in its own colour, so that it does not hide a short edge.
- **Win chance has one decimal** wherever it shows (`58.5%`).
- **Hover notes show the difference from number 1 even when it is 0,** with its sign (`+0.0%, −3 pts`): a candidate
  after number 1 in the engine's order can be a little better than it. "As good as 1" is gone.
- **The candidates table keeps the engine's numbers and its five rows,** with bad candidates too, for exploring why
  they are bad. Each row is tinted by Blue's win chance after the candidate: blue the more it favours Blue, red the
  more it favours Red, none at 50%, full strength (35%) at 25% and 75%. The hovered row has an outline.

### The review on the engine, fourth feedback, and the protocol's versions (2026-10-10)

- **The protocol's versions** (the engine repository's design 04): before 1.0 a version is 0.MINOR, any new version
  may break a client, and a client accepts only the exact version it was written for. The first protocol is 0.1,
  which builds before this numbering report as 1.0. The site accepts 0.1 and 1.0, and nothing else (`PROTOCOL`,
  `src/lib/engine/protocol.ts`). Before, it accepted any 1.x.
- **Hover notes in one format:** number 1 reads `63.7% · +79 pts`, the others `−4.5% · −33 pts`.
- **The candidates table has fixed columns** (`table-layout: fixed`). The edge column takes the space left.
- **The row tint is in steps, not shades:** a diverging scale with equal steps per side, as the data-visualisation
  rule for diverging scales asks, because steps are easier to tell apart than shades. The steps start at chess.com's
  win-chance bands (2%, 5%, 10%, 20%, as in `labels.ts`), here as the distance from 50%. So they are narrow near 50%.
  Under 2% from 50%, no tint.
- **The table marks and keeps the board's candidates:** their number is in a badge, as on the board (number 1 in
  teal). The table's five rows are the board's candidates (three at most), then the others in the engine's order. On
  edge 30 of the sample game, number 1 had 767 visits and the board showed numbers 1, 5 and 11. Before, the table
  showed 1 to 5 only, without 11.
- **Checked** in Chrome on edge 30 of the sample game: the table showed 1, 2, 3, 5 and 11.
  Badges were on 1, 5 and 11, the three that the board showed. The notes read `63.7% · +79 pts` and `−4.5% · −33 pts`.

### The candidates: which ones the board shows, and the engine's order (2026-10-10)

- **The other candidates' notes name their reference:** `vs 1: −4.5% · −33 pts`. Number 1 reads `63.7% · +79 pts`.
- **The table lists every candidate,** in the engine's order, in a box of five rows that scrolls. The box keeps room
  for its scroll bar, so the columns do not move. A candidate pointed at on the board brings its row into view.
- **The board shows number 1 and every candidate that has enough visits and is within the Good band.** Enough visits
  is KataGo's own rule for a move that may compete for its choice: 15% of the most visited move's weight
  (`minVisitPropForLCB`, its `analysis_example.cfg`, `getPlaySelectionValues` in `search/searchresults.cpp`). Visits
  stand for weight here. No limit on the count. The limit of three before had no source, and with it the band chose
  among barely searched moves almost at random.
- **The engine's order is KataGo's choice of move, not its visits.** KataGo sorts the moves by their play selection
  value: each move's weight (about its visits), less the visits it got only for exploration, and then the move with
  the best lower confidence bound among those with 15% of the top weight is lifted to the top. So number 1 can have
  fewer visits than number 2 (edge 92 of the sample game: 14 against 49).
- **A candidate's visits are now KataGo's `edgeVisits`,** the visits through the move. The reply's `visits` is the
  child node's, which with graph search also counts the visits that reach the same position by another order of
  edges. The cache's key has a shape version (2), so the analyses kept before are not read as the new shape.
- **Seen in Chrome on the sample game:** the board's count follows the search's depth. After the label pass (256
  visits) the visits are spread, and 53 of 119 positions show more than number 1 (edge 30: eight, edge 92, a lost
  position where many moves are equal: ten). After the deep search (1,024 visits) at edge 30, number 1 has 767 visits
  and the board shows number 1 alone. The table's box stayed 157 pixels high at every position.
- **Refined by the engine repository** (its design 04, commit `bcdb229`, answering request 04): the best-LCB move is
  not put on top outright. Its value is raised as far as its lower bound justifies against each other move, at most
  fivefold, which usually but not always puts it first. The protocol leaves out KataGo's symmetric twins, so the
  `order` numbers in a reply can have gaps. The review numbers the candidates by their place in the sorted list, so
  its numbers have none. A move's share of the search is its `edgeVisits`, as the site reads it.

### The review page's layout (2026-10-10)

- **Decided** (design [06-review-layout.md](../design/06-review-layout.md)), from Lichess's analysis layout: the board
  fills the window's height. Three columns from 1,260 pixels (the summary with the Highlights, the board, the
  analysis). Two columns with tabs below that. One column below 800 pixels. The Advantage chart under the board. The
  step controls and a display menu at the bottom of the analysis column. The engine header (values, visits, search
  bar) at the top of the analysis. The review's progress at the top of the summary.
- **The win chance is a display setting:** a bar above the board with the players' names and scores (the default),
  or a vertical gauge beside the board. The display menu also holds the board's layers and the chart's score line.
  The choices are kept in the browser (`src/lib/review/display.ts`). The site's header height is a shared CSS
  variable (`--site-header`), since the board's size depends on it.
- **Measured in Chrome**, on the sample game:
  - A 2,498 × 1,266 window (a 2,560 × 1,440 screen, maximised): three columns, a board of 1,160 pixels, the analysis
    column as high as the board's column (1,194 pixels).
  - 1,376 × 952: three columns, a board of 694 pixels (limited by the width), the summary 253 and the analysis 343
    pixels wide. With two columns, the board would be 846 pixels.
  - 1,100 × 900: two columns with the tabs, a board of 688 pixels.
  - 700 × 900: one column, the board as wide as the column (653 pixels), in both the bar and the gauge forms.
- **Found and fixed while checking:** the page's own class for the gauge form (`gauge`) took the gauge's styles, and
  the one-column board did not leave room for the scroll bar.
- **Then:** the switch to three columns stays at Lichess's 1,260 pixels. The gauge shows each side's percentage
  inside it, at its own end, in small text (the gauge is now 2rem wide). The engine header no longer repeats Blue's
  percentage in the gauge form.
- **The lead after each move in the move list,** as Lichess shows its evaluation after each move (`renderMoveNodes`,
  `ui/analyse/src/view/components.ts`: the position's score, not the move's loss). Ours is the engine's lead in the
  position after the move, from Blue's side, right-aligned and muted: whole points, signed, thousands as `k`, so at most
  five characters (`+1.2k`). After the last move, the result. A move's hover title is short: its label and the lead
  ("Blunder · Red +87"). Each move's cell has one width (the move, its glyph and the lead: 110 pixels), so two moves fit
  the analysis column at its least width (294 pixels of list in a 343-pixel column at 1,376 × 952), checked in Chrome.

### The review's tables fit their content (2026-10-10)

- **The problem:** in a real browser, each Windows scroll bar takes about 15 pixels (the page, the summary, the
  candidates' box). At 1,380 × 952 the candidates table's edge column had 56 pixels, and names of 7 characters were
  cut ("D10-…"). The accuracy table's labels had 76 pixels, and 6 of its 10 labels took two lines. The other columns
  had room to spare. Screenshots from headless Edge hid the scroll bars.
- **The candidates table's fixed columns fit their widest content,** with their padding: the rank's badge (28
  pixels), the header "Blue wins" (72), a lead of four digits (48), visits of five digits (48). The edge column takes
  the rest: 98 pixels at the analysis column's least width. The longest names have 7 characters (57 to 62 pixels at
  14 pixels).
- **A name that does not fit gets smaller text, not an ellipsis.** This happens with a larger browser font: the
  columns are in rem, and the analysis column's limits are in pixels. The edge's cell is a size container, and the
  name's text is `clamp(0.7em, 22cqi, 1em)`. Below 70% of its size the text is hard to read, so the name is cut there.
- **The accuracy table's number columns are as wide as their content,** and the labels take the rest.
- **The accuracy table's labels are shorter:** "Avg pts lost" for "Points lost an edge" (its hover title gives the
  full meaning), and the labels' names ("Great", "Inaccuracy") for "Great edges" and "Inaccuracies", as chess.com's
  review counts its labels by name.
- **Checked in Edge,** on the sample game:
  - At 1,380 × 952 (the analysis column at its least): every name whole at 14 pixels, and no accuracy label wraps.
    The shorter table also shows all of the biggest mistakes.
  - At 1,000 and 390 pixels wide, the same.
  - With a larger root font: at 17 pixels the names are whole. At 18 pixels the text is 13.2 pixels. From 19 pixels
    the text reaches its least size and the longest names are cut. From 18 pixels some accuracy labels wrap.

### The review's marks, gauge and display menu (2026-10-10)

- **The accuracy and the average points lost have one decimal** (90.3, 13.4), as chess.com shows its accuracy.
- **Excellent's mark is a thumbs-up, and Good keeps the check mark,** as on chess.com. Before, both had a check mark.
  Good's badge is green too (`#8fb57a`, from a grey olive): the lightest of the three greens after Best and Excellent,
  as chess.com's Good is a muted green.
  A label's mark is now a character or an icon (`LABEL_GLYPH` in `src/lib/review/model.ts`). `Glyph.svelte` draws it
  in the page, and the board draws the icon's path in its badge. The icon is Material Design Icons' `thumb_up`
  (Google, Apache License 2.0), filled, because an outline is hard to read at the badge's size.
- **The gauge is 1rem wide, from 2rem.** Its percentages are written up the gauge, at 9.6 pixels, semibold, with
  0.1em between the characters. In bold with no spacing, the digits ran together at that size. A percentage shows
  when its side's part of the gauge is at least 40 pixels long. Before, it showed when the share was at least 6%, a
  rule for text written across.
- **The display menu is raised above the panel:** the lighter surface (`bg-panel-2`), a border in the muted colour,
  and a deeper shadow. Before, it had the panel's own surface and border, and in dark mode it did not stand out. The
  gear button has the accent colour while the menu is open.
- **Checked in Edge** at 1,380 × 952, in dark mode and with the light tokens set on the page: the badges, the
  decimals, the gauge (16 pixels wide, each percentage 31 pixels long, centred, and 5 pixels from its end), and the
  menu over the move list.
- **The badges in the text have the board's proportions:** the mark is 56% of the circle (on the board, 0.4 in 0.72),
  in bold. Before, the mark was 77% of the circle (the thumbs-up 85%) in extra bold, and it looked too large and too
  heavy next to the board's badges. In the summary's table the circle is 16 pixels and the mark 9 pixels.
- **No font is used for the thumbs-up.** Only emoji fonts have the character (U+1F44D), in colour, and a request for
  the plain text form is ignored on many systems. A web font (Noto Emoji, Material Symbols) would add a download for
  one mark. The SVG path draws the same everywhere.
- **Chess.com's own icon files are not used.** They are on chess.com's servers, but chess.com gives no licence to use
  them. The marks follow chess.com's set with free equivalents instead.

### The side columns reach the chart (2026-10-10)

- **Decided** (design [06-review-layout.md](../design/06-review-layout.md), "Height"): when the whole Advantage chart is
  in the window, the summary and the analysis columns reach down to the chart's bottom edge, so that the three columns
  end on one line. Before, they ended at the board's bottom, and the chart stood alone under the board.
- **The line is the chart's edge, not its legend.** The chart is a box, so its bottom edge lines up with the columns'
  edges. The legend is text with no edge, and it reads as the chart's caption under the line.
- **When the chart does not fit in the window,** the board fills the height and the chart is below the fold. The side
  columns then keep the board's height, so that the step controls at the bottom of the analysis column stay in view.
  A column that ended in the middle of the chart would line up with nothing.
- **How:** the page measures the chart's bottom against the window's height when the window, the layout or the win
  chance's form changes (`reach` in `ReviewView.svelte`). With `reach`, the side columns span the chart's row, with a
  set height (the board's column, the gap, and the chart's 7.5rem), so they do not make the rows taller. Below 800
  pixels (one column) nothing changes.
- **Checked in Edge:** at 1,380 × 904 the three columns end at 865 pixels. In frames: 1,380 × 1,000 the same. 1,000 ×
  880 (two columns) the analysis column ends at the chart's bottom. 1,380 × 800 (the chart does not fit) the columns
  end at the board's bottom, as before.

### The players above the board with the gauge, and the move list's columns (2026-10-10)

- **The players stay in the row above the board in the gauge form too,** Blue on the left and Red on the right, from
  the board's edge, with nothing between them. Before, the gauge form listed them at the top of the summary column,
  Blue above Red, next to a gauge with Blue below Red. The row costs the board 2.1rem of height in the gauge form.
- **Checked in Edge** at 1,380 × 904: the players' row has the board's edges (311 to 987 pixels), and the three columns
  end at the chart's bottom (898 pixels).
- **The chart is in the window when its bottom edge is,** not its bottom edge and the page's margin under it. With the
  row above the board, the chart ended at 898 pixels in a 904-pixel window, and the margin would have kept the side
  columns from reaching it.
- **The move list's turns are a grid,** as Lichess's move list: the turn's number (2.2rem), then two equal columns, each
  at least a move wide (`minmax(max-content, 1fr)`). With room to spare the second edge starts halfway across. At the
  analysis column's least width nothing changes. Measured in Edge: the second edge starts 227 pixels into a 411-pixel
  list (1,900 × 1,000), 177 into 311 (1,000 × 880), and 169 into 294 (390 × 900), with no scroll across.
- **A move fills its column, and its lead is at the column's right edge,** as in Lichess's move list, where each move's
  evaluation is at the right of its cell. The highlight of the current move and of the move under the pointer covers
  the whole cell (184 pixels at 1,900 × 1,000).

### The "Retry mistakes" tab removed (2026-10-10)

- **Removed for now:** the tab, the "Learn from your mistakes" button, and the code behind them (`gradeTry` in
  `model.ts`). The retry asked for an edge as good as the engine's first choice. The engine's first choice is often
  hard to spot, and sometimes no human would find it, so a retry of it teaches little. Learning from mistakes is to
  come back as a mode of the analysis (decisions/open-items.md), on Lichess's rules.
- **Lichess's rules, read in its source** (research/01-ux-survey.md, "Learning from the game"): it picks the moves
  where the win chance swung by more than 10 points, and it accepts any move that keeps the win chance within 4
  points of the position before the mistake, after a search of that move. Win chance flattens near a decided
  result, so a missed long mate in a won position is never picked.
- **A correction:** the retry's margin (2% of win chance) came from a misreading of Lichess's 0.04. Lichess's
  `povDiff` already halves the winning chances (−1 to +1), so its 0.04 is 4 points of win chance, measured against
  the position before the mistake, not against the first choice.
- **The Biggest mistakes** in the Highlights now go to the move in the analysis, the position after it, where the move
  list explains it, as Lichess's summary goes to the move (`nextGlyphSymbol`).
- **The tabs show only below 1,260 pixels,** where the Highlights and the Analysis share a column. With three columns
  the analysis column has no tabs.
- **The Biggest mistakes rows are as the move list's moves:** the whole row is the button, the points lost are at its
  right edge, and the row under the pointer has the move list's highlight. Checked in Edge: each row is the list's
  width, and the points lost end at its right edge.

### Edge input on the engine's rules, in the puzzles (2026-10-10)

- **The problem:** any point could start an edge, and the second point only had to be within 3 units. Nothing checked
  the engine's rules (an edge from the mover's own node, cuts, protection), so a puzzle took an illegal edge as an
  answer.
- **Decided:** Constellation's way, with a ghost edge. After the first point, the board marks every point that
  completes a legal edge from it with a dot in the mover's colour, smaller and fainter than a node, as a chess site
  marks the legal moves. Rings were tried first, and they were too large. The pointer on a marked point shows the
  edge as a dashed line, and only there: a click can only place a legal edge, so the line shows exactly what a click
  places. meaf.us's way (a dashed box of the reach, and a line that turns green or red under the pointer) was the
  other choice. It needs hover, so on a touch screen a player would learn whether an edge is legal only after the tap.
- **The first point:** one of the mover's nodes that starts a legal edge, as a new edge starts at the mover's node.
  An edge has no direction, so the far end could also come first, but a node first is what a player expects. A
  click elsewhere does nothing, and the puzzle's card says "Start the edge at one of Blue's nodes". With a first
  point, a click on another such node makes it the first point, and a click on a point that is neither a marked end
  nor such a node keeps the first point and says "Finish the edge at a marked point". A click on the first point
  cancels it. The points that a click does nothing on show no hover.
- **How:** the puzzles page starts one engine worker with no network and asks `describe` for each puzzle's position:
  its `legal` list is every legal edge, and `nodes` gives the mover's nodes. `EdgeInput` takes them (`rules`) and gives
  the ends (`ends`) and the points a click acts on (`active`) to the board. Without the engine (a site where
  `npm run engine` was not run) the input keeps the rules' box.
- **Checked in Edge** on the first puzzle (Blue to play): before the first point, the 18 points a click acts on are
  Blue's 18 nodes. E10 is refused with the card's message. D10 marks 38 legal ends, and not the points on Blue's own
  edge A10-D10. K3 then keeps D10 and says to finish at a marked point. The pointer on A13 shows the edge D10-A13. A
  click on a marked end places the edge, and the puzzle answers "That's not the edge".
- **Not yet:** the lessons still check edges with their own small tests (the backlog).

### The engine's line on the board (2026-10-10)

- **Decided** (design [07-lines-and-variations.md](../design/07-lines-and-variations.md)): pointing at a candidate,
  on the board or in the candidates table, draws its line on the board (KaTrain's and Lizzie's way): its first 6
  edges, dashed in each mover's colour and numbered in circles of the mover's colour, the candidate first. The
  analyses keep each candidate's line (KataGo's `pv`, up to a pass, the cache's shape version 3).
- **The cuts and the regions:** the first line tried, from the sample game after edge 30, cut 3 of Red's edges in 6
  edges (H6-L8, L8-O11, L8-N11), and the board still drew them. Now the edges a line cuts leave the board and are drawn
  cut, and the regions are the ones after the line's last drawn edge, from the engine's `describe` of each position
  along the line. The review got a worker for the rules alone, so that these calls never wait behind a search.
- **One edge at a time,** by default, as KaTrain draws a line: one more edge every half second, then the line stays.
  A click on the candidate or its table row shows the whole line at once. The display menu names the choice
  "Animated" or "Static", and the win chance's "Top horizontal bar" or "Side vertical gauge". Reduced motion draws the
  line all at once.
- **The players' tags show the area** each encloses now, besides the points (the engine's `areas`, which each turn's end
  adds to the points). While a line shows, the area is the one after its last drawn edge, in the accent colour. After
  edge 30 of the sample game, Blue has 46 points and 11 area, Red 30 and 3. Number 1's line takes Red to 4 at its first
  edge and back to 3 when Blue cuts, and Blue to 24 when its sixth edge closes a region.
- **The other candidates leave the board** while a line shows, so that its only numbers are the line's. The rounded
  square and the number on the new point were the other choices.
- **Only for candidates with enough visits** (the first choice, or 15% of the most visited candidate's visits, the
  board's rule): the line of a barely searched move means little. The other rows say "Too few visits to show the
  engine's line". The engine repository is asked for the visits of each move of a line (request 05,
  `includePVVisits`), so that a line can stop where its search ran out.
- **Checked in Edge:** after edge 30, number 1's line draws one edge at a time (1, then 2, … 6 over three seconds),
  each cut appearing with its edge. A click on the row draws all 6. Red's cut region near M9 loses its shading and
  Blue's new region gets it (Red 3 regions to 2, Blue 6 to 7). R8-T11 (6 visits) shows no line and its row has the
  note. At the first position, pointing at number 1 hides number 2 and leaves number 1.

### The engine's line: where it stops (2026-10-10)

- **The engine gives the visits of each edge of a line** (request 05, engine repository commit `83a0e53`, no protocol
  change): with `includePVVisits: true`, each candidate has `pvVisits` and `pvEdgeVisits`, one number for each move
  of its `pv`. Every search of the review asks for them, and the analyses keep `pvEdgeVisits` with the line (the
  cache's shape version 4).
- **Published tools:** KaTrain and Lizzie draw the whole line and do not ask for its visits (KaTrain's `anim_pv_moves`
  is 100, and Lizzie's `limit-branch-length` is 0, no limit). KaTrain's one count for "too few visits" is `low_visits`,
  25 (`trainer/low_visits` in its `config.json`): a candidate with fewer is drawn small and faint, without its numbers
  (`gui/badukpan.py`).
- **Decided** (design 07): a line stops before its first edge with fewer than 25 visits through it (`pvEdgeVisits`),
  and needs one edge after the candidate. The 6-edge cap and the 15% rule stay. Drawing the thin edges faint, and a
  share of the candidate's visits, were the other choices. The visits through a move can grow along a line (graph
  search: another order of moves reaches the same position), so the cut is at the first thin edge.
- **Measured** on the sample game, the candidates with a line (`pvEdgeVisits` of the first 6 edges):
  - At 1,024 visits (a position once its deep search ends), after 0, 10, 30, 50, 70 and 90 edges: 1 of 10 lines is
    shortened, O17-R18's after edge 50 (182, 104, 103, 25, 19, 11) to 4 edges.
  - At 256 visits (what shows before), 8 of 11 lines are shortened: Q1-T1's after edge 90 (253, 66, 9, …) to 2 edges,
    and H6-L8's and J5-L8's after edge 10 (32, 7, … and 35, 9, …) to the candidate alone, so they show no line.
- **The line grows with the search,** and its drawn edges stay: the drawing goes on from there, and the regions and
  areas of the shared edges stay until the rules give those of the new ones. Checked in Edge, with the pointer on number
  1 (H9-L9) after edge 101 while its deep search ran: 2 edges at 256 visits, 3 from 288, 4 from 384, 5 from 576, and
  never a restart.

### The players' row at narrow widths (2026-10-10)

- **The problem:** the row above the board is the board's width. At an 800 × 900 window it is 388 pixels wide and on a
  390-pixel phone 343. There the names shrank to nothing and Red's numbers ran under the win-chance bar.
- **Decided** (design 06): the tags fold, and the bar stays between them. Two lines (the numbers under the name) and
  "pts" for "points" at phone width was the choice. Putting the bar on its own row, and the players above and below the
  board (Lichess and chess.com), were the other choices.
- **Measured:** the points reach the thousands by a game's end ("3,405 points · 131 area"), so a tag is 247 pixels on
  one line, 161 on two lines, and 142 on two with "pts". With the bar's 6rem, two lines with "pts" need a row of 396
  pixels, more than 388 or 343. Three lines (the points, then the area) need 94 pixels a tag and keep "points": a
  row of 313 pixels (a 360-pixel phone) leaves the bar 109. So the narrowest form is three lines, not "pts".
- **The forms,** by the row's own width (container queries): one line from 38rem, two from 27.5rem, three below. With
  the gauge, 32rem and 21.25rem. The thresholds take a game's widest numbers, so a game keeps one form and the board
  does not change size as the scores grow. The page measures the row's height, and the board and the side columns
  take it.
- **Checked in Edge** at a game's last position, in ten windows. Five were wide: 1,920 × 1,000, 1,380 × 904,
  1,280 × 720, 1,100 × 800 and 900 × 900. Five were narrow: 800 × 900, 600 × 900, 430 × 900, 390 × 844 and 360 × 740.
  In each, no tag overflows, no name is cut, no tag meets the bar, no
  page scrolls across, and the board and the side columns end level. One line at 1,100 pixels and up (two at
  1,280 × 720, where the board is height-bound and gives 3 pixels for the taller row), two at 900 and 600, three at
  800 and on phones. With the gauge the same, except one line at 1,280 × 720 and 600 × 900, and two at 800 × 900 and
  430 × 900.

### The engine's line listed, and branches (2026-10-10)

- **Decided** (design 07): one line listed under the candidates table, as Lichess lists one by default (`ceval.multipv`,
  1): the line of the candidate pointed at, or else of the selected one (number 1, or the row or board candidate last
  clicked). One line for each candidate on the board was the other choice. Pointing at an edge of the list draws the
  line up to it on the board, all at once. A click plays the line up to it as a branch (Lichess's `playUciList`).
- **Without notation by default:** Go tools show variations without notation, and an edge's name is two points to find
  on a 19 × 19 board. A branch's edges and the listed line's are circles in the mover's colour, numbered from the
  branch's start as the board numbers a line, with small gaps between turns. "Text notation" in the display menu shows
  the record's notation instead. Plain dots by turn and a game-tree graph (Sabaki, KaTrain) were the other choices.
- **The game is a tree** (Lichess's analysis tree): a place is a path of moves, a branch's positions come from the
  rules, and each is searched when the player looks at it. ← and → go along the line on screen, Home and End to its
  ends. Branches show under the turn where they start, after its comments, indented with a rule on the left (Lichess's
  column view). A branch that forks again breaks its row after the fork's first child.
- **Kept in this browser,** as Lichess keeps its analysis tree (`idbTree.ts`): a game's lines under its id, in a new
  store (`branches`, the store's version 3). Keeping them for the visit only was the other choice.
- **A fault found in the check:** a branch's path came from the page as a state proxy, and the worker could not copy it
  ("could not be cloned"), so the branch was not searched or kept. The analysis now copies a path into a plain array.
- **Checked in Edge** on the sample game:
  - After edge 30 the list shows number 1's line, 14 circles (Red 1, Blue 2 and 3, and so on). Pointing at circle 4
    draws 4 edges and their 2 cuts. The line is the game's own continuation, so a click on circle 6 goes along the game
    to edge 37.
  - Before edge 37 (the blunder J6-M8, where A7-A10 was best), a click on circle 3 plays A7-A10, T13-T16 and
    T10-T13 as a branch: the status says "A branch from edge 37 · Turn 21 · Blue to play", the move list shows the
    branch under turn 19, and the branch's position is searched. ← goes back along the branch and onto the game, → at
    the fork takes the game's edge, and End goes to the game's end.
  - From the branch's first edge, candidate 1's line (M8-O11) makes a branch inside the branch: the rows are the
    branch to its fork, the inner branch one step further in, then the branch going on.
  - After a reload the branches are there. In text notation they read "19... A7-A10 20. T13-T16", "20. M8-O11
    K7-M8x" and "20... T10-T13".
  - At 390 pixels the 14 circles take two rows of the list's box, and the page does not scroll across.

### The listed line and branches, first feedback (2026-10-10)

- **The candidates' ranks are rounded squares** on the board, in the table and before the listed line. The listed line
  put a rank badge next to the line's numbered circles, and both read as a line. The line's numbers stay circles (Go's
  numbered stones).
- **The circles' digits sat high:** a line box of the text's height (15 pixels in a 16-pixel circle) put the digits
  0.5 pixels above the centre. With a line box of the font's size (`leading-none`), they are within 0.25 pixels,
  and centred at six times the size.
- **A click on a candidate only selects it** for the listed line. It no longer also draws the whole line: a click did
  two things. Pointing at the list's last edge draws the whole line.
- **The move list's notes are one line:** "Blunder. N9-Q10 was best.", "Great. The only good edge." A note said twice
  in a turn shows once. The full sentence stays in the Highlights. The display menu turns the notes off ("Notes on the
  key edges").
- **The table no longer scrolls under the pointer:** its box was 0.2em higher than its header and five rows (162
  pixels for 159.5), and a row partly in view, pointed at, scrolled into view. The box is now the rows' height, and the
  table scrolls to a row only for a candidate pointed at on the board.
- **Where an inner branch leaves its branch:** an inner branch keeps its branch's numbers, so its first number is that
  of the edge it replaces (under "1 2", a branch that replaces 2 reads "2 3"), and each branch row starts with its turn
  ("5. 8 9 10" under "1. 1 2 3 4 5 6 7 8").
- **Checked in Edge:** the board's candidates are rounded squares. The table's box is 160 pixels for 159.5 pixels of
  rows. Pointing at row 5 leaves the table where it is. A click on row 2 shows candidate 2's line in the list and
  draws no line. The notes read as above.

### The listed line and branches, second feedback (2026-10-10)

- **Off-centre numbers, two causes:** the list's circles sat in buttons on a text baseline, 1.3 pixels below the
  candidate's badge, and the branches' circles took the move list's monospaced font. The buttons are now flex boxes,
  and each number is a block trimmed to the digits' height (`text-box: trim-both cap alphabetic`, which Edge and
  Chrome have), so flex centring centres the digits in any font. Measured in Edge: the badge and the circles share one
  centre line, and the digits' centre is the badge's.
- **A click pins the candidate:** its line stays on the board and goes on drawing after the pointer leaves (2, 3, 4,
  5, 6 edges at half-second steps after leaving, in Edge). A second click unpins it.
- **Every turn has its number in a branch,** and a fork's lines stand side by side, one step further in, as Lichess
  shows the lines from a fork inside a variation. Before, the fork's first line went on in the branch's row, so "13...
  K6-M9x" stood to the left of its sibling "13. H5-L7".
- **Dots, not numbers, in the move list's branches:** with every turn numbered, a branch's own count beside the turn
  numbers was a second, unrelated count. The dots are in the mover's colour, and the turn numbers place them. The
  listed line keeps its numbered circles, which match the board's numbered line.
- **The listed line shows what is already in the tree:** its edges played in the game, or in a branch, are hollow
  circles (dotted underlines in text), with "played in the game" or "in a branch" in the tooltip. A click on the line
  goes along those edges, and the branch starts after them, so that turn is where it appears.

### The display settings as a panel (2026-10-10)

- **The problem:** the display menu held eleven controls in six small groups, in a popover above the gear.
- **Published tools:** Lichess's analysis settings (`ui/analyse/src/view/settingsView.ts`) are a dialog, 720 pixels
  wide, with switches in boxes by where they act (General, Move list, Board), in two columns or one on a phone, and a
  help video for the setting under the pointer. Lichess's analysis menu itself opens in the analysis column, in the
  move list's place.
- **Decided** (design 06): a panel in the analysis column, in the place of the analysis, so that the board shows each
  change. Grouped by where a setting shows (Board, Move list, Advantage chart). A short line under each setting that
  says what it does. Switches for on and off, and a pair of buttons for a choice of two. A dialog in two columns
  (Lichess's settings) covers the board. The popover, reorganised, would grow taller than the column. Help on hover
  does not show on a touch screen, and labels alone say little for "Protected edges" or "Dots and numbers".
- **Checked in Edge** at 1,372 × 892: the panel fills the column and scrolls (742 pixels of settings in 618). A click on
  "Side vertical gauge" brings the gauge, and the Regions switch turns the shading off and is kept in the browser.
  Escape closes the panel and brings back the candidates and the move list. At 390 pixels the panel takes the tabs'
  place, 309 pixels wide, with nothing cut and no scroll across.

### The player's own moves, keys and the move menu (2026-10-11)

- **Published tools:** Lichess's keys (`ui/analyse/src/keyboard.ts`): at a fork ↑ and ↓ pick the line that → follows,
  elsewhere the first and the last move. Shift + ← and → the previous and the next fork. Shift + ↑ and ↓ the line
  beside this one. Space its best move. Its move menu (`treeView/contextMenu.ts`): Promote variation, Make main line,
  Delete from here. KaTrain analyses each move added to its tree and colours each node by the points it lost. A middle
  click plays the line under the pointer.
- **Decided** (design 07): the player's own moves always on, the puzzles' edge input on the position's rules. Lichess's
  keys. Space plays the pinned candidate or number 1, and a double-click on a candidate plays it. A right-click (or a
  long press) on a branch's move gives Promote variation and Delete from here. The game's line stays first in the
  review, so "Make main line" waits for an analysis board (the backlog).
- **Labels on a branch's edges: built, then left out.** They were judged as the game's edges (one `judgeEdge` for
  both), with each new branch position searched to the label budget at once, so a label came within seconds and
  nothing waited for it. The owner left them out: a line is often played only to show something, and its searches
  would be wasted compute. A branch's positions are now searched only while the player looks at them, and its edges
  have no labels unless asked.
- **"Evaluate move quality" in the move menu** (the owner's idea): it searches the two positions of that one edge to
  the label budget (priority 7, after the position on screen), and the edge is then judged as the game's edges are.
  The move list shows "…" until then. The edges evaluated are kept with the branches. Checked in Edge: on
  "31... E7-G8x" and on a fresh "31... E11-G8", a right-click and the item give Blunder ("??") at once, since both
  positions were already searched (the first from the cache, the second because the player had just been there), and
  no other branch move gets a label.
- **Checked in Edge,** with real clicks and keys, at edge 61 of the sample game: Blue's 20 nodes take the pointer. G8,
  then E7, plays "31... E7-G8x" (with its cut) as a branch (with labels on, it was a Blunder within six seconds. Now it
  has none, and the board shows only the game's badge of that turn). Space plays Red's number 1. ← ← returns to the
  fork. ↓ picks "line 2 of 2" and shows its edge. → follows it. Shift + ← returns to the fork. A double-click on
  candidate 1 (A10-A13, the game's edge) goes along the game. A second branch (D11-G8) promoted comes first, and its
  menu then greys out Promote. Delete from here removes it and moves to the fork. After a reload the branches come back
  in their order.

### The picked line at a fork, single keys, and the list of keys (2026-10-11)

- **The picked line was hard to see**. At a fork, ↑ and ↓ said "→ line 2 of 3" at the status line's end. The panel
  cut that end. Now the picked move has a dashed accent outline in the move list, on the game's move or a branch's dot.
  The move list brings it into view. The status line no longer says it.
- **Single keys beside the Shift keys,** from the owner's question and other tools: Lichess (k and j, Shift + k and j),
  KaTrain (`gui/theme.py`: z and x beside the arrows, b back to the last branch point, n the next mistake), En Croissant
  (`src/state/keybinds.ts`: x and c the previous and the next branch), Sabaki (`src/menu.js`: Ctrl + ↑ and ↓ the
  forks). Every choice offered went in, since none clash: k and j for back and forward. b and n, [ and ], and Shift +
  k and j for the forks. x and c, and comma and period, for the line before and after. KaTrain's z and x stay out,
  because x is the line before here. Kept free: m and Shift + m (the next and the previous mistake), and Delete.
- **A list of keys and clicks,** as Lichess's "?": "?" opens it, and so does "Keys and clicks" in the display settings
  (its Keyboard group). A Bits UI dialog: Escape and a click outside close it.
- **Checked in Edge** with real keys at edge 61 of the sample game: ↓ marks "31... E7-G8x" with the dashed outline. ↓
  again and → enter "31... E11-G8". x goes to the line before (E7-G8x). b back to the fork. n on to the game's end (no
  fork after). "?" opens the list, Escape closes it, and the settings' "Show" opens it.

### Move sounds, and progress bars that show the work runs (2026-10-11)

- **Progress bars:** Lichess shows a running task with `bar-glider` (`ui/lib/css/component/_bar-glider.scss`), a
  70-pixel light gleam that sweeps the bar every 3 seconds, hidden with reduced motion. The review's bar has it while
  its passes run, and the position's search bar while the position on screen is searched (the analysis's `focusing`).
  Design 06. Checked in Edge: at edge 112 the search bar has the gleam at "256 of 1,024 visits", and loses it at
  "1,024 visits".
- **Move sounds** (design 08), first decided with the owner: made in the browser (Web Audio), a tap for an edge, a snap
  for a cut, a chime for a closed region. Played on a step forward, a move played, and a move clicked in the move list,
  and silent on other jumps. On by default with a switch and a volume slider. Lichess's sounds are not free (its
  `COPYING.md`: the standard set is a non-free exception), and a CC0 pack was the other choice.
- **Checked in Edge,** with the page's AudioContext watched: 60 steps forward from the start each play one sound. The
  18 cuts play the snap. 16 steps chime, each where the mover's area grows (one shows no change in the tag, which
  rounds a half-point gain). Back, Home and End play none.
- **The owner did not like the first sound, and had no words for why.** So the sounds became voices with a tuning, and
  a sound lab (`/lab/sounds`) plays seven voices (wooden tap, stone on a board, soft felt, pencil stroke, marimba, glass
  tick, soft click), each as an edge, a cut, a closed region and a few moves in a row, with sliders for pitch, length,
  brightness and softness, and "Use these sounds" for the review. Checked in Edge: choosing a voice plays it, "A few
  moves" plays four moves, and "Use these sounds" keeps the voice and the tuning for the review.
- **Recorded pencil lines.** The owner liked the idea of a pencil stroke and asked for recorded sounds, at first a line
  for an edge, an eraser for a cut and colouring for a closed region. Played with the edge's sound, the last two
  sounded odd, so every edge has one sound: a pencil line. Sources searched: BigSoundBank (all CC0, no account),
  Freesound filtered to CC0 (downloads need an account, so the public previews were taken), and OpenGameArt (a CC0
  pack whose "eraser" is a finger rubbing a window). Ten clips of 0.26 to 0.52 seconds were cut with ffmpeg from three
  Freesound recordings and two BigSoundBank ones (design 08 lists them), with short fades and matched peaks. Each move
  plays one from the player's set, never the last one, at a speed varied by up to 3%. The sound lab now lists the ten
  clips to tick, and the synthesised voices are gone. Checked in Edge: the lab loads the ten clips (about 4 to 5 KB
  each), plays each, and a few moves in a row play clips at 0.97 to 1.03 of their speed.
- **More strokes, in sets.** The owner asked for more recordings of pencil, marker or crayon strokes, ideally many
  strokes in one file, for variation with a like sound. Fourteen CC0 recordings were taken (Freesound previews and
  BigSoundBank), and a script cut each into a set of up to 12 strokes (found by their silences, at most 0.55 s, one
  gain for the set). Four gave fewer than five strokes and were left out (a continuous pencil, a short crayon, a
  permanent marker, a felt-tip pen). Eleven sets remain with the first ten clips as a twelfth: 124 strokes, about 495
  KB. The sound lab shows them by pencil, marker and crayon, plays a set as a few moves or stroke by stroke, chooses a
  set whole or single strokes. Checked in Edge: 12 sets and 124 strokes listed, every file loads, and choosing the
  crayon set plays six of its strokes (0.17 to 0.29 s).
- **The owner's choice: five crayon strokes,** numbers 1, 2, 4, 6 and 9 of the crayon set ("Crayon Drawing on Paper" by
  wstarling, Freesound 871478, at 4.32, 14.87, 36.6, 83.19 and 97.52 s), at volume 0.4. They became the sound and the
  default volume. The other sets were removed before any commit, and with them the sound lab and the choice of strokes
  in the settings: there was nothing more to choose. Design 08 keeps the method and the other sources. Checked in Edge:
  eight steps play eight of the five strokes (0.17 to 0.29 s), from `/sounds/crayon/`.
- **A move clicked in Biggest mistakes plays its sound,** as a move clicked in the move list does (the owner noticed
  it was silent).
- **No sound without a change on the board:** a click on the move already on screen (in the move list, in Biggest
  mistakes) is silent (the owner's rule: the sound plays only when the board changes).

### The side columns, measured again when the layout moves (2026-10-11)

- **The quirk:** the owner sometimes saw the side columns end at the board, then later reach the chart, and could not
  repeat it. Whether the chart fits in the window was measured only at load and when the window, the column count or
  the win chance's form changed. Anything else that moves the chart (the row above the board, measured just after the
  first paint, or the page's height) left the columns as they were until the next window change. A likely cause of
  what the owner saw: the bar that Edge shows while the browser extension drives it (about 40 pixels at the window's
  top), which made the chart not fit at their window, and whose removal resized the window.
- **Fix:** a ResizeObserver on the board's column and the page measures again on any change of their size.
  Checked in Edge, in a 900 × 900 frame: the columns reach the chart (its bottom at 730). The header 200 pixels higher,
  with no change of the window, moves the chart to 921 and the columns stop at the board. The header back, they reach
  the chart again.

### The engine's settings (2026-10-11)

- **Asked for:** engine options, such as the search time or the visits. The owner chose, from a list of four: the
  search depth, the workers, the network, and the engine on or off. The depth in visits with a time cap (KaTrain's
  way), not by time alone (Lichess's) or visits alone. And a standard or thorough review, though the label bands were
  set at 256 visits.
- **The owner asked whether a static site can run many workers.** It can: a Web Worker is a browser feature, and a
  static host serves the worker's script and the module as files. The pool already ran 4. What a static host often
  cannot give is threads inside one search (`SharedArrayBuffer` needs special headers, design 02).
- **Built** as design 09: an Engine group at the end of the settings panel (now "Settings"). The analysis takes up
  its work after a change (the passes skip what is done), the pool grows and shrinks in place, and another network
  loads in a new pool while the old one answers the rules.
- **A departure, named in design 09:** a 30-second default time limit, where KaTrain and Lichess use 8 seconds. In
  the browser 1,024 visits of b10c128 take 11 to 21 seconds on a fast desktop.
- **Limits from measurement,** in Edge on the production build:
  - 16,384 visits of b10c128 in one worker (engine lab, the position after edge 40): 207 seconds, 79 visits a second.
    The worker's memory then 162 MiB, against 95 MiB after loading: about 4 KB a visit. So the depth stops at 16,384,
    and no step is "no limit".
  - A 5-second limit with 16,384 visits: a position already at 256 visits stayed at 256, since a new search starts
    from zero. So the limits start at 10 seconds.
  - b15c192 at 1,024 visits and 30 seconds: 704 visits, then "time limit".
- **Checked in Edge:** the settings kept in the browser. Engine off (header "engine off", the review's bar still and
  "The engine is off: the review waits."), then on (the work goes on). Thorough (the label pass at 1,024, 33
  positions at once from the store). 4 workers to 8 (4 more worker scripts loaded) and back. b10c128 to b15c192 (the
  sweep starts again) and back (the review complete from the store in about 5 seconds).
- **Changed after a check:** a thorough review first judged an edge only at 1,024 visits, so the labels vanished
  until its pass reached them. Now an edge is judged from 256 visits in both reviews.

### The engine's switch and gear in its header (2026-10-11)

- **Asked for:** the engine's settings as a button of their own, at the top right as on Lichess, and the engine's
  switch outside any panel. Clearer and shorter help. The review's depths named Lite (256) and Standard (1,024),
  with a Custom depth on a slider. The networks named by their parameters, not b10 and b15.
- **Built** (design 09): the switch at the engine header's left (and the l key, Lichess's), the gear at its right.
  The engine settings open under the header, in three groups: Position on screen, Game review, Engine. The display
  settings moved to a ☰ button in the step controls' bar (Lichess's button there), so the page has one gear. The
  networks show 3.2M and 10.3M parameters (the trainer's counts, in the engine repository). Custom runs from 256 to
  4,096 visits in half doublings: under 256 an edge gets no label. The stored settings moved to a new key, since the
  name "standard" changed meaning.
- **The default depth stays Lite** (256), the measured label budget, until the owner chooses (design 05).
- **The owner asked** what happens with more workers than the machine can run: they share the cores and each runs
  slower, with no error, and each still holds its memory (design 09, "Consequences"). And whether the GPU could search:
  through WebGPU in principle, as an engine change. Its gain at one evaluation at a time is uncertain until measured.
- **Checked in Edge:** the gear opens and closes the panel. Custom shows its slider and the review runs to it. The l
  key turns the engine off ("Engine off. The review is paused.", the bar still) and on. Lite completes from the store.
  ☰ opens the display settings and closes the engine's.

### The engine header in two lines, boxes for visits, a slower gleam (2026-10-11)

- **Asked for:** the header as a line of the switch, the search's progress and the gear, with the values under it
  across the column. Custom review steps that look less odd: doublings, with a number box, at most 4,096 visits. A
  number box for the Depth too. A slower gleam on the progress bars: it flashed across too fast.
- **Built** (design 09, design 06): the first line has the switch, the search's bar, its visits and the gear. The
  visits stay by the bar: with the values, they wrapped to a third line in a column of 330 pixels. The Depth (256 to
  16,384) and the Custom depth (256 to 4,096) have a slider in doublings and a box for any whole number. The gleam
  crosses the bar in 2 seconds at any width and waits 1 second, against Lichess's third of a second on a bar of 400
  pixels.
- **The review's default depth is Lite** (256 visits), the first budget whose mistake flags are mostly right. A new
  visitor gets labels in about a quarter of Standard's time, and can choose Standard in the engine settings.
- **The custom steps in half doublings** were a choice of this site, not from a published tool, and were not named as
  one. A setting's steps now come from a source or say that they do not.
- **Checked in Edge:** 1,500 typed in the Custom box gives 1,500 visits and puts the slider at 2,048. 9,999 becomes
  4,096. The slider's left arrow gives 2,048. 3,000 typed in the Depth box shows "1,024 of 3,000 visits" in the header.
  The gleam on a bar of 118 pixels moved about 94 pixels in half a second. At 1,000 and 495 pixels wide, the header
  fits its column and the page has no sideways scroll.

### The owner's feedback on the lines, the keys and the engine settings, and "Done" at the bottom (2026-10-11)

- **Tried and kept:** the player's own moves on the board, Space and the double-click that play a candidate, the
  branch move menu (design 07), the two-line engine header, the number boxes, the slower gleam, and the 30-second
  time limit (design 09).
- **"Done" in the engine settings moved to the panel's bottom:** at the top it sat next to the gear. Each settings
  panel now has its "Done" at the end away from the button that opened it: the engine's at the bottom (the gear is at
  the top), the display's at the top (☰ is at the bottom). It stays in view when the settings scroll. Checked in
  Edge: "Done" at the panel's bottom right closes it.
- **The GPU:** request 06 asks the engine repository to measure the network on WebGPU and, if it gains, to give the
  site a module that uses it ([requests/06-webgpu.md](../requests/06-webgpu.md)).
- **Learning from mistakes is postponed** (decisions/open-items.md).

### Pills for the edges in the move list (2026-10-11)

- **Asked for:** a third form for the branches and the engine's line, beside the dots and the notation: a pill along
  each edge's rough direction.
- **Chosen:** the edge's exact slope (24 slopes. At this size close slopes look alike, but a pill is never wrong, and
  there is no rounding rule to explain), the same length for every pill (the shortest edges would shrink to dots), and
  in the engine's line the board's number upright on each pill.
- **Built** (design 07): the setting "Branches and lines" has three buttons, Dots (the default), Pills and Notation.
  The stored `branchText` becomes `branchForm`, and a stored notation choice carries over. A pill is an SVG rounded
  rectangle with its radius half its thickness, turned to the edge's angle on the screen (rows count from the bottom).
- **Checked in Edge:** the pills of a line's first six edges turn to the edges' slopes on the board (P10-S8 at 33.7°,
  down to the right, as on the board, K12-L9 at 71.6°, G8-J6 at 45°), each within its square of 26 pixels. The
  numbers 1 to 14 read on their pills. A line's edges already in a branch show as outlined pills with the number in
  the mover's colour (checked with a test branch, removed after). The branch rows read as short strokes after their
  turn numbers, and the move on screen has its round accent outline.

### Lite at 512 visits, closer dots and pills, "Done" after the last setting (2026-10-11)

- **The review's Lite depth searches 512 visits** (it was 256), after the label budget was measured again under
  protocol 0.3 (decisions/engine.md, "Label agreement against search budget, under protocol 0.3"). Standard stays at
  1,024, now twice Lite's time. An edge still gets its label from 256 visits on. A label search shows its result only
  when it ends, so a position's first label now comes later. A deeper reference (4,096 visits) waits in the backlog.
- **"Done" in the engine settings** sits right after the last setting, a little below it, and scrolls with the
  settings. At the panel's bottom it was too far from them.
- **Dots and pills stand closer:** an eighth of a rem between them (it was a quarter), and a smaller margin inside the
  dots' and pills' buttons. A pill's box is now only as wide as the pill turned: a steep pill had empty width on both
  sides.
- **The move sounds:** the crayon strokes are to be replaced, perhaps with fountain pen strokes
  (decisions/open-items.md).

### Pills by default, and labels from 256 visits during a deeper search (2026-10-11)

- **Pills are the default form** of the branches and lines, and the first of the three buttons (Pills, Dots,
  Notation). A Go move is a point, so Go tools show stones. An Enclosure move is a line between two points, so a pill
  along it is the nearer form, and it shows the edge's direction, which the turn numbers do not (design 07). A stored
  choice of Dots or Notation is kept.
- **A label search shows its result at 256 visits** and then after each further 256, up to its budget: it runs in
  slices of 256, which do not give way to the position on screen (a stopped search starts again from nothing). So the
  first labels of a Lite review (512 visits) come as soon as they did at 256 visits, and change when the search ends.
  The branch edges evaluated on request do the same. A search in slices gives the same result as one search, so the
  slices cost only one more reply each.
- **Checked:** in Node, a search of 1,536 visits in slices of 256 replies at 256, 512 and on to 1,536 visits. In
  Edge, with a review depth never searched before (768 visits), edges got labels while no position but the one on
  screen ended its search: 3 labelled edges with 1 position done, 6 with 3. The branch moves evaluated on request
  ran first (their priority is higher), so the label pass started about 28 seconds after the page loaded.

### The GPU module: no need for reproducible searches, and a default chosen on each machine (2026-10-11)

- **Asked:** whether KaTrain batches inside one search (it does not repeat its results then), and whether the site
  needs reproducible searches.
- **Found:** KaTrain's KataGo config searches each position with 8 threads and 12 positions at once
  (`numSearchThreads = 8`, `numAnalysisThreads = 12`, `nnMaxBatchSize = 96`), and KataGo's `analysis_example.cfg` uses
  16 threads a position. A search on more than one thread varies from run to run. Lichess's Stockfish on more than
  one thread does too.
- **Decided: the site does not need reproducible searches.** The published tools do without them. What the site
  gives up: every machine showing the same labels at one depth, and a noise floor of zero by construction (the noise
  floor then needs measuring, as the backlog already says). A GPU module would not repeat the CPU module's results in
  any case: its arithmetic differs in the last digits, which can turn a search.
- **The answer in request 06:** batch across searches first (the label pass, KataGo's advice for many positions), and
  inside one search later, if the position on screen should be faster (KataGo's advice for one fast answer).
- **Decided: the GPU's default is chosen on each machine** by a short test of both modules the first time, shown in
  the setting's help line. The published tools choose by a fixed order or by the browser's features, so this goes
  past them (design 09). The integrated GPU's numbers then tell only whether a GPU module is worth building for most
  visitors' machines.

### Label checks under protocol 0.3 (2026-10-11)

- **Great in the sample game** (Lite, 512 visits, b10c128, read from the browser's store): 28 Greats against 44 Bests
  where the first choice was played. By part of the game: 10 in edges 1 to 40, 16 in 41 to 80, 2 in 81 to 119, so the
  late-game excess seen before protocol 0.3 is gone. But 25 of the 28 have a second choice with under 15% of the first
  choice's visits (1 to 30 visits against 400 to 500), so the 10% gap often rests on a thin value. The choices are in
  decisions/open-items.md.
- **The two reviewed games** of design 01's check (the engine repository's `v1/docs/decisions/analysis.md`, from
  net1 at 20,000 simulations), imported here from the engine repository's `runs/review_games.json` and reviewed at
  Lite on b10c128. They are games of the engine repository's bot against another player, kept in this browser only:
  - `oyyjxn` (the bot Blue, lost): Blue's win chance 63% after edge 24, 26% at 28, 6% at 32, then below 15%. The
    turn is in edges 25 to 40, as the check asks, with Blue's Blunders at edges 28 and 32. Edge 65 (Blue's) is a
    Blunder, 61 too, and 93 an Inaccuracy: the check's "moves 64 to 65 flagged" holds. 69 is not flagged.
  - `3wes2o` (the bot Red, lost): Red's edges 22 and 23 are Blunders (−361 and −312 points), and Blue's win chance
    is 91% after edge 22 and 99% after 24. So the turn comes before edges 25 to 40, and edges 39 and 58, which net1's
    review flagged, are not flagged here. Net1's review said its own value was saturated there and its policy narrow,
    so the check's reference is the weaker judgment. A deeper reference would settle it (decisions/open-items.md,
    "The label budget against a deeper reference").
  - Both games flag many edges: 31 and 44 of 120 are Inaccuracy or worse. In `3wes2o` Blue's win chance is 99% or
    more from edge 24, and 20 edges after edge 80 are still Inaccuracy or Mistake, all from points lost. The point
    bands are placeholders (KaTrain's Go bands times 12): fitting them on real games comes before the first deploy.
- **The pills' ends:** an SVG clips what passes its box, and each pill's ends touch its box. A clip at a fraction of
  a pixel flattened a round end, on some pills only. The pills' SVG is no longer clipped.

### Great confirmed by an equal search (2026-10-11)

- **Asked:** whether root noise already gives the second choice enough visits. It does not: the sample game's numbers
  above are under root noise. Root noise (`wideRootNoise`, 0.04) spreads some visits to moves the network's policy
  rates low, but a search still sends most visits to the move it finds best, and a move that looks 10% worse gets few.
- **Built** (design 05): where the played edge was the first choice and the second looks at least 0.10 worse, the
  position after the second choice is searched to the label budget, and the edge is Great when that value is 0.10
  below the value after the played edge, each from its own search. Best until then. For the game's edges, but the
  last, and for the branch edges evaluated on request. The confirmations queue after the label pass, at its priority,
  and run again when a deeper search changes a position's second choice. Their results stay in the browser's store
  under the position's moves.

- **Checked in Edge** on the sample game, with its 512-visit searches in the browser's store and no confirmations
  yet: the page started at 0 Greats and 72 Bests, and Greats came as the confirmations ended, 23 after 80 seconds.
  From the store: of the 28 gaps in one search, the equal searches confirmed 24 and refuted 4 (edges 22, 26, 45 and
  62: 0.07 to 0.09 in equal searches). The thin second choices were mostly right: the equal search found the gap as
  large or larger in 20 of 28. So this game of strong bots has many edges that are the only good one. The page shows
  23, not 24: a few positions hold a deeper search (1,024 visits) now, whose second choice asks for its own
  confirmation.

### The review's default pool: half the cores, up to 8 (2026-10-11)

- **Decided:** the default number of workers is half the machine's logical cores, from 1 to 8 (it was 1 to 4). On
  the owner's laptop (an Apple Silicon Mac, 12 cores) each worker kept 86% of one worker's speed up to 8 workers, so
  the cap of 4 left about a third of the speed unused (decisions/engine.md, "Speed on a laptop"). That laptop now gets
  6 workers. Half the cores leaves room for the page and the visitor's other work. A visitor's stored choice stays: the
  page stores the settings when it loads, so a browser that opened the review before keeps its 4 until changed.

### The archive's games analysed offline for the labels (2026-10-11)

- **Decided:** the engine repository may analyse the meaf.us archive (other players' games) for the label thresholds,
  the win chance by rating and a deeper reference
  ([requests/07-archive-analysis.md](../requests/07-archive-analysis.md)).
- **The limits:** the data carries ratings, not player names. It stays in the engine repository's `runs/`, out of
  Git. This repository commits only statistics over many games and the thresholds fitted from them, never a game. Any
  public use of the games themselves still needs its own decision.

### Biggest mistakes as numbers, the chart's first estimates, and a branch's preview (2026-10-11)

- **Biggest mistakes** give the points lost as a number alone (−136, as the move list gives its numbers), with the
  whole loss in the number's note ("Lost 136 points and 26.6% of win chance").
- **The Advantage chart while the review runs** (design 06): the line is dashed and faint where a position has only
  its sweep (32 visits), and solid where it has the review's depth. The legend says "First estimate, refined as the
  review runs" while any part is dashed. Checked in Edge: with a depth never searched (2,048), all 120 steps were
  dashed and the legend's note showed. With a depth searched for a few positions (768), 6 steps were solid and 114
  dashed. Back on Lite, all 120 were solid, with no note.
- **A branch's preview** (design 07, item 13): pointing at a branch move shows its row on the board from the row's
  start, up to that move, drawn as the engine's line, animated or static by the same setting. Chosen over a small
  board beside the move (Lichess's board on its engine lines): the main board is larger, and it draws as the engine's
  line does. Checked in Edge with the real pointer on the sixth move of a row from the position after edge 11: the
  board went to that position and drew edges 1 to 6, one every half second, with the sixth edge's cut, the status
  line said "Branch preview: 6 edges from the position after edge 11", and the board came back when the pointer left.
- **Request 07** is accepted for a sample of 1,000 games: the whole archive would take 12 to 16 hours of the GPU.

### A played move's preview (2026-10-11)

- **Asked for:** the position after a played move on the board while the pointer is on the move in the move list.
  And whether analysis tools do this.
- **Found:** Lichess's move list has no preview. It draws a small board only for a move of an engine line, under the
  pointer (`ui/lib/src/ceval/view/main.ts`, `renderPvBoard`, read in lila's source). The help pages of chess.com and
  Sabaki name no move-list preview. Browser extensions add hover previews to those sites, and one Go client (SWHub)
  has them. So this is the site's own.
- **Built** (design 07, item 14): the board shows the position after the move, with the move as the last edge, and
  nothing of the position on screen, and the status line says "Preview". It ends when the pointer leaves the move
  list. Checked in Edge with the real pointer on 19... J6-M8: the board showed the position after edge 37 with that
  edge marked, and came back when the pointer left the list.

### The previews end at the move, and each is a display setting (2026-10-11)

- **Found by the owner:** a preview stayed while the pointer was near the move. It ended only when the pointer left
  the whole move list (a played move's) or the row (a branch's).
- **Now:** a preview ends 120 ms after the pointer leaves the move, unless the pointer comes onto another move first,
  so that crossing the gap between two moves does not send the board back. Checked in Edge with the real pointer, the
  events logged: the move's `mouseleave`, then the position on screen back 144 ms later, for a played move and for a
  branch's move.
- **Display settings** (Move list): "Preview played moves" and "Preview branches", both on by default. Checked: with
  the first off, pointing at a move left the board as it was.

### "Lines on the board" (2026-10-11)

- **Renamed:** the display setting "The engine's line" (Animated or Static) is "Lines on the board", since it draws a
  branch's preview too. Its line: "The engine's line and a branch's preview: one edge at a time, or all at once." One
  setting for both: they draw a numbered line on the board the same way.

### Labels by turn (2026-10-11)

- **Asked by a player of the community:** judge a turn as a whole, not each edge. What does a turn say when its first
  edge is a Blunder and its second Good, its first Excellent and its second a Blunder, or its first an Inaccuracy and
  its second a Blunder?
- **Decided:** the label belongs to the turn, and the edges explain it (design 05). The labels' counts, the accuracy,
  Biggest mistakes and the key moments go by turn. Not built yet.
- **Why:**
  - A turn is the player's decision. The opponent does not move between its two edges, the score is paid at the
    turn's end, and both edges are protected together. Lichess and KaTrain give one label to each decision. In their
    games a move is a turn.
  - Connect6 has the same turns (one stone, then two a turn), and Arimaa's move is up to four steps. Both record a
    turn as one move. No review tool for either was checked, so this is the site's own choice, not a published method.
  - The engine's values serve as they are. A turn's loss is the sum of its edges' losses, and the value between them
    cancels.
  - Edge labels read badly in the cases asked about. A first edge's loss assumes the best second edge. So an Excellent
    first edge before a Blunder praises a plan that the player did not play: the first edge was good only with a
    second edge that the player did not find.
- **Measured** (decisions/engine.md, "Label agreement by turn"): on the same 4 bot games, at 256 visits the turn
  labels find more of a deeper search's mistakes than the edge labels do (54% against 42%), with more of their flags
  right (88% against 79%). At 512 visits the two are about equal.
- **Found:** the model already computed a turn's loss and label (`src/lib/review/model.ts`), which the page did not
  show. Its points added each edge's loss after the clamp at 0, so the middle search's error came back in. A turn's
  points come from its two ends (design 05).
- **Request 07 changed** before its run ([requests/07-archive-analysis.md](../requests/07-archive-analysis.md)): the
  first three candidates' lines at a turn's start, and the Great follow-up by turn.


### The candidates as turns: tried, and taken back (2026-10-11)

- **Tried:** at the first edge of a turn of two, each candidate with the next edge of its line, the same two edges in
  the other order once, the visits in each row's note, and two lines a row only when the column had no room. Checked
  in Edge on the sample game: one line a row at a 16-pixel root font, the second edges in a column of their own, and
  two lines a row from 17 pixels. Digits in the page's font differ in width (1 is 5.6 pixels and 4 is 8.1 at 14
  pixels), so the widest pair was measured on `M14-M16 M14-M16`.
- **Taken back:** one search gives one turn for each first edge, the best turn that starts with it, so the rows rank
  first edges, not turns. With A then B the best turn, A then C the second and B then D the third, the table showed
  A B and then B D, which reads as the second-best turn, and A C not at all. A first edge's values are already those
  of its best turn, and the listed line shows the second edge of the candidate pointed at. The table lists edges
  again, as before (design 07, "Alternatives").

### Judged by turn or by edge, and numbers from one side (2026-10-11)

- **Found:** marks on the edges that lost points under a turn's label judge each edge alone. They are labels by edge
  under another name. Labels by turn exist to drop that judgment, but each edge's own quality is still worth seeing.
- **Decided:** a display setting for the whole page, "Judge by": Turn (the default) or Edge (design 05). It sets the
  unit of the labels, the move list's numbers, the counts and the accuracy, Biggest mistakes and the key moments. A
  turn's note gives its edges' own labels and losses, so that one turn can be read by edge. A switch for each turn
  was not taken: it mixes units in one list and in the counts. Not built yet.
- **Found:** the move list gave the lead after each move from Blue's side (Lichess's evaluation after each move),
  and Biggest mistakes the mover's loss. A Red blunder read "+38". The engine header gave Blue's side, and the
  candidates table the mover's.
- **Built** (design 06, "A number reads from one side"): the move list gives each move's loss from the mover's side,
  as Biggest mistakes does ("−143"), and the lead after it is in the move's note ("After it: Blue +38"). The engine
  header gives the expected final margin and the lead from the side to move, as the candidates table does, and the
  final margin from the winner's side. A loss of one point reads "1 point".
- **Checked in Edge** on the sample game: Red's blunder Q10-R8 reads "−143", its note "Blunder: lost 143 points and
  25.0% of win chance · After it: Blue +38". At Red's first turn the header reads "Expected final margin +116 ± 325
  for Red · lead +105" (before: −116 for Blue). At the start, "+23 ± 309 for Blue".

### Biggest mistakes removed, and a turn's badge on both its edges (2026-10-11)

- **Removed:** the Highlights' Biggest mistakes. Each line gave an edge and its points lost, which follows neither
  judging by turn nor the "Judge by" setting. "Learn from your mistakes" can come later without it
  (decisions/open-items.md, "Learning from mistakes"). The key moments stay: the Advantage chart marks them, and the
  review searches them deeper. The Highlights' sentence on the largest mistake still names an edge: it is to follow
  the "Judge by" setting when that is built. Checked in Edge: the summary ends with the counts.
- **Decided** (design 05): by turn, the board shows the turn's badge on both its edges, marks both as the turn just
  played, and lights both badges and edges with the turn's note when the pointer is on either. One badge on the
  turn's last edge would read as that edge's label. Not built yet.

### The side columns grow with the window, the side ahead named, and the Highlights' sentence dropped (2026-10-11)

- **The side columns' height** (design 06, "Height"): they end where the window ends, less the page's margin, from
  the board's bottom edge down to the Advantage chart's at most. Before, they reached the chart only when the whole
  chart was in the window, and else ended with the board, so a window a little too short for the chart left the
  space under the board empty. Checked in Edge at three window heights (inner heights 586, 890 and 976 pixels):
  - 586: the board fills the height, and the columns end with it (570), the step controls in view (557).
  - 890: the board ends at 815 and the chart at 947, below the fold, and the columns end at 874, the window's
    bottom less 16 pixels. Before, they ended at 815.
  - 976: the whole chart is in the window, and the columns end with it (878).
  - The two-column layout (800 to 1,260 pixels) was not checked: the window did not take the narrower width.
- **Who is ahead, with the side named** (design 06, "Two kinds of number, one form each"): the engine header
  ("Expected final margin Red +116 ± 325 · lead Red +105", at the end "Final margin Red +60.5"), the candidates
  table's Lead column ("Blue +22") and number 1's note on the board ("Red wins 67.8% · lead Red +109"). The
  candidates table keeps the win chance and the lead. Its Lead column grew from 48 to 76 pixels for "Blue +999"
  (65 pixels in bold at 14 pixels, as wide as "Blue +1.2k"), and the edge column at its least went from 98 to 70,
  still enough for the longest names (57 to 62). Checked in Edge on all 120 positions of the sample game at the
  analysis column's least width: no cell cut. The sample game's leads stay under 1,000, so "Blue +1.2k" was measured
  as text only.
- **Dropped:** the Highlights' sentence on the largest mistake, which named an edge and its points lost.

### One form for a loss in every note (2026-10-11)

- **Found:** two forms for the same loss. The board's notes for the other candidates read "vs 1: −4.0% · −26 pts",
  and a move's note in the move list "Blunder: lost 143 points and 25.0% of win chance".
- **Decided and built** (design 06, "What a move cost"): the win chance first, then the points, each with its sign, and
  no "vs 1", since the minus sign already says it is a loss against the best. The win chance comes first because it
  matters more, and so a turn's note can give its edges' points right after its own (design 05). A move's note:
  "Blunder: −25.0% · −143 pts · After it: Blue +38". A candidate's note: "−4.0% · −26 pts". A value that rounds to 0
  has no sign, and one point reads "1 pt". The move list's number stays the points. The sentence helper that the
  Highlights' sentence used is removed with it.
- **Checked in Edge** on the sample game: the notes of Q10-R8 ("Blunder: −25.0% · −143 pts · After it: Blue +38"),
  A10-D11 ("Excellent: −1.0% · −1 pt · After it: Red +52") and N11-Q10 ("Best: 0.0% · 0 pts · After it: Red +64"),
  and candidate 2's note at Red's first turn, with the real pointer on its edge ("−4.0% · −26 pts").

### The board's notes fit their text (2026-10-11)

- **Found:** a candidate's note box took 0.25 of a board unit for each character, an estimate made for the old,
  shorter notes. "−4.0% · −26 pts" got a box of 4.15 units around 2.92 of text.
- **Built:** the box is the text's width, measured in the note's own font at 100 times its size, plus 0.2 a side. The
  board draws the text smaller, where it comes out up to 2% wider, so the text is centred in its box. Checked in Edge
  with the real pointer on each candidate at Red's first turn: "−4.0% · −26 pts" in 3.32 units (0.2 a side), and
  "Red wins 67.8% · lead Red +109" in 6.28 units (0.15 a side).

### Request 07 asks for Great by edge and by turn (2026-10-11)

- **Decided:** with labels by turn and by edge on one page, request 07 asks for both Great follow-ups: the one by edge,
  which the engine repository's driver already has, and the one by turn beside it. The label bands need nothing more:
  a turn's loss and an edge's loss come from the same values at every position. Great is not fitted (its 0.10 gap is
  En Croissant's rule): the follow-ups make the archive's labels the site's in either mode. They cost a search only
  where a gap shows, and at a turn's second edge the two are one search.

### Turn mode built (2026-10-11)

- **Built** (design 05, "The label belongs to the turn"):
  - The model gives each turn its loss from its two ends, in win chance and in points, its label, Best when it is the
    engine's best turn in either order, and Great when the searches from its start and its middle confirm it. The
    counts, the accuracy, the mean points lost and the key moments come by turn and by edge.
  - The analysis searches one more position for a turn whose first choice is one of its edges: the position after its
    other candidate, the first that is not an edge of the turn. The key moments are searched deeper from their start to
    their end, by turn and by edge.
  - "Judge by" in the display settings, under Labels: Turn (the default) or Edge.
  - By turn, the move list gives each turn's glyph and points lost in a last column, with the turn's note, and the
    note under a turn names the engine's best turn. The board gives the turn's badge on both its edges once the turn has
    ended, marks both edges as the turn just played, and lights both edges and badges with the turn's note under the
    pointer. By edge, every badge has its own note.
- **Tests** (`model.test.ts`, 25 checks): a turn's loss and points from its ends, not its edges' losses added. Best in
  the other order. Great confirmed from both ends, and Best without either confirmation. The summaries by unit.
- **Checked in Edge** on the sample game:
  - By turn: 61 turns counted. Turn 2 reads "?? −198", its note "Blunder: −33.4% · −198 pts (Q10-R8 −143 pts,
    O11-Q10 −55 pts)", and its comment "Blunder. N9-Q10 M6-N9 was best." Great by turn grew from 2 and 3 to 4 and 4 as
    the new confirmations ended (by edge: 10 and 12). The chart marks the 8 key moments by turn.
  - The board at the end of turn 2: two badges with the turn's note, both edges marked. In its middle: no badge, the
    last edge marked. The real pointer on a badge lit both edges and both badges and showed the note.
  - By edge: the move list, the counts and the badges as before, each badge with its own note.
  - Not checked: the chart's notes by turn, and a branch in Turn mode.

### Turn mode, first feedback (2026-10-11)

- **A turn's note** gives each edge's points without the edges' names: "Blunder: −33.4% · −198 pts (−143 pts, −55
  pts)", the edges in the turn's order. Shorter, and the move list beside it names the edges.
- **The Advantage chart by turn** draws and snaps to the turns' ends only, 62 points in the sample game (the start and
  61 turns), and its note names the whole turn with its label. By edge it draws every position, as before.
- **The black border on a clicked move** was the browser's focus ring: the clicked move kept the focus, and once a
  key was pressed Edge drew its ring (`rgb(16, 16, 16)`, 1 pixel) around it. Space then pressed that move instead of
  playing the engine's choice. A click no longer focuses anything in the move list (Lichess's moves take no focus).
  Checked in Edge with a real click and real keys: the focus stays on the page, and no move has the ring.
- **Turn 9 of the sample game:** a Great turn whose first edge alone shows −27 points (decisions/engine.md, "The
  search in a turn's middle").

### Turn mode, second feedback (2026-10-11)

- **A turn's parts add up:** turn 3 read "−144 pts (−144 pts, −1 pt)". Each number was rounded alone, and an edge that
  gained showed 0. Now the note gives each value before the clamp at 0 (a gain has a plus) and rounds the parts
  together, Hamilton's largest remainders, so that they make the turn's points: "−25.2% · −144 pts (−144 pts, 0 pts)".
- **No parts for the engine's own turn** (Best or Great): turn 9 reads "Great: +0.2% · −1 pt".
- **By edge, the engine's best turn in the other order is Best on both edges.** Turn 9's first edge, J11-M13, was Good
  by its −27 points from the search in the middle, though it is the second edge of the engine's line and the turn is
  the engine's. Now it is Best. Its number still shows that search's −27.
- **"Lead: Blue +38"** in a move's note, for "After it:": the word the header and the chart's notes use.
- **The chart's note** gives the label in brackets, as Lichess's chart does: "2. Q10-R8 O11-Q10 [Blunder]".
- **The setting** is "Review by" (Turn or Edge) under "Review": it sets the labels, the move list's numbers, the counts
  and the chart.
- **Lichess's tree beside the branches** (design 07, item 5): a rule from the fork down to its last line, a tick to each
  line, and a shallower fork's rule passing the lines nested in it.
- **The engine's best line as a branch** (design 07, item 15) under each Mistake's and Blunder's note: 11 rows in the
  sample game. The listed line, and so this line, ends by visits only: the board's drawn line ends at 6 edges too.
- **"Evaluate quality"** (design 07, item 11) evaluates the move's turn, every branch move of it, and the label shows by
  turn or by edge.
- **Checked in Edge** on the sample game: the notes of turns 2, 3 and 9 as above. The tree under turns 7 and 8. The
  engine's line under turn 2, before the branch from the same position, and the real pointer on its fourth edge
  previewed four edges from the position after edge 1. "Evaluate quality" on a branch's 7... F8-J11 gave the turn
  Excellent on its second edge, and the board, at that move with the pointer off the list, showed both badges with
  "Excellent: +2.2% · +17 pts" and both edges marked. The chart's note "2. Q10-R8 O11-Q10 [Blunder] | Lead: Blue +93".
  By edge, J11-M13 Best. Not checked: a click on the engine's line (it plays as the listed line's click does).

### Labels in one place, one decimal in the notes, the move menu everywhere, and one side's review (2026-10-11)

- **Labels in one place** (design 10, "How a turn or an edge gets its label"): a label no longer comes from the two
  bands alone. Best and Great look at the engine's choices and at further searches, and turns add their own cases.
  Every rule, with its reason, is now in one document, and design 05 keeps the searches: their schedule and cache.
- **One decimal for points in every note** ("−197.8 pts (−143.3 pts, −54.5 pts)", "Lead: Blue +38.2"): a note is read
  closely. The parts of a turn are rounded together in tenths, so that they still make the turn. The move list, the
  header and the table keep whole points.
- **"Great. The only good edges."** for a Great turn of two edges ("edge" for a turn of one): "the only good turn"
  read oddly.
- **The move menu everywhere in the move list:** a right-click on the game's moves, the engine's lines or a note opened
  the browser's own menu. It opens the move menu now, with each action off where it does not apply.
- **"Review for": Both, Blue or Red** (design 10), under "Review" in the display settings. With one player, the other's
  moves show without labels, numbers, notes or the engine's lines, on the board and on the chart too. The counts keep
  both players. Imported games do not yet record which side the player was, so the default is Both.
- **Checked in Edge** on the sample game: the notes of turns 2, 3 and 9 as above, the Great note, a move's note "Lead:
  Blue +38.2". A right-click on a game move (as an event, the window hidden) opened the move menu, all three actions
  off, and no browser menu. "Review for: Blue": Red's turns without glyphs or numbers, Blue's notes only, 7 engine
  lines (Blue's 4 Mistakes and 3 Blunders), 5 key moments on the chart, both columns of counts.

### The notes and branches in a band at the list's left, on trial (2026-10-12)

- **Tried, for the owner to judge** (Lichess's column view, its "interrupt"): under a turn, its notes and its branches
  in one band across the move list, with a faint background and a rule above and below, starting at the list's left.
  The notes were indented about 40 pixels, and the branches of the first depth about 35. The tree's rules stand at the
  band's left, one step in for each depth. Seen in Edge on the sample game: 23 bands. Turn 1's engine line on one row
  where it took two. The lines from turn 7 with the lines nested in one of them, and their rules.
- **The review's progress bar after a change of the review's depth** (reported missing): not seen again in Edge, in
  the three-column layout with the engine settings open. From Custom 1,024 (done): Lite and Standard showed no bar,
  since every position already met them. Custom 2,048 showed "Reviewing: move quality, 3 of 120 positions" at once.
  Standard, then Custom again, showed "4 of 120". The bar shows only while positions lack the new depth, so it does not
  show where the browser's store already holds the depth. The owner's setting was set back to Custom 1,024.
- **Kept, with no setting:** the owner likes the band. One layout, since the indented one gave nothing that the band
  lacks, and a setting for a style alone is one more thing to read in the panel.
- **The progress bar:** the owner set the review's depth to Custom 256, which every position already met, so the
  review was done and the bar rightly gone. What moved was the engine's best lines in the move list (next entry).

### Why the engine's best lines move in the move list (2026-10-12)

- **Seen by the owner:** after the review ended, the engine's best lines under the bad turns kept changing.
- **The cause:** the bad turns are the key moments. After the label pass, the review searches each key moment deeper,
  to 1,024 visits, in slices of 32 (design 05), and the position on screen too. Each slice replaces the position's
  analysis, and the engine's line reads that analysis as it is: its first choice can change, and its line grows as its
  edges reach 25 visits. So each line can change about 30 times while its position is searched.
- **Asked:** the deeper searches are part of the review, so the progress bar should run while they do, and a line
  that can still change should show it. The updates after each slice stay.
- **Built:** the review's bar covers the key moments searched deeper (a third part, as wide as its share of the
  visits) and then the Great's confirmations ("Reviewing: confirming Great moves, 22 left"), and ends after them. The
  key moments' positions are estimated from the labels found so far, so that the bar does not go back when that part
  starts: before, it went from 96% back to 84%. An engine line gleams, as the progress bars do, while its position's
  search can still change it: a search of it runs, or the label pass or the key moments' deeper search has yet to reach
  it.
- **Checked in Edge,** on an origin with an empty store (the tailnet address), Lite, 8 workers: the shape, then move
  quality (the third part growing from 0.015 to 0.164 of the bar as labels came, the percentage always rising), then
  at 117 of 120 82% and next "the key moments, deeper, 0 of 25 positions" at 84%, with 7 engine lines gleaming and
  stopping one by one as their positions ended, then "confirming Great moves" from 22 down, then no bar. Clearing that
  origin's store for the test also removed a `localforage` database that this site does not make.

### The review's bar: the Great's confirmations, the key moments again, never back (2026-10-12)

- **Asked:** the Great's confirmations fill the bar too, as their own part, not a full bar with a count.
- **Found in the owner's screenshot** (the key moments' part full at "move quality, 33 of 120"): the page searched the
  key moments deeper once for a game, after the first label pass, and kept the flag through a change of the review's
  depth. The bar then showed the old key moments, searched already, while the new label pass ran, and the key moments
  of the new labels were not searched deeper at all. A full part can be right (those positions do have 1,024 visits).
  The missing search was the fault.
- **Built:** the page asks the analysis to search the key moments deeper whenever they change after the label pass (a
  label changed by a deeper search, another review depth), and the analysis skips a position whose search is queued or
  done. The bar counts the key moments and the Great's confirmations (`greatChecks`: the searches the analysis asks
  for, and those with the label budget) from the analysis as it is. Since both grow as labels come, the whole bar's
  share of the work done dipped at times (81%, 77%, 81%, 79% on `localhost` after Custom 256 to Lite), so the bar now
  fills from the left by the work done and never shows less than it showed earlier in that run.
- **Checked in Edge** on `localhost`: after Custom 256 to Lite, the four parts (the confirmations' part 92% full
  during the label pass). After Lite to Standard, 34%, 35%, 36%, 39%, never down. The owner's settings there were set
  back to Lite.

### The Advantage chart moved to the summary, and the review's bar by step (2026-10-12)

- **Seen by the owner:** the bar's fill passed into the third part while its line still said "move quality, 115 of
  120": it filled from the left by the whole work done, and the Great's confirmations and some key moments end
  alongside the label pass. Now the bar shows the step its line names: the parts before are full, the later ones
  empty, and the step's own part fills by its own count and never goes back. Checked in Edge on the tailnet address,
  Lite to Standard: the shape full, move quality from 22% to 28% of its part (26 to 34 of 120), the confirmations' part
  empty during it. That origin was set back to Lite.
- **Seen by the owner:** the Advantage chart was below the fold, often entirely, even in a full-screen window, because
  the board fills the height. Asked: move the chart rather than change the sizing rules, perhaps under the left panel,
  though that panel becomes a tab below 1,260 pixels.
- **Built** (design 06, "The Advantage chart with the summary"): the chart and its legend at the summary column's foot
  with three columns, and in the Highlights tab with fewer, so that the chart is with the summary in every layout.
  Nothing is under the board, and the side columns end at the window's bottom (at the board's bottom at least). The
  chart's note takes at most the room beside the point and wraps. chess.com's review also keeps its graph in a side
  panel.
- **Checked in Edge** at 1,399 × 849 (three columns): the page 849 pixels high, no scroll bar, the board ending at 807,
  the side columns at 833, the chart 226 pixels wide at the summary's foot. Its note at turn 24 wrapped to two lines
  inside the chart. Not checked: the two-column and the one-column layouts (Edge would not take a narrower window).

### The Report, and the area line in the Advantage chart (2026-10-12)

- **Asked:** the chart above the counts, "Report" for the tab that was "Highlights" (the more common name for a game's
  summary), "Score (Blue − Red)" for "Score so far (Blue − Red)", a line for the area, and no "Advantage chart" title
  in the legend, which grew long.
- **Built** (design 06, "The Advantage chart in the Report"): the chart between the result and the counts. A third
  line, "Area (Blue − Red)": the difference of the areas each player encloses now, the engine's `areas`, which are
  added to the score at each turn's end. Magenta (`--area`), apart from the players' blue and red and the labels'
  hues. The score and the area are each scaled to their own largest value, because their sizes differ. Each line is a
  display setting ("Score", "Area"), on by default. The legend names the lines only.
- **Checked in Edge** at 1,399 × 849: the chart above the counts, the area line drawn, the legend "Blue's win chance,
  Score (Blue − Red), Area (Blue − Red)", the page 849 pixels high. The Report tab below 1,260 pixels is not checked.

### The Advantage chart's lines shown or hidden at the legend, and larger label dots (2026-10-12)

- **Asked:** larger, more visible labels in the chart. A box at the legend to show or hide the score and area lines
  for the moment. The display setting gives whether a line shows at first: a line off by setting keeps its legend
  item, with the box clear, and a box does not change the setting. The setting's text says that it sets the default.
- **The cause of the small labels:** the key moments were circles in the chart's SVG, which stretches to the column's
  width. Under the board the chart was about as wide as its 600 units, so the circles were round. In the summary
  column (226 pixels) each was about 2.6 pixels wide and 7 high. They are now dots drawn in HTML, 10 pixels wide.
- **Built** (design 06, "The Advantage chart in the Report"): a box before the score's and the area's names in the
  legend. The settings are "Score line" and "Area line": "Shown when a review opens: … Its box under the chart shows
  or hides it for the moment." A change of the setting applies again. A click on a box does not focus it: the key
  handler leaves the keys to a focused input, and the arrow keys must still step through the moves.
- **Checked in Edge:** a click on the Score box cleared it and hid the line, the stored setting stayed on, and three
  presses of the right arrow then moved from edge 4 to edge 7. With the Area setting off in storage, the page opened
  with the Area item in the legend, its box clear and no area line. The setting was set back on.
- **Open then:** "Score (Blue − Red)" or "Score difference" as the line's name. Decided in the next entry.

### The Advantage chart's values in its note, and the lines named "difference" (2026-10-12)

- **Asked:** the legend's names lined up, the label dots slightly smaller, and the values in the chart's note with the
  lines renamed.
- **Why the values:** the score and area lines are scaled to their own largest values and have no axis, so no number
  of theirs showed anywhere. With the values in the note, the side ahead named ("Score: Blue +88.9"), the names need
  no "(Blue − Red)": the chart already puts Blue above the middle, and the site names the side ahead rather than give a
  sign.
- **Built** (design 06, "The Advantage chart in the Report"): "Score difference" and "Area difference" in the legend.
  The note gives a line each for the score and the area, one decimal, for the lines shown only. At the game's end the
  result replaces the score. Every legend item has a box's room, empty for the win chance. The dots are 9 pixels wide.
  The settings' text says "above the middle when Blue leads" (or "when Blue's is larger") for "(Blue − Red)".
- **"Win chance for Blue"** for "Blue's win chance" in the legend: each name then starts with what its line measures
  (win chance, score, area), and the player is not what tells the lines apart.
- **Checked in Edge** at 1,407 × 849: the swatches of the three items at 49 pixels and their names at 67, the dots 9
  × 9. At turn 21 the note read "21. M9-P10 J11-K14", "Lead: Red +150.6", "Score: Blue +88.9", "Area: Blue +12.3". With
  the Area box cleared, the note lost its area line.

### Labels from a human win chance: fixed bands, one curve (2026-10-12)

- **Asked:** whether to fit the label bands to human strength at all. A move that loses 20% of the win chance is
  devastating whoever plays it. The real problem may be that the engine's value assumes the engine's best reply.
- **What the sites do:** Lichess and KaTrain keep fixed bands for every rating. chess.com keeps fixed bands too, but
  its expected points come from "the player's rating and the engine evaluation", so the same evaluation can be a
  Blunder for one player and not for another, and it is more generous with Great and Brilliant for new players. No
  site grades moves against other players of the same rating.
- **Measured** (decisions/engine.md, "The engine's win chance against human results"): where the engine gives the
  mover 89%, human players won 61 to 71% of the time. The engine's win chance is the chance of a game between two
  engines.
- **Decided:** the bands stay fixed: chess.com's 0.02, 0.05, 0.10 and 0.20 of win chance. What is fitted on the
  archive is the curve that turns the engine's value into the win chance of human games (design 01, principle 2), as
  Lichess and chess.com do. **One curve for every rating**, as Lichess's: a label then means the same for every
  player, and an imported game may not have the players' ratings. Design 01's principle 3, "the percentiles that
  separate strong players' moves from weak players'", would grade moves against other players of the same rating,
  which no site does. It is set aside.
- **Agreed, after a look at why design 01's principle 1 exists:** the label from the win chance only, with points lost
  still in the notes. Pending: how the curve keeps principle 1's concern.
- **Pending:** a measure of a position's difficulty. KaTrain's complexity is the first candidate.
- **The fit's data:** the archive's games with a winner, without the abandoned ones (as Lichess's fit leaves out
  abandoned games and time forfeits). Fitted and compared in decisions/engine.md, "The human win curve fitted on the
  archive". Request 08 asks for the network's prior and a first look at each position, for the measures of difficulty.

### Labels from a human win chance: built (2026-10-12)

- **Agreed:** σ(k · lead / spread), one k, fitted on the archive's games between near-equal players with a term for the
  side to move at a turn's start in the fit only (decisions/engine.md, "The win curve's flat middle"). The fit
  (`scripts/measure/fit-win-curve.mjs`): k 0.986 at 1,024 visits, 0.998 at 512. The site uses 0.99.
- **Built** (design 10): `humanWin` and `HUMAN_WIN_K` in `labels.ts`, and `classify` by the win chance only (no point
  bands). In `model.ts`, every loss, the gaps that ask for and confirm a Great, and the board's candidates within the
  Good band read a human's win chance (`labelWin`, `candidateWin`). Each candidate keeps its own spread
  (`scoreStdev`). The budget summary reads the same chance. Points lost stay in the notes. A test checks that a lead of
  1,000 with a spread of 50 loses no label for 100 points, and that the engine's fall from 0.5 to 0.2 with 5 points of
  a spread of 100 is Excellent.
- **The sample game, by turn,** from the cache, before and after (Blue / Red):

  | | Great | Best | Excellent | Good | Inaccuracy | Mistake | Blunder | Accuracy |
  |---|---|---|---|---|---|---|---|---|
  | Before | 4 / 4 | 8 / 12 | 9 / 7 | 2 / 1 | 1 / 2 | 4 / 2 | 3 / 2 | 85.2 / 88.9 |
  | After | 1 / 2 | 11 / 14 | 8 / 8 | 3 / 2 | 4 / 2 | 4 / 2 | 0 / 0 | 89.4 / 93.7 |

  Fewer Greats: the gap of 0.10 is now in a human's chance, which is gentler than the engine's.
  The notes give a human's chance: "Mistake: −14.7% · −197.8 pts (−143.3 pts, −54.5 pts)". Checked in Edge.
- **Not changed:** the Advantage chart, the win bar and the candidates table still show the engine's win chance. Open:
  whether they show a human's, so that a note's loss and the chart's fall agree.

### Early access: the review only, as Hedge School (2026-10-12)

- **Decided** (design 11): an early access with the review only. The site's name is Hedge School, at
  `hedgeschool.abstractclass.org` on the owner's domain (the owner also weighed `enclosure.abstractclass.org`). No
  sample game: a review opens on a game the player brought. A private GitHub repository, built by Cloudflare. Unlisted.
  Feedback in the players' Discord. Cloudflare's analytics and Google Analytics. Both networks ship. No note that the
  labels may change: a change reaches stored games by itself. The device checks are skipped for now.
- **Asked:** an import of Constellation's games, whose notation differs, and a page that describes the position and
  game record notations in detail, as PGN's standard does, for other developers.
- **Built:**
  - The build switch `VITE_EDITION=early`. The header shows Review, with The notation and About on its right. The
    puzzles, lessons and engine lab lead home. The home page drops the sample game, and in the early access the daily
    puzzle and the next lesson. `/review` without a game asks for one.
  - The name in the pages and the bookmarklet. The version (the commit) in the footer of the pages that scroll.
  - Unlisted: `robots.txt` disallows every page, and every page carries `noindex`.
  - The pages About, The notation, Privacy and Notices. The notices quote the licences from the libraries' own files:
    KataGo's, nine MIT libraries, the icon (Apache 2.0), the sounds (CC0).
  - The import of Constellation's export (design 11, "Constellation's export"), as this site's record. The owner's
    export of a 120-edge game was imported in Edge: the engine took every edge as legal, and the review opened.
- **Requests:** 11, to settle the notation's open points and confirm the page. Request 03 is due now, with a notice of
  the module's licences added.
- **Checked in Edge,** on the early-access build: the home page, the import above, `/review` with no game, `/puzzles`
  leading home, and the notation page. 32 tests.
- **Open:** Google Analytics' consent (a banner, or Google's Consent Mode), the Discord's link for the pages, the
  direction of Constellation's rows (Blue's first edge `D10-A7` runs down and left here), and the hosting steps that
  need the owner's accounts.

### Early access: the second round (2026-10-12)

- **No Review link in the early access:** a bare Review link opened a review with no game. The name leads home, where
  a review starts from a game.
- **Constellation counts rows from the bottom,** as this site does (the owner checked its board): the import is right.
- **The game's designer:** Enclosure is designed by webgoatguy, who introduces it in a video
  (`https://youtu.be/BiVaY09xgZ4`). The players' Discord is theirs (`https://discord.gg/DxfvEgmQD`). About credits
  both, and About and Privacy link the Discord.
- **The engine repository is private:** GitHub answers 404 without a login. The pages no longer link to it. Its
  releases cannot be downloaded by a public build without a token, which request 03 had not foreseen. Open: a token in
  Cloudflare's build, or a public place for the releases.
- **The domain** was bought at Porkbun and has no DNS host yet.

### Google Analytics in Google's consent mode, advanced (2026-10-12)

- **Decided:** Google's consent mode in its advanced form. The Google tag loads on every page with its cookies denied,
  so it sends cookieless pings until the visitor accepts. A banner asks once. Accept and Decline look the same, so
  that declining is as easy as accepting. The privacy page shows the choice and can change it. Ads stay denied: the
  site has none.
- **What the advanced form gives, and what it costs:** Google models the visits of those who decline only when a
  property has at least 1,000 events a day from them and 1,000 daily users who accept, for 7 days (Google's
  "Behavioral modeling for consent mode"). Below that, the reports count the visitors who accept. The pings before
  consent still reach Google, and some European data protection authorities question them. The privacy page says
  what the pings hold.
- **The basic form,** the other choice: no Google tag until the visitor accepts.
- **Built:** `src/lib/analytics.svelte.ts` and the banner. The build names the services (`VITE_GA_ID`,
  `VITE_CF_ANALYTICS_TOKEN`). Without them, as in development, the build holds no code of either. Cloudflare's beacon
  is added by the page, not by Cloudflare's automatic setup, so that it starts after the import page removes a
  record from the address.
- **The domain** is active on Cloudflare.

### Early access: the third round (2026-10-12)

- **The Review link is back:** it opens the last game reviewed in this browser, and the address then names the game.
  With none, it asks for one.
- **The Report's first line** no longer says "A bot game": the games are the players' own.
- **The engine from its release** (request 03): the module `85c2adb` and the newer networks, both pinned in
  `engine.lock.json` and downloaded without a login. The notices page lists the works compiled into the module and
  links to the release's notices, which ship beside it.
- **The notation page follows request 11:** the clock once a turn after its last edge, the lead as `[%eval]`'s middle
  number, the tags `BlueRating`, `RedRating` and `Rules`, and `r0` for a finished game. The page is the notations'
  public description.
- **Analytics checked in Edge** with the site's Google Analytics property: the tag loads with both kinds of consent
  denied (`gcs=G100`), Accept stores the choice and hides the banner, and the hits after it carry analytics consent
  (`gcs=G101`). A page change inside the site sends a page view. Google answered this machine's hits with HTTP 503,
  but the owner saw the preview's visits arrive in Google Analytics.
- **The repository on GitHub** exists, private, with no push yet.

### Move sounds: the crayon replaced by a pencil and a keyboard (2026-10-12)

- **Asked:** remove the crayon strokes, and try two recordings the owner downloaded from Pixabay: "Pencil_lines"
  (Pixabay 91555, uploaded by its community account from tmkappelt's Freesound 85702, CC0 there) and "iPhone Keyboard
  Typing Sound Effect" (Pixabay 336778, by u_a4gfvwagf1, the Pixabay Content License). Both downloads were complete,
  though not renamed from `.crdownload`.
- **Built** (design 08): four pencil strokes and five key taps, cut as the crayon was, and a "Sound" choice in the
  display settings' Sound group, Pencil by default, so that the owner compares them on a real game. The crayon's
  files are removed. The notices page names both sources.
- **A caveat on the keyboard:** its recording is digital, the phone's own keyboard sound captured from the device. The
  Pixabay licence comes from the uploader, and Pixabay leaves other rights to the user to check. The pencil's original
  is CC0 on Freesound.
- **First cuts went wrong,** and were made again: seeking in an MP3 is not exact, a fade counted from the recording's
  start silenced a clip, and windows of 44 samples taken as 1 millisecond moved the late taps by up to 17
  milliseconds. The clips are now cut from the decoded samples, each tap from its first sample over −40 dB, and every
  clip peaks where its set's gain puts it.

### Move sounds: the pencil shortened, the phone keyboard removed (2026-10-12)

- **The pencil was a little long** (the owner, by ear). Each stroke opens with 60 to 90 ms of quiet scratching before
  it rises. The clips now leave out the first 60 ms: 0.29 to 0.31 s, not 0.35 to 0.37, and the peak comes sooner. A
  speed-up of 5%, the other way offered, would cut only about 18 ms and raise the pitch.
- **The phone keyboard is removed:** its recording is the phone's own sound (design 08, Alternatives). A safe keyboard
  comes from a CC0 recording of a real keyboard on Freesound. Candidates, each checked CC0 on its own page: stu556's
  Leopold FC660M with MX Brown switches (450282), SamsterBirdies' Cherry MX Blue (489424), khenshom's MacBook Pro 2018
  (565645), Trollarch2's mechanical keyboard (331656), grcekh's WhiteFox with Hako Violet switches (546167).
- **The choice of set** shows only when there are two or more sets, so it is hidden with the pencil alone.

### Move sounds: the button (2026-10-12)

- **Asked:** the safe keyboards found (Freesound's CC0 recordings, BigSoundBank's studio keyboards, Kenney's interface
  clicks) did not please: most of Freesound's have a poor room sound. The owner chose two button sounds from Pixabay
  instead, to play together, the first more often: "Select Button UI" by Emilianodleon (395763) and "Button Press" by
  DRAGON-STUDIO (382713), both under the Pixabay Content License. Button is the default, Pencil the second choice.
- **Checked:** both downloads complete (the sizes match their lengths), and both pages name their sound designers and
  no product.
- **Built** (design 08): the two sounds, each its press and release, trimmed of the silence before and the faint tail
  after. The first plays three times as often (the weight is the site's choice of "more often"). A set of two may
  repeat a clip: never repeating would make two clips alternate. Three tests check the draw.
- **The name:** the project is Hedge School everywhere but the browser's storage and the local folder (design 11). The
  README is rewritten for the site as it is: the early access, the engine from its release, the analytics.
- **Swapped** (the owner, after listening): "Button Press" now plays three times as often as "Select Button UI".

### Move sounds: a sound for a cut (2026-10-12)

- **Asked:** the button's more frequent sound ("Button Press") for an edge, the other ("Select Button UI") for an edge
  that cuts. The pencil the same: two fixed strokes, the lower-pitched for an edge, the higher for a cut, in place of
  four strokes at random.
- **Measured:** the pencil's four strokes are about as bright as each other: their spectral centroids, weighted by
  energy, lie within 2% (5,400 to 5,510 Hz), less than the ±3% speed the strokes used to vary by. So a stroke's pitch
  heard before came mostly from that speed. The darkest stroke is the edge's, the brightest the cut's, and the cut's
  plays 12% faster (two semitones) so that it is higher by ear. The figure 12% is the site's choice.
- **Built** (design 08): `cutsAt` tells whether the move that leads to a place cuts, in the game or in a branch, and
  the sound follows. The sounds are fixed: no random choice, no change of speed. The weights and their tests are gone.
  A change of set plays the new set's edge sound.

### Move sounds: the pencil as loud as the button (2026-10-12)

- **Asked:** the pencil a little quieter, to match the button's volume.
- **Measured** (EBU R128's momentary loudness, the loudest 400-ms window, which holds a whole clip): the button's
  sounds at −28.6 and −28.8 LUFS, the pencil's at −19.4 and −17.3. At equal peaks, the pencil's continuous scratching
  carries about 10 LU more than the button's two short clicks.
- **Built:** each pencil stroke cut again from the source with its own gain, to −28.7 LUFS: 9.4 dB down for the edge's
  stroke, 11.8 dB for the cut's. The four sounds now lie within 0.3 LU (−28.6 to −28.9 LUFS). The cut's stroke still
  plays 12% faster, which keeps its loudness.

### Cloudflare Pages: the repository's side (2026-10-12)

- **DNSSEC** is on (Cloudflare's DS record at Porkbun).
- **Read first:** Cloudflare's current Pages documentation (the Git integration, the build image, `_headers`, custom
  domains, the limits, serving). The facts that shaped the setup: Node 22.16 by default in the build image. Private
  repositories through Cloudflare's GitHub app. No `404.html` makes Pages serve the home page for any address. A
  subdomain of a zone on Cloudflare gets its DNS record by itself. Web Analytics turns on its automatic setup (the
  beacon added by Cloudflare) for a proxied hostname unless changed to a manual snippet.
- **Built:** `.node-version` (24), `npm run build:cloudflare`, `static/_headers`, and the 404 page (design 11, item
  5). The command passed on this machine and from a clean clone with a fresh `npm ci` and fresh engine downloads.

### The site live on Cloudflare Pages (2026-10-12)

- **Live** at `hedgeschool.abstractclass.org` (and `hedgeschool.pages.dev`), built by Pages from `main` at commit
  `0dd4083`, with the settings in docs/hosting.md. The framework preset is None: Cloudflare's SvelteKit preset fills
  in the output of Cloudflare's own adapter (`.svelte-kit/cloudflare`), which renders on a server in a Worker, and the
  site uses adapter-static.
- **Checked on the live site:** `noindex` on every file, a real 404, the year's cache on the hashed code and the
  engine's files and not on the manifest, the module as `application/wasm`, the larger network whole, the early access's
  header and `/puzzles` leading home, the GA ID in the code, and DNSSEC validated (key tag 2371).
- **Web Analytics, to fix:** a site was added for `abstractclass.org`, on Cloudflare's automatic setup. A first
  check found no beacon, but it came just after the site was created. Minutes later every page of Hedge School had
  Cloudflare's beacon, `/import` too: the automatic setup adds it to every subdomain of the zone, so it can start
  before the import page removes a record from the address. The site for `abstractclass.org` can stay: Cloudflare
  accepts its beacon from any hostname that ends with the site's name, and its dashboard has a Host dimension. So one
  site serves every subdomain, as one Google Analytics property does. The fix: set it to "Enable with JS Snippet
  installation", and its token as `VITE_CF_ANALYTICS_TOKEN`.
- **The bare domain and `www`** answer HTTP 525: proxied records to a server that fails Cloudflare's secure
  connection, most likely Porkbun's parking records copied when the domain was added. Not part of the site.
- **The setup written down** step by step in docs/hosting.md, from the domain to rolling back.

### The analytics live (2026-10-12)

- **Cloudflare Web Analytics:** its site for `abstractclass.org` set to "Enable with JS Snippet installation", which
  ended Cloudflare's own injection of the beacon. The token set in the Pages project's production variables, and the
  deployment retried.
- **Checked on the live site in Edge:** the served HTML has no beacon. The site's code adds it after the page has
  started (at 2.9 s, the document loaded at 1.1 s), so on the import page it follows the removal of a record from the
  address. Cloudflare accepts the reports from `hedgeschool.abstractclass.org`: each answer 204, at the load and at
  each page change inside the site.
- **Google Analytics' stream:** its name and URL are labels, renamed for Hedge School. They limit nothing: a hostname's
  visits are dropped by a data filter, if ever needed. The early trials' visits (from `127.0.0.1` and the tailnet
  address) stay in the property. Local builds now leave the ID out.
- **The bare domain's records:** two A records at Cloudflare for `abstractclass.org`, the parking server's addresses
  (`pixie.porkbun.com` resolves to `207.207.210.107` and `207.207.210.229`). Cloudflare made them from Porkbun's ALIAS
  record when it read the domain's records. Removed, with `www`: the bare domain no longer resolves.

### The networks' downloads in the engine settings (2026-10-12)

- **Asked:** whether the site asks before it downloads the networks, and which.
- **Measured** (the build on a server that logged each engine file, a first visit in Edge, 8 workers): a review
  downloads the module (1.3 MB) and the default network (6.5 MB) once, whatever the workers. A return visit downloads
  only the manifest (1.2 KB). The larger network (20.6 MB) downloads only when chosen. Nothing asks.
- **Decided:** no question before the download, as on Lichess, whose default engine loads with a small network made
  for the download (7 MB) and whose official one (40 MB) is a choice in its engine menu, with its size. The Network
  choice now names each network's download: "3.2M params (6.5 MB)", "10.3M params (20.6 MB)", from
  `engine.lock.json`. Its help line adds that a network downloads once and the browser keeps it.
- **The break:** in a narrow panel (a window 1,311 pixels wide gives each choice 145 pixels) the names wrapped inside
  their parts. No-break spaces inside "3.2M params" and "6.5 MB" leave the space before the parenthesis as the only
  break. Checked in Edge at the panel's own width and at 260 and 200 pixels.

### The engine named HedgeFund, and work on a `dev` branch (2026-10-12)

- **The names:** the engine is HedgeFund. The networks are to show as "HedgeFund 1 Lite (6.5 MB)" and "HedgeFund 1
  (20.6 MB)". The name identifies the engine and its network everywhere (the site, the bots, the Discord), so the
  engine repository gives it, in its release manifest, and the site adds the size (request 12). Until then, the
  settings name the networks by their parameters and sizes.
- **The branches:** work on `dev`, pushed after each commit, so that GitHub holds the work. `main` is the live site,
  released by `git push origin dev:main`. Pages builds each push to `dev` as a preview. The other way (work on `main`,
  Pages deploying another branch) works the same, but keeps less to the convention that `main` is what runs.
- **The preview's variables** in Pages: `VITE_EDITION=early` and `VITE_GA_ID`, no Cloudflare token. `VITE_GA_ID` is to
  go from the preview environment, so that visits to previews are not counted.

### Labels back on the engine's win chance (2026-10-12)

- **Decided:** the labels read the engine's own win chance, with chess.com's bands (0.02, 0.05, 0.10, 0.20) and no
  point bands, as the first labels did without their point bands. The practical chance (a human's, σ(0.99 · lead /
  scoreStdev)) is removed from the site. The owner came to prefer the first labels: the search for another measure was
  not going well.
- **What the data said** (decisions/engine.md, "The label rules on games of known strength"): the engine's chance
  flags stronger play less on every set of games (the visit ladder, the gauntlet, people by rating), so it measures
  strength. It is harsher on beginners (Blunder on 30% of turns under 1600, against 18%), and its flags fall where the
  game is still open: 73% of people's Mistakes and Blunders in the first 40 edges, 13% in decided positions. The point
  bands stay out: 46% of people's Mistakes in decided positions.
- **No new measurement** on the released network: the owner chose not to re-measure.
- **Built:** `labels.ts` and `model.ts` read `blueWin` everywhere (the loss, Best, Great's gaps). `humanWin`,
  `labelWin`, `candidateWin` and a candidate's spread are gone. The Report says "Labels judge each move by the engine's
  win chance." The test of the human chance became a test of the engine's. On hold until now, and dropped: a
  practical-chance line on the chart, and "practical" in the notes.

### The logo: a Border Collie (2026-10-12)

- **Asked:** a logo and mascot, a Border Collie in a simple drawing, readable as a 16-pixel favicon. Collies herd sheep
  into pens, and pens are what the game is about. It can be the hedge school's schoolmaster.
- **Built** (design 12): three drawings compared in Edge at 16 to 128 pixels on light and dark backgrounds, and at 16
  device pixels enlarged. The second, a larger face with a narrow blaze, is the logo and favicon. The third, the same
  face in a mortarboard, reads from 48 pixels up and is the mascot on the About page ("The schoolmaster"). PNGs for
  browsers without SVG icons and for iOS.

### The logo in black and white (2026-10-12)

- **Asked:** Lichess's style: a very simple drawing in black and white, without colour, and a larger title.
- **Built** (design 12): line art and a silhouette compared in Edge from 16 to 128 pixels. The line art blurred at 16
  pixels and read as a cat at large sizes. The silhouette, refined (tufts at the cheeks, a tipped ear, a narrower
  muzzle), reads as a collie. It takes the page's ink. The mascot keeps a narrow mortarboard, set above the head with a
  gap. The title is `text-xl`, the logo 28 pixels, and the header's reserved height 3 rem (the review still fits the
  window).

### Export and import of reviewed games (2026-10-12)

- **Decided:** both exports: the review file, with the engine's results, and the annotated record. An import into a site
  with another engine searches again. Export on the review page and beside each game on the home page. Import on the
  home page, by a button or a file dropped on the page. When the site has more, the home page becomes a home, and these
  move to the review page.
- **Precedents:** Lichess keeps an old analysis as it was and lets the player ask for a new one. KaTrain can keep its
  analysis in its SGF files. Here the engine runs in the player's browser, so searching again costs only the wait.
- **Built** (design 13). Checked in Edge, without saving files to the owner's folders (the page's file was caught in
  the page and passed through a local server): the export of a reviewed 120-edge game, 240 results of the shipped
  network, 876 KB (1.7 MB before the older networks' results were left out). Its import at another address of the same
  server (another browser's store), dropped on the home page. The review complete within 8 seconds, with no search,
  though that browser's review depth (512) differs from the file's (1,024), once a stored deeper result answers a
  shallower question. The annotated record from the review's Export menu, opened from the keyboard.
- **The notation's branches:** its two examples place a branch in two ways. The export follows them, and request 13
  asks the engine repository for one rule.

### Export from the home page: the three choices (2026-10-12)

- **Asked:** the home page's Export, beside each game, with the review page's three choices.
- **Built** (design 13): one menu for both pages (`ExportMenu.svelte`). From the home page, the annotated record is
  built from the stored results with the rules alone: no search. Checked in Edge, the record caught in the page: a game
  stored before the store's shape changed gave a record with no evaluations that still said it was reviewed. Such a
  game now gets the note "open the game to review it first" and no record, and a game reviewed in part "open the game
  to finish its review first". The first guard counted any stored position, and passed: every game shares the start,
  which another game's review stored. The guard now leaves the start out.
- **The two exports compared,** for the owner's questions: the review file is for this site, and holds every stored
  result (each candidate with its value, visits, prior and line). The annotated record is for people and other
  programs, and holds one evaluation after each edge, the labels in words, the clocks and the branches. A reader cannot
  rebuild the labels from it: Best and Great rest on the candidates and on further searches. Request 13 now also asks
  the notation for marks of a move's quality and for a note before the first turn.

### Hard positions and the accuracy's weights (2026-10-12)

- **Asked:** KaTrain's complexity to weigh the accuracy, and a mark on hard positions.
- **Measured** on request 08's first look (decisions/engine.md, "KaTrain's complexity on the archive"): in points,
  KaTrain's cap times 12 holds 70% of the positions. In win chance, the share of played edges that lost 0.10 or more
  rises from 0% to 62% across the tenths of complexity. KaTrain's weights raise the correlation of a game's accuracy
  with the player's rating from 0.43 to 0.63.
- **Built** (design 14): the complexity in win chance, from each candidate's prior, now kept in the stored analysis
  (the store's shape 5). ◆ marks a position of 0.10 or more, in the move list, the engine header and the annotated
  record. A player's accuracy weighs each move by KaTrain's weight, with full weight at 0.10 of complexity or 0.20 of
  loss. Design 14 names the departures from KaTrain and Lichess. A first try put a note under each hard turn: two in
  the first eleven turns of a game, so the note went, and the mark and its tooltip stayed.
- **Checked in Edge** on a game of 120 edges between two people, reviewed again under the new shape at 1,024 visits:
  5 of its 60 turns are hard, the accuracy is 71.1 for Blue and 50.7 for Red, and inside turn 7, where one edge kept
  the chance and the others lost 12 to 24%, the engine header shows ◆. The word "hard" beside it wrapped the header's
  line and moved the candidates' table, so the mark stands alone. The annotated record, from the review page and from
  the home page, has an evaluation after 119 edges and "A hard position." on the same 5 turns.

### The logo in profile (2026-10-12)

- **Asked:** a better drawing, after images found by searching "border collie head line art": not the front view, but
  the side or a half side.
- **Drawn and compared** in Edge, from 16 to 128 pixels on light and dark: a front view with black patches round the
  eyes (not kept: a front view), a solid profile silhouette (it read as a wolf), a three-quarter view (a large empty
  ruff), and a profile in black and white: the ear, the eye's patch and the cheek filled, the muzzle, blaze and ruff
  outlined. The last was preferred, and refined: the ear's top tipped forward with a fold line, a pupil, the cheek's
  black curving round to the jaw, heavier lines below 48 pixels and in the favicon.
- **Built** (design 12) as a candidate in the site, for a look in place: the header, the favicons (SVG and both PNGs),
  and the mortarboard on the About page, set forward on the forehead so that the ear shows behind it.

### Export and the hard mark: fixes after a look (2026-10-12)

- **The hard mark moved the labels:** by turn, the turn's cell is right-aligned, so a row with ◆ put its label 12
  pixels left of the others. Every row now keeps a slot for the mark. Checked in Edge: every label of the first nine
  turns at the same place, with and without ◆.
- **The note's depth came from the setting, not from the results:** the same game, searched at 1,024 visits, exported
  as "at least 1024 visits" and later as "at least 512 visits", after the review depth was set to Lite. The note now
  gives the least visits among the game's searches.
- **A pasted annotated record:** the home page reads its tags and moves and skips its comments and branches. A game's
  id comes from its moves, so in the browser that reviewed it, the paste opens the stored review at once, with
  nothing searched (checked in Edge). In another browser it is a new game, and the review searches it: the record's
  evaluations are not read.

### The networks named: HedgeFund 0.1 (2026-10-12)

- **Request 12 done** (requests/12-network-names.md): the release's manifest names each network. "HedgeFund 0.1 Lite"
  (b10c128) and "HedgeFund 0.1" (b15c192). Versions start at 0.1, every new network file takes the next number, and a
  name belongs to one file for life.
- **Built** (design 09): the names copied into `engine.lock.json` and the site's manifest. The engine settings show
  "HedgeFund 0.1 Lite (6.5 MB)" and "HedgeFund 0.1 (20.6 MB)", with the parameters in the help line. The annotated
  record's note and the review file name the network by its name and its id. Checked in Edge.

### Export only once the review is done (2026-10-12)

- **Decided:** for simplicity, no export of any kind until the game's review is done.
- **Built** (design 13): when a review's bar ends, the game keeps the mark of it: the engine module's and the
  network's SHA-256, the network's id, the review's depth. The review page's Export opens then. The home page reads the
  marks: a game exports when its mark names the site's engine, the network set now and the review depth set now or
  deeper. The review file carries the review (the mark with the network's name), and an import keeps the mark when the
  file's review ran with this site's engine and a network it ships.
- **The file's version** (design 13): one number. A new field keeps it, and a reader ignores fields it does not know.
  The `review` field joins version 1, since no release of the site exports files yet.
- **Checked in Edge:** on the home page, the reviewed game's Export on and the four others off, with the reason in the
  tooltip. The review file of the reviewed game carries its review: the module's and the network's SHA-256,
  "HedgeFund 0.1 Lite", 512 visits. Not checked: the tooltip of an Export that is off, with the real pointer.

### Difficulty as pictures: the strip and the likely edges' meter (2026-10-12)

- **Asked:** the hard mark's tooltip was too wordy. Show difficulty as a picture: a short tooltip, a strip under the
  chart, and a bar after Maia's, with the network's prior for Maia's human moves.
- **Maia's Blunder Meter** (its platform's `calculateBlunderMeter`, CSSLab/maia-platform-frontend): Maia's policy at a
  chosen rating, summed by Stockfish's win-rate loss against the best move: Best moves (a loss up to 0.05), OK moves
  (to 0.10), Blunders. Moves that Stockfish did not value are left out.
- **Built** (design 14): the tooltips say "Hard position". Under the Advantage chart, a bar for each turn (or edge), as
  tall as its complexity, dark where it is hard. Under the engine header's line, the network's likely edges in the
  labels' colours, cut at the labels' bands, with the prior the search did not visit in grey. Checked in Edge on the
  game of 120 edges: the strip's bars stand in the first quarter of the game, and inside turn 7 the meter reads 2% good
  or better, 15% inaccuracy, 32% mistake, 51% blunder.

### The logo from the generated drawings (2026-10-12)

- **Given:** ten collie drawings made with an image generator to a brief after Lichess's knight, and dark edits of
  versions 08 and 09 that keep the black coat and add a light keyline instead of a negative.
- **Built** (design 12): versions 08 and 09 traced to vector paths and compared from 16 to 256 pixels in both schemes.
  Version 09 is in the site as the candidate: cleaner at 16 pixels and 14 KB of paths against 34 KB. On a light page
  its coat takes the ink, and on a dark page it keeps the black coat, the white fur and the keyline. The About page
  shows the same collie, without the earlier mortarboard. The favicon follows the colour scheme, and the PNGs are its
  light form.

### Difficulty in its own chart, the simplified collie, the schoolmaster's line (2026-10-12)

- **Asked:** difficulty is not advantage, so it belongs in another chart.
- **Built** (designs 06 and 14): two tabs above the Report's chart, "Advantage" and "Difficulty", as Lichess's tabs
  choose among its charts. The Difficulty chart: a bar for each turn (or edge), dark where the position is hard, a
  dashed line at the hard level, and the key moments' labels as dots on their bars. A click shows the bar's position,
  the decision. The strip under the Advantage chart is gone. Checked in Edge.
- **The meter's order** (asked): good on the left, bad on the right, as Maia's meter stands its groups top to bottom
  and as the Report's counts list the labels. A plain choice, not a measured one.
- **The schoolmaster's line:** "Collies herd sheep into pens, and pens are what Enclosure is about." read as a slogan.
  The About page now says "The school is kept by a Border Collie."
- **The simplified collie** (design 12): simplified versions of drawings 08 and 09 for 16 to 32 pixels, with dark forms
  in a thick white border. Both traced and compared. The simplified 09 draws the collie below 48 pixels (the header,
  the favicon, the iOS icon), and the full 09 from 48 pixels up (the About page). Checked in Edge in the dark scheme
  in the site, and in both schemes on the comparison page.

### The Difficulty chart's details, and the early access in the header (2026-10-12)

- **Fixed:** the Difficulty chart's tooltip ran past the panel's right edge: it had no width limit, and "Hard
  position" made it wider. It now wraps inside the chart, on the side with more room, as the Advantage chart's does,
  in lines: the decision ("9. Blue to play"), the move played, and "Hard position" when it is. Checked in Edge at both
  ends of the chart.
- **The labels' dots:** 7 pixels wide on both charts (9 before). On the Difficulty chart they moved from the bars' tops
  to a row under the bars, each under its turn. A dot on a bar's top mixed two measures into one mark, and sat on the
  floor of a short bar.
- **The two charts' clicks:** the Advantage chart shows the position after a move, as the move list does, and the
  Difficulty chart the position before it, where the player decided. Kept, and said in the tooltips ("7. Blue to play"
  against "7. K9-K10 A9-D10").
- **The legend's swatches:** one size for "Hard position" and "Easier". Their heights hinted at the bars' heights,
  and looked off.
- **The header:** "Early Access" in the accent colour beside the name, a link to the About page's section on the early
  access (design 11).

### The charts under the board, always in view, and the head alone for small sizes (2026-10-12)

- **Asked:** the chart was too small for a game of 120 edges in the Report's column. Put it under the board, always in
  view without scrolling, and let its height change with the layout.
- **Built** (design 06): the charts' area under the board, at the board's width. Its height is what the window's
  height leaves after a board as wide as the columns allow, at least 6 rem and at most 12 rem: where the board fills
  the height, the board is 6.5 rem shorter. The tabs and the legend share one row. The charts' notes open above them,
  over the board. The side columns end with the area. Checked in Edge at 1,311 × 850 (the board limited by the
  height: the area 6 rem), and in frames of 1,100 × 800 (two columns) and 700 × 840 (one column, the area 8 rem).
- **The collie's head** (design 12): a head-only drawing for 16 to 32 pixels (no chest, no eye, broad masses and a
  thick white outline), traced to paths. It draws the collie below 48 pixels (the header, the favicon, the iOS icon)
  in both colour schemes, in place of the simplified busts. The full drawing stays from 48 pixels up.

### No text cursor, edges by drag, and notes on the board (2026-10-12)

- **Asked:** the review page's text took a selection, and the pointer turned into a text cursor over the move list's
  labels and marks. Also: drag to play an edge, and right-click notes: a ring on a point, a line by a right drag, that
  are only drawings (no cut, no enclosure).
- **Built** (designs 06 and 07): the review page takes no selection (`select-none`), except an engine error. The board
  takes the pointer's press, drag and release: a click as before, or a drag from a node to a marked end that plays the
  edge. The notes follow Lichess's circles and arrows (chessground's drawable shapes): they toggle, the keys held
  choose the colour (green, yellow, purple, grey: Lichess's red and blue would read as the players' colours), and a
  left click on the board clears the position's notes. They belong to the position on screen, for the visit only.
- **Checked in Edge:** the move list's cells compute `user-select: none`. A real drag from D10 to G9 played the edge as
  a branch (then deleted). Real right-clicks ringed K12 and N14, a second right-click on K12 removed its ring (a first
  try added a second ring: the check of the same note missed rings, and is now tested), and a left click cleared the
  notes. A right drag was sent as pointer events, as the browser tool has none: it drew a line from M14 to P11, and
  Shift drew a yellow ring.

### The protected edges' halo, and purple notes (2026-10-12)

- **Asked:** the protected edges' blue halo was unclear on Blue's edges. A white-ish halo, not pure white. Notes purple
  by default, and every note colour listed in the help.
- **Built:** the halo is a neutral that is neither player's colour, in each board's contrast: a warm off-white
  (#ece6d6, at 55%) on the dark board, and a warm grey (#8b7f68, at 45%) on the light board, where an off-white would
  vanish into the cream. Four candidates for each board were compared in Edge before the choice. On the board, at the
  second edge of turn 8, Blue's protected A9-D10 and K9-K10 stand out from the blue. The light board was seen only on
  the comparison page: the machine's colour scheme is dark.
- **Notes** (design 07): purple with no key, yellow with Shift or Ctrl, green with Alt, grey with both. "Keys and
  clicks" lists them, each with its colour and keys (checked in Edge).

### The notation's decisions in the export, and the numbers written down (2026-10-12)

- **Request 13 done** (requests/13-branch-placement.md): the export writes each branch after the turn it changes,
  after the turn's mark and comments, the branches from the turn's start first. By turn, a turn's label is also its
  quality mark: Great `!`, Inaccuracy `?!`, Mistake `?`, Blunder `??`. By edge, the labels stay in comments. The note
  comes before the first turn, and `[Annotator "Hedge School"]` names the annotator. The reader drops a quality mark
  after any edge. The `/notation` page describes the branch rule, the marks, the note and the tag. Tests cover the
  writer and the reader.
- **Request 06, step 2 delivered** (requests/06-webgpu.md): the GPU module, in release `wasm-v2-engine-06534ee`. Not
  built into the site yet: it waits for a decision (open-items.md).
- **The grey note's keys:** grey is Shift or Ctrl, and Alt. "Keys and clicks" said "Shift and Alt". It now lists the
  keys in groups: (Shift or Ctrl), and Alt.
- **The numbers written down** (design 14, "The numbers, step by step"): a move's loss and accuracy, a position's
  complexity, the hard mark, a move's weight, a player's accuracy, the meter's shares (sums of priors, not counts),
  and a bar of the Difficulty chart, with a worked example.
- **The notes stay out of every export:** the review file and the annotated record hold none. A study, as Lichess's,
  would keep them (open-items.md).

### The bookmarklet on a game just over (2026-10-12)

- **The problem:** on the player's own game, still open after a resignation, the bookmarklet found the game but no
  moves, and said that the game had no moves yet. The page held `moveHistory: []` and `historyLength: 3`.
- **The cause, from meaf.us's own page script:** the page asks for a game's moves (`request_game_history` on its
  websocket) only when its viewer watches (`spectate=1`, or another player's game). The History page fetches a
  finished game from meaf.us's API with the player's login.
- **Decided:** the bookmarklet opens the same game again as a watcher's view (`spectate=1`), which loads the moves,
  and asks for a second click. Only for a game that is over. The other way, the History page's request with the
  player's login, would take one click but break the privacy page's promise: no request to meaf.us and nothing from
  the login.
- **Also fixed:** meaf.us gives the winner as a name, not a colour, and the record's result took only a colour. Every
  imported decisive game had the result `*`. The engine repository's archive tools compare the winner with the
  players' names too.
- **Checked in Edge** on the owner's test game (3 edges, Red by resignation): the first click opened the watcher's view,
  which held the 3 moves. The second click gave `1. D10-G12 2. N9-Q10 O9-Q10 r+R` with Termination "resignation", and
  the import opened the review.
- **Found:** the review values the position after the last edge as the game's end, by the board's scores, also for a
  game that ended early. It said "Red won by 0.0 points" for a resignation (decisions/open-items.md).

### The userscript, a second way to bring meaf.us games (2026-10-12)

- **Decided:** a Tampermonkey userscript beside the bookmarklet, with a floating button and an entry in Tampermonkey's
  menu (design 11). The bookmarklet stays: it needs no extension.
- **Why a userscript:** it updates itself from the site, it can show the school's collie (a bookmarklet has no icon of
  its own: a bookmark's icon is its page's favicon, and a `javascript:` address has no page), and it opens a finished
  game's review in one click.
- **Checked:**
  - The site serves `/hedge-school.user.js` as `text/javascript`, with Tampermonkey's header (unit tests: the header,
    and that the code of both parses).
  - On meaf.us in Edge, with the script's code run in the page and stand-ins for Tampermonkey's two functions: the
    button showed on the owner's finished game, and hid on the lobby. The script registered its menu entry. Its click
    reloaded the page as a watcher's view. Run again on that page, as Tampermonkey runs it, it waited for the 3 moves
    and opened the import page, in one click. That run used a stand-in for the record: the record writer's own check,
    on the same game, came before.
  - The collie on the button, drawn from the script's own icon.
- **Not checked:** an install in Tampermonkey itself, and its updates.

### Deleting a game, and the browser's storage (2026-10-12)

- **Decided:** a Delete on each of the home page's games, with an Undo in the game's row (design 11). It removes the
  game, its branches and the Review link's pointer. The engine's analyses stay.
- **Why an Undo:** one click for the common case, and a slip costs nothing (Gmail's pattern), where a question before
  each delete costs two clicks every time.
- **Why the row stays:** in the first build, the list closed up after a delete, and the next game's Delete came under
  the pointer. A double click then deleted two games. With the row in place, the second click of a double click lands
  on the Undo.
- **Checked** in Edge, on a game made for the test: the delete removed the game, its branches and the Review link's
  pointer. The Undo put back all three. A double click on the row left the next game as it was. After a reload, the
  deleted game was gone.
- **The storage, measured** in the owner's Edge, on the local preview's address: 7 games, 2 games' branches, and
  4,607 analyses, which take 8.8 MB on disk (`navigator.storage.estimate()`). Of the analyses, 1,811 have the current
  shape (6.2 MB as JSON), for 246 positions. The others have an older shape, and no review reads them again. The quota
  is 11 GB. The storage is not persistent (`navigator.storage.persisted()` is false).
- **Running out of space is not likely.** Chrome and Edge give an origin up to 60% of the disk, Safari from macOS 14
  and iOS 17 about 60%, Firefox 10% of the disk or 10 GiB (MDN, "Storage quotas and eviction criteria"). At a few
  megabytes a reviewed game, that is thousands of games.
- **Losing the data is more likely.** A browser deletes a best-effort origin's data when the disk is almost full,
  least recently used origin first. Safari deletes a site's data after seven days of browser use without a visit
  (MDN, same page). The backlog has both: stale analyses, and storage that the browser may clear.

### The engine's best line merged into the branches (2026-10-13)

- **The problem:** a click on the engine's best line under a Mistake played it as a branch, and the branch showed as a
  second row under the engine's row, with the same edges. The engine's row was a display only, outside the tree.
- **Decided:** the line is part of the tree, as Lichess's computer lines are (design 07, item 15). Along the line, each
  edge is the first child of the edge before it. The edges in the player's branches show solid, and the rest faded. A
  branch on the line and the line are one row. Where they part, the row forks, the line's way first.
- **When the line changes:** the player's branches stay, as the branches they are. The new line merges with any branch
  that it follows, and a branch it leaves shows as a branch of its own. The faded edges were never kept, so nothing
  needs moving: each drawing of the move list merges the line of that moment.
- **Changed with it:** the line starts where it leaves the game, as a branch does, and joins that position's branches.
  Before, it started at the turn's start and showed the turn's played edges as hollow edges.
- **Checked** in Edge, on a stored game of 120 edges, with its branches put back after: a click on the second
  edge of turn 5's line made those two edges solid in the same row, with no second row. A different edge played after
  them (candidate 2) made a fork: the line's way first, then the player's edge, both one step in. Pointing at a faded
  edge previewed the line on the board. The unit tests (`tree.test.ts`) check the rows for a line past a branch, a line
  that parts from it, a line that starts elsewhere (as after a change of the line), and no line.
- **Not checked** in the browser: a change of the line during a search. The tests cover the rows it gives.

### One tab for each game's review (2026-10-13)

- **The problem:** two tabs on one game store the branches over each other (each tab stores its own set whole after
  each change), and run the engine twice on the same positions. A review open on a game deleted on the home page
  stored its branches again after the delete.
- **The options:** one tab for each game, with "Review here" to move the review (as WhatsApp Web's "Use here"). Or
  the branches synced between tabs, which keeps the double engine work and needs more code. Or the stored and the
  kept branches merged on each store, which brings back a branch deleted in the other tab.
- **Decided:** one tab for each game (design 11), with the Web Locks API. A review stores no branches for a game that
  is no longer stored.
- **Checked** in Edge, with two tabs on the same game:
  - The second tab showed "This game is open in another tab" and loaded no engine file.
  - Its "Review here" started its review. The first tab stopped its review and showed "This game is now open in
    another tab", with no error on the page and none in the console.
  - The first tab's "Review here" took the review back.
  - After the tab that held the lock closed, a new tab reviewed the game at once.
- **Not checked:** a game deleted while its review is open.

### The bookmarklet and the userscript tell when they are out of date (2026-10-13)

- **The problem:** a bookmarklet's code stays as it was when the player dragged it to the bar, and the userscript
  updates only when Tampermonkey checks. Neither told the player.
- **Decided** (design 11):
  - The bookmark is a loader: it loads its code from the site at each click, so it stays up to date.
  - Each tool sends its name and version with the game, after the `#`. The import page compares them with its own,
    and for an out-of-date tool says how to update it, with the review a click away.
  - The "no game found" message names the import page, in case meaf.us changed its page.
  - The userscript's update check reads `/hedge-school.meta.js`, the header alone.
- **Why a loader:** the version check needs the old code to still find the game. When meaf.us changes its page, an
  old bookmarklet finds no game and never reaches the site. A loader's code is the site's own at each click. The cost:
  one request to the site at each click, and a dependence on meaf.us sending no content security policy.
- **Checked** in Edge, against the local preview:
  - On the owner's finished game on meaf.us, the loader as the import page gives it loaded `/bookmarklet.js` from the
    local server, read the game, and gave the import address with `tool=bookmarklet`, `v=1` and the whole record. Its
    script element was gone after. Edge let the https page load the script from `127.0.0.1`.
  - With nothing at the address, the loader said that it could not load its code.
  - The built userscript, run on the same page with stand-ins for Tampermonkey's functions, sent `tool=userscript`
    and its code's version.
  - The import page: the current bookmarklet's and userscript's games opened the review at once. A bare record and an
    old userscript version each showed their notice, and "Open the review" opened the game (a click from a script:
    the browser tool's clicks did not reach the page in that run).
  - The unit tests: the header with the `.meta.js`, that the loader and the script parse, and the import page's
    reading of what the tools send (a record with spaces and "+", a bare record, current and old versions).
- **Not checked:** an install or an update in Tampermonkey itself, and a real click on the bookmark (the loader ran
  from a script).

### The board's line ends by visits only (2026-10-13)

- **Decided:** the line drawn on the board from a candidate pointed at or pinned shows every edge that the search
  trusts (25 visits through it, design 07), with no cut at 6 edges. The 6 was the site's own number ("three turns"),
  not KaTrain's or Lizzie's. The listed line, the engine's best line in the move list and the branch previews already
  ended by visits only.
- **Found with it:** pointing at the listed line past its 6th edge drew the later edges with no mover, so in no colour
  and with black badges: the movers came for 6 edges only. Fixed in `e916ee1`.

### A review shared by link, and the Greats in the review file (2026-10-13)

- **Decided** (design 13, item 8): a link that carries the game, the player's branches and the review's settings,
  after the `#`. The recipient's browser reviews the game again, with the sender's network and depth, so that the review
  is the same. The recipient's page says that before the review starts, and says when the settings change.
- **Why no results in the link:** the site stores nothing, so the link must hold all it shares, and a review's results
  are hundreds of KB (876 KB for 120 edges at two depths). A record is about a thousand characters. Instant reviews
  would need a server that keeps review files. Lichess's analysis board takes a game's moves in its address in the same
  spirit, and analyses in the visitor's browser.
- **Measured** with the encoder (`share.ts`), on the sample game of 120 edges with meaf.us's tags: 653 characters for
  the whole link (the address's start is 47, the tags 227). A branch's edge in a line costs 3.36 characters, a new line
  from another position about 22. Within a Discord message (2,000 characters): one line of 403 edges, or 64 lines of 6
  edges, or 182 lines of 2. Earlier text forms: the plain record in an address, 1,778 characters, and compressed with
  deflate, 972.
- **Beyond Discord:** the part after `#` reaches no server, so only the browser and the channel limit it. Chrome and
  Edge take an address of up to 2 MB, Firefox stops showing one in its bar after about 65,536 characters, and Safari is
  reported to take 64,000 to 80,000 (published figures, not measured here). At 3.36 characters for each edge: about
  1,000 branch edges in 4,000 characters, 9,500 in 32,768, 19,300 in 65,536, and 600,000 in 2 MB.
- **Checked** in Edge: on the owner's game against areax (120 edges, 3 branch moves), the Export menu's new entry
  copied a link of 451 characters and said so. Opened on another address of the local preview (`localhost`, with its
  own storage), the page showed the game, its 3 branch moves, and the sender's network and depth (HedgeFund 0.1 Lite,
  512 visits). "Review it" kept the game under the same id with the 3 branch moves, and the review started: "Reviewing:
  the game's shape". The address lost its `#` at once. The unit tests check that a link comes back as it was (the
  order of the branches, their flags, a fork, a branch from the game's end), that a broken link says so, and the
  record's turns.
- **Not checked:** a recipient whose settings differ (the page's note and the change of settings), a site whose engine
  changed, and a link past 2,000 characters.
- **Found with it: the review file left out the Greats' confirmations.** A search of the position after the engine's
  second choice confirms a Great, and that position is neither the game's nor a branch's. The file carried
  only those, so an import with the same settings searched the confirmations again, at the review's depth: on the
  owner's game at 4,096 visits with the larger network, 5 searches ran after the import, behind the review's bar. The
  file now carries the results of the positions one move from the game's and the branches' positions.
- **Then decided: a review file's import takes its settings too,** as a shared link does: the file's network and
  review depth, when the site ships that network. Before, the review ran with the importer's own, and with another
  network or a deeper depth it searched again. Checked in Edge: with the larger network at Standard set, a file of the
  owner's game reviewed with HedgeFund 0.1 Lite at 512 visits set them to Lite at 512, and the home page said so, with
  "Open the review". Imported again, with the same settings now, the review opened at once.

### A deeper search where the player looks: kept, and said (2026-10-13)

- **The problem:** the position on screen, searched deeper than the review (by default 1,024 visits against Lite's
  512), replaces the position's result, and with it its labels, the report's counts and accuracy, and the chart, as it
  runs. But a review opened again took each position's result at the review's depth, so those changes went back after a
  reload, and a review file's deeper results showed only where the importer looked. It happens only when the position
  on screen's depth is above the depth that the review asks for that position (its own, or 1,024 for a key moment).
- **Decided** (design 09):
  - A review takes the deepest stored result of each position (`cacheGetAtLeast`), so a reload keeps what the player
    searched deeper, and an import brings it everywhere.
  - The Depth setting's help line says that a deeper search updates the review there.
  - The report says how many of the game's positions have a deeper result than the review asked for.
  - The page that will explain the review (backlog) says it too.
- **Checked** in Edge, on the owner's game against areax (Lite at 512, the position on screen at 1,024, 37 positions
  with a result at 1,024, 36 of them key moments): after a reload, the review opened complete, and the report said "1
  position was searched deeper than the review, where you looked". The Depth's help line shows in the engine settings.
- **A consequence:** a Great's confirmation compares the position after the played edge with the position after the
  engine's second choice, searched to the same budget. Where the player searched the first one deeper, the two
  searches differ in depth, as they did before within a visit.
- **Also:** the Export menu's link and review file each have a line on what the other end gets.
- **Also: the chart's first estimate** (design 06) is faint and solid now, not dashed: dashed, it read as the chart's
  dashed 50% line. Its legend says "Win chance, first estimate". Checked in Edge on a review that was still running.
- **Then decided: a Great's confirmation is as deep as the position it is compared with.** Where the player searched
  the position after the played move deeper, the position after the second choice is searched to the same depth, by
  doublings of the label budget, before the move is Great (design 10). Unit tests check the depth and that a shallower
  confirmation leaves the move Best. In Edge, a full review opened with no error, on a game that has no Great: the
  deeper confirmation did not run there.

### A game keeps the settings it came with, and the key moments go one doubling deeper (2026-10-13)

- **The problem:** an imported review file, or a shared link, set the browser's network and depth, so every later
  review used them until the player changed them back.
- **Decided** (design 13, items 5 and 8): the imported or shared game keeps its network and depth
  (`StoredGame.settings`), and its review uses them. The browser's settings serve every other game. In that game, the
  engine settings say so, show and change the game's two, and offer "Use my settings". Without a change of the
  player's settings, the pages no longer need to say one.
- **Checked** in Edge, on the local preview's other address with the browser set to the larger network at Standard
  (and the engine off): the share link's page said "The game keeps them for its review. Your settings for your other
  games stay as they are." After "Review it", the game kept HedgeFund 0.1 Lite at 512, and the browser's settings
  stayed. The game's engine settings showed the note, Lite and Lite. "Use my settings" dropped the game's settings,
  and the panel showed Standard and the larger network. The browser's settings were put back after.
- **Found: the key moments' 1,024 visits was a leftover, not a decision.** The first schedule (decisions/engine.md,
  "Label agreement against search budget") searched the position on screen and the key moments to 1,024, the
  reference depth of that measurement. When the engine settings made both depths settings (design 09), the key moments
  stayed at 1,024 with no reason given, so a review at 1,024 or deeper gave them nothing more.
- **Decided:** the key moments go one doubling past the review's depth, twice its visits (design 09). Lite keeps 1,024.
- **Then decided: no "Use my settings".** The settings kept in the browser are a convenience, the last ones chosen,
  like a cache of a preference: the site has no account to keep "my settings" as a promise. A button that treats them
  as the player's own settings promises what the site cannot keep. The game's engine settings say that it keeps the
  settings it came with, and a change there changes the game's only.

### The depths and settings in one document, and the Export's notes in a toast (2026-10-13)

- **Written:** design 16 puts every depth a review asks for, the deepest result each position uses, the Greats' equal
  searches, a game's own settings, and what a review file and a share link carry in one place, with ten worked
  examples. The owner found the interaction obscure from the separate designs.
- **Found while writing it:**
  - The report's note said "where you looked", but an imported review file's deeper results come from where the sender
    looked. It now says "searched deeper than the review, by the Depth of the position on screen".
  - A share link does not carry the sender's deeper looks: at those positions the recipient's labels are the review's
    own (design 16, example 9). A review file carries them.
  - A search stopped at its time limit changes the review while the page is open, and not after it opens again: the
    store keeps finished searches only (design 16, example 6).
- **The Export's notes:** a toast at the foot of the window, with a close button, in place of the short text beside the
  button, which had no room for a link's length or a warning. Checked in Edge: the copy of a share link showed "Link
  copied (451 characters). The recipient's browser reviews the game again." in the toast.

### Events for the decisions that wait on data (2026-10-13)

- **What the services gave:** Cloudflare's Web Analytics counts visits, pages, referrers, countries, devices and the
  pages' speed, and takes no events. Google Analytics counted page views. Neither told whether a visitor imports a game
  or finishes a review, or how long a review takes. Cloudflare's "Observability" is for Workers, and the site has none.
- **Decided** (design 17): events to Google Analytics, one for each decision, in counts and ranges, never a game, a
  name or a game's id. The review's address names its game after the `#` (`/review#game=ID`), which neither service
  records: Google Analytics records a page's query. The privacy page lists the events.
- **Checked** in Edge, on the local preview's other address, with a build that had a made-up measurement ID
  (`G-TEST000000`), so that the events went to the page's `dataLayer` and to no property of the site:
  - The home page set `games_stored` ("2-4"). An address with `?game=` became `/review#game=…`.
  - A review of 25 edges sent `review_open` (with its settings, `cores` "9-16", `edges` "1-29", `done_before` false),
    and at its end `review_done` (66 seconds, "1-2" minutes, `worker_speed` 35, `gpu_used` true). The machine was
    loaded, so that speed is no baseline.
  - The key list, opened twice, sent one `feature`. The two chart tabs sent theirs.
  - A change of the GPU setting sent `setting_change` (gpu, off, browser) and back. A share link copied sent `export`
    (link, "0-499", not too long).
  - A record pasted on the home page sent `import_game` (record, "1-29"), and its review `review_open` with
    `done_before` true and no `review_done`. A share link's page sent `share_open`, and a broken link `import_failed`
    (share_link, link).
  - A review address of a game that the browser lacks sent `engine_error` (load) at first: it now sends
    `game_missing`, and `engine_error` counts the engine's failures only.
- **Not checked:** `tool_out_of_date`, `gpu_test` (this browser had its GPU's test stored), `game_delete` and
  `game_restore` in the browser, and the events in Google Analytics itself, which waits on the release and the
  owner's registration of the parameters.
- **A parameter renamed:** `setting_change` sent the setting's new value as `value`. Google Analytics reads a parameter
  of that name as the event's worth, a number: the review's depth would have added up as worth, and a text value such
  as "off" may not show. The parameter is now `setting_value`. Design 17's setup now gives each registration's fields,
  the dimension's name and what the parameter holds.

### The site's own terms (2026-10-13)

- **The question:** the notices page showed the MIT licence, which a reader could take for the site's own licence. MIT
  would let anyone serve the site for profit.
- **Checked:** nothing that the site uses forces a licence on its code. The libraries are under MIT, the icon under
  Apache 2.0, and the engine's KataGo code under MIT. The site takes Lichess's accuracy formula and the behaviour of
  its board's notes, not lila's code, so lila's AGPL does not apply. The sounds are under the Pixabay Content License,
  which no licence of the site's can cover.
- **Decided** (design 11, item 10): the site's code, text and design are "© 2026 Yshan", all rights reserved, with no
  licence file while the repository is private. The notices page states this first. Its MIT text stays, under the
  heading "The MIT licence, of the works above": MIT requires its notice in every copy. The footer shows the copyright
  line. For a public repository later: PolyForm Noncommercial 1.0.0, with the sounds left out.
- **The game's designer:** the About page credited webgoatguy, and no other page did. The footer now ends "Enclosure
  by webgoatguy", beside the site's copyright line, so that the line does not read as the game's. webgoatguy has not
  spoken of the site. Thus the About page now says that the site is not an official site of the game, and is made
  independently of webgoatguy, meaf.us and Constellation.

### The theme: System, Light or Dark (2026-10-13)

- **Before:** the site followed the system's theme only (`prefers-color-scheme`).
- **Decided** (design 11, the header): a theme menu at the header's right, on every page: System (the default), Light
  or Dark, as MDN's header offers its theme. The header is the one bar that every page has: the review has no footer.
  The choice is kept in this browser's localStorage (`hedge-school:theme:1`), as the review's and the engine's
  settings are. The privacy page names it.
- **How:** the page's `data-theme` is always `light` or `dark`. The dark tokens are written once, under
  `[data-theme="dark"]`, and Tailwind's `dark:` follows the same attribute. A script in `app.html` sets it before the
  page draws, so a page never shows the other theme first. While the choice is System, the page follows a change of
  the system's theme at once. A visitor without JavaScript gets the light theme.
- **Checked in Edge:** with the system dark and no choice, the pages were dark and the button read "Theme: System".
  Light from the menu turned the page light at once, kept the choice, and the review page opened light. At 360 pixels
  the header overflowed by 16 pixels with the menu: its gaps are now 12 pixels on a phone (24 from 640 up), and it
  fits. At 320 pixels it overflows by 4 pixels, as it did before the menu. Not checked: a change of the system's
  theme while a page is open.

### The colours of the light theme: labels and notes (2026-10-13)

- **The problem:** the seven labels' colours and the four notes' colours had one value for both themes, chosen on the
  dark theme. On the light theme, measured by WCAG's contrast ratio: Good, Excellent and Inaccuracy as glyphs in the
  move list, on white, 2.2 to 2.8. The notes on the light board, 1.6 to 2.6. The muted text on the page, 4.2 (4.5 is
  the minimum for text).
- **How Lichess and chess.com do it** (read from Lichess's source, `ui/lib/css/theme/_theme.default.scss` and
  `_theme.light.scss`, and from chess.com's stylesheet, its `.light-mode` and `.dark-mode` blocks): each label has a
  value for each theme, in the same hue, darker in the light theme. Lichess lowers the HSL lightness by 10 to 22
  points (Inaccuracy 62% to 40%, Mistake 45% to 35%), to 3.3 to 5.0 against white. Chess.com takes its palette's next
  darker step, and leaves Good (#95B776, 2.3) and Inaccuracy (#E3AA24, 2.1) faint on white. Both keep the badges (a
  bright disc under a white glyph) the same in both themes, and both boards have their own setting, apart from the
  site's theme: Lichess's glyph badges on the board and its arrows have one colour each.
- **Decided** (design 03): as both sites, a fill and an ink for each label. The fill (`--best-fill`) is the badges'
  disc, in the report and on the board, and the meter's part: unchanged, the same in both themes. The ink (`--best`)
  is the glyph in the move list and the marks on the charts: the fill in the dark theme, and in the light theme the
  same hue darker, to 3:1 against panel-2, as Lichess reaches. The greens keep the dark theme's steps of lightness
  (OKLab distances 0.061 and 0.069, against 0.063 and 0.069): Best #147c2a, Excellent #4f8830, Good #6f935a,
  Mistake #d36e1e. Great and Blunder pass as they are. Inaccuracy at 3:1 was #ae8207, an ochre (as Lichess's Mistake
  in its light theme), and it did not read as yellow beside its badge. Of five golds between the badge's #d9a521
  (2.2:1 on white, chess.com's level) and #ae8207, #cf9b0a (2.5:1) was taken: still yellow, a little firmer than
  chess.com's #E3AA24 (2.1:1). The board stays with the theme, so the notes have a light board's value, in the same
  hues: 3:1 against it (#a66fd3, #a78202, #359a3b, #86868c). The muted text is #6a6c73 (4.5 on the page and on panel-2).
  The dark theme's values are unchanged.
- **Checked in Edge:** the dark theme's computed colours are the same as before. On the light theme the move list's
  `?!` and `?` read clearly, the report's badges and the board's badges keep their fills.
- **Seen on the way:**
  - **Great and Blunder against the dark board** were 2.6. The dark theme now brightens their fills a little, in the
    same hues, to 3:1 against it: Great #8a5cd1 to #9467dd, Blunder #d43a3a to #e24845 (OKLCH lightness +0.034 and
    +0.038). The white glyph on them stays at 4.0. Their ink follows the fill in the dark theme. The light theme keeps
    the old values, so that Blunder's red stays 4.7 against white for the error messages.
  - **Accepted:** the white glyph on the light badges (Good, Inaccuracy, Excellent) is 2.2 to 2.8 on both themes, as
    on Lichess and chess.com, whose badges are as faint.
  - **The badges on the last turn's halo:** every label badge on the board sits on the last turn's halo, which is
    yellow. Against the halo the badges are 1.0 to 1.7 on the dark board and 1.3 to 2.6 on the light board:
    Inaccuracy is almost the halo's colour on both, and Excellent on the dark board is 1.0. Only the badge's thin
    ring, in the board's colour, set it apart. Lichess puts its glyph badges on its last move's highlight too, and
    sets them apart with a drop shadow (chessground's `glyph.ts`: `feDropShadow` dx 4, dy 7, deviation 5, opacity
    0.5, on a disc of radius 50). Chess.com's icons have a darker lower edge drawn in. **Decided:** Lichess's shadow,
    scaled to the badge's radius of 0.36 (dx 0.029, dy 0.05, deviation 0.036), on both themes. The other ways seen: a
    dark ring (the hover's ring would need another sign), the halo in the label's colour (chess.com's tint, which
    still needs the shadow), another colour for the halo (yellow is both sites' last move).

### The labels' badges, drawn as shapes, and a choice of badges or text in the move list (2026-10-13)

- **The problem:** the badges' marks were characters of the page's font ("!", "?!", "??", "★", "✓") on a disc. At 9
  pixels each sat at its own weight and height. Chess.com's icons and Lichess's glyph badges on its board are drawn
  shapes. On the light theme the move list's Inaccuracy, darkened to 3:1, was an ochre beside the yellow badge.
- **Decided:**
  - **The marks are shapes** on a 24-unit square (`src/lib/review/labelShapes.ts`), white on the label's fill: "!" a
    bar and a dot, "?" an arc that turns into a stem and a dot, "?!" and "??" the single marks smaller side by side, a
    star, a check, and the thumbs-up from Material Design Icons. The strokes end square with rounded corners (a flat
    end, continued by a rounded box), the dots are boxes 8% wider than their stroke, and the check's elbow is round.
    They are drawn here: Lichess's glyph shapes are GPL-3.0 (chessground's `glyph.ts`), and chess.com's icons are its
    own. A darker lower edge, as chess.com's icons have, was tried and left out.
  - **The badges are the same everywhere:** in the report, on the board (with its shadow), and in the move list and
    the branches. A badge in the move list is 1.2 times the text's size: the rows stay 21 pixels high, measured on all
    25 rows of a game in Edge.
  - **A display setting chooses the move list's form** (design 06): "Badges" (the default) or "Text", the mark alone
    in the label's colour, as Lichess's move list shows it. In both, the mark and the hard position's ◆ sit in the
    same places: measured in Edge with the one swapped for the other.
- **The move list's text marks on the light theme, firmer:** "?!", "?" and "??" in the label's colour still read dim
  on white (Inaccuracy #cf9b0a at 2.5:1, Mistake #d36e1e at 3.5:1, Blunder #d43a3a at 4.7:1). Three strengths were
  compared in Edge, each as the font's characters and as the badges' drawn marks. Taken: the font's characters at
  Inaccuracy #bc8d07 (3.0:1), Mistake #bb5c03 (4.5:1), Blunder #c62b2f (5.5:1). Lichess's light theme has Blunder
  #d62929 (5.0:1) and Mistake #b37a00 (3.7:1). The dark theme is unchanged.
- **By edge, the label, the hard position's ◆ and the loss stand together at the move's right,** as a turn's do at
  the turn's right: the labels line up down the list, and the ◆ is as near the loss as by turn (4 pixels each). The
  ◆ is 0.8 of the row's text, from 0.7.
- **A badge that fell on half a pixel lost its lowest row:** its disc fills its square, and an SVG clips at its square.
  The badge's square no longer clips.
- **Kept as it is:** the engine's edges in the branches (75%) and the listed line until it is pointed at (70%) are
  faded by their opacity, so that they read as the engine's. On the light theme the white behind them makes them
  pastel beside the board's edges, and on the dark theme the dark behind them keeps them near the board's. Fading
  toward a fixed grey would look the same on both. The difference was seen and accepted.
- **Checked in Edge:** the seven badges at 120, 48, 24 and 16 pixels on both themes, and the move list, the report and
  the board's badges on both themes.

### The engine's terms on the notices page (2026-10-13)

- **Before:** the notices page said that the engine was built "from a fork of KataGo, under KataGo's licence", which
  reads as if the whole module, and the networks too, were under MIT.
- **Decided** (request 14, the engine repository's v2 design 21, and design 11, item 10): the engine and its networks
  are "© 2026 Yshan, all rights reserved", with Hedge School and its visitors permitted to serve and run them. The
  notices page gives the engine repository's wording, links the release's `LICENSE.txt` and `NOTICES.txt`, which the
  site ships beside the modules, and keeps KataGo's copyright notice with the MIT licence's text. The page's line on
  the other works now says that their licences cover neither the site nor its engine. Eigen is in the CPU module only.

### A review searched again after a release: the player is told why (2026-10-13)

- **The problem:** the stored results' keys name the engine's build, so after each release a game reviewed before is
  searched again. Nothing said why: the review page started its progress again, and the home page's Export said to
  finish the review "with the engine settings now".
- **Decided** (design 11, item 6): the site tells the player when the engine's build, or a network's file, changed
  since the game's last review (`reviewAgainWhy`): a dialog when the review starts, once in a visit for each game and
  build ("The engine was updated"), a line under the review's progress while it runs, and the home page's Export: "The
  engine was updated: open the game to review it again, then export." A network or a depth that the player chose has
  no notice.
- **Checked in Edge,** with the sample game's mark set back to build 632f2a0: the home page's Export said the update,
  the review page showed the dialog and the line, and the review marked the game with build fdfe5ad again. A second
  opening in the same visit showed no dialog.

### Links from another site, and reviews saved back (2026-10-13)

- **The request:** enclosuregame.com, a site where Enclosure is played with accounts, asked for a button on its
  finished games that opens their review here, and proposed `/review#pgn=…`.
- **Decided** (design 18): the link is `/import#record=…`, with an optional save page for a partner site. The name
  `pgn` is not read: the name PGN means chess. A web address in the record's `Site` gives the review a link back. A
  record with a `Rules` or `Position` tag is refused. For the partner's stored reviews, the review file goes back, not
  the annotated record: the player chooses "Save to enclosuregame.com" in the Export menu, and the file goes by window
  messages to the partner's save page, which the site opens at the click. A saved review opens again by the same
  messages the other way: the partner's page opens `/import#from=` and its origin, and sends the file when the import
  page asks. Then the partner builds both buttons in one release. A new page, /developers ("For developers", Lichess's
  name), describes the link and both handshakes, with what can change: lenient reading, additions only, a versioned
  handshake (`protocol: 1`, since the review file has a `version` of its own), the review file stored as it is, and a
  list of changes. The notation page describes the record only, as the engine repository decides it.
- **Why so little is shared:** each change that both sites must make costs both a release. The link and the record
  are this site's reading, and the labels, the engine and the review stay this site's alone.
- **Checked in Edge,** with a local test site on another port and a test build that counts it as a partner: its game
  page's button (a link of 801 characters, 60 edges with tags) imported the game and opened its review with no notice,
  and the report showed "View this game on 127.0.0.1". With the review done, the Export menu listed "Save to the local
  test site" first. Its save page opened, received the review file (`protocol: 1`, its name, the record with its tags,
  254 analyses), stored it and answered, and the review showed "Saved to the local test site." A link with `Rules
  "Race to 2000"` gave "This game is played by other rules (Race to 2000). Hedge School reviews games of the online
  rules only." A link with `pgn=` gave "the link has no record=, which carries the game". The same button, clicked
  again in the same browser, opened the finished review within 4 seconds. The /developers page has no sideways scroll
  at 360 pixels, and its footer wraps to two lines. The test site's "Open in Hedge School" opened this site on another
  port, a browser with no game: the review opened finished, with no search, and the browser's results grew from 126 to
  380, the file's 254. The game kept its save page and the link back. The import page opened with no tie to a page
  said "the local test site's page is gone, or did not let this page answer it", and a link from a site that is not a
  partner said "the link names a site that is not one of Hedge School's partners". `npm test` passes 73 checks, 7 new.
- **The sending site in Google Analytics:** the property's 10 sessions so far are all direct, so its data could not
  tell. A test visit from a page on another origin to the live import page sent a page view that named that page as
  its referrer (`dr`), as a session's start, and Realtime counted the view. Realtime shows a visitor's first source
  only. The session's source shows in the standard reports once Google has processed the day.
- **The import's parameter renamed `import_source`:** the day's Traffic acquisition report, by session source and
  medium, had 6 sessions "(direct) / (none)", 9 "(not set)", and 4 with the source "userscript", the value of the
  import events' `source` parameter. Google Analytics read that parameter as the session's traffic source, as it keeps
  a visit's source in parameters of that name. A partner's link would have shown as "site_link", not as the partner's
  site. The events now send `import_source`, and design 17's setup registers the dimension Import source on it.
- **A partner tests against the preview:** a build of a branch other than `main` also counts a partner's pages on
  the developer's own computer (`localhost`, `127.0.0.1`, over http) as a partner's, so that a partner can test
  before its own site is live. Checked by building as Cloudflare builds each branch: the `dev` build has the test
  partner, the `main` build and a plain local build do not. The /developers page names the live address in its
  examples and tells a partner to ask for the test address, so that the preview stays unlisted.
- **Then a branch of its own for the test:** the `dev` preview's address, once given to a partner, could not be taken
  back, and it would keep showing every later change. Only the branch `partner_test` now takes a partner's localhost
  pages. A partner gets the address of one of its deployments, which shows that deployment only, and which deleting
  the deployment withdraws. The `dev` preview takes the partners' own https hosts only, as the live site does.
- **Buttons for partners, as a kit:** a widget (a script from this site that draws the buttons) was judged too much
  for one partner: this site's code in the partner's pages, and a larger shared part. The /developers page now gives
  four labels with the collie ("Review in Hedge School", "Review", "Open in Hedge School", "Open"), the head as a file
  with its terms, a sample style and the markup. Testing has its own section. In Edge, the buttons show on a white
  and a near-black strip, 33 pixels high with the head at 22.5. Inline code now breaks where it would leave the page:
  `/import#from=` with the live address had made the page 415 pixels wide on a 360-pixel phone, on the live site too.
  At 360 pixels the five pages about the site now fit.
- **Not checked:** enclosuregame.com's own pages, which are not built yet, and the handshake in browsers other than
  Edge.

### The school's colour: lavender (2026-10-13)

- **Why a decision:** the partners' buttons carry a default style, so its colour becomes the school's on other sites.
  The site's teal was the first interface's accent, never chosen, and the logo (design 12) is black and white.
- **Compared** on a page with each style on a white, a near-black and a green page: black and white from the logo,
  a black and white pair, the teal, and two lavenders. On a black button the collie's coat merged into the button.
- **Decided** (design 12): lavender is the school's colour, the site's accent in both themes (`#6f5aa8` light,
  `#b8a6e8` dark), and the partners' buttons default to the pale lavender with near-black text. Text on the accent
  takes `--on-accent`. In the dark theme it is near-black: white on the earlier dark teal was 2.5:1, and near-black on
  the pale lavender is 8.2:1.
- **Seen in Edge, both themes:** the home page, the import page, the developers page and a review of 120 edges. In
  the light theme the chart's score line, in the accent, looked like the magenta area line, so it keeps the teal as
  its own colour (`--score`). The accent marks controls, never a move, and Great's purple is more saturated than the
  lavender.

### The explorations in Google Analytics (2026-10-13)

- **Made in the property:** the three calculated metrics (the averages of review seconds, worker speed and GPU speed
  ratio, each a total over the event count) and six explorations: "Funnel: where do players drop off?" (tabs "From the
  visit" and "By way in"), "Engine defaults: are they right?" (four tabs), "GPU: does it pay off?", "Features: which
  earn their place?" (two tabs), "Settings: do the defaults fit?" and "Imports and shares: do they work?" (five tabs).
  Each tab was read back after it was set: its rows, columns, values and filter match design 17.
- **The funnel's breakdown by import source starts at the import:** Google counts a player under the first value of
  a breakdown, and the first step, a page view, has no import source.
- **The filters are per tab.** Two tabs had none at first ("Machines", and an empty fourth tab of the engine
  defaults), so they counted every event. Both now filter as design 17 says.
- **Empty at first:** the parameters were registered on 2026-10-13, and **Last 28 days** ends the day before. The
  tables fill from the next day on.
- **Design 17's steps now follow what Google Analytics shows:** **Confirm** in the dimension and metric lists, a tab
  renamed by its name's text box, **+** with a list of techniques, and boxes to click for rows, values and filters.

### Analytics parameters named by their subject, and the data collection settings (2026-10-14)

- **The risk:** a custom dimension takes its parameter from every event that sends it. `kind` already held an export's
  kind and an engine failure's kind in one dimension, and `name`, `reason`, `scope`, `outcome`, `tool`, `too_long`
  and the metric `ratio` would mix any later event's values of the same name.
- **Renamed** while the property held one day of data under the old names: `export_kind`, `error_kind`,
  `feature_name`, `import_failure`, `setting_scope`, `gpu_outcome`, `stale_tool`, `link_too_long`, and the metric
  `gpu_ratio`. The event names stay: none is one of Google's reserved names, and a renamed event would need its key
  event marked again and every exploration's filter changed.
- **In the property:** the seven dimensions and the metric on the old names archived, nine definitions created with
  the same display names (an archived name can be used again), the calculated metric "Average GPU speed ratio" pointed
  at the new metric, and the explorations that used archived dimensions (GPU, Features, Imports and shares) given the
  new ones. Each was read back after a reload. An exploration keeps a new variable only once a tab setting changes
  after it: a reload right after **Confirm** lost it twice.
- **The features documented by name** in design 17, as the code sends them: twelve actions, the two chart tabs, and
  `display` with each of fifteen display settings.
- **The data collection settings** (design 17, step 7): Google signals and user-provided data collection off, granular
  location and device data on, ads personalization off. If the site ever serves ads, Google signals goes on with a
  change of the privacy page in the same release.
- **"(not set)" for the import source** in the first day's imports: those events came before the release that sent
  `import_source`, and before its dimension was registered. The live site's code sends `import_source` only.

### Hedge School's place: a school for every play site (2026-10-14)

- **The question:** enclosuregame.com, a play site with accounts and matchmaking, will add tools as Lichess did.
  Hedge School runs no play, and later needs a backend, accounts, and human games for its puzzles.
- **Decided** (design 19): Hedge School is a school for every play site. It reviews, explains and teaches (lessons,
  puzzles, studies), and runs no play. Its edge is teaching: the engine, the explanations and the teaching material.
  Static files and the browser first: lessons, puzzles from the player's own games, a chosen set of puzzles as files,
  studies as files and links. A light backend on Cloudflare (Workers, D1) when a feature needs shared data: optional
  accounts, puzzle ratings from attempts, shared studies. Human games by agreement: play sites, the meaf.us archive
  with its owner's permission, and players who give a game.
- **Left open** (the open items, "Hedge School's place"): the licence of the engine's networks, an open database of
  enclosuregame.com's games (wait to see whether it publishes one), and a partner's sign-in for accounts.

### A review by an earlier engine opens as it was (2026-10-14)

- **The question:** after a release, a game reviewed before was reviewed again when opened, at the cost of a full
  review, though the earlier results were in the browser. A player may want only a quick look.
- **Decided** (design 20): such a game opens as a snapshot of its last review, from the stored results, with the
  engine's rules alone. A snapshot searches nothing, adds no move, changes no branch, and does not export. A bar says
  when and with what engine it was made, and Review again reviews the game with the site's engine. Without the earlier
  results, the game is reviewed again with a notice, as before. Imported review files and reviews kept by a partner
  site open the same way. Precedent: Lichess keeps a game's computer analysis as it was made, and KaTrain opens a saved
  analysis as it was.
- **Rejected:** the site's engine for what the player explores in a snapshot (labels between two engines' values),
  exploration without labels, and a snapshot's export (it holds nothing new: Review again, then export).
- **Checked** in a desktop browser on the two games that this browser held from the earlier engine: both opened as
  snapshots, with their labels, report and chart. Space (a candidate's move) was refused, Export was off with its
  reason, and Review again reviewed the game in place and replaced the mark. Not checked: an imported file from an
  earlier engine, a review sent back by a partner site, and a game whose earlier results are missing.

### One save to a partner site, which updates (2026-10-14)

- **The question:** whether a partner site needs "Save" and "Save as new", for a saved review opened, explored more,
  and saved again.
- **Decided** (design 18): one "Save to", which sends the game's whole review so far. Its branches hold the earlier
  save's, and its results only grow, so it replaces the earlier save. A partner that wants a history keeps versions.
  The partner passes `save` on its open link too, so that a reopened review can be saved again. The page /developers
  says both.

### The Analysis board (2026-10-14)

- **The question:** how an analysis board differs from the review, since Lichess and chess.com have both and they look
  alike.
- **Decided** (design 21): the review judges a game played, and its line is the game. The board explores: the
  standard start or a line brought in, the engine on the position on screen only, the player's main line ("Make main
  line"), labels only where the player asks ("Evaluate quality"), no report, chart or progress. One board in each
  browser. A link carries its tree, and the record carries its lines as variations with the result `*`. "Analyze"
  beside "Review" opens a pasted record on the board. The early access shows it.
- **Waiting:** the board editor and starts from another position (the record's `[Position]` tag), for the engine's
  check that a position could occur (request 16).
- **Also:** a line's last position counts as the result only when the game is over there. A review of an unfinished
  game now searches its end, so that its last move gets a label.
- **Checked** in a desktop browser: moves extend the main line, a variation and "Make main line", "Evaluate quality" on
  a main-line move (its label and mark), the record and the link (the link opens the same board, after the question),
  "Analyze" on the home page, the board kept across a reload, a phone's width, and a finished game's review unchanged.
  Not checked: another network or the GPU on the board, and a long line's speed.

### The site's pages and their addresses (2026-10-14)

- **The question:** `/import` took every game that came in and led only to the review. The Analysis board is a second
  place for a game to go, and more pages will follow.
- **Decided** (design 22): each page takes its own way in after the `#`: `/review#record=`, `#packed=`, `#from=`, and
  `/analysis#record=`, `#packed=`, `&at=`. A parameter is named by its payload's format (`record`, `packed`), as
  Lichess's `/analysis/pgn/` and Excalidraw's `#json=` are. `/import` is deprecated: it forwards to `/review` during the
  early access, and the page for developers says a month before when it stops. The meaf.us tools' page is `/tools`. The
  analytics start once a page has taken a game out of its address.
- **Also:** the Analysis board exports its analysis as the review does: a link, an analysis file with the engine's
  results, and the annotated record. The first export, of the lines alone, was a board editor's output.
- **Checked** in a desktop browser: `/import#record=` forwards and reviews the game, `/import` goes to `/tools`, a
  review's shared link (`#packed=`) opens and reviews, `/analysis#record=` with `at=` opens the line at its place after
  the question, and an analysis file exported and opened on the home page gives back its lines. Not checked: the meaf.us
  tools on meaf.us, and a partner's page.

### One import, to the review or the Analysis board, and the Review tab (2026-10-14)

- **The question:** a game brought to the review and a game brought to the Analysis board are the same act, an
  import, but the events named it two ways (`import_game`, `analysis_open` with its own sources), and their values
  mixed places, formats and media (`home`, `record`, `file`).
- **Decided** (designs 17 and 22): one event, `import_game`, for every import, with `import_to` (review, analysis)
  and `import_source`, each value one way in (`pasted_record`, `review_share_link`, `partner_review`…). The same for
  `import_failed`. Export kinds name their product (`review_file`, `analysis_file`, `record_copy`…). A shared review's
  page is `review_share_open`. `analysis_open` counts the board's opens.
- **The pages:** the Review tab (`/review` without a game) holds the review's import (a pasted record, a review file),
  the last review and the player's games. The Analysis board has its own Import. Home says what Hedge School is, and
  leads to both.
- **`/import`:** a link that still uses it warns in the review's console, and counts (`import_forwarded`), so that
  the forwarding stops when no link uses it.
- **Fixed:** the review reloaded itself without end on its own address after the first change of its reload check.
  It now checks only once the page has chosen its game. A game's link in the Review tab loads the page.

### Import and Load, Tools in the header, and Constellation on the notation page (2026-10-14)

- **The question:** "import" named two acts. A game from outside Hedge School brings moves, and the engine does the
  work. A review file or an analysis file brings Hedge School's own saved work, with its lines and results.
- **Decided** (designs 22 and 17): **Import** for a game from outside (a pasted record, Constellation's export,
  another site's record link, the meaf.us tools), and **Load** for saved work (a review or an analysis file, a share
  link, a partner's kept review). Desktop programs make the same cut, as Open and Import. "Open" already names other
  acts here, so the site says Load. The Review tab has "Load a review file". The board has Import (moves pasted) and
  Load (an analysis file) beside Export. The events follow: `import_game` and `import_failed` for imports,
  `load_saved` and `load_failed` with `load_source` for loads. A load's source says where it went, so it needs no
  destination. The funnel's second step takes both on the review's page.
- **The board's Import box** asks for "Moves from the start": a game record, finished or not, or a plain list of
  edges. "A game record" alone read as a finished game.
- **Tools in the header,** beside The notation and About, from a tablet's width: on a phone it would add a row to
  the header, and the tools are for a computer's browser. The footer has it on every width.
- **Constellation's export** is no longer named in the import boxes, the About page or the Tools page. The notation
  page describes it in "Columns with I": a notation whose columns have `I`, read in the forms that the site knows.
  meaf.us and Constellation are links where a page first names them.
- **The About page's early access** says first that everything can change: the pages and their addresses, the labels,
  the engine, the files and links, and what the browser keeps.
- **Checked** in Edge on the local build: the header at 360, 412, 768 and 1280 pixels, the links, the board's Import
  box and the notation page.

### The board editor, and the board from a set-up position (2026-10-14)

- **What:** Lichess's board editor for the Analysis board (design 21), on the engine's release `27a7414` (request 16:
  the position check, protocol 0.5).
- **Decided:**
  - **Its own page,** `/editor`, as Lichess's (design 22 had reserved the address). The board's Import links to it
    with the position on screen, and its Analyze opens the board from the position it made.
  - **Three tools,** Blue's edges, Red's edges and the marks, each by two clicks on an edge's points. The same edge
    again removes it. A mark is an edge of the turn, written `*` or `+` from its player and the mover, so the page
    asks one thing of the player: which edges belong to the turn. The edge count fixes the mover and its edges left,
    so the page has no mover field to contradict it.
  - **The engine is the judge:** it draws each change and checks it. A position that no game reaches shows the
    engine's reasons, with their edges lit, and cannot be analyzed. The page computes only the notation's turn
    structure.
  - **The board's start** is sent with every query and named in the stored results' keys. The record's `Position`
    tag, the share link's tags and the analysis file carry it. The turns number from the start's turn.
  - **The Import has a position field** beside the moves, as Lichess's board has its FEN beside its PGN.
- **Analytics:** `editor_open`, `editor_analyze`, and the import source `pasted_position`.
- **Checked** in Edge on the local build: the editor's tools, the check's reasons with their edges lit, the notation
  page's example position pasted, Analyze into the board, a move played from it ("3. … D10-G12", turn 4 next), the
  annotated record with its `Position` tag and "3... D10-G12", the share link opened again with its start and its
  stored search, the Import's link to the editor at the position on screen, the editor at 360 pixels, a position
  imported through the Import's position field, and an analysis file of a set-up board loaded with its start and its
  stored result.
- **Then, from the first look:**
  - **The board's New menu,** beside Export: Standard start, Board editor, Import a position or moves, Load an
    analysis file. The board keeps its analysis, so it needs a way back to an empty board, which before went through
    the editor. The editor's entries: this menu, the Import's link, and a home page card.
  - **The editor's Copy,** beside its position field.
  - **The Import's moves field** says only what it takes: a line on leaving it empty read as Cancel's job.
  - **The standard start written out** is no set-up start, so a board from it keeps the standard start's results.
  - **Checked** in Edge on the local build: the menu at 1,400 and 360 pixels, Standard start from a set-up board (its
    stored result at once), Copy, and the home page's three cards.

### What Cloudflare shows, and its alerts (2026-10-14)

- **A correction:** the entry "Events for the decisions that wait on data" says that Cloudflare's "Observability" is
  for Workers. That is the Observability under **Compute**. The account's own **Observability** (Logs, Analytics,
  Alerts, Dashboards) covers the Pages site too. It takes no events, so the events stay with Google Analytics (design
  17). [hosting.md](../hosting.md), "What Cloudflare shows", tells what it gives.
- **What the data showed,** from the zone's setup on 2026-10-12 to 2026-10-14:
  - 228 answers of 5xx, all on 2026-10-12, during the setup. The 525s came from the bare domain's old parking records,
    and the 522s from the custom domain's certificate check. None since.
  - About 24% of the requests got a 404, most of them from scanners (`/.env`, `/wp-config.php`, `/.git/HEAD`). Also
    `/sitemap.xml` (58) and `/favicon.ico` (51): the site has neither.
  - A crawler asked for `LICENSE.txt` and `NOTICES.txt` under `/_app/immutable/nodes/`. These are names in the notices
    page's code, read as links.
  - Cloudflare blocked 26 requests: 25 by the free managed rules (POSTs to `/` and the scanners' paths), and 1 by the
    browser integrity check.
  - Verified bots made requests although each page has `noindex`: 88 by AI search, 21 by AI crawlers and 11 by search
    engines and SEO tools.
  - One address asked for `/hedge-school.user.js` every 15 seconds on 2026-10-13 (28 requests), on the live site and
    on the `partner_test` preview. The 404s of `/developers` in the error dashboard (14) came from the same kind of
    polling on that preview. These were scripts that waited for a deploy, not visitors.
  - Web Analytics: one visit came from `www.enclosuregame.com`. The worst Core Web Vital was a CLS of 0.151 on
    `/review` ("needs improvement" is above 0.1), from the board's column (`section.board-col`).
- **Set:**
  - **Alerts by email** to the account's address (hosting.md, section 6). A failed deployment, of production or of a
    preview. A success sends none, because each push to `dev` builds a preview. The zone's Universal SSL certificate.
    And a custom alert on Pages' own 5xx, 3 or more in 5 minutes on the live site.
  - **The 5xx alert counts the origin's status,** not the edge's. The table that it queries (`events.httpRequests`)
    has rows with the edge status 504 that Logs and the dashboards do not show. For those requests Logs shows 404.
    Over 3 hours they reached 7 in one interval of 5 minutes, while Pages gave no 5xx.
  - **The dashboard "Error monitoring",** from Cloudflare's template.
  - **The Pages build cache** (beta): Pages keeps npm's cache between builds (hosting.md, section 3).
  - **The cache rule for the meaf.us tools' files** (hosting.md, section 2). The three files now reach the browser with
    `no-cache`, as `_headers` asks.
- **Not set:** the weekly Web Analytics email ([open-items.md](open-items.md), "Foundations").
- **To do:** the layout shift on `/review` ([open-items.md](open-items.md), Milestone 1).

### Search engines in, and link previews (2026-10-14)

- **Decided** (design 23): the live address is indexed from now, in the early access. Cloudflare's own addresses stay
  out (`X-Robots-Tag: noindex` by host in `static/_headers`), and each page names its live address as canonical.
- **Each page** has a title that names the site, a description that names Enclosure, the canonical address and Open
  Graph's tags (`PageMeta.svelte`). One preview image for every page, 1,200 × 630 pixels, drawn by Edge from
  `scripts/social-card.html`. A sitemap, and structured data on the home page.
- **Found on the way:** `robots.txt`'s `Disallow` hid the pages' `noindex` from search engines, so a linked page could
  show in results as a bare address. And `/review` prerendered with a game's title and no description: it now
  prerenders as the Review tab.
- **Checked** on the local build: the built pages' tags (home, the editor, the Review tab, `/import` with `noindex`),
  the sitemap, the structured data, and in Edge one title and one description on `/review`, with "Game review" once
  a game opens. Not checked: a preview in Discord, and the headers on Cloudflare (after the release).
- **For the owner:** register the site in Google Search Console and submit the sitemap (design 23, item 10).

### Persistent storage, games that end early, and a page that explains the review (2026-10-14)

- **Persistent storage** (design 11, "Storage that the browser keeps"): the site asks the browser to keep its data
  when the player keeps something, and the Review tab says what the browser answered. Without it, a browser may clear
  the games when its disk is almost full, and Safari after seven days without a visit.
- **A game that ends early** (design 10, special cases): the review names the end from the record's result ("Blue won:
  Red resigned after edge 6"), and the last position, which the rules did not end, shows its search and its status
  ("The record ends here"). Before, the report said "won by 0.0 points" from the board's scores, and the last position
  read "Game over". Its last move already had a label from a search of the last position, since unfinished games are
  reviewed.
- **How a review works** (`/how-reviews-work`, design 22): the searches, the labels and their bands, Best and Great,
  the accuracy with Lichess's formula and KaTrain's weights, hard positions, the meter and the key moments, with the
  sources they follow. Linked from the review's report, the About page and the footer, and in the sitemap.
- **Checked** in Edge on the local build: the Review tab's storage line (persistent in this Edge), a record ending
  `b+R` ("Blue won: Red resigned after edge 6", and "The record ends here" with the last position's search), and the
  new page. Not checked: a browser that refuses persistent storage, and Firefox's question.

### The review's layout shift, and a shorter footer (2026-10-14)

- **Measured** in Edge with the browser's layout-shift entries, which name each element that moved. Cloudflare's Web
  Analytics had a CLS of 0.151 on `/review`, from the board's column. A stored review in a window of 1,366 × 657
  pixels, a common laptop's, gave 0.114:
  - every column moved 8 pixels sideways when a scroll bar came and went while the page loaded;
  - the report's table moved 60 pixels down when the review's progress and the note on deeper searches came, and back
    up when the review ended;
  - the side panel moved 10 pixels when the likely edges' meter came with the first search;
  - the move list's rows moved as the stored labels' notes came, one by one.
  The Review tab gave 0.038: "Continue your last review" came after the page, and pushed it down 72 pixels.
- **Fixed:**
  - the page keeps the scroll bar's room (`scrollbar-gutter: stable` in `src/app.css`);
  - the review's progress has one slot of one height, while it runs and after ("Review done: 512 visits a move.");
  - the meter has its place before the first search, as an empty bar;
  - the review shows once its stored results are read (`fromStore` before the first frame, `preloaded` in
    `src/routes/review/+page.svelte`), so a review opened again shows its labels, notes and report at once;
  - the Review tab shows once its games are read.
- **After:** 0.0023 at 1,366 × 657, 0 at 1,427 × 849, 0.0001 at 390 × 760, 0 for the Review tab and the Analysis
  board. A review still running moves its move list as its notes come: they are its news.
- **Load time kept:** the stored results are read while the engine starts (`warmCache` in
  `src/lib/analysis/cache.ts`), not after the rules, and the cache now remembers the keys that it did not find. The
  review shows 14 to 24 milliseconds after its rules are ready (0.6 to 1.2 seconds after the page opens), where a read
  after the rules took about 50 milliseconds for 120 positions among 5,291 stored results. The page marks both times
  in the browser's performance timeline (`review:rules`, `review:shown`). The Review tab waits a few milliseconds for
  its games.
- **The other costs:** the progress slot keeps its height after the review ends, its bar full. With a scroll bar that
  takes room (Windows), a page that does not scroll keeps an empty strip at its right edge.
- **The footer** holds only the pages that the header lacks: How reviews work, For developers, Privacy and Notices,
  and Tools on a phone. About and The notation are in the header.

### A skeleton while the review starts, and the time before it shows (2026-10-14)

- **The skeleton** (design 06, item 10): the review's layout, with the empty board and grey bars, from the moment the
  page's code runs until the review shows. Before, the page showed one line of text, "Reading the game with the
  engine's rules…", then the whole review.
- **Checked** in Edge on the local build, in frames of 1,366 × 657, 1,000 × 700 and 390 × 760 pixels: the board, the
  row above it, the charts' area and the columns have the same place and size in the skeleton and in the review. On
  the phone's width, the analysis panel under the board is 683 pixels high in the skeleton and 658 in the review.
  Layout shift on a full load of a stored review: 0.0001.
- **Where the time goes** before a stored review shows, measured with marks in the page on the same desktop (16
  cores). The marks were taken out after:
  - The page's code starts 90 to 550 milliseconds after the address is opened. On full loads, the 35 script files
    (482 KB) came out of the browser's cache until about 340 milliseconds, and the first paint was at 264 to 392
    milliseconds.
  - Reading the game, the tab's lock and the engine's manifest: 60 to 100 milliseconds, one after another.
  - The rules worker's start: 55 to 240 milliseconds.
  - The rules' description of every position: 160 to 285 milliseconds. A worker alone did it in 118 milliseconds.
  - The stored results and the first frame: 10 to 56 milliseconds. The review's first frame is one task of 109 to 144
    milliseconds.
  - With one search worker or four, the rules took the same time.
- **Request 18** asks the engine repository for every position of a game in one request, without the legal moves.

### An icon at /favicon.ico (2026-10-14)

- **The problem:** Cloudflare's logs showed about six answers of 404 a day for `/favicon.ico`. The HTML standard lets
  a browser ask for that address when a page names no icon, and bots ask for it without reading the page. The
  site's fallback page for an unknown address (`404.html`) names no icon before its code runs.
- **The change** (design 12): `static/favicon.ico`, the head at 16, 32 and 48 pixels, drawn by `scripts/favicon.mjs`.
  The pages name it in the place of the 32-pixel PNG (`favicon-32.png`, removed), as Evil Martians' "How to Favicon"
  advises. The SVG icon stays for the browsers that read it.
- **Checked** on the local build: `/favicon.ico` answers with `image/x-icon`, three images, 4,431 bytes. Each image
  has a clear background.

### The settings of an export from the Review tab (2026-10-14)

- **The problem,** found by a code review: a game that keeps its own settings (from a review file or a shared link)
  reviews with them on the review page, while the site still ships their network. The Review tab's Export took the
  game's settings without that check, and the annotated record from the store (`annotatedFromStore`) took the
  browser's. With the browser on another network than the game's, Export opened, and the annotated record read the
  other network's results and failed ("open the game to review it first").
- **The change:** one rule, `settingsFor` in `analysis/engineSettings.ts`: the game's own settings while the site ships
  their network, else the browser's. The review page, the Review tab's Export and the annotated record take them from
  there. Its tests are in `engineSettings.test.ts`.
- **Checked in Edge** on the local build, with the browser on HedgeFund 0.1 and a game that keeps HedgeFund 0.1 Lite at
  512 visits: the Review tab's Export copied the annotated record, "Reviewed by Hedge School with HedgeFund 0.1 Lite".
  The failure before the change came from reading the code, and was not reproduced.

### Practice designed (2026-10-14)

- **What:** Practice, a game against HedgeFund in the player's browser, on the engine repository's practice bot
  (request 15, release `wasm-v2-engine-54486cd`). Design 24 gives the decision.
- **Decided:**
  - One game in progress, kept in the browser and resumed, as the Analysis board keeps its board. A new game asks
    first, and keeps the unfinished one in Your games, with the result `*`.
  - A finished game goes into Your games at once, as Lichess keeps every game against the computer.
  - The bot's settings, named for what they are, until levels rest on data: the network, the visits by doublings from
    1 to 1,024 (64 by default), and a variety (the move temperature: Low is KataGo's default, then Medium and High).
  - The settings are fixed for a game, as Lichess fixes the computer's level.
  - The player's side has a name that the player sets, "You" without one.
- **Taken from Lichess:** the side (Blue, Red or Random), takebacks, no evaluation during the game, and "Play
  HedgeFund from here" on the Analysis board (Lichess's "Continue from here").
- **The site's own:** the temperatures of Medium and High, to check once games by setting exist.

### Practice built (2026-10-14)

- **What:** the page `/practice` as design 24 gives it, on the practice bot of release `wasm-v2-engine-54486cd`. The
  header names it after Analysis, and the sitemap lists it.
- **Where the bot runs:** in the first form that starts, in this order: the threaded bot on the GPU (where the engine
  settings allow it, and with Auto not where the GPU's first-use test found it slower, design 15), the threaded bot on
  the CPU workers (two search threads for each worker), and the one-thread bot. A browser without JSPI starts the
  one-thread bot. The line under the page's title says which form runs.
- **Changed from the design while built:**
  - **No set-up start:** the bot has no command for one (request 20). Practice takes a record's moves from the
    standard start, and the Analysis board's Play button is off on a board with a set-up start.
  - **No visits during the search:** GTP's `genmove` answers only with the move (checked: `kata-genmove_analyze`
    gives its lines only with the move too). The page shows the bot's seconds instead. No request for the visits.
- **Changed after the first look at the page:**
  - **No takebacks:** the player steps back through the positions instead, and moves only at the latest one. This
    departs from Lichess, which offers takebacks against the computer.
  - **Abort and Resign in the place of New game:** Abort at any time keeps the game in Your games as unfinished
    (`*`). Resign at any time gives HedgeFund the win (`r+R` or `b+R`).
  - **The card as Lichess's "Play with the computer":** the side starts the game, each side with its dot.
  - **The review's layout and parts:** the players' row with the points and the areas, the board as large as the
    window lets it be, the side column at Lichess's width, and the review's display settings where they apply. The
    players' row and the settings' rows are now components that the review and Practice share.
  - **The bot's name gives the variety:** "HedgeFund 0.1 Lite, 64 visits, Low variety".
  - **Play on the Analysis board** moved out of the New menu, beside it: New makes a new board.
- **Changed after the second look:**
  - **Take back again,** by turn, as Lichess's, beside Abort at any time. Lichess offers Abort only before the first
    move. Here Abort at any time stays: a game has no clock and no opponent who waits, and the aborted game is kept
    for its review. Abort and Resign turn red under the pointer.
  - **The review's move list, chart and bar, shared:** the move list's look (`moveList.ts`), the win bar and gauge
    (`ShareBar.svelte`) for Practice's points, and the Advantage chart for the points lead (filled in the colour of
    the side ahead) and the area difference, over the game's 120 edges.
  - **The bar centred on the board,** in the review and on the Analysis board too (design 06).
  - **The areas against each player's own points,** in a second lane under the points bar. The areas against the
    whole board barely showed: 7 and 57 of 324 at edge 60 of the sample game.
  - **The card's heading is "Practice against bot":** the network's choice names the bot.
  - **Notes on the board,** as in the review: the board takes them when the page passes them, and the first page did
    not.
- **Changed after the third look:**
  - **The display settings as switches:** the points bar on or off, and while it is on, its area and its direction
    (horizontal or vertical). The choice of three ("Points", "With the area", "None") wrapped to two lines.
  - **The chart under the board,** with the review's sizing, not in the side column, where 120 edges had about 300
    pixels.
  - **The game's actions in their own row** under the moves, as on Lichess's game page: eight buttons in one row
    overflowed the side column at its narrowest (250 pixels).
  - **Abort's and Resign's confirmations in red** (`btn-danger` in `src/app.css`), and short tooltips.
  - **The bot's card folds sooner:** both cards take the wider one's width (the centred bar), so the bot's longer name
    needs 48rem for one line. The row's height follows it.
- **Changed after the fourth look:**
  - **No chart:** the bar is enough, and the chart under the board changed the board's size, and with it the side
    column and the display settings' switch, each time it was turned on or off.
  - **One bar under the moves, as the review's,** on Practice and on the Analysis board: the steps on the left, the
    tools or the game's actions with ☰ on the right, which go under the steps as a group when the column is too
    narrow. In place of Practice's two rows. Icon buttons have narrower sides (`btn-icon` in `src/app.css`), so
    Practice's eight fit in one row in its widest column (350 pixels) and wrap below it.
  - **Two lines in each player's card,** on every page: the name over the numbers. The cards are narrow, so the bar is
    longer (376 pixels in Practice, at a window 1,347 pixels wide), and the row has one height. The row's height until
    it is measured (`--strip`) is the two lines' now, so that the review's board keeps its size as the review shows.
  - **One drawn icon set** for the steps, ☰ and the game's actions (`src/lib/ui/Icon.svelte`), in place of text
    glyphs.
  - **The steps span the column when the bar wraps,** as Lichess's (`StepBar`, shared by the review, the Analysis
    board and Practice).
  - **Skeletons for the Analysis board and Practice,** as the review has: the Analysis board shows the review's
    skeleton in its board form from the prerendered page on (it showed a line of text), and Practice shows a skeleton
    of its game while the bot starts (it showed a one-line row and an empty board). The skeleton's card is the
    review's (`PlayerCardSkeleton.svelte`), and the empty board's points a utility (`board-points` in `src/app.css`).
  - **The header stays in view, on a screen with a mouse:** the page scrolls in its own area under the header, which
    keeps the scroll bar's room on every page (design 22). In the place of no room on the boards' pages, which left
    the room beside the header on Home, the editor and the other pages that did not scroll. A screen with a mouse is
    `(hover: hover) and (pointer: fine)` (the `desktop` variant in `src/app.css`), at any width. A touch screen keeps
    the usual page, whose header scrolls away, as the mobile layouts of most sites do.
  - **Practice's events** (design 17): `practice_start` and `practice_end`, with the bot's settings, the player's side,
    the bot's form, the cores, the outcome, the edges, the takebacks and the bot's average seconds a turn, as ranges;
    `engine_error` with `practice`; its features, once in a game; and `practice_game` on the review's events. For the
    levels (design 24's games by setting) and for whether the visits suit the players' machines. The parameters name
    their subject (`practice_outcome`, not `outcome`), as design 17 asks. The privacy page lists them, and what
    Practice keeps in the browser, which it did not list. Nine custom dimensions to register in Google Analytics.
  - **The site's menu on a narrow screen** (below 768 pixels): a ☰ at the header's left, with the header's links, as
    Lichess's phone pages have it (design 22). The header wrapped its links to two rows there.
  - **The scroll bar's room, checked in the page's area:** on a page that does not scroll, the area keeps 15 pixels
    (`offsetWidth − clientWidth`), and a page grown to scroll did not move sideways (0 pixels). With the room off, it
    moved 7.5 pixels. The room no longer shows as a dark band: it is beside the content, in the page's colour, not
    beside the header.
  - **Earlier: the header reaches the window's edge on the boards' pages:** the scroll bar's room that
    `scrollbar-gutter: stable` keeps cannot be drawn in. The browser paints only the root's background colour there,
    clips an element drawn into it, and leaves it out of `100vw` (checked in Edge). The CSS working group's issue 5232
    is open on it, and the common answers are an always-visible scroll bar, a header outside the scrolling element, or
    no room where nothing scrolls. The pages sized to the window (the review, the Analysis board, Practice) do not
    scroll at a desktop size, so they keep no room (`data-fits-window`, from the line that each shows while it loads).
    The other pages keep it, as their height can change while they load, and most of them scroll.
- **The record reader** takes a record from a set-up start that numbers its turns from the start's turn, as the
  Analysis board's annotated record writes them, or from 1. The notation does not say which (request 19).
- **Checked in Edge** on the local build, on a desktop with 16 cores:
  - **The first version:** a game started on the GPU in about two seconds, and its first move at 64 visits came within
    1.5 seconds (the check read the page every 1.5 seconds). A reload resumed the game. With the GPU off, the bot
    started on the CPU workers and played Blue's first edge in about a second. A record of 120 edges that ends the
    game ended it at once, with the result `r+60.500125` (the rules' exact score), into Your games.
  - **The revised page:** a game in progress opened with no flash of the card. The steps, and a click on a move,
    showed earlier positions. The four score pictures drew, on a game from 60 edges of a record. Abort kept the game
    in Your games as `*`, and Resign as `b+R` with `Termination "resignation"`. The review's row and display settings
    still showed as before.
  - **After the second look:** the bar's middle was at the board's middle in Practice and in the review (412 and 357
    pixels from the window's left, each to the pixel). The area lane drew as each player's area against their points.
    The gauge, with its area lane, and the chart over 120 edges drew. Take back undid four edges (the player's turn
    and the bot's before it), and the bot then answered a new turn with legal edges. A note drew on a right-click and
    went on a second. Abort turned red under the pointer. At 1,024 visits on the GPU, the bot's turn took 10 seconds,
    on a machine that may have been loaded by training.
  - **After the third look:** the switches, the chart under the board (its bottom at the side column's), the actions'
    row, the red confirmation, and the bot's card on two lines with the row's height (45 pixels, above the board) at a
    board 631 pixels wide. The header's change did not work: the browser paints only the root's background colour
    into the scroll bar's room, and clips anything drawn there.
  - **After the fourth look:** Practice's bar in one row at 350 pixels, and in two at 250 (forced), with no overflow.
    The Analysis board's bar in one row at 458 pixels, and in two at 340 (forced). The buttons 33 pixels high, icons
    and words alike. The review's layout shift on a reload: 0.0012, with the board's size unchanged as the review
    shows. Before the two lines' `--strip`, the board changed size twice as the review showed. With no room on the
    boards' pages, at a window 1,290 pixels wide: the header's right edge at the window's edge on the Analysis board,
    Practice and a game's review; the Analysis board's layout shift on a reload 0, and the review's 0.0026, all of it
    the summary column's (not checked against the build before these changes at this size). The Review tab's home
    keeps the room and scrolls. Not checked: a first visit to `/review` with no game, which shows the home after the
    loading line, so that the header's links move by the room's width once.
  - **The skeletons and the bar, at a window 1,286 pixels wide:** the Analysis board's prerendered skeleton, loaded
    with no script, had the board's, the row's and the side column's rectangles of the live page, to the pixel (757,
    45 and 460 by 810), and its reload no layout shift. Practice's reload with a kept game: 0.0012, of which 0.0004
    the actions that came after the start (now shown off while the bot starts) and 0.0008 the bar, which the cards'
    real numbers narrow. The bar forced to 250 pixels: the steps 51 pixels each across the column, the actions under
    them, and back to one row when widened.
  - **The page's own area, at a window 1,282 pixels wide:** the header 1,282 pixels wide on About, Notation, the
    review, the Analysis board and Practice, with the scroll bar under it. Page Down: with the body focused (as the
    router leaves it), it does not scroll the area; with the area focused (as the layout now does), it scrolls it. A
    first try sent a key name that the browser tool did not know, and no key at all, so its result counted for
    nothing. A new page at the top. Back and Forward between Notation (900) and How reviews work (500) back at each
    page's place, after a fix: on Back and Forward the address has changed before the router reports the navigation,
    so the place is kept under the navigation's `from`. A reload keeps the place. A link to `/about#early-access`
    scrolls to it. The boards' pages fit the window with no scroll: the review's layout shift 0.0025 (the summary
    column), the Analysis board's 0. Not checked: a touch screen (its usual page), printing, and a page that gives
    the focus to a control of its own as it opens.
  - **Not checked:** the one-thread bot in a browser, a whole game played on the board, the Analysis board's Play
    with moves on screen, a phone, and the narrow layout.

### Practice games stored (2026-10-15)

- **What:** every practice game is to be stored when it ends, on the site's first backend (a Pages Function and D1),
  for the bot's levels, for what players find hard, and for an open dataset. Design 25 gives the decision.
- **Decided:**
  - Every game, as Lichess and chess.com keep the games played on them. This replaces design 19's rule that a game
    stays in the browser until the player gives one, for the games played here.
  - A random code per browser, with the consent banner's Accept, as a code for research alone needs consent in the EU.
    Without it, the game goes with no code.
  - No switch to keep games out: a game with no code and no name identifies no one. Decline stops the code, and the
    privacy page deletes the coded games.
  - The games may be published, without names, as Lichess publishes its games (CC0).
  - Not now: the player's meaf.us rating as a range.
  - The consent banner, open about both purposes, with the collie: what each does for the site, Accept and Decline
    alike, and a switch for each purpose on the privacy page. Its words say what the number does ("links your games
    against HedgeFund"), not a name of ours, and promise nothing that a later feature could break: "free" and "never
    sells your data" stay, "no ads, no accounts" does not. It ships with the games' storage, so that visitors are
    asked once.
- **Read before the decision:** Lichess's privacy policy and database page, and chess.com's privacy policy and legal
  FAQ. Lichess keeps anonymous players' games, publishes its rated games under CC0, and sets only a session cookie,
  which play needs. Chess.com's cookie banner and its rules for games could not be read from its pages.
- **Games from a set-up start** (decided after): stored as the others, with their start position, and a game from the
  Analysis board's Play with the edges that came with its record. The calibration can then take or leave them.

### Practice first (2026-10-15)

- **What:** Practice leads: first in the header, and the home page's first call to action, with the review, the
  Analysis board and the board editor after it (design 22). The home page leads with play, as Lichess's does, and
  shows a board from a game of HedgeFund against itself, made by `scripts/home-board.mjs` (seed 7, 64 visits, 100
  edges): the site's own game, as the meaf.us archive's games need their owner's permission for public use.
- **The design pass** (the impeccable skill): no small-caps labels above headings (its quality floor bans them), the
  other ways in as a quieter list under a rule in the place of three equal cards, and the board as the page's one
  picture. Checked on the local build at 1,301 pixels and at 390 (no sideways scroll). The board's converter moved to
  its own module (`src/lib/engine/position.ts`), so that the home page draws the stored position without the analysis.

### Support Us through Ko-fi (2026-10-15)

- **What:** "Support Us" in the header, in the accent's colour of each theme, opens Ko-fi's tip panel in the site's
  own dialog (design 22). Below 1,024 pixels the header's links go into the site's menu (it was 768): the links and
  the button need 860 pixels for one row. Below 640 pixels the button goes into the menu too.
- **Its label** is "Support Us", as Ko-fi's own widget writes it. Opening the dialog sends `support_open` (design 17),
  with nothing else: the tips are counted on Ko-fi, as its panel is Ko-fi's page.
- **Ko-fi's panel stays light in the dark theme:** it is Ko-fi's page from another site, so the site cannot style it.
  The frame's `background` paints only its 4-pixel edge (checked: a dark red edge, and Ko-fi's white card inside). It
  does not follow the dark preference either: the frame takes the site's `color-scheme: dark`, and the panel stayed
  light. An inverting filter darkens it, but shows Ko-fi's profile picture as a negative, and would invert the
  payment step's logos and colours.
- **Why not Ko-fi's floating widget:** it is a script from Ko-fi on every page, and its button has a place of its own
  and only its text and colours to set. Moving it into the header, or styling it more, would rest on Ko-fi's own
  class names, which Ko-fi can change. The panel in a frame, made only when the dialog opens, does the same for a
  tip: no new tab, and nothing goes to Ko-fi before a visitor opens it.
- **Checked** on the local build in Edge: the panel loads in the dialog, in both themes, and its Monthly tab is as tall
  as One time; at 1,294 pixels (the button in the header), and in frames of 900 pixels (the menu and the button) and
  390 (the menu's item opens the dialog, and the focus goes to Close). Not checked: a tip, and the frame on the live
  site's address.

### A record's first turn after a set-up start: one number (2026-10-15)

- **What:** the record reader takes only the start's own turn number after a `Position` tag, as the engine
  repository's design 04 now gives it (request 19, its commit `85f1792`): `3.` after a start with 3 edges played, and
  `2...` at the second edge of turn 2. Before, it also took `1.`. A start given apart from the record (the Analysis
  board's Import, the board's address) is read as the record's own tag.
- **Why:** the number gives the player. A record numbered from 1 after a later start can give the first turn to the
  wrong player, and two records of one game would differ.

### Practice from a set-up start (2026-10-15)

- **What:** Practice takes a set-up start (design 24, item 4), on the practice bot's `enclosure-set-position`
  (request 20, release `wasm-v2-engine-85f1792`). The Analysis board's Play gives the board's set-up start and the
  moves to the position on screen (`/practice#position=…&record=…`), and is on for any start.
- **The record's edges are the game's start:** a takeback stops at them. Before, a takeback could undo an edge of the
  record of the player's colour, which the player had not played against the bot.
- **Its count:** `practice_start` gives `practice_from` set_up_start (design 17).
- **Its review:** "Analyze the game" opens it on the Analysis board, from Practice and from Your games, as the Review
  tab reviews games from the standard start only. Its id in Your games covers its start, so that the same moves from
  two starts are two games. A game from the standard start keeps its id.
- **Fixed in the check:** the rules' requests after the first went from the standard start, and the game stopped
  ("illegal move"). Every request now gives the game's start.
- **Checked:** requests/20, "Checked here".

### The board without bands (2026-10-15)

- **What:** no band behind any edge. A protected edge is drawn on the edge itself: wider (0.2 units) in its side's
  colour, with a white line (0.055) along it. The mover's edges of this turn (the position's `placed` edges, `+` in
  the notation) are drawn the same way, as no one can cut them before the turn ends, when they become protected. The
  gold band of the last turn, and the cream band of the protected edges, are gone (design 03). The board no longer
  takes the last edge or the last turn, and the board editor no longer adds its placed edges to the protected ones.
- **Why:** the two bands often fell on the same edges, one over the other. The marked edges are the turns just played,
  so they show the last moves without a band. A mark on the edge itself does not rest on colour alone.
- **Compared before the choice:** the band, a hollow edge, the white line, and the white line with no bands, in two
  moments of one game, in both themes. The white line is the form that enclosuregame.com uses.
- **The label badge on the board:** radius 0.33 (it was 0.36), and on a length-1 edge it sidesteps by 80% of its
  radius (up from a horizontal edge, right from a vertical one), over the line still: 0.28 of the line's 0.68 shows,
  against none before. Compared before the choice: the badge on the middle at 0.36 and 0.3, beside the edge, and
  sidesteps of 50% to 85%.

### The home board plays reviewed scenes (2026-10-15)

- **What:** the home page's board plays three scenes from reviewed games: the engine's first three candidates before
  each edge, and each turn's label on its edges, by turn (design 22). The scenes come from review files of the owner's
  bot's games against another bot on meaf.us (`scripts/home-replay.mjs`), with no names shown. The labels are the
  review's own: the stored results at the files' review depth (4,096 visits, every position), with the positions after
  the second choice and the turn's other candidate that confirm a Great, as the Review tab reads them.
- **Why:** the still board said nothing about what the site does, and enclosuregame.com's home page has the same
  layout with a board that plays a game. A replay of a review shows the judgement.
- **The scenes end on each game's latest bad turn,** not its worst: the bots' bad turns come before turn 24, and later
  boards are fuller. Turns 23 (a Mistake), 20 (an Inaccuracy) and 16 (a Mistake).
- **Changed after a first look:** no caption. The review's row above the board instead: each side's points and area,
  and the review's win chance bar, as the board shows a review (a points' bar, as Practice's, was tried first). An
  edge every 1 to 2 seconds, at random (it was 0.8). The holds: 2.6 seconds before the labelled turn, 4 on its label.
- **The board alone** (changed after): no row of players, points, area or win chance above it. Tried, and too much
  for the home page.
- **By edge** (changed after): each edge's own label on it, as the review shows a game judged by edge, the badges of
  the turn so far together. Each scene ends on its game's latest edge with a bad label: edge 44 (turn 23), 23 (turn
  12) and 31 (turn 16), each a Mistake.
- **Checked** on the local build in Edge, in a tab behind another (the page reported itself visible for the test): the
  scenes play and loop, and three candidates at most. The steps' timing
  was not measurable there, as Chrome slows the timers of a tab that is not shown. Not checked: the timing in a shown
  tab, reduced motion, and a phone.

### The review's move list under its scroll bar (2026-10-15)

- **What:** from `bd6df7c` on, the review's move list ran 6 pixels under its own scroll bar between 1,260 and 1,310
  pixels wide: its right edge (the lead numbers, the notes) was cut. Found on the previews `cb2b9188` (before) and
  `a11f9d4d` (after), measured in frames of each width on both.
- **Why:** the review sizes its board from the window's width (`100vw`), less the other columns and 20 pixels for a
  scroll bar. Before, no scroll bar took that room on the review, so the side columns shared the 20 pixels, and the
  move list had 316 pixels. Since `bd6df7c`, the page's own scrolling area keeps its scroll bar's room (15 pixels on
  Windows) on every page, and `100vw` still counts it in: the move list had 309, and needs 315 with its scroll bar.
- **The fix:** the page area is a CSS container, and the review and Practice take their width from it (`100cqw`),
  which leaves out the scroll bar's room on any system (design 22). The move list has 316 pixels again (checked on
  the local build from 1,260 to 1,440 pixels). The board is 15 pixels smaller than before `bd6df7c` at those widths:
  the room is the scroll bar's now.

### Practice games stored: built (2026-10-15)

- **What:** design 25 built, as its section "How it is built" gives it: the stored game (`src/lib/practice/stored.ts`),
  the Pages Function (`functions/api/practice-games.ts`, on `/api/practice-games` only), the D1 schema
  (`migrations/0001_practice_games.sql`), the sending and its queue (`src/lib/practice/send.ts`), the kept game's id,
  takebacks and times, the consent's two purposes under a new key, the new banner, and the privacy page's section and
  switches. It stores games once the databases and their bindings are set up (hosting.md, section 7). Until then the
  Function answers 503, and the games wait in the browsers.
- **Decided in the build:** a game set aside for a new start from the Analysis board's Play is stored with an outcome of
  its own, `set_aside` (decided after a first version that counted it as aborted), so that the calibration can tell it
  from an Abort. A game with no move against the bot sends nothing. A game whose bot form is not known (set aside from
  an earlier visit) has none. The browser's number stays in the browser after a Decline, unsent, so that the privacy
  page can still delete its games. Only a build with `VITE_STORE_PRACTICE_GAMES=on` sends, so that no game leaves a
  developer's machine. The Function declares the part of D1's binding that it uses, and needs no package. The
  Cloudflare skill advises the `cf` CLI, not Wrangler, in a project with no Wrangler file: the Function is tested in
  Node, not under Wrangler.
- **Fixed after two reviews** (Codex's review of the working tree, then its adversarial review):
  - **A Decline did not reach the games that waited, or another tab:** a waiting game went with the number after a
    Decline, and a practice tab open before a Decline in another tab still took and sent the number. Now a game takes
    the number, and goes with it, only as the browser keeps the choice at that moment, and only while the number is
    still the browser's. Each tab follows a choice made in another tab (the browser's `storage` event).
  - **A game could come back after "Delete my practice games":** a game already on its way, from this tab or another,
    could reach the site after the delete, under a number that the browser then forgot. The site now keeps each
    deleted number alone (`deleted_browsers`, `migrations/0002_deleted_browsers.sql`), and keeps no game that arrives
    with one. The check is in the insert's own statement. A first fix in the browser (stop the sending, wait for the
    game on its way) covered one tab only, and the site's check replaced it.
  - **The privacy page's switches:** a visitor who had not chosen could not decline one purpose without granting it
    first. A change to one switch now keeps each purpose not chosen yet as declined, as its switch shows.
  - **Checked:** a test of the Function (a game that arrives after its number's delete is not kept) failed before
    its fix and passes after it. A browser test with two tabs (`tests/practice-games.spec.ts`: a Decline in one, a
    practice game ended in the other) failed before its fix, with the game sent with the number, and passes after it.
    It runs in CI, and skips on a build that stores no games. Checked once in Chromium, with tests not kept: a delete
    during a send, a game kept under a forgotten number, and the switches with two purposes (no grant sent to the
    Google tag). Not checked: the Function on Cloudflare's D1.
- **The banner's words, read again:** "a random ID", not "a random number", and the bullet says what grouping the
  games lets the site learn: "A random ID in this browser groups your games against bots, so we can tell how hard
  each setting is for real players." The banner and the privacy page's switch say "bots", not "HedgeFund", so that
  the consent holds for a bot added later. The privacy page's account of what is kept still names HedgeFund.
- **Checked:** `src/lib/practice/stored.test.ts` (5 tests, with the one added after the reviews): the stored game's
  checks, and the Function on the real schema in Node's own SQLite: a game kept once, a browser's games deleted, and
  the refusals (not JSON, an invalid field, more than 64 KB, no database). `npm test` passes (116 after the reviews),
  `npm run check` has no errors or warnings. The banner and the privacy page pass the layout sweep at every width (a
  build with `VITE_STORE_PRACTICE_GAMES=on`). Not checked: a game sent in a browser, the banner's and the switches'
  behaviour in a browser, and the Function on Cloudflare.

### The site's text, a first pass (2026-10-15)

- **What:** the text by what it does (CLAUDE.md, "Writing the site's text"), with the `/asd-ste100` skill and its
  linter (`ste-lint.py`) on the site's messages and on each page's text.
- **Strict, for what a player follows:** the messages say who acts, in the active voice: "Hedge School cannot read
  the review file's branches", "The Analysis board cannot load this file", "Practice cannot start from this record",
  "the record gives turn 1. where the notation gives turn 3.". One wording for the brackets of a record ("a ( has no
  closing )"), and "the link is not complete" for "cut short". The Tools page's steps: one instruction a sentence,
  "set Allow User Scripts to on" for the phrasal verb, and the active voice.
- **STE's sentence rules, for what explains:** the privacy page's lists without semicolons, the developers page's three
  long sentences split, and the notation page's first sentence split. The linter finds no other semicolon or long
  sentence in the pages' prose (the developers page's semicolons are its JavaScript).
- **Left for a later pass:** the passive verbs that the linter notes on the explaining pages (About 6, How reviews
  work 5, Notation 6, Notices 3), which its rules leave to judgment. The pages that invite (the home page, the banner,
  the Support Us dialog) read as plain web writing already.

### The layout sweep (2026-10-15)

- **Why:** the review's move list ran under its scroll bar from `bd6df7c` until `ff24d27` ("The review's move list
  under its scroll bar"). It reached the live site because the checks after `bd6df7c` looked at the scroll bar's room
  and the header at a few widths, not at what the room took from the review. The failure showed in a band of 50
  pixels, with scroll bars that take room (Windows with a mouse), and with the labels by edge. Nothing tested the
  layout: the unit tests check logic only.
- **What:** `npm run test:layout` (Playwright Test 1.63.0, `tests/layout.spec.ts`), in Chromium and in Edge, with
  their scroll bars shown (headless Chromium hides them by default). Each page at every width from 360 to 1,920
  pixels, by steps of 10, at the heights 700, 860 and 1,000. At each size: the page does not scroll sideways, no area
  that clips or scrolls hides its content sideways, and the header is one row. The review in three displays (the
  default, labels by edge, labels by edge as text), after its review is done, and Practice with a game in progress.
  The report gives each kind of problem once, with the widths where it shows. About 13 minutes.
- **Its game** (`tests/fixtures/hedgefund-review.json`, `scripts/test-fixture.mjs`): HedgeFund at 1 visit against
  HedgeFund at 128, reviewed as the Lite review, with the results that confirm the Greats. The site's own game, so that
  the repository holds no one else's games. A game of HedgeFund against itself at one strength had losses of 0 or 1
  point, and its move cells were too narrow to show the cut.
- **Checked:** on the preview `a11f9d4d` (after `bd6df7c`) the sweep finds the move list cut by 6 pixels (300 in 294) at
  1,260 to 1,310 pixels (labels by edge, height 860), as reported. It also finds the players' row running out of the
  page at 360 to 490 pixels. On the preview `cb2b9188` (before `bd6df7c`) it passes. On the current code, built with
  `VITE_STORE_PRACTICE_GAMES=on` (the new consent banner on every page), all 20 tests pass, in Chromium and in Edge.
- **Fixed from it:** the players' row's unseen twin card now shrinks as the seen one does (`PlayerRow.svelte`), so a
  narrow row shortens the names. It was live from `bd6df7c`, with the test game's scores in thousands. A phone of
  that width probably scrolled the review sideways too: not checked on a touch screen.
- **The rule** (CLAUDE.md, "How to work"): before a change to a site-wide layout mechanism, search for what depends
  on it (viewport units, `--site-header`, fixed pixel allowances), and run the sweep after it. A release runs it
  first (hosting.md, "Deploy, check and roll back").
- **In CI** (decided after): GitHub Actions runs the check, the unit tests and the sweep in Chromium on each push to
  `dev` (`.github/workflows/tests.yml`), and a release takes only a commit whose run passed. The sweep in Edge stays a
  local step before a release: Edge on Linux needs an install, and a Windows runner counts twice the minutes of a
  private repository's allowance. Cloudflare's build runs the check and the unit tests before each deploy, as before.
  The first run (on `e80edef`): Chromium on Linux shows scroll bars that take room, the sweep took 8.6 minutes, and
  the two-tab test of the practice games passed. Two pages failed, both from Linux's monospaced font, wider than
  Windows': the review's move list by edge (321 pixels of rows in 301, at 1,260 to 1,490 pixels wide), and the board
  editor's position field (218 in 211). See "One monospaced font".
- **Not covered:** a touch screen's layout (the sweep's browser has a mouse), menus and dialogs opened, the Analysis
  board with lines, and visual changes that cause no overflow.

### One monospaced font (2026-10-15)

- **Found by CI's first run of the layout sweep,** on Linux: the move list by edge needed 321 pixels for its rows and
  had 301, at windows 1,260 to 1,490 pixels wide (the analysis column at its least, 340 pixels). The board editor's
  position field showed 218 pixels of text in 211.
- **Why:** the site used each system's own monospaced font (`ui-monospace, monospace`). Chrome on Windows takes
  Consolas, 0.55 em a character. Linux's DejaVu Sans Mono, and the Mac's Menlo and SF Mono, are 0.6 em. The move
  list's columns are sized in characters (a move is 8 characters, then the label's, the mark's and the loss's slots),
  so a row was 300 pixels with Consolas, a pixel less than the room, and 321 with the others. A Mac had the overflow
  too, probably, with no check that could see it.
- **Asked:** a wider analysis column (364 pixels: every common monospaced font fits, but the board is up to 24 pixels
  smaller between 1,260 and about 1,490 pixels wide), one font shipped with the site, or smaller move text.
- **Decided:** one font, shipped with the site, as Lichess ships its own (design 06, "One monospaced font").
  - **First, Inconsolata** (SIL Open Font License, drawn after Consolas, 0.5 em): the only common open font narrow
    enough for the column as it was. A row was 281 pixels, 20 inside the room. Most open monospaced fonts are 0.6 em.
  - **Then a comparison page:** the review's move list copied from the site, in six fonts (Inconsolata, the device's
    own, JetBrains Mono, Fira Code, Source Code Pro, Hack), in 301 or 325 pixels of room, each with its fit measured.
    The 0.6 em fonts needed 321 pixels: 20 hidden in 301, 4 spare in 325.
  - **Fira Code, with the wider column:** the font read best. The analysis column's least width is 364 pixels, not
    340, so that the move list has 325. The board is up to 24 pixels smaller where the column's least width sets it.
    The package `@fontsource-variable/fira-code`, version 5.3.0, pinned: a change of the font's files would change
    the layout. Its Latin file is 36 KB, and a page loads it only when it shows monospaced text. Its ligatures for
    code are on, as the comparison showed it.
- **The sweep's text fields:** with a 0.6 em font on every system, the board editor's position field shows 218
  pixels of text in 211 at windows 360 and 970 to 980 pixels wide. A text field scrolls its own text by design, so
  the sweep no longer counts a text field's hidden text, as it does not count text cut with an ellipsis.
- **Checked:** the layout sweep passes in Chromium and Edge with Fira Code and the column at 364 pixels (20 tests,
  12.3 minutes, on Windows; CI checks Linux on the next push). The board at 1,376 × 952 is 655 pixels. The font's
  arrival on a first visit adds 0.002 to the review's layout shift (0.0101 with the font, 0.0081 with its file
  blocked, in Edge at 1,376 × 952). The move list with its labels as text shows ?! and ?? clearly in Fira Code.
  Not checked: a Mac, and a phone.

### The site removes the analyses of older shapes (2026-10-16)

- **The problem:** a change of the stored shape (`SHAPE` in `src/lib/analysis/cache.ts`) left the older analyses in
  the browser. In the owner's Edge, 2,796 of 4,607 analyses had an older shape ("Deleting a game, and the browser's
  storage").
- **What reads them:** no reader reads a result of an older shape. The review and the board make their keys with the
  current shape, the snapshot's choice of a search skips another shape, and an export keeps the current shape only.
  The results of an earlier search are different: a snapshot of an earlier review reads them (design 20), so they
  stay. So do the results of an earlier file of the same network.
- **Decided** (design 05): the site removes the results of older shapes when it starts for the first time after a
  change of the shape. It removes the keys of the form before the shape too (`build|model|visits|moves`). A mark in
  local storage (`learn-enclosure:analysis-shape:1`) keeps the shape that it removed them for. A start with the same
  shape reads the mark and nothing more. One transaction reads the keys and removes the older ones. The site writes
  the mark only after that transaction ends, so a removal that fails runs again at the next start.
- **Two tabs of two releases:** a result of a newer shape stays, and a newer mark stops the removal, so a tab of the
  earlier release removes nothing of the later one's. The other way, the later release's first start removes the
  stored results of a tab of the earlier release that is still open. That tab keeps the results in its memory, and
  searches again for the others. The results that it stores after the removal stay until the next change of the
  shape.
- **Also:** a review file or an analysis file keeps the results of the current shape only, as design 13 says. Before,
  a file of an earlier site put its results of older shapes in the store. A file whose results all have an older
  shape now counts as a file without results (`with_results`, design 17): its review searches again.
- **Rejected:** a removal at each start, which reads every key on each load (5,097 keys took about 55 ms, design 20).
  A version of the browser's database for each shape: an upgrade waits for the site's other tabs to close, and the
  site gives a page no storage while it waits.
- **Checked:** the unit tests (`cache.test.ts`, `reviewFile.test.ts`) check which keys the removal takes, when it
  runs, and the files' results. In the owner's Edge, on the local preview's address: before the first start of this
  build, the store had 5,548 analyses. After it, 2,752 stayed, all of the current shape. The start removed 2,796, the
  same number of older shapes as on 2026-10-12. A second start removed nothing. Not measured: the time of the removal.

### An earlier engine's results go when no game needs them (2026-10-16)

- **The problem:** the browser kept the results of each engine and network file (design 20). After Review again, or
  after a delete, nothing read the earlier ones. Each release added one more set.
- **The rule:** an earlier engine's result goes when no stored game needs it any more. An example is Review again,
  which reviews the game with the site's engine.
- **What reads them:** the site's engine reads the results of its own search with the network files that it ships.
  An earlier engine's results, and an earlier network file's, have one reader: the snapshot of a game whose mark
  names that engine or file. The snapshot opens when the site ships the mark's network and the store holds the
  game's line at the mark's depth. It reads the results of one search, the one that holds the line. It reads the
  game's positions and the positions one move from them (the Greats' confirmations), each at its deepest.
- **Decided** (design 20, item 8): the removal keeps what a snapshot reads. It takes the other earlier results of
  the store's shape.
  - **A position that several games share** keeps its result while one game's snapshot reads it.
  - **A deleted game** needs nothing once no page shows its Undo. A deleted game holds a shared lock (the Web Locks
    API) until its Undo, or until the page that shows its row ends. The removal takes the lock alone, or it waits for
    a later start. A delete waits for a removal that runs, so the removal cannot read the games between a delete and
    its lock.
  - **A review file of an earlier engine** keeps its results while its mark is the game's. When the game keeps a mark
    of the site's engine, nothing reads them, and they go.
  - **When:** at the site's start, when the removal is due. A mark in local storage
    (`learn-enclosure:earlier-results:1`) keeps the engine files that the last removal ran for. These are the CPU
    module and the networks, by SHA-256, from `engine.lock.json` at the build (`__ENGINE_FILES__`). A release that
    changes one makes the removal due. Some changes of what the games need clear the mark: a mark that replaces a
    mark of another module or network file, the delete of a game with a mark, and the load of a review file. A start
    with nothing changed reads the mark alone. The removal's code loads only when it is due, once the page is idle.
  - **An analysis file** keeps the results of the site's search only. The board reads no other.
  - **One transaction** reads the games, their branches and the store's keys, and removes the results. The mark says
    that a removal runs until it ends. A removal that fails, or that a closed page stops, then runs again at the next
    start. A change of what the games need while it runs keeps it due.
- **Also:** a branch of version 1 (a kept line) counts each of its nodes as a position of the game. Before, the
  review file and the removal took its last node alone. The load of a review file keeps the game's mark before its
  results. A removal in another tab between the two then takes none of them.
- **Results that stay longer:** a branch deleted after Review again, before the new review ends, keeps its earlier
  results until the next removal. A delete of a branch does not make the removal due, since it is frequent.
- **Rejected:**
  - Keeping every earlier result.
  - A removal at once when Review again ends. A delete waits for its Undo in any case, so one rule serves both.
  - A removal at each start, which reads every key on each load.
  - A removal without the Undo's lock. An Undo in another open tab would put a game back without its results, and
    its next open would review it again.
  - Keeping every depth of each position that a snapshot reads. The snapshot shows each position at its deepest, so a
    shallower result has no reader.
- **Checked:** the unit tests, the type check, a client build, and the removal in a browser.
  - `earlierResults.test.ts` checks what the removal takes: for shared positions, after Review again, for an earlier
    network file, for games with no snapshot, and for other shapes. It also checks that each snapshot chooses the
    same search after the removal.
  - `store.test.ts` checks which marks make the removal due. `reviewFile.test.ts` checks the positions of a branch of
    version 1.
  - In the client build, the removal is a chunk of its own, which the layout loads only when the removal is due.
  - In the owner's Edge, on the local preview's address (a build of a3c0546). Before the first start, the store held
    results of shape 5 from four searches: 06534ee 1,043, 632f2a0 423, 85c2adb 363, and fdfe5ad (the site's) 923.
    After it, the store held 632f2a0 6 and fdfe5ad 923. The start removed 1,823 earlier results and kept every result
    of the site's. A second start removed nothing. The question before a delete worked.
  - Not checked: a snapshot of 632f2a0 that opens after the removal, and the removal's time.

### A question before a delete replaces the Undo (2026-10-16)

- **The problem:** the Review tab deleted a game at once, with an Undo in its row ("Deleting a game, and the
  browser's storage", 2026-10-12). The site now removes an earlier engine's results when no game needs them ("An
  earlier engine's results go when no game needs them", design 20, item 8). An Undo could then restore a game without
  the results that its snapshot reads. A lock across the tabs stopped the removal while an Undo showed. That lock
  cost code in the store's delete, in the removal and in the Review tab.
- **Decided** (design 11, "Deleting a game"): a question replaces the Undo. Delete opens the site's own dialog:
  "Delete this game?", with the game's name and a line that says that the player cannot undo the delete. Its buttons
  are Cancel and Delete. Cancel has the focus when the dialog opens, and Escape cancels. A confirmed delete deletes
  the game, and its row goes at once. The dialog takes the second click of a double click, so no other row moves
  under the pointer.
- **The cost:** a second click on each delete.
- **Also:** the Undo's lock goes, and the removal of earlier results runs without it. The event `game_restore` goes
  with the Undo. `game_delete` counts a confirmed delete (design 17). A delete now makes the removal due whether or
  not the game had a mark, so the delete reads nothing first.
- **The dialog** is the site's question before an action that the player cannot undo
  (`src/lib/ui/ConfirmDialog.svelte`). The Analysis board's "Replace your analysis?" and Practice's "Play from this
  record?" keep their own dialogs for now. A move to this one would change their focus and their buttons.
- **The dialog's text** is text that a player follows, in strict Simplified Technical English: "Hedge School will
  delete the game … from this browser. You cannot undo this action."
- **Checked:** the type check and the unit tests. Not checked: the dialog in a browser (its focus, Escape, a double
  click, and the list after a delete).

### A question before the practice games' delete, and the cancelled deletes counted (2026-10-17)

- **The problem:** a game's delete in the Review tab asks first ("A question before a delete replaces the Undo",
  2026-10-16). The Privacy page's "Delete my practice games" deleted at once, and the player cannot undo it either.
  No event counted how often the question stops a delete, since the Undo and its count went.
- **Decided:**
  - **The practice games' delete asks first** (design 25), in the same dialog as a game's delete
    (`src/lib/ui/ConfirmDialog.svelte`, design 11): Cancel has the focus, and Escape cancels. Its text says what goes
    and where, in strict Simplified Technical English. In the site's database, the games against HedgeFund that went
    with this browser's random ID. In this browser, the games with the ID that wait to go to the database. After the
    site deletes the games, the ID in this browser. The games in the Review tab stay. A failed delete says so in the
    page's line after the button.
  - **A click outside a question closes it, at any time,** as Cancel does, in both questions (design 11). Before, a
    click outside did nothing, so that the second click of a double click on Delete left the question open.
  - **The question's own Delete waits 500 ms** after the opening. Until then it is disabled, with the look of the
    site's disabled buttons, then it turns red. So the second click of a double click on a row's Delete cannot
    confirm. On a phone, the question's Delete can be under the row's, so a double tap could delete without this. A
    click on it uses its own time too, so a click that the page handles late, after the button turns red, still does
    not confirm. 500 ms is Windows' default double-click time (`GetDoubleClickTime`).
  - **The event `game_delete_cancel`** (design 17): the player answers Cancel, Escape or a click outside to a game's
    delete question. Beside `game_delete`, it shows how often the question stops a delete, a slip or a change of mind.
    A click outside, or on Cancel, within 500 ms of the opening is the second click of a double click, not a
    decision. It closes the question with no event. The dialog tells it by the click's own time (the event's
    `timeStamp`: on a touch screen, the tap's click), and gives it as its own answer, "undecided", beside "yes" and
    "no".
  - **Before this rule,** a click outside within the 500 ms did nothing, and the question stayed open. Now it closes
    the question, and the count of cancels does not include it.
  - **The Privacy page** names both events in its list of what Google Analytics receives. It did not name
    `game_delete` before.
- **The game delete's text** does not change: "You cannot undo this action."
- **The practice games' delete** sends no event, so it gets no cancel event either.
- **Checked:** the type check, the unit tests, and the dialog's text with the STE skill's linter (no violation). Not
  checked: the dialog in a browser.

### The layout sweep on Windows, in CI (2026-10-17)

- **Why:** the workflow **Tests** ran the sweep in Chromium on Linux only. Three things on Windows do not show on
  Linux: the fonts (`system-ui` is Segoe UI on Windows), how Windows draws them, and the scroll bars. So each release
  also needed the sweep in Edge on this computer. The repository is now public, so a Windows runner costs no minutes.
- **What:** the job `test-windows` in `.github/workflows/tests.yml`, on `windows-latest`, at the same time as the
  Linux job `test`. It builds as the Linux job does, starts the preview, and runs `tests/layout.spec.ts` in
  Playwright's own Chromium (the project `chromium`, in its headless shell). Playwright 1.63.0 gives that Chromium's
  version. The runner's Edge is not used, because its version changes with the runner's image. The repository's
  `.gitattributes` keeps LF line ends in each checkout: Git on Windows writes CRLF by default. The release procedure
  (hosting.md, "Deploy, check and roll back") takes this job in place of the sweep in Edge. The sweep in Edge stays an
  option.
- **Checked on this computer** (Windows 11), not on a runner: the job's commands in Git Bash, on a production build,
  with the preview on another port. All 10 tests of the sweep pass, in 7.5 minutes. Playwright's Chromium 153 has
  scroll bars of 15 pixels there, in its headless shell and in its new headless mode. Edge on Windows has 15 pixels
  too ("The review's move list under its scroll bar"). Not checked: a run of the job on GitHub, its time, and its
  caches.

### The owner's visits marked as internal traffic (2026-10-17)

- **The problem:** Google Analytics' **Internal Traffic** filter stayed in Testing, so it dropped nothing, and the
  owner's own visits counted. In 10-16 October, 6 of the 8 finished reviews ran at 4,096 visits on 9 to 16 cores,
  almost certainly with the owner's settings. They swamp design 17's data on the engine's defaults. The two IP rules
  that define internal traffic do not fit: the owner's machine goes through Cloudflare WARP (`cdn-cgi/trace` gives
  `warp=on`, AS13335). A minute after the rules were made, its IPv4 address was outside their range. WARP changes its
  addresses and shares them among its users.
- **Decided:** a flag in the browser (design 17), as Plausible (`plausible_ignore`) and Matomo (a cookie that ignores
  the visits) do. `?internal=on` on any page keeps it in localStorage (`hedge-school:internal-traffic:1`), and
  `?internal=off` removes it. Any other value changes nothing. SvelteKit's `init` hook (`src/hooks.client.ts`) reads
  the parameter before the router reads the address, and takes it out of the address. While the flag is set, the
  tag's `config` carries `traffic_type: "internal"`. A browser without the flag sends the same `config` as before.
- **The owner's steps** in Google Analytics are in hosting.md, section 4: set the flag in each browser, check it in
  Realtime, set the filter to Active, and delete the two IP rules.
- **Checked:** the type check, the unit tests, and a production build with a made-up measurement ID
  (`G-TEST000000`) in Playwright's Chromium. The browser stopped every request to Google Analytics before it left the
  machine. With the flag, every hit carried `tt=internal`, the tag's field for `traffic_type`: the first page view, a
  later page without the parameter, the site's event after a page change by the router, and a page whose address
  holds a game after the `#`. Without the flag, no hit carried it. A visitor who declined kept the consent denied
  (`gcs=G100`), with the flag and without it. The address lost the parameter each time. Not checked: the router's
  own page views (a made-up ID's tag has no stream settings, so it sends none), and the live property's Realtime
  report, which waits for the release.

### Practice: up to 8,192 visits, and any number (2026-10-17)

- **What:** the practice bot's visits go to 8,192 (2^13), and a box beside the slider takes any whole number from 1
  to 8,192 (design 24, item 2). The slider keeps its doublings, now 14 stops. It shows a typed number at the doubling
  at or below it. The box sets the visits when the player leaves it or presses Enter. A number outside the range or
  not whole stays in the box with "Type a whole number from 1 to 8,192.", and the sides do not start a game until it
  changes. The saved choices and the kept game take any whole number in the range (`visitsTaken` in
  `src/lib/practice/practice.ts`). The stored games already took visits up to 2^20 (`src/lib/practice/stored.ts`),
  so the Function and the database did not change.
- **Why 8,192, not 131,072 (2^17):** the estimates use design 24's speeds with HedgeFund 0.1 Lite. Beyond 1,024
  visits, they take the time to grow in line with the visits. A move at 131,072 visits then takes about 2.6 minutes
  on the GPU, 7.1 minutes on 4 CPU workers and 20 minutes on one thread. At 8,192 visits, it takes about 10 s, 27 s
  and 1.3 minutes. The estimates count 48 bot moves a game: the archive's median game has 95 edges.
- **Measured in a browser:** Playwright's Chromium 153 in its new headless mode, against a production build. The
  page resumed a kept game with one edge of the player, so the bot played its turn of two edges at 8,192
  visits, Low variety, in the CPU form with 4 workers. The memory is the renderer process's, which holds the page,
  the bot's worker and its 4 evaluation workers, from Windows.

  | Network | First edge | Second edge | Peak working set | Peak private bytes |
  |---|---|---|---|---|
  | HedgeFund 0.1 Lite | 39.0 s | 0.07 s | 866 MB | 962 MB |
  | HedgeFund 0.1 | 137.4 s | 0.18 s | 1,464 MB | 1,924 MB |

  Both turns finished, with no error and no lack of memory. The first edge searched from no tree. The second edge
  took almost no time: the bot keeps its tree, so its second search probably needed few new visits. This check did
  not read the tree's visits. The full network took 3.5 times the Lite's time.
- **The machine's load:** Windows' CPU was 99% busy (the engine repository's replay on 8 threads), and the job
  ran under a CPU cap of 4 threads of 16. The times are not a baseline. A trial at 64 visits on the same set-up took
  0.94 s and 1.10 s an edge, against design 24's 0.26 s.
- **Not measured:** the GPU form and the one-thread form. The test's Chromium gets a WebGPU adapter (NVIDIA,
  Blackwell) and has JSPI, so the GPU form can run there, but the replay held the GPU (15.3 of 15.9 GB).
- **Open:** Google Analytics' `bot_visits` (design 17) receives the exact number of visits, now one of 8,192 values,
  not 11. The other numbers that the site sends are ranges (`src/lib/measure.ts`). The issue abscls-es4 holds the
  decision: the exact number, or the doubling at or below it.

### The review's first frame (2026-10-17)

- **The problem:** the review drew its first frame in one task of 109 to 144 ms, measured in Edge ("A skeleton while
  the review starts, and the time before it shows", 2026-10-14). A click during the task waits for it, and that counts
  against the page's responsiveness (Interaction to Next Paint, INP).
- **Where the time goes,** in Chrome's trace of a stored review's reload (Playwright's Chromium, headless, 1,366 × 657
  pixels, the test fixture's game of 120 edges in 61 turns), by thread time, the time that the main thread ran:
  - the first task, 44 to 53 ms (the sets' medians below): the move list 12 to 17 ms, and a forced layout of the
    whole review about 21 ms (`StepBar` reads a width as it mounts), then the board, the charts and the rest.
  - the frame's render task, 20 to 25 ms: most of it is two recalculations of the style of every element of the
    review (about 1,040). The view sets `--side-h` and `--strip` on its `<main>` after the first layout, and other
    elements inherit these custom properties.
- **The change** (design 06, item 10): the move list's rows come in the frame after the rest, in a task of their own
  (`rowsDrawn` in `ReviewView.svelte`). Until then one element draws grey bars in the list, one for each turn, a
  turn's row (22 pixels) apart. A hidden page draws the rows at once. The rows' task has the mark `review:moves`. The
  Analysis board in one column also draws the rows at once: there the list's height follows its rows, and the rows
  moved the step bar under the list (the layout shift, below).
- **The measurement** (`scripts/measure/review-first-frame.mjs`): the first draw runs from the task that holds
  `review:shown` to the end of the frame that paints the move list's rows. Chrome's trace gives each task's wall time
  and its thread time. The issue (abscls-3nr) asked to count the long tasks, and the first series used the Long Tasks
  API (a `PerformanceObserver`). It gives wall time only, and on a loaded machine a task's wall time also counts the
  time that the main thread waits for a processor. The trace gives both, so the series below report both. The
  browser is Playwright's Chromium, headless: Edge, where the problem was measured, was not used.
- **The machine was loaded:** the engine repository's replay held 8 of the 12 job threads, and other workers came and
  went. So the builds before and after ran in pairs: one build's set of 5 reloads, then the other's, back to back.
  The pairs took turns at which build ran first. Before each set, the machine's state was read
  (`scripts/machine status` in the planning folder). Windows' processor use and the load in WSL (one minute) at each
  set, at 1,366 × 657:

  | Pair | Before | After |
  | --- | --- | --- |
  | 1 | 57%, 2.5 | 84%, 5.7 |
  | 2 | 86%, 6.7 | 76%, 7.1 |
  | 3 | 93%, 6.1 | 88%, 6.1 |
  | 4 | 92%, 4.2 | 37%, 3.6 |
  | 5 | 79%, 5.9 | 95%, 6.0 |

- **Measured** at 1,366 × 657, by turn, 25 reloads of each build in 5 pairs:

  | Per reload, median (largest) | Before | After |
  | --- | --- | --- |
  | Tasks over 50 ms, by wall time | 1 (2) | 1 (2) |
  | Their time beyond 50 ms each, by wall time | 60 ms (825) | 57 ms (2,709) |
  | The longest task, by wall time | 106 ms (844) | 102 ms (2,759) |
  | Tasks over 50 ms, by thread time | 0 (1) | 0 (0) |
  | Their time beyond 50 ms each, by thread time | 0 ms (15) | 0 ms (0) |
  | The longest task, by thread time | 49 ms (65) | 33 ms (44) |
  | The first draw's total thread time | 77 ms | 75 ms |

  - **The longest task by thread time:** each pair's difference of the sets' medians is −12, −14, −18, −20 and −9 ms.
    All pairs agree, and the median is −14 ms. The sets' medians are 44 to 53 ms before and 26 to 40 ms after, so
    the spread between the sets of one build is 9 ms before and 14 ms after. The gain is larger than the spread of
    the build before, and equal to that of the build after. The two builds' sets do not overlap. Before, 9 of the
    25 reloads had a task over 50 ms of thread time. After, none had.
  - **The first draw's total thread time:** the pairs disagree (+6, −11, 0, −12 and +11 ms): no change.
  - **By wall time,** what a player waits: the pairs disagree (the longest task's differences +73, −39, −30, −149
    and −6 ms), so this measurement shows no gain there. Each extra task also waits for a processor. Two earlier
    series of 5 pairs also disagreed by wall time. One used the Long Tasks API alone (−47, −24, −52, +26 and
    −6 ms).
  - **One pair each at other sizes,** the longest task by thread time: −4 ms at 390 × 760 (the move list is in the
    hidden Analysis tab there), −9 ms at 1,427 × 849, and −21 ms by edge at 1,366 × 657.
  - **Layout shift:** these series do not measure it. The script read the shifts with
    `performance.getEntriesByType("layout-shift")`, which gives none: the browser keeps layout shifts out of the
    performance timeline. So it gave 0 for every reload. The script now reads them from a buffered
    `PerformanceObserver`.
- **The layout shift, measured again** in the change's review: the page's CLS, from a buffered `PerformanceObserver`,
  in Playwright's Chromium, headless, 2 or 3 reloads at each size. "The rows in the first frame" is the build with
  the change, with a Playwright init script that makes `document.hidden` true, so the view draws the rows at once, as
  before the change.
  - **The review page,** the fixture with a branch of the player's own: the same with the rows a frame later and in
    the first frame. 0.0138 to 0.0142 at 1,366 × 657, by turn and by edge, and 0 to 0.0008 at 1,427 × 849. In one
    column (390 × 760, 390 × 1,100, 700 × 1,300 and 768 × 1,024), 0.0002 to 0.0024: the list is in the hidden
    Analysis tab there. Nothing moves when the rows come. The shifts come from other parts: at 1,366 × 657, elements
    near the window's bottom move 16 pixels up before the review shows (0.0131), and the step bar moves 21 pixels up
    after it (0.0006).
  - **The Analysis board in one column:** the fixture's first 15 edges (8 turns), every move evaluated, with a branch
    at the second move, opened from an analysis file. With the rows a frame later, the rows moved the step bar under
    the list 40 pixels down when they came: 0.0029 of the CLS of 0.0107 at 390 × 1,100, and 0.0005 of 0.0015 at
    700 × 1,300. At 390 × 760 and 768 × 1,024 the list starts below the window's bottom, so nothing in view moved
    (0 to 0.0002). So the board in one column now draws the rows at once: 0.0073 to 0.0076 at 390 × 1,100, and
    0.0007 to 0.0010 at 700 × 1,300. The rest comes from other parts: the step bar's buttons move as it mounts
    (0.0026), and the labels and their notes come when the board reads the engine's results, which moves the step
    bar 61 pixels down (0.005).
  - The shifts that do not come from the rows are the issue abscls-73h.
- **What it gives:** by thread time, the first draw's longest task is about a third shorter, and on this computer
  (16 cores) no task of the first draw passed 50 ms after the change. The total work does not change: it moves to
  the second frame. By wall time, on this loaded machine, the measurement shows no gain. On a computer three times
  slower, the first task would still take about 100 ms, and the render task about 70 ms. To reach 50 ms there, the
  two style recalculations and the forced layouts must go too: the issue "The review's first frame computes its
  styles three times" (abscls-de1).
- **Not measured:** an unloaded machine, Edge, a slower device, and INP itself.

### strategyjam.org games through the bookmarklet and the userscript (2026-10-18)

- **What:** the bookmarklet and the userscript take a game from strategyjam.org's game page
  (`/enclosure/game/ID`), the strategy jam's site from 2026-10-17, as they take one from meaf.us (design 11,
  abscls-b60). The reader (`src/lib/game/strategyjamPage.ts`) takes the game from the props of the React component that
  draws the stage: `game.rules`, the site's rules module, and `state`, the game as the site sends it. The page's own
  rules module plays the moves again for the scores. The conversion (`src/lib/game/strategyjam.ts`) writes First as
  Blue. The Site tag is the game's page, so the review links back. The record has no TimeControl, because the site adds
  its increment for each edge.
- **The import's source** tells the sites apart (design 17): `strategyjam_bookmarklet` and `strategyjam_userscript`
  on strategyjam.org. `bookmarklet` and `userscript` stay meaf.us's, so the reports before this keep their
  meaning. Each tool names the page's host with each game (`site=` after the `#`).
- **The button's place:** at the end of the move list's legend (`.enc-legend`), in the page's own layout. A fixed
  spot does not work there: the page fills the window, and the move list holds the lower right corner. In a narrow
  window the panel under the board scrolls.
- **Checked on strategyjam.org's own page code,** in Playwright's Chromium 153: the game page's HTML, its entry
  script (`/assets/game-HJVUlX9U.js`), the Enclosure bundle (`/g/enclosure/index-BS_PtdAz.js`, rules module
  `model-rwnod0dx.js`) and its styles and fonts, served from disk by the browser's routes. Routes answered the API:
  a logged-in player (`/api/me`), and a synthetic finished game at `/api/games/ID/record`. A stand-in for the
  WebSocket failed before it opened, so the page read the record, as it does with no connection. No request went to
  strategyjam.org. The games are synthetic: the site's rules module played both seats, with the engine
  repository's `platforms/strategyjam/synthetic_games.mjs` (`scripts/strategyjam-games.mjs`).
  - The reader took all 120 moves from the page, and the same scores as the rules module in Node.
  - The bookmarklet, loaded from a build on the local preview server, opened the review. The engine found every
    move legal and gave the site's scores: Blue won by 586.4 points (1,577 to 991). For the game with two timeout
    passes (119 moves: one pass at Second's second edge, one at the start of First's turn), it gave 1,403 to 775, as
    the site did.
  - For a visitor who is not logged in, the page holds no game, and the bookmarklet says to log in. On a page with
    no game, it says that it found none.
  - The button, at the layout sweep's sizes (widths 360 to 1,920 by 10, heights 700, 860 and 1,000, with the scroll
    bars shown): over no text, control, board or scroll bar at any of the 471 sizes. The same sweep also ran
    with the button fixed in the lower right corner, as on meaf.us. There it covered the move list's scroll bar at 348
    sizes, and the gains, the legend and the replay slider at others.
  - The test browser loads the bookmarklet's code from the local preview server only with Chromium's local network
    access check turned off. Without that, Chromium blocks a script from 127.0.0.1 on a public page. The live site
    is a public address, so the check does not apply to it.
- **Not checked:** a real finished game, which needs a player's login. The reader rests on the props as the entry
  script gives them. The site's words for a resignation or a forfeit are not known: the record takes a reason with
  "resign" as a resignation, and any other win before the rules end the game as a forfeit.

### The review's custom depth up to 16,384 visits (2026-10-18)

- **What:** the review's custom depth per move takes any whole number from 256 to 16,384 visits, the range of the
  Depth for the position on screen, in place of 256 to 4,096. `CUSTOM_REVIEW` in `src/lib/analysis/engineSettings.ts`
  is the Depth's steps (`DEPTHS`, design 09). The slider keeps its doublings, now 7 stops. The settings kept in the
  browser take any whole number in the range (`inSteps`).
- **The key moments** stay at twice the review's depth (`momentVisits` in `src/lib/analysis/game.svelte.ts`), so a
  custom 16,384 searches them to 32,768 visits. The cache's budgets (`BUDGETS` in `src/lib/analysis/cache.ts`) gain
  32,768, so that a shallower question takes such a result, as it took a key moment's 8,192 before. A test checks that
  the budgets hold each depth of the settings and twice each depth of the review.
- **The time:** reviews at 4,096 visits took about 54 minutes on 9 to 16 cores. Each doubling doubles the time, so a
  review at 16,384 visits takes about 3.6 hours on those machines. Google Analytics' ranges of a review's minutes
  (`MINUTE_RANGES` in `src/lib/measure.ts`, design 17) end in 60-119, 120-239 and 240+, in place of 60+. Events sent
  before the change keep "60+".
- **No other change:** a review file, a shared link and a review's mark already take any number of visits (design
  13). The settings' help lines give no time for a custom depth, and no page gives the custom range.
- **Not measured:** a review at 16,384 visits, its time, and the workers' memory. Design 09 measured about 4 KB a visit
  in a worker's memory. From that, a worker that searches a key moment at 32,768 visits grows to about 230 MiB with
  HedgeFund 0.1 Lite, against 162 MiB at 16,384 visits. A worker's memory does not shrink, and any worker can take a
  key moment.

### A request to the visitors whose blocker stops Google Analytics (2026-10-18)

- **The problem:** an ad blocker or the browser's tracking protection stops the Google tag, also for a visitor who
  accepted Google Analytics' cookies. Those visits are missing from the data that design 17's decisions wait on. The
  site shows no ads, so the blocker removes only the counts here.
- **Decided** ([design/27-analytics-ask.md](../design/27-analytics-ask.md)): a card in the consent banner's card and
  place, after the banner, for a visitor who accepted Google Analytics and whose tag did not run. It shows on each
  page until Close, and Close keeps it closed in the browser (`hedge-school:analytics-ask:1`). Never a visitor who
  declined or has not chosen, never over the banner, never a wall, and no proxy past blockers. Its words are plain web
  writing: no ads here, what Google Analytics does for the site, and how to allow the site. The consent banner and the
  card share one component (`src/lib/ui/CornerCard.svelte`).
- **The check:** the tag did not run when its script fails to load (its `error` event), or loads and leaves
  `google_tag_manager` undefined. gtag.js defines it as it runs. uBlock Origin's stand-in for the script
  ([`googletagmanager_gtm.js`](https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/googletagmanager_gtm.js))
  replaces the queue's `push` and defines `ga`, but no `google_tag_manager`. A check of `push` would take the stand-in
  for the tag.
- **No event for the card:** it shows only where the tag did not run, so an event of its showing or of its Close
  cannot reach Google Analytics. An event on a later page, where the tag runs in a browser that showed the card, could
  count the visitors who followed the request. It is not built: a failed network load would count too, and the count
  would have nothing to compare with.
- **Checked:** the type check, the unit tests, and `tests/analytics-ask.spec.ts` on a production build with a made-up
  measurement ID (`G-TEST000000`), in Playwright's Chromium, each test 3 times. Every request to Google but the tag's
  script stopped in the browser, and none reached the network. With the script stopped, the banner showed and the
  card did not. After Accept the card showed at once, in the banner's place (the same left edge and bottom), and
  stayed on the next page. After Close it was gone, the key held `closed`, and a reload showed neither. With the
  script stopped and a Decline kept: neither showed. With the stand-in in the script's place: the card showed, inside
  a window 360 pixels wide, with no sideways scroll. With the real gtag.js from Google: `google_tag_manager` was
  defined at its load, and no card showed. Not checked: a real blocker (uBlock Origin, Brave, Firefox's strict
  tracking protection) in a real browser, and Safari.
- **Reviewed:**
  - The card's words say "It looks like" a blocker stops the tag, because a failed network load also shows the card.
    They name Google Analytics, not "the counts", and the step names tracking protection too.
  - The privacy page says that the request shows on each page until Close, not "once". It no longer states how the
    site treats blockers in the future: the privacy page promises only what holds whatever the site adds later.
  - Firefox's stand-in for Google Analytics and the tag (its SmartBlock shim,
    `browser/extensions/webcompat/shims/google-analytics-and-tag-manager.js`) defines no `google_tag_manager`. This
    comes from its source. It was not run in Firefox.
  - The test skips a build without the tag at once: the privacy page has no switch for Google Analytics' cookies
    there. Before, each test waited 10 s for the tag's script. The wait for the script's answer now ends at its own
    `load` or `error` event, not after a fixed 500 ms. A new test: a Decline on the privacy page takes the card away,
    an Accept brings it back in the same page, and a Close in another tab closes it.
  - Checked again on a build with `G-TEST000000`: the 5 tests, each 3 times, 15 of 15 passed. A throwaway check found
    the card in the page as soon as the wait ended, 20 times of 20. On a build without the ID: the layout sweep
    passed in Chromium, and the card's tests skipped.

### The layout shift of the review and the Analysis board, again (2026-10-18)

- **The problem:** the review of the change "The review's first frame" measured a layout shift of 0.0138 to 0.0142
  on a stored review at 1,366 × 657, most of it before the review shows, and 0.0073 to 0.0076 on the Analysis board
  in one column at 390 × 1,100. On 2026-10-14 the same review measured 0.0001 ("A skeleton while the review starts,
  and the time before it shows"), in Edge.
- **What brought it back: nothing, in this browser.** A build of b650aab, the commit that recorded 0.0001, and a
  build of the dev branch at 47bed2f, measured in the same way (Playwright's Chromium, headless, a buffered
  `PerformanceObserver`, 2 reloads of the stored review at 1,366 × 657): 0.0268 and 0.0271 for b650aab, 0.0139 and
  0.0142 for 47bed2f. In a same-origin iframe of 1,366 × 657, as the check of 2026-10-14 measured: 0.0274 to 0.0277,
  and 0.0142. With the gauge in place of the bar, b650aab gave 0.0126 to 0.0133. So the shifts at 1,366 × 657 came
  with b650aab itself, which brought the skeleton and the measured row above the board, and they became smaller
  after it. A bisect needs a commit without them, and this browser gives none. The reading of 0.0001 was Edge's:
  these runs did not use Edge, and this browser does not reproduce it. One shift is new since 2026-10-14: the step
  bar's buttons on the Analysis board in one column, from bd6df7c (2026-10-15, below).
- **The causes,** found by logging each frame's layout and each shift's elements and rectangles:
  - **The row above the board,** at 1,366 × 657 (0.0131, before the review shows): the board is 398 pixels wide
    there, so the row takes three lines (66.75 pixels: the area under the points, below 27.5rem). Until the page
    measured the row, `--strip` gave two lines (45 pixels). The skeleton measured it with a `ResizeObserver`, whose
    first call comes after the frame's layout, and Chromium counts the change as a layout shift: the board became
    22 pixels narrower, and the three columns moved 11 pixels towards it. The review's first frame did the same again
    (`bind:offsetHeight` uses an observer too): the side column first took the height of the taller board column
    (598.75 pixels), then 577, so the step bar under the move list moved 21 pixels up (0.0006). b650aab brought both:
    the skeleton, and the measured row.
  - **The players' names in the skeleton:** when the game's read ended after the skeleton's first frame, the names
    took the place of their grey bars, and the cards' widths changed. The red card and the bar between the cards
    moved: 0.0003 at 1,366 × 657, 0.0008 at 1,427 × 849, 0.0001 at 390 wide, in about half of the reloads. b650aab
    brought it ("the players' names show once the game is read").
  - **The report's sentence "The review is still running: the counts below are partial."** A review opened again
    shows before the engine's network loads, and until then its progress said "Loading the engine's network…" with
    the steps not counted: the sweep and the label pass counted only the positions that the passes searched after the
    network loaded, also when every result came from the store. So the report said that its counts were partial,
    then dropped the sentence when the network came, and the report's table moved 43 pixels up (0.0033 at
    1,366 × 657, 0.0011 at 1,427 × 849). It shows whenever the review shows before the network loads: the first
    reloads of a measurement, right after the import, did not have it. The sentence came with 9709ae1 (2026-10-11).
  - **The gleam on the progress bars** (`bar-glider`) moved by `left`, a layout in each frame: about 120 entries a
    load in one column while a bar's work runs, each below 0.0001 (0.0004 to 0.0008 a load). It came with 7375d51
    (2026-10-11).
  - **The step bar on the Analysis board in one column** (0.0026 at 390 × 1,100): `StepBar` decided whether the
    tools go under the steps in its observer's first call, after the first frame, so the four buttons widened from
    35 to 74 pixels. It came with bd6df7c (2026-10-15), which made the bar that Practice shares.
  - **The labels and notes on the Analysis board** came when its searches read the stored results, after the board
    showed. At 390 × 1,100 the notes moved the step bar under the list 61 pixels down (0.005). At 1,427 × 849 they
    moved the rows under them (0.0010), and at 1,366 × 657 the values' cells (0.0001).
- **The changes:**
  - **The row's height in CSS from the first frame** (`--strip` in `ReviewView.svelte`, design 06, item 5): three
    lines where the board, with a row of two lines, is 27.5rem wide or less (21.25rem with the gauge), else two. With
    three lines the board is smaller still, so the row stays narrow: the same lines that the measurement finds. A
    `clamp` is the step between the two heights. The measurement stays, for a row whose lines have other heights
    (another font).
  - **The skeleton shows once the game is read** (`gameOpen` in `src/routes/review/+page.svelte`, design 06, item
    10), so that the players' names are in its first frame. Until then the prerendered line of text shows.
  - **A review opened again counts its stored results as searched** (`fromStore` in
    `src/lib/analysis/game.svelte.ts`): its bar is full while the network loads, and the report does not call its
    counts partial (`counted` in `ReviewProgress`). `fromStore` also reads the end of a game that is not over, as
    the passes search it.
  - **The gleam moves by a transform** (`src/app.css`): a layer as wide as the bar, with the gleam in its last 70
    pixels, from one bar's width left of the bar to 70 pixels right of it. The gleam's path and speed are the same.
    The layer takes no clicks (`pointer-events: none`).
  - **`StepBar` decides as it mounts** (`src/lib/ui/StepBar.svelte`, design 06, item 4). The width that it reads is
    laid out already: its read of the steps' width forced the layout before (the issue "The review's first frame
    computes its styles three times", abscls-de1).
  - **The Analysis board reads the stored results of the moves evaluated before it shows** (`judgedPositions` and
    `fromStore`, design 21, item 4), as the review reads its own.
- **Measured** with `scripts/measure/layout-shift.mjs`: the build before (47bed2f) and the build after, in 5
  alternating pairs (`inPairs`, `verdict` in `scripts/measure/speed.mjs`), each set 3 reloads of one build, in
  Playwright's Chromium, headless. A set gives its median layout shift. The review is the stored review of the test
  fixture. The board is the fixture's first 15 edges, every move evaluated, with a branch at the second move, opened
  from an analysis file. Windows' processor use was 12 to 93% and WSL's load 1.6 to 7.1 (one minute). The layout
  shift did not follow the load: each build gave the same values at each load.

  | Page, window | Before: the sets' medians | After | The verdict |
  | --- | --- | --- | --- |
  | Review, 1,366 × 657 | 0.0174 to 0.0181 | 0 | a change: every pair −0.0174 to −0.0181 |
  | Review, 1,427 × 849 | 0.0011 to 0.0020 | 0 | a change: every pair −0.0011 to −0.0020 |
  | Review, 390 × 760 | 0 to 0.0002 | 0 | the pairs agree, but the median difference (−0.0001) is less than the spread before (0.0002) |
  | Review, 390 × 1,100 | 0.0059 | 0 | a change: every pair −0.0059 |
  | Board, 1,366 × 657 | 0.0001 | 0 | a change: every pair −0.0001 |
  | Board, 1,427 × 849 | 0.0010 | 0 | a change: every pair −0.0010 |
  | Board, 390 × 760 | 0 | 0 | none to make: the list starts below the window's bottom |
  | Board, 390 × 1,100 | 0.0076 | 0 | a change: every pair −0.0076 |

  - **What moved before,** in the 15 reloads of each size: on the review, the skeleton's columns and its row (gone
    when the review shows, so `layoutShift` names them "?"), the report's table and the note above it
    (`p.mb-3.text-xs.text-muted`), the step bar's box (`div.mt-1.5.pt-1.5.border-t`) at 1,366 × 657, and the gleam in
    2 reloads. At 390 × 1,100 the report's table, its note and a swatch. On the board, the values' cells
    (`span.col-start-4`), the move list's rows, and in one column the step bar's buttons and box.
  - **After:** nothing moved, in every reload of every size: every reload's layout shift was 0.
  - **The cost,** in pairs of 5 reloads at 1,366 × 657 (the review) and 390 × 1,100 (the board): the time from the
    navigation to the skeleton's first frame, and to the review's or the board's, did not change in a way that the
    pairs agree on (the skeleton's medians 88 ms before and 161 ms after, with spreads of 465 and 467 ms, and the
    board's 679 and 653 ms). The skeleton now waits for the game's read, which is part of the 60 to 100 milliseconds of
    the game, the tab's lock and the engine's manifest (2026-10-14). The review's first draw (`review-first-frame.mjs`,
    2 pairs of 5 reloads): the longest task by thread time 33 and 22 ms before, 23 and 22 ms after, and the draw's total
    thread time 80 and 62 ms before, 57 and 52 ms after: no loss. By wall time the sets before had a task of about 450
    ms in the draw and the sets after did not, but a trace finds the same task in both builds near `review:shown`: a
    message's handler that waits 374 to 474 ms on 5 to 43 ms of thread time, on this loaded machine. So that is no gain
    of the change.
- **The skeleton's wait for the game's read,** in 3 pairs of 5 reloads of the stored review at 1,366 × 657, the
  build before against the build after: until the skeleton shows, the prerendered line "Reading the game with the
  engine's rules…" shows, so the page is not blank. From the first paint to the skeleton's first frame, the medians
  were 17 ms before and 19 ms after (at most 33 and 92 ms). With the processor slowed 4 times (Chrome's CPU
  throttling), they were 350 and 376 ms (at most 626 and 744 ms). The skeleton's first frame came at 63 and 60 ms
  from the navigation, and at 595 and 599 ms slowed. A slow store (a large one, or a slow disk) was not measured.
- **A store that lacks results:** with 3 positions of the game removed from the store, the review said "Loading the
  engine's network…" and that its counts are partial. Once the network loaded, it searched them ("the game's shape,
  117 of 120 positions") and stored them again. With the key moments' deeper results removed, it searched the 6
  positions again. Right after the import's "Review done", the store lacked the start's deeper result, in the build
  before too: the first reload searched it again (abscls-byld).
- **What stays:** a meter's part of 7 × 6 pixels moves by less than 0.000005 when a search's result comes, about 7
  seconds after the load, on the board at 1,427 × 849: the engine's news. A row whose lines have other heights than
  here (45 and 67 pixels, in Playwright's Chromium on Windows) still changes the board's size once it is measured.
  Practice keeps its own row height, two lines, until it measures the row (`src/routes/practice/+page.svelte`): it
  was not measured.
- **Not measured:** Edge, the owner's devices, a slower device, and a review that the engine searches as it shows.

### The snapshot reads its results by their keys (2026-10-18)

- **The problem:** a snapshot (design 20) chose its search after a read of every key of the analysis store. The
  store grows with each result, so each review made the open of a snapshot slower.
- **Decided** (design 20, item 7): the review's mark names the module's search (`ReviewMark.search`), from the
  manifest's `search`, which also keys the review's results. A snapshot reads the results of that search and the
  mark's network by their keys, in one transaction: each position of the game's line, at the review's depth and at
  each deeper budget. The review then finds them in memory.
  - **A mark that names no search:** an older mark, kept before marks held their search, or the mark of an older
    review file. A review file carries the game's mark (`review`), and the load keeps it when the site ships its
    network. For such a mark the
    snapshot reads every key, as before. A mark of the site's search takes the name when a review of that search
    ends on the page (`markReviewed`), also when a deeper mark stays.
  - **A mark whose results are not all in the store** (deleted, or taken by the removal of earlier results): no
    snapshot, and the review says why, as before.
  - **The site's own search:** an earlier engine's snapshot still never takes it, with a search in the mark or
    without.
  - **The removal of earlier results** keeps the results of the mark's search for each game, so that it keeps what
    the snapshot reads. Before, the removal and the snapshot both took the first search in the store's order that
    held the line.
  - **The removal at a custom depth:** for each game's review depth, the removal keeps the result of each position
    that the snapshot shows (`readsAt`): the deepest at the review's depth or a budget, else at the sweep's depth or
    a budget. Before, it kept the deepest at any depth. A custom depth is any whole number from 256 to 16,384
    visits, and the key moments go to twice it, so the deepest result could be at a depth that the snapshot does not
    read. A Depth that the player typed did the same. The removal then took the result that the snapshot reads, and
    the game opened no snapshot. Before the read by keys, it opened a snapshot without those positions.
- **Rejected:** the search of an earlier file, from the file's results at its load. A file can hold the results of
  two searches for its line (an earlier engine's, kept until a removal, beside the site's), and the mark must not take
  the wrong one.
- **Measured** in Playwright's headless Chromium, with a throwaway script, not the site's page. The store held 5,000
  or 20,000 results with the real key shape, of about 3.6 KB each, and the line had 59 positions. A fresh page load
  came before each read. Medians of 7 runs:
  - the read of every key, with the parse of each key: 11.1 ms and 39.7 ms.
  - the read of the line's keys (10 depths for each position, 590 keys): 8.0 ms and 8.6 ms.

  Not measured: the snapshot's time to the screen, during which the rules worker also starts, and a desktop browser.
- **Checked:** the type check, and the unit tests (176 of 176 passed).
  - `cache.test.ts` checks the snapshot's read on a store in memory in IndexedDB's place
    (`src/lib/storage/memoryDb.ts`). A mark with its search does not read every key. A mark with none reads every
    key and takes the search that holds the line. A result missing, too shallow or of another network opens no
    snapshot. An earlier engine's mark that names the site's search opens none.
  - `earlierResults.test.ts` checks that the removal keeps the results of the mark's search. At a custom depth, it
    checks that the removal keeps the results that the snapshot reads, under deeper ones that it does not read.
  - `store.test.ts` checks the mark's search after a review, also on a deeper mark that stays. `reviewFile.test.ts`
    checks it after the load of a file with a search, of a file without one, and of a file whose search is not text.
  - The review page, in Playwright's headless Chromium on a build of the site, with a throwaway script. Each case
    loaded a review file through the Review tab, in a fresh browser context. The file was
    `tests/fixtures/hedgefund-review.json`, with its mark and its 244 results moved to an earlier engine's search.
    - A mark with its search opened the snapshot with no read of every key. Its label badges and its board matched
      the review of the unchanged file. The removal at the next start took the 244 results of another earlier
      search, which no game needed, and kept the 244 that the snapshot reads. The snapshot opened again after it.
    - A mark with no search opened the snapshot after one read of every key, with the same labels and board.
    - A review at 3,000 visits, with 49 results at 6,000 visits: the removal took the 49 and kept the 244 at 3,000.
      The snapshot opened before the removal and after it.
    - A file that lacked one result of the game's line opened no snapshot. The page reviewed the game again, and
      said "The engine was updated since this game's last review, so the game is reviewed again." The removal took
      the earlier search's results, which no game needed.

### The lessons on the engine's rules (2026-10-18)

- **The problem:** the lessons checked each edge with a small test written for its one position, and drew a board
  made by hand after it: a second copy of the rules. The puzzles already took their edges from the engine's rules.
- **Decided** ([design/28-lessons.md](../design/28-lessons.md)): the lessons keep their teaching boards, with only
  the edges that a step needs. Each board is a line of the notation that the engine reads (the query's `position`),
  and the page ignores `describe`'s check. `describe` gives the edge input the legal edges and Blue's nodes, and
  `describe_game` plays the visitor's edge and gives the board after it, with the cut, the regions and the areas.
  Each step keeps a test of its task only, on the engine's boards:
  - Draw an edge: any legal edge.
  - Close a region: Blue's area grows by 9.
  - Cut an enemy edge: a cut.
  - Protected edges: a cut of an edge that was not protected.

  A legal edge that fails the task is not placed: the step shows its hint, and the board stays.
- **The boards:** each one is the hand-made board as it was, written as a line. Blue moves at the start of a turn of
  two edges (`b2`, 3 edges played), as the hand-made boards had two edges left. The notation writes every board as it
  is: a player with no edges has `-`. The engine reads each line and writes it back the same. Its check finds what no
  game reaches: `edge-count` in Close a region, and `protected-joined` in Protected edges. The page ignores it. No
  step's text needed a change: the engine's boards show what each text says.
- **Without the engine,** the input keeps the rules' box, as the puzzles' does. The page draws each step's line as
  the board editor reads it (no regions), and the step says that it cannot check the edge. An edge entered before the
  engine answers waits for it, and an edge that it refuses gets "The rules do not allow this edge."
- **Also:** the line "Prototype: the lessons check edges with small hand-written tests until the engine gives the
  rules" is gone: the page checks no rule by hand. The lesson complete page offered "Next: Edges" after every lesson,
  because the page kept the lesson in a deep `$state` proxy and `indexOf` did not find it in the course. It keeps
  the course's own object now (`$state.raw`), and offers the next lesson. The puzzles page and the lessons share
  `rulesOf` (`engine/position.ts`: the input's rules from a `describe` reply), which Practice and the Analysis board
  use too, and the input's words (`EdgeInputHint.svelte`). The words are the puzzles' words, with a verb in the
  instruction for the second point: "Now click its second point". Learn starts the engine when the visitor opens the
  first lesson, not on the map.
- **Checked:**
  - The unit tests (`src/lib/learn/lessons.test.ts`), on the engine's CPU module in Node: the engine reads each line
    as it is written, with Blue to move. For each step, legal edges that do its task and legal edges that do not.
    In Close a region, C7-C10 is the only legal edge that does the task. In the two cut steps, a legal edge does the
    task when it cuts the red edge of the goal, and only then. No legal edge cuts F5-F8, and in Cut an enemy edge
    each edge that cuts starts at C7. The facts of the texts: the square's area of 9 with the scores unchanged, Red
    with no edges after the cut, and F5-F8 still protected after Blue's edge.
  - Every step in Playwright's Chromium, on a production build without the early-access switch:
    - Draw an edge: E12 refused as a first point ("Start the edge at one of Blue's nodes."), A10 marks 24 ends, B10 on
      Blue's own edge refused as an end, A10-A13 does the task, and the board after it has the new edge, placed. No
      legal edge fails this task.
    - Close a region: E9 refused, C10-C9 gets "Join the square's two open ends." with the board as it was, C7-C10 does
      the task, and the board after it has Blue's region.
    - Cut an enemy edge: Red's node E6 refused, A7-A8 gets "Your edge must cross or touch the red edge.", C7-E8 does
      the task, and the board after it has no red edge and the cut drawn.
    - Protected edges: C7-F7 refused as an end (it would cut the protected edge), C7-D6 gets "Cross the red edge
      without the glow: A9-D9.", C7-C9 does the task, and the board after it has A9-D9 cut and F5-F8 still protected.
    - Two edges a turn: the two hint edges, no input, and Continue completes the lesson. The map then shows the three
      lessons done.
    - With the engine's manifest missing: the board from the line, the rules' box, and the notice. With the manifest
      4 s late: A7-B7 entered in the rules' box got "The rules do not allow this edge.", and the board stayed.
    - The console had no errors. Its one 404 was the manifest that the check stopped.
  - After the review, in Playwright's Chromium on a new build: the map loads nothing of the engine, and the first
    lesson loads it. Every step again, with the same edges. "Lesson complete" offers Cuts after Edges, Turns after
    Cuts, and no next lesson after Turns. Without the manifest: the notice, and no edge placed. The puzzles: the
    rules arrive, and A1 is refused as a first point. The console had no errors.
  - Not checked: Edge, Firefox and Safari, and a phone's width.

### A search's final results in the batch (2026-10-18)

- **The problem:** only a search's results so far waited for the batch of 100 ms (`PARTIAL_MS` in
  `src/lib/analysis/game.svelte.ts`). Each final result applied at once, and each change of the analysis runs the
  review again. The sweep's searches end one after another: 120 in 14 s on this computer with 8 workers, and more with
  the GPU's 16 searches (abscls-s9u).
- **The change** (design 05, `BATCH_MS`, in place of `PARTIAL_MS`):
  - The batch holds every result of a search: its results so far and its final result. It keeps the deepest result
    of each position, so a shallower result of another search of the same position does not replace a final result.
    Of two results of equal depth, the later one stays.
  - What a search's end changes runs in the same batch, after its results: the passes' progress (`swept`,
    `labelled`), the end of the search's mark (`pending`, the gleam on a line), the mark of a time limit, and the end
    of the focus (the bar of the search of the position on screen). So the page shows a search's end with its result,
    at most one batch (100 ms) after the search ends.
  - A result from the browser's store applies at once, as before: a review opened again shows its results in its
    first frame (`fromStore`). A search still writes its result to the store when it ends (`cachePut`). It writes
    before its result goes into the batch, so that the end of its marks comes in the same batch, not after the write.
  - A search that ends after another network took over adds nothing to the passes' progress now. Before, a sweep's
    search that finished its visits then counted in the new network's progress. When another network takes over,
    the batch drops its results, and runs what waits for them before the analysis starts again.
- **The test:** `src/lib/analysis/game.test.ts` drives the analysis with a pool whose searches the test ends, and with
  Node's mock timers. It runs the module's runes in Node: `src/lib/testing/svelteModules.ts` removes the types with
  TypeScript and compiles the runes with Svelte's `compileModule`. It has four tests:
  - The final results and the sweep's progress wait for the batch. This test failed before the change.
  - A position stays pending until the batch shows its search's final result. This test failed before the change.
  - A shallower result in the same batch does not replace a final result. This test fails when the batch keeps the
    latest result instead of the deepest.
  - A search of the previous network adds nothing to the analysis or the progress. This test fails when a search's
    end does not check the network, and when the batch outlives the network.
- **The measurement** (`scripts/measure/review-sweep.mjs`): the main thread's tasks from the sweep's start to its end,
  as the review's progress line names them. Each sweep reviews the fixture's game
  (`tests/fixtures/hedgefund-review.json`, 120 edges, so 120 positions) from its record, in a fresh browser context, so
  that no stored result exists. Playwright's Chromium 153, headless, 1,366 × 657 pixels. Chrome's trace gives each
  task's wall time and thread time. Each build ran 5 sweeps, in 5 pairs, and the build that ran first took turns.
  - **2 search workers,** the GPU off, under `scripts/machine run --threads 2`.
  - **8 search workers** (the default on 16 cores), under `--threads 8`, with the GPU set to On. The GPU did not start
    in Playwright's Chromium: the engine settings said "The GPU did not start: 9943656", though WebGPU gave an
    adapter. So this series ran on the 8 CPU workers alone.
- **The machine:** the engine repository's match held 4 of the 12 job threads during both series, and another
  worker's job of 2 threads ran during part of the first. Windows' processor use and the load in WSL (one minute)
  before each sweep:

  | Pair | 2 workers, before | 2 workers, after | 8 workers, before | 8 workers, after |
  | --- | --- | --- | --- | --- |
  | 1 | 62%, 2.20 | 36%, 2.49 | 43%, 2.25 | 49%, 2.31 |
  | 2 | 44%, 2.29 | 34%, 2.49 | 49%, 2.21 | 46%, 2.22 |
  | 3 | 55%, 2.35 | 46%, 2.17 | 45%, 2.04 | 65%, 2.34 |
  | 4 | 53%, 1.97 | 44%, 2.04 | 71%, 2.24 | 47%, 2.27 |
  | 5 | 72%, 2.19 | 71%, 2.22 | 43%, 2.44 | 40%, 2.31 |

- **Measured,** the median of each build's 5 sweeps:

  | Per sweep | 2 workers, before | 2 workers, after | 8 workers, before | 8 workers, after |
  | --- | --- | --- | --- | --- |
  | The sweep's time | 35.8 s | 34.9 s | 14.2 s | 14.0 s |
  | Tasks over 50 ms, by wall time | 4 | 5 | 5 | 5 |
  | Their time beyond 50 ms each, by wall time | 151 ms | 397 ms | 303 ms | 356 ms |
  | Tasks over 50 ms, by thread time | 0 | 0 | 0 | 0 |
  | The longest task, by thread time | 7 ms | 7 ms | 11 ms | 11 ms |
  | Tasks of 10 ms or more, by thread time | 0 | 0 | 1 | 1 |
  | The main thread's thread time | 4,507 ms | 4,280 ms | 2,648 ms | 2,409 ms |

  - **The main thread's thread time, 8 workers:** each pair's difference (after less before) is −361, −231, −198,
    −233 and −197 ms. All pairs agree, and the median is −233 ms (9%). The spread between the sweeps of one build is
    138 ms before and 150 ms after, so the gain is larger than both.
  - **The same, 2 workers:** the pairs disagree (−562, −266, −29, −113 and +70 ms): no change.
  - **Long tasks:** no task of any sweep passed 50 ms of thread time, in either build. The longest took 13 ms. The
    tasks over 50 ms by wall time are waits for a processor under the job's quota, and the pairs disagree on them in
    both series (8 workers: −3, +4, −3, −6 and +2 tasks).
- **What it gives:** on this computer, a sweep has no long task in either build. With 8 workers, the batch takes about
  a tenth of the main thread's work out of the sweep. The results came about 3.4 a second with 2 workers and 8.5 a
  second with 8, fewer than one a batch, so a batch held few of them. With the GPU's 16 searches the results come
  faster, and a batch holds more.
- **Checked:** a whole review of the game on the new build, 2 workers under `--threads 2`, in a fresh browser context.
  The progress line named each step in turn: the game's shape, the move quality from 38 s, the key moments from
  475 s, and the Greats' confirmations from 501 s. "Review done" showed at 516 s, and the page threw no error.
- **Not measured:** the GPU, Edge, an unloaded machine, a slower device, and the label pass.

### The engine's next search does not wait for a result's write (2026-10-19)

- **The problem:** a search wrote its final result to the browser's store (`cachePut`) before its task in the pool
  ended (`search` in `src/lib/analysis/game.svelte.ts`). So its engine took the next search only after the write had
  committed (abscls-im3).
- **The change** (design 05, "The results show in batches"): the pool's task ends when the engine's search ends. The
  write and the batch then follow without the engine.
  - The search writes its final result first. The result goes into the batch when the write has committed, with the
    passes' progress, the mark of a time limit, the end of the search's mark (`pending`) and the end of the focus. So
    all of them show in one batch, as before.
  - The analysis and the progress show a final result only once it is stored. So the game's mark of a review done
    (`markReviewed`, design 20) comes after every result that it covers is stored, as before.
  - These stay as they were: a search writes its final result once, and only when it ran to its budget and did not
    stop. A write that fails does not stop the result from showing. A search that ends after another network took
    over writes nothing and shows nothing.
  - A search that the pool stopped to give way shows its result by itself. The pool runs it again, and the search
    ends with the result of that later run.
  - A task that ends with no search (its position already held to the budget, the engine off, a stale focus, or
    another network) no longer marks its position as pending for one batch. Only a search on an engine marks it.
  - A cost, by reasoning: a pass's last task now ends before its write commits, and the next pass starts only after
    the write. In that time no task runs, so the pool's idle release (`IDLE_RELEASE_MS`: 60 s, 15 s in a hidden tab)
    can start. A write that waits longer than that ends the search workers, and the next pass loads them again. A
    write waits that long only behind a long transaction on the store, such as the removal of older results.
- **The test** (`src/lib/analysis/game.test.ts`): the tests' store in IndexedDB's place (`src/lib/storage/memoryDb.ts`),
  whose writes a test can now hold, and a pool with a number of engines. Three new tests, a stricter test and a new
  check:
  - With one engine, the engine takes its next search while the write is held. The result and the sweep's progress
    show in the batch after the write. This test failed before the change.
  - The end of a search's marks (`pending`, the focus) comes in the batch of its result, after the write: the test of
    a pending position now holds the write.
  - A result whose write fails shows, with its progress.
  - A search that fails ends its marks in the next batch, and the page gets the error. The test fails when the mark
    ends with `finally`, which leaves the failure unhandled.
  - A search of the previous network writes nothing: a check added to that network's test.
- **The measurement** (`scripts/measure/review-sweep.mjs`, which now also reads the gaps): the sweep of the fixture's
  game (120 positions at 32 visits) from no stored result, in Playwright's Chromium, headless, at 1,366 × 657 pixels.
  2 search workers on the CPU, the GPU off, under `scripts/machine run --threads 2`. The GPU does not start in
  Playwright's Chromium (abscls-3cjw), so the series measured the CPU workers only. An init script wraps `Worker`,
  and notes when the page sends each search and when its final reply comes. A gap is the time from a search's final
  reply to the next search that the page sends to the same worker, where both searches are the sweep's. Each sweep
  had 117 gaps. Each build ran 5 sweeps, in 5 pairs, and the build that ran first took turns.
- **The machine:** very loaded. The engine repository's training `v2a` held 8 threads and the GPU, and another
  worker's job of 2 threads ran during every sweep. Windows' processor use and the load in WSL (one minute) before
  each sweep:

  | Pair | Before | After |
  | --- | --- | --- |
  | 1 | 94%, 22.7 | 93%, 15.9 |
  | 2 | 98%, 23.2 | 100%, 30.1 |
  | 3 | 98%, 32.9 | 95%, 32.9 |
  | 4 | 97%, 30.0 | 93%, 27.3 |
  | 5 | 99%, 30.2 | 85%, 27.6 |

- **Measured,** each sweep, before → after. The share is the gaps in all over the two engines' time (twice the
  sweep's time).

  | Pair | Median gap | 90th percentile | Gaps in all | Their share | The sweep's time |
  | --- | --- | --- | --- | --- | --- |
  | 1 | 1.2 → 0.3 ms | 7.6 → 0.9 ms | 1,256 → 117 ms | 1.14% → 0.07% | 55.1 → 84.4 s |
  | 2 | 6.5 → 0.3 ms | 137.9 → 1.9 ms | 8,150 → 149 ms | 4.40% → 0.08% | 92.6 → 89.7 s |
  | 3 | 2.2 → 0.3 ms | 23.0 → 0.6 ms | 1,609 → 67 ms | 1.17% → 0.06% | 69.0 → 57.4 s |
  | 4 | 3.0 → 0.3 ms | 48.8 → 0.5 ms | 1,868 → 39 ms | 1.31% → 0.04% | 71.5 → 54.3 s |
  | 5 | 3.4 → 0.2 ms | 51.6 → 0.9 ms | 2,734 → 1,189 ms | 1.83% → 0.94% | 74.6 → 62.9 s |

  - **The gaps:** every pair agrees on the median gap, the 90th percentile and the gaps in all. The two builds' sweeps
    do not overlap on any of the three: the largest value after the change is below the smallest before it (0.3
    against 1.2 ms, 1.9 against 7.6 ms, 1,189 against 1,256 ms). But `verdict` (`scripts/measure/speed.mjs`) gives
    no change for them. Under this load, the spread of the sweeps before the change (5.3 ms, 130 ms and 6,894 ms) is
    wider than the median difference (−2.7 ms, −48 ms and −1,546 ms).
  - With the wait, single gaps took up to 1.6 s. Without it, the median gap stayed at 0.2 to 0.3 ms. One gap of the
    fifth pair's sweep after the change took 1,112 ms, and the other 116 gaps of that sweep came to 77 ms. The
    measurement did not find its cause. A gap also holds any wait for the next search to reach the queue.
  - **The sweep's time:** the pairs disagree (+29.3, −2.9, −11.6, −17.2 and −11.7 s), and each build's spread (37 s
    before, 35 s after) is wider than all the gaps of a sweep. No change measured.
  - **The main thread's thread time:** the pairs disagree (+806, −942, +533, −63 and −1,539 ms): no change. No task of
    any sweep passed 50 ms of thread time, in either build (the longest took 16 ms).
  - A pair run first, as a check of the script, at 88% and 76% of the processor: 467 ms of gaps in all before the
    change, 34 ms after it.
- **The decision:** the engine goes on while the write commits. On this loaded machine, the wait held the engines for
  1.1% to 4.4% of a sweep's time. The change takes that below 0.1%, except for the one long gap above. It costs no
  main-thread time, and it keeps every order that the page relies on. The gain in the sweep's time is smaller than
  this machine's noise, so this measurement cannot show it.
  - Not measured, by reasoning: the wait is longer where a write is slower. Examples are a slow disk, a phone, and a
    write that waits for another transaction on the store, such as the removal of earlier results (design 20), which
    holds the store while it runs. The GPU's 16 searches end more often than 2 CPU workers' searches, so there the
    write's wait comes more often.
- **abscls-byld** (Review done before the start's deep result is stored): the change does not touch the possible
  causes that its issue names. A search writes on the same condition as before (it ran to its budget and did not
  stop), and the result of a slice goes into the batch as before.
- **Not measured:** the GPU, an unloaded machine, Edge, a phone, and the label pass.

### The Review tab before the page's code runs (2026-10-19)

- **The problem:** the prerendered `/review` had the Review tab's title and description (design 23). But its body
  showed only "Reading the game with the engine's rules…" until the page's code ran. On this machine, the code ran 90
  to 550 milliseconds after the address opened ("A skeleton while the review starts, and the time before it shows").
  Then the tab waited for the browser's games (`ready` in `ReviewHome.svelte`), so that "Continue your last review"
  did not push the page down. The prerendered page cannot know whether the address names a game: the game stays
  after the `#`, which no server gets (designs 17 and 22).
- **The change** (design 22, "The Review tab", and design 06, item 10), on the model of the theme's script in
  `src/app.html`:
  - `/review` prerenders the Review tab's fixed parts (the heading, the text, the import, "Load a review file" and the
    footer) beside the line of text. CSS hides the line.
  - A script in the page's head (`src/lib/review/pageMarks.ts`) marks the root element before the first paint. It
    puts `data-review-game` on an address that names a game: `holdsGame`, or a kept game's id after the `#` or in an
    older address's query. It puts `data-review-last` where this browser keeps a last review
    (`learn-enclosure:last-review:1`, `LAST_REVIEW` in `src/lib/game/store.ts`). The CSS variants `review-game` and
    `review-last` (`src/app.css`) then hide the tab and show the line, and keep the room of "Continue your last
    review". The head holds the function's own text, so its test checks what the page runs. The test also compares
    the script with `holdsGame`. The page runs the function again as its code starts, for an address that a
    navigation in the page opened.
  - The page holds both until it has read its address (`shown` in `src/routes/review/+page.svelte`, which replaces
    `noGame`). The tab reads the browser's games only once the page has chosen it (`chosen`), so that a review's
    address does not ask for persistent storage or count the visitor's games.
  - `ready` is gone. The link, the list of games and the line on storage come together once the tab has read the
    games and the storage's state (`read`). It reads the two at the same time.
  - "Continue your last review" takes two lines below 640 pixels and one from 640, and an ellipsis cuts its game to
    fit. So the page knows the link's height before the read. Before, its line wrapped where the game's name needed
    it.
  - With a script, the footer stays invisible from the first paint until the read. With no script, CSS's
    `scripting` media feature (Tailwind's `noscript` variant) shows it.
- **Two shifts in the first build of the change.** The measurement below found them, and the change fixes them:
  - the list of games came above the footer and moved it down: 0.0015 to 0.0035 at the desktop's sizes. Hence the
    footer's wait.
  - at 390 pixels, the link's game on one line was wider than the column, and the tab's grid column grew to it, so
    the section's text moved when the link came: 0.27 at 390 × 760 and 0.18 at 390 × 1,100. The link has `min-w-0`.
- **Checked** in Playwright's Chromium, headless, on the local build, at 1,366 × 657, with a script that read each
  frame's state in `requestAnimationFrame`:
  - with JavaScript off, `/review` shows the heading, the import and the footer, with the title "Review a game ·
    Hedge School" and its description. The line is hidden. `/review#game=…` then shows the Review tab too: without
    its code, the page cannot open a game.
  - with the review of the test fixture stored, `#game=`, `?game=` and `#record=` showed the Review tab in none of
    59 to 102 frames, and the line in the first 11 to 16. `/review` showed the tab from its first frame, the heading
    at the same place in each of about 150 frames, and the link from the first to the third.
- **Measured** with `scripts/measure/layout-shift.mjs tab` (new: the Review tab with the fixture's review stored,
  reloaded), the build before (d4f0f21) and the build after, in 5 alternating pairs of 3 reloads, at 1,366 × 657,
  1,427 × 849, 390 × 760, 390 × 1,100 and 1,920 × 1,080. Every reload of both builds gave 0, and nothing moved. The
  build before waited for the games: it showed nothing until then, so it had no shift either. The stored review
  (`layout-shift.mjs review`, 3 pairs of 3 reloads at 1,366 × 657 and 390 × 1,100) also gave 0 in every reload of
  both builds: the line that the mark shows before the skeleton moves nothing.
- **The layout sweep** (`tests/layout.spec.ts`) now covers the Review tab too, with the fixture's game kept: "Continue
  your last review" and the list of games. It passed in Playwright's Chromium, every page at every size. Its Edge
  project did not run.
- **Reviewed:**
  - The script takes the key of the last review from `store.ts` (`LAST_REVIEW`), as an argument in the head's text,
    so the two cannot differ. The tab reads its games and the storage's state at the same time.
  - The script read every `game` after the `#`, and the page reads the first. So `#game=&game=g1` showed the line,
    then the Review tab. The script now reads the first `game` too, and its test compares it with `holdsGame`.
  - Checked in Playwright's Chromium, headless, on the local build, with the fixture's review stored. On the Review
    tab at 320, 360, 390, 639, 640 and 1,366 pixels wide: the tab showed in every frame and the line in none. The
    heading and the footer stayed at one place, and no layout shift occurred. The link's room had the link's height:
    78 pixels below 640 and 52 from 640. No page scrolled sideways. The link's accessible name held its whole text,
    also where the ellipsis cut the game.
  - The Review tab asked for persistent storage and read the list of games. `#game=`, `?game=` and `#record=` did
    neither, and showed the tab in no frame.
  - Odd addresses (`#%ZZ%`, `#=x`, `#game=%E0%A4%A`, `#game=x&game=`, `?game=%`, `#%`, `#at=3&x=1`) threw no error.
    Each ended on the page's message for it, and the script's mark agreed with what the page then did.
  - After a review, a navigation in the page to Tools and back to the Review tab took off the stale mark, and the
    tab showed. With JavaScript off at 390 pixels, `/review` and `/review#game=…` showed the heading, the import and
    the footer.
- **What stays:** a last review whose game is no longer kept closes the link's room when the games are read, and the
  page moves up. A delete forgets the game's review too (`deleteGame` in `src/lib/game/store.ts`). Where the page's
  code does not load, the footer stays invisible. Before the change, the page then showed only its line of text.
- **Not measured:** Edge, the owner's devices, a slower device, and a store that reads slowly.

### The rules worker starts with the manifest (2026-10-19)

- **The problem:** the review page read the game, then the tab's lock on it, then the engine's manifest, one after
  another. It started the rules worker only after the three ("A skeleton while the review starts, and the time
  before it shows", 2026-10-14: 60 to 100 ms in Edge). The worker needs only the manifest, and no document gave a
  reason for the order.
- **The order before the change,** in the code: `onMount` read the game (`loadGame`), then took the lock
  (`holdReview`), then read the manifest (`EngineSession.load`). Then it chose between a snapshot (design 20) and the
  review. The snapshot's pool of the rules alone (`EnginePool(0)`) started its rules worker, and the review's pool
  (`EngineSession.start`) started its rules worker with the search workers. Four later changes kept this order: "The
  review's first frame" (2026-10-17), "The network checked once for a page" (decisions/engine.md, 2026-10-17), "The
  layout shift of the review and the Analysis board, again" (2026-10-18) and "The snapshot reads its results by
  their keys" (2026-10-18).
- **The change** (design 05, item 1): the page reads the three at the same time. When the manifest is read and the
  lock is held, the session starts the rules worker (`EngineSession.startRules`). The pool that the page then chooses
  takes it (`takeRules`): the review's or the snapshot's. `EngineWorker.init` starts a worker once: the pool's own
  call gets the first call's start.
  - **A game open in another tab** starts no engine: the worker waits for the lock. When another tab takes the lock
    before the pool starts, the session's end (`EngineSession.end`) stops the worker. The session then starts no
    pool (`EngineSession.start` answers null), and a snapshot whose results come after the end stops its own pool.
  - **A game that this browser lacks** gives its message, as before. The page stops the rules worker if it started,
    and frees the lock, so that a tab that imports the game later can review it.
  - **A page that closes while the reads run** ends the session in the same way, and frees the lock once it is held.
    Its stopped searches show no error and count none (`engine_error`).
  - **A snapshot that the store cannot give** stops the worker with its pool. The review then starts its own, as
    before.
- **Checked:** the type check, and the unit tests (190 of 190 passed). `pool.test.ts` checks that a pool takes a
  rules worker started before it, with a fake worker: the pool makes no rules worker of its own and sends the module
  once. On builds before and after the change, in Playwright's headless Chromium, with a throwaway script, in one
  browser context with the fixture's review stored:
  - **A game this browser lacks** (`#game=nosuchgame`): the message showed, and no lock was held for that id. With
    the change, the rules worker started in one run (the manifest and the lock came before the game's read failed),
    and the page stopped it. In another run it did not start.
  - **The game open in another tab:** the message showed, and that tab made no worker. Review here moved the review
    there. The first tab said that its review stopped, and stopped its 3 workers.
  - **A snapshot:** the fixture's results copied to an earlier search, and the game's mark set to an earlier
    module. The snapshot opened with one worker, the rules worker.
  - **A page closed while the reads run:** the manifest came 2 s late, and the page went to About once the lock was
    held. With the change, no worker started, and no lock stayed held. Before the change, the snapshot's rules
    worker started after the page closed, and it did not stop.
- **Measured** with `scripts/measure/review-start.mjs`: reloads of the fixture's stored review at 1,366 × 657 pixels,
  in Playwright's headless Chromium, 5 pairs of 5 reloads for each run. The job ran under `scripts/machine run` with
  2 threads, and the page saw 4 cores (`CORES=4`), so the review ran 2 search workers. The engine repository's
  training (v2a) held 8 threads and the GPU through most of the runs. The medians of the sets' medians, before and
  after, with each pair's difference:

  | Run | Machine | Rules worker made | Rules worker ready | The review shows |
  | --- | --- | --- | --- | --- |
  | 1: the local preview | 60 to 89% CPU, WSL load 10 to 24 | 62 → 60 ms (−21, −6, −13, −3, +6) | 122 → 123 ms (−22, +8, −9, +7, +8) | 162 → 163 ms (−42, +3, −10, +4, +15) |
  | 2: the local preview | 87 to 100% CPU, WSL load 29 to 38 | 36 → 13 ms (−49, −16, −14, −28, +1) | 151 → 131 ms (−65, −19, −10, +123, +69) | 298 → 264 ms (−93, −77, +55, +116, +82) |
  | 3: 50 ms more for each request | 33 to 100% CPU, WSL load 12 to 33 | 100 → 81 ms (−73, −28, −22, −19, −15) | 161 → 168 ms (−41, +32, −13, +15, −9) | 214 → 225 ms (−21, +190, −16, +30, −9) |

  - Run 1 counts from the navigation. Runs 2 and 3 count from the page's start (its `onMount`): the page's own
    scripts load first, and on this machine that time varied by up to 400 ms. In run 1, the script noted the page's
    start at the game's read or the lock's request, not at the open of IndexedDB. In the build before the change,
    that start came later, so run 1 gives no times from the start.
  - Run 3 adds 50 ms to each request that reaches the server (Chrome's network emulation), as on the deployed site,
    where the manifest's check is a round trip. The files in the browser's cache take none.
  - **The three reads,** from the page's start: on the local preview (run 2), one after another, the game came at
    9 ms, the lock at 22 ms and the manifest at 28 ms. At the same time, they came at 13, 13 and 16 ms. That is less
    than the 60 to 100 ms measured in Edge on 2026-10-14. With 50 ms more for each request (run 3), the manifest came
    at 83 ms before the change and at 66 ms after.
  - **Layout shift:** 0 in every reload of the three runs. `scripts/measure/layout-shift.mjs`, the review at
    1,366 × 657, 5 pairs of 3 reloads: 0 before and after, and nothing moved.
- **What it gives:** the rules worker is made sooner, by about the time of the game's read and the lock. In run 3
  every pair agrees, by 15 to 73 ms. The median gain of 22 ms is less than the spread between the sets of one build
  (82 and 58 ms), so by the rule of pairs it is no change. The rules were ready, and the review showed, at about the
  same time: the pairs disagree in every run. The worker's own start, from its creation to its reply, took longer
  after the change in the medians of each run's reloads: 56 → 65 ms, 113 → 129 ms and 68 → 121 ms. By the sets'
  medians, the pairs disagree on it in every run, so that is no change either. Why the earlier worker gave no
  earlier rules was not traced.
- **Not measured:** Edge, the deployed site, an unloaded machine, a slower device, and the snapshot's time to the
  screen.

### A stored review says "Review done" before the network loads (2026-10-19)

- **Decided:** a review opened again whose every step comes from the browser's store is complete before the engine's
  network loads. Its progress line says "Review done: N visits a move." in the first frame, in place of "Loading the
  engine's network…". The network still loads for the searches that the player asks for (the position on screen, a
  line).
- **Before:** abscls-73h added the flag `counted` (every step has its results), which only dropped the report's
  "partial" sentence. The progress line still said "Loading the engine's network…" until the network came, then
  changed to "Review done".
- **The change** (`src/routes/review/+page.svelte`, `rawProgress` and `reviewDone`): the test of completeness comes
  before the test of `engineReady`, and a complete review has no progress. The flag `counted` is gone. A review with a
  result missing says "Loading the engine's network…" while the network loads, then what runs. The snapshot of an
  earlier review (design 20) has no progress, as before. After Review again, the snapshot's analysis stays on screen
  until the new review's analysis replaces it: its results are an earlier engine's, so they never make the review
  complete.
- **What follows from "Review done":** the Export menu and the game's mark of the finished review (`reviewDone`)
  follow the same test, with no test of `engineReady`. Design 13 calls a review finished when every step of its bar
  is done, and the export reads the store with no search, as the Review tab's does. With the line alone, "Review
  done" stood beside an Export button that was off ("Export once the review is done.") until the network loaded.
- **The review's events** (design 17): a review that is complete from the store opened done (`done_before`), as its
  definition says ("the review opened with its results stored"), and sends no `review_done`. Before, such a review
  whose mark did not cover it had `done_before` false and sent a `review_done` of about 0 seconds as the network
  loaded. It also showed why the game is reviewed again (design 11) when its mark named an earlier engine, though
  nothing ran (by reading the code, not measured).
- **The engine's panel** shows no sign of the network's load. The issue said that it does. Until the network loads,
  the panel shows the position's stored result, and its search bar gleams once a search starts. A sign of the load is
  a question for a later change.
- **Checked** in Playwright's Chromium at 1,366 × 657, on the builds before and after, with the fixture's review
  (`tests/fixtures/hedgefund-review.json`) stored and reloaded, on a loaded machine:
  - **A complete stored review** (settled by reloads until a reload ran no search): before, the line was "Loading the
    engine's network…" in the first frame (the mark `review:shown`) and "Review done: 512 visits a move." 52 ms later.
    After, the line was "Review done: 512 visits a move." in the first frame and never changed.
  - **A review with every second stored result deleted:** before and after, the line was "Loading the engine's
    network…" in the first frame, then "Reviewing: the game's shape, 69 of 120 positions" and its counts, and the
    report said that its counts were partial.
  - **Layout shift** (`scripts/measure/layout-shift.mjs review`, 5 pairs of 3 reloads): 0.0000 in every reload, before
    and after. Nothing moved.
  - **The review's first frame** (`scripts/measure/review-first-frame.mjs`, 3 pairs of 5 reloads): the first draw's
    median thread time was 47, 50 and 61 ms before, and 45, 59 and 49 ms after. The pairs disagree, so it is no
    change. Wall times varied with the machine's load.
- **A review stored one key moment short** shows "Reviewing: the key moments, deeper…" after the network loads, as
  before. The page does not call it complete. This is abscls-byld: the store lacks a key moment's deeper result after
  "Review done".
- **Checked again with the Export menu's change**, in Playwright's Chromium at 1,366 × 657, on a loaded machine, with
  the build of 490ae2e (the line's change alone) before and the build with the Export menu's change after:
  - **A complete stored review** (the fixture imported, then 3 reloads, each with a wait of 3 seconds after "Review
    done"), 3 reloads each. Before: the first frame said "Review done: 512 visits a move." beside an Export button
    that was off ("Export once the review is done."). The button came on with the network, 109 to 561 ms later.
    After: the button was on from the first frame. In both, the engine's panel said "512 of 1,024 visits" with no
    gleam until the network loaded, then searched the position on screen.
  - **Review again** on a snapshot (the stored results and the mark moved to a made-up network file with the same
    id). Before: the line said "Review done: 512 visits a move." for about 90 ms after the click, from the snapshot's
    results, then "Loading the engine's network…". After: "Loading the engine's network…" from the click on.
  - **Layout shift** (`scripts/measure/layout-shift.mjs review`, 5 pairs of 3 reloads): 0.0000 in every reload, before
    and after. Nothing moved. The script reloads at once after the import's "Review done", so its store can lack a
    key moment's deeper result (abscls-byld below): these reloads may not all have been complete reviews. On a
    complete review, the change only turns the Export button on sooner, which changes no element's size (by
    reasoning, not measured).
  - **abscls-byld:** right after the import's "Review done", the store lacked the start's deeper result (0 at 1,024
    visits), on both builds, and the first reload searched it again. When each reload came at once after "Review
    done", the store stayed one key moment short: the 3 later reloads each said "5 of 6 positions". With a wait of 2
    or 3 seconds after each "Review done", it was complete after at most 3 reloads. The stored deeper results
    differed between runs: the start and positions 23, 24, 25, 40 and 41 in one, and 39 in place of the start in the
    other. These runs did not show which key moment stayed short in the first run.
- **Not measured:** Edge, the deployed site, a slower device.

### Review or Analyze for a game from the tools (2026-10-19)

- **What:** a game that the bookmarklet or the userscript brings from meaf.us or strategyjam.org no longer opens the
  review at once. The import page (`/import`) asks first: "Review the game" or "Analyze on the board" (design 21, item
  5). A player who watches a game often wants to show how a move could have gone, not to wait for the review of the
  whole game. A partner's link (`/import#record=…`, design 18) still goes straight to the review: its button says
  "Review".
- **What the two sites' pages hold about the position on screen** (read from the engine repository's copy of
  meaf.us's code, `games/enclosure/tools/.site_cache`, and its saved copy of strategyjam.org's game page,
  `runs/strategyjam/game-page`):
  - **Both have a replay slider,** an `<input type="range">`, whose value is the count of the game's moves before the
    position on screen: 0 at the start, a pass one move. The record counts its moves the same way, so the value is
    the board's `at` as it is.
  - **meaf.us:** `input[aria-label="Replay position"]`, under the board, with "Position 12 of 40", "Live position" or
    "Final position" beside it. Its component keeps the index in its state, and follows new moves while it is at the
    last one. The slider exists only in a watcher's view and in a finished game's view from the History page. A game
    that the player plays shows its last position, with no slider.
  - **strategyjam.org:** `input.replay-slider` ("Move"), in the panel's replay row, live or in a replay. The arrow keys
    and the move list (`aria-current="step"`) move it too. The index is a hook's state in the component that draws
    `.stage`, not one of its props, so the slider is the simpler and steadier way to read it.
- **The tools send it:** `at` in their link (`shownMove` in `meafPage.ts`, `jamShownMove` in `strategyjamPage.ts`).
  With no slider, `at` is empty, and the board opens at the game's last move: the position that a page without a
  replay shows. The import page reads only a whole number (`readImportHash`), and the board opens a position past
  the game's end at its end. The userscript's own open after the reload as a watcher's view on meaf.us sends no
  position. meaf.us draws the moves with its slider at the old end, and moves it to the new end only after that, so
  a read in between gives an earlier position. The player moved no slider there, so the game's end is right.
- **The page names only the two sites** ("A game from meaf.us", "the position that you saw on strategyjam.org"), as
  the import's source does (`toolSource`): a link's own `site` text never shows.
- **Where the choice shows:** on `/import`, by the review's arrival step (`Arrival.svelte`), which already reads the
  tools' links and asks to update an out-of-date tool. The tools open `/import#tool=…` in place of `/review#tool=…`.
  The bookmark's loader does not change (`BOOKMARK_VERSION` stays 1): the code that it loads opens the new address.
  The page reads the record before the choice, so a record that it cannot read fails at once, as an import to the
  review. The engine's rules check it on the page chosen.
  - **Review the game** keeps the game in the list of games, then reviews it, as before.
  - **Analyze on the board** keeps no game in the list. The page goes to `/analysis#record=…&at=…&via=<source>`, and
    the board asks before it replaces the player's board ("Replace your analysis?").
  - **An out-of-date tool:** the page says how to update it above the choice. Before, the review kept the game first,
    then said so, with the review a click away.
- **Why `/import`** (changed the same day: the first build showed the choice on `/review`): design 22 had
  deprecated `/import`, since a page named "import" cannot say where the game goes. With the choice, the player says
  where, so the name says what the page does. A page named "review" that offers the Analysis board says the wrong
  thing.
- **Every game from outside comes to `/import`,** a partner's link too. `/import#record=…`, with `save=` or not, keeps
  the game and opens its review at once, with "Save to" the partner, as `/review#record=…` did. Partners were never
  told that `/import#record=…` moved to `/review`, so enclosuregame.com's links may still use
  `/import#record=…&save=…`. The page for developers names `/import#record=…` again, and its changes say so.
  - **`/review` keeps only its own ways in:** `game=`, `packed=`, `from=` (a partner's kept review sent back), and
    `tool=` (below). `/review#record=…` no longer opens a game: it gets the Review tab, and the analytics wait while
    the record stays in the address.
  - **Nothing forwards to the review now,** so the event `import_forwarded`, its tab in design 17, and the review's
    console warning for a forwarded link go. The arrival step also takes `from=` and `packed=` on `/import`, so a
    partner's older link to `/import#from=…` still opens its review.
  - **The other uses of `/review#record=…` move:** the review's speed sweep (`scripts/measure/review-sweep.mjs`) opens
    `/import#record=…`, which an older build forwards to the review.
- **A tool from before `/import`** (a userscript that Tampermonkey has not yet updated) opens `/review#tool=…`, which
  still shows the choice and the notice to update the tool. It counts `tool_out_of_date` on `/review`, where every
  tool's game is from such a tool. That choice can go when that count stops (design 22, item 4).
- **The choice's words,** text that a player follows, in strict Simplified Technical English:
  - "Review the game": "The engine examines all the moves of the game. It gives a label to each move. Hedge School
    keeps the game in your list of games."
  - "Analyze on the board": "The Analysis board shows the position that you saw on meaf.us." (or "the position after
    the last move of the game" when the tool sent no position) "Make your own moves to examine other lines. Hedge
    School does not keep the game in your list of games."
  - The tools page's steps say to click one of the two. The userscript's button and menu entry say "Open this game in
    Hedge School". Its name stays "Review in Hedge School": Tampermonkey knows a script by its name and namespace, so
    a new name would be a second script.
- **The events** (design 17): `import_game` counts the import on `/import`: a tool's game when the player chooses,
  with `import_to` review or analysis and the tool as `import_source`, and a partner's link at once, as `site_link`.
  The funnel's second step takes `/import` beside `/review`, and the tab **Old tools** shows the page (design 17, "The
  changes for the import page"). The board takes the tool's
  source from `via`. A player who closes the page imports nothing. `tool_out_of_date` counts as the page shows the
  choice. An import that fails on the import page or the review names its step in `import_failure`, as design 17 gives
  them: `link` for a broken address, `record` for a record that the page cannot read, `rejected` when the rules or the
  storage refuse it. Before, every one was `rejected`. A crafted link can name a tool in `via`, as it can in `tool=` on
  the import page: the source is the address's word, for the analytics only.
- **A player with today's tools:** the bookmark loads `/bookmarklet.js` at each click, so it sends the position at
  once. A userscript that Tampermonkey has not yet updated opens the review and sends no position: it gets the
  choice there, the board opens at the game's end, and the page says that the userscript is older than the site's,
  until Tampermonkey takes the new one.
- **The Analysis board started its analytics before its address changed.** SvelteKit's `replaceState` (version
  3.0.1) is async, and the board called it without waiting, then started the analytics. So the analytics started
  while the record was still in the address, for every link to the board with a game. The board now waits for it. A
  check on a build with a made-up Google tag found it (below).
- **Checked** in Playwright's Chromium, on a local build. The first build showed the choice on the review
  (`tests/tool-choice.spec.ts`, each test twice, all passed): a bookmarklet's link with `at=1` shows the choice, and
  Analyze opens the board with the game's three moves as its main line, at the first move, with no game in the list.
  A second game asks "Replace your analysis?", and "Replace it" opens it at its `at`. A link with no `at` opens the
  board at the last move. Review keeps the game and opens its review. A partner's link opens the review with no
  choice. A look at the choice in a window 1,280 pixels wide and in one 390 pixels wide found no problem.
  - **On `/import`** (the same spec, one run, all passed): the tests above on `/import`, and a link with an `at` past
    the game's end opens the board at the last move. A userscript's game from before `/import` on `/review#tool=…`
    gets the choice and the notice to update it. `/import#record=…` keeps the game and opens its review with no
    click. With `save=`, the review's Export menu offers "Save to enclosuregame.com" once the review is done.
    `/review#record=…` shows the Review tab and keeps no game. `/import` alone goes to `/tools`. The layout sweep
    passed on every page, with the choice on `/import` (a userscript's game, below the notice to update it).
    `npm run check` and `npm test` (201 tests) passed, and the built `/import` carries `noindex`.
  - **The analytics,** on a build with a made-up Google tag (`VITE_GA_ID=G-TEST000000`), with every request to Google
    stopped, and each command to the tag recorded with the address at that time: on `/import`, the analytics start
    once the game has left the address. Review counts one `import_game` there (review, bookmarklet), and Analyze one on
    the board (analysis, bookmarklet). A partner's link counts one on `/import` (review, `site_link`), and no
    `import_forwarded`. No command carries the game's moves, after the board's fix. `/review#record=…` and `/import`
    alone send no command. The 5 tests of the ask to allow Google Analytics (design 27) passed on that build.
- **Not checked:** the sliders on the live sites. meaf.us shows a guest only its sign-in page, and strategyjam.org's
  list of games stayed "Loading…" for a guest, so the readers rest on the two copies of the sites' code. The import
  events in Google Analytics itself: the check above stops them before they leave the browser.

### The site's text, a second pass (2026-10-19)

- **What:** the text by what it does (CLAUDE.md, "Writing the site's text"), with the `/asd-ste100` skill and its
  linter (`ste-lint.py`). The linter read the prose of each page, without its code and its `<pre>` blocks. It also
  read the string literals of `src/lib`. Its check of the passive voice finds only some forms, so the pass also read
  each page in full. The counts below are the linter's notes before and after.
- **STE's sentence rules, for what explains:** the passive verbs that the first pass left, in the active voice.
  - About (6 notes, then 0): "Enclosure's designer is webgoatguy", "A Border Collie keeps the school", "The notation
    page describes the records", "it sends nothing to a server", "Its networks have the version in their names", "we
    make it independently of webgoatguy, …".
  - How a review works (6, then 2): the key moments "get another search", the position on screen "gets a search", a
    label shows "once the search of each position of the move reaches 256 visits", "The notation page describes the
    game records".
  - Notation (9, then 0): "as the players see it", "the turn has no edges left", "a player's enclosed areas at each
    turn's end", "A writer sorts each list", "The player to move cannot cut it", "the turn in progress", "Red's
    triangle scored 4.5", "A writer escapes `"` and `\`", "Where the game took place", "when it is not the standard
    start", "does not follow the online rules". "begins" became "starts", the page's word for it, and "analyse" became
    "analyze", the interface's spelling.
  - For developers (5, then 1): "A site where people play Enclosure", "the link needs none", "Hedge School refuses a
    record with a `Rules` or a `Position` tag", "The board reviews nothing, and the game does not go into the player's
    list of games", "to join the list", "Hedge School would still read the old form".
  - Learn's lessons (2, then 1): "the game adds each player's enclosed area to their score", "You cannot cut a
    protected edge", "you can cut Red's other edge too". "set up with the first" became "prepare with the first": no
    phrasal verb.
  - Practice: "We have not yet measured how strong each setting plays." The present perfect stays: the sentence gives
    the state now.
- **Strict, for what a player follows:** the messages say who acts. "Hedge School reviews a game in one tab at a
  time", "Hedge School could not load this file", "This game uses other rules", "Edge … has the cut mark, but it cuts
  nothing". The notice of a new engine or network: "A new version of the engine", "We updated the engine after this
  game's last review, so the engine reviews the game again", and the home page's Export: "The engine has a new
  version". Design 12 quotes the new words of the About page.
- **Left, where the rules leave it to judgment:**
  - How a review works, "once a game is decided": "decided" gives the state of the game, and no one decides it.
    "display" next to "show": "display settings" is the settings' name.
  - For developers, "Once the review is done": "Review done" is the name of that state on the review.
  - Learn's lessons, "The edges a player places in a turn are protected during the opponent's next turn": "protected"
    is the state that the notation marks with `*`. The edges become protected when the turn ends, so "stay protected"
    would say more than the rules.
  - Notices, "unless you have written permission": not a compound tense. "written" describes the permission.
  - Notices, "The engine is built from a fork of KataGo": the engine repository gives this sentence word for word
    (its design 21, "The wording for the site's notices page", and request 14).
  - The review, "Engine off. The review is paused.": "paused" gives the state that the progress line shows.
  - Practice's one note is a semicolon in the page's script, not in its text.
  - "Not analysed yet" in `src/lib/review/model.ts` stays with the same words in `ReviewView.svelte`, so that the site
    shows one spelling until both change.
  - The pages that invite (the home page and its cards, the consent banner, the Support Us dialog, the Analytics ask)
    read clearly as plain web writing. They did not change. The Analytics ask keeps "turn off your ad blocker": design
    27 counts all its words as text that invites.
- **Left for a later pass (abscls-6npo), in files that other work changed at the time:**
  - `ReviewView.svelte`: "Pin its line on the board; click again to unpin it" (a semicolon), "Close the settings, or
    drop an edge begun" (hard to read), "Not analysed yet" (the spelling, also in `model.ts`), "mind how much it has"
    in the workers' help.
  - `Arrival.svelte`: "The review could not be loaded" and "The game could not be imported" (passive, in an error),
    "/import is deprecated", and the share link's note: sentences of 30 words and more, with the phrasal verbs "fills
    in" and "comes out".
  - `bookmarklet.ts`: "Check the connection, then click it again." (two instructions). `meafPage.ts`: the message
    "no game found on this page…" has four sentences, one long, and the phrasal verb "comes back".
  - The privacy page: its passive verbs ("it is kept here" twice, "could not be sent yet", "is not kept", "can be told
    apart", "cannot be sent", "is then kept", "are drawn by the script itself"), and "delete" next to "remove". The
    board editor: its help "Click an edge's two points to mark it: …" has 28 words. The Tools and Analysis pages: no
    notes.

### The analysis and the review in packages/ (2026-10-19)

- **Decided:** a strategy-jam game gets a site of its own in this repository, with an Analysis board and a review
  (abscls-8tl1). The parts that it shares with Hedge School move into `packages/` before the jam's game is known
  (design 26 item 4, design 29): `@abstractclass/engine` (the engine's client and workers, the pool, the error text),
  `@abstractclass/storage` (the browser's stores) and `@abstractclass/analysis` (the game interface, the review's model
  and labels, the move tree, the cache, the analysis of a game, the engine session, the GPU control, the engine
  settings' general part and the kept tree's shape).
- **The game interface** (`packages/analysis/src/game.ts`): a site gives its game's types and a few functions. Equality
  and a name for a move, the move of a name, a position from the engine's fields, a move played, the rules for the
  player's moves, a line's step, the notation's turn numbers, and the engine's points for one of Go's. Enclosure's game
  is in Hedge School's `src/lib/review/enclosure.ts`, with Enclosure's own part of the review.
- **Read again:** design 26's map put the review's model among Enclosure's parts. Its turn is a run of one player's
  moves, so its rules hold for any game. Enclosure's part was its move type (an edge as four numbers), its position, the
  cut, the notation's turn numbers, the players' names and the texts that say "edge".
- **What stays in Hedge School:** the board, the edge input, the notation and the records, the imports, the engine
  settings' networks and key, the practice bot, and every page. The views (`ReviewView.svelte` and its components)
  stay too: they draw Enclosure throughout, two branches change them now (abscls-6xg, abscls-91ca), and only a second
  board shows their seams. The jam site's template splits them (abscls-8tl1.2). Design 29 lists the seams.
- **Hedge School's behaviour does not change:** the shared types keep the stored fields' names (`blueWin`, `edge`), so
  the cache's shape stays 5 and every stored result and file stays readable. The shared functions that compare moves
  take the game, and the site's `enclosure.ts` gives them Enclosure's game, so the site's calls and its tests stay as
  they were. Equality is Enclosure's `sameEdge`, as before. A candidate's band in points is 3 times the game's score
  scale: 36, as before.
- **How it moved:** commits of pure renames (`git mv`), then the edits, so that Git follows each file across the move
  for the branches in flight. No file comes back at a moved path.
- **A fix on the way:** `scripts/home-replay.mjs` read `LABEL_VISITS` with a regular expression from a file that no
  longer held the number, so it threw before it began. It now imports the number from the cache.
- **Checked** after each stage, on this machine, as design 26 item 2 checks a move: `npm install` (the lockfile),
  `npm run engine`, the type checks (the site's svelte-check, the packages' tsc), the unit tests, the build
  (`VITE_EDITION=early`, `VITE_STORE_PRACTICE_GAMES=on`), and the layout sweep in Playwright's Chromium on a preview of
  the build.
  - **The engine and the storage:** 0 type errors. The site's 190 unit tests and the packages' 9 pass. The sweep: 12
    passed, 5 skipped (the analytics-ask tests, which a build without Google Analytics skips).
  - **The analysis:** 0 type errors. The site's 167 unit tests and the packages' 38 pass: the 23 tests that moved with
    their modules, and 6 new tests of the game interface on the test game. The sweep: 12 passed, 5 skipped.
  - `npm ci --dry-run` accepts the lockfile.
- **Not checked:** the preview deploy, which runs after the merge, Edge, and the deployed site.
- **The review** (2026-10-20) changed these, with no change of a stored shape:
  - `enclosure.ts` gives Enclosure's game to the shared functions in one place (`withGame`), so that their parameter
    lists are not copied by hand. `playerOf` turns the engine's side into a player.
  - The game interface: `parseMove` joins `Moves`. The shared position type is `PositionInfo`, apart from Hedge
    School's `GamePosition` (a position of describe_game). The new type `MoveJudgment` has no Enclosure word in its
    name. The session takes the site's analytics as one option, `tracker`.
  - The engine package names `onnxruntime-web` as a peer dependency: before, only the site named it.
  - Design 29 now states the limit of the turns (one move or two), the rules for a move's name, the names that keep
    Enclosure's words, the tuning that every site shares, the database's stores, and what the engine package takes
    from the site's build.
- **The review's checks**, at the review's last commit, through `scripts/machine run` with 2 threads:
  - `npm ci`, `npm run engine`, svelte-check (948 files, 0 errors), the site's 171 unit tests, each package's `tsc`
    and tests (7, 2 and 29), and the build: all pass.
  - The sweep in Playwright's Chromium: 21 passed and 5 skipped. The layout of `/editor` went past the test's 10
    minutes once, in a run of 22 minutes on a loaded machine. It passed alone in 32 s. An earlier run of the sweep,
    before the review's last commit, passed all 22 tests, `/editor` in 33 s.
  - A real game in Chromium, through `/import#record=…`: `1. D10-G10 2. N11-Q10 L10-N11 3. D10-G9 G9-H10 4. N9-Q10
    L10-N9 5. G9-H8`. The settings: Lite (512 visits a position), the position on screen to 1,024 visits with no time
    limit, two workers, the GPU off. The labels are the same as dev's build gives for the same game and settings,
    by turn and by edge (55 and 50 titles in the move list). A reload keeps the review (done from the store in under
    half a second, with the same labels) and the Analysis board (its line of 8 moves and its position).
  - The branch's build opens what dev's build stored in the same browser: the review is done from the store in
    0.4 s, with dev's labels and no new result stored (20 results before and after), and the Analysis board shows
    dev's line.
  - The GPU worker's module loads from the build. WebGPU was not tested: a training job held the GPU.

### A branch's preview numbers its edges from where it leaves the game (2026-10-19)

- **Asked for:** a player who wants to show a line from the game, for example in a screenshot, should get all of it
  numbered. The preview of a branch's move started at the row's first move. A row that forks from another branch
  starts at the fork, so the edges that the two branches share showed drawn but unnumbered.
- **Decided:** pointing at a branch's move shows the board at the position where its line leaves the game's line, and
  numbers every edge from there up to that move. With the game A1 A2 A3 A4 and the branches A1 B1 B2 B3 and A1 B1
  C1 C2, pointing at B3 numbers B1, B2 and B3 as 1, 2 and 3, and pointing at C2 numbers B1, C1 and C2 as 1, 2 and 3.
  A review and the Analysis board do the same, because both use one move list. The engine's best line under a
  Mistake or a Blunder (design 07, item 15) already starts where it leaves the game.
- **Kept:** a played move's preview (item 14) shows the position after the move, as before. These stay too: one edge
  at a time or all at once, the cuts and regions from the branch's own positions, and the end of the preview 120 ms
  after the pointer leaves. The status line now says where the numbering starts: "Branch preview: 3 edges, numbered
  from the position after edge 1."
- **Done:** `branchLine` in `tree.ts` chooses the line from the path and the game's moves. The preview uses it, and
  so can the image of a line (abscls-yeqg). Design 07, item 13, describes it, and the help of "Preview branches" says
  that the line starts where it leaves the main line.
- **Checked:** `npm run check`, `npm test` (198 checks, the engine's among them), the build and the layout sweep. A
  script built the issue's tree on the stored review in `tests/fixtures/hedgefund-review.json` and pointed at its
  moves in Chromium, on the production build. A review and the Analysis board gave the same results, with one edge at a
  time and with all at once:
  - B3 and C2 each numbered 1, 2 and 3 from the position after edge 1.
  - A branch of a branch numbered its 4 edges from the same position.
  - A branch from the start numbered from the start.
  - A branch in place of the game's last move numbered from the position after edge 119.
  - The numbers went away when the pointer left.
  - A played move showed the position after it, with no numbers.

  In the review, the engine's best line under the Blunder of turn 7 numbered from the position after edge 11, where it
  leaves the game.

### A review in a hidden tab (2026-10-19)

- **The question** (abscls-6xg): a browser gives a hidden tab less. Does a review there run slower, and where does
  the time go: in the search workers, or on the page's main thread (the batch's timer, the animation frames, a timer
  that the next search waits for)? A delay that the page makes is fixed, and the visitor is not told about it. What
  is left, the page tells the visitor.
- **What a browser does to a hidden tab,** in Chromium and Edge on Windows. This measurement checked each point
  in its set-up, or read it in Chromium's source where the entry says so:
  - The page draws no frames, and its timers run at most once a second. After 5 minutes hidden, a chained timer (a
    timer set by a timer, 5 deep or more) runs once a minute (developer.chrome.com, "Heavy throttling of chained JS
    timers beginning in Chrome 88"). The review's own timers are not chained: the batch's timer and the pool's idle
    timer are set from a worker's message or a write.
  - **The timers' budget,** from Chromium's source (`third_party/blink/renderer/platform/scheduler/`:
    `main_thread/page_scheduler_impl.cc`, `main_thread/frame_scheduler_impl.cc`,
    `common/throttling/cpu_time_budget_pool.cc`): 10 seconds after the page hides, Chromium charges the run time of
    each of its timer tasks to a budget. The budget starts at 1 s, grows by 0.01 s a second (1% of the processor),
    and holds 3 s at most. A timer waits while the budget is below zero, with no limit on the wait. The charge is the
    task's wall time, so a busy processor makes it larger. Messages, from a worker or posted by the page, are not
    charged. When the page shows again, the budget stops. Edge is built on Chromium. This measurement did not read
    Edge's own source.
  - A worker's timers: Chromium does not slow them. Edge runs a hidden tab's worker timers on the system's timer
    tick, 15.6 ms.
  - The tab's renderer process gets the Idle priority class and Windows' power throttling (EcoQoS): Chromium sets
    its execution speed (1/1), and Edge its execution speed and timer resolution (5/5). The search workers are
    threads of that process. A renderer in front keeps Normal, with no throttling. Seen outside
    `scripts/machine run`, on a blank page, so with no load.
- **The set-up** (`scripts/measure/review-hidden.mjs`): the review of the test fixture's game (120 positions) from no
  stored result, at 1,366 × 657 pixels, with 2 search workers on the CPU, the GPU off, and the rest of the engine
  settings at the site's defaults. The GPU does not start in Playwright's Chromium (abscls-3cjw), so this measures the
  CPU workers only. Each run starts a browser of its own, headless, with a new profile
  (`scripts/measure/speed.mjs`, `launchHideable`), under `scripts/machine run --threads 2`. A browser that
  Playwright launches never hides a page (docs/working-notes.md, "A hidden tab in Playwright"), so the script starts
  the browser itself and connects over CDP. A new tab in front hides the review's tab, as a visitor's other tab does.
  No window showed on the screen. The set-ups:
  - **front:** the tab opens the game's record (`/review#record=` in the builds measured, `/import#record=` in the
    script now) and stays in front.
  - **hidden:** the same, and a new tab comes to front once the review shows (`review:shown`), before the sweep starts.
    The sweep then runs hidden for under 5 minutes.
  - **late:** the tab opens the About page and is hidden. 5 minutes 40 seconds later, it opens the record by a link in
    the page. The sweep then runs in a tab hidden for over 5 minutes.

  Each run checks its set-up: the share of the sweep's time that `document.visibilityState` was "hidden", and the
  interval of a chained timer of 250 ms. The runs measure the sweep (`sweep`) or the whole review to Review done
  (`review`).
- **A fault in the first runs:** Edge signed each new profile in to the Windows account, and synced that account's
  extensions into it. Their pages hid the tab in front, and they used the processor. So the first Edge runs are void,
  and this entry leaves them out. `launchHideable` now keeps the profile apart, with the switches that Playwright
  uses and two settings of Edge's own, and each run checks at its end that the profile has no account. The Chromium
  runs had no account and no extension.
- **The machine:** loaded. The engine repository's training `v2a` held 10 threads and the GPU, and the measurement had
  the other 2. Each table gives Windows' processor use and the load in WSL (one minute) before each run. The first two
  Chromium sweeps ran on a machine with almost no load.
- **The sweep,** in the build before the changes below (`fe7c137`), each run in its order. The sweep's time on the
  page runs from its first step's line to the next step's line. Its time in the engine runs from its first search to
  its last search's final result. The main thread's time is its thread time during the sweep, from Chrome's trace.

  Chromium:

  | Set-up | Load | On the page | In the engine | Visits a second, a worker | The batch's wait | The chained timer | Main thread |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | front | 29%, 0.02 | 39.6 s | 39.5 s | 64 | 103 ms | 253 ms | 5,045 ms |
  | hidden | 31%, 0.14 | 34.6 s | 34.3 s | 73 | 889 ms | 998 ms | 370 ms |
  | front | 94%, 18.7 | 50.5 s | 50.4 s | 51 | 104 ms | 254 ms | 7,028 ms |
  | hidden | 85%, 19.3 | 39.3 s | 38.5 s | 65 | 849 ms | 1,000 ms | 391 ms |
  | late | 76%, 14.9 | 55.0 s | 54.9 s | 46 | 756 ms | 999 ms | 585 ms |
  | hidden | 91%, 36.2 | 58.1 s | 57.5 s | 44 | 734 ms | 999 ms | 549 ms |
  | late | 96%, 46.0 | 42.3 s | 42.1 s | 59 | 753 ms | 1,000 ms | 438 ms |
  | front | 63%, 20.7 | 47.6 s | 47.6 s | 55 | 103 ms | 254 ms | 6,669 ms |
  | late | 60%, 20.5 | 45.0 s | 44.0 s | 57 | 883 ms | 998 ms | 499 ms |
  | front | 72%, 16.3 | 40.9 s | 40.8 s | 62 | 103 ms | 253 ms | 6,115 ms |
  | hidden | 67%, 15.5 | 44.0 s | 43.6 s | 57 | 814 ms | 1,000 ms | 536 ms |

  Edge:

  | Set-up | Load | On the page | In the engine | Visits a second, a worker | The batch's wait | The chained timer | Main thread |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | front | 79%, 19.2 | 41.1 s | 41.0 s | 61 | 103 ms | 253 ms | 5,867 ms |
  | hidden | 61%, 18.0 | 41.1 s | 40.2 s | 64 | 846 ms | 999 ms | 398 ms |
  | late | 58%, 15.5 | 41.2 s | 41.1 s | 61 | 859 ms | 999 ms | 418 ms |
  | hidden | 76%, 14.4 | 52.4 s | 52.2 s | 48 | 726 ms | 1,000 ms | 554 ms |
  | late | 97%, 19.3 | 61.8 s | 61.0 s | 43 | 801 ms | 1,000 ms | 556 ms |
  | front | 100%, 40.1 | 62.8 s | 62.7 s | 41 | 105 ms | 258 ms | 5,197 ms |
  | late | 93%, 33.3 | 38.4 s | 38.3 s | 65 | 849 ms | 1,001 ms | 397 ms |
  | front | 62%, 8.4 | 39.4 s | 39.3 s | 65 | 104 ms | 253 ms | 5,407 ms |
  | hidden | 59%, 10.0 | 39.0 s | 38.1 s | 66 | 862 ms | 1,000 ms | 369 ms |

  - **The checks:** every front sweep was hidden for 0% of its time, and every hidden and late sweep for 100%. The
    chained timer ran every 253 to 258 ms in front, and every 998 to 1,001 ms (the median) in a hidden tab. Before
    each late sweep, it ran once a second up to 300 s after the hide. Then it ran once a minute: in Chromium next at
    317 to 335 s, and in Edge not again before the sweep started at 340 s. In the late sweep itself, after the page's
    load by the link, it ran once a second again. The measurement did not find why.
  - **The medians** of the loaded runs, on the page: Chromium front 47.6 s, hidden 44.0 s, late 45.0 s. Edge front
    41.1 s, hidden 41.1 s, late 41.2 s. Under this load, a hidden sweep was not slower than a sweep in front. The
    spread of each set-up (up to 23 s) follows the load, not the set-up.
- **Where the time goes:**
  - **The workers:** their visits a second follow the load in all three set-ups. Under `scripts/machine run`, the job
    object holds every process at BelowNormal (docs/machine.md), so the Idle class did not apply. The power
    throttling did, and it did not slow the workers that this measurement could see.
  - **The main thread:** in front, 5.0 to 7.0 s of thread time during the sweep, most of it for frames. In a hidden
    tab, 0.37 to 0.63 s. No task of any sweep took over 20 ms of thread time.
  - **The batch:** its timer waited 103 to 105 ms (the median) in front, and 726 to 889 ms in a hidden tab. A
    sweep's last result then showed 34 to 106 ms after it came in front, and 74 to 990 ms in a hidden tab. The
    engines did not wait for it. The pool's longest time with no search came at the sweep's end, before the label
    pass's first search: 2 to 13 ms, and 58 ms in one Edge sweep at 97%.
- **The worker's yield** between two slices of a search (`scripts/measure/worker-yield.mjs`): a worker in an empty
  page yields 200 times in a chain, by a timer of 0 ms and by a message to itself. The table gives the median from the
  sixth yield on, after the browser's clamp of chained timers.

  | Browser | Set-up | By a timer | By a message | From the stop to the search's end |
  | --- | --- | --- | --- | --- |
  | Chromium | front | 4.6 ms | 0.0 ms | 48.0 ms (51.5 ms) |
  | Chromium | hidden | 4.2 ms | 0.0 ms | 50.3 ms (59.8 ms) |
  | Edge | front | 4.5 ms | 0.0 ms | 0.1 ms (50.3 ms) |
  | Edge | hidden | 15.2 ms | 0.0 ms | 50.4 ms (51.8 ms) |

  The longest yield by a message was 0.1 ms in each set-up, and by a timer 6.5 to 90.4 ms. The stop: in each set-up,
  the page posted a stop 20 times, as a search's fourth slice of 50 ms started. The last column gives the median time
  from the stop's post to the search's end, and the longest in brackets. Each search ended at the end of the slice
  that ran when the stop came. A stop that came after the worker's own message would wait for one more slice: about
  100 ms. In Edge in front, the median was 0.1 ms: the stop most often came during the yield, before the worker's own
  message, and the search ended there. These runs did not record the machine's load.

  A search in slices of 32 visits (the position on screen and the key moments, 1,024 visits each) yields about 31
  times, 26 of them after the clamp. With a timer, that adds about 0.8% to a slice of 530 ms, and 2.9% in a hidden
  tab of Edge. A label search (slices of 256) yields once, before the clamp.
- **The changes,** each with a test that failed before it:
  - **A search in slices yields by a message** (`src/lib/engine/channel.ts`, `searchInSlices`), not by a timer. A
    stop that comes during a slice still runs first, in Chromium and Edge (the yield's measurement above). The HTML
    standard gives each message port a task source of its own, so it does not set that order. The tests
    (`src/lib/engine/channel.test.ts`): the search waits for no timer between its slices, and a stop between two
    slices ends the search at the next slice.
  - **The batch comes without its timer when no search runs or waits** (`src/lib/analysis/game.svelte.ts`, with the
    pool's `idle` in `src/lib/analysis/pool.ts`). The key moments wait for the label pass's last result, and Review
    done waits for the last result of all. Each waited for the batch's timer: in a hidden tab, up to a second, and
    longer once the timers' budget was spent. Now the batch comes in a task of its own once the results are stored,
    when the pool has no search to run. The test (`src/lib/analysis/game.test.ts`): with one engine, the last
    results show without the batch's timer.
  - **A focus with a time limit also stops at its first result past the limit** (`game.svelte.ts`, `search`). A
    timer of the page stopped it, and the next search waited for that timer. A hidden tab ran it late. A result comes
    from the worker as a message, which the hidden tab does not hold. The test: with the clock past the limit and
    the timer not run, the search stops at its next result, and the position shows as stopped at the time limit.
    This one was found by reading the code. The review's default has no time limit, so the runs did not measure it.
- **The timers' budget, seen once:** in the hidden review of the build after the changes, at 100% and 30.4, the
  batch's timer waited 102 s once during the sweep, and the chained timer 103 s. The searches went on: the longest
  gap between one engine's searches was 116 ms. The sweep's end showed 43 s after its last result. A timer task of
  about 1 s, on a busy processor, makes a wait of about 100 s. With the changes, no search waits for a timer of the
  page, so the wait holds only what the hidden tab would show.
- **The pool's idle release** (abscls-im3: a pass's last write, then the next pass, with no task in between): it did
  not happen. No search worker ended in any run, in either build, and no worker was made after the sweep's start.
  In the three Edge reviews, which saved each search's times, the pool had no span of over 50 ms with no search.
  The label pass's first search started 2 to 5 ms after the sweep's last search ended. One engine waited at most
  201 ms for its next search: at the sweep's end, for the other engine's last search of the sweep, because the label
  pass waits for the sweep's results.
- **The whole review,** to Review done, in the build before the changes and after them (with the changes but the
  last, the time limit, which the review does not use):

  | Build | Browser | Set-up | Load | The game's shape | Move quality | The key moments | Great moves | In all | Review done after the last result |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | before | Chromium | hidden | 61%, 11.8 | 39.9 s | 557.0 s | 49.0 s | 29.0 s | 675.0 s | not saved |
  | before | Edge | hidden | 87%, 26.6 | 56.4 s | 566.0 s | 28.0 s | 17.0 s | 667.5 s | 830 ms |
  | after | Chromium | front | 51%, 14.4 | 41.6 s | 467.2 s | 57.2 s | 36.1 s | 602.1 s | not saved |
  | after | Chromium | hidden | 100%, 30.4 | 125.7 s | 562.4 s | 27.0 s | 15.1 s | 730.1 s | not saved |
  | after | Edge | front | 75%, 16.8 | 38.3 s | 453.8 s | 27.4 s | 15.8 s | 535.3 s | 5 ms |
  | after | Edge | hidden | 75%, 9.7 | 45.2 s | 407.0 s | 23.0 s | 13.3 s | 488.6 s | 3 ms |

  Each step's time runs from its line in the progress slot to the next step's line. The last column runs from the
  last search's final result to Review done on the page. The Chromium runs did not save each search's times. Every
  review checked its set-up, as the sweeps did, and no worker ended in any of them. Under this load, a hidden review
  was not slower than a review in front, and each total follows the load. These runs are one of each, under
  different loads, so they do not measure the changes' effect on the total. They show one effect: in a hidden tab,
  Review done came 830 ms after the last result before the changes, and 3 ms after them.

- **What is left: the priority.** Inside the queue's job objects, the Idle class did not apply, so these runs
  measured the power throttling only. A visitor's browser runs in no such job. There, the hidden tab's renderer
  process is in the Idle class. Windows runs its threads only when no thread of a higher class is ready to run. On a
  processor that other programs keep busy, a hidden review can then get much less time than a review in front. This
  is by reasoning: this machine runs every heavy job in a job object of the queue, so these runs could not measure the
  effect.
- **The notice** (design 06, item 7): while the review has work to run, the second line of the progress slot says
  "A review in a hidden tab can be slower." Its title (the tooltip) says "When you cannot see this tab, the browser
  can give the review less processor time." The line goes when the engine is off and when the review is done. A
  review that runs again because the site's engine changed gives that line to its reason. The words follow strict
  Simplified Technical English by its sentence rules (the `/asd-ste100` skill). ASD's dictionary was not available,
  so no one checked the words against it.
- **Not measured:** the GPU worker (abscls-3cjw), the Idle class's effect, phones (whose browsers can freeze a hidden
  tab), macOS, a processor with efficiency cores (where Windows can move a throttled process's threads to them),
  Firefox and Safari, a window behind other windows or minimized, and a review of a game with custom settings.

### The layout sweep runs in Edge only when asked (2026-10-20)

- **What:** the project `edge` of `apps/hedgeschool/playwright.config.ts` comes only when the environment has
  `HS_EDGE=1`. With no variable, `npm run test:layout` runs the project `chromium` alone. `npx playwright test --list`
  gives 27 tests without the variable and 54 with it.
- **Why:** on 2026-10-19 the Edge runs of a worker signed temporary profiles in to the owner's Windows account and
  synced the owner's extensions. The workers' rules say `--project=chromium`, but one plain `npm run test:layout` was
  enough to start Edge again.
- **The base URL stays** the owner's preview (port 4173). A worker sets `BASE_URL` to its own preview. The config's
  comment and `docs/working-notes.md` say so.
- **CI is as it was:** `.github/workflows/tests.yml` runs `--project=chromium` on Linux (all tests) and on Windows
  (`tests/layout.spec.ts`). It never ran Edge, so it needs no change.

### The board editor: the right button, chains, and a count that follows the board (2026-10-20)

- **Asked for:** a position in the board editor (design 21, item 10) took many clicks, and choices that a player
  cannot always make: the edge count and the scores.
- **Decided:**
  - **The right button draws the other player's edge,** as drawing programs do: in MS Paint the left button draws
    the main colour and the right button the second. With Blue's tool, a left click draws Blue and a right click
    Red, and the other way with Red's. The click that completes an edge sets its player. With the marks, the right
    button does what the left does. **X** swaps the two players' tools, as Photoshop's X swaps its two colours. The
    editor has no notes, so its right button was free. The Analysis board keeps its right button for notes (design
    07, item 16). A touch screen keeps the tool buttons.
  - **Chains:** after an edge, its end stays as the next edge's first point, so an enclosure's chain of edges takes
    one click for each edge. Escape ends the chain, and so does a click on that point again, which is the way on a
    touch screen. A removed edge ends the chain, and the marks take no chain.
  - **The edge count follows the board:** the edges drawn, all but the two start edges, until the player types a
    count, which then stays. "Blue to play" and "Red to play" change the count to the next count with that mover.
    With a count from the board, the choice stays as the player draws edges. The scores stay as they are until the
    player types them. The page says that the engine uses this edge count and these scores. The notation stays a
    complete position: a cut removes an edge, a timeout's forfeited edges count, and a score adds the areas at each
    turn's end (the engine repository's design 04), so neither the count nor the scores follow from the board. An
    exact position comes from a real game.
- **Choices made in the building:**
  - **The start edges are not in the count.** The standard start has two edges at the count 0, so a count of all the
    edges on the board would make the standard start count 2. The edges drawn, less A10-D10 and Q10-T10, are the
    edges played when no edge was cut and no turn forfeited. They are a lower bound on the count in any game.
  - **A position pasted or brought from another page** follows the board when its count is the one that the board
    gives, with or without a mover chosen, and else keeps its count as typed. The browser keeps the rule beside the
    position being made (`hedge-school:editor-count`), so that a reload keeps it: the notation alone cannot tell a
    typed count from a count of the board that has the same value.
  - **A drag always begins its edge at the pressed point.** With chains, a point is nearly always waiting, and a drag
    from another point would else draw an edge from the chain's end to the pressed point. The board tells the page
    that a drag's press begins an edge.
  - **Remove all edges** keeps a typed count. Standard start makes the count follow the board again.
- **Where the chains and the two-click edge meet:** a new edge that starts near the last edge's end needs the chain
  ended first (Escape, or a click on the end again). Else its first click draws an edge from the chain's end. A point
  too far for an edge begins a new edge, as before. This is the one way that the two can confuse. The help says how
  to cancel the selected point, and the dashed edge from the waiting point shows what the next click draws.
- **Done:** `followBoard`, `chooseMover` and `ruleOf` in `src/lib/editor/position.ts` give the count, with checks in
  `position.test.ts`. The board takes the right button on a point when the page asks for it (`rightClicks`) and has
  no notes, and tells the page each click's button and whether it begins an edge (`PointClick`). The editor has a
  "Keys and clicks" list under its tools. The paragraph about the count and the scores follows the sentence rules of
  Simplified Technical English, and the help list follows its strict mode (the `/asd-ste100` skill and its linter).
  ASD's dictionary was not available, so no one checked the words against it.
- **Checked:** `npm run check`, `npm test` (175 checks), the packages' check and tests (43 checks), the build, and
  the layout sweep in Playwright's Chromium (11 passed, `/editor` among them). A script drove `/editor` on the
  production build in headless Chromium, with a mouse and with Playwright's touch emulation (390 by 844 pixels), and
  all 45 of its checks passed:
  - Left and right clicks with each tool, and X in both directions. X in the position field left the tool as it was.
  - A chain of four edges that closed a square, then Escape. A click on the chain's last point ended the chain, and
    so did a removal.
  - A drag from another point while a chain waited drew its own edge.
  - The count as edges were drawn and removed, a typed count that stayed for both, and the mover choice with a count
    from the board and with a typed one. A reload kept the mover chosen.
  - The marks with the left and the right button, with no chain.
  - No context menu showed on a right click in the editor. On the Analysis board, a right click drew a note's ring.
  - Taps drew a chain, and the Red tool button worked by touch.
- **The review changed:**
  - **The browser keeps the count's rule** beside the position. Read back from the notation alone, a typed count with
    the value of a count from the board followed the board after a reload: with 3 edges drawn, a typed 5 came back as
    Red's next count, and 3 more edges made it 6.
  - **The help's words** follow strict Simplified Technical English, and they no longer name the chain or the tool's
    player. The key is "Escape", as in the review's list. The paragraph about the count says that a mover chosen can
    make the count 1 or 2 more than the edges drawn.
  - **The code:** the page derives the count from the position and its rule (`followBoard`) in one place, so that no
    change of the edges can leave the count behind. The key and the help table are utilities that the review shares
    (`kbd` and `help-table` in `app.css`). The start edges come from `STANDARD_START`. `otherPlayer` in
    `enclosure.ts` gives the other player.
  - **Checked:** `npm run check`, `npm test` (175 checks), the packages' check and tests, the build, and the
    Playwright tests in Chromium on a preview of the build (21 passed, 6 skipped). A script drove `/editor` in
    headless Chromium, with a mouse and with Playwright's touch emulation (390 by 844 pixels), and all 58 of its
    checks passed: the checks above, and a typed count that stayed typed after a reload.

### The passes end with the old network (2026-10-20)

- **The problem** (abscls-z0l6, found in the review of abscls-s9u): after the player chose another network, a search
  could start on the old network's pool for the new network's analysis. Its result then showed under the new network.
  The new sweep skips a position that holds a result at its budget, so the new network did not search that position,
  and its label stayed the old network's. Two ways led there, in `packages/analysis/src/analysis.svelte.ts`:
  - **Another network during the sweep.** `dropAnalysis()` halts the old pool and starts a new era, so the results
    that still arrive from the old pool are dropped. It did not end the run of the passes. The halt cancels the
    sweep's waiting searches, and its running searches finish their few visits, so the run's sweep pass ended at once.
    The next pool loads its network for some seconds, and the next run starts only after that (`sweep()`). Meanwhile
    the old run started its label pass. Each label search took the new era and the old pool. It read the browser's
    store with the old network's SHA-256 and kept a stored result, or it searched on the old pool, which a halt does
    not end, and kept that result.
  - **Another network while the first one loads.** The review's analysis exists once the rules work, and the engine
    settings show from then. The first pool then loads its network. When the player chooses another network in that
    time, `dropAnalysis()` comes before the first sweep. The session's start (`EngineSession.start`) still gives the
    analysis to the page when the first network has loaded, because the next pool has not taken over yet. The page
    then calls `sweep()`, which made the engine ready on the old pool. So the whole review searched there in the new
    era: the sweep, the label pass, and the searches that start when the engine is ready.
- **The change** (design 05, "Another network"):
  - `dropAnalysis()` ends the run of the passes (`passes`), as it ends the era and the focus. The old run stops after
    its sweep pass.
  - From `dropAnalysis()` to `usePool()`, the pool has the old network, and `sweep()` does nothing: no pass runs, and
    the engine is not ready. The review says "Loading the engine's network…" until the next pool's sweep. The board's
    `sweep()` follows the same rule. The Analysis board's page made the engine ready itself (`ready()`), so this rule
    did not cover the board. The page now calls `sweep()`, as the session does after another network. `ready()` is
    private.
- **Why not the other fix:** the issue named a second fix: `sweep()` stops after its sweep pass while the engine is
  not ready (`engineReady`). That stops the first way, but not the second, where the page's `sweep()` makes the engine
  ready on the old pool. The run's counter is what stops an old run. `engineReady` is what the other searches read.
  So the change keeps one meaning for each: the counter ends the run, and the engine stays not ready until a pass can
  run on the next pool.
- **The other searches, checked** for the same race (a search that takes the new era and the old pool):
  - The position on screen (`focus`), the Greats' confirmations (`confirmGreat`) and a branch move evaluated on
    request (`judge`) start no search while the engine is not ready. The key moments (`deepen`) start only when the
    page asks, and the page asks only when the engine is ready and the label pass is done. The engine turned on again
    (`setPaused`) and another review depth (`setReview`) start work again only when the engine is ready.
  - The key moments' and the Greats' searches that run or wait at the change have the old era, so their results are
    dropped. The halt cancels the waiting ones and stops the ones in slices. The old pool ends at `usePool()`, and
    its searches that still run then reject. So no search of the old era stays in the lists of searches queued or
    running (`deepening`, `confirming`), where it would keep the same search from starting in the new era.
  - A snapshot (design 20) is not affected. Its analysis has the rules alone and never sweeps, and a change of the
    network waits while it shows.
- **The test** (`packages/analysis/src/analysis.test.ts`), with the pool whose searches the test ends. Both tests
  failed before the change. The first fails without the end of the run, and the second without the wait for the next
  pool:
  - Another network during the sweep, then the end of the sweep's searches: no label search starts on the old pool,
    and a stored label result of the old network does not show. Then the next pool's sweep searches every position.
    Before the change, 3 label searches started on the old pool, the stored result showed for the start, and the
    next sweep searched 3 of the 4 positions.
  - Another network before the first sweep, for the review and for the board: `sweep()` and the focus start no
    search, and the engine is not ready. After `usePool()`, `sweep()` makes the engine ready, and the searches start
    on the next pool. Before the change, the review's sweep and its focus started 5 searches on the old pool.
- **In a browser:** headless Chromium on the preview build, with the review of the test fixture's game (120
  positions, imported by its record). The review's depth was 256 visits, with 2 workers and the GPU off. Each case
  ran in a fresh context, with no stored results. A script noted each search that the page sent to a worker, each
  network that a worker loaded, and each write to the store's results.
  - **Another network during the sweep:** HedgeFund 0.2 first, then HedgeFund 0.2 Lite, after the sweep had searched
    10 of the 120 positions, before the label pass.
  - **Another network while the first one loads:** the test held back both downloads. It let the first network go
    first, so that the first pool loaded it before the next pool took over. No search started until the next pool
    had loaded Lite, and the review said "Loading the engine's network…" until then.
  - **Another network after the review was done:** Lite, then HedgeFund 0.2.
  - **In each case,** after the change: no search went to a worker of the old pool, and the page wrote no result
    with the old network's SHA-256. The new network searched all 120 positions, and its results in the store hold
    each of them at the review's depth.
- **Left:** a network chosen after Review again on a snapshot, before the new review's analysis shows, goes to the
  snapshot's analysis, and the new review runs on the earlier network (abscls-ysbn). In the second way above, the
  session's start also gives the GPU's control for the new network to the first pool until the next pool replaces it.
  No search of the analysis runs there now.

### Milestone 1 is the game report: no archive statistics, no label checks (2026-10-20)

- **Decided:** the first milestone (design 01, section 4) is the review of a player's own game, which is live. The
  archive statistics leave it: points lost by rating band and game phase, and a fitted rating-conditioned win curve.
  So do the checks planned with them: the noise floor (abscls-gzm), the label budget against a deeper reference with
  fitted bands (abscls-hfp), and which score measures points lost (abscls-5r9).
- **Why:** few people play Enclosure, so statistics of their games are not worth the work. The checks add little to
  the review of a player's own game. The labels already fit nothing to people (design 10).
- **meaf.us:** the site asks meaf.us for nothing. The request for an export (abscls-c4u) is closed.

### An image of a line (2026-10-20)

- **Asked for** (abscls-yeqg): players share lines with their community as screenshots: a position, and how it could
  have gone, with the edges numbered. They held the pointer on a branch's move and took the screenshot by hand.
- **Decided** (design 07, item 17): the move menu has "Copy image" and "Save image" on every move, in a review and on
  the Analysis board, the game's own moves too. In a review, the menu's other actions stay off on the game's moves.
  - **The line:** for a branch's move, the branch's line from where it leaves the main line, numbered as its preview
    numbers it (`branchLine`). For a main line move ahead of the position on screen, the line from there to the move.
    A position made in the board editor has only a main line, so this is how a player shares a line from it. For any
    other main line move, the position after the move.
  - **The board:** every edge of the line at once with its number, the edges that it cuts, the regions after it, and
    the player's notes on the position where the line starts. No candidates and no labels.
  - **The caption** (text that explains): "Turn 12. Blue plays two edges.", then each player's points and area
    before edge 1 and after the last edge ("Blue has 34 points and an area of 12."), and "Hedge School", small.
  - **The clipboard:** a PNG through `navigator.clipboard.write`. Where the browser refuses an image, the note says
    "This browser cannot copy an image. Save the image as a file." (text that a player follows, strict Simplified
    Technical English) with a "Save image" button.
- **The look: light, in either theme.** An image leaves the site. It goes to chats and forums of either background,
  and to print. The light board keeps the contrast of the edges and the regions on paper and inside a dark chat's
  frame. One look also makes the images of one line alike, whoever made them. A dark image on a light forum, or on
  paper, loses that. `[data-theme="light"]` in `app.css` gives the light tokens to the board that the image draws, in a
  page in the dark theme.
- **How:** in the player's browser, with no server (Lichess renders its board images on its server, from the FEN).
  `boardImage.ts` draws the board's component apart from the page, writes each element's computed style into the
  copy of its SVG, and draws that on a canvas at twice the board's size on screen, at least 1,200 pixels wide, with
  the caption under it. The write to the clipboard starts within the player's click, while the canvas still draws
  the image, as Safari and Firefox ask.
- **Checked:** `npm run check` and `npm test` in `apps/hedgeschool` (177 tests, among them `lineImage.test.ts`: the
  line for each kind of move, the caption's text and the file's name), the packages' type checks and tests, and the
  layout sweep in Chromium (21 passed, and 6 skipped for want of the Google tag and of stored practice games in a
  local build). A script drove the production build in headless Chromium, on the stored review in
  `tests/fixtures/hedgefund-review.json`, in the dark theme. The script decoded each image in the page and saved it,
  to look at:
  - **A branch's move:** the engine's line under the Blunder, played to its third edge. Its image numbered the 3 edges
    from the position after edge 11, at the places and in the movers' colours of the preview's badges. The image was
    1,200 × 1,415 pixels. The PNG on the clipboard and the saved file had the same pixels. The clipboard encodes an
    image again, so their bytes differ.
  - **A main line move ahead of the position on screen:** at the position after edge 20, with a ring drawn on K10, the
    image of edge 24 numbered edges 21 to 24 from there, with the ring.
  - **A main line move behind it:** edge 5 gave the position after it, with no numbers and a caption of two lines.
  - **The board and the caption:** the board's corner had the light board's colour in the dark page. The caption's
    band was white, with its text.
  - **The menu:** on a game's move in a review, "Promote variation", "Evaluate quality" and "Delete from here" were
    off, and the two image items on.
  - **A browser with no `ClipboardItem`:** the note showed with its button, and the button saved the file.
  - **A long press:** in a phone's window with touch, a press of 900 ms on the branch's move opened the menu, and its
    "Copy image" copied the same line.
  - **The Analysis board:** three edges played on its main line. From the start, the image of the third edge numbered
    all three.
- **Not checked:** Edge (this work did not use it: on 2026-10-19 a test's Edge profiles signed in to the owner's
  Windows account and synced its extensions), Safari and Firefox, and a real touch screen. The move menu offers no
  image of an edge of the engine's line in the move list: the edge is not in the tree, so the line has no positions
  to give the caption its points.
- **The review changed these:**
  - The image shares the preview's walk along a line's edges (`treeLine`), the number format of the players' cards
    (`fmtScore`, now in `enclosure.ts`) and the site's name (`SITE_NAME`). The note closes itself
    (`Toast.svelte`), and a longer text stays longer, as the Export menu's note did.
  - The caption's numbers are sentences: "Blue has 34 points and an area of 12." The file's name counts the edges
    that the image numbers.
  - Tailwind's `dark:` stays off inside an element with `data-theme="light"`. The site has two `dark:` classes, both
    on the header's collie, and no element other than the page and the image's board sets `data-theme`.
  - The release of a long press that opens the move menu no longer goes to the move. In Chromium's touch emulation
    (390 × 844 pixels, a pixel ratio of 3), the release of a press of 900 ms or of 1,500 ms clicked the move, with no
    `contextmenu` event. The position on screen then moved to the move, and the image of a main line move ahead of it
    showed the position after the move. A branch's image does not depend on the position on screen, so the check of a
    long press on a branch's move did not show this.
- **Checked again** on the production build in headless Chromium, with the fixture's review, in the dark theme:
  - **A row that forks from another branch:** a branch from the position after edge 11, and a row from its first
    edge. The image of the row's last edge numbered 3 edges from the position after edge 11, at the places, in the
    colours and with the cut of its preview. Its caption had the players' cards' numbers after edge 11 and at the
    row's end. The PNG on the clipboard and the saved file had the same pixels.
  - **The game's moves:** with the position after edge 20 on screen and a ring on K10, the image of edge 24 numbered
    edges 21 to 24, with the ring, and its caption had the cards' numbers after edges 20 and 24. Edge 5 gave the
    position after it, with the cards' numbers.
  - **Three images of one line** had the same bytes. The page had the same elements before and after them. The
    board's host was fixed at −100,000 pixels, 600 pixels wide, with the light board's colour in the dark page.
  - **The light theme:** the same images had the same pixels in a light page as in a dark page.
  - **No `ClipboardItem`:** the note showed with its "Save image" button. The file had the pixels of the saved image,
    and the note closed.
  - **A phone:** in a context of 390 × 844 pixels with touch, a press of 900 ms on edge 24 opened the menu, and the
    position after edge 20 stayed on screen. "Copy image" copied edges 21 to 24, 1,200 pixels wide. A tap on another
    move with the menu open closed the menu and went to that move, as a click does on a computer.
- **Safari and Firefox, from their documentation:** MDN's compatibility data gives `ClipboardItem` and
  `navigator.clipboard.write` to Firefox from version 127, and a promise as the item's data. Firefox asks for the
  call within the handler of a user's gesture. Bits UI calls the menu item's `onSelect` from its click handler, and
  from there `copyPng` calls `navigator.clipboard.write` before any `await`, so the call is within the click.

### Review done waits for the key moments' searches (2026-10-20)

- **The problem** (abscls-byld, found in the review of abscls-73h): a review said "Review done" while some of its key
  moments' searches still ran. A reload or a closed page then ended them, and the store never got their results. The
  next visit said "Reviewing: the key moments, deeper, 5 of 6 positions", and its report's table moved when that step
  ended. When each reload came at once after "Review done", the store stayed one key moment short at every reload.
- **Which search, and why.** The runs used Playwright's Chromium, headless, at 1,366 × 657, on the preview build, in a
  job of 2 threads (`scripts/machine run`). They imported the test fixture's review
  (`tests/fixtures/hedgefund-review.json`) with the default settings: Lite, the position on screen to 1,024 visits for
  at most 30 s, 8 search workers, the GPU off. A script noted each search that the page sent to a worker, its results so
  far and its end, each write to the store's results, and the progress line. A build with a log of the key moments noted
  them at each change.
  - **The start is no key moment.** Its 1,024-visit result comes from the position on screen: the review opens at the
    start and searches it to 1,024 visits. At the import, 7 searches shared the 2 threads, and that search stopped at
    its time limit at 416 and 480 visits in two runs. It wrote nothing. A later visit had fewer searches, reached
    1,024 visits in 24 s, and wrote the result. That is the result that the first reload added.
  - **Not a result so far at the search's visits.** Such a result would make a search return at `held() >= visits`
    with no write. But a search in slices posts its results so far below its visits (992 of 1,024 at most), and a
    search that the page stops ends below them too.
  - **The key moments** were positions 23, 24, 25, 39, 40 and 41. Their searches run in slices, and their results so
    far show (design 16: a search that runs counts with its visits so far). At 864, 896 and 768 visits of 39, 40 and
    41, the labels changed, and the key moments became 23, 24 and 25. These had their 1,024-visit results. So the step
    counted 3 of 3, and the review said "Review done" while the 3 searches still ran. In another run, a later result
    so far gave back the 6 key moments: the line said "Review done", then "5 of 6 positions", then "Review done".
  - **At each later visit,** the stored results gave the 6 key moments again, and the search of 39 ran again. At
    about 900 visits, its result so far gave the 3 key moments again, so "Review done" came before the search ended.
    A reload at once then ended the search, and the next visit did the same.
- **The change:** the key moments' step counts the key moments, and also each position whose search for earlier key
  moments waits or runs (`momentChecks` in `packages/analysis/src/analysis.svelte.ts`, which the review page reads).
  Such a position counts until the batch that shows its search's final result. That batch comes after the result's
  write. So "Review done", the game's mark and the Export menu wait for the end of each such search and for the write of
  its result. A search can also end without a result: the pool cancels it, the engine goes off, another network takes
  over, or an error ends it. Such a search stops counting in its next batch, so the step never waits for a search that
  does not end. The gleam on a line (`pending`) counts such a search too.
- **The line's count does not go back:** the key moments' results so far still change the labels while their
  searches run (design 16). With only the change above, the line then counted fewer positions while a search of an
  earlier key moment ran: "5 of 6", then "3 of 4", then "5 of 6", while the bar held. A player reads that as lost work,
  and the count can change at each slice of the search. So the step also counts each position that a key moment's
  search took to the key moments' depth, at the review's depth, until another network (`deepAsked`). The count can
  still grow as labels come.
- **Why not hide the key moments' results so far:** KaTrain reports during a search only for the node on screen, and
  the key moments would then change only with stored results. But design 16 makes every search count with its visits
  so far. Also, a key moment's final result can still take another key moment out while that one's search runs. So
  the step must count those searches in both cases.
- **The test** (`packages/analysis/src/analysis.test.ts`): a key moment's search posts a result so far, and the key
  moments then lack its position. The step counts the position as not done until the batch after the result's write,
  then as done, at the review's depth only. Before the change, the step counted none. A second test: a search that
  ends with an engine error stops counting in the batch after its end.
- **In a browser:** the same setup, with the builds before and after the change, in alternating runs, each in a fresh
  browser profile. Each run imported the fixture, read the store at "Review done", then reloaded 3 times. Each reload
  came at once after the last one's first frame, and the script watched it for 15 s. Two pairs of runs had the position
  on screen at 1,024 visits, and two at 512, where it searches no position of the game.
  - **Before** (4 runs): at the import's "Review done", the store lacked 39, or 39, 40 and 41, in 3 runs. Their first
    reloads said "Reviewing: the key moments, deeper, 5 of 6 positions" (or "3 of 6"). In 2 of them, every later
    reload said it again. The fourth run said "Review done", "5 of 6 positions" and "Review done" during its import.
  - **After** (4 runs): at the import's "Review done", the store held the 6 key moments at 1,024 visits. All 12
    reloads said "Review done" in their first frame, and the line did not change.
  - **Layout shift** of each reload after the change (`layoutShift` in `scripts/measure/speed.mjs`): 0.0000 in all 6
    reloads with the position on screen at 512. At 1,024, the first reload of one run searched the start to 1,024,
    because the import's search of it had stopped at its time limit. Its results so far changed the start's labels
    and moved the report's table once (0.0048), as design 16 says (example 2). The later reloads gave 0.0000.
- **In a browser, with the count that does not go back:** the same setup, with the position on screen at 1,024
  visits. The builds were the one before both changes and the one with both, in alternating runs.
  - **Reloads** (3 runs of each build): before, the store lacked 39 at "Review done" in 2 runs, and 39, 40 and 41 in
    the third. Each of the 9 reloads said "Loading the engine's network…", then "5 of 6 positions" or "3 of 6
    positions", and "Review done" came 12 to 32 s later. After, the store held the 6 key moments, and all 9 reloads
    said "Review done" in their first frame. In the 15 s after the last reload, both builds searched the start to
    1,024 visits, and the line did not change.
  - **Export** at "Review done": the Export menu and the game's mark came with "Review done" in both builds. Before,
    the file lacked 39, and the store got it within 30 s. After, the file held the 6 key moments.
  - **Key moments that do not change:** a review file with the 1,024-visit results of 39, 40 and 41 added, so the key
    moments stay the 6 positions while 23, 24 and 25 search. "Review done" came after 24.4 and 26.1 s before, and
    after 24.0 and 23.9 s after. Each build ran 4 searches, and the line was the same.
  - **A snapshot** (design 20): a review file whose mark names an earlier engine module. Neither build ran a search or
    showed the progress line.
  - The line's count went back in no run. These runs did not include the build with only the first change, so the
    unit test, not a browser, shows that the count does not go back.
- **Left** (abscls-4woe): a search counts as met by a result so far of another search, such as the position on
  screen past the label budget. When that search stops before its end, the store never gets a result at the budget.
  A key moment's search that stops when the engine goes off also leaves its result so far in memory. When its
  position is no key moment any more, the step stops counting it: the line says "Review done" with the engine off,
  and the next visit searches the position again (read in the code, not run).
- **Not measured:** Edge, the deployed site, the GPU, and other numbers of workers.

### A network chosen while the review starts its pool (2026-10-20)

- **The problem** (abscls-ysbn, found in abscls-z0l6 by reading the code): the session's start
  (`EngineSession.start`, `packages/analysis/src/session.svelte.ts`) makes the review's analysis on a new pool, and
  the page shows that analysis once the rules work. A network chosen before then, or while the first network loads,
  went wrong in three ways:
  - **On a snapshot's Review again** (design 20). Until the new analysis shows, the page's analysis is the snapshot's,
    and the engine settings show. The session's change of network (`#useNetwork`) acted on the page's analysis of that
    moment: the snapshot's. It dropped the snapshot's results, loaded the next pool, and gave that pool to the
    snapshot's analysis, which then swept on it out of sight. The new review's analysis kept the first pool, with the
    earlier network. The start gave it to the page once that network loaded, and the page swept it there. So the
    review showed the earlier network's results while the settings named the new one, and two analyses searched at
    the same time. The game's mark (`markReviewed`) reads the session's network, so it named the new network. When
    the next pool loaded before the first, the start answered null, and the review's analysis never searched.
  - **Before the first start's analysis shows** (the review's or the board's): the page has no analysis yet, so the
    change did nothing, and the review ran with the earlier network. This way has the same cause, and the test below
    found it. A player cannot reach this way: each page shows the engine settings in the review's view, which it
    shows only once it has its analysis (read in the pages' code, `src/routes/review` and `src/routes/analysis`).
  - **While the first network loads,** after the analysis shows: the change ran on the analysis, but the start then
    released the first pool's engines when idle, and gave the first pool the GPU's control for the new network
    (`#controlGpu`). The GPU worker could start on that pool until the next pool replaced it. The analysis did not
    search there (abscls-z0l6).
- **The change:**
  - The session keeps the analysis that its start made (`#analysis`). It gets it once the page shows it (`onRules`).
    A change of network acts on that analysis alone, never on the page's. Until the page shows it, a change does
    nothing. Then the start gives the network chosen meanwhile to its analysis at once, while the first pool's network
    still loads. A new pool loads that network for it, as for every change. The snapshot's analysis gets no pool of
    the session. It searches nothing, and its results stay on screen until the new review shows.
  - The session's network changes only together with the drop of the analysis's results. Until the new network takes
    over, the session names the network whose results the analysis holds (the stored results that it read). So the
    game's mark always names the network of the results on screen.
  - When another network was chosen while the first pool loaded, the start does not give that pool the GPU. It
    releases the pool's engines when idle, as before, so that they do not stay when the next network fails to load.
    It answers the analysis, so the page counts the review's open and calls its sweep. That sweep waits for the next
    pool (design 05), which gets the GPU when it takes over. When the next pool has taken over first, the start
    answers null, as before: that pool's sweep runs already.
  - When the first network fails to load while another network takes over, the start shows no error. It answers the
    analysis, or null when the network failed before the page showed the analysis. Before, the page showed the first
    network's error, also when the other network then loaded.
  - Once the session has ended (the page closed, or another tab took the game), a network chosen meanwhile starts no
    pool.
- **Why this fix:** the issue named a fix: the start answers null when another network was chosen while its pool
  started, and the change reads the page's analysis again after the next pool loads. This change takes another way.
  The choice came from what reads the session's pool and network:
  - **The snapshot:** the page gives the session the snapshot's pool, which has the rules alone, and the mark's
    network. The start ends that pool once its own analysis has the rules. A change that reads the page's analysis
    after the load still drops the snapshot's results at the change, and loses a change made before any analysis
    exists. So the change waits for the start's analysis instead.
  - **The GPU's control:** the session makes it for its network on one pool. So it goes to a pool only when that pool
    has the session's network.
  - **The page's error:** the start throws only when its own pool is still the session's, and no other network takes
    over or waits for the analysis. A failure of the other network shows as before (`session.error`).
  - **The game's mark:** it reads the session's network when the review is done. So that network changes together
    with the drop of the results.
  - **The page's work after the start:** a null answer skips it: the review's open and its time (`review_open`,
    `review_done`), the line that says why the game is reviewed again, and on the board its open and its import. The
    start answers null only when the next pool took over first, as before, so that one sweep runs.
- **The test** (`packages/analysis/src/session.test.ts`), the first of the session. A page for the tests
  (`testing/page.svelte.ts`) holds the settings, its analysis and a snapshot as state, and runs the session's effects.
  The session's pools are fakes whose network loads or fails when the test says. Each test failed before the change,
  except the two that guard what the change could break (a failure of the network chosen, and the session's end):
  - **A network chosen before the review's analysis shows,** on Review again and at the first start, with either
    pool's network loaded first: the snapshot's analysis searches nothing, and the review's analysis searches each
    position and the position on screen with the new network alone. The session names that network, and each result
    written has its SHA-256. Before the change, on Review again, the snapshot's analysis swept on the next pool in
    both orders. When the next pool loaded first, the review's analysis also never became ready. The start answered
    null, so the page did not sweep it, and the review waited with no search. At the first start, the change made no
    next pool.
  - **A network chosen while the first network loads:** the first pool gets no GPU control, and the next pool gets
    the GPU's control. Before the change, the first pool got the GPU's control for the new network.
  - **The first network fails to load after another was chosen:** the start answers the analysis, and the other
    network reviews it. Before the change, the start threw the first network's error.
  - **The first network fails before the analysis shows, with another network chosen:** the start answers null, with
    no error. Once the analysis shows, the other network reviews it.
  - **A failure of the network chosen** shows its error (`session.error`).
  - **The session ends while the start waits for the page,** with another network chosen: no pool starts.
  - The session's effects run in Node: the tests' hook (`testing/svelteModules.ts`) now gives Svelte's modules for the
    browser, whose `untrack` and `flushSync` work in an effect. `GpuSlot` (`packages/engine/src/gpuClient.ts`) writes
    its fields out, because Node's type stripping refuses parameter properties.
- **In a browser:** headless Chromium on the preview build, 2 workers and the GPU off, with a fresh store. The script
  changed the test fixture's review file (120 positions, HedgeFund 0.1 Lite at 512 visits) to read as an earlier
  engine's: a module that the site does not ship, and its results under a search of its own. So the game opened as a
  snapshot with 0.1 Lite, its own network. One task then clicked Review again and chose HedgeFund 0.2 Lite. The
  script read the store's keys before the click and after "Review done", the game's mark, and the report's table and
  the annotated record (Export) before and after a reload. The reload reads the stored results alone.
  - **With the change,** in two runs: the reviews wrote 248 and 249 results after the click, all with 0.2 Lite's SHA-256
    (120 at 32 visits, 125 at 512, and 3 or 4 at 1,024), and none with 0.1 Lite's. The mark names 0.2 Lite at 512
    visits. The report was the same before and after the reload. In the second run, the annotated record was the same
    too: each move's label, and its note, which names 0.2 Lite. The reviews took 10.2 and 13.9 minutes.
  - **Before the change,** the same steps: the review wrote 251 results with 0.1 Lite's SHA-256 (the review's analysis
    on the first pool), and 240 with 0.2 Lite's (the snapshot's analysis, out of sight). The mark and the annotated
    record's note named 0.2 Lite. But the labels on screen were 0.1 Lite's: the annotated record had 3 Inaccuracies
    and a Great, and after the reload, from 0.2 Lite's stored results, 1 Inaccuracy and no Great. The report after
    that reload was the report of the run with the change. The review took 20.4 minutes, with two analyses searching.
- **The check of the final change in a browser** (after the review of abscls-ysbn): headless Chromium on the preview
  build, 2 workers and the GPU off, and a fresh store for each case. The script read the store's keys and the game's
  mark. It held a network's file for some seconds at the page's request, or failed it with HTTP 404. The menu offers
  0.2 Lite and 0.2 alone, so the cases after the first use these two.
  - **Review again with another network at once,** the case above: the review wrote 249 results after the click, all
    with 0.2 Lite's SHA-256 (120 at 32 visits, 125 at 512 and 4 at 1,024), and none with 0.1 Lite's. The mark names
    0.2 Lite at 512 visits. The review took 7.3 minutes.
  - **A first review with another network chosen while its network loads:** the fixture's game cut to 12 turns (24
    positions), pasted, with 0.2 Lite. The script chose 0.2 once the review showed, 0.9 s after it opened the Review
    tab. 0.2 Lite's file came at 15.7 s, and 0.2's at 25.9 s. The review wrote 53 results, all with 0.2's SHA-256, and
    the mark names 0.2 at 512 visits.
  - **Another network with no review running:** in the same page, 0.2 Lite chosen again. The review wrote 52 results,
    all with 0.2 Lite's SHA-256, and the mark names 0.2 Lite. It took 5.1 minutes.
  - **The first network fails while another takes over:** as the first review above, but 0.2 Lite's file failed at
    12.6 s, after the choice of 0.2. No error showed. The review wrote 53 results, all with 0.2's SHA-256, and the mark
    names 0.2. The console's only error was the browser's line for the HTTP 404.
  - **A failure of the network chosen:** after a first review with 0.2 Lite, the script chose 0.2, whose file failed.
    The page showed the error ("/engine/b15c192-s90436608-d18027147/model-float16.bin: HTTP 404"), and the mark still
    names 0.2 Lite.

### The site's text, a third pass (2026-10-20)

- **What:** the files that the second pass left (abscls-6npo), by the same rules: CLAUDE.md, "Writing the site's text",
  and the `/asd-ste100` skill with its linter. A script gave the linter each file's text: its string literals and its
  template's prose, without its code and its `<pre>` blocks. The pass then read each file in full, with the text that
  came after the second pass: the move menu's image items (abscls-yeqg) and the board editor's new help (abscls-dyms).
- **Strict, for what a player follows:**
  - The review's keys and clicks: "Close the settings, or cancel the edge that you started" (was "drop an edge begun"),
    and "Pin its line on the board. Click the candidate again to unpin it" (was one sentence with a semicolon).
  - `Arrival.svelte`: the errors say who acts, "Hedge School could not load the review" and "Hedge School could not
    import the game". After them, a share link's error gives the error's own text, such as the decoder's "the link is
    broken". Its detail began with "Hedge School cannot read the share link", which named the actor a second time. The
    notes for an out-of-date tool give one instruction in each sentence ("Tampermonkey then offers the update"). "The
    new bookmarklet loads its code from this site" replaces "it now loads its code", and "For the userscript, open it
    on the tools page" replaces "open it there", which pointed two sentences back.
  - `bookmarklet.ts`: "Check the connection. Then click the bookmarklet again." Before, one sentence held the two
    instructions, and "it" named the bookmarklet only by its context.
  - `meafPage.ts`, the message for a page with no game: "this page shows no game that Hedge School can read. Open a game
    on …: a game that you play or watch, or a finished game. Then click … again. If a game shows and you see this
    message again, … may have changed its page. The newest bookmarklet and userscript are on …/tools." The phrasal
    verb "comes back" went, and "may have changed" keeps its hedge. "Log in, then click" and "Wait a moment, then click"
    became two sentences each.
  - The board editor's help for Marks had 28 words. It became three sentences: "Click an edge's two points to mark it.
    Mark the waiting player's edges of the last turn (protected). Mark the mover's edges of this turn so far (placed)."
    The rest of the editor's help reads as strict STE and did not change.
- **STE's sentence rules, for what explains:**
  - "Not analysed yet" became "Not analyzed yet" in `ReviewView.svelte` and in `src/lib/review/enclosure.ts` together.
    The second pass found the words in `model.ts`, and they moved to `enclosure.ts` with the packages. The review's note
    "Analyzed in your browser" already had the interface's spelling.
  - The review's engine settings: "so that the review opens as the engine made it" (was "as it was made"). For a game
    from a file or a link: "This game came with a network and depth per move, from a review file or a shared link. It
    keeps them, so that its review stays the one it came with. A change of them here applies to this game only." Before,
    the first two sentences were one of 30 words, and "applies to" are the words of the note for the other case. The
    Workers setting: "Each worker uses more of your computer's memory. Use only as many workers as your computer's
    memory can hold." (was "mind how much it has", which asked the player to choose a number that fits).
  - The shared review's note: its first sentence, of 31 words, became three. "the review
    fills in as the engine goes" became "The review shows each result as the engine finds it", "it comes out as the
    sender's review" became "your review is the same as the sender's", and "a close call can rarely come out otherwise"
    became "a close call can rarely give another result", with "rarely" kept. "This site's engine changed after the
    sender made the link" replaces "has changed since the link was made".
  - The Privacy page: its passive verbs in the active voice, with the actor named. "that the site could not send yet",
    "The site does not keep a game that ends before your first move", "With it, the site can distinguish your games"
    (not the phrasal verb "tell apart", which also left Google Analytics' cookies), "If the site cannot send a game
    when it ends", "Hedge School then keeps the game in your browser" and "Hedge School then keeps it here" (the two
    "it is kept here"), "The script draws its button and its collie itself". A game that waits "goes on your next
    visit" read as "continues": now "the site sends it on your next visit", in the list and in the section on games
    against HedgeFund. Its sentences of 26 to 42 words became sentences of at most 25 words, with every fact. "To remove
    them, clear this site's data" became "To delete them": the page says "delete" for what the browser or the site
    keeps, and "remove" only for the part of an address after the `#`.
- **The text now says what the code does:**
  - The Privacy page's list of what this browser keeps names the board editor: "Your board editor position: the position
    you are making, and how you set its edge count, so that a reload keeps them" (`hedge-school:editor` and
    `hedge-school:editor-count`).
  - The list, compared with every localStorage key and IndexedDB store that the site writes, also missed three things.
    "Your games" now names "the branches you add to their reviews" (the store `branches`). "Your last review: the game
    that "Continue your last review" opens" (`learn-enclosure:last-review:1`). "The GPU's test: the name of your GPU
    and its speed against a worker, so that the GPU setting's Auto does not test it again" (`learn-enclosure:gpu:4`,
    with the adapter's vendor and architecture). The list does not name the analyses' clean-up marks
    (`learn-enclosure:analysis-shape:1`, `learn-enclosure:earlier-results:1`), which hold no data of the player's, or
    the internal-traffic flag (`hedge-school:internal-traffic:1`, design 17), which only the address parameter
    `?internal=on` sets. sessionStorage (the scroll places, the review's dialog shown once) ends with the tab.
  - The developers page said that Hedge School refuses a record with a `Rules` or a `Position` tag. `variantProblem`
    (`src/lib/game/import.ts`) refuses a `Rules` tag with any value and a `Position` tag that gives a start other than
    the standard start (`setUpStart`, `src/lib/engine/notation.ts`). Both read `?` or `-` as no value. The page now
    says so: "refuses a record whose `Rules` tag has a value, or whose `Position` tag gives a start other than the
    standard start", and "reads `?` or `-` as no value". The instruction to show the link for refused games only once
    Hedge School reviews them comes last.
- **Left:**
  - "/import is deprecated": `Arrival.svelte` no longer has the text.
  - `meafPage.ts`, "only to a player who is logged in": "logged in" gives the player's state, not an action. "Hedge
    School: this page shows no game that Hedge School can read": the prefix "Hedge School:" is the label of each tool
    message on another site, not the subject of the sentence.
  - The board editor's help for Marks tells the player which edges to mark, and the brackets give each mark's meaning
    (protected, placed). The old text gave the same edges as a list after a colon.
  - The review's "A change of them here applies to this game only": the same form as the note for the other case and
    the settings' notes ("A change searches the positions again").
  - The review: "Export once the review is done", because "Review done" is the name of that state (as on the developers
    page in the second pass). "Shown when a review opens" and "Refined as the review runs" in the display settings:
    participles that describe a setting, with no action. "delete from it" beside "Drawing it again removes it": "Delete
    from here" is the move menu's item, as on Lichess, and a note is not a move.
  - The Privacy page: the list of what Google Analytics receives keeps its long items. Each item is a list of counts,
    not a sentence to split. "each switch that you have not set yet": the present perfect gives the state now.
  - The move menu's image items, their notes and `Toast.svelte` (which has no text of its own) read as strict STE.
  - The developers page's other notes from the linter: this pass changed only its claim about the tags.
- **The tools:** the text of `meafPage.ts` ships in `/bookmarklet.js`, which the bookmark loads at each click, and in
  `/hedge-school.user.js`. The userscript's `@version` is the build's time (`vite.config.ts`), so Tampermonkey takes
  each build as an update with no change by hand. `meafPage.ts` is one of the files of its code's hash
  (`__USERSCRIPT_CODE__`), so the import page asks a player with an older userscript to update it. The alert in
  `bookmarklet.ts` is in the bookmark itself (`load`): a bookmark dragged before keeps the old words. `BOOKMARK_VERSION`
  stays 1, because a new number would ask every player to drag the bookmarklet again for the words of one error.
- **Tests:** no test matched the changed text. `userscript.test.ts` matches the "no game" message's "Open a game on
  strategyjam.org" and its `/tools` address, which stay.
- **Checked,** after the review's changes: `npm run check` (0 errors) and `npm test` (181 passed) in
  `apps/hedgeschool`, and the layout sweep in Chromium on a preview of the build (20 passed, and 6 skipped for want of
  the Google tag and of stored practice games in a local build). In the sweep, `own-settings.spec.ts` reached its
  timeout of 10 minutes at `page.goto("about:blank")`, before any text of this pass. Alone, on the same build, it
  passed in 3.4 s.

### The measuring scripts start Edge only when asked (2026-10-20)

- **What:** one gate holds the rule for every script that can start a browser: `apps/hedgeschool/scripts/edge.mjs`.
  Edge starts only when the environment has `HS_EDGE=1`. Without the variable, a script refuses Edge with a message
  that names the variable. The gate is in `launch` and `launchHideable` (`scripts/measure/speed.mjs`), in the browser
  lists of `scripts/measure/review-hidden.mjs` and `scripts/measure/worker-yield.mjs`, in `scripts/favicon.mjs`, which
  always runs Edge, and in `playwright.config.ts`, whose project `edge` it adds. Edge's program (`edgeProgram`: the
  environment's `EDGE`, or Edge's usual place on Windows) comes only from the gate, for `launchHideable` and
  `favicon.mjs`.
- **The default browser list** of `review-hidden.mjs` and `worker-yield.mjs` is Chromium alone. It was Chromium and
  Edge. A run with no variable starts no Edge.
- **Why:** Edge signs a new profile in to the Windows account and syncs that account's extensions. On 2026-10-19 the
  runs of `review-hidden.mjs` did so, and on 2026-10-20 a search found two older profiles from Playwright's Edge runs
  ("The layout sweep runs in Edge only when asked" closed the same hole in the layout sweep).
- **The other places that name Edge** cannot start it by themselves: `scripts/social-card.html` gives Edge's command
  in a comment, for the owner to run by hand. The tests in `tests/` run in the projects of `playwright.config.ts`. CI
  runs `--project=chromium`. The other measuring scripts call `launch` with no channel, so they start Chromium. No
  other file starts a browser.
- **The gate's limit:** `launch` checks the channel, not an `executablePath`. A script that gave Playwright Edge's
  program as its `executablePath` would get past the gate. No script does, and no script names Edge's program: it
  comes only from `edgeProgram`.
- **Checked** with no browser started (`scripts/edge.test.mjs`, in `npm test`): with no variable, the gate refuses
  Edge, and with `HS_EDGE=1` it allows it. With no browser list, the list is Chromium alone. `launch` and
  `launchHideable` refuse Edge with no variable. Each script, run with Edge in its browser list (`favicon.mjs` with no
  list) and no variable, stops at the gate with the message. The tests set `EDGE` to a program that does not exist,
  so that a broken gate fails before Edge starts.

### Guardrails: one check command, the release checks, the logs' union, the hook, the widths (2026-10-20)

- **Asked for** (abscls-v26k): a check or a tool in place of each hand step that went wrong on 2026-10-19 and
  2026-10-20. Every one of 8 rebases conflicted on this file, where two branches each added an entry. Three commit
  subjects ran over 72 characters (80, 76 and 79).
- **One check command:** `npm run check:all` at the root (`scripts/check-all.mjs`) runs the Tests workflow's checks
  before its browser tests: the engine's release files with `--deploy`, the site's type check and unit tests, the
  packages' type checks and unit tests, and the production build with the practice games' storage on. The workflow's
  Linux job now runs this command, so the list is in one place. A failed step does not stop the next steps, except
  the engine's. The last line gives each step's result. The Windows job and the deploy keep their own steps.
  - **Checked:** after `npm ci`, `check:all` and the workflow's former steps, one by one, gave the same results: the
    engine's files up to date with the lock, 952 files with 0 errors and 0 warnings in the type check, 181 of the
    site's tests and 34, 9 and 2 of the packages' tests passed, and the build passed. `check:all` took about a
    minute.
- **The release checks:** `apps/hedgeschool/scripts/release-check.mjs <base URL> [<commit>]` does the checks of
  docs/hosting.md, "Deploy, check and roll back". The header's links and the three pages that lead home are checks,
  not notes, and the commit comes from `origin/main` or `origin/dev`.
  The commit's form is the footer's: its first 7 characters. The engine's files come by the site's manifest and
  `fetchArtifact` (@abstractclass/engine/artifacts.ts), as the page reads them: a file that the build stores in
  gzip parts (a graph, or a file over 24 MiB) then downloads whole too. The manifest must name each of the lock's
  19 files with the lock's SHA-256.
  - **Checked:** against `https://dev.hedgeschool.pages.dev` at `f50704c`, 15 of 15 checks passed, in 4 seconds.
    With a wrong commit, the footer's check failed and the script exited 1. A graph that the preview stores in gzip
    came back whole through `fetchArtifact` in Node: 6,410,459 bytes.
- **The decision logs merge by union** (`.gitattributes`), with a driver of their own, `decision-log`:
  `git merge-file --union --diff3`. The README of the log does not merge by union.
  - **Git's built-in union loses a blank line.** A trial rebase in a scratch clone: two branches each added an
    entry at the end of this file, and one rebased on the other. With `merge=union`, both entries stayed, with no
    conflict, but the second entry lost the blank line before its heading, by `git rebase` and by `git merge`. Git
    takes the blank line that both new entries start with as common to both sides, and the union then writes it
    once. `merge.conflictStyle zdiff3` loses it too. With `diff3`, Git keeps the two sides whole, and both entries
    kept their blank lines. No form of the entries avoids this: any blank line at the start or at the end of both
    new entries is common.
  - **A driver in place of the setting `merge.conflictStyle diff3`.** That setting changes every conflict in every
    file, which then shows the base's lines too. And where the setting is missing, the union drops the blank line
    with no sign. The driver gives diff3 to the logs alone. Where Git's settings do not define the driver, Git
    merges the logs as text and shows the conflict, as before the union. The trial gave both entries with their
    blank lines and headings with the driver, by `git rebase` and by `git merge`, and a conflict without it. A
    conflict in another file kept Git's default style.
  - **Two edits of the same line** of an earlier entry, one on each branch: the rebase gave no conflict and no
    markers, and the file held both versions of the line, first the version of the branch rebased onto. Edits of
    two lines next to each other gave the same: both versions of the two lines. A rebase that changed an earlier
    heading on one branch kept that change and the other branch's new entry. So after a merge or a rebase, read each
    earlier entry that both branches changed.
- **The commit-msg hook:** `.githooks/commit-msg`, in POSIX sh with LF line ends. It refuses a subject or a body
  line over 72 characters. It counts characters, not bytes. It skips comment lines and the diff below the
  scissors line of `git commit -v`. A body line of one word after its list mark (a URL, a path) may be longer. So
  may the subjects that Git writes from other names: `fixup! `, `squash! ` and `amend! ` (they go away in a
  rebase), `Revert "…"` and `Reapply "…"` (a revert of a subject over 63 characters is over 72), and the merges'
  `Merge branch '…'` (`git pull` adds the remote's URL). It works when the main checkout has
  `git config core.hooksPath .githooks`. The hook still checks the body of two messages that Git writes: a merge
  with `merge.log` lists the merged subjects indented by 2, and `git merge --squash` lists the squashed messages
  indented by 4. The hook refuses such a line over 72 characters. This repository's way of working uses neither,
  and `merge.log` is off by default.
  - **Checked:** `sh scripts/commit-msg.test.sh` passed its 25 cases in Git for Windows' sh and its awk (gawk), and
    in dash with mawk 1.3.4, as on Ubuntu's runners. Among them: 72 and 73 characters of 3 bytes each, a line with
    CRLF, and the messages of `git revert` and `git pull`. In a scratch
    clone, Git for Windows ran the hook. It refused a subject of 74 characters and a body line of 92, and it kept a
    commit with a URL as a long body line and a commit with long comment lines from the editor. The messages that
    Git writes passed: `git revert --no-edit` of a subject of 68 characters, the revert of that revert
    (`Reapply "…"`), `git commit --fixup`, the merge of a branch with a long name, and `git commit -v` with the
    editor's comments and diff. The hook refused a merge with a subject of 74 characters: Git runs it for a merge.
- **The documents wrap at 120:** the workflow Documents (`.github/workflows/docs.yml`) runs
  `scripts/doc-widths.mjs` on each push to `dev`. It refuses an added line over 120 characters in a Markdown file
  of the pushed range. A table row, a line in a code block, the length of a URL and the lines of a moved file do not
  count. The check has its own workflow because the Tests workflow cancels a run when a newer push comes, and the
  range of the older push would then go unchecked. The range holds the pushed commits: it starts at the merge base
  of the push's commit before and the new tip. That is the commit before itself, unless the push was forced. After
  a force push, the clone does not have the commit before, and the run fetches it by its hash. For a new branch, a
  run by hand, or a commit that GitHub no longer has, the range starts where `dev` leaves `main`. In the diff, a
  `+++` line names a file only in a file's header, so an added line that starts with `++` stays a line.
  - **Checked:** its 7 unit tests passed. Over every line of every Markdown file in the repository, the rule found
    26 lines over 120 characters: each was prose that can wrap. Four of them were on `dev` and not on `main`, so a
    range from `main` refused them. Their paragraphs now wrap at 120. The workflow's range lines ran against a bare
    clone as the remote. A normal push and a force push each found only the pushed commit's long line, and the force
    push's commit before came by its hash. A force push that dropped a commit which had wrapped a long line passed:
    a diff from the commit before itself would count that line as added. A new branch, a run by hand and an unknown
    commit took the range from `main`. A moved file gave no added lines, and a moved and changed file only its
    changed line. A file with a space in its name and an added line that starts with `++` gave the long line.
- **Not checked:** the workflows on GitHub, before the push. On GitHub, the fetch of a force push's commit before
  by its hash depends on GitHub's keeping that commit.

### The engine's panel says when the network still loads (2026-10-20)

- **The problem** (abscls-f5ko, found in the review of abscls-72zg): a review opened again, with every step's results
  in the browser's store, says "Review done" at once, before the engine's network loads. Until the network loaded, the
  engine's panel showed the position's stored result ("512 of 1,024 visits", with no gleam). Nothing said that it
  waits. A deeper search of the position on screen starts only once the network is ready.
- **Decided** ([design/06-review-layout.md](../design/06-review-layout.md), item 7): while the network loads, the engine
  header's line says "Loading the engine's network…". The words take the place of the visits, on the review and on the
  Analysis board. It is text that a player follows (strict Simplified Technical English). The header reads the same
  state as the review's line (the analysis's `engineReady`) and says the same words (one constant, `NETWORK_LOADS` in
  `ReviewView.svelte`). So the two lines agree, and the words also show while another network loads. A snapshot
  (design 20) searches nothing, and its header does not show them.
- **No layout shift.** The words and the visits are two elements. The visits that replace the words are a new element,
  which the browser does not count as a shift. The search bar takes the line's free width, so the switch and the gear
  do not move.
- **Checked** in Playwright's Chromium, headless, on the preview build, in a job of 2 threads (`scripts/machine run`):
  - `tests/network-loading.spec.ts` holds the network's file. It opens the test fixture's review, stored with its
    results, and then the Analysis board. Before the change, the review's header said "512 of 1,024 visits" while the
    network loaded. With the change, it said "Loading the engine's network…", and the visits came once the test let
    the file through. The board's header said the words too, and they went when the network loaded.
  - `scripts/measure/layout-shift.mjs` at 1,366 × 657, 3 pairs of 3 reloads, the build before the change against the
    build with it: the review's layout shift was 0 in every reload of both builds, and the Analysis board's too.
    Nothing moved.
- **Checked again in the review of the change,** in the same way, with a script that held the network's file:
  - A review done and opened again said "Review done: 512 visits a move." at once. Its header said "Loading the
    engine's network…" until the file came, and then "1,024 visits". The switch and the gear did not move.
  - After a change of network during a review, the header said the words while the test held the new network's
    file. They went when the network loaded.
  - A snapshot (design 20) asked for no network file, and its header said "512 visits". After Review again, the header
    said the words until the review's network loaded.
  - With the engine off, the page loads the network too. While it loads, the header and the review's line both say
    "Loading the engine's network…", which is true. Then the header shows the stored visits with no gleam, and the
    review's line says "Engine off. The review is paused."
  - At 390 × 760, the words fit in the line, and the search bar takes the 57 pixels that remain.
  - The test fails in 6 seconds on the build before the change, and passes on the build with it. When a check fails
    while the test holds the file, the test ends when that check's time runs out: the held request does not keep it
    waiting.
  - `layout-shift.mjs` again, review and board, at 1,366 × 657, 3 pairs of 3 reloads: 0 in every reload of both
    builds.

### A hidden tab's review: the key moments and the time limit without timers of the page (2026-10-20)

- **The question** (abscls-a9uh): three items that "A review in a hidden tab" (2026-10-19) left. A step that waits for
  the batch while another search runs still waits for the batch's timer. The time limit of the position on screen
  still has a timer of the page. And the hidden tab's note has a title that differs from its line, so a cut line
  cannot be read in full.
- **The batch comes without its timer when no search waits** (`packages/analysis/src/analysis.svelte.ts`, `search`,
  with the pool's `waiting` in `packages/engine/src/pool.ts`). Before, it came so only when no search ran or waited
  (the pool's `idle`). The key moments wait for the batch with the label pass's last result, and Review done for the
  batch with the last result of all. While a search waits in the pool's queue, no engine is free: the pool gives each
  engine a task as it frees. So the step waits, but it costs no engine time. When no search waits, an engine can be
  free while the position on screen or another search runs, and it stays free until the batch's timer: about a second
  in a hidden tab, and up to about 100 s once the page's timers have used up their budget. More batches come: at a
  pass's end, the results of its last searches come in a batch each, at most one for each engine, as their searches
  end.
  - **The tests** (`packages/analysis/src/analysis.test.ts`): once no search waits, the results show when they are
    stored, without the timer, and a result shows so while a focus runs. Both failed before the change. The fake pool
    now takes its tasks by priority, as the pool does. The tests of a result that waits for the batch now keep a
    search waiting in the queue: with a flush at every result, five of them fail.
- **The batch with the label pass's last result comes without its timer** (`analysis.svelte.ts`, `sweep`), though
  searches wait in the pool's queue. In every whole review measured below, a Great's confirmation waited in the queue
  when the label pass's last result came. So the rule above did not apply there, and the key moments' step waited for
  the batch's timer. The key moments' searches go before the confirmations that wait, so they must be in the queue
  when the next engine is free. An engine that frees during the timer's wait takes a confirmation, and a confirmation
  does not give way. The label pass ends once each of its results is stored and in the batch. Then `sweep` applies
  the batch, in a task of its own, once the pool has taken its next search.
  - **The test:** the label pass's last result shows without the timer while two confirmations wait. It fails
    without the flush. With the rule above turned off, only the two tests of that rule fail.
- **The time limit in the worker** (`packages/engine/src/channel.ts`, `searchInSlices`). The engine's protocol
  (the engine repository's `docs/design/04-notation-and-protocol.md`, "Fields for bots" and "Search in slices") gives
  `maxTime` to a whole search only: "a search in slices takes none". A search in slices ends with `terminate` at the
  end of any slice. The site's release (`engine-d6786eba`, protocol 0.6.1) has both. So the site's worker keeps the
  limit, and the engine's side does not change. The limit counts from the search's start in the worker. At the end
  of each slice, the worker sends `terminate` once the limit has passed, so the search ends at the end of the slice
  in which the limit passes. Its reply says so (`late`), and the page shows "time limit" from it. The page has no
  timer for the search, and no stop at the first result past the limit. A search request carries the limit (`maxMs`,
  in `messages.ts` and `gpuMessages.ts`), and the GPU worker keeps it the same way.
  - **The tests:** `packages/engine/src/channel.test.ts`: the limit ends the search at the end of the slice in which
    it passes, and a search that ends its visits within its limit is not late. `analysis.test.ts`: a focus gives its
    limit to the engine, a search that its limit ended shows as stopped at the time limit, and a search that the page
    stopped does not.
- **The note's title where its line is cut** (`src/lib/review/ReviewView.svelte`, `HIDDEN_TAB`): when the pointer
  comes to the line, the page checks whether the line is cut. When it is, the title gives the line, then the reason:
  "A review in a hidden tab can be slower. When you cannot see this tab, the browser can give the review less
  processor time." When it is not, the title gives the reason alone, as before. The words do not change. The browser
  reads the title after the pointer's arrival. The line fits its column at the browser's text size (16 pixels), so a
  larger text size cuts it. The test (`tests/review-notice.spec.ts`, in the layout sweep): at 360 pixels, the line
  fits at 16 pixels, and is cut at 24 pixels, and each title is as above.
- **The set-up:** as "A review in a hidden tab" (`scripts/measure/review-hidden.mjs`), in Chromium only, with 2
  search workers on the CPU and the GPU off, each run under `scripts/machine run --threads 2`. The engine
  repository's training held most of the machine's other threads. The builds: before (`f50704c`) and after the
  changes. The script now also reads, with the end `review`, the key moments' wait: from the label pass's last final
  reply to the progress line's step "the key moments". With `FOCUS`, it sets the position on screen's visits and time
  limit, and reads how long its search ran past the limit. `speed.mjs` (`watchSweep`) now notes each search's moves
  and the worker's time at the end of each slice. `CDP_PORT` sets the browsers' port, so that two measurements at once
  do not meet.
- **The time limit** (`FOCUS=16384,10`: the position on screen to 16,384 visits, for at most 10 seconds, so that its
  search stops at the limit, with the end `sweep`). The position's search ran beside the sweep. The table gives the
  runs in their order, in two sets. The first set did not note the slices' times:

  | Build | Set-up | Load | Visits | In the worker | Past the limit | The slice in which the limit passed | Slices after it |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | before | front | 16%, 8.1 | 736 | 10,486 ms | 486 ms | - | - |
  | before | hidden | 37%, 4.9 | 640 | 10,697 ms | 697 ms | - | - |
  | before | hidden | 41%, 3.0 | 608 | 10,183 ms | 183 ms | - | - |
  | before | front | 26%, 2.9 | 608 | 10,655 ms | 655 ms | - | - |
  | after | front | 40%, 2.0 | 768 | 10,450 ms | 450 ms | - | - |
  | after | hidden | 21%, 1.8 | 704 | 10,780 ms | 780 ms | - | - |
  | after | hidden | 23%, 2.4 | 672 | 10,032 ms | 32 ms | - | - |
  | after | front | 22%, 2.7 | 736 | 10,255 ms | 255 ms | - | - |
  | before | front | 89%, 28.1 | 448 | 10,574 ms | 574 ms | 633 ms | 0 |
  | before | hidden | 89%, 32.4 | 512 | 10,330 ms | 330 ms | 624 ms | 0 |
  | before | hidden | 82%, 25.8 | 576 | 10,270 ms | 270 ms | 424 ms | 0 |
  | before | front | 75%, 16.9 | 640 | 10,348 ms | 348 ms | 370 ms | 0 |
  | before | front | 51%, 13.2 | 608 | 10,084 ms | 84 ms | 608 ms | 0 |
  | before | hidden | 58%, 9.9 | 608 | 10,869 ms | 869 ms | 432 ms | 1 |
  | after | front | 61%, 13.2 | 576 | 10,373 ms | 373 ms | 484 ms | 0 |
  | after | hidden | 23%, 9.7 | 768 | 10,315 ms | 315 ms | 543 ms | 0 |
  | after | hidden | 22%, 5.2 | 736 | 10,404 ms | 404 ms | 493 ms | 0 |
  | after | front | 25%, 3.8 | 512 | 10,073 ms | 73 ms | 616 ms | 0 |
  | after | front | 66%, 5.5 | 480 | 10,100 ms | 100 ms | 569 ms | 0 |
  | after | hidden | 75%, 6.1 | 512 | 10,207 ms | 207 ms | 560 ms | 0 |

  "In the worker" is the search's time in the worker, from its start to its final reply. The page got the reply
  within 1 ms of that time in every run. "Slices after it" counts the slices that ran after the one in which the limit
  passed. After the change, every search of the second set ended at the end of that slice, so it ran past the limit
  by less than one slice (73 to 404 ms, in slices of 484 to 616 ms). Before it, five of six did, and one hidden search
  ran one slice more: the page's stop came after the worker had started the next slice. The first set's 780 ms after
  the change would need a slice of over 780 ms, if that search ended at the end of the slice in which the limit
  passed. The first set did not note the slices, so it cannot tell. A slice of 32 visits took 370 to 633 ms in the
  second set.
- **The whole review in a hidden tab** (the end `review`), in turn before and after:

  | Build | Load | The game's shape | Move quality | The key moments | Great moves | In all | The key moments' step after the label pass's last reply | Review done after the last reply |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | before | 47%, 2.3 | 35.6 s | 446.0 s | 23.0 s | 12.2 s | 516.8 s | 873 ms | 3 ms |
  | after | 12%, 1.3 | 32.5 s | 393.0 s | 27.0 s | 13.8 s | 466.3 s | 996 ms | 4 ms |
  | before | 52%, 0.6 | 36.2 s | 526.0 s | 44.0 s | 14.2 s | 620.4 s | 557 ms | 6 ms |
  | after | 55%, 24.9 | 38.0 s | 489.0 s | 28.0 s | 16.1 s | 571.1 s | 938 ms | 8 ms |

  Each step's time runs from its line in the progress slot to the next step's line, and "In all" from the sweep's
  start to Review done. Every run was hidden for all of its time. These runs came before the script noted each
  search's moves, so their key moments' wait comes from their saved searches: the label pass is the first 119
  searches in slices of 256 after the sweep's start. The position on screen had 1,024 visits before the label pass,
  so its position had no label search. The Greats' confirmations queue behind the label pass, at the same priority.
  In every run, the engine of the label pass's last search took a Great's confirmation that waited in the queue at
  once, and the other engine ran a confirmation. So the batch kept its timer in both builds, and the key moments'
  step came 557 to 996 ms after the label pass's last reply. That wait cost no engine time: each key moment's first
  search started 8.1 to 15.5 s after that reply, when a confirmation ended (a confirmation does not give way). No
  engine waited over 50 ms between two of its searches in any run. These four runs did not meet the case that the
  change is for: an engine free while a search runs and none waits. The tests above check it.
- **The whole review with the label pass's flush** (the end `review`, the set-up `hidden`): before (`1d41673`, the
  rule of no search waiting alone) and after (that rule and the flush at the label pass's end), two runs of each:

  | Build | The tab | Load | The game's shape | Move quality | The key moments | Great moves | In all | The key moments' step after the label pass's last reply | Their first search after that reply |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | before | hidden | 22%, 1.7 | 32.1 s | 400.0 s | 24.0 s | 12.2 s | 468.3 s | 164 ms | 7.2 s |
  | before | in front | 42%, 2.1 | 29.0 s | 313.0 s | 17.9 s | 11.0 s | 370.9 s | 108 ms | 5.3 s |
  | after | hidden | 32%, 1.6 | 35.0 s | 412.4 s | 23.6 s | 13.1 s | 484.1 s | 5 ms | 7.1 s |
  | after | hidden | 23%, 1.8 | 31.2 s | 390.9 s | 24.1 s | 13.7 s | 459.9 s | 6 ms | 8.2 s |

  The second run before the change did not hide its tab: the probe saw no hidden state, and its chained timer of
  250 ms ran every 254 ms. Its row shows the tab in front. In the other three runs, the tab was hidden for all of the
  sweep, and the chained timer ran once a second. In every run, the engine of the label pass's last search took a
  Great's confirmation at once, and the other engine ran a confirmation. Before the change, the key moments' step came
  with the batch's timer: 108 ms in front (100 ms, and the write), and 164 ms when hidden (the next of the hidden
  tab's runs of its timers, once a second). After it, the step came 5 to 6 ms after the reply, in both runs. The key
  moments' first search did not start earlier: it waited 5.3 to 8.2 s for a confirmation to end in every run, as
  before. A confirmation does not give way. The flush puts the key moments' searches in the queue at once. So the
  next engine that frees takes one of them, not a confirmation that waits. In these runs, no engine freed during the
  timer's wait.
- **Not measured:** Edge, the GPU worker, the case of the batch with an engine free in a real browser, and a review
  in a tab hidden for over 5 minutes.

### A search's budget is met only by a result in the store (2026-10-20)

- **The problem** (abscls-4woe, found in abscls-byld): a search returned at once, with no write, when the position held
  a result with its visits. That result could be another search's results so far. The usual one came from the
  position on screen: its results so far pass the label budget, or the key moments' depth when the depth on screen is
  above it. When that search then stopped before its end (the player moves on, its time limit, the engine off), it
  wrote nothing. The analysis kept its result, and the review counted the position as searched, but the store had no
  result at the review's budget. The next visit searched the position again: "Reviewing: move quality" or "Reviewing:
  the key moments" after a review that said "Review done", and a layout shift. A key moment's search that stopped
  when the engine went off or failed did the same. When its results so far had taken its position out of the key
  moments, the step stopped counting it. The line then said "Review done", with the engine off too, the page wrote
  the game's mark, and the engine on did not search the position again.
- **The change** (`packages/analysis/src/analysis.svelte.ts`): the analysis notes, for each position, the visits of
  the deepest result that the store has (`stored`). That is a result read from the store, or a search's final result,
  which the batch after its write notes. Only that record meets a search's budget, and the review's counts read it:
  the sweep and the label pass (`swept`, `labelled`), the key moments' step (`momentChecks`) and the Greats'
  confirmations (`greatChecks`). The record of the budgets met (`reached`) and the passes' `met` call are gone. The
  analysis on screen does not change: it keeps the deepest result, results so far too, and the labels follow it
  (design 16).
- **The key moments' step** counts each position that a key moment's search was asked for at the review's depth,
  until the store has its result. Before, it counted such a position only once the analysis held the depth. A search
  that ends when the engine goes off or fails now leaves its position in the step. So the line does not say "Review
  done", and the engine on asks for the position again (`deepen`, which `setPaused` calls). After an engine error, the
  line keeps "Reviewing: the key moments" under the error until the engine goes off and on, or the key moments change.
- **The gleam on a line** (`pending`) compares the review's budgets with the analysis on screen, not with the record.
  A search that runs makes the line gleam only while its budget reaches the visits on screen: a review search below
  them does not change the line.
- **The cost, accepted:** once the search of the position on screen has passed the review's budget, a review search
  of that position runs at the same time. Before, it did not run.
- **The tests** (`packages/analysis/src/analysis.test.ts`), four new ones, which all fail before the change:
  - The label pass searches the start, though the search on screen passed the label budget, and counts the start
    only once its result is stored. The analysis keeps the deeper result.
  - A key moment counts as done only with its result in the store, not with the search on screen's results so far.
  - A key moment's search that stops when the engine goes off, and one that ends with an engine error, keep the
    position in the step as not done, though it is no key moment. The engine on searches it again, and the step then
    counts it as done.

  The fake pool's `halt` now stops the searches in slices and drops the waiting tasks, as the pool does. The new test
  of the engine error replaces the test that the step stops counting a search that ends with an error.
- **In a browser:** Playwright's Chromium, headless, at 1,366 × 657, in a job of 2 threads (`scripts/machine run`).
  Two builds, each served from its own folder (`preview` in `scripts/measure/speed.mjs`): before (`analysis.svelte.ts`
  as at `c552a03`) and after, one run each, before first. Each run opened the fixture's game
  (`tests/fixtures/hedgefund-review.json`) cut after 30 turns, an unfinished game of 60 positions, by its record
  (`/import#record=`), in a new browser context, so the store held none of its results. The engine settings: 2 search
  workers, the GPU off, Lite, and the position on screen to 4,096 visits with no time limit. `watchSweep` noted each
  search that the page sent. The script moved on (ArrowRight) 2 s after the label pass started, turned the engine off
  (key E) for 8 s during the key moments' step, read the store at "Review done", then reloaded 3 times. It watched
  each reload's progress line for 12 s, and read its layout shift (`layoutShift`). The script set the engine settings
  at each load, so each reload also searched the start on screen to 4,096 visits.
  - **Before:** when the label pass started (16.7 s), the start's search on screen had 33 slices of 32 visits (1,056
    visits). The page sent no label search of the start. The start's search stopped at 1,312 visits when the script
    moved on, and wrote nothing. "Review done" came at 223 s, and the store held the start at 32 visits only. The
    first reload said "Loading the engine's network…", then "Reviewing: move quality, 59 of 60 positions", then
    "Review done". It sent 2 searches, one more than each reload after the change (below). Its layout shift was
    0.0165: the report's table, a note and the chart moved 8.4 s after the reload's start. The next 2 reloads said
    "Review done" in their first frame, with no layout shift (0.0000).
  - **After:** when the label pass started (17.6 s), the start's search on screen had 33 slices, and the page sent the
    start's label search at once, on the other worker. The start's search on screen stopped at 1,280 visits when the
    script moved on. The label search ended at 512 visits. "Review done" came at 232 s, and the store held the start
    at 512 visits. All 3 reloads said "Review done" in their first frame and no other line, with no layout shift
    (0.0000). Each sent one search, the start's on screen.
  - **The engine off:** in both builds, the key moments' searches of positions 23 and 24 ran when the engine went off,
    and the store lacked their 1,024-visit results. For 8 s the line said "Engine off. The review is paused." With
    the engine on, the line named the key moments, then the Greats' confirmations, and "Review done" came when the
    store held the 3 key moments (23, 24 and 25) at 1,024 visits. In these runs, the key moments did not change while
    their searches ran. So the runs did not meet the case of a position that left the key moments, and the two builds
    did the same. The unit tests check that case.
- **Not measured:** Edge, the GPU, a search on screen that its time limit stops, an engine error in a browser, and
  other numbers of workers.
- **The review changed these:**
  - **A position whose result the page no longer holds:** a search's budget is met when the store has a result that
    deep and the analysis holds it (`searched`). With the record alone, a branch that the player deleted and played
    again showed no analysis, and no search ran: the record kept its result, but the analysis did not. A Great's
    confirmation position that the player then played as a branch did the same. Its search now reads the store.
  - **The gleam:** each search that runs notes its budget (`running`), and makes the line gleam only while that
    budget reaches the visits on screen. A shallower result does not replace the line (`keep`). Before, a review
    search below the visits on screen made the line gleam for its whole run, once the search on screen had stopped
    (its time limit, a lower depth on screen).
  - **The engine off and on during a key moment's search:** the engine on asks for the key moments again. But the
    search that the engine off stopped can still run then, so `deepen` skipped its position, and nothing asked for it
    again when that search ended. The line then stayed on the key moments. When the engine went off and on during a
    key moment's search, its end now asks for the key moments again (`pauses`).
  - **The key moments' step** no longer adds the searches that run (`deepSearches`). Every position that the step
    asked for at the review's depth is in it already (`deepAsked`). A search at an earlier review depth no longer
    holds the step.
  - **The tests,** three new ones, each of which fails before its change: a branch deleted and played again, a label
    search below the visits on screen, and the engine off and on before the stopped search ends. The tests' set-up of
    a game whose passes ended is one helper (`reviewed`).
- **The review's check in a browser:** Playwright's Chromium, headless, at 1,366 × 657, in jobs of 2 threads
  (`scripts/machine run`), with 2 search workers, the GPU off and Lite. A script not kept opened the fixture's game
  cut after 30 turns by its record, in a new browser context each run. It sampled the page every 100 ms: the review's
  line, the visits on screen, and the rows of the engine's line that gleam.
  - **Both searches of the start at once** (the position on screen to 2,048 visits): the search on screen ran from
    0.7 s to 22.4 s, and the start's label search from 13.0 s to 18.7 s. While both ran, the visits on screen went
    from 1,024 to 1,568, and they never went down. The store then held the start at 32, 512 and 2,048 visits.
  - **The gleam, both searches at once:** after the Lite review, the start of the Blunder's turn (position 11, the
    only Mistake or Blunder of the cut game, in its opening) was on screen to 16,384 visits, and the review depth
    went to Standard. The label search of position 11 to 1,024 visits ran from 308.3 s, with the search on screen.
    For 2 s, all 20 samples gleamed, and the visits went from 8,864 to 9,056. Then the depth on screen went down to
    256, and the search on screen stopped at 9,120 visits. While the label search ran alone, 1 of 41 samples gleamed
    (the stop's own batch), and the visits stayed at 9,088 to 9,120. After its end, no sample gleamed, and the
    visits stayed at 9,120. The store held position 11 at 32, 512 and 1,024 visits.
  - **The engine off during a key moment's search whose position leaves the key moments:** the page did not meet
    this case by itself. So the script changed the replies of one search on their way from the worker to the page:
    the key moments' search of position 25, the last of 3 and the start of a turn. Its values became a win for the
    mover of the turn before it, so that its results so far took position 25 out of the key moments. The engine went
    off at 672 visits (before) and 704 (after), once the other two key moments were stored. In both builds, the line
    then said "Engine off. The review is paused." for 9 s: 3 of the 6 Greats' confirmations had yet to run.
    - **Before** (`dev`'s `analysis.svelte.ts`): with the engine on, the page did not search position 25 again. The
      line went on to the Greats' confirmations, then "Review done", and the store held position 25 at 32 and 512
      visits only. A reload then said "Loading the engine's network…", "Reviewing: the key moments, deeper, 2 of 3
      positions", then "Review done".
    - **After:** the page sent the search of position 25 again as the engine came on. The line said "Reviewing: the
      key moments, deeper, 2 of 3 positions", then the Greats' confirmations, then "Review done", and the store held
      position 25 at 1,024 visits. A reload said "Review done" from its first sample, and no other line.
- **Not reached in a browser:** "Review done" with the engine off before the change (the Greats' confirmations still
  ran then), and the engine off and on before the stopped search ends (the unit test checks it).

### The hub at abstractclass.org (2026-10-20)

- **What** (abscls-l1l, [design 26](../design/26-one-repository.md), item 3): the organization's front page, in
  `apps/hub`. At first it has one entry, Hedge School. The jam game's site (abscls-8tl1) is the next entry: a new
  `<li>` with the same parts. The hub has no analytics, no cookies, no storage and no request to another host, so it
  has no consent banner and no privacy page. Its product record, its design and its page's brief are in `apps/hub`
  (`PRODUCT.md`, `DESIGN.md`, `.impeccable/surfaces/public-index-html.md`).
- **The look is Hedge School's:** its colour tokens in the same names, the system's font, its lines and its board
  drawing. The jam game's site will take Hedge School's parts (design 26, item 4), so every page under
  `abstractclass.org` looks like one family. **Lavender is the accent of Abstract Class and of Hedge School.** It
  stays a token, used sparingly and kept out of every raster image, so that a sibling site can take another accent
  later by a change of two values (a light one and a dark one). The hub's tab icon is the one exception: a favicon
  cannot read the page's tokens, so it writes the light lavender itself.
- **The name on the page is "Abstract Class",** two words. The addresses and the repositories keep `abstractclass`.
- **The page's structure was chosen from two hands of three,** dealt at random from seven candidates each (the
  Impeccable skill's surface round):
  - The first hand was "Pens on the board" (the page a dotted lattice, each site an enclosed pen on it), "The board at
    full size" and "Two doors per game" (learn it if you play it, try it if you do not). It was dealt again: the pens
    lean too close to Enclosure, a single game.
  - From the second hand, **"The game first, one column"** was chosen: one calm column, and in each entry the game's
    name first and largest, because a player knows the game before the site. The site's name comes second and
    smaller, with Hedge School's collie in its link. Its board plays. The others were "Courses, with what you can do"
    and "The games' names, large".
- **The words** invite (plain web writing) and claim only what holds for every site: free, an engine trained for its
  game, and the engine in the visitor's browser. The two ways in are "Learn Enclosure" (the site's home) and "Try a
  practice game" (Practice), for a player and for a newcomer.
- **The board plays a real scene in CSS alone,** so the page runs no script and its Content Security Policy allows
  none. The scene is the first one of Hedge School's home board (games of bots, with no names, design 22): 19 edges
  drawn one by one, the regions as they close, then the engine's first choice and Blue's edge marked Mistake. The
  badges are 1.4 times Hedge School's, because the board is 320 pixels wide. The board stops under the pointer. With
  reduced motion it shows the last moment, still. `apps/hub/scripts/enclosure-board.mjs` writes it from Hedge School's
  files. With `--check` (the step `hub-board` of `npm run check:all`), it fails when the board is not what it writes,
  or when a colour token of the hub is not Hedge School's.
- **The code:** plain HTML and CSS, with no build and no framework (`apps/hub/public`). The job `hub` of the workflow
  **Deploy** uploads the folder to the Pages project that `HUB_PAGES_PROJECT` names, and is skipped while the
  variable is empty. The owner's steps are in [hosting.md](../hosting.md), section 8. Wrangler makes the project
  (`pages project create --production-branch=main`), not the dashboard: a project made by drag and drop has no
  setting for its production branch (Cloudflare's Direct Upload guide).
- **Checked** in Playwright's Chromium, headless, on a local server that applies the folder's `_headers`, in a job of
  2 threads (`scripts/machine run`): at 1,366 × 657 and 390 × 760, light and dark, at 683 × 328 (200% zoom), and at
  1,440 × 900 and 390 × 844. No horizontal scroll. No request to another host. No violation of the Content Security
  Policy and no console error. At 1,366 × 657 the whole page fits in the window. Both links to Hedge School answer 200,
  and an unknown path answers the 404 page with status 404. With reduced motion, no animation runs.
- **Still open:** Abstract Class has no mark of its own. The tab's icon is an "A" in white on the lavender until it
  has one. The hub has no share image, and `www.abstractclass.org` has no record.
- **What the hub leaves to each game's site** (changed after the review): the websites where the game is played, the
  game's credits, and the site's address in plain text. These belong to the game's site, and the link holds the
  address. So Enclosure's description no longer names strategyjam.org, meaf.us and Constellation, the address under
  "Hedge School" is gone, and the footer gives only "© 2026 Yshan", without "Enclosure by webgoatguy".

### Difficulty as the engine header's second line, and the ◆ on searched branch moves (2026-10-21)

- **What** (abscls-df5l, [design 14](../design/14-complexity.md), with designs [21](../design/21-analysis.md) and
  [07](../design/07-lines-and-variations.md)): a position's difficulty belongs to the position, not to a game's
  review. The engine header's first line gives the advantage ("Expected final margin … · lead …"), and its second line
  the difficulty: the ◆'s slot, the likely edges' meter and the complexity written as a loss (−14.3%). The ◆ shows
  beside every move whose position before it has a result: a review's branch moves and the Analysis board's moves too.
  A branch move or a board move whose position before it has no result says "Not searched yet" in its tooltip. The
  charts stay the game's alone: a chart needs every position of its line searched.
- **The prototype** (four forms of the header, on a review with the owner's stored results copied to the dev server,
  the game 97d7015abab8, at a 1,148-pixel window), measured from the analysis table's top in the screenshots: 230
  pixels before, 239 for the ◆'s slot, the meter and the number in one row, and for the Difficulty chart's bar lying
  down, and 248 for the words and the number on a line of their own with the meter under them. The decision is the
  one row, with the number as a loss, as the notes write losses.
- **The branch moves' marks on that review:** of the game's 49 branch moves, 8 had their position before searched
  (stored), and 2 of those were hard: 2 marks. The positions not searched are mostly inside the engine's lines played
  to a point: a click on the engine's line plays it to that edge (`playPath`), which adds every move before it as
  branch moves, but only the end goes on screen. A move that the player plays starts from the position on screen,
  which the engine searches when it is on, and a branch's first move starts from a game position, which the review
  searched. So a missing mark is easy or not searched, and the tooltip says which. The decision sets aside a search
  of every branch position (design 07 refused it) and a hollow mark for a position not searched (clutter).
- **The Analysis board's results:** its review held only the results of the positions that the player stood on, and
  of the moves evaluated, so a mark on its main line would show only where the player had stood. The board now reads
  the stored results of every position of its main line and of its variations when it opens (`fromStore`), in the one
  read of the store (`warmCache`) that the review makes too. It only reads: the engine searches nothing more. The
  labels stay on the moves evaluated: a label needs `judgedMain` or a branch node's `judged`, which the read does not
  set. A unit test checks the read (`packages/analysis/src/analysis.test.ts`). The other results show from the first
  frame too: the lead in the moves' tooltips, the evaluation bar and the engine's lines at the position on screen,
  and the `[%eval]` comments of the annotated record. The record writes the evaluation of each position that has a
  result (design 21, item 7), so a record copied as the board opens now has every stored position's. Before, it had
  only those that the player stood on or evaluated. Its form, and "A hard position." on the moves evaluated only, stay
  as they were. The analysis file and the link do not change: the file reads the store itself, and the link holds no
  results.
- **Where a board move's ◆ comes from:** the view, from the complexity that the review model keeps for each move
  (`isHard`, `packages/analysis/src/model.ts`). `onlyJudged` keeps the complexity of a move not evaluated, and still
  drops its `hard`: that `hard` also writes "A hard position." in the annotated record, which stays as it was. To keep
  the mark in the model, the board's export would need a second form of the review. A branch move's ◆ comes from the
  search of the position before it (`branchHardness` in `ReviewView.svelte`), by turn from the harder of the turn's
  positions, as a game turn's (`turnComplexity`, which the review's turns use too).
- **Checked** in Playwright's Chromium, headless, on a preview of the build, in a job of 2 threads, at 1,148 × 800,
  with the test fixture's review (`tests/fixtures/hedgefund-review.json`):
  - The engine header was 63.75 pixels tall and its second line 16 at each of the game's 121 positions, by edge and
    by turn, at the hard ones (3, the hardest −28.0%), at the start, which had no result, and at a branch position
    before and after its search. The meter kept its width (364.2 pixels) at all of them. The second line's 16 pixels
    replace the meter's 6, so the header is 10 pixels taller than before (from the classes, not measured before).
  - The number's box is 6.5 characters wide: "−99.9%" needs 40.0 pixels of its 42.0.
  - A branch from the hard position 13: by edge, its two moves from hard positions had the ◆ and "Hard position" in
    their tooltips, and the two moves inside the engine's line played to its third edge said "Not searched yet". By
    turn, the ◆ was on the move that ends the turn, and "Not searched yet" on the end of a turn with a position not
    searched.
  - The Analysis board, from the fixture's record, on its own network: 15 positions searched to 256 visits, then the
    board opened again with the engine off. The first 15 positions showed their results at once, 2 of them hard with
    their ◆, and 105 moves said "Not searched yet" (120 less the 15).
  - The review's check of the board, in the same way: 17 positions searched to 256 visits on the CPU, then the board
    opened again with the engine on. It started no search, and showed no label and no loss. By edge, 2 moves had the
    ◆ and 103 said "Not searched yet". By turn, 1 turn had the ◆ (both hard positions are in it). The annotated
    record exported then had 16 `[%eval]` comments, no "A hard position." and no label.

### A meaf.us game's review links back to its game (2026-10-21)

- **What:** `meafRecord` writes `https://meaf.us/sst1/?game=ID&spectate=1` as the Site tag when the game has an id
  (`MeafGame.gameID`, encoded with `encodeURIComponent`), and `meaf.us` when it has none. The review then shows "View
  this game on meaf.us" (`gamePage`, host `meaf.us`). The Event stays "meaf.us game". A record imported before keeps
  `meaf.us` and has no link, also when the player brings the game again: `saveGame` keeps the record that it saved
  first. Constellation keeps its name: its export has no game address. The Notation page's Site row and design 11
  say that the address opens the game for a player who is logged in to meaf.us (abscls-242q).
- **`/sst1/` is the path of the games that the import reads:** the userscript matches `https://meaf.us/sst1/*`, and
  the bookmarklet runs on the same page.
- **The check for a visitor who is not logged in** (headless Chromium, only pages opened): `https://meaf.us/sst1/`,
  `?history=1` and `?game=abc123&spectate=1` (an invented id: the History page lists no games without a login) all
  showed "Sign in to play". The page asks `/sst1/api/auth`, gets 401, and draws the sign-in page before it reads
  `?game`. The saved copy of meaf.us's code (the engine repository, `index-SqsmQbu0.js`) has the same logic.
- **The check for a player who is logged in** (the owner's browser): a finished game opened from the History page showed
  `https://meaf.us/sst1/?game=ID&spectate=1` in the address (meaf.us adds `&spectate=1` itself) and the game's moves
  on the board.
- **Decision:** the players who bring a game to Hedge School are logged in to meaf.us when they bring it, so the link
  opens the game for them. Another reader gets meaf.us's sign-in page, as for any page of meaf.us.
- **The review's link, checked** on the production build in headless Chromium: a game that `meafRecord` wrote (id
  `abc123`), sent to the import page as the bookmarklet sends it, then reviewed. The review showed "View this game on
  meaf.us", with `https://meaf.us/sst1/?game=abc123&spectate=1` as its target, in a new tab. The check refused every
  request to meaf.us, so it did not follow the link.
- **Not checked:** a game of other players, opened by its address.

### The key moments from the first turn on (2026-10-21)

- **What** (abscls-s8ec, [design 10](../design/10-labels.md), item 7): the key moments are the worst turns or edges,
  Inaccuracy or worse, at most 8, from the first turn on. Before this change the review left out the first 8 turns
  (`OPENING_TURNS` in `packages/analysis/src/model.ts`). The cut is gone from `review`. The chart's marks, the progress
  bar's key moments step and the key moments' deeper search read `keyMoments` and need no change. The page "How
  reviews work" says the new rule. A unit test (`enclosure.test.ts`) checks that a Blunder in the third turn is a key
  moment, by turn and by edge.
- **Why the cut goes:**
  - The rule came in with the placeholder labels (net1 at 64 visits, "Found while building" at the top of this log).
    Regan and Haworth skip the opening of a chess game because its first moves come from memorized theory, so they
    say nothing about a player's skill. Enclosure has no opening theory. Design 01 keeps their method for the skill
    estimate.
  - The published method does not cut by a turn count. Lichess's "Learn from your mistakes" takes every swing of more
    than 0.10 of win chance from the first move on (`ui/analyse/src/nodeFinder.ts`, `evalSwings`). In the opening
    (before the game's middlegame division) it drops a mistake only when the move played is in the masters' opening
    explorer, in more than one game (`ui/analyse/src/retrospect/retroCtrl.ts`, `explorerCancelPlies`). Enclosure has
    no such explorer, so that rule drops nothing here.
- **Measured** (`apps/hedgeschool/scripts/measure/key-moments-opening.mjs`, read only, no new search, on the engine
  repository's `runs/archive_analysis/`: network s46923648 of 2026-10-12, protocol 0.3). The script judges the edges
  and the turns as `review` does. An edge of the engine's best turn is Best, and the key moments rank by label, then by
  points lost, then by win chance (`largest`). A game that ended by resignation or abandonment has no search after its
  last edge, so that edge and its turn have no label here. The site searches that position. "Flagged": a turn that the
  review labels Inaccuracy or worse. It is not the engine's best turn, and it loses more than 0.05 of the mover's win
  chance. The share of turns flagged, by turn number (a range is the lowest and the highest turn of the group):

  | Turns | The network against itself (ladder-384, 512 visits) | Bots rated 2,000 to 3,000 (gauntlet-620, 512) | People (part2-100, 4,096) |
  | --- | --- | --- | --- |
  | 1 to 3 | drawn at random | drawn at random | 62% to 84% |
  | 4 to 8 | 19% to 24% | 43% to 72% | 70% to 80% |
  | 9 to 12 | 21% | 40% | 59% |
  | 13 to 20 | 19% | 34% | 47% |
  | 21 on | 8% | 12% | 19% |

  The bots' first 4 edges were drawn at random (`openingPlies`), so the table leaves out their turns 1 to 3.
  - **The values do not swing more in the opening.** When the network plays itself, its turns lose on average 1.5% to
    1.8% of win chance in turns 4 to 8, 2.1% in turns 9 to 12 and 2.2% in turns 13 to 20. These means count a gain
    against a loss. The labels' loss counts a gain as 0, and its means are 2.9% to 3.4%, 3.6% and 3.4%. The flags in
    the opening are the players' mistakes.
  - **Opening flags are as reliable as later ones.** Of the people's turns flagged at 512 visits, the 4,096 reading
    also flags 94% (577 of 611) in the first 8 turns and 94% (967 of 1,027) later. By edge, 92% (799 of 872) and 88%
    (1,211 of 1,372).
  - **Without the cut, about half of the people's key moments are in the opening.** By turn, 379 of 737 (at 512
    visits), and 96% of them are Inaccuracy or worse at 4,096 (98% of the 358 later ones). By edge, 390 of 762, and 95%
    of them (94% of the 372 later ones).
- **Why the review keeps its two extra searches** (the key moments' deeper search, and the Greats' confirmations). The
  first turns now compete for the 8 places of the key moments, so this entry measures the deeper search again.
  - **The key moments searched deeper.** The review's step "the key moments, deeper" (here "the step") searches the
    positions of the key moments at twice the review's depth. The script emulates it as the page runs it
    (`momentPositions` in `routes/review/+page.svelte`): it deepens the key moments by edge and by turn together, and
    again until they stay. The games are part2-100's: 100 people's games, 8,533 positions, each position read at 512,
    1,024, 2,048 and 4,096 from one search. "Right": the moment is one of the 4,096 reading's key moments, or has its
    label there. From the first turn on:

    | Depth | Key moments by edge right | Labels right | Key moments by turn right | Labels right |
    | --- | --- | --- | --- | --- |
    | 512 (Lite) | 78.9% | 77.8% | 88.2% | 85.2% |
    | 512, then the step to 1,024 | 83.2% | 83.0% | 90.0% | 87.4% |
    | 1,024 everywhere (Standard) | 83.4% | 83.3% | 89.6% | 86.8% |
    | 1,024, then the step to 2,048 | 87.5% | 86.6% | 92.2% | 92.3% |
    | 2,048 everywhere | 87.0% | 86.5% | 92.4% | 91.3% |

    The step gives the key moments about what a review at twice the depth gives them. It deepens 20.6 positions a
    game (24.1% of all) at 512 and 20.5 (24.1%) at 1,024. With each deepened search counted in full, its visits are
    31.2% and 31.8% of the sweep, the label pass and the step together. A review with every position at twice the
    depth adds 100% to the label pass. The step adds 48.2% and 48.1% of it. With one unit alone, the step changes a key
    moment or its label in 71 of 100 games by edge and 54 by turn.
  - **With the first 8 turns cut** (the review before this change), the same measurement:

    | Depth | Key moments by edge right | Labels right | Key moments by turn right | Labels right |
    | --- | --- | --- | --- | --- |
    | 512 (Lite) | 79.9% | 73.0% | 88.8% | 82.2% |
    | 512, then the step to 1,024 | 85.1% | 79.1% | 89.8% | 85.1% |
    | 1,024 everywhere (Standard) | 85.6% | 79.0% | 90.1% | 84.5% |
    | 1,024, then the step to 2,048 | 89.7% | 85.1% | 92.1% | 91.0% |
    | 2,048 everywhere | 89.9% | 84.8% | 92.8% | 90.9% |

    The step deepens 14.8 positions a game (17.3% of all) at 512 and 15.0 (17.6%) at 1,024. Its visits are 24.6% and
    25.4% of the three passes together, and 34.6% and 35.2% of the label pass. With one unit alone, it changes a key
    moment or its label in 60 of 100 games by edge and 45 by turn.
  - **On one review in the owner's browser** (not from the archive): game 97d7015abab8, with the site's network on
    2026-10-21, at 16,384 visits and the key moments at 32,768. No key moment changed, 3 edge labels changed, and the
    step searched 20 positions (+33% of the label pass's visits). One game only.
  - **The time,** from this log's runs of the fixture game: bots, Lite, 2 workers ("The whole review in a hidden tab",
    in the entry "A hidden tab's review: the key moments and the time limit without timers of the page"). The whole
    review took 370.9 to 620.4 s. Of that, the key moments took 17.9 to 44.0 s and the Greats 11.0 to 16.1 s.
  - **The Greats' confirmations** (part1-1000's follow-ups: 1,000 people's games, 84,100 positions, 512 visits). A
    Great needs a second search, as deep as the one that shows the gap, of the position after the second choice
    ([Great confirmed by an equal search](#great-confirmed-by-an-equal-search-2026-10-11)).
    - By edge there are 1,594 gaps in one search (3 more at a game's last edge, which nothing confirms). The equal
      search keeps 1,253 (79%) and refutes 341 (21%). It refutes 36% of the gaps from 0.10 to 0.15, 17% from 0.15 to
      0.25, 8% from 0.25 to 0.5 and 11% over 0.5. The median gap of the refuted is 0.137, and of the kept 0.197.
    - By turn there are 300 Greats in one search, and the equal searches confirm 198 (66%).
    - The cost: 1,882 searches (1,597 by edge, 958 by turn, 673 shared) of 512 visits for 84,100 positions, 2.2% of
      the label pass.
    - On game 97d7015abab8 (the owner's browser): 8 Greats by edge in one search and 7 confirmed. By turn, 2 and 2.
  - **So both searches stay.** The key moments' deeper search gives them about what a review at twice the depth
    gives. It adds 48% to the label pass's visits, where the deeper review adds 100%. The Greats' confirmations refute
    a fifth of the Greats by edge and a third by turn, for about 2% of the label pass's visits.
- **The limits of these numbers:**
  - One network, s46923648 of 2026-10-12. Another network may flag the opening differently.
  - People's games from the meaf.us archive: part2-100 for the flags and the key moments, part1-1000 for the Greats.
    The players' strength varies from game to game. The bots' games have 4 edges drawn at random.
  - 54 of part2-100's 100 games ended by resignation or abandonment. Their last edge and their last turn have no label
    here, but the site labels them from its search of the last position.
  - The reference is the same search read further. The 4,096 reading continues the 512 reading's own search, so it
    favours the deeper readings, and "right" means agreement with it. It does not mean agreement with the best play.
  - One game in the owner's browser is an example, not a measure.

### Great: En Croissant's whole rule (2026-10-21)

- **What** (abscls-eu6v, [design 10](../design/10-labels.md), item 6): a Great now needs En Croissant's third
  condition too. The engine's first choice before the move must be more than 0.05 of win chance better for the mover
  than the position before the opponent's last turn: the move keeps what the opponent's last turn gave. An only move
  that only holds the position is Best. The rule is En Croissant's "!" (`src/utils/score.ts`, `getAnnotation`,
  commit d64ce9e). The site cited it, but took only part of it. Before this change, the site had the loss of at most
  0.05 (as Best) and the gap of 0.10 (confirmed by the equal search). It did not have the third condition.
- **The opponent's last move is the opponent's last turn,** by turn and by edge. For a turn and for each of its edges,
  the position is the start of the opponent's turn just before. The line's first turn has no such position, so it is
  never Great.
- **Built:** `keepsGain` in `packages/analysis/src/model.ts`, read by `review` (the game's edges and turns),
  `judgeTurn` and `judgeBranchEdge` (a branch's moves evaluated on request, with `GameAnalysis.earlierAt`, the position
  before the opponent's last turn on the branch's line). `review` and `earlierAt` find that position with one function,
  `earlierIndex`, so the labels and the searches that confirm them agree. The Greats' confirmations (`greatTargets`)
  ask for no search where the condition fails. The progress bar's step "Great moves" counts these searches, so it
  counts fewer. The Great's note says "It keeps the gain from the opponent's last turn.", and How reviews work gives
  the condition.
- **Measured** (`scripts/measure/key-moments-opening.mjs`, part 4: part1-1000's follow-ups, 1,000 people's games,
  84,100 positions, 512 visits, network s46923648). The script judges the condition as the site does (`keepsGain`,
  `earlierIndex`): the first candidate's win chance against the root's win chance at the start of the opponent's turn
  before.
  - By edge: of the 1,253 Greats that the equal search confirms, 952 (76%) keep what the opponent's last turn gave.
    924 (74%) leave the mover not losing (a win chance of 0.50 or more after the move, as Chesskit and WintrChess
    ask), and 760 (61%) do both. The mover's win chance after a confirmed Great is under 0.30 for 8%, and from 0.30
    to 0.50 for 18%.
  - By turn: of the 198 confirmed Greats, 152 (77%) keep it, 145 (73%) leave the mover not losing, and 114 (58%) do
    both.
  - The searches: 391 of the 1,594 gaps by edge, and 200 of the 658 turns with a follow-up, fail the condition. Of the
    1,882 searches that confirm the Greats, the review still asks for 1,410: 472 fewer (25%). A turn of two whose
    start keeps the gain still asks for the search from its middle, also where its middle does not keep the gain.
- **Checked in a browser** (headless Chromium, the software adapter, two builds on a preview of their own): the
  fixture game (`tests/fixtures/hedgefund-review.json`, bots, HedgeFund 0.1 Lite, 512 visits) from its file's results.
  Before the change: by turn, Blue 0 Greats and Red 1. By edge, Blue 0 and Red 4. After it: by turn, Blue 0 and Red 1.
  By edge, Blue 0 and Red 3. The review ended ("Review done") in both builds, and again when the page reloaded it from
  the browser's store.
- **The step "Great moves" while it runs** (the same browser, the build after the change): the fixture's results of
  the game's positions only, with none of its confirmations. The engine ran the key moments' searches and the
  confirmations. The step counted 4 searches, showed "3 of 4" and then "Review done", and its total did not change.
  The Greats were as above (by turn Red 1, by edge Red 3). A reload read the review from the store, with its
  confirmations: "Review done" in 0.3 s, with the same Greats.
- **Why not "not losing" instead** (Chesskit, WintrChess): the site cites En Croissant, and its third condition says
  what a Great is for: a move that keeps what the opponent's last turn gave. The two conditions disagree on 356 of the
  1,253 confirmed Greats by edge (28%).
- **The limits:** one network, and people's games of the meaf.us archive. The third condition reads the search
  before the opponent's turn, which has its own error, as every loss does.

### The area maps on real games (2026-10-21)

The area maps (design 30) were looked at on real reviewed games before the rule for when a mistake's map shows was
set. `scripts/measure/ownership-maps.mjs` took 10 human games of the meaf.us archive (the first 2 of each rating band
from 1 to 5 in the engine repository's `runs/archive_analysis/part1-1000.jsonl`, each ended by the rules after 120
edges), for this measurement only, and searched each position before a move as the Lite review does (HedgeFund 0.2
Lite, 512 visits), with the root's ownership and each candidate's: 1,200 positions in 61 minutes on 2 threads of a busy
machine. By turn, it took the 128 turns whose mover's win chance fell by 0.10 or more and that were not the engine's
best turn (a Mistake or a Blunder, near enough), and compared the root's ownership at each turn's start with the root's
ownership after the turn (`lostArea`).

| Edges | Turns | Side right | Focus (median) | Area lost, points of the board (median) | Points lost ÷ (net fall × turn ends left), median | Root against best choice, mean per point |
|---|---|---|---|---|---|---|
| 1-20 | 69 | 65 | 0.00 | 11.4 | 0.98 | 0.006 |
| 21-40 | 33 | 33 | 0.13 | 11.1 | 0.96 | 0.015 |
| 41-60 | 16 | 14 | 0.19 | 16.3 | 0.99 | 0.006 |
| 61-80 | 4 | 4 | 0.00 | 11.1 | 1.70 | 0.002 |
| 81-100 | 2 | 1 | 0.26 | 12.9 | 1.65 | 0.008 |
| 101-120 | 4 | 4 | 0.18 | 8.8 | 3.99 | 0.008 |

- **The side agrees:** on 121 of the 128 turns, the mover's ownership fell in all.
- **The rough size agrees:** the points lost are close to the net fall of the mover's ownership times the turn ends
  left (ownership is a mean over them): a median ratio of 0.96 to 0.99 up to edge 60, and a correlation of 0.83 over
  the 121 turns. Late in a game the ratio grows (1.7 to 4.0, on 10 turns), where few turn ends are left.
- **The root's map for "after the best move":** it differs from the ownership of the engine's first choice by 0.006
  per point on average, against values from −1 to 1. The candidates' ownership is not worth its size (design 30).
- **The focus:** the share of the fall in the points that fall by 0.30 or more, which the map shades clearly. The
  median is 0 up to edge 20: the fall of most mistakes there is spread thin over the whole board, a haze with nothing to
  point at. Clear maps come at every stage, though. With the rule "show the area lost when its focus is 0.2 or more"
  (`shownLost`), counted on the same turns:

  | Edges | Turns | Shown | Of those, side right |
  |---|---|---|---|
  | 1-16 (the first 8 turns) | 61 | 13 | 12 |
  | 17-40 | 41 | 20 | 20 |
  | 41-60 | 16 | 7 | 7 |
  | 61-120 | 10 | 2 | 2 |
  | All | 128 | 42 | 41 |

  The run printed the first table. The second was counted from the run's list of turns. The script now prints both.
  It now takes the median of an even count as the mean of the middle two (`scripts/measure/speed.mjs`, `median`).
  The run took the upper of the two, in the first table's rows of 16, 4 and 2 turns.

- **The decision:** no edge from which the map shows. The question "is this map clear" has a direct answer for each
  move, and an edge would hide the 13 clear maps of the opening and show the hazy ones after it. So the area lost
  shows for a Mistake or a Blunder when its focus is 0.2 or more, at any edge: about a third of them, the most in the
  middle game. The map at every position shows from the start: it is the engine's estimate, and in the opening it is
  faint because the engine holds the board open.
- Looked at on the test fixture's game in the review, in Chromium: its one Blunder (turn 7, Blue) shades the south of
  the board, where Red's regions grow. The caption: "with the best turn, it stays open. After the turn played, Red
  holds it for half the turns left or more."

### The window of the area lost (2026-10-21)

The review of the area maps found that the two maps count different turn ends. The engine's ownership is a mean over
the turn ends left, and at a turn's start these include that turn's end. After the turn, they do not. So for a point
held h at the turn's end and r on average after it, with N turn ends left at the start, the mover's ownership falls by
about (h − r) / N even after the best turn. The search's tree mixes nodes before and after the turn's end, so this is
an estimate. A point that the opponent encloses only later then falls by 1 / N: under the clear fall of 0.30 until 3
turn ends are left.

Measured on the test fixture's game (HedgeFund against HedgeFund, 120 edges, 61 turns), with `lostArea` from each
turn's start to its end. 60 turns have both maps: the position after the last turn ends the game and has no search.

| Turns | Count | Area lost, points of the board (median) | Clear enough to show (`shownLost`) |
|---|---|---|---|
| A loss of win chance under 0.02, more than 6 turn ends left | 48 | 1.5 | 18 |
| A loss of win chance under 0.02, 6 turn ends left or fewer | 6 | 2.8 | 3 |
| The Blunder (turn 7, Blue) | 1 | 64.3 | yes |

- The area lost of a turn with no loss holds the window's part and the trades of a good turn: a turn that gains in one
  place can lose in another. Both are small next to a Blunder's.
- Many of these turns pass the clarity rule: a few points fall clearly. They show nothing, because the area lost shows
  only for a Mistake or a Blunder.
- None of the turns in the last 3 turn ends passed the rule.
- An exact correction needs each point's regions at the turn's end. These come from the rules, which this repository
  does not copy. The design keeps the two maps as they are, and names the limit (design 30, Consequences).

### The results of shape 5 stay readable (2026-10-21)

The first build of the area maps moved the stored shape from 5 to 6 and removed the results of shape 5 at the site's
start, as earlier shapes were removed. A review file of HedgeFund 0.2 at 16,384 visits then opened with no results,
and the site reviewed the whole game again. Shape 6 only adds a field, the ownership, and changes the meaning of none:
a result of shape 5 is still right, with no ownership.

- **The decision:** the site writes shape 6 and reads shapes 5 and 6 (`READ_FROM` in
  `packages/analysis/src/cache.ts`). The store, a review file and an analysis file keep the results of both, and the
  start removes only the shapes before 5. Of two results as deep, the review takes the one of shape 6.
- **The maps of a result with no ownership** come from a short search of the position alone, at the sweep's 32 visits,
  when the board shows it: the position on screen, and a Mistake's or a Blunder's two positions
  (`GameAnalysis.askOwnership`). The ownership stays apart from the result, and the store does not keep it.
- **Checked** in Playwright's Chromium, headless, on a local build:
  - The test fixture's review file as the site wrote it before (shape 5, 244 results) opened with its results: four
    seconds after it opened, the review was at the key moments' step. The page sent no search of the sweep or of the
    label pass, only the key moments' searches at 1,024 visits, which the file does not hold.
  - The same review stored in the browser, with its keys turned to shape 5 and its ownership removed, and the
    browser's mark at 5: after a reload, the start kept the 244 results, and the review opened as the file did.
  - At the file's Blunder (turn 7), two searches of 32 visits gave the ownership of the turn's two positions. The
    area lost showed (169 and 171 squares shaded, against 172 from the review's own searches), with the same caption.
  - No error on the page in either case.
- **Tests:** a review file and an analysis file of shape 5 keep their results. A stored result of shape 5 is found,
  and of two as deep, the one of shape 6. A game whose results are all of shape 5 opens with no search, and the
  board's ownership comes from one short search that the store does not keep.

### The area map and the explanations on real games (2026-10-21)

The display of design 30 changed after a look at the first build on real games: the map shows the change from the
board now to the engine's forecast, not the ownership, and a Mistake or a Blunder is explained by the opponent's next
turn in the engine's line, not by the area that it lost. `scripts/measure/ownership-maps.mjs` measured both on the
test fixture's game (its stored review) and on the 10 meaf.us archive games that the first build used (the first 2 of
each rating band from 1 to 5 in the engine repository's `runs/archive_analysis/part1-1000.jsonl`, each ended by the
rules after 120 edges), for internal use only. The archive games' positions at their turns' starts were searched as
the Lite review searches them (HedgeFund 0.2 Lite, 512 visits, with the root's ownership and the lines' visits): 610
positions in 33 minutes on 2 threads of a busy machine. The flagged turns are the first build's: by turn, a fall of
the mover's win chance of 0.10 or more on a turn that was not the engine's best (a Mistake or a Blunder, near enough).

**How much of the board the map marks** (`changeMap`): the share of the board's 361 points with a change of at least
the threshold, median over the positions. In brackets, the medians of the two marks alone (dots on open area that a
side will close, hatching on closed area that its owner will lose). A median of each part does not add up to the
median of the whole.

| Edges | Positions | At 0.3 | At 0.5 | At 0.7 |
|---|---|---|---|---|
| 0-20 | 110 | 0.3% (0.0% + 0.0%) | 0.0% (0.0% + 0.0%) | 0.0% (0.0% + 0.0%) |
| 21-40 | 100 | 6.4% (5.3% + 0.0%) | 3.6% (0.0% + 0.0%) | 1.7% (0.0% + 0.0%) |
| 41-60 | 100 | 11.6% (6.4% + 0.8%) | 7.1% (1.1% + 0.6%) | 5.3% (0.0% + 0.3%) |
| 61-80 | 100 | 9.1% (1.8% + 2.2%) | 6.1% (0.0% + 2.2%) | 3.3% (0.0% + 1.4%) |
| 81-120 | 200 | 5.5% (1.7% + 2.5%) | 4.4% (0.3% + 2.2%) | 3.0% (0.0% + 1.4%) |
| All | 610 | 6.1% (1.7% + 0.8%) | 3.7% (0.0% + 0.6%) | 2.5% (0.0% + 0.3%) |

- **The threshold: 0.5** (`CHANGE` in `src/lib/review/ownership.ts`). At a typical position the map then marks about
  13 points of 361 (3.7%), at most 7% in the middle game, and nothing in the opening, where the engine holds the board
  open. That is a few places to look at, not a haze. At 0.3 it marks nearly twice as much, at 0.7 it loses a third of
  that. A change of 0.5 also reads simply: for an open point, a side's region over it at half the turn ends left at
  least; for a closed point, its owner's hold falling by half or more.
- **The fixture's game** is one-sided (HedgeFund at 1 visit against HedgeFund at 128). At 0.5, the map marks 0% up to
  edge 20, 51.5% in edges 21 to 40, where Red is about to enclose most of the board, then 12.6%, 2.5% and 0.3%, a
  median of 2.5% over its 120 positions. In a game that one side leads by far, the map marks what that side will
  close.

**The explanations of the flagged turns** (`explainMistake`): the opponent's turn in the engine's first choice's line
from the position after the turn, as far as the search trusts it, played by the rules (`describe_game`).

| Edges | Turns | The next turn closes or cuts | A later turn does | Spread | No caption (the line holds no whole turn) | The line's edges, median |
|---|---|---|---|---|---|---|
| 1-16 | 61 | 42 | 13 | 6 | 0 | 7 |
| 17-40 | 41 | 31 | 3 | 6 | 1 | 4 |
| 41-60 | 16 | 15 | 0 | 0 | 1 | 5 |
| 61-120 | 10 | 8 | 0 | 1 | 1 | 4 |
| All | 128 | 96 | 16 | 13 | 3 | 6 |

- **112 of 128 get a caption with a close or a cut** (88%): 96 from the opponent's next turn, 16 from its second turn
  in the line, none later. 64 of them cut, 68 close, and 30 open some of the mover's area. The first build's area lost
  showed on 42 of the same 128.
- **13 get the sentence that the loss is spread over the board,** and 3 no caption: the trusted line ends before the
  opponent's turn does.
- **The fixture's game** has one flagged turn, its Blunder (turn 7, Blue). Its caption: "After this turn, Red closes 2
  points of area at O11." A true fact, and a small one.

### The mistakes' captions removed, and the ownership map back (2026-10-21)

A look at the second build of the area map (design 30), on the review and the Analysis board, found:

- **The captions of the Mistakes and the Blunders said nothing useful.** One turn's close or cut is never what a
  mistake gave away: the whole rest of the game decides it. The measurements above count exact facts, not useful
  ones.
- **The opponent's turn drawn after a mistake repeated the engine's line,** which already shows what happens next.
- **The change map was hard to read.** "The ownership less the board" needed an explanation, and its threshold hid the
  data under 0.5. The first build's map of the ownership itself was easier to read.

So the captions, the drawn turn, their outline and the setting "Explain mistakes" are removed. The map's default style
is the first build's ownership map again (KaTrain's gamma, the strongest shade 0.45, the blur). The change map stays
as a second style. The player sets the smallest value marked, for each style, from 0 (every point with a value). The
legend says in one line what the map shows, and the point under the mouse's pointer shows its numbers there: its
ownership, its state now and the change. While a candidate's line shows, the map shows that candidate's ownership.
The measurements above stay as the record of the second build.

### No new shape for an added field (2026-10-21)

The first builds of the area map took a new stored shape for each field that they added: 6 for the ownership of each
point, and 7, on this build's branch, for the candidates' maps. The live site was still at shape 5. A shape says what
a result's fields mean: a new one is only for a change of meaning, as shape 2 was (a candidate's visits became KataGo's
edgeVisits), so that an older result is not misread. A field that is only added changes no meaning, and a reader must
check whether it is there anyway, for the results stored before it.

- **`SHAPE` is 5 again** (`packages/analysis/src/cache.ts`). The ownership and the candidates' maps are optional
  fields of a result of shape 5.
- **The results that the branch's builds stored as shape 6** (the browser that tried them) are results of 5 with the
  ownership. The readers read them as 5 (`READ_SHAPES`: 5 and 6), the removals keep them, and they are never searched
  again.
- **The site before the map reads this site's review files completely:** its file reader takes the entries whose key
  has its shape, 5, and whose value is an object, and it ignores the fields that it does not know. With shapes 6 and
  7, it dropped every result of such a file.
- **The maps added to a stored review** (design 30) need a key that the site before the map never takes as a result.
  Their key is a result's key with `map|` before it: that site's `isAnalysisKey` (`/^\d+\|[^|]*\|[0-9a-f]+\|\d+\|/`)
  refuses it, so its file reader drops it and its removal of earlier results leaves it alone. A test checks the key
  against that expression (`cache.test.ts`). The test fixture's results keep their content, with their keys at
  shape 5.

### A candidate's map from a short search (2026-10-21)

A result stored before the candidates' maps gets a candidate's map from a short search of the position after the
candidate's move (design 30). The question: at how many visits does such a search answer as the full search's own
map of the candidate (KataGo's `includeMovesOwnership`, the mean over the candidate's subtree)?

`scripts/measure/candidate-maps.mjs`, in Node on one thread, the CPU module of release `engine-d6786eba`, HedgeFund
0.2 Lite: every 8th position of the test fixture's game (14 positions), each searched as the Lite review searches it
(512 visits), and each candidate on the board (`shownMaps`), 102 candidates in all. For each candidate, short
searches of the position after its move at 8 to 512 visits. The mean difference is over the 361 points, in the
ownership's units (−1 to 1); the marks are the change style's at 0.5.

| Short search, visits | Mean difference: median, p90 | Points whose mark differs: median, p90 | Time, ms (median) |
|---|---|---|---|
| 8 | 0.010, 0.022 | 0.0%, 1.4% | 105 |
| 16 | 0.007, 0.013 | 0.0%, 0.6% | 101 |
| 32 | 0.007, 0.012 | 0.0%, 0.6% | 195 |
| 64 | 0.007, 0.014 | 0.3%, 0.6% | 388 |
| 128 | 0.007, 0.013 | 0.0%, 0.8% | 796 |
| 512 | 0.009, 0.016 | 0.0%, 1.1% | 4,630 |

- **A candidate on the board rests on few visits:** a median of 17 of the full search's 512. Its map is the mean over
  a small subtree, so a short search of the position after it is about as deep, and differs from it least. A search
  of 512 visits differs a little more: it looks further.
- **32 visits** (`MAP_VISITS`): as close as any count (a mean difference of 0.007 at a point, a mark that differs on
  at most 0.6% of the points for 9 candidates in 10), at about 0.2 s in Node. 16 visits are as close here, and 32
  keeps a margin for a position that the fixture's one-sided game does not have.
- The fixture's game is one-sided, so much of its board is settled. A close game can differ more, at every count.

### The candidates' maps: their size and their time (2026-10-21)

Every search of the review asks for each candidate's map too (`includeMovesOwnership`), and a result keeps the maps of
the candidates on the board (design 30). The cost, on the test fixture's game (120 edges, HedgeFund 0.2 Lite, 512
visits a position):

**The stored size.** The fixture's review file, the same results with and without the maps: 1,427 kB before, 4,298 kB
after. 2,590 of its 5,015 candidates are on the board, about 1.1 kB of JSON each. The game is one-sided: where every
win chance is near 1, the candidates within 36 points of the first choice show, and many do.

**In the browser.** `scripts/measure/review-ownership.mjs`: two builds, one whose searches ask for the root's
ownership alone (as the build before) and one that asks for the candidates' maps too, in three alternating pairs,
each reviewing the fixture's game from no stored result. Playwright's Chromium, headless, 1,366 × 657 pixels, 2 search
workers, the GPU off, through `scripts/machine run` with 2 threads while a training job held the other 10.

| | Before | After | The pairs' differences |
|---|---|---|---|
| The review's time, s (median) | 323.3 | 386.1 | 120.6, 62.8, 47.9 |
| A search of 512 visits, ms (median of the review's 125) | 4,965 | 6,015 | 2,250, 1,063, 868 |
| A search of 32 visits, ms (median of 120) | 348 | 401 | 3, 48, 57 |
| The store, kB (249 results) | 1,017 | 3,093 | 2,076 each |

- **The store is three times as large:** 2,076 kB more, in 1,916 candidates' maps, against 271 kB for the 249
  positions' own maps.
- **Every review is slower,** by 48 to 121 s (a median of 63 s, about a fifth), and every search of 512 visits, by 0.9
  to 2.2 s. Where the time goes was not measured: the engine builds every candidate's map from its subtree, and the
  reply carries them all (about 3 kB of JSON each) before the page keeps the shown ones. The after runs spread by
  64 s, more than the difference's smallest pair, so by the rule of `verdict` the review's time is not a sure change.
  Its direction is: all three pairs agree.
- **Searches of 1,024 visits** (4 a review, the key moments) differ in both directions: too few to say.

### The candidates' maps from the short search alone (2026-10-21)

The measurements above show that the full search's candidates' maps (`includeMovesOwnership`) cost every review a
stored size three times as large and about a fifth more time. The candidates on the board rest on few visits of the
full search (a median of 17 of 512), and a short search of 32 visits of the position after the move differs from
their maps by 0.007 at a point. So the full search's maps give nothing that the short search does not.

- No search asks for `includeMovesOwnership`, on the review or on the Analysis board, and a result keeps no
  candidates' maps. The review's time and its stored size are those of the build before the candidates' maps.
- Every candidate gets its map as an older review does (design 30): a search of 32 visits of the position after its
  move, asked for when the candidate is pointed at, stored as an added map (its key starts with `map|`), read again
  with no search, and exported with the review. The game's next move takes its position's own map.
- The test fixture's review file keeps no candidates' maps: 1,427 kB, its size before them.

### The delay of a candidate's map (2026-10-21)

`scripts/measure/candidate-map-delay.mjs`: from the pointer on a candidate's row in the table to the map of the
position after its move, the first time (no map stored), on the test fixture's game at every 10th position from edge
15 to edge 105, for a candidate other than the game's next move. Playwright's Chromium, headless, 1,366 × 900
pixels, the area map on, 2 search workers, the GPU off, through `scripts/machine run` with 2 threads while a training
job held the other 10.

| Case | Samples | The map, ms: median | Least | Most |
|---|---|---|---|---|
| The review runs (its label pass, both workers busy) | 9 | 2,835 | 961 | 7,061 |
| The engine idle (the fixture's review file, no search running) | 9 | 441 | 328 | 455 |

- **With the engine idle,** the map comes in less than half a second: one search of 32 visits.
- **While the review runs,** the map's search waits for a worker: both run the review's searches, of up to 512
  visits (about 5 s each). The map's priority is just under the position on screen's (`PRIORITY.ownership`), so it
  takes the next free worker, and comes in 1 to 7 s.
- The line shows at once (a median of 33 ms idle): the map follows it.
- At edge 35, no candidate other than the game's next move had a line in 60 s: no sample there.
- A first run took its "idle" samples without a check that no search ran: one map came in 10.6 s. The table is the
  second run, which waits until no search runs.

### A candidate's map from a short search, on a close game (2026-10-21)

The test fixture's game is one-sided, so the comparison above is repeated on a close game of our own bots, from the
empty board (the arena's 4 random opening edges).

**The game's choice.** The engine repository's arena games (runs/*/arena/games.jsonl), read as
games/enclosure/tools/export_blog_game.py --arena reads them: each action decoded and played by its rules binding
(`Position`, `decode_action`, `edge`), in WSL, with the repository unchanged. 11,012 games have no timeout pass. Of
the release matches (runs/v2-release-match and runs/v2-release-match-0.2: the released networks against each other at
512 visits), the 12 games of at least 100 edges with the smallest final margin. Each of their positions, at every
second edge, searched by the site's engine (HedgeFund 0.2 Lite, 32 visits). The chosen game is the one whose Blue win
chance stays from 0.25 to 0.75 for the most edges from the start: runs/v2-release-match-0.2/arena/games.jsonl, line
277 (b15c192-s66999040-d13350730 against b15c192-s71808256-d14315742, 512 visits each), 120 edges, a final margin of
1.4 points, its win chance in that band up to edge 82. The next best stays in it up to edge 64.

**The comparison** (`scripts/measure/candidate-maps.mjs 8 <the game's moves>`, as above): 14 positions, 21
candidates on the board.

| Short search, visits | Mean difference: median, p90 | Points whose mark differs: median, p90 | Time, ms (median) |
|---|---|---|---|
| 8 | 0.027, 0.041 | 0.6%, 1.9% | 53 |
| 16 | 0.021, 0.051 | 0.3%, 1.9% | 54 |
| 32 | 0.019, 0.038 | 0.3%, 1.4% | 99 |
| 64 | 0.015, 0.049 | 0.3%, 0.8% | 186 |
| 128 | 0.019, 0.049 | 0.3%, 0.8% | 405 |
| 512 | 0.015, 0.035 | 0.0%, 0.6% | 3,120 |

- **In a close game the candidates on the board are few and well searched:** a median of 355 visits of the full
  search's 512, against 17 in the fixture's game. Their maps rest on a deep subtree, and every short search differs
  more from them than in the fixture's game.
- **32 visits differ from the full search's map by 0.019 at a point, 512 visits by 0.015.** A mark differs on at
  most 1.4% of the points for 9 candidates in 10 (about 5 points), against 0.6% at 512 visits.
- **The counts do not order cleanly:** 64 visits match 512 at the median and not at the 90th percentile, and 128
  visits do worse than 64. With 21 candidates, the differences between the counts from 32 up are within the noise.
- **MAP_VISITS stays 32.** The close game shows a small cost of the short search, about 0.004 at a point more than a
  search of 512 visits, at a thirtieth of its time. It does not show a count that does clearly better.

### The map follows the line as drawn (2026-10-21)

A candidate's map stayed at the position after the candidate's first edge while the board drew its whole line, so
the map and the board disagreed from the line's second edge on. Now the map is always the map of the position that the
board shows: the position on screen, or the position after the last drawn edge of a line or a preview (design 30). The
maps of a line's positions come as a candidate's map comes, asked for in the order of drawing.

**How far the maps lag behind an animated line** (`scripts/measure/line-map-lag.mjs`): a candidate other than the
game's next move pointed at in the table, at every 8th position of the test fixture's game from edge 9 to edge 105,
where its line showed at least 3 edges; for each step, the time from the drawing of its edge (one every 500 ms) to the
legend's "After edge k of the line", 0 when the map was there first. Playwright's Chromium, headless, 2 search
workers, the GPU off, 2 threads while a training job held the other 10.

| Case | Steps | With their map while drawn | At 0 ms | Lag: median, most |
|---|---|---|---|---|
| The engine idle (the review file's results, no search running) | 55 | 55 | 46 | 0 ms, 464 ms |
| The review runs (its label pass, both workers busy) | 46 | 30 | 19 | 0 ms, 11,432 ms |

- **With the engine idle, the maps keep up:** the first step's map comes 47 to 464 ms after the hover, and every
  later step's is there when its edge is drawn. The searches of the later steps run while the first edges show.
- **While the review runs, a step's map waits for a worker:** 16 of 46 steps never had their map while they were the
  edge drawn. The board then keeps the latest map of the line before them, and the legend says which and that the
  next is searched.
- A first run asked again for the steps already drawn, after the steps to come. With the review running, 4 of 15
  steps had their map while drawn. The order now leaves out the steps already drawn, so that their searches give way.
  The two runs had other positions, so the gain is not measured.

### After vs before: the third style (2026-10-21)

A third style of the area map, "After vs before" (design 30): the forecast after a move, or after a drawn line, less
the forecast before it, from the side of the player who chose. KaTrain's loss grid, the first build's area lost, at
every move and with the rises as well as the falls. The two older styles are named by what they compare: "Forecast"
and "Forecast vs board".

**How much shows after the engine's best moves,** at the default smallest value (0): on the test fixture's game, the
58 edges that were the engine's first choice, the stored maps before and after each edge
(`scripts/measure/difference-at-best.mjs`, by edge).

| Smallest value | Points marked: median | Most |
|---|---|---|
| 0 (the default) | 119 | 338 |
| 0.1 | 2 | 211 |
| 0.3 | 0 | 7 |
| 0.5 | 0 | 3 |

- **At 0, a best edge marks about a third of the board, faintly.** The strongest change at a best edge is 0.13 at the
  median (0.86 at most), drawn at about a fifth of the full strength (|0.13| ^ (1 / 1.33)). The falls and the rises
  are about even: a median of 1.1 points of the forecast each way. They come from the forecast before the move, which
  is the mean over the whole search, not the best move's alone.
- **From 0.1 up, a best edge marks a median of 2 points.** A smallest value of 0.1 would leave the best moves nearly
  clean. The default stays 0, KaTrain's, until the styles are compared.
- **At the fixture's Blunder** (turn 7), the map shows the trade: Red's coming area at the bottom fell for Blue, and
  area at the top rose for Blue.

### The marks of After vs before, and 0.05 (2026-10-21)

**The signs.** After vs before no longer shades the falls in the accent with a blur. Where the forecast rose for the
player who chose, plus signs in that player's colour; where it fell, minus signs in the opponent's colour. A sign's
colour says toward whom the point moved, as every mark of the board does, and its shape says whether that is good or
bad for the player who chose. Each sign is as strong as |difference| ^ (1 / 1.33), the value's shade, and a halo in the
board's colour keeps it whole where it meets its own colour. A first version took the labels' green and red: it was
replaced before it was looked at, so that the board keeps one colour language (design 30).

**How the signs read** (screenshots of the board alone, light and dark, at edges 13, 29, 45, 61 and 85 of the test
fixture's game, headless Chromium):

- A strong sign reads in both themes, on the open board, on its own player's region and across edges: the halo keeps
  a red minus whole on Red's region and edges, and a blue plus on Blue's.
- A faint sign (a value near the smallest value marked) is faint everywhere, as the value says. The faintest case is a
  red minus on the dark board, and on Red's region there: red has less contrast than blue on the dark board, and the
  halo, in the board's dark colour, adds none.
- Rows of minus signs next to each other read a little as dashed lines. The hatching of Forecast vs board is
  diagonal, so the two do not look alike.

**The smallest value marked defaults to 0.05 for all three styles** (`mapMin` in `src/lib/review/display.ts`). A
browser keeps the value that it has stored. What 0.05 marks on the test fixture's game:

- After vs before, after the 58 edges that were the engine's first choice (`scripts/measure/difference-at-best.mjs`):
  a median of 7.5 points (most 237), against 119 at 0 and 2 at 0.1.
- Forecast vs board, at each position (`scripts/measure/ownership-maps.mjs` on the fixture's review): a median of
  20.9% of the board, against 2.5% at the second build's 0.5. 62.9% in edges 0 to 20, where the engine holds the
  board open and expects many small closes, 76.2% in edges 21 to 40, then 27.1%, 13.6% and 13.6%.

### The map's work made visible, and the map pass (2026-10-21)

It was not clear whether a map was being made or was finished: a position's added map showed nothing until it came,
and while a review runs its short search waits for seconds behind the review's searches. Two changes (design 30):

- **The map's state, in the legend's slot.** For a position: "Map: waiting for the engine", "Map: searching" or "No
  map: the game ends here", nothing when the map shown is ready. For a line or a preview: "Maps of the line: 3 of 7".
  While work goes on, the note carries the gleam of the review's progress bar (bar-glider).
- **The map pass.** While the map is on and the review's passes are done, the maps of every position of the game
  that has none, from the position on screen, at the lowest priority and in slices of 8 visits, so that the engine
  stops one at once for any search for the player. Its progress is one more part of the review's progress bar
  ("Maps: 34 of 120"); the review is done without it.

**The pass's time** (`scripts/measure/map-pass.mjs`): the test fixture's review file with the ownership removed from
every result, as a review stored before the maps, imported (all its results there: no search), the engine idle, then
the map turned on with the key t. Playwright's Chromium, headless, 1,366 × 900 pixels, 2 search workers, the GPU off,
2 threads while a training job held the other 10.

| Run | From the map on to "Review done" | The pass's searches | Each, the worker's own time (median) |
|---|---|---|---|
| 1 | 19.4 s | 113 of 32 visits | 369 ms |
| 2 (with screenshots taken during it) | 21.8 s | 113 of 32 visits | 407 ms |

- **113 of the game's 120 positions lacked a map:** 7 had one from the deeper searches of the position on screen,
  which ask for the ownership. The line "Maps: 7 of 120" showed within 25 ms of the key.
- **About 20 seconds for a game of 120 edges** with the engine idle: two searches at a time, of about 0.4 s each.
- The review's counts stay final during the pass: the summary's note that the review still runs, and the italic
  counts, belong to the review's own work alone.

### "Map: waiting for the engine" did not end (2026-10-21)

At a position of an older review, already finished, the note said "Map: waiting for the engine" and never ended.
Moving to the next position and back showed the map; after a reload, the same position waited again.

**Reproduced** (`scripts/measure/map-wait-check.mjs`, headless Chromium, 2 search workers, the GPU off): the test
fixture's review file with the ownership removed from every result and the results made as deep as the position on
screen's search (1,024 visits), imported and done, the map turned on at edge 30, then the page reloaded. On the build
before the fix: after the reload, at the position that the page opened (edge 1), the note said "Map: waiting for the
engine" for all 30 seconds, with no map: FAIL. A first try with the results at 512 visits did not reproduce it: the
deeper search of the position on screen asks for the ownership, and its result brought a map of its own.

**The cause.** On a page that opens or reloads, the page's effects asked for the maps (askOwnership) and for the map
pass (passMaps) before the engine's network had loaded. Both returned at once and kept nothing. Their effects did not
run again, since the position and the line did not change. So nothing read the stored maps, and nothing searched
them. The note showed the position's state "unasked" as "waiting", so it never ended. A step to another position ran
the effect again, which found the stored map.

**The fix** (design 30, item 9):

- The analysis keeps what the page asked for last, its maps and the map pass, and asks again once the engine is ready
  or on again (`askAgain`, from `sweep` and the board's `ready`).
- A map that its task gave up without a try (the map pass stopped while it held the position, or a search that the
  page did not want when it started) is asked for again while the page wants it.
- "Waiting" means asked for and not yet searched. A map that nothing asks for has no note.
- The note reads the map as the board does: a map that shows is ready.

**The tests that failed before the fix** (packages/analysis/src/analysis.test.ts): "every state of a map ends: a map
asked for before the engine is ready waits, then comes", and "every state of a map ends: a map that the pass held and
dropped is asked for again". After the fix, the browser check passes for the three cases: the map turned on, after a
reload, and a review while it runs (the map on from its start), each note gone within a second, with the map shown.

### The area map's review (2026-10-21)

The review of the area map's branch (design 30), after its rebase on `dev`. Each fix below has a test that failed
before it.

- **Three states of the map that did not end** (design 30, items 6, 9 and 10):
  - A position of the game's tree with no result, which no search would reach: a branch's position that the player
    has not visited, or a position of the Analysis board. Its map waited for its own search, which never came, and
    the note "Maps of the line: k of n" kept its gleam. Now such a position gets a short search. "Waiting" means a
    search to come: the map's own, or the review's search of the position (`pending`).
  - A map pass stopped and started again. The stopped pass's running search ended later, and counted as one of the
    new pass's searches. So the new pass ended one search early: its part of the progress bar went while its last
    search ran, and with more positions in the queue, it left one out. Now each pass counts only its own searches
    (`mapPassRun`).
  - The pass held the page's map. A position that the pass still held in its queue was not asked for again by the
    page, so its map waited at the lowest priority, behind the pass: up to about 20 seconds in a game of 120 edges.
    Now the page asks for it itself, ahead of the pass.
- **A file holds every result as shape 5** (`atShape`, design 13). A file from a browser that holds results of shape
  6 kept them as 6, and the site before the area map drops those: it would search their positions again. A test
  reads a file of this site with that site's filter.
- **The notes:** in After vs before, the note counts the map before the move, which the board needs too, and the
  game's start says "No map: the game starts here".
- **What reading shape 6 costs:** headless Chromium, one readonly transaction of the keys of 121 positions at 12
  depths, on a store of 242 results of about 4 kB, 9 runs each: a median of 18 ms in one shape (1,452 reads) and 36
  ms in two (2,904 reads). The review reads these keys while the engine starts (`warmCache`), which takes 0.6 to 1.2
  seconds ("The review's layout shift, and a shorter footer"), so the first frame does not wait for the second
  shape. `READ_SHAPES` stays.
- **Simpler code, the same behaviour:** the board's map is a prop, not a layer as well. `READ_FROM`, which was equal
  to `SHAPE`, is gone. An added map has one key. Forecast vs board computes the board's state once. The map's step
  and its ownership are separate values, so that a batch of results that changes neither does not draw the map
  again. The protocol's types lose `includeMovesOwnership`, which no search asks for. The measuring scripts take
  their tools from `speed.mjs`.

### Evaluate quality searches the position before the opponent's last turn (2026-10-21)

- **What** (abscls-rcur, [design 10](../design/10-labels.md) item 6, [design 07](../design/07-lines-and-variations.md)
  item 11, [design 21](../design/21-analysis.md) item 3): "Evaluate quality" also searches the position before the
  opponent's last turn, to the label budget, for a move that lacks only that position's result to be Great. The third
  condition needs that position (see "Great: En Croissant's whole rule"). A move without a result there stayed Best,
  and nothing on the page said why. A game move in a review has the result, because the label pass searches every
  position of the game. A branch move may lack it. On the Analysis board, no pass searches the main line.
- **When:** the search before the move has the label budget, the move is the engine's first choice, and the gap of
  0.10 is in that search. No search runs where the position already has a result of the label budget, or where the gap
  is absent. A deeper result before the move can change the first choice or the gap, and the analysis asks again
  then. `GameAnalysis.greatNeeds` (it replaces `greatTargets`) gives the confirmations and these searches.
- **"Evaluating…" holds** until these searches and the Great's confirmation end (`GameAnalysis.awaitsGreat`). The
  labels show from 256 visits (`LABEL_VISITS`), and the searches run to the review's depth. So a move that looks like
  an only move in its 256-visit result waits for the full result. Without that, a first browser check showed Best for
  2.4 seconds, then "Evaluating…", then Great. On the board, the move has no label and its tooltip says "Not analyzed
  yet".
- **The review's steps do not count these searches.** The step "Great moves" counts the game's own confirmations
  only (`greatChecks`). Before this change it counted a branch move's confirmations too, so a branch move that the
  player evaluated could bring the bar back after "Review done".
- **Checked in a browser** (headless Chromium, the CPU engine, a build on a server of its own, the fixture game
  `tests/fixtures/hedgefund-review.json`, 512 visits, "Review by Edge"). The move is edge 13, N12-Q11, a Great in this
  engine's own run:
  - **A review's branch:** the game's edges 0 to 4, then edges 6 and 5 in the other order (H12-K9 H6-K9), then the
    rest of the line up to N12-Q11. Every position of the line is a branch position. Before the request, the tooltip
    said "Not searched yet". Then the move showed "Evaluating…" for 15.5 seconds and then Great. 4 searches ran: the
    position before the move (13 edges), the position after it (14), the position before the opponent's last turn
    (11), and the confirmation. The review's bar did not come back.
  - **The Analysis board,** with no stored result: "Not analyzed yet" for 25.7 seconds, then Great. 7 searches ran
    besides the start's: the two edges of the turn (each judges the position between them, so one position was searched
    twice), the position before the opponent's last turn (11), and the two confirmations.
  - Move 10 (L9-N12), a Great in the fixture's file, was not the only good move in this run: it stayed Best, and no
    extra search ran.
  - Not run: the build before this change.
- **The priority of these searches:** the extra search and the Great's confirmation of a move that the player asked
  to evaluate have the priority of the other searches that "Evaluate quality" asks for (7,
  [design 07](../design/07-lines-and-variations.md)). Before, that confirmation had the label pass's priority (2): it
  waited behind the review's key moments and its label pass, and the move showed Best meanwhile. Now the move shows
  "Evaluating…" until the confirmation ends, so that wait would show on the move. The game's own confirmations keep
  the label pass's priority.
- **A turn of the board** asks for these searches only where the player evaluated each of its edges: the board shows a
  turn's label only then (`onlyJudged`). Before, a turn whose first edge was evaluated asked for its confirmation,
  though the player had played another second edge since.
- **Another review depth** drops the Greats' searches that wait in the pool's queue. The page asks for the Greats
  again in the same flush of its effects, before the drops have settled. A confirmation keeps its depth where the
  position after the move was searched deeper than both budgets (`equalDepth`), so its key was still taken, and no
  search ran until another result came. The move then showed "Evaluating…", and the review's step waited. The key of
  each such search now names the label budget and the priority too (`GameAnalysis.searchOnce`). A test drops the
  search as the pool does and asks again at once.
- **The limits:** one game, one network. A position that the player looked at, deeper than the label budget, counts
  as a result.

### The map's bookkeeping in edge cases (2026-10-21)

A review of the merged area map (design 30) found six cases where the site asked for a map, kept it or removed it
wrongly. Each one had a test that failed before its fix: the analysis's tests
(`packages/analysis/src/analysis.test.ts`) and the removal's (`src/lib/game/earlierResults.test.ts`).

- **The removal of an earlier engine's results removed the maps that a snapshot reads.** It compared an added map, of
  32 visits, with the position's results, and kept only the deepest. So a game reviewed at 512 visits by an earlier
  engine lost its maps. Now a map stays while a snapshot reads its position, whatever the depth of the results there
  (design 20, item 8). Test: "a snapshot keeps the maps added to the positions that it reads, beside deeper results".
- **A snapshot waited for its maps without end.** A snapshot's engine is never ready, so the map was asked for, and the
  note said "Map: waiting for the engine". Now the snapshot reads the maps added to its positions from the store, with
  the search and the network file of its results (`freeze`). A map that the store lacks cannot come: the note says
  "No map: a snapshot searches nothing". Test: "every state of a map ends: a snapshot reads its stored maps with no
  network, and a map that it lacks cannot come". Before the fix, the stored map did not show.
- **Another network lost the maps in flight.** The record of the maps that the page's tasks search outlived the
  network. When the new network was ready before the old network's task ended, the new one skipped the map, and the
  old task then ended with nothing kept. Now another network starts a new record. Test: "every state of a map ends: a
  map asked for on the old network is asked for again on the new one".
- **A position's own search could bring no map.** The page's map waits for the position's own search, which asks for
  the ownership. On the Analysis board, that search can find a result stored before the maps, which has none. Then
  nothing asked for the map. Now the map is asked for again once that result applies. Test: "every state of a map
  ends: a board position whose own search finds a stored result with no map gets a short search".
- **The engine off and on again abandoned the map pass.** The engine on found the pass still marked as running and
  started none, and the stopped search then ended the old pass. Now the engine off ends the pass and lets go of its
  maps, and the engine on starts it again. Only the task that holds a map's state changes or ends it. Test: "every
  state of a map ends: the engine off and on again while the map pass runs a search starts the pass again".
- **The game's last position had no note.** Where the game ends, no search runs, so the map was "unasked". Now a
  position of the tree knows that it has no map from its own end (`hasNoMap`), and the note says "No map: the game
  ends here". Test: "every state of a map ends: the game's last position, where it ends, has no map".

**The browser check** (`scripts/measure/map-wait-check.mjs`, headless Chromium, 2 workers, GPU off) has a fourth
case, with two checks: the fixture's review as an earlier engine's, imported, so that it opens as a snapshot, with no
ownership in its results and maps added to every position but the one after 30 edges. After the fix, after edge 31
the stored map shows with no note, and after edge 30 the note says "No map: a snapshot searches nothing" from the
first second. The other three cases still pass.

### The review of the map's bookkeeping (2026-10-21)

The review of the six fixes above, after their rebase on `dev`.

- **The note in a snapshot** says "No map saved: snapshots do no searches", not "No map: a snapshot searches nothing".
  It gives both reasons, in the words of the snapshot's bar ("no searches"). At 360 pixels, the narrowest width of
  the layout sweep, the margin has room for a note of 243 pixels beside the switch, and this note takes 231 (headless
  Chromium, the fonts loaded). At 390 pixels the room is 267.
- **A map asked for just before the engine went off was searched while the engine was off.** Its task read the store,
  then reached the pool after the engine off had halted it, and its search ran to its 32 visits with "Map:
  searching". Now no map's search starts while the engine is off: the task gives the map up, the note says "Map:
  waiting for the engine", and the engine on asks for the map again. Test: "every state of a map ends: a map asked
  for just before the engine goes off is searched once it is on again".
- **The pass test** now also checks that the new pass holds the map's state after the stopped slice ends. Each of the
  seven tests fails with its fix taken out.
- **Simpler code, the same behaviour:**
  - One record holds each map in work: its state and the task that holds it. It replaces three records of the same
    tasks: the state, the holder and the page's own tasks. Another network drops it, and the engine off takes the map
    pass's maps from it.
  - A search that runs always asks for the ownership, so only a stored result can lack a map. The analysis asks
    again for the map after a stored result alone, not after each search's batch.
  - A position of the tree knows its end from `searchable`. The removal keeps the maps apart from the results'
    depths.
  - The browser check takes the keys' form from `cache.ts`, and its import and its browsers from `speed.mjs`.
- **Left as they are:**
  - The removal keeps the maps of the positions that a review file holds, as it keeps their results. The map of a
    line's later edge goes, and a snapshot's line then shows fewer maps ("Maps of the line: 1 of 4"). To keep them,
    the removal needs a rule for the positions past the game that a snapshot can read, and a line has no length
    limit.
  - In a snapshot, a line's edge that ends the game counts as a map not saved, not as a map that cannot come. No
    search tells the snapshot that the game ends there. The legend then names the map before it, with no "(edge 3: no
    map)".
  - A review opened again says "Map: waiting for the engine" for a map that the store has, until the engine's network
    loads: the analysis reads the store's maps only once the engine is ready. The wait ends.
  - The snapshot's analysis takes its search and network file twice, in `fromStore` and in `freeze`.

**The browser check** (`scripts/measure/map-wait-check.mjs`, headless Chromium, 2 workers, GPU off) passes its four
cases on the final build. In the snapshot, after edge 31 the stored map shows with no note, and after edge 30 the note
says "No map saved: snapshots do no searches" from the first second. No page errors. The layout sweep in Chromium
passes (25 tests, 5 skipped).

### The charts mark every label, and every label has the review's depth (2026-10-21)

- **What** (abscls-wy0p): the key moments go as a concept, and their deeper search goes with them.
  - **The charts' dots:** the Advantage chart and the Difficulty chart mark every turn or edge whose label the move
    list shows (Great, Inaccuracy, Mistake and Blunder), in the unit of "Judge by" and for the side shown
    (`chartMarks` in `packages/analysis/src/model.ts`, [design 06](../design/06-review-layout.md), item 3). Before
    this change they marked the key moments: at most 8 turns or edges, Inaccuracy or worse, and no Great. A click on a
    dot still goes to its move.
  - **The review** is the sweep, the label pass at the review's depth, and the Greats' confirmations. The progress
    bar's step "the key moments, deeper" goes, and "Review done" and the game's mark (design 20) come after the label
    pass and the Greats' confirmations. The position on screen is still searched deeper where the player looks.
  - **The stored results stay valid.** The store's keys and versions do not change, and its budgets keep twice each
    review depth, to 32,768 (`BUDGETS` in `packages/analysis/src/cache.ts`). A position that an older review searched
    at twice its depth keeps that result, and the page takes it as any deeper result (`cacheGetAtLeast`). The report's
    count of positions searched deeper than the review now counts those positions too: its threshold is 1.5 times the
    review's depth for every position. So its note no longer says that the Depth of the position on screen searched
    them: "N positions were searched deeper than the review: the labels there, and this report, use the deeper
    searches."
  - The page "How reviews work" loses its section "Key moments" and the passes' item for their deeper search.
    `largest` moved from `model.ts` into `apps/hedgeschool/scripts/measure/key-moments-opening.mjs`, the one user left.
    The script's output is the same before and after the move (the engine repository's `runs/archive_analysis/`).
- **Why the cap of 8 goes:** it has no source. It came with the first wireframe (35a3164, `largest(edges, n = 8)`),
  for the walk's list of "mistakes to learn from". The walk ("Retry mistakes") and the Highlights' Biggest mistakes
  are gone ("Biggest mistakes removed, and a turn's badge on both its edges", and abscls-7e9). The key moments then
  served the charts' dots and the deeper search alone. A game with more than 8 bad turns had dots for 8 of them, and
  the charts showed no Great, though design 10, item 8, says that the chart shows Great, Inaccuracy, Mistake and
  Blunder, as the move list does. A later "Learning from mistakes" (abscls-7e9) chooses its own moments to learn from.
- **Why the deeper search goes:** it gave the worst moves about what a review at twice the depth gives them. By edge,
  Lite's labels right at those moves go from 77.8% to 83.0% with the deeper search, and Standard everywhere gives 83.3%
  ("The key moments from the first turn on", part 3). The step cost 31.2% of the visits of the sweep, the label pass
  and the step together. A player who wants surer labels sets a deeper review, and one depth for every label is what
  the depth setting says.
- **Lichess's chart marks no labelled move with a dot** (lila, `ui/chart/src/acpl.ts`, read on 2026-10-21 on
  `master`). Its points have no radius unless the game has blurs: `pointRadius: d.player.blurs || d.opponent.blurs ?
  pointSizes : 0`, and `pointSizes.push(isBlur ? 5 : 0)`. A move's label shows in the tooltip, after the move
  (`annotation`), and a hover on a symbol of the advice summary lights up that player's moves of that
  label (`christmasTree`, `chart.setActiveElements(points)`). Design 06 does not cite it for the dots.
- **The dots when many come close** (headless Chromium, the build of this change, the review's display at 1 device
  pixel and at 4). The narrowest chart that the layout gives is 313 pixels wide, at a window of 360 pixels (one
  column). At 1,260 pixels (three columns) it is 539, and at 1,024 it is 573. A "pair" below is two dots whose centres
  are less than a dot's 7 pixels apart. A "covered" pair is less than 3.5 pixels apart.

  | Game | Unit | Dots | Advantage at 313: pairs, covered | Difficulty at 313: pairs, covered |
  | --- | --- | --- | --- | --- |
  | The test fixture (`tests/fixtures/hedgefund-review.json`) | turn | 5 | 1, 0 | 1, 0 |
  | The test fixture | edge | 6 | 4, 2 | 5, 2 |
  | The fixture's game with every turn's win chance moved by 0.12 against its mover | turn | 32 | 0, 0 | 17, 0 |
  | The same | edge | 28 | 1, 1 | 17, 2 |

  The second game is the fixture's moves with their stored win chances changed, so that every turn loses 0.12 unless
  it is the engine's first choice: no real game has that many bad turns in a row. By turn, the Advantage chart's dots
  stay apart. In the Difficulty chart's row, the dots of turns next to each other touch (two turns of two edges are
  5.2 pixels apart at 313 pixels), and each still reads. By edge, two labelled edges next to each other are 2.6 pixels
  apart: the second dot covers most of the first. In the fixture, a Blunder and two Greats on edges next to each other
  make one cluster of three. Only the tooltip or a wider window tells them apart there. This change adds no new kind
  of mark.
- **Tests:** "the charts mark every labelled turn or edge that the move list shows, for the side shown: ten, not eight"
  and "the charts mark a Great, at its turn's last edge by turn" (`enclosure.test.ts`) replace "a Blunder in the third
  turn is a key moment". The analysis's tests of the key moments' step go: "the key moments' step waits for a search
  whose position left them, until its result is stored", "a key moment counts as done only with a result that the
  store has, not with the results so far of the position on screen", and the three of a key moment's search that the
  engine off or an engine error ends. "A Great's confirmation that the player asked for comes before the review's key
  moments" now checks the same order against the label pass, and "a Great's search that another review depth drops is
  asked for again" holds the engine with the position on screen's search.

### The threat on real games (2026-10-21)

The threat (design 31, beads abscls-mnqe): Lichess's "Show threat", a search of the position after a pass by the side
to move. Self-play has no timeouts, so the network has seldom seen a position after a pass. The check asks whether the
engine still reads one well.

**The check** (`scripts/measure/threat-check.mjs`, in Node, HedgeFund 0.2 Lite at 512 visits, the Lite review's
depth): the meaf.us archive's human games as the engine repository analysed them, the first 2 of each rating band
from 1 to 5 that the rules ended with 120 edges, 10 games. At two positions of every 8 from edge 4 to edge 112, a
turn's middle and a turn's start: 270 positions, 130 at a turn's start and 140 in a turn's middle, each with the
position after its pass. The archive's games stay internal: the script prints counts, and these are counts.

| Positions | Count | Median cost | Median points | Cost under 0 | Cost 0.10 or more | Closes area | Cuts | Neither |
|---|---|---|---|---|---|---|---|---|
| All | 270 | 1.4% | 171.7 | 5 | 108 | 146 | 93 | 31 |
| Turn start | 130 | 1.6% | 235.5 | 4 | 55 | 66 | 46 | 18 |
| Turn middle | 140 | 1.2% | 131.9 | 1 | 53 | 80 | 47 | 13 |
| Edges 0 to 39 | 80 | 41.4% | 297.7 | 0 | 68 | 37 | 33 | 10 |
| Edges 40 to 79 | 100 | 1.3% | 168.2 | 1 | 32 | 54 | 35 | 11 |
| Edges 80 to 112 | 90 | 0.0% | 107.3 | 4 | 8 | 55 | 25 | 10 |

The cost is the mover's win chance now less after the pass, and the points are the lead's. "Closes area" and "Cuts":
what the threat's turn does on the board when the rules play it.

- **The threat is never a gain beyond the search's noise.** A pass cannot be better than the best edge. 5 of 270
  threats cost less than 0: one −1.9%, four that round to −0.0%, all but one after edge 80, where the game is decided.
- **Its size follows the game:** large while the game is open (a median of 41% of win chance before edge 40), small
  in the middle game, and 0 once the win chance has saturated. There the points still give it: a median of 107
  points after edge 80. A turn's start, where the pass forfeits two edges, costs more points than a turn's middle,
  where it forfeits one (235.5 against 131.9).
- **The threat does something on the board:** 239 of 270 threats close area or cut an edge. In the 31 others the
  value still changes, as a turn that builds toward a close does.
- **The network reads the positions after a pass no worse than the others.** Its own value (a search of 1 visit)
  differs from the 512-visit search by a median of 0.000 of win chance after the passes and 0.003 at the positions,
  and before edge 40 by 0.007 after the passes and 0.055 at the positions. A first run on 5 games, at turns' middles
  alone (140 positions), gave 0.013 after the passes and 0.006 at the positions: twice as large, and still small. The
  search corrects the network in both.
- **The opponent seldom played the threat's first edge next:** in 37 of the 270 positions (13.7%), and for 13 of the
  108 threats of 0.10 or more. The mover's own edges come between, and they change the position: a mover who answers
  a threat removes it. Where the mover lost 0.10 or more in the game, the opponent played the threat's first edge in
  3 of 37. This count does not test the threat.

**The reading of the threats.** The run's threats, read one by one (the script's `--show`, not kept), read right. A
large threat is a close of an open region, often of 15 to 50 points of area, or a cut that opens a wall. In a decided
game, a close of 49.5 points of area cost 0.1% of win chance, and the opponent played it next. The large costs before
edge 40 come from weak players' games, where the engine's win chance swings steeply.

**Built:** the switch and the key x on the review and on the Analysis board, the header's values after the pass and
the threat's size, the threat's line on the board in the opponent's colour, the area map along it, the threat in a
snapshot from the store alone. Checked in headless Chromium on the test fixture's review and on the Analysis board,
at a turn's start and in its middle, light and dark, at 1,366 and 390 pixels: no page error, no horizontal scroll. The
layout sweep in Chromium passes (25 tests, 5 skipped).

### The threat's warning triangles (2026-10-21)

The first build of the threat (design 31) drew it as an engine line: dashed edges and numbers in circles, in the
opponent's colour. It read as any line. Lichess draws its threat as the one red arrow of its board, but red is a
player's colour here, and a third colour would hide whose edges they are. So the threat's numbers now stand in warning
triangles, in the opponent's colour, with the board's border round them. The edges, the cuts and the regions stay a
line's. A candidate pointed at or pinned replaces the threat with its circles, and the image of a line keeps circles.

**The size:** an equilateral triangle, pointing up, whose inscribed circle has a radius of 0.23 of the lattice's step,
and a stroke of 0.08 of its own colour that rounds its corners. As drawn, its inscribed circle has a radius of 0.27,
against a line's circle of 0.3, and its number has the circle's size. The number stands at the inscribed circle's
centre. Measured in headless Chromium on the test fixture's review and on the Analysis board: the triangle's side is
21.8 pixels at 1,366 pixels wide (a line's circle 16.4 across), 25.8 on the Analysis board, and 13.3 at 390 pixels
wide. Each number's box was within 1 pixel of its triangle's centre at every width, as a circle's number is. The
close-ups in light and dark read as warning signs, with the number inside.

### The threat's size at equal depths (2026-10-21)

**The question.** In the review of a close game in the owner's browser, many threats cost over 90% of win chance. The
threat results stored there (11 positions) and the positions' own results were read.

**The large threats are real.** A pass forfeits the turn (`move_count += moves_left` in the engine), so the opponent
plays two turns in a row, and the passer's edges are not protected in that turn, since the pass places none. The scores
add each turn's areas, so a region lost early costs points at every later turn. After the pass, the mover's win chance
was 0 to 9% at every turn's start there. The cost can never be more than the mover's win chance, and it was over 90%
only where the engine gave the mover over 90%. The game swung between the players from turn to turn, so a free turn
decided it, whoever led. The engine reads a position after a pass as a normal position: `forfeit_turn` keeps the edge
count, so the turns and their parity are as in a normal game.

**A fault: the size mixed depths.** The position's value was its deepest stored result (16,384 or 32,768 visits, the
review's key moments and the player's Depth), and the threat's was a search at the Depth (256 visits there). At one
position the position read 38.9% at 32,768 visits and 78.7% at 256: the size was 37.6%, and 77.4% at equal depth. A
move's loss compares searches of one budget (design 10).

**The rule** (design 31, item 4): the threat's size compares the threat with the position's result from a search with
the same settings, the Depth's visits and its time limit. The position's own result serves where it is that search.
Where the store has only a deeper one, the store's result at the Depth's visits serves, or else the position is
searched with those settings as a part of the threat's work, and that result is stored. The values after the pass and
the board do not change. A snapshot compares the stored threat with the position's stored result of the same visits.

**The tests** (`packages/analysis/src/analysis.test.ts`): "a position with a deeper stored result than the threat's
gets its size from a search with the threat's settings" fails on ec0acf8 (no such search: the
size there read the deeper result) and passes now. It checks the search's visits and time limit, the size in win
chance and points, the deeper result kept, and that a second visit reads the stored result with no search. "A
snapshot's threat size compares the stored threat with the position's stored result as deep, with no search" checks
the snapshot.

**In the browser** (headless Chromium, the test fixture's review at 512 visits): with the Depth at 256, the threat at a
turn's start and in its middle sent a search of the position at 256 visits beside the threat's at 256, and the header
showed "Threat to Blue: −6.2% · −307.3 pts" and "−5.0% · −144.7 pts". With the Depth at 1,024, deeper than the review,
the position's own search at 1,024 served, and no other search was sent. The check on real games
("The threat on real games") searched both positions at 512 visits, so its counts stand.

### The threat's review: one rule for the size, a snapshot's line (2026-10-21)

The review of the threat (design 31), rebased on the removal of the key moments, found these faults:

- **The size still mixed depths in two cases.** The tree keeps a position's deepest result. With the Depth lowered,
  or with a deeper threat in the store, the size compared the deeper threat with the position at the new Depth. And
  a focus that the time limit stopped short of the review's result left that result as the position's own. In a
  review of 768 visits, a focus that stops at 150 gives a size that never corrects itself. Now the searches with the
  threat's settings (the focus, the threat's own, and the size's searches) keep their results apart for the size,
  and the size reads those or a result whose visits are the Depth's. A threat deeper than the Depth gets a search at
  the Depth too.
- **A part of a search gave a size with the engine off.** Now a part counts only while its search runs.
- **A snapshot had no position after the pass.** The rules gave it only to a search, so a snapshot drew no threat line,
  and where a pass ends the game it said "No threat saved". Now the rules give it first, to both.
- **The removal of an earlier engine's results took the base of a snapshot's threat size,** the position's result at
  the threat's visits, beside a deeper one. It stays now (design 20, item 8).
- **A size's search ran where the pass ends the game,** before the rules had answered. Now it starts after them. The
  size's searches come below the threat's own (priority 7, the evaluations 6), so that the threat's line shows first,
  and the same position asked again keeps the searches that run.

**The tests** (`packages/analysis/src/analysis.test.ts`): "with the Depth lowered, …", "a size's search runs on …",
"the size compares the focus's own search, which the time limit stopped …", "where the pass ends the game, a position
deeper …" and "a snapshot gets the position after the pass …" each fail on the code before the review (3437cdb) and
pass now. `earlierResults.test.ts` has "a snapshot's threat keeps the result of the position before the pass …".

**In the browser** (headless Chromium, software engine, the test fixture's review at 512 visits, two workers): with
the Depth at 256 and at 1,024, at a turn's start and in its middle, light and dark, at 1,366 and 390 pixels, the size
showed within 2 seconds, the line in triangles, and a candidate pointed at drew circles. The Analysis board showed the
threat at its start. A snapshot of the fixture as an earlier engine's review, with a threat stored after edge 21, drew
its line in triangles and gave its size, and after edge 20 said "No threat saved: snapshots do no searches". No page
error and no horizontal scroll. The layout sweep in Chromium passes (25 tests, 5 skipped).

### The Privacy page says what goes where, in less detail (2026-10-22)

- **Decided:** the Privacy page says what each party receives, why, and the visitor's choices, in short sections. It
  names the kinds of analytics events, not each event. A visitor needs to know what goes where and what they can
  choose, not how each part works. This replaces design 17, item 5, which listed every event, and its consequence
  that each new event goes into the page. Now only a new kind of event, or a value that the page does not name, goes
  into it.
- **What stays:** each promise, and each disclosure that a choice needs. No accounts, and games and reviews stay on
  the visitor's computer. What the browser keeps, as one summary, and how to delete it. The games against HedgeFund:
  what the site keeps and never keeps, why, the open dataset under CC0, no time limit, the random ID with consent,
  and its delete. A game after the `#` never goes to a server, and the tools say which tool sent it. "Save to" a
  partner sends the review file only when the visitor chooses it. What Cloudflare and Google Analytics receive, with
  consent mode and the cookies. The request to allow Google Analytics in a blocker, and what the site checks for it.
  The switches and the delete, as they were. Ko-fi, and the Discord.
- **What went:** the eleven items that the browser keeps, one by one. Each field of a stored game, beyond the moves,
  the takebacks, the bot's settings, the result and the times. When a game counts as ended. That a game that the
  site could not send waits in the browser, with the ID only if the visitor still accepts. How a partner's link
  replaces the Analysis board's lines, and how a partner sends a kept review back. How the bookmarklet reads the
  page, opens meaf.us's watcher's view, and loads its code from the site, and how Tampermonkey updates the
  userscript. Each analytics event with its ranges. That the request to allow Google Analytics shows on each page
  until the visitor closes it. Ko-fi's payment providers, and that Ko-fi's policy says what Ko-fi shares with the
  site. That a review's own address names its game after the `#`, which neither analytics service records.
- **The size:** 1,828 words before, 777 after (the text in the page's main part, both editions' introductions
  together).
- **Designs:** design 17 changes item 5 and its consequence. Design 11 changes its lines on the pings and on the
  bookmarklet's request, which the page no longer describes. Design 18 takes the section's new name, "Games in an
  address". Designs 22, 25 and 27 hold. The page still says what goes to Ko-fi and when, what the site stores and
  why, and that the site asks about a blocker.

### An animated image of a line (2026-10-22)

- **Asked for** (abscls-iaph): the board draws a line one edge at a time by default ("Animated" in "Lines on the
  board"). An image that plays the line in the same way shows its order, as the board does.
- **Decided** (design 07, item 17): the move menu's image items go into a submenu, "Generate image", with "Copy
  static", "Save static" and "Save animated". These replace "Copy image" and "Save image", in a review and on the
  Analysis board. The note after a refused copy keeps its "Save image" button.
  - **The frames:** the position where the line starts, with no edge (1 second), then one frame for each edge (half a
    second, as the board's `LINE_STEP_MS`). The frame of the last edge is the whole line and shows for 2 seconds. Then
    the image plays again, with no end. A line of n edges has n + 1 frames. Each frame is the static image of the
    line's first edges, with the whole line's caption, so the last frame is the static image.
  - **Only for a line:** "Save animated" shows when the move under the menu gives a line of one edge or more.
  - **The file:** the static image's name with `-animated` before `.png`.
- **No "Copy animated":** a test in headless Chromium 153.0.8010.12 wrote an APNG of 3 frames (418 bytes, with the
  chunks IHDR, acTL, fcTL, IDAT, fdAT and IEND, and 3 frames in `ImageDecoder`) to the clipboard as `image/png`.
  `navigator.clipboard.read` gave back an `image/png` of 278 bytes with only IHDR, IDAT and IEND, and `ImageDecoder`
  read 1 frame. Chromium encodes the image again, and the frames do not stay. A copy would give the start of the line
  with no edge.
- **How:** `apng.ts` joins the browser's PNGs into one APNG, as the PNG specification (third edition) gives the
  format: acTL after the header, an fcTL before each frame, the first frame's data in IDAT and the others' in fdAT.
  No library: the encoder is about 120 lines and needs no compression of its own. After the first frame, a
  frame holds only the box of the pixels that changed (`changedBox`), drawn over the frame before it.
- **Measured** on the production build in headless Chromium 153, with the review in
  `tests/fixtures/hedgefund-review.json`, in a window of 1,400 × 900 pixels (images 1,326 × 1,564 pixels):

  | The line | Static | Animated | Frames | Delays (ms) |
  |---|---|---|---|---|
  | A branch's line of 3 edges, after edge 11 | 216,126 bytes | 233,488 bytes (+8%) | 4 | 1,000, 500, 500, 2,000 |
  | A main line move ahead of the position on screen: edges 21 to 24, from the position after edge 20 | 235,072 bytes | 249,204 bytes (+6%) | 5 | 1,000, 500, 500, 500, 2,000 |

  `ImageDecoder` decoded every frame of both files, with a repetition count of Infinity. The last frame had the
  same pixels as the static image. The menu of a main line move behind the position on screen had no "Save
  animated". "Copy static" still copied the image (an `image/png` of 155,874 bytes read back).
- **Checked:** `apng.test.ts` (the frames, their delays and offsets, the play count, the CRCs, and each frame's data
  decoded with zlib), `lineImage.test.ts` (the frames' plan and the file's name), `npm run check:all` (all its steps
  passed, 221 tests in the site), and the layout sweep in Chromium (25 passed, 5 skipped).
- **Not checked:** Edge, Safari and Firefox, and a real touch screen. The menu words "Generate", "static" and
  "animated" are not in the approved words of Simplified Technical English. The menu keeps them, as the request
  gave them.

### The animated image of a line is a GIF (2026-10-22)

- **Seen** (abscls-iaph): the animated PNG (APNG) that "Save animated" gave was a correct APNG (17 frames, with the
  delays and the play count of the entry "An animated image of a line"). But Windows Photos and Discord showed it as
  a still image, its first frame: the start of the line with no edge.
- **Decided** (design 07, item 17): "Save animated" gives an animated GIF, `…-animated.gif`, in place of the APNG.
  The APNG encoder (`apng.ts`) is removed. The submenu keeps "Copy static", "Save static" and "Save animated".
  - **The frames:** the whole line first, for 2 seconds, so that an app that shows only the first frame (Discord with
    autoplay off, a preview) shows the line. Then the start with no edge (1 second), each edge (half a second), and
    again from the whole line, with no end (the NETSCAPE2.0 extension, loop count 0). A line of n edges has n + 2
    frames. The frame of the last edge and the first frame are the same picture.
  - **The encoder:** `gif.ts`, GIF89a with LZW, in the site's code with tests. No library: gifenc and omggif, the
    small ones, have had no release for years, and the palette needs the board's own rule.
  - **The colours:** a GIF holds 256 colours a frame. The palette holds first the light theme's flat colours (the
    board, its dots, the players, the badges' numbers, the caption's background and texts), then each colour that
    fills a 2 × 2 block of pixels (the regions, which blend a player's colour over the board), to 192, then a median
    cut of the anti-aliased colours. A pixel keeps its colour where the palette holds it, and takes the nearest colour
    where it does not. No dithering. After the first frame, a frame holds only the box of the pixels that changed.
- **Measured** on the production build in headless Chromium 153.0.8010.12 (started with `--disable-gpu`, the engine's
  GPU setting off, 2 workers), with the review in `tests/fixtures/hedgefund-review.json`, the same two lines as for
  the APNG (images 1,326 × 1,564 pixels):

  | The line | Static PNG | Animated GIF | Frames | Delays (ms) | Pixels that differ from the static PNG | Largest difference |
  |---|---|---|---|---|---|---|
  | A branch's line of 3 edges, after edge 11 | 216,126 bytes | 87,359 bytes (40%) | 5 | 2,000, 1,000, 500, 500, 500 | 1.19% | 30 of 255 |
  | A main line move ahead of the position on screen: edges 21 to 24, from the position after edge 20 | 235,072 bytes | 97,592 bytes (42%) | 6 | 2,000, 1,000, 500, 500, 500, 500 | 1.41% | 31 of 255 |

  `ImageDecoder` (type `image/gif`) decoded every frame, with a repetition count of Infinity. The first frame and
  the frame of the last edge each differ from the static PNG only in anti-aliased pixels: no pixel that differs lies
  in a 2 × 2 block of one colour in the static PNG. The APNG files were 6% and 8% larger than the static PNG. The
  GIF files are less than half its size.
- **No "Copy animated",** still: Chromium 153 refuses an `image/gif` on the clipboard ("Type image/gif not supported
  on write"), and keeps only the first frame of an APNG written as `image/png` (the entry "An animated image of a
  line").
- **Checked:** `gif.test.ts` (the frames, their delays, offsets and disposal, the loop count, each frame decoded
  with the test's own LZW decoder, LZW through full tables, and the palette's rule), `lineImage.test.ts` (the frames'
  order and the file's name), `npm run check:all` (all its steps passed, 223 tests in the site), and the layout sweep
  in Chromium with `--disable-gpu` and the engine's GPU setting off (25 passed, 5 skipped).
- **Seen** on a local build: the saved GIF plays in Discord and in Windows Photos.
- **Not checked:** Edge, Safari and Firefox.

### The opening book explorer, from user stories to wireframes (2026-10-24)

- **No more prototype rounds of the book's growth on the site.** The engine repository computes the book later, with
  its search that excludes the book's moves. The third prototype (abscls-tpaj.3) closed with this verdict.
- **The design started from the players.** The files are in [../ux/book-explorer/](../ux/book-explorer/): the
  context, 19 user stories, two journeys, the structure, five wireframes on the Analysis board's base, an evaluation
  and the decision log. A survey of the explorers that people use is
  [../research/03-opening-explorers.md](../research/03-opening-explorers.md).
- **The choices that the design rests on:** the first version serves "after a game" and "study". In a review, the
  review keeps its own labels and the book's table shows the book's values. The table lists one edge at a time, and
  the move list groups the edges into turns. Openings goes into the header now. Crowded numbers on the board are the
  board's problem, not the book's (abscls-4kso): the table and the board highlight each other. Each turn gets one
  sentence, built from the book's facts.
- **A finding from the third prototype's book:** all 31 positions that two move orders reach are a turn's two edges
  in the other order. None comes from another turn. So a turn's pair is one branch of the move list.
- **The evaluation** found no critical issue and no manipulative pattern. Its 4 major, 6 minor and 2 cosmetic findings
  went into the design: "Book" means the moves that the engine studied, so the table splits fine moves from other book
  moves. The game's row keeps the book's columns for the book's values. The switch names "Book" and "Candidates" and
  shows what the table holds. The traps show both values in both modes.
- The design is [design 32](../design/32-book-explorer.md).

### The book file's form and a test book (2026-10-24)

- **The form is the site's own,** and the site proposes it to the engine repository (request 22, item 5): values
  only, an index and its parts, each position keyed by its notation, and a position and its mirror image as one.
  Design 32, "The book file", gives each field with its unit and its side.
- **The test book** comes from the third prototype's book: 404 positions and 38 traps in 4 parts, 456 kB in all, the
  largest part 164 kB. Hand-made cases add 15 positions in 16 kB: a position that move orders from two turns reach, a
  position that the book stores as its mirror image, and a part that does not load.
- **The form holds what the symbols need:** the symbols computed from the values are the prototype's for 395 of the
  404 positions. The 9 others are on a cut-off, because the prototype's file rounds its values to 3 decimals.
- **The prototype's bounds can pass 0 to 1** (a lower bound of −0.003): KataGo's bounds are the value less and plus
  its error times the error factor. The form cuts them to 0 to 1.
- **The mirror matches the engine:** for each of the 404 positions, the engine's position after the book's moves is
  the position, and after the moves' images it is the position's image. Through the loader, the 99 positions after
  D10-G11 (the image of D10-G9, a book move of the start) match the engine too.
- **The review** moved the test book out of `static/`, into `tests/fixtures/test-book/`. The dev and preview servers
  serve it, and no build holds it. The loader gives each position in the player's orientation, and `bookMove` plays a
  twin's book move in a position that is its own mirror image.
- **Not done:** the index lists every position, at 60 to 150 bytes each, so it suits a book of a few thousand
  positions. A larger book needs its index in parts (abscls-bhe9).

### On a phone, the step bar stays at the bottom of the screen (2026-10-24)

- **The rule:** in one column (below 800 pixels), the step bar is fixed to the bottom of the window, on the review,
  the Analysis board and Practice, and on Openings when it comes. The Lichess app keeps Previous and Next in a bottom
  bar ([../research/03-opening-explorers.md](../research/03-opening-explorers.md), section 3), and design 32 asked for
  it (item 10). The rule is in [design 06](../design/06-review-layout.md), item 4.
- **Measured before,** in headless Chromium as a phone (touch, so that the document scrolls), on the review of the
  test fixture, the Analysis board with the fixture's game and Practice with the fixture's first 20 edges, at
  360 × 640 and 390 × 844, at every 100 pixels of scrolling and at the end: at 23 places the board was in view and
  the step back was not. At 360 × 640 the review's bar showed only at the page's end, 834 pixels down, and the board
  was out of view from 500 pixels down.
- **After:** at every place on the three pages, at both sizes, the step back is in view and on top. At the end of
  each page, no button, link, tab or move in view is under the bar. The bar is 68 pixels high on the review, 46 on
  Practice (no status line) and 108 on the Analysis board, whose tools (New, Play, Export and ☰) wrap under the steps
  at 360 and at 390 pixels.
- **New and Export became icon buttons,** at every width and in the review's bar too, so that the Analysis board's
  tools fit beside the steps: New a plus, Export an arrow up out of a tray (the share mark), each with its name and a
  tooltip. Play keeps its word, since its natural icon is the step forward beside it. Practice's tools and the home
  page's Export in a game's row did not change. Measured in headless Chromium as a phone: the Analysis board's bar
  has one row and is 68 pixels high at 360 × 640 and at 390 × 844, as the review's. At 360 pixels the steps take 150
  pixels, the gap 8 and the tools 167 (New 35, Play 51, Export 35, ☰ 35, and the gaps), of 328: 3 pixels to spare.
  The wrap rule stays for a wider font. On a desktop (1,400 × 900) the bar has one row, as before.
- **Play became an icon button too,** a robot's head ("Play the bot from here", its name and its tooltip), the
  common sign for "play the computer". The word Play between the two icons did not sit well, and a triangle, Play's
  usual icon, is the step forward beside it. The order is the steps, then the robot, New, Export and ☰. The robot is
  a rounded box with two eyes, an antenna and two ears, in Icon.svelte's grid and stroke, as high as the other icons.
  Measured in headless Chromium as a phone: the Analysis board's bar has one row and is 68 pixels high at 360 × 640
  and at 390 × 844. At 360 pixels the steps take 150 pixels, the gap 8 and the tools 150 (four buttons of 35 and the
  gaps), of 328: 20 pixels to spare, where Play as a word left 3. On a desktop (1,400 × 900) the bar has one row,
  62 pixels high. The robot opens Practice from the position on screen, as Play did.
- **What depends on the bar's place,** and what changed for it:
  - The page's end: the page's area (`#page`) keeps room at its end as high as the bar (its bottom padding), so the
    bar covers no last row.
  - The page's scrolling: `scroll-padding-bottom` on the document and on the page's area keeps a focused element or a
    picked move clear of the bar. The bar gives its height (`--step-dock`) from a `ResizeObserver`. A read as the bar
    mounts would force a second layout of the whole page in the review's first frame.
  - What the bar opens: the display settings and Practice's question before Abort or Resign open under the board.
    They now scroll into view as they show (`intoView`, at the nearest edge). Checked: at the top of the page, the
    settings' top comes to the window's top, and Practice's question shows just above the bar.
  - The page's area is a size container (`@container/page`). Headless Chromium keeps a fixed element in it at the
    window's bottom, with a mouse (the area scrolls) and as a phone (the document scrolls). The bar's width is
    `100cqw`, the area's width without its scroll bar: 345 of 360 pixels with a mouse.
  - Design 06's other allowances (`--site-header`, `--strip`, `--chart`, `100vh`) size the board and the side
    columns from 800 pixels up, or the board from the width in one column. They do not count the step bar, and
    they did not change.
  - The review's skeleton draws its bar with the same class, so it shows where the review's bar will be.
  - The menus open over the bar (the Export menu, above its button). The bar is under the dialogs and the notices.
  - From 800 pixels up the bar is in its column as before (checked at 800, 1,000 and 1,400 pixels: in the flow, the
    room at the page's end hidden, no scroll padding).
- **Not checked:** a real phone, Safari's toolbars, Safari's place for a fixed element inside a size container (an
  engine that gives `container-type` layout containment puts the bar at the end of the page's area), and the safe
  area. The page does not ask for the whole screen
  (`viewport-fit=cover`), so `env(safe-area-inset-bottom)` is 0 now.
- **The review of the change:**
  - The room for the bar moved from an element after the bar, inside the bar's column, to the bottom padding of the
    page's area (`#page`). It is now at the page's end whatever comes after the column, and the column's panel has no
    empty strip at its foot.
  - The Export menu's toast showed over the bar on a phone, on the steps and on the button that it answers, for 4 to
    10 seconds. It now shows above the bar (`--step-dock`).
  - The one-column breakpoint of these rules is one Tailwind variant (`one-column` in `src/app.css`). Practice's
    layout took one column below 799 pixels (Tailwind's `max-[799px]` is a width under 799), so in a window of
    exactly 799 pixels the fixed bar covered the foot of its board's column. It now takes one column below 800
    (`max-[800px]`), as the review and the bar do.
  - The Export menu lost its `small` option: its word form is only in a game's row now, so it is always small.
  - The layout sweep has a test of the issue's goal: on a touch screen of 360 × 640, on the review, the Analysis
    board and Practice, at every 100 pixels down, the step back is in view and on top wherever the board is, and at
    the page's end the bar covers no move.
  - Checked again on the reviewed code, in headless Chromium as a phone (touch) at 360 × 640 and 390 × 844, and at
    1,400 × 900: the bar at the window's foot in one row on the three pages (68 pixels on the review and the Analysis
    board, 46 on Practice), in its column on the desktop. The step back is in view with the board at every 100
    pixels. The steps, the arrow keys, the robot (to Practice), New and Export (4 entries each), ☰ (the settings come
    into view) and the keyboard (Tab to New, Enter opens its menu, Escape gives the focus back) work. The Export
    menu's toast ends 20 pixels above the bar. The layout sweep in Chromium passes: 25 tests, 6 skipped (the tests
    that need a Google tag, which a local build leaves out).

### Drawing Board, Blueprints' site (2026-10-25)

- **What:** the site for Blueprints, the Fall 2026 jam's game, and its notation (design 33). The engine's browser
  build is asked in request 23.
- **The names:** Drawing Board for the site, Stamp Duty for the engine and its practice bot. The other names
  weighed for the bot: Fine Print, BlueChip, Starchitect, Compound Interest, Wall Street, Encroachment (from a Codex
  agent's round), Due Diligence and others. Starchitect fits another game better, and BlueChip says little.
- **The plan:** Hedge School's pages and design, with only the game's parts changed. The rehearsal game on
  Connect-4 is dropped: Blueprints' board is the second board for the view's split (design 29, item 9).
- **The notation, from strategyjam.org's entry script** (rules version 3, saved by the engine repository's game watch
  in `runs/strategyjam/blueprints/20261024-215959/`): a placement `K@q,r`, an edit `I:q,r>J:q,r` with both
  coordinates in the blueprints' frames before the edit, and `pass`. An edit uses a move: only the Sandbox's free
  edit does not. The grid is axial, with pointy-top hexes and r down the screen. The site's move list numbers moves
  and shows `+N` only when a placement scores.
- **Checked on the archive** (the engine repository's `runs/strategyjam-archive/blueprints.jsonl`, 1,826 games), with
  a model of the hand's rules and of placements written for the check:
  - All 32,959 edits played are in the model's legal edits, and no placement stamps on a cell that has a piece.
  - 7,061 edits move the source's first cell, 7,944 put a cell before the target's first cell, 11,539 stay in one
    blueprint, and 53 go to an empty blueprint.
  - In 990 of the first 4,000 positions where a game played an edit, two legal edits give the same hand (706.6 legal
    edits and 702.0 different hands a position on average). One game played an edit that left its hand as it was.
  - Of 105,820 placements, 73,599 remove an enemy cell, 41,947 remove a star and 41,864 score (57.4 points on
    average). The 83 others removed a star with no star of the mover's on the board. Of the 146,128 moves, 7,349 are
    passes.
- **The marks:** `x` for a placement that removes enemy cells, `x+N` for one that scores N, and never `+0`.

### Blueprints' notation and record in Drawing Board (2026-10-25)

- **What:** Drawing Board reads and writes Blueprints' moves, their capture marks and its records, and makes a record
  of a strategyjam.org game (design 33, items 5 to 10).
- **The record's frame is a package,** `@abstractclass/record`: the tags, the turns, comments, branches, quality
  marks, commands and the result. A game gives its moves' syntax and its marks as a parameter. Hedge School's
  `record.ts` stays at its path with its exports, so that its importers and its tests do not change, as design 29's
  `engineSettings.ts` and `store.ts` did. So no pure rename comes first: a rename would leave nothing at the old path.
  The turns of one move, then two (`turnFromCount`), moved to the analysis package, beside the game interface's
  `turn`, as Blueprints numbers them as Enclosure does.
- **The reader's checks:** a blueprint's number from 1 to 3, an edit's source cell not before its blueprint's first
  cell, a capture mark on a placement only, and no `x+0`. Each refusal names the problem and its place in the text.
  The check refuses a mark that the moves' effects do not confirm, and gives the mark that they confirm. The frame
  refuses a `Position` tag, at the tag, for a game that gives it no start (Blueprints).
- **The import refuses another start.** The record has no position's notation yet. So the reader would read a game
  from another first position as a game from the standard start.
- **Checked on the archive** (the engine repository's `runs/strategyjam-archive/blueprints.jsonl`, read from outside
  the repository): the reader reads all 146,128 moves, and the writer writes them back as the same strings (105,820
  placements, 32,959 edits, 7,349 passes). Of the 1,826 games, the 1,791 with moves become records that read back
  to the same moves, each from the standard start. 35 have no moves. The archive has no final scores, so its 726
  games that the rules ended get the result `*`: the game page gives the scores from its rules module.

### Drawing Board's shell (2026-10-25)

- **What:** Drawing Board's header, footer and pages (Home, About, Notation, Privacy, Notices) and its deploy job
  (design 33, abscls-8tl1.2).
- **The shared frame, `@abstractclass/site`** (`packages/site`): the parts that Drawing Board uses as they are moved
  out of Hedge School, first as pure renames: the theme and its menu, the page's metadata and the prose style. Then
  the edits: the header's bar and the page area with its scroll places moved out of Hedge School's layout
  (`SiteFrame.svelte`). Each site's layout gives the frame what the header holds, the live address and the keys
  (`origin`, `themeKey`, `placesKey`): the theme keeps its choice under the site's key (`startTheme(key)`), and the
  metadata takes the live address from the frame (`setSiteOrigin`). The general part of `app.css` moved to
  `site.css`, and the libraries' notice to `LibraryNotices.svelte`.
- **Stayed in Hedge School:** its header's links, its site menu (it holds Support Us), its logo, its lavender accent,
  its board's, review's and labels' tokens, and the utilities that Drawing Board does not use yet (the main button,
  the dialogs, the keys' table, the step bar, the bar's gleam). The review's tokens move with the view's split
  (abscls-8tl1.6). Its footer stays for now: the two footers have the same markup, and a later change moves them into
  the package (design 33, item 4).
- **Checked that Hedge School did not change:** its build's CSS has the same 1,559 rules after the move, in the same
  order, except that the colour tokens of each theme are two blocks in place of one. Its prerendered pages have the
  same DOM, except for Svelte's hydration marks.
- **Drawing Board's look:** Hedge School's tokens with a neutral slate accent (`#4f5b69` light, `#b4bcc7` dark) and
  the name as a wordmark, until its logo and colour are decided. Its header holds Notation, About and the theme menu,
  and fits in 360 pixels with no menu. Its keys are `drawing-board:theme:1` and `drawing-board:scroll-places:1`.
- **The Notation page** describes design 33's items 5 to 7, 9 and 10, with examples made by hand. Item 8 (the move
  list's display) waits for the move list. The examples are one game from the standard start, with its branches. A
  model of the rules in the engine repository's `games/blueprints/README.md` replayed it: each move is legal, and
  each mark is the one that its position gives (`x` alone where no star goes, `x+8` for one star by Blue's 8). The
  model is not the engine. The page also gives the start as the rules' version 3 has it: blueprints 1 and 3 with
  plain rings, blueprint 2 with a ring of walls and stars, and each player's three blueprints on the board.

### The book in the review: its rows, its mark and the game's row (2026-10-25)

- **The Report and the move list** (design 32, "The review"): the opening row and the trap rows sit under the counts,
  and one mark, an open book, sits beside the turn number of the game's last book move. "In the book" is a fact of a
  position, by any move order, so a game that comes back to the book gets a mark there too. In the move's own cell,
  the mark widened the column: at 1,260 pixels, by edge, the move list hid 14 pixels sideways. Beside the turn number,
  a number of one digit and the mark need 30 of the column's 35 pixels. From turn 10 they need 38, and the mark goes
  3 pixels into the 4-pixel gap before the move, short of the move.
- **A trap's refutation** counts only when the side of the trap ends its turn as the refutation does. After G9-K10
  H6-K9, the first build said "Red played its refutation" for a position that the game did not reach. The row now
  names the trap only.
- **The book move that reached the end:** when the end row's book move worse than Good is the move that reached the
  end, the row says "The last book move, G10-J13, is an Inaccuracy." "Before that" put the move before the end that it
  reached. In the test book, 41 of the 75 book moves worse than Good, traps aside, reach an end.
- **One label for one move:** the opening row and the table's game's row give the label that the move list shows:
  the turn's label by turn (the default), the edge's label by edge, and no label for the player that "Review for"
  leaves out. The first build gave the edge's label always, so by turn the player saw two labels for one move.
- **The join with the table** (beads abscls-tpaj.7): the review reads the site's one book (`siteBook`), so each part
  loads once. The game's move at the position on screen goes into the table (`bookGame`). A click on a row or on the
  mark shows the book for that review only (`BookPlace.showForNow`): the choice that the browser keeps does not
  change.
- **The test games:** `scripts/test-fixture.mjs --opening` makes reviewed games through the test book, 24 edges each
  (about 210 kB): `book-left-review.json`, `book-never-review.json` and `book-trap-review.json`.
- **Not done:** the marks of a played refutation in the move list (journey 1, A3): item 4 keeps one mark. No event
  says that a review showed the opening row: the clicks are enough until the usability tests (abscls-tpaj.10).

### The review's view in packages/review (2026-10-25)

- **Decided:** the review's and the Analysis board's view moves into `@abstractclass/review` (`packages/review`), with
  the view's game interface (design 29, item 9, and design 33, item 3). Hedge School gives Enclosure's part
  (`src/lib/review/enclosureView.ts`), and Drawing Board gives Blueprints' with its review (abscls-8tl1.7). The site's
  general controls that the view uses (the icons, the toast, the settings' parts, the players' colours and their
  swatch) and the page's scroll moved into `@abstractclass/site`: the header, the site menu and the Privacy page use
  them too.
- **The seams, on two boards:** each part that is a game's is a member of the interface, shaped by Hedge School's
  board and by Blueprints' (`apps/drawingboard/src/lib/board/Board.svelte`). Four shapes changed from Enclosure's.
  The candidate pointed at or pinned has one name, `pointed`: Hedge School's board took `highlight`, and Drawing
  Board's took `pinned`, which it now calls `pointed`. The board draws what the last move did (`last`, not Enclosure's
  `cut`). A line's move carries the game's step (not Enclosure's cut and regions). The cards show the game's second
  number when it has one (Enclosure's area). The comparison of two moves stays the game's (`equal`) for the engine's
  moves. The tree keeps a move by its name, and `equal` takes no position: Blueprints' two edits that give one hand
  (design 33, item 9) are two moves until Drawing Board's review shapes this seam (abscls-8tl1.7).
- **Seams beyond design 29's list:** the view's later features needed their own: the area map (its points, and the
  board's state now), the image of a line, the opening book, the site's networks and the skeleton's empty board. A
  site can leave out each tool. The Export menu is the page's, in the step bar's `tools` beside the New menu: the view
  gives it the labels' unit, and carries nothing else of it.
- **The players' names are every game's** (the glossary: Blue moves first). The package holds them, and Hedge School's
  `enclosure.ts` gives them as before.
- **The renames from edge to move:** the shared code's names that nothing stores took the glossary's word:
  `MoveReview`, `judgeMove`, `judgeBranchMove`, `onlyMove`, `ONLY_MOVE_GAP` and `likelyMoves`. Hedge School's names for
  Enclosure keep "edge" (`EdgeReview`, `judgeBranchEdge`), and so does the puzzles' theme `"onlyEdge"`. The stored
  names stay (`edge`, `blueWin`, the unit `"edge"`, the storage keys).
- **One type for the game:** TypeScript compares `Review<Enclosure>` with `Review<V>` by their type parameters. So
  Hedge School's `Enclosure` extends the view's types too, and the view takes the game's types from its game interface
  alone (`NoInfer`).
- **Hedge School's behaviour did not change.** One port served the build before the split and the split build by
  turns. The engine was off, so that nothing searched. The comparison took 137 states of the pages. They were the
  review of the test fixture in three layouts (1,400, 1,000 and 390 pixels wide) and seven display settings, with
  candidates pointed at and pinned, the previews, a variation, the move menu, the threat, the area map's three styles,
  the settings, the keys and the charts. They were also the Analysis board, the editor, the Review tab, Practice, and
  the book in the review and on the Analysis board (the test book). The DOM was the same in every state, but Svelte's
  scoping classes: a component with no style of its own gives its elements none. The CSS had the same rules in the
  same order, but the area map's margin rule, which no other rule sets. The prerendered pages were the same, but the
  build's version. The screenshots differed in 47 states, by at most 2,759 pixels, along diagonal lines and in the
  regions' fills. Two captures of the build before differed from each other in 49 states, by at most 2,583 pixels: the
  rasterizer's antialiasing, not the split. The capture after the renames gave the same: the DOM the same in 136
  states, and in one the book table's count for screen readers, which the table sets 100 ms after each step. Its
  pixels differed in 39 states, by at most 3,027 pixels, each by at most 7 levels of 255.
- **How it moved:** a commit of pure renames (`git mv`), then the edits, then the renames, then the documents (design
  29, items 7 and 8). No file comes back at a moved path: a file that split keeps its general part at the moved path
  (`ownership.ts`, `lineImage.ts`, `moveList.ts`), and Enclosure's part has a new name in Hedge School
  (`enclosureMap.ts`, `enclosureImage.ts`, `MOVE_TEXT` in `enclosure.ts`). The tests split the same way.
- **Checked** after each stage on this machine: `npm ci` (after the lockfile changed), `npm run check:all`, Hedge
  School's build served on a port of its own with the test book, and its browser tests in Playwright's Chromium: 34
  passed, and the 5 analytics tests skipped (they need a build with a Google tag). The rename commit alone does not
  build: its importers still name the old paths.
- **The code review's changes** made the interface smaller, with no change of behaviour. The Export menu went to the
  pages' `tools`. One `Display` type serves both, Hedge School's extending the view's. The book's pointer is its
  `pointed` alone, and the networks' list is `offered` alone. The layers' keys are typed. The area map's board state is
  not computed again at each result while no move of the line is drawn, as before the split. The move's shape is a
  direct call, not a dynamic component for each move. Checked the same way, on one port by turns: the build of the
  split (ce38ad6) and the build after the code review, 138 states each. The DOM was the same in every state, but
  comment nodes and whitespace text in flex rows, which draw nothing. Two captures of one build differed in one state,
  the area map's status while it waits for the engine. `npm run check:all` passed, and the layout sweep in Chromium:
  34 passed, 5 skipped (the analytics tests).
- **Not done:** the view's own words. Its comments and inner names still say "edge" in places, beside the names that
  the interface gives. The layout's board area is square, and Enclosure's move list set the analysis column's width
  (`--side-min`): Blueprints' board and moves may need other values. The package has no test game for the view:
  Drawing Board's part is its first other game. Drawing Board's review (abscls-8tl1.7) meets these seams first:
  - The move list writes a move as text (`notation`), and a move's shape (`Shape`) gets the move alone. Blueprints'
    move list shows the blueprint's number in a box, and an edit the kind of the cell that it moves (design 33, item
    8): the move played, or the line's step, has that, and neither reaches the list or the shape.
  - `equal` takes no position, and the tree keeps a move by its name (design 33, item 9).
  - The view's styles use Hedge School's `app.css`: the labels' colours, `--last`, the board's, the score line's, the
    engine's and the candidates' colours, and the utilities `btn-icon`, `btn-primary`, the dialogs', `kbd`,
    `help-table`, `bar-glider` and `.step-dock`. A second site needs them in the package (`review.css`), not copied.
  - The display settings keep the area map's and the second number's fields, also for a game with neither.

### The review's styles in packages/review and packages/site (2026-10-26)

- **Decided:** the review's view takes its style from its package, as its code does (design 33, item 4: move, do not
  copy). `packages/review/src/review.css` holds the view's colour tokens in both themes (the quality labels' fills and
  inks, `--last`, `--score`, `--engine`, `--candidate` and `--on-badge`), their Tailwind colours (`last`, `score`,
  `engine`, `candidate`, `on-badge` and `blunder`), the variant `one-column`, `bar-glider` and the step bar's dock
  (`.step-dock`). `packages/site/src/site.css` holds the sites' general controls: `btn-primary`, `btn-icon`,
  `dialog-overlay`, `dialog-box`, `kbd` and `help-table`. Hedge School's `app.css` keeps its accent, its board's
  tokens and `board-points`, the notes' colours, `--area`, and the variants `review-game` and `review-last`. Drawing
  Board imports `review.css` as Hedge School does, and keeps only its board's tokens (`--board-bg`, `--board-dot`).
- **Each moved style has a user in shared code.** The view uses each token, colour, variant and rule that moved to
  `review.css`. The general controls' users are Hedge School's pages and the view's components, which depend on
  `@abstractclass/site`. The site package's own components use none of them yet, but they are the sites' controls, and
  Drawing Board's shell can use them. Three styles have no user in a package and stay in Hedge School's `app.css`:
  `btn-danger` (Practice's Abort and Resign, a game's Delete) and the Tailwind colours `best` and `mistake` (the lessons
  and the puzzles). Their tokens are the view's.
- **What a site gives the view:** the skeleton's board colour (`bg-board`, from `--board-bg`) and the Advantage
  chart's area line (`stroke-area`, from `--area`) stay the site's. Drawing Board has `--board-bg` but no `board`
  colour yet: its review (abscls-8tl1.7) adds it. The site package's toast uses the variant `one-column` and the
  colour `blunder`, and its switch's thumb the colour `on-badge`: both sites import `review.css`, which gives them.
- **The hub's token check** (`apps/hub/scripts/enclosure-board.mjs`, the step `hub-board`) reads Hedge School's
  tokens from `site.css`, `review.css` and `app.css`, in the order of the imports. The hub's board uses `--engine`,
  `--on-badge` and `--mistake-fill`, which are in `review.css` now.
- **Hedge School did not change.** Two builds, each in its own checkout with the engine's artifacts: dev at 7db8e3c
  (from `git archive`) and this change. The built CSS had the same declarations for each selector, and for each
  property in each cascade layer the rules that set it came in the same order. The main style had two rules more: the
  view's token blocks, beside Hedge School's own with the same selectors. The view's chunk differed only in Svelte's
  scoping class (`svelte-pd0pud`, `svelte-1jmnf16`): the package's component is outside the app's folder, so its
  class comes from its absolute path, which differed between the two checkouts. The prerendered pages' inline style
  was the same. The screenshots, in Playwright's Chromium (headless, its GPU off, the engine off in the browser's
  settings), took 20 states: the review of the test fixture, the Analysis board with its record, Practice, Practice
  in a game (the fixture's first 19 edges, the player to move, so that the bot did not search) and the Privacy page,
  each 1,400 × 900 and 390 × 844, light and dark. Against two captures of the build before, 4 and 6 states differed,
  by at most 27 pixels. Each differed by at most 2 levels of 255, except one state of the second capture (34 levels).
  The two captures of the build before differed from each other in 2 states, by at most 22 pixels and 34 levels: the
  rasterizer's antialiasing.
- **Drawing Board did not change.** Its built CSS kept every rule it had, with the same declarations, and its rules
  kept their order among themselves. It gained the view's rules and tokens: Tailwind now finds the view's classes, and
  a rule that targets no class (the step bar's dock: `html` and `#page` below 800 pixels) sets only the dock's room,
  0 pixels while no step bar is on the page. The screenshots took 24 states: the home page, About, Notation, Notices,
  Privacy and `/lab/board`, each 1,400 × 900 and 390 × 844, light and dark. Each was the same as the build before's,
  to the pixel, in two captures. The footer names the commit that the build came from, which the build before did not
  have (`unknown`): the comparison gave that text one value in both.
- **Checked** on this machine: `npm ci`, `npm run check:all` (every step passed, `hub-board` too), and the layout
  tests in Chromium on this change's build: 34 passed, and the 5 analytics tests skipped (they need a build with a
  Google tag).
- **Checked again after the review,** which changed only comments, documents and the hub's check. The built CSS of
  both apps was the same, byte for byte. Drawing Board's 24 states were the same as the build before's, to the pixel,
  in two captures. Hedge School's 20 states differed in at most 5, by at most 27 pixels. The largest difference, 38
  levels of 255 in 23 pixels, was the thumb of the Analysis board's engine switch. The two captures of the build
  before also differed there (34 levels). `npm run check:all` passed, and the layout tests in Chromium: 33 passed and
  6 skipped. The sixth, the practice games' test, needs a build that stores practice games. It passed on such a build.

### 2026-10-26: Hedge School takes the glossary's words (abscls-ceau)

The glossaries of the planning repository (`GLOSSARY.md` for every game, `glossary/enclosure.md` for Enclosure) name
the words of the site. The pages, the lessons, the documents and the code's comments took them.

- **Renamed:**
  - protected edge -> invincible edge (meaf.us's word), on the Notation page, in the lessons, the editor and the
    board's layer setting. The mark `*` stays.
  - opponent -> enemy ("an enemy edge"), in Hedge School's text, documents and comments. The shared packages serve
    Blueprints too, whose glossary says "opponent": their text and comments say "the other player". Design 33, which
    is Blueprints', keeps "opponent".
  - A score, a lead and a loss have no unit: "9 points of area" -> "an area of 9", "won by 28.5 points" -> "won by
    28.5", and the image captions say "a score of 34 and an area of 12". The notes drop "pts": "−4.0% · −26.3", and a
    turn's "−27.1% · −150.2 (−45.0, −105.2)". "Points lost" -> the loss in the lead, and the Report's "Avg pts lost"
    -> "Avg lead loss".
  - branch -> variation (Lichess's and PGN's word), in the review's text, the Notation page and the comments of the
    shared record and of Drawing Board's `record.ts`. A Git branch is still a branch.
  - label pass, map pass -> the label stage, the map stage, and the review's "passes" -> "stages". "Layout sweep" ->
    layout test.
  - snapshot -> review snapshot. "Label" -> "quality label" where the text means the review's judgement. "Number 1"
    -> "rank 1". "Analysis board" has a capital A.
- **Stayed, for stored data:** the database's `branches` store, the fields `edge` and `blueWin`, the storage keys, the
  display settings' unit `"edge"`, the analytics events ("branch promoted", "snapshot opened") and the fixtures.
  Identifiers (functions, variables, types, files, CSS classes) keep their old words, as do the style sheets.
- **Not done:** Practice's score bar ("Points bar", "Points: Blue …") and the players' cards
  (`packages/review/src/PlayerCard.svelte`, "34 points") still give a score in points. A note's cost is part of a
  longer text, with no element of its own to carry a title. Most design documents still say "label" alone.

### The player's own moves on Drawing Board, from the engine's legal moves (2026-10-27)

- **The finding:** on the first build of the player's own moves, the lab page's legal moves were hand-made: 3 to 5
  placements of each blueprint and 4 or 5 edits in each position. A chosen blueprint showed about 3 dots where the game
  has dozens, a cell with legal edits said "The cell has no legal edit.", and the hands changed their scale when the
  switch "Your moves" turned on. The tests checked the clicks against the same partial lists, so none of them could
  find this.
- **Decided:** the lab's positions are games of moves from the standard start, and Stamp Duty's early build
  (`engine-0d2a5416`, protocol 0.6.1) gives each position and every legal move (design 33, "How the board takes a
  move"). The data file has 82 kB. The engine gives a position's describe in about 5 ms on the CPU, with no network,
  and its module grows to 347 MB.

  | Position | Move | Mover | Legal moves | Placements of blueprints 1, 2, 3 | Edits |
  |---|---|---|---|---|---|
  | The start | 0 | Blue | 843 | 35, 35, 35 | 738 |
  | A middle game | 9 | Red | 849 | 36, 36, 36 | 741 |
  | A capture | 10 | Red | 877 | 44, 46, 46 | 741 |
  | An edit | 1 | Red | 843 | 35, 35, 35 | 738 |
  | An empty blueprint | 14 | Red | 640 | 11, 11, 0 | 618 |

- **The hands' panels:** each of the 3,576 legal edits puts its cell on a hex that touches its blueprint's cells, or
  on an empty blueprint's 0,0 (21 edits). 2,286 have a negative coordinate. So each panel shows its blueprint's cells
  and every hex that touches them, and no longer depends on the input. A blueprint of 7 cells then takes 5 hexes
  across in place of 3, and the hands' shared scale is smaller.
- **The status line** speaks only of what the player does: the move begun's next step, and why a click did nothing
  only for the move that the player tried. A touch's texts say "tap".
- **Checked** in headless Chromium (software rendering), at 1,400 × 900 and 390 × 844, each with a mouse and with
  touch: in each position, each blueprint's dots were its legal placements' anchor hexes, and each cell's dots its
  legal edits, all of them and no others, in view (every one of the 21 cells of the mover). A placement made, an edit
  made, Escape, a hex that is not legal, a new place that is not legal and the opponent's hand gave the texts expected.
  The hands' boxes, the board's area and its view stayed the same with the switch off and on, and after each
  choice: 1,664 checks. The lab's row of information first grew to a third line at 390 pixels under a mouse, when the
  hex under the pointer showed. That row is under the board now. A candidate's line under the pointer in a hand also
  changed the hands: while the input is on, a hand's hex finds no candidate.
- **The review's changes:** the owner's look found the status line blank until the first click. While the input is
  on and nothing is begun, it now asks for the first click: "Click a blueprint or a cell in Blue's hand.", and "Tap"
  on a touch screen. Before the first click, the texts follow the device's primary pointer: the media feature
  `pointer: coarse` (design 33, "How the board takes a move", item 8). The board itself now takes no move while a
  line shows, so the review gets the lab's rule. The script that runs the engine no longer copies the engine's
  driver: it starts the module with the build's own library (`gpu_engine.mjs`, its `createCpuEngine` only), as
  Hedge School's `node-engine.mjs` does, and writes the same `fixtures.json`, byte for byte.

### The book's table: badges and symbols alone, the win chance alone, no game's row (2026-10-27)

- **The rows show badges and symbols with no words** (design 32, item 3): a quality label's badge on the edge's line,
  after the edge, and the symbol at a line's end, on a phone too, as Lichess shows its position symbols. The words are
  each badge's and each symbol's title and accessible name. A row's second line holds words only ("a trap", "the book
  ends here"), so a row with none is one line. The title row's symbol keeps its words, on one line, so the table
  shows once what the symbols mean. The words took room that the badges and the symbols already carry.
- **The values:** the switch "Show the values", its kept choice and the column "Goes on" are gone. The table always
  shows the win chance for the side to move, alone ("52.3%"), in the rows and in the title row. Its bounds (KataGo's
  book bounds) are its title, "Between 48.1% and 56.4%.", and assistive technology reads them after it.
- **No game's row:** the row "Your game" and the tag "your game" on a book row are gone, with the code that fed them.
  The move list gives the review's quality label of the game's move. The Report's opening row keeps the review's
  quality label of the edge itself, by turn too, with "Review for" still applied: the book works by edge, also in the
  middle of a turn.
  This replaces "One label for one move" of "The book in the review: its rows, its mark and the game's row".
- **No line about the source:** "From the engine's analysis, not from games that people played. Book of …" is gone.
  The heading "Opening book" gives the source and the date as its title.
- **Outside the book** the analysis column shows the candidates as it does with no book: no heading "Not in the book",
  no switch, and no line "Last book position: turn n. Go there". The table comes back at the next book position. Most
  positions of a review are outside the book, so the book takes no room there. "Study in Openings", which the design
  put on that line, gets its place when Openings is built.
- **Each symbol takes a shade of its side's colour by its strength:** slightly better the least saturated, better the
  middle, winning the most saturated. = and ∞ take the text's colour. Lichess's symbols have no colour. Enclosure's
  sides are Blue and Red, so the colour names the side. The shape and the name give the side and the strength too, so
  the colour does not carry the meaning alone. The shades are tokens in `packages/site/src/site.css`.
- **A symbol's strength is its shade's distance from the text's colour.** = and ∞ take the text's colour, a neutral
  colour: near black in the light theme, near white in the dark theme. A side's three shades lie on a straight line in
  OKLCH, with the side's hue, from `--text` to the side's far shade, at 0.45, 0.72 and 1 of the way (lightness and
  chroma together). The far shade is "winning". It has the chroma of `--blue` or `--red` in its theme (cut to what
  sRGB can show), at the lightness where its contrast against panel-2, a lit row, is 3.1:1. So "slightly better" is
  near the text's colour, and "winning" is the most saturated and has the lowest contrast. Each shade keeps at least
  3:1 against the panel and panel-2 (WCAG 1.4.11), and the steps in CIELAB L* are even within 1.
- **The rule before it, rejected:** the stronger the position, the higher the contrast, from just over 3:1 against a
  lit row to about 10:1 against the panel. "Winning" then came nearest the text's colour: 0.077 from it in OKLab in
  the dark theme, where "slightly better" was 0.361 from it. So the strongest position looked the most like = and ∞.
- **Chroma alone, rejected:** three shades at the far shade's lightness, with 0.45, 0.72 and 1 of its chroma. ⩲ and ±
  looked alike on strokes 1.6 units wide: neighbouring shades were 0.041 to 0.051 apart in OKLab, against 0.097 to
  0.117 on the line from the text's colour. In the light theme, Red's "slightly better" shade had 2.96:1 against
  panel-2, under the floor.
- **The far shade at the edge of what sRGB can show, rejected:** its chroma is 0.20 to 0.25 in OKLCH, against 0.16 to
  0.18 for `--blue` and `--red`. It is more saturated than the site's own colours, for steps only 1 to 13% farther
  apart in OKLab.
- **The values** come from a script of the rule above. The line starts at the text's own chroma, not at chroma 0.
  From chroma 0, the far shades stay, and the other eight shades differ by 1 to 3 in a channel. The distance from
  `--text` in OKLab and the contrasts, by the formulas of `packages/site/src/symbolShades.test.ts` (WCAG's for the
  contrast), against the panel and against panel-2:

  | Theme | Token | Colour | L* | From text | Panel | Panel-2 |
  |---|---|---|---|---|---|---|
  | Light | `--blue-slightly-better` | #334f7f | 33.6 | 0.181 | 8.19 | 7.06 |
  | Light | `--blue-better` | #3b68b7 | 44.6 | 0.289 | 5.45 | 4.71 |
  | Light | `--blue-winning` | #4384f4 | 56.3 | 0.402 | 3.59 | 3.10 |
  | Light | `--red-slightly-better` | #7a3d38 | 33.5 | 0.193 | 8.23 | 7.10 |
  | Light | `--red-better` | #ad4b43 | 44.7 | 0.304 | 5.43 | 4.69 |
  | Light | `--red-winning` | #e6574f | 56.3 | 0.421 | 3.60 | 3.10 |
  | Dark | `--blue-slightly-better` | #9cb6e3 | 73.6 | 0.162 | 7.18 | 6.26 |
  | Dark | `--blue-better` | #7299df | 63.1 | 0.261 | 5.16 | 4.50 |
  | Dark | `--blue-winning` | #487ad9 | 52.2 | 0.361 | 3.56 | 3.10 |
  | Dark | `--red-slightly-better` | #e4a59e | 73.5 | 0.159 | 7.15 | 6.24 |
  | Dark | `--red-better` | #de7d75 | 62.9 | 0.256 | 5.13 | 4.48 |
  | Dark | `--red-winning` | #d4514b | 52.3 | 0.353 | 3.57 | 3.11 |

- **The badges line up:** the edge's text takes the width of the longest edge, A10-D10 (7 characters of the
  monospaced font), so each row's badge starts at the same place.
- **The widths,** measured in Playwright's Chromium on the review of `hedgefund-review.json` at the end of the test
  book: the table is as wide as its box at 360, 400, 799, 800, 1,023, 1,024, 1,259, 1,260, 1,280, 1,366 and 1,920
  pixels. The column "Line ends" takes 68 pixels, its head on one line at every width. The edge's column has 96 pixels
  at 360 and 157 at 1,260. With the values open and the column "Goes on", it had 62 and 123, and the head
  "Line ends" went on two lines. Left to the table's own layout, the column "Line ends" took a share of the free room:
  at 1,260 pixels, values closed, the edge's column had 163 pixels in place of 229. The layout test checks the table
  after the game's first edge, where the rows' edges have 6 and 7 characters. At every size from 360 pixels wide, the
  table fits, the head stays on one line, and the rows' badges start at one place.

### The import's frame in packages/import, and Drawing Board's tools (2026-10-27)

- **Decided:** the parts of Hedge School's import that are not Enclosure's moved into `@abstractclass/import`
  (`packages/import`, design 29, item 10), as pure renames first: the bookmarklet, the userscript, the page code's
  frame, the hash after the `#` and the import's events. Each takes the site's parts as parameters. The site's page
  code has one entry, `read`, which reads the page on a click and says what the tool does: send a game, show a
  message, or load the address that has the moves (meaf.us's watcher's view). A package of its own, not
  `@abstractclass/site`: the site's package holds components and styles that the pages draw, and the import's code
  runs on other sites' pages as text, with a check of its own.
- **Hedge School's tools, before and after,** each built with `VITE_EDITION=early` and the default address:
  - The header (`/hedge-school.meta.js`) is the same, byte for byte, but for the build's time in `@version`.
  - The bookmarklet's script (`/bookmarklet.js`, 10,140 bytes, then 10,636) and the userscript (`/hedge-school.user.js`,
    24,212 bytes, then 24,860) differ in their frame: the site's parts come as data, and the page code has `read`.
  - The bookmark's loader on the tools page takes the site's name as a third argument. Its text and its version (1)
    are the same, so a bookmark made before needs no update.
  - Both builds ran in Chromium on mock pages of meaf.us and strategyjam.org, with every request answered by the
    test: 12 cases for the bookmarklet and 11 for the userscript (a game with and without a slider, no game, a game in
    play, a watcher's view that loads, the reload of a finished game and the game that then opens, a refused tab, a
    game of other rules, a login, a connection, a page with no stage). Each did the same in both builds: the same
    alerts and notes, the same tabs and addresses, the same button places. The one difference is the userscript's code
    version in the address (`v=4c9b28e04675`, then `v=84c64475dfe9`): the hash of the files that make its code. So
    Hedge School's import page asks a player whose Tampermonkey has not yet taken the update to update it, once.
  - Hedge School's unit tests of the tools and of the hash pass with only their imports changed, and its browser tests
    of the import pass unchanged.
- **Drawing Board's tools** (design 33, "How a game comes in from strategyjam.org"): the bookmark and the userscript
  "Open in Drawing Board", the reader of Blueprints' game page, the import page that shows the record and the position
  that the game's page showed, and the tools page. Blueprints' module (the engine repository's game watch, its
  `runs/strategyjam/blueprints/20261026-142305/`) draws the stage in a wide window, and strategyjam.org's own view in a
  narrow one. Both hold the game in the same props as Enclosure's page, with the replay slider, so the reader is
  Hedge School's walk with Blueprints' game. The button goes at the end of the stage's row of game buttons
  (`.stage .actions`), which both layouts draw.
- **Checked** with page states that the tests make, with moves from `fixtures.json` (no game of strategyjam.org's
  archive), and with Drawing Board's built tools in Chromium on mock pages of both layouts: the bookmarklet and the
  userscript open the import page with the record and the position, the button ends the row of game buttons, and the
  import page shows the game, the notice for an out-of-date userscript, and a link with no record. Drawing Board's
  pages passed the layout test's rules at its 471 sizes (`/`, `/about`, `/privacy`, `/notation`, `/notices`, `/tools`,
  `/lab/board`, and `/import` with a game). The first sweep found the import page wider than a phone: the record's
  Site address did not break. It breaks anywhere now.
- **Not checked:** the tools on strategyjam.org itself, and the button's place in its real layouts. The tools run in
  the player's own logged-in page, so that test waits for the owner (abscls-8tl1.12).
- **The review** made the frame's parameters fewer and changed no text that a player sees, except two sentences of
  the tools page:
  - One object of a site's parts (`UserscriptSite`) serves both tools. The frame makes the words that name the tools
    from the site's name and the tools' own name: "the Review in Hedge School bookmark", "the Hedge School button" and
    the button's label, "Open this game in Hedge School". Each site wrote out these three before.
  - The package says moves, as the glossary does: a game's length goes to the events as a range of its moves. The
    events keep their key `edges`.
  - Drawing Board: the button's picture takes its hexes from the board's `hex.ts`. The import page has no notice for a
    tool that sends no version: Drawing Board's tools always send it. The reader gives a game with no players when
    the page's state has no seats, so the record says "?" and the player sees no raw error. On the tools page, "A
    bookmarklet can: you keep it…" and "a userscript does the same: a button…" became sentences with their verbs.
  - Hedge School's tools, dev against the branch, written from their sources with Node and run in Chromium on 23 mock
    cases of meaf.us and strategyjam.org: 19 the same, and the other 4 differ only in the userscript's code version
    (`v=4c9b28e04675`, then `v=41eb34dc7cf9`). After the review's last edits the files are the same again but for that
    version (`1ed11048e9a3`).
  - Blueprints' module of the next save (`runs/strategyjam/blueprints/20261027-101649/`) has the same props, the same
    rules (`blueprints`, version 3), the replay slider and `.stage .actions`. The slider moved to a module that
    strategyjam.org's games share. strategyjam.org now has games from a position, which the record refuses.

### The monospaced font's ligatures are off (2026-10-27)

- Fira Code draws ligatures. A record's text changed on screen: the game id k3x9q showed as k3×9q, and "??" showed as
  one glyph. A player who copies or reads an id, a move or a record must see the characters that are there.
- The rule is one line in `packages/site/src/site.css`: `--font-mono--font-feature-settings: "liga" 0, "calt" 0` in
  the theme, next to `--font-mono`. Tailwind 4 gives the setting wherever it gives the font: the `font-mono` utility,
  and preflight's `code`, `kbd`, `samp` and `pre`. No other rule in either site takes `--font-mono`. So the setting
  covers every monospaced text of Hedge School and Drawing Board: the records, the move lists, the Notation page and
  the editor.
- Fira Code has all of its ligatures in the `calt` feature, and no `liga`. `"liga" 0` stays for a fallback font.
  Measured in headless Chromium on both sites' builds: with `"calt" 0` alone, k3x9q, `????.??.??`, `=>`, `!=`, `->`,
  `0x1F` and `www` draw the same pixels as with the rule. With `"liga" 0` alone, they draw their ligatures.
- Fira Code's ligatures keep the grid: a ligature of two characters takes two cells. Each of those texts measured 0.6
  em a character with the ligatures on and off. So the move list's columns, sized in `ch`, keep their width. The book
  table's edge (A10-D10, 7 `ch`) draws the same with the ligatures on and off.
- The test is in `apps/hedgeschool/tests/layout.spec.ts`. It checks the `font-feature-settings` of the `font-mono`
  utility, and of every element in Fira Code on the Notation page and on Hedge School's editor, whose position field
  is in Fira Code. It also checks the width of a probe text. The Drawing Board test runs when `DB_BASE_URL` gives its
  preview.

### A mark on each book move, in two forms (2026-10-27)

- **Each book move has a mark** (design 32, item 4; beads abscls-tpaj.17): an edge whose position and the position
  after it are both in the book. The mark takes the quality label's slot in the move list, whatever the label, from
  Great to Blunder. By turn, a turn has it when all its edges are book moves. It replaces the one mark at the last
  book move of each stretch, "Last move in the book". Nothing said what that mark meant without a pointer, and the
  moves before it carried nothing, so it did not show how far the game followed the book.
- **No special rule for poor moves.** A book icon with the quality label in its place on a Great, Inaccuracy, Mistake
  or Blunder book move was not chosen: a book move that the review calls an Inaccuracy or worse would then never show
  as a book move. Every book move has the mark, and the mark shows the quality label.
- **Two forms, a display setting** ("Book moves", beside "Quality labels"): the quality label on the book's brown
  (the default), or an open book in the quality label's colour. As a badge: the quality mark in white on a brown
  disc, or the book in white on the quality label's disc. As a quality mark alone: the quality mark in the brown, or
  the book in the quality label's colour. The default follows Chess.com, whose Book mark is a brown disc. Both forms
  depart from Chess.com, whose "Book" takes the place of the move's quality label: a book move can still be a poor
  one.
- **The previews** were drawn into the review of `book-left-review.json`, light and dark, by edge and by turn. Each
  preview gave one form:
  - The book in the quality label's colour. It is now the second form.
  - The quality label's badge with a small book tab. At this size, the tab reads as a dot.
  - One book icon on the brown. It hides the move's quality.
  - The quality mark in white on the brown. It is now the default.
  - The quality mark in its own colour on the brown. The quality labels' colours have 1.04:1 (Best) to 1.47:1
    (Inaccuracy) against the brown, so these marks almost disappear.
- **The brown,** `--book` in `packages/review/src/review.css`, at least 3:1 against the panel and panel-2:

  | Theme | Colour | Against the panel | Against panel-2 | White on it |
  |---|---|---|---|---|
  | Light | #a4835e | 3.51:1 | 3.03:1 | 3.51:1 |
  | Dark | #a88865 (Chess.com's) | 4.48:1 | 3.91:1 | 3.29:1 |

  Chess.com's #a88865 has 2.84:1 against the light panel-2 (#f0eeea), under the floor. #a4835e keeps its hue and
  saturation in HSL, and is the lightest such colour at 3:1 against panel-2. White on a label's badge is 2.32:1 on
  Good, 2.24:1 on Inaccuracy and 2.78:1 on Excellent, so white on the brown reads as well or better.
- **The title and accessible name** are the move's own tooltip, with "Book move" before it and the position symbol
  after the move at its end (the book's minimaxed value of that position, in the symbol's words): "Book move · Best:
  +0.6% · +2.0 · Lead: Blue +14.9 · Equal position after it". By turn, the turn's tooltip and the position after the
  turn. A title with the quality label and the position alone ("Book move: Good. Blue is slightly better after it.")
  was not chosen: the mark is inside the move's button, so its title covers the button's, and that title hid the
  move's numbers. The mark's title and the move's come from one value, so they cannot drift apart. A click goes to
  the position before the move or the turn, and shows the book there for this review only.
- **No mark** on the live site, where the book does not load, on a set-up board and on the Analysis board, as with the
  mark before. A book move with no quality label yet, or of the player that "Review for" leaves out, has no mark. A
  move that comes back to the book from a position outside it is not a book move: in `book-never-review.json`, G14-H11
  had the old mark and has none now.

### The book's table follows Review by: whole turns at a turn's start (2026-10-27)

- **What:** the book's table follows the display setting "Review by", as the review's labels do (design 32, item 3).
  By turn, the default, a turn's start lists whole turns: each book move, then each book move of the position that it
  reaches. A row names both edges. Its win chance is the one after the second edge, and its quality label comes from
  the turn's loss against the best turn, by design 10's rule for a turn. By edge, and in a turn's middle, the rows
  stay single edges. The book holds the position after each edge, with its minimaxed values, so the switch needs no
  new search: the page loads the parts that hold the positions after the turn start's book moves. A turn's start
  where no book move has a book move after it lists single edges too. The test book has no such start.
- **One row a position:** two orders of the same two edges reach the same position, so they are one row, with the
  order whose first edge the book prefers. The first build gave each order a row: at turn 3 of the test game
  book-left-review.json, D9-G10 D10-G9 (Best) and D10-G9 D9-G10 (Excellent) were two rows, both 58.1%. In the test
  book, 31 of the 284 whole turns at turn starts are a second order of another, at 24 of the 78 turn starts. No merge
  drops a trap's order for an order that is not a trap.
- **The test book's counts** (`rows.test.ts`), with one row a position: 78 turn starts after turn 1 have book moves.
  They give a median of 1 whole turn and at most 33 (turn 3 after Blue's D10-G9 and Red's N11-Q10 O11-Q10: 5 fine
  turns, 20 others and 8 traps), and 6 of them give more than 8. With a row for each order, the counts were at most
  34 and 8 above 8. Beads abscls-tpaj.18 had counted 79 turn starts and 9 above 8. In every turn start, the value
  after a book move equals the best of its position's book moves and its best move outside the book. So the best
  turn's win chance is the position's best: the first book move's, or the best move outside the book's.
- **The best 8:** the fine and the other turns, by the win chance for the side to move. The rest come after a button
  ("Show 11 more turns" for 19), before the traps. The traps and the best turn outside the book always show: in the
  start with 33 turns, the first 8 rows of the table would have put the 8 traps under the button. So 5 of the 6
  starts above 8 have the button. The board numbers only the rows that show.
- **The best turn outside the book:** the best for the side to move of two kinds of turn. The first kind is the
  position's best first edge outside the book, whose second edge the book does not hold. The second kind is a book
  move, then the best second edge outside the book after it. In the test book, the first kind is the best at 48 turn
  starts, and the second at 30.
- **A trap's turn:** a second edge's trap keeps its refutation (the enemy's turn, 2 edges for all 25 of the test
  book's). A first edge's trap (13 at turn starts) gives each of its turns: after the second edge that its refutation
  starts with, the rest of the refutation, and after another, none. In the test book, a first edge's trap has 1 to 5
  book moves after it.
- **The Report's opening row:** by turn it names the turn that left the book, with the review's quality label of the
  turn, and goes to the turn's start. "Blue, D9-G11 D10-G9, Blunder" in the test game book-left-review.json, where
  by edge it says "D9-G11" and the edge's quality label. Its "Before that" names a whole book turn too. The
  candidates are the game's turns before the departure whose edges are all book moves and none a trap. The row names
  the one worse than Good with the largest loss, with the quality label that the table gives the turn. In
  book-left-review.json: "Before that, at turn 2, Red played N11-Q10 O11-Q10, a book turn and an Inaccuracy." (a
  loss of 0.077), where by edge it names O11-Q10. A game whose weak turn reached the end: "The last book turn, D9-G10
  G10-J13, is a Mistake." (0.105), where G10-J13 alone is an Inaccuracy. The trap rows do not change. The row names
  the worst whole book turn, not always the last one, as by edge it names the worst book move. In
  book-left-review.json the worst is also the last.
- **The width:** by turn, a row's two edges take 154 pixels, and the table needs 313 pixels with its heads on one
  line. A window 360 pixels wide gives the table's box 264 pixels with its scroll bars (the layout test), and 294
  in a phone's emulation, whose scroll bars take no room (`tests/book-review.spec.ts`). With the head "Line ends" on
  two lines alone, the table still needed 282 pixels. The first build let the heads "Blue wins" and "Line ends" take
  two lines and halved the cells' padding in a box under 320 pixels wide: the head row was then 49 pixels high, where
  by edge it is 29. Now a turn's edges wrap: where the column has no room for both, the second edge and the badge go
  under the first. The table then needs no more width than by edge, every head stays on one line, and every row wraps
  at the same width, so the badges stay at one place (`npm run test:layout`, `tests/book-review.spec.ts`). The rows
  take a line more there, and the words and the font keep their size. In a window 360 pixels wide with scroll bars,
  by turn as by edge, the head row is 29 pixels high, and the heads are 28, 96, 72 ("Blue wins" and "Red wins") and
  68 pixels wide, in a table of 264 pixels in its box of 264. A turn's row there is 49 pixels high, where an edge's
  row is 29 (turn 2 of book-left-review.json). At 1,366 pixels a turn's row is one line.
- **The move list by edge** hides 56 pixels sideways from 360 to 410 pixels wide (320 pixels of rows in 264), with
  or without the book, and fits by turn. The layout test swept the review by turn only, so it never met this
  (beads abscls-8n02). The book's sweep by edge left out this one fault until the fix, and checked the rest.
- **The fix of the move list by edge:** each move takes 139 pixels by edge, so a row of two needs 320. Each row now
  wraps: where a turn's two moves do not fit side by side, the second move goes under the first, at its own width, so
  that its quality label and its loss stay next to its notation. By edge the rows wrap at 360, 385 and 410 pixels
  wide (move lists of 264, 289 and 314 pixels) and hide nothing. From 420 pixels, a turn is one line again, also at
  1,260 to 1,300 pixels, where the move list has its least width of 325 pixels (design 06). By turn nothing changed.
  The first build wrapped below a fixed width of 21.5 rem. That wrapped every turn of Practice's move list, whose
  moves have no labels and need about 180 pixels, and every row by edge at 1,260 to 1,300 pixels. A wrapping row wraps
  only where the two moves do not fit, for every move list and every game's moves. The book's sweep by edge now runs
  in full (`npm run test:layout`: 53 passed, 7 skipped).
- **A departure, named in design 32:** no published explorer lists turns of two moves, because chess and Go have one
  move a turn.
- **Openings** is not built, so it has no setting to follow yet. The lab page `/lab/book-table` has no display
  settings, and its rows stay single edges.
