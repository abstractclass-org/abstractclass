<script lang="ts">
  // How a review works on Cyanotype (design 33, "How a review works"), as Hedge School's page (its designs 05, 10, 14
  // and 16): where the labels, the accuracy, the hard positions and the meter come from, for Blueprints. The sections
  // that both sites share are in @abstractclass/review/howReviews, with the numbers from the code (cache.ts,
  // settings.ts, labels.ts). This page has what differs for Blueprints: its engine, the turns of two moves, the two
  // moves that give one position (design 33, item 9 of "Decision": one row, Best for either, the prior counted once),
  // an edit's likelihood (the engine repository's games/blueprints/README.md: a candidate edit has its pick's prior),
  // no opening book, and the examples of the lead and of the hard positions, from the stored review of the test game
  // (apps/hedgeschool/tests/fixtures/cyanotype-review.json, the label snapshot's, with the review's code: the
  // decision log, docs/decisions/product.md, "Cyanotype's How a review works page", gives the numbers).
  import { LABEL_VISITS } from "@abstractclass/analysis/cache.ts";
  import { KEPT_GAIN, ONLY_MOVE_GAP } from "@abstractclass/analysis/labels.ts";
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import Accuracy from "@abstractclass/review/howReviews/Accuracy.svelte";
  import HardPositions from "@abstractclass/review/howReviews/HardPositions.svelte";
  import Losses from "@abstractclass/review/howReviews/Losses.svelte";
  import Meter from "@abstractclass/review/howReviews/Meter.svelte";
  import Searches from "@abstractclass/review/howReviews/Searches.svelte";
  import { ENGINE_NAME, SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  const pct = (v: number) => `${Math.round(100 * v)}%`;
</script>

<PageMeta title="How a review works · {SITE_NAME}"
          description="How Cyanotype reviews a Blueprints game: the engine's searches, the quality labels from Great to Blunder, the accuracy, hard positions and the likely moves' meter." />

<main class={PROSE}>
  <h1>How a review works</h1>
  <p>The engine, {ENGINE_NAME}, searches every position of your game in your browser. For each position it estimates
    each player's chance to win, and the moves worth playing. A move's quality label compares the position before the
    move with the position after it. This page gives the rules and their numbers, and where each one comes from.</p>

  <Searches />
  <p>Blueprints has no opening book on {SITE_NAME}, so the engine searches every position itself, from the first
    move.</p>

  <h2>The quality labels</h2>
  <Losses />
  <ul>
    <li><strong>Best:</strong> the engine's own first choice, whatever its loss. Two searches each have a small error,
      and the engine's own move should never read as a mistake.</li>
    <li><strong>Two moves that give one position</strong> are one move. Two edits can leave the same blueprints, and
      two placements of equal blueprints on one anchor hex fill the same hexes. If one of them is the engine's first
      choice, both are Best. The candidates table gives them one row, marked ⇅.</li>
    <li><strong>Great:</strong> the only good move, which keeps the gain from the opponent's last turn. It is Best,
      and the engine's second choice is at least {pct(ONLY_MOVE_GAP)} worse. The second choice usually has few visits,
      so a search of the position after it, as deep as the position after your move, must confirm the gap. Until then
      the move is Best. Also, the engine's first choice must be more than {pct(KEPT_GAIN)} better for you than the
      position before the opponent's last turn. An only move that only holds the position is Best. The game's last
      move is never Great: nothing after it can confirm it. The first turn is never Great: no turn of the opponent
      comes before it.</li>
    <li><strong>A turn or a move:</strong> Blue's first turn has one move, and each later turn has two. A turn's two
      moves are one decision, so the review judges whole turns by default. "Review by" in the display settings judges
      each move instead. A turn's loss is from its start to the position after its last move, which equals the sum of
      its moves' losses.</li>
    <li><strong>Why win chance, not the lead:</strong> once a game is decided, a move changes the result little,
      whatever it does to the score. In a game of {ENGINE_NAME} against itself, Blue's move <code>2@-1,-7x+9</code> in
      turn 5 lost 41 points of the lead in a level game: 8% of win chance, an Inaccuracy. In turn 17, 67 points behind,
      Blue's move <code>2@4,-31x</code> lost 40 points: 3% of win chance, Good. The notes also give the loss in the
      lead, from the engine's estimate of the lead in points.</li>
    <li><strong>When a quality label shows:</strong> once the search of each position of the move reaches
      {LABEL_VISITS} visits. A deeper search can change it.</li>
  </ul>
  <p>The move list and the chart show Great, Inaccuracy, Mistake and Blunder, to stay quiet. The board shows every
    quality label. Under a Mistake or a Blunder, the engine's best line from that position shows as a variation.</p>

  <Accuracy />

  <HardPositions moves="moves">
    <p>In the game of {ENGINE_NAME} against itself above, to the end of turn 20, 4 of the 39 positions are hard. Each move played in them is an
      Inaccuracy or a Mistake.</p>
    <p>An edit counts by the cell that it moves: the network gives its likelihood to that cell, whatever its new
      place. Two moves that give one position count once. The meter below counts the moves in the same way.</p>
  </HardPositions>

  <Meter moves="moves" />

  <h2>Where the rules come from</h2>
  <p>{SITE_NAME} follows tools that players already trust, and names each change it makes for Blueprints:</p>
  <ul>
    <li><strong>The engine:</strong> {ENGINE_NAME}, a search derived from
      <a href="https://github.com/lightvector/KataGo">KataGo</a>, with a network trained for Blueprints.</li>
    <li><strong>The bands:</strong> chess.com's, on the engine's win chance, as chess.com and Lichess judge moves.</li>
    <li><strong>The accuracy:</strong> <a href="https://lichess.org/page/accuracy">Lichess's</a> formula, with
      <a href="https://github.com/sanderland/katrain">KaTrain</a>'s weights.</li>
    <li><strong>Great:</strong> <a href="https://github.com/franciscoBSalgueiro/en-croissant">En Croissant</a>'s
      rule for "!": the only good move, which keeps the gain from the opponent's last turn.</li>
    <li><strong>The complexity:</strong> KaTrain's. <strong>The meter:</strong> Maia's Blunder Meter.</li>
    <li><strong>Turns of two moves</strong> have no model in chess or Go: judging whole turns is {SITE_NAME}'s own
      choice.</li>
    <li><strong>Two moves that give one position</strong> are one move: {SITE_NAME}'s own rule, because Blueprints
      can reach one position by two moves of different names.</li>
  </ul>
  <p><a href="/notation">The notation page</a> describes the game records that the review reads.</p>
</main>

<SiteFooter />
