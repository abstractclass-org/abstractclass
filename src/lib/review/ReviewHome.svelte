<script lang="ts">
  // The Review tab without a game (design 22): import a game to review it by pasting its record, or load a review file,
  // continue the last review, and the player's games, kept in this browser. A review opens on a game the player
  // brought: there is no sample game (design 11). An analysis file loaded here goes to the Analysis board.
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { playerNames, parseRecord, type GameRecord } from "#lib/game/record.ts";
  import { setUpStart } from "#lib/engine/notation.ts";
  import { deleteGame, lastReview, listGames, reviewAgainWhy, reviewCovers, reviewMark,
           type StoredGame } from "#lib/game/store.ts";
  import { loadEngine, settingsFor } from "#lib/analysis/engineSettings.ts";
  import { importRecord } from "#lib/game/import.ts";
  import { pastedSource, readPasted } from "#lib/game/paste.ts";
  import { fileKind, openAnalysisFile } from "#lib/game/analysisFile.ts";
  import { keepStorage, storageKept } from "#lib/storage/persist.ts";
  import { errorText } from "#lib/errors.ts";
  import { SITE_NAME, SITE_VERSION } from "#lib/edition.ts";
  import { deliverExport, loadReviewFile, type ExportKind } from "#lib/game/reviewFile.ts";
  import { loadManifest, type Manifest } from "#lib/engine/client.ts";
  import { annotatedFromStore } from "#lib/review/exportText.ts";
  import ExportMenu from "#lib/ExportMenu.svelte";
  import { setVisitor, track } from "#lib/analytics.svelte.ts";
  import { trackImport, trackImportFailed, trackLoad, trackLoadFailed } from "#lib/game/importEvents.ts";
  import { GAME_RANGES, range } from "#lib/measure.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import ConfirmDialog from "#lib/ui/ConfirmDialog.svelte";

  let text = $state("");
  let problem = $state("");
  let checking = $state(false);
  let games = $state.raw<{ game: StoredGame; record: GameRecord }[]>([]); // raw: replaced, never changed in place
  let lastId = $state<string | null>(null);
  const last = $derived(games.find(g => g.game.id === lastId) ?? null); // the game reviewed last, when it is still kept
  // The review a game's export needs (design 13): with this site's engine, and the network and review depth that the
  // game reviews with (engineSettings.ts, settingsFor).
  let manifest = $state.raw<Manifest | null>(null);
  let manifestLoad: Promise<Manifest | null> = Promise.resolve(null); // asked for as the tab opens, for the exports too
  const engine = loadEngine();
  const wanted = (g: StoredGame) => {
    const s = settingsFor(g.settings, engine);
    return manifest && reviewMark(manifest, s.network, s.visits);
  };
  // Whether the browser keeps the games for good (storage/persist.ts): it asked when a game was kept.
  let kept = $state(false);
  // The tab shows once the browser's games are read, so that "Continue your last review" and the list come with the
  // rest of the page and push nothing down (a layout shift). The reads take a few milliseconds. The request for
  // persistent storage comes after: Firefox asks the visitor, and the tab does not wait for the answer.
  let ready = $state(false);
  onMount(async () => {
    manifestLoad = loadManifest();
    games = await listGames();
    kept = !!(await storageKept());
    lastId = lastReview();
    ready = true;
    setVisitor({ games_stored: range(games.length, GAME_RANGES) }); // how many games a visitor keeps (design 17)
    if (games.length && !kept) void keepStorage().then(k => (kept = k));
    manifest = await manifestLoad;
  });

  // The game whose Delete was clicked, while its question shows (ConfirmDialog, design 11). A confirmed delete deletes
  // the game, and its row goes at once: the dialog takes a double click's second click, so no other row moves under it.
  // Each answer counts (design 17): a Cancel is a delete that the question stopped, a slip or a change of mind.
  let deleting = $state<{ id: string; name: string } | null>(null);
  async function answerDelete(yes: boolean) {
    const id = deleting?.id;
    deleting = null;
    if (!id) return;
    if (!yes) { track("game_delete_cancel"); return; }
    await deleteGame(id);
    games = games.filter(g => g.game.id !== id);
    track("game_delete");
  }

  /** The pasted game, kept and reviewed. The import counted by its source and the game's length, and a failure by why
   *  (design 17): no record leaves. */
  async function importGame(event: SubmitEvent) {
    event.preventDefault();
    problem = "";
    let read: ReturnType<typeof readPasted>;
    try {
      read = readPasted(text);
    } catch (e) {
      problem = (e as Error).message;
      trackImportFailed("review", pastedSource(text), "record");
      return;
    }
    checking = true;
    let id: string;
    try {
      id = await importRecord(read.recordText, read.record);
    } catch (e) {
      problem = errorText(e);
      trackImportFailed("review", read.source, "rejected");
      return;
    } finally {
      checking = false;
    }
    trackImport("review", read.source, read.record.moves.length);
    location.assign(`/review#game=${id}`); // the review loads it (hashchange)
  }

  // Files (designs 13 and 21), chosen or dropped on the page: a review file is kept and reviewed, and an analysis file
  // goes to the Analysis board, its results kept here.
  let fileProblem = $state("");
  let loadingFile = $state(false);
  let dragging = $state(false);

  /** A game's export, as on the review page: the annotated record is written from the stored results, with no search. */
  async function exportGame(id: string, record: string, kind: ExportKind) {
    const m = await manifestLoad;
    return deliverExport(kind, id, record, m, SITE_VERSION, () => annotatedFromStore(id, m));
  }

  async function loadFile(file: File | undefined) {
    if (!file) return;
    fileProblem = "";
    loadingFile = true;
    const content = await file.text();
    if (fileKind(content) === "analysis") {
      try {
        await goto(await openAnalysisFile(content, await manifestLoad)); // the board counts the load
      } catch (e) {
        fileProblem = `The file could not be loaded: ${errorText(e)}`;
        trackLoadFailed("analysis_file", "file");
      } finally {
        loadingFile = false;
      }
      return;
    }
    try {
      const { id, file } = await loadReviewFile(content, await manifestLoad);
      trackLoad("review_file", parseRecord(file.record).moves.length, { with_results: file.analyses.length > 0 });
      location.assign(`/review#game=${id}`); // the review loads it (hashchange)
    } catch (e) {
      fileProblem = `The file could not be loaded: ${errorText(e)}`;
      trackLoadFailed("review_file", "file");
    } finally {
      loadingFile = false;
    }
  }

  function dropped(event: DragEvent) {
    event.preventDefault();
    dragging = false;
    void loadFile(event.dataTransfer?.files[0]);
  }

  // A game's link loads the page again (data-sveltekit-reload): a change of the `#` alone would leave this page as it is.
  const title = (r: GameRecord) => { const p = playerNames(r.tags); return `${p.blue} against ${p.red}`; };
</script>


{#if ready}
<main class={["box-content max-w-[1000px] mx-auto my-6 px-4 grid gap-5 rounded-lg", dragging && "outline-2 outline-dashed outline-accent"]}
      role="region" aria-label="Review a game"
      ondragover={e => { if (e.dataTransfer?.types.includes("Files")) { e.preventDefault(); dragging = true; } }}
      ondragleave={e => { if (e.target === e.currentTarget) dragging = false; }}
      ondrop={dropped}>
  {#if last}
    <a class="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 bg-panel border border-line rounded-lg text-ink no-underline hover:border-accent"
       href="/review#game={last.game.id}" data-sveltekit-reload>
      <strong>Continue your last review</strong>
      <span class="text-muted">{title(last.record)}, {last.record.moves.length} edges</span>
    </a>
  {/if}

  <section class="bg-panel border border-line rounded-lg px-5 py-5">
    <h1 class="mb-1 text-2xl font-bold text-balance">Review your Enclosure game</h1>
    <p class="mb-4 max-w-160 text-muted">See where the game turned, which edges cost you, and what was better. The engine runs in your browser.</p>
    <form onsubmit={importGame}>
      <label for="record" class="block mb-1 text-sm font-semibold">A game record</label>
      <textarea id="record" rows="4" bind:value={text} spellcheck="false"
                class="w-full px-2.5 py-2 font-mono text-sm/[1.4] bg-page text-ink border border-line rounded resize-y focus:outline-2 focus:outline-accent"
                placeholder={'[Blue "you"] [Red "them"]\n1. D10-G10 2. N11-Q10 L10-N11 3. D10-G9 G9-H10 …'}></textarea>
      {#if problem}<p class="mt-1.5 text-blunder" role="alert">{problem}</p>{/if}
      <div class="flex flex-wrap items-center gap-3 mt-2">
        <button class="btn-primary" type="submit" disabled={!text.trim() || checking}>{checking ? "Checking…" : "Review"}</button>
        <span class="flex-1 min-w-56 text-xs text-muted">In the engine's <a href="/notation">notation</a>: turns as <code>1.</code> and <code>2.</code>, edges as
          <code>D10-G10</code>, a cut as <code>D10-G10x</code>, a timeout as <code>pass</code>. A plain list of edges works too.</span>
      </div>
      <p class="mt-2.5 text-xs text-muted">From <a href="https://meaf.us/sst1/" target="_blank" rel="noopener noreferrer">meaf.us</a>: use the <a href="/tools">bookmarklet or the userscript</a>,
        one click on a meaf.us game page.</p>
    </form>
    <div class="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-line">
      <label class={["px-3 py-1 text-sm rounded border border-line bg-panel-2 cursor-pointer hover:border-accent", loadingFile && "opacity-50"]}>
        {loadingFile ? "Loading…" : "Load a review file"}
        <input type="file" accept=".json,application/json" class="sr-only" disabled={loadingFile}
               onchange={e => { void loadFile(e.currentTarget.files?.[0]); e.currentTarget.value = ""; }} />
      </label>
      <span class="flex-1 min-w-56 text-xs text-muted">A review file that {SITE_NAME} exported, from this browser or another. You can
        also drop it on this page. It opens at once, with the engine's results it holds.</span>
    </div>
    {#if fileProblem}<p class="mt-1.5 text-blunder" role="alert">{fileProblem}</p>{/if}
  </section>

  {#if games.length}
    <section class="bg-panel border border-line rounded-lg px-5 py-5">
      <h2 class="mb-2 text-lg font-bold">Your games</h2>
      <ul class="grid gap-1.25 mb-1.5">
        {#each games as { game, record } (game.id)}
          <li class="flex flex-wrap items-baseline gap-2.5">
            <!-- A game from a set-up start (a practice game from the Analysis board's Play) opens on the Analysis board:
                 the Review tab reviews games from the standard start. -->
            {#if setUpStart(record.tags.Position)}
              <a href="/analysis#{new URLSearchParams({ record: game.record, via: 'your_games' })}" data-sveltekit-reload>{title(record)}</a>
            {:else}
              <a href="/review#game={game.id}" data-sveltekit-reload>{title(record)}</a>
            {/if}
            <span class="text-sm text-muted">{record.moves.length} edges{record.result && record.result !== "*" ? ` · ${record.result}` : ""} ·
              added {new Date(game.added).toLocaleDateString()}</span>
            <span class="ml-auto flex items-center gap-1.5"><ExportMenu small side="bottom" run={kind => exportGame(game.id, game.record, kind)}
              ready={reviewCovers(game.reviewed, wanted(game))}
              why={setUpStart(record.tags.Position) ? "A game from a set-up start opens on the Analysis board: export it there."
                : !game.reviewed ? "Open the game to review it, then export."
                : reviewAgainWhy(game.reviewed, wanted(game)) ? "The engine was updated: open the game, choose Review again, then export."
                : "Open the game to finish its review with the engine settings now, then export."} />
              <button type="button" class="px-2 py-0 text-xs" aria-label="Delete {title(record)}"
                      onclick={() => (deleting = { id: game.id, name: title(record) })}>Delete</button></span>
          </li>
        {/each}
      </ul>
      <p class="text-sm text-muted">
        {#if kept}Kept in this browser until you delete them.
        {:else}Kept in this browser only, which may clear them when its disk is almost full, or Safari after seven days
          without a visit. Export the games you want to keep.{/if}
      </p>
    </section>
  {/if}
</main>

<SiteFooter />
<ConfirmDialog open={!!deleting} title="Delete this game?" action="Delete" onanswer={answerDelete}>
  {SITE_NAME} will delete the game <strong>{deleting?.name}</strong> from this browser. You cannot undo this action.
</ConfirmDialog>
{/if}
