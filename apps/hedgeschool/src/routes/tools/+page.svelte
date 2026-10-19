<script lang="ts">
  // The tools that bring games from other sites (design 22): the bookmarklet and the userscript, for meaf.us and
  // strategyjam.org, which open the review with a game after the `#` (bookmarklet.ts, userscript.ts). The review asks the
  // player to review the game or to analyze it on the board, and says when the tool is out of date (Arrival.svelte).
  import { onMount } from "svelte";
  import { bookmarkletHref } from "#lib/game/bookmarklet.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import PageMeta from "#lib/PageMeta.svelte";

  let href = $state("");
  onMount(() => { href = bookmarkletHref(location.origin); });
</script>

<PageMeta title="Bring your games from strategyjam.org and meaf.us · Hedge School"
          description="Bring your Enclosure games from strategyjam.org and meaf.us to Hedge School in one click, with a bookmarklet or a Tampermonkey userscript, and review or analyze them." />

<main class="box-content max-w-184 mx-auto my-6 px-4 grid gap-4">
  <h1 class="text-2xl font-bold">Bring your games from strategyjam.org and meaf.us</h1>
  <p>
    <a href="https://strategyjam.org/enclosure/">strategyjam.org</a> and <a href="https://meaf.us/sst1/">meaf.us</a> do
    not let other sites read their games, so this site cannot fetch them. A bookmarklet can: you keep it in your
    browser's bookmarks bar, and click it on a game page of either site. It reads the game from that page, and opens it
    here, to review it or to analyze it on the board. It sends nothing to the game's site and reads nothing from your login. At each click it loads its
    code from this site, so it stays up to date.
  </p>
  <ol class="grid gap-2.5 pl-5 list-decimal">
    <li>Show the bookmarks bar (Ctrl+Shift+B in Chrome and Edge, Ctrl+Shift+B or View in Firefox).</li>
    <li>
      Drag this button to the bookmarks bar:
      {#if href}<a class="inline-block ml-1.5 px-3 py-1 rounded-full bg-accent text-on-accent font-semibold no-underline cursor-grab"
                   {href} onclick={e => e.preventDefault()}>Review in Hedge School</a>{/if}
    </li>
    <li>Open a game. On strategyjam.org, open a game from the History list, or a game that you play or watch.
      To see a finished game on strategyjam.org, log in. On meaf.us, open a game that you play or watch, or a finished
      game from the archive.</li>
    <li>Click <strong>Review in Hedge School</strong> in the bookmarks bar. The game opens in Hedge School, in a new tab.</li>
    <li>Just after your own game on meaf.us ends, meaf.us shows the game without its moves. The bookmarklet then reloads the
      page as a watcher's view, which has them. When the game shows again, click <strong>Review in Hedge School</strong>
      once more.</li>
    <li>Click <strong>Review the game</strong> or <strong>Analyze on the board</strong>. The board opens at the position
      that the game's page shows.</li>
  </ol>
  <h2 class="mt-2 text-lg font-bold">Or with Tampermonkey</h2>
  <p>
    With the Tampermonkey extension, a userscript does the same: a button with the collie on the game pages of
    strategyjam.org and meaf.us, and an entry in Tampermonkey's menu. It updates itself, and on meaf.us it opens your
    own finished game in one click. It sends nothing to the game's site and reads nothing from your
    login.
  </p>
  <ol class="grid gap-2.5 pl-5 list-decimal">
    <li>Install <a href="https://www.tampermonkey.net/">Tampermonkey</a>. In Chrome and Edge from version 138, also set
      <strong>Allow User Scripts</strong> to on, in Tampermonkey's details on the browser's extensions page.</li>
    <li>Open <a href="/hedge-school.user.js" data-sveltekit-reload>the Hedge School userscript</a>. Tampermonkey shows it
      with an <strong>Install</strong> button.</li>
    <li>Open a game on strategyjam.org or meaf.us. Then click the collie, or <strong>Open this game in Hedge
      School</strong> in Tampermonkey's menu. On strategyjam.org, the collie is at the end of the move list. On
      meaf.us, it is in the lower right corner of the page. The game opens in Hedge School, in a new tab.</li>
    <li>Click <strong>Review the game</strong> or <strong>Analyze on the board</strong>.</li>
  </ol>
  <p class="text-sm text-muted">
    Both depend on how strategyjam.org and meaf.us build their pages. If a site changes its page, they may find no game
    there until this site updates them. Both then update themselves. You can always paste a game record in the <a href="/review">Review tab</a>.
  </p>
</main>
<SiteFooter />
