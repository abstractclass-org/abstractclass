<script lang="ts">
  // How a review works on Mistak (design 34, "The pages"), as Hedge School's and Cyanotype's page. The sections that
  // the sites share are in @abstractclass/review/howReviews. This page has what differs for Tak: each move is judged
  // (design 34, "What the sites share", item 3), and a draw counts as half a win (design 34, "Draws"). Its examples
  // come from reviewed games once the engine has a trained network (abscls-shfz.18.18), as Cyanotype's come from its
  // test game.
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import Accuracy from "@abstractclass/review/howReviews/Accuracy.svelte";
  import HardPositions from "@abstractclass/review/howReviews/HardPositions.svelte";
  import QualityLabels from "@abstractclass/review/howReviews/QualityLabels.svelte";
  import Meter from "@abstractclass/review/howReviews/Meter.svelte";
  import Searches from "@abstractclass/review/howReviews/Searches.svelte";
  import { ENGINE_NAME, SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
</script>

<PageMeta title="How a review works · {SITE_NAME}"
          description="How Mistak reviews a Tak game: the engine's searches, the quality labels from Great to Blunder, the accuracy, hard positions and the likely moves' meter." />

<main class={PROSE}>
  <h1>How a review works</h1>
  <p>The engine, {ENGINE_NAME}, searches every position of your game in your browser. For each position it estimates
    each player's chance to win, and the moves worth playing. A move's quality label compares the position before the
    move with the position after it. This page gives the rules and their numbers, and where each one comes from.</p>

  <Searches />
  <p>Tak has no opening book on {SITE_NAME}, so the engine searches every position itself, from the first move.</p>

  <QualityLabels opponent="opponent">
    {#snippet afterGreat()}
      <li><strong>Each move:</strong> a turn of Tak is one move. PTN numbers the moves in pairs, one move of each
        player, as chess does. The review judges each move.</li>
      <li><strong>A draw is half a win:</strong> the engine gives the chance of each result: a win, a draw and a loss.
        The win chance counts a draw as half a win, as KataGo counts a game with no result. So a move that turns a won
        game into a draw loses half of the win chance.</li>
      <li><strong>Why win chance, not the flats:</strong> once a game is decided, a move changes the result little,
        whatever it does to the count of flats. A road also ends the game at once, with no count.</li>
    {/snippet}
  </QualityLabels>

  <Accuracy />

  <HardPositions moves="moves" />
  <p>Each placement and each stack move with its drops is a move of its own: the network gives each one its
    likelihood. The meter below counts the moves in the same way.</p>

  <Meter moves="moves" />

  <h2>Where the rules come from</h2>
  <p>{SITE_NAME} follows tools that players already trust, and names each change it makes for Tak:</p>
  <ul>
    <li><strong>The engine:</strong> {ENGINE_NAME}, a search derived from
      <a href="https://github.com/lightvector/KataGo">KataGo</a>, with a network trained for Tak.</li>
    <li><strong>The bands:</strong> chess.com's, on the engine's win chance, as chess.com and Lichess judge moves.</li>
    <li><strong>The accuracy:</strong> <a href="https://lichess.org/page/accuracy">Lichess's</a> formula, with
      <a href="https://github.com/sanderland/katrain">KaTrain</a>'s weights.</li>
    <li><strong>Great:</strong> <a href="https://github.com/franciscoBSalgueiro/en-croissant">En Croissant</a>'s
      rule for "!": the only good move, which keeps the gain from the opponent's last turn.</li>
    <li><strong>The complexity:</strong> KaTrain's. <strong>The meter:</strong> Maia's Blunder Meter.</li>
    <li><strong>A draw as half a win:</strong> KataGo's count of a game with no result.</li>
  </ul>
  <p><a href="/notation">The notation page</a> describes the game records that the review reads.</p>
</main>

<SiteFooter />
