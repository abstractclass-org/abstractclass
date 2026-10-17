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
  chess.com's #E3AA24 (2.1:1). The board stays with the theme, so the notes have a light board's value, in the same hues: 3:1 against it
  (#a66fd3, #a78202, #359a3b, #86868c). The muted text is #6a6c73 (4.5 on the page and on panel-2). The dark theme's
  values are unchanged.
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
    longer (376 pixels in Practice, at a window 1,347 pixels wide), and the row has one height. The row's height until it is
    measured (`--strip`) is the two lines' now, so that the review's board keeps its size as the review shows.
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
  - **Earlier: the header reaches the window's edge on the boards' pages:** the scroll bar's room that `scrollbar-gutter:
    stable` keeps cannot be drawn in. The browser paints only the root's background colour there, clips an element
    drawn into it, and leaves it out of `100vw` (checked in Edge). The CSS working group's issue 5232 is open on it,
    and the common answers are an always-visible scroll bar, a header outside the scrolling element, or no room where
    nothing scrolls. The pages sized to the window (the review, the Analysis board, Practice) do not scroll at a
    desktop size, so they keep no room (`data-fits-window`, from the line that each shows while it loads). The other
    pages keep it, as their height can change while they load, and most of them scroll.
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
  the refusals (not JSON, an invalid field, more than 64 KB, no database). `npm test` passes (116 after the reviews), `npm run check` has no errors or warnings. The banner
  and the privacy page pass the layout sweep at every width (a build with `VITE_STORE_PRACTICE_GAMES=on`). Not checked:
  a game sent in a browser, the banner's and the switches' behaviour in a browser, and the Function on Cloudflare.

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
- **Where the time goes,** in Chrome's trace of a stored review's reload (Playwright's Chromium, 1,366 × 657 pixels,
  the test fixture's game of 120 edges in 61 turns), by thread time, the time that the main thread ran:
  - the first task, 44 to 53 ms (the sets' medians below): the move list 12 to 17 ms, and a forced layout of the
    whole review about 21 ms (`StepBar` reads a width as it mounts), then the board, the charts and the rest.
  - the frame's render task, 20 to 25 ms: most of it is two recalculations of the style of every element of the
    review (about 1,040). The view sets `--side-h` and `--strip` on its `<main>` after the first layout, and other
    elements inherit these custom properties.
- **The change** (design 06, item 10): the move list's rows come in the frame after the rest, in a task of their own
  (`rowsDrawn` in `ReviewView.svelte`). Until then one element draws grey bars in the list, one for each turn, a
  turn's row (22 pixels) apart. A hidden page draws the rows at once. The rows' task has the mark `review:moves`.
- **The measurement** (`scripts/measure/review-first-frame.mjs`): the first draw runs from the task that holds
  `review:shown` to the end of the frame that paints the move list's rows. Chrome's trace gives each task's wall time
  and its thread time. The request asked for the Long Tasks API (a `PerformanceObserver`), and the first series used
  it. It gives wall time only, and on a loaded machine a task's wall time also counts the time that the main thread
  waits for a processor. The trace gives both, so the series below report both.
- **The machine was loaded:** the engine repository's replay held 8 of the 12 job threads, and other workers came and
  went. So the builds before and after ran in pairs: one build's set of 5 reloads, then the other's, back to back.
  The pairs took turns at which build ran first. Before each set, the script read the machine's state. Windows'
  processor use and the load in WSL (one minute) at each set, at 1,366 × 657:

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
  | Layout shift (CLS) | 0 (0) | 0 (0) |

  - **The longest task by thread time:** each pair's difference of the sets' medians is −12, −14, −18, −20 and −9 ms.
    All pairs agree, and the median is −14 ms. The sets' medians are 44 to 53 ms before and 26 to 40 ms after, so
    the spread between the sets of one build is 9 ms before and 14 ms after. The gain is larger than the spread of
    the build before, and equal to that of the build after. The two builds' sets do not overlap. Before, 9 of the
    25 reloads had a task over 50 ms of thread time. After, none had.
  - **The first draw's total thread time:** the pairs disagree (+6, −11, 0, −12 and +11 ms): no change.
  - **By wall time,** what a player waits: the pairs disagree (the longest task's differences +73, −39, −30, −149
    and −6 ms), so this measurement shows no gain there. Each extra task also waits for a processor. Two earlier
    series of 5 pairs, of a first form of the change, also disagreed by wall time. One used the Long Tasks API alone
    (−47, −24, −52, +26 and −6 ms).
  - **One pair each at other sizes,** the longest task by thread time: −4 ms at 390 × 760 (the move list is in the
    hidden Analysis tab there), −9 ms at 1,427 × 849, and −21 ms by edge at 1,366 × 657.
  - **Layout shift:** 0 in each of the 80 reloads above, at every size and setting, before and after. On the
    Analysis board, 0 before and after: the fixture's game open at edge 60, at 390 × 760 and 1,366 × 657, with the
    move on screen in the list's view once the rows come, and a game of 8 turns at 390 × 760, 390 × 1,100 and
    768 × 1,024, where the list's height follows its rows and the step bar is in view.
- **What it gives:** by thread time, the first draw's longest task is about a third shorter, and on this computer
  (16 cores) no task of the first draw passed 50 ms after the change. The total work does not change: it moves to
  the second frame. By wall time, on this loaded machine, the measurement shows no gain. On a computer three times
  slower, the first task would still take about 100 ms, and the render task about 70 ms. To reach 50 ms there, the
  two style recalculations and the forced layouts must go too: the issue "The review's first frame computes its
  styles three times" (abscls-de1).
- **Not measured:** an unloaded machine, Edge, a slower device, and INP itself.
