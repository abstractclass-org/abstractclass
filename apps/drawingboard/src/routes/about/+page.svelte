<script lang="ts">
  // About Drawing Board (design 33): the game, the engine, the names, and the site's sister site.
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { ENGINE_NAME, SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
</script>

<PageMeta title="About · {SITE_NAME}"
          description="What Drawing Board is: a site that helps you learn Blueprints, where an engine in your browser will review your games." />

<main class={PROSE}>
  <h1>About {SITE_NAME}</h1>
  <p>{SITE_NAME} helps you learn Blueprints, the game of the Fall 2026 strategy jam on
    <a href="https://strategyjam.org">strategyjam.org</a>. The site is new. For now it describes the game's
    <a href="/notation">notation</a>. Reviews of your games and an Analysis board come next.</p>

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
  <p>{ENGINE_NAME} is the engine that will review your games, and later the bot that you can practice against. It is
    a neural network trained for Blueprints, with a search from <a href="https://github.com/lightvector/KataGo">KataGo</a>.
    It will run in your browser, on your computer, so a review needs no server.</p>

  <h2>The names</h2>
  <p>A drawing board is where an architect draws blueprints. "Back to the drawing board" is what a player says after a
    lost game. Stamp duty is a tax on property, and a stamp is the game's main move.</p>

  <h2>Hedge School</h2>
  <p>{SITE_NAME} is the sister site of <a href="https://hedgeschool.abstractclass.org">Hedge School</a>, which helps
    you learn Enclosure. The two sites share their design and their code. Only the parts of each game are
    different.</p>

  <h2>Changes</h2>
  <p>Everything here can change: the pages and their addresses, the notation, and what the site keeps in your
    browser.</p>
</main>

<SiteFooter />
