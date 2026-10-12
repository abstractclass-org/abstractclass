<script lang="ts">
  // Home: import a game, the player's games, and in the full site the daily puzzle and the next lesson. Lichess's front
  // page leads with play. This site leads with review, its main job (design 01). No sample game: a review opens on a
  // game the player brought (design 11).
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Board from "#lib/board/Board.svelte";
  import { review, PLAYER_NAME } from "#lib/review/model.ts";
  import { puzzlesFrom } from "#lib/puzzles/model.ts";
  import { COURSE } from "#lib/learn/lessons.ts";
  import { parseRecord, playerNames, RecordError, type GameRecord } from "#lib/game/record.ts";
  import { listGames, reviewCovers, reviewMark, type StoredGame } from "#lib/game/store.ts";
  import { loadEngine, reviewVisits } from "#lib/analysis/engineSettings.ts";
  import { importRecord } from "#lib/game/import.ts";
  import { errorText } from "#lib/errors.ts";
  import { constellationRecord, isConstellation } from "#lib/game/constellation.ts";
  import { EARLY_ACCESS, SITE_NAME, SITE_VERSION } from "#lib/edition.ts";
  import { download, exportReview, importReview, readReviewFile, reviewFileName, shippedModels } from "#lib/game/reviewFile.ts";
  import { loadManifest } from "#lib/engine/client.ts";
  import { annotatedFromStore } from "#lib/review/exportText.ts";
  import ExportMenu, { type ExportKind } from "#lib/ExportMenu.svelte";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import { SAMPLE } from "#lib/mock/sample.ts";

  const R = review(SAMPLE);
  const daily = puzzlesFrom(R)[0];
  const firstLesson = COURSE[0].lessons[0];

  let text = $state("");
  let problem = $state("");
  let checking = $state(false);
  let games = $state<{ game: StoredGame; record: GameRecord }[]>([]);
  // The review a game's export needs (design 13): with this site's engine, and the network and review depth set now
  let wanted = $state<ReturnType<typeof reviewMark>>(null);
  onMount(async () => {
    games = await listGames();
    const manifest = await loadManifest(), engine = loadEngine();
    wanted = manifest && reviewMark(manifest, engine.network, reviewVisits(engine));
  });

  /** Where in the text: line and column, from the record reader's offset. */
  function where(offset: number) {
    const before = text.slice(0, offset).split("\n");
    return `line ${before.length}, column ${before.at(-1)!.length + 1}`;
  }

  async function importGame(event: SubmitEvent) {
    event.preventDefault();
    problem = "";
    let record: GameRecord, recordText = text;
    try {
      // Constellation's export becomes this site's record (constellation.ts), which is checked like any other.
      if (isConstellation(text)) recordText = constellationRecord(text);
      record = parseRecord(recordText);
    } catch (e) {
      problem = e instanceof RecordError && recordText === text ? `${e.message} (${where(e.offset)}).` : errorText(e);
      return;
    }
    checking = true;
    let id: string;
    try {
      id = await importRecord(recordText, record);
    } catch (e) {
      problem = errorText(e);
      return;
    } finally {
      checking = false;
    }
    await goto(`/review?game=${id}`);
  }

  // Review files (design 13): exported beside each game, imported here from a file chosen or dropped on the page. For
  // now they live on the home page, with the rest of what concerns the player's games.
  let fileProblem = $state("");
  let importing = $state(false);
  let dragging = $state(false);

  /** A game's export, as on the review page: the annotated record is written from the stored results, with no search. */
  async function exportGame(id: string, record: string, kind: ExportKind) {
    const name = reviewFileName(record, id);
    if (kind === "file") {
      download(name, JSON.stringify(await exportReview(id, SITE_VERSION, shippedModels(await loadManifest()))));
      return;
    }
    const text = await annotatedFromStore(id);
    if (kind === "copy") await navigator.clipboard.writeText(text);
    else download(name.replace(/\.json$/, ".txt"), text, "text/plain");
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    fileProblem = "";
    importing = true;
    try {
      const review = readReviewFile(await file.text());
      // Only the networks this site ships: a result of another network is never asked for here.
      const manifest = await loadManifest();
      const module = manifest?.artifacts.find(a => a.kind === "module")?.sha256 ?? null;
      const { id } = await importReview(review, shippedModels(manifest), module);
      await goto(`/review?game=${id}`);
    } catch (e) {
      fileProblem = `The file could not be imported: ${errorText(e)}`;
    } finally {
      importing = false;
    }
  }

  function dropped(event: DragEvent) {
    event.preventDefault();
    dragging = false;
    void importFile(event.dataTransfer?.files[0]);
  }

  const CARD = "grid gap-1.5 px-4 py-3.5 bg-panel border border-line rounded-lg text-ink no-underline hover:border-accent";
  const EYEBROW = "text-xs font-semibold uppercase tracking-[0.08em] text-muted";

  const title = (r: GameRecord) => { const p = playerNames(r.tags); return `${p.blue} against ${p.red}`; };
</script>

<svelte:head><title>{SITE_NAME}</title></svelte:head>

<main class={["box-content max-w-[1000px] mx-auto my-6 px-4 grid gap-5 rounded-lg", dragging && "outline-2 outline-dashed outline-accent"]}
      role="region" aria-label="Home"
      ondragover={e => { if (e.dataTransfer?.types.includes("Files")) { e.preventDefault(); dragging = true; } }}
      ondragleave={e => { if (e.target === e.currentTarget) dragging = false; }}
      ondrop={dropped}>
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
        <span class="flex-1 min-w-56 text-xs text-muted">In the engine's notation: turns as <code>1.</code> and <code>2.</code>, edges as
          <code>D10-G10</code>, a cut as <code>D10-G10x</code>, a timeout as <code>pass</code>. A plain list of edges works too.</span>
      </div>
      <p class="mt-2.5 text-xs text-muted">From meaf.us: use the <a href="/import">bookmarklet</a>, one click on a meaf.us game page.
        From Constellation: paste what the analysis board's <strong>Export</strong> gives.</p>
    </form>
    <div class="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-line">
      <label class={["px-3 py-1 text-sm rounded border border-line bg-panel-2 cursor-pointer hover:border-accent", importing && "opacity-50"]}>
        {importing ? "Importing…" : "Import a review"}
        <input type="file" accept=".json,application/json" class="sr-only" disabled={importing}
               onchange={e => { void importFile(e.currentTarget.files?.[0]); e.currentTarget.value = ""; }} />
      </label>
      <span class="flex-1 min-w-56 text-xs text-muted">A review file that {SITE_NAME} exported, from this browser or another. You can
        also drop it on this page. The review opens at once when its engine is this site's; with another, it is reviewed again.</span>
    </div>
    {#if fileProblem}<p class="mt-1.5 text-blunder" role="alert">{fileProblem}</p>{/if}
  </section>

  {#if games.length}
    <section class="bg-panel border border-line rounded-lg px-5 py-5">
      <h2 class="mb-2 text-lg font-bold">Your games</h2>
      <ul class="grid gap-1.25 mb-1.5">
        {#each games as { game, record } (game.id)}
          <li class="flex flex-wrap items-baseline gap-2.5">
            <a href="/review?game={game.id}">{title(record)}</a>
            <span class="text-sm text-muted">{record.moves.length} edges{record.result && record.result !== "*" ? ` · ${record.result}` : ""} ·
              imported {new Date(game.added).toLocaleDateString()}</span>
            <span class="ml-auto"><ExportMenu small side="bottom" run={kind => exportGame(game.id, game.record, kind)}
              ready={reviewCovers(game.reviewed, wanted)}
              why={game.reviewed ? "Open the game to finish its review with the engine settings now, then export." : "Open the game to review it, then export."} /></span>
          </li>
        {/each}
      </ul>
      <p class="text-sm text-muted">Kept in this browser only.</p>
    </section>
  {/if}

  {#if !EARLY_ACCESS}
  <div class="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] items-start gap-3">
    <a class={CARD} href="/puzzles">
      <span class={EYEBROW}>Daily puzzle</span>
      <div class="rounded overflow-hidden"><Board position={R.data.positions[daily.index]} layers={{ candidates: false, marks: false, coordinates: false }} /></div>
      <span class="text-sm text-muted">{PLAYER_NAME[daily.player]} to play. Find the only good edge.</span>
    </a>

    <a class={CARD} href="/learn">
      <span class={EYEBROW}>Learn</span>
      <strong>Start with “{firstLesson.title}”</strong>
      <span class="text-sm text-muted">{COURSE[0].title}: {COURSE[0].lessons.length} short lessons on the board.</span>
    </a>
  </div>
  {/if}
</main>

<SiteFooter />
