<script lang="ts">
  // What the site keeps, and where (Hedge School's design 11), in Cyanotype's words: what the browser keeps, the visits
  // and what PostHog receives (design 34, "The site's frame": the shared analytics, with no consent). Its visit counts
  // set no cookies. Its Support Us opens Ko-fi's tip panel, so the page has the sites' part on Ko-fi
  // (@abstractclass/site/KofiPrivacy.svelte). The page says what the site does now. The request to api.playtak.com is
  // the Function's (src/lib/import/playtakProxy.ts), for a playtak game. The request to url.ptn.ninja is the page's own
  // (src/lib/import/shortLink.ts), for a short PTN Ninja link. The work that adds a stored game adds its part here:
  // Practice's stored games (design 34, "The pages").
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import KofiPrivacy from "@abstractclass/site/KofiPrivacy.svelte";
  import { SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
</script>

<PageMeta title="Privacy · {SITE_NAME}" description="What Mistak keeps, where it keeps it, and what it measures." />

<main class={PROSE}>
  <h1>Privacy</h1>
  <p>{SITE_NAME} has no accounts and no server of its own. Its engine will run in your browser, so your games and their
    reviews will stay on your computer.</p>

  <h2>What your browser keeps</h2>
  <p>Your browser keeps your settings and your choices, such as the theme. They stay in this browser on this computer.
    To delete them, clear this site's data in your browser's settings.</p>

  <h2>Games that you import</h2>
  <ul>
    <li><strong>A link to a playtak game.</strong> Your browser sends the number in the link to this site. A small
      program of the site, on Cloudflare's servers, asks playtak's server (<code>api.playtak.com</code>) for the game
      and gives it to your browser. The request to playtak holds the number and the name of this site, and nothing about
      you or your browser. Cloudflare and your browser can keep a copy of the game for a day. The program
      keeps no log.</li>
    <li><strong>A record, or a link that holds the game</strong> (a long PTN Ninja link, or a playtak link with
      <code>?load=</code>). Your browser reads the game in it. The site sends it to no server.</li>
    <li><strong>A short PTN Ninja link.</strong> The link does not hold the game. Your browser asks PTN Ninja's server
      (<code>url.ptn.ninja</code>) for it, and sends the code in the link. Like any web host, that server receives your IP
      address, your browser's name and the name of this site. PTN Ninja counts that the link was opened.</li>
    <li><strong>A game in an address.</strong> A link to the import page can hold a game, or its number, after the
      <code>#</code>. Your browser sends that part of an address to no server. The page takes the game out of its address
      before it counts the visit.</li>
    <li><strong>Open in PTN Ninja.</strong> This link holds the game in its address. When you open it, ptn.ninja receives
      the game.</li>
  </ul>
  <p>The site does not keep the games that you import.</p>

  <h2>Visits</h2>
  <ul>
    <li><strong>Cloudflare</strong> serves the site's files. Like any web host, it receives each request: your IP
      address and your browser's name. Its Web Analytics counts visits without cookies.</li>
    <li><strong>PostHog</strong> counts visits. It receives each page that you open: its address without the part
      after the <code>#</code>, its title, the time, how long you stayed on the previous page, and the page that
      sent you here. It also receives your browser and its language, your operating system, your time zone, your screen
      and window sizes and your IP address. PostHog stores this data in the United States.</li>
  </ul>
  <p>Neither service sets cookies or keeps data in your browser, so the site does not ask for your consent to them.
    To count visitors without cookies, PostHog makes a code from your IP address, your browser and a random value of
    the day, on its own servers. The code changes each day, and it cannot give back your IP address. PostHog removes
    your IP address before it keeps a visit.</p>
  <p>PostHog takes part in the EU-U.S. Data Privacy Framework, its UK Extension and the Swiss-U.S. Data Privacy
    Framework. With these, it can receive the data of visitors from the EU, the UK and Switzerland in the United States
    (<a href="https://posthog.com/privacy">PostHog's privacy policy</a>).</p>
  <p>PostHog also receives a count when you open Support Us, so that we can tell what to improve.</p>
  <p>When the site's code fails, PostHog receives an error report, so that we can find the fault and repair it. A
    report holds the error's name and message and the places in the site's code where the error occurred. It also
    holds the page's address without the part after the <code>#</code>, and the same data about your browser as a
    visit.</p>

  <KofiPrivacy />
</main>

<SiteFooter />
