<script lang="ts">
  // What the site keeps, and where (design 11). The consent's state shows in the browser only: the prerendered page
  // cannot know the visitor's choice.
  import { onMount } from "svelte";
  import { PROSE } from "#lib/prose.ts";
  import { DISCORD, SITE_NAME } from "#lib/edition.ts";
  import { ASKS_CONSENT, choose, consent } from "#lib/analytics.svelte.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import PageMeta from "#lib/PageMeta.svelte";

  let mounted = $state(false);
  onMount(() => (mounted = true));
  const CHOICE = { granted: "you accepted its cookies", denied: "you declined its cookies" };
</script>

<PageMeta title="Privacy · {SITE_NAME}" description="What Hedge School keeps, where it keeps it, and what it measures." />

<main class={PROSE}>
  <h1>Privacy</h1>
  <p>{SITE_NAME} has no accounts and no server of its own. The engine runs in your browser, so your games and their
    reviews stay on your computer.</p>

  <h2>What your browser keeps</h2>
  <ul>
    <li><strong>Your games:</strong> the records you import, with the players' names that the records hold.</li>
    <li><strong>Their analyses:</strong> the engine's results, so that a review opens at once the next time.</li>
    <li><strong>Your analysis:</strong> the Analysis board's lines, the moves you evaluated, and the position you left it at.</li>
    <li><strong>Your settings:</strong> the review's, the engine's, and the theme.</li>
    <li><strong>Your choice about Google Analytics' cookies,</strong> and those cookies if you accept them.</li>
  </ul>
  <p>They stay in this browser on this computer: another browser or another computer does not see them. To remove
    them, clear this site's data in your browser's settings.</p>

  <h2>Shared reviews and analyses</h2>
  <p>A link that shares a review carries the game, its branches and the engine's settings after the <code>#</code> in
    the address. A link that shares an analysis carries its lines and the moves you evaluated. Browsers never send that
    part of an address to a server, so {SITE_NAME}'s host does not see them, and the page removes them from the address
    before the analytics start. Anyone who has the link can open them.</p>

  <h2>Games from another site</h2>
  <p>A site where you play can open {SITE_NAME} with your game, after the <code>#</code> in the address, as a shared
    review's link does: browsers never send that part to a server, and the page removes it at once. For a review, the
    game is then kept in your browser, as any game you import. On the Analysis board, it replaces the board's lines,
    after you agree when the board has lines of its own.</p>
  <p>When that site is one of {SITE_NAME}'s partners, the review's Export menu offers "Save to" it. Only when you choose
    it, {SITE_NAME} opens that site's page and hands it the review file, from your browser to that site: the game, its
    branches and the engine's results. That site keeps it under its own terms. Nothing goes to it before you choose,
    and nothing else ever does. To open a review that it kept, that site's page sends the file back to {SITE_NAME} in
    your browser, and it is kept here as any review file you load.</p>

  <h2>The meaf.us bookmarklet and userscript</h2>
  <p>The bookmarklet runs in the <a href="https://meaf.us/sst1/">meaf.us</a> page that you have open. It reads the game on the board, with nothing from your
    meaf.us login and no request to meaf.us, and opens {SITE_NAME} with the game after the <code>#</code> in the
    address. Browsers never send that part of an address to a server, and the page removes it at once. On your own
    finished game, which meaf.us shows without its moves, it opens the same meaf.us page again as a watcher's view
    (<code>spectate=1</code> in the address), and meaf.us loads the moves itself. At each click, the bookmarklet loads
    its code from this site, so that it stays up to date: that request carries no game, and by default your browser
    names only meaf.us as the page that made it.</p>
  <p>The userscript, for the Tampermonkey extension, does the same on meaf.us's game pages, from a button or
    Tampermonkey's menu. Its button and its collie are drawn by the script itself, with no request. Tampermonkey asks
    this site for the script now and then, to update it: that request carries no game. With a game, both tools tell
    this site which one sent it, and their version, after the same <code>#</code>, so that this site can say when one
    needs an update.</p>

  <h2>Visits</h2>
  <ul>
    <li><strong>Cloudflare</strong> serves the site's files. Like any web host, it receives each request: your IP
      address and your browser's name. Its Web Analytics counts visits without cookies.</li>
    <li><strong>Google Analytics</strong> counts visits in Google's consent mode. Until you accept, it sets no cookies,
      but Google still receives each page you open: its address, the time, your browser and screen size, and your IP
      address, which Google says it does not keep. If you accept, it also sets cookies that tell your visits
      apart.</li>
  </ul>
  <p>Neither sees your games. A game or a line after the <code>#</code> leaves the address before either starts, and a
    review's address names its game after the <code>#</code>, which neither records.</p>
  <p>Google Analytics also receives what you do here, as counts, so that we can tell what to improve:</p>
  <ul>
    <li>that you imported a game, to a review or to the Analysis board, and how (pasted, from <a href="https://constellation.blueshrimp.uk">Constellation</a>, the
      bookmarklet, the userscript or another site's link), its length as a range (for example 90 to 119 edges), or why
      an import failed;</li>
    <li>that you loaded a review or an analysis, and how (a review or an analysis file, a share link, or a review that
      another site kept), its game's length as a range, or why a load failed;</li>
    <li>that a review opened and ended: the engine settings it ran with, your computer's number of cores as a range,
      how long the review took, and how fast the engine searched;</li>
    <li>that the Analysis board opened, with its main line's length as a range;</li>
    <li>that the board editor opened, and that you sent its position to the Analysis board;</li>
    <li>the GPU's first test: faster or slower than the CPU, and the GPU's maker and kind;</li>
    <li>the engine settings you change, the features you use (each once in a review, or in a visit to the Analysis
      board), and your exports (a review saved to a partner site among them), with a share link's length as a range;</li>
    <li>how many games this browser keeps, as a range.</li>
  </ul>
  <p>None of these holds a game, a move, a player's name or a game's code. Until you accept the cookies, Google receives
    them with nothing that links one to another.</p>
  {#if ASKS_CONSENT && mounted}
    <p>Google Analytics' cookies: {consent.choice ? CHOICE[consent.choice] : "you have not chosen yet"}.</p>
    <p class="flex gap-2">
      <button type="button" disabled={consent.choice === "granted"} onclick={() => choose("granted")}>Accept</button>
      <button type="button" disabled={consent.choice === "denied"} onclick={() => choose("denied")}>Decline</button>
    </p>
  {/if}

  <h2>Questions</h2>
  <p>Ask in <a href={DISCORD}>the players' Discord</a>.</p>
</main>

<SiteFooter />
