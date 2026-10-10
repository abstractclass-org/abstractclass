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
