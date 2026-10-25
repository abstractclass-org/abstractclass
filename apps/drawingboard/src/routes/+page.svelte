<script lang="ts">
  // The home page (design 33): what Drawing Board is and what is coming, in plain web writing. No sample game: the
  // board comes with abscls-8tl1.5, and a game with the review.
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { ENGINE_NAME, SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
</script>

<PageMeta title="{SITE_NAME}: learn Blueprints"
          description="Drawing Board helps you learn Blueprints, the strategy jam game. Reviews of your games, by an engine that runs in your browser, are on the way." />

<main class={PROSE}>
  <h1>Back to the drawing board</h1>
  <p class="text-lg">{SITE_NAME} is a place to get better at Blueprints, the game of strategyjam.org's Fall 2026
    strategy jam. Soon you'll be able to bring a game you played, and see where it turned, which moves cost you points,
    and what you could have played instead.</p>

  <h2>What's coming</h2>
  <p>We're building the site now. These come first:</p>
  <ul>
    <li><strong>Reviews of your games.</strong> Paste a game, or bring one from strategyjam.org, and each turn gets a
      quality label such as Best, Mistake or Blunder.</li>
    <li><strong>An Analysis board.</strong> Try your own ideas from any position, and see what the engine would play.</li>
  </ul>
  <p>Practice games against {ENGINE_NAME}, lessons and puzzles come later.</p>

  <h2>Reviews in your browser</h2>
  <p>{ENGINE_NAME}, the engine behind the reviews, will run in your browser. It will review your games on your
    computer, and you will not need an account.</p>

  <p>Until the reviews are ready, <a href="/notation">the notation page</a> shows how the site writes moves and games,
    and <a href="/about">About</a> tells you more about the site.</p>
</main>

<SiteFooter />
