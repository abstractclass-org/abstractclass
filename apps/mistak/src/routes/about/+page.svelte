<script lang="ts">
  // About Mistak (design 34): what the site is for, the logo's full drawing at 96 pixels with a sentence on it (as
  // Hedge School's About page shows its collie and Cyanotype's its print), the early access (the header's "Early
  // Access" link leads to its section, as on both sites), the game, how a review works (with the link to its page) and
  // the engine. The game's facts are design 34's ("Tak, as the site needs it"). The review, the Analysis board and
  // Practice come with the engine (design 34, "Before the network"), so this page says what comes, and what is here
  // now.
  import Logo from "#lib/brand/Logo.svelte";
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { ENGINE_NAME, SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
</script>

<PageMeta title="About · {SITE_NAME}"
          description="What Mistak is: a site that helps you learn Tak, with reviews of your games and an Analysis board, by an engine that runs in your browser." />

<main class={PROSE}>
  <h1>About {SITE_NAME}</h1>
  <p>{SITE_NAME} helps you learn Tak, the game of roads and stacks. When its engine is ready, the site has:</p>
  <ul>
    <li><strong>The review:</strong> bring a game from <a href="https://playtak.com">playtak.com</a> by its number,
      paste its record, or paste a link to <a href="https://ptn.ninja">PTN Ninja</a>. The engine shows where the game
      turned, which moves cost you, and what was better.</li>
    <li><strong>The Analysis board:</strong> play any line, and the engine searches the position on the screen.</li>
    <li><strong>Practice:</strong> play {ENGINE_NAME}, the site's bot, at the strength that you choose.</li>
  </ul>

  <h2>The stack</h2>
  <div class="flex items-center gap-4">
    <Logo size={96} label="Mistak's logo: a stack of stones with a capstone on top" />
    <p class="my-0">The logo is a stack: flat stones under a capstone. In Tak, the player whose stone is on top controls
      the stack, and moves it. The lowest stone drifts off into a mist.</p>
  </div>

  <h2 id="early-access">Early access</h2>
  <p><strong>Everything here can change:</strong> the pages and their addresses, the quality labels and how they judge a
    move, the engine and its network, the files and links that the site makes, and what it keeps in your browser. After
    a change, an old link or file can stop working, and a review can read differently.</p>
  <p>For now the site has its pages about the site and the game. The review, the Analysis board and Practice come with
    the engine.</p>

  <h2>The game</h2>
  <p>Tak uses a square board, from 3 × 3 to 8 × 8. Most games on playtak.com use 5 × 5 or 6 × 6. Each player has flat
    stones and capstones: 21 flat stones and 1 capstone on 5 × 5, and 30 and 1 on 6 × 6.</p>
  <ul>
    <li><strong>A placement</strong> puts one stone on an empty square: a flat stone, a wall or a capstone. The
      printed rules call a wall a standing stone.</li>
    <li><strong>A stack move</strong> moves a stack that your stone tops. It carries up to the board's width in stones,
      in one direction, and drops at least one stone on each square of its path. Walls and capstones stop a stack. A
      capstone alone, at the end of its move, flattens a wall.</li>
    <li><strong>The first turn:</strong> each player places one flat stone of the opponent's.</li>
  </ul>
  <p>A <strong>road</strong> wins: a line of a player's flat stones and capstones that joins two opposite edges of the
    board. When the board is full, or a player has no stones left, the game ends, and the player with more flat stones
    on top wins. A game can give the second player a komi: flats, or half flats, that add to their count. Equal counts
    are a draw.</p>
  <p>James Ernest and Patrick Rothfuss designed Tak in 2016. Its players meet on
    <a href="https://playtak.com">playtak.com</a> and in the <a href="https://ustak.org">US Tak Association</a>.</p>

  <h2>How a review works</h2>
  <ul>
    <li><strong>Your game:</strong> a game from playtak.com, its record in PTN, or a link to PTN Ninja.
      <a href="/notation">The notation page</a> describes the records.</li>
    <li><strong>The engine</strong> takes a quick look at every position first, then searches each position
      deeper.</li>
    <li><strong>The quality labels</strong> judge each move by how much it lowered your chance of winning.</li>
  </ul>
  <p>The rules and their numbers are on <a href="/how-reviews-work">How a review works</a>.</p>

  <h2>The engine</h2>
  <p>{ENGINE_NAME} is the engine of the review and the Analysis board, and the bot in Practice: a neural network for
    Tak, with a search from <a href="https://github.com/lightvector/KataGo">KataGo</a>. It runs in your
    browser, on your computer, so it needs no server. It is not ready yet: its rules come first, then the training of
    its network.</p>
</main>

<SiteFooter />
