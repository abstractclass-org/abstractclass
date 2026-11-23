<script lang="ts">
  // The notation page (design 34, "The pages"): Tak's own formats, PTN for moves and games and TPS for a position, as
  // the US Tak Association's pages give them, with links to both. No notation of Mistak's own. The page also gives the
  // site's short form of a move (design 34, "Decision", item 4), its marks (item 5), its record's tags (item 6) and its
  // position's field (item 7). The facts of PTN and TPS are the engine repository's research
  // (games/tak/docs/research/ptn-ninja.md, section 5). The examples are written by hand (design 34, item 14).
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  const PTN = "https://ustak.org/portable-tak-notation/";
  const TPS = "https://ustak.org/tak-positional-system-tps/";

  // A game's start, written by hand: White's road of flats on rank 3 is one square short after move 7, so the move
  // carries the mark of tak. Black's capstone flattens White's standing stone in move 5.
  const RECORD = `[Size "6"]
[Komi "2"]
[Player1 "Ana"]
[Player2 "Bo"]

1. a6 f1
2. c3 d4
3. d3 c4 {Black builds towards the centre.}
4. Sd5 Cc5
5. e3 c5>*
6. b3 e4
7. a3' f3`;
  const EMPTY = "x6/x6/x6/x6/x6/x6 1 1";
  const AFTER_ONE = "2,x5/x6/x6/x6/x6/x5,1 1 2";
</script>

<PageMeta title="The notation of Tak · {SITE_NAME}"
          description="Tak's notation as Mistak reads and writes it: PTN for moves and games, and TPS for a position." />

<main class={PROSE}>
  <h1>The notation of Tak</h1>
  <p>Tak has its own notation, and {SITE_NAME} uses it as it is: Portable Tak Notation (PTN) for moves and games, and
    the Tak Positional System (TPS) for a position. The US Tak Association keeps both:
    <a href={PTN}>its page on PTN</a> and <a href={TPS}>its page on TPS</a>. This page gives a summary of both, and the
    form in which {SITE_NAME} writes them.</p>

  <h2>The board</h2>
  <p>A square is its file, a letter from <code>a</code>, then its rank, a number from <code>1</code>: from
    <code>a1</code> to <code>e5</code> on 5 × 5, and from <code>a1</code> to <code>f6</code> on 6 × 6. The square
    <code>a1</code> is the lower left corner on White's side. The files go to the right and the ranks go up, as White
    sees the board. White is the first player, and Black the second.</p>

  <h2>Moves</h2>
  <ul>
    <li><strong>A placement</strong> is the stone, then the square: <code>a1</code> puts a flat stone on a1,
      <code>Sd3</code> a standing stone on d3, and <code>Cb4</code> a capstone on b4. A flat stone can also be written
      with its letter: <code>Fa1</code>.</li>
    <li><strong>A stack move</strong> is the number of stones, the square, the direction, then the stones that drop on
      each square of the path. <code>3b2+111</code> takes three stones from b2 up, and drops one on b3, one on b4 and
      one on b5. <code>4c3&gt;</code> takes four stones from c3 and drops all four on d3.</li>
  </ul>
  <table>
    <thead><tr><th>Direction</th><th>The stack moves</th></tr></thead>
    <tbody>
      <tr><td><code>+</code></td><td>up: to a higher rank</td></tr>
      <tr><td><code>-</code></td><td>down: towards rank 1</td></tr>
      <tr><td><code>&lt;</code></td><td>left: towards file a</td></tr>
      <tr><td><code>&gt;</code></td><td>right: away from file a</td></tr>
    </tbody>
  </table>
  <p>PTN lets a record leave out two parts. The number of stones can go when it is 1: <code>a1&gt;</code> moves one
    stone from a1 to b1. The drops can go when all the stones drop on the next square, as in <code>4c3&gt;</code>.</p>

  <h3>The form that {SITE_NAME} writes</h3>
  <p>{SITE_NAME} writes each move in one form, the short one, which PTN Ninja also writes: no <code>F</code>, no number
    of 1, and no drops when all the stones drop on the next square. So it writes <code>a1</code>,
    <code>c3&gt;</code> and <code>3b2+12</code>. It reads every form that PTN allows, and reads it as the short form:
    <code>1e4&lt;1</code> is <code>e4&lt;</code>.</p>

  <h2>Marks</h2>
  <p>A mark comes at the end of a move.</p>
  <ul>
    <li><code>*</code>: the move's capstone flattened a standing stone. {SITE_NAME} writes it on each flattening, as the
      PTN page recommends most strongly. It refuses a record with a <code>*</code> on a move that flattens
      nothing.</li>
    <li><code>'</code>: tak, a road on the next move. <code>"</code> or <code>''</code>: Tinuë, a tak that the
      opponent cannot stop. {SITE_NAME} reads both marks, and does not check them.</li>
    <li><code>!!</code>, <code>!</code>, <code>!?</code>, <code>?!</code>, <code>?</code> and <code>??</code>: a
      judgement of the move, from brilliant to a blunder. The review marks its quality labels with them: Great
      <code>!</code>, Inaccuracy <code>?!</code>, Mistake <code>?</code> and Blunder <code>??</code>. Best, Excellent
      and Good have no mark.</li>
  </ul>

  <h2>A game record</h2>
  <p>A record is its tags, one on each line, then its moves:</p>
  <pre>{RECORD}</pre>
  <ul>
    <li><strong>The moves</strong> come in pairs, one move of each player, after a number and a dot, as in chess. In the
      first pair, each player places a flat stone of the opponent's: <code>1. a6 f1</code> puts a Black stone on a6
      and a White stone on f1.</li>
    <li><strong>A comment</strong> is in braces, <code>{"{ … }"}</code>, between two moves.</li>
    <li><strong>The tags</strong> that {SITE_NAME} reads: <code>Size</code>, the board's width (<code>5</code> or
      <code>6</code>), <code>Komi</code>, flats or half flats for Black (<code>2</code>, <code>2.5</code>),
      <code>Opening</code>, <code>Player1</code> and <code>Player2</code>, <code>Rating1</code> and
      <code>Rating2</code>, <code>Date</code>, <code>Result</code>, <code>Site</code>, <code>PlayTakID</code>, the
      game's number on playtak.com, and <code>TPS</code>, a start other than the empty board.</li>
  </ul>
  <p>{SITE_NAME} reviews the sizes, the opening and the komi that its engine learned. It refuses a record of another
    size, another opening or a komi outside that range, and says why: an engine gives no true values for a game that it
    did not learn.</p>

  <h3>The result</h3>
  <table>
    <tbody>
      <tr><td><code>R-0</code>, <code>0-R</code></td><td>White (Black) won by a road.</td></tr>
      <tr><td><code>F-0</code>, <code>0-F</code></td><td>White (Black) won on flats.</td></tr>
      <tr><td><code>1-0</code>, <code>0-1</code></td><td>White (Black) won another way: the other player resigned, or ran
        out of time.</td></tr>
      <tr><td><code>1/2-1/2</code></td><td>A draw.</td></tr>
    </tbody>
  </table>
  <p>The result comes after the last move, and in the <code>Result</code> tag. A record with no result, or with
    <code>*</code>, is a game that is not over. {SITE_NAME} reviews it too.</p>

  <h2>A position</h2>
  <p>TPS gives a position in one line of three fields, separated by single spaces: the board, the player to move
    (<code>1</code> for White, <code>2</code> for Black), and the number of the next pair of moves. The empty board of
    6 × 6, with White to move first:</p>
  <pre>{EMPTY}</pre>
  <ul>
    <li><strong>The rows</strong> start at the top rank, and a <code>/</code> separates them. A <code>,</code>
      separates the squares of a row.</li>
    <li><strong>An empty square</strong> is <code>x</code>, and <code>x3</code> is three empty squares.</li>
    <li><strong>A stack</strong> is its stones from the bottom up, <code>1</code> for a White stone and <code>2</code>
      for a Black one: <code>12</code> is a Black flat stone on a White one. <code>S</code> or <code>C</code> after the
      last digit makes the top stone a standing stone or a capstone: <code>2211C</code>.</li>
  </ul>
  <p>The position after <code>1. a6 f1</code>, with White to move in the second pair:</p>
  <pre>{AFTER_ONE}</pre>
  <p>TPS has no komi and no opening. A record's <code>Komi</code> and <code>Opening</code> tags give them with the
    <code>TPS</code> tag.</p>
</main>

<SiteFooter />
