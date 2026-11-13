<script lang="ts">
  // About Cyanotype (design 33): what the site does, the logo's full print at 96 pixels with a sentence on its name
  // (as Hedge School's About page shows its collie), the early access (the header's "Early Access" link leads to its
  // section, as Hedge School's), the game, how a review works (with the link to its page, as Hedge School's) and the
  // engine.
  import Logo from "#lib/brand/Logo.svelte";
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { ENGINE_NAME, SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
</script>

<PageMeta title="About · {SITE_NAME}"
          description="What Cyanotype is: a site that helps you learn Blueprints, with practice games, reviews of your games and an Analysis board, by an engine that runs in your browser." />

<main class={PROSE}>
  <h1>About {SITE_NAME}</h1>
  <p>{SITE_NAME} helps you learn Blueprints, the game of the Fall 2026 strategy jam on
    <a href="https://strategyjam.org">strategyjam.org</a>.</p>
  <ul>
    <li><strong><a href="/practice">Practice</a>:</strong> play {ENGINE_NAME}, the site's bot, at the strength that you
      choose.</li>
    <li><strong><a href="/review">The review</a>:</strong> bring a game from strategyjam.org with the
      <a href="/tools">tools</a>. The engine shows where the game turned, which moves cost you, and what was better.</li>
    <li><strong><a href="/analysis">The Analysis board</a>:</strong> play any line, and the engine searches the position
      on the screen.</li>
  </ul>

  <h2>The cyanotype</h2>
  <div class="flex items-center gap-4">
    <Logo size={96} label="A cyanotype of a blueprint" />
    <p class="my-0">A cyanotype is a print in white on blue, the print that made the first blueprints. The logo is a
      cyanotype of a blueprint that each player holds at the start: a star in its ring of six cells.</p>
  </div>

  <h2 id="early-access">Early access</h2>
  <p><strong>Everything here can change:</strong> the pages and their addresses, the notation, the quality labels and how
    they judge a move, the engine and its network, the files and links that the site makes, and what it keeps in your
    browser. After a change, an old link or file can stop working, and a review can read differently.</p>
  <p>For now the site has Practice against {ENGINE_NAME}, reviews of your games from strategyjam.org, and an Analysis
    board with a board editor. Lessons and puzzles come later.</p>

  <h2>The game</h2>
  <p>Blueprints uses a grid of hexes with no edge. Each player holds three blueprints: shapes of cells that the
    player can use again and again.</p>
  <ul>
    <li><strong>A placement</strong> puts a copy of a blueprint on empty hexes touching the player's own cells. It
      captures the opponent's cells touching it, but not walls.</li>
    <li><strong>A score</strong> comes from the stars that a placement captures, times the player's own stars on the
      board.</li>
    <li><strong>An edit</strong> moves one cell of a blueprint, inside the blueprint or to another one.</li>
  </ul>
  <p>Blue makes one move, then each player makes two moves a turn. The game ends after 120 moves.</p>

  <h2>How a review works</h2>
  <ul>
    <li><strong>Your game:</strong> paste its record in the <a href="/review">Review tab</a>, or bring a game from
      strategyjam.org with the <a href="/tools">tools</a>. <a href="/notation">The notation page</a> describes the
      records.</li>
    <li><strong>The engine</strong> takes a quick look at every position first, then searches each position
      deeper.</li>
    <li><strong>The quality labels</strong> judge each turn by how much it lowered your chance of winning. You can judge
      each move instead, in the review's settings.</li>
  </ul>
  <p>The rules and their numbers are on <a href="/how-reviews-work">How a review works</a>.</p>

  <h2>The engine</h2>
  <p>{ENGINE_NAME} is the engine of the review and the Analysis board, and the bot in Practice. It is a neural network
    trained for Blueprints, with a search from <a href="https://github.com/lightvector/KataGo">KataGo</a>. It runs in
    your browser, on your computer, so it needs no server.</p>
</main>

<SiteFooter />
