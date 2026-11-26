<script lang="ts">
  // The tools that bring games from playtak.com (docs/design/34-tak-site.md, "The tools for playtak's pages"; Hedge
  // School's design 22): the bookmarklet and the userscript, which open the import page with the game on playtak's
  // board after the `#` (src/lib/import/tools.ts). The import page shows the game. The steps are strict Simplified
  // Technical English: the player follows them.
  import { onMount } from "svelte";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { bookmarkletHref, TOOL_NAME } from "#lib/import/tools.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  let href = $state("");
  onMount(() => { href = bookmarkletHref(location.origin); });
</script>

<PageMeta title="Bring your games from playtak.com · Mistak"
          description="Bring your Tak games from playtak.com to Mistak in one click, with a bookmarklet or a Tampermonkey userscript, also a game that is not finished." />

<main class="box-content max-w-184 mx-auto my-6 px-4 grid gap-4">
  <h1 class="text-2xl font-bold">Bring your games from playtak.com</h1>
  <p>
    The <a href="/review">Review tab</a> takes a link to a finished game on playtak.com. A game that is not finished
    has no such link yet. A bookmarklet brings any game that the playtak.com board shows: you keep it in your browser's
    bookmarks bar, and click it on playtak.com. It reads the game from that page and opens it here. It sends nothing to
    playtak.com and reads nothing from your login. At each click it loads its code from this site, so it always has the
    newest code.
  </p>
  <ol class="grid gap-2.5 pl-5 list-decimal">
    <li>Show the bookmarks bar. In Chrome and Edge, press Ctrl+Shift+B. In Firefox, press Ctrl+Shift+B, or use the View
      menu.</li>
    <li>
      Drag this button to the bookmarks bar:
      {#if href}<a class="inline-block ml-1.5 px-3 py-1 rounded-full bg-accent text-on-accent font-semibold no-underline cursor-grab"
                   {href} onclick={e => e.preventDefault()}>{TOOL_NAME}</a>{/if}
    </li>
    <li>Open a game on <a href="https://playtak.com">playtak.com</a>: a game that you play or watch, a game that ended
      there, or a game that you load.</li>
    <li>Click <strong>{TOOL_NAME}</strong> in the bookmarks bar. Mistak opens the game in a new tab.</li>
  </ol>
  <h2 class="mt-2 text-lg font-bold">Or with Tampermonkey</h2>
  <p>
    With the Tampermonkey extension, a userscript does the same. It adds a button to playtak.com, and an entry to
    Tampermonkey's menu. It updates itself. It sends nothing to playtak.com and reads nothing from your login.
  </p>
  <ol class="grid gap-2.5 pl-5 list-decimal">
    <li>Install <a href="https://www.tampermonkey.net/">Tampermonkey</a>. In Chrome and Edge from version 138, also set
      <strong>Allow User Scripts</strong> to on. This setting is in the details of Tampermonkey, on the extensions page
      of the browser.</li>
    <li>Open <a href="/mistak.user.js" data-sveltekit-reload>the Mistak userscript</a>. Tampermonkey shows it with an
      <strong>Install</strong> button. Click <strong>Install</strong>.</li>
    <li>Open a game on playtak.com. Then click the Mistak button, or click <strong>Open this game in Mistak</strong> in
      Tampermonkey's menu. The button shows the Mistak logo. It is under the list of moves, below the row of buttons
      that step through the moves. Mistak opens the game in a new tab.</li>
  </ol>
  <p class="text-sm text-muted">
    Both depend on how playtak.com builds its pages. If playtak.com changes its page, they possibly find no game there
    until this site updates them. Both then update themselves.
  </p>
</main>
<SiteFooter />
