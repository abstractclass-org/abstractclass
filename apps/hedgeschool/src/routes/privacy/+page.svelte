<script lang="ts">
  // What the site keeps, and where (design 11), with the practice games that it stores (design 25), and a switch for
  // each purpose of the consent. The switches show in the browser only: the prerendered page cannot know the choices.
  import { onMount } from "svelte";
  import { Switch } from "bits-ui";
  import { PROSE } from "#lib/prose.ts";
  import { DISCORD, SITE_NAME, STORES_PRACTICE_GAMES } from "#lib/edition.ts";
  import { ASKS_CONSENT, PURPOSES, chooseShown, consent, keptNumber, type Purpose } from "#lib/analytics.svelte.ts";
  import { deletePractice } from "#lib/practice/send.ts";
  import { errorText } from "#lib/errors.ts";
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
  <ul>
    <li><strong>Your games:</strong> the records you import, with the players' names that the records hold</li>
    <li><strong>Their analyses:</strong> the engine's results, so that a review opens at once the next time</li>
    <li><strong>Your analysis:</strong> the Analysis board's lines, the moves you evaluated, and the position you left it at</li>
    <li><strong>Your practice game:</strong> the game in progress against the bot, with its settings and the name you
      gave for its record, and the settings you chose for the next game</li>
    <li><strong>Your settings:</strong> the review's, the engine's, Practice's, and the theme</li>
    <li><strong>Your choices</strong> about Google Analytics' cookies and about the link between your games, those
      cookies if you accept them, and the random ID that groups your games if you accept it</li>
    {#if STORES_PRACTICE_GAMES}<li><strong>Your games against HedgeFund that could not be sent yet:</strong> they go
      on your next visit</li>{/if}
  </ul>
  <p>They stay in this browser on this computer: another browser or another computer does not see them. To remove
    them, clear this site's data in your browser's settings.</p>

  {#if STORES_PRACTICE_GAMES}
    <h2 id="practice-games">Your games against HedgeFund</h2>
    <p>When a game against HedgeFund ends, the site keeps it in its own database at Cloudflare. A game ends by the
      rules, by Resign, by Abort, or when you leave it for a new start from the Analysis board. A game that ends before
      your first move is not kept. The site keeps:</p>
    <ul>
      <li>the game's moves and the edges that they cut, and its start</li>
      <li>the bot's settings, and where it ran (the GPU or the CPU)</li>
      <li>your side, how the game ended, and its result</li>
      <li>each takeback, and the time that each move took</li>
      <li>the day the game ended, and the site's version</li>
    </ul>
    <p>It never keeps the name that you type for the game's record, and it never keeps your IP address.</p>
    <p>The games show the site how players play against each setting of the bot, so that its levels fit real players,
      and what players find hard. The site can publish them as an open dataset, under CC0, as Lichess publishes its
      games. They hold no name. The site keeps them with no time limit.</p>
    <p>If you accept, a random ID in this browser goes with each of your games, so that your games can be told apart
      from other players' games. The ID says nothing about you. If you do not accept, a game goes with no ID, and
      nothing links it to another game. You can change this choice, and delete the games that went with the ID,
      <a href="#consent">below</a>. After a delete, the site keeps the ID alone, with no game, so that it does not keep
      a game that arrives with it later.</p>
    <p>A game that cannot be sent when it ends waits in this browser, and goes on your next visit. It goes with the ID
      only if you still accept then.</p>
  {/if}

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

  <h2>The bookmarklet and userscript for meaf.us and strategyjam.org</h2>
  <p>The bookmarklet runs in the game page that you have open on <a href="https://meaf.us/sst1/">meaf.us</a> or
    <a href="https://strategyjam.org/">strategyjam.org</a>. It reads the game from that page, with nothing from your
    login and no request to the game's site, and opens {SITE_NAME} with the game after the <code>#</code> in the
    address. Browsers never send that part of an address to a server, and the page removes it at once. On meaf.us, for
    your own finished game, which meaf.us shows without its moves, it opens the same meaf.us page again as a watcher's
    view (<code>spectate=1</code> in the address), and meaf.us loads the moves itself. At each click, the bookmarklet
    loads its code from this site, so that it stays up to date: that request carries no game, and by default your
    browser names only the game's site as the page that made it.</p>
  <p>The userscript, for the Tampermonkey extension, does the same on the game pages of the two sites, from a button
    or Tampermonkey's menu. Its button and its collie are drawn by the script itself, with no request. Tampermonkey
    asks this site for the script now and then, to update it: that request carries no game. With a game, both tools
    tell this site which one sent it, their version and the game's site, after the same <code>#</code>, so that this
    site can say when one needs an update.</p>

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
      bookmarklet or the userscript, and on which site, or another site's link), its length as a range (for example 90 to 119 edges), or why
      an import failed</li>
    <li>that you loaded a review or an analysis, and how (a review or an analysis file, a share link, or a review that
      another site kept), its game's length as a range, or why a load failed</li>
    <li>that a review opened and ended: the engine settings it ran with, your computer's number of cores as a range,
      how long the review took, and how fast the engine searched</li>
    <li>that the Analysis board opened, with its main line's length as a range</li>
    <li>that the board editor opened, and that you sent its position to the Analysis board</li>
    <li>the GPU's first test: faster or slower than the CPU, and the GPU's maker and kind</li>
    <li>that a practice game started and ended: how it started (new, from the Analysis board, from a set-up position
      there, or resumed), the bot's settings, your side, where the bot ran (the GPU or the CPU),
      your computer's number of cores as a range, how the game ended (won, lost, drawn, resigned or aborted), its
      length and your takebacks as ranges, and the bot's average time a turn as a range</li>
    <li>the engine settings you change, the features you use (each once in a review, in a visit to the Analysis board,
      or in a practice game), and your exports (a review saved to a partner site among them), with a share link's length as a range</li>
    <li>that you opened Support Us, but not whether you gave a tip</li>
    <li>that you deleted a game in the Review tab, or that you cancelled the delete when the site asked</li>
    <li>how many games this browser keeps, as a range</li>
  </ul>
  <p>None of these holds a game, a move, a player's name or a game's code. Until you accept the cookies, Google receives
    them with nothing that links one to another.</p>
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
  <p>"Support Us" opens Ko-fi's tip panel in this page. The panel is Ko-fi's own page, from ko-fi.com. Only when you
    open it, your browser asks Ko-fi for it: Ko-fi then receives your IP address and your browser's name, as any site
    does, and can set its own cookies. Until then, nothing goes to Ko-fi. What you enter in the panel goes to Ko-fi and
    its payment providers, under <a href="https://more.ko-fi.com/privacy">Ko-fi's privacy policy</a>, which says what
    Ko-fi shares with {SITE_NAME}.</p>

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
