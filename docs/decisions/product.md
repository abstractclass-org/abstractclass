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
