<script lang="ts">
  // The tools that bring games from other sites (design 22): the meaf.us bookmarklet and userscript, which open the
  // review with a game after the `#` (bookmarklet.ts, userscript.ts), and Constellation's export, pasted on the home
  // page. The review keeps a tool's game and says when the tool is out of date (Arrival.svelte).
  import { onMount } from "svelte";
  import { bookmarkletHref } from "#lib/game/bookmarklet.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  let href = $state("");
  onMount(() => { href = bookmarkletHref(location.origin); });
</script>

<svelte:head><title>Tools for other sites</title></svelte:head>

<main class="box-content max-w-184 mx-auto my-6 px-4 grid gap-4">
  <h1 class="text-2xl font-bold">Bring your meaf.us games</h1>
  <p>
    meaf.us does not let other sites read its games, so this site cannot fetch them. A bookmarklet can: you keep it
    in your browser's bookmarks bar, and click it on a meaf.us game. It reads the game from that page, and opens it
    here for review. It sends nothing to meaf.us and reads nothing from your login. At each click it loads its code
    from this site, so it stays up to date.
  </p>
  <ol class="grid gap-2.5 pl-5 list-decimal">
    <li>Show the bookmarks bar (Ctrl+Shift+B in Chrome and Edge, Ctrl+Shift+B or View in Firefox).</li>
    <li>
      Drag this button to the bookmarks bar:
      {#if href}<a class="inline-block ml-1.5 px-3 py-1 rounded-full bg-accent text-on-accent font-semibold no-underline cursor-grab"
                   {href} onclick={e => e.preventDefault()}>Review in Hedge School</a>{/if}
    </li>
    <li>On meaf.us, open a game: one you play or watch, or a finished one from the archive.</li>
    <li>Click <strong>Review in Hedge School</strong> in the bookmarks bar. The review opens in a new tab.</li>
    <li>On your own game just after it ends, meaf.us shows the game without its moves. The bookmarklet then reloads the
      page as a watcher's view, which has them. When the game shows again, click <strong>Review in Hedge School</strong>
      once more.</li>
  </ol>
  <h2 class="mt-2 text-lg font-bold">Or with Tampermonkey</h2>
  <p>
    With the Tampermonkey extension, a userscript does the same: a button with the collie on meaf.us's game pages,
    and an entry in Tampermonkey's menu. It updates itself, and it opens the review of your own finished game in one
    click. It sends nothing to meaf.us and reads nothing from your login.
  </p>
  <ol class="grid gap-2.5 pl-5 list-decimal">
    <li>Install <a href="https://www.tampermonkey.net/">Tampermonkey</a>. In Chrome and Edge from version 138, also turn on
      <strong>Allow User Scripts</strong> in Tampermonkey's details on the browser's extensions page.</li>
    <li>Open <a href="/hedge-school.user.js" data-sveltekit-reload>the Hedge School userscript</a>. Tampermonkey shows it
      with an <strong>Install</strong> button.</li>
    <li>On meaf.us, open a game, then click the collie in the page's lower right corner, or <strong>Review this game in
      Hedge School</strong> in Tampermonkey's menu. The review opens in a new tab.</li>
  </ol>
  <p class="text-sm text-muted">
    Both depend on how meaf.us builds its page. If meaf.us changes, they may find no game until they are updated
    here, and both then update themselves. You can always paste a game record on the <a href="/">home page</a>.
  </p>
  <h2 class="mt-2 text-lg font-bold">From Constellation</h2>
  <p>On Constellation's analysis board, click <strong>Export</strong>, and paste what it gives on the
    <a href="/">home page</a>. Then choose Review or Analyze.</p>
</main>
<SiteFooter />
