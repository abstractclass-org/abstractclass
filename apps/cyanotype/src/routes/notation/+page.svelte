<script lang="ts">
  // The notation page (design 33, items 5 to 10): the moves, their marks and the game record, described for anyone
  // who writes a reader or a writer, as Hedge School's notation page describes Enclosure's. The moves are
  // strategyjam.org's own strings. The record is Hedge School's form. The examples are made by hand, not taken from
  // strategyjam.org's archive: one game from the standard start, its moves legal and their marks right, by a model of
  // the rules of the engine repository's games/blueprints/README.md. The evaluations and the clock are made up.
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { ENGINE_NAME, SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  // The hexes within two steps of the origin, as the players see them (design 33, item 5): pointy-top, at
  // x = √3 (q + r / 2) and y = 1.5 r, in units of a hex's radius, with r down the screen.
  const R = 26; // a hex's radius, in the picture's pixels
  const HEXES = [-2, -1, 0, 1, 2].flatMap(r => [-2, -1, 0, 1, 2].filter(q => Math.abs(q + r) <= 2).map(q => ({
    q, r, x: R * Math.sqrt(3) * (q + r / 2), y: R * 1.5 * r,
  })));
  const CORNERS = Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k - Math.PI / 2;
    return `${(R * Math.cos(a)).toFixed(2)},${(R * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  const WIDTH = Math.ceil(R * Math.sqrt(3) * 5) + 4, HEIGHT = Math.ceil(R * 8) + 4;

  const START = "(0,0) (1,0) (-1,1) (0,1) (1,1) (-1,2) (0,2)";
  const RECORD = `[Event "Casual game"]
[Site "?"]
[Date "2026.10.25"]
[Round "-"]
[Blue "Ann"]
[Red "Ben"]
[Result "*"]

1. 1@-2,2 2. 2@3,1 3:0,0>3:1,-1 { Red changes a blueprint. }
3. 1@1,-3x 1@0,3x+8 (3. 2@1,-3x 1@0,3x+11) 4. 1@2,4x 3@0,6 *`;
  const VARIATION = "4. 1@2,4x 3@0,6 (4... 3@0,5x+10)";
  const MARKED = "3. 1@1,-3x 1@0,3x+8? { Mistake. 2@1,-3x 1@0,3x+11 was best. } (3. 2@1,-3x 1@0,3x+11)";
  const COMMANDS = "3. 1@1,-3x { [%eval 0.58 +9 31.2] } 1@0,3x+8 { [%clk 0:00:52] [%eval 0.64 +15 30.8] }";
</script>

<PageMeta title="The notation of Blueprints · {SITE_NAME}"
          description="The notation of Blueprints: the board's coordinates, the moves, their marks, turns and game records, for anyone who reads or writes Blueprints games." />

<main class={PROSE}>
  <h1>The notation of Blueprints</h1>
  <p>This page describes how {SITE_NAME} writes the moves of Blueprints and a whole game. The moves are
    strategyjam.org's own: its game page and its move list show the same strings. A <strong>game record</strong> holds
    a whole game, as PGN records a chess game. The page is for anyone who writes a program that reads or writes them.
    {SITE_NAME}'s review will read game records in this notation, and {ENGINE_NAME}, its engine, will speak its
    moves.</p>

  <h2>The board</h2>
  <p>The board is a grid of hexes with no edge. A hex is two numbers, <code>q,r</code>, in axial coordinates:</p>
  <ul>
    <li><strong>The hexes are pointy-top.</strong> The hex (q, r) is at x = √3 (q + r / 2) and y = 1.5 r, in units of a
      hex's radius. <code>q</code> grows to the right, and <code>r</code> grows down the screen. strategyjam.org draws
      its board so.</li>
    <li><strong>The origin,</strong> <code>0,0</code>, is between the two players' starting groups.</li>
    <li><strong>The six hexes touching</strong> (q, r) are (q ± 1, r), (q, r ± 1), (q + 1, r − 1) and
      (q − 1, r + 1).</li>
    <li><strong>A coordinate</strong> is an integer, with <code>-</code> when it is less than 0. A writer writes no
      <code>+</code> and no leading zeros.</li>
  </ul>
  <figure class="my-4">
    <svg viewBox="{-WIDTH / 2} {-HEIGHT / 2} {WIDTH} {HEIGHT}" width={WIDTH} height={HEIGHT} class="max-w-full h-auto"
         role="img" aria-label="The 19 hexes within two steps of the origin, each with its q and r.">
      {#each HEXES as { q, r, x, y } (`${q},${r}`)}
        {@const origin = q === 0 && r === 0}
        <g transform="translate({x.toFixed(2)} {y.toFixed(2)})">
          <polygon points={CORNERS} fill={origin ? "var(--panel-2)" : "var(--panel)"}
                   stroke={origin ? "var(--accent)" : "var(--border)"} stroke-width={origin ? 2 : 1} />
          <text text-anchor="middle" dominant-baseline="central" class="font-mono text-[11px]" fill="var(--text)">{q},{r}</text>
        </g>
      {/each}
    </svg>
    <figcaption class="text-sm text-muted">The hexes within two steps of the origin, each with its <code>q,r</code>.</figcaption>
  </figure>

  <h2>Blueprints</h2>
  <p>Each player holds three blueprints, numbered <code>1</code>, <code>2</code> and <code>3</code>. A blueprint is a
    shape of cells in its own frame, in the same axial coordinates as the board.</p>
  <ul>
    <li><strong>The anchor cell</strong> of a blueprint is its first cell in reading order: the least <code>r</code>,
      then the least <code>q</code>. It is the cell <code>0,0</code> of the blueprint's frame. Other cells can have a
      negative <code>q</code>.</li>
    <li><strong>After each edit,</strong> the rules put the blueprints back in their frames: the new anchor cell becomes
      <code>0,0</code>.</li>
    <li><strong>At the start,</strong> each blueprint is a star with a ring of six cells. In its frame, its cells are
      <code>{START}</code>, with the star at <code>0,1</code>. Blueprints 1 and 3 have a ring of Normal cells.
      Blueprint 2 has a ring of walls and stars in turn, three of each. The start also places each player's three
      blueprints on the board: the stars of Blue's blueprints 1, 2 and 3 are at (−6, 0), (−10, 0) and (−2, 0), and
      Red's at (6, 0), (10, 0) and (2, 0).</li>
  </ul>

  <h2>Moves</h2>
  <p>A move is one string with no space. There are three kinds:</p>
  <ul>
    <li><strong>A placement</strong> is <code>K@q,r</code>: blueprint <code>K</code>, with its anchor cell on the anchor
      hex (q, r) of the board. <code>1@-2,2</code> places blueprint 1 with its anchor cell on the anchor hex (−2, 2).
      The anchor hex is the hex that a player clicks on strategyjam.org: its "Dots" button marks these hexes.</li>
    <li><strong>An edit</strong> is <code>I:q,r&gt;J:q,r</code>: the cell at (q, r) of blueprint <code>I</code> moves to
      (q, r) of blueprint <code>J</code>. Both coordinates are in the blueprints' frames as they are before the edit.
      So one string names one edit, also when the edit moves a blueprint's anchor cell (<code>2:0,0&gt;2:1,2</code>), or
      puts a cell before it, with a negative coordinate (<code>1:0,0&gt;3:1,-1</code>). An empty blueprint takes a
      cell only at <code>0,0</code>: <code>3:1,0&gt;2:0,0</code>.</li>
    <li><strong>A pass</strong> is <code>pass</code>: a player's clock ran out. A pass is one move. The rules never
      offer it as a move to play.</li>
  </ul>
  <p><strong>Two edits can give the same hand.</strong> A string names one edit, but two different edits can leave the
    same blueprints. Some edits leave the hand as it was. So a program that compares two moves compares the positions
    after them, not only their strings.</p>

  <h2>The marks of a placement</h2>
  <p>A placement captures each opponent's cell touching it, but not a wall. The player scores the opponent's stars that
    it captures, times the player's own stars on the board before the move. Two marks after a placement tell what it
    did:</p>
  <ul>
    <li><code>x</code>: it captures cells. <code>1@1,-3x</code></li>
    <li><code>x+N</code>: it captures cells and scores N points. <code>1@0,3x+8</code></li>
  </ul>
  <p>A placement that captures a star and scores 0 has <code>x</code> alone: the player had no star on the board. A
    writer never writes <code>+0</code>. The marks repeat what the position shows. A reader accepts a placement with
    them or without them. It refuses a mark that the position does not confirm. An edit and a pass have no marks.</p>

  <h2>Turns</h2>
  <p>Blue moves first. Blue's first turn has one move. Then the players take turns of two moves. The game ends after
    120 moves, so the last turn, Blue's, has one move: a game has 61 turns, Blue's odd and Red's even.
    strategyjam.org numbers the moves, from 1 to 120. A game record numbers the turns, because the review gives quality
    labels to turns.</p>

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
      <tr><td><code>Site</code></td><td>Where the game took place: the game's own page, a site's name such as
        <code>strategyjam.org</code>, or <code>?</code>.</td></tr>
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
      <tr><td><code>Annotator</code></td><td>Who annotated the game (PGN's tag): a person, or a program such as
        {SITE_NAME}.</td></tr>
    </tbody>
  </table>

  <h3>Turns</h3>
  <p>Each turn is its number and a dot, then its moves: <code>2. 2@3,1 3:0,0&gt;3:1,-1</code>. The number tells whose
    turn it is, so the record names no player.</p>

  <h3>Comments and variations</h3>
  <p>A comment is in braces, <code>{"{ … }"}</code>. A comment can also come before the first turn, after the tags, as
    a note on the whole game. A variation is in parentheses, <code>( … )</code>: other moves in place of a turn. Both
    can hold others. A variation follows the turn that it changes, after that turn's last move, its marks and its
    comments. Its first number tells where it leaves the line, and it is always the number of the turn before it:</p>
  <ul>
    <li><code>N.</code> starts at the turn's start, and replaces the whole turn:
      <code>3. 1@1,-3x 1@0,3x+8 (3. 2@1,-3x 1@0,3x+11)</code>.</li>
    <li><code>N...</code> starts at the turn's second move, and keeps its first move:</li>
  </ul>
  <pre>{VARIATION}</pre>
  <p>means: at turn 4, after <code>1@2,4x</code>, <code>3@0,5x+10</code> in place of <code>3@0,6</code>. Several
    variations of one turn follow it one after another.</p>

  <h3>Quality marks of a turn</h3>
  <p>PGN's six marks judge a turn: <code>!!</code> brilliant, <code>!</code> good, <code>!?</code> interesting,
    <code>?!</code> dubious, <code>?</code> a mistake, <code>??</code> a blunder. A mark comes once, right after the
    turn's last move, after the placement's marks, and before the comments and variations:
    <code>1@0,3x+8??</code>.</p>
  <pre>{MARKED}</pre>
  <p>A judgement of one move stays in a comment. A reader accepts a mark after any move, and can ignore it. The review
    will mark its quality labels by turn, as Hedge School's does: Great <code>!</code>, Inaccuracy <code>?!</code>,
    Mistake <code>?</code> and Blunder <code>??</code>. Best, Excellent and Good have no mark, as PGN has none for them.</p>

  <h3>Commands in comments</h3>
  <p>A comment after a move can hold commands, as Lichess writes the clock and the evaluation:</p>
  <pre>{COMMANDS}</pre>
  <ul>
    <li><code>[%clk H:MM:SS]</code>: once a turn, after the turn's last move, or after the pass that ends it. It gives
      the mover's time left as the turn ends, increment included: what the clock shows when the mover's next turn
      starts.</li>
    <li><code>[%eval W L S]</code>: the engine's view after the move, in three numbers:
      <ul>
        <li><code>W</code>: Blue's chance of winning, from 0 to 1.</li>
        <li><code>L</code>: the lead, in points. It carries its sign: <code>+</code> when Blue is ahead, <code>-</code>
          when Red is. A reader accepts it with or without the <code>+</code>.</li>
        <li><code>S</code>: the spread of the final margin, in points.</li>
      </ul>
      Each number can have any number of decimals.</li>
  </ul>

  <h3>The result</h3>
  <table>
    <tbody>
      <tr><td><code>b+24</code>, <code>r+12</code></td><td>Blue (Red) won by that many points.</td></tr>
      <tr><td><code>b+R</code>, <code>r+R</code></td><td>Blue (Red) won: the other player resigned.</td></tr>
      <tr><td><code>b+F</code>, <code>r+F</code></td><td>Blue (Red) won: the other player forfeited (left the game).</td></tr>
      <tr><td><code>0</code></td><td>The scores were equal: a draw.</td></tr>
      <tr><td><code>*</code></td><td>The game is not over, or the result is not known.</td></tr>
    </tbody>
  </table>
  <p>Nothing follows the result.</p>

  <h3>A plain list of moves</h3>
  <p>A reader also accepts the moves alone, one after another, without tags and turn numbers: the turns follow from
    the rules.</p>

  <h2>Positions</h2>
  <p>Blueprints has no position notation yet, as FEN gives a chess position. It comes with a board editor, and with
    games that start from a position that is not the standard start. Until then, a game record starts from the standard
    start, and a reader refuses a <code>Position</code> tag.</p>
</main>

<SiteFooter />
