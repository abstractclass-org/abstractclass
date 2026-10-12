<script lang="ts">
  // Import: a game record after the `#` (from the meaf.us bookmarklet or userscript, src/lib/game/bookmarklet.ts and
  // userscript.ts) is checked with the engine's rules, given its cut marks, kept in this browser, and opened in the
  // review. Without one, the page shows the bookmarklet and the userscript, and how to install them. A record from an
  // out-of-date tool (importHash.ts) is kept too, and the page then says how to update the tool, with the review a
  // click away.
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { parseRecord } from "#lib/game/record.ts";
  import { importRecord } from "#lib/game/import.ts";
  import { errorText } from "#lib/errors.ts";
  import { BOOKMARK_VERSION, bookmarkletHref } from "#lib/game/bookmarklet.ts";
  import { readImportHash, staleTool, type Tool } from "#lib/game/importHash.ts";
  import { startAnalytics } from "#lib/analytics.svelte.ts";

  let phase = $state<"install" | "importing" | "failed" | "stale">("install");
  let problem = $state("");
  let href = $state("");
  let stale = $state<Tool | "older" | null>(null);
  let imported = $state(""); // the game's id, for the review's link while the page asks to update a tool

  onMount(() => {
    href = bookmarkletHref(location.origin);
    importFromHash();
    startAnalytics(); // after the record has left the address (design 11)
    // A tab already on this page gets a new record by its `#` alone, with no new load.
    window.addEventListener("hashchange", importFromHash);
    return () => window.removeEventListener("hashchange", importFromHash);
  });

  async function importFromHash() {
    const hash = location.hash.slice(1);
    if (!hash) return;
    phase = "importing";
    history.replaceState(null, "", location.pathname); // the record is kept below, not in the address
    try {
      const sent = readImportHash(hash), text = sent.record;
      const id = await importRecord(text, parseRecord(text));
      stale = staleTool(sent, { bookmarklet: String(BOOKMARK_VERSION), userscript: __USERSCRIPT_CODE__ });
      if (stale) { imported = id; phase = "stale"; return; }
      await goto(`/review?game=${id}`, { replaceState: true });
    } catch (e) {
      phase = "failed";
      problem = errorText(e);
    }
  }
</script>

<svelte:head><title>Import a game</title></svelte:head>

<main class="box-content max-w-184 mx-auto my-6 px-4 grid gap-4">
  {#if phase === "importing"}
    <p class="text-muted">Importing the game…</p>
  {:else}
    {#if phase === "failed"}<p class="text-blunder" role="alert">The game could not be imported: {problem}</p>{/if}
    {#if phase === "stale"}
      <div class="grid gap-2 px-4 py-3 bg-panel border border-accent rounded-lg" role="status">
        <p>
          {#if stale === "bookmarklet"}Your bookmarklet is an older one. Drag the button below to the bookmarks bar again,
            in place of the old one.
          {:else if stale === "userscript"}Your userscript is older than this site's. Tampermonkey updates it when it next
            checks. To update it now, open the Hedge School userscript below, and Tampermonkey offers the update.
          {:else}This game came from a bookmarklet or a userscript made before they could tell this site their version.
            Drag the bookmarklet below to the bookmarks bar again, in place of the old one: it now loads its code from
            this site, so it stays up to date. For the userscript, open it below, and Tampermonkey offers the update.{/if}
        </p>
        <p>The game is imported. <a class="inline-block ml-1.5 px-3 py-1 rounded-full bg-accent text-white font-semibold no-underline" href="/review?game={imported}">Open the review</a></p>
      </div>
    {/if}
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
        {#if href}<a class="inline-block ml-1.5 px-3 py-1 rounded-full bg-accent text-white font-semibold no-underline cursor-grab"
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
  {/if}
</main>
