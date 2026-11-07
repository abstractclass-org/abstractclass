<script lang="ts">
  // About Cyanotype (design 33): what the site does, the early access (the header's "Early Access" link leads to its
  // section, as Hedge School's), the game and the engine.
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

  <h2>The engine</h2>
  <p>{ENGINE_NAME} is the engine of the review and the Analysis board, and the bot in Practice. It is a neural network
    trained for Blueprints, with a search from <a href="https://github.com/lightvector/KataGo">KataGo</a>. It runs in
    your browser, on your computer, so it needs no server.</p>
</main>

<SiteFooter />
