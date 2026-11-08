<script lang="ts">
  // What the site keeps, and where (Hedge School's design 11), in Hedge School's words: what the browser keeps, the
  // games that come in an address, the visits and what Google Analytics receives (design 33, "Analytics and consent"),
  // and the switch of the consent's one purpose, Google Analytics' cookies. The switch shows in the browser only: the
  // prerendered page cannot know the choice. Cyanotype stores no practice games and has no Support Us yet, so the page
  // has neither part of Hedge School's. The section on addresses follows Cyanotype's code: the tools' import address
  // (@abstractclass/import/bookmarklet.ts and userscript.ts), the import page's version check (routes/import), and the
  // share links (game/share.ts, game/board.ts).
  import { onMount } from "svelte";
  import { Switch } from "bits-ui";
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { SWITCH, SWITCH_THUMB } from "@abstractclass/site/settings.ts";
  import { ASKS_CONSENT, PURPOSES, chooseShown, consent, type Purpose } from "#lib/analytics.svelte.ts";
  import { SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  let mounted = $state(false);
  onMount(() => (mounted = true));
  const LABEL: Record<Purpose, string> = {
    games: "Group my games against bots with a random ID in this browser",
    analytics: "Let Google Analytics set cookies that tell my visits apart",
  };
</script>

<PageMeta title="Privacy · {SITE_NAME}" description="What Cyanotype keeps, where it keeps it, and what it measures." />

<main class={PROSE}>
  <h1>Privacy</h1>
  <p>{SITE_NAME} has no accounts and no server of its own. The engine runs in your browser, so your games and their
    reviews stay on your computer.</p>

  <h2>What your browser keeps</h2>
  <p>Your browser keeps the games that you review, with their reviews and analyses. It also keeps your work on the
    Analysis board and in the board editor, the practice game in progress, your settings and your choices. They stay
    in this browser on this computer. To delete them, clear this site's data in your browser's settings.</p>

  <h2>Games in an address</h2>
  <p>The bookmarklet and the userscript bring a game from strategyjam.org after the <code>#</code> in the address of
    this site's import page. A link that shares a review or an analysis carries its game or its lines in the same
    place. Browsers never send that part of an address to a server, so Cloudflare does not receive the game. Each page
    removes it from the address at once, before the analytics start. Anyone who has such a link can open what it
    holds.</p>
  <p>With each game, the bookmarklet and the userscript also send the tool's name and version, the game's site and the
    position that the game's page showed. With the tool's version, this site can tell you when the tool needs an
    update.</p>
  <p>A link that shares a review holds the game's record and the moves of your variations. The record has its tags,
    such as the players' names. The link also names the engine, the network and the depth of your review. A link that
    shares an analysis holds the lines of your Analysis board and the position on screen.</p>

  <h2>Visits</h2>
  <ul>
    <li><strong>Cloudflare</strong> serves the site's files. Like any web host, it receives each request: your IP
      address and your browser's name. Its Web Analytics counts visits without cookies.</li>
    <li><strong>Google Analytics</strong> counts visits in Google's consent mode. Until you accept, it sets no cookies.
      Google still receives each page you open: its address, the time, your browser and screen size, and your IP
      address. Google says that it does not keep the IP address. If you accept, it also sets cookies that distinguish
      your visits from other people's visits.</li>
  </ul>
  <p>Google Analytics also receives counts of what you do here, so that we can tell what to improve:</p>
  <ul>
    <li>the games you import, load and delete</li>
    <li>your reviews, and your visits to the Analysis board and the board editor</li>
    <li>your practice games</li>
    <li>the settings you change, the features you use, and your exports</li>
    <li>errors, such as an engine that does not start, a game that the site cannot find, or a tool that needs an
      update</li>
  </ul>
  <p>The counts hold ranges, such as a game's length. They also hold how your computer runs the engine: its number of
    cores, its GPU and the engine's speed. They never hold a game, a move or a player's name. Until you accept the
    cookies, nothing links one count to another.</p>
  <p>If you accept the cookies and a blocker stops Google Analytics, the site asks you to allow it in your blocker. To
    know this, the site checks only whether its own Google Analytics ran in the page.</p>

  {#if ASKS_CONSENT}
    <h2 id="consent">Your choices</h2>
    <p>The banner's Accept and Decline set this choice. You can change it here at any time.</p>
    {#if mounted}
      <div class="grid gap-3">
        {#each PURPOSES as p (p)}
          <label class="flex items-center gap-3 text-sm">
            <Switch.Root class={SWITCH} checked={consent[p] === "granted"} onCheckedChange={on => chooseShown(p, on ? "granted" : "denied")}>
              <Switch.Thumb class={SWITCH_THUMB} />
            </Switch.Root>
            <span>{LABEL[p]}{consent[p] === null ? " (not chosen yet)" : ""}</span>
          </label>
        {/each}
      </div>
    {/if}
  {/if}
</main>

<SiteFooter />
