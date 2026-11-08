<script lang="ts">
  // How a review works (designs 05, 10, 14 and 16), for a player who wants to know where the labels, the accuracy, the
  // hard positions and the meter come from: the rules and their numbers, in words, with the sources they follow. The
  // numbers are the code's (@abstractclass/analysis/labels.ts, model.ts, src/lib/analysis/engineSettings.ts): a change
  // there changes this page. The parts that Cyanotype's page shares are in @abstractclass/review/howReviews, with the
  // numbers from the code.
  import { PROSE } from "@abstractclass/site/prose.ts";
  import { SITE_NAME } from "#lib/edition.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import Accuracy from "@abstractclass/review/howReviews/Accuracy.svelte";
  import HardPositions from "@abstractclass/review/howReviews/HardPositions.svelte";
  import Losses from "@abstractclass/review/howReviews/Losses.svelte";
  import Meter from "@abstractclass/review/howReviews/Meter.svelte";
  import Searches from "@abstractclass/review/howReviews/Searches.svelte";
</script>

<PageMeta title="How a review works · {SITE_NAME}"
          description="How Hedge School reviews an Enclosure game: the engine's searches, the quality labels from Great to Blunder, the accuracy, hard positions and the likely edges' meter." />

<main class={PROSE}>
  <h1>How a review works</h1>
  <p>The engine, HedgeFund, searches every position of your game in your browser. For each position it estimates each
    player's chance to win, and the edges worth playing. A move's quality label compares the position before the move with the
    position after it. This page gives the rules and their numbers, and where each one comes from.</p>

  <Searches />

  <h2>The quality labels</h2>
  <Losses />
  <ul>
    <li><strong>Best:</strong> the engine's own first choice, whatever its loss. Two searches each have a small error,
      and the engine's own move should never read as a mistake.</li>
    <li><strong>Great:</strong> the only good move, which keeps the gain from the enemy's last turn. It is Best,
      and the engine's second choice is at least 10% worse. The second choice usually has few visits, so a search of
      the position after it, as deep as the position after your move, must confirm the gap. Until then the move is
      Best. Also, the engine's first choice must be more than 5% better for you than the position before the
      enemy's last turn. An only move that only holds the position is Best. The game's last move is never Great:
      nothing after it can confirm it. The first turn is never Great: no turn of the enemy comes before it.</li>
    <li><strong>A turn or an edge:</strong> a turn of two edges is one decision, so the review judges whole turns by
      default. "Review by" in the display settings judges each edge instead. A turn's loss is from its start to the
      position after its last edge, which equals the sum of its edges' losses.</li>
    <li><strong>Why win chance, not the lead:</strong> once a game is decided, a move changes the result little,
      whatever it does to the score. A loss of 30 in the lead matters less at a lead of 120 than at a lead of 20. The
      notes also give the loss in the lead, from the engine's estimate of the lead.</li>
    <li><strong>When a quality label shows:</strong> once the search of each position of the move reaches 256 visits. A
      deeper search can change it.</li>
  </ul>
  <p>The move list and the chart show Great, Inaccuracy, Mistake and Blunder, to stay quiet. The board shows every quality label.
    Under a Mistake or a Blunder, the engine's best line from that position shows as a variation.</p>

  <Accuracy />

  <HardPositions moves="edges" />

  <Meter moves="edges" />

  <h2>Where the rules come from</h2>
  <p>{SITE_NAME} follows tools that players already trust, and names each change it makes for Enclosure:</p>
  <ul>
    <li><strong>The engine:</strong> a search derived from <a href="https://github.com/lightvector/KataGo">KataGo</a>, with
      a network trained for Enclosure.</li>
    <li><strong>The bands:</strong> chess.com's, on the engine's win chance, as chess.com and Lichess judge moves.</li>
    <li><strong>The accuracy:</strong> <a href="https://lichess.org/page/accuracy">Lichess's</a> formula, with
      <a href="https://github.com/sanderland/katrain">KaTrain</a>'s weights.</li>
    <li><strong>Great:</strong> <a href="https://github.com/franciscoBSalgueiro/en-croissant">En Croissant</a>'s
      rule for "!": the only good move, which keeps the gain from the enemy's last turn.</li>
    <li><strong>The complexity:</strong> KaTrain's. <strong>The meter:</strong> Maia's Blunder Meter.</li>
    <li><strong>Turns of two edges</strong> have no model in chess or Go: judging whole turns is {SITE_NAME}'s own
      choice.</li>
  </ul>
  <p><a href="/notation">The notation page</a> describes the game records that the review reads.</p>
</main>

<SiteFooter />
