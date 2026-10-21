<script lang="ts">
  // The notation page (design 11): the position notation and the game record notation, described for anyone who
  // writes a reader or a writer, as PGN's standard describes PGN. The notations are decided in the engine repository
  // (its docs/design/04-notation-and-protocol.md), which is private, so this page is their public description. A
  // change is decided there first, then this page follows (request 11).
  import { PROSE } from "#lib/prose.ts";
  import { SITE_NAME } from "#lib/edition.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import PageMeta from "#lib/PageMeta.svelte";

  const POSITIONS = `A10-D10 Q10-T10 b1 0/0 0
A10-D10,D10-E11* Q10-T10 r2 0/0 1
A10-D10,D10-E11* Q10-T10,Q10-T13+ r1 0/0 2
A10-D10,D10-E11,D10-F13+ Q10-T10,Q10-T13*,T10-T13* b1 0/4.5 4`;
  const RECORD = `[Event "meaf.us game"]
[Site "meaf.us"]
[Date "2026.10.12"]
[Round "-"]
[Blue "Ann"]
[Red "Ben"]
[Result "*"]
[TimeControl "60+15"]

1. D10-G10 2. N11-Q10 L10-N11 { Red builds toward the centre. }
3. D10-G9 G9-H10 (3. D10-F13 F13-G10) 4. N11-M13 M13-K12 *`;
  const BRANCH = "4. N9-Q10 L10-N9 (4... M12-N9)";
  const MARKED = "3. D10-G9 G9-H10? { Mistake. D10-F13 F13-G10 was best. } (3. D10-F13 F13-G10)";
  const COMMANDS = "3. D10-G9 { [%eval 0.58 +9.5 31.2] } G9-H10 { [%clk 0:00:52] [%eval 0.62 +12 30.8] }";
  const CONSTELLATION = "[B:A10-D10 R:P10-S10] D10-A7 P10-M10-J7 A7-A10,A7-D4 …";
</script>

<PageMeta title="The notation of Enclosure · {SITE_NAME}"
          description="The notation of Enclosure: points, edges, turns, positions and game records, for anyone who reads or writes Enclosure games." />

<main class={PROSE}>
  <h1>The notation of Enclosure</h1>
  <p>Two notations describe Enclosure. A <strong>position</strong> takes one line, as FEN describes a chess position. A
    <strong>game record</strong> holds a whole game, as PGN records a chess game. They come from the design of
    HedgeFund, the Enclosure engine that reviews games here. This page describes them for anyone who writes a program
    that reads or writes them. {SITE_NAME} reads game records in this notation, and positions on the Analysis board and in its board
    editor.</p>

  <h2>Points</h2>
  <p>The board has 19 × 19 points. A point is a column letter and a row number, as in Go's GTP:</p>
  <ul>
    <li><strong>Columns</strong> <code>A</code> to <code>T</code> without <code>I</code>, from left to right: <code>A</code>
      is the first column, <code>J</code> the ninth, <code>T</code> the nineteenth.</li>
    <li><strong>Rows</strong> <code>1</code> to <code>19</code>, from the bottom of the board as the players see
      it.</li>
  </ul>
  <p>Letters are upper case. A reader may accept lower case.</p>

  <h2>Edges and moves</h2>
  <ul>
    <li><strong>An edge</strong> is two points joined by <code>-</code>: <code>D10-E11</code>. The lower point comes
      first: the one in the earlier column, or in the lower row when the columns are the same. So an edge has one
      spelling everywhere. A reader may accept the points in the other order and sort them.</li>
    <li><strong>A move</strong> is an edge, or <code>pass</code>: a timeout, which forfeits the rest of the turn.</li>
    <li><strong>The cut mark:</strong> a move that cuts an opponent's edge may carry <code>x</code>:
      <code>D10-G10x</code>, as SAN writes <code>x</code> for a capture. The mark repeats what the position shows. A
      reader accepts a move with it or without it, and refuses it on a move that cuts nothing.</li>
  </ul>

  <h2>Turns</h2>
  <p>Blue moves first. Blue's first turn has one edge. Then the players take turns of two edges. The game ends after
    120 edges, so the last turn, Blue's, has one edge: a game has 61 turns, Blue's odd and Red's even. A timeout ends
    a turn early, and its forfeited edges still count toward the 120, so the order of turns never changes.</p>

  <h2>A position</h2>
  <p>One line of five fields, separated by single spaces:</p>
  <ol>
    <li><strong>Blue's edges</strong>, separated by commas, with no spaces. <code>-</code> when Blue has none (a cut can
      remove the last one).</li>
    <li><strong>Red's edges</strong>, the same.</li>
    <li><strong>The player to move, and the edges left in the turn:</strong> <code>b1</code>, <code>b2</code>,
      <code>r1</code> or <code>r2</code>. <code>b</code> is Blue, the first player, and <code>r</code> Red. A finished
      game (120 edges) has <code>r0</code>: the turn has no edges left, and the engine refuses to analyze it.</li>
    <li><strong>The scores,</strong> Blue's, <code>/</code>, then Red's: <code>0/4.5</code>. A score is the sum of a
      player's enclosed areas at each turn's end, so it can have a fraction. It is exact to the rules' rounding
      (10<sup>−9</sup>), with no trailing zeros.</li>
    <li><strong>The edge count:</strong> the edges played so far, from 0 to 120. A pass counts the edges it forfeits.</li>
  </ol>
  <p>A writer sorts each list by the edges' first points, then by their second points, a point by its column, then by
    its row. Two marks on an edge carry the turn:</p>
  <ul>
    <li><code>*</code>: <strong>protected</strong>, an edge of the last turn of the player who is not to move. The
      player to move cannot cut it during this turn.</li>
    <li><code>+</code>: <strong>placed</strong>, an edge of the turn in progress. It becomes protected when the turn
      ends.</li>
  </ul>
  <p>The start, then the positions after Blue's first turn, after Red's first edge, and after Blue's first edge of turn
    3, where Red's triangle scored 4.5:</p>
  <pre>{POSITIONS}</pre>
  <p>A position leaves out the earlier turns' edges, as FEN leaves out what only an engine needs. A program that needs
    them sends the moves played since a known position.</p>

  <h2>A game record</h2>
  <p>Tag pairs, a blank line, then the turns and the result:</p>
  <pre>{RECORD}</pre>

  <h3>Tags</h3>
  <p>A tag is <code>[Name "value"]</code>, one to a line. A writer escapes <code>"</code> and <code>\</code> in a value
    as <code>\"</code> and <code>\\</code>. The first seven come in this order, as PGN's Seven Tag Roster:</p>
  <table>
    <thead><tr><th>Tag</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td><code>Event</code></td><td>The event, or <code>?</code> when it is not known.</td></tr>
      <tr><td><code>Site</code></td><td>Where the game took place: <code>Constellation</code>, <code>meaf.us</code>, the
        game's own page (the review links to it), or <code>?</code>. A strategyjam.org game and a meaf.us game give
        their address. The address of a meaf.us game opens the game for a player who is logged in to meaf.us.</td></tr>
      <tr><td><code>Date</code></td><td><code>YYYY.MM.DD</code>, with <code>?</code> for unknown digits.</td></tr>
      <tr><td><code>Round</code></td><td>The round, or <code>-</code>.</td></tr>
      <tr><td><code>Blue</code>, <code>Red</code></td><td>The players' names, or <code>?</code> when a name is not
        known.</td></tr>
      <tr><td><code>Result</code></td><td>As the record's end (below).</td></tr>
    </tbody>
  </table>
  <p>Other tags, all optional:</p>
  <table>
    <tbody>
      <tr><td><code>BlueRating</code>, <code>RedRating</code></td><td>The players' ratings on the site where they
        played.</td></tr>
      <tr><td><code>Scores</code></td><td>The final scores, Blue's, <code>/</code>, then Red's.</td></tr>
      <tr><td><code>TimeControl</code></td><td>The clock: seconds at the start, <code>+</code>, seconds added each turn:
        <code>60+15</code>.</td></tr>
      <tr><td><code>Termination</code></td><td>How the game ended: <code>normal</code>, <code>resignation</code> or
        <code>forfeit</code>.</td></tr>
      <tr><td><code>GameId</code></td><td>The game's identifier on its site.</td></tr>
      <tr><td><code>Position</code></td><td>The start, in the position notation, when it is not the standard
        start (PGN's <code>FEN</code> tag).</td></tr>
      <tr><td><code>Rules</code></td><td>The variant, when the game does not follow the online rules (PGN's
        <code>Variant</code>).</td></tr>
      <tr><td><code>Annotator</code></td><td>Who annotated the game (PGN's tag): a person, or a program such as
        {SITE_NAME}.</td></tr>
    </tbody>
  </table>

  <h3>Turns</h3>
  <p>Each turn is its number and a dot, then its moves: <code>2. N11-Q10 L10-N11</code>. The number tells whose turn
    it is, so the record names no player.</p>

  <h3>Comments and branches</h3>
  <p>A comment is in braces, <code>{"{ … }"}</code>. A comment may also come before the first turn, after the tags,
    as a note on the whole game. A branch is in parentheses, <code>( … )</code>: other moves in place of a turn. Both
    can hold others. A branch follows the turn it changes, after that turn's last edge, its mark and its comments. Its
    first number tells where it leaves the line, and it is always the number of the turn before it:</p>
  <ul>
    <li><code>N.</code> starts at the turn's start, and replaces the whole turn: <code>3. D10-G9 G9-H10 (3. D10-F13
      F13-G10)</code>.</li>
    <li><code>N...</code> starts at the turn's second edge, and keeps its first edge:</li>
  </ul>
  <pre>{BRANCH}</pre>
  <p>means: at turn 4, after <code>N9-Q10</code>, <code>M12-N9</code> instead of <code>L10-N9</code>. Several branches
    of one turn follow it one after another.</p>

  <h3>Marks of a turn's quality</h3>
  <p>PGN's six marks judge a turn: <code>!!</code> brilliant, <code>!</code> good, <code>!?</code> interesting,
    <code>?!</code> dubious, <code>?</code> a mistake, <code>??</code> a blunder. A mark comes once, right after the
    turn's last edge (or its pass), after any cut mark, and before the comments and branches:
    <code>G9-G12x??</code>.</p>
  <pre>{MARKED}</pre>
  <p>A judgement of one edge stays in a comment. A reader accepts a mark after any edge, and may ignore it.
    {SITE_NAME}'s exports mark its labels by turn: Great <code>!</code>, Inaccuracy <code>?!</code>, Mistake
    <code>?</code> and Blunder <code>??</code>. Best, Excellent and Good have no mark, as PGN has none for them.</p>

  <h3>Commands in comments</h3>
  <p>A comment after a move can hold commands, as Lichess writes the clock and the evaluation:</p>
  <pre>{COMMANDS}</pre>
  <ul>
    <li><code>[%clk H:MM:SS]</code>: once a turn, after the turn's last edge, or after the pass that ends it. It gives
      the mover's time left as the turn ends, increment included: what the clock shows when the mover's next turn
      starts.</li>
    <li><code>[%eval W L S]</code>: the engine's view after the move, in three numbers:
      <ul>
        <li><code>W</code>: Blue's chance of winning, from 0 to 1.</li>
        <li><code>L</code>: the lead, in points: the komi that would make the game even. It carries its sign:
          <code>+</code> when Blue is ahead, <code>-</code> when Red is. A reader accepts it with or without the
          <code>+</code>.</li>
        <li><code>S</code>: the spread of the final margin, in points.</li>
      </ul>
      Each number can have any number of decimals.</li>
  </ul>

  <h3>The result</h3>
  <table>
    <tbody>
      <tr><td><code>b+28.5</code>, <code>r+12</code></td><td>Blue (Red) won by that many points.</td></tr>
      <tr><td><code>b+R</code>, <code>r+R</code></td><td>Blue (Red) won: the other player resigned.</td></tr>
      <tr><td><code>b+F</code>, <code>r+F</code></td><td>Blue (Red) won: the other player forfeited (left the game).</td></tr>
      <tr><td><code>0</code></td><td>The scores were equal.</td></tr>
      <tr><td><code>*</code></td><td>The game is not over, or the result is not known.</td></tr>
    </tbody>
  </table>
  <p>Nothing follows the result.</p>

  <h2>What else {SITE_NAME} reads</h2>
  <p><strong>A plain list of edges,</strong> without turn numbers: the turns follow from the rules.</p>

  <h3>Columns with I</h3>
  <p>This notation's columns skip <code>I</code>, as Go's do. Some sites letter their columns <code>A</code> to
    <code>S</code> with <code>I</code>. {SITE_NAME} also reads such a notation, and moves each column to its place in
    the alphabet without <code>I</code>: <code>P10</code> is <code>Q10</code>. A list of edges looks the same in both
    letterings, so {SITE_NAME} reads the other lettering only in a form that it knows:</p>
  <ul>
    <li><strong><a href="https://constellation.blueshrimp.uk">Constellation</a>'s export</strong> (its analysis board's Export): the start in
      brackets, then one item for each turn, two edges written as a path or apart with a comma.</li>
  </ul>
  <pre>{CONSTELLATION}</pre>

  <p>Another site can send a game to {SITE_NAME} with a link: see <a href="/developers">For developers</a>.</p>
</main>

<SiteFooter />
