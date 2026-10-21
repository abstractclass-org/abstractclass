<script lang="ts">
  // What the site keeps, and where (design 11), with the practice games that it stores (design 25), and a switch for
  // each purpose of the consent. The switches show in the browser only: the prerendered page cannot know the choices.
  import { onMount } from "svelte";
  import { Switch } from "bits-ui";
  import { PROSE } from "#lib/prose.ts";
  import { DISCORD, SITE_NAME, STORES_PRACTICE_GAMES } from "#lib/edition.ts";
  import { ASKS_CONSENT, PURPOSES, chooseShown, consent, keptNumber, type Purpose } from "#lib/analytics.svelte.ts";
  import { deletePractice } from "#lib/practice/send.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { SWITCH, SWITCH_THUMB } from "#lib/ui/settings.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import PageMeta from "#lib/PageMeta.svelte";
  import ConfirmDialog, { type Answer } from "#lib/ui/ConfirmDialog.svelte";

  let mounted = $state(false), number = $state<string | null>(null), deleting = $state(false), deleted = $state("");
  onMount(() => { mounted = true; number = keptNumber(); });
  const LABEL: Record<Purpose, string> = {
    games: "Group my games against bots with a random ID in this browser",
    analytics: "Let Google Analytics set cookies that tell my visits apart",
  };
  // The delete asks first (ConfirmDialog, design 25): the player cannot undo it.
  let asking = $state(false);
  async function answerDelete(answer: Answer) {
    asking = false;
    if (answer !== "yes" || !number) return;
    deleting = true;
    try {
      const n = await deletePractice(number);
      number = null;
      deleted = `Deleted ${n} ${n === 1 ? "game" : "games"}.`;
    } catch (e) {
      deleted = `The site deleted no games: ${errorText(e)}. Try again later.`;
    } finally {
      deleting = false;
    }
  }
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

  {#if STORES_PRACTICE_GAMES}
    <h2 id="practice-games">Your games against HedgeFund</h2>
    <p>When a game against HedgeFund ends, the site keeps it in its own database at Cloudflare. It keeps the moves, your
      takebacks, the bot's settings, the result and the time of each move. It never keeps a name or your IP address.
      It keeps no game that ends before its first move.</p>
    <p>The games show how players play against each setting of the bot, so that its levels fit real players. They also
      show what players find hard. The site can publish them as an open dataset, under CC0, as Lichess publishes its
      games. It keeps them with no time limit.</p>
    <p>If you accept, a random ID in this browser goes with each of your games, so that the site can group them. The ID
      says nothing about you. Without it, nothing links one game to another. You can change this choice, and delete the
      games that went with the ID, <a href="#consent">below</a>. After a delete, the site keeps only the ID, so that it
      can refuse a game that arrives with it later.</p>
  {/if}

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
    <li>that you opened Support Us</li>
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
    <p>Each choice is separate. The banner's Accept and Decline set them all. When you change one switch here, the site
      also keeps each switch that you have not set yet as off.</p>
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
      {#if STORES_PRACTICE_GAMES && number}
        <p>Your games against HedgeFund went with this browser's random ID.
          <button type="button" class="ml-1" disabled={deleting}
                  onclick={() => (asking = true)}>Delete my practice games</button></p>
      {/if}
      {#if deleted}<p role="status">{deleted}</p>{/if}
    {/if}
  {/if}

  <h2>Tips through Ko-fi</h2>
  <p>Nothing goes to Ko-fi until you open Support Us. Its tip panel is Ko-fi's own page, so Ko-fi then receives your
    IP address and your browser's name, and can set its own cookies. What you enter in the panel goes to Ko-fi, under
    <a href="https://more.ko-fi.com/privacy">Ko-fi's privacy policy</a>.</p>

  <h2>Questions</h2>
  <p>Ask in <a href={DISCORD}>the players' Discord</a>.</p>
</main>

<SiteFooter />
{#if STORES_PRACTICE_GAMES && number}
  <ConfirmDialog open={asking} title="Delete your practice games?" action="Delete" onanswer={answerDelete}>
    <div class="grid gap-2">
      <p>{SITE_NAME} will delete these items:</p>
      <ul class="grid gap-1.5 pl-4 list-disc">
        <li>In the site's database: the games against HedgeFund that went with this browser's random ID.</li>
        <li>In this browser: the games with this random ID that wait to go to the database.</li>
        <li>In this browser, after the site deletes the games: the random ID.</li>
      </ul>
      <p>Your games in the Review tab stay in this browser. You cannot undo this action.</p>
    </div>
  </ConfirmDialog>
{/if}
