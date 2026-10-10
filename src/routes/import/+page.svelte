<script lang="ts">
  // Import: a game record after the `#` (from the meaf.us bookmarklet, src/lib/game/bookmarklet.ts) is checked with the
  // engine's rules, given its cut marks, kept in this browser, and opened in the review. Without one, the page shows the bookmarklet and how
  // to install it.
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { parseRecord } from "#lib/game/record.ts";
  import { importRecord } from "#lib/game/import.ts";
  import { errorText } from "#lib/errors.ts";
  import { bookmarkletHref } from "#lib/game/bookmarklet.ts";

  let phase = $state<"install" | "importing" | "failed">("install");
  let problem = $state("");
  let href = $state("");

  onMount(() => {
    href = bookmarkletHref(location.origin);
    importFromHash();
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
      const text = decodeURIComponent(hash);
      const id = await importRecord(text, parseRecord(text));
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
    <h1 class="text-2xl font-bold">Bring your meaf.us games</h1>
    <p>
      meaf.us does not let other sites read its games, so this site cannot fetch them. A bookmarklet can: you keep it
      in your browser's bookmarks bar, and click it on a meaf.us game. It reads the game from that page, and opens it
      here for review. It sends nothing to meaf.us and reads nothing from your login.
    </p>
    <ol class="grid gap-2.5 pl-5 list-decimal">
      <li>Show the bookmarks bar (Ctrl+Shift+B in Chrome and Edge, Ctrl+Shift+B or View in Firefox).</li>
      <li>
        Drag this button to the bookmarks bar:
        {#if href}<a class="inline-block ml-1.5 px-3 py-1 rounded-full bg-accent text-white font-semibold no-underline cursor-grab"
                     {href} onclick={e => e.preventDefault()}>Review in Learn Enclosure</a>{/if}
      </li>
      <li>On meaf.us, open a game: one you play or watch, or a finished one from the archive.</li>
      <li>Click <strong>Review in Learn Enclosure</strong> in the bookmarks bar. The review opens in a new tab.</li>
    </ol>
    <p class="text-sm text-muted">
      The bookmarklet depends on how meaf.us builds its page. If meaf.us changes, it may find no game until it is
      updated here. You can always paste a game record on the <a href="/">home page</a>.
    </p>
  {/if}
</main>
