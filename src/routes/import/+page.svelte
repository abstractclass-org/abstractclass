<script lang="ts">
  // Import: a game record after the `#` (from the meaf.us bookmarklet, src/lib/game/bookmarklet.ts) is checked with the
  // engine's rules, given its cut marks, kept in this browser, and opened in the review. Without one, the page shows the bookmarklet and how
  // to install it.
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { markCuts, parseRecord } from "#lib/game/record.ts";
  import { checkMoves } from "#lib/game/check.ts";
  import { saveGame } from "#lib/game/store.ts";
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
      const record = parseRecord(text);
      const { problem: illegal, cuts } = await checkMoves(record);
      if (illegal) throw new Error(illegal);
      const { id, kept } = await saveGame(cuts ? markCuts(text, record, cuts) : text, record);
      if (!kept) throw new Error("This browser does not let the site keep games (a private window, or blocked site data).");
      await goto(`/review?game=${id}`, { replaceState: true });
    } catch (e) {
      phase = "failed";
      problem = String(e).replace(/^Error: /, "");
    }
  }
</script>

<svelte:head><title>Import a game</title></svelte:head>

<main class="import">
  {#if phase === "importing"}
    <p class="status">Importing the game…</p>
  {:else}
    {#if phase === "failed"}<p class="problem" role="alert">The game could not be imported: {problem}</p>{/if}
    <h1>Bring your meaf.us games</h1>
    <p>
      meaf.us does not let other sites read its games, so this site cannot fetch them. A bookmarklet can: you keep it
      in your browser's bookmarks bar, and click it on a meaf.us game. It reads the game from that page, and opens it
      here for review. It sends nothing to meaf.us and reads nothing from your login.
    </p>
    <ol>
      <li>Show the bookmarks bar (Ctrl+Shift+B in Chrome and Edge, Ctrl+Shift+B or View in Firefox).</li>
      <li>
        Drag this button to the bookmarks bar:
        {#if href}<a class="bookmarklet" {href} onclick={e => e.preventDefault()}>Review in Learn Enclosure</a>{/if}
      </li>
      <li>On meaf.us, open a game: one you play or watch, or a finished one from the archive.</li>
      <li>Click <strong>Review in Learn Enclosure</strong> in the bookmarks bar. The review opens in a new tab.</li>
    </ol>
    <p class="note">
      The bookmarklet depends on how meaf.us builds its page. If meaf.us changes, it may find no game until it is
      updated here. You can always paste a game record on the <a href="/">home page</a>.
    </p>
  {/if}
</main>

<style>
  .import { max-width: 46rem; margin: 1.5rem auto; padding: 0 1rem; }
  h1 { font-size: 1.5rem; margin: 0.5rem 0; }
  ol { display: grid; gap: 0.6rem; padding-left: 1.3rem; }
  .bookmarklet { display: inline-block; margin-left: 0.4rem; padding: 0.3rem 0.8rem; border-radius: 999px; background: var(--accent);
                 color: #fff; text-decoration: none; font-weight: 600; cursor: grab; }
  .note { color: var(--muted); font-size: 0.9em; }
  .problem { color: var(--blunder); }
  .status { color: var(--muted); }
</style>
