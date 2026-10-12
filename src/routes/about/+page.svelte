<script lang="ts">
  // About Hedge School (design 11).
  import { PROSE } from "#lib/prose.ts";
  import { DISCORD, SITE_NAME, SITE_VERSION } from "#lib/edition.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import Collie from "#lib/Collie.svelte";
</script>

<svelte:head><title>About {SITE_NAME}</title></svelte:head>

<main class={PROSE}>
  <h1>About {SITE_NAME}</h1>
  <p>{SITE_NAME} helps you learn Enclosure, the game of edges and enclosed regions played on
    <a href="https://meaf.us/sst1/">meaf.us</a> and <a href="https://constellation.blueshrimp.uk">Constellation</a>.
    Bring a game you played, and an engine reviews it: where the game turned, which turns cost you, and what was
    better.</p>
  <p>Enclosure is designed by webgoatguy, who <a href="https://youtu.be/BiVaY09xgZ4">introduces it in a video</a>. Its
    players meet in <a href={DISCORD}>webgoatguy's Discord</a>.</p>

  <h2>The schoolmaster</h2>
  <div class="flex items-center gap-4">
    <Collie size={96} label="A Border Collie" />
    <p class="my-0">The school is kept by a Border Collie.</p>
  </div>

  <h2 id="early-access">Early access</h2>
  <p>For now the site does one thing: it reviews your games. Puzzles and lessons come later. Tell us what works and what
    does not in <a href={DISCORD}>the Discord</a>.</p>

  <h2>How a review works</h2>
  <ul>
    <li><strong>Your game:</strong> paste its record on the home page, paste the export of Constellation's analysis
      board, or bring a meaf.us game with the <a href="/import">bookmarklet</a>. The records are described on
      <a href="/notation">the notation page</a>.</li>
    <li><strong>The engine</strong> runs in your browser, on your computer: nothing is sent to a server. A review takes
      a few minutes, first a quick look at every position, then a deeper search where it matters.</li>
    <li><strong>The labels</strong> judge each turn by how much it lowered your chance of winning. You can judge each
      edge instead, in the review's settings.</li>
  </ul>

  <h2>The engine</h2>
  <p>The engine, HedgeFund, is a neural network trained for Enclosure, with a search derived from KataGo, made in the
    enclosure-ai project. Its networks are named by version: HedgeFund 0.1 Lite, the default, and HedgeFund 0.1. The licences of what the site uses are on <a href="/notices">the notices page</a>.</p>

  <h2>This site</h2>
  <p>{SITE_NAME} is made independently of meaf.us and Constellation. What it keeps, and where, is on
    <a href="/privacy">the privacy page</a>. This is version {SITE_VERSION}.</p>
</main>

<SiteFooter />
