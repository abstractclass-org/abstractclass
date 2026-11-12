<script lang="ts">
  // The Review tab without a game (design 33, as Hedge School's ReviewHome.svelte and its design 22): import a game to
  // review it by pasting its record or by loading a review file (game/reviewFile.ts), continue the last review, and the
  // player's games, kept in this browser (game/store.ts), with their Export and their Delete (GameList). A review opens
  // on a game the player brought: there is no sample game (Hedge School's design 11). An analysis file dropped here goes
  // to the Analysis board, as on Hedge School. The tab counts its events as Hedge School's does (its design 17): the
  // games kept, a delete and a delete stopped, an import and its failure, a review file loaded, a file that cannot load,
  // and the exports.
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import GameList, { type GameRow } from "@abstractclass/review/GameList.svelte";
  import type { ExportKind } from "@abstractclass/review/exports.ts";
  import { keepStorage, storageKept } from "@abstractclass/storage/persist.ts";
  import { loadManifest, type Manifest } from "@abstractclass/engine/client.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { parseRecord, playerNames, type GameRecord } from "#lib/game/record.ts";
  import { readPasted } from "#lib/game/paste.ts";
  import { importRecord } from "#lib/game/import.ts";
  import { deleteGame, lastReview, listGames, reviewAgainWhy, reviewCovers, reviewMark,
           type StoredGame } from "#lib/game/store.ts";
  import { fileKind, openAnalysisFile } from "#lib/game/analysisFile.ts";
  import { loadReviewFile } from "#lib/game/reviewFile.ts";
  import { loadEngine, settingsFor } from "#lib/analysis/engineSettings.ts";
  import { deliverExport, reviewExports } from "./reviewExports.ts";
  import { annotatedFromStore } from "./exportText.ts";
  import { SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import { setVisitor, track } from "#lib/analytics.svelte.ts";
  import { trackExport, trackImport, trackImportFailed, trackLoad, trackLoadFailed } from "#lib/game/sources.ts";
  import { GAME_RANGES, range } from "@abstractclass/site/measure.ts";
  import ChooseNetwork, { NetworkChoice } from "@abstractclass/review/ChooseNetwork.svelte";

  let text = $state("");
  let problem = $state("");
  let checking = $state(false);
  let games = $state.raw<{ game: StoredGame; record: GameRecord }[]>([]); // raw: replaced, never changed in place
  let lastId = $state<string | null>(null);
  const last = $derived(games.find(g => g.game.id === lastId) ?? null); // the game reviewed last, when it is still kept
  // The review a game's export needs (Hedge School's design 13): with this site's engine, and the network and review
  // depth that the game reviews with (engineSettings.ts, settingsFor).
  let manifest = $state.raw<Manifest | null>(null);
  let manifestLoad: Promise<Manifest | null> = Promise.resolve(null); // asked for as the tab opens, for the files too
  const engine = loadEngine();
  const wanted = (g: StoredGame) => {
    const s = settingsFor(g, engine);
    return manifest && reviewMark(manifest, s.network, s.visits);
  };
  // Whether the browser keeps the games for good (@abstractclass/storage/persist.ts): it asked when a game was kept.
  let kept = $state(false);
  // "Continue your last review", the list and the storage line come together once the browser's games are read
  // (`read`), and the footer under the list waits for them, so that it does not move when they come. The request for
  // persistent storage comes after: Firefox asks the visitor, and the tab does not wait for the answer.
  let read = $state(false);
  onMount(() => void open());
  async function open() {
    manifestLoad = loadManifest();
    [games, kept] = await Promise.all([listGames(), storageKept().then(Boolean)]); // the list with its line on storage
    lastId = lastReview();
    read = true;
    setVisitor({ games_stored: range(games.length, GAME_RANGES) }); // how many games a visitor keeps
    if (games.length && !kept) void keepStorage().then(k => (kept = k));
    manifest = await manifestLoad;
  }

  /** A confirmed delete (GameList): the game goes from the store, and its row at once. Each decision counts: a "no"
   *  is a delete that the question stopped, a slip or a change of mind. An "undecided", the second click of a double
   *  click, is no decision. */
  async function removeGame(id: string) {
    await deleteGame(id);
    games = games.filter(g => g.game.id !== id);
    track("game_delete");
  }

  /** The pasted game, checked by the engine's rules, kept and reviewed (game/import.ts). The import counted by the
   *  game's length, and a failure by why: no record leaves. */
  async function importGame(event: SubmitEvent) {
    event.preventDefault();
    problem = "";
    let pasted: ReturnType<typeof readPasted>;
    try {
      pasted = readPasted(text);
    } catch (e) {
      problem = errorText(e);
      trackImportFailed("review", "pasted_record", "record");
      return;
    }
    checking = true;
    let id: string;
    try {
      id = await importRecord(pasted.recordText, pasted.record);
    } catch (e) {
      problem = errorText(e);
      trackImportFailed("review", "pasted_record", "rejected");
      return;
    } finally {
      checking = false;
    }
    trackImport("review", "pasted_record", pasted.record.moves.length);
    location.assign(`/review#game=${id}`); // the review loads it (hashchange)
  }

  // Files (Hedge School's designs 13 and 21), chosen or dropped on the page: a review file is kept and reviewed, and an
  // analysis file goes to the Analysis board, its results kept here.
  let fileProblem = $state("");
  let loadingFile = $state(false);
  let dragging = $state(false);
  // An analysis file of several networks, or of a network that the site no longer ships: the player chooses one first.
  const networkChoice = new NetworkChoice();

  /** A game's export, as on the review page: the annotated record is written from the stored results, with no
   *  search (exportText.ts). */
  async function exportGame(id: string, record: string, kind: ExportKind) {
    const m = await manifestLoad;
    return deliverExport(kind, id, record, m, () => annotatedFromStore(id, m));
  }

  async function loadFile(file: File | undefined) {
    if (!file) return;
    fileProblem = "";
    loadingFile = true;
    const content = await file.text();
    if (fileKind(content) === "analysis") {
      try {
        // The board counts the load. A file whose network the board cannot take alone asks first: a cancel stays here.
        const address = await openAnalysisFile(content, await manifestLoad, networkChoice.ask);
        if (address) await goto(address);
      } catch (e) {
        fileProblem = `${SITE_NAME} could not load this file: ${errorText(e)}`;
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
      fileProblem = `${SITE_NAME} could not load this file: ${errorText(e)}`;
      trackLoadFailed("review_file", "file");
    } finally {
      loadingFile = false;
    }
  }

  /** Loads the input's file, then empties the input: the same file chosen again then loads again. */
  function loadInputFile(input: HTMLInputElement) {
    void loadFile(input.files?.[0]);
    input.value = "";
  }

  function dropped(event: DragEvent) {
    event.preventDefault();
    dragging = false;
    void loadFile(event.dataTransfer?.files[0]);
  }

  const title = (r: GameRecord) => { const p = playerNames(r.tags); return `${p.blue} against ${p.red}`; };
  const movesText = (n: number) => `${n} ${n === 1 ? "move" : "moves"}`;
  // "Continue your last review": two lines on a phone and one from 640 pixels, and the link cuts its game to fit.
  const CONTINUE = "flex-col sm:flex-row sm:items-baseline gap-x-3 gap-y-1 px-5 py-3.5 bg-panel border border-line rounded-lg";
  // The list's rows (GameList). The Export's text when it does not open: text that a player follows, in strict
  // Simplified Technical English.
  const rows = $derived(games.map(({ game, record }): GameRow => {
    const want = wanted(game);
    return {
      id: game.id, title: title(record), href: `/review#game=${game.id}`,
      detail: `${movesText(record.moves.length)}${record.result && record.result !== "*" ? ` · ${record.result}` : ""} · `
        + `added ${new Date(game.added).toLocaleDateString()}`,
      exports: { run: kind => exportGame(game.id, game.record, kind), items: reviewExports(), ontrack: trackExport,
        ready: reviewCovers(game.reviewed, want),
        why: !game.reviewed ? "Open the game to review it, then export."
          : reviewAgainWhy(game.reviewed, want) ? "The engine has a new version: open the game, choose Review again, then export."
          : "Open the game to finish its review with the engine settings now, then export." },
    };
  }));
</script>

<main class={["box-content max-w-[1000px] mx-auto my-6 px-4 grid gap-5 rounded-lg", dragging && "outline-2 outline-dashed outline-accent"]}
      role="region" aria-label="Review a game"
      ondragover={e => { if (e.dataTransfer?.types.includes("Files")) { e.preventDefault(); dragging = true; } }}
      ondragleave={e => { if (e.target === e.currentTarget) dragging = false; }}
      ondrop={dropped}>
  {#if last}
    <!-- min-w-0: the game's text, on one line, does not widen the page's column. -->
    <a class="{CONTINUE} flex min-w-0 text-ink no-underline hover:border-accent" href="/review#game={last.game.id}" data-sveltekit-reload>
      <strong class="shrink-0">Continue your last review</strong>
      <span class="truncate text-muted">{title(last.record)}, {movesText(last.record.moves.length)}</span>
    </a>
  {/if}

  <section class="bg-panel border border-line rounded-lg px-5 py-5">
    <!-- The heading and its line invite: plain web writing. The import's text is followed: strict Simplified Technical
         English. -->
    <h1 class="mb-1 text-2xl font-bold text-balance">Review your Blueprints game</h1>
    <p class="mb-4 max-w-160 text-muted">See where the game turned, which moves cost you, and what was better. The engine runs in your browser.</p>
    <form onsubmit={importGame}>
      <label for="record" class="block mb-1 text-sm font-semibold">A game record</label>
      <textarea id="record" rows="4" bind:value={text} spellcheck="false"
                class="w-full px-2.5 py-2 font-mono text-sm/[1.4] bg-page text-ink border border-line rounded resize-y focus:outline-2 focus:outline-accent"
                placeholder={'[Blue "you"] [Red "them"]\n1. 1:-1,1>2:0,-1 2. 1:-1,1>2:-2,1 1:0,2>2:0,3 3. 1:0,2>2:2,2 2@1,-5 4. 2@6,-5x 2@3,-7x+10 …'}></textarea>
      {#if problem}<p class="mt-1.5 text-blunder" role="alert">{problem}</p>{/if}
      <div class="flex flex-wrap items-center gap-3 mt-2">
        <button class="btn-primary" type="submit" disabled={!text.trim() || checking}>{checking ? "Checking…" : "Review"}</button>
        <span class="flex-1 min-w-56 text-xs text-muted">In the <a href="/notation">notation</a>: turns as <code>1.</code> and <code>2.</code>,
          a placement as <code>2@1,-5</code>, an edit as <code>1:0,2>2:2,2</code>, a capture as <code>2@6,-5x</code> or
          <code>2@3,-7x+10</code>, a timeout as <code>pass</code>. A plain list of moves works too.</span>
      </div>
      <p class="mt-2.5 text-xs text-muted">From <a href="https://strategyjam.org/blueprints/" target="_blank" rel="noopener noreferrer">strategyjam.org</a>:
        use the <a href="/tools">bookmarklet or the userscript</a>, one click on the game's page.</p>
    </form>
    <div class="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-line">
      <label class={["px-3 py-1 text-sm rounded border border-line bg-panel-2", loadingFile ? "opacity-50" : "hover:border-accent"]}>
        {loadingFile ? "Loading…" : "Load a review file"}
        <input type="file" accept=".json,application/json" class="sr-only" disabled={loadingFile}
               onchange={e => loadInputFile(e.currentTarget)} />
      </label>
      <span class="flex-1 min-w-56 text-xs text-muted">A review file that {SITE_NAME} exported, from this browser or another. You can
        also drop it on this page. It opens at once, with the engine's results it holds.</span>
    </div>
    {#if fileProblem}<p class="mt-1.5 text-blunder" role="alert">{fileProblem}</p>{/if}
  </section>

  <GameList games={rows} {kept} site={SITE_NAME} ondelete={removeGame}
            ondecide={answer => { if (answer === "no") track("game_delete_cancel"); }} />
</main>

<ChooseNetwork choice={networkChoice} />

<!-- The footer waits for the list of games, which comes above it. -->
<div class={[!read && "invisible"]}><SiteFooter /></div>
