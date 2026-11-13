<script lang="ts">
  // What the site keeps, and where (design 11), with the practice games that it stores (design 25), and the switch of
  // the consent's one purpose, the games' link. The games' section and the choices are the practice's, which Cyanotype
  // shows too (@abstractclass/practice: StoredGamesNotice.svelte, GamesChoices.svelte).
  import { PROSE } from "@abstractclass/site/prose.ts";
  import { DISCORD, SITE_NAME, STORES_PRACTICE_GAMES } from "#lib/edition.ts";
  import { analytics } from "#lib/analytics.svelte.ts";
  import { deletePractice } from "#lib/practice/send.ts";
  import StoredGamesNotice from "@abstractclass/practice/StoredGamesNotice.svelte";
  import GamesChoices from "@abstractclass/practice/GamesChoices.svelte";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
</script>

<PageMeta title="Privacy · {SITE_NAME}" description="What Hedge School keeps, where it keeps it, and what it measures." />

<main class={PROSE}>
  <h1>Privacy</h1>
  {#if STORES_PRACTICE_GAMES}
    <p>{SITE_NAME} has no accounts. The engine runs in your browser, so the games that you review, and their reviews,
      stay on your computer. Your games against HedgeFund go to the site's own database when they end
      (<a href="#practice-games">below</a>).</p>
  {:else}
    <p>{SITE_NAME} has no accounts and no server of its own. The engine runs in your browser, so your games and their
      reviews stay on your computer.</p>
  {/if}

  <h2>What your browser keeps</h2>
  <p>Your browser keeps your games, with their reviews and analyses. It also keeps your work on the Analysis board and
    in the board editor, the practice game in progress, your settings and your choices. They stay in this browser on
    this computer. To delete them, clear this site's data in your browser's settings.</p>

  {#if STORES_PRACTICE_GAMES}<StoredGamesNotice bot="HedgeFund" />{/if}

  <h2>Games in an address</h2>
  <p>A link that shares a review or an analysis carries it after the <code>#</code> in the address. The bookmarklet,
    the userscript and a partner site's link bring a game in the same way. Browsers never send that part of an address
    to a server, and the page removes it before the analytics start. Anyone who has a share link can open what it
    holds.</p>
  <p>With each game, the bookmarklet and the userscript tell this site which tool sent it, its version and the game's
    site. With that, this site can say when a tool needs an update.</p>
  <p>A partner site can keep your review: choose "Save to" it in the review's Export menu. Only then does the review
    file go to that site, from your browser. That site keeps it under its own terms.</p>

  <h2>Visits</h2>
  <ul>
    <li><strong>Cloudflare</strong> serves the site's files. Like any web host, it receives each request: your IP
      address and your browser's name. Its Web Analytics counts visits without cookies.</li>
    <li><strong>PostHog</strong> counts visits. It receives each page that you open: its address without the part
      after the <code>#</code>, its title, the time, how long the page before it stayed open, and the page that sent
      you here. It also receives your browser and its language, your operating system, your time zone, your screen
      and window sizes and your IP address. PostHog stores this data in the United States.</li>
  </ul>
  <p>Neither service sets cookies or keeps data in your browser, so the site does not ask for your consent to them.
    To count visitors without cookies, PostHog makes a code from your IP address, your browser and a random value of
    the day, on its own servers. The code changes each day, and it cannot give back your IP address. PostHog removes
    your IP address before it keeps a visit.</p>
  <p>PostHog takes part in the EU-U.S. Data Privacy Framework, its UK Extension and the Swiss-U.S. Data Privacy
    Framework. With these, it can receive the data of visitors from the EU, the UK and Switzerland in the United States
    (<a href="https://posthog.com/privacy">PostHog's privacy policy</a>).</p>
  <p>PostHog also receives counts of what you do here, so that we can tell what to improve:</p>
  <ul>
    <li>the games you import, load and delete</li>
    <li>your reviews, and your visits to the Analysis board and the board editor</li>
    <li>your practice games</li>
    <li>the settings you change, the features you use, and your exports</li>
    <li>that you opened Support Us</li>
    <li>errors, such as an engine that does not start, a game that the site cannot find, or a tool that needs an
      update</li>
  </ul>
  <p>The counts hold ranges, such as a game's length. They also hold how your computer runs the engine: its number of
    cores, its GPU and the engine's speed. They never hold a game, a move or a player's name. Only PostHog's code of
    the day links one count to another.</p>

  <GamesChoices {analytics} site={SITE_NAME} bot="HedgeFund" ondelete={deletePractice} />

  <h2>Tips through Ko-fi</h2>
  <p>Nothing goes to Ko-fi until you open Support Us. Its tip panel is Ko-fi's own page, so Ko-fi then receives your
    IP address and your browser's name, and can set its own cookies. What you enter in the panel goes to Ko-fi, under
    <a href="https://more.ko-fi.com/privacy">Ko-fi's privacy policy</a>.</p>

  <h2>Questions</h2>
  <p>Ask in <a href={DISCORD}>the players' Discord</a>.</p>
</main>

<SiteFooter />
