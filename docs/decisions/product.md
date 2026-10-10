# The product

The interface, the review, puzzles, lessons, labels and thresholds.

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
  network has loaded. Before, it started only when the player moved.
- **The single-file build is removed** (`SNAPSHOT=1`, `scripts/snapshot-fragment.cjs`). It served only the
  artifacts, which are deleted.
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

- **The cut mark** (the engine repository's notation, its commit `c168502`): a move that cuts an opponent's edge is
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
- **Checked** in Chrome on edge 30 of the sample game: the table showed 1, 2, 3, 5 and 11, with badges on 1, 5 and
  11, the three the board showed. The notes read `63.7% · +79 pts` and `−4.5% · −33 pts`.

### The candidates: which ones the board shows, and the engine's order (2026-10-10)

- **The other candidates' notes name their reference:** `vs 1: −4.5% · −33 pts`. Number 1 reads `63.7% · +79 pts`.
- **The table lists every candidate,** in the engine's order, in a box of five rows that scrolls. The box keeps room
  for its scroll bar, so the columns do not move. A candidate pointed at on the board brings its row into view.
- **The board shows number 1 and every candidate that has enough visits and is within the Good band.** Enough visits
  is KataGo's own rule for a move that may compete for its choice: 15% of the most visited move's weight
  (`minVisitPropForLCB`, its `analysis_example.cfg`; `getPlaySelectionValues` in `search/searchresults.cpp`). Visits
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
  visits) the visits are spread, and 53 of 119 positions show more than number 1 (edge 30: eight; edge 92, a lost
  position where many moves are equal: ten). After the deep search (1,024 visits) at edge 30, number 1 has 767 visits
  and the board shows number 1 alone. The table's box stayed 157 pixels high at every position.
- **Refined by the engine repository** (its design 04, commit `1a377d3`, answering request 04): the best-LCB move is
  not put on top outright. Its value is raised as far as its lower bound justifies against each other move, at most
  fivefold, which usually but not always puts it first. The protocol leaves out KataGo's symmetric twins, so the
  `order` numbers in a reply can have gaps. The review numbers the candidates by their place in the sorted list, so
  its numbers have none. A move's share of the search is its `edgeVisits`, as the site reads it.

### The review page's layout (2026-10-10)

- **Decided** (design [06-review-layout.md](../design/06-review-layout.md)), from Lichess's analysis layout: the board
  fills the window's height; three columns from 1,260 pixels (the summary with the Highlights, the board, the
  analysis); two columns with tabs below that; one column below 800 pixels; the Advantage chart under the board; the
  step controls and a display menu at the bottom of the analysis column; the engine header (values, visits, search
  bar) at the top of the analysis; the review's progress at the top of the summary.
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
  position after the move, from Blue's side, right-aligned and muted: whole points, signed, thousands as `k`, so at
  most five characters (`+1.2k`). After the last move, the result. A move's hover title is short: its label and
  the lead ("Blunder · Red +87"). Each move's cell has one width (the move, its glyph and the lead: 110 pixels), so two moves fit the
  analysis column at its least width (294 pixels of list in a 343-pixel column at 1,376 × 952), checked in Chrome.

### The review's tables fit their content (2026-10-10)

- **The problem:** in a real browser, each Windows scroll bar takes about 15 pixels (the page, the summary, the
  candidates' box). At 1,380 × 952 the candidates table's edge column had 56 pixels, and names of 7 characters were
  cut ("D10-…"). The accuracy table's labels had 76 pixels, and 6 of its 10 labels took two lines. The other columns
  had room to spare. Screenshots from headless Edge had hidden the scroll bars.
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
- **Checked in Edge:** at 1,380 × 904 the three columns end at 865 pixels. In frames: 1,380 × 1,000 the same; 1,000 ×
  880 (two columns) the analysis column ends at the chart's bottom; 1,380 × 800 (the chart does not fit) the columns
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
- **The first point:** one of the mover's nodes that begins a legal edge, as a new edge starts at the mover's node.
  An edge has no direction, so the far end could also have come first, but a node first is what a player expects. A
  click elsewhere does nothing, and the puzzle's card says "Start the edge at one of Blue's nodes". With a first
  point, a click on another such node makes it the first point, and a click on a point that is neither a marked end
  nor such a node keeps the first point and says "Finish the edge at a marked point". A click on the first point
  cancels it. The points that a click does nothing on show no hover.
- **How:** the puzzles page starts one engine worker with no network and asks `describe` for each puzzle's position:
  its `legal` list is every legal edge, and `nodes` gives the mover's nodes. `EdgeInput` takes them (`rules`) and gives
  the ends (`ends`) and the points a click acts on (`active`) to the board. Without the engine (a site where
  `npm run engine` was not run) the input keeps the rules' box.
- **Checked in Edge** on the first puzzle (Blue to play): before the first point, the 18 points a click acts on are
  Blue's 18 nodes; E10 is refused with the card's message; D10 marks 38 legal ends, and not the points on Blue's own
  edge A10-D10; K3 then keeps D10 and says to finish at a marked point; the pointer on A13 shows the edge D10-A13; a
  click on a marked end places the edge, and the puzzle answers "That's not the edge".
- **Not yet:** the lessons still check edges with their own small tests (the backlog).

### The engine's line on the board (2026-10-10)

- **Decided** (design [07-lines-and-variations.md](../design/07-lines-and-variations.md)): pointing at a candidate,
  on the board or in the candidates table, draws its line on the board (KaTrain's and Lizzie's way): its first 6
  edges, dashed in each mover's colour and numbered in circles of the mover's colour, the candidate first. The
  analyses keep each candidate's line (KataGo's `pv`, up to a pass; the cache's shape version 3).
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
  edge 30 of the sample game, Blue has 46 points and 11 area, Red 30 and 3; number 1's line takes Red to 4 at its first
  edge and back to 3 when Blue cuts, and Blue to 24 when its sixth edge closes a region.
- **The other candidates leave the board** while a line shows, so that its only numbers are the line's. The rounded
  square and the number on the new point were the other choices.
- **Only for candidates with enough visits** (the first choice, or 15% of the most visited candidate's visits, the
  board's rule): the line of a barely searched move means little. The other rows say "Too few visits to show the
  engine's line". The engine repository is asked for the visits of each move of a line (request 05,
  `includePVVisits`), so that a line can stop where its search ran out.
- **Checked in Edge:** after edge 30, number 1's line draws one edge at a time (1, then 2, … 6 over three seconds),
  each cut appearing with its edge; a click on the row draws all 6; Red's cut region near M9 loses its shading and
  Blue's new region gets it (Red 3 regions to 2, Blue 6 to 7); R8-T11 (6 visits) shows no line and its row has the
  note; at the first position, pointing at number 1 hides number 2 and leaves number 1.

### The engine's line: where it stops (2026-10-10)

- **The engine gives the visits of each edge of a line** (request 05, engine repository commit `0886496`, no protocol
  change): with `includePVVisits: true`, each candidate has `pvVisits` and `pvEdgeVisits`, one number for each move
  of its `pv`. Every search of the review asks for them, and the analyses keep `pvEdgeVisits` with the line (the
  cache's shape version 4).
- **Published tools:** KaTrain and Lizzie draw the whole line and do not ask for its visits (KaTrain's `anim_pv_moves`
  is 100; Lizzie's `limit-branch-length` is 0, no limit). KaTrain's one count for "too few visits" is `low_visits`,
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
- **Checked in Edge** at a game's last position, at 1,920 × 1,000, 1,380 × 904, 1,280 × 720, 1,100 × 800, 900 × 900,
  800 × 900, 600 × 900, 430 × 900, 390 × 844 and 360 × 740: no tag overflows, no name is cut, no tag meets the bar, no
  page scrolls across, and the board and the side columns end level. One line at 1,100 pixels and up (two at
  1,280 × 720, where the board is height-bound and gives 3 pixels for the taller row), two at 900 and 600, three at
  800 and on phones. With the gauge the same, except one line at 1,280 × 720 and 600 × 900, and two at 800 × 900 and
  430 × 900.

### The engine's line listed, and branches (2026-10-10)

- **Decided** (design 07): one line listed under the candidates table, as Lichess lists one by default
  (`ceval.multipv`, 1): the line of the candidate pointed at, or else of the selected one (number 1, or the row or
  board candidate last clicked). One line for each candidate on the board was the other choice. Pointing at an edge of
  the list draws the line up to it on the board, all at once, and a click plays the line up to it as a branch
  (Lichess's `playUciList`).
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
- **Checked in Edge:** the board's candidates are rounded squares; the table's box is 160 pixels for 159.5 pixels of
  rows; pointing at row 5 leaves the table where it is; a click on row 2 shows candidate 2's line in the list and
  draws no line; the notes read as above.

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

- **The problem:** the display menu had grown to eleven controls in six small groups, in a popover above the gear.
- **Published tools:** Lichess's analysis settings (`ui/analyse/src/view/settingsView.ts`) are a dialog, 720 pixels
  wide, with switches in boxes by where they act (General, Move list, Board), in two columns or one on a phone, and a
  help video for the setting under the pointer. Lichess's analysis menu itself opens in the analysis column, in the
  move list's place.
- **Decided** (design 06): a panel in the analysis column, in the place of the analysis, so that the board shows each
  change; grouped by where a setting shows (Board, Move list, Advantage chart); a short line under each setting that
  says what it does; switches for on and off, and a pair of buttons for a choice of two. A dialog in two columns
  (Lichess's settings) covers the board; the popover, reorganised, would grow taller than the column. Help on hover
  does not show on a touch screen, and labels alone say little for "Protected edges" or "Dots and numbers".
- **Checked in Edge** at 1,372 × 892: the panel fills the column and scrolls (742 pixels of settings in 618); a click on
  "Side vertical gauge" brings the gauge, and the Regions switch turns the shading off and is kept in the browser;
  Escape closes the panel and brings back the candidates and the move list. At 390 pixels the panel takes the tabs'
  place, 309 pixels wide, with nothing cut and no scroll across.

### The player's own moves, keys and the move menu (2026-10-11)

- **Published tools:** Lichess's keys (`ui/analyse/src/keyboard.ts`): at a fork ↑ and ↓ pick the line that → follows,
  elsewhere the first and the last move; Shift + ← and → the previous and the next fork; Shift + ↑ and ↓ the line
  beside this one; Space its best move. Its move menu (`treeView/contextMenu.ts`): Promote variation, Make main line,
  Delete from here. KaTrain analyses each move added to its tree and colours each node by the points it lost; a middle
  click plays the line under the pointer.
- **Decided** (design 07): the player's own moves always on, the puzzles' edge input on the position's rules; Lichess's
  keys; Space plays the pinned candidate or number 1, and a double-click on a candidate plays it; a right-click (or a
  long press) on a branch's move gives Promote variation and Delete from here. The game's line stays first in the review, so "Make
  main line" waits for an analysis board (the backlog).
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
- **Checked in Edge,** with real clicks and keys, at edge 61 of the sample game: Blue's 20 nodes take the pointer;
  G8, then E7, plays "31... E7-G8x" (with its cut) as a branch (with labels on, it was a Blunder within six seconds;
  now it has none, and the board shows only the game's badge of that turn); Space plays Red's number 1; ← ← returns to the fork; ↓ picks
  "line 2 of 2" and shows its edge; → follows it; Shift + ← returns to the fork; a double-click on candidate 1
  (A10-A13, the game's edge) goes along the game; a second branch (D11-G8) promoted comes first, and its menu then
  greys out Promote; Delete from here removes it and moves to the fork; after a reload the branches come back in their
  order.

### The picked line at a fork, single keys, and the list of keys (2026-10-11)

- **The picked line was hard to see:** ↑ and ↓ at a fork said "→ line 2 of 3" at the end of the status line, which the
  panel cut. Now the picked move has a dashed accent outline in the move list, on the game's move or a branch's dot,
  and the move list brings it into view. The status line no longer says it.
- **Single keys beside the Shift keys,** from the owner's question and other tools: Lichess (k and j, Shift + k and j),
  KaTrain (`gui/theme.py`: z and x beside the arrows, b back to the last branch point, n the next mistake), En Croissant
  (`src/state/keybinds.ts`: x and c the previous and the next branch), Sabaki (`src/menu.js`: Ctrl + ↑ and ↓ the
  forks). Every choice offered went in, since none clash: k and j for back and forward; b and n, [ and ], and Shift +
  k and j for the forks; x and c, and comma and period, for the line before and after. KaTrain's z and x stay out,
  because x is the line before here. Kept free: m and Shift + m (the next and the previous mistake), and Delete.
- **A list of keys and clicks,** as Lichess's "?": "?" opens it, and so does "Keys and clicks" in the display settings
  (its Keyboard group). A Bits UI dialog: Escape and a click outside close it.
- **Checked in Edge** with real keys at edge 61 of the sample game: ↓ marks "31... E7-G8x" with the dashed outline; ↓
  again and → enter "31... E11-G8"; x goes to the line before (E7-G8x); b back to the fork; n on to the game's end (no
  fork after); "?" opens the list, Escape closes it, and the settings' "Show" opens it.

### Move sounds, and progress bars that show the work runs (2026-10-11)

- **Progress bars:** Lichess shows a running task with `bar-glider` (`ui/lib/css/component/_bar-glider.scss`), a
  70-pixel light gleam that sweeps the bar every 3 seconds, hidden with reduced motion. The review's bar has it while
  its passes run, and the position's search bar while the position on screen is searched (the analysis's `focusing`).
  Design 06. Checked in Edge: at edge 112 the search bar has the gleam at "256 of 1,024 visits", and loses it at
  "1,024 visits".
- **Move sounds** (design 08), first decided with the owner: made in the browser (Web Audio), a tap for an edge, a snap
  for a cut, a chime for a closed region; played on a step forward, a move played, and a move clicked in the move list, and
  silent on other jumps; on by default with a switch and a volume slider. Lichess's sounds are not free (its
  `COPYING.md`: the standard set is a non-free exception), and a CC0 pack was the other choice.
- **Checked in Edge,** with the page's AudioContext watched: 60 steps forward from the start each play one sound; the
  18 cuts play the snap; 16 steps chime, each where the mover's area grows (one shows no change in the tag, which
  rounds a half-point gain); back, Home and End play none.
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
  Checked in Edge, in a 900 × 900 frame: the columns reach the chart (its bottom at 730); the header 200 pixels higher,
  with no change of the window, moves the chart to 921 and the columns stop at the board; the header back, they reach
  the chart again.
