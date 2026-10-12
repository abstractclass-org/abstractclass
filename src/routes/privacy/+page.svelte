<script lang="ts">
  // What the site keeps, and where (design 11). The consent's state shows in the browser only: the prerendered page
  // cannot know the visitor's choice.
  import { onMount } from "svelte";
  import { PROSE } from "#lib/prose.ts";
  import { DISCORD, SITE_NAME } from "#lib/edition.ts";
  import { ASKS_CONSENT, choose, consent } from "#lib/analytics.svelte.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  let mounted = $state(false);
  onMount(() => (mounted = true));
  const CHOICE = { granted: "you accepted its cookies", denied: "you declined its cookies" };
</script>

<svelte:head><title>Privacy · {SITE_NAME}</title></svelte:head>

<main class={PROSE}>
  <h1>Privacy</h1>
  <p>{SITE_NAME} has no accounts and no server of its own. The engine runs in your browser, so your games and their
    reviews stay on your computer.</p>

  <h2>What your browser keeps</h2>
  <ul>
    <li><strong>Your games:</strong> the records you import, with the players' names that the records hold.</li>
    <li><strong>Their analyses:</strong> the engine's results, so that a review opens at once the next time.</li>
    <li><strong>Your settings:</strong> the review's and the engine's.</li>
    <li><strong>Your choice about Google Analytics' cookies,</strong> and those cookies if you accept them.</li>
  </ul>
  <p>They stay in this browser on this computer: another browser or another computer does not see them. To remove
    them, clear this site's data in your browser's settings.</p>

  <h2>Shared reviews</h2>
  <p>A link that shares a review carries the game, its branches and the engine's settings after the <code>#</code> in
    the address. Browsers never send that part of an address to a server, so {SITE_NAME}'s host does not see the game,
    and the page removes it from the address before the analytics start. Anyone who has the link can open the game.</p>

  <h2>The meaf.us bookmarklet and userscript</h2>
  <p>The bookmarklet runs in the meaf.us page that you have open. It reads the game on the board, with nothing from your
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
  <p>Neither sees your games. The bookmarklet's record leaves the address before either starts, and a review's address
    names its game by a short code made from the moves, from which the game cannot be read.</p>
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
