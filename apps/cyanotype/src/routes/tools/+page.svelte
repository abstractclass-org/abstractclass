<script lang="ts">
  // The tools that bring games from strategyjam.org (design 22, design 33): the bookmarklet and the userscript, which
  // open the import page with a game of Blueprints after the `#` (src/lib/game/tools.ts), which opens it in the review
  // or on the Analysis board. The steps are strict Simplified Technical English: the player follows them.
  import { onMount } from "svelte";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { bookmarkletHref, TOOL_NAME } from "#lib/game/tools.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  let href = $state("");
  onMount(() => { href = bookmarkletHref(location.origin); });
</script>

<PageMeta title="Bring your games from strategyjam.org · Cyanotype"
          description="Bring your Blueprints games from strategyjam.org to Cyanotype in one click, with a bookmarklet or a Tampermonkey userscript." />

<main class="box-content max-w-184 mx-auto my-6 px-4 grid gap-4">
  <h1 class="text-2xl font-bold">Bring your games from strategyjam.org</h1>
  <p>
    <a href="https://strategyjam.org/blueprints/">strategyjam.org</a> does not let other sites read its games, so this
    site cannot get them. A bookmarklet can get them: you keep it in your browser's bookmarks bar, and click it on a
    game page of Blueprints. It reads the game from that page and opens it here. It sends nothing to strategyjam.org and
    reads nothing from your login. At each click it loads its code from this site, so it always has the newest code.
  </p>
  <ol class="grid gap-2.5 pl-5 list-decimal">
    <li>Show the bookmarks bar. In Chrome and Edge, press Ctrl+Shift+B. In Firefox, press Ctrl+Shift+B, or use the View
      menu.</li>
    <li>
      Drag this button to the bookmarks bar:
      {#if href}<a class="inline-block ml-1.5 px-3 py-1 rounded-full bg-accent text-on-accent font-semibold no-underline cursor-grab"
                   {href} onclick={e => e.preventDefault()}>{TOOL_NAME}</a>{/if}
    </li>
    <li>Open a game of Blueprints on strategyjam.org: a game that you play or watch, or a finished game from the History
      list. To see a finished game, log in to strategyjam.org first.</li>
    <li>Click <strong>{TOOL_NAME}</strong> in the bookmarks bar. Cyanotype opens the game in a new tab.</li>
  </ol>
  <h2 class="mt-2 text-lg font-bold">Or with Tampermonkey</h2>
  <p>
    With the Tampermonkey extension, a userscript does the same. It adds a button to the game pages of Blueprints, and
    an entry to Tampermonkey's menu. It updates itself. It sends nothing to strategyjam.org and reads nothing from your
    login.
  </p>
  <ol class="grid gap-2.5 pl-5 list-decimal">
    <li>Install <a href="https://www.tampermonkey.net/">Tampermonkey</a>. In Chrome and Edge from version 138, also set
      <strong>Allow User Scripts</strong> to on. This setting is in the details of Tampermonkey, on the extensions page
      of the browser.</li>
    <li>Open <a href="/cyanotype.user.js" data-sveltekit-reload>the Cyanotype userscript</a>. Tampermonkey shows
      it with an <strong>Install</strong> button. Click <strong>Install</strong>.</li>
    <li>Open a game of Blueprints on strategyjam.org. Then click the Cyanotype button, or click <strong>Open this
      game in Cyanotype</strong> in Tampermonkey's menu. The button shows a blueprint. It is at the end of the row
      that has the <strong>Sandbox</strong> button. Cyanotype opens the game in a new tab.</li>
  </ol>
  <p class="text-sm text-muted">
    Both depend on how strategyjam.org builds its pages. If strategyjam.org changes its page, they possibly find no game
    there until this site updates them. Both then update themselves.
  </p>
</main>
<SiteFooter />